import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import {
  ClientProxy,
  ClientProxyFactory,
  Transport,
} from '@nestjs/microservices';
import axios from 'axios';

@Controller('transaction')
export class TransactionController {
  private marketplaceServiceClient: ClientProxy;

  constructor() {
    this.marketplaceServiceClient = ClientProxyFactory.create({
      transport: Transport.RMQ,
      options: {
        urls: ['amqp://localhost:5672'],
        queue: 'marketplace_service_queue',
        queueOptions: {
          durable: true,
        },
      },
    });
  }

  @MessagePattern({ module: 'transaction', action: 'createTransaction' })
  async createTransaction(
    @Payload()
    data: {
      orderId: string;
      grossAmount: number;
      items: any[];
      customerDetails: any;
    },
  ) {
    try {
      console.log('Processing transaction:', data);

      // Panggil Midtrans API untuk mendapatkan payment link
      const midtransResponse = await this.callMidtransApi(data);

      // Kirim hasilnya langsung ke Marketplace Service sebagai subscriber
      await this.marketplaceServiceClient.emit('transaction_created', {
        orderId: data.orderId,
        paymentLink: midtransResponse.redirect_url,
        status: 'waiting_payment',
      });

      return {
        success: true,
        message: 'Transaction processed successfully',
        data: {
          paymentLink: midtransResponse.redirect_url,
        },
      };
    } catch (error) {
      console.error('Error processing transaction:', error.message);
      return {
        success: false,
        message: error.message || 'Failed to process transaction',
      };
    }
  }

  private async callMidtransApi(data: {
    orderId: string;
    grossAmount: number;
    items: any[];
    customerDetails: any;
  }): Promise<any> {
    const midtransUrl = 'https://app.sandbox.midtrans.com/snap/v1/transactions';
    const midtransServerKey =
      'U0ItTWlkLXNlcnZlci1Rc1pJYjdkT01FUm1QMmdpWi1KZjhmMnE=';

    try {
      const response = await axios.post(
        midtransUrl,
        {
          transaction_details: {
            order_id: data.orderId,
            gross_amount: data.grossAmount,
          },
          item_details: data.items,
          customer_details: data.customerDetails,
          enabled_payments: [
            'credit_card',
            'bca_va',
            'gopay',
            'shopeepay',
            'other_qris',
          ],
        },
        {
          headers: {
            Authorization: `Basic ${midtransServerKey}`,
            'Content-Type': 'application/json',
          },
        },
      );

      if (response.status === 201) {
        return response.data;
      } else {
        throw new Error(`Midtrans API Error: ${response.data.message}`);
      }
    } catch (error) {
      console.error('Midtrans API Error:', error.message);
      throw new Error(
        error.response?.data?.message || 'Midtrans API request failed',
      );
    }
  }
}
