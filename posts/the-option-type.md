---
layout: post
title: "`Option` 型"
description: "そしてなぜそれがnullやnull許容型ではないのか"
nav: fsharp-types
seriesId: "F#の型を理解する"
seriesOrder: 7
categories: [型]
---

さて、特別な共用体型である `Option` 型を見てみましょう。この型は非常によく使われ、便利なので、言語に組み込まれています。

`Option` 型についてすでに簡単に説明しましたが、基本に立ち返って、型システムにおける `Option` 型の位置づけを理解しましょう。

欠損値や無効な値を表したいという状況はよくあります。図で表すと、定義域は次のようになります。

![int option](../assets/img/int_option.png)
 
これは明らかに何らかの共用体型を使うべき状況です！

F#では、これを `Option` 型と呼び、 `Some` と `None` の2つのケースを持つ共用体型として定義しています。同様の型は関数型言語でよく見られます。OCamlやScalaでも `Option` と呼び、Haskellでは `Maybe` と呼びます。

以下がその定義です。

```fsharp
type Option<'a> =       // ジェネリックな定義を使う  
   | Some of 'a           // 有効な値
   | None                 // 欠損値
```

<div class="alert alert-error">
<strong>重要</strong>: これをインタラクティブウィンドウで評価する場合は、その後必ずセッションをリセットして、組み込み型を復元してください。
</div>

`Option` 型は、他の共用体型と同じように使います。構築時には、 `Some` ケースか `None` ケースのいずれかを指定します。

```fsharp
let validInt = Some 1
let invalidInt = None
```

パターンマッチングでは、他の共用体型と同様に、常にすべてのケースをマッチさせる必要があります。

```fsharp
match validInt with 
| Some x -> printfn "有効な値は %A です" x
| None -> printfn "値はNoneです" 
```

`Option` 型を参照する型を定義する際は、使うジェネリック型を指定する必要があります。これは、山かっこを使って明示的に行うか、型の後に組み込みの `option` キーワードを使って行います。以下の例は同じ意味です。

```fsharp
type SearchResult1 = Option<string>  // 明示的なC#スタイルのジェネリクス 
type SearchResult2 = string option   // 組み込みの後置キーワード
```




## `Option` 型の使い方 

`Option` 型は、F#ライブラリで欠損値や無効な値を表すためによく使われています。

例えば、 `List.tryFind` 関数は `Option` 型を返し、検索条件に一致するものがない場合に `None` ケースを使って示します。

```fsharp
[1;2;3;4]  |> List.tryFind (fun x-> x = 3)  // Some 3
[1;2;3;4]  |> List.tryFind (fun x-> x = 10) // None
```

タプルとレコードで使ったのと同じ例を再度見て、代わりに `Option` 型をどのように使えるかを見てみましょう。

```fsharp
// TryParseのタプルバージョン
let tryParseTuple intStr = 
   try
      let i = System.Int32.Parse intStr
      (true,i)
   with _ -> (false,0)  // どの例外でも

// レコードバージョンでは、戻り値を保持する型を作る
type TryParseResult = {success:bool; value:int} 

// TryParseのレコードバージョン
let tryParseRecord intStr = 
   try
      let i = System.Int32.Parse intStr
      {success=true;value=i}
   with _ -> {success=false;value=0}  

// TryParseのOptionバージョン
let tryParseOption intStr = 
   try
      let i = System.Int32.Parse intStr
      Some i
   with _ -> None

// テスト
tryParseTuple "99"
tryParseRecord "99"
tryParseOption "99"
tryParseTuple "abc"
tryParseRecord "abc"
tryParseOption "abc"
```

これら3つのアプローチの中で、一般的には "option" バージョンが好まれます。新しい型を定義する必要がなく、単純なケースでは `None` の意味が文脈から明らかだからです。

*注: `tryParseOption` コードは単なる例です。同様の `tryParse` 関数が.NETコアライブラリに組み込まれているので、代わりにそちらを使うべきです。*

### Optionの等価性 

他の共用体型と同様に、 `Option` 型には自動的に定義された等価演算子があります。

```fsharp
let o1 = Some 42
let o2 = Some 42

let areEqual = (o1=o2)
```


### Optionの表現

`Option` 型には優れたデフォルトの文字列表現があります。他の共用体型とは異なり、 `ToString()` 表現も良好です。

```fsharp
let o = Some 42
printfn "%A" o   // 良い
printfn "%O" o   // 良い
```

### Optionはプリミティブ型だけのものではない

F#の `Option` は真の第一級型です。つまり、通常の共用体型にすぎないので、*どんな*型にも使えます。
例えば、 `Person` のような複雑な型の `Option` 、 `int*int` のようなタプル型の `Option` 、 `int->bool` のような関数型の `Option` 、さらには `Option` 型の `Option` などを持つことができます。

```fsharp
type OptionalString = string option 
type OptionalPerson = Person option       // 複雑な型のOption
type OptionalTuple = (int*int) option       
type OptionalFunc = (int -> bool) option  // 関数のOption
type NestedOptionalString = OptionalString option // ネストしたOption！
type StrangeOption = string option option option
```

## `Option` 型の正しい使い方

`Option` 型は `IsSome` 、 `IsNone` 、 `Value` などの関数を使って、パターンマッチングせずに「ラップされた」値にアクセスできますが、これらを使わないようにしましょう！これは慣用的な使い方ではなく、危険で例外を引き起こす可能性があります。

以下は、やってはいけない例です。

```fsharp
let x = Some 99

// IsSomeを使ってテスト
if x.IsSome then printfn "xは %i です" x.Value   // 醜い！！

// まったくマッチングしない
printfn "xは %i です" x.Value   // 醜くて危険！！
```

そして、こちらが正しい使い方です。

```fsharp
let x = Some 99
match x with 
| Some i -> printfn "xは %i です" i
| None -> () // ここで何をすべきか？
```

パターンマッチングを行うと、`None` ケースで何が起こるかを考えたり、ドキュメント化したりする必要が出てきます。 `IsSome` を使うと、この点を見落としがちです。

## Option モジュール

Optionに対して多くのパターンマッチングを行っている場合は、`Option` モジュールを利用しましょう。このモジュールには、 `map` 、 `bind` 、 `iter` など、便利なヘルパー関数があります。

例えば、Optionの値が有効な場合に値を2倍したいとします。パターンマッチングによる方法はこちらです。
```fsharp
let x = Some 99
let result = match x with 
| Some i -> Some(i * 2)
| None -> None
```

そして、 `Option.map` を使ったよりコンパクトな書き方がこちらです。

```fsharp
let x = Some 99
x |> Option.map (fun v -> v * 2)
```

さらに、Optionの値が有効なら2倍して、 `None` なら0を返したいとします。パターンマッチングによる方法はこちらです。

```fsharp
let x = Some 99
let result = match x with 
| Some i -> i * 2
| None -> 0
```

そして、同じことを `Option.fold` を使って一行で書くこともできます。

```fsharp
let x = Some 99
x |> Option.fold (fun _ v -> v * 2) 0 
```

上記のような単純なケースでは、 `defaultArg` 関数も使えます。

```fsharp
let x = Some 99
defaultArg x 0 
```

  
<a id="option-is-not-null"></a>
## Option vs. Null vs. Nullable

`Option` 型は、C#やその他の言語で null やnull許容型を扱ってきた人たちにとっては混乱の原因になることがよくあります。このセクションでは、それらの違いを説明します。

### Optionと null の型安全性 

C#やJavaのような言語では、 "null" は存在しないオブジェクトへの参照やポインタを意味します。 "null" はオブジェクトと*まったく同じ型*を持つので、型システムからは nullになりえるかどうかを判断できません。*

*訳注: C# 8.0以降には「null許容参照型」が追加されているため、オブジェクトがnullになりえるかを型で区別できるようになっています。

例えば、以下のC#コードでは、有効な文字列を持つ変数と、null文字列を持つ変数の2つの文字列変数を作ります。

```csharp
string s1 = "abc";
var len1 = s1.Length;

string s2 = null;
var len2 = s2.Length;
```

これはもちろん、問題なくコンパイルされます。コンパイラは2つの変数の違いを判断できません。
`null` は有効な文字列と **まったく同じ型** なので、`System.String` のメソッドやプロパティをすべて使えます。 `Length` プロパティも使えます。

この時点で、このコードがエラーになることは明らかですが、コンパイラは助けてくれません。そのため、皆さんご存知の通り、常に null をチェックする必要が出てきます。

では、上記のC#の例に最も近いF#の例を見てみましょう。F#では、欠損データを示すために`Option` 型を使い、 `None` に設定します。（この例では、わざと明示的に型付けされた`None`を使っていますが、通常は必要ありません。）

```fsharp
let s1 = "abc"
let len1 = s1.Length

// Noneの値を持つstring optionを作る
let s2 = Option<string>.None
let len2 = s2.Length
```

F#のバージョンでは、*コンパイル時*エラーがすぐに発生します。 `None` は文字列ではなく、まったく別の型なので、直接`Length`を呼び出せません。
さらに補足すると、 `Some [string]` *も* `string` と異なる型なので、こちらも `Length` を呼び出せません！

つまり、 `Option<string>` が文字列ではなく、その中に（もしかしたら）含まれている文字列で何かをしたい場合、パターンマッチングを強制されます（前述の悪い方法を使わない限り）。

```fsharp
let s2 = Option<string>.None

// どちらのケースか？
let len2 = match s2 with
| Some s -> s.Length
| None -> 0
```

`Option<string>` 型の値が与えられた場合、それがそれが `Some` なのか `None` なのかを判断できないため、常にパターンマッチングを行う必要があります。

同様に、 `Option<int>` は `int` とは異なる型であり、`Option<bool>` は `bool` とは異なる型です。

要点をまとめます。

* `string option` 型は `string` 型とまったく異なるものです。 `string option` から `string` へのキャストはできません。両者は同じプロパティを持っていません。
  `string` を扱う関数は `string option` では動きません。その逆も然りです。型システムがエラーを防いでくれます。
* 一方、C#の「null文字列」は `string` 型とまったく同じ型です。コンパイル時には区別できず、実行時にのみ判断できます。「null文字列」は有効な文字列と同じプロパティや関数を持っているように見えますが、使おうとするとコードがクラッシュします！

### Nullと欠損データ

C#で使うnullは、あらゆるシステムのモデル化において、言語にかかわらず有効な概念である「欠損」データの概念とはまったく異なります。

真の関数型言語では、欠損データの概念は存在しますが、「null」のようなものは存在しません。「ポインタ」や「初期化されていない変数」の概念は関数型の考え方には存在しないからです。

例えば、次のような式の結果に束縛された値を考えてみましょう。

```fsharp
let x = "hello world"
```

この値が初期化されていない状態になったり、nullになったり、あるいは他の値になったりするでしょうか？

残念ながら、APIの設計者が「欠損」データの概念を示すためにnullを使ったケースもあり、混乱が生じています！ 例えば、.NETライブラリの `StreamReader.ReadLine` メソッドは、ファイルにこれ以上データがないことを示すためにnullを返します。


### F#とnull ###

F#は純粋な関数型言語ではなく、nullの概念を持つ.NET言語と相互作用する必要があります。そのため、F# の設計には `null` キーワードが含まれていますが、使いにくく異常な値として扱われます。

一般的なルールとして、「純粋な」F#ではnullは決して作られず、.NETライブラリや他の外部システムとの相互作用でのみ現れます。

以下に例を示します。

```fsharp
// 純粋なF#型は（一般的に）nullにはできません
type Person = {first:string; last:string}  
let p : Person = null                      // エラー！ 

// CLRで定義された型なので、nullが許可されています
let s : string = null                      // エラーなし！ 
let line = streamReader.ReadLine()         // nullでもエラーなし 
```

このような場合、すぐにnullをチェックして `Option` 型に変換するのが良い習慣です！

```fsharp
// streamReaderの例
let line = match streamReader.ReadLine() with
           | null -> None
           | line -> Some line

// 環境変数の例
let GetEnvVar var = 
    match System.Environment.GetEnvironmentVariable(var) with
    | null -> None
    | value -> Some value

// 試してみる
GetEnvVar "PATH"
GetEnvVar "TEST"
```

また、場合によっては、外部ライブラリに null を渡す必要があるかもしれません。その場合は `null` キーワードが使えます。

### Option vs. Nullable

C#には null に加えて、 `Nullable<int>` のようなNullable型があり、 `Option` 型に似ているように見えます。では、どこが違うのでしょうか？

基本的な考え方は同じですが、Nullableははるかに弱いものです。`Int` や`DateTime` のような値型でのみ動き、文字列やクラス、関数のような参照型では動きません。Nullableをネストすることはできず、特別な振る舞いもほとんどありません。

一方、F#のOptionは真の第一級型であり、すべての型で一貫して同じように使えます（「Optionはプリミティブ型だけのものではない」セクションの例を参照してください）。

