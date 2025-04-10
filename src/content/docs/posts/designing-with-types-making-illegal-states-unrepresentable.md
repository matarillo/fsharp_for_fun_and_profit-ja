---
layout: post
title: "型を使った設計：不正な状態を表現不可能にする"
description: "型にビジネスロジックを組み込む"
nav: thinking-functionally
seriesId: "型を使った設計"
seriesOrder: 3
categories: ["型", "DDD"]
---

この記事では、F#の重要な利点の1つを見ていきます。それは型システムを使って「不正な状態を表現不可能にする」ことです。この表現は[Yaron Minsky](https://ocaml.janestreet.com/?q=node/85)から借りました。

まず、 `Contact` （連絡先）型を見てみましょう。前回のリファクタリングのおかげで、かなりシンプルになっています。

```fsharp
type Contact = 
    {
    Name: Name;
    EmailContactInfo: EmailContactInfo;
    PostalContactInfo: PostalContactInfo;
    }
```

ここで、「*連絡先にはメールアドレスまたは郵便住所のどちらかが必要*」という簡単なビジネスルールがあるとします。この型は、ルールに適合しているでしょうか。

答えは「いいえ」です。このビジネスルールは、連絡先がメールアドレスだけの場合や、郵便住所だけの場合があることを示しています。しかし、現状の型では、連絡先が常に *両方の* 情報を持つことを求めています。

解決方法は明らかに思えます。アドレスをどちらもオプション型にしてみましょう。

```fsharp
type Contact = 
    {
    Name: PersonalName;
    EmailContactInfo: EmailContactInfo option;
    PostalContactInfo: PostalContactInfo option;
    }
```

しかし、今度は行き過ぎました。この設計では、連絡先がどちらの種類のアドレスも持たない可能性があります。しかし、ビジネスルールでは、少なくともどちらかの情報が *必須* だと言っています。

では、どう解決すればいいのでしょうか。

## 不正な状態を表現不可能にする

ビジネスルールをよく考えると、3つの可能性があることがわかります。

* 連絡先にメールアドレスだけがある
* 連絡先に郵便住所だけがある
* 連絡先にメールアドレスと郵便住所の両方がある

このように考えると、解決方法は明らかです。各可能性に対応するケースを持つ共用体型を使いましょう。

```fsharp
type ContactInfo = 
    | EmailOnly of EmailContactInfo
    | PostOnly of PostalContactInfo
    | EmailAndPost of EmailContactInfo * PostalContactInfo

type Contact = 
    {
    Name: Name;
    ContactInfo: ContactInfo;
    }
```

この設計は完璧に要件を満たしています。3つのケースを明示的に表現し、4つ目の可能性（メールアドレスも郵便住所も持たない）は許していません。

なお、「メールと郵便住所の両方」のケースでは、とりあえずタプル型を使いました。ニーズは十分満たしています。

### ContactInfoの構築

では、これを実際にどう使うか見てみましょう。まず、新しい連絡先を作ります。

```fsharp
let contactFromEmail name emailStr = 
    let emailOpt = EmailAddress.create emailStr
    // メールが有効か無効かのケースを処理する
    match emailOpt with
    | Some email -> 
        let emailContactInfo = 
            {EmailAddress=email; IsEmailVerified=false}
        let contactInfo = EmailOnly emailContactInfo 
        Some {Name=name; ContactInfo=contactInfo}
    | None -> None

let name = {FirstName = "A"; MiddleInitial=None; LastName="Smith"}
let contactOpt = contactFromEmail name "abc@example.com"
```

このコードでは、名前とメールアドレスを渡して新しい連絡先を作る簡単なヘルパー関数 `contactFromEmail` を作りました。
ただし、メールアドレスが有効でない可能性があるので、関数は両方のケースを処理する必要があります。これは `Contact option` を返すことで行っています（ `Contact` をそのまま返すのは適切ではありません）。

### ContactInfoの更新

既存の `ContactInfo` に郵便住所を追加する必要がある場合、3つの可能性すべてを処理しなければなりません。

* 連絡先に以前はメールアドレスしか存在しなかった場合、現在はメールアドレスと郵便住所の両方があることになります。そのため、 `EmailAndPost` ケースを使って連絡先を返します。
* 連絡先に以前は郵便住所しか存在しなかった場合、 `PostOnly` ケースを使って連絡先を返し、既存の連絡先を置き換えます。
* 連絡先に以前はメールアドレスと郵便住所の両方が存在していた場合、 `EmailAndPost` ケースを使って連絡先を返し、既存の連絡先を置き換えます。

以下は、郵便住所を更新するヘルパーメソッドです。各ケースを明示的に処理していることがわかります。

```fsharp
let updatePostalAddress contact newPostalAddress = 
    let {Name=name; ContactInfo=contactInfo} = contact
    let newContactInfo =
        match contactInfo with
        | EmailOnly email ->
            EmailAndPost (email,newPostalAddress) 
        | PostOnly _ -> // 既存のアドレスを無視する
            PostOnly newPostalAddress 
        | EmailAndPost (email,_) -> // 既存のアドレスを無視する
            EmailAndPost (email,newPostalAddress) 
    // 新しい連絡先を作る
    {Name=name; ContactInfo=newContactInfo}
```

そして、コードの使用例がこちらです。

```fsharp
let contact = contactOpt.Value   // option.Valueの使用に関する警告は以下を参照
let newPostalAddress = 
    let state = StateCode.create "CA"
    let zip = ZipCode.create "97210"
    {   
        Address = 
            {
            Address1= "123 Main";
            Address2="";
            City="Beverly Hills";
            State=state.Value; // option.Valueの使用に関する警告は以下を参照
            Zip=zip.Value;     // option.Valueの使用に関する警告は以下を参照
            }; 
        IsAddressValid=false
    }
let newContact = updatePostalAddress contact newPostalAddress
```

*警告。このコードでは、オプションの内容を取り出すのに `option.Value` を使っています。
インタラクティブな操作中には問題ありませんが、本番コードではとても悪い習慣です。常にマッチングを使って、オプション型の両方のケースを処理するようにしましょう。*

## なぜこんな複雑な型を作る必要があるのか

この時点で、必要以上に複雑にしたのではないかと思うかもしれません。これに対しては、次のように答えたいと思います。

まず、ビジネスロジック *自体* が複雑なのです。これを避ける簡単な方法はありません。もしコードがこれほど複雑でないなら、すべてのケースを適切に処理していない可能性があります。

次に、ロジックを型で表現すれば、自動的に自己文書化されます。以下の共用体ケースを見るだけで、ビジネスルールが何かすぐにわかります。他のコードを分析するのに時間を費やす必要はありません。

```fsharp
type ContactInfo = 
    | EmailOnly of EmailContactInfo
    | PostOnly of PostalContactInfo
    | EmailAndPost of EmailContactInfo * PostalContactInfo
```

最後に、ロジックを型で表現すれば、ビジネスルールの変更はすぐに破壊的な変更を引き起こします。これは一般的に良いことです。

次の投稿では、最後の点についてさらに深く掘り下げます。型を使ってビジネスロジックを表現しようとすると、突然、ドメインに関する全く新しい洞察を得られることがあります。

