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

@Controller('transaction')
export class TransactionController {
  constructor(
    private readonly transactionService: TransactionService,
    private readonly prisma: PrismaService,
    @Inject('MARKETPLACE')
    private readonly marketplaceClient: ClientProxy,
    @Inject('FINANCE') private readonly financeClient: ClientProxy,
  ) {}

  @MessagePattern({ cmd: 'get:transaction' })
  @Describe({
    description: 'Get All Transaction',
    fe: ['transaction/sales:open'],
  })
  async getTransaction(@Payload() data: any) {
    const filter = { store_id: data.body.auth.store_id };
    return await this.transactionService.findAll(filter);
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
    console.log('this is reponse format', response);
    if (response.success) {
      this.financeClient.emit('transaction_created', response);
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
    return await this.transactionService.updateDetail(id, body);
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

  // Marketplace Endpoint
  @MessagePattern({ module: 'transaction', action: 'notificationMidtrans' })
  @Exempt()
  async handleNotification(@Payload() query: any): Promise<any> {
    try {
      console.log('Notification received from Midtrans (Microservice):', query);
      const { transaction_status, order_id } = query;

      const transaction = await this.prisma.transaction.findUnique({
        where: { id: order_id },
        include: {
          customer: true,
          store: true,
        },
      });

      if (!transaction) {
        console.error('Transaction not found:', order_id);
        return { success: false, message: 'Transaction not found' };
      }

      if (transaction_status === 'settlement') {
        const storeId = transaction.store_id;
        const totalPrice = transaction.total_price;
        const transactionCode = transaction.code;
        if (transaction.status != 1) {
          await this.prisma.transaction.update({
            where: { id: order_id },
            data: { status: 1, paid_amount: totalPrice },
          });
          await this.prisma.store.update({
            where: { id: storeId },
            data: {
              balance: { increment: totalPrice },
            },
          });

          await this.prisma.balanceLog.create({
            data: {
              store_id: storeId,
              amount: totalPrice,
              type: 'INCOME',
              information: `Pemasukan dari transaksi #${transactionCode}`,
            },
          });

          this.marketplaceClient.emit('transaction_settlement', {
            id: transaction.id,
          });

          return {
            success: true,
            redirectUrl: `marketplace-logamas://payment_success?order_id=${order_id}`,
          };
        }
        return {
          success: false,
          message: 'Transaction is not in settlement status',
        };
      }

      return {
        success: false,
        message: 'Transaction is not in settlement status',
      };
    } catch (error) {
      console.error('Error processing transaction:', error.message);
      return {
        success: false,
        message: error.message || 'Failed to process transaction',
      };
    }
  }

  @MessagePattern({ module: 'transaction', action: 'createTransaction' })
  @Exempt()
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
      const date = new Date();
      // Ambil store dan count transaksi sebelumnya
      const store = await this.prisma.store.findUnique({
        where: { id: String(data.storeId) },
        select: { code: true }, // Ambil kode store
      });

      // Hitung jumlah transaksi sebelumnya
      const count = await this.prisma.transaction.count({
        where: { store_id: String(data.storeId) },
      });

      // Format kode transaksi baru
      const code = `SAL/${store?.code}/${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}/${(
        count + 1
      )
        .toString()
        .padStart(3, '0')}`;
      const transaction = await this.prisma.transaction.create({
        data: {
          id: String(data.orderId),
          date: new Date(),
          code: code,
          transaction_type: 1, // Default ke penjualan
          payment_method: 5, // MIDTRANS
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
            transaction_type: 1,
            price: Number(item.price_per_gram),
            adjustment_price: 0,
            weight: Number(item.weight || 0),
            discount: Number(item.discount || 0),
            total_price: Number(item.price) * Number(item.quantity),
            status: 1,
          },
        });
        await this.prisma.productCode.update({
          where: { id: item.id },
          data: { status: 1 },
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
      const channel = context.getChannelRef();
      channel.nack(context.getMessage());
      console.error('Error processing transaction:', error.message);
      return {
        success: false,
        message: error.message || 'Failed to process transaction',
      };
    }
  }
}
