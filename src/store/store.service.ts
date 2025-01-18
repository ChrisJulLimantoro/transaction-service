import { Injectable } from '@nestjs/common';
import { BaseService } from 'src/base.service';
import { StoreRepository } from 'src/repositories/store.repository';
import { ValidationService } from 'src/validation/validation.service';
import { CreateStoreRequest } from './dto/create-store.dto';
import { UpdateStoreRequest } from './dto/update-store.dto';

@Injectable()
export class StoreService extends BaseService {
  protected repository = this.storeRepository;
  protected createSchema = CreateStoreRequest.schema();
  protected updateSchema = UpdateStoreRequest.schema();

  constructor(
    private readonly storeRepository: StoreRepository,
    protected readonly validation: ValidationService,
  ) {
    super(validation);
  }

  protected transformCreateData(data: any) {
    return new CreateStoreRequest(data);
  }

  protected transformUpdateData(data: any) {
    return new UpdateStoreRequest(data);
  }
}
