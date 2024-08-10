---
layout: post
title: "型を使った設計：新しい概念の発見"
description: "ドメインへのより深い洞察を得る"
nav: thinking-functionally
seriesId: "型を使った設計"
seriesOrder: 4
categories: [型, DDD]
---

前回の記事では、型を使ってビジネスルールを表現する方法を見てきました。

そのルールは「*連絡先には、メールアドレスまたは郵便住所が必要*」でした。

そして、設計した型は次のようなものでした。

```fsharp
type ContactInfo = 
    | EmailOnly of EmailContactInfo
    | PostOnly of PostalContactInfo
    | EmailAndPost of EmailContactInfo * PostalContactInfo
```

さて、ここで企業が電話番号のサポートも必要だと決めたとします。新しいビジネスルールは、「*連絡先には、メールアドレス、郵便住所、自宅電話、または勤務先電話のうち、少なくとも1つが必要*」となります。

これをどのように表現すればよいでしょうか。

少し考えてみると、この4つの連絡方法の組み合わせは 15 通りあります。15個の選択肢を持つ判別共用体を作るのは望ましくないはずです。もっと良い方法はないでしょうか。

この疑問はひとまず保留にして、関連する別の問題を見てみましょう。

## 要件が変更されたときに破壊的変更を強制する

ここで問題となるのは、次のような状況です。メールアドレスのリストと郵便住所のリストを含む連絡先構造があるとします。

```fsharp
type ContactInformation = 
    {
    EmailAddresses : EmailContactInfo list;
    PostalAddresses : PostalContactInfo list
    }
```

そして、情報をループ処理してレポートに出力する `printReport` 関数を作ったとします。

```fsharp
// モックコード            
let printEmail emailAddress = 
    printfn "メールアドレス：%s" emailAddress 

// モックコード
let printPostalAddress postalAddress = 
    printfn "郵便住所：%s" postalAddress 

let printReport contactInfo = 
    let {
        EmailAddresses = emailAddresses; 
        PostalAddresses = postalAddresses; 
        } = contactInfo
    for email in emailAddresses do
         printEmail email
    for postalAddress in postalAddresses do
         printPostalAddress postalAddress 
```

シンプルですが、わかりやすいコードです。

ここで新しいビジネスルールが適用されると、構造を変更して電話番号用の新しいリストを追加することにするかもしれません。更新された構造は次のようになります。

```fsharp
type PhoneContactInfo = string // 仮の定義

type ContactInformation = 
    {
    EmailAddresses : EmailContactInfo list;
    PostalAddresses : PostalContactInfo list;
    HomePhones : PhoneContactInfo list;
    WorkPhones : PhoneContactInfo list;
    }
```

この変更を行う場合、連絡先情報を処理するすべての関数を更新して、新しい電話番号のケースも処理できるようにしたいものです。

確かに、壊れてしまうパターンマッチは修正しなければなりません。しかし、多くの場合、新しいケースを処理するように**強制**はされません。

たとえば、新しいリストに対応するように更新された `printReport` 関数を見てみましょう。

```fsharp
let printReport contactInfo = 
    let {
        EmailAddresses = emailAddresses; 
        PostalAddresses = postalAddresses; 
        } = contactInfo
    for email in emailAddresses do
         printEmail email
    for postalAddress in postalAddresses do
         printPostalAddress postalAddress 
```

意図的なミスがあるのがわかりますか？そう、電話に対応するように関数を変更することを忘れています。レコードの新しいフィールドはコードをまったく壊していないので、新しいケースを処理することを覚えている保証はありません。忘れてしまうことは簡単です。

ここでも、このような状況が簡単に起こらないように型を設計できるのかという課題が残ります。

## ドメインへのより深い洞察

この例についてもう少し深く考えてみると、木を見て森を見ていなかったことに気づきます。

当初の概念は、「*顧客に連絡するには、メールアドレスのリスト、住所のリストなどがある*」というものでした。

しかし、実際にはこれはまったく正しくありません。もっと良い概念は、「*顧客に連絡するには、連絡方法のリストがある。各連絡方法は、メールアドレス *または* 郵便住所 *または* 電話番号のいずれかである*」というものです。

これは、ドメインをモデル化する方法についての重要な洞察です。これにより、「ContactMethod（連絡方法）」というまったく新しい型が生まれ、一気に問題が解決します。

この新しい概念を使って、型をすぐにリファクタリングできます。

```fsharp
type ContactMethod = 
    | Email of EmailContactInfo 
    | PostalAddress of PostalContactInfo 
    | HomePhone of PhoneContactInfo 
    | WorkPhone of PhoneContactInfo 

type ContactInformation = 
    {
    ContactMethods  : ContactMethod list;
    }
```

そして、レポート作成のコードも新しい型に対応するように変える必要があります。

```fsharp
// モックコード            
let printContactMethod cm = 
    match cm with
    | Email emailAddress -> 
        printfn "メールアドレス：%s" emailAddress 
    | PostalAddress postalAddress -> 
         printfn "郵便住所：%s" postalAddress 
    | HomePhone phoneNumber -> 
        printfn "自宅電話：%s" phoneNumber 
    | WorkPhone phoneNumber -> 
        printfn "勤務先電話：%s" phoneNumber 

let printReport contactInfo = 
    let {
        ContactMethods=methods; 
        } = contactInfo
    methods
    |> List.iter printContactMethod
```

これらの変更には多くの利点があります。

まず、モデリングの観点から、新しい型はドメインをより適切に表現しており、要件の変更にも対応しやすくなっています。

そして、開発の観点からは、型を判別共用体に変えることで、新しいケースを追加（または削除）した場合に、非常に明確な形でコードが壊れるため、すべてのケースを処理するのをうっかり忘れることが難しくなります。

## 組み合わせが15 通りあるビジネスルールに戻る

では、元の例に戻りましょう。ビジネスルールをエンコードするために、さまざまな連絡方法について15通りの組み合わせを作る必要があるかもしれないと考えていました。

しかし、レポート作成の問題から得た新しい洞察は、ビジネスルールの理解にも影響を与えます。

「連絡方法」という概念を念頭に置くと、要件は「*顧客は少なくとも 1 つの連絡方法を持つ必要がある。連絡方法は、メールアドレス *または* 郵便住所 *または* 電話番号のいずれかである*」と言い換えられます。

そこで、 `Contact` 型を連絡方法のリストを持つように再設計しましょう。

```fsharp
type Contact = 
    {
    Name: PersonalName;
    ContactMethods: ContactMethod list;
    }
```

しかし、これでもまだ完全ではありません。リストが空である可能性があります。 *少なくとも* 1つの連絡方法が必要であるというルールをどのように強制できるでしょうか。

最も簡単な方法は、必須の新しいフィールドを作ることです。

```fsharp
type Contact = 
    {
    Name: PersonalName;
    PrimaryContactMethod: ContactMethod;
    SecondaryContactMethods: ContactMethod list;
    }
```

この設計では、 `PrimaryContactMethod` は必須で、二次的な連絡方法はオプションです。これはまさにビジネスルールが求めていることです。

このリファクタリングも、私たちに洞察を与えてくれました。「主要な」連絡方法と「二次的な」連絡方法という概念が、他のドメインのコードをも明確にする可能性があり、洞察とリファクタリングの連鎖的な変化を引き起こすかもしれません。

## まとめ

この投稿では、型を使ってビジネスルールをモデリングすることで、ドメインをより深く理解することができることを説明しました。

*エリック・エヴァンス著の『ドメイン駆動設計』では、1つのセクション全体と特に2つの章（第8章と第9章）を割いて、[より深い洞察に向けたリファクタリング](https://www.dddcommunity.org/wp-content/uploads/files/books/evans_pt03.pdf)の重要性を議論しています。この投稿の例は比較的単純ですが、このような洞察がモデルとコードの正確性の両方を良くするのに役立つことを示せたと思います。

次の投稿では、細かい状態を表現するのに型がどのように役立つかを見ていきます。











