import { Transform } from 'class-transformer';
import { BsDate } from '../bs-date.js';
import { BikramSambatError } from '../errors.js';
import { DEFAULT_PATTERN } from '../format.js';

/** Options for `@ToBsDate()`. */
export interface ToBsDateOptions {
  /** The pattern to parse and serialize with. Defaults to `YYYY-MM-DD`. */
  readonly pattern?: string;
}

/**
 * class-transformer decorator: turns a BS date string into a `BsDate` when a
 * request body or query is transformed (ValidationPipe with
 * `transform: true`). It turns the `BsDate` back into a string when an
 * object is serialized (ClassSerializerInterceptor). Arrays are handled
 * element by element.
 *
 * A string that does not parse is left as it is, so pair this with
 * `@IsBsDate()` to reject it with a validation message:
 *
 * ```ts
 * class ReportQueryDto {
 *   @ToBsDate()
 *   @IsBsDate()
 *   from!: BsDate;
 * }
 * ```
 */
export function ToBsDate(options: ToBsDateOptions = {}): PropertyDecorator {
  const pattern = options.pattern ?? DEFAULT_PATTERN;

  const parse = (raw: unknown): unknown => {
    if (Array.isArray(raw)) return raw.map(parse);
    if (typeof raw !== 'string') return raw;
    try {
      return BsDate.parse(raw, pattern);
    } catch (error) {
      if (error instanceof BikramSambatError) return raw;
      throw error;
    }
  };
  const serialize = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(serialize);
    return value instanceof BsDate ? value.format(pattern) : value;
  };

  // Read the untouched input from `obj`, not `value`: with
  // `enableImplicitConversion`, class-transformer has already tried to turn
  // `value` into the property's declared type.
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
