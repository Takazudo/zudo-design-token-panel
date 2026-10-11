# PR preview opt-out

Docs, minimal and playground PR previews run by default on their existing target branches. Apply the `no-preview` label to skip preview uploads and successful-preview comments while keeping validation, builds and dry-runs on normal PR events. Removing the label restores uploads under each workflow's existing Cloudflare and trust gates.

Adding or removing `no-preview` starts a relevant run and supersedes earlier runs for that PR. Other label changes do not start build work or cancel an ordinary run. An opt-out does not delete a preview or comment published before the label was added.
