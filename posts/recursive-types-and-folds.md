---
layout: post
title: "再帰型入門"
description: "カタモーフィズムを恐れるな"
seriesId: "再帰型と畳み込み"
seriesOrder: 1
categories: [Folds, Patterns]
---

このシリーズでは、再帰型とその使い方について説明します。
その中で、カタモーフィズム、末尾再帰、左畳み込みと右畳み込みの違いなどについても取り上げます。

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
  * [`fold` 関数の紹介](../posts/recursive-types-and-folds-2.md#fold)
  * [`fold` 関数の問題点](../posts/recursive-types-and-folds-2.md#problems)
  * [関数としての蓄積器の使用](../posts/recursive-types-and-folds-2.md#functions)
  * [`foldback` 関数の紹介](../posts/recursive-types-and-folds-2.md#foldback)
  * [畳み込み作成のルール](../posts/recursive-types-and-folds-2.md#rules)
* **パート4: 畳み込みの理解**
  * [反復 vs. 再帰](../posts/recursive-types-and-folds-2b.md#iteration)
  * [畳み込みの例: ファイルシステムドメイン](../posts/recursive-types-and-folds-2b.md#file-system)
  * [「fold」に関するよくある質問](../posts/recursive-types-and-folds-2b.md#questions)
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

  
<a id="basic-recursive-type"></a>
<hr>

## 基本的な再帰型

まずは簡単な例として、ギフトをモデル化してみましょう。

筆者はギフト選びが苦手なので、いつも本かチョコレートを渡しています。
いつもは包装紙で包みますが、気合が入っているときは箱に入れてカードも添えます。

これを型で表現してみましょう。

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

ご覧の通り、3 つのケースは別の `Gift` を参照する「コンテナ」になっています。`Wrapped` ケースには包装紙と中身のギフトがあり、`Boxed` ケースや `WithACard` ケースも同様です。
残りの 2 つ、`Book` と `Chocolate` は別のギフトを参照しておらず、「リーフ」ノードまたは終端と見なすことができます。

この 3 つのケースが内部で `Gift` を参照しているため、`Gift` は**再帰型** になります。
関数とは異なり、再帰型を定義するのに `rec` キーワードは必要ありません。

では、値の例をいくつか作ってみましょう。

```fsharp
// 本
let wolfHall = {title="Wolf Hall"; price=20m}

// チョコレート
let yummyChoc = {chocType=SeventyPercent; price=5m}

// ギフト
let birthdayPresent = WithACard (Wrapped (Book wolfHall, HappyBirthday), "Happy Birthday")
//  WithACard (
//    Wrapped (
//      Book {title = "Wolf Hall"; price = 20M},
//      HappyBirthday),
//    "Happy Birthday")

// ギフト
let christmasPresent = Wrapped (Boxed (Chocolate yummyChoc), HappyHolidays)
//  Wrapped (
//    Boxed (
//      Chocolate {chocType = SeventyPercent; price = 5M}),
//    HappyHolidays)
```

値を使い始める前に、アドバイスを一言...

### ガイドライン：無限に再帰する型を避ける

F# では、すべての再帰型は、再帰的なケースと非再帰的なケースを混ぜて定義することをおすすめします。
もし `Book` のような非再帰的な要素がないと、その型のすべての値が無限に再帰的になってしまいます。

たとえば、以下の `ImpossibleGift` 型では、すべてのケースが再帰的です。どのケースを作るにも内側のギフトが必要で、そのギフトも作る必要があり、きりがないのです。

```fsharp
type ImpossibleGift =
    | Boxed of ImpossibleGift 
    | WithACard of ImpossibleGift * message:string
```

[遅延評価](https://wiki.haskell.org/Tying_the_Knot)、可変、またはリフレクションを許可すれば、このような型を作ることもできます。
しかし、F# のような遅延評価でない言語では、このような型は避けるのが良いでしょう。

**再帰型の使い方**

注意報はここで終了です。それでは、いよいよコードを書いてみましょう！

まず、ギフトには説明が欲しいとします。ロジックは次の通りです。

* 非再帰的な 2 つのケースでは、そのケースを説明する文字列を返します。
* 3 つの再帰的なケースでは、ケースの説明に加え、内側のギフトの説明も返します。
  つまり、`description` 関数は自分自身を参照するため、`rec` キーワードでマークする必要があります。

実装例はこちらです。

```fsharp
let rec description gift =
    match gift with 
    | Book book -> 
        sprintf "'%s'" book.title 
    | Chocolate choc -> 
        sprintf "%A chocolate" choc.chocType
    | Wrapped (innerGift,style) -> 
        sprintf "%s wrapped in %A paper" (description innerGift) style
    | Boxed innerGift -> 
        sprintf "%s in a box" (description innerGift) 
    | WithACard (innerGift,message) -> 
        sprintf "%s with a card saying '%s'" (description innerGift) message
```

`Boxed` ケースのような再帰呼び出しに注目してください。

```fsharp
    | Boxed innerGift -> 
        sprintf "%s in a box" (description innerGift) 
                               ~~~~~~~~~~~ <= 再帰呼び出し
```

さっきの値の例で試してみるとどうなるでしょうか。

```fsharp
birthdayPresent |> description  
// "'Wolf Hall' wrapped in HappyBirthday paper with a card saying 'Happy Birthday'"

christmasPresent |> description  
// "SeventyPercent chocolate in a box wrapped in HappyHolidays paper"
```

かなり良さそうです。 `HappyHolidays` はスペースがないので少し変ですが、概念を説明するには十分でしょう。

では、別の関数を作成してみましょう。ギフトの合計金額を計算する関数はどうでしょうか。

`totalCost` のロジックは次の通りです。

* 本とチョコレートはケース固有のデータに価格が含まれているので、それをそのまま使います。
* 包装紙は、金額に `0.5` を加えます。
* 箱は、金額に `1.0` を加えます。
* カードは、金額に `2.0` を加えます。

```fsharp
let rec totalCost gift =
    match gift with 
    | Book book -> 
        book.price
    | Chocolate choc -> 
        choc.price
    | Wrapped (innerGift,style) -> 
        (totalCost innerGift) + 0.5m
    | Boxed innerGift -> 
        (totalCost innerGift) + 1.0m
    | WithACard (innerGift,message) -> 
        (totalCost innerGift) + 2.0m
```

2 つの例の合計金額は以下の通りです。

```fsharp
birthdayPresent |> totalCost 
// 22.5m

christmasPresent |> totalCost 
// 6.5m
```

箱や包装紙の中には何が入っているのか気になる人もいるでしょう。`whatsInside` 関数は実装が簡単です。
コンテナのケースは無視して、非再帰的なケースには何かを返せばいいだけです。

```fsharp
let rec whatsInside gift =
    match gift with 
    | Book book -> 
        "A book"
    | Chocolate choc -> 
        "Some chocolate"
    | Wrapped (innerGift,style) -> 
        whatsInside innerGift
    | Boxed innerGift -> 
        whatsInside innerGift
    | WithACard (innerGift,message) -> 
        whatsInside innerGift
```

結果はこうなります。

```fsharp
birthdayPresent |> whatsInside 
// "A book"

christmasPresent |> whatsInside 
// "Some chocolate"
```

以上のように、3 つの関数をどれも簡単に書くことができました。

<a id="parameterize"></a>

## すべてをパラメータ化する

この 3 つの関数にはいくつか重複したコードがあります。
固有の処理ロジックに加えて、各関数は独自のパターンマッチングを行い、内部のギフトを再帰的に処理するロジックがあります。

ナビゲーションロジックとアプリケーションロジックを分離するにはどうすればいいでしょうか？

答えはすべてをパラメータ化することです！

いつものように、関数を渡すことでアプリケーションロジックをパラメータ化できます。今回のケースでは、各ケースに対応する関数が**5つ**必要になります。

新しい、パラメータ化されたバージョンがこちらです。なぜ `cataGift` と名付けたのかはすぐに説明します。

```fsharp
let rec cataGift fBook fChocolate fWrapped fBox fCard gift =
    match gift with 
    | Book book -> 
        fBook book
    | Chocolate choc -> 
        fChocolate choc
    | Wrapped (innerGift,style) -> 
        let innerGiftResult = cataGift fBook fChocolate fWrapped fBox fCard innerGift
        fWrapped (innerGiftResult,style)
    | Boxed innerGift -> 
        let innerGiftResult = cataGift fBook fChocolate fWrapped fBox fCard innerGift
        fBox innerGiftResult 
    | WithACard (innerGift,message) -> 
        let innerGiftResult = cataGift fBook fChocolate fWrapped fBox fCard innerGift
        fCard (innerGiftResult,message) 
```

この関数は完全に機械的なプロセスで作られていることがわかります。

* 各関数パラメータ（ `fBook` 、 `fChocolate` など）は、ケースに対応しています。
* 非再帰的な 2 つのケースでは、そのケースに関連するすべてのデータが関数パラメータに渡されます。
* 再帰的な 3 つのケースでは、 2 つのステップがあります。
  * 最初に、 `innerGift` に対して `cataGift` 関数を 再帰的に呼び出し、 `innerGiftResult` を取得します。
  * その後、適切なハンドラーにそのケースに関連するすべてのデータが渡されますが、 `innerGift` は `innerGiftResult` に置き換えられます。

ジェネリックな `cataGift` 関数を使って合計金額を書き直してみましょう。

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

注意点：

* `innerGiftResult` は内側のギフトの合計金額になったので、`innerCost` に名前変更しました。
* `totalCostUsingCata` 関数自体は再帰的ではなくなりました。 `cataGift` 関数を使うため、`rec` キーワードが不要になりました。

この関数は、以前と同じ結果を返します。

```fsharp
birthdayPresent |> totalCostUsingCata 
// 22.5m
```

`description` 関数も同様に `cataGift` を使って書き直すことができます。 `innerGiftResult` を `innerText` に変更しています。

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

結果は以前と同じです。

```fsharp
birthdayPresent |> descriptionUsingCata  
// "'Wolf Hall' wrapped in HappyBirthday paper with a card saying 'Happy Birthday'"

christmasPresent |> descriptionUsingCata  
// "SeventyPercent chocolate in a box wrapped in HappyHolidays paper"
```

<a id="catamorphisms"></a>

## カタモーフィズムの紹介

上で書いた `cataGift` 関数は「[カタモーフィズム](https://en.wikipedia.org/wiki/Catamorphism)」と呼ばれます。これはギリシャ語の「下向き + 形状」を組み合わせた言葉です。
一般的に、カタモーフィズムは、再帰型をその**構造**に基づいて新しい値に「折りたたむ」関数です。
実際、カタモーフィズムは「ビジターパターン」の一種と考えられます。

カタモーフィズムは非常に強力な概念です。
なぜなら、このような構造に対して定義できる最も基本的な関数だからです。**他のどんな関数も**、カタモーフィズムを使って定義することができます。

つまり、 `Gift -> string` や `Gift -> int` というシグネチャの関数を作りたい場合、
`Gift` 構造の各ケースに対して関数を指定することで、カタモーフィズムを使って作成できます。

先ほど、カタモーフィズムを使って `totalCost` を `totalCostUsingCata` として書き直しましたが、他にもたくさんの例を見ていきます。


### カタモーフィズムと畳み込み

カタモーフィズムは「畳み込み」とも呼ばれますが、畳み込みには種類があるので、
「カタモーフィズム」は**概念**を表し、「畳み込み」は特定の実装方法を表すようにしています。

さまざまな種類の畳み込みについては[次の記事](../posts/recursive-types-and-folds-2.md)で詳しく説明するので、
この記事では「カタモーフィズム」だけを使います。

### 実装の整理

先ほどの `cataGift` の実装は、各ステップを理解しやすいようにわざと冗長にしてありました。
ですが、処理の流れを理解できたのであれば、もう少し簡潔にすることができます。

まず、 `cataGift fBook fChocolate fWrapped fBox fCard` が再帰ケースごとに3回出てきます。これに `recurse` という名前をつけてみましょう。

```fsharp
let rec cataGift fBook fChocolate fWrapped fBox fCard gift =
    let recurse = cataGift fBook fChocolate fWrapped fBox fCard
    match gift with 
    | Book book -> 
        fBook book
    | Chocolate choc -> 
        fChocolate choc
    | Wrapped (innerGift,style) -> 
        let innerGiftResult = recurse innerGift
        fWrapped (innerGiftResult,style)
    | Boxed innerGift -> 
        let innerGiftResult = recurse innerGift
        fBox innerGiftResult 
    | WithACard (innerGift,message) -> 
        let innerGiftResult = recurse innerGift
        fCard (innerGiftResult,message) 
```

この `recurse` 関数は、単純なシグネチャ `Gift -> 'a` を持ちます。つまり、`Gift` を必要な戻り型に変換してくれるので、
さまざまな `innerGift` の値を処理するのに使えます。

もう一つのポイントは、再帰ケースで `innerGift` を単に `gift` に置き換えることです。これは「シャドーイング」と呼ばれます。
利点は、外側の `gift` がケースを処理するコードからは見えなくなるので、同じギフトに対してうっかり再帰処理をしてしまい、無限ループを引き起こすのを防げる点です。

一般的にはシャドーイングは避けますが、今回のように特に厄介なバグを回避できる場合は、好ましい手法と言えます。

整理後のバージョンは次のとおりです。

```fsharp
let rec cataGift fBook fChocolate fWrapped fBox fCard gift =
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

最後に、戻り型を明示的に `'r` と指定しておきます。このシリーズの後半では、 `'a` や `'b` といった他のジェネリック型も扱いますが、
一貫性を保つために、戻り型に常に標準的な名前をつけると便利です。

```fsharp
let rec cataGift fBook fChocolate fWrapped fBox fCard gift :'r =
//                                戻り型に名前をつける =>  ~~~~ 
```

こちらが最終バージョンです。

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


元の実装よりもずっとシンプルになり、 `Wrapped (gift, style)` のような型コンストラクタと、対応するハンドラー `fWrapped (recurse gift, style)` との対称性が示されています。
これが、次のトピックへの良い導入となります。

### 型コンストラクタとハンドラーの関係

`cataGift` 関数のシグネチャを見てみましょう。各ケースのハンドラー関数（ `fBook` 、 `fBox` など）は、同じパターンを持っていることがわかります。
つまり、そのケースに必要なすべてのデータを含む入力値と、共通の出力型 `'r` です。

```fsharp
val cataGift :
  fBook:(Book -> 'r) ->
  fChocolate:(Chocolate -> 'r) ->
  fWrapped:('r * WrappingPaperStyle -> 'r) ->
  fBox:('r -> 'r) ->
  fCard:('r * string -> 'r) -> 
  // 入力値
  gift:Gift -> 
  // 戻り値
  'r
```

別の見方をすれば、コンストラクタの中の `Gift` 型はすべて `'r` に置き換わったと考えられます。

たとえば：

* `Gift.Book` コンストラクタは `Book` を取り、`Gift` を返します。 `fBook` ハンドラーは `Book` を取り、`'r` を返します。
* `Gift.Wrapped` コンストラクタは `Gift * WrappingPaperStyle` を取り、`Gift` を返します。 `fWrapped` ハンドラーは `'r * WrappingPaperStyle` を入力とし、`'r` を返します。

この関係を型シグネチャで表すと、以下のようになります。

```fsharp
// Gift.Bookコンストラクタ
Book -> Gift

// fBookハンドラ
Book -> 'r

// Gift.Wrappedコンストラクタ
Gift * WrappingPaperStyle -> Gift

// fWrappedハンドラ
'r   * WrappingPaperStyle -> 'r

// Gift.Boxedコンストラクタ
Gift -> Gift

// fBoxハンドラ
'r   -> 'r
```

その他のケースについても同様です。

<a id="benefits"></a>

## カタモーフィズムの利点

カタモーフィズムには多くの理論がありますが、実際にはどのような利点があるのでしょうか。

なぜ `cataGift` のような特別な関数を作成するのでしょうか？ 元の関数のままにしておけばよいのではないでしょうか。

これにはいくつかの理由があります。

* **再利用性**：後でかなり複雑なカタモーフィズムを作成することになります。ロジックを一度だけ正確に記述すればよいというのは、便利なことです。
* **カプセル化**：関数だけを公開することで、データ型の内部構造を隠すことができます。
* **柔軟性**：関数はパターンマッチングよりも柔軟で、合成や部分適用などが可能です。
* **マッピング**：カタモーフィズムがあれば、さまざまなケースを新しい構造にマッピングする関数を簡単に作成できます。

これらの利点のほとんどは再帰的でない型にも当てはまりますが、再帰的型はより複雑になりがちなので、
カプセル化や柔軟性などの利点はそれだけ強力になります。

次のセクションでは、最後の3点について詳しく見ていきます。

### 関数パラメータを使って内部構造を隠す

最初の利点は、カタモーフィズムが内部設計を抽象化することです。関数を使うことで、呼び出し側コードは内部構造からある程度分離されます。
これはオブジェクト指向の世界におけるビジターパターンに類似しています。

たとえば、すべての呼び出し側がパターンマッチングではなくカタモーフィズム関数を使った場合、ケースの名前を安全に変更したり、慎重に行えばケースを追加・削除したりできます。

例として、以前の `Gift` の設計では、`WithACard` ケースがなかったとしましょう。これをバージョン1と呼びます。

```fsharp
type Gift =
    | Book of Book
    | Chocolate of Chocolate 
    | Wrapped of Gift * WrappingPaperStyle
    | Boxed of Gift 
```

そして、その構造のためのカタモーフィズム関数を作成して公開したとします。

```fsharp
let rec cataGift fBook fChocolate fWrapped fBox gift :'r =
    let recurse = cataGift fBook fChocolate fWrapped fBox 
    match gift with 
    | Book book -> 
        fBook book
    | Chocolate choc -> 
        fChocolate choc
    | Wrapped (gift,style) -> 
        fWrapped (recurse gift,style)
    | Boxed gift -> 
        fBox (recurse gift)
```

これには*4つ*の関数パラメータしかありません。

次に、`WithACard` ケースを追加して、 `Gift` がバージョン2になったとします。

```fsharp
type Gift =
    | Book of Book
    | Chocolate of Chocolate 
    | Wrapped of Gift * WrappingPaperStyle
    | Boxed of Gift 
    | WithACard of Gift * message:string
```

ケースは5つになりました。

新しいケースを追加するときは、多くの場合、すべての呼び出し側を壊し、新しいケースに対応させたいでしょう。

しかし、時にはそうしたくないこともあります。その場合は、次のように、余分なケースを黙って処理することで、元の `cataGift` と互換性を保つことができます。

```fsharp
/// Gift_V2を使いますが、以前の "cataGift" との後方互換性を維持します。
let rec cataGift fBook fChocolate fWrapped fBox gift :'r =
    let recurse = cataGift fBook fChocolate fWrapped fBox 
    match gift with 
    | Book book -> 
        fBook book
    | Chocolate choc -> 
        fChocolate choc
    | Wrapped (gift,style) -> 
        fWrapped (recurse gift,style)
    | Boxed gift -> 
        fBox (recurse gift)
    // 新しいケースを静かに通過させる        
    | WithACard (gift,message) -> 
        recurse gift
```

この関数のパラメータは依然として4つで、 `WithACard` ケースに対する特別な動作はありません。

デフォルト値を返すなど、互換性を保つための代替方法はいくつかあります。
重要な点は、呼び出し側が変更に気付かないことです。

**補足: アクティブパターンを使ってデータを隠す**

型の構造を隠すという話題なので、アクティブパターンを使う方法にも触れておきます。

たとえば、最初の4つのケースに対してアクティブパターンを作成し、 `WithACard` ケースを無視することができます。

```fsharp
let rec (|Book|Chocolate|Wrapped|Boxed|) gift =
    match gift with 
    | Gift.Book book -> 
        Book book
    | Gift.Chocolate choc -> 
        Chocolate choc
    | Gift.Wrapped (gift,style) -> 
        Wrapped (gift,style)
    | Gift.Boxed gift -> 
        Boxed gift
    | Gift.WithACard (gift,message) -> 
        // メッセージを無視し、ギフトに対して再帰的に処理する
        (|Book|Chocolate|Wrapped|Boxed|) gift
```

呼び出し側は、新しいケースの存在を知らずに、4つのケースでパターンマッチングできます。

```fsharp
let rec whatsInside gift =
    match gift with 
    | Book book -> 
        "A book"
    | Chocolate choc -> 
        "Some chocolate"
    | Wrapped (gift,style) -> 
        whatsInside gift
    | Boxed gift -> 
        whatsInside gift
```

### ケース処理関数とパターンマッチング

カタモーフィズムは関数パラメータを使います。前述のように、関数には合成や部分適用などのツールが使えるため、パターンマッチングよりも柔軟です。

ここでは、すべての「コンテナ」ケースを無視し、「コンテンツ」ケースだけを処理する例を示します。

```fsharp
let handleContents fBook fChocolate gift =
    let fWrapped (innerGiftResult,style) =   
        innerGiftResult
    let fBox innerGiftResult = 
        innerGiftResult
    let fCard (innerGiftResult,message) = 
        innerGiftResult

    // カタモーフィズムを呼び出す
    cataGift fBook fChocolate fWrapped fBox fCard gift
```

パイプラインを使って、残りの2つのケースをインラインで処理したものが以下です。

```fsharp
birthdayPresent 
|> handleContents 
    (fun book -> "The book you wanted for your birthday") 
    (fun choc -> "Your fave chocolate")
// 結果 => "The book you wanted for your birthday"

christmasPresent 
|> handleContents 
    (fun book -> "The book you wanted for Christmas") 
    (fun choc -> "Don't eat too much over the holidays!")
// 結果 => "Don't eat too much over the holidays!"
```

もちろん、パターンマッチングでもできますが、既存の `cataGift` 関数をそのまま使える方が簡単です。

### カタモーフィズムを使用したマッピング

前述のように、カタモーフィズムは再帰的な型を新しい値に「折りたたむ」関数です。
たとえば、`totalCost` では、再帰的なギフト構造が単一の金額に折りたたまれました。

しかし、「単一の値」はプリミティブなものだけではありません。別の再帰的な構造など、複雑な構造になることもあります。

実際、カタモーフィズムは、特に構造が非常に似ている場合、ある種の構造を別の構造にマッピングするのに最適です。

たとえば、チョコレートが大好きなルームメイトがいて、こっそりとギフトからチョコレートを取り出して食べ、
包装紙はそのままにして、箱とギフトカードは捨ててしまうとしましょう。

最後に残るのは「チョコレート抜きのギフト」です。次のようにモデル化できます。

```fsharp
type GiftMinusChocolate =
    | Book of Book
    | Apology of string
    | Wrapped of GiftMinusChocolate * WrappingPaperStyle
```

`Gift` から `GiftMinusChocolate` へのマッピングは、ケースがほぼ平行しているため、簡単にできます。

* `Book` はそのまま渡されます。
* `Chocolate` は食べられ、 `Apology` に置き換えられます。
* `Wrapped` ケースはそのまま渡されます。
* `Box` と `WithACard` ケースは無視されます。

コードは以下のとおりです。

```fsharp
let removeChocolate gift =
    let fBook (book:Book) = 
        Book book
    let fChocolate (choc:Chocolate) = 
        Apology "sorry I ate your chocolate"
    let fWrapped (innerGiftResult,style) = 
        Wrapped (innerGiftResult,style) 
    let fBox innerGiftResult = 
        innerGiftResult
    let fCard (innerGiftResult,message) = 
        innerGiftResult
    // カタモーフィズムを呼び出す
    cataGift fBook fChocolate fWrapped fBox fCard gift
```

テストすると...

```fsharp
birthdayPresent |> removeChocolate
// GiftMinusChocolate = 
//     Wrapped (Book {title = "Wolf Hall"; price = 20M}, HappyBirthday)

christmasPresent |> removeChocolate
// GiftMinusChocolate = 
//     Wrapped (Apology "sorry I ate your chocolate", HappyHolidays)
```

### ディープコピー

もう一つ。各ケースのハンドリング関数は、そのケースに関連付けられたデータを受け取ることを覚えていますか？
つまり、*元のケースコンストラクタ*を関数として使用できるのです。

どういう意味かを理解するために、元の値を複製する `deepCopy` という関数を定義してみましょう。
各ケースハンドラは対応するケースコンストラクタにすぎません。

```fsharp
let deepCopy gift =
    let fBook book = 
        Book book 
    let fChocolate (choc:Chocolate) = 
        Chocolate choc
    let fWrapped (innerGiftResult,style) = 
        Wrapped (innerGiftResult,style) 
    let fBox innerGiftResult = 
        Boxed innerGiftResult
    let fCard (innerGiftResult,message) = 
        WithACard (innerGiftResult,message) 
    // カタモーフィズムを呼び出す
    cataGift fBook fChocolate fWrapped fBox fCard gift
```

各ハンドラの冗長なパラメータを削除して、さらに簡略化できます。

```fsharp
let deepCopy gift =
    let fBook = Book 
    let fChocolate = Chocolate 
    let fWrapped = Wrapped 
    let fBox = Boxed 
    let fCard = WithACard 
    // カタモーフィズムを呼び出す
    cataGift fBook fChocolate fWrapped fBox fCard gift
```

これがうまく動作するかどうかは、あなた自身でテストできます。

```fsharp
christmasPresent |> deepCopy
// 結果 => 
//   Wrapped ( 
//    Boxed (Chocolate {chocType = SeventyPercent; price = 5M;}),
//    HappyHolidays)
```

これにより、カタモーフィズムについて別の考え方が生まれます。

* カタモーフィズムは再帰型に対する関数で、
  型のケースコンストラクタを渡すと、「クローン」関数が得られます。

### マッピングと変換を一度に行う
  
`deepCopy` 関数をちょっと変形して、オブジェクト内を再帰的に処理しながら一部を変更する方法を紹介します。

たとえば、私はミルクチョコレートが好きではないとしましょう。ギフトのチョコレートをより高級なものにアップグレードし、他のケースはそのままにする関数を書けます。

```fsharp
let upgradeChocolate gift =
    let fBook = Book 
    let fChocolate (choc:Chocolate) = 
        Chocolate {choc with chocType = SeventyPercent}
    let fWrapped = Wrapped 
    let fBox = Boxed 
    let fCard = WithACard 
    // カタモーフィズムを呼び出す
    cataGift fBook fChocolate fWrapped fBox fCard gift
```

実際に使ってみましょう。
```fsharp
// 好きではないチョコレートを作成
let cheapChoc = Boxed (Chocolate {chocType=Milk; price=5m})

// アップグレード！
cheapChoc |> upgradeChocolate
// 結果 =>
//   Boxed (Chocolate {chocType = SeventyPercent; price = 5M})
```

この処理は `map` 関数に似ているように思えるかもしれませんが、その通りです。
ジェネリックな `map` 関数については、[連載第6回](../posts/recursive-types-and-folds-3b.md#map) でジェネリックな再帰型について議論する際に取り上げます。
  
  
<a id="rules"></a>
  
## カタモーフィズムを作成するためのルール

前述したように、カタモーフィズムの作成は機械的なプロセスです。

* 構造体内の各ケースを処理する関数パラメータを作成します。
* 非再帰的なケースについては、そのケースに関連するすべてのデータを関数パラメータに渡します。
* 再帰的なケースについては、以下の 2 ステップを実行します。
  * まず、ネストされた値に対して再帰的にカタモーフィズムを呼び出します。
  * 次に、カタモーフィズムの結果で元のネストされた値を置き換えて、ケースに関連するすべてのデータをハンドラーに渡します。

それでは、これらのルールを適用して、他のドメインでカタモーフィズムを作成できるか見てみましょう。

<hr>
    
## まとめ

この投稿では、再帰型の定義方法と、カタモーフィズムの概念を紹介しました。

[次の投稿](../posts/recursive-types-and-folds-1b.md) では、
これらのルールを使って、他のドメインに対してカタモーフィズムを作成します。

それでは、また次回お会いしましょう！

*この投稿のソースコードは[このgist](https://gist.github.com/swlaschin/60938b4417d12cfa0a97)で入手できます。*



