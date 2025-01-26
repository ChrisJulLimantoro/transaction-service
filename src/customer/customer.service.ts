import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class CustomerService {
  constructor(private readonly prismaService: PrismaService) {}

  async register(data: any): Promise<any> {
    const user = await this.prismaService.customer.create({
      data: data,
    });
    return user;
  }

  async verifyUser(data: any): Promise<any> {
    const user = await this.prismaService.customer.findUnique({
      where: { email: data.email },
    });
    if (!user) throw new Error('User not found!');
    await this.prismaService.customer.update({
      where: { email: data.email },
      data: { is_verified: true },
    });
  }
}
