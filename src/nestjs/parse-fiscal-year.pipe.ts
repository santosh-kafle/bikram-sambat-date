import {
  BadRequestException,
  Injectable,
  Optional,
  type PipeTransform,
} from '@nestjs/common';
import { BikramSambatError } from '../errors.js';
import { FiscalYear } from '../fiscal-year.js';

/** Options for `ParseFiscalYearPipe`. */
export interface ParseFiscalYearPipeOptions {
  /** Pass a missing or empty value through as `undefined` instead of failing. */
  readonly optional?: boolean;
}

/**
 * NestJS pipe: parses a route parameter or query value such as `2083/84`
 * into a `FiscalYear`, and answers 400 Bad Request if it is not one.
 *
 * ```ts
 * @Get('reports/sales')
 * sales(@Query('fy', ParseFiscalYearPipe) fy: FiscalYear) {}
 * ```
 *
 * A slash in a route parameter must be URL-encoded (`2083%2F84`), so prefer
 * a query parameter.
 */
export class ParseFiscalYearPipe implements PipeTransform<
  unknown,
  FiscalYear | undefined
> {
  constructor(private readonly options: ParseFiscalYearPipeOptions = {}) {}

  transform(value: unknown): FiscalYear | undefined {
    if (this.options.optional && (value === undefined || value === '')) {
      return undefined;
    }
    if (typeof value !== 'string') {
      throw new BadRequestException(this.message('a string is expected'));
    }
    try {
      return FiscalYear.parse(value);
    } catch (error) {
      if (error instanceof BikramSambatError) {
        throw new BadRequestException(this.message(error.message));
      }
      throw error;
    }
  }

  private message(detail: string): string {
    return `Validation failed (fiscal year such as 2083/84 is expected): ${detail}`;
  }
}

// Applied as calls, as for ParseBsDatePipe: @Injectable() on the class and
// @Optional() on the constructor's options.
Injectable()(ParseFiscalYearPipe);
Optional()(ParseFiscalYearPipe, undefined, 0);
