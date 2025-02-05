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

    for (const detail of transactionDetails) {
      await this.createTransactionDetails(detail);
    }

    return CustomResponse.success('Transaction created successfully', null);
  }

  async createTransactionDetails(data: any) {
    var validatedData = null;
    if (data.detail_type == 'product') {
      const transactionDetail = new CreateTransactionProductRequest(data);
      validatedData = this.validation.validate(
        transactionDetail,
        CreateTransactionProductRequest.schema(),
      );
      await this.transactionProductRepository.create(validatedData);
    } else {
      const transactionDetail = new CreateTransactionOperationRequest(data);
      validatedData = this.validation.validate(
        transactionDetail,
        CreateTransactionOperationRequest.schema(),
      );
      await this.transactionOperationRepository.create(validatedData);
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
  }): Promise<string> {
    try {
      // ✅ Buat order ID yang unik
      const orderId = uuidv4();

      // ✅ Validasi gross amount dengan total items
      const calculatedTotal = data.items.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0,
      );
      if (calculatedTotal !== data.grossAmount) {
        throw new Error(
          `Gross amount mismatch! Expected: ${calculatedTotal}, Got: ${data.grossAmount}`,
        );
      }

      // ✅ Format waktu `start_time` sesuai ketentuan Midtrans
      const now = new Date();
      const formattedStartTime =
        now.toISOString().replace('T', ' ').split('.')[0] + ' +0700';

      // ✅ Format customer details dengan nilai default jika tidak tersedia
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

      // ✅ Kirim request ke Midtrans
      const response = await axios.post(
        this.midtransUrl,
        {
          transaction_details: {
            order_id: orderId,
            gross_amount: data.grossAmount,
          },
          item_details: data.items,
          customer_details: customerDetails,
          enabled_payments: ['credit_card', 'bca_va', 'gopay', 'shopeepay'],
          expiry: {
            start_time: formattedStartTime,
            unit: 'hour',
            duration: 24,
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
