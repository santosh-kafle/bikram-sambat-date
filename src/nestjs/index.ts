/**
 * NestJS helpers: validation, transformation and a pipe for BS dates.
 * Import from `bikram-sambat-date/nestjs`. Needs `@nestjs/common`,
 * `class-validator` and `class-transformer`, which the core package does not.
 *
 * @packageDocumentation
 */
export { IsBsDate, isBsDate, type IsBsDateOptions } from './is-bs-date.js';
export {
  ParseBsDatePipe,
  type ParseBsDatePipeOptions,
} from './parse-bs-date.pipe.js';
export { ToBsDate, type ToBsDateOptions } from './to-bs-date.js';
