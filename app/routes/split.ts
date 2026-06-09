import Route from '@ember/routing/route';
// `marked` is a CJS dep that Vite must pre-bundle. It is imported only by this
// split (lazily-loaded) route, so it is normally found by the optimizer scan up
// front — unless the scan was aborted by a bad import elsewhere, in which case
// it's discovered here at runtime and triggers a full reload.
import { marked } from 'marked';

export default class SplitRoute extends Route {
  model() {
    return marked.parse('# hello from a split route') as string;
  }
}
