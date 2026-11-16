/**
 * NestJS helpers: validation, transformation and pipes for BS dates and
 * fiscal years. Import from `bikram-sambat-date/nestjs`. Needs
 * `@nestjs/common`, `class-validator` and `class-transformer`, which the
 * core package does not.
 *
 * @packageDocumentation
 */
export { IsBsDate, isBsDate, type IsBsDateOptions } from './is-bs-date.js';
export { IsFiscalYear, isFiscalYear } from './is-fiscal-year.js';
export {
  ParseBsDatePipe,
  type ParseBsDatePipeOptions,
} from './parse-bs-date.pipe.js';
export {
  ParseFiscalYearPipe,
  type ParseFiscalYearPipeOptions,
} from './parse-fiscal-year.pipe.js';
export { ToBsDate, type ToBsDateOptions } from './to-bs-date.js';
export { ToFiscalYear } from './to-fiscal-year.js';
