import { Injectable } from '@nestjs/common';
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

@Injectable()
export class TransactionService extends BaseService {
  protected repository = this.transactionRepository;
  protected createSchema = CreateTransactionRequest.schema();
  protected updateSchema = UpdateTransactionRequest.schema();

  constructor(
    private readonly transactionRepository: TransactionRepository,
    private readonly transactionProductRepository: TransactionProductRepository,
    private readonly transactionOperationRepository: TransactionOperationRepository,
    protected readonly validation: ValidationService,
    private readonly prisma: PrismaService,
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

  async create(data: any): Promise<CustomResponse> {
    if (data.transaction_details.length === 0) {
      return CustomResponse.error(
        'Transaction Details must not be empty',
        null,
        400,
      );
    }

    // Generate Code
    const date = new Date(data.date);
    const count = await this.repository.count({
      transaction_type: data.transaction_type,
      date: date,
    });
    const store = await this.prisma.store.findUnique({
      where: { id: data.store_id },
    });

    const code = `${this.transanctionType[data.transaction_type].label}/${store.code}/${date.getFullYear()}/${date.getMonth()}/${date.getDate()}/${(count + 1).toString().padStart(3, '0')}`;
    data.code = code;
    data.paid_amount = data.total_price; // for now assume always fully paid

    const transData = new CreateTransactionRequest(data);
    const validatedData = this.validation.validate(
      transData,
      this.createSchema,
    );
    const transaction = await this.repository.create(validatedData);

    if (!transaction) {
      return CustomResponse.error('Failed to create transaction', null, 500);
    }

    // Create Transaction Details
    const transactionDetails = [];
    for (const detail of data.transaction_details) {
      transactionDetails.push({
        ...detail,
        transaction_id: transaction.id,
        transaction_type: transaction.transaction_type,
        weight: detail.quantity,
        unit: detail.quantity,
        status: 2,
      });
    }

    var transDetails = [];
    for (const detail of transactionDetails) {
      var newdetail = await this.createDetail(detail);
      transDetails.push(newdetail);
    }

    data.transaction_details = transDetails;
    console.log('Transaction details', data.transaction_details);

    return CustomResponse.success('Transaction created successfully', data);
  }

  async createDetail(data: any) {
    console.log(data);
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
    data.transaction_type = transaction.transaction_type;
    data.status = transaction.status == 2 ? 2 : 1;
    if (data.detail_type == 'product') {
      const transactionDetail = new CreateTransactionProductRequest(data);
      validatedData = this.validation.validate(
        transactionDetail,
        CreateTransactionProductRequest.schema(),
      );
      result = await this.transactionProductRepository.create(validatedData);
    } else {
      const transactionDetail = new CreateTransactionOperationRequest(data);
      validatedData = this.validation.validate(
        transactionDetail,
        CreateTransactionOperationRequest.schema(),
      );
      result = await this.transactionOperationRepository.create(validatedData);
    }

    if (!result) {
      return CustomResponse.error('Failed to create transaction detail', null);
    }
    const transactionRes = await this.syncDetail(data.transaction_id);
    result.transaction = transactionRes;

    return CustomResponse.success(
      'Transaction Detail created successfully',
      result,
      201,
    );
  }

  async updateDetail(id: string, data: any): Promise<CustomResponse> {
    data.unit = data.quantity;
    if (data.type == 'Operation') {
      const transactionDetail =
        await this.transactionOperationRepository.findOne(id);
      if (!transactionDetail) {
        return CustomResponse.error('Transaction Detail not found', null, 404);
      }
      const transactionDetailData = new CreateTransactionOperationRequest(data);
      const validatedData = this.validation.validate(
        transactionDetailData,
        CreateTransactionOperationRequest.schema(),
      );
      await this.transactionOperationRepository.update(id, validatedData);
    } else {
      const transactionDetail =
        await this.transactionProductRepository.findOne(id);
      if (!transactionDetail) {
        return CustomResponse.error('Transaction Detail not found', null, 404);
      }
      const transactionDetailData = new CreateTransactionProductRequest(data);
      const validatedData = this.validation.validate(
        transactionDetailData,
        CreateTransactionProductRequest.schema(),
      );
      await this.transactionProductRepository.update(id, validatedData);
    }

    await this.syncDetail(data.transaction_id);

    return CustomResponse.success(
      'Transaction Detail updated successfully',
      null,
    );
  }

  async deleteDetail(id: string): Promise<CustomResponse> {
    const product = await this.transactionProductRepository.findOne(id);
    const operation = await this.transactionOperationRepository.findOne(id);

    if (!product && !operation) {
      return CustomResponse.error('Transaction Detail not found', null, 404);
    }

    if (product) {
      await this.transactionProductRepository.delete(id);
    } else {
      await this.transactionOperationRepository.delete(id);
    }

    await this.syncDetail(
      product ? product.transaction_id : operation.transaction_id,
    );

    return CustomResponse.success(
      'Transaction Detail deleted successfully',
      null,
    );
  }

  async syncDetail(transaction_id: string) {
    // Calculate for price and responsibility
    const operations = await this.transactionOperationRepository.findAll({
      transaction_id: transaction_id,
    });
    const products = await this.transactionProductRepository.findAll({
      transaction_id: transaction_id,
    });

    let subtotal = 0;
    let tax = null;
    for (const operation of operations) {
      subtotal +=
        operation.unit * operation.price +
        parseFloat(operation.adjustment_price);
      if (tax == null) {
        tax = parseFloat(operation.transaction.store.tax_percentage);
      }
    }
    for (const product of products) {
      subtotal +=
        product.weight * product.price + parseFloat(product.adjustment_price);
      if (tax == null) {
        tax = parseFloat(product.transaction.store.tax_percentage);
      }
    }

    console.log('sync tax', tax);
    const updateData = {
      sub_total_price: subtotal,
      tax_price: subtotal * (tax / 100),
      total_price: subtotal * ((tax + 100) / 100),
    };
    const res = await this.transactionRepository.update(
      transaction_id,
      updateData,
    );
    return updateData;
  }

  async delete(id: string): Promise<CustomResponse> {
    const transaction = await this.repository.findOne(id);
    if (!transaction) {
      return CustomResponse.error('Transaction not found', null, 404);
    }

    const transactionProduct = await this.prisma.transactionProduct.findMany({
      where: { transaction_id: id },
    });

    const transactionOperation =
      await this.prisma.transactionOperation.findMany({
        where: { transaction_id: id },
      });

    try {
      for (const detail of transactionProduct) {
        await this.transactionProductRepository.delete(detail.id);
      }
      for (const detail of transactionOperation) {
        await this.transactionOperationRepository.delete(detail.id);
      }

      await this.repository.delete(id);
      return CustomResponse.success('Transaction deleted successfully', null);
    } catch (error) {
      return CustomResponse.error('Failed to delete transaction', null, 500);
    }
  }

  // MarketPlace Transaction
  private readonly midtransUrl =
    'https://app.sandbox.midtrans.com/snap/v1/transactions';
  private readonly midtransServerKey =
    'U0ItTWlkLXNlcnZlci1Rc1pJYjdkT01FUm1QMmdpWi1KZjhmMnE=';

  async processTransactionMarketplace(data: {
    orderId: string;
    grossAmount: number;
    items: any[];
    customerDetails: any;
    taxAmount: number; // Receive taxAmount separately from frontend
  }): Promise<string> {
    try {
      const orderId = data.orderId;

      // Calculate total item price before discount (gross amount)
      const totalItemPrice = data.items.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0,
      );

      // Validate that grossAmount matches total item price (before discount)
      if (totalItemPrice !== data.grossAmount) {
        throw new Error(
          `Gross amount mismatch! Expected: ${totalItemPrice}, Got: ${data.grossAmount}`,
        );
      }

      // Ensure timezone is in Jakarta (GMT+7)
      const now = new Date();
      now.setHours(now.getHours() + 7); // Set timezone to WIB (+7)

      const expiredTime = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour from now

      // Format `start_time` to be compatible with Midtrans (YYYY-MM-DD HH:MM:SS +0700)
      const formattedStartTime = `${now.getFullYear()}-${(now.getMonth() + 1)
        .toString()
        .padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')} ${now
        .getHours()
        .toString()
        .padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now
        .getSeconds()
        .toString()
        .padStart(2, '0')} +0700`;

      // Format customer details
      const customerDetails = {
        first_name: data.customerDetails.first_name || '',
        last_name: data.customerDetails.last_name || '',
        email: data.customerDetails.email || '',
        phone: data.customerDetails.phone || '',
        billing_address: {
          address: data.customerDetails.billing_address?.address || 'Unknown',
          city: data.customerDetails.billing_address?.city || 'Unknown',
          postal_code:
            data.customerDetails.billing_address?.postal_code || '00000',
          country_code: 'IDN',
        },
        shipping_address: {
          address: data.customerDetails.shipping_address?.address || 'Unknown',
          city: data.customerDetails.shipping_address?.city || 'Unknown',
          postal_code:
            data.customerDetails.shipping_address?.postal_code || '00000',
          country_code: 'IDN',
        },
      };

      // Send request to Midtrans
      const response = await axios.post(
        this.midtransUrl,
        {
          transaction_details: {
            order_id: orderId,
            gross_amount: totalItemPrice, // Send gross amount before tax
          },
          item_details: data.items, // Midtrans handles discount separately
          customer_details: customerDetails,
          enabled_payments: ['credit_card', 'bca_va', 'gopay', 'shopeepay'],
          expiry: {
            start_time: formattedStartTime,
            unit: 'minute',
            duration: 60,
          },
        },
        {
          headers: {
            Authorization: `Basic ${this.midtransServerKey}`,
            'Content-Type': 'application/json',
          },
        },
      );

      if (response.status === 201) {
        return response.data.redirect_url;
      } else {
        console.error('Midtrans Response Error:', response.data);
        throw new Error(`Midtrans API Error: ${response.data.message}`);
      }
    } catch (error) {
      console.error(
        'Midtrans API Error:',
        error.response?.data || error.message,
      );
      throw new Error(
        error.response?.data?.message || 'Midtrans API request failed',
      );
    }
  }
}
