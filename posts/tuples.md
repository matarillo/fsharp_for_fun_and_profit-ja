---
layout: post
title: "タプル"
description: "型の掛け算"
nav: fsharp-types
seriesId: "F#の型を理解する"
seriesOrder: 4
categories: [型]
---


いよいよ最初の拡張型であるタプルについて学びましょう。

まずは一歩下がって、「int」のような型について考えてみましょう。以前に少し触れたように、「int」を抽象的なものとして考えるのではなく、取り得るすべての値の具体的な集合として考えられます。つまり、{...、-3、-2、-1、0、2、3、...}という集合です。

次に、この「int」の集合を2組用意したと想像してください。これらの直積（デカルト積）を取ることで「掛け算」できます。つまり、2つの「int」リストのあらゆる組み合わせを選んで、新しいオブジェクトのリストを作るのです。以下の図のようになります。

![int*int タプル](../assets/img/tuple_int_int.png)

ご覧の通り、F# ではこのようなペアをタプルと呼びます。そして、タプルの型シグネチャがこのような形をしているのも、納得できるかと思います。この例では、「intとintの積」の型は「`int * int`」となります。アスタリスク記号は当然「掛け算」を表しています。この新しい型の有効なインスタンスは、(-2,2)、(-1,0)、(2,2) などのすべてのペアです。

実際にどのように使うか見てみましょう。

```fsharp
let t1 = (2,3)
let t2 = (-2,7)
```

上のコードを評価すると、t1 と t2 の型が期待通り `int*int` になっていることがわかります。

```fsharp
val t1 : int * int = (2, 3)
val t2 : int * int = (-2, 7)
```

この「積」のアプローチは、任意の型の組み合わせでタプルを作るのに使えます。「intとboolの積」の例を見てみましょう。

![int*bool タプル](../assets/img/tuple_int_bool.png)

F# での使い方はこうです。上のタプル型は `int*bool` というシグネチャを持ちます。

```fsharp
let t3 = (2,true)
let t4 = (7,false)

// シグネチャは以下のようになります
val t3 : int * bool = (2, true)
val t4 : int * bool = (7, false)
```

もちろん、文字列も使えます。ありとあらゆる文字列の集合は非常に大きいですが、概念的には同じことです。以下のタプル型は「`string*int`」というシグネチャを持ちます。

![string*int タプル](../assets/img/tuple_str_int.png)

使い勝手とシグネチャを確認してみましょう。

```fsharp
let t5 = ("hello",42)
let t6 = ("goodbye",99)

// シグネチャは以下のようになります。
val t5 : string * int = ("hello", 42)
val t6 : string * int = ("goodbye", 99)
```

そして、2つの型を掛け合わせるだけに留める理由はありません。3つでも4つでも構いません。たとえば、`int * bool * string` という型もできます。

![int*bool*string タプル](../assets/img/tuple_int_bool_str.png)

使い勝手とシグネチャを確認してみましょう。

```fsharp
let t7 = (42,true,"hello")

// シグネチャは以下のようになります。
val t7 : int * bool * string = (42, true, "hello")
```

## ジェネリックタプル

タプルでもジェネリック型を使えます。

!['a*'b タプル](../assets/img/tuple_a_b.png)

ジェネリックタプルの使い方は通常、関数と関連しています。

```fsharp
let genericTupleFn aTuple = 
   let (x,y) = aTuple
   printfn "xは%A、yは%A" x y
```

この関数のシグネチャは以下のようになります。

```fsharp
val genericTupleFn : 'a * 'b -> unit
```

つまり、 `genericTupleFn` はジェネリックタプル `('a * 'b)` を受け取り、 `unit` を返します。

## 複雑な型のタプル

タプルにはあらゆる種類の型を使えます。他のタプル、クラス、関数型などです。いくつか例を見てみましょう。

```fsharp
// いくつかの型を定義します
type Person = {First:string、 Last:string}
type Complex = float * float
type ComplexComparisonFunction = Complex -> Complex -> int

// これらを使っていくつかのタプルを定義します
type PersonAndBirthday = Person * System.DateTime
type ComplexPair = Complex * Complex
type ComplexListAndSortFunction = Complex list * ComplexComparisonFunction
type PairOfIntFunctions = (int->int) * (int->int) 
```

## タプルに関する重要なポイント

タプルについて知っておくべき重要事項はいくつかあります。

* タプル型の特定のインスタンスは、C# で言うところの2要素配列のような*単一のオブジェクト*です。関数で使う場合、*単一の*パラメータとして扱われます。
* タプル型には明示的な名前を付けられません。タプル型の「名前」は、掛け合わされた型の組み合わせによって決まります。
* 掛け算の順序は重要です。つまり、 `int*string` と `string*int` は異なるタプル型です。
* タプルを定義する重要な記号はカンマであり、かっこではありません。かっこなしでもタプルを定義できますが、混乱を招く可能性があります。F#では、カンマを見かけたら、それはおそらくタプルの一部です。

これらのポイントは非常に重要です。理解していないと、すぐに混乱してしまうでしょう。

そして、[以前の投稿](../posts/defining-functions.md)でも触れたことですが、*関数の複数のパラメータをタプルと間違えないでください*。

```fsharp
// 単一のタプルパラメータを取る関数ですが、
// 2つのintを取るように見えます
let addConfusingTuple (x,y) = x + y
```

## タプルの作成とマッチング

F#のタプル型は、他の拡張型よりもやや原始的です。先ほど見たように、明示的に定義する必要はなく、名前もありません。

タプルを作るのは簡単です。カンマを使うだけです。

```fsharp
let x = (1,2)                 
let y = 1,2        // かっこではなく、カンマが必要です。      
let z = 1,true,"hello",3.14   // 必要に応じて任意のタプルを作れます
```

そして、先ほど見たように、タプルを「分解」するには、同じ構文を使います。

```fsharp
let z = 1,true,"hello",3.14   // "構築"
let z1,z2,z3,z4 = z           // "分解"
```

このようなパターンマッチングを行うときは、要素数が同じでなければエラーになります。

```fsharp
let z1,z2 = z     // error FS0001: 型が一致しません。
                  // 型の長さ 2 のタプルが必要です
```

一部の値が不要な場合は、「無視」記号（アンダースコア）をプレースホルダーとして使えます。

```fsharp
let _,z5,_,z6 = z     // 1番目と3番目の要素を無視します
```

想像できるかもしれませんが、2要素のタプルは「ペア」、3要素のタプルは「トリプル」などと呼ばれます。ペアには特別に `fst` と `snd` という関数があり、それぞれ最初の要素と2番目の要素を取り出します。

```fsharp
let x = 1,2
fst x
snd x
```

これらはペアでのみ機能します。トリプルに `fst` を使おうとするとエラーになります。

```fsharp
let x = 1,2,3
fst x              // error FS0001: 型が一致しません。
                   // 型の長さ 2 のタプルが必要です
```

## タプルの実践的な使い方

タプルは、他のより複雑な型に比べていくつかの利点があります。定義せずにすぐに使えるため、小さくて一時的な軽量な構造体に最適です。

### 複数の値を返すためにタプルを使用する

関数から1つではなく2つの値を返したい状況はよくあります。たとえば、 `TryParse` スタイルの関数では、(a) 値が解析されたかどうか、(b) 解析された場合はその解析された値、の2つを返したいでしょう。

以下は整数のための `TryParse` の実装例です（もちろん、まだ存在しないと仮定しています）。

```fsharp
let tryParse intStr = 
   try
      let i = System.Int32.Parse intStr
      (true,i)
   with _ -> (false,0)  // どんな例外でも

//テスト
tryParse "99"
tryParse "abc"
```

別の簡単な例として、数値のペアを返すものはこちらです。

```fsharp
// 単語数と文字数をタプルで返す
let wordAndLetterCount (s:string) = 
   let words = s.Split [|' '|]
   let letterCount = words |> Array.sumBy (fun word -> word.Length ) 
   (words.Length, letterCount)

//テスト
wordAndLetterCount "to be or not to be"
```

### 他のタプルからタプルを作成する

ほとんどのF#の値と同様に、タプルは不変であり、要素を変更することはできません。では、タプルを変更するにはどうすればよいでしょうか。簡単な答えは、「できない」です。常に新しいタプルを作る必要があります。

たとえば、タプルを受け取って、各要素に1を加算する関数を書く必要があるとしましょう。以下はわかりやすい実装です。

```fsharp
let addOneToTuple aTuple =
   let (x,y,z) = aTuple
   (x+1,y+1,z+1)   // 新しいタプルを作成

// 試してみる
addOneToTuple (1,2,3)
```

これは少し長ったらしく見えます。もっとコンパクトな方法はないでしょうか？あります。関数のパラメータでタプルを直接分解できるので、関数を1行にできます。

```fsharp
let addOneToTuple (x,y,z) = (x+1,y+1,z+1)

// 試してみる
addOneToTuple (1,2,3)
```

### 等価性

タプルには自動的に定義された等価比較演算があります。2つのタプルは、長さが同じで、各スロットの値が等しい場合に等しいとみなされます。

```fsharp
(1,2) = (1,2)                      // true
(1,2,3,"hello") = (1,2,3,"bye")    // false
(1,(2,3),4) = (1,(2,3),4)          // true
```

長さの異なるタプルを比較しようとすると型エラーになります。

```fsharp
(1,2) = (1,2,3)                    // error FS0001: 型が一致しません。
```

また、各スロットの型も同じでなければなりません。

```fsharp
(1,2,3) = (1,2,"hello")   // 要素3はint型であることが期待されていますが、
                          // ここではstring型です    
(1,(2,3),4) = (1,2,(3,4)) // 要素2と3の型が異なります
```

タプルには、タプル内の値に基づいて自動的に定義されたハッシュ値もあります。そのため、タプルを辞書のキーとして問題なく使えます。

```fsharp
(1,2,3).GetHashCode()
```

### タプルの表現

[以前の投稿](../posts/convenience-types.md)で述べたように、タプルには便利なデフォルトの文字列表現があり、簡単にシリアライズできます。

```fsharp
(1,2,3).ToString()
```
