import { RmqContext } from '@nestjs/microservices';
import { Channel, ConsumeMessage } from 'amqplib';
import * as amqp from 'amqplib';
import { PrismaService } from 'src/prisma/prisma.service';

export class RmqHelper {
  private static readonly MAX_RETRIES = 3;
  private static readonly QUEUE_NAME =
    process.env.RMQ_QUEUE_NAME || 'transaction_service_queue_1';

  static handleMessageProcessing(
    context: RmqContext,
    callback: () => Promise<any>,
    options: {
      queueName?: string;
      useDLQ?: boolean;
      dlqRoutingKey?: string;
      prisma?: PrismaService;
    } = {},
  ) {
    return async () => {
      const channel: Channel = context.getChannelRef();
      const originalMsg: ConsumeMessage = context.getMessage();
      const headers = originalMsg.properties.headers || {};
      const retryCount = headers['x-retry-count']
        ? headers['x-retry-count'] + 1
        : 1;

      // Check if the message received is from ownselfs
      if (headers['origin-queue'] === this.QUEUE_NAME) {
        console.log('Message already processed, skipping...');
        channel.ack(originalMsg);
        return;
      }

      try {
        await callback();
        console.log('Message processed successfully:', {
          routingKey: originalMsg.fields.routingKey,
          retryCount,
        });
        channel.ack(originalMsg);
      } catch (error) {
        console.error('Error processing message:', error);

        if (retryCount >= this.MAX_RETRIES) {
          console.error(
            `Max retries (${this.MAX_RETRIES}) reached. Storing to DB and rejecting.`,
          );
          // Save failed message using direct PrismaClient instance
          if (options.prisma) {
            try {
              await options.prisma.failedMessage.create({
                data: {
                  queue: options.queueName ?? originalMsg.fields.routingKey,
                  routingKey: originalMsg.fields.routingKey,
                  payload: JSON.parse(originalMsg.content.toString()),
                  error: error.stack,
                },
              });
            } catch (dbError) {
              console.error('Error saving to DB:', dbError);
            }
          }

          // Optionally forward to DLQ to replay the messages
          if (options.useDLQ && options.dlqRoutingKey) {
            channel.sendToQueue(options.dlqRoutingKey, originalMsg.content, {
              headers: {
                ...headers,
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
          console.log('Retrying message:', {
            routingKey: originalMsg.fields.routingKey,
            retryCount,
          });
          channel.sendToQueue(this.QUEUE_NAME, originalMsg.content, {
            headers: { ...headers, 'x-retry-count': retryCount },
          });

          channel.ack(originalMsg);
        }
      }
    };
  }

  static async publishEvent(cmd: string, payload: any) {
    const conn = await amqp.connect(
      process.env.RMQ_URL || 'amqp://localhost:5672',
    );
    const ch = await conn.createChannel();

    const exchange = process.env.RMQ_EXCHANGE || 'events_broadcast';
    const routingKey = cmd; // already formatted like 'product.created'

    const message = {
      pattern: cmd,
      data: payload,
    };

    await ch.assertExchange(exchange, 'topic', { durable: true });
    ch.publish(exchange, routingKey, Buffer.from(JSON.stringify(message)), {
      headers: {
        'x-retry-count': 0,
        'origin-queue': this.QUEUE_NAME,
      },
    });

    await ch.close();
    await conn.close();
  }

  static async setupSubscriptionQueue(queueName: string, topics: string[]) {
    const conn = await amqp.connect(
      process.env.RMQ_URL || 'amqp://localhost:5672',
    );
    const ch = await conn.createChannel();

    const exchange = process.env.RMQ_EXCHANGE || 'events_broadcast';
    await ch.assertExchange(exchange, 'topic', { durable: true });
    await ch.assertQueue(queueName, { durable: true });

    for (const topic of topics) {
      await ch.bindQueue(queueName, exchange, topic); // e.g., 'product.*'
    }

    await ch.close();
    await conn.close();
  }
}
