import { defineConfig } from 'tsdown';

export default defineConfig({
  // These mirror the root tsdown.config.ts shared defaults so that
  // `tsdown -c tsdown.config.ts` (used by pretest) can build egg-bin
  // standalone without walking up to the root workspace config.
  entry: 'src/**/*.ts',
  unbundle: true,
  fixedExtension: false,
  external: [/^@eggjs\//, 'egg'],
  exports: {
    devExports: true,
  },
  // MEMO: @oclif/core only works in unbundle mode (already default)
  unused: {
    level: 'error',
    // @vitest/coverage-v8 is loaded by vitest at runtime as a coverage provider, not directly imported
    ignore: ['utility', '@vitest/coverage-v8'],
  },
  copy: [
    {
      from: 'scripts',
      to: 'dist',
    },
  ],
});
