import { Controller, Inject } from '@nestjs/common';
import {
  ClientProxy,
  ClientProxyFactory,
  Ctx,
  EventPattern,
  MessagePattern,
  Payload,
  RmqContext,
  Transport,
} from '@nestjs/microservices';
import { TransactionService } from './transaction.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { channel } from 'diagnostics_channel';
import { Describe } from 'src/decorator/describe.decorator';
import { Exempt } from 'src/decorator/exempt.decorator';
import { CustomResponse } from 'src/exception/dto/custom-response.dto';
import { RmqHelper } from 'src/helper/rmq.helper';

@Controller('transaction')
export class TransactionController {
  constructor(
    private readonly transactionService: TransactionService,
    private readonly prisma: PrismaService,
    @Inject('MARKETPLACE')
    private readonly marketplaceClient: ClientProxy,
    @Inject('FINANCE') private readonly financeClient: ClientProxy,
    @Inject('INVENTORY') private readonly inventoryClient: ClientProxy,
  ) {}

  @MessagePattern({ cmd: 'get:sales' })
  @Describe({
    description: 'Get All Sales',
    fe: ['transaction/sales:open'],
  })
  async getSales(@Payload() data: any) {
    const filter = {
      store_id: data.body.auth.store_id,
      transaction_type: 1,
      date: { start: data.body.dateStart, end: data.body.dateEnd },
      approve:
        data.body.approve != '' && data.body.approve != undefined
          ? Number(data.body.approve)
          : undefined,
    };
    const { page, limit, sort, search } = data.body;
    const response = await this.transactionService.findAll(
      filter,
      page,
      limit,
      { date: 'desc' },
      search,
    );
    return response;
  }

  @MessagePattern({ cmd: 'get:purchase' })
  @Describe({
    description: 'Get All Purchase',
    fe: ['transaction/purchase:open'],
  })
  async getPurchase(@Payload() data: any) {
    const filter = {
      store_id: data.body.auth.store_id,
      transaction_type: 2,
      date: { start: data.body.dateStart, end: data.body.dateEnd },
      approve:
        data.body.approve != '' && data.body.approve != undefined
          ? Number(data.body.approve)
          : undefined,
    };
    const { page, limit, sort, search } = data.body;
    const response = await this.transactionService.findAll(
      filter,
      page,
      limit,
      { date: 'desc' },
      search,
    );
    return response;
  }

  @MessagePattern({ cmd: 'get:trade' })
  @Describe({
    description: 'Get All Trade',
    fe: ['transaction/trade:open'],
  })
  async getTrade(@Payload() data: any) {
    const filter = {
      store_id: data.body.auth.store_id,
      transaction_type: 3,
      date: { start: data.body.dateStart, end: data.body.dateEnd },
      approve:
        data.body.approve != '' && data.body.approve != undefined
          ? Number(data.body.approve)
          : undefined,
    };
    const { page, limit, sort, search } = data.body;
    const response = await this.transactionService.findAll(
      filter,
      page,
      limit,
      { date: 'desc' },
      search,
    );
    return response;
  }

  @MessagePattern({ cmd: 'get:transproduct/*' })
  @Describe({
    description: 'Get All Purchase or Trade Product',
    fe: ['inventory/product:open', 'inventory/product:edit'],
  })
  async getPurSales(@Payload() data: any) {
    const response = await this.transactionService.findTransProduct(
      data.params.id,
    );
    return response;
  }

  @MessagePattern({ cmd: 'get:transproduct-notset' })
  @Describe({
    description: 'Get All Purchase or Trade Product Not Set',
    fe: ['inventory/product:open', 'inventory/product:edit'],
  })
  async getPurSalesNotSet(@Payload() data: any) {
    let filters = {};
    if (data.body.type) {
      filters['type'] = decodeURIComponent(data.body.type);
    }
    if (data.body.id) {
      filters['id'] = data.body.id;
    }
    const response = await this.transactionService.findProductNotSet(filters);
    return response;
  }

  @MessagePattern({ cmd: 'get:transaction/*' })
  @Describe({
    description: 'Get Transaction By ID',
    fe: [
      'transaction/sales:edit',
      'transaction/sales:detail',
      'transaction/purchase:edit',
      'transaction/purchase:detail',
      'transaction/trade:edit',
      'transaction/trade:detail',
    ],
  })
  async getTransactionById(@Payload() data: any) {
    const id = data.params.id;
    return await this.transactionService.findOne(id);
  }

  @MessagePattern({ cmd: 'get:transaction-nota/*' })
  @Describe({
    description: 'Get Transaction Nota',
    fe: [
      'transaction/sales:detail',
      'transaction/sales:edit',
      'transaction/purchase:detail',
      'transaction/purchase:edit',
      'transaction/trade:edit',
      'transaction/trade:detail',
    ],
  })
  async getTransactionNota(@Payload() data: any) {
    const id = data.params.id;
    return await this.transactionService.getPdfPath(id);
  }

  @MessagePattern({ cmd: 'post:transaction' })
  @Describe({
    description: 'Create Transaction',
    fe: [
      'transaction/sales:add',
      'transaction/purchase:add',
      'transaction/trade:add',
    ],
  })
  async createTransaction(@Payload() data: any) {
    if (data.body.status == 2) {
      data.body.approve = 1;
      data.body.approve_by = data.params.user.id;
    }
    const response = await this.transactionService.create(
      data.body,
      data.params.user.id,
    );
    if (response.success) {
      RmqHelper.publishEvent('transaction.created', {
        data: response.data,
        user: data.params.user.id,
      });

      const transaction = await this.transactionService.findOne(
        response.data.id,
      );
      RmqHelper.publishEvent('transaction.finance.created', {
        data: transaction,
        user: data.params.user.id,
      });
    }
    return response;
  }

  @EventPattern('transaction.created')
  @Exempt()
  async createTransactionReplica(
    @Payload() data: any,
    @Ctx() context: RmqContext,
  ) {
    await RmqHelper.handleMessageProcessing(
      context,
      async () => {
        console.log('Captured Transaction Create Event', data);
        await this.transactionService.createReplica(data.data, data.user);
      },
      {
        queueName: 'transaction.created',
        useDLQ: true,
        dlqRoutingKey: 'dlq.transaction.created',
        prisma: this.prisma,
      },
    )();
  }

  //TODO: change to PUBSUB
  @MessagePattern({ cmd: 'post:transaction-detail' })
  @Describe({
    description: 'Create Transaction Detail',
    fe: [
      'transaction/sales:edit',
      'transaction/purchase:edit',
      'transaction/trade:edit',
    ],
  })
  async createTransactionDetail(@Payload() data: any) {
    console.log('data body transaction detail', data.body);
    const response = await this.transactionService.createDetail(
      data.body,
      data.params.user.id,
    );
    if (response) {
      RmqHelper.publishEvent('transaction.detail.created', {
        data: response.data,
        user: data.params.user.id,
      });
      await this.publishTransactionUpdate(data.body.transaction_id);
    }
    return response;
  }

  @EventPattern('transaction.detail.created')
  @Exempt()
  async createTransactionDetailReplica(
    @Payload() data: any,
    @Ctx() context: RmqContext,
  ) {
    await RmqHelper.handleMessageProcessing(
      context,
      async () => {
        console.log('Captured Transaction Detail Create Event', data);
        await this.transactionService.createDetailReplica(data.data, data.user);
      },
      {
        queueName: 'transaction.detail.created',
        useDLQ: true,
        dlqRoutingKey: 'dlq.transaction.detail.created',
        prisma: this.prisma,
      },
    )();
  }

  @MessagePattern({ cmd: 'put:transaction/*' })
  @Describe({
    description: 'Update Transaction',
    fe: [
      'transaction/sales:edit',
      'transaction/purchase:edit',
      'transaction/trade:edit',
    ],
  })
  async updateTransaction(@Payload() data: any) {
    const id = data.params.id;
    const body = data.body;
    const response = await this.transactionService.update(
      id,
      body,
      data.params.user.id,
    );
    if (response) {
      RmqHelper.publishEvent('transaction.updated', {
        data: response.data,
        user: data.params.user.id,
      });
      await this.publishTransactionUpdate(id);
    }
    return response;
  }

  @EventPattern('transaction.updated')
  @Exempt()
  async updateTransactionReplica(
    @Payload() data: any,
    @Ctx() context: RmqContext,
  ) {
    await RmqHelper.handleMessageProcessing(
      context,
      async () => {
        console.log('Captured Transaction Update Event', data);
        return await this.transactionService.update(
          data.data.id,
          data.data,
          data.user,
        );
      },
      {
        queueName: 'transaction.updated',
        useDLQ: true,
        dlqRoutingKey: 'dlq.transaction.updated',
        prisma: this.prisma,
      },
    )();
  }

  @MessagePattern({ cmd: 'put:transaction-detail/*' })
  @Describe({
    description: 'Update Transaction Detail',
    fe: [
      'transaction/sales:edit',
      'transaction/purchase:edit',
      'transaction/trade:edit',
    ],
  })
  async updateTransactionDetail(@Payload() data: any) {
    // console.log('data transaction detail', data);
    const id = data.params.id;
    const body = data.body;
    const response = await this.transactionService.updateDetail(
      id,
      body,
      data.params.user.id,
    );
    if (response) {
      RmqHelper.publishEvent('transaction.detail.updated', {
        data: response.data.updatedDetail,
        user: data.params.user.id,
      });
      RmqHelper.publishEvent('transaction.updated', {
        data: response.data.syncResult,
        user: data.params.user.id,
      });
      this.publishTransactionUpdate(response.data.updatedDetail.transaction_id);
    }
    return response;
  }

  @EventPattern('transaction.detail.updated')
  @Exempt()
  async updateTransactionDetailReplica(
    @Payload() data: any,
    @Ctx() context: RmqContext,
  ) {
    await RmqHelper.handleMessageProcessing(
      context,
      async () => {
        console.log('Captured Transaction Detail Update Event', data);
        return await this.transactionService.updateDetailReplica(
          data.data,
          data.user,
        );
      },
      {
        queueName: 'transaction.detail.updated',
        useDLQ: true,
        dlqRoutingKey: 'dlq.transaction.detail.updated',
        prisma: this.prisma,
      },
    )();
  }

  @MessagePattern({ cmd: 'delete:transaction/*' })
  @Describe({
    description: 'Delete Transaction',
    fe: [
      'transaction/sales:delete',
      'transaction/purchase:delete',
      'transaction/trade:delete',
    ],
  })
  async deleteTransaction(@Payload() data: any) {
    const id = data.params.id;
    const response = await this.transactionService.delete(
      id,
      data.params.user.id,
    );
    if (response) {
      RmqHelper.publishEvent('transaction.deleted', {
        id: id,
        user: data.params.user.id,
      });

      RmqHelper.publishEvent('transaction.finance.deleted', {
        data: response,
        user: data.params.user.id,
      });
    }
    return response;
  }

  @EventPattern('transaction.deleted')
  @Exempt()
  async deleteTransactionReplica(
    @Payload() data: any,
    @Ctx() context: RmqContext,
  ) {
    await RmqHelper.handleMessageProcessing(
      context,
      async () => {
        console.log('Captured Transaction Delete Event', data);
        return await this.transactionService.deleteReplica(data.id, data.user);
      },
      {
        queueName: 'transaction.deleted',
        useDLQ: true,
        dlqRoutingKey: 'dlq.transaction.deleted',
        prisma: this.prisma,
      },
    )();
  }

  @MessagePattern({ cmd: 'delete:transaction-detail/*' })
  @Describe({
    description: 'Delete Transaction Detail',
    fe: [
      'transaction/sales:edit',
      'transaction/purchase:edit',
      'transaction/trade:edit',
    ],
  })
  async deleteTransactionDetail(@Payload() data: any) {
    const id = data.params.id;
    const response = await this.transactionService.deleteDetail(
      id,
      data.params.user.id,
    );
    if (response.success) {
      RmqHelper.publishEvent('transaction.detail.deleted', {
        id: id,
        data: response.data,
        user: data.params.user.id,
      });
      this.publishTransactionUpdate(response.data.id);
    }
    return response;
  }

  @EventPattern('transaction.detail.deleted')
  @Exempt()
  async deleteTransactionDetailReplica(
    @Payload() data: any,
    @Ctx() context: RmqContext,
  ) {
    await RmqHelper.handleMessageProcessing(
      context,
      async () => {
        console.log('Captured Transaction Detail Delete Event', data);
        return await this.transactionService.deleteDetailReplica(
          data.id,
          data.user,
        );
      },
      {
        queueName: 'transaction.detail.deleted',
        useDLQ: true,
        dlqRoutingKey: 'dlq.transaction.detail.deleted',
        prisma: this.prisma,
      },
    )();
  }

  private async publishTransactionUpdate(id: string) {
    const transaction = await this.transactionService.findOne(id);
    if (transaction) {
      RmqHelper.publishEvent('transaction.finance.updated', {
        data: transaction,
      });
    } else {
      return CustomResponse.error(
        'Transaction not found',
        [
          {
            message: 'Transaction not found',
            field: 'transaction_id',
            code: 'not_found',
          },
        ],
        404,
      );
    }
  }
  // Transaction status Done
  @MessagePattern({ cmd: 'put:transaction-approve/*' })
  @Describe({
    description: 'Transaction Approve',
    fe: [
      'transaction/sales:approve',
      'transaction/purchase:approve',
      'transaction/trade:approve',
    ],
  })
  async transactionApprove(@Payload() data: any) {
    var newdata = data.body;
    const params = data.params;
    var newstatus = newdata.approve;

    // Validation
    if (!Number.isInteger(newstatus) || newstatus < 0 || newstatus > 2) {
      return CustomResponse.error(
        'Status not valid!',
        [
          {
            message: 'Status not valid!',
            field: 'approve',
            code: 'not_valid',
          },
        ],
        400,
      );
    }
    const res = await this.transactionService.updateStatus(
      params.id,
      { approve: 1, status: 2, approve_by: data.params.user.id },
      data.params.user.id,
    );
    if (res.success) {
      console.log(
        'res di trans acpprove sales',
        res.data.transaction_products[0],
      );
      RmqHelper.publishEvent('transaction.updated', {
        data: res.data,
        user: data.params.user.id,
      });
      RmqHelper.publishEvent('transaction.finance.updated', {
        user: data.params.user.id,
        data: res,
      });
    }
    return res;
  }

  // Back to status paid
  @MessagePattern({ cmd: 'put:transaction-disapprove/*' })
  @Describe({
    description: 'Transaction Disapprove',
    fe: [
      'transaction/sales:disapprove',
      'transaction/purchase:disapprove',
      'transaction/trade:disapprove',
    ],
  })
  async transactionDisapprove(@Payload() data: any) {
    var newdata = data.body;
    const params = data.params;
    var newstatus = newdata.approve;

    // Validation
    if (!Number.isInteger(newstatus) || newstatus < 0 || newstatus > 2) {
      return CustomResponse.error(
        'Status not valid!',
        [
          {
            message: 'Status not valid!',
            field: 'approve',
            code: 'not_valid',
          },
        ],
        400,
      );
    }

    const res = await this.transactionService.updateStatus(
      params.id,
      { approve: 0, status: 1, approve_by: null },
      data.params.user.id,
    );
    if (res.success) {
      RmqHelper.publishEvent('transaction.updated', {
        data: res.data,
        user: data.params.user.id,
      });

      RmqHelper.publishEvent('transaction.finance.updated', {
        user: data.params.user.id,
        data: res,
      });
    }
    return res;
  }

  // @EventPattern('transaction.status.updated')
  // @Exempt()
  // async transactionStatusUpdated(
  //   @Payload() data: any,
  //   @Ctx() context: RmqContext,
  // ) {
  //   await RmqHelper.handleMessageProcessing(
  //     context,
  //     async () => {
  //       console.log('Captured Transaction Status Update Event', data);
  //       return await this.transactionService.updateStatus(
  //         data.id,
  //         data.status,
  //         data.user,
  //       );
  //     },
  //     {
  //       queueName: 'transaction.status.updated',
  //       useDLQ: true,
  //       dlqRoutingKey: 'dlq.transaction.status.updated',
  //       prisma: this.prisma,
  //     },
  //   )();
  // }

  // Marketplace Endpoint
  @MessagePattern({ module: 'transaction', action: 'notificationTripay' })
  @Exempt()
  async handleNotification(@Payload() query: any) {
    console.log('NOTIF RECEIVED: ' + query);
    return this.transactionService.processTripayNotification(query);
  }

  @MessagePattern({ module: 'transaction', action: 'createTransaction' })
  @Exempt()
  async createTransactionMarketplace(
    @Payload() data: any,
    @Ctx() context: RmqContext,
  ) {
    return this.transactionService.processMarketplaceTransaction(data, context);
  }

  @EventPattern('transaction.marketplace.created')
  @Exempt()
  async createMarketplaceTransactionReplica(
    @Payload() data: any,
    @Ctx() context: RmqContext,
  ) {
    console.log('Captured Marketplace Transaction Create Event', data);
    await RmqHelper.handleMessageProcessing(
      context,
      async () => {
        await this.transactionService.createMarketplaceReplica(
          data.transaction,
        );
      },
      {
        queueName: 'transaction.marketplace.created',
        useDLQ: true,
        dlqRoutingKey: 'dlq.transaction.marketplace.created',
        prisma: this.prisma,
      },
    )();
  }

  @EventPattern('transaction.marketplace.settlement')
  @Exempt()
  async marketplaceTransactionSettlement(
    @Payload() data: any,
    @Ctx() context: RmqContext,
  ) {
    await RmqHelper.handleMessageProcessing(
      context,
      async () => {
        console.log('Captured Marketplace Transaction Settlement Event', data);
        await this.transactionService.marketplaceTransactionSettlementReplica(
          data.id,
        );
      },
      {
        queueName: 'transaction.marketplace.settlement',
        useDLQ: true,
        dlqRoutingKey: 'dlq.transaction.marketplace.settlement',
        prisma: this.prisma,
      },
    )();
  }

  @EventPattern('transaction.marketplace.failed')
  @Exempt()
  async marketplaceTransactionFailed(
    @Payload() data: any,
    @Ctx() context: RmqContext,
  ) {
    await RmqHelper.handleMessageProcessing(
      context,
      async () => {
        console.log('Captured Marketplace Transaction Failed Event', data);
        await this.transactionService.marketplaceTransactionFailedReplica(
          data.id,
        );
      },
      {
        queueName: 'transaction.marketplace.failed',
        useDLQ: true,
        dlqRoutingKey: 'dlq.transaction.marketplace.failed',
        prisma: this.prisma,
      },
    )();
  }
}
