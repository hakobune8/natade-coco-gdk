# Contributing

Thank you for improving this natadeCOCO game repository.

## Choose the right repository

- Keep this game's rules, art, balance, Display, and Controller changes here.
- Reproduce reusable starter, SDK, or schema problems against an unmodified GDK
  before reporting them to the upstream GDK repository.
- Coordinate Fleet targeting, Registry, RuntimeClass, and production rollout
  requests with the platform operator rather than adding cluster authority here.
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
