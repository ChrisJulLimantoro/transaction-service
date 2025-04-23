import { Injectable } from '@nestjs/common';
import { CustomResponse } from 'src/exception/dto/custom-response.dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class CustomerService {
  constructor(private readonly prismaService: PrismaService) {}

  async register(data: any): Promise<any> {
    const user = await this.prismaService.customer.create({
      data: {
        id: data.id,
        email: data.email,
        name: data.name,
        phone: data.phone,
        is_verified: data.is_verified,
        device_token: data.deviceTokens,
      },
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

  async updateProfile(data: any): Promise<any> {
    console.log(data);
    const updateUser = await this.prismaService.customer.update({
      where: { id: data.id },
      data: {
        name: data.name,
        phone: data.phone,
      },
    });
    return updateUser;
  }

  async deleteUser(userId: string): Promise<any> {
    const deletedUser = await this.prismaService.customer.update({
      where: { id: userId },
      data: {
        deleted_at: new Date(),
      },
    });

    return deletedUser;
  }
  async addDeviceToken(userId: string, deviceToken: string): Promise<any> {
    const user = await this.prismaService.customer.findUnique({
      where: { id: userId },
    });
    if (!user) throw new Error('User not found!');

    const updatedUser = await this.prismaService.customer.update({
      where: { id: userId },
      data: {
        device_token: {
          push: deviceToken,
        },
      },
    });

    return updatedUser;
  }
  async findAll(data: any): Promise<any> {
    const users = await this.prismaService.customer.findMany({
      where: {
        deleted_at: null,
      },
    });
    if (!users) throw new Error('No users found!');

    return CustomResponse.success('Users retrieved!', users, 200);
  }
  async findById(id: string) {
    const user = await this.prismaService.customer.findUnique({
      where: { id: id, deleted_at: null },
    });
    if (!user) throw new Error('User not found!');
    return CustomResponse.success('User retrieved!', user, 200);
  }
  async findByEmail(email: string) {
    const user = await this.prismaService.customer.findUniqueOrThrow({
      where: { email: email, deleted_at: null },
    });
    if (!user) throw new Error('User not found!');
    return CustomResponse.success('User retrieved!', user, 200);
  }
}
