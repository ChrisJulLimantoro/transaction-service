import { Controller } from '@nestjs/common';
import { CompanyService } from './company.service';
import { Ctx, EventPattern, Payload, RmqContext } from '@nestjs/microservices';
import { Exempt } from 'src/decorator/exempt.decorator';
import { RmqHelper } from 'src/helper/rmq.helper';
import { PrismaService } from 'src/prisma/prisma.service';

@Controller('company')
export class CompanyController {
  constructor(
    private readonly service: CompanyService,
    private readonly prisma: PrismaService,
  ) {}

  @EventPattern('company.created')
  @Exempt()
  async companyCreated(@Payload() data: any, @Ctx() context: RmqContext) {
    await RmqHelper.handleMessageProcessing(
      context,
      () => this.service.create(data.data, data.user),
      {
        queueName: 'company.created',
        useDLQ: true,
        dlqRoutingKey: 'dlq.company.created',
        prisma: this.prisma,
      },
    )();
  }

  @EventPattern('company.updated')
  @Exempt()
  async companyUpdated(@Payload() data: any, @Ctx() context: RmqContext) {
    await RmqHelper.handleMessageProcessing(
      context,
      () => this.service.update(data.data.id, data.data, data.user),
      {
        queueName: 'company.updated',
        useDLQ: true,
        dlqRoutingKey: 'dlq.company.updated',
        prisma: this.prisma,
      },
    )();
  }

  @EventPattern('company.deleted')
  @Exempt()
  async companyDeleted(@Payload() data: any, @Ctx() context: RmqContext) {
    await RmqHelper.handleMessageProcessing(
      context,
      () => this.service.delete(data.data, data.user),
      {
        queueName: 'company.deleted',
        useDLQ: true,
        dlqRoutingKey: 'dlq.company.deleted',
        prisma: this.prisma,
      },
    )();
  }

  @EventPattern('company.sync')
  @Exempt()
  async companySync(@Payload() data: any, @Ctx() context: RmqContext) {
    await RmqHelper.handleMessageProcessing(
      context,
      () => this.service.sync(data),
      {
        queueName: 'company.sync',
        useDLQ: true,
        dlqRoutingKey: 'dlq.company.sync',
        prisma: this.prisma,
      },
    )();
  }
}
