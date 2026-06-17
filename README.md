# embroider-repro-map-route — a split child route named `map` won't load in dev

Minimal reproduction: **a code-split route named `map`, nested under another
split route, cannot be loaded in the Vite dev server.** Navigating to it leaves
a blank page; the route's JS chunk is never served. An identical sibling named
`control` works. Production builds are unaffected.

Verified with `@embroider/core` 4.6.1, `@embroider/vite` 1.x, `ember-source`
7.0.0, `vite` 8.0.16 (see `package.json`).

## Root cause (an Embroider × Vite interaction)

1. **Embroider** mints the route's virtual entrypoint id by concatenating the
   raw route name (`packages/core/src/module-resolver.ts`):
   ```js
   `-embroider-route-entrypoint.js:route=${routeName}`
   ```
   For the route `parent.map` that id ends in `.map`:
   `…-embroider-route-entrypoint.js:route=parent.map`.

2. **Vite's dev sourcemap middleware** treats *any* request whose cleaned URL
   ends in `.map` as a sourcemap request, and looks up the module you get by
   stripping `.map` (`vite/dist/node/chunks/node.js`):
   ```js
   const withoutQuery = cleanUrl(url);                  // drops "?import"
   if (withoutQuery.endsWith(".map")) {
     const originalUrl = url.replace(/\.map($|\?)/, "$1");   // "…:route=parent"
     const map = (await environment.moduleGraph.getModuleByUrl(originalUrl))?.transformResult?.map;
     if (map) return send(/* that module's sourcemap */);
     else return next();
   }
   ```

**The nesting is the essential ingredient.** Stripping `.map` from
`…:route=parent.map` yields `…:route=parent` — and because `parent` is *also* a
split route, that **is a real, transformed module with a sourcemap**. So the
middleware intercepts the request and never serves the `parent.map` route as its
own JavaScript. The browser's dynamic `import()` of the route therefore fails.

A *top-level* route named `map` does **not** reproduce this: stripping `.map`
from `…:route=map` yields `…:route=` (no such module), the middleware calls
`next()`, and the chunk is served normally. The bug needs a `.map`-suffixed id
whose stripped form is another existing route module — i.e. a `map` route nested
under a split parent. (This is exactly the real-world shape: `organization.map`.)

`control` is safe in every case — its id ends in `.control`, which the middleware never
touches.

Production is unaffected: route chunks ship as hashed static files
(`assets/…-<hash>.js`); there is no live `…:route=parent.map` URL.

## Reproduce

```sh
pnpm install
pnpm start              # dev server (port may vary if 4200 is taken)
```

Open the app and use the two links:

- **go to /parent/control** → renders `parent control route loaded`.
- **go to /parent/map** → blank page; the route never renders. In the network
  tab the `…:route=parent.map?import` request comes back as a sourcemap / the
  SPA `index.html` instead of JavaScript.

`app/templates/parent/map.gts` and `app/templates/parent/control.gts` are identical
apart from the name; both (and `parent`) are in `splitAtRoutes`
(`ember-cli-build.mjs`). The route name is the only variable.

## Notes

- A plain `curl`/`fetch` of the entrypoint URL can return `200 text/html` (Vite's
  SPA fallback) — that is **not** the JS module. Check the rendered route /
  `content-type`, not just the status code.
- App-side workaround: rename the route but keep the path —
  `this.route('map-view', { path: '/map' })`.
- Possible upstream fixes: Embroider could encode the route name (or carry it in
  a query param) so the virtual id never ends in a meaningful extension; and/or
  Vite's sourcemap middleware could skip requests carrying `?import`.
