import { CustomResponse } from './exception/dto/custom-response.dto';
import { ValidationService } from './validation/validation.service';

export abstract class BaseService {
  // Abstract repository, which will be defined by the child service
  protected abstract repository: any;
  protected abstract createSchema: any;
  protected abstract updateSchema: any;

  constructor(protected readonly validation: ValidationService) {}

  protected transformCreateData(data: any): any {
    return data; // Default implementation (no transformation)
  }

  protected transformUpdateData(data: any): any {
    return data; // Default implementation (no transformation)
  }

  // Create
  async create(data: any): Promise<CustomResponse> {
    data = this.transformCreateData(data);
    const validatedData = this.validation.validate(data, this.createSchema);
    const newData = await this.repository.create(validatedData);
    if (!newData) {
      return CustomResponse.error('Failed to create new data', null, 500);
    }
    return CustomResponse.success('New Data Created!', newData, 201);
  }

  // Find all
  async findAll(filter: Record<string, any> = null): Promise<CustomResponse> {
    const data = await this.repository.findAll(filter);
    return CustomResponse.success('Data Found!', data, 200);
  }

  // Find one by ID
  async findOne(id: string): Promise<CustomResponse | null> {
    const data = await this.repository.findOne(id);
    if (!data) {
      return CustomResponse.error('Data not found', null, 404);
    }
    return CustomResponse.success('Data found!', data, 200);
  }

  // Update
  async update(id: string, data: any): Promise<CustomResponse> {
    data = this.transformUpdateData(data);
    const oldData = await this.repository.findOne(id);
    if (!oldData) {
      return CustomResponse.error('Data not found', null, 404);
    }
    const validatedData = this.validation.validate(data, this.updateSchema);
    const newData = await this.repository.update(id, validatedData);
    return CustomResponse.success('Data Updated!', newData, 200);
  }

  // Delete
  async delete(id: string): Promise<CustomResponse> {
    const data = await this.repository.findOne(id);
    if (!data) {
      return CustomResponse.error('Data not found', null, 404);
    }
    await this.repository.delete(id);
    return CustomResponse.success('Data deleted!', data, 200);
  }
}
