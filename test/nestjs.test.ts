import 'reflect-metadata';
import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { instanceToPlain, plainToInstance } from 'class-transformer';
import { IsOptional, validate } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { BsDate } from '../src/index.js';
import {
  IsBsDate,
  isBsDate,
  ParseBsDatePipe,
  ToBsDate,
} from '../src/nestjs/index.js';

/** Records what TypeScript's emitDecoratorMetadata would for `name: type`. */
const declareType = (target: object, name: string, type: unknown) =>
  Reflect.defineMetadata('design:type', type, target, name);

describe('isBsDate', () => {
  it('accepts BS date strings and BsDate values', () => {
    expect(isBsDate('2083-04-01')).toBe(true);
    expect(isBsDate('२०८३-०४-०१')).toBe(true);
    expect(isBsDate(BsDate.of(2083, 4, 1))).toBe(true);
    expect(isBsDate('1 Shrawan 2083', { pattern: 'D MMMM YYYY' })).toBe(true);
  });

  it('rejects anything else', () => {
    for (const value of ['2083-01-32', '2083/04/01', '', 20830401, null, {}]) {
      expect(isBsDate(value), String(value)).toBe(false);
    }
  });

  it('rejects projected dates when strict', () => {
    expect(isBsDate('2090-01-01')).toBe(true);
    expect(isBsDate('2090-01-01', { strict: true })).toBe(false);
    expect(isBsDate(BsDate.of(2090, 1, 1), { strict: true })).toBe(false);
    expect(isBsDate('2083-01-01', { strict: true })).toBe(true);
  });
});

describe('@IsBsDate', () => {
  class InvoiceDto {
    @IsBsDate()
    issuedOn!: unknown;

    @IsOptional()
    @IsBsDate({ strict: true })
    filedOn?: unknown;

    @IsOptional()
    @IsBsDate({}, { each: true })
    holidays?: unknown[];
  }

  const errorsFor = async (plain: object) =>
    (await validate(plainToInstance(InvoiceDto, plain))).flatMap((e) =>
      Object.values(e.constraints ?? {}),
    );

  it('passes valid dates', async () => {
    expect(
      await errorsFor({
        issuedOn: '2083-04-01',
        filedOn: '2083-04-02',
        holidays: ['2083-04-03', '2083-04-04'],
      }),
    ).toEqual([]);
  });

  it('explains what is wrong', async () => {
    expect(await errorsFor({ issuedOn: '2083-13-01' })).toEqual([
      'issuedOn must be a BS date (YYYY-MM-DD)',
    ]);
    expect(
      await errorsFor({ issuedOn: '2083-04-01', filedOn: '2090-01-01' }),
    ).toEqual([
      'filedOn must be a BS date (YYYY-MM-DD) from a published calendar',
    ]);
    expect(
      await errorsFor({
        issuedOn: '2083-04-01',
        holidays: ['2083-04-03', 'x'],
      }),
    ).toEqual(['each value in holidays must be a BS date (YYYY-MM-DD)']);
  });
});

describe('@ToBsDate with ValidationPipe', () => {
  class ReportQueryDto {
    @ToBsDate()
    @IsBsDate()
    from!: BsDate;

    @IsOptional()
    @ToBsDate({ pattern: 'D MMMM YYYY' })
    @IsBsDate({ pattern: 'D MMMM YYYY' })
    to?: BsDate;

    @IsOptional()
    @ToBsDate()
    @IsBsDate({}, { each: true })
    days?: BsDate[];
  }
  // CartNext compiles with emitDecoratorMetadata; record the same types.
  declareType(ReportQueryDto.prototype, 'from', BsDate);
  declareType(ReportQueryDto.prototype, 'to', BsDate);
  declareType(ReportQueryDto.prototype, 'days', Array);

  // CartNext's global pipe (src/app.setup.ts).
  const pipe = new ValidationPipe({
    whitelist: true,
    transform: true,
    transformOptions: { enableImplicitConversion: true },
  });
  const run = (body: object) =>
    pipe.transform(body, { type: 'query', metatype: ReportQueryDto });

  it('turns strings into BsDate values', async () => {
    const dto = (await run({
      from: '2083-04-01',
      to: '31 Asar 2084',
      days: ['2083-04-01', '२०८३-०४-०२'],
    })) as ReportQueryDto;
    expect(dto.from).toBeInstanceOf(BsDate);
    expect(dto.from.toString()).toBe('2083-04-01');
    expect(dto.to?.toString()).toBe('2084-03-31');
    expect(dto.days?.map(String)).toEqual(['2083-04-01', '2083-04-02']);
  });

  it('answers 400 with the validation message', async () => {
    await expect(run({ from: '2083-04-32' })).rejects.toBeInstanceOf(
      BadRequestException,
    );
    try {
      await run({ from: 'not a date' });
    } catch (error) {
      expect((error as BadRequestException).getResponse()).toMatchObject({
        statusCode: 400,
        message: ['from must be a BS date (YYYY-MM-DD)'],
      });
    }
  });

  it('serializes BsDate back to strings', () => {
    const dto = plainToInstance(ReportQueryDto, {
      from: '2083-04-01',
      to: '1 Shrawan 2083',
      days: ['2083-04-01'],
    });
    expect(instanceToPlain(dto)).toEqual({
      from: '2083-04-01',
      to: '1 Shrawan 2083',
      days: ['2083-04-01'],
    });
    expect(JSON.parse(JSON.stringify(dto))).toEqual({
      from: '2083-04-01',
      to: '2083-04-01',
      days: ['2083-04-01'],
    });
  });
});

describe('ParseBsDatePipe', () => {
  it('parses a route or query value', () => {
    const date = new ParseBsDatePipe().transform('2083-04-01');
    expect(date).toBeInstanceOf(BsDate);
    expect(date?.toString()).toBe('2083-04-01');
    expect(
      new ParseBsDatePipe({ pattern: 'D MMMM YYYY' })
        .transform('1 Saun 2083')
        ?.toString(),
    ).toBe('2083-04-01');
  });

  it('answers 400 for anything else', () => {
    const pipe = new ParseBsDatePipe();
    for (const value of ['2083-04-32', 'yesterday', undefined, 42]) {
      expect(() => pipe.transform(value), String(value)).toThrow(
        BadRequestException,
      );
    }
    try {
      pipe.transform('2083-04-32');
    } catch (error) {
      expect((error as BadRequestException).getStatus()).toBe(400);
      expect((error as BadRequestException).message).toMatch(
        /^Validation failed \(BS date YYYY-MM-DD is expected\)/,
      );
    }
  });

  it('lets a missing value through when optional', () => {
    const pipe = new ParseBsDatePipe({ optional: true });
    expect(pipe.transform(undefined)).toBeUndefined();
    expect(pipe.transform('')).toBeUndefined();
    expect(() => pipe.transform('nope')).toThrow(BadRequestException);
  });

  it('rejects projected dates when strict', () => {
    const pipe = new ParseBsDatePipe({ strict: true });
    expect(pipe.transform('2083-04-01')?.toString()).toBe('2083-04-01');
    expect(() => pipe.transform('2090-01-01')).toThrow(BadRequestException);
  });

  it('can be created by Nest without arguments', () => {
    // Nest instantiates pipes passed as classes; @Optional() makes the
    // options parameter injectable as undefined.
    const optional = Reflect.getMetadata(
      'optional:paramtypes',
      ParseBsDatePipe,
    ) as number[] | undefined;
    expect(optional).toContain(0);
    expect(new ParseBsDatePipe().transform('2083-04-01')).toBeInstanceOf(
      BsDate,
    );
  });
});
