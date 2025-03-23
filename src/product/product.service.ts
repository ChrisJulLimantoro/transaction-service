import { Injectable } from '@nestjs/common';
import { BaseService } from 'src/base.service';
import { ProductRepository } from 'src/repositories/product.repository';
import { ValidationService } from 'src/validation/validation.service';
import { CreateProductRequest } from './dto/create-product.dto';
import { UpdateProductRequest } from './dto/update-product.dto';
import { ProductCodeRepository } from 'src/repositories/product-code.repository';
import { CustomResponse } from 'src/exception/dto/custom-response.dto';
import { ProductCodeDto } from './dto/product-code.dto';
import { PriceRepository } from 'src/repositories/price.repository';
import { PrismaService } from 'src/prisma/prisma.service';
import { ProductCode } from '@prisma/client';

@Injectable()
export class ProductService extends BaseService {
  protected repository = this.productRepository;
  protected createSchema = CreateProductRequest.schema();
  protected updateSchema = UpdateProductRequest.schema();

  constructor(
    private readonly productRepository: ProductRepository,
    private readonly productCodeRepository: ProductCodeRepository,
    private readonly prisma: PrismaService,
    protected readonly validation: ValidationService,
  ) {
    super(validation);
  }

  protected transformCreateData(data: any) {
    return new CreateProductRequest(data);
  }

  protected transformUpdateData(data: any) {
    return new UpdateProductRequest(data);
  }

  async generateProductCode(data: any) {
    const convert = new ProductCodeDto(data);
    const validatedData = this.validation.validate(
      convert,
      ProductCodeDto.schema(),
    );
    const code = await this.productCodeRepository.create(validatedData);
    return CustomResponse.success('Product code generated!', code, 201);
  }

  async updateProductCode(id: any, data: any) {
    const convert = new ProductCodeDto(data);
    const validatedData = this.validation.validate(
      convert,
      ProductCodeDto.schema(),
    );
    const code = await this.productCodeRepository.update(id, validatedData);
    return CustomResponse.success('Product code updated!', code, 200);
  }

  async getProductPurchase(code: string, store_id: string, is_broken: boolean) {
    const product = (await this.productCodeRepository.findCode(code)) as any;
    if (!product) {
      return CustomResponse.error('Product not found!', 404);
    }
    if (product.status !== 1) {
      return CustomResponse.error('Product is not sold yet!', 400);
    }

    if (product.product.store_id !== store_id) {
      return CustomResponse.error(
        'You are not the owner of this product!',
        404,
      );
    }

    const store = await this.prisma.store.findFirst({
      where: {
        id: product.product.store_id,
      },
    });

    if (!store) {
      return CustomResponse.error('Store not found!', 404);
    }

    // Find the Current Price
    const price = await this.prisma.price.findFirst({
      where: {
        type_id: product.product.type_id,
        date: {
          lte: new Date(),
        },
        is_active: true,
      },
      orderBy: {
        date: 'desc',
      },
    });

    if (!price) {
      return CustomResponse.error('Price not found!', 404);
    }

    // Find the Type
    const type = await this.prisma.type.findFirst({
      where: {
        id: product.product.type_id,
      },
      include: {
        category: true,
      },
    });

    // Calculate and Construct the new Response data
    var newPrice = 0;
    if (store.is_float_price) {
      newPrice = Number(price.price);
    } else {
      newPrice = Number(product.fixed_price);
    }

    var diff = Math.abs(
      Math.floor(
        (Date.parse(product.transaction_products[0].updated_at) - Date.now()) /
          (1000 * 60 * 60 * 24),
      ),
    );
    var adjust = 0;
    if (diff > Number(store.grace_period)) {
      if (is_broken) {
        adjust =
          Number(type.fixed_broken_reduction) > 0
            ? Number(type.fixed_broken_reduction)
            : (Number(type.percent_broken_reduction) *
                newPrice *
                Number(product.weight)) /
              100;
      } else {
        adjust =
          Number(type.fixed_price_reduction) > 0
            ? Number(type.fixed_price_reduction)
            : (Number(type.percent_price_reduction) *
                newPrice *
                Number(product.weight)) /
              100;
      }
    }

    const data = {
      id: product.id,
      barcode: product.barcode,
      name: `${product.barcode} - ${product.product.name}`,
      price: newPrice,
      adjustment_price: adjust * -1,
      weight: product.weight,
      type: `${type.code} - ${type.category.name}`,
      status: product.status,
    };

    return CustomResponse.success('Product purchase found!', data);
  }
}
