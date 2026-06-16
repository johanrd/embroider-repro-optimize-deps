import EmberRouter from '@embroider/router';
import config from 'embroider-repro-optimize-deps/config/environment';

export default class Router extends EmberRouter {
  location = config.locationType;
  rootURL = config.rootURL;
}

Router.map(function () {
  // The child must be nested under a *split* parent. In dev, Vite strips ".map"
  // from the entrypoint id "…:route=parent.map" → "…:route=parent", which is a
  // real module with a sourcemap, so it serves that instead of the route JS.
  // Both children are identical apart from the name.
  this.route('parent', function () {
    this.route('map'); // BROKEN in dev
    this.route('bap'); // control: works
  });
});
