---
layout: post
title: "畳み込みの紹介"
description: "再帰的データ構造を通じた状態の伝播"
seriesId: "再帰型と畳み込み"
seriesOrder: 3
categories: [Folds, Patterns]
---

この記事はシリーズの 3 番目です。

[最初の記事](../posts/recursive-types-and-folds.md)では、再帰型のための関数を作成する方法である「カタモーフィズム」を紹介しました。
[2番目の記事](../posts/recursive-types-and-folds-1b.md)では、いくつかのカタモーフィズムの実装を作成しました。

しかし、以前の記事の終わりで、これまでのカタモーフィズムの実装には、潜在的に深刻な欠陥があると指摘しました。

この記事では、その欠陥と対処法について説明します。その過程で、畳み込み、末尾再帰、「左畳み込み」と「右畳み込み」の違いについても見ていきます。

## シリーズの内容

シリーズの内容は次の通りです。

* **パート1: 再帰型とカタモーフィズム入門**
  * [シンプルな再帰型](../posts/recursive-types-and-folds.md#basic-recursive-type)
  * [すべてをパラメーター化](../posts/recursive-types-and-folds.md#parameterize)
  * [カタモーフィズムの紹介](../posts/recursive-types-and-folds.md#catamorphisms)
  * [カタモーフィズムの利点](../posts/recursive-types-and-folds.md#benefits)
  * [カタモーフィズム作成のルール](../posts/recursive-types-and-folds.md#rules)
* **パート2: カタモーフィズムの例**
  * [カタモーフィズムの例: ファイルシステムドメイン](../posts/recursive-types-and-folds-1b.md#file-system)
  * [カタモーフィズムの例: 製品ドメイン](../posts/recursive-types-and-folds-1b.md#product)
* **パート3: 畳み込みの紹介**
  * [カタモーフィズム実装の欠陥](../posts/recursive-types-and-folds-2.md#flaw)
  * [`fold` の導入](../posts/recursive-types-and-folds-2.md#fold)
  * [foldの問題点](../posts/recursive-types-and-folds-2.md#problems)
  * [関数をアキュムレーターとして使う](../posts/recursive-types-and-folds-2.md#functions)
  * [`foldback` の導入](../posts/recursive-types-and-folds-2.md#foldback)
  * [畳み込みの作成ルール](../posts/recursive-types-and-folds-2.md#rules)
* **パート4: 畳み込みを理解する**
  * [反復 vs. 再帰](../posts/recursive-types-and-folds-2b.md#iteration)
  * [畳み込みの例: ファイルシステムドメイン](../posts/recursive-types-and-folds-2b.md#file-system)
  * [「畳み込み」に関するよくある質問](../posts/recursive-types-and-folds-2b.md#questions)
* **パート5: ジェネリック再帰型**
  * [ジェネリック再帰型: リンクドリスト](../posts/recursive-types-and-folds-3.md#linkedlist)
  * [ギフトドメインをジェネリックにする](../posts/recursive-types-and-folds-3.md#revisiting-gift)
  * [ジェネリックなコンテナ型の定義](../posts/recursive-types-and-folds-3.md#container)
  * [ギフトドメイン実装の別の方法](../posts/recursive-types-and-folds-3.md#another-gift)
  * [抽象型か具体型か? 3つの設計の比較](../posts/recursive-types-and-folds-3.md#compare)
* **パート6: 実世界の木構造**
  * [ジェネリックな木構造型の定義](../posts/recursive-types-and-folds-3b.md#tree)
  * [実世界の木構造型](../posts/recursive-types-and-folds-3b.md#reuse)
  * [木構造型のマッピング](../posts/recursive-types-and-folds-3b.md#map)
  * [例: ディレクトリ一覧の作成](../posts/recursive-types-and-folds-3b.md#listing)
  * [例: 並列 grep](../posts/recursive-types-and-folds-3b.md#grep)
  * [例: ファイルシステムのデータベースへの保存](../posts/recursive-types-and-folds-3b.md#database)
  * [例: 木構造の JSON シリアライズ](../posts/recursive-types-and-folds-3b.md#tojson)
  * [例: JSON からの木構造のデシリアライズ](../posts/recursive-types-and-folds-3b.md#fromjson)
  * [例: エラー処理付きの JSON からの木構造のデシリアライズ](../posts/recursive-types-and-folds-3b.md#json-with-error-handling)

<a id="flaw"></a>
<hr>

## カタモーフィズム実装の欠陥

欠陥について説明する前に、まず前回作成した再帰型 `Gift` とそれに関連するカタモーフィズム `cataGift` を復習しましょう。

ドメインは以下の通りです。

```fsharp
type Book = {title: string; price: decimal}

type ChocolateType = Dark | Milk | SeventyPercent
type Chocolate = {chocType: ChocolateType ; price: decimal}

type WrappingPaperStyle = 
    | HappyBirthday
    | HappyHolidays
    | SolidColor

type Gift =
    | Book of Book
    | Chocolate of Chocolate 
    | Wrapped of Gift * WrappingPaperStyle
    | Boxed of Gift 
    | WithACard of Gift * message:string
```

この投稿で使用するサンプル値は以下の通りです。

```fsharp
// 本
let wolfHall = {title="Wolf Hall"; price=20m}
// チョコレート
let yummyChoc = {chocType=SeventyPercent; price=5m}
// ギフト
let birthdayPresent = WithACard (Wrapped (Book wolfHall, HappyBirthday), "Happy Birthday")
// ギフト
let christmasPresent = Wrapped (Boxed (Chocolate yummyChoc), HappyHolidays)
```

こちらがカタモーフィズムです。

```fsharp
let rec cataGift fBook fChocolate fWrapped fBox fCard gift :'r =
    let recurse = cataGift fBook fChocolate fWrapped fBox fCard
    match gift with 
    | Book book -> 
        fBook book
    | Chocolate choc -> 
        fChocolate choc
    | Wrapped (gift,style) -> 
        fWrapped (recurse gift,style)
    | Boxed gift -> 
        fBox (recurse gift)
    | WithACard (gift,message) -> 
        fCard (recurse gift,message) 
```

そして、`cataGift` を使って構築された `totalCostUsingCata` 関数は以下の通りです。

```fsharp
let totalCostUsingCata gift =
    let fBook (book:Book) = 
        book.price
    let fChocolate (choc:Chocolate) = 
        choc.price
    let fWrapped  (innerCost,style) = 
        innerCost + 0.5m
    let fBox innerCost = 
        innerCost + 1.0m
    let fCard (innerCost,message) = 
        innerCost + 2.0m
    // カタモーフィズムを呼び出す
    cataGift fBook fChocolate fWrapped fBox fCard gift
```

### 欠陥とは？

この実装の何が問題なのでしょうか？ストレステストをして調べてみましょう！

`Box` の中に `Box` を入れ、その中にさらに `Box` を入れるという操作を何度もして、何が起こるかを見てみます。

ネストしたギフトボックスを作成する小さなヘルパー関数を以下に示します。

```fsharp
let deeplyNestedBox depth =
    let rec loop depth boxSoFar =
        match depth with
        | 0 -> boxSoFar 
        | n -> loop (n-1) (Boxed boxSoFar)
    loop depth (Book wolfHall)
```

動作確認のために試してみましょう。

```fsharp
deeplyNestedBox 5
// Boxed (Boxed (Boxed (Boxed (Boxed (Book {title = "Wolf Hall"; price = 20M})))))

deeplyNestedBox 10
//  Boxed(Boxed(Boxed(Boxed(Boxed
//   (Boxed(Boxed(Boxed(Boxed(Boxed(Book {title = "Wolf Hall";price = 20M}))))))))))
```

次に、この深くネストしたギフトボックスで `totalCostUsingCata` を実行してみましょう。

```fsharp
deeplyNestedBox 10 |> totalCostUsingCata       // OK     30.0M
deeplyNestedBox 100 |> totalCostUsingCata      // OK    120.0M
deeplyNestedBox 1000 |> totalCostUsingCata     // OK   1020.0M
```

ここまでは問題ありません。

しかし、もっと大きな数を使うと、すぐにスタックオーバーフロー例外が発生します。

```fsharp
deeplyNestedBox 10000 |> totalCostUsingCata  // スタックオーバーフロー？
deeplyNestedBox 100000 |> totalCostUsingCata // スタックオーバーフロー？
```

エラーが発生する正確な数は、環境、使用可能なメモリなどによって異なります。
しかし、大きな数を使い始めると、確実に遭遇することになります。

なぜこのようなことが起こるのでしょうか？

### 深い再帰の問題

`Boxed` ケースの価格の定義 ( `fBox` ) が `innerCost + 1.0m` だったことを思い出してください。
そして、その `innerCost` とは何でしょうか？ それもまた別の `Box` なので、計算の連鎖は次のような形になります：

```fsharp
innerCost + 1.0m where innerCost = 
  innerCost2 + 1.0m where innerCost2 = 
    innerCost3 + 1.0m where innerCost3 = 
      innerCost4 + 1.0m where innerCost4 = 
        ...
        innerCost999 + 1.0m where innerCost999 = 
          innerCost1000 + 1.0m where innerCost1000 = 
            book.price
```

つまり、`innerCost999` を計算する前に `innerCost1000` を計算する必要があり、
最上位の `innerCost` を計算する前に他の 999 個の `innerCost` を計算する必要があります。

各レベルは、そのレベルの計算を行う前に、内部価格が計算されるのを待っています。

これらの未完了の計算は、内部の計算が完了するのを待ってスタックに積み重なっています。そして、それが多すぎると？ バン！ スタックオーバーフローです！

### スタックオーバーフローの解決策

この問題の解決策は簡単です。各レベルが内部の価格の計算を待つのではなく、各レベルがアキュムレーター（累積器）を使ってこれまでの価格を計算し、それを次の内部レベルに渡します。
最下層に到達すると、最終的な答えが得られます。

```fsharp
costSoFar = 1.0m; evaluate calcInnerCost with costSoFar: 
  costSoFar = costSoFar + 1.0m; evaluate calcInnerCost with costSoFar: 
    costSoFar = costSoFar + 1.0m; evaluate calcInnerCost with costSoFar: 
      costSoFar = costSoFar + 1.0m; evaluate calcInnerCost with costSoFar: 
        ...
        costSoFar = costSoFar + 1.0m; evaluate calcInnerCost with costSoFar: 
          costSoFar = costSoFar + 1.0m; evaluate calcInnerCost with costSoFar: 
            finalCost = costSoFar + book.price   // 最終的な答え
```

このアプローチの大きな利点は、特定のレベルでのすべての計算が、次の下位レベルが呼び出される前に *完全に終了* することです。
したがって、そのレベルとその関連データはスタックから安全に破棄できます。つまり、スタックオーバーフローが発生しません！

上位レベルを安全に破棄できるこのような実装は、 *末尾再帰* と呼びます。

### アキュムレーターを使った `totalCost` 関数の再実装

アキュムレーター `costSoFar` を使って、`totalCost` 関数を最初から書き直しましょう。

```fsharp
let rec totalCostUsingAcc costSoFar gift =
    match gift with 
    | Book book -> 
        costSoFar + book.price  // 最終結果
    | Chocolate choc -> 
        costSoFar + choc.price  // 最終結果
    | Wrapped (innerGift,style) -> 
        let newCostSoFar = costSoFar + 0.5m
        totalCostUsingAcc newCostSoFar innerGift 
    | Boxed innerGift -> 
        let newCostSoFar = costSoFar + 1.0m
        totalCostUsingAcc newCostSoFar innerGift 
    | WithACard (innerGift,message) -> 
        let newCostSoFar = costSoFar + 2.0m
        totalCostUsingAcc newCostSoFar innerGift 
```

注意すべき点がいくつかあります。

* 新しいバージョンの関数には、追加のパラメータ ( `costSoFar` ) があります。 最上位レベルで呼び出すときは、初期値（ゼロなど）を提供する必要があります。
* 非再帰的なケース ( `Book` と `Chocolate` ) は終了点です。 これまでの価格に自身の価格を加算し、それが最終結果となります。
* 再帰的なケースでは、渡されたパラメータに基づいて新しい `costSoFar` を計算します。
  新しい `costSoFar` は、上の例と同様に、次の下位レベルに渡されます。

このバージョンをストレステストしてみましょう。

```fsharp
deeplyNestedBox 1000 |> totalCostUsingAcc 0.0m     // OK    1020.0M
deeplyNestedBox 10000 |> totalCostUsingAcc 0.0m    // OK   10020.0M
deeplyNestedBox 100000 |> totalCostUsingAcc 0.0m   // OK  100020.0M
deeplyNestedBox 1000000 |> totalCostUsingAcc 0.0m  // OK 1000020.0M
```

素晴らしい。 100 万レベルのネストでも問題なく動作します。

<a id="fold"></a>

## `fold` の導入

同じ設計原則をカタモーフィズムの実装にも適用してみましょう。

新しい関数 `foldGift` を作成します。
各レベルを伝播するアキュムレーター `acc` を導入し、再帰でないケースでは最終的なアキュムレーターを返します。

```fsharp
let rec foldGift fBook fChocolate fWrapped fBox fCard acc gift :'r =
    let recurse = foldGift fBook fChocolate fWrapped fBox fCard 
    match gift with 
    | Book book -> 
        let finalAcc = fBook acc book
        finalAcc     // 最終結果
    | Chocolate choc -> 
        let finalAcc = fChocolate acc choc
        finalAcc     // 最終結果
    | Wrapped (innerGift,style) -> 
        let newAcc = fWrapped acc style
        recurse newAcc innerGift 
    | Boxed innerGift -> 
        let newAcc = fBox acc 
        recurse newAcc innerGift 
    | WithACard (innerGift,message) -> 
        let newAcc = fCard acc message 
        recurse newAcc innerGift
```

型シグネチャを見ると、微妙な違いがあることがわかります。アキュムレーターの型 `'a` がどこでも使用されるようになりました。
最終的な戻り値の型が使用されるのは、再帰でない2つのケース ( `fBook` と `fChocolate` ) だけです。

```fsharp
val foldGift :
  fBook:('a -> Book -> 'r) ->
  fChocolate:('a -> Chocolate -> 'r) ->
  fWrapped:('a -> WrappingPaperStyle -> 'a) ->
  fBox:('a -> 'a) ->
  fCard:('a -> string -> 'a) -> 
  // アキュムレーター
  acc:'a -> 
  // 入力値
  gift:Gift -> 
  // 戻り値
  'r
```

これを詳しく見て、前回の記事のカタモーフィズムのシグネチャと新しい `fold` （畳み込み）関数のシグネチャを比較しましょう。

まず、再帰でないケースについて見てみます。

```fsharp
// オリジナルのカタモーフィズム
fBook:(Book -> 'r)
fChocolate:(Chocolate -> 'r)

// fold
fBook:('a -> Book -> 'r)
fChocolate:('a -> Chocolate -> 'r)
```

ご覧のように、「fold（畳み込み）」では、再帰でないケースは追加のパラメータ（アキュムレーター）を受け取り、`'r` 型を返します。

これは非常に重要なポイントなのですが、*アキュムレーターの型は戻り値の型と同じである必要はありません*。
この点は後ほど重要になります。

再帰的なケースはどうでしょうか？シグネチャはどのように変化したでしょうか？

```fsharp
// オリジナルのカタモーフィズム
fWrapped:('r -> WrappingPaperStyle -> 'r) 
fBox:('r -> 'r) 

// fold
fWrapped:('a -> WrappingPaperStyle -> 'a)
fBox:('a -> 'a)
```

再帰的なケースでは、構造は同じですが、`'r` 型がすべて `'a` 型に置き換えられています。
再帰的なケースでは、`'r` 型はまったく使われません。
  
### foldを使った `totalCost` 関数の再実装

ここでも、 `foldGift` 関数を使って `totalCost` 関数を再実装できます。

```fsharp
let totalCostUsingFold gift =  

    let fBook costSoFar (book:Book) = 
        costSoFar + book.price
    let fChocolate costSoFar (choc:Chocolate) = 
        costSoFar + choc.price
    let fWrapped costSoFar style = 
        costSoFar + 0.5m
    let fBox costSoFar = 
        costSoFar + 1.0m
    let fCard costSoFar message = 
        costSoFar + 2.0m

    // 初期アキュムレーター
    let initialAcc = 0m

    // foldを呼び出す
    foldGift fBook fChocolate fWrapped fBox fCard initialAcc gift 
```

そして再び、何重にも入れ子になったギフトボックスをスタックオーバーフローなしで処理できます。

```fsharp
deeplyNestedBox 100000 |> totalCostUsingFold  // 問題なし   100020.0M
deeplyNestedBox 1000000 |> totalCostUsingFold // 問題なし  1000020.0M
```

<a id="problems"></a>

## foldの問題点

さて、foldを使えばすべての問題が解決するのでしょうか？

残念ながら、そうではありません。

スタックオーバーフローはなくなりましたが、今度は別の問題が生じています。

### `description`関数の再実装

問題点を見るために、最初の投稿で作成した`description`関数を見直しましょう。

元の関数は末尾再帰ではなかったので、安全にするために `foldGift` を使って再実装します。

```fsharp
let descriptionUsingFold gift =
    let fBook descriptionSoFar (book:Book) = 
        sprintf "'%s' %s" book.title descriptionSoFar

    let fChocolate descriptionSoFar (choc:Chocolate) = 
        sprintf "%A chocolate %s" choc.chocType descriptionSoFar

    let fWrapped descriptionSoFar style = 
        sprintf "%s wrapped in %A paper" descriptionSoFar style

    let fBox descriptionSoFar = 
        sprintf "%s in a box" descriptionSoFar 

    let fCard descriptionSoFar message = 
        sprintf "%s with a card saying '%s'" descriptionSoFar message

    // 初期アキュムレーター
    let initialAcc = ""

    // メイン呼び出し
    foldGift fBook fChocolate fWrapped fBox fCard initialAcc gift 
```

出力を見てみましょう。

```fsharp
birthdayPresent |> descriptionUsingFold  
// "'Wolf Hall'  with a card saying 'Happy Birthday' wrapped in HappyBirthday paper"

christmasPresent |> descriptionUsingFold  
// "SeventyPercent chocolate  wrapped in HappyHolidays paper in a box"
```

これらの出力は間違っています！ 装飾の順番が入れ替わっています。

本来は、本を包装してからカードを付けるべきですが、本とカードを一緒に包装してしまっています。
また、チョコレートを箱に入れてから包装するべきですが、包装されたチョコレートが箱に入っています！

```fsharp
// 出力： "'Wolf Hall'  with a card saying 'Happy Birthday' wrapped in HappyBirthday paper"
// 正解： "'Wolf Hall' wrapped in HappyBirthday paper with a card saying 'Happy Birthday'"

// 出力： "SeventyPercent chocolate  wrapped in HappyHolidays paper in a box"
// 正解： "SeventyPercent chocolate in a box wrapped in HappyHolidays paper"
```

何が間違っているのでしょうか？

答えは、各層の正しい説明が下の層の説明に依存しているということです。 
`descriptionSoFar` アキュムレーターを使って、ある層の説明を「事前に計算」して次の層に渡すことはできません。

しかし、ここでジレンマが生じます。層は下の層の情報に依存していますが、スタックオーバーフローは避けたいのです。

<a id="functions"></a>

## 関数をアキュムレーターとして使う

アキュムレーターの型は、必ずしも返り値の型と同じである必要はありません。アキュムレーターには何でも使用でき、関数もその例外ではありません。

そこで、`descriptionSoFar` をアキュムレーターとして渡す代わりに、
下の階層の値が与えられたときに適切な説明を構築する関数（`descriptionGenerator` としましょう）を渡すことにします。

非再帰的なケースの実装は次のようになります。

```fsharp
let fBook descriptionGenerator (book:Book) = 
    descriptionGenerator (sprintf "'%s'" book.title)
//  ~~~~~~~~~~~~~~~~~~~~  <= アキュムレーターとしての関数！

let fChocolate descriptionGenerator (choc:Chocolate) = 
    descriptionGenerator (sprintf "%A chocolate" choc.chocType)
```

再帰的なケースの実装は少し複雑です。

* アキュムレーター（`descriptionGenerator`）がパラメータとして渡されます。
* 新しいアキュムレーター（新しい `descriptionGenerator` ）を作成して、次の下層に渡す必要があります。
* 説明ジェネレータへの *入力* は、下層から集められたすべてのデータになります。
  それを操作して新しい説明を作り、上層から渡された `descriptionGenerator` を呼び出します。

説明するよりも実際に示す方がわかりやすいので、2 つのケースの実装を見てみましょう。

```fsharp
let fWrapped descriptionGenerator style = 
    let newDescriptionGenerator innerText =
        let newInnerText = sprintf "%s wrapped in %A paper" innerText style
        descriptionGenerator newInnerText 
    newDescriptionGenerator 

let fBox descriptionGenerator = 
    let newDescriptionGenerator innerText =
        let newInnerText = sprintf "%s in a box" innerText 
        descriptionGenerator newInnerText 
    newDescriptionGenerator 
```

ラムダ式を直接使用することで、コードを少し簡略化できます。

```fsharp
let fWrapped descriptionGenerator style = 
    fun innerText ->
        let newInnerText = sprintf "%s wrapped in %A paper" innerText style
        descriptionGenerator newInnerText 

let fBox descriptionGenerator = 
    fun innerText ->
        let newInnerText = sprintf "%s in a box" innerText 
        descriptionGenerator newInnerText 
```

パイプラインやその他の方法を使ってさらにコンパクトにすることもできますが、現在の状態が簡潔さとわかりやすさのバランスが取れていると思います。

関数の全体は以下のようになります。

```fsharp
let descriptionUsingFoldWithGenerator gift =

    let fBook descriptionGenerator (book:Book) = 
        descriptionGenerator (sprintf "'%s'" book.title)

    let fChocolate descriptionGenerator (choc:Chocolate) = 
        descriptionGenerator (sprintf "%A chocolate" choc.chocType)

    let fWrapped descriptionGenerator style = 
        fun innerText ->
            let newInnerText = sprintf "%s wrapped in %A paper" innerText style
            descriptionGenerator newInnerText 

    let fBox descriptionGenerator = 
        fun innerText ->
            let newInnerText = sprintf "%s in a box" innerText 
            descriptionGenerator newInnerText 

    let fCard descriptionGenerator message = 
        fun innerText ->
            let newInnerText = sprintf "%s with a card saying '%s'" innerText message 
            descriptionGenerator newInnerText 

    // 初期DescriptionGenerator
    let initialAcc = fun innerText -> innerText 

    // メイン呼び出し
    foldGift fBook fChocolate fWrapped fBox fCard initialAcc gift 
```

繰り返しますが、何が起こっているのかを明確にするために、わざと説明的な中間値を使用しています。

ここで `descriptionUsingFoldWithGenerator` を試してみると、正しい答えが得られるようになりました。

```fsharp
birthdayPresent |> descriptionUsingFoldWithGenerator  
// 正解 "'Wolf Hall' wrapped in HappyBirthday paper with a card saying 'Happy Birthday'"

christmasPresent |> descriptionUsingFoldWithGenerator  
// 正解 "SeventyPercent chocolate in a box wrapped in HappyHolidays paper"
```

<a id="foldback"></a>

## `foldback` の導入

さて、やるべきことが分かったので、ジェネレータ関数のロジックを処理してくれるジェネリックなバージョンを作ってみましょう。
これを「foldback（反対からの畳み込み）」と呼ぶことにします。

*ちなみに、ここでは「ジェネレータ」という用語を使います。他の場所では一般的に「継続」関数と呼ばれ、しばしば「k」と略されます。*

実装は次のようになります。

```fsharp
let rec foldbackGift fBook fChocolate fWrapped fBox fCard generator gift :'r =
    let recurse = foldbackGift fBook fChocolate fWrapped fBox fCard 
    match gift with 
    | Book book -> 
        generator (fBook book)
    | Chocolate choc -> 
        generator (fChocolate choc)
    | Wrapped (innerGift,style) -> 
        let newGenerator innerVal =
            let newInnerVal = fWrapped innerVal style
            generator newInnerVal 
        recurse newGenerator innerGift 
    | Boxed innerGift -> 
        let newGenerator innerVal =
            let newInnerVal = fBox innerVal 
            generator newInnerVal 
        recurse newGenerator innerGift 
    | WithACard (innerGift,message) -> 
        let newGenerator innerVal =
            let newInnerVal = fCard innerVal message 
            generator newInnerVal 
        recurse newGenerator innerGift 
```

ご覧のように、これは `descriptionUsingFoldWithGenerator` の実装と似ていますが、ジェネリックな `newInnerVal` と `generator` 値を使用しています。

型シグネチャは元のカタモーフィズムと似ていますが、すべてのケースが `'a` のみを扱います。
`'r` が使用されるのはジェネレータ関数だけです！

```fsharp
val foldbackGift :
  fBook:(Book -> 'a) ->
  fChocolate:(Chocolate -> 'a) ->
  fWrapped:('a -> WrappingPaperStyle -> 'a) ->
  fBox:('a -> 'a) ->
  fCard:('a -> string -> 'a) ->
  // アキュムレーター
  generator:('a -> 'r) -> 
  // 入力値
  gift:Gift -> 
  // 戻り値
  'r
```

*上の `foldback` の実装はゼロから書かれています。練習として、 `fold` を使って `foldback` を書けるかどうか試してみてください。*

`foldback` を使って `description` 関数を書き直してみましょう。

```fsharp
let descriptionUsingFoldBack gift =
    let fBook (book:Book) = 
        sprintf "'%s'" book.title 
    let fChocolate (choc:Chocolate) = 
        sprintf "%A chocolate" choc.chocType
    let fWrapped innerText style = 
        sprintf "%s wrapped in %A paper" innerText style
    let fBox innerText = 
        sprintf "%s in a box" innerText 
    let fCard innerText message = 
        sprintf "%s with a card saying '%s'" innerText message 
    // 初期DescriptionGenerator
    let initialAcc = fun innerText -> innerText 
    // メイン呼び出し
    foldbackGift fBook fChocolate fWrapped fBox fCard initialAcc gift 
```

結果は依然として正しいです。

```fsharp
birthdayPresent |> descriptionUsingFoldBack
// 正解 "'Wolf Hall' wrapped in HappyBirthday paper with a card saying 'Happy Birthday'"

christmasPresent |> descriptionUsingFoldBack
// 正解 "SeventyPercent chocolate in a box wrapped in HappyHolidays paper"
```

### foldback と元のカタモーフィズムの比較

`descriptionUsingFoldBack` の実装は、前回の記事で元のカタモーフィズム `cataGift` を使ったバージョンとほぼ同じです。

`cataGift` を使ったバージョンは次のようになります。

```fsharp
let descriptionUsingCata gift =
    let fBook (book:Book) = 
        sprintf "'%s'" book.title 
    let fChocolate (choc:Chocolate) = 
        sprintf "%A chocolate" choc.chocType
    let fWrapped (innerText,style) = 
        sprintf "%s wrapped in %A paper" innerText style
    let fBox innerText = 
        sprintf "%s in a box" innerText
    let fCard (innerText,message) = 
        sprintf "%s with a card saying '%s'" innerText message
    // カタモーフィズムを呼び出す
    cataGift fBook fChocolate fWrapped fBox fCard gift
```

`foldbackGift` を使ったバージョンは次のようになります。

```fsharp
let descriptionUsingFoldBack gift =
    let fBook (book:Book) = 
        sprintf "'%s'" book.title 
    let fChocolate (choc:Chocolate) = 
        sprintf "%A chocolate" choc.chocType
    let fWrapped innerText style = 
        sprintf "%s wrapped in %A paper" innerText style
    let fBox innerText = 
        sprintf "%s in a box" innerText 
    let fCard innerText message = 
        sprintf "%s with a card saying '%s'" innerText message 
    // 初期DescriptionGenerator
    let initialAcc = fun innerText -> innerText    // idに置き換えられます
    // メイン呼び出し
    foldbackGift fBook fChocolate fWrapped fBox fCard initialAcc gift 
```

すべてのハンドラ関数は基本的に同じです。唯一の違いは、初期ジェネレータ関数が追加されていることで、この場合は単なる `id` です。

しかし、コードは両方のケースで同じように見えますが、再帰の安全性は異なります。 `foldbackGift` バージョンは依然として末尾再帰であり、
`cataGift` バージョンとは異なり、非常に深いネストにも対応できます。

ただし、この実装も完璧ではありません。ネストされた関数の連鎖は非常に遅くなり、多くのガベージを生成する可能性があります。
この特定の例では、さらに高速な方法があり、それについては次の記事で見ていきます。

### 混乱を避けるための `foldback` 関数の型シグネチャの変更

`foldGift` 関数における `fWrapped` 関数の型シグネチャは、次のようなものです。

```fsharp
fWrapped:('a -> WrappingPaperStyle -> 'a) 
```

一方、`foldbackGift` 関数における `fWrapped` 関数の型シグネチャは、以下の通りです。

```fsharp
fWrapped:('a -> WrappingPaperStyle -> 'a) 
```

一見すると、違いがわかりづらいですね。

実は、この 2 つの関数は似ていますが、動作が大きく異なります。 `foldGift` の場合、最初のパラメータは *外側の* レベルからの蓄積値を受け取ります。
一方、`foldbackGift` では、最初のパラメータは *内側の* レベルからの蓄積値を受け取ります。この違いは非常に重要です！

そのため、`foldBack` バージョンの型シグネチャを変更して、蓄積値が常に *最後* に来るようにするのが一般的です。
一方、通常の `fold` 関数では、蓄積値は常に *最初* に受け取ります。

```fsharp
let rec foldbackGift fBook fChocolate fWrapped fBox fCard gift generator :'r =
//入れ替え =>                                              ~~~~~~~~~~~~~~ 

    let recurse = foldbackGiftWithAccLast fBook fChocolate fWrapped fBox fCard 

    match gift with 
    | Book book -> 
        generator (fBook book)
    | Chocolate choc -> 
        generator (fChocolate choc)

    | Wrapped (innerGift,style) -> 
        let newGenerator innerVal =
            let newInnerVal = fWrapped style innerVal 
//入れ替え =>                           ~~~~~~~~~~~~~~ 
            generator newInnerVal 
        recurse innerGift newGenerator  
//入れ替え =>    ~~~~~~~~~~~~~~~~~~~~~~ 

    | Boxed innerGift -> 
        let newGenerator innerVal =
            let newInnerVal = fBox innerVal 
            generator newInnerVal 
        recurse innerGift newGenerator  
//入れ替え =>    ~~~~~~~~~~~~~~~~~~~~~~ 

    | WithACard (innerGift,message) -> 
        let newGenerator innerVal =
            let newInnerVal = fCard message innerVal 
//入れ替え =>                        ~~~~~~~~~~~~~~~~ 
            generator newInnerVal 
        recurse innerGift newGenerator 
//入れ替え =>    ~~~~~~~~~~~~~~~~~~~~~~ 
```

この変更は型シグネチャに現れます。 `Gift` 値がアキュムレーターの前に来るようになります。

```fsharp
val foldbackGift :
  fBook:(Book -> 'a) ->
  fChocolate:(Chocolate -> 'a) ->
  fWrapped:(WrappingPaperStyle -> 'a -> 'a) ->
  fBox:('a -> 'a) ->
  fCard:(string -> 'a -> 'a) ->
  // 入力値
  gift:Gift -> 
  // アキュムレーター
  generator:('a -> 'r) -> 
  // 戻り値
  'r
```

これで、2 つのバージョンを簡単に区別できるようになりました。

```fsharp
// fold
fWrapped:('a -> WrappingPaperStyle -> 'a) 

// foldback
fWrapped:(WrappingPaperStyle -> 'a -> 'a)
```


<a id="rules"></a>

## 畳み込みの作成ルール

最後に、畳み込み関数を作成するためのルールをまとめます。

前回の投稿では、カタモーフィズムの作成は[ルールに従った](../posts/recursive-types-and-folds.md#rules)機械的なプロセスであることを説明しました。
反復的なトップダウン畳み込みの作成も同様です。プロセスは以下の通りです。

* 構造の各ケースを処理する関数パラメータを作成します。
* アキュムレーターのパラメータを追加します。
* 非再帰的なケースでは、関数パラメータにアキュムレーターと、そのケースに関連するすべてのデータを渡します。
* 再帰的なケースでは、2 つのステップを実行します。
  * まず、ハンドラーにアキュムレーターと、そのケースに関連するすべてのデータ (内部の再帰的データを除く) を渡します。結果は新しいアキュムレーター値になります。
  * 次に、新しいアキュムレーター値を使って、ネストされた値に対して fold 関数を再帰的に呼び出します。

各ハンドラーは、(a) そのケースのデータと、(b) 外部レベルから渡されたアキュムレーターのみを見ることができます。
内部レベルからの結果は見ることができません。

<hr>

## まとめ

この記事では、「fold（畳み込み）」と呼ばれる、末尾再帰によるカタモーフィズムの実装方法と、その逆の「foldback（反対からの畳み込み）」について見てきました。

[次の記事](../posts/recursive-types-and-folds-2b.md)では、少し立ち戻って「畳み込み」の本当の意味を理解し、
`fold` 、 `foldback` 、 `cata` のどれを選ぶべきかという指針について少し時間をかけて考えてみましょう。

そして、これらのルールを別のドメインに適用できるかどうかを検討します。

*この記事のソースコードは、[このgist](https://gist.github.com/swlaschin/df4427d0043d7146e592)です。*
