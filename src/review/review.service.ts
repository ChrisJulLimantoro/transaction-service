import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class ReviewService {
  constructor(private prismaService: PrismaService) {}

  async giveReview(data: any) {
    const { id, transaction_product_id, user_id, rating, review, reply_admin } =
      data;
    return await this.prismaService.transactionReview.create({
      data: {
        id: id,
        transaction_product_id,
        customer_id: user_id,
        rating,
        review,
        reply_admin,
      },
    });
  }

  async replyReview(id: any, data: any) {
    return await this.prismaService.transactionReview.update({
      where: { id },
      data: {
        reply_admin: data.reply_admin,
      },
    });
  }

  async editReview(data: any) {
    return await this.prismaService.transactionReview.update({
      where: { id: data.id },
      data: {
        rating: data.rating,
        review: data.review,
      },
    });
  }
}
