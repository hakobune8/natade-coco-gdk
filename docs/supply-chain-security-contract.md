# Supply-chain security contract

Contract version: `1.0.0`

This document is normative for the GDK, newly generated games, compatible
existing games, and release handoff. `config/supply-chain-security-contract.json`
is the machine-readable declaration for this version. A game may implement an
equivalent control, but it must retain machine-verifiable evidence with the same
failure condition. Silent or permanent exceptions are not compatible.

## Required outcomes

Before build, signing, attestation, publication, or deployment, the exact source
revision must pass all of these controls:

1. Reject Unicode variation selectors, zero-width characters, and bidirectional
   controls that can make reviewed text differ from executed text. Findings
   identify the file, line, column, and code point.
2. Pin every external GitHub Action and reusable workflow to a full 40-character
   commit SHA. Pin `docker://` Actions to a SHA-256 digest.
3. Default workflow permissions to `contents: read` or `{}` and allow write
   scopes only for a named job and purpose.
4. Reject executable `pull_request_target` workflows. Pull-request jobs must use
   a literal reviewed runner and must not inherit or reference repository secrets.
5. Reject undeclared package lifecycle scripts, lockfile deletion, and lockfile
   changes too large for the configured review boundary.
6. Fail on moderate or higher known dependency vulnerabilities using Dependency
   Review or an equivalent lockfile-aware audit.
7. Run CodeQL for supported languages, or document an equivalent static-analysis
   gate and retain its result.
8. Protect the default branch with pull requests, required security checks,
   force-push prohibition, and branch-deletion prohibition.

The source-security check must complete before ordinary validation, image build,
SBOM generation, vulnerability scanning, release attestation, and publication.
An artifact from a revision that did not pass the gates is not a GDK-compatible
release even if its image was later signed.

## Runner trust boundary

Public repositories or repositories accepting untrusted pull requests use a
GitHub-hosted runner for pull-request code. A private repository that accepts
pull requests only from trusted members and Dependabot may explicitly allow a
shared self-hosted pool after documenting the residual risk. Such a pool must be
restricted to the required private repositories, carry no SSH key or long-lived
PAT, obtain release authority only inside an approved release job, and clean the
workspace, processes, and containers after every job. CI-only network isolation
or ephemeral runners remain preferred. Release/publish jobs require an approved
Environment and must not share credentials with pull-request jobs.

## Exceptions

An exception records the exact path/control, reason, accountable owner, and an
expiry date. It must be reviewed like source code and must not grant a broader
path or permission than necessary. Generated or binary material may be excluded
from text scanning only when its owning source is scanned and its packaged bytes
are checksum-bound. Expired, malformed, or implicit exceptions fail closed.

## Local and CI verification

Run the same contract locally and in CI:

```bash
make setup
make security-check
make validate test release-check
```

`make release-check` binds the release metadata to this contract version.
Release handoff additionally carries the contract version and contract file
SHA-256 in its generated attestation.

## Versioning and migration

- Patch: clarification or stricter detection that does not change the required
  outcome.
- Minor: additive control or new evidence field with a documented migration
  window.
- Major: incompatible failure condition, evidence schema, or trust-boundary
  change.

Existing games declare the exact contract version they satisfy. A minor contract
release has a 30-day migration window unless an actively exploited condition
requires an immediate gate. A major version requires coordinated GDK and Edge
acceptance. The platform release handoff rejects missing, unknown, expired, or
weaker contract declarations.

## Repository settings checklist

The source tree cannot enforce hosting settings by itself. Before declaring a
repository compatible, record a settings readback showing:

- pull requests and required checks are enforced on the default branch;
- force-push and branch deletion are disabled;
- workflow SHA pinning is enabled when the hosting platform supports it;
- workflow, lockfile, security policy, and release configuration changes require
  designated maintainer review;
- private vulnerability reporting and dependency alerts are enabled;
- bypass use is limited and auditable.
