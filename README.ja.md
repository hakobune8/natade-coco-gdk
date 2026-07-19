# natadeCOCO GDK Reference

[English README](README.md)

このリポジトリは、natadeCOCO向けマルチプレイヤーWebゲームを独立した
リポジトリで開発するための実行可能なGame Developer Kitです。Session
Manager、Realtime Gateway、Game Catalog、Launcher、k3s、TLS、Fleet基盤は
含まず、ゲーム固有コードと配布契約だけを扱います。

## Templateからゲームを作る

GitHubの **Use this template** からPublicまたはPrivateリポジトリを作成し、
clone直後のクリーンな状態で一度だけ初期化します。Forkは使用しません。

```bash
make init-game \
  GAME_ID=my-new-game \
  DISPLAY_NAME="My New Game" \
  REPOSITORY=https://github.com/example/natade-coco-game-my-new-game
```

`GAME_ID`は小文字英数字とハイフンによるDNSラベルです。初期化は
`game.yaml`、URL、コンテナ、Chart、Fleet、テスト、Go moduleを一括変更し、
成功後は再実行できません。

## 開発を始める

必要な環境はNode.js 22以上、pnpm 10.14.0、Go 1.25.12以上です。
コンテナ確認にはDockerも必要です。

```bash
make setup
make validate
make test
make lint
make build
make dev
```

開発サーバーでは次を確認できます。

- Display: `http://127.0.0.1:5176/games/gdk-reference/display?preview=display`
- Result: `http://127.0.0.1:5176/games/gdk-reference/display?preview=result`
- Controller: `http://127.0.0.1:5176/games/gdk-reference/controller?preview=controller`

編集の中心は`src/display.ts`、`src/controller.ts`、`src/styles.css`、
`game.yaml`です。認証・再接続・入力配送はSDKとプラットフォームへ任せ、
トークンをURL、ログ、localStorage、スクリーンショットへ含めないでください。

## プラットフォーム契約を更新する

ゲーム側と`natade-coco-games`側の両方をクリーンなcheckoutにして、4つの
契約パッケージを必ず一組で更新します。

```bash
make update-platform PLATFORM_SOURCE=../natade-coco-games
git diff -- vendor package.json pnpm-lock.yaml
```

一時ディレクトリでオフライン・固定lockfile検証が成功した場合だけ、Protocol、
Controller SDK、Display SDK、Game Schemaが反映されます。更新元Git SHAと各
tarballのSHA-256は`vendor/platform-set.json`へ記録されます。

## リリースと配布

```bash
make release-check
make container-build
```

ゲーム開発者はSemVer、Git SHA、OCI image digest、SBOM、脆弱性検査結果を
プラットフォーム運用者へ渡します。Fleet対象、Registry、Chart、digestの
placeholderは運用者のレビュー前に変更しないでください。詳細は
[リリース方針](docs/release-policy.md)と[デプロイ手順](deploy/README.md)を
参照してください。

不具合報告と変更提案は[CONTRIBUTING.md](CONTRIBUTING.md)、セキュリティ問題は
[SECURITY.md](SECURITY.md)、利用範囲は[SUPPORT.md](SUPPORT.md)に従ってください。
