# Contributing

Thank you for improving the natadeCOCO Game Developer Kit.

## Choose the right repository

- Report starter, SDK integration, schema, CI, or documentation problems to
  this repository.
- Keep game-specific rules, art, balance, and deployment requests in the game
  repository created from this template.
- Report vulnerabilities privately as described in [SECURITY.md](SECURITY.md).

## Development workflow

1. Create a focused branch from `main`.
2. Keep platform services and game-specific logic outside the same change.
3. Run:

   ```bash
   make setup
   make validate
   make test
   make lint
   make build
   ```

4. Add or update tests for contract changes.
5. Include a contact sheet when Display, Controller, or other visible UI changes.
6. Open a pull request using the repository template.

Do not commit credentials, player tokens, reconnect handles, private hostnames,
personal data, generated `dist/`, or deployment approval values. All dependency
and GitHub Action versions must remain exact; OCI releases must never use
`latest`.

By contributing, you agree that your contribution is licensed under the
Apache License 2.0 used by this repository.
