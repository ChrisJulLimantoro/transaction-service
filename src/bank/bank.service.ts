import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class BankService {
  constructor(private readonly prisma: PrismaService) {}

  async getByStore(storeId: string) {
    return await this.prisma.bankAccount.findMany({
      where: { store_id: storeId, deleted_at: null },
    });
  }

  async getById(id: string) {
    return await this.prisma.bankAccount.findUnique({
      where: { id, deleted_at: null },
    });
  }

  async create(data: any) {
    const { owner_id, auth, ...filteredData } = data;
    return await this.prisma.bankAccount.create({
      data: filteredData,
    });
  }

  async update(id: string, data: any) {
    const { owner_id, auth, ...filteredData } = data;
    return await this.prisma.bankAccount.update({
      where: { id },
      data: filteredData,
    });
  }

  async softDelete(id: string) {
    return await this.prisma.bankAccount.update({
      where: { id },
      data: { deleted_at: new Date() },
    });
  }

  async createReplica(data: any) {
    return this.prisma.bankAccount.create({
      data: {
        id: data.id,
        store_id: data.store_id,
        bank_name: data.bank_name,
        account_number: data.account_number,
        account_holder: data.account_holder,
        created_at: data.created_at,
        updated_at: data.updated_at,
      },
    });
  }

  async deleteReplica(id: string) {
    return this.prisma.bankAccount.update({
      where: { id },
      data: { deleted_at: new Date() },
    });
  }

  async updateReplica(id: string, data: any) {
    return this.prisma.bankAccount.update({
      where: { id },
      data: {
        store_id: data.store_id,
        bank_name: data.bank_name,
        account_number: data.account_number,
        account_holder: data.account_holder,
        updated_at: new Date(), // atau gunakan data.updated_at jika disertakan
      },
    });
  }
}
