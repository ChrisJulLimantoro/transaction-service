import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PayoutService {
  constructor(private prisma: PrismaService) {}

  async createPayout(data: {
    store_id: string;
    bank_account_id: string;
    amount: number;
    information?: string;
  }) {
    const { store_id, bank_account_id, amount, information } = data;

    const store = await this.prisma.store.findUnique({
      where: { id: store_id },
    });

    if (!store) {
      throw new NotFoundException('Store not found');
    }

    if (store.balance.toNumber() < amount) {
      throw new BadRequestException('Insufficient balance');
    }

    const payoutRequest = await this.prisma.payoutRequest.create({
      data: {
        store_id,
        bank_account_id,
        amount,
        status: 0,
        information,
      },
    });

    await this.prisma.store.update({
      where: { id: store_id },
      data: {
        balance: store.balance.minus(amount),
      },
    });

    await this.prisma.balanceLog.create({
      data: {
        store_id,
        amount: -amount,
        type: 'PAYOUT_REQUEST',
        information: information || `Payout request of Rp ${amount} created.`,
      },
    });

    return payoutRequest;
  }

  async getPayoutsByStore(storeId: string) {
    return this.prisma.payoutRequest.findMany({
      where: { store_id: storeId },
      orderBy: { created_at: 'desc' },
    });
  }

  async getPayoutById(id: string) {
    const payout = await this.prisma.payoutRequest.findUnique({
      where: { id },
    });
    if (!payout) throw new NotFoundException('Payout not found');
    return payout;
  }

  async updatePayout(
    id: string,
    data: { status: number; approved_at?: Date; information?: string },
  ) {
    const { status, information } = data;

    const payout = await this.prisma.payoutRequest.findUnique({
      where: { id },
    });
    if (!payout) throw new NotFoundException('Payout request not found');

    if (![1, 2].includes(status)) {
      throw new BadRequestException('Invalid status');
    }

    const updatedPayout = await this.prisma.payoutRequest.update({
      where: { id },
      data: {
        status,
        approved_at: status === 1 ? new Date() : null,
        information,
      },
    });

    if (status === 1) {
      await this.prisma.store.update({
        where: { id: payout.store_id },
        data: { balance: { decrement: payout.amount } },
      });

      await this.prisma.balanceLog.create({
        data: {
          store_id: payout.store_id,
          amount: payout.amount,
          type: 'PAYOUT_REQUEST',
          information: `Payout approved: ${payout.amount}`,
        },
      });
    }

    return updatedPayout;
  }
}
