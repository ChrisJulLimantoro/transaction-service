import { Injectable } from '@nestjs/common';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class TransactionService {
  private readonly midtransUrl =
    'https://app.sandbox.midtrans.com/snap/v1/transactions';
  private readonly midtransServerKey =
    'U0ItTWlkLXNlcnZlci1Rc1pJYjdkT01FUm1QMmdpWi1KZjhmMnE=';

  async processTransaction(data: {
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
