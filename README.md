# embroider-repro-optimize-deps — scan aborts on a bad *test* import

Minimal reproduction: **an unresolvable import in a test file silently disables
Vite dependency pre-bundling for the whole app**, causing repeated
"new dependencies optimized … reloading" cycles in dev.

## What happens

Vite's optimizer scans **both** `index.html` **and `tests/index.html`**. If any
module it reaches fails to resolve, the *entire* scan aborts:

```
(!) Failed to run dependency scan. Skipping dependency pre-bundling. Error: The following dependencies are imported but could not be resolved:
  this-package-truly-does-not-exist (imported by .../tests/unit/broken-scan-test.ts)
```

With pre-bundling skipped, **no** dependency is pre-bundled for the app. Every
dep is then discovered at runtime as routes/chunks load → re-optimize → full
page reload, repeatedly. In a large app (many code-split routes) this is a long
cascade of reloads on every cold start.

The app never imports the offending test file at runtime, so the breakage is
silent — you just see a slow, reload-y dev server.

## Reproduce

```sh
pnpm install
rm -rf node_modules/.vite          # force a cold optimize
pnpm start
```

Open `http://localhost:4200/` and click **go to /split**. Observe in the server
output:
- `Failed to run dependency scan. Skipping dependency pre-bundling`
- `marked` is **not** in `node_modules/.vite/deps/`
- navigating to `/split` → `new dependencies optimized: …marked…` → `reloading`



https://github.com/user-attachments/assets/f69b6598-4e79-488d-bf1a-7cf21af014a0

```
(!) Failed to run dependency scan. Skipping dependency pre-bundling. Error: The following dependencies are imported but could not be resolved:

  this-package-truly-does-not-exist (imported by /embroider-repro-optimize-deps/tests/unit/broken-scan-test.ts)

Are they installed?
    at file:///embroider-repro-optimize-deps/node_modules/.pnpm/vite@8.0.16_@types+node@25.9.2_jiti@2.6.1_terser@5.48.0_yaml@2.9.0/node_modules/vite/dist/node/chunks/node.js:31628:33
    at async file:///embroider-repro-optimize-deps/node_modules/.pnpm/vite@8.0.16_@types+node@25.9.2_jiti@2.6.1_terser@5.48.0_yaml@2.9.0/node_modules/vite/dist/node/chunks/node.js:23353:15
8:26:33 AM [vite] (client) [optimizer] bundling dependencies...
8:26:34 AM [vite] (client) ✨ new dependencies optimized: @embroider/config-meta-loader, @embroider/legacy-inspector-support/ember-source-4.12, @embroider/router, ember-cli-deprecation-workflow/index.js, ember-load-initializers, ember-page-title, ember-page-title/_app_/services/page-title.js, ember-resolver, ember-source/@ember/application/index.js, ember-source/@ember/component/index.js, ember-source/@ember/component/template-only.js, ember-source/@ember/debug/index.js, ember-source/@ember/routing/index.js, ember-source/@ember/template-factory/index.js
8:26:57 AM [vite] (client) ✨ new dependencies optimized: ember-source/@ember/routing/route.js, marked
8:26:57 AM [vite] (client) ✨ optimized dependencies changed. reloading
```

## Confirm it's the test import

Delete `tests/unit/broken-scan-test.ts` (or just its first `import` line), then
`rm -rf node_modules/.vite && pnpm start`. Now the scan succeeds, `marked` is
pre-bundled up front, and navigating to `/split` does **not** reload.

## Why this matters

- A broken import in a **test** file should not disable **app** dependency
  pre-bundling.
- The breakage is **concealed**: `tests/index.html` does
  `import.meta.glob("./**/*.{js,ts,gjs,gts}", { eager: true })`, which pulls
  *every* test file into the graph Vite's optimizer scans. So a bad import in
  any unrun test silently aborts the scan — developers don't expect test files
  to affect the app dev server's pre-bundling at all.
- Embroider scans `tests/index.html` and its entrypoint imports the whole app
  tree, so the blast radius of one bad import is the entire optimize step.
- Aborting the whole scan (rather than skipping the one bad entry/file) turns a
  trivial mistake — or a half-removed addon leaving dangling `_app_`/test refs —
  into a confusing dev-server reload storm.

## Workaround

Set explicit optimize entries so pre-bundling doesn't depend on the fragile
auto-scan:

```js
// vite.config.mjs
optimizeDeps: {
  entries: ['index.html', 'app/**/*.{ts,js,gts,gjs}'],
}
```
(…or just keep your test files free of unresolvable imports.)
