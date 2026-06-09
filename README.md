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
