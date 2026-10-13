import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'nestjs/index': 'src/nestjs/index.ts',
  },
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  target: 'node22',
  treeshake: true,
  // Both entries share one copy of the core, so a BsDate made by one is an
  // instance of the BsDate class the other exports.
  splitting: true,
});
