---
layout: post
title: "Reader モナドの再発明"
description: "または、自分だけの高次の世界をデザインする"
categories: ["パターン"]
seriesId: "Map, Bind, Apply なにもわからない"
seriesOrder: 6
---

この記事は、シリーズの6回目になります。
[最初の2つの記事](../posts/elevated-world.md)では、ジェネリックなデータ型を扱う上で重要な関数、`map`や`bind`などを紹介しました。
[3番目の記事](../posts/elevated-world-3.md)では、「アプリカティブ」スタイルと「モナディック」スタイルの違いを論じ、値と関数を一貫性を保ちつつ高次の世界に持ち上げる方法を説明しました。
[4番目](../posts/elevated-world-4.md)と[前回](../posts/elevated-world-5.md)の記事では、高次の値のリストを扱うための`traverse`と`sequence`を紹介し、
URLのダウンロードという実践的な例でそれらの使用方法を示しました。

この記事では、別の実践的な例を通じてシリーズを締めくくります。今回は扱いにくいコードに対処するため、独自の「高次の世界」を作り出してみましょう。
このアプローチは実は非常に一般的で、「Readerモナド」という名前が付いていることを学びます。

## シリーズの内容

このシリーズで触れる様々な関数へのショートカットリストです。

* **パート1：高次の世界への持ち上げ**
  * [`map`関数](../posts/elevated-world.md#map)
  * [`return`関数](../posts/elevated-world.md#return)
  * [`apply`関数](../posts/elevated-world.md#apply)
  * [`liftN`関数ファミリー](../posts/elevated-world.md#lift)
  * [`zip`関数とZipList世界](../posts/elevated-world.md#zip)
* **パート2：世界をまたぐ関数の合成方法**    
  * [`bind`関数](../posts/elevated-world-2.md#bind)
  * [リストはモナドではない。オプションもモナドではない。](../posts/elevated-world-2.md#not-a-monad)
* **パート3：コア関数の実際的な使い方**  
  * [独立データと依存データ](../posts/elevated-world-3.md#dependent)
  * [例：アプリカティブスタイルとモナディックスタイルを使ったバリデーション](../posts/elevated-world-3.md#validation)
  * [一貫した世界への持ち上げ](../posts/elevated-world-3.md#consistent)
  * [Kleisli世界](../posts/elevated-world-3.md#kleisli)
* **パート4：リストと高次の値の混合**    
  * [リストと高次の値の混合](../posts/elevated-world-4.md#mixing)
  * [`traverse`/`MapM`関数](../posts/elevated-world-4.md#traverse)
  * [`sequence`関数](../posts/elevated-world-4.md#sequence)
  * [アドホックな実装のレシピとしての「シーケンス」](../posts/elevated-world-4.md#adhoc)
  * [読みやすさ vs パフォーマンス](../posts/elevated-world-4.md#readability)
  * [ねえ、`filter`はどこ？](../posts/elevated-world-4.md#filter)
* **パート5：すべてのテクニックを使用する実世界の例**    
  * [例：Webサイトのリストのダウンロードと処理](../posts/elevated-world-5.md#asynclist)
  * [2つの世界を1つとして扱う](../posts/elevated-world-5.md#asyncresult)
* **パート6：独自の高次の世界を設計する** 
  * [独自の高次の世界を設計する](../posts/elevated-world-6.md#part6)
  * [失敗のフィルタリング](../posts/elevated-world-6.md#filtering)
  * [Readerモナド](../posts/elevated-world-6.md#readermonad)
* **パート7：まとめ** 
  * [言及した演算子のリスト](../posts/elevated-world-7.md#operators)
  * [補足文献](../posts/elevated-world-7.md#further-reading)

<a id="part6"></a>
<hr>
  
## パート6: 独自の高次の世界を設計する

このポストでは、以下のようなシナリオを扱います。

*顧客があなたのサイトを訪れ、購入した製品に関する情報を閲覧したい。*

この例では、キー/バリューストア（RedisやNoSqlデータベースなど）のAPIがあり、
必要な情報がすべてそこに格納されていると仮定します。

したがって、必要なコードは以下のようになります。

```text
APIコネクションを開く
APIを使って、顧客IDから購入済み製品IDを取得する
各製品IDに対して、
    APIを使ってその製品IDの製品情報を取得する
APIコネクションを閉じる
製品情報のリストを返す
```
  
これがどれほど難しいことでしょうか？  

実際には、意外なほど複雑です。幸いなことに、このシリーズで紹介した概念を使って簡単にする方法があります。

<a id="apidomain"></a>
<hr>

## ドメイン型とダミーのApiClientを定義する

まずドメインの型を定義しましょう。

* `CustomerId`と`ProductId`があります。
* 製品情報については、`ProductName`フィールドを持つ単純な`ProductInfo`を定義します。

以下が型です。

```fsharp
type CustId = CustId of string
type ProductId = ProductId of string
type ProductInfo = {ProductName: string; } 
```

APIのテストのために、静的な可変ディクショナリをバックエンドとする`Get`メソッドと`Set`メソッドを持つ`ApiClient`クラスを作成しましょう。
これはRedisクライアントなどの類似のAPIに基づいています。

注意点：

* `Get`と`Set`はどちらもオブジェクトを扱うので、キャスト機構を追加しました。
* キャストの失敗やキーが見つからないなどのエラーに対応するため、このシリーズで使ってきた`Result`型を採用しています。
したがって、`Get`と`Set`は単純なオブジェクトではなく`Result`を返します。
* より実際の使用に近づけるため、`Open`、`Close`、`Dispose`のダミーメソッドも追加しています。
* すべてのメソッドはログをコンソールに出力します。

```fsharp
type ApiClient() =
    // 静的な保存領域
    static let mutable data = Map.empty<string,obj>

    /// 値のキャストを試みる
    /// 値が成功した場合はSuccessを、失敗した場合はFailureを返す
    member private this.TryCast<'a> key (value:obj) =
        match value with
        | :? 'a as a ->
            Result.Success a 
        | _  ->                 
            let typeName = typeof<'a>.Name
            Result.Failure [sprintf "%sの値を%sにキャストできません" key typeName]

    /// 値を取得する
    member this.Get<'a> (id:obj) = 
        let key =  sprintf "%A" id
        printfn "[API] %sを取得" key
        match Map.tryFind key data with
        | Some o -> 
            this.TryCast<'a> key o
        | None -> 
            Result.Failure [sprintf "キー%sが見つかりません" key]

    /// 値を設定する
    member this.Set (id:obj) (value:obj) = 
        let key =  sprintf "%A" id
        printfn "[API] %sを設定" key
        if key = "bad" then  // 失敗パスのテスト用
            Result.Failure [sprintf "不正なキー %s " key]
        else
            data <- Map.add key value data 
            Result.Success ()
           
    member this.Open() =
        printfn "[API] オープン中"

    member this.Close() =
        printfn "[API] クローズ中"

    interface System.IDisposable with
        member this.Dispose() =
            printfn "[API] 破棄中"
```


いくつかテストをしてみましょう。

```fsharp
do
    use api = new ApiClient()
    api.Get "K1" |> printfn "[K1] %A"

    api.Set "K2" "hello" |> ignore
    api.Get<string> "K2" |> printfn "[K2] %A"

    api.Set "K3" "hello" |> ignore
    api.Get<int> "K3" |> printfn "[K3] %A"
```

結果は以下のとおりです。

```text
[API] "K1"を取得
[K1] Failure ["キー"K1"が見つかりません"]
[API] "K2"を設定
[API] "K2"を取得
[K2] Success "hello"
[API] "K3"を設定
[API] "K3"を取得
[K3] Failure ["K3"の値をInt32にキャストできません"]
[API] 破棄中
```
  
<a id="impl1"></a>
<hr>

## 最初の実装の試み 

このシナリオの最初の実装として、先ほどの擬似コードをベースに始めてみましょう。

```fsharp
let getPurchaseInfo (custId:CustId) : Result<ProductInfo list> =

    // APIコネクションを開く       
    use api = new ApiClient()
    api.Open()

    // 顧客IDで購入した製品IDを取得する
    let productIdsResult = api.Get<ProductId list> custId

    let productInfosResult = ??

    // APIコネクションを閉じる
    api.Close()

    // 製品情報のリストを返す
    productInfosResult
```

ここまではうまくいっていますが、すでに少し問題があります。 

`getPurchaseInfo`関数は入力として`CustId`を受け取りますが、単に`ProductInfo`のリストを出力することはできません。失敗の可能性があるからです。
つまり、戻り値の型は`Result<ProductInfo list>`である必要があります。

では、`productInfosResult`をどのように作成すればよいでしょうか？  

簡単なはずです。`productIdsResult`が成功の場合、各IDをループして各IDの情報を取得します。
`productIdsResult`が失敗の場合は、その失敗をそのまま返します。

```fsharp
let getPurchaseInfo (custId:CustId) : Result<ProductInfo list> =

    // APIコネクションを開く       
    use api = new ApiClient()
    api.Open()

    // 顧客IDで購入した製品IDを取得する
    let productIdsResult = api.Get<ProductId list> custId

    let productInfosResult =
        match productIdsResult with
        | Success productIds -> 
            let productInfos = ResizeArray()  // .NET List<T>と同じ
            for productId in productIds do
                let productInfo = api.Get<ProductInfo> productId
                productInfos.Add productInfo  // ミューテーション！ 
            Success productInfos
        | Failure err ->    
            Failure err 

    // APIコネクションを閉じる
    api.Close()
    
    // 製品情報のリストを返す
    productInfosResult
```

うーん。少し扱いにくくなってきました。各製品情報を蓄積し、それを`Success`でラップするために可変データ構造（`productInfos`）を使わなければなりません。

さらに悪いことに、`api.Get<ProductInfo>`から取得している`productInfo`は`ProductInfo`ではなく`Result<ProductInfo>`なので、
`productInfos`は全く正しい型ではありません！

各`ProductInfo`結果をテストするコードを追加しましょう。成功の場合は製品情報のリストに追加し、失敗の場合はその失敗を返します。

```fsharp
let getPurchaseInfo (custId:CustId) : Result<ProductInfo list> =

    // APIコネクションを開く       
    use api = new ApiClient()
    api.Open()

    // 顧客IDで購入した製品IDを取得する
    let productIdsResult = api.Get<ProductId list> custId

    let productInfosResult =
        match productIdsResult with
        | Success productIds -> 
            let productInfos = ResizeArray()  // .NET List<T>と同じ
            let mutable anyFailures = false
            for productId in productIds do
                let productInfoResult = api.Get<ProductInfo> productId
                match productInfoResult with
                | Success productInfo ->
                    productInfos.Add productInfo 
                | Failure err ->    
                    Failure err 
            Success productInfos
        | Failure err ->    
            Failure err 

    // APIコネクションを閉じる
    api.Close()

    // 製品情報のリストを返す
    productInfosResult

```

いや、これはまったくうまくいきません。上のコードはコンパイルできません。失敗が発生したときにループ内で「早期リターン」できません。

結局どうなったでしょうか？コンパイルすらできない、非常に扱いにくいコードになってしまいました。

もっと良い方法があるはずです。

<a id="impl2"></a>
<hr>

## 2回目の実装の試み 

`Result`の展開とテストをすべて隠せたら便利ですね。実はそれが可能です。コンピュテーション式を使えば実現できます。

`Result`用のコンピュテーション式を作成すると、以下のようにコードを書けます。

```fsharp
/// CustId -> Result<ProductInfo list>
let getPurchaseInfo (custId:CustId) : Result<ProductInfo list> =
   
    // APIコネクションを開く       
    use api = new ApiClient()
    api.Open()

    let productInfosResult = Result.result {

        // 顧客IDで購入した製品IDを取得する
        let! productIds = api.Get<ProductId list> custId

        let productInfos = ResizeArray()  // .NET List<T>と同じ
        for productId in productIds do
            let! productInfo = api.Get<ProductInfo> productId
            productInfos.Add productInfo 
        return productInfos |> List.ofSeq
        }

    // APIコネクションを閉じる
    api.Close()

    // 製品情報のリストを返す
    productInfosResult
```

`let productInfosResult = Result.result { .. }`というコードで、`result`コンピュテーション式を作成しています。これにより、`let!`による展開と`return`によるラッピングがすべて簡素化されます。

そのため、この実装には明示的な`xxxResult`値がどこにもありません。しかし、蓄積のために可変コレクションクラスを使用する必要があります。
`for productId in productIds do`は実際には本当の`for`ループではなく、たとえば`List.map`で置き換えることはできないからです。

### `result`コンピュテーション式 

ここで、`result`コンピュテーション式の実装について触れてみましょう。前回の記事では、`ResultBuilder`には`Return`と`Bind`の2つのメソッドしかありませんでしたが、
`for..in..do`機能を実現するには、他にもたくさんのメソッドを実装する必要があり、少し複雑になります。

```fsharp
module Result = 

    let bind f xResult = ...
    
    type ResultBuilder() =
        member this.Return x = retn x
        member this.ReturnFrom(m: Result<'T>) = m
        member this.Bind(x,f) = bind f x

        member this.Zero() = Failure []
        member this.Combine (x,f) = bind f x
        member this.Delay(f: unit -> _) = f
        member this.Run(f) = f()

        member this.TryFinally(m, compensation) =
            try this.ReturnFrom(m)
            finally compensation()

        member this.Using(res:#System.IDisposable, body) =
            this.TryFinally(body res, fun () -> 
            match res with 
            | null -> () 
            | disp -> disp.Dispose())

        member this.While(guard, f) =
            if not (guard()) then 
                this.Zero() 
            else
                this.Bind(f(), fun _ -> this.While(guard, f))

        member this.For(sequence:seq<_>, body) =
            this.Using(sequence.GetEnumerator(), fun enum -> 
                this.While(enum.MoveNext, this.Delay(fun () -> 
                    body enum.Current)))

    let result = new ResultBuilder()
```

コンピュテーション式の内部については、[別のシリーズ](../series/computation-expressions.md)で詳しく説明しているので、
ここでこのコード全体を説明するつもりはありません。代わりに、この投稿の残りの部分では
`getPurchaseInfo`のリファクタリングに取り組みます。最終的には`result`コンピュテーション式がまったく必要ないことがわかるでしょう。

<a id="impl3"></a>
<hr>

## 関数のリファクタリング

現在の`getPurchaseInfo`関数には問題があります。`ApiClient`の作成とその使用という、本来分離すべき2つの役割を1つの関数で行っているのです。

このアプローチには以下のような問題があります。

* APIを使って異なる作業をしたい場合、このコードのopen/close部分を繰り返さなければなりません。
  そして、実装の一つがAPIを開いたが閉じ忘れる可能性があります。
* モックAPIクライアントでテストできません。

これらの問題は、`ApiClient`の作成をその使用から分離し、アクションをパラメータ化することで解決できます。以下のようにしてみましょう。

```fsharp
let executeApiAction apiAction  =
   
    // APIコネクションを開く       
    use api = new ApiClient()
    api.Open()

    // それを使って何かを行う
    let result = apiAction api

    // APIコネクションを閉じる
    api.Close()

    // 結果を返す
    result
```

渡されるアクション関数は、`ApiClient`用のパラメータと`CustId`用のパラメータを含む、以下のようなものになります。

```fsharp
/// CustId -> ApiClient -> Result<ProductInfo list>
let getPurchaseInfo (custId:CustId) (api:ApiClient) =
   
    let productInfosResult = Result.result {
        let! productIds = api.Get<ProductId list> custId

        let productInfos = ResizeArray()  // .NET List<T>と同じ
        for productId in productIds do
            let! productInfo = api.Get<ProductInfo> productId
            productInfos.Add productInfo 
        return productInfos |> List.ofSeq
        }

    // 結果を返す
    productInfosResult
```

`getPurchaseInfo`には*2つの*パラメータがありますが、`executeApiAction`は1つだけのパラメータを期待する関数を想定していることに注意してください。

心配ありません。部分適用を使って最初のパラメータを固定すれば解決します。

```fsharp
let action = getPurchaseInfo (CustId "C1")  // 部分適用
executeApiAction action 
```

これが、パラメータリストで`ApiClient`が*2番目*のパラメータである理由です。部分適用ができるようにするためです。

### さらなるリファクタリング

製品IDを他の目的で取得する必要があるかもしれませんし、製品情報も同様です。これらを別の関数に分割してリファクタリングしてみましょう。

```fsharp
/// CustId -> ApiClient -> Result<ProductId list>
let getPurchaseIds (custId:CustId) (api:ApiClient) =
    api.Get<ProductId list> custId

/// ProductId -> ApiClient -> Result<ProductInfo>
let getProductInfo (productId:ProductId) (api:ApiClient) =
    api.Get<ProductInfo> productId

/// CustId -> ApiClient -> Result<ProductInfo list>
let getPurchaseInfo (custId:CustId) (api:ApiClient) =
   
    let result = Result.result {
        let! productIds = getPurchaseIds custId api 

        let productInfos = ResizeArray()  
        for productId in productIds do
            let! productInfo = getProductInfo productId api
            productInfos.Add productInfo 
        return productInfos |> List.ofSeq
        }

    // 結果を返す
    result
```

これで、`getPurchaseIds`と`getProductInfo`という素晴らしい中核的な関数ができましたが、`getPurchaseInfo`の中でこれらをつなぎ合わせるのに乱雑なコードを書かなければならないのが気になります。

理想を言えば、`getPurchaseIds`の出力を`getProductInfo`にパイプで渡せるような、次のようなコードを書きたいところです。

```fsharp
let getPurchaseInfo (custId:CustId) =
    custId 
    |> getPurchaseIds 
    |> List.map getProductInfo
```

図で表すと以下のようになります。

![](@assets/img/vgfp_api_pipe.png)

ところが、これには2つの障害があります。

* まず、`getProductInfo`には*2つ*のパラメータがあります。`ProductId`だけでなく`ApiClient`もです。
* 次に、`ApiClient`がなかったとしても、`getProductInfo`の入力は単純な`ProductId`ですが、`getPurchaseIds`の出力は`Result`です。

これら両方の問題を解決できたら素晴らしいですね！

<a id="apiAction"></a>
<hr>

## 独自の高次の世界の導入

最初の問題に取り組みましょう。追加の`ApiClient`パラメータが邪魔をしているとき、関数をどのように合成すればよいでしょうか？

典型的なAPI呼び出し関数は以下のようになっています。

![](@assets/img/vgfp_api_action1.png)

型シグネチャを見ると、2つのパラメータを含む関数だとわかります。

![](@assets/img/vgfp_api_action2.png)

しかし、この関数を解釈する*もう1つの*方法があります。1つのパラメータを含む関数で、別の関数を返すものとして見ることです。返される関数は`ApiClient`パラメータを含み、
最終的な出力を返します。

![](@assets/img/vgfp_api_action3.png)

次のように考えることもできます。今は入力がありますが、実際の`ApiClient`は後で得られるので、
今すぐに`ApiClient`を必要とせずに、入力を使ってAPIを消費する関数を作成し、それを様々な方法で組み合わせられます。

このAPIを消費する関数に名前を付けましょう。`ApiAction`とします。

![](@assets/img/vgfp_api_action4.png)

実際、それ以上のことをしてみましょう。型にしてしまうのです！

```fsharp
type ApiAction<'a> = (ApiClient -> 'a)
```

しかし、このままでは単なる関数の型エイリアスにすぎず、独立した型ではありません。
そこで、[単一ケースの判別共用体](../posts/designing-with-types-single-case-dus.md)でラップし、独立した型として定義する必要があります。

```fsharp
type ApiAction<'a> = ApiAction of (ApiClient -> 'a)
```

### ApiActionを使って書き直す

実際の型ができたので、中核となるドメイン関数をApiActionを使って書き直してみましょう。

まず`getPurchaseIds`から取り掛かりましょう。

```fsharp
// CustId -> ApiAction<Result<ProductId list>>
let getPurchaseIds (custId:CustId) =
       
    // APIを消費する関数を作成
    let action (api:ApiClient) = 
        api.Get<ProductId list> custId

    // 単一ケースでラップ
    ApiAction action
```

シグネチャは`CustId -> ApiAction<Result<ProductId list>>`となり、
これは「CustIdを与えると、後でAPIが提供されたときにProductIdのリストを作るApiActionを返す」と解釈できます。

同様に、`getProductInfo`もApiActionを返すように書き換えてみましょう。

```fsharp
// ProductId -> ApiAction<Result<ProductInfo>>
let getProductInfo (productId:ProductId) =

    // APIを消費する関数を作成
    let action (api:ApiClient) = 
        api.Get<ProductInfo> productId

    // 単一ケースでラップ
    ApiAction action
```

これらのシグネチャに注目してください。

* `CustId -> ApiAction<Result<ProductId list>>`
* `ProductId -> ApiAction<Result<ProductInfo>>`

これは見覚えがありませんか？前回の投稿で`Async<Result<_>>`で見たものとよく似ています。

### ApiActionを高次の世界として扱う

これら2つの関数に関わる様々な型の図を描くと、`ApiAction`が`List`や`Result`と同じように高次の世界であることが明確に分かります。
そして、これは以前と同じテクニックを使えるはずだということを意味します。`map`、`bind`、`traverse`などです。

`getPurchaseIds`をスタック図で表すと、入力は`CustId`で、出力は`ApiAction<Result<List<ProductId>>>`です。

![](@assets/img/vgfp_api_getpurchaseids.png)

そして`getProductInfo`では、入力は`ProductId`で、出力は`ApiAction<Result<ProductInfo>>`です。

![](@assets/img/vgfp_api_getproductinfo.png)

私たちが求めている結合関数`getPurchaseInfo`は、以下のようになるはずです。

![](@assets/img/vgfp_api_getpurchaseinfo.png)

そして今、2つの関数を合成する際の問題が非常に明確になりました。`getPurchaseIds`の出力は`getProductInfo`の入力として使用できません。

![](@assets/img/vgfp_api_noncompose.png)

しかし、方法はあります。これらの層を操作して一致させれば、簡単に合成できるはずです。

そこで次に取り組むのはこれです。

### ApiActionResultの導入

前回の投稿で`Async`と`Result`を`AsyncResult`という複合型にマージしました。ここでも同じように、`ApiActionResult`型を作れます。

この変更を加えると、2つの関数はより単純になります。

![](@assets/img/vgfp_api_apiactionresult_functions.png)

図は十分でしょう。ここからはコードを書いていきます。

まず、`ApiAction`のための`map`、`apply`、`return`、`bind`を定義する必要があります。

```fsharp
module ApiAction = 

    /// 与えられたAPIでアクションを評価
    /// ApiClient -> ApiAction<'a> -> 'a
    let run api (ApiAction action) = 
        let resultOfAction = action api
        resultOfAction

    /// ('a -> 'b) -> ApiAction<'a> -> ApiAction<'b>
    let map f action = 
        let newAction api =
            let x = run api action 
            f x
        ApiAction newAction

    /// 'a -> ApiAction<'a>
    let retn x = 
        let newAction api =
            x
        ApiAction newAction

    /// ApiAction<('a -> 'b)> -> ApiAction<'a> -> ApiAction<'b>
    let apply fAction xAction = 
        let newAction api =
            let f = run api fAction 
            let x = run api xAction 
            f x
        ApiAction newAction

    /// ('a -> ApiAction<'b>) -> ApiAction<'a> -> ApiAction<'b>
    let bind f xAction = 
        let newAction api =
            let x = run api xAction 
            run api (f x)
        ApiAction newAction

    /// ApiClientを作成し、そのアクションを実行
    /// ApiAction<'a> -> 'a
    let execute action =
        use api = new ApiClient()
        api.Open()
        let result = run api action
        api.Close()
        result
```

すべての関数が`run`というヘルパー関数を使用していることに注意してください。これは`ApiAction`をアンラップして内部の関数を取得し、
これを渡された`api`に適用します。結果は`ApiAction`にラップされた値です。

たとえば、`ApiAction<int>`があれば、`run api myAction`の結果は`int`になります。

そして最後に、`ApiClient`を作成し、接続を開き、アクションを実行し、接続を閉じる`execute`関数があります。

`ApiAction`のコア関数が定義されたので、[前回の投稿](../posts/elevated-world-5.md#asyncresult)で`AsyncResult`に対して行ったのと同じように、
複合型`ApiActionResult`のための関数を定義できます。

```fsharp
module ApiActionResult = 

    let map f  = 
        ApiAction.map (Result.map f)

    let retn x = 
        ApiAction.retn (Result.retn x)

    let apply fActionResult xActionResult = 
        let newAction api =
            let fResult = ApiAction.run api fActionResult 
            let xResult = ApiAction.run api xActionResult 
            Result.apply fResult xResult 
        ApiAction newAction

    let bind f xActionResult = 
        let newAction api =
            let xResult = ApiAction.run api xActionResult 
            // xResultに基づいて新しいアクションを作成
            let yAction = 
                match xResult with
                | Success x -> 
                    // 成功？関数を実行
                    f x
                | Failure err -> 
                    // 失敗？エラーをApiActionにラップ
                    (Failure err) |> ApiAction.retn
            ApiAction.run api yAction  
        ApiAction newAction
```

## 変換の決定

これで必要なツールがすべて揃いました。次は`getProductInfo`の形を変えるためにどの変換を使うべきか決める必要があります。

`map`、`bind`、`traverse`のどれを選ぶべきでしょうか？

スタックを視覚的に操作して、各種の変換で何が起こるかを確認します。

始める前に、達成しようとしていることを明確にしましょう。

* `getPurchaseIds`と`getProductInfo`という2つの関数があり、これらを1つの関数`getPurchaseInfo`に結合したいです。
* `getProductInfo`の*左側*（入力）を操作して、`getPurchaseIds`の出力と一致するようにする必要があります。
* `getProductInfo`の*右側*（出力）を操作して、理想的な`getPurchaseInfo`の出力と一致するようにする必要があります。

![](@assets/img/vgfp_api_wanted.png)

### Map

念のため、`map`は両側に新しいスタックを追加します。たとえば、このような一般的な世界をまたぐ関数から始めます。

![](@assets/img/vgfp_api_generic.png)

`List.map`を使用すると、各側に新しい`List`スタックが追加されます。

![](@assets/img/vgfp_api_map_generic.png)

変換前の`getProductInfo`はこのようになっています。

![](@assets/img/vgfp_api_getproductinfo2.png)

そして`List.map`を使用した後はこのようになります。

![](@assets/img/vgfp_api_map_getproductinfo.png)

これは有望に見えるかもしれません - 入力として`ProductId`の`List`ができました。そして上に`ApiActionResult`を重ねれば、`getPurchaseId`の出力と一致するでしょう。

しかし、出力が間違っています。`ApiActionResult`を一番上に保ちたいのです。つまり、`ApiActionResult`の`List`ではなく、`List`の`ApiActionResult`が欲しいのです。

### Bind

では、`bind`はどうでしょうか？

覚えていますか。`bind`は「対角線」状の関数を水平方向の関数に変換します。この変換は、*左側*に新しいスタックを追加することで実現します。
具体的には、右側の最上位にある高次の世界が、そのまま左側に追加されます。

![](@assets/img/vgfp_api_generic.png)

![](@assets/img/vgfp_api_bind_generic.png)

そして、`ApiActionResult.bind`を使用した後の`getProductInfo`はこのようになります。

![](@assets/img/vgfp_api_bind_getproductinfo.png)

これは我々には役に立ちません。入力として`ProductId`の`List`が必要です。

### Traverse

最後に、`traverse`を試してみましょう。

`traverse`は値の対角線関数をリストで包まれた値の対角線関数に変換します。具体的には、`List`が左側の一番上のスタックとして追加されます。
同時に、右側では上から2番目のスタックとして追加されます。

![](@assets/img/vgfp_api_generic.png)

![](@assets/img/vgfp_api_traverse_generic.png)

`getProductInfo`にこれを適用すると、非常に有望な結果が得られます。 

![](@assets/img/vgfp_api_traverse_getproductinfo.png)

入力は必要なリストになっています。そして出力は完璧です。`ApiAction<Result<List<ProductInfo>>>`が欲しかったのですが、今それができました。

あとは左側に`ApiActionResult`を追加するだけです。

これも先ほど見ました。それは`bind`です。これも適用すれば完成です。

![](@assets/img/vgfp_api_complete_getproductinfo.png)

コードで表現すると、次のようになります。

```fsharp
let getPurchaseInfo =
    let getProductInfo1 = traverse getProductInfo
    let getProductInfo2 = ApiActionResult.bind getProductInfo1 
    getPurchaseIds >> getProductInfo2
```

もう少し見栄えを良くすると、このようになります。

```fsharp
let getPurchaseInfo =
    let getProductInfoLifted =
        getProductInfo
        |> traverse 
        |> ApiActionResult.bind 
    getPurchaseIds >> getProductInfoLifted
```

`getPurchaseInfo`の以前のバージョンと比較してみましょう。

```fsharp
let getPurchaseInfo (custId:CustId) (api:ApiClient) =
   
    let result = Result.result {
        let! productIds = getPurchaseIds custId api 

        let productInfos = ResizeArray()  
        for productId in productIds do
            let! productInfo = getProductInfo productId api
            productInfos.Add productInfo 
        return productInfos |> List.ofSeq
        }

    // 結果を返す
    result
```

2つのバージョンを表で比較してみましょう。

<table class="table table-condensed table-striped">
<tr>
<th>以前のバージョン</th>
<th>最新の関数</th>
</tr>
<tr>
<td>複合関数が複雑で、2つの小さな関数を結合するために特別なコードが必要</td>
<td>複合関数は単なるパイプと関数合成</td>
</tr>
<tr>
<td>"result"コンピュテーション式を使用</td>
<td>特別な構文が不要</td>
</tr>
<tr>
<td>結果をループ処理するための特別なコードあり</td>
<td>"traverse"を使用</td>
</tr>
<tr>
<td>製品情報のリストを蓄積するための中間的な（そして可変な）Listオブジェクトを使用</td>
<td>中間値が不要。単純なデータパイプライン</td>
</tr>
</table>


### traverseの実装

上記のコードでは`traverse`を使っていますが、まだ実装していませんでした。
前述したように、これはテンプレートに従って機械的に実装できます。

以下がその実装です。

```fsharp
let traverse f list =
    // アプリカティブ関数を定義
    let (<*>) = ApiActionResult.apply
    let retn = ApiActionResult.retn

    // "cons"関数を定義
    let cons head tail = head :: tail

    // リストを右畳み込み
    let initState = retn []
    let folder head tail = 
        retn cons <*> f head <*> tail

    List.foldBack folder list initState 
```

### 実装のテスト

テストしてみましょう！

まず、結果を表示するためのヘルパー関数が必要です。

```fsharp
let showResult result =
    match result with
    | Success (productInfoList) -> 
        printfn "成功： %A" productInfoList
    | Failure errs -> 
        printfn "失敗： %A" errs
```

次に、APIにテストデータを読み込む必要があります。

```fsharp
let setupTestData (api:ApiClient) =
    //購入をセットアップ
    api.Set (CustId "C1") [ProductId "P1"; ProductId "P2"] |> ignore
    api.Set (CustId "C2") [ProductId "PX"; ProductId "P2"] |> ignore

    //製品情報をセットアップ
    api.Set (ProductId "P1") {ProductName="P1-名前"} |> ignore
    api.Set (ProductId "P2") {ProductName="P2-名前"} |> ignore
    // P3は欠落

// setupTestDataはAPIを消費する関数なので
// ApiActionに入れて
// そのapiActionを実行できます
let setupAction = ApiAction setupTestData
ApiAction.execute setupAction 
```

* 顧客C1は製品P1とP2を購入しています。
* 顧客C2は製品PXとP2を購入しています。
* 製品P1とP2には情報があります。
* 製品PXには情報がありません。

異なる顧客IDでどのように動作するか確認してみましょう。

顧客C1から始めましょう。この顧客については、両方の製品情報が返されることを期待しています。

```fsharp
CustId "C1"
|> getPurchaseInfo
|> ApiAction.execute
|> showResult
```

結果は以下のとおりです。

```text
[API] オープン中
[API] CustId "C1"を取得
[API] ProductId "P1"を取得
[API] ProductId "P2"を取得
[API] クローズ中
[API] 破棄中
成功： [{ProductName = "P1-名前";}; {ProductName = "P2-名前";}]
```

存在しない顧客、たとえばCXを使用するとどうなるでしょうか？

```fsharp
CustId "CX"
|> getPurchaseInfo
|> ApiAction.execute
|> showResult
```

予想通り、キーが見つからないという適切な失敗が発生し、キーが見つからない時点で残りの操作はスキップされます。

```text
[API] オープン中
[API] CustId "CX"を取得
[API] クローズ中
[API] 破棄中
失敗： ["キーCustId "CX"が見つかりません"]
```

購入した製品の1つに情報がない場合はどうでしょうか？たとえば、顧客C2はPXとP2を購入しましたが、PXには情報がありません。

```fsharp
CustId "C2"
|> getPurchaseInfo
|> ApiAction.execute
|> showResult
```

全体の結果は失敗です。1つでも不良な製品があると、操作全体が失敗します。

```text
[API] オープン中
[API] CustId "C2"を取得
[API] ProductId "PX"を取得
[API] ProductId "P2"を取得
[API] クローズ中
[API] 破棄中
失敗： ["キーProductId "PX"が見つかりません"]
```

しかし、製品PXが失敗したにもかかわらず、製品P2のデータが取得されていることに注目してください。なぜでしょうか？アプリカティブバージョンの`traverse`を使用しているため、
リストの各要素が「並列に」取得されるからです。

PXが存在することを確認してからP2を取得したい場合は、代わりにモナディックスタイルを使用する必要があります。モナディックバージョンの`traverse`の書き方はすでに見ましたので、
それは練習問題としてあなたに任せます！

<a id="filtering"></a>
<hr>
  
## 失敗のフィルタリング

上記の実装では、1つでも製品が見つからない場合に`getPurchaseInfo`関数が失敗してしまいます。少し厳しすぎるようです。

実際のアプリケーションではもっと寛容でしょう。
おそらく、失敗した製品はログに記録されますが、成功したものはすべて蓄積されて返されるべきです。

これをどのように実現できるでしょうか？

答えは簡単です。失敗をスキップするように`traverse`関数を修正するだけです。

まず、`ApiActionResult`用の新しいヘルパー関数を作成する必要があります。
これにより、成功の場合と失敗の場合の2つの関数を渡せます。

```fsharp
module ApiActionResult = 

    let map = ...
    let retn =  ...
    let apply = ...
    let bind = ...

    let either onSuccess onFailure xActionResult = 
        let newAction api =
            let xResult = ApiAction.run api xActionResult 
            let yAction = 
                match xResult with
                | Result.Success x -> onSuccess x 
                | Result.Failure err -> onFailure err
            ApiAction.run api yAction  
        ApiAction newAction
```

このヘルパー関数は、`ApiAction`内の両方のケースを複雑なアンラッピングなしでマッチングするのに役立ちます。失敗をスキップする`traverse`を実装する際に、この関数が必要になります。

ちなみに、`ApiActionResult.bind`は`either`を使って定義できます。

```fsharp
let bind f = 
    either 
        // 成功？関数を実行
        (fun x -> f x)
        // 失敗？エラーをApiActionにラップ
        (fun err -> (Failure err) |> ApiAction.retn)
```

これで、「失敗のログ付きtraverse」関数を定義できます。

```fsharp
let traverseWithLog log f list =
    // アプリカティブ関数を定義
    let (<*>) = ApiActionResult.apply
    let retn = ApiActionResult.retn

    // "cons"関数を定義
    let cons head tail = head :: tail

    // リストを右畳み込み
    let initState = retn []
    let folder head tail = 
        (f head) 
        |> ApiActionResult.either 
            (fun h -> retn cons <*> retn h <*> tail)
            (fun errs -> log errs; tail)
    List.foldBack folder list initState 
```

前回の実装と異なるのは、次の部分だけです。

```fsharp
let folder head tail = 
    (f head) 
    |> ApiActionResult.either 
        (fun h -> retn cons <*> retn h <*> tail)
        (fun errs -> log errs; tail)
```

これは以下のことを意味します。

* 新しい先頭要素（`f head`）が成功の場合、内部の値（`retn h`）を持ち上げ、それをtailと`cons`して新しいリストを作ります。
* しかし、新しい先頭要素が失敗の場合、渡されたログ関数（`log`）で内部のエラー（`errs`）をログに記録し、
  現在のtailをそのまま使用します。
  このようにして、失敗した要素はリストに追加されませんが、全体の関数を失敗させることもありません。

新しい関数`getPurchasesInfoWithLog`を作成し、顧客C2と欠落した製品PXで試してみましょう。

```fsharp
let getPurchasesInfoWithLog =
    let log errs = printfn "スキップしました %A" errs 
    let getProductInfoLifted =
        getProductInfo 
        |> traverseWithLog log 
        |> ApiActionResult.bind 
    getPurchaseIds >> getProductInfoLifted

CustId "C2"
|> getPurchasesInfoWithLog
|> ApiAction.execute
|> showResult
```

結果は成功になりましたが、P2の`ProductInfo`のみが返されています。ログにはPXがスキップされたことが示されています。

```text
[API] オープン中
[API] CustId "C2"を取得
[API] ProductId "PX"を取得
スキップしました ["キーProductId "PX"が見つかりません"]
[API] ProductId "P2"を取得
[API] クローズ中
[API] 破棄中
成功： [{ProductName = "P2-名前";}]
```

<a id="readermonad"></a>
<hr>
  
## Readerモナド

`ApiResult`モジュールをよく見ると、`map`、`bind`、その他すべての関数が、渡される`api`の情報を使っていないことに気づきます。
どんな型にしても、これらの関数は同じように動作したでしょう。

「すべてをパラメータ化する」精神に則って、それをパラメータにしてはどうでしょうか？

つまり、`ApiAction`を次のように定義することも可能でした。

```fsharp
type ApiAction<'anything,'a> = ApiAction of ('anything -> 'a)
```

しかし、何でもよいのなら、もはや`ApiAction`と呼ぶ必要はありません。
（`api`のような）オブジェクトが渡されることに依存する任意の処理のセットを表せます。

私たちが初めてこれを発見したわけではありません！この型は一般的に`Reader`型と呼ばれ、以下のように定義されます。

```fsharp
type Reader<'environment,'a> = Reader of ('environment -> 'a)
```

追加の型`'environment`は、`ApiAction`の定義における`ApiClient`と同じ役割を果たします。`api`インスタンスがすべての関数に追加のパラメータとして渡されていたのと同様に、
何らかの環境が渡されます。

実際、`ApiAction`を`Reader`を使って非常に簡単に定義できます。

```fsharp
type ApiAction<'a> = Reader<ApiClient,'a>
```

`Reader`の関数セットは`ApiAction`のものとまったく同じです。コードを取り、`ApiAction`を`Reader`に、
`api`を`environment`に置き換えただけです！

```fsharp
module Reader = 

    /// 与えられた環境でアクションを評価
    /// 'env -> Reader<'env,'a> -> 'a
    let run environment (Reader action) = 
        let resultOfAction = action environment
        resultOfAction

    /// ('a -> 'b) -> Reader<'env,'a> -> Reader<'env,'b>
    let map f action = 
        let newAction environment =
            let x = run environment action 
            f x
        Reader newAction

    /// 'a -> Reader<'env,'a>
    let retn x = 
        let newAction environment =
            x
        Reader newAction

    /// Reader<'env,('a -> 'b)> -> Reader<'env,'a> -> Reader<'env,'b>
    let apply fAction xAction = 
        let newAction environment =
            let f = run environment fAction 
            let x = run environment xAction 
            f x
        Reader newAction

    /// ('a -> Reader<'env,'b>) -> Reader<'env,'a> -> Reader<'env,'b>
    let bind f xAction = 
        let newAction environment =
            let x = run environment xAction 
            run environment (f x)
        Reader newAction
```

型シグネチャの可読性が少し下がりましたね。

`Reader`型に加えて`bind`と`return`、そして`bind`と`return`がモナド則を満たすことから、`Reader`は通常「Readerモナド」と呼ばれます。

ここではReaderモナドについて深く掘り下げませんが、これが実際に役立つものであり、単なる理論上の概念ではないことがお分かりいただけたと思います。

### Readerモナド vs. 明示的な型

ここまでの`ApiAction`コードをすべて`Reader`コードに置き換えることもできますし、同じように動作するでしょう。しかし、そうすべきでしょうか？

個人的には、Readerモナドの背後にある概念を理解することは重要で有用だと思いますが、
私が元々定義した`ApiAction`の実装、つまり`Reader<ApiClient,'a>`のエイリアスではなく明示的な型を好みます。

なぜでしょうか？F#には型クラスがありません。F#には型コンストラクタの部分適用がありません。F#には「newtype」がありません。
要するに、F#はHaskellではありません。言語のサポートがない場合、Haskellでうまく機能するイディオムをF#に直接持ち込むのは適切ではないでしょう。

概念を理解していれば、必要なすべての変換を数行のコードで実装できます。確かに少し余分な作業が必要ですが、
抽象化が少なく、依存関係も少ないというメリットがあります。

チームのメンバー全員がHaskellの専門家で、Readerモナドが皆にとって馴染みのあるものである場合は例外かもしれません。しかし、能力の異なるチームの場合、
抽象的すぎるよりも具体的すぎる方が良いでしょう。

## まとめ

この記事では、別の実践的な例を通じて、作業をかなり簡単にする独自の高次の世界を作成しました。
その過程で、偶然にもReaderモナドを再発明することになりました。

これが気に入ったなら、「[フランケンファンクター博士とモナド怪物](../posts/monadster.md)」シリーズで、今度はStateモナドについての同様の実践的な例を見れます。

[次の最終回](../posts/elevated-world-7.md)では、このシリーズを要約し、補足文献を案内します。
