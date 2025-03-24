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
import { ClientProxy, RmqContext } from '@nestjs/microservices';
import { PdfService } from './pdf.service';
import * as fs from 'fs-extra';
import * as path from 'path';

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
        status: 1,
      });
    }

    var transDetails = [];
    console.log('transactionDetails', transactionDetails);
    for (const detail of transactionDetails) {
      try {
        var newdetail = await this.createDetail(detail);
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
    this.generatePdf(transaction.id);
    return CustomResponse.success('Transaction created successfully', data);
  }

  async update(id: string, data: any): Promise<CustomResponse> {
    if (data.status) {
      // update status of the detail too
      const transaction = await this.repository.findOne(id);
      if (!transaction) {
        return CustomResponse.error('Transaction not found', null, 404);
      }
      const products = transaction.transaction_products;
      for (const product of products) {
        await this.transactionProductRepository.update(product.id, {
          status: data.status,
        });
      }
    }
    this.generatePdf(id);
    return super.update(id, data);
  }

  async createDetail(data: any): Promise<CustomResponse> {
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
    if (data.detail_type == 'product' && data.product_code_id != null) {
      // Check if item available
      const product = await this.productCodeRepository.findOne(
        data.product_code_id,
      );
      console.log(product);
      if (!product) {
        throw new Error('Product not found');
      }
      if (product.status != 0 && transaction.transaction_type == 1) {
        throw new Error('Product already sold');
      }
      const transactionDetail = new CreateTransactionProductRequest(data);
      validatedData = this.validation.validate(
        transactionDetail,
        CreateTransactionProductRequest.schema(),
      );
      result = await this.transactionProductRepository.create(validatedData);
      // Update product status Locally
      const code = await this.productCodeRepository.update(
        data.product_code_id,
        {
          status:
            data.transaction_type == 1 ? 1 : data.transaction_type == 2 ? 2 : 0,
        },
      );
      console.log('code', code);
      // Broadcast the update to other services
      this.inventoryClient.emit(
        { cmd: 'product_code_updated' },
        {
          id: code.id,
          status: code.status,
        },
      );
    } else if (data.detail_type == 'operation') {
      data.total_price = data.unit * data.price + data.adjustment_price;
      const transactionDetail = new CreateTransactionOperationRequest(data);
      validatedData = this.validation.validate(
        transactionDetail,
        CreateTransactionOperationRequest.schema(),
      );
      result = await this.transactionOperationRepository.create(validatedData);
    } else {
      const transactionDetail = new CreateTransactionProductRequest(data);
      validatedData = this.validation.validate(
        transactionDetail,
        CreateTransactionProductRequest.schema(),
      );
      result = await this.transactionProductRepository.create(validatedData);
    }

    if (!result) {
      throw new Error('Failed to create transaction detail');
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
    data.unit = data.quantity; // for now assume unit is same as quantity [for Operation]
    data.weight = data.quantity; // for now assume weight is same as quantity [for product]

    let updatedDetail;
    if (data.detail_type == 'operation') {
      data.total_price =
        data.unit * Number(data.price) + Number(data.adjustment_price);
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
      updatedDetail = await this.transactionOperationRepository.findOne(id); // Fetch updated data
    } else {
      data.total_price =
        data.weight * Number(data.price) + Number(data.adjustment_price);
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
      updatedDetail = await this.transactionProductRepository.findOne(id); // Fetch updated data
    }

    const syncResult = await this.syncDetail(data.transaction_id); // Get sync detail result

    return CustomResponse.success('Transaction Detail updated successfully', {
      updatedDetail,
      syncResult,
    });
  }

  async deleteDetail(id: string): Promise<CustomResponse> {
    const product = await this.transactionProductRepository.findOne(id);
    console.log(id);
    const operation = await this.transactionOperationRepository.findOne(id);

    if (!product && !operation) {
      return CustomResponse.error('Transaction Detail not found', null, 404);
    }

    if (product) {
      await this.transactionProductRepository.delete(id);
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
      console.log('code deleted', code);
      // Broadcast the update to other services
      this.inventoryClient.emit(
        { cmd: 'product_code_updated' },
        {
          id: code.id,
          status: code.status,
        },
      );
    } else {
      await this.transactionOperationRepository.delete(id);
    }

    const updated = await this.syncDetail(
      product ? product.transaction_id : operation.transaction_id,
    );

    return CustomResponse.success(
      'Transaction Detail deleted successfully',
      updated,
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
    for (const operation of operations.data) {
      subtotal +=
        operation.unit * operation.price +
        parseFloat(operation.adjustment_price);
      if (tax == null) {
        tax = parseFloat(operation.transaction.store.tax_percentage);
      }
    }
    for (const product of products.data) {
      subtotal +=
        product.weight * product.price + parseFloat(product.adjustment_price);
      if (tax == null && product.transaction_type == 1) {
        tax = parseFloat(product.transaction.store.tax_percentage);
      }
    }

    const updateData = {
      sub_total_price: subtotal,
      tax_price: subtotal * (tax / 100),
      total_price: subtotal * ((tax + 100) / 100),
      paid_amount: subtotal * ((tax + 100) / 100),
    };
    const res = await this.transactionRepository.update(
      transaction_id,
      updateData,
    );
    return res;
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
        // Update product status Locally
        const code = await this.productCodeRepository.update(
          detail.product_code_id,
          {
            status: detail.transaction_type == 1 ? 0 : 1,
          },
        );
        console.log('code deleted', code);
        // Broadcast the update to other services
        this.inventoryClient.emit(
          { cmd: 'product_code_updated' },
          {
            id: code.id,
            status: code.status,
          },
        );
      }
      for (const detail of transactionOperation) {
        await this.transactionOperationRepository.delete(detail.id);
      }
      const dataDeleted = await this.repository.delete(id);

      // Delete File Nota
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
      return CustomResponse.error('Failed to delete transaction', null, 500);
    }
  }

  async updateStatus(id: string, status: number): Promise<CustomResponse> {
    const transaction = await this.repository.findOne(id);
    if (!transaction) {
      return CustomResponse.error('Transaction not found', null, 404);
    }
    const res = await this.repository.update(id, { approve: status });
    return CustomResponse.success(
      'Transaction status updated successfully',
      res,
    );
  }

  async generatePdf(id: string) {
    const transaction = await this.repository.findOne(id);
    if (!transaction) {
      return CustomResponse.error('Transaction not found', null, 404);
    }
    const pdfPath = await this.pdfService.generateSalesNota(transaction);
    if (!pdfPath) {
      return CustomResponse.error('Failed to generate PDF', null, 500);
    }
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
    const updatedTransaction = await this.repository.update(id, {
      nota_link: pdfPath.split('/storage/notas/')[1],
    });

    return CustomResponse.success(
      'PDF generated successfully',
      updatedTransaction,
    );
  }

  async getPdfPath(transactionId: string): Promise<string> {
    const transaction = await this.repository.findOne(transactionId);
    if (!transaction) {
      throw new Error('Transaction not found');
    }
    const filePath = path.join(this.storagePath, `${transaction.nota_link}`);
    return fs.existsSync(filePath) ? filePath : null;
  }

  // MarketPlace Transaction
  async processMidtransNotification(query: any): Promise<any> {
    try {
      console.log('Notification received from Midtrans:', query);
      const { transaction_status, order_id } = query;

      const transaction = await this.prisma.transaction.findUnique({
        where: { id: order_id },
        include: {
          store: true,
          transaction_products: {
            include: { product_code: true }, // Include product codes to update status
          },
          transaction_operations: true,
        },
      });

      if (!transaction) {
        console.error('Transaction not found:', order_id);
        return { success: false, message: 'Transaction not found' };
      }

      // ✅ SUCCESSFUL TRANSACTION HANDLING
      if (transaction_status === 'settlement' && transaction.status !== 1) {
        await this.prisma.transaction.update({
          where: { id: order_id },
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

        this.marketplaceClient.emit('transaction_settlement', {
          id: transaction.id,
        });
        this.authClient.emit(
          { cmd: 'transaction_settlement' },
          {
            store_id: transaction.store_id,
            transaction_code: transaction.code,
          },
        );

        return {
          success: true,
          redirectUrl: `marketplace-logamas://payment_success?order_id=${order_id}`,
        };
      }

      // ❌ FAILED TRANSACTION HANDLING (Soft Delete & Reset Voucher & Emit to Inventory)
      if (
        transaction_status === 'deny' ||
        transaction_status === 'expire' ||
        transaction_status === 'cancel' ||
        transaction_status === 'failure'
      ) {
        console.log(
          `Soft deleting transaction ${order_id} due to status: ${transaction_status}`,
        );

        await this.prisma.$transaction(async (tx) => {
          // 🔹 Soft delete the transaction
          await tx.transaction.update({
            where: { id: order_id },
            data: { deleted_at: new Date() },
          });

          // 🔹 Soft delete related transaction products
          if (transaction.transaction_products.length > 0) {
            await tx.transactionProduct.updateMany({
              where: { transaction_id: order_id },
              data: { deleted_at: new Date() },
            });
          }

          // 🔹 Soft delete related transaction operations
          if (transaction.transaction_operations.length > 0) {
            await tx.transactionOperation.updateMany({
              where: { transaction_id: order_id },
              data: { deleted_at: new Date() },
            });
          }

          // 🔹 If a voucher was used, mark it as "not used"
          if (transaction.voucher_own_id) {
            await tx.voucherOwned.update({
              where: { id: transaction.voucher_own_id },
              data: { is_used: false },
            });
          }

          // 🔹 Restore Product Code Status (Available) & Emit to Inventory
          console.log(
            `Restoring product_code status for transaction: ${order_id}`,
          );

          for (const item of transaction.transaction_products.filter(
            (item) =>
              item.product_code_id !== 'DISCOUNT' &&
              item.product_code_id !== 'TAX',
          )) {
            await tx.productCode.update({
              where: { id: item.product_code_id },
              data: { status: 0 }, // Set status to Available
            });

            // 🔥 Emit product status update to inventory service
            this.inventoryClient.emit(
              { cmd: 'product_code_updated' },
              {
                id: item.product_code_id,
                status: 0,
              },
            );
          }
        });

        this.marketplaceClient.emit('transaction_failed', {
          id: transaction.id,
        });

        this.authClient.emit(
          { cmd: 'transaction_failed' },
          {
            store_id: transaction.store_id,
            transaction_code: transaction.code,
          },
        );

        return {
          success: false,
          message: `Transaction ${order_id} has been soft deleted, and products restored.`,
        };
      }

      return {
        success: false,
        message: 'Transaction is not in a recognizable status',
      };
    } catch (error) {
      console.error('Error processing transaction:', error.message);
      return {
        success: false,
        message: error.message || 'Failed to process transaction',
      };
    }
  }

  async processMarketplaceTransaction(data: any, context: RmqContext) {
    try {
      console.log('Processing transaction:', data);

      if (
        !data.orderId ||
        !data.grossAmount ||
        !data.items ||
        !data.customerDetails ||
        !data.taxAmount
      ) {
        throw new Error('Missing required transaction details');
      }

      const totalItemPrice = data.items.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0,
      );
      if (totalItemPrice !== data.grossAmount) {
        throw new Error(
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

      const paymentLink = await this.requestPaymentLink(
        data,
        formattedStartTime,
      );

      const filteredItems = data.items.filter(
        (item) => item.id !== 'DISCOUNT' && item.id !== 'TAX',
      ); // Exclude discount
      const subTotalPrice = filteredItems.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0,
      );

      const store = await this.prisma.store.findUnique({
        where: { id: String(data.storeId) },
        select: { code: true },
      });
      const count = await this.prisma.transaction.count({
        where: { store_id: String(data.storeId) },
      });

      const code = `SAL/${store?.code}/${now.getFullYear()}/${now.getMonth() + 1}/${now.getDate()}/${(
        count + 1
      )
        .toString()
        .padStart(3, '0')}`;

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
            sub_total_price: subTotalPrice,
            total_price: data.grossAmount,
            tax_price: data.taxAmount,
            payment_link: paymentLink,
            poin_earned: data.poin_earned,
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
                throw new Error(`Product code not found for ID: ${item.id}`);
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
          this.inventoryClient.emit(
            { cmd: 'product_code_updated' },
            {
              id: item.id,
              status: 1,
            },
          );
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

      // 🔍 **Ambil Data Transaksi Lengkap Setelah Commit**
      const fullTransaction = await this.getFullTransactionDetails(result.id);

      this.generatePdf(fullTransaction.id);
      // 📡 Emit event ke Marketplace
      this.marketplaceClient.emit('transaction_created', {
        orderId: fullTransaction.id,
        paymentLink: fullTransaction.payment_link,
        status: 'waiting_payment',
        transaction: fullTransaction,
      });

      this.authClient.emit(
        { cmd: 'transaction_created' },
        {
          store_id: fullTransaction.store_id,
          transaction_code: fullTransaction.code,
        },
      );

      context.getChannelRef().ack(context.getMessage());

      return {
        success: true,
        message: 'Transaction processed successfully',
        data: {
          paymentLink,
          expiredAt,
          discountAmount: totalItemPrice - data.grossAmount,
          taxAmount: data.taxAmount,
        },
      };
    } catch (error) {
      context.getChannelRef().nack(context.getMessage());
      console.error('❌ Error processing transaction:', error.message);
      return {
        success: false,
        message: error.message || 'Failed to process transaction',
      };
    }
  }

  private async requestPaymentLink(
    data: any,
    formattedStartTime: string,
  ): Promise<string> {
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
          enabled_payments: ['credit_card', 'bca_va', 'gopay', 'shopeepay'],
          credit_card: {
            secure: true, // 🔒 Aktifkan 3DS security untuk kartu kredit
          },
          expiry: {
            start_time: formattedStartTime,
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
      throw new Error('Failed to request payment link');
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
      this.inventoryClient.emit(
        { cmd: 'product_code_updated' },
        {
          id: item.id,
          status: 1,
        },
      );
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
}
