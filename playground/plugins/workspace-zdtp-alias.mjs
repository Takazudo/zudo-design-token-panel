/**
 * Keep zfb's generated client-entry bundle pointed at the workspace build.
 * zfb stages client entries before bundling; an explicit alias prevents the
 * staged resolver from treating pnpm's relative workspace symlink as if it
 * were rooted in that temporary directory.
 *
 * @type {import('@takazudo/zfb/plugins').ZfbPlugin}
 */
export default {
  name: 'workspace-zdtp-alias',
  setup(ctx) {
    ctx.addAlias('@takazudo/zdtp', '../packages/zdtp/dist/index.js');
    ctx.addAlias('@takazudo/zdtp/dashboard', '../packages/zdtp/dist/dashboard/index.js');
    ctx.addAlias('@takazudo/zdtp/package.json', '../packages/zdtp/package.json');
    // Rolldown's staged workspace imports need the panel-owned Preact paths too.
    ctx.addAlias('preact', '../packages/zdtp/node_modules/preact/dist/preact.module.js');
    ctx.addAlias('preact/hooks', '../packages/zdtp/node_modules/preact/hooks/dist/hooks.module.js');
    ctx.addAlias('preact/compat', '../packages/zdtp/node_modules/preact/compat/dist/compat.module.js');
    ctx.addAlias('preact/jsx-runtime', '../packages/zdtp/node_modules/preact/jsx-runtime/dist/jsxRuntime.module.js');
  },
};
