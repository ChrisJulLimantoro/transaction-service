import { Controller, Inject } from '@nestjs/common';
import {
  ClientProxy,
  ClientProxyFactory,
  Ctx,
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

  @MessagePattern({ cmd: 'get:transaction' })
  @Describe({
    description: 'Get All Transaction',
    fe: ['transaction/sales:open'],
  })
  async getTransaction(@Payload() data: any) {
    const filter = { store_id: data.body.auth.store_id };
    const { page, limit, sort, search } = data.body;
    const response = await this.transactionService.findAll(
      filter,
      page,
      limit,
      { date: 'desc' },
      search,
    );
    console.log(response.data.data);
    return response;
  }

  @MessagePattern({ cmd: 'get:transaction/*' })
  @Describe({
    description: 'Get Transaction By ID',
    fe: ['transaction/sales:edit', 'transaction/sales:detail'],
  })
  async getTransactionById(@Payload() data: any) {
    const id = data.params.id;
    return await this.transactionService.findOne(id);
  }

  @MessagePattern({ cmd: 'post:transaction' })
  @Describe({
    description: 'Create Transaction',
    fe: ['transaction/sales:add'],
  })
  async createTransaction(@Payload() data: any) {
    const response = await this.transactionService.create(data.body);
    if (response.success) {
      this.marketplaceClient.emit('transaction_operational_created', response);
    }
    return response;
  }

  @MessagePattern({ cmd: 'post:transaction-detail' })
  @Describe({
    description: 'Create Transaction Detail',
    fe: ['transaction/sales:edit'],
  })
  async createTransactionDetail(@Payload() data: any) {
    const response = await this.transactionService.createDetail(data.body);
    if (response) {
      this.marketplaceClient.emit('transaction_product_created', response.data);
    }
    return response;
  }

  @MessagePattern({ cmd: 'put:transaction/*' })
  @Describe({
    description: 'Update Transaction',
    fe: ['transaction/sales:edit'],
  })
  async updateTransaction(@Payload() data: any) {
    const id = data.params.id;
    const body = data.body;
    const response = await this.transactionService.update(id, body);
    if (response) {
      this.marketplaceClient.emit(
        'transaction_operational_updated',
        response.data,
      );
    }
    return await this.transactionService.update(id, body);
  }

  @MessagePattern({ cmd: 'put:transaction-detail/*' })
  @Describe({
    description: 'Update Transaction Detail',
    fe: ['transaction/sales:edit'],
  })
  async updateTransactionDetail(@Payload() data: any) {
    const id = data.params.id;
    const body = data.body;
    const response = await this.transactionService.updateDetail(id, body);
    if (response) {
      this.marketplaceClient.emit('transaction_detail_updated', response.data);
    }
    return response;
  }

  @MessagePattern({ cmd: 'delete:transaction/*' })
  @Describe({
    description: 'Delete Transaction',
    fe: ['transaction/sales:delete'],
  })
  async deleteTransaction(@Payload() data: any) {
    const id = data.params.id;
    const response = await this.transactionService.delete(id);
    if (response) {
      this.marketplaceClient.emit('transaction_deleted', { id: id });
    }
    return response;
  }

  @MessagePattern({ cmd: 'delete:transaction-detail/*' })
  @Describe({
    description: 'Delete Transaction Detail',
    fe: ['transaction/sales:edit'],
  })
  async deleteTransactionDetail(@Payload() data: any) {
    const id = data.params.id;
    const response = await this.transactionService.deleteDetail(id);
    if (response) {
      this.marketplaceClient.emit('transaction_detail_deleted', {
        id: id,
        data: response.data,
      });
    }
    return response;
  }

  @MessagePattern({ cmd: 'put:transaction-approve/*' })
  @Describe({
    description: 'Transaction Approve',
    fe: ['transaction/sales:approve'],
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
      newstatus,
    );
    if (res.success) {
      this.financeClient.emit({ cmd: 'sales_approved' }, res);
    }
    return res;
  }

  @MessagePattern({ cmd: 'put:transaction-disapprove/*' })
  @Describe({
    description: 'Transaction Disapprove',
    fe: ['transaction/sales:disapprove'],
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
      newstatus,
    );
    if (res.success) {
      this.financeClient.emit({ cmd: 'sales_disapproved' }, res);
    }
    return res;
  }

  // Marketplace Endpoint
  @MessagePattern({ module: 'transaction', action: 'notificationMidtrans' })
  @Exempt()
  async handleNotification(@Payload() query: any) {
    console.log(query);
    return this.transactionService.processMidtransNotification(query);
  }

  @MessagePattern({ module: 'transaction', action: 'createTransaction' })
  @Exempt()
  async createTransactionMarketplace(
    @Payload() data: any,
    @Ctx() context: RmqContext,
  ) {
    return this.transactionService.processMarketplaceTransaction(data, context);
  }
}
