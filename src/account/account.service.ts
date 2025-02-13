import { Injectable } from '@nestjs/common';
import { BaseService } from 'src/base.service';
import { ValidationService } from 'src/validation/validation.service';
import { CreateAccountRequest } from './dto/create-account.dto';
import { UpdateAccountRequest } from './dto/update-account.dto';
import { AccountRepository } from 'src/repositories/account.repository';

@Injectable()
export class AccountService extends BaseService {
  protected repository = this.accountRepository;
  protected createSchema = CreateAccountRequest.schema();
  protected updateSchema = UpdateAccountRequest.schema();

  constructor(
    private readonly accountRepository: AccountRepository,
    protected readonly validation: ValidationService,
  ) {
    super(validation);
  }

  protected transformCreateData(data: any) {
    return new CreateAccountRequest(data);
  }

  protected transformUpdateData(data: any) {
    return new UpdateAccountRequest(data);
  }
}
