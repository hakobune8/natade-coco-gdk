# Release and compatibility policy

## Versioning

The reference kit and every generated game use SemVer without a leading `v` in
package and game metadata. Git tags add the conventional `v` prefix. Never
publish `latest` or a mutable deployment reference.

- Patch: compatible fixes and documentation.
- Minor: backward-compatible features or additive contract support.
- Major: Game Schema, Protocol, SDK, route, or deployment changes requiring
  coordinated game or Runtime migration.

During `0.x`, a minor release may contain a breaking change, which must be
called out in the changelog and migration notes.

## Compatible platform set

Protocol, Controller SDK, Display SDK, and Game Schema are reviewed and updated
as one set. `vendor/platform-set.json` records their versions, archive names,
SHA-256 checksums, source repository, and full source Git SHA. Partial archive
updates are invalid.

## Release candidate gate

Before tagging a game release:

1. update `package.json`, `game.yaml`, Chart metadata, image tag, and changelog;
2. run `make setup validate test lint build release-check`;
3. run `make container-build` and retain SBOM and vulnerability results;
4. confirm UI changes have an reviewed contact sheet;
5. hand the exact Git SHA, SemVer, image digest, and evidence to the operator.

The platform operator, not the game repository, approves Fleet targeting and
rollout. Rollback selects a previously reviewed immutable digest.
