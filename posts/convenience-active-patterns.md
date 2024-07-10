---
layout: post
title: "アクティブパターン"
description: "強力なマッチングのための動的パターン"
nav: why-use-fsharp
seriesId: "F# を使う理由"
seriesOrder: 17
categories: [Convenience, Patterns]
---

F#には「アクティブパターン」と呼ばれる特殊なパターンマッチングがあります。これは、パターンを動的に解析したり検出したりできるものです。通常のパターンと同様に、呼び出し側から見ると、マッチングと出力が1つのステップに統合されています。

以下は、アクティブパターンを使用して文字列をintまたはboolに解析する例です。

```fsharp
// アクティブパターンを作成
let (|Int|_|) str =
   match System.Int32.TryParse(str) with
   | (true,int) -> Some(int)
   | _ -> None

// アクティブパターンを作成
let (|Bool|_|) str =
   match System.Boolean.TryParse(str) with
   | (true,bool) -> Some(bool)
   | _ -> None
```

<div class="alert alert-info">   
今はアクティブパターンを定義するために使用される複雑な構文について心配する必要はありません。これはただの例で、アクティブパターンがどのように使われるかを見てもらうためのものです。
</div>

これらのパターンが設定されると、通常の「match..with」式の一部として使用できます。

```fsharp
// パターンを呼び出す関数を作成
let testParse str = 
    match str with
    | Int i -> printfn "この値はint '%i'です" i
    | Bool b -> printfn "この値はbool '%b'です" b
    | _ -> printfn "値 '%s' は他の何かです" str

// テスト
testParse "12"
testParse "true"
testParse "abc"
```

呼び出し側から見ると、`Int`や`Bool`とのマッチングは透過的です。裏で解析が行われているにもかかわらず、それが見えないようになっています。

同様の例として、正規表現でアクティブパターンを使用し、正規表現パターンとマッチングすると同時に、マッチした値を1つのステップで返すこともできます。

```fsharp
// アクティブパターンを作成
open System.Text.RegularExpressions
let (|FirstRegexGroup|_|) pattern input =
   let m = Regex.Match(input,pattern) 
   if (m.Success) then Some m.Groups.[1].Value else None  
```

ここでも、このパターンが設定されると、通常のマッチ式の一部として透過的に使用できます。

```fsharp
// パターンを呼び出す関数を作成
let testRegex str = 
    match str with
    | FirstRegexGroup "http://(.*?)/(.*)" host -> 
           printfn "この値はURLで、ホストは %s です" host
    | FirstRegexGroup ".*?@(.*)" host -> 
           printfn "この値はメールアドレスで、ホストは %s です" host
    | _ -> printfn "値 '%s' は他の何かです" str
   
// テスト
testRegex "http://google.com/test"
testRegex "alice@hotmail.com"
```

そして楽しみのために、もう1つ例を挙げましょう。有名な[FizzBuzzチャレンジ](http://www.codinghorror.com/blog/2007/02/why-cant-programmers-program.html)をアクティブパターンを使って書いたものです。

```fsharp
// アクティブパターンを設定
let (|MultOf3|_|) i = if i % 3 = 0 then Some MultOf3 else None
let (|MultOf5|_|) i = if i % 5 = 0 then Some MultOf5 else None

// メイン関数
let fizzBuzz i = 
  match i with
  | MultOf3 & MultOf5 -> printf "FizzBuzz, " 
  | MultOf3 -> printf "Fizz, " 
  | MultOf5 -> printf "Buzz, " 
  | _ -> printf "%i, " i
  
// テスト
[1..20] |> List.iter fizzBuzz 
```
