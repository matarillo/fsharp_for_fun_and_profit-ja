---
layout: post
title: ".NETライブラリとのシームレスな連携"
description: ".NETライブラリを扱うための便利な機能"
nav: why-use-fsharp
seriesId: "F# を使う理由"
seriesOrder: 28
categories: [Completeness]
---


これまでに、 `System.Net.WebRequest` や `System.Text.RegularExpressions` など、F#で.NETライブラリを使う例をたくさん見てきました。そして、その連携は確かにシームレスでした。

より複雑な要件に対しても、F#は.NETのクラス、インターフェース、構造体をネイティブにサポートしているので、連携はとても簡単です。たとえば、C#で `ISomething` インターフェースを書いて、それをF#で実装できます。

F#は既存の.NETコードを呼び出せるだけでなく、ほぼすべての.NET APIを他の言語に公開できます。たとえば、F#でクラスやメソッドを書いて、それらをC#、VB、またはCOMに公開できます。さらに、上の例を逆にもできます。F#で `ISomething` インターフェースを定義して、それをC#で実装できるのです！これらすべての利点は、既存のコードベースを捨てる必要がないことです。F#を一部の用途に使い始めながら、他の部分ではC#やVBを維持し、仕事に最適なツールを選べるのです。

緊密な統合に加えて、F#には.NETライブラリの扱いを便利にする素晴らしい機能がいくつかあります。これらの機能のおかげで、ある面ではC#よりも.NETライブラリを扱いやすくなっています。以下に、私のお気に入りをいくつか紹介します。

* "out"パラメータを渡さずに `TryParse` や `TryGetValue` を使えます。
* 引数名を使ってメソッドのオーバーロードを解決できます。これは型推論にも役立ちます。
* "アクティブパターン"を使って.NET APIをより親しみやすいコードに変換できます。
* 具象クラスを作らずに `IDisposable` などのインターフェースからオブジェクトを動的に作成できます。
* "純粋な"F#オブジェクトと既存の.NET APIを組み合わせて使えます。

## TryParseとTryGetValue

値や辞書に対する `TryParse` と `TryGetValue` 関数は、余分な例外処理を避けるためによく使われます。しかし、C#の構文はちょっと扱いにくいです。F#からこれらを使うとより優雅になります。なぜなら、F#は自動的にこの関数をタプルに変換し、最初の要素が関数の戻り値、2番目が"out"パラメータになるからです。

```fsharp
//Int32を使う
let (i1success,i1) = System.Int32.TryParse("123");
if i1success then printfn "パースされた値は %i" i1 else printfn "パース失敗"

let (i2success,i2) = System.Int32.TryParse("hello");
if i2success then printfn "パースされた値は %i" i2 else printfn "パース失敗"

//DateTimeを使う
let (d1success,d1) = System.DateTime.TryParse("1/1/1980");
let (d2success,d2) = System.DateTime.TryParse("hello");

//辞書を使う
let dict = new System.Collections.Generic.Dictionary<string,string>();
dict.Add("a","hello")
let (e1success,e1) = dict.TryGetValue("a");
let (e2success,e2) = dict.TryGetValue("b");
```

## 型推論を助ける名前付き引数

C#（および.NET一般）では、多くの異なるパラメータを持つオーバーロードされたメソッドを持つことができます。F#はこれに対処するのが難しい場合があります。たとえば、 `StreamReader` を作成しようとする次の例を見てみましょう。

```fsharp
let createReader fileName = new System.IO.StreamReader(fileName)
// error FS0041: メソッド'StreamReader'の一意のオーバーロードを
//                決定できませんでした
```

問題は、F#が引数が文字列なのかストリームなのかわからないことです。引数の型を明示的に指定することもできますが、それはF#らしくありません！

代わりに、F#では.NETライブラリのメソッドを呼び出す際に名前付き引数を指定できるという事実を利用した素晴らしい回避策があります。

```fsharp
let createReader2 fileName = new System.IO.StreamReader(path=fileName)
```

上の例のように、多くの場合、引数名を使うだけで型の問題を解決できます。そして、明示的な引数名を使うことで、コードの可読性が向上することもよくあります。

## .NET関数のためのアクティブパターン

.NET型に対してパターンマッチングを使いたい場合がよくありますが、ネイティブのライブラリはこれをサポートしていません。以前、「アクティブパターン」というF#の機能について少し触れましたが、これを使うとマッチングする選択肢を動的に作成できます。これは.NETとの連携にとても役立ちます。

よくあるケースとして、.NETライブラリのクラスに相互に排他的な `isSomething` 、 `isSomethingElse` メソッドがあり、これらを醜いカスケード式のif-else文でテストしなければならないことがあります。アクティブパターンを使えば、すべての醜いテストを隠し、残りのコードでより自然なアプローチを使えるようになります。

たとえば、 `System.Char` の様々な `isXXX` メソッドをテストするコードは次のようになります。

```fsharp
let (|Digit|Letter|Whitespace|Other|) ch = 
   if System.Char.IsDigit(ch) then Digit
   else if System.Char.IsLetter(ch) then Letter
   else if System.Char.IsWhiteSpace(ch) then Whitespace
   else Other
```

選択肢を定義すれば、通常のコードはシンプルになります。

```fsharp
let printChar ch = 
  match ch with
  | Digit -> printfn "%c は数字です" ch
  | Letter -> printfn "%c は文字です" ch
  | Whitespace -> printfn "%c は空白文字です" ch
  | _ -> printfn "%c はその他の文字です" ch

// リストを表示
['a';'b';'1';' ';'-';'c'] |> List.iter printChar
```

もう一つのよくあるケースは、例外や結果の種類を判断するためにテキストやエラーコードを解析する必要がある場合です。以下の例では、アクティブパターンを使って `SqlExceptions` に関連するエラー番号を解析し、より扱いやすくしています。

まず、エラー番号に対するアクティブパターンマッチングを設定します。

```fsharp
open System.Data.SqlClient

let (|ConstraintException|ForeignKeyException|Other|) (ex:SqlException) = 
   if ex.Number = 2601 then ConstraintException 
   else if ex.Number = 2627 then ConstraintException 
   else if ex.Number = 547 then ForeignKeyException 
   else Other 
```

これで、SQLコマンドを処理する際にこれらのパターンを使えます。

```fsharp
let executeNonQuery (sqlCommmand:SqlCommand) = 
    try
       let result = sqlCommmand.ExecuteNonQuery()
       // 成功時の処理
    with 
    | :?SqlException as sqlException -> // SqlExceptionの場合
        match sqlException with         // きれいなパターンマッチング
        | ConstraintException  -> // 制約エラーの処理
        | ForeignKeyException  -> // 外部キーエラーの処理
        | _ -> reraise()          // その他のケースは処理しない
    // SqlException以外の例外は通常通り投げられる
```

## インターフェースから直接オブジェクトを作成する

F#には「オブジェクト式」というもう一つの便利な機能があります。これは、具象クラスを先に定義せずに、インターフェースや抽象クラスから直接オブジェクトを作成する機能です。

以下の例では、 `makeResource` ヘルパー関数を使って `IDisposable` を実装するオブジェクトをいくつか作成しています。

```fsharp
// IDisposableを実装する新しいオブジェクトを作成
let makeResource name = 
   { new System.IDisposable 
     with member this.Dispose() = printfn "%s が破棄されました" name }

let useAndDisposeResources = 
    use r1 = makeResource "最初のリソース"
    printfn "最初のリソースを使用中" 
    for i in [1..3] do
        let resourceName = sprintf "\t内部リソース %d" i
        use temp = makeResource resourceName 
        printfn "\t%s で何かをする" resourceName 
    use r2 = makeResource "2番目のリソース"
    printfn "2番目のリソースを使用中" 
    printfn "完了。" 
```

この例は、`use` キーワードによって、変数がスコープ外になると自動的にリソースが解放されることも示しています。以下が出力結果です。


	最初のリソースを使用中
		内部リソース 1 で何かをする
		内部リソース 1 が破棄されました
		内部リソース 2 で何かをする
		内部リソース 2 が破棄されました
		内部リソース 3 で何かをする
		内部リソース 3 が破棄されました
	2番目のリソースを使用中
	完了。
	2番目のリソース が破棄されました
	最初のリソース が破棄されました

## .NETインターフェースと純粋なF#型の混在

インターフェースのインスタンスをその場で作成できるということは、既存のAPIからのインターフェースと純粋なF#型を簡単に組み合わせて使えるということです。

たとえば、以下に示すような `IAnimal` インターフェースを使う既存のAPIがあるとします。

```fsharp
type IAnimal = 
   abstract member MakeNoise : unit -> string

let showTheNoiseAnAnimalMakes (animal:IAnimal) = 
   animal.MakeNoise() |> printfn "鳴き声は %s" 
```

しかし、パターンマッチングなどの利点をすべて活かしたいので、クラスの代わりに純粋なF#型で猫と犬を作成したいとします。

```fsharp
type Cat = Felix | Socks
type Dog = Butch | Lassie 
```

しかし、この純粋なF#のアプローチを使うと、猫や犬を直接 `showTheNoiseAnAnimalMakes` 関数に渡すことができません。

ただし、 `IAnimal` を実装するための新しい具象クラスのセットを作成する必要はありません。代わりに、純粋なF#型を拡張して `IAnimal` インターフェースを動的に作成できます。

```fsharp
// F#型にインターフェースを混ぜ込む
type Cat with
   member this.AsAnimal = 
        { new IAnimal 
          with member a.MakeNoise() = "ニャー" }

type Dog with
   member this.AsAnimal = 
        { new IAnimal 
          with member a.MakeNoise() = "ワン" }
```

以下はテストコードです。

```fsharp
let dog = Lassie
showTheNoiseAnAnimalMakes (dog.AsAnimal)

let cat = Felix
showTheNoiseAnAnimalMakes (cat.AsAnimal)
```

このアプローチは、両方の世界の良いところを取り入れています。内部的には純粋なF#型を使いつつ、必要に応じてライブラリとのインターフェースのためにそれらを変換する能力を持っています。

## リフレクションを使ってF#型を調べる

F#は.NETのリフレクションシステムの恩恵を受けているため、言語の構文だけでは直接利用できない興味深いことがたくさんできます。 `Microsoft.FSharp.Reflection` 名前空間には、特にF#型を扱うために設計された関数がいくつかあります。

たとえば、以下はレコード型のフィールドや判別共用体の選択肢を表示する方法です。

```fsharp
open System.Reflection
open Microsoft.FSharp.Reflection

// レコード型を作成...
type Account = {Id: int; Name: string}

// ...そしてフィールドを表示
let fields = 
    FSharpType.GetRecordFields(typeof<Account>)
    |> Array.map (fun propInfo -> propInfo.Name, propInfo.PropertyType.Name)

// 判別共用体を作成...
type Choices = | A of int | B of string

// ...そして選択肢を表示
let choices = 
    FSharpType.GetUnionCases(typeof<Choices>)
    |> Array.map (fun choiceInfo -> choiceInfo.Name)
```
