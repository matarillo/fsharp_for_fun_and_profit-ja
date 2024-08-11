---
layout: post
title: "型を用いた設計：非文字列型"
description: "整数と日付を安全に扱う"
nav: thinking-functionally
seriesId: "型を用いた設計"
seriesOrder: 7
categories: [型, DDD]
---

このシリーズでは、文字列をラップする単一ケース判別共用体のさまざまな用途を見てきました。

この手法は、文字列だけでなく、数値や日付などの他のプリミティブ型にも使えます。いくつか例を見てみましょう。

## 単一ケース共用体

多くの場合、異なる種類の整数を誤って混同するのを避けたいものです。2つのドメインオブジェクトが同じ表現（整数を使う）になる場合がありますが、それらを混同すべきではありません。

たとえば、 `OrderId` と `CustomerId` があり、どちらも整数として保存されているとします。しかし、これらは*実際には*整数ではありません。たとえば、 `CustomerId` に42を加えることはできません。
また、`CustomerId(42)` は `OrderId(42)` と等しくありません。実際、それらは比較できないはずです。

もちろん、型を使えばこの問題を解決できます。

```fsharp
type CustomerId = CustomerId of int
type OrderId = OrderId of int

let custId = CustomerId 42
let orderId = OrderId 42

// コンパイルエラー
printfn "顧客IDと注文IDが等しいか？ %b" (custId = orderId) 
```

同様に、意味的に異なる日付値を型でラップすることで、混同を避けられます。（ `DateTimeKind` もこのための試みですが、常に信頼できるわけではありません。）

```fsharp
type LocalDttm = LocalDttm of System.DateTime
type UtcDttm = UtcDttm of System.DateTime
```

これらの型を使うと、常に正しい種類の日時をパラメータとして渡せます。さらに、ドキュメントとしての役割も果たします。

```fsharp
let SetOrderDate (d:LocalDttm) = 
    () // 何かを行う

let SetAuditTimestamp (d:UtcDttm) = 
    () // 何かを行う
```

## 整数の制約

`String50` や `ZipCode` などの型に対してバリデーションや制約を設けたのと同じように、整数に対しても同じアプローチを使えます。

たとえば、在庫管理システムやショッピングカートでは、特定の種類の数値が常に正であることを要求する場合があります。これを保証するために、 `NonNegativeInt` 型を作れます。

```fsharp
module NonNegativeInt = 
    type T = NonNegativeInt of int

    let create i = 
        if (i >= 0 )
        then Some (NonNegativeInt i)
        else None

module InventoryManager = 

    // NonNegativeIntの使用例
    let SetStockQuantity (i:NonNegativeInt.T) = 
        // 在庫を設定
        ()
```

## 型にビジネスルールを組み込む

先ほど、名前が 64K 文字になることがあるか疑問に思ったように、ショッピングカートには999999個のアイテムを追加できるでしょうか？

![状態遷移図：パッケージ配送](../assets/img/AddToCart.png)

制約付きの型を使ってこの問題を避ける価値はあるでしょうか。実際のコードを見てみましょう。

以下は、数量に標準の `int` 型を使った非常にシンプルなショッピングカートマネージャーです。関連するボタンがクリックされると、数量が増減します。明らかなバグを見つけられますか？

```fsharp
module ShoppingCartWithBug = 

    let mutable itemQty = 1  // 自宅では試さないでください！

    let incrementClicked() = 
        itemQty <- itemQty + 1

    let decrementClicked() = 
        itemQty <- itemQty - 1
```

バグをすぐに見つけられない場合は、制約をより明示的にすることを検討すべきかもしれません。

以下は、型付けされた数量を使った同じシンプルなショッピングカートマネージャーです。今度はバグを見つけられますか？（ヒント：このコードをF#スクリプトファイルに貼り付けて実行してください。）

```fsharp
module ShoppingCartQty = 

    type T = ShoppingCartQty of int

    let initialValue = ShoppingCartQty 1

    let create i = 
        if (i > 0 && i < 100)
        then Some (ShoppingCartQty i)
        else None

    let increment t = create (t + 1)
    let decrement t = create (t - 1)

module ShoppingCartWithTypedQty = 

    let mutable itemQty = ShoppingCartQty.initialValue

    let incrementClicked() = 
        itemQty <- ShoppingCartQty.increment itemQty

    let decrementClicked() = 
        itemQty <- ShoppingCartQty.decrement itemQty
```

このような些細な問題に対して、大げさすぎると思うかもしれません。しかし、DailyWTF（プログラミングの失敗例を紹介するWebサイト）に載らないようにするには、検討する価値があるかもしれません。

## 日付の制約

すべてのシステムがあらゆる日付を扱えるわけではありません。1980年1月1日以降の日付しか保存できないシステムもあれば、2038年までしか未来の日付を扱えないシステムもあります（アメリカとイギリスの日付表記順序の違いによる問題を避けるため、私は最大日付として2038年1月1日を使うことが多いです）。

整数の場合と同様に、有効な日付に対する制約を型に組み込めます。これにより、範囲外の値による問題は、後になって発生するのではなく、構築時に対処できるようになります。

```fsharp
type SafeDate = SafeDate of System.DateTime

let create dttm = 
    let min = new System.DateTime(1980,1,1)
    let max = new System.DateTime(2038,1,1)
    if dttm < min || dttm > max
    then None
    else Some (SafeDate dttm)
```


## 共用体型vs測定単位

ここで疑問に思うかもしれません。[測定単位](../posts/units-of-measure.md)はどうでしょうか。このような目的で使うのではないのでしょうか？

答えは「はい」であり「いいえ」でもあります。測定単位は確かに異なる型の数値を混同するのを避けるために使えます。また、これまで使ってきた単一ケース共用体よりもはるかに強力です。

一方で、測定単位はカプセル化されておらず、制約を持てません。誰でも `<kg>` という測定単位を持つ整数を作れますし、最小値や最大値はありません。

多くの場合、どちらのアプローチでも問題ありません。たとえば、.NETライブラリにはタイムアウトを使う部分がいくつかありますが、タイムアウトは秒単位で設定されることもあれば、ミリ秒単位で設定されることもあります。
私はどちらがどちらかよく覚えていません。1000ミリ秒のタイムアウトを意図していたのに、うっかり1000秒のタイムアウトを使ってしまうのは避けたいものです。

このような事態を避けるため、私はしばしば秒とミリ秒のために別々の型を作ります。

以下は、単一ケース共用体を使った型ベースのアプローチです。

```fsharp
type TimeoutSecs = TimeoutSecs of int
type TimeoutMs = TimeoutMs of int

let toMs (TimeoutSecs secs)  = 
    TimeoutMs (secs * 1000)

let toSecs (TimeoutMs ms) = 
    TimeoutSecs (ms / 1000)

/// 指定されたミリ秒数だけスリープする
let sleep (TimeoutMs ms) = 
    System.Threading.Thread.Sleep ms

/// 指定された秒数後にタイムアウトする    
let commandTimeout (TimeoutSecs s) (cmd:System.Data.IDbCommand) = 
    cmd.CommandTimeout <- s
```

そしてこちらが測定単位を使った同じものです。

```fsharp
[<Measure>] type sec 
[<Measure>] type ms

let toMs (secs:int<sec>) = 
    secs * 1000<ms/sec>

let toSecs (ms:int<ms>) = 
    ms / 1000<ms/sec>

/// 指定されたミリ秒数だけスリープする
let sleep (ms:int<ms>) = 
    System.Threading.Thread.Sleep (ms * 1<_>)

/// 指定された秒数後にタイムアウトする    
let commandTimeout (s:int<sec>) (cmd:System.Data.IDbCommand) = 
    cmd.CommandTimeout <- (s * 1<_>)
```

どちらのアプローチが優れているでしょうか？

算術演算（加算、乗算など）を頻繁に行うのであれば、測定単位のアプローチがはるかに便利です。しかし、そうでなければ両者にあまり違いはありません。


