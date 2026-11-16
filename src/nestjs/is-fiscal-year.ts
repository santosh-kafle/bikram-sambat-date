import {
  buildMessage,
  ValidateBy,
  type ValidationOptions,
} from 'class-validator';
import { BikramSambatError } from '../errors.js';
import { FiscalYear } from '../fiscal-year.js';

/**
 * Whether a value is a fiscal year: a `FiscalYear`, or a label such as
 * `2083/84` or `2083/2084` in the supported range. Never throws.
 */
export function isFiscalYear(value: unknown): boolean {
  if (value instanceof FiscalYear) return true;
  if (typeof value !== 'string') return false;
  try {
    FiscalYear.parse(value);
    return true;
  } catch (error) {
    if (error instanceof BikramSambatError) return false;
    throw error;
  }
}

/**
 * class-validator decorator: the property must be a fiscal year. It accepts
 * a label such as `2083/84` or, after `@ToFiscalYear()`, a `FiscalYear`.
 *
 * ```ts
 * class SalesReportQueryDto {
 *   @IsFiscalYear()
 *   fy!: string; // '2083/84'
 * }
 * ```
 */
export function IsFiscalYear(
  validationOptions?: ValidationOptions,
): PropertyDecorator {
  return ValidateBy(
    {
      name: 'isFiscalYear',
      validator: {
        validate: (value) => isFiscalYear(value),
        defaultMessage: buildMessage(
          (each) => `${each}$property must be a fiscal year (such as 2083/84)`,
          validationOptions,
        ),
      },
    },
    validationOptions,
  );
}
