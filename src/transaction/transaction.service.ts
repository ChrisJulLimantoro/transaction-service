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
      const orderId = data.orderId;

      // ✅ Calculate grossAmount from items (before discount)
      const totalItemPrice = data.items.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0,
      );

      // ✅ Validate that grossAmount matches total item price (before discount)
      if (totalItemPrice !== data.grossAmount) {
        throw new Error(
          `Gross amount mismatch! Expected: ${totalItemPrice}, Got: ${data.grossAmount}`,
        );
      }

      // ✅ Ensure timezone is in Jakarta (GMT+7)
      const now = new Date();
      now.setHours(now.getHours() + 7); // Sesuaikan ke WIB (+7)

      const expiredTime = new Date(now.getTime() + 60 * 60 * 1000); // 1 jam dari sekarang

      // ✅ Format `start_time` agar sesuai dengan Midtrans (YYYY-MM-DD HH:MM:SS +0700)
      const formattedStartTime = `${now.getFullYear()}-${(now.getMonth() + 1)
        .toString()
        .padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')} ${now
        .getHours()
        .toString()
        .padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now
        .getSeconds()
        .toString()
        .padStart(2, '0')} +0700`;

      // ✅ Format customer details
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

      // ✅ Send request to Midtrans
      const response = await axios.post(
        this.midtransUrl,
        {
          transaction_details: {
            order_id: orderId,
            gross_amount: totalItemPrice, // ✅ Send total before discount
          },
          item_details: data.items, // ✅ Midtrans handles discount separately
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
