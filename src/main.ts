import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { RPCExceptionFilter } from './exception/rpc-exception.filter';

async function bootstrap() {
  const tcpService = await NestFactory.createMicroservice<MicroserviceOptions>(
    AppModule,
    {
      transport: Transport.TCP,
      options: { port: 3004 }, // Unique port for this TCP service
    },
  );

  // Microservice 2 - RabbitMQ
  const rabbitMQService =
    await NestFactory.createMicroservice<MicroserviceOptions>(AppModule, {
      transport: Transport.RMQ,
      options: {
        urls: ['amqp://localhost:5672'],
        queue: 'transaction_service_queue',
        // noAck: false,
      },
    });

  tcpService.useGlobalFilters(new RPCExceptionFilter());
  // rabbitMQService.useGlobalFilters(new RPCExceptionFilter());

  // Start all services
  await Promise.all([tcpService.listen(), rabbitMQService.listen()]);
}
bootstrap();
