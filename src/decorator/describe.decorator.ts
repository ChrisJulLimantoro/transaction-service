import { SetMetadata } from '@nestjs/common';

export const DESCRIBE_PATTERN_METADATA = 'DESCRIBE_PATTERN_METADATA';

export const Describe = (...args: string[]) =>
  SetMetadata(DESCRIBE_PATTERN_METADATA, args);
