---
layout: post
title: "型を使った設計：はじめに"
description: "設計をより透明にし、正確性を高める"
nav: thinking-functionally
seriesId: "型を使った設計"
seriesOrder: 1
categories: [型, DDD]
---

このシリーズでは、設計プロセスの一部として型を活用する方法について見ていきます。
特に、型を慎重に使うと、設計がより分かりやすくなり、同時に正確性も高められます。

このシリーズは設計の「ミクロレベル」に焦点を当てています。つまり、個々の型や関数の最も具体的なレベルで作業します。
より抽象的な設計アプローチや、関数型とオブジェクト指向スタイルの選択といった判断については、別のシリーズで議論します。

提案内容の多くはC#やJavaでも実現できますが、F#は型が軽量なので、このようなリファクタリングをやりやすいでしょう。

## 基本的な例

さまざまな型の使い方を示すために、非常に単純な例として、以下のような `Contact` 型を使います。

```fsharp
type Contact = 
    {
    FirstName: string;
    MiddleInitial: string;
    LastName: string;

    EmailAddress: string;
    //メールアドレスの所有権が確認された場合はtrue
    IsEmailVerified: bool;

    Address1: string;
    Address2: string;
    City: string;
    State: string;
    Zip: string;
    //住所サービスで検証された場合はtrue
    IsAddressValid: bool; 
    }

```

これは非常に明白に見えます。このようなものは何度も見たことがあると思います。では、これをどうすれば良いでしょうか。型システムを最大限に活かすために、どのようにリファクタリングできるでしょうか。

## 「アトミック」な型の作成

まず最初に、データアクセスと更新のパターンを見てみましょう。たとえば、`Zip` が更新されたときに `Address1` も同時に更新される可能性はありますか？ 一方、トランザクションで `EmailAddress` は更新されるが `FirstName` は更新されないことはよくあるかもしれません。

これにより、最初のガイドラインが導き出されます。

* *ガイドライン：一貫性を保つ必要がある（つまり「アトミック」な）データをグループ化し、関連のないデータを不必要にグループ化しないように、レコードやタプルを使います。*

この場合、3つの名前の値は1つのセット、住所の値は1つのセット、そしてメールも1つのセットであることは明らかです。

また、 `IsAddressValid` や `IsEmailVerified` のような追加のフラグもあります。これらは関連するセットの一部にすべきでしょうか？現時点では確かにそうすべきです。これらのフラグは関連する値に依存しているからです。

たとえば、 `EmailAddress` が変更された場合、おそらく同時に `IsEmailVerified` をfalseにリセットする必要があります。

`PostalAddress` については、 `IsAddressValid` フラグを除いたコアの「住所」部分が便利な共通型であることは明らかです。一方で、 `IsAddressValid` は住所に関連しており、住所が変わったときに更新されます。

したがって、*2つの*型を作るべきだと思われます。1つは汎用的な `PostalAddress` で、もう1つは連絡先の文脈における住所で、そちらは `PostalContactInfo` としましょう。

```fsharp
type PostalAddress = 
    {
    Address1: string;
    Address2: string;
    City: string;
    State: string;
    Zip: string;
    }

type PostalContactInfo = 
    {
    Address: PostalAddress;
    IsAddressValid: bool;
    }
```

最後に、オプション型を使うと、 `MiddleInitial` のような値が実際にオプションであることを示せます。

```fsharp
type PersonalName = 
    {
    FirstName: string;
    // オプション性を示すために"option"を使う
    MiddleInitial: string option;
    LastName: string;
    }
```

## まとめ

これらの変更を全て加えると、次のようなコードになります。

```fsharp
type PersonalName = 
    {
    FirstName: string;
    // オプション性を示すために"option"を使う
    MiddleInitial: string option;
    LastName: string;
    }

type EmailContactInfo = 
    {
    EmailAddress: string;
    IsEmailVerified: bool;
    }

type PostalAddress = 
    {
    Address1: string;
    Address2: string;
    City: string;
    State: string;
    Zip: string;
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

まだ関数を一つも書いていませんが、コードはすでにドメインをよりよく表現しています。しかし、これは私たちができることの始まりにすぎません。

次は、単一ケースの共用体を使って、プリミティブ型に意味を加える方法を見ていきます。
