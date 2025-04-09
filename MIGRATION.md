# honkit から docsify への移行ガイド

このドキュメントでは、「F# for Fun and Profit 日本語訳」プロジェクトを honkit から docsify に移行した手順と変更点について説明します。

## 移行の概要

honkit と docsify はどちらも Markdown ファイルを使用して静的ウェブサイトを生成するツールですが、アプローチが異なります：

- **honkit**：ビルド時に静的 HTML ファイルを生成します
- **docsify**：実行時に Markdown ファイルを動的に解析して表示します

## 主な変更点

1. **設定ファイル**：
   - honkit の `book.json` から docsify の `index.html` に設定を移行
   - docsify では設定が JavaScript オブジェクトとして `window.$docsify` に定義されます

2. **ナビゲーション**：
   - honkit の `SUMMARY.md` から docsify の `_sidebar.md` に目次を移行
   - docsify ではサイドバーの構造がより柔軟になっています

3. **フロントマター**：
   - Markdown ファイルの YAML フロントマターを処理するためのカスタムプラグインを追加
   - フロントマターは表示前に削除されます

4. **追加機能**：
   - カバーページ（`_coverpage.md`）を追加
   - 404 ページ（`_404.md`）を追加
   - 検索機能を追加
   - ページネーション機能を追加

5. **スタイル**：
   - カスタム CSS ファイル（`styles/docsify.css`）を追加

6. **削除したファイル**：
   - `book.json` - honkit の設定ファイル
   - `SUMMARY.md` - honkit の目次ファイル（内容は `_sidebar.md` に移行）
   - `_tools/` - honkit 用のファイル修正スクリプトを含むディレクトリ
   - honkit 関連のパッケージ依存関係

## ファイル構造

```
.
├── index.html           # docsify の設定ファイル
├── _sidebar.md          # サイドバーナビゲーション
├── _coverpage.md        # カバーページ
├── _404.md              # 404 ページ
├── README.md            # メインページ
├── styles/
│   └── docsify.css      # カスタムスタイル
├── assets/              # 画像などの静的ファイル
├── posts/               # 記事ファイル
├── series/              # シリーズファイル
└── ...                  # その他のコンテンツディレクトリ
```

## 使用方法

### ローカルでの実行

```bash
# 依存関係のインストール
npm install

# ローカルサーバーの起動
npm start
```

ブラウザで http://localhost:3000 を開いてサイトを表示します。

### コンテンツの編集

1. Markdown ファイルを編集します
2. 変更はリアルタイムで反映されます（ページの再読み込みが必要な場合があります）

### サイドバーの編集

`_sidebar.md` ファイルを編集してナビゲーションを変更します。

### 設定の変更

`index.html` ファイル内の `window.$docsify` オブジェクトを編集して設定を変更します。

## 利点

1. **シンプルさ**：ビルドプロセスが不要で、Markdown ファイルを直接表示します
2. **高速**：必要なページだけを動的に読み込みます
3. **柔軟性**：プラグインシステムで機能を拡張できます
4. **モバイルフレンドリー**：レスポンシブデザインが組み込まれています
5. **検索機能**：全文検索が組み込まれています

## 注意点

1. **SEO**：docsify は SPA（シングルページアプリケーション）なので、SEO 対策が必要な場合は追加の設定が必要です
2. **プリレンダリング**：必要に応じて docsify-cli の generate コマンドを使用して静的 HTML を生成できます

## GitHub Actions によるデプロイ

このプロジェクトでは、GitHub Actions を使用して docsify サイトを GitHub Pages に自動的にデプロイします。

### ワークフローの概要

`.github/workflows/master.yml` ファイルには、以下の処理を行うワークフローが定義されています：

1. リポジトリのチェックアウト
2. Node.js のセットアップ
3. 依存関係のインストール
4. docsify-cli のインストール
5. 静的ファイルの準備（.nojekyll ファイルの作成など）
6. docsify を使用して静的 HTML ファイルを生成
7. 生成された静的ファイルを GitHub Pages にデプロイ

### デプロイプロセス

honkit と docsify のデプロイプロセスの主な違い：

- **honkit**: ビルドステップでは `npx honkit build` を実行して静的 HTML ファイルを生成し、生成された `_book` ディレクトリをデプロイします。
- **docsify**: 2つのアプローチが可能です：
  1. **動的アプローチ**: ビルドステップなしで、リポジトリ全体（Markdown ファイルを含む）をそのままデプロイします。docsify はブラウザ側で Markdown ファイルを解析して表示します。
  2. **静的アプローチ**: `npx docsify generate .` を実行して静的 HTML ファイルを生成し、生成されたファイルのみをデプロイします。

### SEO 対策

このプロジェクトでは、SEO 対策のために静的アプローチを採用しています。GitHub Actions ワークフローでは、以下の手順を実行します：

1. `npx docsify generate . -o dist` を実行して静的 HTML ファイルを生成
2. 生成された `dist` ディレクトリのみを GitHub Pages にデプロイ

これにより、検索エンジンがコンテンツをより効果的にインデックス化できるようになります。

## 参考リンク

- [docsify 公式ドキュメント](https://docsify.js.org/)
- [docsify GitHub リポジトリ](https://github.com/docsifyjs/docsify/)
- [GitHub Pages ドキュメント](https://docs.github.com/ja/pages)
- [GitHub Actions ドキュメント](https://docs.github.com/ja/actions)
