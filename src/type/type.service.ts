import { Injectable } from '@nestjs/common';
import { BaseService } from 'src/base.service';
import { TypeRepository } from 'src/repositories/type.repository';
import { ValidationService } from 'src/validation/validation.service';
import { CreateTypeRequest } from './dto/create-type.dto';
import { UpdateTypeRequest } from './dto/update-type.dto';

@Injectable()
export class TypeService extends BaseService {
  protected repository = this.typeRepository;
  protected createSchema = CreateTypeRequest.schema();
  protected updateSchema = UpdateTypeRequest.schema();

  constructor(
    private readonly typeRepository: TypeRepository,
    protected readonly validation: ValidationService,
  ) {
    super(validation);
  }

  protected transformCreateData(data: any) {
    return new CreateTypeRequest(data);
  }

  protected transformUpdateData(data: any) {
    return new UpdateTypeRequest(data);
  }
}
