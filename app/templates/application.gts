import { pageTitle } from 'ember-page-title';
import { LinkTo } from '@ember/routing';

<template>
  {{pageTitle "map-route-name-repro"}}
  <nav>
    <LinkTo @route="parent.map" data-test-link-map>go to /parent/map (broken)</LinkTo>
    |
    <LinkTo @route="parent.bap" data-test-link-bap>go to /parent/bap (works)</LinkTo>
  </nav>
  {{outlet}}
</template>
