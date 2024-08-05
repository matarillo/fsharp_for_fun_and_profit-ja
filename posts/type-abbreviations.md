---
layout: post
title: "型略称"
description: "エイリアスとしても知られています"
nav: fsharp-types
seriesId: "F#の型を理解する"
seriesOrder: 3
---

最も単純な型定義として、型略称（エイリアス）があります。

形式は以下の通りです。

```fsharp
type [型名] = [既存の型]
```

「既存の型」には、すでに見た基本的な型や、これから見ていく拡張された型など、どんな型でも使えます。

例をいくつか挙げてみましょう。

```fsharp
type RealNumber = float
type ComplexNumber = float * float
type ProductCode = string
type CustomerId = int
type AdditionFunction = int->int->int
type ComplexAdditionFunction = 
       ComplexNumber-> ComplexNumber -> ComplexNumber
```

とても分かりやすいですね。

型略称には二つの利点があります。一つ目は、ドキュメントの役割を果たし、型シグネチャを何度も書く手間を省けることです。上の例では、 `ComplexNumber` と `AdditionFunction` がその例です。

二つ目は、型の使い方と実際の実装をある程度切り離せることです。上の例では、 `ProductCode` と `CustomerId` がこれに該当します。`CustomerId` を簡単に文字列に変更しても、コードの大部分は変更する必要がありません。

しかし、重要なのは、これはあくまでエイリアスや略称であり、新しい型を作成しているわけではないということです。したがって、明示的に `AdditionFunction` 型の関数として定義しても、

```fsharp
type AdditionFunction = int->int->int
let f:AdditionFunction = fun a b -> a + b
```

コンパイラはエイリアスを無視して、単純な `int->int->int` という関数シグネチャを返します。

特に、本当のカプセル化はできません。 `CustomerId` の代わりに `int` をどこでも使用できますし、コンパイラは警告しません。また、次のようにエンティティIDの安全なバージョンを作ろうとしても、

```fsharp
type CustomerId = int
type OrderId = int
```

期待通りにはいきません。 `OrderId` を `CustomerId` の代わりに使ったり、その逆をすることも可能です。本当にカプセル化された型を得るには、後の記事で説明する単一ケースのユニオン型を使う必要があります。
