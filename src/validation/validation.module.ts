import { DynamicModule, Module } from '@nestjs/common';
import { ValidationService } from './validation.service';

@Module({})
export class ValidationModule {
  static forRoot(): DynamicModule {
    return {
      global: true,
      module: ValidationModule,
      providers: [ValidationService],
      exports: [ValidationService],
    };
  }
}
