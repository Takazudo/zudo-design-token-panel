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
    ctx.addAlias('@takazudo/zdtp/package.json', '../packages/zdtp/package.json');
  },
};
