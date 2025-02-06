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

@Controller('transaction')
export class TransactionController {
  constructor(
    private readonly transactionService: TransactionService,
    private readonly prisma: PrismaService,
    @Inject('MARKETPLACE')
    private readonly marketplaceClient: ClientProxy,
  ) {}

  @MessagePattern({ cmd: 'get:transaction' })
  async getTransaction(@Payload() data: any) {
    const filter = data.body;
    return await this.transactionService.findAll(filter);
  }

  @MessagePattern({ cmd: 'get:transaction/*' })
  async getTransactionById(@Payload() data: any) {
    const id = data.params.id;
    return await this.transactionService.findOne(id);
  }

  @MessagePattern({ cmd: 'post:transaction' })
  async createTransaction(@Payload() data: any) {
    const response = await this.transactionService.create(data.body);
    return response;
  }

  // Marketplace Endpoint
  @MessagePattern({ module: 'transaction', action: 'createTransaction' })
  async createTransactionMarketplace(
    @Payload() data: any,
    @Ctx() context: RmqContext,
  ) {
    try {
      console.log('Processing transaction:', data);

      // 🔍 Validasi input
      if (
        !data.orderId ||
        !data.grossAmount ||
        !data.items ||
        !data.customerDetails ||
        !data.taxAmount // Make sure taxAmount is provided
      ) {
        throw new Error('Missing required transaction details');
      }

      console.log(data.items);

      // 🕒 Hitung batas expired 1 jam setelah transaksi dibuat
      const expiredAt = new Date();
      expiredAt.setHours(expiredAt.getHours() + 1);

      // 🔗 Panggil Midtrans untuk mendapatkan payment link
      const paymentLink =
        await this.transactionService.processTransactionMarketplace(data);

      // ✅ Hitung `sub_total_price` dari item yang bukan "DISCOUNT"
      const filteredItems = data.items.filter(
        (item) => item.id !== 'DISCOUNT' && item.id !== 'TAX',
      ); // Exclude discount
      const subTotalPrice = filteredItems.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0,
      );
      console.log('ya');
      const totalPrice = data.grossAmount;
      const discountAmount = subTotalPrice - totalPrice;
      const transaction = await this.prisma.transaction.create({
        data: {
          id: String(data.orderId),
          date: new Date(),
          code: 'TES-' + Math.floor(1000 + Math.random() * 9000),
          transaction_type: 0, // Default ke penjualan
          payment_method: 4, // E-Wallet
          status: 0, // Waiting Payment
          sub_total_price: subTotalPrice, // ✅ Harga sebelum diskon
          total_price: totalPrice, // ✅ Harga setelah diskon
          tax_price: data.taxAmount, // Directly using the taxAmount from the frontend
          payment_link: paymentLink,
          poin_earned: data.poin_earned,
          expired_at: expiredAt,
          //
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

      if (data.voucherOwnedId != null) {
        await this.prisma.voucherOwned.update({
          where: { id: data.voucherOwnedId },
          data: { is_used: true },
        });
      }
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

      console.log(fullTransaction);

      const channel = context.getChannelRef();
      channel.ack(context.getMessage());
      this.marketplaceClient.emit('transaction_created', {
        orderId: fullTransaction.id,
        paymentLink: fullTransaction.payment_link,
        status: 'waiting_payment',
        transaction: fullTransaction, // ✅ Kirim seluruh transaksi
      });
      return {
        success: true,
        message: 'Transaction processed successfully',
        data: {
          paymentLink,
          expiredAt,
          discountAmount,
          taxAmount: data.taxAmount,
        }, // Return the taxAmount
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
