import EmberRouter from '@embroider/router';
import config from 'embroider-repro-optimize-deps/config/environment';

export default class Router extends EmberRouter {
  location = config.locationType;
  rootURL = config.rootURL;
}

Router.map(function () {
  this.route('split');
});
