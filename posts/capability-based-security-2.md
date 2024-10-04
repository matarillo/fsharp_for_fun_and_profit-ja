---
layout: post
title: "アイデンティティとロールに基づいてケイパビリティを制限する"
description: "認可のための関数型アプローチ パート2"
seriesId: "認可のための関数型アプローチ"
seriesOrder: 2
categories: []
image: "/assets/img/auth_3.png"
---

*更新：[このトピックに関する講演のスライドとビデオ](https://fsharpforfunandprofit.com/cap/)*

[前の投稿](../posts/capability-based-security.md)では、コードが想定以上のことをしないようにするための基礎として、「ケイパビリティ」について検討し始めました。
そして、設定フラグを変更する単純なアプリケーションでこれをデモンストレーションしました。

この投稿では、現在のユーザーのアイデンティティとロールに基づいてケイパビリティを制限する方法を見ていきます。

設定の例から、より厳密な認可が必要となる典型的な状況に切り替えましょう。

## データベースケイパビリティの例

バックエンドデータベースを持つWebサイトとコールセンターを考えてみましょう。次のセキュリティルールがあります。

* 顧客はデータベース内の自分のレコードのみを表示または更新できます（Webサイト経由）。
* コールセンターのオペレーターはデータベース内のすべてのレコードを表示または更新できます。

これは、ある時点で、ユーザーのアイデンティティとロールに基づいて認可を行う必要があることを意味します。（ユーザーが正常に認証されていることを前提とします）。

多くのWebフレームワークでは、UIレイヤー、多くの場合[コントローラー](https://msdn.microsoft.com/en-us/library/system.web.mvc.authorizeattribute.aspx)に認可を配置する傾向があります。
このアプローチに関する懸念点は、「内部」（ゲートウェイを通過した後）に入ると、アプリのどの部分もデータベースにアクセスする完全な権限を持っていることです。
うっかりしてコードが間違ったことを行い、セキュリティ侵害が発生するという事故が起こりやすくなります。

それだけでなく、権限がどこにでもある（「アンビエント」）ため、潜在的なセキュリティ問題についてコードをレビューすることが困難です。

これらの問題を回避するために、代わりに、この場合はデータベースアクセスレイヤーで、アクセスロジックをできるだけ「低い」場所に配置しましょう。

明白なアプローチから始めます。各データベース呼び出しにアイデンティティとロールを追加し、そこで認可を行います。

次のメソッドは、アクセスされている顧客IDがアクセスを要求しているプリンシパルによって所有されているかどうかを確認する`CustomerIdBelongsToPrincipal`関数があることを前提としています。
そして、`customerId`がプリンシパルに属している場合、またはプリンシパルが「CustomerAgent」のロールを持っている場合、アクセスが許可されます。

```csharp
public class CustomerDatabase
{
    public CustomerData GetCustomer(CustomerId id, IPrincipal principal)
    {  
        if ( CustomerIdBelongsToPrincipal(id, principal) || 
             principal.IsInRole("CustomerAgent") )
        {
            // 顧客データを取得する
        }
        else
        {
            // 認可例外をスローする
        }
    }
}
```

*意図的にメソッドシグネチャに`IPrincipal`を追加したことに注意してください。プリンシパルがグローバルコンテキストからフェッチされる「マジック」は許可していません。
グローバル変数の使用と同様に、暗黙的なアクセスがあると依存関係が隠され、分離してテストすることが難しくなります。*

例外をスローするのではなく、[成功/失敗の戻り値](https://fsharpforfunandprofit.com/rop/)を使用する、F#の同等のコードを次に示します。

```fsharp
let getCustomer id principal = 
    if customerIdBelongsToPrincipal id principal ||
       principal.IsInRole("CustomerAgent") 
    then
        // 顧客データを取得する
        Success "CustomerData"
    else
        Failure AuthorizationFailed
```

この「インライン」認可アプローチは非常に一般的ですが、残念ながら多くの問題があります。

* セキュリティの関心事とデータベースロジックが混在しています。認可ロジックが複雑になると、コードも複雑になります。
* 認可が失敗した場合、例外をスローします（C#）またはエラーを返します（F#）。最後の瞬間まで待つのではなく、事前に認可があるかどうかがわかればよいでしょう。

これをケイパビリティベースのアプローチと比較してみましょう。顧客を直接取得する代わりに、まず顧客を取得する*ケイパビリティ*を取得します。

```csharp
class CustomerDatabase
{
    // 「実際の」コードはパブリックビューから隠されています
    private CustomerData GetCustomer(CustomerId id)
    {  
        // 顧客データを取得する
    }

    // GetCustomerを呼び出すケイパビリティを取得する
    public Func<CustomerId,CustomerData> GetCustomerCapability(CustomerId id, IPrincipal principal)
    {  
        if ( CustomerIdBelongsToPrincipal(id, principal) || 
             principal.IsInRole("CustomerAgent") )
        {
            // ケイパビリティ（実際のメソッド）を返す
            return GetCustomer;
        }
        else
        {
            // 認可例外をスローする
        }
    }
}
```

ご覧のとおり、認可が成功すると、`GetCustomer`メソッドへの参照が呼び出し元に返されます。

明らかではないかもしれませんが、上記のコードにはかなり大きなセキュリティホールがあります。特定の顧客IDのケイパビリティを要求できますが、*任意の*顧客IDに対して呼び出すことができる関数が返されます！
これはあまり安全ではありませんね？

必要なのは、顧客IDをケイパビリティに「組み込む」ことで、悪用されないようにすることです。戻り値は`Func<CustomerData>`になり、
顧客IDはもはや引数として渡されなくなります。

```csharp
class CustomerDatabase
{
    // 「実際の」コードはパブリックビューから隠されています
    private CustomerData GetCustomer(CustomerId id)
    {  
        // 顧客データを取得する
    }

    // GetCustomerを呼び出すケイパビリティを取得する
    public Func<CustomerData> GetCustomerCapability(CustomerId id, IPrincipal principal)
    {  
        if ( CustomerIdBelongsToPrincipal(id, principal) || 
             principal.IsInRole("CustomerAgent") )
        {
            // ケイパビリティ（実際のメソッド）を返す
            return ( () => GetCustomer(id) );
        }
        else
        {
            // 認可例外をスローする
        }
    }
}
```

関心事をこのように分離することで、ケイパビリティを取得できれば存在し、そうでなければ存在しない*オプション*値を返すことで、エラーをうまく処理できるようになりました。つまり、
ケイパビリティの有無は、後で使おうとしたときではなく、*取得しようとしたとき*にわかります。

```csharp
class CustomerDatabase
{
    // 「実際の」コードはパブリックビューから隠されており、
    // アイデンティティやロールのチェックは必要ありません
    private CustomerData GetCustomer(CustomerId id)
    {  
        // 顧客データを取得する
    }

    // GetCustomerを呼び出すケイパビリティを取得します。許可されていない場合は、Noneを返します。
    public Option<Func<CustomerData>> GetCustomerCapability(CustomerId id, IPrincipal principal)
    {
        if (CustomerIdBelongsToPrincipal(id, principal) ||
             principal.IsInRole("CustomerAgent"))
        {
            // ケイパビリティ（実際のメソッド）を返す
            return Option<Func<CustomerData>>.Some( () => GetCustomer(id) );
        }
        else
        {
            return Option<Func<CustomerData>>.None();
        }
    }
}
```

これは、C#でnullを返すのではなく、何らかの`Option`型を使用していることを前提としています！

最後に、認可ロジックを独自のクラス（たとえば`CustomerDatabaseCapabilityProvider`）に配置して、認可の関心事を`CustomerDatabase`から分離します。

ただし、「実際の」データベース関数を他のすべての呼び出し元に対してプライベートに保つ方法を見つける必要があります。
とりあえず、データベースコードが別のアセンブリにあると仮定し、コードを`internal`とマークします。

```csharp
// ビジネスレイヤーからアクセスできない
internal class CustomerDatabase
{
    // 「実際の」コードはパブリックビューから隠されています
    private CustomerData GetCustomer(CustomerId id)
    {  
        // 顧客データを取得する
    }
}

// ビジネスレイヤーからアクセスできる
public class CustomerDatabaseCapabilityProvider
{
    CustomerDatabase _customerDatabase;
    
    // GetCustomerを呼び出すケイパビリティを取得する
    public Option<Func<CustomerData>> GetCustomerCapability(CustomerId id, IPrincipal principal)
    {
        if (CustomerIdBelongsToPrincipal(id, principal) ||
             principal.IsInRole("CustomerAgent"))
        {
            // ケイパビリティ（実際のメソッド）を返す
            return Option<Func<CustomerData>>.Some( () => _customerDatabase.GetCustomer(id) );
        }
        else
        {
            return Option<Func<CustomerData>>.None();
        }
    }
}
```

同じコードのF\#版を次に示します。

```fsharp
/// ビジネスレイヤーからアクセスできない
module internal CustomerDatabase = 
    let getCustomer (id:CustomerId) :CustomerData = 
        // 顧客データを取得する

/// ビジネスレイヤーからアクセスできる        
module CustomerDatabaseCapabilityProvider =         
 
    // getCustomerを呼び出すケイパビリティを取得する
    let getCustomerCapability (id:CustomerId) (principal:IPrincipal) = 
        let principalId = GetIdForPrincipal(principal)
        if (principalId = id) || principal.IsInRole("CustomerAgent") then
            Some ( fun () -> CustomerDatabase.getCustomer id )
        else
            None
```

この設計を表す図を次に示します。

![例2](../assets/img/auth_2.png)

**このモデルの問題点**

このモデルでは、呼び出し元は`CustomerDatabase`から分離され、`CustomerDatabaseCapabilityProvider`は呼び出し元と`CustomerDatabase`の間のプロキシとして機能します。

つまり、現在の設計では、`CustomerDatabase`で使用可能なすべての関数に対して、`CustomerDatabaseCapabilityProvider`でも対応する関数が使用可能でなければなりません。
このアプローチはうまくスケールしないことがわかります。

一度に1つずつではなく、データベース関数*すべて*のケイパビリティを一般的に取得する方法があればいいのですが。それができるかどうか見てみましょう！

## ケイパビリティの制限と変換

`CustomerDatabase`の`getCustomer`関数は制限のないケイパビリティと考えることができますが、
`getCustomerCapability`はアイデンティティとロールによって制限されたケイパビリティを返します。

ただし、2つの関数シグネチャは似ており（`CustomerId -> CustomerData`と`unit -> CustomerData`）、呼び出し元の観点からはほとんど交換可能です。
ある意味では、2番目のケイパビリティは、追加の制限が加えられた、最初のケイパビリティの変換バージョンです。

関数を新しい関数に変換する！これは簡単にできます。

それでは、`CustomerId -> 'a`型の*任意の*関数が与えられた場合に、顧客IDが組み込まれた関数（`unit -> 'a`）を返すトランスフォーマーを作成しましょう。
ただし、認可要件が満たされている場合に限ります。

```fsharp
module CustomerCapabilityFilter =         
 
    // CustomerIdパラメーターを持つ任意の関数を使用するケイパビリティを取得する
    // ただし、呼び出し元が同じ顧客IDを持っているか、
    // CustomerAgentロールのメンバーである場合に限る。
    let onlyForSameIdOrAgents (id:CustomerId) (principal:IPrincipal) (f:CustomerId -> 'a) = 
        let principalId = GetIdForPrincipal(principal)
        if (principalId = id) || principal.IsInRole("CustomerAgent") then
            Some (fun () -> f id)
        else
            None
```

`onlyForSameIdOrAgents`関数の型シグネチャは `(CustomerId -> 'a) -> (unit -> 'a) option` です。`CustomerId`ベースの関数をすべて受け入れます
認可が成功した場合は、*顧客IDがすでに適用されている*同じ関数を返します。認可が成功しなかった場合は、代わりに`None`が返されます。

この関数は、最初のパラメーターとして`CustomerId`を持つ*任意の*関数で一般的に機能することがわかります。それは「取得」、「更新」、「削除」などです。

たとえば、次のように指定します。

```fsharp
module internal CustomerDatabase = 
    let getCustomer (id:CustomerId) = 
        // 顧客データを取得する 
    let updateCustomer (id:CustomerId) (data:CustomerData) = 
        // 顧客データを更新する 
```

たとえば、トップレベルのブートストラッパーまたはコントローラーで、制限付きバージョンを作成できるようになりました。

```fsharp
let principal = // コンテキストから
let id = // コンテキストから

// ケイパビリティの取得を試みる
let getCustomerOnlyForSameIdOrAgents = 
    onlyForSameIdOrAgents id principal CustomerDatabase.getCustomer

let updateCustomerOnlyForSameIdOrAgents = 
    onlyForSameIdOrAgents id principal CustomerDatabase.updateCustomer
```
    
`getCustomerOnlyForSameIdOrAgents`と`updateCustomerOnlyForSameIdOrAgents`の型は、データベースモジュールの元の関数に似ていますが、
`CustomerId`が`unit`に置き換えられています。

```text
val getCustomerOnlyForSameIdOrAgents : 
      (unit -> CustomerData) option
val updateCustomerOnlyForSameIdOrAgents : 
      (unit -> CustomerData -> unit) option 
```

*`updateCustomerOnlyForSameIdOrAgents`には追加の`CustomerData`パラメーターがあるため、`CustomerId`があった場所に追加のユニットがあるのは少し醜いです。
これが面倒な場合は、これをよりエレガントに処理する関数の他のバージョンを簡単に作成できます。それは読者の演習として残しておきます！*

これで、目的のケイパビリティが含まれている場合と含まれていない場合があるオプション値ができました。含まれている場合は、子コンポーネントを作成し、ケイパビリティを渡すことができます。
含まれていない場合は、アプリケーションの種類に応じて、何らかのエラーを返すか、ビューから要素を非表示にすることができます。

```fsharp
match getCustomerOnlyForSameIdOrAgents with
| Some cap -> // 子コンポーネントを作成し、ケイパビリティを渡す
| None ->     // データを取得するケイパビリティがないことを示すエラーを返す
```

この設計を表す図を次に示します。

![例3](../assets/img/auth_3.png)

### ケイパビリティに対する追加の変換

ケイパビリティは関数であるため、変換を連結または組み合わせることで、簡単に新しいケイパビリティを作成できます。

たとえば、次のように、ビジネスルールごとに個別のフィルター関数を作成できます。

```fsharp
module CustomerCapabilityFilter =         

    let onlyForSameId (id:CustomerId) (principal:IPrincipal) (f:CustomerId -> 'a) = 
        if customerIdBelongsToPrincipal id principal then
            Some (fun () -> f id)
        else
            None

    let onlyForAgents (id:CustomerId) (principal:IPrincipal) (f:CustomerId -> 'a) = 
        if principal.IsInRole("CustomerAgent") then
            Some (fun () -> f id)
        else
            None
```

最初のビジネスルールである`onlyForSameId`については、前と同じように、顧客IDが組み込まれたケイパビリティを返します。

2番目のビジネスルールである`onlyForAgents`は、顧客IDについてはどこにも言及していません。では、なぜ関数パラメーターを`CustomerId -> 'a`に制限するのでしょうか？
その理由は、このルールが、製品や支払いなどに関連するケイパビリティではなく、顧客中心のケイパビリティに*のみ*適用されるようにするためです。

しかし、このフィルターの出力を最初のルール（`unit -> 'a`）と互換性を持たせるには、顧客IDを渡して、部分的に適用する必要があります。
少しハックですが、今のところはこれで大丈夫です。

リストから最初の有効なケイパビリティを返す汎用コンビネーターを作成することもできます。

```fsharp
// ケイパビリティオプションのリストが与えられた場合、 
// 最初の適切なものを返す（存在する場合）
let first capabilityList = 
    capabilityList |> List.tryPick id
```

実装は本当に些細なものです。これは、コードの自己文書化を少しだけ支援するためのヘルパー関数のようなものです。

これを導入することで、ルールを個別に適用し、2つのフィルターを取得して1つに組み合わせることができます。

```fsharp
let getCustomerOnlyForSameIdOrAgents = 
    let f = CustomerDatabase.getCustomer
    let cap1 = onlyForSameId id principal f
    let cap2 = onlyForAgents id principal f 
    first [cap1; cap2]
// val getCustomerOnlyForSameIdOrAgents : (CustomerId -> CustomerData) option
```

または、何らかの制限があるとしましょう。たとえば、操作は営業時間中にのみ実行できるとします。

```fsharp
let onlyIfDuringBusinessHours (time:DateTime) f = 
    if time.Hour >= 8 && time.Hour <= 17 then
        Some f
    else
        None
```

元のケイパビリティを制限する別のコンビネーターを作成できます。これは単なる「バインド」のバージョンです。

```fsharp
// ケイパビリティオプションが与えられた場合、それを制限する
let restrict filter originalCap = 
    originalCap
    |> Option.bind filter 
```

これを導入することで、「agentsOnly」ケイパビリティを営業時間に制限できます。

```fsharp
let getCustomerOnlyForAgentsInBusinessHours = 
    let f = CustomerDatabase.getCustomer
    let cap1 = onlyForAgents id principal f 
    let restriction f = onlyIfDuringBusinessHours (DateTime.Now) f
    cap1 |> restrict restriction 
```

これで、新しいケイパビリティ「顧客エージェントは営業時間中にのみ顧客データにアクセスできる」が作成され、データアクセスロジックが少し強化されました。

これを前の`onlyForSameId`フィルターと組み合わせて、顧客データにアクセスできる複合ケイパビリティを構築できます。

* 同じ顧客IDを持っている場合（1日中いつでも）
* 顧客エージェントである場合（営業時間中のみ）

```fsharp
let getCustomerOnlyForSameId = 
    let f = CustomerDatabase.getCustomer
    onlyForSameId id principal f

let getCustomerOnlyForSameId_OrForAgentsInBusinessHours = 
    let cap1 = getCustomerOnlyForSameId
    let cap2 = getCustomerOnlyForAgentsInBusinessHours 
    first [cap1; cap2]
```

ご覧のとおり、このアプローチは、単純なケイパビリティから複雑なケイパビリティを構築するための便利な方法です。

## 追加の変換

他の方法でケイパビリティを拡張できる追加の変換を簡単に作成できることは明らかです。いくつかの例を次に示します。

* 実行ごとに監査ログに書き込むケイパビリティ。
* 1回だけ実行できるケイパビリティ。
* 必要に応じて取り消すことができるケイパビリティ。
* スロットルされ、特定の期間内に限られた回数しか実行できないケイパビリティ（パスワード変更の試行など）。

など。

最初の3つの実装を次に示します。

```fsharp
/// ケイパビリティの使用は監査される
let auditable capabilityName f = 
    fun x -> 
        // シンプルな監査ログ！
        printfn "AUDIT: calling %s with %A" capabilityName  x
        // ケイパビリティを使う
        f x

/// 関数を1回だけ呼び出すことができるようにする
let onlyOnce f = 
    let allow = ref true
    fun x -> 
        if !allow then   //! 否定ではなく逆参照です！
            allow := false
            f x
        else
            Failure OnlyAllowedOnce

/// 取り消し可能なケイパビリティと、
/// 取り消しを行う関数のペアを返す
let revokable f = 
    let allow = ref true
    let capability = fun x -> 
        if !allow then  //! 否定ではなく逆参照です！
            f x
        else
            Failure Revoked
    let revoker() = 
        allow := false
    capability, revoker
```

次のような`updatePassword`関数があるとします。

```fsharp
module internal CustomerDatabase = 
    let updatePassword (id,password) = 
        Success "OK"
```

`updatePassword`の監査可能なバージョンを作成できます。

```fsharp
let updatePasswordWithAudit x = 
    auditable "updatePassword" CustomerDatabase.updatePassword x
```

そして、テストします。

```fsharp
updatePasswordWithAudit (1,"password") 
updatePasswordWithAudit (1,"new password") 
```

結果は次のとおりです。

```text
AUDIT: calling updatePassword with (1, "password")
AUDIT: calling updatePassword with (1, "new password")
```

または、1回限りのバージョンを作成することもできます。

```fsharp
let updatePasswordOnce = 
    onlyOnce CustomerDatabase.updatePassword 
```

そして、テストします。

```fsharp
updatePasswordOnce (1,"password") |> printfn "Result 1st time: %A"
updatePasswordOnce (1,"password") |> printfn "Result 2nd time: %A"
```

結果は次のとおりです。

```text
Result 1st time: Success "OK"
Result 2nd time: Failure OnlyAllowedOnce
```

最後に、取り消し可能な関数を作成できます。

```fsharp
let revokableUpdatePassword, revoker = 
    revokable CustomerDatabase.updatePassword 
```

そして、テストします。

```fsharp
revokableUpdatePassword (1,"password") |> printfn "Result 1st time before revoking: %A"
revokableUpdatePassword (1,"password") |> printfn "Result 2nd time before revoking: %A"
revoker()
revokableUpdatePassword (1,"password") |> printfn "Result 3nd time after revoking: %A"
```

結果は次のとおりです。

```text
Result 1st time before revoking: Success "OK"
Result 2nd time before revoking: Success "OK"
Result 3nd time after revoking: Failure Revoked
```

これらのF#の例のコードは、[ここ](https://gist.github.com/swlaschin/909c5b24bf921e5baa8c#file-capabilitybasedsecurity_dbexample-fsx)のgistとして入手できます。

## F#の完全な例 ##

F#の完全なアプリケーションのコードを次に示します（[ここ](https://gist.github.com/swlaschin/909c5b24bf921e5baa8c#file-capabilitybasedsecurity_consoleexample-fsx)のgistとしても入手できます）。

この例は、顧客レコードの取得と更新を可能にする単純なコンソールアプリで構成されています。

* 最初の手順は、ユーザーとしてログインすることです。「Alice」と「Bob」は通常のユーザーですが、「Zelda」は顧客エージェントの役割を持っています。
* ログインすると、編集する顧客を選択できます。ここでも、「Alice」と「Bob」のどちらかを選択できます。（興奮を抑えきれないでしょう）
* 顧客が選択されると、次のオプションの一部（またはなし）が表示されます。
  * 顧客のデータを取得する。
  * 顧客のデータを更新する。
  * 顧客のパスワードを更新する。
        
どのオプションが表示されるかは、所有しているケイパビリティによって異なります。これは、ログインしているユーザーと、選択されている顧客に基づいています。

### ドメインの実装
        
アプリケーション全体で共有されるコアドメイン型から始めます。

```fsharp
module Domain = 
    open Rop

    type CustomerId = CustomerId of int
    type CustomerData = CustomerData of string
    type Password = Password of string

    type FailureCase = 
        | AuthenticationFailed of string
        | AuthorizationFailed
        | CustomerNameNotFound of string
        | CustomerIdNotFound of CustomerId
        | OnlyAllowedOnce
        | CapabilityRevoked
```

`FailureCase`型は、アプリケーションのトップレベルで発生する可能性のあるすべてのエラーを文書化します。これについては、「[鉄道指向プログラミング](https://fsharpforfunandprofit.com/rop/)」のトークで詳しく説明しています。

### ケイパビリティの定義

次に、アプリケーションで使用可能なすべてのケイパビリティを文書化します。 
コードを明確にするために、各ケイパビリティには名前（つまり、型エイリアス）が付けられています。

```fsharp
type GetCustomerCap = unit -> SuccessFailure<CustomerData,FailureCase>                
```

最後に、`CapabilityProvider`は関数のレコードであり、各関数は顧客IDとプリンシパルを受け取り、指定された型のオプションのケイパビリティを返します。
このレコードはトップレベルのモデルで作成され、子コンポーネントに渡されます。

このモジュールの完全なコードを次に示します。

```fsharp
module Capabilities = 
    open Rop
    open Domain
        
    // ケイパビリティ
    type GetCustomerCap = unit -> SuccessFailure<CustomerData,FailureCase>
    type UpdateCustomerCap = unit -> CustomerData -> SuccessFailure<unit,FailureCase>
    type UpdatePasswordCap = Password -> SuccessFailure<unit,FailureCase>

    type CapabilityProvider = {
        /// customerIdとIPrincipalが与えられた場合、GetCustomerケイパビリティの取得を試みる
        getCustomer : CustomerId -> IPrincipal -> GetCustomerCap option
        /// customerIdとIPrincipalが与えられた場合、UpdateCustomerケイパビリティの取得を試みる
        updateCustomer : CustomerId -> IPrincipal -> UpdateCustomerCap option
        /// customerIdとIPrincipalが与えられた場合、UpdatePasswordケイパビリティの取得を試みる
        updatePassword : CustomerId -> IPrincipal -> UpdatePasswordCap option 
        }
```

このモジュールは、[ここで説明](https://fsharpforfunandprofit.com/rop/)されているのと同様の`SuccessFailure`結果型を参照していますが、ここでは示しません。

### 認証の実装

次に、独自の小さな認証システムを作成します。ユーザー「Zelda」が認証されると、ロールが「CustomerAgent」に設定されることに注意してください。

```fsharp
module Authentication = 
    open Rop
    open Domain 

    let customerRole = "Customer"
    let customerAgentRole = "CustomerAgent"

    let makePrincipal name role = 
        let iden = GenericIdentity(name)
        let principal = GenericPrincipal(iden,[|role|])
        principal :> IPrincipal

    let authenticate name = 
        match name with
        | "Alice" | "Bob" -> 
            makePrincipal name customerRole  |> Success
        | "Zelda" -> 
            makePrincipal name customerAgentRole |> Success
        | _ -> 
            AuthenticationFailed name |> Failure 

    let customerIdForName name = 
        match name with
        | "Alice" -> CustomerId 1 |> Success
        | "Bob" -> CustomerId 2 |> Success
        | _ -> CustomerNameNotFound name |> Failure

    let customerIdOwnedByPrincipal customerId (principle:IPrincipal) = 
        principle.Identity.Name
        |> customerIdForName 
        |> Rop.map (fun principalId -> principalId = customerId)
        |> Rop.orElse false
```

`customerIdForName`関数は、特定の名前に関連付けられている顧客IDを見つけようとしますが、
`customerIdOwnedByPrincipal`はこのIDを別のIDと比較します。

### 認可の実装

認可に関連する関数を次に示します。上記で説明したものと非常によく似ています。

```fsharp
module Authorization = 
    open Rop
    open Domain 

    let onlyForSameId (id:CustomerId) (principal:IPrincipal) (f:CustomerId -> 'a) = 
        if Authentication.customerIdOwnedByPrincipal id principal then
            Some (fun () -> f id)
        else
            None
 
    let onlyForAgents (id:CustomerId) (principal:IPrincipal) (f:CustomerId -> 'a) = 
        if principal.IsInRole(Authentication.customerAgentRole) then
            Some (fun () -> f id)
        else
            None

    let onlyIfDuringBusinessHours (time:DateTime) f = 
        if time.Hour >= 8 && time.Hour <= 17 then
            Some f
        else
            None

    // パスワード更新関数を呼び出すことができるユーザーを制限する
    let passwordUpdate (id:CustomerId) (principal:IPrincipal) (f:CustomerId*Password -> 'a) = 
        if Authentication.customerIdOwnedByPrincipal id principal then
            Some (fun password -> f (id,password))
        else
            None

    // 最初の適切なケイパビリティを返す（存在する場合）
    let first capabilityList = 
        capabilityList |> List.tryPick id

    // ケイパビリティオプションが与えられた場合、それを制限する
    let restrict filter originalCap = 
        originalCap
        |> Option.bind filter 

    /// ケイパビリティの使用は監査される
    let auditable capabilityName principalName f = 
        fun x -> 
            // シンプルな監査ログ！
            let timestamp = DateTime.UtcNow.ToString("u")
            printfn "AUDIT: User %s used capability %s at %s" principalName capabilityName timestamp 
            // ケイパビリティを使う
            f x

    /// 取り消し可能なケイパビリティと、
    /// 取り消しを行う関数のペアを返す
    let revokable f = 
        let allow = ref true
        let capability = fun x -> 
            if !allow then  //! 否定ではなく逆参照です！
                f x
            else
                Failure CapabilityRevoked
        let revoker() = 
            allow := false
        capability, revoker
```

### データベースの実装

データベースアクセスに関連する関数は、以前の例のものと似ていますが、今回は素朴なインメモリデータベース（単なる`Dictionary`）を実装しています。

```fsharp
module CustomerDatabase = 
    open Rop
    open System.Collections.Generic
    open Domain 

    let private db = Dictionary<CustomerId,CustomerData>()

    let getCustomer id = 
        match db.TryGetValue id with
        | true, value -> Success value 
        | false, _ -> Failure (CustomerIdNotFound id)

    let updateCustomer id data = 
        db.[id] <- data
        Success ()

    let updatePassword (id:CustomerId,password:Password) = 
        Success ()   // ダミー実装
```

### ビジネスサービスの実装

次に、「ビジネスサービス」（より良い言葉がないため）があり、すべての作業がここで行われます。

```fsharp
module BusinessServices =
    open Rop
    open Domain
    
    // getCustomerケイパビリティを使う
    let getCustomer capability =
        match capability() with
        | Success data -> printfn "%A" data
        | Failure err -> printfn ".. %A" err

    // updateCustomerケイパビリティを使う
    let updateCustomer capability =
        printfn "Enter new data: "
        let customerData = Console.ReadLine() |> CustomerData
        match capability () customerData  with
        | Success _ -> printfn "Data updated" 
        | Failure err -> printfn ".. %A" err

    // updatePasswordケイパビリティを使う
    let updatePassword capability =
        printfn "Enter new password: "
        let password = Console.ReadLine() |> Password
        match capability password  with
        | Success _ -> printfn "Password updated" 
        | Failure err -> printfn ".. %A" err
    
```

これらの各関数には、ジョブを実行するために必要なケイパビリティのみが渡されることに注意してください。このコードは、データベースなどについては何も知りません。

見ればわかるように、この簡素な例では、コードはコンソールに直接読み書きしています。
明らかに、より複雑な（そして洗練された！）設計では、これらの関数への入力はパラメーターとして渡されます。

*簡単な練習問題：コンソールへの直接アクセスを、`getDataWithPrompt`などのケイパビリティに置き換えてみましょう。*

### ユーザーインターフェースの実装

次に、複雑なコードのほとんどが存在するユーザーインターフェースモジュールについて説明します。

最初は、ユーザーインターフェースの状態を表す型（`CurrentState`）です。

* `LoggedOut`の場合、`IPrincipal`は使用できません。
* `LoggedIn`の場合、`IPrincipal`は使用できますが、選択された顧客はいません。
* `CustomerSelected`状態の場合、`IPrincipal`と`CustomerId`の両方が使用できます。
* 最後に、`Exit`状態はアプリをシャットダウンするためのシグナルです。

このような「状態」設計を使うのがとても好きです。なぜなら、誤ってアクセスすべきでないデータにアクセスできないようにするためです。
たとえば、顧客が選択されていない場合、その状態には顧客IDがないため、顧客にアクセスすることはできません。

各状態には、対応する関数があります。

`loggedOutActions`は、`LoggedOut`状態のときに実行されます。使用可能なアクションを表示し、それに応じて状態を変更します。
ユーザーとしてログインするか、終了することができます。ログインが成功した場合（`authenticate name`が機能した場合）、状態は`LoggedIn`に変更されます。

`loggedInActions`は、`LoggedIn`状態のときに実行されます。顧客を選択するか、ログアウトすることができます。
顧客の選択が成功した場合（`customerIdForName customerName`が機能した場合）、状態は`CustomerSelected`に変更されます。

`selectedCustomerActions`は、`CustomerSelected`状態のときに実行されます。これは次のように機能します。

* 最初に、どのようなケイパビリティを持っているかを調べます。
* 次に、各ケイパビリティを対応するメニューテキストに変換し（ケイパビリティがない可能性があるため、`Option.map`を使用します）、Noneのものを削除します。
* 次に、入力から行を読み取り、それが何であるかに応じて、「ビジネスサービス」（`getCustomer`、`updateCustomer`、または`updatePassword`）のいずれかを呼び出します。

最後に、`mainUiLoop`関数は、状態が`Exit`に設定されるまでループします。

```fsharp
module UserInterface =
    open Rop
    open Domain
    open Capabilities

    type CurrentState = 
        | LoggedOut
        | LoggedIn of IPrincipal
        | CustomerSelected of IPrincipal * CustomerId
        | Exit

    /// ログアウト中に使用可能なアクションを実行する。新しい状態を返す
    let loggedOutActions originalState = 
        printfn "[Login] enter Alice, Bob, Zelda, or Exit: "
        let action = Console.ReadLine()
        match action with
        | "Exit"  -> 
            // 状態をExitに変更する
            Exit
        | name -> 
            // それ以外の場合は、名前の認証を試みる
            match Authentication.authenticate name with
            | Success principal -> 
                LoggedIn principal
            | Failure err -> 
                printfn ".. %A" err
                originalState

    /// ログイン中に使用可能なアクションを実行する。新しい状態を返す
    let loggedInActions originalState (principal:IPrincipal) = 
        printfn "[%s] Pick a customer to work on. Enter Alice, Bob, or Logout: " principal.Identity.Name
        let action = Console.ReadLine()

        match action with
        | "Logout"  -> 
            // 状態をLoggedOutに変更する
            LoggedOut
        // それ以外の場合は、顧客名として扱う
        | customerName -> 
            // 顧客の検索を試みる           
            match Authentication.customerIdForName customerName with
            | Success customerId -> 
                // 見つかった - 状態を変更する
                CustomerSelected (principal,customerId)
            | Failure err -> 
                // 見つからない - 元の状態のままにする
                printfn ".. %A" err
                originalState 

    let getAvailableCapabilities capabilityProvider customerId principal = 
        let getCustomer = capabilityProvider.getCustomer customerId principal 
        let updateCustomer = capabilityProvider.updateCustomer customerId principal 
        let updatePassword = capabilityProvider.updatePassword customerId principal 
        getCustomer,updateCustomer,updatePassword  

    /// 選択された顧客が使用可能なときに使用可能なアクションを実行する。新しい状態を返す
    let selectedCustomerActions originalState capabilityProvider customerId principal = 
        
        // プロバイダーから個々のコンポーネントケイパビリティを取得する
        let getCustomerCap,updateCustomerCap,updatePasswordCap = 
            getAvailableCapabilities capabilityProvider customerId principal

        // 存在するケイパビリティに基づいて、メニューオプションのテキストを取得する
        let menuOptionTexts = 
            [
            getCustomerCap |> Option.map (fun _ -> "(G)et");
            updateCustomerCap |> Option.map (fun _ -> "(U)pdate");
            updatePasswordCap |> Option.map (fun _ -> "(P)assword");
            ] 
            |> List.choose id

        // メニューを表示する        
        let actionText =
            match menuOptionTexts with
            | [] -> " (no other actions available)"
            | texts -> texts |> List.reduce (fun s t -> s + ", " + t) 
        printfn "[%s] (D)eselect customer, %s" principal.Identity.Name actionText 

        // ユーザーアクションを処理する
        let action = Console.ReadLine().ToUpper()
        match action with
        | "D" -> 
            // 選択された顧客なしでログイン状態に戻る
            LoggedIn principal
        | "G" -> 
            // ケイパビリティがない場合に備えて、Option.iterを使う
            getCustomerCap 
              |> Option.iter BusinessServices.getCustomer 
            originalState  // 同じ状態にとどまる
        | "U" -> 
            updateCustomerCap 
              |> Option.iter BusinessServices.updateCustomer 
            originalState  
        | "P" -> 
            updatePasswordCap 
              |> Option.iter BusinessServices.updatePassword
            originalState  
        | _ -> 
            // 不明なオプション
            originalState  

    let rec mainUiLoop capabilityProvider state =
        match state with
        | LoggedOut -> 
            let newState = loggedOutActions state 
            mainUiLoop capabilityProvider newState 
        | LoggedIn principal -> 
            let newState = loggedInActions state principal
            mainUiLoop capabilityProvider newState 
        | CustomerSelected (principal,customerId) ->
            let newState = selectedCustomerActions state capabilityProvider customerId principal 
            mainUiLoop capabilityProvider newState 
        | Exit -> 
            () // 完了

    let start capabilityProvider  = 
        mainUiLoop capabilityProvider LoggedOut
```

### トップレベルモジュールの実装

これらすべてが揃ったので、トップレベルモジュールを実装できます。

このモジュールは、すべてのケイパビリティを取得し、前述のように制限を追加して、`capabilities`レコードを作成します。

`capabilities`レコードは、アプリの起動時にユーザーインターフェースに渡されます。

```fsharp
module Application=
    open Rop
    open Domain
    open CustomerDatabase 
    open Authentication
    open Authorization


    let capabilities = 

        let getCustomerOnlyForSameId id principal  = 
            onlyForSameId id principal CustomerDatabase.getCustomer

        let getCustomerOnlyForAgentsInBusinessHours id principal = 
            let f = CustomerDatabase.getCustomer
            let cap1 = onlyForAgents id principal f 
            let restriction f = onlyIfDuringBusinessHours (DateTime.Now) f
            cap1 |> restrict restriction 

        let getCustomerOnlyForSameId_OrForAgentsInBusinessHours id principal = 
            let cap1 = getCustomerOnlyForSameId id principal 
            let cap2 = getCustomerOnlyForAgentsInBusinessHours id principal 
            first [cap1; cap2]

        let updateCustomerOnlyForSameId id principal  = 
            onlyForSameId id principal CustomerDatabase.updateCustomer

        let updateCustomerOnlyForAgentsInBusinessHours id principal = 
            let f = CustomerDatabase.updateCustomer
            let cap1 = onlyForAgents id principal f 
            let restriction f = onlyIfDuringBusinessHours (DateTime.Now) f
            cap1 |> restrict restriction 

        let updateCustomerOnlyForSameId_OrForAgentsInBusinessHours id principal = 
            let cap1 = updateCustomerOnlyForSameId id principal 
            let cap2 = updateCustomerOnlyForAgentsInBusinessHours id principal 
            first [cap1; cap2]

        let updatePasswordOnlyForSameId id principal = 
            let cap = passwordUpdate id principal CustomerDatabase.updatePassword
            cap 
            |> Option.map (auditable "UpdatePassword" principal.Identity.Name) 

        // ケイパビリティを含むレコードを作成する
        {
        getCustomer = getCustomerOnlyForSameId_OrForAgentsInBusinessHours 
        updateCustomer = updateCustomerOnlyForSameId_OrForAgentsInBusinessHours 
        updatePassword = updatePasswordOnlyForSameId 
        }         

    let start() = 
        // ケイパビリティをUIに渡す
        UserInterface.start capabilities 
```
 
この例の完全なコードは、[ここ](https://gist.github.com/swlaschin/909c5b24bf921e5baa8c#file-capabilitybasedsecurity_consoleexample-fsx)のgistとして入手できます。

<a id="summary"></a>
 
## パート2のまとめ

パート2では、権限を制限するために適用できる別の関心事として、認可とその他の変換を追加しました。
繰り返しますが、このような関数の使い方は特に巧妙なものではありませんが、これが役立つ可能性のあるアイデアをいくつか提供してくれることを願っています。

**質問：なぜこんなに苦労するのですか？「IsAuthorized」フラグなどをチェックするだけよりも、どのような利点がありますか？**

認可フラグの一般的な使い方は次のとおりです。

```fsharp
if user.CanUpdate() then
   doTheAction()
```

前の投稿からの引用を思い出してください。「ケイパビリティは「フェールセーフ」である必要があります。
ケイパビリティを取得できない場合、または機能しない場合は、成功したと想定されるパスで進行を許可してはいけません。」

フラグをチェックすることの問題点は、**忘れやすく、コンパイラは忘れても文句を言わない**ことです。
そして、次のコードのように、セキュリティ侵害の可能性があります。

```fsharp
if user.CanUpdate() then
    // 無視する
    
// とにかくアクションを実行する！
doTheAction()
```

それだけでなく、このようにテストを「インライン化」することで、前述のように、セキュリティの関心事をメインコードに混在させています。

対照的に、単純なケイパビリティアプローチは次のようになります。

```fsharp
let updateCapability = // ケイパビリティの取得を試みる

match updateCapability with
| Some update -> update()  // 関数を呼び出す
| None -> ()               // 関数を呼び出すことができない
```

この例では、文字通り呼び出す関数がないため、許可されていない場合に誤ってケイパビリティを使用することは**不可能**です！
そして、これは実行時ではなくコンパイル時に処理する必要があります。

さらに、見てきたように、ケイパビリティは単なる関数であるため、インラインブールテストバージョンでは使用できないフィルタリングなどのすべての利点が得られます。

**質問：多くの場合、試してみるまでリソースにアクセスできるかどうかがわかりません。では、ケイパビリティは単なる余分な作業ではないでしょうか？**

これは確かに当てはまります。たとえば、最初にファイルが存在するかどうかをテストし、それからファイルにアクセスしようとする場合があります。
ITの神様は常にこのような場合は容赦なく、ファイルの存在を確認してから開こうとするまでの間に、ファイルはおそらく削除されてしまいます！

それでは、とにかく例外をチェックする必要があるため、1回で済むのに、なぜ2回の低速なI/O操作を行うのでしょうか？

答えは、ケイパビリティモデルは、物理的またはシステムレベルの権限ではなく、論理的な権限、つまりタスクを実行するために必要な最小限のものだけを持っているということです。

たとえば、Webサービスプロセスは高レベルのシステム権限で動作しており、任意のデータベースレコードにアクセスできます。
しかし、ほとんどのコードにそれを公開したくはありません。プログラミングロジックのエラーが誤って不正なデータを公開することがないようにしたいと考えています。

もちろん、ケイパビリティ関数自体がエラー処理を行う必要があり、
上記のコードスニペットでわかるように、[ここ](https://fsharpforfunandprofit.com/rop/)で説明されている`Success/Failure`結果型を使用しています。
その結果、`Failure OnlyAllowedOnce`などのケイパビリティ固有のエラーと、コア関数（データベースエラーなど）からのエラーをマージする必要があります。

**質問：各ケイパビリティに型が定義されたモジュール全体を作成しました。何百ものケイパビリティがあるかもしれません。本当にこの余分な作業をすべて行うことを期待していますか？**

ここでは2つのポイントがありますので、順番に説明します。

まず、きめ細かい認可をすでに使用しているシステム、
またはデータを漏洩したり、不正なコンテキストでアクションを実行したりしないことについてのビジネスクリティカルな要件があるシステム、またはセキュリティ監査が必要なシステムがありますか？

これらのいずれにも該当しない場合は、実際、このアプローチは完全にやり過ぎです！

ただし、*そのような*システムが*ある*場合は、いくつかの新しい疑問が生じます。

* 認可されているケイパビリティは、コード内のどこかで明示的に記述する必要がありますか？
* もしそうなら、ケイパビリティはコード全体で明示的であるべきですか、それともトップレベル（コントローラーなど）でのみ明示的で、他の場所では暗黙的であるべきですか？

この質問は、明示的にするか暗黙的にするかのどちらかになります。

個人的には、このようなものは明示的である方が好きです。
最初は少し余分な作業が必要になるかもしれませんが、各ケイパビリティを定義するためのほんの数行ですが、一般的に、後で問題が発生するのを防ぐことができることがわかりました。

また、サポートするすべてのセキュリティ関連のケイパビリティを文書化する単一の場所として機能するという利点があります。
新しい要件はここに新しいエントリを必要とするため、（開発者がこれらのプラクティスに従っていることを前提として）ケイパビリティがレーダーの下に忍び寄ることができないようにすることができます。

**質問：このコードでは、独自の認可を作成しています。適切な認可プロバイダーを使うべきではないですか？**

はい。このコードは単なる例です。
認可ロジックはドメインロジックとは完全に分離されているため、[`ClaimsAuthorizationManager`]([https://msdn.microsoft.com/en-us/library/system.security.claims.claimsauthorizationmanager.aspx)クラスや
[XACML](https://en.wikipedia.org/wiki/XACML)などの認可プロバイダーで簡単に置き換えることができます。

**質問がもっとあります...**

見逃した場合は、[パート1の最後](../posts/capability-based-security.md#summary)で追加の質問に回答しています。
それ以外の場合は、以下に質問を追加してください。対応させていただきます。


## 次回予告

[次の投稿](../posts/capability-based-security-3.md)では、型を使ってアクセストークンをエミュレートし、グローバル関数への不正アクセスを防ぐ方法を見ていきます。

*注：この投稿のすべてのコードは、[ここ](https://gist.github.com/swlaschin/909c5b24bf921e5baa8c#file-capabilitybasedsecurity_dbexample-fsx)と
[ここ](https://gist.github.com/swlaschin/909c5b24bf921e5baa8c#file-capabilitybasedsecurity_consoleexample-fsx)のgistとして入手できます。*
