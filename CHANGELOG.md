# Changelog

All notable changes to `zudo-design-token-panel` are recorded in this file.
The format loosely follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Dates and versions may be absent for unreleased entries.

## [Unreleased]

### Added

- **Initial bootstrap** — pnpm workspace skeleton (root `package.json`,
  `pnpm-workspace.yaml`, `.gitignore`, MIT `LICENSE`).
- **Doc site scaffold** — `doc/` site generated via `create-zudo-doc` with
  the project preset (`zudo-token-panel`, light/dark color schemes, default
  feature set).
- **Repo configuration** — top-level `README.md`, this `CHANGELOG.md`,
  `.editorconfig`, `.prettierrc`, and `.npmrc` aligned with myoss conventions.

### Notes

- This is an in-progress port of the design-token panel + bin server from
  `zmodular` to a standalone OSS monorepo. Epic 1 (bootstrap) is landing
  first; the panel package, the bin server, and the example apps follow in
  Epics 2 through 7. Track progress on
  [super-epic issue #2](https://github.com/Takazudo/zudo-design-token-panel/issues/2).
