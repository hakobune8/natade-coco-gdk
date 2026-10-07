# Security Policy

## Supported versions

After the first tag, the latest tagged minor release is supported. Until then,
only the current `main` revision is supported. Before the first stable release,
security fixes may require an upgrade to the newest `0.x` release. Template
descendants own the support policy for their game code and container image.

## Report a vulnerability

Do not open a public issue. Use **Report a vulnerability** on the repository's
Security tab. If that option is unavailable in a game repository created from
this template, contact its maintainers through a private channel before sharing
details.

Include the affected revision or tag, impact, reproduction conditions, and a
minimal proof of concept without real tokens or player data. Maintainers aim to
acknowledge a report within seven calendar days and coordinate disclosure after
a fix is available. Do not include secrets in screenshots or attachments.

Game content bugs, availability questions without a security boundary impact,
and third-party service incidents belong in the normal issue tracker or the
responsible provider's channel.

## Dependency maintenance

Dependabot checks npm, `/server` Go, and GitHub Actions weekly. Standard
`groups` combine normal minor and patch updates within each ecosystem using
`patterns: ["*"]`, `applies-to: version-updates`, and
`update-types: [minor, patch]`. Normal major updates and security updates retain
individual automatic PRs; urgent security fixes do not wait for a weekly group.

The four `@natadecoco/*` packages are excluded from the npm group. Update them
as one checksummed compatible set with `make update-platform` and
`vendor/platform-set.json`; never replace individual archives or use public npm
packages instead. Trivy and SBOM Actions are excluded because their current
`0.x` releases require individual review of scanner behavior, vulnerability
gates, and SPDX/CycloneDX output. These exclusions also keep patch updates
individual and do not suppress their automatic PRs.

The starter's external npm dependencies currently have stable majors and its Go
server uses only the standard library. Review compatibility when adding a
`0.x` dependency; if it needs separate validation, record its exact exclusion,
reason, and checks in this policy. A minor or patch label does not establish
compatibility. If a group fails or exceeds the configured lockfile review
boundary, separate the failing updates instead of weakening the checks.

Retain Action SHA/digest pins, overrides, schedules and PR limits, the
source-security/audit/CodeQL gates, and release approval. Run
`make setup security-check validate test lint build release-check` and
`pnpm audit --audit-level moderate` for updates; verify scanner/SBOM behavior for
the excluded Actions. This policy introduces neither automatic merging nor
changes to personal notification settings.
