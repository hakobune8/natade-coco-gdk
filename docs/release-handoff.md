# Release handoff

A game developer produces an immutable release candidate. A platform operator
reviews and deploys it. These are separate approvals.

## Developer deliverables

Provide all of the following together:

1. SemVer without a leading `v` in package and game metadata;
2. reviewed full Git SHA and a matching `v<version>` source tag;
3. OCI image reference using the SemVer tag and registry-reported digest;
4. SPDX and CycloneDX SBOMs;
5. fixed HIGH/CRITICAL vulnerability scan result;
6. `make validate test lint build release-check` result;
7. Runtime compatibility and browser/device test notes;
8. a contact sheet and behavior notes for visible UI changes.

Never use `latest`, a mutable digest placeholder, or unreviewed Fleet targeting.

## Operator handoff

The operator verifies provenance and compatibility, replaces the fail-closed
Registry/Chart/digest placeholders, selects an approved game profile and
RuntimeClass, and performs a session-aware rollout. The game repository does not
receive cluster credentials or activate its own Fleet target.

If health or compatibility fails, the Catalog must keep the game Not Ready and
the operator restores the previous reviewed digest. See `deploy/README.md` for
the files handed to the operator and `docs/release-policy.md` for version rules.
