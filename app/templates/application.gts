import { pageTitle } from 'ember-page-title';
import { LinkTo } from '@ember/routing';

<template>
  {{pageTitle "scan-skip-repro"}}
  <nav><LinkTo @route="split" data-test-link>go to /split</LinkTo></nav>
  {{outlet}}
</template>
