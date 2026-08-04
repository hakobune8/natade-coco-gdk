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
8. a contact sheet and behavior notes for visible UI changes;
9. `dist/natadecoco-release-attestation.json`, generated after the immutable
   image digest is known:

   ```bash
   make release-attestation \
     IMAGE_REPOSITORY=ghcr.io/example/example-game \
     IMAGE_DIGEST=sha256:<registry-reported-digest>
   ```

The attestation binds the game ID/version/source revision and OCI digest to the
exact GDK release and the SHA-256 of `vendor/platform-set.json`. Do not edit it
by hand. Verify a received file with
`make release-attestation-check ATTESTATION=/path/to/attestation.json`.
For a tagged release, the `Game CI` workflow can be dispatched with the
registry repository and digest; it verifies the matching `v<version>` tag and
uploads the attestation as a retained workflow artifact.

Never use `latest`, a mutable digest placeholder, or unreviewed Fleet targeting.

## Operator handoff

The operator verifies provenance and the generated compatibility attestation,
replaces the fail-closed Registry/Chart/digest placeholders, selects an approved
game profile and RuntimeClass, and performs a session-aware rollout. The game
repository does not receive cluster credentials or activate its own Fleet target.

If health or compatibility fails, the Catalog must keep the game Not Ready and
the operator restores the previous reviewed digest. See `deploy/README.md` for
the files handed to the operator and `docs/release-policy.md` for version rules.
