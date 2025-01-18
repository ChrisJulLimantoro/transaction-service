import { Injectable } from '@nestjs/common';
import { BaseService } from 'src/base.service';
import { CategoryRepository } from 'src/repositories/category.repository';
import { ValidationService } from 'src/validation/validation.service';
import { CreateCategoryRequest } from './dto/create-category.dto';
import { UpdateCategoryRequest } from './dto/update-category.dto';

@Injectable()
export class CategoryService extends BaseService {
  protected repository = this.categoryRepository;
  protected createSchema = CreateCategoryRequest.schema();
  protected updateSchema = UpdateCategoryRequest.schema();

  constructor(
    private readonly categoryRepository: CategoryRepository,
    protected readonly validation: ValidationService,
  ) {
    super(validation);
  }

  protected transformCreateData(data: any) {
    return new CreateCategoryRequest(data);
  }

  protected transformUpdateData(data: any) {
    return new UpdateCategoryRequest(data);
  }
}
