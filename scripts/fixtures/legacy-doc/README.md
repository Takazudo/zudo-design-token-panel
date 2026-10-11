# Legacy packed-panel consumer

This deliberately frozen fixture preserves the ZFB 2.20.3 / zudo-doc 5.27.0
host from `7164bed2bd3d36d81e512d96ebd0c50fb23313d8` before the v6 migration
(issue #1033). Its EN/JA route stubs retain DocHistory bindings, locale history
content directories and untranslated-page fallback. Its CSS retains the old
Preact/Tailwind host contract. Do not migrate these files with the active docs.

The representative getting-started pages, root route and assets support the
existing click-driven packed-panel remount probe. Config customizations match
the original host except that changelog output and unused Claude-resource
export generation are omitted; fixture builds must not write outside their
scratch directory. Setup-skill scripts are also omitted from the manifest.

`package.json.template` is intentionally not a real package manifest: the
registry dependency resolver scans every `package.json` below the checkout.
`scripts/verify-packed-remount-consumer.sh --host legacy` materializes it only
in a disposable directory outside the repository. All four ZFB packages and
both doc packages are asserted at runtime; only this legacy host requires a
shared Preact installation. `--host current` copies the active `doc/` host and
checks its current dependency family independently. CI runs both using the same
packed local panel and browser lifecycle probe.
