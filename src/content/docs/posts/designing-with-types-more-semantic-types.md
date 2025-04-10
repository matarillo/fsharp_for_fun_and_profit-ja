---
layout: post
title: "型を使った設計：制約付き文字列"
description: "プリミティブ型にさらに多くの意味情報を加える"
nav: thinking-functionally
seriesId: "型を使った設計"
seriesOrder: 6
categories: ["型", "DDD"]
---

[前回の投稿](../posts/designing-with-types-single-case-dus.html)では、メールアドレスや郵便番号、州名などに単純な文字列型を使わないようにする話をしました。
単一ケースの共用体でラップすることで、(a)型をはっきり区別し、(b)検証ルールを加えられるようになりました。

今回は、この考え方をもっと細かいレベルまで広げられないか考えてみます。

## 文字列が文字列でないとき

簡単な `PersonalName` 型を見てみましょう。

```fsharp
type PersonalName = 
    {
    FirstName: string;
    LastName: string;
    }
```

この型では、名前が `string` だと定義しています。でも、本当にそれだけでしょうか？他に加えるべき制約はないでしょうか？

もちろん、`null` ではあってはならないでしょう。でもそれはF#では当たり前です。

文字列の長さはどうでしょう？64KBもの長さの名前は許容できるでしょうか？そうでないなら、最大長はどれくらいでしょうか？

名前に改行文字やタブを含めてもいいのでしょうか？先頭や末尾の空白文字はどうでしょう？

こう考えると、「一般的な」文字列にもかなりの制約があることがわかります。明らかなものをいくつか挙げてみましょう。

* 最大長は？
* 複数行にまたがってもいい？
* 先頭や末尾の空白文字は許す？
* 非表示文字を含んでもいい？

## これらの制約はドメインモデルの一部であるべき？

制約の存在は認めるとして、それらを本当にドメインモデル（およびそこから導かれる型）の一部にすべきでしょうか？
たとえば、姓が100文字に制限されるという制約は、特定の実装に固有のもので、ドメインの一部ではないのではないでしょうか。

これに対する私の答えは、論理モデルと物理モデルには違いがあるというものです。論理モデルではこれらの制約の一部は関係ないかもしれません。しかし、物理モデルでは間違いなく関係します。そして、コードを書くときは常に、物理モデルを扱っているのです。

モデルに制約を組み込むもう一つの理由は、多くの場合、モデルが複数の独立したアプリケーション間で共有されるからです。たとえば、個人名はeコマースアプリケーションで作られ、データベーステーブルに書き込まれ、メッセージキューに投入され、CRMアプリケーションがそれを取り出し、そこからメールテンプレートサービスが呼び出される、などということが考えられます。

これらすべてのアプリケーションやサービスが、個人名について（長さやその他の制約を含めて） *同じ* 認識を持つことが重要です。モデルが制約をはっきり示していないと、サービスの境界を越えるときにミスマッチが生じやすくなります。

たとえば、データベースに書き込む前に文字列の長さをチェックするコードを書いたことはありませんか？

```csharp
void SaveToDatabase(PersonalName personalName)
{ 
   var first = personalName.First;
   if (first.Length > 50)
   {    
        // 文字列が長すぎないようにする
        first = first.Substring(0,50);
   }
   
   //データベースに保存
}
```

この時点で文字列が *長すぎる* 場合、どうすべきでしょうか？黙って切り詰めますか？例外を投げますか？

より良い答えは、可能であれば問題を最初から回避することです。文字列がデータベース層に到達する頃にはもう手遅れです。データベース層がこのような決定をすべきではありません。

問題は文字列が*使われる*ときではなく、*最初に作られる*ときに対処されるべきです。つまり、文字列の検証の一部であるべきだったのです。

しかし、すべての可能な経路で検証が正しく行われていることをどうやって信頼できるでしょうか？答えは想像がつくと思います。

## 制約付き文字列を型でモデリングする

答えは、もちろん、制約を組み込んだラッパー型を作ることです。

[前回](../posts/designing-with-types-single-case-dus.html)使った単一ケース共用体の手法を使って、簡単なプロトタイプを作ってみましょう。

```fsharp
module String100 = 
    type T = String100 of string
    let create (s:string) = 
        if s <> null && s.Length <= 100 
        then Some (String100 s) 
        else None
    let apply f (String100 s) = f s
    let value s = apply id s

module String50 = 
    type T = String50 of string
    let create (s:string) = 
        if s <> null && s.Length <= 50 
        then Some (String50 s) 
        else None
    let apply f (String50 s) = f s
    let value s = apply id s

module String2 = 
    type T = String2 of string
    let create (s:string) = 
        if s <> null && s.Length <= 2 
        then Some (String2 s) 
        else None
    let apply f (String2 s) = f s
    let value s = apply id s
```

注目すべきは、結果にオプション型を使っているため、検証が失敗した場合には、処理をすぐに行う必要があることです。作成は少し面倒になりますが、後々メリットを得るためには避けて通れません。

たとえば、以下は長さ2の適切な文字列と不適切な文字列の例です。

```fsharp
let s2good = String2.create "CA"
let s2bad = String2.create "California"

match s2bad with
| Some s2 -> // ドメインオブジェクトを更新
| None -> // エラー処理
```

`String2` の値を使うには、作成時に `Some` か `None` かをチェックせざるを得ません。

### この設計の問題点 

一つ目の問題は、重複コードが多くなることです。実際には、典型的なドメインにはせいぜい数十個の文字列型しかないので、無駄になるコードはそれほど多くはありません。しかし、もっと良くできるはずです。

もう一つ、より深刻な問題は、比較が難しくなることです。`String50`と`String100`は異なる型なので、直接比較できません。

```fsharp
let s50 = String50.create "John"
let s100 = String100.create "Smith"

let s50' = s50.Value
let s100' = s100.Value

let areEqual = (s50' = s100')  // コンパイルエラー
```

このようなことは、辞書やリストの扱いを難しくします。

### リファクタリング

ここで、F#のインターフェースサポートを活用し、すべてのラップされた文字列が実装する共通インターフェースと、いくつかの標準関数を定義できます。

```fsharp
module WrappedString = 

    /// すべてのラップされた文字列がサポートするインターフェース
    type IWrappedString = 
        abstract Value : string

    /// ラップされた値のオプションを作る
    /// 1) まず入力を正規化
    /// 2) 検証に成功したら、指定されたコンストラクタのSomeを返す
    /// 3) 検証に失敗したら、Noneを返す
    /// null値は決して有効ではない
    let create canonicalize isValid ctor (s:string) = 
        if s = null 
        then None
        else
            let s' = canonicalize s
            if isValid s'
            then Some (ctor s') 
            else None

    /// ラップされた値に指定された関数を適用
    let apply f (s:IWrappedString) = 
        s.Value |> f 

    /// ラップされた値を取得
    let value s = apply id s

    /// 等価性テスト
    let equals left right = 
        (value left) = (value right)
        
    /// 比較
    let compareTo left right = 
        (value left).CompareTo (value right)
```

キーとなる関数は`create`で、コンストラクタ関数を受け取り、検証に通った場合のみ新しい値を作ります。

これで、新しい型の定義がずっと簡単になります。

```fsharp
module WrappedString = 

    // ... 上のコード ...

    /// 構築前に文字列を正規化
    /// * すべての空白文字をスペース文字に変換
    /// * 両端をトリム
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

    /// ラップされた文字列を長さ100の文字列に変換
    let convertTo100 s = apply string100 s

    /// 長さ50の文字列
    type String50 = String50 of string with
        interface IWrappedString with
            member this.Value = let (String50 s) = this in s

    /// 長さ50の文字列のコンストラクタ
    let string50 = create singleLineTrimmed (lengthValidator 50)  String50

    /// ラップされた文字列を長さ50の文字列に変換
    let convertTo50 s = apply string50 s
```

各文字列型について必要なことは、以下の3つになりました。

* 型の作成（例： `String100` ）
* その型に対する `IWrappedString` の実装
* その型のパブリックコンストラクタ（例： `string100` ）

（上のサンプルには、型の変換に便利な `convertTo` 関数も追加しました。）

型は、これまで見てきたような単純なラップ型です。

IWrappedStringの `Value` メソッドの実装は、複数行で書くこともできます。

```fsharp
member this.Value = 
    let (String100 s) = this 
    s
```

しかし、私は一行のショートカットにしました。

```fsharp
member this.Value = let (String100 s) = this in s
```

コンストラクタ関数も非常に簡単です。正規化関数は `singleLineTrimmed` 、検証関数は長さをチェックし、コンストラクタは `String100` 関数です。（単一ケースに関連付けられた関数です。同名の型とは混同しないでください。）

```fsharp
let string100 = create singleLineTrimmed (lengthValidator 100) String100
```

他の制約を持つ型が必要な場合は、簡単に追加できます。たとえば、複数行と埋め込みタブをサポートし、トリムされない `Text1000` 型が必要になるかもしれません。

```fsharp
module WrappedString = 

    // ... 上のコード ...

    /// 長さ1000の複数行テキスト
    type Text1000 = Text1000 of string with 
        interface IWrappedString with
            member this.Value = let (Text1000 s) = this in s

    /// 長さ1000の複数行文字列のコンストラクタ
    let text1000 = create id (lengthValidator 1000) Text1000 
```

### WrappedStringモジュールを使ってみる 

では、このモジュールをインタラクティブに操作して、どのように動くか見てみましょう。

```fsharp
let s50 = WrappedString.string50 "abc" |> Option.get
printfn "s50 is %A" s50
let bad = WrappedString.string50 null
printfn "bad is %A" bad
let s100 = WrappedString.string100 "abc" |> Option.get
printfn "s100 is %A" s100

// モジュール関数を使った等価性比較は真
printfn "s50 is equal to s100 using module equals? %b" (WrappedString.equals s50 s100)

// Objectメソッドを使った等価性比較は偽
printfn "s50 is equal to s100 using Object.Equals? %b" (s50.Equals s100)

// 直接的な等価性比較はコンパイルされない
printfn "s50 is equal to s100? %b" (s50 = s100) // コンパイルエラー
```

生の文字列を使うマップのような型とやり取りする必要がある場合、新しいヘルパー関数を簡単に作れます。

たとえば、マップを扱うためのヘルパー関数はこのようになります。

```fsharp
module WrappedString = 

    // ... 上のコード ...

    /// マップヘルパー
    let mapAdd k v map = 
        Map.add (value k) v map    

    let mapContainsKey k map =  
        Map.containsKey (value k) map    

    let mapTryFind k map =  
        Map.tryFind (value k) map    
```

そして、これらのヘルパー関数は実際にはこのように使います。

```fsharp
let abc = WrappedString.string50 "abc" |> Option.get
let def = WrappedString.string100 "def" |> Option.get
let map = 
    Map.empty
    |> WrappedString.mapAdd abc "value for abc"
    |> WrappedString.mapAdd def "value for def"

printfn "Found abc in map? %A" (WrappedString.mapTryFind abc map)

let xyz = WrappedString.string100 "xyz" |> Option.get
printfn "Found xyz in map? %A" (WrappedString.mapTryFind xyz map)
```

このように、この「WrappedString」モジュールを使えば、あまり邪魔にならない形で適切に型付けされた文字列を作れます。では、実際の状況でこれを使ってみましょう。

## 新しい文字列型をドメインで使う

新しい型ができたので、これらを使うように `PersonalName` 型の定義を変更してみましょう。

```fsharp
module PersonalName = 
    open WrappedString

    type T = 
        {
        FirstName: String50;
        LastName: String100;
        }

    /// 新しい値を作る
    let create first last = 
        match (string50 first),(string100 last) with
        | Some f, Some l ->
            Some {
                FirstName = f;
                LastName = l;
                }
        | _ -> 
            None
```

型のためのモジュールを作り、文字列のペアを `PersonalName` に変換する作成関数を加えました。

ここで注意しなければならないのは、**どちらか**の入力文字列が無効だった場合の処理です。これも、後で対処するのではなく、作成時に対処する必要があります。

今回は、失敗を `None` で示す単純なオプション型のアプローチを使っています。

使用例はこのようになります。

```fsharp
let name = PersonalName.create "John" "Smith"
```

モジュールにはさらにヘルパー関数も用意できます。

たとえば、名と姓を結合して返す `fullname` 関数を作りたいとします。

ここでも、いくつかの判断が必要です。

* 生の文字列を返すべきか、それともラップされた文字列を返すべきか？
  後者の利点は、呼び出し側が文字列の長さを正確に把握でき、他の同様の型と互換性があることです。

* ラップされた文字列（たとえば `String100` ）を返す場合、結合後の長さが長すぎる場合にどう対処するか？（名と姓の型の長さによっては、最大で 151文字になる可能性があります）オプション値を返すか、結合後の長さが長すぎる場合に強制的に切り詰めるかのどちらかです。

以下のコードは、これら3つのオプションすべてを示しています。

```fsharp
module PersonalName = 

    // ... 上のコード ...

    /// 名と姓を結合し、        
    /// 生の文字列を返す
    let fullNameRaw personalName = 
        let f = personalName.FirstName |> value 
        let l = personalName.LastName |> value 
        f + " " + l 

    /// 名と姓を結合し、        
    /// 長すぎる場合はNoneを返す
    let fullNameOption personalName = 
        personalName |> fullNameRaw |> string100

    /// 名と姓を結合し、        
    /// 長すぎる場合は切り詰める
    let fullNameTruncated personalName = 
        // ヘルパー関数
        let left n (s:string) = 
            if (s.Length > n) 
            then s.Substring(0,n)
            else s

        personalName 
        |> fullNameRaw  // 結合
        |> left 100     // 切り詰め
        |> string100    // ラップ
        |> Option.get   // これは常にOK

```

`fullName` の具体的な実装方法は、あなた次第です。しかし、このタイプの型指向設計の重要なポイントが示されています。これらの決定は、コードを作る際に *前もって* 行う必要があります。後回しにはできません。

時には面倒に感じるかもしれませんが、全体的には良いことだと私は考えています。

## EmailAddressとZipCode型の再考

この `WrappedString` モジュールを使って、 `EmailAddress` 型と `ZipCode` 型を再実装できます。

```fsharp
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

    /// ラップされた任意の文字列をEmailAddressに変換
    let convert s = WrappedString.apply create s

module ZipCode = 

    type T = ZipCode of string with
        interface WrappedString.IWrappedString with
            member this.Value = let (ZipCode s) = this in s

    let create = 
        let canonicalize = WrappedString.singleLineTrimmed 
        let isValid s = 
            System.Text.RegularExpressions.Regex.IsMatch(s,@"^\d{5}$") 
        WrappedString.create canonicalize isValid ZipCode

    /// ラップされた任意の文字列をZipCodeに変換
    let convert s = WrappedString.apply create s
```

## ラップされた文字列のその他の用途

文字列をラップするこのアプローチは、異なる文字列型を混在させてしまうような事故を避けたいシナリオでも使えます。

すぐに思い浮かぶのは、Webアプリケーションの文字列をエスケープとエスケープ解除する時の、安全性の保証です。

たとえば、文字列をHTMLに出力したいとします。エスケープすべきでしょうか、それともそのままでいいでしょうか？
すでにエスケープされている場合はそのままにし、そうでない場合はエスケープする必要があります。

これは厄介な問題になりがちです。Joel Spolskyは「[間違ったコードは間違って見えるようにする](https://web.archive.org/web/20190723080235/http://local.joelonsoftware.com/wiki/%E9%96%93%E9%81%95%E3%81%A3%E3%81%9F%E3%82%B3%E3%83%BC%E3%83%89%E3%81%AF%E9%96%93%E9%81%95%E3%81%A3%E3%81%A6%E8%A6%8B%E3%81%88%E3%82%8B%E3%82%88%E3%81%86%E3%81%AB%E3%81%99%E3%82%8B)」で命名規則を使う方法について論じていますが、もちろん、F#では型ベースの解決策が望ましいでしょう。

型ベースの解決策では、おそらく「安全な」（すでにエスケープされた）HTML文字列用の型（たとえば `HtmlString` ）や、安全なJavaScript文字列用の型（ `JsString` ）、安全なSQL文字列用の型（ `SqlString` ）などを使うことになるでしょう。
そうすれば、これらの文字列を安全に混ぜ合わせられ、誤ってセキュリティの問題を引き起こすことはありません。

ここでは具体的な解決策は作りません（おそらくRazorのようなものを使うことになるでしょう）が、興味があれば[Haskellでのアプローチ](https://blog.moertel.com/posts/2006-10-18-a-type-based-solution-to-the-strings-problem.html)を読めます。また、[それをF#に移植したもの](https://stevegilham.blogspot.com/2011/12/approximate-type-based-solution-to.html)もあります。


## 追記 ##

多くの人が、 `EmailAddress` のような制約付き型を、検証を行う特別なコンストラクタを通じてのみ作る方法についてもっと知りたいと求めてきました。
そこで、いくつかの詳細な例を示した [gist](https://gist.github.com/swlaschin/54cfff886669ccab895a)を作りました。