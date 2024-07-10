---
layout: post
title: "低オーバーヘッドの型定義"
description: "新しい型を作成するペナルティなし"
nav: why-use-fsharp
seriesId: "F# を使う理由"
seriesOrder: 9
categories: [Conciseness,Types]
---

C#では、新しい型を作成することに抵抗があります。型推論がないため、ほとんどの場所で型を明示的に指定する必要があり、結果として柔軟性が失われ、視覚的な煩雑さが増します。そのため、クラスをモジュール化するよりも、巨大なクラスを作成する誘惑に駆られがちです。

F#では新しい型を作成するペナルティがないので、数百、場合によっては数千の型を持つのが一般的です。構造を定義する必要があるたびに、文字列やリストなどの既存の型を再利用（そしてオーバーロード）するのではなく、特別な型を作成できます。

これにより、プログラムはより型安全で、自己文書化され、より保守しやすくなります（型が変更されたときに、実行時エラーではなく、即座にコンパイル時エラーが発生するため）。

F#での1行で定義できる型の例をいくつか紹介します：

```fsharp
open System

// いくつかの「レコード」型
type Person = {FirstName:string; LastName:string; Dob:DateTime}
type Coord = {Lat:float; Long:float}

// いくつかの「ユニオン」（選択）型
type TimePeriod = Hour | Day | Week | Year
type Temperature = C of int | F of int
type Appointment = OneTime of DateTime 
                   | Recurring of DateTime list
```

## F#の型とドメイン駆動設計

F#の型システムの簡潔さは、ドメイン駆動設計（DDD）を行う際に特に役立ちます。DDDでは、理想的には、実世界のエンティティと値オブジェクトごとに対応する型を持つことが望ましいです。これは数百の「小さな」型を作成することを意味し、C#では面倒な作業になる可能性があります。

さらに、DDDにおける「値」オブジェクトは構造的な等価性を持つべきで、同じデータを含む2つのオブジェクトは常に等しくなるべきです。C#ではこれは `IEquatable<T>` をオーバーライドするという面倒な作業を意味しますが、F#ではデフォルトでこれが無料で得られます。

F#でDDDの型を作成するのがいかに簡単かを示すために、シンプルな「顧客」ドメインで作成される可能性のある型の例をいくつか示します。

```fsharp
type PersonalName = {FirstName:string; LastName:string}

// 住所
type StreetAddress = {Line1:string; Line2:string; Line3:string }

type ZipCode =  ZipCode of string   
type StateAbbrev =  StateAbbrev of string
type ZipAndState =  {State:StateAbbrev; Zip:ZipCode }
type USAddress = {Street:StreetAddress; Region:ZipAndState}

type UKPostCode =  PostCode of string
type UKAddress = {Street:StreetAddress; Region:UKPostCode}

type InternationalAddress = {
    Street:StreetAddress; Region:string; CountryName:string}

// 選択型 -- これら3つの特定の型のいずれかでなければならない
type Address = USAddress | UKAddress | InternationalAddress

// メールアドレス
type Email = Email of string

// 電話番号
type CountryPrefix = Prefix of int
type Phone = {CountryPrefix:CountryPrefix; LocalNumber:string}

type Contact = 
    {
    PersonalName: PersonalName;
    // "option"は存在しない可能性があることを意味する
    Address: Address option;
    Email: Email option;
    Phone: Phone option;
    }

// すべてをCustomerAccount型にまとめる
type CustomerAccountId  = AccountId of string
type CustomerType  = Prospect | Active | Inactive

// 等価性をオーバーライドし、比較を拒否する
[<CustomEquality; NoComparison>]
type CustomerAccount = 
    {
    CustomerAccountId: CustomerAccountId;
    CustomerType: CustomerType;
    ContactInfo: Contact;
    }

    override this.Equals(other) =
        match other with
        | :? CustomerAccount as otherCust -> 
          (this.CustomerAccountId = otherCust.CustomerAccountId)
        | _ -> false

    override this.GetHashCode() = hash this.CustomerAccountId 
```

このコード断片には、わずか数行で17の型定義が含まれていますが、複雑さは最小限に抑えられています。同じことをC#で行うには、どれだけの行数が必要でしょうか？

もちろん、これは基本的な型だけを含む簡略版です。実際のシステムでは、制約やその他のメソッドが追加されるでしょう。しかし、 `ZipCode` や `Email` のような文字列のラッパー型など、多くのDDD値オブジェクトを作成するのがいかに簡単かに注目してください。これらのラッパー型を使用することで、作成時に特定の制約を強制し、通常のコードで制約のない文字列と混同されないようにすることができます。唯一の「エンティティ」型は `CustomerAccount` で、等価性と比較に特別な扱いが必要であることが明確に示されています。

より詳細な議論については、「[F#におけるドメイン駆動設計](../series/domain-driven-design-in-fsharp.md)」というシリーズをご覧ください。

