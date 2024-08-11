---
layout: post
title: "型を使った設計：結論"
description: "変更前と変更後の比較"
nav: thinking-functionally
seriesId: "型を使った設計"
seriesOrder: 8
categories: [型, DDD]
---

このシリーズでは、設計プロセスの一部として型を使う方法をいくつか見てきました。具体的には次のようなものです。

* 大きな構造を小さい「原子的な」部品に分ける。
* 単一ケースの共用体を使って、 `EmailAddress` や `ZipCode` などの重要なドメイン型に意味と検証を加える。
* 型システムで有効なデータだけを表せるようにする（「不正な状態を表現できなくする」）。
* 型を分析ツールとして使い、隠れた要件を明らかにする。
* フラグや列挙型を簡単なステートマシンに置き換える。
* プリミティブな文字列を、さまざまな制約を保証する型に置き換える。

最終回となる今回は、これらをすべてまとめて適用してみましょう。

## 「変更前」のコード ##

シリーズの[最初の投稿](../posts/designing-with-types-intro.md)で使用した、最初の例を見てみましょう。

```fsharp
type Contact = 
    {
    FirstName: string;
    MiddleInitial: string;
    LastName: string;

    EmailAddress: string;
    //メールアドレスの所有権が確認されている場合はtrue
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

上記のテクニックをすべて適用した後の最終結果は、どのように異なるでしょうか？

## 「変更後」のコード ##

まず、アプリケーション固有ではない型から始めましょう。これらの型は、おそらく多くのアプリケーションで再利用できるでしょう。

```fsharp
// ========================================
// WrappedString 
// ========================================

/// ラップされた文字列の共通コード
module WrappedString = 

    /// すべてのラップされた文字列がサポートするインターフェース
    type IWrappedString = 
        abstract Value : string

    /// ラップされた値オプションを作る
    /// 1) まず入力を正規化する
    /// 2) 検証が成功した場合、与えられたコンストラクタのSomeを返す
    /// 3) 検証が失敗した場合、Noneを返す
    /// null値は決して有効ではない
    let create canonicalize isValid ctor (s:string) = 
        if s = null 
        then None
        else
            let s' = canonicalize s
            if isValid s'
            then Some (ctor s') 
            else None

    /// ラップされた値に指定された関数を適用する
    let apply f (s:IWrappedString) = 
        s.Value |> f 

    /// ラップされた値を取得する
    let value s = apply id s

    /// 等価性 
    let equals left right = 
        (value left) = (value right)

    /// 比較
    let compareTo left right = 
        (value left).CompareTo (value right)

    /// 構築前に文字列を正規化する
    /// * すべての空白文字をスペース文字に変える
    /// * 両端をトリムする
    let singleLineTrimmed s =
        System.Text.RegularExpressions.Regex.Replace(s,"\s"," ").Trim()

    /// 長さに基づく検証関数
    let lengthValidator len (s:string) =
        s.Length <= len 

    /// 長さ100の文字列
    type String100 = String100 of string with
        interface IWrappedString with
            member this.Value = let (String100 s) = this in s

    /// 長さ100の文字列のコンストラクタ
    let string100 = create singleLineTrimmed (lengthValidator 100) String100 

    /// ラップされた文字列を長さ100の文字列に変える
    let convertTo100 s = apply string100 s

    /// 長さ50の文字列
    type String50 = String50 of string with
        interface IWrappedString with
            member this.Value = let (String50 s) = this in s

    /// 長さ50の文字列のコンストラクタ
    let string50 = create singleLineTrimmed (lengthValidator 50)  String50

    /// ラップされた文字列を長さ50の文字列に変える
    let convertTo50 s = apply string50 s

    /// マップヘルパー
    let mapAdd k v map = 
        Map.add (value k) v map    

    let mapContainsKey k map =  
        Map.containsKey (value k) map    

    let mapTryFind k map =  
        Map.tryFind (value k) map    

// ========================================
// メールアドレス（アプリケーション固有ではない）
// ========================================

module EmailAddress = 

    type T = EmailAddress of string with 
        interface WrappedString.IWrappedString with
            member this.Value = let (EmailAddress s) = this in s

    let create = 
        let canonicalize = WrappedString.singleLineTrimmed 
        let isValid s = 
            (WrappedString.lengthValidator 100 s) &&
            System.Text.RegularExpressions.Regex.IsMatch(s,@"^\S+@\S+\.\S+$") 
        WrappedString.create canonicalize isValid EmailAddress

    /// ラップされた任意の文字列をEmailAddressに変える
    let convert s = WrappedString.apply create s

// ========================================
// ZipCode（アプリケーション固有ではない）
// ========================================

module ZipCode = 

    type T = ZipCode of string with
        interface WrappedString.IWrappedString with
            member this.Value = let (ZipCode s) = this in s

    let create = 
        let canonicalize = WrappedString.singleLineTrimmed 
        let isValid s = 
            System.Text.RegularExpressions.Regex.IsMatch(s,@"^\d{5}$") 
        WrappedString.create canonicalize isValid ZipCode

    /// ラップされた任意の文字列をZipCodeに変える
    let convert s = WrappedString.apply create s

// ========================================
// StateCode（アプリケーション固有ではない）
// ========================================

module StateCode = 

    type T = StateCode  of string with
        interface WrappedString.IWrappedString with
            member this.Value = let (StateCode  s) = this in s

    let create = 
        let canonicalize = WrappedString.singleLineTrimmed 
        let stateCodes = ["AZ";"CA";"NY"] //など
        let isValid s = 
            stateCodes |> List.exists ((=) s)

        WrappedString.create canonicalize isValid StateCode

    /// ラップされた任意の文字列をStateCodeに変える
    let convert s = WrappedString.apply create s

// ========================================
// PostalAddress（アプリケーション固有ではない）
// ========================================

module PostalAddress = 

    type USPostalAddress = 
        {
        Address1: WrappedString.String50;
        Address2: WrappedString.String50;
        City: WrappedString.String50;
        State: StateCode.T;
        Zip: ZipCode.T;
        }

    type UKPostalAddress = 
        {
        Address1: WrappedString.String50;
        Address2: WrappedString.String50;
        Town: WrappedString.String50;
        PostCode: WrappedString.String50;   // todo
        }

    type GenericPostalAddress = 
        {
        Address1: WrappedString.String50;
        Address2: WrappedString.String50;
        Address3: WrappedString.String50;
        Address4: WrappedString.String50;
        Address5: WrappedString.String50;
        }

    type T = 
        | USPostalAddress of USPostalAddress 
        | UKPostalAddress of UKPostalAddress 
        | GenericPostalAddress of GenericPostalAddress 

// ========================================
// PersonalName（アプリケーション固有ではない）
// ========================================

module PersonalName = 
    open WrappedString

    type T = 
        {
        FirstName: String50;
        MiddleName: String50 option;
        LastName: String100;
        }

    /// 新しい値を作る
    let create first middle last = 
        match (string50 first),(string100 last) with
        | Some f, Some l ->
            Some {
                FirstName = f;
                MiddleName = (string50 middle)
                LastName = l;
                }
        | _ -> 
            None

    /// 名前を連結して
    /// 生の文字列を返す
    let fullNameRaw personalName = 
        let f = personalName.FirstName |> value 
        let l = personalName.LastName |> value 
        let names = 
            match personalName.MiddleName with
            | None -> [| f; l |]
            | Some middle -> [| f; (value middle); l |]
        System.String.Join(" ", names)

    /// 名前を連結して
    /// 長すぎる場合はNoneを返す
    let fullNameOption personalName = 
        personalName |> fullNameRaw |> string100

    /// 名前を連結して
    /// 長すぎる場合は切り詰める
    let fullNameTruncated personalName = 
        // ヘルパー関数
        let left n (s:string) = 
            if (s.Length > n) 
            then s.Substring(0,n)
            else s

        personalName 
        |> fullNameRaw  // 連結
        |> left 100     // 切り詰め
        |> string100    // ラップ
        |> Option.get   // これは常にOKのはず
```

次に、アプリケーションに固有な型の定義に移ります。

```fsharp

// ========================================
// EmailContactInfo -- ステートマシン
// ========================================

module EmailContactInfo = 
    open System

    // UnverifiedData = メールアドレスのみ
    type UnverifiedData = EmailAddress.T

    // VerifiedData = メールアドレスと検証された時刻
    type VerifiedData = EmailAddress.T * DateTime 

    // 状態の集合
    type T = 
        | UnverifiedState of UnverifiedData
        | VerifiedState of VerifiedData

    let create email = 
        // 作成時は未検証
        UnverifiedState email

    // "verified" イベントを処理
    let verified emailContactInfo dateVerified = 
        match emailContactInfo with
        | UnverifiedState email ->
            // 検証済み状態で新しい情報を構築
            VerifiedState (email, dateVerified) 
        | VerifiedState _ ->
            // 無視
            emailContactInfo

    let sendVerificationEmail emailContactInfo = 
        match emailContactInfo with
        | UnverifiedState email ->
            // メールを送る
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
            // 無視
            printfn "パスワードリセットを送信中"

// ========================================
// PostalContactInfo -- ステートマシン
// ========================================

module PostalContactInfo = 
    open System

    // InvalidData = 郵便住所のみ
    type InvalidData = PostalAddress.T

    // ValidData = 郵便住所と検証された時刻
    type ValidData = PostalAddress.T * DateTime 

    // 状態の集合
    type T = 
        | InvalidState of InvalidData
        | ValidState of ValidData

    let create address = 
        // 作成時は無効
        InvalidState address

    // "validated" イベントを処理
    let validated postalContactInfo dateValidated = 
        match postalContactInfo with
        | InvalidState address ->
            // 有効な状態で新しい情報を構築
            ValidState (address, dateValidated) 
        | ValidState _ ->
            // 無視
            postalContactInfo 

    let contactValidationService postalContactInfo = 
        let dateIsTooLongAgo (d:DateTime) =
            d < DateTime.Today.AddYears(-1)

        match postalContactInfo with
        | InvalidState address ->
            printfn "住所検証サービスに問い合わせ中"
        | ValidState (address,date) when date |> dateIsTooLongAgo  ->
            printfn "最後のチェックから長時間が経過しています"
            printfn "住所検証サービスに再度問い合わせ中"
        | ValidState  _ ->
            printfn "最近チェック済み。何もしません"

// ========================================
// ContactMethodとContact
// ========================================

type ContactMethod = 
    | Email of EmailContactInfo.T 
    | PostalAddress of PostalContactInfo.T

type Contact = 
    {
    Name: PersonalName.T;
    PrimaryContactMethod: ContactMethod;
    SecondaryContactMethods: ContactMethod list;
    }

```

## 結論 ##

ふう！ 新しいコードは元のコードよりもずっと長くなりました。確かに、元のバージョンでは必要なかったサポート関数がたくさん含まれています。それでもかなり手間がかかったように見えます。では、この作業は本当に価値があったのでしょうか？

私の答えは「はい」です。以下に、その理由をいくつか挙げます。

**新しいコードはより明示的です**

元の例を見ると、フィールド間の原子性がなく、検証ルールもなく、長さの制約もありませんでした。フラグを間違った順序で更新するのを止めるものも何もありませんでした。

データ構造は「単純」で、すべてのビジネスルールはアプリケーションコードに暗黙的に埋め込まれていました。
おそらく、アプリケーションには単体テストでさえ現れないような微妙なバグがたくさんあったでしょう。（*メールアドレスが更新されるたびに、アプリケーションが `IsEmailVerified` フラグをfalseにリセットすることを確実に行っていますか？*）

一方、新しいコードは細部に至るまで非常に明示的です。型だけを取り出しても、ビジネスルールやドメインの制約がどのようなものかをかなり正確に把握できるでしょう。

**新しいコードはエラー処理の先送りを許しません**

新しい型を使ってコードを書くということは、長すぎる名前の処理から、連絡先が提供されていない場合のエラー処理まで、あらゆる問題に対処することを余儀なくされます。
そして、これらはあらかじめ、構築時に行わなければなりません。後回しにすることはできません。

このようなエラー処理コードを書くのは面倒で退屈かもしれません。一方で、コードはほとんど自動的に書けてしまいます。これらの型でコンパイルが通るコードを書く方法は、実質的に一つしかありません。

**新しいコードはより正確である可能性が高いです**

新しいコードの*大きな*利点は、おそらくバグがないということです。単体テストを書くまでもなく、ファーストネームがデータベースの `varchar(50)` に書き込まれる際に切り詰められることは決してないし、確認メールを誤って2回送ることもないと、かなり自信を持って言えます。

そして、コード自体に関しては、開発者として対処しなければならない（あるいは対処し忘れる）多くのことが完全に不要になります。nullチェックも、キャストも、 `switch` 文のデフォルト値を心配することもありません。そして、サイクロマティック複雑度をコード品質の指標として使うなら、350行ほどのコード全体で `if` 文が3つしかないことに気づくかもしれません。

**警告**

最後に、注意が必要です！ このような型ベースの設計スタイルに慣れてしまうと、十分に厳密に型付けされていないコードを見るたびに、あなたは徐々に偏屈になっていきます。（*メールアドレスの長さは正確にどれくらいの長さにするべきか？*）そして、最も簡単なPythonスクリプトを書くときでさえ、不安になってしまうでしょう。このようになったとき、あなたは完全に「カルト」に仲間入りしたことになります。ようこそ！
 

*このシリーズが気に入ったなら、同じようなトピックをカバーしているスライドデッキがあります。[こちらに動画もあります](https://fsharpforfunandprofit.com/ddd/)*

<iframe src="//www.slideshare.net/slideshow/embed_code/32418451" width="627" height="556" frameborder="0" marginwidth="0" marginheight="0" scrolling="no" style="border:1px solid #CCC; border-width:1px 1px 0; margin-bottom:5px; max-width: 100%;" allowfullscreen> </iframe> <div style="margin-bottom:5px"> <strong> <a href="https://www.slideshare.net/ScottWlaschin/domain-driven-design-with-the-f-type-system-functional-londoners-2014" title="Domain Driven Design with the F# type System -- F#unctional Londoners 2014" target="_blank">Domain Driven Design with the F# type System -- F#unctional Londoners 2014</a> </strong> from <strong><a href="http://www.slideshare.net/ScottWlaschin" target="_blank">my slideshare page</a></strong> </div>