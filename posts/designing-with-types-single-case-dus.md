---
layout: post
title: "型を使った設計：単一ケース共用体"
description: "プリミティブ型に意味を持たせる"
nav: thinking-functionally
seriesId: "型を使った設計"
seriesOrder: 2
categories: [型, DDD]
---

前回の記事では、メールアドレス、郵便番号などの値を単なる文字列として次のように定義しました。

```fsharp

EmailAddress: string;
State: string;
Zip: string;

```

でも、本当にただの文字列なのでしょうか？メールアドレスは郵便番号や州の略称と入れ替え可能なのでしょうか？

ドメイン駆動設計では、これらは単なる文字列ではなく、それぞれが明確に区別されるべきものです。そのため、混同を防ぐために、それぞれの値型を定義したいところです。

これは[昔から推奨されている手法です](https://web.archive.org/web/20190525032649/http://codemonkeyism.com/never-never-never-use-string-in-java-or-at-least-less-often/)。
C#やJavaのような言語では、このような小さな型を何百も作るのは面倒です。そのため、いわゆる「[プリミティブ型執着](https://sourcemaking.com/refactoring/smells/primitive-obsession)」というコードの臭いにつながります。

でも、F# なら言い訳はできません！単純なラッパー型を作るのは簡単です。

## プリミティブ型をラップする

別の型を作る最も簡単な方法は、基になる文字列型を別の型の中にラップすることです。

単一ケース共用体型を使って、こう書けます。

```fsharp
type EmailAddress = EmailAddress of string
type ZipCode = ZipCode of string
type StateCode = StateCode of string
```

あるいは、1つのフィールドを持つレコード型を使って、こうも書けます。

```fsharp
type EmailAddress = { EmailAddress: string }
type ZipCode = { ZipCode: string }
type StateCode = { StateCode: string}
```

どちらのアプローチでも、文字列や他のプリミティブ型をラップするのに使えますが、どちらが優れているのでしょうか？

一般的には、単一ケース共用体型の方が優れています。「共用体のケース」自体が適切なコンストラクタ関数として機能するので、「ラップ」と「アンラップ」がとても簡単です。アンラップはインラインのパターンマッチングを使ってできます。

`EmailAddress` 型の構築と分解の例を以下に示します。

```fsharp
type EmailAddress = EmailAddress of string

// コンストラクタを関数として使う
"a" |> EmailAddress
["a"; "b"; "c"] |> List.map EmailAddress

// インラインでの分解
let a' = "a" |> EmailAddress
let (EmailAddress a'') = a'

let addresses = 
    ["a"; "b"; "c"] 
    |> List.map EmailAddress

let addresses' = 
    addresses
    |> List.map (fun (EmailAddress e) -> e)
```

レコード型では、これほど簡単にできません。

では、これらの共用体型を使ってコードをリファクタリングしてみましょう。次のようになります。

```fsharp
type PersonalName = 
    {
    FirstName: string;
    MiddleInitial: string option;
    LastName: string;
    }

type EmailAddress = EmailAddress of string

type EmailContactInfo = 
    {
    EmailAddress: EmailAddress;
    IsEmailVerified: bool;
    }

type ZipCode = ZipCode of string
type StateCode = StateCode of string

type PostalAddress = 
    {
    Address1: string;
    Address2: string;
    City: string;
    State: StateCode;
    Zip: ZipCode;
    }

type PostalContactInfo = 
    {
    Address: PostalAddress;
    IsAddressValid: bool;
    }

type Contact = 
    {
    Name: PersonalName;
    EmailContactInfo: EmailContactInfo;
    PostalContactInfo: PostalContactInfo;
    }
```

共用体型のもう一つの良い点は、モジュールシグネチャを使って実装をカプセル化できることです。これについては後ほど説明します。

## 単一ケース共用体の「ケース」に名前をつける

上の例では、ケースに型と同じ名前を使いました。

```fsharp
type EmailAddress = EmailAddress of string
type ZipCode = ZipCode of string
type StateCode = StateCode of string
```

最初は混乱するかもしれませんが、実際には異なるスコープにあるので、名前の衝突はありません。一方は型で、もう一方は同じ名前のコンストラクタ関数です。

したがって、次のような関数シグネチャを見たら、

```fsharp
val f: string -> EmailAddress
```

これは型の世界のことを指していて、 `EmailAddress` は型を表します。

一方、次のようなコードを見たら、

```fsharp
let x = EmailAddress y
```

これは値の世界のことを指していて、 `EmailAddress` はコンストラクタ関数を表します。

## 単一ケース共用体を構築する

メールアドレスや郵便番号のような特別な意味を持つ値には、通常、特定の値のみが許可されます。すべての文字列が有効なメールアドレスや郵便番号というわけではありません。

これは、ある時点でバリデーションを行う必要があることを意味します。構築時に行うのが最適です。値が構築されると不変になるので、後で誰かが変更する心配はありません。

以下は、上記のモジュールにコンストラクタ関数を追加する方法です。

```fsharp

... 上記の型定義 ...

let CreateEmailAddress (s:string) = 
    if System.Text.RegularExpressions.Regex.IsMatch(s,@"^\S+@\S+\.\S+$") 
        then Some (EmailAddress s)
        else None

let CreateStateCode (s:string) = 
    let s' = s.ToUpper()
    let stateCodes = ["AZ";"CA";"NY"] //など
    if stateCodes |> List.exists ((=) s')
        then Some (StateCode s')
        else None
```

コンストラクタをテストできます。

```fsharp
CreateStateCode "CA"
CreateStateCode "XX"

CreateEmailAddress "a@example.com"
CreateEmailAddress "example.com"
```

## コンストラクタでの無効な入力の処理

このようなコンストラクタ関数では、無効な入力をどう扱うかがすぐに課題となります。
たとえば、メールアドレスのコンストラクタに "abc" を渡した場合、どうすべきでしょうか？

これに対処する方法はいくつかあります。

まず、例外を投げる方法があります。個人的にはこれは醜く創造性のない方法だと思うので、最初から却下します！

次に、オプション型を返す方法があります。 `None` は入力が無効だったことを意味します。上記のコンストラクタ関数はこれを行います。

これは一般的に最も簡単なアプローチです。値が無効な場合を呼び出し側が明示的に処理しなければならないという利点があります。

たとえば、上記の例に対する呼び出し側のコードは次のようになります。
```fsharp
match (CreateEmailAddress "a@example.com") with
| Some email -> ... emailを使って何かを行う
| None -> ... 無視する？
```

欠点は、複雑なバリデーションの場合、何が問題だったのかが明らかでない可能性があることです。メールアドレスが長すぎたのか、 '@' 記号が欠けていたのか、無効なドメインだったのか、分かりません。

より詳細な情報が必要な場合は、失敗時により詳細な説明を含む型を返すことができます。

次の例では、失敗時にエラーを示す `CreationResult` 型を使っています。

```fsharp
type EmailAddress = EmailAddress of string
type CreationResult<'T> = Success of 'T | Error of string            

let CreateEmailAddress2 (s:string) = 
    if System.Text.RegularExpressions.Regex.IsMatch(s,@"^\S+@\S+\.\S+$") 
        then Success (EmailAddress s)
        else Error "メールアドレスには@記号が含まれている必要があります"

// テスト
CreateEmailAddress2 "example.com"
```

最後に、最も一般的なアプローチは継続を使います。つまり、成功の場合（新しく構築されたメールを引数に取る）と失敗の場合（エラー文字列を引数に取る）の2つの関数を渡します。

```fsharp
type EmailAddress = EmailAddress of string

let CreateEmailAddressWithContinuations success failure (s:string) = 
    if System.Text.RegularExpressions.Regex.IsMatch(s,@"^\S+@\S+\.\S+$") 
        then success (EmailAddress s)
        else failure "メールアドレスには@記号が含まれている必要があります"
```

成功関数はメールを引数として受け取り、エラー関数は文字列を受け取ります。両方の関数は同じ型を返す必要がありますが、その型は自由に選べます。

簡単な例を次に示します。両方の関数が printf を実行し、何も返しません（つまりunitを返す）。

```fsharp
let success (EmailAddress s) = printfn "メールの作成に成功しました。 %s" s        
let failure  msg = printfn "メールの作成中にエラーが発生しました。 %s" msg
CreateEmailAddressWithContinuations success failure "example.com"
CreateEmailAddressWithContinuations success failure "x@example.com"
```

継続を使えば、他のアプローチも簡単に再現できます。たとえば、オプションを作成する方法を次に示します。この場合、両方の関数が `EmailAddress option` を返します。

```fsharp
let success e = Some e
let failure _  = None
CreateEmailAddressWithContinuations success failure "example.com"
CreateEmailAddressWithContinuations success failure "x@example.com"
```

そして、エラーの場合に例外を投げる方法は以下の通りです。

```fsharp
let success e = e
let failure _  = failwith "不正なメールアドレス"
CreateEmailAddressWithContinuations success failure "example.com"
CreateEmailAddressWithContinuations success failure "x@example.com"
```

このコードは非常に冗長に見えますが、実際には長々とした関数の代わりに、部分適用された関数を作って使うことが多いでしょう。

```fsharp
// 部分適用された関数を設定
let success e = Some e
let failure _  = None
let createEmail = CreateEmailAddressWithContinuations success failure

// 部分適用された関数を使う
createEmail "x@example.com"
createEmail "example.com"
```

## ラッパー型のモジュールを作る

単純なラッパー型も、バリデーションを追加したことで複雑になり始めています。今後他の関数も関連付けたい可能性が出てきました。

そこで、ラッパー型ごとにモジュールを作り、型と関連する関数を配置するのが良いでしょう。

```fsharp
module EmailAddress = 

    type T = EmailAddress of string

    // ラップ
    let create (s:string) = 
        if System.Text.RegularExpressions.Regex.IsMatch(s,@"^\S+@\S+\.\S+$") 
            then Some (EmailAddress s)
            else None
    
    // アンラップ
    let value (EmailAddress e) = e
```

型の利用者は、モジュール関数を使って型を作成したり、アンラップしたりします。次のようになります。

```fsharp

// メールアドレスを作成
let address1 = EmailAddress.create "x@example.com"
let address2 = EmailAddress.create "example.com"

// メールアドレスをアンラップ
match address1 with
| Some e -> EmailAddress.value e |> printfn "値は %s です"
| None -> ()
```

## コンストラクタの使用を強制する

一つの問題は、呼び出し側にコンストラクタの使用を強制できないことです。バリデーションをバイパスして型を直接作ることができてしまいます。

実際には、これはあまり問題にはなりません。一つの簡単な方法として、「プライベート」な型であることを命名規則で示し、
呼び出し側が直接型とやり取りする必要がないように「ラップ」と「アンラップ」関数を提供することです。

以下は例です。

```fsharp

module EmailAddress = 

    // プライベート型
    type _T = EmailAddress of string

    // ラップ
    let create (s:string) = 
        if System.Text.RegularExpressions.Regex.IsMatch(s,@"^\S+@\S+\.\S+$") 
            then Some (EmailAddress s)
            else None
    
    // アンラップ
    let value (EmailAddress e) = e
```

もちろん、この場合型は実際にはプライベートではありませんが、呼び出し側には常に「公開」された関数を使うよう促しています。

型の内部を完全にカプセル化し、呼び出し側にコンストラクタ関数の使用を強制したい場合は、モジュールシグネチャを使えます。

メールアドレスの例に対するシグネチャファイルは次のようになります。

```fsharp
// ファイル名。 EmailAddress.fsi

module EmailAddress  

// カプセル化された型
type T

// ラップ
val create : string -> T option
    
// アンラップ
val value : T -> string
```

（注：モジュールシグネチャはコンパイルされたプロジェクトでのみ機能し、インタラクティブスクリプトでは機能しません。テストするには、ここに示すようなファイル名を付けてF#プロジェクトに3つのファイルを作る必要があります。）

以下は実装ファイルです。

```fsharp
// ファイル名: EmailAddress.fs

module EmailAddress  

// カプセル化された型
type T = EmailAddress of string

// ラップ
let create (s:string) = 
    if System.Text.RegularExpressions.Regex.IsMatch(s,@"^\S+@\S+\.\S+$") 
        then Some (EmailAddress s)
        else None
    
// アンラップ
let value (EmailAddress e) = e

```

そして、これが呼び出し側です。

```fsharp
// ファイル名: EmailAddressClient.fs

module EmailAddressClient

open EmailAddress

// 公開された関数を使うコードは動作します
let address1 = EmailAddress.create "x@example.com"
let address2 = EmailAddress.create "example.com"

// 型の内部を使うコードはコンパイルエラーになります
let address3 = T.EmailAddress "不正なメール"

```

モジュールシグネチャによってエクスポートされた `EmailAddress.T` 型は不透明なので、呼び出し側は内部にアクセスできません。

見てのとおり、このアプローチはコンストラクタの使用を強制します。型を直接作ろうとすると（ `T.EmailAddress "不正なメール"` ）、コンパイルエラーが発生します。


## 単一ケース共用体を「ラップ」するタイミング
   
ラッパー型を作ったら、いつ構築すべきでしょうか？

一般的に、サービス境界（たとえば、[ヘキサゴナルアーキテクチャ](http://alistair.cockburn.us/Hexagonal+architecture)における境界）でのみ必要です。

このアプローチでは、ラッピングはUIレイヤーで行うか、永続化レイヤーからロードする際に行います。ラップされた型が作られると、ドメインレイヤーに渡され、不透明な型として「全体的に」操作されます。
驚くべきことに、ドメイン自体で作業する際に、ラップされた内容を直接必要とすることはあまりありません。

構築の一部として、呼び出し側が独自のバリデーションロジックを行うのではなく、提供されたコンストラクタを使うことが重要です。これにより、「不正な」値がドメインに入ることを防ぎます。

たとえば、以下はUIが独自のバリデーションを行うコードを示しています。

```fsharp
let processFormSubmit () = 
    let s = uiTextBox.Text
    if (s.Length < 50) 
        then // ドメインオブジェクトにメールを設定
        else // バリデーションエラーメッセージを表示        
```

より良い方法は、先ほど示したように、コンストラクタにそれを任せることです。

```fsharp
let processFormSubmit () = 
    let emailOpt = uiTextBox.Text |> EmailAddress.create 
    match emailOpt with
    | Some email -> // ドメインオブジェクトにメールを設定
    | None -> // バリデーションエラーメッセージを表示
```

## 単一ケース共用体を「アンラップ」するタイミング

では、アンラップはいつ必要でしょうか？これも一般的にはサービス境界のみです。たとえば、メールをデータベースに永続化する場合や、UIエレメントやビューモデルにバインドする場合です。

明示的なアンラップを避けるためのヒントとして、継続のアプローチを再び使い、ラップされた値に適用される関数を渡すことができます。

つまり、「アンラップ」関数を明示的に呼び出す代わりに、

```fsharp
address |> EmailAddress.value |> printfn "値は %s です" 
```

内部の値に適用される関数を渡します。

```fsharp
address |> EmailAddress.apply (printfn "値は %s です")
```

これをまとめて、完成した `EmailAddress` モジュールは以下のようになります。

```fsharp
module EmailAddress = 

    type _T = EmailAddress of string

    // 継続を使って作成
    let createWithCont success failure (s:string) = 
        if System.Text.RegularExpressions.Regex.IsMatch(s,@"^\S+@\S+\.\S+$") 
            then success (EmailAddress s)
            else failure "メールアドレスには@記号が含まれている必要があります"

    // 直接作成
    let create s = 
        let success e = Some e
        let failure _  = None
        createWithCont success failure s

    // 継続を使ってアンラップ
    let apply f (EmailAddress e) = f e

    // 直接アンラップ
    let value e = apply id e

```

`create` 関数と `value` 関数は厳密には必要ありませんが、呼び出し側の利便性のために追加しています。

## これまでのコード

新しいラッパー型とモジュールを追加して、 `Contact` コードをリファクタリングしてみましょう。

```fsharp
module EmailAddress = 

    type T = EmailAddress of string

    // 継続を使って作成
    let createWithCont success failure (s:string) = 
        if System.Text.RegularExpressions.Regex.IsMatch(s,@"^\S+@\S+\.\S+$") 
            then success (EmailAddress s)
            else failure "メールアドレスには@記号が含まれている必要があります"

    // 直接作成
    let create s = 
        let success e = Some e
        let failure _  = None
        createWithCont success failure s

    // 継続を使ってアンラップ
    let apply f (EmailAddress e) = f e

    // 直接アンラップ
    let value e = apply id e

module ZipCode = 

    type T = ZipCode of string

    // 継続を使って作成
    let createWithCont success failure  (s:string) = 
        if System.Text.RegularExpressions.Regex.IsMatch(s,@"^\d{5}$") 
            then success (ZipCode s) 
            else failure "郵便番号は5桁である必要があります"
    
    // 直接作成
    let create s = 
        let success e = Some e
        let failure _  = None
        createWithCont success failure s

    // 継続を使ってアンラップ
    let apply f (ZipCode e) = f e

    // 直接アンラップ
    let value e = apply id e

module StateCode = 

    type T = StateCode of string

    // 継続を使って作成
    let createWithCont success failure  (s:string) = 
        let s' = s.ToUpper()
        let stateCodes = ["AZ";"CA";"NY"] //など
        if stateCodes |> List.exists ((=) s')
            then success (StateCode s') 
            else failure "州がリストにありません"
    
    // 直接作成
    let create s = 
        let success e = Some e
        let failure _  = None
        createWithCont success failure s

    // 継続を使ってアンラップ
    let apply f (StateCode e) = f e

    // 直接アンラップ
    let value e = apply id e

type PersonalName = 
    {
    FirstName: string;
    MiddleInitial: string option;
    LastName: string;
    }

type EmailContactInfo = 
    {
    EmailAddress: EmailAddress.T;
    IsEmailVerified: bool;
    }

type PostalAddress = 
    {
    Address1: string;
    Address2: string;
    City: string;
    State: StateCode.T;
    Zip: ZipCode.T;
    }

type PostalContactInfo = 
    {
    Address: PostalAddress;
    IsAddressValid: bool;
    }

type Contact = 
    {
    Name: PersonalName;
    EmailContactInfo: EmailContactInfo;
    PostalContactInfo: PostalContactInfo;
    }

```

ちなみに、3つのラッパー型モジュールにかなり重複したコードがあることに気づきましたか？重複を取り除くか、少なくともよりクリーンにする良い方法はあるでしょうか？

## まとめ

判別共用体（共用体型）の使用について、以下にガイドラインをまとめます。

* ドメインを正確に表現する型を作るために、単一ケース共用体を使います。
* ラップされた値にバリデーションが必要な場合は、バリデーションを行うコンストラクタを提供し、その使用を強制します。
* バリデーションが失敗した場合の処理を明確にします。単純なケースではオプション型を返します。より複雑なケースでは、呼び出し側に成功と失敗のハンドラーを渡させます。
* ラップされた値に関連する関数がたくさんある場合は、専用のモジュールに移すことを検討します。
* カプセル化を強制する必要がある場合は、シグネチャファイルを使います。

リファクタリングはまだ終わっていません。型の設計を変更することで、コンパイル時にビジネスルールを強制し、不正な状態を表現できないようにすることができます。
 
<a name="update"></a> 

## 追記

`EmailAddress` のような制約付きの型が特別なコンストラクタを通じてのみ作られるようにする方法について、多くの方からご質問をいただきました。
そこで、[gist](https://gist.github.com/swlaschin/54cfff886669ccab895a)を作り、他の方法の詳細な例をいくつか紹介しました。