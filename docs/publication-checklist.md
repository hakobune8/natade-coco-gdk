# Upstream reference publication checklist

This checklist is for maintainers publishing the upstream GDK reference.
Template descendants do not repeat the repository-publication steps.

## Before changing visibility

- [ ] `make setup validate test lint build release-check` succeeds from a clean checkout.
- [ ] Container build, SPDX/CycloneDX SBOM, and fixed HIGH/CRITICAL scan succeed.
- [ ] README quick starts work in English and Japanese.
- [ ] License, contribution, support, security, release, and changelog documents are current.
- [ ] Repository description and topics identify natadeCOCO, multiplayer, WebSocket, and game development.
- [ ] Git history and tracked files contain no credentials, private hostnames, or personal data.
- [ ] GitHub private vulnerability reporting is enabled.
- [ ] Branch protection requires the validation and supply-chain checks.

## Publish and prove the Template path

1. Change visibility to Public and enable **Template repository**.
2. Use **Use this template** to create a temporary Private repository with
   independent history; do not use Fork.
3. Clone it and run the documented `make init-game` command with a new identity.
4. Run `make setup validate test lint build container-build`.
5. Push and confirm the descendant CI succeeds.
6. Confirm the repository remains Private, old reference identity is absent,
   initialization cannot run twice, and no credential appears in URLs or logs.
7. Delete the temporary repository after recording sanitized evidence.
8. Tag `v0.1.0` only after this exercise succeeds, then publish release notes
   from `CHANGELOG.md`.

Visibility, Template status, branch protection, vulnerability reporting,
temporary repository creation/deletion, and tag publication are explicit
maintainer actions and are not performed by `make release-check`.
