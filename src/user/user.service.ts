import { Injectable } from '@nestjs/common';
import { CreateUserRequest } from './dto/create-user-request.dto';
import { ValidationService } from 'src/validation/validation.service';
import { CustomResponse } from 'src/exception/dto/custom-response.dto';
import { UserRepository } from 'src/repositories/user.repository';
@Injectable()
export class UserService {
  constructor(
    private repository: UserRepository,
    private validation: ValidationService,
  ) {}

  async createUser(data: CreateUserRequest) {
    data = new CreateUserRequest(data);
    const validated = this.validation.validate(
      data,
      CreateUserRequest.schema(),
    );
    const newUser = await this.repository.createUser(validated);
    return CustomResponse.success('User Created!', newUser);
  }

  async getUsers() {
    const data = await this.repository.findAll();
    return CustomResponse.success('Data Fetched!', data);
  }

  async getUserById(id: string) {
    const user = await this.repository.findOne(id);
    if (!user) {
      return CustomResponse.error('User not found', null, 404);
    }
    return CustomResponse.success('User found!', user);
  }

  async deleteUser(id: string) {
    const user = await this.repository.findOne(id);
    if (!user) {
      return CustomResponse.error('User not found', null, 404);
    }
    await this.repository.delete(id);
    return CustomResponse.success('User deleted!', user, 200);
  }

  async updateUser(id: string, data: any) {
    const user = await this.repository.findOne(id);
    if (!user) {
      return CustomResponse.error('User not found', null, 404);
    }
    const updated = await this.repository.update(id, data);
    return CustomResponse.success('User updated!', updated);
  }
}
