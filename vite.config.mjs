import { defineConfig } from 'vite';
import { extensions, classicEmberSupport, ember } from '@embroider/vite';
import { babel } from '@rollup/plugin-babel';
import { hmr } from 'ember-vite-hmr';

export default defineConfig({
  plugins: [
    classicEmberSupport(),
    ember(),
    hmr(),
    // extra plugins here
    babel({
      babelHelpers: 'runtime',
      extensions,
    }),
  ],
  // WORKAROUND (commented out so this repo reproduces by default):
  // pre-declaring the deps that ember-vite-hmr's hot-component wrapper imports
  // — but that Vite's scanner can't see on the first pass — stops the
  // "new dependencies optimized ... reloading" cycle on boot.
  //
  // NB: the bare specifiers the wrapper writes (`@glimmer/reference` etc.) do
  // NOT work here — optimizeDeps.include can't resolve them. You must use the
  // Embroider-rewritten ember-source subpaths, exactly as Vite reports them.
  //
  // optimizeDeps: {
  //   include: [
  //     'ember-source/@glimmer/reference/index.js',
  //     'ember-source/@glimmer/runtime/index.js',
  //     'ember-source/@ember/destroyable/index.js',
  //   ],
  // },
});
