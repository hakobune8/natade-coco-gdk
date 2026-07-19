# Deployment handoff

This directory is deliberately inactive. Game developers publish a reviewed
SemVer image and report the registry digest. Platform operators own activation.

Before renaming `fleet.yaml.example` to `fleet.yaml`:

1. publish `natadecoco-game` chart `0.2.0` to the approved OCI chart registry;
2. replace both `.invalid` repositories;
3. replace the zero digest with the registry-reported non-zero digest;
4. set the approved `game-profile` without broadening the owning Fleet GitRepo;
5. keep `standard` for reviewed first-party games, or select an accepted
   `hardened` RuntimeClass with no fallback;
6. run platform compatibility, update-gate, health, and rollback checks.

No TLS Secret, registry credential, RuntimeClass, Ingress controller, or host
port is created by this repository.
