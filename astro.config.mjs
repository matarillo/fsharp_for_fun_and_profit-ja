// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

// https://astro.build/config
export default defineConfig({
  base: '/fsharp_for_fun_and_profit-ja/',
  integrations: [
    starlight({
      title: 'F# for fun and profit 日本語訳',
      social: [
        { icon: 'github', label: 'GitHub', href: 'https://github.com/matarillo/fsharp_for_fun_and_profit-ja' },
      ],
      head: [
        {
          tag: 'meta',
          attrs: { property: 'og:image', content: 'https://matarillo.github.io/fsharp_for_fun_and_profit-ja/fsharpforfunandprofit.png' },
        },
        {
          tag: 'meta',
          attrs: { property: 'twitter:image', content: 'https://matarillo.github.io/fsharp_for_fun_and_profit-ja/fsharpforfunandprofit.png' },
        },
      ],
      sidebar: [
        {
          label: 'スタートガイド',
          items: [
            { label: 'はじめに', link: '/readme/', },
            { label: 'サイトの内容', link: '/site-contents/', },
            { label: '「F# を使う理由」を1ページで解説', link: '/why-use-fsharp/' },
            { label: 'F# のインストールと使い方', link: '/installing-and-using/' },
            { label: '60 秒でわかる F# シンタックス', link: '/posts/fsharp-in-60-seconds/' },
            { label: 'F# を学ぶ', link: '/learning-fsharp/' },
            { label: 'F# のトラブルシューティング', link: '/troubleshooting-fsharp/' },
            {
              label: '仕事で F# を使う低リスクな方法',
              items: [
                { label: 'シリーズ目次', link: '/series/low-risk-ways-to-use-fsharp-at-work/' },
                { label: 'F#を使って対話的に探索し開発する', link: '/posts/low-risk-ways-to-use-fsharp-at-work/' },
                { label: '開発と Devops スクリプトに F# を使う', link: '/posts/low-risk-ways-to-use-fsharp-at-work-2/' },
                { label: 'テストに F# を使う', link: '/posts/low-risk-ways-to-use-fsharp-at-work-3/' },
                { label: 'データベース関連タスクに F# を使う', link: '/posts/low-risk-ways-to-use-fsharp-at-work-4/' },
                { label: '仕事で F# を使うその他の興味深い方法', link: '/posts/low-risk-ways-to-use-fsharp-at-work-5/' },
              ],
            },
          ],
        },
        {
          label: 'F# を使う理由',
          items: [
            { label: 'シリーズ目次', link: '/series/why-use-fsharp/' },
            { label: 'F# を使う理由シリーズの紹介', link: '/posts/why-use-fsharp-intro/' },
            { label: '60 秒でわかる F# シンタックス', link: '/posts/fsharp-in-60-seconds/' },
            { label: 'C# と F# の比較: 簡単な合計', link: '/posts/fvsc-sum-of-squares/' },
            { label: 'C# と F# の比較: ソート', link: '/posts/fvsc-quicksort/' },
            { label: 'C# と F# の比較: Webページのダウンロード', link: '/posts/fvsc-download/' },
            { label: 'F# の 4 つの重要概念', link: '/posts/key-concepts/' },
            {
              label: '簡潔性',
              items: [
                { label: '簡潔性: はじめに', link: '/posts/conciseness-intro/' },
                { label: '型推論', link: '/posts/conciseness-type-inference/' },
                { label: '低オーバーヘッドの型定義', link: '/posts/conciseness-type-definitions/' },
                {
                  label: 'ボイラープレートコードを抽出するための関数を使う',
                  link: '/posts/conciseness-extracting-boilerplate/'
                },
                {
                  label: 'ビルディングブロックとしての関数を使う',
                  link: '/posts/conciseness-functions-as-building-blocks/'
                },
                { label: '簡潔性のためのパターンマッチング', link: '/posts/conciseness-pattern-matching/' },
              ],
            },
            {
              label: '利便性',
              items: [
                { label: '利便性: はじめに', link: '/posts/convenience-intro/' },
                { label: '型に関する既定のふるまい', link: '/posts/convenience-types/' },
                { label: 'インターフェースとしての関数', link: '/posts/convenience-functions-as-interfaces/' },
                { label: '部分適用', link: '/posts/convenience-partial-application/' },
                { label: 'アクティブパターン', link: '/posts/convenience-active-patterns/' },
              ],
            },
            {
              label: '正確性',
              items: [
                { label: '正確性: はじめに', link: '/posts/correctness-intro/' },
                { label: '不変性', link: '/posts/correctness-immutability/' },
                { label: '網羅的なパターンマッチング', link: '/posts/correctness-exhaustive-pattern-matching/' },
                { label: '型システムを使用した正しいコードの確保', link: '/posts/correctness-type-checking/' },
                { label: '実践例: 正確性のための設計', link: '/posts/designing-for-correctness/' },
              ],
            },
            {
              label: '並行性',
              items: [
                { label: '並行性: はじめに', link: '/posts/concurrency-intro/' },
                { label: '非同期プログラミング', link: '/posts/concurrency-async-and-parallel/' },
                { label: 'メッセージとエージェント', link: '/posts/concurrency-actor-model/' },
                { label: '関数型リアクティブプログラミング', link: '/posts/concurrency-reactive/' },
              ],
            },
            {
              label: '完全性',
              items: [
                { label: '完全性: はじめに', link: '/posts/completeness-intro/' },
                {
                  label: 'シームレスな .NET ライブラリとの相互運用',
                  link: '/posts/completeness-seamless-dotnet-interop/'
                },
                { label: 'C# でできることは何でも...', link: '/posts/completeness-anything-csharp-can-do/' },
              ],
            },
            { label: 'F# を使う理由: 結論', link: '/posts/why-use-fsharp-conclusion/' },
          ],
        },
        {
          label: '関数型思考',
          items: [
            { label: 'シリーズ目次', link: '/series/thinking-functionally/' },
            { label: '関数型思考: はじめに', link: '/posts/thinking-functionally-intro/' },
            { label: '数学関数', link: '/posts/mathematical-functions/' },
            { label: '関数値と単純値', link: '/posts/function-values-and-simple-values/' },
            { label: '型と関数のしくみ', link: '/posts/how-types-work-with-functions/' },
            { label: 'カリー化', link: '/posts/currying/' },
            { label: '部分適用', link: '/posts/partial-application/' },
            { label: '関数の結合性と合成', link: '/posts/function-composition/' },
            { label: '関数の定義', link: '/posts/defining-functions/' },
            { label: '関数シグネチャ', link: '/posts/function-signatures/' },
            { label: '関数の整理', link: '/posts/organizing-functions/' },
            { label: '型への関数のアタッチ', link: '/posts/type-extensions/' },
            { label: '実践例: スタックベースの電卓', link: '/posts/stack-based-calculator/' },
          ],
        },
        {
          label: 'F# を理解する',
          items: [
            {
              label: '「式と構文」 シリーズ',
              items: [
                { label: 'シリーズ目次', link: '/series/expressions-and-syntax/' },
                { label: '式と構文: はじめに', link: '/posts/expressions-intro/' },
                { label: '式 vs. 文', link: '/posts/expressions-vs-statements/' },
                { label: 'F# 式の概要', link: '/posts/understanding-fsharp-expressions/' },
                { label: 'let、use、doでの束縛', link: '/posts/let-use-do/' },
                { label: 'F# 構文: インデントと冗長性', link: '/posts/fsharp-syntax/' },
                { label: 'パラメーターと値の名前付け規則', link: '/posts/naming-conventions/' },
                { label: '制御フロー式', link: '/posts/control-flow-expressions/' },
                { label: '例外', link: '/posts/exceptions/' },
                { label: 'マッチ式', link: '/posts/match-expression/' },
                { label: 'printf によるフォーマット済みテキスト', link: '/posts/printf/' },
                { label: '実践例: コマンドライン引数の解析', link: '/posts/pattern-matching-command-line/' },
                { label: '実践例: ローマ数字', link: '/posts/roman-numerals/' },
              ],
            },
            {
              label: '「F# の型を理解する」 シリーズ',
              items: [
                { label: 'シリーズ目次', link: '/series/understanding-fsharp-types/' },
                { label: 'F# の型を理解する: はじめに', link: '/posts/types-intro/' },
                { label: 'F# の型概要', link: '/posts/overview-of-types-in-fsharp/' },
                { label: '型略称', link: '/posts/type-abbreviations/' },
                { label: 'タプル', link: '/posts/tuples/' },
                { label: 'レコード', link: '/posts/records/' },
                { label: '判別共用体', link: '/posts/discriminated-unions/' },
                { label: 'オプション型', link: '/posts/the-option-type/' },
                { label: '列挙型', link: '/posts/enum-types/' },
                { label: '組み込みの .NET 型', link: '/posts/cli-types/' },
                { label: '測定単位', link: '/posts/units-of-measure/' },
                { label: '型推論を理解する', link: '/posts/type-inference/' },
              ],
            },
            { label: 'コレクション関数の選択', link: '/posts/list-module-functions/' },
            {
              label: '「F# でのオブジェクト指向プログラミング」 シリーズ',
              items: [
                { label: 'シリーズ目次', link: '/series/object-oriented-programming-in-fsharp/' },
                { label: 'F# でのオブジェクト指向プログラミング: はじめに', link: '/posts/object-oriented-intro/' },
                { label: 'クラス', link: '/posts/classes/' },
                { label: '継承と抽象クラス', link: '/posts/inheritance/' },
                { label: 'インターフェイス', link: '/posts/interfaces/' },
                { label: 'オブジェクト式', link: '/posts/object-expressions/' },
              ],
            },
            {
              label: '「コンピュテーション式」 シリーズ',
              items: [
                { label: 'シリーズ目次', link: '/series/computation-expressions/' },
                { label: 'コンピュテーション式: はじめに', link: '/posts/computation-expressions-intro/' },
                { label: '継続の理解', link: '/posts/computation-expressions-continuations/' },
                { label: 'bind の紹介', link: '/posts/computation-expressions-bind/' },
                { label: 'コンピュテーション式とラッパー型', link: '/posts/computation-expressions-wrapper-types/' },
                { label: 'ラッパー型について', link: '/posts/computation-expressions-wrapper-types-part2/' },
                { label: 'ビルダーの実装: Zero と Yield', link: '/posts/computation-expressions-builder-part1/' },
                { label: 'ビルダーの実装: Combine', link: '/posts/computation-expressions-builder-part2/' },
                { label: 'ビルダーの実装: Delay と Run', link: '/posts/computation-expressions-builder-part3/' },
                { label: 'ビルダーの実装: オーバーロード', link: '/posts/computation-expressions-builder-part4/' },
                { label: 'ビルダーの実装:遅延の追加', link: '/posts/computation-expressions-builder-part5/' },
                {
                  label: 'ビルダーの実装: 標準メソッドの残りの部分',
                  link: '/posts/computation-expressions-builder-part6/'
                },
              ],
            },
            { label: 'プロジェクト内のモジュールの整理', link: '/posts/recipe-part3/' },
            {
              label: '「循環依存」 シリーズ',
              items: [
                { label: 'シリーズ目次', link: '/series/dependency-cycles/' },
                { label: '循環依存は悪', link: '/posts/cyclic-dependencies/' },
                { label: '循環依存を取り除くリファクタリング', link: '/posts/removing-cyclic-dependencies/' },
                { label: '実世界の循環依存とモジュール性', link: '/posts/cycles-and-modularity-in-the-wild/' },
              ],
            },
            {
              label: '「C# からの移植」 シリーズ',
              items: [
                { label: 'シリーズ目次', link: '/series/porting-from-csharp/' },
                { label: 'C# から F# への移植: はじめに', link: '/posts/porting-to-csharp-intro/' },
                { label: '直接移植の始め方', link: '/posts/porting-to-csharp-getting-started/' },
              ],
            },
          ],
        },
        {
          label: '関数型設計',
          items: [
            {
              label: '「型を使って設計する」 シリーズ',
              items: [
                { label: 'シリーズ目次', link: '/series/designing-with-types/' },
                { label: '型を使って設計する: はじめに', link: '/posts/designing-with-types-intro/' },
                { label: '単一ケース共用体型', link: '/posts/designing-with-types-single-case-dus/' },
                {
                  label: '不正な状態を表現できないようにする',
                  link: '/posts/designing-with-types-making-illegal-states-unrepresentable/'
                },
                { label: '新しい概念を発見する', link: '/posts/designing-with-types-discovering-the-domain/' },
                { label: '状態を明示的にする', link: '/posts/designing-with-types-representing-states/' },
                { label: '制約付き文字列', link: '/posts/designing-with-types-more-semantic-types/' },
                { label: '文字列以外の型', link: '/posts/designing-with-types-non-strings/' },
                { label: '型を使って設計する: 結論', link: '/posts/designing-with-types-conclusion/' },
              ],
            },
            { label: '代数的型のサイズとドメインモデリング', link: '/posts/type-size-and-design/' },
            {
              label: 'タートルを見る13の方法',
              items: [
                { label: 'タートルを見る13の方法: パート1', link: '/posts/13-ways-of-looking-at-a-turtle/' },
                { label: 'タートルを見る13の方法: パート2', link: '/posts/13-ways-of-looking-at-a-turtle-2/' },
                { label: 'タートルを見る13の方法 - 追補', link: '/posts/13-ways-of-looking-at-a-turtle-3/' },
              ],
            },
          ],
        },
        {
          label: '関数型パターン',
          items: [
            { label: '完全なプログラムの設計とコーディング方法', link: '/posts/recipe-part1/' },
            {
              label: 'エラー処理への関数型アプローチ (鉄道指向プログラミング)',
              items: [
                { label: '鉄道指向プログラミング', link: '/posts/recipe-part2/' },
                {
                  label: '鉄道指向プログラミング: 炭酸化バージョン',
                  link: '/posts/railway-oriented-programming-carbonated/'
                },
              ],
            },
            {
              label: '「モノイドを理解する」 シリーズ',
              items: [
                { label: 'シリーズ目次', link: '/series/understanding-monoids/' },
                { label: 'つらくないモノイド', link: '/posts/monoids-without-tears/' },
                { label: '実践的なモノイド', link: '/posts/monoids-part2/' },
                { label: 'モノイド以外を扱う', link: '/posts/monoids-part3/' },
              ],
            },
            {
              label: '「パーサーコンビネータを理解する」 シリーズ',
              items: [
                { label: 'シリーズ目次', link: '/series/understanding-parser-combinators/' },
                { label: 'パーサーコンビネータを理解する', link: '/posts/understanding-parser-combinators/' },
                { label: '便利なパーサーコンビネータの作成', link: '/posts/understanding-parser-combinators-2/' },
                { label: 'パーサーライブラリの改善', link: '/posts/understanding-parser-combinators-3/' },
                { label: 'JSONパーサーをゼロから書く', link: '/posts/understanding-parser-combinators-4/' },
              ],
            },
            {
              label: '「状態の扱い」 シリーズ',
              items: [
                { label: 'シリーズ目次', link: '/series/handling-state/' },
                { label: 'フランケンファンクター博士とモナド怪物', link: '/posts/monadster/' },
                { label: 'モナド怪物の体を完成させる', link: '/posts/monadster-2/' },
                { label: 'モナド怪物のリファクタリング', link: '/posts/monadster-3/' },
              ],
            },
            {
              label: '「Map, Bind, Apply なにもわからない」 シリーズ',
              items: [
                { label: 'シリーズ目次', link: '/series/map-and-bind-and-apply-oh-my/' },
                { label: 'map と apply を理解する', link: '/posts/elevated-world/' },
                { label: 'bind を理解する', link: '/posts/elevated-world-2/' },
                { label: 'コア関数の実際的な使い方', link: '/posts/elevated-world-3/' },
                { label: 'traverse と sequence を理解する', link: '/posts/elevated-world-4/' },
                { label: 'map, apply, bind, sequence の実際的な使い方', link: '/posts/elevated-world-5/' },
                { label: 'Reader モナドの再発明', link: '/posts/elevated-world-6/' },
                { label: 'Map, Bind, Apply のまとめ', link: '/posts/elevated-world-7/' },
              ],
            },
            {
              label: '「再帰型と畳み込み」 シリーズ',
              items: [
                { label: 'シリーズ目次', link: '/series/recursive-types-and-folds/' },
                { label: '再帰型入門', link: '/posts/recursive-types-and-folds/' },
                { label: 'カタモーフィズムの例', link: '/posts/recursive-types-and-folds-1b/' },
                { label: '畳み込みの紹介', link: '/posts/recursive-types-and-folds-2/' },
                { label: '畳み込みを理解する', link: '/posts/recursive-types-and-folds-2b/' },
                { label: 'ジェネリック再帰型', link: '/posts/recursive-types-and-folds-3/' },
                { label: '木構造の実践的な利用', link: '/posts/recursive-types-and-folds-3b/' },
              ],
            },
            {
              label: '「関数型アプローチによる認可」 シリーズ',
              items: [
                { label: 'シリーズ目次', link: '/series/a-functional-approach-to-authorization/' },
                { label: '関数型アプローチによる認可', link: '/posts/capability-based-security/' },
                { label: 'IDとロールによるケイパビリティの制約', link: '/posts/capability-based-security-2/' },
                { label: '型をアクセストークンとして使う', link: '/posts/capability-based-security-3/' },
              ],
            },
            {
              label: '「依存関係の注入」 シリーズ',
              items: [
                { label: '依存関係の注入の6つのアプローチ', link: '/posts/dependencies/' },
                { label: 'パラメータによる依存関係の注入', link: '/posts/dependencies-2/' },
              ],
            },
          ],
        },
        {
          label: 'テスト',
          items: [
            { label: 'プロパティベースのテスト入門', link: '/posts/property-based-testing/' },
            { label: 'プロパティベースのテストのプロパティ選択', link: '/posts/property-based-testing-2/' },
          ],
        },
        {
          label: '例とウォークスルー',
          items: [
            { label: '実践例: 正しさのための設計', link: '/posts/designing-for-correctness/' },
            { label: '実践例: スタックベースの電卓', link: '/posts/stack-based-calculator/' },
            { label: '実践例: コマンドライン引数の解析', link: '/posts/pattern-matching-command-line/' },
            { label: '実践例: ローマ数字', link: '/posts/roman-numerals/' },
            { label: '「解説付きローマ数字カタ」の解説', link: '/posts/roman-numeral-kata/' },
            {
              label: '「注釈付きウォークスルー」 シリーズ',
              items: [
                { label: 'シリーズ目次', link: '/series/annotated-walkthroughs/' },
                { label: '電卓のウォークスルー: パート1', link: '/posts/calculator-design/' },
                { label: '電卓のウォークスルー: パート2', link: '/posts/calculator-implementation/' },
                { label: '電卓のウォークスルー: パート3', link: '/posts/calculator-complete-v1/' },
                { label: '電卓のウォークスルー: パート4', link: '/posts/calculator-complete-v2/' },
                { label: 'エンタープライズ三目並べ', link: '/posts/enterprise-tic-tac-toe/' },
                { label: 'エンタープライズ三目並べ パート2', link: '/posts/enterprise-tic-tac-toe-2/' },
              ],
            },
            { label: 'ゼロからJSONパーサーを書く', link: '/posts/understanding-parser-combinators-4/' },
          ],
        },
        {
          label: 'その他',
          items: [
            {
              label: '静的型付け関数型プログラミング言語を使わない10の理由',
              link: '/posts/ten-reasons-not-to-use-a-functional-programming-language/'
            },
            { label: 'なぜモナドチュートリアルを書かないのか', link: '/posts/why-i-wont-be-writing-a-monad-tutorial/' },
            { label: 'そのプログラミング言語は不合理ですか？', link: '/posts/is-your-language-unreasonable/' },
            { label: 'UML図？必要ねぇ！', link: '/posts/no-uml-diagrams/' },
            { label: '内向的・外向的なプログラミング言語', link: '/posts/introvert-vs-extrovert/' },
            {
              label: '型安全と高パフォーマンスをコンパイラディレクティブで切り替える',
              link: '/posts/typesafe-performance-with-compiler-directives/'
            },
          ],
        },
      ],
    }),
  ],
  build: {
    format: 'file'
  }
});