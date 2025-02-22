import { Injectable } from '@nestjs/common';
import { BaseService } from 'src/base.service';
import { ProductRepository } from 'src/repositories/product.repository';
import { ValidationService } from 'src/validation/validation.service';
import { CreateProductRequest } from './dto/create-product.dto';
import { UpdateProductRequest } from './dto/update-product.dto';
import { ProductCodeRepository } from 'src/repositories/product-code.repository';
import { CustomResponse } from 'src/exception/dto/custom-response.dto';
import { ProductCodeDto } from './dto/product-code.dto';

@Injectable()
export class ProductService extends BaseService {
  protected repository = this.productRepository;
  protected createSchema = CreateProductRequest.schema();
  protected updateSchema = UpdateProductRequest.schema();

  constructor(
    private readonly productRepository: ProductRepository,
    private readonly productCodeRepository: ProductCodeRepository,
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
}
