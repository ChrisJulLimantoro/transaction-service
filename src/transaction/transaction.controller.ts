import { Controller, Inject } from '@nestjs/common';
import {
  ClientProxy,
  ClientProxyFactory,
  MessagePattern,
  Payload,
  Transport,
} from '@nestjs/microservices';
import { TransactionService } from './transaction.service';
import { PrismaService } from 'src/prisma/prisma.service';

@Controller('transaction')
export class TransactionController {
  private marketplaceServiceClient: ClientProxy;

  constructor(
    private readonly transactionService: TransactionService,
    private readonly prisma: PrismaService,
  ) {
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
  async createTransaction(@Payload() data: any) {
    try {
      console.log('Processing transaction:', data);

      // 🔍 Validasi input
      if (
        !data.orderId ||
        !data.grossAmount ||
        !data.items ||
        !data.customerDetails
      ) {
        throw new Error('Missing required transaction details');
      }

      // 🕒 Hitung batas expired 1 jam setelah transaksi dibuat
      const expiredAt = new Date();
      expiredAt.setHours(expiredAt.getHours() + 1);

      // 🔗 Panggil Midtrans untuk mendapatkan payment link
      const paymentLink =
        await this.transactionService.processTransaction(data);

      // ✅ Hitung `sub_total_price` dari item yang bukan "DISCOUNT"
      const filteredItems = data.items.filter((item) => item.id !== 'DISCOUNT'); // Exclude discount
      const subTotalPrice = filteredItems.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0,
      );

      // ✅ Calculate total price from `grossAmount`
      const totalPrice = data.grossAmount;

      // ✅ Calculate discount dynamically from `sub_total_price - total_price`
      const discountAmount = subTotalPrice - totalPrice;

      // 🛒 Simpan transaksi ke database dengan Prisma
      const transaction = await this.prisma.transaction.create({
        data: {
          id: String(data.orderId),
          code: 'TES-' + Math.floor(1000 + Math.random() * 9000),
          transaction_type: 0, // Default ke penjualan
          payment_method: 4, // E-Wallet
          status: 0, // Waiting Payment
          sub_total_price: subTotalPrice, // ✅ Harga sebelum diskon
          total_price: totalPrice, // ✅ Harga setelah diskon
          tax_price: 0, // Pajak bisa ditambahkan jika perlu
          payment_link: paymentLink,
          expired_at: expiredAt,

          // 🏬 Hubungkan store dengan `connect`
          store: { connect: { id: String(data.storeId) } },

          // 👤 Hubungkan customer dengan `connect`
          customer: { connect: { id: String(data.customerId) } },

          // 🎟 Hubungkan voucher jika ada
          voucher_used: data.voucherOwnedId
            ? { connect: { id: String(data.voucherOwnedId) } }
            : undefined,
        },
      });

      // 📦 Simpan produk dalam transaksi (Exclude discount item)
      for (const item of filteredItems) {
        await this.prisma.transactionProduct.create({
          data: {
            transaction: { connect: { id: String(data.orderId) } },
            product_code: { connect: { id: String(item.id) } },
            transaction_type: 0,
            price: Number(item.price),
            adjustment_price: Number(item.price),
            weight: Number(item.weight || 0),
            discount: Number(item.discount || 0),
            total_price: Number(item.price) * Number(item.quantity),
            status: 0,
          },
        });
      }

      // 🔍 **Ambil Data Lengkap Transaksi Setelah Disimpan**
      const fullTransaction = await this.prisma.transaction.findUnique({
        where: { id: String(data.orderId) },
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

      // 🔔 Emit event ke marketplace dengan data lengkap
      await this.marketplaceServiceClient.emit('transaction_created', {
        orderId: fullTransaction.id,
        paymentLink: fullTransaction.payment_link,
        status: 'waiting_payment',
        transaction: fullTransaction, // ✅ Kirim seluruh transaksi
      });

      return {
        success: true,
        message: 'Transaction processed successfully',
        data: { paymentLink, expiredAt, discountAmount }, // ✅ Return discountAmount
      };
    } catch (error) {
      console.error('Error processing transaction:', error.message);
      return {
        success: false,
        message: error.message || 'Failed to process transaction',
      };
    }
  }
}
