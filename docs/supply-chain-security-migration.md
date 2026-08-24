# Supply-chain security migration

This guide upgrades an existing compatible game to supply-chain security
contract `1.0.0`. It deliberately avoids repository-specific links so it is
safe to use from public and private games.

## 1. Import the contract as one reviewed change

Copy these files from the same immutable GDK revision:

- `config/supply-chain-security-contract.json`
- `scripts/supply-chain-security.mjs`
- `scripts/supply-chain-security.test.mjs`
- `.github/dependabot.yml`
- the source-security and CodeQL jobs from `.github/workflows/ci.yml`

Add the exact `yaml` dependency and regenerate the lockfile with the pinned
package manager. Do not copy individual detector fragments from different GDK
versions. Run `make security-check` before changing application source so the
initial findings remain reviewable.

## 2. Resolve findings without broad exclusions

- Replace tagged Actions with full commit SHAs and Docker Actions with digests.
- Reduce workflow defaults to `contents: read` or `{}` and grant write access
  only to a named job.
- Remove executable `pull_request_target` paths and secret use from PR jobs.
- Remove unexpected lifecycle scripts. If one is required, document its exact
  package path, purpose, owner, and review boundary.
- Replace suspicious Unicode with visible source text. Use an exception only
  for a verified semantic requirement and give it an expiry date.
- Update vulnerable dependencies until the moderate audit gate passes.

Generated archives are not automatically exempt. Exclude only an exact binary
path whose owning source is scanned and whose bytes are checksum-bound.

## 3. Select the runner posture

External or public pull requests use GitHub-hosted runners. A private,
trusted-author-only repository may declare an exact shared self-hosted label set
in the contract after accepting and documenting the residual risk and cleanup
controls. Never allow a partial label set, dynamic runner expression, repository
secret, SSH key, long-lived PAT, or release credential in a pull-request job.

## 4. Protect the repository

After the workflow exists on the default branch, configure the Ruleset. Requiring
a check before that check exists can make the branch unmergeable, so use this
order:

1. merge the source-security workflow through the current protected path;
2. require `source-security`, validation, CodeQL, and existing test checks;
3. require pull requests and designated review for workflow/lockfile changes;
4. prohibit force-push and branch deletion;
5. enable dependency alerts and private vulnerability reporting;
6. record a settings readback without secrets or private repository links.

## 5. Produce release evidence

Run the full gate on the exact release commit:

```bash
make setup
make security-check validate test lint build release-check
pnpm audit --audit-level moderate
```

Generate the release attestation only after the immutable OCI digest is known.
Verify that its security-contract version and SHA-256 match the checked-out GDK
contract. Record lifecycle-script exceptions, Unicode exceptions, Ruleset
readback, audit result, CodeQL result, source revision, OCI digest, SBOM, and
image vulnerability result together.

## Completion checklist

- [ ] local positive tests pass and negative fixtures fail as expected
- [ ] all external Actions and reusable workflows are immutable
- [ ] PR jobs cannot access release secrets or an unapproved runner
- [ ] dependency and static-analysis gates pass
- [ ] default-branch Ruleset readback matches the contract
- [ ] release attestation binds the exact contract, source SHA, and image digest
- [ ] every exception has a reason, owner, and expiry
