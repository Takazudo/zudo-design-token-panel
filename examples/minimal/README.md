# Minimal zdtp example

This Vite app shows the smallest framework-free setup for `@takazudo/zdtp`. Its only direct runtime dependencies are the panel and its required `preact` peer. The panel's own transitive dependencies are installed normally.

```sh
pnpm install
pnpm --filter minimal dev
```

The app runs the repository's workspace build of the panel and displays its build provenance on the page. A deploy build can be produced with:

```sh
pnpm --filter minimal build:deploy
```

The example deliberately omits `applyEndpoint` and `applyRouting`. Browser edits work and persist locally, while writing changes back to source files remains disabled. See the [apply pipeline setup](https://zudo-design-token-panel.takazudomodular.com/docs/recipes/apply-pipeline-setup/) to add that local round trip to a project.
