---
layout: page
title: "サイトの内容"
nav: site-contents
description: "便利なページの一覧"
hasIcons: 1
hasNoCode: 1
---


## スタートガイド

* [F# のインストールと使い方](installing-and-using.html) を最初に読むとよいでしょう。
* [F# を使う理由](why-use-fsharp.html) F# のインタラクティブツアー
* [F# の学習](learning-fsharp.html) より効果的に学習するためのヒント
* F# で問題が発生したときは、[F# のトラブルシューティング](troubleshooting-fsharp.html) を参照してください。

さらに以下のことも試すことができます。

* [仕事で F# を使う低リスクな 26 の方法](posts/low-risk-ways-to-use-fsharp-at-work.html)。 今すぐ始めることができます - 許可は必要ありません!

## チュートリアル

以下のシリーズは、F# の主要な概念に関するチュートリアルです。

* [関数型思考](series/thinking-functionally.html) は基本から始めて、関数がどのように機能するのか、その理由を説明します。
* [式と構文](series/expressions-and-syntax.html) は、パターンマッチングなどの一般的な式をカバーし、インデントについての記事があります。
* [F# の型を理解する](series/understanding-fsharp-types.html) は、タプル、レコード、共用体、オプションなど、さまざまな型を定義して使用するしくみを説明します。
* [型による設計](series/designing-with-types.html) は、型を設計プロセスの一部として使用する方法と、不正な状態を表現不可能にする方法を説明します。
* [コレクション関数の選択](posts/list-module-functions.html)。 C# から F# に移行する場合、膨大な数のリスト関数が難しく感じるかもしれないので、目的の関数を見つけるためのガイドとしてこの記事を書きました。
* [プロパティベースのテスト](posts/property-based-testing.html): 何千ものテストを書くための怠け者のプログラマーのためのガイドです。
* [コンピュテーション式の理解](series/computation-expressions.html) は、コンピュテーション式を解明し、独自のコンピュテーション式を作成する方法を示します。

## 関数型パターン

これらの記事では、関数型プログラミングにおけるコアとなるパターン、つまり "map", "bind"、モナドなどの概念について説明します。

* [鉄道指向プログラミング](posts/recipe-part2.html): エラー処理のための関数型アプローチ
* [Stateモナド](series/handling-state.html): フランケンファンクター博士とモナド怪物の物語を使って、状態の扱いを紹介します。
* [Reader モナド](posts/elevated-world-6.html): Reader モナドの再発明
* [Map, bind, apply, lift, sequence, traverse](series/map-and-bind-and-apply-oh-my.html): ジェネリックデータ型を扱うためのコア関数の一部を説明するシリーズ
* [つらくないモノイド](posts/monoids-without-tears.html): 一般的な関数型パターンを、ほとんど数学を使わずに解説します。
* [畳み込みと再帰型](series/recursive-types-and-folds.html): 再帰型、カタモーフィズム、末尾再帰、左畳み込みと右畳み込みの違いなどについて説明します。
* [パーサーコンビネータの理解](posts/understanding-parser-combinators.html): パーサーコンビネータライブラリをゼロから作成します。
* [タートルを見る13の方法](posts/13-ways-of-looking-at-a-turtle.html): Stateモナド、エージェント、インタープリターなど、さまざまな手法を使ってタートルグラフィック API を実装します。

## 実践例

これらの記事では、コードを大量に含んだ詳細な実践例を提供します。

* [正しさのための設計](posts/designing-for-correctness.html): 不正な状態を表現不可能にする方法（ショッピングカートの例）。
* [スタックベースの電卓](posts/stack-based-calculator.html): コンビネータのパワーをデモするためにシンプルなスタックを使用します。
* [コマンドライン引数の解析](posts/pattern-matching-command-line.html): カスタム型と組み合わせたパターンマッチングの使用。
* [ローマ数字](posts/roman-numerals.html): もう一つのパターンマッチングの例
* [電卓のウォークスルー](posts/calculator-design.html): 電卓を設計するための型優先アプローチ
* [エンタープライズ三目並べ](posts/enterprise-tic-tac-toe.html): 純粋関数型で実装するときの設計判断をウォークスルーする
* [JSONパーサーを書く](posts/understanding-parser-combinators-4.html)

## F# の特定のトピック

一般:

* [4 つの主要な概念](posts/key-concepts.html) F# を標準的な命令型言語と区別するものです。
* [F# のインデントの理解](posts/fsharp-syntax.html)
* [メソッドを使用する際の落とし穴](posts/type-extensions.html#downsides-of-methods)

関数:

* [カリー化](posts/currying.html)
* [部分適用](posts/partial-application.html)

制御フロー:

* [match..with 式](posts/match-expression.html) と [マッチングロジックを隠す「畳み込み」関数の作成](posts/match-expression.html#folds)
* [if-then-else とループ](posts/control-flow-expressions.html)
* [例外](posts/exceptions.html)

型:

* [オプション型](posts/the-option-type.html) 特に [None は null と同じではない](posts/the-option-type.html#option-is-not-null) の理由
* [レコード型](posts/records.html)
* [タプル型](posts/tuples.html)
* [判別共用体](posts/the-option-type.html)
* [代数的型のサイズとドメインモデリング](posts/type-size-and-design.html)

## 物議を醸す記事

* [そのプログラミング言語は不合理ですか？](posts/is-your-language-unreasonable.html) あるいは、予測可能性の重要性について
* [「解説付きローマ数字カタ」の解説](posts/roman-numeral-kata.html) ローマ数字カタへの私のアプローチ
* [静的型付け関数型プログラミング言語を使わない10の理由](posts/ten-reasons-not-to-use-a-functional-programming-language.html) 理解できないものに対する不満
* [UML図？必要ねぇ！](posts/no-uml-diagrams.html) つまり、多くの場合、クラス図に UML を使用する必要はありません。
