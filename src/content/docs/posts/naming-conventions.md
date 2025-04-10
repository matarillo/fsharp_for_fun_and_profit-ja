---
layout: post
title: "パラメータと値の命名規則"
description: "a、f、xとその仲間たち"
nav: thinking-functionally
seriesId: "式と構文"
seriesOrder: 6
---

C#などの命令型言語からF#に移行すると、多くの場合、識別子が短く、難解に感じるかもしれません。

C#やJavaでは、長くて説明的な識別子を使うのがベストプラクティスです。一方、関数型言語では、関数名自体は説明的になることもありますが、関数内のローカル識別子は非常に短くなりがちです。また、パイプ処理や関数合成を多用して、コード行数を最小限に抑えます。

たとえば、素数のふるいの簡単な実装において、ローカル値に長く説明的な名前を使ったものを以下に示します。

```fsharp
let primesUpTo n = 
    // 再帰的な中間関数を作る
    let rec sieve listOfNumbers  = 
        match listOfNumbers with 
        | [] -> []
        | primeP::sievedNumbersBiggerThanP-> 
            let sievedNumbersNotDivisibleByP = 
                sievedNumbersBiggerThanP
                |> List.filter (fun i-> i % primeP > 0)
            // 再帰部分
            let newPrimes = sieve sievedNumbersNotDivisibleByP
            primeP :: newPrimes
    // ふるいを使う
    let listOfNumbers = [2..n]
    sieve listOfNumbers     // 戻り値

// テスト
primesUpTo 100
```

同じ実装を、より簡潔で慣用的な名前とコンパクトなコードで以下に示します。

```fsharp
let primesUpTo n = 
   let rec sieve l  = 
      match l with 
      | [] -> []
      | p::xs -> 
            p :: sieve [for x in xs do if (x % p) > 0 then yield x]
   [2..n] |> sieve 
```

暗号めいた名前が常に良いわけではありません。ただし、関数が数行に収まり、使う操作が標準的なものであれば、割と一般的な慣用表現です。

一般的な命名規則は以下のとおりです。

* "a"、"b"、"c"などは型を表します。
* "f"、"g"、"h"などは関数を表します。
* "x"、"y"、"z"などは関数の引数を表します。
* リストは末尾に"s"を付けて示します。つまり、 `xs` はxのリスト、 `fs` は関数のリストなどを表します。 `x::xs` はリストの先頭（最初の要素）と末尾（残りの要素）を意味し、非常によく見かける表現です。
* `_` は値を気にしない場合に使います。つまり、 `x::_` はリストの残りを気にしないことを意味し、 `let f _ = something` はfの引数を気にしないことを意味します。

短い名前を使うもう一つの理由は、多くの場合、意味のある名前を付けられないためです。たとえば、パイプ演算子の定義は次のようになります。

```fsharp
let (|>) x f = f x
```

`f`と`x`が何になるかはわかりません。`f`はどんな関数にもなり得るし、`x`はどんな値にもなり得ます。これを明示的にしても、コードの理解度は上がりません。

```fsharp
let (|>) aValue aFunction = aFunction aValue // これで良くなったといえますか？
```

### このサイトで使うスタイル 

このサイトでは両方のスタイルを使います。入門シリーズでは、ほとんどの概念が新しいため、中間値や長い名前を使った非常に説明的なスタイルを使います。しかし、より高度なシリーズでは、スタイルはより簡潔になります。
