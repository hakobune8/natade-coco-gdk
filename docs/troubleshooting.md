# Troubleshooting

## `make setup` rejects pnpm

Use pnpm 10.14.0 exactly. Corepack can activate it with
`corepack prepare pnpm@10.14.0 --activate`.

## `make init-game` says the tree is dirty

Commit or intentionally remove local changes, then run initialization from the
new Template repository. Initialization is atomic and refuses to mix with other
edits.

## `make init-game` says the repository is already initialized

This is expected after the first successful run. Change game metadata normally;
do not edit `.natadecoco-template.json` to re-enable initialization.

## Preview works but production launch does not

Preview mode bypasses no production authentication. Confirm the game ID and
routes match `game.yaml`, the Launcher started the expected session/game, and the
Controller arrived through the Join Page. Do not add URL token fallbacks.

## `make validate` reports a platform-set checksum mismatch

Do not replace one archive manually. Restore the committed `vendor/` directory
or run `make update-platform PLATFORM_SOURCE=...` from clean game and platform
checkouts, then review all four packages together.

## Container builds but cannot be deployed

The checked-in Registry, Chart repository, digest, and Fleet target are
deliberately inactive placeholders. Complete the release handoff; the platform
operator supplies approved values and deploys the immutable digest.

## Asking for help

Include the Git revision, OS, Node/pnpm/Go versions, failing command, and
sanitized output. Remove credentials, tokens, reconnect handles, player data,
private DNS names, and IP addresses before posting.
