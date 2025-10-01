# busy-lang

This repository contains the Busy language project.

## Automated publishing

Merges into the `main` branch automatically trigger the **Publish busy-v2 to npm** workflow.

The workflow installs dependencies in the [`busy-v2`](./busy-v2) package directory, publishes that package to npm, and then creates a Git tag and GitHub release that match the version already recorded in `busy-v2/package.json` (tagged as `vX.Y.Z`). Make sure to update the package version before merging.

To enable publishing, add an `NPM_TOKEN` secret in the repository settings with publish access to the `busy-v2` npm package.
