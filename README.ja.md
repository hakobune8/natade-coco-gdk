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

必要な環境はNode.js 22以上、pnpm 10.14.0、Go 1.26.7以上です。Dockerは
コンテナビルド時だけ必要です。詳しい流れは
[Getting Started](docs/getting-started.md)を参照してください。

## ローカルプレビューを開く

- Display: `http://127.0.0.1:5176/games/gdk-reference/display?preview=display`
- Result: `http://127.0.0.1:5176/games/gdk-reference/display?preview=result`
- Controller: `http://127.0.0.1:5176/games/gdk-reference/controller?preview=controller`

Display と Controller を同時に開くと、Controller の方向入力と ACTION が Display に反映されます。複数の Controller を開く場合は `&slot=1`〜`&slot=4` を指定してください。Vite の開発用 WebSocket が入力を中継します。
別端末から確認する場合は、信頼できるローカルネットワークで `make dev HOST=0.0.0.0` を実行し、URL の `127.0.0.1` を開発機の LAN アドレスに置き換えます。

プレビューモードはEdge Nodeなしで利用でき、開発ビルドでのみ有効です。本番では
natadeCOCO LauncherとJoin Pageから起動情報を受け取り、認証情報をURLへ含めません。

## 最初に編集する場所

| ファイル | 役割 |
| --- | --- |
| `src/display.ts` | ゲーム状態、大画面描画、スコア、結果表示 |
| `src/controller.ts` | 開発用入力プレビュー。本番の共通操作はPlatformが担当 |
| `src/styles.css` | 大画面とスマートフォンのレスポンシブレイアウト |
| `game.yaml` | 人数、時間、ブラウザ機能、URL、互換性 |
| `src/contract.test.ts` | ゲーム固有の起動・Controller引き渡しテスト |
| `src/controller.test.ts` | Platformへの遷移・認証情報の所有境界テスト |

スターターは単純なCanvas/CSS表示のため、プラットフォームコードを分解せずに
ゲーム部分を置き換えられます。SDKの考え方、マニフェスト、スマートフォン対応、
責任境界は[ゲーム開発ガイド](docs/game-development.md)を参照してください。
結果画面はゲーム側の責務です。現在の主催者だけに「もう一度遊ぶ」と
「ゲームを終了」を表示し、プラットフォームがleaseを検証して再試合用の新しい
run IDを発行します。

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
担当します。Platformの`/controller/`がsame-tabのhandoffと共通の操作・接続処理を担当し、
ゲームのController経路はそこへ転送します。詳細は[ゲーム開発ガイド](docs/game-development.md)と
[リリース引き渡し](docs/release-handoff.md)を参照してください。ソース、workflow、
依存関係、リリースの要件は
[サプライチェーン・セキュリティ契約](docs/supply-chain-security-contract.md)で定義し、
既存ゲームは[移行手順](docs/supply-chain-security-migration.md)を使用します。

## プラットフォーム契約を更新する

Protocol、Controller SDK、Display SDK、Game Schemaは必ず1組で更新します。
ゲーム側と`natade-coco-edge`側をクリーンなcheckoutにして実行します。

```bash
make update-platform PLATFORM_SOURCE=../natade-coco-edge
git diff -- vendor package.json pnpm-lock.yaml
```

一時ディレクトリでオフライン検証に成功した場合だけゲーム側を変更し、更新元の
Git SHAとtarballのSHA-256を`vendor/platform-set.json`へ記録します。リリース時には、
公開イメージのdigestをこのGDKとplatform setへ結び付ける
機械可読な証明も生成します。手順は[`docs/release-handoff.md`](docs/release-handoff.md)を参照してください。
4パッケージすべてを1つのPull Requestとしてレビューしてください。

## 依存関係を保守する

通常のminor・patch更新をnpm・Go・GitHub Actionsごとにグループ化し、majorと
セキュリティ更新は個別PRを維持します。共有SDK一式と現在のTrivy/SBOM Actionの
例外・検証方法は[Dependency maintenance](SECURITY.md#dependency-maintenance)を参照してください。

共通設定の更新元は
`natade-coco-edge/game-platform/developer-kit/template/.github/dependabot.yml`です。
この設定はEdge revision `e5124c0f0c7479978c99fbbc501871a8775bfd0a`から同期しています。
今後はEdgeの生成元でレビューした変更を、公開GDKへ別の設定PRで反映します。
同期時にはこのGDKの既存セキュリティ契約とCIを維持します。scanner・fixture・
source-security/CodeQLは生成元スターターより先に導入されており、グループ化の
反映だけで生成元の古いセキュリティ契約を同期したとは扱いません。

新しい **Use this template** リポジトリには設定が引き継がれます。既存ゲームには
後のテンプレート変更が自動反映されないため、
[移行手順](docs/supply-chain-security-migration.md#maintain-dependabot-settings)に従い、
レビュー済みの設定を個別PRで適用します。既存ゲームを再生成で上書きしません。

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

SDKの破壊的変更はゲームソースを編集してから
`node scripts/update-platform.mjs <edge-path> --with-working-tree`で更新します。
編集後のソースと4パッケージを一時候補で検証し、成功した場合だけvendorを置き換えます。
Platform側のcheckoutはクリーンな状態が必要です。
