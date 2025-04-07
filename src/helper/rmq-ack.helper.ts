import { RmqContext } from '@nestjs/microservices';
import { Channel, ConsumeMessage } from 'amqplib';
import { PrismaClient } from '@prisma/client';

export class RmqAckHelper {
  private static readonly MAX_RETRIES = 3;

  // ⚠️ Instantiate PrismaClient directly as singleton
  private static prisma = new PrismaClient();

  static handleMessageProcessing(
    context: RmqContext,
    callback: () => Promise<any>,
    options: {
      queueName?: string;
      useDLQ?: boolean;
      dlqRoutingKey?: string;
    } = {},
  ) {
    return async () => {
      const channel: Channel = context.getChannelRef();
      const originalMsg: ConsumeMessage = context.getMessage();
      const headers = originalMsg.properties.headers || {};
      const retryCount = headers['x-retry-count']
        ? headers['x-retry-count'] + 1
        : 1;

      try {
        await callback();
        channel.ack(originalMsg);
      } catch (error) {
        console.error('Error processing message:', error);

        if (retryCount >= this.MAX_RETRIES) {
          console.error(
            `Max retries (${this.MAX_RETRIES}) reached. Storing to DB and rejecting.`,
          );
          // Save failed message using direct PrismaClient instance
          await this.prisma.failedMessage.create({
            data: {
              queue: options.queueName ?? originalMsg.fields.routingKey,
              routingKey: originalMsg.fields.routingKey,
              payload: JSON.parse(originalMsg.content.toString()),
              error: error.stack,
            },
          });

          // Optionally forward to DLQ to replay the messages
          if (options.useDLQ && options.dlqRoutingKey) {
            channel.sendToQueue(options.dlqRoutingKey, originalMsg.content, {
              headers: {
                'x-retry-count': retryCount,
                originalRoutingKey: originalMsg.fields.routingKey,
              },
            });
          }

          channel.reject(originalMsg, false);
        } else {
          console.warn(
            `Retrying message (${retryCount}/${this.MAX_RETRIES})...`,
          );

          channel.sendToQueue(
            originalMsg.fields.routingKey,
            originalMsg.content,
            {
              headers: { 'x-retry-count': retryCount },
            },
          );

          channel.ack(originalMsg);
        }
      }
    };
  }
}
