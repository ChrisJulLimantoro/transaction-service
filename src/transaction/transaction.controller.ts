import { Controller } from '@nestjs/common';
import { EventPattern } from '@nestjs/microservices';

@Controller('transaction')
export class TransactionController {
  @EventPattern('transaction_log')
  async handleTransactionLog(data: {
    orderId: string;
    grossAmount: number;
    status: string;
    paymentLink: string;
  }) {
    console.log('Transaction Log:', data);

    // Implement logic to log the transaction in the database
    // Example:
    // await this.prismaService.transaction.create({
    //   data: {
    //     orderId: data.orderId,
    //     grossAmount: data.grossAmount,
    //     status: data.status,
    //     paymentLink: data.paymentLink,
    //   },
    // });
  }
}
