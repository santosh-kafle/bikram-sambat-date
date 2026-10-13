import {
  buildMessage,
  ValidateBy,
  type ValidationOptions,
} from 'class-validator';
import { BsDate } from '../bs-date.js';
import { BikramSambatError } from '../errors.js';
import { DEFAULT_PATTERN } from '../format.js';

/** Options for `@IsBsDate()`. */
export interface IsBsDateOptions {
  /** The pattern strings must match. Defaults to `YYYY-MM-DD`. */
  readonly pattern?: string;
  /** Accept only dates from published calendars, not projected ones. */
  readonly strict?: boolean;
}

/**
 * Whether a value is a BS date: a `BsDate`, or a string that parses with
 * the pattern. Never throws.
 */
export function isBsDate(
  value: unknown,
  options: IsBsDateOptions = {},
): boolean {
  if (value instanceof BsDate) return !(options.strict && value.isProjected);
  if (typeof value !== 'string') return false;
  try {
    BsDate.parse(value, options.pattern ?? DEFAULT_PATTERN, {
      strict: options.strict ?? false,
    });
    return true;
  } catch (error) {
    if (error instanceof BikramSambatError) return false;
    throw error;
  }
}

/**
 * class-validator decorator: the property must be a BS date. It accepts a
 * string in the pattern (`YYYY-MM-DD` by default) or, after `@ToBsDate()`,
 * a `BsDate`.
 *
 * ```ts
 * class CreateInvoiceDto {
 *   @IsBsDate()
 *   issuedOn!: string; // '2083-04-01'
 * }
 * ```
 */
export function IsBsDate(
  options: IsBsDateOptions = {},
  validationOptions?: ValidationOptions,
): PropertyDecorator {
  const pattern = options.pattern ?? DEFAULT_PATTERN;
  const published = options.strict ? ' from a published calendar' : '';
  return ValidateBy(
    {
      name: 'isBsDate',
      constraints: [options],
      validator: {
        validate: (value) => isBsDate(value, options),
        defaultMessage: buildMessage(
          (each) =>
            `${each}$property must be a BS date (${pattern})${published}`,
          validationOptions,
        ),
      },
    },
    validationOptions,
  );
}
