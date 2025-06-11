import { Injectable } from '@nestjs/common';
import { BaseService } from 'src/base.service';
import { OperationRepository } from 'src/repositories/operation.repository';
import { ValidationService } from 'src/validation/validation.service';
import { CreateOperationRequest } from './dto/create-operation.dto';
import { UpdateOperationRequest } from './dto/update-operation.dto';

@Injectable()
export class OperationService extends BaseService {
  protected repository = this.operationRepository;
  protected createSchema = CreateOperationRequest.schema();
  protected updateSchema = UpdateOperationRequest.schema();

  constructor(
    private readonly operationRepository: OperationRepository,
    protected readonly validation: ValidationService,
  ) {
    super(validation);
  }

  protected transformCreateData(data: any) {
    return new CreateOperationRequest(data);
  }

  protected transformUpdateData(data: any) {
    return new UpdateOperationRequest(data);
  }
}
