# Changelog

## Unreleased

- Add framework-agnostic `setLifecycleAdapter` API for non-Astro hosts (#50). The astro `astro:before-swap` / `astro:page-load` fallback is preserved when no adapter is registered, and is actively unbound when a host installs an adapter so the internal handlers do not double-fire.
