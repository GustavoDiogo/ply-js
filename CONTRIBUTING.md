
# Contributing to ply-js

Thank you for contributing! This short guide explains how to report issues and submit pull requests.

1. Report issues

1. Search existing issues to avoid duplicates.
1. When opening a new issue, include a short title, a clear description, reproduction steps or minimal files, and the Node/OS environment if relevant.

1. Pull requests

1. Fork the repository and open a branch with a descriptive name (for example `fix/parse-ascii` or `feat/estimate-mass-bmi`).
1. Keep PRs small and focused. Add tests for new behavior or bug fixes.
1. Follow the code style used in the repository. Keep changes localized and document design decisions in the PR description.

1. Running tests locally

1. The project uses Node.js, TypeScript and Jest. From the project root:

```bash
pnpm install
pnpm build
pnpm test
```

If you don't use `pnpm`, `npm` or `yarn` are fine, but the commands above reference `pnpm` scripts.

1. Examples and documentation

1. Update `README.md` and any relevant examples when you add or change features. Small runnable examples are preferred.

1. License and attribution

1. This repository is licensed under the GNU General Public License v3 (GPL-3.0-or-later). By contributing you agree that your contribution will be licensed under the same terms.

1. Security

1. If you discover a security issue, please open a private issue and mark it as sensitive so maintainers can respond appropriately.

1. Code of conduct

1. We expect respectful, constructive interactions. If you need a code of conduct added, open an issue and we’ll add one.

Thanks again — clear tests and small PRs make reviews fast and help your change land sooner.
