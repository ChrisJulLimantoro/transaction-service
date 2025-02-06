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
}
