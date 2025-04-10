---
layout: post
title: "型をアクセストークンとして使う"
description: "関数型アプローチによる認可 パート3"
seriesId: "関数型アプローチによる認可"
seriesOrder: 3
categories: []
image: "@assets/img/auth_token.png"
---

*更新：[このトピックに関する講演のスライドとビデオ](https://fsharpforfunandprofit.com/cap/)*

以前の記事（[リンク](../posts/capability-based-security.html)、[リンク](../posts/capability-based-security-2.html)）では、
コードを制限するための基礎として「ケイパビリティ」について検討しました。

しかし、これまでの例のほとんどでは、グローバルなケイパビリティを使わないように自制することに頼るか、
`internal`キーワードを使って「生の」ケイパビリティを隠そうとしてきました。

あまりきれいではありませんね。もっと良い方法があるでしょうか？

この記事では、型を使って「アクセストークン」をエミュレートすることで、それが可能であることを示します。

## 実際の認可

まず、現実世界で認可がどのように機能するかを見てみましょう。

基本的な認可システム（[OAuth 2.0](https://developers.google.com/accounts/docs/OAuth2#basicsteps)など）を簡略化した図を次に示します。

![Simplified authentication](@assets/img/auth_token.png)

最も単純な形式での手順は次のとおりです。

  * クライアントは、アイデンティティ、アクセスしたいサービスのIDとスコープ（ケイパビリティ）を含むいくつかのクレームを認可サービスに提示します。
  * 認可サービスは、クライアントが認可されているかどうかを確認し、認可されている場合はアクセストークンを作成してクライアントに返します。
  * クライアントは、このアクセストークンをリソースサービス（クライアントが使用したいサービス）に提示します。
  * 一般的に、アクセストークンはクライアントが特定のことだけを実行できるようにします。この用語では、クライアントには制限されたケイパビリティのセットが付与されていることになります。

実際には、もっと複雑なプロセスです。しかし、いくつかのアイデアを与えるにはこれで十分でしょう。

## アクセストークンを実装する

これを設計でエミュレートしたい場合、「アクセストークン」のようなものが必要になることは明らかです。
単一プロセスで実行しており、主な目標は偶発的なエラーを止めることなので、暗号署名などを行う必要はありません。必要なのは、認可サービスによってのみ作成できるオブジェクトだけです。

簡単です。プライベートコンストラクターを持つ型を使えばいいだけです。

型は認可サービスによってのみ作成できるように設定します。それをデータベースサービスに渡す必要があります。

たとえば、`AccessToken`型のF\#実装を次に示します。
コンストラクターはプライベートで、認可が許可されている場合はインスタンスを返す静的メンバーがあります。

```fsharp
type AccessToken private() = 

    // 特定の顧客へのアクセスを許可するアクセストークンを作成する。
    static member getAccessToCustomer id principal = 
        let principalId = GetIdForPrincipal(principal)
        if (principalId = id) || principal.IsInRole("CustomerAgent") then
            Some <| AccessToken() 
        else
            None   
```

次に、データベースモジュールで、各関数に、アクセストークンである追加パラメーターを追加します。

アクセストークントークンが必要なので、データベースモジュールをパブリックにしても安全です。許可されていないクライアントは関数を呼び出すことができないからです。

```fsharp
let getCustomer (accessToken:AccessToken) (id:CustomerId) = 
    // 顧客データを取得する。

let updateCustomer (accessToken:AccessToken) (id:CustomerId) (data:CustomerData) = 
    // データベースを更新する。
```

アクセストークンは実際には実装で使われていないことに注意してください。呼び出し側がコンパイル時にトークンを取得することを強制するためだけに存在します。

では、実際にどのように使われるのかを見てみましょう。

```fsharp
let principal = // コンテキストから取得
let id = // コンテキストから取得

// アクセストークンの取得を試みる。
let accessToken = AuthorizationService.AccessToken.getAccessToCustomer id principal
```

オプション型のアクセストークンが取得できました。`Option.map`を使って、`CustomerDatabase.getCustomer`に適用して、オプション型のケイパビリティを取得できます。
また、アクセストークンを部分的に適用することで、ケイパビリティのユーザーは認証プロセスから分離されます。

```fsharp
let getCustomerCapability = 
    accessToken |> Option.map CustomerDatabase.getCustomer
```

そして最後に、ケイパビリティが存在する場合は、それを使ってみましょう。

```fsharp
match getCustomerCapability with
| Some getCustomer -> getCustomer id
| None -> Failure AuthorizationFailed // エラー
```

これで、データベースへの過剰なアクセスを誤って行うことを防ぐ、静的に型付けされた認可システムができました。

## うっかりミス！大きな間違いです…。

この設計は表面上は問題ないように見えますが、実際には安全ではありません。

最初の問題は、`AccessToken`型のケイパビリティが広すぎることです。無害なはずの、設定ファイルへ書き込むためのアクセストークンを何らかの方法で入手できれば、
悪意をもって、パスワードの更新にも使うことができるかもしれません。

2番目の問題は、`AccessToken`が操作のコンテキストを捨ててしまうことです。たとえば、`CustomerId 1`を更新するためのアクセストークンを取得したとしても、
実際にケイパビリティを*使う*ときに、顧客IDとして`CustomerId 2`を渡してしまう可能性があります。

これらの問題の両方に対する解決法は、認可が許可された時点で、アクセストークン自体に情報を保存することです。

たとえば、要求された操作をトークンが保存している場合、サービスは呼び出されている操作とトークンが一致するかどうかを確認できます。
これにより、トークンはその特定の操作にのみ使われることが保証されます。
実際、後ほど説明するように、このチェックを*コンパイラ*に任せてしまうことができます。

また、認可要求の一部であったデータ（顧客IDなど）も保存する場合、サービスで再度要求する必要はありません。

さらに、トークンに保存されている情報は、認可サービスのみがトークンを作成できるため、偽造または改ざんされていないと信頼できます。
言い換えれば、これはトークンが「署名されている」ことと同等です。

## アクセストークンの設計を見直す

では、設計を見直し、修正しましょう。

まず、ケイパビリティごとに*個別*の型を定義します。型には、顧客IDなど、認可時に必要なデータも含まれます。

たとえば、ケイパビリティへのアクセスを表す2つの型を次に示します。1つは顧客へのアクセス（読み取りと更新の両方）、もう1つはパスワードの更新です。
どちらも、認可時に提供された`CustomerId`を格納します。

```fsharp
type AccessCustomer = AccessCustomer of CustomerId
type UpdatePassword = UpdatePassword of CustomerId
```

次に、`AccessToken`型を、`data`フィールドを持つジェネリックコンテナとして再定義します。
コンストラクターはまだプライベートですが、クライアントがデータフィールドにアクセスできるようにパブリックゲッターが追加されています。

```fsharp
type AccessToken<'data> = private {data:'data} with 
    // データへの読み取りアクセスは許可する。
    member this.Data = this.data
```

認可の実装は前の例と似ていますが、今回はケイパビリティの型と顧客IDがトークンに格納される点が異なります。

```fsharp
// 特定の顧客へのアクセスを許可するアクセストークンを作成する。
let getAccessCustomerToken id principal = 
    if customerIdBelongsToPrincipal id principal ||
        principal.IsInRole("CustomerAgent") 
    then
        Some {data=AccessCustomer id}
    else
        None   

// パスワードの更新へのアクセスを許可するアクセストークンを作成する。
let getUpdatePasswordToken id principal = 
    if customerIdBelongsToPrincipal id principal then
        Some {data=UpdatePassword id}
    else
        None
```

## データベースでのアクセストークンの使用

これらのアクセストークン型を設定すると、特定の型のトークンを要求するようにデータベース関数を書き直すことができます。
`customerId`はアクセストークンのデータの一部として渡されるため、明示的なパラメーターとして必要なくなりました。

また、`getCustomer`と`updateCustomer`の両方が同じ型のトークン（`AccessCustomer`）を使用できますが、`updatePassword`には異なる型（`UpdatePassword`）が必要であることにも注意してください。

```fsharp
let getCustomer (accessToken:AccessToken<AccessCustomer>) = 
    // 顧客IDを取得する。
    let (AccessCustomer id) = accessToken.Data

    // IDを使って顧客データを取得する。
    match db.TryGetValue id with
    | true, value -> Success value 
    | false, _ -> Failure (CustomerIdNotFound id)

let updateCustomer (accessToken:AccessToken<AccessCustomer>) (data:CustomerData) = 
    // 顧客IDを取得する。
    let (AccessCustomer id) = accessToken.Data

    // データベースを更新する。
    db.[id] <- data
    Success ()

let updatePassword (accessToken:AccessToken<UpdatePassword>) (password:Password) = 
    Success ()   // ダミー実装
```

## 全てをまとめる

では、これらすべてが実際にどのように動作するかを見てみましょう。

顧客を取得する手順は次のとおりです。

* 認可サービスからアクセストークンの取得を試みる。
* アクセストークンがある場合は、データベースから`getCustomer`ケイパビリティを取得する。
* 最後に、ケイパビリティがある場合は、それを使う。

いつものように、`getCustomer`ケイパビリティは顧客IDパラメーターを受け取りません。ケイパビリティの作成時に組み込まれています。

```fsharp
let principal =  // コンテキストから取得
let customerId = // コンテキストから取得

// ケイパビリティの取得を試みる。
let getCustomerCap = 
    // トークンの取得を試みる。
    let accessToken = AuthorizationService.getAccessCustomerToken customerId principal
    match accessToken with
    // トークンが存在する場合は、トークンをCustomerDatabase.getCustomerに渡し、
    // unit->CustomerDataを返す。
    | Some token -> 
        Some (fun () -> CustomerDatabase.getCustomer token)
    | None -> None

// 使用可能な場合は、ケイパビリティを使う。               
match getCustomerCap with
| Some getCustomer -> getCustomer()
| None -> Failure AuthorizationFailed // エラー
```

では、*間違った*型のアクセストークンを誤って取得した場合はどうなるでしょうか？たとえば、`AccessCustomer`トークンで`updatePassword`関数にアクセスしてみましょう。

```fsharp
// ケイパビリティの取得を試みる。
let getUpdatePasswordCap = 
    let accessToken = AuthorizationService.getAccessCustomerToken customerId principal
    match accessToken with
    | Some token -> 
        Some (fun password -> CustomerDatabase.updatePassword token password)
    | None -> None

match getUpdatePasswordCap with
| Some updatePassword -> 
    let password = Password "p@ssw0rd"
    updatePassword password 
| None -> 
    Failure AuthorizationFailed // エラー
```

このコードはコンパイルさえされません！ `CustomerDatabase.updatePassword token password`の行にエラーがあります。

```text
error FS0001: 型の不一致。
    AccessToken<Capabilities.UpdatePassword>    
が期待されていますが、
    AccessToken<Capabilities.AccessCustomer>    
が指定されました。型 'Capabilities.UpdatePassword' は型 'Capabilities.AccessCustomer' と一致しません。
```

誤った種類のアクセストークンを誤って取得しましたが、誤ったデータベースメソッドにアクセスすることが*コンパイル時*に阻止されました。

このように型を使うことは、潜在的に危険なケイパビリティへのグローバルアクセスという問題に対する優れた解決策です。

## F#での完全な例

前の投稿では、ケイパビリティを使ってデータベースを更新するF#の完全なコンソールアプリケーションを示しました。

今度は、アクセストークンも使うように更新してみましょう。（コードは[このgist](https://gist.github.com/swlaschin/909c5b24bf921e5baa8c#file-capabilitybasedsecurity_consoleexample_withtypes-fsx)で入手できます）。

これは例の更新なので、変更点だけに焦点を当てます。

### ケイパビリティの定義

ケイパビリティは、アクセストークン内に格納される2つの新しい型（`AccessCustomer`と`UpdatePassword`）を定義したことを除いて、以前と同じです。

```fsharp
module Capabilities = 
    open Rop
    open Domain

    // 各アクセストークンは独自の型を取得します
    type AccessCustomer = AccessCustomer of CustomerId
    type UpdatePassword = UpdatePassword of CustomerId

    // ケイパビリティ
    type GetCustomerCap = unit -> SuccessFailure<CustomerData,FailureCase>
    type UpdateCustomerCap = CustomerData -> SuccessFailure<unit,FailureCase>
    type UpdatePasswordCap = Password -> SuccessFailure<unit,FailureCase>

    type CapabilityProvider = {
        /// customerIdとIPrincipalが与えられた場合、GetCustomerケイパビリティの取得を試みます
        getCustomer : CustomerId -> IPrincipal -> GetCustomerCap option
        /// customerIdとIPrincipalが与えられた場合、UpdateCustomerケイパビリティの取得を試みます
        updateCustomer : CustomerId -> IPrincipal -> UpdateCustomerCap option
        /// customerIdとIPrincipalが与えられた場合、UpdatePasswordケイパビリティの取得を試みます
        updatePassword : CustomerId -> IPrincipal -> UpdatePasswordCap option 
        }
```

### 認可の実装

認可の実装は、`AccessToken`を返すように変更する必要があります。 `onlyIfDuringBusinessHours`の制限はケイパビリティに適用され、アクセストークンには適用されないため、変更されていません。

```fsharp
// コンストラクターは保護されている。
type AccessToken<'data> = private {data:'data} with 
    // データへの読み取りアクセスは許可する。
    member this.Data = this.data

let onlyForSameId (id:CustomerId) (principal:IPrincipal) = 
    if Authentication.customerIdOwnedByPrincipal id principal then
        Some {data=AccessCustomer id}
    else
        None

let onlyForAgents (id:CustomerId) (principal:IPrincipal)  = 
    if principal.IsInRole(Authentication.customerAgentRole) then
        Some {data=AccessCustomer id}
    else
        None

let onlyIfDuringBusinessHours (time:DateTime) f = 
    if time.Hour >= 8 && time.Hour <= 17 then
        Some f
    else
        None

// パスワード更新関数を呼び出すことができる人を制限する。
let passwordUpdate (id:CustomerId) (principal:IPrincipal) = 
    if Authentication.customerIdOwnedByPrincipal id principal then
        Some {data=UpdatePassword id}
    else
        None
```

### データベースの実装

前の投稿の例と比較して、データベース関数では`CustomerId`パラメーターが`AccessToken`に置き換えられています。

アクセストークンを使う*前*のデータベース実装は次のとおりです。

```fsharp
let getCustomer id = 
    // コード

let updateCustomer id data = 
    // コード

let updatePassword (id:CustomerId,password:Password) = 
    // コード
```

アクセストークンを使った*後*のコードは次のとおりです。

```fsharp
let getCustomer (accessToken:AccessToken<AccessCustomer>) = 
    // 顧客IDを取得する。
    let (AccessCustomer id) = accessToken.Data

    // IDを使って顧客データを取得する。
    // 前と同様

let updateCustomer (accessToken:AccessToken<AccessCustomer>) (data:CustomerData) = 
    // 顧客IDを取得する。
    let (AccessCustomer id) = accessToken.Data

    // データベースを更新する。
    // 前と同様

let updatePassword (accessToken:AccessToken<UpdatePassword>) (password:Password) = 
    // 前と同様
```

### ビジネスサービスとユーザーインターフェースの実装

ビジネスサービスとUIに関連するコードは完全に変更されていません。

これらの関数にはケイパビリティのみが渡されているため、アプリケーションの下位レベルと上位レベルの両方から分離されているため、
認可ロジックの変更はこれらのレイヤーに影響を与えません。

### トップレベルモジュールの実装

トップレベルモジュールでの主な変更点は、ケイパビリティの取得方法です。今回は、最初にアクセストークンを取得するという追加の手順があります。

アクセストークンを使う*前*のコードは次のとおりです。

```fsharp
let getCustomerOnlyForSameId id principal  = 
    onlyForSameId id principal CustomerDatabase.getCustomer

let getCustomerOnlyForAgentsInBusinessHours id principal = 
    let cap1 = onlyForAgents id principal CustomerDatabase.getCustomer
    let restriction f = onlyIfDuringBusinessHours (DateTime.Now) f
    cap1 |> restrict restriction 
```

アクセストークンを使った*後*のコードは次のとおりです。

```fsharp
let getCustomerOnlyForSameId id principal  = 
    let accessToken = Authorization.onlyForSameId id principal
    accessToken |> tokenToCap CustomerDatabase.getCustomer 

let getCustomerOnlyForAgentsInBusinessHours id principal = 
    let accessToken = Authorization.onlyForAgents id principal
    let cap1 = accessToken |> tokenToCap CustomerDatabase.getCustomer 
    let restriction f = onlyIfDuringBusinessHours (DateTime.Now) f
    cap1 |> restrict restriction
```

`tokenToCap`関数は、指定された関数の最初のパラメーターとして（オプションの）トークンを適用する小さなユーティリティです。出力は（同様にオプションの）ケイパビリティです。

```fsharp
let tokenToCap f token =
    token 
    |> Option.map (fun token -> 
        fun () -> f token)
```

これで、アクセストークンをサポートするために必要な変更は完了です。
この例のすべてのコードは[こちら](https://gist.github.com/swlaschin/909c5b24bf921e5baa8c#file-capabilitybasedsecurity_consoleexample_withtypes-fsx)。

## パート3のまとめ

この投稿では、次のように、型を使ってアクセストークンを表しました。

* `AccessToken`型は、分散認可システムにおける署名付きチケットに相当します。プライベートコンストラクターを持ち、認可サービスによってのみ作成できます（もちろん、リフレクションは無視します！）。
* 特定の操作にアクセスするには、特定の型の`AccessToken`が必要になります。これにより、誤って不正なアクティビティを実行することがなくなります。
* 特定の型の`AccessToken`ごとに、`CustomerId`などの認可時に収集されたカスタムデータを格納できます。
* データベースなどのグローバル関数は、アクセストークンなしではアクセスできないように変更されます。これは、それらを安全にパブリックにすることができることを意味します。

**質問：他のクライアントが使用できないように、アクセストークンに呼び出し元も保存しないのはなぜですか？**

権限ベースのアプローチを使用しているため、必要ありません。
[最初の投稿](../posts/capability-based-security.html#authority)で説明したように、クライアントがケイパビリティを取得すると、
他のユーザーが使用できるようにそれを渡すことができるため、特定の呼び出し元に制限しても意味がありません。

**質問：認可モジュールは、ケイパビリティとアクセストークンの型を認識する必要があります。それは余分な結合を追加していませんか？**

認可サービスがその役割を果たす場合、使用可能なケイパビリティについて*何か*を知る必要があるため、
このモデルのように、暗黙的（XACMLの「リソース」と「アクション」）であるか、型を介して明示的であるかにかかわらず、常に何らかの結合があります。

そのため、認可サービスとデータベースサービスの両方がケイパビリティのセットに依存していますが、互いに直接結合されていません。

**質問：分散システムでこのモデルをどのように使用しますか？**

このモデルは、実際には、型チェックを実行できるように、単一のコードベースで使用するためだけに設計されています。

おそらく、型が境界でチケットに変換され、逆に変換されるようにハックすることはできますが、私はそれをまったく見ていません。

**質問：型をアクセストークンとして使用する方法の詳細については、どこで読むことができますか？**

この型指向のアクセストークンは私自身の設計ですが、私がこの方法で型を使用することを考えた最初の人ではないことは間違いありません。
Haskellの関連するもの（[例](https://hackage.haskell.org/package/Capabilities)）がいくつかありますが、
主流の開発者がアクセスできる直接類似した作業は知りません。

**さらに質問があります...**

[パート1](../posts/capability-based-security.html#summary)と[パート2](../posts/capability-based-security-2.html#summary)の最後で、いくつかの追加の質問に回答しているので、最初にそれらの回答を読んでください。
それ以外の場合は、以下のコメントに質問を追加してください。対応させていただきます。

## まとめ

最後までお読みいただきありがとうございました！

冒頭で述べたように、目標は完全に安全なシステムを作成することではありません。
認可を後から考えるのではなく、システムの設計に最初から認可の制約を組み込むことを促すことです。

さらに、この追加作業を行う目的は、*セキュリティ*を向上させることだけでなく、*コードの一般的な設計*を向上させることでもあります。
最小権限の原則に従うと、モジュール性、分離、明示的な依存関係などが無料で得られます。

私の意見では、ケイパビリティベースのシステムはこれに非常に適しています。

* 関数はケイパビリティによく対応しており、ケイパビリティを渡す必要があることは、標準的な関数型プログラミングパターンに非常によく適合します。
* 作成されると、ケイパビリティはクライアントから認可のすべての醜さを隠し、
そのため、モデルは「セキュリティを目に見えないようにすることでセキュリティをユーザーフレンドリーにする」ことに成功しています。
* 最後に、型チェックされたアクセストークンを追加することで、コードのどの部分も、不正な操作を実行するためにグローバル関数にアクセスできないという高い確信を持つことができます。



このシリーズがお役に立てば幸いです。これらのアイデアのいくつかをより完全に調査するきっかけになれば幸いです。

*注：この記事のすべてのコードは、[このgist](https://gist.github.com/swlaschin/909c5b24bf921e5baa8c#file-capabilitybasedsecurity_typeexample-fsx)
および[ここ](https://gist.github.com/swlaschin/909c5b24bf921e5baa8c#file-capabilitybasedsecurity_consoleexample_withtypes-fsx)から入手できます。*
