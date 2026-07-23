# natadeCOCO GDK Reference

日本語 | [English](README.md)

大型ディスプレイで動作し、参加者のスマートフォンをブラウザコントローラとして
使うnatadeCOCO向けマルチプレイヤーWebゲームのスターターです。このリポジトリ
だけで、1つのゲームに必要なSDK接続、マニフェスト、テスト、コンテナビルド、
配布引き渡し情報を独立して管理できます。

ルーム管理、プレイヤー認証、再接続、WebSocket配送をゲームごとに実装する必要は
ありません。これらはnatadeCOCOプラットフォームとSDKが担当します。

## 自分のゲームを作る

1. GitHubの **Use this template** からPublicまたはPrivateリポジトリを作成します。
   Privateで開発する可能性がある場合はForkを使用しません。
2. 新しいリポジトリをcloneします。
3. クリーンなcheckoutでゲームの識別情報を一度だけ初期化します。

   ```bash
   make init-game \
     GAME_ID=my-new-game \
     DISPLAY_NAME="My New Game" \
     REPOSITORY=https://github.com/example/natade-coco-game-my-new-game
   ```

4. スターターを検証して開発サーバーを起動します。

   ```bash
   make setup
   make validate
   make test
   make lint
   make build
   make dev
   ```

必要な環境はNode.js 22以上、pnpm 10.14.0、Go 1.25.12以上です。Dockerは
コンテナビルド時だけ必要です。詳しい流れは
[Getting Started](docs/getting-started.md)を参照してください。

## ローカルプレビューを開く

- Display: `http://127.0.0.1:5176/games/gdk-reference/display?preview=display`
- Result: `http://127.0.0.1:5176/games/gdk-reference/display?preview=result`
- Controller: `http://127.0.0.1:5176/games/gdk-reference/controller?preview=controller`

プレビューモードはEdge Nodeなしで利用でき、開発ビルドでのみ有効です。本番では
natadeCOCO LauncherとJoin Pageから起動情報を受け取り、認証情報をURLへ含めません。

## 最初に編集する場所

| ファイル | 役割 |
| --- | --- |
| `src/display.ts` | ゲーム状態、大画面描画、スコア、結果表示 |
| `src/controller.ts` | スマートフォン操作とController Profileの表示 |
| `src/styles.css` | 大画面とスマートフォンのレスポンシブレイアウト |
| `game.yaml` | 人数、時間、ブラウザ機能、URL、互換性 |
| `src/contract.test.ts` | ゲーム固有の起動・Controller引き渡しテスト |
| `src/controller.test.ts` | Controller終了通知と共通`/control`復帰テスト |

スターターは単純なCanvas/CSS表示のため、プラットフォームコードを分解せずに
ゲーム部分を置き換えられます。SDKの考え方、マニフェスト、スマートフォン対応、
責任境界は[ゲーム開発ガイド](docs/game-development.md)を参照してください。

## 検証してリリースを引き渡す

プラットフォーム運用者へバージョンを渡す前に、次を実行します。

```bash
make setup
make validate
make test
make lint
make build
make container-build
```

SemVer、レビュー済みGit SHA、変更不能なimage digest、SBOM、脆弱性検査結果、
UI変更時のコンタクトシートを運用者へ渡します。イメージを公開しただけでは配布
されません。Fleet対象、Registry値、RuntimeClass、ロールアウト承認は運用者が
担当します。ゲーム固有ControllerはLauncherから一回限りのhandoffを受け取り、
終了時は共通の`/control`へ戻ります。詳細は[ゲーム開発ガイド](docs/game-development.md)と
[リリース引き渡し](docs/release-handoff.md)を参照してください。

## プラットフォーム契約を更新する

Protocol、Controller SDK、Display SDK、Game Schemaは必ず1組で更新します。
ゲーム側と`natade-coco-edge`側をクリーンなcheckoutにして実行します。

```bash
make update-platform PLATFORM_SOURCE=../natade-coco-edge
git diff -- vendor package.json pnpm-lock.yaml
```

一時ディレクトリでオフライン検証に成功した場合だけゲーム側を変更し、更新元の
Git SHAとtarballのSHA-256を`vendor/platform-set.json`へ記録します。4パッケージ
すべてを1つのPull Requestとしてレビューしてください。

## 対象範囲と問い合わせ

このリポジトリはk3s、Fleet、DNS、TLS、Wi-Fi、Launcher、Session Manager、
Realtime Gateway、Game Catalogを構築・運用しません。これらがなくてもゲームの
開発とプレビューは可能で、統合配布時にプラットフォーム運用者が提供します。

- セットアップ問題: [トラブルシューティング](docs/troubleshooting.md)
- 不具合・共通改善: リポジトリのIssueフォーム
- セキュリティ問題: 公開Issueではなく[SECURITY.md](SECURITY.md)の手順
- コントリビューション: [CONTRIBUTING.md](CONTRIBUTING.md)
- サポート範囲: [SUPPORT.md](SUPPORT.md)

Apache-2.0 License。OCI source label: `https://github.com/hakobune8/natade-coco-gdk`。
