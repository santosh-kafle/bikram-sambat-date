import {
  BadRequestException,
  Injectable,
  Optional,
  type PipeTransform,
} from '@nestjs/common';
import { BsDate } from '../bs-date.js';
import { BikramSambatError } from '../errors.js';
import { DEFAULT_PATTERN } from '../format.js';

/** Options for `ParseBsDatePipe`. */
export interface ParseBsDatePipeOptions {
  /** The pattern to parse with. Defaults to `YYYY-MM-DD`. */
  readonly pattern?: string;
  /** Accept only dates from published calendars, not projected ones. */
  readonly strict?: boolean;
  /** Pass a missing or empty value through as `undefined` instead of failing. */
  readonly optional?: boolean;
}

/**
 * NestJS pipe: parses a route parameter or query value into a `BsDate`, and
 * answers 400 Bad Request if it is not a BS date.
 *
 * ```ts
 * @Get('sales/:date')
 * sales(@Param('date', ParseBsDatePipe) date: BsDate) {}
 *
 * @Get('sales')
 * list(@Query('from', new ParseBsDatePipe({ optional: true })) from?: BsDate) {}
 * ```
 */
export class ParseBsDatePipe implements PipeTransform<
  unknown,
  BsDate | undefined
> {
  private readonly pattern: string;

  constructor(private readonly options: ParseBsDatePipeOptions = {}) {
    this.pattern = options.pattern ?? DEFAULT_PATTERN;
  }

  transform(value: unknown): BsDate | undefined {
    if (this.options.optional && (value === undefined || value === '')) {
      return undefined;
    }
    if (typeof value !== 'string') {
      throw new BadRequestException(this.message('a string is expected'));
    }
    try {
      return BsDate.parse(value, this.pattern, {
        strict: this.options.strict ?? false,
      });
    } catch (error) {
      if (error instanceof BikramSambatError) {
        throw new BadRequestException(this.message(error.message));
      }
      throw error;
    }
  }

  private message(detail: string): string {
    return `Validation failed (BS date ${this.pattern} is expected): ${detail}`;
  }
}

// Decorators applied as calls, so the package needs no decorator compiler
// settings. Equivalent to @Injectable() on the class and @Optional() on the
// constructor's options, as Nest's own ParseIntPipe has.
Injectable()(ParseBsDatePipe);
Optional()(ParseBsDatePipe, undefined, 0);
