// THE TRIGGER: a single unresolvable import in a *test* file.
//
// Vite's dependency optimizer scans BOTH index.html and tests/index.html. When
// it reaches this unresolvable import the ENTIRE scan aborts, and Vite prints:
//
//   (!) Failed to run dependency scan. Skipping dependency pre-bundling.
//
// From then on NO dependency is pre-bundled for the app either — every dep is
// discovered at runtime as modules/routes load, causing repeated
// "new dependencies optimized ... reloading" cycles. The app itself never even
// imports this file at runtime, so the breakage is silent and easy to miss.
//
// Delete this import (or this file) and pre-bundling works normally.
import 'this-package-truly-does-not-exist';

import { module, test } from 'qunit';

module('Unit | broken scan', function () {
  test('it does not even need to run', function (assert) {
    assert.ok(true);
  });
});
