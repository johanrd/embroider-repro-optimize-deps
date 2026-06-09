import { pageTitle } from 'ember-page-title';
import Counter from 'embroider-repro-optimize-deps/components/counter';

<template>
  {{pageTitle "EmbroiderReproOptimizeDeps"}}

  {{! Invoking a Glimmer component on boot makes ember-vite-hmr generate a hot
      wrapper module that imports @glimmer/reference, @glimmer/runtime and
      @ember/destroyable. Vite's dep scanner never sees those imports on the
      first pass, so they are discovered at runtime -> re-optimize + reload. }}
  <Counter @label="counter" />

  {{outlet}}
</template>
