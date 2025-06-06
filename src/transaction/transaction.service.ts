import { Inject, Injectable } from '@nestjs/common';
import axios from 'axios';
import { BaseService } from 'src/base.service';
import { TransactionRepository } from 'src/repositories/transaction.repository';
import { ValidationService } from 'src/validation/validation.service';
import { v4 as uuidv4 } from 'uuid';
import { CreateTransactionRequest } from './dto/create-transaction.dto';
import { UpdateTransactionRequest } from './dto/update-transaction.dto';
import { CustomResponse } from 'src/exception/dto/custom-response.dto';
import { CreateTransactionProductRequest } from './dto/create-transaction-product.dto';
import { CreateTransactionOperationRequest } from './dto/create-transaction-operation.dto';
import { TransactionProductRepository } from 'src/repositories/transaction-product.repository';
import { TransactionOperationRepository } from 'src/repositories/transaction-operation.repository';
import { PrismaService } from 'src/prisma/prisma.service';
import { ProductCodeRepository } from 'src/repositories/product-code.repository';
import { ClientProxy, RmqContext, RpcException } from '@nestjs/microservices';
import { PdfService } from './pdf.service';
import * as fs from 'fs-extra';
import * as path from 'path';
import { Cron, CronExpression } from '@nestjs/schedule';
import { RmqHelper } from 'src/helper/rmq.helper';
import * as crypto from 'crypto';
import * as qs from 'qs';

@Injectable()
export class TransactionService extends BaseService {
  protected repository = this.transactionRepository;
  protected createSchema = CreateTransactionRequest.schema();
  protected updateSchema = UpdateTransactionRequest.schema();
  private storagePath = path.join(__dirname, '..', '..', 'storage', 'notas');

  constructor(
    private readonly transactionRepository: TransactionRepository,
    private readonly transactionProductRepository: TransactionProductRepository,
    private readonly transactionOperationRepository: TransactionOperationRepository,
    private readonly productCodeRepository: ProductCodeRepository,
    protected readonly validation: ValidationService,
    protected readonly pdfService: PdfService,
    private readonly prisma: PrismaService,
    @Inject('INVENTORY') private readonly inventoryClient: ClientProxy,
    @Inject('MARKETPLACE') private readonly marketplaceClient: ClientProxy,
    @Inject('AUTH') private readonly authClient: ClientProxy,
  ) {
    super(validation);
  }

  protected transformCreateData(data: any) {
    return new CreateTransactionRequest(data);
  }

  protected transformUpdateData(data: any) {
    return new UpdateTransactionRequest(data);
  }

  private readonly transanctionType = {
    1: { name: 'Sales', label: 'SAL' },
    2: { name: 'Purchase', label: 'PUR' },
    3: { name: 'Trade', label: 'TRA' },
  };

  @Cron(CronExpression.EVERY_5_SECONDS)
  async autoExpireUnpaidTransactions() {
    console.log('🔁 Running auto-expire check for unpaid transactions');

    const now = new Date();
    now.setHours(now.getHours() + 7); // WIB offset

    const expiredTransactions = await this.prisma.transaction.findMany({
      where: {
        deleted_at: null,
        expired_at: {
          not: null,
          lt: now,
        },
        status: {
          notIn: [1, 2, -1],
        },
      },
      select: {
        id: true,
      },
    });

    console.log(`🕒 Found ${expiredTransactions.length} expired transactions`);

    for (const trx of expiredTransactions) {
      console.warn(`⛔ Expiring transaction ${trx.id}`);

      try {
        await this.processTripayNotification({
          transaction_status: 'expired',
          merchant_ref: trx.id,
          is_closed_payment: 1,
        });
      } catch (error) {
        console.error(
          `❌ Failed to expire transaction ${trx.id}: ${error.message}`,
        );
      }
    }
  }

  async create(data: any, user_id?: string): Promise<CustomResponse> {
    if (data.transaction_details.length === 0) {
      return CustomResponse.error(
        'Transaction Details must not be empty',
        null,
        400,
      );
    }

    // Generate Code
    var transaction = null;
    await this.prisma.$transaction(async (tx) => {
      const date = new Date(data.date);
      const count = await this.repository.count(
        {
          transaction_type: data.transaction_type,
          date: {
            gte: new Date(date.getFullYear(), date.getMonth(), date.getDate()),
            lt: new Date(
              date.getFullYear(),
              date.getMonth(),
              date.getDate() + 1,
            ),
          },
        },
        tx,
      );
      const store = await this.prisma.store.findUnique({
        where: { id: data.store_id },
      });

      const baseCode = `${this.transanctionType[data.transaction_type].label}/${store.code}/${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;

      let attempt = count;
      let code = '';

      while (true) {
        if (attempt === 0) {
          attempt++;
        }
        const paddedNumber = attempt.toString().padStart(3, '0');
        code = `${baseCode}/${paddedNumber}`;

        const existing = await this.prisma.transaction.findFirst({
          where: { code },
        });

        if (!existing) {
          break;
        }

        attempt++;
      }

      data.code = code;
      data.paid_amount = data.total_price;

      console.log('Data transaksi ' + data.code);

      const transData = new CreateTransactionRequest(data);
      const validatedData = this.validation.validate(
        transData,
        this.createSchema,
      );
      transaction = await this.repository.create(validatedData, tx, user_id);
    });

    if (!transaction) {
      return CustomResponse.error('Failed to create transaction', null, 500);
    }

    // Create Transaction Details
    const transactionDetails = [];
    for (const detail of data.transaction_details) {
      transactionDetails.push({
        ...detail,
        transaction_id: transaction.id,
        weight: detail.quantity,
        unit: detail.quantity,
        status: 1,
      });
    }

    var transDetails = [];
    console.log('transactionDetails', transactionDetails);
    for (const detail of transactionDetails) {
      try {
        var newdetail = await this.createDetail(detail, user_id);
      } catch (error) {
        // delete transaction if failed to create detail
        console.error('Failed to create transaction detail', error);
        await this.repository.delete(transaction.id);
        return CustomResponse.error(
          'Failed to create transaction detail',
          null,
          500,
        );
      }
      if (newdetail.success) transDetails.push(newdetail.data);
    }

    data = transaction;
    data.transaction_details = transDetails;
    this.generatePdf(transaction.id, user_id);
    return CustomResponse.success('Transaction created successfully', data);
  }

  async createReplica(data: any, user_id?: string) {
    // Check if already exist
    const transactionCheck = await this.repository.findOne(data.id);
    if (transactionCheck) {
      throw new RpcException('Transaction already exists');
    }
    // Create transaction first
    const createData = { ...data };
    createData.delete('transaction_details');
    const transaction = await this.repository.create(createData, null, user_id);
    if (!transaction) {
      throw new RpcException('Failed to create transaction');
    }
    // Create transaction details
    const transactionDetails = data['transaction_details'];
    for (const detail of transactionDetails) {
      if (detail['type'] == 'Operation') {
        const td = await this.transactionOperationRepository.create(
          detail,
          null,
          user_id,
        );
        if (!td) {
          throw new RpcException('Failed to create transaction detail');
        }
      } else {
        const td = await this.transactionProductRepository.create(
          detail,
          null,
          user_id,
        );
        if (!td) {
          throw new RpcException('Failed to create transaction detail');
        }
      }
    }
  }

  async update(
    id: string,
    data: any,
    user_id?: string,
  ): Promise<CustomResponse> {
    if (data.status) {
      if (data.status == 2) {
        data.approve = 1;
        data.approve_by = user_id;
      } else {
        data.approve = 0;
        data.approve_by = null;
      }
      // update status of the detail too
      const transaction = await this.repository.findOne(id);
      if (!transaction) {
        return CustomResponse.error('Transaction not found', null, 404);
      }
      const products = transaction.transaction_products;
      for (const product of products) {
        await this.transactionProductRepository.update(
          product.id,
          {
            status: data.status,
          },
          null,
          user_id,
        );
      }
    }
    await super.update(id, data, user_id);
    // Generate PDF
    const response = await this.generatePdf(id, user_id);
    return response;
  }

  async createDetail(data: any, user_id?: string): Promise<CustomResponse> {
    const transaction = await this.repository.findOne(data.transaction_id);
    if (!transaction) {
      return CustomResponse.error(
        'Transaction has not created yet.',
        null,
        404,
      );
    }
    var validatedData = null;
    var result = null;
    data.status = transaction.status == 2 ? 2 : 1;
    if (data.detail_type == 'product' && data.product_code_id != null) {
      // Check if item available
      const product = await this.productCodeRepository.findOne(
        data.product_code_id,
      );
      if (!product) {
        throw new RpcException('Product not found');
      }
      if (
        ![0, 2].includes(product.status) &&
        transaction.transaction_type == 1
      ) {
        throw new RpcException('Product not available for sales');
      }
      if (product.status != 1 && transaction.transaction_type == 2) {
        throw new RpcException('Product not available for bought back');
      }
      const transactionDetail = new CreateTransactionProductRequest(data);
      console.log('transactionDetail', transactionDetail);
      validatedData = this.validation.validate(
        transactionDetail,
        CreateTransactionProductRequest.schema(),
      );
      result = await this.transactionProductRepository.create(
        validatedData,
        null,
        user_id,
      );
      // Update product status Locally
      const code = await this.productCodeRepository.update(
        data.product_code_id,
        {
          status:
            data.transaction_type == 1 ? 1 : data.transaction_type == 2 ? 2 : 0,
        },
        null,
        user_id,
      );
      console.log('code', code);
      // Broadcast the update to other services
      RmqHelper.publishEvent('product.code.updated', {
        data: {
          id: code.id,
          status: code.status,
        },
        user: user_id,
      });
      // this.inventoryClient.emit(
      //   { cmd: 'product_code_updated' },
      //   {
      //     id: code.id,
      //     status: code.status,
      //   },
      // );
    } else if (data.detail_type == 'operation') {
      data.total_price =
        Number(data.unit) * Number(data.price) + Number(data.adjustment_price);
      const transactionDetail = new CreateTransactionOperationRequest(data);
      validatedData = this.validation.validate(
        transactionDetail,
        CreateTransactionOperationRequest.schema(),
      );
      result = await this.transactionOperationRepository.create(
        validatedData,
        null,
        user_id,
      );
    } else {
      const transactionDetail = new CreateTransactionProductRequest(data);
      console.log('transactionDetail', transactionDetail);

      validatedData = this.validation.validate(
        transactionDetail,
        CreateTransactionProductRequest.schema(),
      );
      result = await this.transactionProductRepository.create(
        validatedData,
        null,
        user_id,
      );
    }

    if (!result) {
      throw new RpcException('Failed to create transaction detail');
    }
    const transactionRes = await this.syncDetail(data.transaction_id);
    result.transaction = transactionRes;

    return CustomResponse.success(
      'Transaction Detail created successfully',
      result,
      201,
    );
  }

  async createDetailReplica(data: any, user_id?: string) {
    // Check if already exist
    if (data.type == 'Operation') {
      const tdc = await this.transactionOperationRepository.findOne(data.id);
      if (tdc) {
        throw new RpcException('Transaction Detail already exists');
      }
      // Create transaction detail first
      const created = await this.transactionOperationRepository.create(
        data,
        null,
        user_id,
      );
      if (!created) {
        throw new RpcException('Failed to create transaction detail');
      }
    } else {
      const tpc = await this.transactionProductRepository.findOne(data.id);
      if (tpc) {
        throw new RpcException('Transaction Detail already exists');
      }
      // Create transaction detail first
      const created = await this.transactionProductRepository.create(
        data,
        null,
        user_id,
      );
      if (!created) {
        throw new RpcException('Failed to create transaction detail');
      }
    }
  }

  async updateDetail(
    id: string,
    data: any,
    user_id?: string,
  ): Promise<CustomResponse> {
    data.unit = data.quantity; // for now assume unit is same as quantity [for Operation]
    data.weight = data.quantity; // for now assume weight is same as quantity [for product]

    let updatedDetail;
    if (data.detail_type == 'operation') {
      data.total_price =
        data.unit * Number(data.price) + Number(data.adjustment_price);
      try {
        const transactionDetail =
          await this.transactionOperationRepository.findOne(id);
        console.log('transactiondetail id', id);
        if (!transactionDetail) {
          return CustomResponse.error(
            'Transaction Detail not found',
            null,
            404,
          );
        }
      } catch (error) {
        console.error('Error fetching transaction detail:', error);
        return CustomResponse.error('Transaction Detail not found', null, 404);
      }
      const transactionDetailData = new CreateTransactionOperationRequest(data);
      const validatedData = this.validation.validate(
        transactionDetailData,
        CreateTransactionOperationRequest.schema(),
      );
      await this.transactionOperationRepository.update(
        id,
        validatedData,
        null,
        user_id,
      );
      updatedDetail = await this.transactionOperationRepository.findOne(id); // Fetch updated data
    } else {
      const transactionDetail =
        await this.transactionProductRepository.findOne(id);
      if (
        data.transaction_type == 2 &&
        data.adjustment_price == transactionDetail.adjustment_price
      ) {
        // adjust the adjustment_price
        const res = await this.updateAdjust(data);
        data.adjustment_price = res * -1;
      }
      data.total_price =
        (data.weight * Number(data.price) + Number(data.adjustment_price)) *
        (data.transaction_type == 2 ? -1 : 1);
      if (!transactionDetail) {
        return CustomResponse.error('Transaction Detail not found', null, 404);
      }
      const transactionDetailData = new CreateTransactionProductRequest(data);
      console.log('transactionDetailData', transactionDetailData);
      const validatedData = this.validation.validate(
        transactionDetailData,
        CreateTransactionProductRequest.schema(),
      );
      await this.transactionProductRepository.update(
        id,
        validatedData,
        null,
        user_id,
      );
      updatedDetail = await this.transactionProductRepository.findOne(id); // Fetch updated data
    }

    const syncResult = await this.syncDetail(data.transaction_id, user_id); // Get sync detail result

    return CustomResponse.success('Transaction Detail updated successfully', {
      updatedDetail,
      syncResult,
    });
  }

  async updateDetailReplica(data: any, user_id?: string) {
    // Check if already exist
    if (data.type == 'Operation') {
      const tdc = await this.transactionOperationRepository.findOne(data.id);
      if (!tdc) {
        throw new RpcException('Transaction Detail not exist');
      }
      // Create transaction detail first
      const updated = await this.transactionOperationRepository.update(
        data.id,
        data,
        null,
        user_id,
      );
      if (!updated) {
        throw new RpcException('Failed to create transaction detail');
      }
    } else {
      const tpc = await this.transactionProductRepository.findOne(data.id);
      if (!tpc) {
        throw new RpcException('Transaction Detail not exists');
      }
      // Create transaction detail first
      const updated = await this.transactionProductRepository.update(
        data.id,
        data,
        null,
        user_id,
      );
      if (!updated) {
        throw new RpcException('Failed to create transaction detail');
      }
    }
  }

  async updateAdjust(data: any): Promise<number> {
    // Get transaction
    const trans = await this.transactionRepository.findOne(data.transaction_id);
    // Get the store
    const store = await this.prisma.store.findFirst({
      where: { id: trans.store_id, deleted_at: null },
    });
    // Get the type
    const type = await this.prisma.type.findFirst({
      where: { code: data.type.split(' - ')[0], deleted_at: null },
    });
    var newPrice = 0;
    if (store.is_float_price || data.product_code_id == null) {
      const price = await this.prisma.price.findFirst({
        where: {
          type_id: type.id,
          date: {
            lte: new Date(),
          },
          is_active: true,
        },
        orderBy: {
          date: 'desc',
        },
      });
      newPrice = Number(price.price);
    } else {
      // Get the product to find price
      const product = await this.productCodeRepository.findOne(
        data.product_code_id,
      );
      newPrice = product.fixed_price;
    }

    var adjust = 0;
    if (data.is_broken) {
      adjust =
        Number(type.fixed_broken_reduction) > 0
          ? Number(type.fixed_broken_reduction)
          : (Number(type.percent_broken_reduction) * newPrice * data.weight) /
            100;
    } else {
      adjust =
        Number(type.fixed_price_reduction) > 0
          ? Number(type.fixed_price_reduction)
          : (Number(type.percent_price_reduction) * newPrice * data.weight) /
            100;
    }

    return adjust;
  }

  async deleteDetail(id: string, user_id?: string): Promise<CustomResponse> {
    const product = await this.transactionProductRepository.findOne(id);
    const operation = await this.transactionOperationRepository.findOne(id);
    console.log('delete detail id', id, product, operation);

    if (!product && !operation) {
      return CustomResponse.error('Transaction Detail not found', null, 404);
    }

    if (product) {
      await this.transactionProductRepository.delete(id, null, user_id);
      if (product.product_code_id != null) {
        if (product.product_code.status == 2 && product.transaction_type == 1) {
          return CustomResponse.error('Product Already bought back', null, 400);
        }
        // Update product status Locally
        const code = await this.productCodeRepository.update(
          product.product_code_id,
          {
            status:
              product.transaction_type == 1
                ? 0
                : product.transaction_type == 2
                  ? 1
                  : 0,
          },
        );
        // Broadcast the update to other services
        RmqHelper.publishEvent('product.code.updated', {
          data: {
            id: code.id,
            status: code.status,
          },
          user: user_id,
        });
        // this.inventoryClient.emit(
        //   { cmd: 'product_code_updated' },
        //   {
        //     id: code.id,
        //     status: code.status,
        //   },
        // );
      }
    } else {
      await this.transactionOperationRepository.delete(id, null, user_id);
    }

    const updated = await this.syncDetail(
      product ? product.transaction_id : operation.transaction_id,
      user_id,
    );

    return CustomResponse.success(
      'Transaction Detail deleted successfully',
      updated,
    );
  }

  async deleteDetailReplica(id: string, user_id?: string) {
    const product = await this.transactionProductRepository.findOne(id);
    const operation = await this.transactionOperationRepository.findOne(id);

    if (!product && !operation) {
      return CustomResponse.error('Transaction Detail not found', null, 404);
    }

    if (product) {
      if (product.product_code.status == 2 && product.transaction_type == 1) {
        return CustomResponse.error('Product Already bought back', null, 400);
      }
      await this.transactionProductRepository.delete(id, null, user_id);
    } else {
      await this.transactionOperationRepository.delete(id, null, user_id);
    }

    const updated = await this.syncDetail(
      product ? product.transaction_id : operation.transaction_id,
      user_id,
    );

    return CustomResponse.success(
      'Transaction Detail deleted successfully',
      updated,
    );
  }

  async syncDetail(transaction_id: string, user_id?: string) {
    console.log('sync detail', transaction_id);
    // Get Transaction
    const transaction = await this.repository.findOne(transaction_id);
    if (!transaction) {
      return CustomResponse.error('Transaction not found', null, 404);
    }
    // Calculate for price and responsibility
    const operations = await this.transactionOperationRepository.findAll({
      transaction_id: transaction_id,
    });
    const products = await this.transactionProductRepository.findAll({
      transaction_id: transaction_id,
    });

    let subtotal = 0;
    let subtotalSales = 0;
    let tax = null;
    for (const operation of operations.data) {
      subtotal +=
        Number(operation.unit) * operation.price +
        parseFloat(operation.adjustment_price);
      subtotalSales +=
        Number(operation.unit) * operation.price +
        parseFloat(operation.adjustment_price);
      if (tax == null) {
        tax = parseFloat(operation.transaction.tax_percent);
      }
    }
    for (const product of products.data) {
      let suffix = 1;
      if (product.transaction_type == 2) {
        suffix = -1;
      }
      subtotal +=
        (product.weight * product.price +
          parseFloat(product.adjustment_price)) *
        suffix;
      if (tax == null) {
        tax = parseFloat(product.transaction.tax_percent);
      }
      if (product.transaction_type == 1) {
        subtotalSales +=
          Number(product.weight) * Number(product.price) +
          Number(product.adjustment_price);
      }
    }

    // calculate tax price
    const currTax =
      subtotalSales * (tax / 100) +
      parseFloat(transaction.adjustment_price) * (tax / 100);

    const updateData = {
      sub_total_price: subtotal,
      tax_price: currTax,
      total_price:
        subtotal + currTax + parseFloat(transaction.adjustment_price),
      paid_amount:
        subtotal + currTax + parseFloat(transaction.adjustment_price),
    };
    console.log('Not_error', transaction_id);
    const res = await this.transactionRepository.update(
      transaction_id,
      updateData,
      null,
      user_id,
    );
    return res;
  }

  async delete(id: string, user_id?: string): Promise<CustomResponse> {
    const transaction = await this.repository.findOne(id);
    if (!transaction) {
      return CustomResponse.error('Transaction not found', null, 404);
    }
    // if (
    //   transaction.payment_link != null &&
    //   transaction.status != 0 &&
    //   transaction.status != -1
    // ) {
    //   return CustomResponse.error(
    //     'Marketplace transactions cannot be deleted in settlement status',
    //     null,
    //     404,
    //   );
    // }

    const transactionProduct = await this.prisma.transactionProduct.findMany({
      where: { transaction_id: id },
      include: { product_code: true },
    });

    const transactionOperation =
      await this.prisma.transactionOperation.findMany({
        where: { transaction_id: id },
      });

    try {
      const dataDeleted = await this.prisma.$transaction(async (tx) => {
        for (const detail of transactionProduct) {
          if (
            detail.product_code != null &&
            detail.product_code.status == 2 &&
            transaction.transaction_type == 1
          ) {
            throw new RpcException(
              'Product Already bought back, failed to delete transaction!',
            );
          }

          await this.transactionProductRepository.delete(
            detail.id,
            tx,
            user_id,
          );

          if (detail.product_code_id != null) {
            const code = await this.productCodeRepository.update(
              detail.product_code_id,
              {
                status: detail.transaction_type == 1 ? 0 : 1,
              },
              tx,
              user_id,
            );
            console.log('code deleted', code);

            // Broadcast update after transaction commits
            RmqHelper.publishEvent('product.code.updated', {
              data: {
                id: code.id,
                status: code.status,
              },
              user: user_id,
            });
            // this.inventoryClient.emit(
            //   { cmd: 'product_code_updated' },
            //   {
            //     id: code.id,
            //     status: code.status,
            //   },
            // );
          }
        }

        for (const detail of transactionOperation) {
          await this.transactionOperationRepository.delete(
            detail.id,
            tx,
            user_id,
          );
        }

        return await this.repository.delete(id, tx, user_id);
      });

      // PUT it Outside of transaction
      if (transaction.nota_link != null) {
        const filePath = path.join(
          this.storagePath,
          `${transaction.nota_link}`,
        );
        fs.unlink(filePath, (err) => {
          if (err) {
            console.error('Error deleting file:', err);
          } else {
            console.log('File deleted successfully:', filePath);
          }
        });
      }

      return CustomResponse.success(
        'Transaction deleted successfully',
        dataDeleted,
      );
    } catch (error) {
      console.error('Failed to delete transaction:', error);
      return CustomResponse.error(error.message, null, 500);
    }
  }

  async deleteReplica(id: string, user_id?: string) {
    const transaction = await this.repository.findOne(id);
    if (!transaction) {
      return CustomResponse.error('Transaction not found', null, 404);
    }
    if (
      transaction.payment_link != null &&
      transaction.status != 0 &&
      transaction.status != 1 &&
      transaction.status != -1
    ) {
      return CustomResponse.error(
        'Marketplace transactions cannot be deleted in settlement status',
        null,
        404,
      );
    }

    const transactionProduct = await this.prisma.transactionProduct.findMany({
      where: { transaction_id: id },
      include: { product_code: true },
    });

    const transactionOperation =
      await this.prisma.transactionOperation.findMany({
        where: { transaction_id: id },
      });

    try {
      const dataDeleted = await this.prisma.$transaction(async (tx) => {
        for (const detail of transactionProduct) {
          if (
            detail.product_code != null &&
            detail.product_code.status == 2 &&
            transaction.transaction_type == 1
          ) {
            throw new RpcException(
              'Product Already bought back, failed to delete transaction!',
            );
          }

          await this.transactionProductRepository.delete(
            detail.id,
            tx,
            user_id,
          );
        }

        for (const detail of transactionOperation) {
          await this.transactionOperationRepository.delete(
            detail.id,
            tx,
            user_id,
          );
        }

        return await this.repository.delete(id, tx, user_id);
      });

      // PUT it Outside of transaction
      if (transaction.nota_link != null) {
        const filePath = path.join(
          this.storagePath,
          `${transaction.nota_link}`,
        );
        fs.unlink(filePath, (err) => {
          if (err) {
            console.error('Error deleting file:', err);
          } else {
            console.log('File deleted successfully:', filePath);
          }
        });
      }

      return CustomResponse.success(
        'Transaction deleted successfully',
        dataDeleted,
      );
    } catch (error) {
      console.error('Failed to delete transaction:', error);
      return CustomResponse.error(error.message, null, 500);
    }
  }

  async updateStatus(
    id: string,
    data: any,
    user_id?: string,
  ): Promise<CustomResponse> {
    const transaction = await this.repository.findOne(id);
    if (!transaction) {
      return CustomResponse.error('Transaction not found', null, 404);
    }
    const res = await this.repository.update(id, data, null, user_id);
    return CustomResponse.success(
      'Transaction status updated successfully',
      res,
    );
  }

  async generatePdf(id: string, user_id?: string) {
    const transaction = await this.repository.findOne(id);
    if (!transaction) {
      return CustomResponse.error('Transaction not found', null, 404);
    }
    var pdfPath = await this.pdfService.generateSalesNota(transaction);
    if (!pdfPath) {
      return CustomResponse.error('Failed to generate PDF', null, 500);
    }
    pdfPath = pdfPath.replace(/\\/g, '/');
    if (transaction.nota_link != null) {
      const filePath = path.join(this.storagePath, `${transaction.nota_link}`);
      const deleteFile = (filePath: string) => {
        fs.unlink(filePath, (err) => {
          if (err) {
            console.error('Error deleting file:', err);
          } else {
            console.log('File deleted successfully:', filePath);
          }
        });
      };
      deleteFile(filePath);
    }
    const updatedTransaction = await this.repository.update(
      id,
      {
        nota_link: pdfPath.split('/storage/notas/')[1],
      },
      null,
      user_id,
    );

    return CustomResponse.success(
      'Success Update Transaction!',
      updatedTransaction,
    );
  }

  async getPdfPath(transactionId: string): Promise<string> {
    const transaction = await this.repository.findOne(transactionId);
    if (!transaction) {
      throw new RpcException('Transaction not found');
    }
    const filePath = path.join(this.storagePath, `${transaction.nota_link}`);
    return fs.existsSync(filePath) ? filePath : null;
  }

  // Get Product Code not Set for generate code
  async findProductNotSet(filters: {}) {
    filters = {
      ...filters,
      transaction_type: { in: [2, 3] },
      product_code_id: null,
      transaction: {
        approve: 1,
      },
    };
    const productCodes =
      await this.transactionProductRepository.findAll(filters);
    console.log('filters', filters);
    return CustomResponse.success(
      'Successfully fetch product code not set',
      productCodes,
    );
  }

  async deleteProductCode(id: string, user_id?: string) {
    const transactionProduct = await this.transactionProductRepository.findAll({
      product_code_id: id,
      transaction_type: { in: [2, 3] },
    });

    if (transactionProduct?.data?.length > 0) {
      const updated = await this.transactionProductRepository.update(
        transactionProduct.data[0].id,
        { product_code_id: null },
        null,
        user_id,
      );
      return CustomResponse.success(
        'Successfully delete product code bought from customer',
        updated,
      );
    }
    return CustomResponse.success(
      'Successfully delete product code',
      transactionProduct,
    );
  }

  // Get Product Code not Set for generate code
  // id -> transref_id (transProd.id)
  // data -> product_code_id
  async updateProductNotSet(id: string, data: any, user_id?: string) {
    console.log('HKSDF', id, data);
    const transProduct = await this.transactionProductRepository.findOne(id); // transref_id
    if (!transProduct) {
      return CustomResponse.error('Product Code not found', null, 404);
    }
    const productCode = await this.productCodeRepository.findOne(
      data.product_code_id,
    );
    if (!productCode) {
      return CustomResponse.error('Product Code not found', null, 404);
    }
    console.log('ini productcode asdf', data.product_code_id);
    const updatedData = await this.transactionProductRepository.update(
      id,
      {
        product_code_id: data.product_code_id,
      },
      null,
      user_id,
    );
    return CustomResponse.success(
      'Successfully fetch product code not set',
      transProduct,
    );
  }

  async findTransProduct(id) {
    const transactionProduct =
      await this.transactionProductRepository.findOne(id);
    if (!transactionProduct) {
      return CustomResponse.error('Transaction Product not found', null, 404);
    }
    return CustomResponse.success(
      'Successfully fetch transaction product',
      transactionProduct,
    );
  }

  // MarketPlace Transaction
  // async processMidtransNotification(query: any): Promise<any> {
  //   try {
  //     const { transaction_status, order_id } = query;
  //     console.log('MIDTRANS NOTIF ' + query);

  //     const transaction = await this.prisma.transaction.findUnique({
  //       where: { id: order_id },
  //       include: {
  //         store: true,
  //         transaction_products: {
  //           include: { product_code: true }, // Include product codes to update status
  //         },
  //         transaction_operations: true,
  //       },
  //     });

  //     if (!transaction) {
  //       console.error('Transaction not found:', order_id);
  //       return { success: false, message: 'Transaction not found' };
  //     }

  //     if (transaction.status == 1 || transaction.status == 2) {
  //       console.error('Already settled!');
  //       return;
  //     }

  //     // ✅ SUCCESSFUL TRANSACTION HANDLING
  //     if (transaction_status === 'settlement' && transaction.status !== 1) {
  //       await this.prisma.transaction.update({
  //         where: { id: order_id },
  //         data: { status: 1, paid_amount: transaction.total_price },
  //       });

  //       await this.prisma.store.update({
  //         where: { id: transaction.store_id },
  //         data: { balance: { increment: transaction.total_price } },
  //       });

  //       await this.prisma.balanceLog.create({
  //         data: {
  //           store_id: transaction.store_id,
  //           amount: transaction.total_price,
  //           type: 'INCOME',
  //           information: `Pemasukan dari transaksi #${transaction.code}`,
  //         },
  //       });
  //       RmqHelper.publishEvent('transaction.marketplace.settlement', {
  //         id: transaction.id,
  //       });
  //       RmqHelper.publishEvent('transaction.auth.settlement', {
  //         store_id: transaction.store_id,
  //         transaction_code: transaction.code,
  //       });
  //       return {
  //         success: true,
  //         redirectUrl: `marketplace-logamas://payment_success?order_id=${order_id}`,
  //       };
  //     }

  //     // ❌ FAILED TRANSACTION HANDLING (Soft Delete & Reset Voucher & Emit to Inventory)
  //     if (
  //       transaction_status === 'deny' ||
  //       transaction_status === 'expire' ||
  //       transaction_status === 'cancel' ||
  //       transaction_status === 'failure' ||
  //       transaction_status === 'pending' ||
  //       transaction_status === null
  //     ) {
  //       console.log(
  //         `Soft deleting transaction ${order_id} due to status: ${transaction_status}`,
  //       );

  //       await this.prisma.$transaction(async (tx) => {
  //         // 🔹 Soft delete the transaction
  //         await tx.transaction.update({
  //           where: { id: order_id },
  //           data: { deleted_at: new Date() },
  //         });

  //         // 🔹 Soft delete related transaction products
  //         if (transaction.transaction_products.length > 0) {
  //           await tx.transactionProduct.updateMany({
  //             where: { transaction_id: order_id },
  //             data: { deleted_at: new Date() },
  //           });
  //         }

  //         // 🔹 Soft delete related transaction operations
  //         if (transaction.transaction_operations.length > 0) {
  //           await tx.transactionOperation.updateMany({
  //             where: { transaction_id: order_id },
  //             data: { deleted_at: new Date() },
  //           });
  //         }

  //         // 🔹 If a voucher was used, mark it as "not used"
  //         if (transaction.voucher_own_id) {
  //           await tx.voucherOwned.update({
  //             where: { id: transaction.voucher_own_id },
  //             data: { is_used: false },
  //           });
  //         }

  //         // 🔹 Restore Product Code Status (Available) & Emit to Inventory
  //         console.log(
  //           `Restoring product_code status for transaction: ${order_id}`,
  //         );

  //         for (const item of transaction.transaction_products.filter(
  //           (item) =>
  //             item.product_code_id !== 'DISCOUNT' &&
  //             item.product_code_id !== 'TAX',
  //         )) {
  //           await tx.productCode.update({
  //             where: { id: item.product_code_id },
  //             data: { status: 0 }, // Set status to Available
  //           });

  //           RmqHelper.publishEvent('product.code.updated', {
  //             data: {
  //               id: item.product_code_id,
  //               status: 0,
  //             },
  //             user: null,
  //           });
  //         }
  //       });

  //       RmqHelper.publishEvent('transaction.marketplace.failed', {
  //         id: transaction.id,
  //       });
  //       RmqHelper.publishEvent('transaction.auth.failed', {
  //         store_id: transaction.store_id,
  //         transaction_code: transaction.code,
  //       });
  //       return {
  //         success: false,
  //         message: `Transaction ${order_id} has been soft deleted, and products restored.`,
  //       };
  //     }

  //     return {
  //       success: false,
  //       message: 'Transaction is not in a recognizable status',
  //     };
  //   } catch (error) {
  //     console.error('Error processing transaction:', error.message);
  //     return {
  //       success: false,
  //       message: error.message || 'Failed to process transaction',
  //     };
  //   }
  // }

  async processTripayNotification(body: any): Promise<any> {
    try {
      const { merchant_ref, reference, status, is_closed_payment } = body;

      console.log('Processing Tripay notification:', merchant_ref, status);

      const transaction = await this.prisma.transaction.findUnique({
        where: { id: merchant_ref },
        include: {
          store: true,
          transaction_products: {
            where: {
              deleted_at: null,
            },
            include: {
              product_code: {
                include: {
                  product: {
                    include: {
                      type: {
                        include: {
                          category: true,
                        },
                      },
                    },
                  },
                },
              },
              TransactionReview: true,
            },
          },
          transaction_operations: {
            where: {
              deleted_at: null,
            },
            include: {
              operation: {
                include: {
                  account: true,
                },
              },
            },
          },
        },
      });

      if (!transaction) {
        console.error('Transaction not found:', merchant_ref);
        return { success: false, message: 'Transaction not found' };
      }

      if (transaction.status == 1 || transaction.status == 2) {
        console.error('Already settled!');
        return { success: false, message: 'Transaction already settled' };
      }

      // Jika pembayaran sudah close (closed payment)
      if (is_closed_payment === 1) {
        switch (status.toUpperCase()) {
          case 'PAID':
            // 🟢 Sukses
            await this.prisma.transaction.update({
              where: { id: merchant_ref },
              data: { status: 1, paid_amount: transaction.total_price },
            });

            await this.prisma.store.update({
              where: { id: transaction.store_id },
              data: { balance: { increment: transaction.total_price } },
            });

            await this.prisma.balanceLog.create({
              data: {
                store_id: transaction.store_id,
                amount: transaction.total_price,
                type: 'INCOME',
                information: `Pemasukan dari transaksi #${transaction.code}`,
              },
            });

            RmqHelper.publishEvent('transaction.marketplace.settlement', {
              id: transaction.id,
            });
            RmqHelper.publishEvent('transaction.auth.settlement', {
              store_id: transaction.store_id,
              transaction_code: transaction.code,
            });
            // Publish to finance service
            var datatoFinance = transaction;
            datatoFinance.status = 1;
            RmqHelper.publishEvent('transaction.finance.updated', {
              data: { data: datatoFinance },
            });

            return {
              success: true,
              redirectUrl: `marketplace-logamas://payment_success?order_id=${merchant_ref}`,
            };
          case 'REFUND':
          case 'EXPIRED':
          case 'FAILED':
            // 🔴 Gagal
            await this.failTransaction(transaction, status.toUpperCase());
            return {
              success: false,
              message: 'Transaction marked as failed or expired',
            };

          default:
            console.error('Unrecognized Tripay status:', status);
            return { success: false, message: 'Unrecognized payment status' };
        }
      }

      return { success: false, message: 'Payment not closed yet' };
    } catch (error) {
      console.error('Error processing Tripay notification:', error.message);
      return {
        success: false,
        message: error.message || 'Failed to process Tripay transaction',
      };
    }
  }

  private async failTransaction(transaction: any, status: string) {
    await this.prisma.$transaction(async (tx) => {
      await tx.transaction.update({
        where: { id: transaction.id },
        data: { deleted_at: new Date(), status: status === 'EXPIRED' ? 3 : 4 },
      });

      await tx.transactionProduct.updateMany({
        where: { transaction_id: transaction.id },
        data: { deleted_at: new Date() },
      });

      if (transaction.transaction_operations.length > 0) {
        await tx.transactionOperation.updateMany({
          where: { transaction_id: transaction.id },
          data: { deleted_at: new Date() },
        });
      }

      if (transaction.voucher_own_id) {
        await tx.voucherOwned.update({
          where: { id: transaction.voucher_own_id },
          data: { is_used: false },
        });
      }

      for (const item of transaction.transaction_products.filter(
        (i) => i.product_code_id !== 'DISCOUNT' && i.product_code_id !== 'TAX',
      )) {
        await tx.productCode.update({
          where: { id: item.product_code_id },
          data: { status: 0 },
        });

        RmqHelper.publishEvent('product.code.updated', {
          data: { id: item.product_code_id, status: 0 },
          user: null,
        });
      }
    });

    RmqHelper.publishEvent('transaction.marketplace.failed', {
      id: transaction.id,
    });
    RmqHelper.publishEvent('transaction.auth.failed', {
      store_id: transaction.store_id,
      transaction_code: transaction.code,
    });
  }

  async processMarketplaceTransaction(data: any, context: RmqContext) {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage();
    try {
      console.log('Processing transaction:', data);

      const totalItemPrice = data.items.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0,
      );
      if (totalItemPrice !== data.grossAmount) {
        throw new RpcException(
          `Gross amount mismatch! Expected: ${totalItemPrice}, Got: ${data.grossAmount}`,
        );
      }

      const now = new Date();
      now.setHours(now.getHours() + 7);
      const expiredAt = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour from now

      const formattedStartTime = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now
        .getDate()
        .toString()
        .padStart(2, '0')} ${now.getHours().toString().padStart(2, '0')}:${now
        .getMinutes()
        .toString()
        .padStart(
          2,
          '0',
        )}:${now.getSeconds().toString().padStart(2, '0')} +0700`;

      const respponsePaymentLink = await this.requestTripayPaymentLink(
        data,
        context,
      );

      const paymentLink = respponsePaymentLink.paymentLink;
      const no_ref = respponsePaymentLink.no_ref;

      const filteredItems = data.items.filter(
        (item) => item.id !== 'DISCOUNT' && item.id !== 'TAX',
      ); // Exclude discount
      const subTotalPrice = filteredItems.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0,
      );

      const store = await this.prisma.store.findUnique({
        where: { id: String(data.storeId) },
        select: { code: true, tax_percentage: true },
      });
      const count = await this.prisma.transaction.count({
        where: {
          transaction_type: data.transaction_type,
          date: {
            gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
            lt: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1),
          },
        },
      });
      const baseCode = `SAL/${store.code}/${now.getFullYear()}/${now.getMonth() + 1}/${now.getDate()}`;
      let attempt = count;
      let code = '';

      while (true) {
        if (attempt === 0) {
          attempt++;
        }
        const paddedNumber = attempt.toString().padStart(3, '0');
        code = `${baseCode}/${paddedNumber}`;

        const existing = await this.prisma.transaction.findFirst({
          where: { code },
        });

        if (!existing) {
          break;
        }

        attempt++;
      }
      // 🔥 **Gunakan PrismaService yang sudah diinject**
      const result = await this.prisma.$transaction(async (tx) => {
        // **1. Insert Transaksi**
        const transaction = await tx.transaction.create({
          data: {
            id: String(data.orderId),
            date: new Date(),
            code,
            transaction_type: 1,
            payment_method: 5,
            status: 0,
            no_ref: no_ref,
            sub_total_price: subTotalPrice,
            total_price: data.grossAmount,
            tax_price: data.taxAmount,
            payment_link: paymentLink,
            poin_earned: data.poin_earned,
            tax_percent: store.tax_percentage,
            expired_at: expiredAt,
            store: { connect: { id: String(data.storeId) } },
            customer: { connect: { id: String(data.customerId) } },
            voucher_used: data.voucherOwnedId
              ? { connect: { id: String(data.voucherOwnedId) } }
              : undefined,
          },
        });

        // **2. Insert Produk**
        const transactionProducts = await Promise.all(
          data.items
            .filter((item) => item.id !== 'DISCOUNT' && item.id !== 'TAX')
            .map(async (item) => {
              const productCode = await tx.productCode.findUnique({
                where: { id: item.id },
                include: {
                  product: {
                    include: {
                      type: {
                        include: {
                          category: {
                            select: { name: true, code: true },
                          },
                        },
                      },
                    },
                  },
                },
              });

              if (!productCode) {
                throw new RpcException(
                  `Product code not found for ID: ${item.id}`,
                );
              }

              // **Format Name & Type**
              const productName = `${productCode.barcode} - ${productCode.product.name}`;
              const productType = `${productCode.product.type.code} - ${productCode.product.type.category.name}`;

              const weight = Number(item.weight || 1);
              const pricePerUnit = Number(item.price) / weight;

              return {
                transaction_id: transaction.id,
                product_code_id: item.id,
                name: productName,
                type: productType,
                price: pricePerUnit, // Harga per unit
                total_price: Number(item.price) * Number(item.quantity),
                transaction_type: 1,
                weight: weight,
                adjustment_price: Number(item.adjustment_price || 0),
                status: 1,
              };
            }),
        );

        // **Insert Semua Produk dalam Batch**
        await tx.transactionProduct.createMany({ data: transactionProducts });

        // **3. Update Status Produk**
        for (const item of data.items.filter(
          (item) => item.id !== 'DISCOUNT' && item.id !== 'TAX',
        )) {
          await tx.productCode.update({
            where: { id: item.id },
            data: { status: 1 },
          });
          // this.inventoryClient.emit(
          //   { cmd: 'product_code_updated' },
          //   {
          //     id: item.id,
          //     status: 1,
          //   },
          // );
          RmqHelper.publishEvent('product.code.updated', {
            data: {
              id: item.id,
              status: 1,
            },
            user: null,
          });
        }

        // **4. Update Voucher Jika Digunakan**
        if (data.voucherOwnedId) {
          await tx.voucherOwned.update({
            where: { id: data.voucherOwnedId },
            data: { is_used: true },
          });
        }

        return transaction;
      });
      await this.generatePdf(result.id);

      // 🔍 **Ambil Data Transaksi Lengkap Setelah Commit**
      const fullTransaction = await this.getFullTransactionDetails(result.id);

      RmqHelper.publishEvent('transaction.marketplace.created', {
        orderId: fullTransaction.id,
        paymentLink: fullTransaction.payment_link,
        status: 'waiting_payment',
        transaction: fullTransaction,
      });

      RmqHelper.publishEvent('transaction.auth.created', {
        store_id: fullTransaction.store_id,
        transaction_code: fullTransaction.code,
      });
      channel.ack(originalMsg);
      return {
        success: true,
        message: 'Transaction processed successfully',
        data: {
          no_ref: no_ref,
          paymentLink,
          expiredAt,
          discountAmount: totalItemPrice - data.grossAmount,
          taxAmount: data.taxAmount,
        },
      };
    } catch (error) {
      channel.nack(originalMsg);
      console.error('❌ Error processing transaction:', error.message);
      return {
        success: false,
        message: error.message || 'Failed to process transaction',
      };
    }
  }

  async requestTripayPaymentLink(data: any, context: RmqContext): Promise<any> {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage();
    const apiKey = 'DEV-V0nm0v3uNsKpz9JNQH42QR59dzmnrRzuYHY5y3vG';
    const privateKey = 'NV5zw-d5a2P-7WeT0-6D1ij-jSPxj';
    const merchantCode = 'T39590';
    const merchantRef = data.orderId;
    const amount = data.grossAmount;
    const expiryTime = Math.floor(Date.now() / 1000) + 1 * 60 * 60;

    const signature = crypto
      .createHmac('sha256', privateKey)
      .update(merchantCode + merchantRef + amount)
      .digest('hex');

    console.log('disini!');

    const payload = {
      method: data.paymentMethod,
      merchant_ref: merchantRef,
      amount: amount,
      customer_name:
        data.customerDetails.first_name +
        ' ' +
        (data.customerDetails.last_name || ''),
      customer_email: data.customerDetails.email,
      customer_phone: data.customerDetails.phone,
      order_items: data.items.map((item: any) => ({
        sku: item.id || 'SKU_UNKNOWN',
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        product_url: item.product_url || '',
        image_url: item.image_url || '',
      })),
      expired_time: expiryTime,
      signature: signature,
    };

    const formData = qs.stringify(payload);

    try {
      const response = await axios.post(
        'https://tripay.co.id/api-sandbox/transaction/create',
        formData,
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          validateStatus: (status) => status < 999,
        },
      );
      if (response.data.success) {
        return {
          paymentLink: response.data.data.checkout_url,
          no_ref: response.data.data.reference,
        };
      } else {
        throw new RpcException(
          response.data.message || 'Failed to create Tripay transaction',
        );
      }
    } catch (error: any) {
      channel.nack(originalMsg);
      console.error('Tripay API Error:', error.message);
      throw new RpcException('Failed to request payment link to Tripay');
    }
  }

  private async requestPaymentLink(data: any): Promise<string> {
    try {
      const response = await axios.post(
        'https://app.sandbox.midtrans.com/snap/v1/transactions',
        {
          transaction_details: {
            order_id: data.orderId,
            gross_amount: data.grossAmount,
          },
          item_details: data.items,
          customer_details: {
            first_name: data.customerDetails.first_name || '',
            last_name: data.customerDetails.last_name || '',
            email: data.customerDetails.email || '',
            phone: data.customerDetails.phone || '',
            billing_address: {
              address:
                data.customerDetails.billing_address?.address || 'Unknown',
              city: data.customerDetails.billing_address?.city || 'Unknown',
              postal_code:
                data.customerDetails.billing_address?.postal_code || '00000',
              country_code: 'IDN',
            },
            shipping_address: {
              address:
                data.customerDetails.shipping_address?.address || 'Unknown',
              city: data.customerDetails.shipping_address?.city || 'Unknown',
              postal_code:
                data.customerDetails.shipping_address?.postal_code || '00000',
              country_code: 'IDN',
            },
          },
          enabled_payments: [
            'bca_va',
            'bri_va',
            'bni_va',
            'permata_va',
            'cimb_va',
            'other_qris',
          ],
          credit_card: {
            secure: true, // 🔒 Aktifkan 3DS security untuk kartu kredit
          },
          expiry: {
            unit: 'minute',
            duration: 60,
          },
          custom_field1: `Store: ${data.storeId}`,
          custom_field2: `Customer: ${data.customerDetails.email}`,
        },
        {
          headers: {
            Authorization: `Basic U0ItTWlkLXNlcnZlci1Rc1pJYjdkT01FUm1QMmdpWi1KZjhmMnE=`,
            'Content-Type': 'application/json',
          },
        },
      );

      return response.data.redirect_url;
    } catch (error) {
      console.error('Midtrans API Error:', error.message);
      throw new RpcException('Failed to request payment link');
    }
  }

  private async createTransactionRecord(
    data: any,
    paymentLink: string,
    subTotalPrice: number,
    code: string,
    expiredAt: Date,
  ) {
    return this.prisma.transaction.create({
      data: {
        id: String(data.orderId),
        date: new Date(),
        code,
        transaction_type: 1,
        payment_method: 5,
        status: 0,
        sub_total_price: subTotalPrice,
        total_price: data.grossAmount,
        tax_price: data.taxAmount,
        payment_link: paymentLink,
        expired_at: expiredAt,
        store: { connect: { id: String(data.storeId) } },
        customer: { connect: { id: String(data.customerId) } },
        voucher_used: data.voucherOwnedId
          ? { connect: { id: String(data.voucherOwnedId) } }
          : undefined,
      },
    });
  }

  private async createTransactionProducts(transactionId: string, items: any[]) {
    for (const item of items.filter(
      (item) => item.id !== 'DISCOUNT' && item.id !== 'TAX',
    )) {
      await this.prisma.transactionProduct.create({
        data: {
          transaction: { connect: { id: transactionId } },
          product_code: { connect: { id: item.id } },
          name: item.name,
          price: Number(item.price), // Pastikan ini adalah angka
          total_price: Number(item.price) * Number(item.quantity),
          transaction_type: 1, // 1 = Sales, bisa disesuaikan
          weight: Number(item.weight || 0), // Pastikan ada nilai default jika kosong
          adjustment_price: Number(item.adjustment_price || 0), // Pastikan ada nilai default jika kosong
          status: 1, // Status default 1 (misalnya: Sold Out)
        },
      });
      // Update status ProductCode menjadi Sold Out
      await this.prisma.productCode.update({
        where: { id: item.id },
        data: { status: 1 },
      });

      // Emit event ke inventory
      RmqHelper.publishEvent('product.code.updated', {
        data: {
          id: item.id,
          status: 1,
        },
        user: null,
      });
      // this.inventoryClient.emit(
      //   { cmd: 'product_code_updated' },
      //   {
      //     id: item.id,
      //     status: 1,
      //   },
      // );
    }
  }

  private async updateVoucherIfUsed(voucherOwnedId: string) {
    if (voucherOwnedId) {
      await this.prisma.voucherOwned.update({
        where: { id: voucherOwnedId },
        data: { is_used: true },
      });
    }
  }

  private async getFullTransactionDetails(transactionId: string) {
    const fullTransaction = await this.prisma.transaction.findUnique({
      where: { id: String(transactionId) },
      include: {
        store: true,
        customer: true,
        voucher_used: true,
        transaction_products: {
          include: {
            product_code: true,
          },
        },
      },
    });
    return fullTransaction;
  }

  async createMarketplaceReplica(transactionData: any) {
    try {
      console.log(
        'Start replicate Marketplace Transaction:',
        transactionData.id,
      );

      await this.prisma.$transaction(async (tx) => {
        // ✅ Insert Transaction
        await tx.transaction.create({
          data: {
            id: transactionData.id,
            date: new Date(transactionData.date),
            code: transactionData.code,
            transaction_type: transactionData.transaction_type,
            payment_method: transactionData.payment_method,
            status: transactionData.status,
            no_ref: transactionData.no_ref,
            sub_total_price: transactionData.sub_total_price,
            nota_link: transactionData.nota_link,
            total_price: transactionData.total_price,
            tax_price: transactionData.tax_price,
            payment_link: transactionData.payment_link,
            poin_earned: transactionData.poin_earned,
            tax_percent: transactionData.tax_percent,
            expired_at: new Date(transactionData.expired_at),
            store_id: transactionData.store_id,
            customer_id: transactionData.customer_id,
            voucher_own_id: transactionData.voucher_own_id || undefined,
          },
        });

        // ✅ Insert Transaction Products
        if (transactionData.transaction_products?.length > 0) {
          const transactionProducts = transactionData.transaction_products.map(
            (item) => ({
              id: item.id,
              transaction_id: transactionData.id,
              product_code_id: item.product_code_id,
              name: item.name,
              type: item.type,
              price: item.price,
              total_price: item.total_price,
              transaction_type: item.transaction_type,
              weight: item.weight,
              adjustment_price: item.adjustment_price,
              status: item.status,
            }),
          );

          await tx.transactionProduct.createMany({
            data: transactionProducts,
          });
        }

        // ✅ Update Product Codes to status = 1
        if (transactionData.transaction_products?.length > 0) {
          for (const item of transactionData.transaction_products) {
            if (
              item.product_code_id !== 'DISCOUNT' &&
              item.product_code_id !== 'TAX'
            ) {
              await tx.productCode.update({
                where: { id: item.product_code_id },
                data: { status: 1 },
              });
            }
          }
        }

        // ✅ Update Voucher if Used
        if (transactionData.voucher_own_id) {
          await tx.voucherOwned.update({
            where: { id: transactionData.voucher_own_id },
            data: { is_used: true },
          });
        }
      });

      console.log(
        `✅ Marketplace Transaction ${transactionData.id} successfully replicated.`,
      );
    } catch (error) {
      console.error(
        '❌ Error replicating marketplace transaction:',
        error.message,
      );
      throw error;
    }
  }

  async marketplaceTransactionSettlementReplica(orderId: string) {
    try {
      console.log(
        'Replicating Settlement for Marketplace Transaction:',
        orderId,
      );

      const transaction = await this.prisma.transaction.findUnique({
        where: { id: orderId },
      });

      if (!transaction) {
        console.error('Transaction not found for settlement:', orderId);
        return;
      }

      if (transaction.status == 1) {
        console.error('Already settled!');
        return;
      }

      // ✅ Update transaction to settled
      await this.prisma.transaction.update({
        where: { id: orderId },
        data: {
          status: 1, // Mark as paid/settled
          paid_amount: transaction.total_price,
        },
      });

      // ✅ Update store balance
      await this.prisma.store.update({
        where: { id: transaction.store_id },
        data: {
          balance: { increment: transaction.total_price },
        },
      });

      // ✅ Create balance log
      await this.prisma.balanceLog.create({
        data: {
          store_id: transaction.store_id,
          amount: transaction.total_price,
          type: 'INCOME',
          information: `Pemasukan dari transaksi #${transaction.code}`,
        },
      });

      console.log(`✅ Settlement replicated for transaction ${orderId}`);
    } catch (error) {
      console.error(
        '❌ Error replicating marketplace settlement:',
        error.message,
      );
      throw error;
    }
  }

  async marketplaceTransactionFailedReplica(orderId: string) {
    try {
      console.log('Replicating Failure for Marketplace Transaction:', orderId);

      const transaction = await this.prisma.transaction.findUnique({
        where: { id: orderId },
        include: {
          transaction_products: true,
          transaction_operations: true,
        },
      });

      if (!transaction) {
        console.error('Transaction not found for failure handling:', orderId);
        return;
      }

      await this.prisma.$transaction(async (tx) => {
        // 🔹 Soft delete the transaction
        await tx.transaction.update({
          where: { id: orderId },
          data: { deleted_at: new Date() },
        });

        // 🔹 Soft delete related transaction products
        if (transaction.transaction_products.length > 0) {
          await tx.transactionProduct.updateMany({
            where: { transaction_id: orderId },
            data: { deleted_at: new Date() },
          });
        }

        // 🔹 Soft delete related transaction operations
        if (transaction.transaction_operations.length > 0) {
          await tx.transactionOperation.updateMany({
            where: { transaction_id: orderId },
            data: { deleted_at: new Date() },
          });
        }

        // 🔹 If voucher was used, reset it
        if (transaction.voucher_own_id) {
          await tx.voucherOwned.update({
            where: { id: transaction.voucher_own_id },
            data: { is_used: false },
          });
        }

        // 🔹 Restore product codes
        for (const item of transaction.transaction_products.filter(
          (item) =>
            item.product_code_id !== 'DISCOUNT' &&
            item.product_code_id !== 'TAX',
        )) {
          await tx.productCode.update({
            where: { id: item.product_code_id },
            data: { status: 0 },
          });

          RmqHelper.publishEvent('product.code.updated', {
            data: {
              id: item.product_code_id,
              status: 0,
            },
            user: null,
          });
        }
      });

      console.log(`✅ Failure replicated for transaction ${orderId}`);
    } catch (error) {
      console.error('❌ Error replicating marketplace failure:', error.message);
      throw error;
    }
  }
}
