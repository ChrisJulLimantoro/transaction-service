import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { RPCExceptionFilter } from './exception/rpc-exception.filter';
import { RmqHelper } from './helper/rmq.helper';

async function bootstrap() {
  const tcpService = await NestFactory.createMicroservice<MicroserviceOptions>(
    AppModule,
    {
      transport: Transport.TCP,
      options: {
        host: process.env.TCP_HOST || 'localhost',
        port: Number(process.env.TCP_PORT || 3005),
      }, // Unique port for this TCP service
    },
  );

  // RabbitMQ Setup queue name
  const queueName = process.env.RMQ_QUEUE_NAME || 'transaction_service_queue_1';
  // Microservice 2 - RabbitMQ
  const rabbitMQService =
    await NestFactory.createMicroservice<MicroserviceOptions>(AppModule, {
      transport: Transport.RMQ,
      options: {
        urls: [process.env.RMQ_URL || 'amqp://localhost:5672'],
        queue: queueName,
        noAck: false,
        queueOptions: { durable: true },
      },
    });

  tcpService.useGlobalFilters(new RPCExceptionFilter());
  // Setup the topic exhange
  const routingKeys = [
    'company.*',
    'store.*',
    'category.*',
    'type.*',
    'price.*',
    'product.*',
    'operation.*',
    'stock.*',
    'transaction.*',
    'customer.*',
    'account.*',
    'bank_account.*',
    'voucher.*',
    'payout.*',
  ];
  await RmqHelper.setupSubscriptionQueue(queueName, routingKeys);

  // Start all services
  await Promise.all([tcpService.listen(), rabbitMQService.listen()]);
}
bootstrap();
