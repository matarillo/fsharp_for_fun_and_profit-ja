---
layout: page
title: "Site Contents"
nav: site-contents
description: "A directory of useful pages"
hasIcons: 1
hasNoCode: 1
---


## スタートガイド

* [F# のインストールと使い方](../installing-and-using/index.md) を最初に読むとよいでしょう。
* [F# を使う理由](../why-use-fsharp/index.md) F# のインタラクティブツアー
* [F# の学習](../learning-fsharp/index.md) より効果的に学習するためのヒント
* F# で問題が発生したときは、[F# のトラブルシューティング](../troubleshooting-fsharp/index.md) を参照してください。

さらに以下のことも試すことができます。

* [仕事で F# を使う低リスクな 26 の方法](../posts/low-risk-ways-to-use-fsharp-at-work.md)。 今すぐ始めることができます - 許可は必要ありません!

## チュートリアル

以下のシリーズは、F# の主要な概念に関するチュートリアルです。

* [関数型思考](../series/thinking-functionally.md) は基本から始めて、関数がどのように機能するのか、その理由を説明します。
* [式と構文](../series/expressions-and-syntax.md) は、パターンマッチングなどの一般的な式をカバーし、インデントについての記事があります。
* [F# の型を理解する](../series/understanding-fsharp-types.md) は、タプル、レコード、共用体、オプションなど、さまざまな型を定義して使用するしくみを説明します。
* [型による設計](../series/designing-with-types.md) は、型を設計プロセスの一部として使用する方法と、不正な状態を表現不可能にする方法を説明します。
* [コレクション関数の選択](../posts/list-module-functions.md)。 C# から F# に移行する場合、膨大な数のリスト関数が難しく感じるかもしれないので、目的の関数を見つけるためのガイドとしてこの記事を書きました。
* [プロパティベースのテスト](../posts/property-based-testing.md): 何千ものテストを書くための怠け者のプログラマーのためのガイドです。
* [コンピュテーション式の理解](../series/computation-expressions.md) は、コンピュテーション式を解明し、独自のコンピュテーション式を作成する方法を示します。

## 関数型パターン

これらの記事では、関数型プログラミングにおけるコアとなるパターン、つまり "map", "bind"、モナドなどの概念について説明します。

* [鉄道指向プログラミング](../posts/recipe-part2.md): エラー処理のための関数型アプローチ
* [Stateモナド](../series/handling-state.md): フランケンファンクター博士とモナド怪物の物語を使って、状態の扱いを紹介します。
* [Reader モナド](../posts/elevated-world-6.md): Reader モナドの再発明
* [Map, bind, apply, lift, sequence, traverse](../series/map-and-bind-and-apply-oh-my.md): ジェネリックデータ型を扱うためのコア関数の一部を説明するシリーズ
* [つらくないモノイド](../posts/monoids-without-tears.md): 一般的な関数型パターンを、ほとんど数学を使わずに解説します。
* [フォールドと再帰型](../series/recursive-types-and-folds.md): 再帰型、カタモーフィズム、末尾再帰、左フォールドと右フォールドの違いなどについて説明します。
* [パーサーコンビネータの理解](../posts/understanding-parser-combinators.md): パーサーコンビネータライブラリをスクラッチから作成します。
* [タートルを見る13の方法](../posts/13-ways-of-looking-at-a-turtle.md): Stateモナド、エージェント、インタープリターなど、さまざまな手法を使ってタートルグラフィック API を実装します。

## 実践例

これらの記事では、コードを大量に含んだ詳細な実践例を提供します。

* [正しい設計](../posts/designing-for-correctness.md): 不正な状態を表現不可能にする方法（ショッピングカートの例）。
* [スタックベースの電卓](../posts/stack-based-calculator.md): コンビネータのパワーをデモするためにシンプルなスタックを使用します。
* [コマンドラインの解析](../posts/pattern-matching-command-line.md): カスタム型と組み合わせたパターンマッチングの使用。
* [ローマ数字](../posts/roman-numerals.md): もう一つのパターンマッチングの例
* [電卓ウォークスルー](../posts/calculator-design.md): 電卓を設計するための型優先アプローチ
* [エンタープライズ三目並べ](../posts/enterprise-tic-tac-toe.md): 純粋な関数型実装における設計上の意思決定のウォークスルー
* [JSON パーサーを書く](../posts/understanding-parser-combinators-4.md)

## F# の特定のトピック

一般:

* [4 つの主要な概念](../posts/key-concepts.md) F# を標準的な命令型言語と区別するものです。
* [F# のインデントの理解](../posts/fsharp-syntax.md)
* [メソッドを使用する際の落とし穴](../posts/type-extensions.md#downsides-of-methods)

関数:

* [カリー化](../posts/currying.md)
* [部分適用](../posts/partial-application.md)

制御フロー:

* [Match..with 式](../posts/match-expression.md) と [マッチングを隠すためにFoldを作成する](../posts/match-expression.md#folds)
* [if-then-else とループ](../posts/control-flow-expressions.md)
* [例外](../posts/exceptions.md)

型:

* [オプション型](../posts/the-option-type.md) 特に [None は null と同じではない](../posts/the-option-type.md#option-is-not-null) の理由
* [レコード型](../posts/records.md)
* [タプル型](../posts/tuples.md)
* [判別共用体](../posts/the-option-type.md)
* [代数的型のサイズとドメインモデリング](../posts/type-size-and-design.md)

## 物議を醸す記事

* [あなたのプログラミング言語は理不尽ですか？](../posts/is-your-language-unreasonable.md) つまり、予測可能性がなぜ重要なのか
* [「ローマ数字のカタと解説」に関するコメント](../posts/roman-numeral-kata.md) ローマ数字のカタに対する私のアプローチ
* [静的に型付けされた関数型プログラミング言語を使用しない 10 の理由](../posts/ten-reasons-not-to-use-a-functional-programming-language.md) 理解できないものへの不満
* [くだらない UML 図なんか要らない](../posts/no-uml-diagrams.md) つまり、多くの場合、クラス図に UML を使用する必要はありません。
