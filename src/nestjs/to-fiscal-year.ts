import { Transform } from 'class-transformer';
import { BikramSambatError } from '../errors.js';
import { FiscalYear } from '../fiscal-year.js';

/**
 * class-transformer decorator: turns a label such as `2083/84` into a
 * `FiscalYear` when a request body or query is transformed (ValidationPipe
 * with `transform: true`). It turns the `FiscalYear` back into its label
 * when an object is serialized (ClassSerializerInterceptor). Arrays are
 * handled element by element.
 *
 * A string that does not parse is left as it is, so pair this with
 * `@IsFiscalYear()` to reject it with a validation message:
 *
 * ```ts
 * class SalesReportQueryDto {
 *   @ToFiscalYear()
 *   @IsFiscalYear()
 *   fy!: FiscalYear;
 * }
 * ```
 */
export function ToFiscalYear(): PropertyDecorator {
  const parse = (raw: unknown): unknown => {
    if (Array.isArray(raw)) return raw.map(parse);
    if (typeof raw !== 'string') return raw;
    try {
      return FiscalYear.parse(raw);
    } catch (error) {
      if (error instanceof BikramSambatError) return raw;
      throw error;
    }
  };
  const serialize = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(serialize);
    return value instanceof FiscalYear ? value.label : value;
  };

  // Read the untouched input from `obj`, as @ToBsDate() does: with
  // `enableImplicitConversion`, `value` has already been converted.
  const toClass = Transform(
    ({ key, obj }) => parse((obj as Record<string, unknown>)[key]),
    { toClassOnly: true },
  );
  const toPlain = Transform(({ value }) => serialize(value), {
    toPlainOnly: true,
  });
  return (target, propertyKey) => {
    toClass(target, propertyKey);
    toPlain(target, propertyKey);
  };
}
