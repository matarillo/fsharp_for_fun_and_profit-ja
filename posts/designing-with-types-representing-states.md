---
layout: post
title: "型を使った設計：状態を明示的にする"
description: "ステートマシンで正確性を確保する"
nav: thinking-functionally
seriesId: "型を使った設計"
seriesOrder: 5
categories: [型, DDD]
---

この記事では、ステートマシンを使って暗黙的な状態を明示的にする方法と、ステートマシンを判別共用体でモデル化する方法を見ていきます。

## 背景 ##

このシリーズの[前の記事](../posts/designing-with-types-single-case-dus.md)で、メールアドレスなどの型をラップする単一ケース判別共用体について説明しました。

```fsharp
module EmailAddress = 

    type T = EmailAddress of string

    let create (s:string) = 
        if System.Text.RegularExpressions.Regex.IsMatch(s,@"^\S+@\S+\.\S+$") 
            then Some (EmailAddress s)
            else None
```

このコードは、アドレスが有効か無効かのどちらかだと想定しています。無効な場合は完全に拒否し、有効な値の代わりに `None` を返します。

しかし、有効性の度合いはさまざまです。たとえば、無効なメールアドレスを拒否するのではなく、保持したい場合はどうでしょうか。この場合も、いつものように型システムを使って、有効なアドレスと無効なアドレスが混ざらないようにしたいものです。

これを達成する最も簡単な方法は、判別共用体を使うことです。
```fsharp
module EmailAddress = 

    type T = 
        | ValidEmailAddress of string
        | InvalidEmailAddress of string

    let create (s:string) = 
        if System.Text.RegularExpressions.Regex.IsMatch(s,@"^\S+@\S+\.\S+$") 
            then ValidEmailAddress s    // 結果の型を変更
            else InvalidEmailAddress s  // 結果の型を変更

    // テスト
    let valid = create "abc@example.com"
    let invalid = create "example.com"
```

このような型を使えば、有効なメールだけが送信されることを保証できます。

```fsharp
let sendMessageTo t = 
    match t with 
    | ValidEmailAddress email ->
         // メールを送信
    | InvalidEmailAddress _ -> 
         // 無視
```

ここまで理解できたかと思います。このような設計は、もう当たり前に思えるでしょう。

しかし、このアプローチは思っている以上に広く適用できます。多くの状況で、似たような「状態」が明示的にされておらず、フラグや列挙型、コード内の条件分岐ロジックで処理されています。

## ステートマシン ##

上記の例では、「有効」と「無効」のケースは互いに排他的です。つまり、有効なメールが無効になることはなく、その逆もありません。

しかし、多くの場合、何らかのイベントをきっかけに、一つのケースから別のケースに移ることができます。このような場合、「[ステートマシン](https://ja.wikipedia.org/wiki/%E6%9C%89%E9%99%90%E3%82%AA%E3%83%BC%E3%83%88%E3%83%9E%E3%83%88%E3%83%B3)」が登場します。ステートマシンでは、各ケースが「状態」を表し、ある状態から別の状態への移動を「遷移」と呼びます。

いくつか例を挙げましょう。

* メールアドレスには「未確認」と「確認済み」の状態があります。確認メールのリンクをユーザーにクリックしてもらうことで、「未確認」状態から「確認済み」状態に遷移できます。
![状態遷移図。確認済みメール](../assets/img/State_VerifiedEmail.png)

* ショッピングカートには「空」、「アクティブ」、「支払い済み」の状態があります。カートに商品を追加すると「空」状態から「アクティブ」状態に遷移し、支払いを行うと「支払い済み」状態に遷移します。
![状態遷移図。ショッピングカート](../assets/img/State_ShoppingCart.png)

* チェスのようなゲームには「白の手番」、「黒の手番」、「ゲーム終了」の状態があります。白が終局でない手を指すと「白の手番」状態から「黒の手番」状態に遷移します。チェックメイトの手を指すと「ゲーム終了」状態に遷移します。
![状態遷移図。チェスゲーム](../assets/img/State_Chess.png)

このような場合、それぞれに状態の集合、遷移の集合、そして遷移をトリガーするイベントがあります。
ステートマシンは、しばしばテーブルで表現されます。以下はショッピングカートの例です。

<table class="table table-condensed">
<thead>
<tr>
<th>現在の状態</th>
<th>イベント-></th>
<th>商品追加</th>
<th>商品削除</th>
<th>支払い</th>
</tr>
</thead>
<tbody>
<tr>
<th>空</th>
<td></td>
<td>新しい状態 = アクティブ</td>
<td>該当なし</td>
<td>該当なし</td>
</tr>
<tr>
<th>アクティブ</th>
<td></td>
<td>新しい状態 = アクティブ</td>
<td>新しい状態 = アクティブまたは空<br>（商品の数による）</td>
<td>新しい状態 = 支払い済み</td>
</tr>
<tr>
<th>支払い済み</th>
<td></td>
<td>該当なし</td>
<td>該当なし</td>
<td>該当なし</td>
</tr>
</tbody>
</table>

このようなテーブルを使えば、システムが特定の状態にあるときに、それぞれのイベントで何が起こるべきかを素早く確認できます。

<a name="why-use"></a>

## なぜステートマシンを使うのか ##

これらの場合、ステートマシンを使う利点はいくつかあります。

**各状態は異なる動作を許容できる**

確認済みメールの例では、おそらくパスワードリセットメールは確認済みのメールアドレスにのみ送信でき、未確認のアドレスには送信できないという業務ルールがあるでしょう。
また、ショッピングカートの例では、アクティブなカートのみ支払いができ、支払い済みのカートには商品を追加できません。

**すべての状態が明示的に文書化される**

暗黙的な状態が存在し、決して文書化されない、ということもあまりにもよくある話です。

たとえば、「空のカート」は「アクティブなカート」とは異なる動作をしますが、コード内で明示的に文書化されていることは稀です。

**あらゆる可能性を考えることを強制する設計ツールである**

エラーのよくある原因は、特定のエッジケースが処理されていないことですが、ステートマシンはすべてのケースについて考えることを強制します。

たとえば、すでに確認済みのメールを再度確認しようとしたらどうなるべきでしょうか？
空のショッピングカートから商品を削除しようとしたらどうなりますか？
「黒の手番」の状態で白が指そうとしたらどうなりますか？などです。

## F#で単純なステートマシンを実装する方法 ##

言語パーサーや正規表現で使われる複雑なステートマシンに慣れている方も多いでしょう。こうしたステートマシンは、ルールセットや文法から生成され、非常に複雑です。

ここで扱うステートマシンは、はるかに単純なものです。多くても数ケースで、遷移の数も少ないので、複雑な生成器は必要ありません。

では、これらの単純なステートマシンを最適な方法で実装するにはどうすればよいでしょうか。

一般的に、各状態には、その状態に関連するデータ（もしあれば）を格納するための独自の型が定義され、状態全体の集合は共用体型で表現されます。

以下は、ショッピングカートのステートマシンを例としたものです。

```fsharp
type ActiveCartData = { UnpaidItems: string list }
type PaidCartData = { PaidItems: string list; Payment: float }

type ShoppingCart = 
    | EmptyCart  // データなし
    | ActiveCart of ActiveCartData
    | PaidCart of PaidCartData
```

`EmptyCart` 状態にはデータがないので、特別な型は必要ありません。

各イベントは、ステートマシン全体（判別共用体型）を受け取り、新しいステートマシン（同じく判別共用体型）を返す関数として表現されます。

以下は、ショッピングカートのイベントの例です。

```fsharp
let addItem cart item = 
    match cart with
    | EmptyCart -> 
        // 1つの商品を持つ新しいアクティブカートを作る
        ActiveCart {UnpaidItems=[item]}
    | ActiveCart {UnpaidItems=existingItems} -> 
        // 商品を追加した新しいActiveCartを作る
        ActiveCart {UnpaidItems = item :: existingItems}
    | PaidCart _ ->  
        // 無視
        cart

let makePayment cart payment = 
    match cart with
    | EmptyCart -> 
        // 無視
        cart
    | ActiveCart {UnpaidItems=existingItems} -> 
        // 支払いを含む新しいPaidCartを作る
        PaidCart {PaidItems = existingItems; Payment=payment}
    | PaidCart _ ->  
        // 無視
        cart
```

呼び出し元から見ると、状態の集合は「一つのもの」（`ShoppingCart`型）として扱われ、汎用的に処理されます。しかし内部のイベント処理では、各状態が個別に扱われることがわかります。

### イベント処理関数の設計 

ガイドライン：*イベント処理関数は常にステートマシン全体を受け取り、返すべきです*

なぜイベント処理関数にショッピングカート全体を渡さなければならないか、疑問が生じるかもしれません。たとえば、 `makePayment` イベントはカートが `Active` 状態の時のみ関連するので、次のように `ActiveCart` 型を直接渡せば十分ではないでしょうか？

```fsharp
let makePayment2 activeCart payment = 
    let {UnpaidItems=existingItems} = activeCart
    {PaidItems = existingItems; Payment=payment}
```

関数のシグネチャを比較してみましょう。

```fsharp
// 元の関数 
val makePayment : ShoppingCart -> float -> ShoppingCart

// 新しいより具体的な関数
val makePayment2 :  ActiveCartData -> float -> PaidCartData
```

元の `makePayment` 関数はカートを受け取ってカートを返します。新しい関数は `ActiveCartData` を受け取って `PaidCartData` を返すため、より適切に見えるかもしれません。

しかし、このようにした場合、カートが空や支払い済みなど、異なる状態にあるときに、同じイベントをどのように処理するでしょうか？どこかで3つの状態すべてに対してイベントを処理する必要があります。この業務ロジックを関数内にカプセル化する方が、呼び出し元に任せるよりもはるかに適切です。

### 「生の」状態を扱う

時には、ある状態を独立したエンティティとして扱い、単独で使いたい場合があります。各状態も型であるため、通常は簡単です。

たとえば、支払い済みカートすべてのレポートを作る必要がある場合、 `PaidCartData` のリストを渡せます。

```fsharp
let paymentReport paidCarts = 
    let printOneLine {Payment=payment} = 
        printfn "商品に対して %f を支払いました" payment
    paidCarts |> List.iter printOneLine
```

パラメータとして `ShoppingCart` 自体ではなく `PaidCartData` のリストを使うことで、誤って未払いのカートについてレポートを作ることを防ぎます。

このような処理は、イベントハンドラーではなく、イベントハンドラーの補助関数で行うべきです。

<a name="replace-flags"></a>  


## ブール値フラグを明示的な状態に置き換える ##

それでは、このアプローチを実際の例に当てはめてみましょう。

[前の記事](../posts/designing-with-types-intro.md)で使った `Contact` の例では、顧客がメールアドレスを確認したかどうかを示すフラグがありました。
型の定義は以下のようになっていました。

```fsharp
type EmailContactInfo = 
    {
    EmailAddress: EmailAddress.T;
    IsEmailVerified: bool;
    }
```

このようなフラグを見かけるときは、おそらく状態を扱っているのでしょう。この場合、ブール値は「未確認」と「確認済み」という2つの状態を示すのに使われています。

先ほど述べたように、各状態で許可される操作ににはさまざまな業務ルールが関連しているでしょう。たとえば、次のような 2 つのルールが考えられます。

* 業務ルール：*「確認メールは、未確認のメールアドレスを持つ顧客にのみ送るべきだ」*
* 業務ルール：*「パスワードリセットメールは、確認済みのメールアドレスを持つ顧客にのみ送るべきだ」*

これまでと同じように、コードがこれらのルールに従うことを型を使って保証できます。

`EmailContactInfo` 型をステートマシンを使って書き直してみましょう。モジュールに入れることにします。

まず、2つの状態を定義します。

* 「未確認」状態では、必要なデータはメールアドレスだけです。
* 「確認済み」状態では、メールアドレスに加えて、確認された日付や最近のパスワードリセットの回数など、追加のデータを保持したい場合があります。このデータは「未確認」状態には関係がなく、見えるべきでもありません。

```fsharp
module EmailContactInfo = 
    open System

    // プレースホルダー
    type EmailAddress = string

    // UnverifiedData = メールアドレスのみ
    type UnverifiedData = EmailAddress

    // VerifiedData = メールアドレスと確認された時刻
    type VerifiedData = EmailAddress * DateTime 

    // 状態の集合
    type T = 
        | UnverifiedState of UnverifiedData
        | VerifiedState of VerifiedData

```

`UnverifiedData` 型には、今回は型エイリアスを使いました。今のところこれ以上複雑なことはしませんが、型エイリアスを使うことで目的が明確になり、リファクタリングにも役立ちます。

次に、新しいステートマシンの構築と、イベントの処理を見てみましょう。

* 構築は*常に*未確認のメールになるので、これは簡単です。
* 状態を遷移させるイベントは、「確認済み」イベントだけです。

```fsharp
module EmailContactInfo = 

    // 上記の型定義

    let create email = 
        // 作成時は未確認
        UnverifiedState email

    // 「確認済み」イベントを処理
    let verified emailContactInfo dateVerified = 
        match emailContactInfo with
        | UnverifiedState email ->
            // 確認済み状態の新しい情報を構築
            VerifiedState (email, dateVerified) 
        | VerifiedState _ ->
            // 無視
            emailContactInfo
```

[ここで説明した](../posts/match-expression.md)ように、match 式のすべての分岐が同じ型を返す必要があることに注意してください。そのため、「確認済み」状態を無視する場合でも、渡されたオブジェクトなど、何かを返す必要があります。

最後に、`sendVerificationEmail` と `sendPasswordReset` という2つのユーティリティ関数を書くことができます。

```fsharp
module EmailContactInfo = 

    // 上記の型と関数定義
    
    let sendVerificationEmail emailContactInfo = 
        match emailContactInfo with
        | UnverifiedState email ->
            // メールを送信
            printfn "メールを送信中"
        | VerifiedState _ ->
            // 何もしない
            ()

    let sendPasswordReset emailContactInfo = 
        match emailContactInfo with
        | UnverifiedState email ->
            // 無視
            ()
        | VerifiedState _ ->
            // パスワードリセットを送信
            printfn "パスワードリセットを送信中"
```

## 明示的なケースを使ってcase/switch文を置き換える ##

C# や Java では、状態を示すのに単純なブール値フラグだけでなく、 `int` や `enum` を使うこともよくあります。

たとえば、配送システムにおける荷物の状態を表す簡単な状態遷移図を考えてみましょう。荷物には3つの状態があります。

![状態遷移図。荷物配送](../assets/img/State_Delivery.png)

この図からは、明らかな業務ルールがいくつか読み取れます。

* *ルール：「配達中の荷物をトラックに積むことはできない」*
* *ルール：「すでに配達済みの荷物に署名することはできない」*

などです。

判別共用体を使わずにこの設計を表現する場合、次のように列挙体を使って状態を表すのが一般的です。

```fsharp
open System

type PackageStatus = 
    | Undelivered
    | OutForDelivery
    | Delivered

type Package = 
    {
    PackageId: int;
    PackageStatus: PackageStatus;
    DeliveryDate: DateTime;
    DeliverySignature: string;
    }
```

そして、「トラックに積む」と「署名済み」イベントを処理するコードは以下のようになるかもしれません。

```fsharp
let putOnTruck package = 
    {package with PackageStatus=OutForDelivery}

let signedFor package signature = 
    let {PackageStatus=packageStatus} = package 
    if (packageStatus = Undelivered) 
    then 
        failwith "荷物が配達中ではありません"
    else if (packageStatus = OutForDelivery) 
    then 
        {package with 
            PackageStatus=OutForDelivery;
            DeliveryDate = DateTime.UtcNow;
            DeliverySignature=signature;
            }
    else
        failwith "荷物はすでに配達済みです"
```

このコードには微妙なバグがいくつかあります。

* 「トラックに積む」イベントを処理する際、状態が*すでに* `OutForDelivery` や `Delivered` の場合、何が起こるべきかが明示的ではありません。
* 「署名済み」イベントを処理しているとき、他の状態も処理していますが、最後の `else` ブロックでは状態が3つしかないと仮定しており、明示的にテストしていません。新しい状態を追加した場合、このコードは正しく動作しません。
* 最後に、 `DeliveryDate` と `DeliverySignature` が基本構造の中に含まれているため、状態が `Delivered` でなくても、誤って設定できてしまいます。

しかし、F#の慣用的で型安全なアプローチは、データ構造の中に状態値を埋め込むのではなく、全体的な共用体型を使うことです。

```fsharp
open System

type UndeliveredData = 
    {
    PackageId: int;
    }

type OutForDeliveryData = 
    {
    PackageId: int;
    }

type DeliveredData = 
    {
    PackageId: int;
    DeliveryDate: DateTime;
    DeliverySignature: string;
    }

type Package = 
    | Undelivered of UndeliveredData 
    | OutForDelivery of OutForDeliveryData
    | Delivered of DeliveredData 
```

そして、イベントハンドラーは*必ず*すべてのケースを処理しなければなりません。

```fsharp
let putOnTruck package = 
    match package with
    | Undelivered {PackageId=id} ->
        OutForDelivery {PackageId=id}
    | OutForDelivery _ ->
        failwith "荷物はすでに配達中です"
    | Delivered _ ->
        failwith "荷物はすでに配達済みです"

let signedFor package signature = 
    match package with
    | Undelivered _ ->
        failwith "荷物は配達中ではありません"
    | OutForDelivery {PackageId=id} ->
        Delivered {
            PackageId=id; 
            DeliveryDate = DateTime.UtcNow;
            DeliverySignature=signature;
            }
    | Delivered _ ->
        failwith "荷物はすでに配達済みです"
```

*注：ここではエラー処理に `failwith` を使っています。実際のシステムでは、クライアント側でエラー処理を行うようにコードを修正するべきです。
コンストラクターエラーの処理については、[単一ケース判別共用体に関する記事](../posts/designing-with-types-single-case-dus.md)の議論を参照してください。*

## 明示的なケースを使って暗黙的な条件分岐コードを置き換える ##

最後に、システムに状態があるものの、暗黙的に条件分岐コードに組み込まれている場合がよくあります。

たとえば、注文を表す以下の型があるとします。

```fsharp
open System

type Order = 
    {
    OrderId: int;
    PlacedDate: DateTime;
    PaidDate: DateTime option;
    PaidAmount: float option;
    ShippedDate: DateTime option;
    ShippingMethod: string option;
    ReturnedDate: DateTime option;
    ReturnedReason: string option;
    }
```

注文には「新規」、「支払い済み」、「発送済み」、「返品」の状態があり、それぞれの遷移にはタイムスタンプや追加情報があることが想像できます。しかし、構造上は明示的に示されていません。

オプション型は、この型が多機能になりすぎていることを示唆しています。少なくともF#ではオプション型を使うことを強制されますが、C#やJavaでは `null` が使われるため、型定義からは必須かどうかわかりません。

それでは、このようなオプション型をテストして注文の状態を調べるような、見栄えの悪いコードを見てみましょう。

ここでも、注文の状態に依存する重要なビジネスロジックがありますが、さまざまな状態や遷移がどこにも明示的に文書化されていません。

```fsharp
let makePayment order payment = 
    if (order.PaidDate.IsSome)
    then failwith "注文はすでに支払い済みです"
    // 支払い情報を含む更新された注文を返す
    {order with 
        PaidDate=Some DateTime.UtcNow
        PaidAmount=Some payment
        }

let shipOrder order shippingMethod = 
    if (order.ShippedDate.IsSome)
    then failwith "注文はすでに発送済みです"
    // 発送情報を含む更新された注文を返す
    {order with 
        ShippedDate=Some DateTime.UtcNow
        ShippingMethod=Some shippingMethod
        }
```

*注：C#プログラムで `null` をテストするやりかたを直接的に移植したため、 `IsSome` を追加してオプション値が存在することをテストしています。しかし、 `IsSome` は見栄えが悪く危険です。使わないでください！*

より良いアプローチは、型を使って状態を明示的にすることです。

```fsharp
open System

type InitialOrderData = 
    {
    OrderId: int;
    PlacedDate: DateTime;
    }
type PaidOrderData = 
    {
    Date: DateTime;
    Amount: float;
    }
type ShippedOrderData = 
    {
    Date: DateTime;
    Method: string;
    }
type ReturnedOrderData = 
    {
    Date: DateTime;
    Reason: string;
    }

type Order = 
    | Unpaid of InitialOrderData 
    | Paid of InitialOrderData * PaidOrderData
    | Shipped of InitialOrderData * PaidOrderData * ShippedOrderData
    | Returned of InitialOrderData * PaidOrderData * ShippedOrderData * ReturnedOrderData
```

そして、イベント処理メソッドは次のような形になります。

```fsharp
let makePayment order payment = 
    match order with
    | Unpaid i -> 
        let p = {Date=DateTime.UtcNow; Amount=payment}
        // 支払い済みの注文を返す
        Paid (i,p)
    | _ ->
        printfn "注文はすでに支払い済みです"
        order

let shipOrder order shippingMethod = 
    match order with
    | Paid (i,p) -> 
        let s = {Date=DateTime.UtcNow; Method=shippingMethod}
        // 発送済みの注文を返す
        Shipped (i,p,s)
    | Unpaid _ ->
        printfn "注文は支払われていません"
        order
    | _ ->
        printfn "注文はすでに発送済みです"
        order
```

*注：ここではエラー処理に `printfn` を使っています。実際のシステムでは、別のアプローチを使ってください。*


## このアプローチを使うべきでない場合

どんな手法もそうですが、習得したものを[万能ツール](https://en.wikipedia.org/wiki/Law_of_the_instrument)のように扱わないよう注意する必要があります。

このアプローチは複雑さを増やすので、使い始める前に、メリットがデメリットを上回るかどうかを検討してください。

改めて、単純なステートマシンを使うのがメリットをもたらしそうな条件をまとめます。

* 相互に排他的な状態があり、それらの間に遷移がある。
* 遷移は外部イベントによってトリガーされる。
* 状態は網羅的である。つまり、他の選択肢はなく、常にすべてのケースを処理しなければならない。
* 各状態に関連するデータがあり、システムが別の状態にあるときにはアクセスできないようにすべきである。
* 状態に適用される静的なビジネスルールがある。

これらのガイドラインが当てはまらない例をいくつか見てみましょう。

**ドメインにおいて状態が重要でない場合**

ブログ投稿アプリケーションを考えてみましょう。通常、各ブログ投稿は「下書き」、「公開済み」などの状態を持ち、イベント（「公開」ボタンをクリックするなど）によって状態遷移がトリガーされます。

しかし、このためにわざわざステートマシンを作る価値はあるでしょうか。一般的には、ないでしょう。

確かに状態遷移はありますが、このためになにかロジックに変化はあるでしょうか。投稿者の観点からは、ほとんどのブログアプリは状態に基づいた制限を設けていません。
下書きの投稿も、公開済みの投稿と全く同じ方法で作れます。

システムの中で状態を気にするのは表示エンジンだけで、ドメイン層に到達する前にデータベース層で下書きをフィルタリングします。

ドメインロジックで状態を状態を特に意識する必要がないのであれば、ステートマシンは不要でしょう。

**状態遷移がアプリケーション外で発生する場合**

顧客管理アプリケーションでは、顧客を「見込み客」、「アクティブ」、「非アクティブ」などに分類するのが一般的です。

![状態遷移図。顧客の状態](../assets/img/State_Customer.png)

アプリケーションでは、これらの状態にビジネス上の意味があり、型システム（判別共用体など）で表現されるべきです。しかし、状態*遷移*は通常、アプリケーション自体の中では起こりません。たとえば、顧客が 6 か月間何も注文しなかった場合に非アクティブとして分類するかもしれません。そして、このルールは夜間のバッチジョブや、顧客レコードをデータベースから読み込む際に、データベース内の顧客レコードに適用されるでしょう。しかし、アプリケーションの観点からは、遷移はアプリケーション*内部*で起こるわけではないので、特別なステートマシンを作る必要はありません。

**動的なビジネスルール**

上記のリストの最後の項目は、「静的な」ビジネスルールを指しています。つまり、ルールはゆっくりとしか変更されないので、コード自体に埋め込んでも問題ないということです。

一方、ルールが動的で頻繁に変わる場合は、静的な型を作る手間をかける価値はないでしょう。

このような状況では、アクティブパターンや、専用のルールエンジンを使うことを検討してください。

## まとめ

この記事では、データ構造に明示的なフラグ（「IsVerified」）やステータスフィールド（「OrderStatus」）がある場合、または暗黙的な状態（多数のヌル許容型やオプション型で示唆される）がある場合、単純なステートマシンを使ってドメインオブジェクトをモデル化することを検討する価値があると説明しました。追加される複雑さについては、ほとんどの場合、状態を明示的に文書化し、すべてのケースを処理しないことによるエラーを排除することで埋め合わせることができます。