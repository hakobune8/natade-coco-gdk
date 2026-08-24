## Summary

Describe the developer problem and the focused change.

## Contract and compatibility impact

Describe Game Schema, Protocol, SDK, Runtime, route, offline, and deployment
effects. Write `None` where appropriate.

## Validation

- [ ] `make validate`
- [ ] `make test`
- [ ] `make lint`
- [ ] `make build`
- [ ] Container/SBOM/vulnerability checks when the image boundary changed
- [ ] Contact sheet attached when visible UI changed

## Security

- [ ] `make security-check` passes and no security exception is implicit or expired.
- [ ] No credential, token, reconnect handle, player data, private hostname, or
      IP address appears in code, logs, fixtures, screenshots, or documentation.
