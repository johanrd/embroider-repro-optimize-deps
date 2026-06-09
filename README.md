# embroider-repro-optimize-deps

Minimal reproduction of Vite re-optimizing dependencies (and full-page
reloading) right after boot in an Embroider + Vite Ember app:

```
✨ new dependencies optimized: ember-source/@ember/destroyable/index.js, ember-source/@glimmer/reference/index.js, ember-source/@glimmer/runtime/index.js
✨ optimized dependencies changed. reloading
```

## Reproduce

```sh
pnpm install
rm -rf node_modules/.vite   # force a cold optimizer pass
pnpm start
```

Then open `http://localhost:4200/`. On boot the optimizer bundles once, then
discovers `ember-source/@glimmer/reference/index.js`,
`ember-source/@glimmer/runtime/index.js` and
`ember-source/@ember/destroyable/index.js` as *new* dependencies and triggers a
full reload.

## Root cause

This is **not** Embroider and **not** route splitting (`splitAtRoutes`). It is
[`ember-vite-hmr`](https://github.com/lifeart/ember-vite-hmr).

For every app Glimmer component invoked in a template, `ember-vite-hmr`'s babel
plugin emits `__hmr_import_metadata__`, and at runtime the Vite plugin generates
a virtual "hot wrapper" module (`/ember-vite-hmr/virtual/component:...`) for it.
That wrapper module (`ember-vite-hmr/dist/lib/hmr.js`) imports:

```js
import { createComputeRef } from '@glimmer/reference';   // -> ember-source/@glimmer/reference/index.js
import { curry } from '@glimmer/runtime';                // -> ember-source/@glimmer/runtime/index.js
// ...and registerDestructor from '@ember/destroyable'   // -> ember-source/@ember/destroyable/index.js
```

These wrappers are generated/served at request time, so they are **not part of
the static module graph Vite's dependency scanner crawls on the first pass**.
The browser requests them on boot, Vite sees bare deps it never pre-bundled, and
re-optimizes + reloads.

### Ingredients required to reproduce (all present here)

1. `ember-vite-hmr` installed, `hmr()` added in `vite.config.mjs`, and its babel
   plugin wired up in `babel.config.mjs` (the plugin itself **and**
   `hotAstProcessor.transform` in the template-compilation transforms).
2. An app Glimmer component (`app/components/counter.gts`) imported and rendered
   on boot (in `app/templates/application.gts`).

Removing `hmr()` from `vite.config.mjs` makes the re-optimization disappear
entirely.

## Workaround

Pre-declare the deps the scanner can't see (note the exact `/index.js`
subpaths — the bare `ember-source/@glimmer/reference` form does **not** match).
See the commented `optimizeDeps.include` block in `vite.config.mjs`:

```js
optimizeDeps: {
  include: [
    'ember-source/@glimmer/reference/index.js',
    'ember-source/@glimmer/runtime/index.js',
    'ember-source/@ember/destroyable/index.js',
  ],
},
```

With that uncommented, boot does a single optimize pass and no reload.
