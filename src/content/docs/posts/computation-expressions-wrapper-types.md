---
layout: post
title: "コンピュテーション式とラッパー型"
description: "ワークフローを支援する型の使用"
nav: thinking-functionally
seriesId: "コンピュテーション式"
seriesOrder: 4
---

前回の投稿では、オプション型を連鎖させる際の複雑さを隠蔽できる「maybe」ワークフローを紹介しました。

「maybe」ワークフローの一般的な使用例は次のようなものでした。

```fsharp
let result = 
    maybe 
        {
        let! anInt = Option<int>型の式
        let! anInt2 = Option<int>型の式
        return anInt + anInt2 
        }    
```

前回見たように、ここには一見奇妙な振る舞いがあります。

* `let!`行では、等号の右側の式は`int option`型ですが、左側の値は単なる`int`型です。`let!`はオプションを「アンラップ」してから値に束縛しています。

* `return`行では、逆のことが起きています。返される式は`int`型ですが、ワークフロー全体の値（`result`）は`int option`型になります。つまり、`return`は生の値を再びオプションに「ラップ」しているのです。

この投稿では、これらの観察を掘り下げ、コンピュテーション式の主要な用途の1つに導かれることを見ていきます。つまり、何らかのラッパー型に格納された値を暗黙的にアンラップしたり再ラップしたりすることです。

## 別の例

別の例を見てみましょう。データベースにアクセスし、その結果を次のような成功/エラーのユニオン型で捕捉したいとします。

```fsharp
type DbResult<'a> = 
    | Success of 'a
    | Error of string
```

次に、このタイプをデータベースアクセスメソッドで使用します。`DbResult`型の使用方法を示す簡単なスタブをいくつか紹介します。

```fsharp
let getCustomerId name =
    if (name = "") 
    then Error "getCustomerId failed"
    else Success "Cust42"

let getLastOrderForCustomer custId =
    if (custId = "") 
    then Error "getLastOrderForCustomer failed"
    else Success "Order123"

let getLastProductForOrder orderId =
    if (orderId  = "") 
    then Error "getLastProductForOrder failed"
    else Success "Product456"
```


これらの呼び出しを連鎖させたいとします。まず名前から顧客IDを取得し、次に顧客IDから注文を取得し、最後に注文から商品を取得します。

これを最も明示的に行う方法は次のとおりです。見てわかるように、各ステップでパターンマッチングが必要になります。

```fsharp
let product = 
    let r1 = getCustomerId "Alice"
    match r1 with 
    | Error _ -> r1
    | Success custId ->
        let r2 = getLastOrderForCustomer custId 
        match r2 with 
        | Error _ -> r2
        | Success orderId ->
            let r3 = getLastProductForOrder orderId 
            match r3 with 
            | Error _ -> r3
            | Success productId ->
                printfn "Product is %s" productId
                r3
```

非常に醜いコードです。トップレベルのフローがエラー処理ロジックに埋もれています。

ここでコンピュテーション式の出番です！ Success/Errorの分岐を裏で処理するコンピュテーション式を書くことができます。

```fsharp
type DbResultBuilder() =

    member this.Bind(m, f) = 
        match m with
        | Error _ -> m
        | Success a -> 
            printfn "\tSuccessful: %s" a
            f a

    member this.Return(x) = 
        Success x

let dbresult = new DbResultBuilder()
```

このワークフローを使えば、全体像に焦点を当てて、よりクリーンなコードを書くことができます。

```fsharp
let product' = 
    dbresult {
        let! custId = getCustomerId "Alice"
        let! orderId = getLastOrderForCustomer custId
        let! productId = getLastProductForOrder orderId 
        printfn "Product is %s" productId
        return productId
        }
printfn "%A" product'
```

エラーがある場合、ワークフローはそれをうまく捕捉し、エラーの場所を教えてくれます。以下の例のようになります。

```fsharp
let product'' = 
    dbresult {
        let! custId = getCustomerId "Alice"
        let! orderId = getLastOrderForCustomer "" // エラー！
        let! productId = getLastProductForOrder orderId 
        printfn "Product is %s" productId
        return productId
        }
printfn "%A" product''
```


## ワークフローにおけるラッパー型の役割

これで2つのワークフロー（`maybe`ワークフローと`dbresult`ワークフロー）を見てきました。それぞれに対応するラッパー型（`Option<T>`と`DbResult<T>`）があります。

これらは単なる特殊なケースではありません。実際、すべてのコンピュテーション式には関連するラッパー型が必要です。そして、ラッパー型は管理したいワークフローと密接に連携するように設計されることがよくあります。

上の例はこれを明確に示しています。作成した`DbResult`型は単なる戻り値の型以上のものです。ワークフローの現在の状態を「格納」し、各ステップで成功しているか失敗しているかを示す重要な役割を果たしています。型自体のさまざまなケースを使用することで、`dbresult`ワークフローは遷移を管理し、それを隠蔽し、全体像に集中できるようにします。

適切なラッパー型の設計方法はこのシリーズの後半で学びますが、まずはそれらがどのように操作されるかを見てみましょう。


## BindとReturnとラッパー型

コンピュテーション式の`Bind`メソッドと`Return`メソッドの定義をもう一度見てみましょう。

簡単な方から始めましょう。`Return`の[Microsoft Learnでのドキュメント](https://learn.microsoft.com/ja-jp/dotnet/fsharp/language-reference/computation-expressions)によると、シグネチャは次のようになっています。

```fsharp
member Return : 'T -> M<'T>
```

つまり、ある型`T`に対して、`Return`メソッドはそれをラッパー型で包むだけです。

*注：シグネチャでは、ラッパー型は通常`M`と呼ばれます。したがって、`M<int>`は`int`に適用されたラッパー型、`M<string>`は`string`に適用されたラッパー型、というようになります。*

この使用法の2つの例を見てきました。`maybe`ワークフローは`Some`を返し、これはオプション型です。`dbresult`ワークフローは`Success`を返し、これは`DbResult`型の一部です。

```fsharp
// maybeワークフローのreturn
member this.Return(x) = 
    Some x

// dbresultワークフローのreturn
member this.Return(x) = 
    Success x
```

次に`Bind`を見てみましょう。`Bind`のシグネチャは次のとおりです。

```fsharp
member Bind : M<'T> * ('T -> M<'U>) -> M<'U>
```

複雑に見えるので、分解してみましょう。タプル`M<'T> * ('T -> M<'U>)`を受け取り、`M<'U>`を返します。ここで、`M<'U>`は型`U`に適用されたラッパー型を意味します。

タプルは2つの部分から成り立っています：

* `M<'T>`は型`T`のラッパーです。
* `'T -> M<'U>`は、アンラップされた`T`を受け取り、ラップされた`U`を作成する関数です。

つまり、`Bind`が行うことは：

* ラップされた値を受け取る。
* それをアンラップし、特別な「裏側の」ロジックを実行する。
* その後、オプションでアンラップされた値に関数を適用して、新しいラップされた値を作成する。
* 関数が適用されない場合でも、`Bind`はラップされた`U`を返す必要がある。

この理解を踏まえて、これまでに見てきた`Bind`メソッドを再度見てみましょう：

```fsharp
// maybeワークフローのreturn
member this.Bind(m,f) = 
   match m with
   | None -> None
   | Some x -> f x

// dbresultワークフローのreturn
member this.Bind(m, f) = 
    match m with
    | Error _ -> m
    | Success x -> 
        printfn "\tSuccessful: %s" x
        f x
```

このコードを見直し、これらのメソッドが上記で説明したパターンに従っていることを確認してください。

最後に、図解が役立つでしょう。以下は様々な型と関数の図です：

![bindの図](@assets/img/bind.png)

* `Bind`では、ラップされた値（ここでは`m`）から始め、それを型`T`の生の値にアンラップし、その後（場合によっては）関数`f`を適用して型`U`のラップされた値を得ます。
* `Return`では、値（ここでは`x`）から始め、単純にそれをラップします。


### ラッパー型はジェネリック

すべての関数は、ラッパー型自体を除いてジェネリック型（`T`と`U`）を使用していることに注目してください。ラッパー型は一貫して同じでなければなりません。たとえば、`maybe`バインド関数が`int`を受け取って`Option<string>`を返したり、`string`を受け取って`Option<bool>`を返したりすることを妨げるものは何もありません。唯一の要件は、常に`Option<何か>`を返すことです。

これを確認するために、上の例を再び取り上げ、すべての場所で文字列を使う代わりに、顧客ID、注文ID、商品IDに特別な型を作成します。これにより、チェーンの各ステップで異なる型を使用することになります。

まず型を定義し直し、今回は`CustomerId`などを定義します。

```fsharp
type DbResult<'a> = 
    | Success of 'a
    | Error of string

type CustomerId =  CustomerId of string
type OrderId =  OrderId of int
type ProductId =  ProductId of string
```

コードは、`Success`行での新しい型の使用を除いてほぼ同じです。

```fsharp
let getCustomerId name =
    if (name = "") 
    then Error "getCustomerId failed"
    else Success (CustomerId "Cust42")

let getLastOrderForCustomer (CustomerId custId) =
    if (custId = "") 
    then Error "getLastOrderForCustomer failed"
    else Success (OrderId 123)

let getLastProductForOrder (OrderId orderId) =
    if (orderId  = 0) 
    then Error "getLastProductForOrder failed"
    else Success (ProductId "Product456")
```


冗長なバージョンを再度示します。


```fsharp
let product = 
    let r1 = getCustomerId "Alice"
    match r1 with 
    | Error e -> Error e
    | Success custId ->
        let r2 = getLastOrderForCustomer custId 
        match r2 with 
        | Error e -> Error e
        | Success orderId ->
            let r3 = getLastProductForOrder orderId 
            match r3 with 
            | Error e -> Error e
            | Success productId ->
                printfn "Product is %A" productId
                r3
```

議論に値する変更点がいくつかあります：

* まず、下部の`printfn`では"%s"フォーマット指定子の代わりに"%A"を使用しています。これは`ProductId`型が現在ユニオン型であるために必要です。
* より微妙な点として、エラー行に不必要なコードがあるように見えます。なぜ`| Error e -> Error e`と書く必要があるのでしょうか？理由は、マッチングされる入力エラーが`DbResult<CustomerId>`型や`DbResult<OrderId>`型であるのに対し、戻り値は`DbResult<ProductId>`型でなければならないからです。つまり、2つの`Error`は同じように見えますが、実際には異なる型なのです。

次に、`| Error e -> Error e`行以外は全く変更されていないビルダーを示します。

```fsharp
type DbResultBuilder() =

    member this.Bind(m, f) = 
        match m with
        | Error e -> Error e
        | Success a -> 
            printfn "\tSuccessful: %A" a
            f a

    member this.Return(x) = 
        Success x

let dbresult = new DbResultBuilder()
```

最後に、以前と同じようにワークフローを使用できます。

```fsharp
let product' = 
    dbresult {
        let! custId = getCustomerId "Alice"
        let! orderId = getLastOrderForCustomer custId
        let! productId = getLastProductForOrder orderId 
        printfn "Product is %A" productId
        return productId
        }
printfn "%A" product'
```

各行で返される値は異なる型（`DbResult<CustomerId>`、`DbResult<OrderId>`など）ですが、共通のラッパー型を持つため、バインドは期待通りに機能します。

最後に、エラーケースのあるワークフローを示します。

```fsharp
let product'' = 
    dbresult {
        let! custId = getCustomerId "Alice"
        let! orderId = getLastOrderForCustomer (CustomerId "") // エラー
        let! productId = getLastProductForOrder orderId 
        printfn "Product is %A" productId
        return productId
        }
printfn "%A" product''
```


## コンピュテーション式の合成

すべてのコンピュテーション式には関連するラッパー型が必要であることを見てきました。このラッパー型は`Bind`と`Return`の両方で使用されるため、重要な利点があります：

* *`Return`の出力を`Bind`の入力に渡すことができる*

つまり、ワークフローはラッパー型を返し、`let!`はラッパー型を消費するので、「子」ワークフローを`let!`式の右辺に配置できます。

たとえば、`myworkflow`というワークフローがあるとします。次のように書くことができます：

```fsharp
let subworkflow1 = myworkflow { return 42 }
let subworkflow2 = myworkflow { return 43 }

let aWrappedValue = 
    myworkflow {
        let! unwrappedValue1 = subworkflow1
        let! unwrappedValue2 = subworkflow2
        return unwrappedValue1 + unwrappedValue2
        }
```

あるいは、次のように「インライン」にすることもできます：

```fsharp
let aWrappedValue = 
    myworkflow {
        let! unwrappedValue1 = myworkflow {
            let! x = myworkflow { return 1 }
            return x
            }
        let! unwrappedValue2 = myworkflow {
            let! y = myworkflow { return 2 }
            return y
            }
        return unwrappedValue1 + unwrappedValue2
        }
```

`async`ワークフローを使用したことがあれば、おそらくこれをすでに行っているでしょう。なぜなら、asyncワークフローには通常、他のasyncが埋め込まれているからです：

```fsharp
let a = 
    async {
        let! x = doAsyncThing  // ネストされたワークフロー
        let! y = doNextAsyncThing x // ネストされたワークフロー
        return x + y
    }
```

## "ReturnFrom"の導入

これまで、`return`をアンラップされた戻り値を簡単にラップする方法として使用してきました。

しかし、時にはすでにラップされた値を返す関数があり、それを直接返したい場合があります。`return`はこの目的には適していません。なぜなら、アンラップされた型を入力として要求するからです。

解決策は`return`の変形版である`return!`です。これはラップされた型を入力として受け取り、それを返します。

「ビルダー」クラスの対応するメソッドは`ReturnFrom`と呼ばれます。通常、実装はラップされた型をそのまま返すだけです（もちろん、必要に応じて裏で追加のロジックを実行することもできます）。

以下は、その使用方法を示す「maybe」ワークフローのバリエーションです：

```fsharp
type MaybeBuilder() =
    member this.Bind(m, f) = Option.bind f m
    member this.Return(x) = 
        printfn "生の値をオプションにラップします"
        Some x
    member this.ReturnFrom(m) = 
        printfn "オプションを直接返します"
        m

let maybe = new MaybeBuilder()
```

以下は、通常の`return`と比較した使用例です。

```fsharp
// intを返す
maybe { return 1  }

// Optionを返す
maybe { return! (Some 2)  }
```

より現実的な例として、`divideBy`と組み合わせた`return!`の使用例を示します：

```fsharp
// returnを使用
maybe 
    {
    let! x = 12 |> divideBy 3
    let! y = x |> divideBy 2
    return y  // intを返す
    }    

// return!を使用   
maybe 
    {
    let! x = 12 |> divideBy 3
    return! x |> divideBy 2  // Optionを返す
    }    
```

## まとめ

この投稿では、ラッパー型とそれらがビルダークラスのコアメソッドである `Bind` 、 `Return` 、 `ReturnFrom` とどのように関連しているかを紹介しました。

次の投稿では、リストをラッパー型として使用することを含め、ラッパー型についてさらに詳しく見ていきます。
    
