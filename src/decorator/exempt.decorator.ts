import { SetMetadata } from '@nestjs/common';

export const EXEMPT_PATTERN_METADATA = 'EXEMPT_PATTERN_METADATA';

export const Exempt = () => SetMetadata(EXEMPT_PATTERN_METADATA, true);
