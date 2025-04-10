---
layout: post
title: "関数における型の働き"
description: "型表記の理解"
nav: thinking-functionally
seriesId: "関数型思考"
seriesOrder: 4
categories: ["型", "関数"]
---

関数について理解を深めたところで、関数と型がどのように連携するかを見ていきましょう。これは定義域と値域の両方に関わります。ここでは概要のみ説明し、詳細は「[F#の型を理解する](../series/understanding-fsharp-types.md)」シリーズで扱います。

まず、型の表記についてもう少し理解を深めましょう。以前説明したように、定義域と値域を示すには矢印表記 `->` を使います。関数のシグネチャは常に次のような形になります。

```fsharp
val 関数名 : 定義域 -> 値域
```

具体的な例を見てみましょう。

```fsharp
let intToString x = sprintf "x is %i" x  // 整数を文字列にフォーマット
let stringToInt x = System.Int32.Parse(x)
```

F#のインタラクティブウィンドウでこれを評価すると、次のようなシグネチャが表示されます。

```fsharp
val intToString : int -> string
val stringToInt : string -> int
```

これは以下のことを意味します。

* `intToString` は `int` の定義域を `string` の値域に写像します。
* `stringToInt` は `string` の定義域を `int` の値域に写像します。

## プリミティブ型 ##

F#で使えるプリミティブ型には、予想通りのものがあります。string, int, float, bool, char, byte などです。これらに加えて、.NETの型システムから派生した多くの型も使用できます。

プリミティブ型を使った関数の例をさらに見てみましょう。

```fsharp
let intToFloat x = float x // "float"関数は整数を浮動小数点数に変換
let intToBool x = (x = 2)  // xが2に等しければtrue
let stringToString x = x + " world"
```

これらのシグネチャは次のようになります。

```fsharp
val intToFloat : int -> float
val intToBool : int -> bool
val stringToString : string -> string
```

## 型注釈

前の例では、F#コンパイラがパラメータと結果の型を正しく判断しました。しかし、常にそうとは限りません。次のコードを試すと、コンパイラエラーが発生します。

```fsharp
let stringLength x = x.Length         
   => error FS0072: 不確定の型のオブジェクトに対する参照です
```

コンパイラは "x" の型がわからないため、 "Length" が有効なメソッドかどうかわかりません。多くの場合、これはF#コンパイラに「型注釈」を与えることで解決できます。以下の修正版では、 "x" の型が文字列であることを示しています。

```fsharp
let stringLength (x:string) = x.Length         
```

`x:string` パラメータを囲むかっこは重要です。かっこがないと、コンパイラは戻り値が文字列だと勘違いしてしまいます。「開いた」コロンは戻り値の型を示すのに使います。以下の例でそれがわかります。

```fsharp
let stringLengthAsInt (x:string) :int = x.Length         
```

ここでは、xパラメータが文字列で、戻り値が整数であることを示しています。

## パラメータとしての関数型

他の関数をパラメータとして受け取るか、関数を返す関数を**高階関数**（Higher-Order Function、略してHOF）と呼びます。これらは共通の振る舞いを抽象化する方法として使われます。F#では高階関数が非常に一般的で、ほとんどの標準ライブラリで使われています。

`evalWith5ThenAdd2`という関数について考えてみましょう。この関数はまず、パラメータとして別の関数を受け取ります。次に、その関数に5という値を適用して評価し、その結果に2を加えます。

```fsharp
let evalWith5ThenAdd2 fn = fn 5 + 2     // fn(5) + 2 と同じ
```

この関数のシグネチャは次のようになります。

```fsharp
val evalWith5ThenAdd2 : (int -> int) -> int
```

このシグネチャを見ると、定義域が `(int->int)` で値域が `int` であることがわかります。これは何を意味するのでしょうか。この関数の入力パラメータは単純な値ではなく、それ自体が関数であることを示しています。しかも、その関数は `int` を `int` に写像するものに限定されています。一方、この関数の出力は関数ではなく、単なる整数です。

実際に試してみましょう。

```fsharp
let add1 x = x + 1      // (int -> int) 型の関数を定義
evalWith5ThenAdd2 add1  // テスト
```

結果は次のようになります。

```fsharp
val add1 : int -> int
val it : int = 8
```

`add1` は整数を整数に写像する関数です。そのシグネチャからこれがわかります。したがって、`evalWith5ThenAdd2` 関数の有効なパラメータとなります。結果は8です。

注意：特殊な単語 `it` は最後に評価されたものを指します。この場合は求めていた結果です。これはキーワードではなく、単なる慣習です。

もう一つ例を見てみましょう。

```fsharp
let times3 x = x * 3      // (int -> int) 型の関数
evalWith5ThenAdd2 times3  // テスト
```

結果は次のようになります。

```fsharp
val times3 : int -> int
val it : int = 17
```

`times3` もまた整数を整数に写像する関数です。そのシグネチャからこれがわかります。したがって、これも `evalWith5ThenAdd2` 関数の有効なパラメータとなります。結果は17です。

入力は型に敏感であることに注意してください。入力関数が `int` ではなく `float` を使うと、うまく動作しません。たとえば、

```fsharp
let times3float x = x * 3.0  // (float->float) 型の関数
evalWith5ThenAdd2 times3float 
```

これを評価すると、次のようなエラーが発生します。

```fsharp
error FS0001: 型が一致しません。 'int -> int' という指定が必要ですが、
              'float -> float' が指定されました。
```

このエラーは、入力関数が `int->int` 関数であるべきだったことを示しています。

### 出力としての関数

関数値は、関数の出力にもなり得ます。「加算器」関数を生成する例を見てみましょう。

```fsharp
let adderGenerator numberToAdd = (+) numberToAdd
```

このシグネチャは次のようになります。

```fsharp
val adderGenerator : int -> (int -> int)
```

このシグネチャは、ジェネレーターが興味深い動作をすることを示しています。まず `int` を受け取り、次に `int` を `int` に写像する関数（「加算器」）を作成します。実際の動作を確認してみましょう。

```fsharp
let add1 = adderGenerator 1
let add2 = adderGenerator 2
```

これにより、2つの加算器関数が作成されます。最初の関数は入力に1を加え、2番目の関数は2を加えます。シグネチャは予想通りになります。

```fsharp
val add1 : (int -> int)
val add2 : (int -> int)
```

これらの生成された関数は、通常の方法で使用できます。明示的に定義された関数と区別がつきません。

```fsharp
add1 5    // val it : int = 6
add2 5    // val it : int = 7
```

### 型注釈を使用して関数型を制約する

関数型を制約する方法を見てみましょう。最初の例を振り返ります。

```fsharp
let evalWith5ThenAdd2 fn = fn 5 + 2
    => val evalWith5ThenAdd2 : (int -> int) -> int
```

この場合、F#は `fn` について重要な推論を行いました。 `fn` が `int` を `int` に写像することを認識し、そのシグネチャが `int->int` になると判断しました。

しかし、次の場合はどうでしょうか。

```fsharp
let evalWith5 fn = fn 5
```

この場合、 `fn` が整数を受け取ることは明らかですが、何を返すのかはわかりません。関数の型を明確にしたい場合、プリミティブ型と同じように関数パラメータに型注釈を追加できます。

```fsharp
let evalWith5AsInt (fn:int->int) = fn 5
let evalWith5AsFloat (fn:int->float) = fn 5
```

また、戻り値の型を指定することもできます。

```fsharp
let evalWith5AsString fn :string = fn 5
```

この場合、メイン関数が文字列を返すため、 `fn` 関数も自動的に文字列を返すように制約されます。そのため、 `fn` に対する明示的な型指定は不要となります。

<a name="unit-type"></a>
## "unit" 型

プログラミングでは、値を返さずに何かを行う関数が必要な場合があります。以下の `printInt` 関数を例に考えてみましょう。

```fsharp
let printInt x = printf "x is %i" x        // コンソールに出力
```

この関数は実際には何も返しません。単に副作用としてコンソールに文字列を出力するだけです。では、このような関数のシグネチャはどうなるでしょうか。

```fsharp
val printInt : int -> unit
```

ここで疑問が生じます。この `unit` とは何でしょうか。

関数が出力を返さない場合でも、値域が必要です。これは数学の原則に基づいています。数学の世界には「void」関数は存在しません。すべての関数は何らかの出力を持つ必要があります。なぜなら、関数は本質的に写像だからです。そして、写像には必ず写像先が必要です。

![](../assets/img/Functions_Unit.png)

F#では、このような「何も返さない」関数に対処するため、`unit` という特別な値域を用意しています。この値域にはちょうど1つの値 `()` があります。 `unit` と `()` は、C#の `void` （型）と `null` （値）に似ていると考えることができます。ただし、重要な違いがあります。void/nullとは異なり、 `unit` は実際の型であり、 `()` は実際の値なのです。これを確認するには、次のコードを評価してみてください。

```fsharp
let whatIsThis = ()
```

結果として、次のようなシグネチャが表示されます。

```fsharp
val whatIsThis : unit = ()
```

この結果は、値 `whatIsThis` が `unit` 型であり、値 `()` に束縛されていることを示しています。

では、 `printInt` のシグネチャに戻って考えてみましょう。

```fsharp
val printInt : int -> unit
```

このシグネチャは次のことを示しています。 `printInt` は `int` の定義域を持ち、それを私たちが特に気にしない何か（unit）に写像します。

<a name="parameterless-functions"></a>

### パラメーターのない関数

unitについて理解したところで、他の文脈でのunitの出現を予測できるでしょうか。たとえば、再利用可能な "hello world" 関数を作ることを考えてみましょう。この関数には入力も出力もないため、 `unit -> unit` というシグネチャになると予想されます。実際に試してみましょう。

```fsharp
let printHello = printf "hello world"        // コンソールに出力
```

結果は次のようになります。

```fsharp
hello world
val printHello : unit = ()
```

これは予想とは少し異なります。"Hello world" がすぐに出力され、結果は関数ではなく単なる unit 型の値になっています。この結果が単純な値であることは、シグネチャの形式から分かります。以前見たように、単純な値のシグネチャは次の形式になります。

```fsharp
val 名前: 型 = 定数
```

したがって、この場合 `printHello` は実際には値 `()` を持つ*単純な値*であり、再び呼び出すことのできる関数ではありません。

`printInt` と `printHello` の違いは何でしょうか。 `printInt` の場合、x パラメータの値が分かるまで値を決定できないため、関数の定義になりました。一方、 `printHello` の場合、パラメータがないため、右辺をすぐに評価できました。そして、コンソールへの出力という副作用とともに `()` 値を返しました。

真に再利用可能なパラメーターのない関数を作るには、unit 引数を強制的に持たせる方法があります。

```fsharp
let printHelloFn () = printf "hello world"    // コンソールに出力
```

このシグネチャは次のようになります。

```fsharp
val printHelloFn : unit -> unit
```

この関数を呼び出すには、 `()` 値をパラメーターとして渡す必要があります。

```fsharp
printHelloFn ()
```

### ignore 関数を使って unit 型を強制する

コンパイラが unit 型を要求し、エラーを発生させる場合があります。たとえば、次のようなコードはコンパイラエラーになります。

```fsharp
do 1+1     // => FS0020: この式の結果の型は 'int' で、暗黙的に無視されます。

let something = 
  2+2      // => FS0020: この式の結果の型は 'int' で、暗黙的に無視されます。
  "hello"
```

このような状況を解決するために、`ignore` という特別な関数が用意されています。この関数は任意の値を受け取り、unit 型を返します。これを使用すると、先ほどのコードは次のように書き直せます。

```fsharp
do (1+1 |> ignore)  // OK

let something = 
  2+2 |> ignore     // OK
  "hello"
```

## ジェネリック型

多くの場合、関数のパラメータは特定の型に限定されません。このような状況に対応するため、F#は.NETのジェネリック型システムを使用しています。

ジェネリック型の使用例を見てみましょう。次の関数は、パラメータを文字列に変換し、特定のテキストを追加します。

```fsharp
let onAStick x = x.ToString() + " on a stick"
```

この関数は、パラメータの型を問いません。すべてのオブジェクトが `ToString()` メソッドを持つため、どのような型でも受け入れることができます。

この関数のシグネチャは次のようになります。

```fsharp
val onAStick : 'a -> string
```

ここで注目すべきは `'a` という型表記です。これは、コンパイル時に未知のジェネリック型を示すF#の方法です。"a" の前のアポストロフィは、その型がジェネリックであることを示しています。C#で同様の関数を定義する場合、以下のようになります。

```csharp
string onAStick<a>();   

// より一般的な書き方
string OnAStick<TObject>();   // F#の 'a は
                              // C#の "TObject" 規約に相当します
```

F#の関数がジェネリック型で強く型付けされていることは重要なポイントです。これは `Object` 型のパラメータを取る関数とは異なります。この強い型付けにより、関数を組み合わせて使用する際に型安全性が保たれます。

この関数の汎用性を確認するため、異なる型の値で使用してみましょう。

```fsharp
onAStick 22
onAStick 3.14159
onAStick "hello"
```

ジェネリックパラメータが複数ある場合、コンパイラは異なる名前を割り当てます。最初のジェネリックに `'a`、2番目に `'b` というように続きます。例を見てみましょう。

```fsharp
let concatString x y = x.ToString() + y.ToString()
```

この関数の型シグネチャには、`'a` と `'b` の2つのジェネリックが含まれます。

```fsharp
val concatString : 'a -> 'b -> string
```

一方、コンパイラは1つのジェネリック型で十分な場合を認識します。次の例では、x と y のパラメータは同じ型である必要があります。

```fsharp
let isEqual x y = (x=y)
```

そのため、関数シグネチャでは両方のパラメータに同じジェネリック型が使用されます。

```fsharp
val isEqual : 'a -> 'a -> bool 
```

ジェネリックパラメータの重要性は、リストやより抽象的なデータ構造を扱う際により顕著になります。これらについては、今後の例で詳しく見ていくことになるでしょう。

## その他の型

これまで議論してきた型は、F#で使用できる型の一部にすぎません。これらの基本的な型は様々な方法で組み合わせることができ、より複雑な型を作り出すことができます。ここでは、関数のシグネチャでよく見かける型を簡単に紹介します。これらの型の詳細な説明は[別のシリーズ](../series/understanding-fsharp-types.md)で行います。

* **タプル型**：他の型のペアやトリプルなどを表現します。たとえば `("hello", 1)` は文字列と整数から構成されたタプルです。F#ではコンマがタプルの特徴的な要素です。コードの中でコンマを見かけたら、それはほぼ確実にタプルの一部だと考えてよいでしょう。

関数のシグネチャでは、タプルは関係する型の「乗算」として記述されます。たとえば、先ほどの例のタプル型は以下のように表現されます。

```fsharp
string * int      // ("hello", 1)
```

* **コレクション型**：最も一般的なコレクション型はリスト、シーケンス、配列です。リストと配列は固定サイズですが、シーケンスは潜在的に無限の要素を持つことができます。シーケンスは内部的には `IEnumerable` と同じものです。関数のシグネチャでは、これらのコレクション型はそれぞれ固有のキーワードを使用します。リストは `list` 、シーケンスは `seq` 、配列は `[]` を使います。例を見てみましょう。

```fsharp
int list          // リスト型  例: [1;2;3]
string list       // リスト型  例: ["a";"b";"c"]
seq<int>          // シーケンス型   例: seq{1..10}
int []            // 配列型 例: [|1;2;3|]
```

* **オプション型**：値が存在しない可能性がある場合に使用されるシンプルなラッパーです。`Some` と `None` の2つのケースがあります。関数のシグネチャでは `option` キーワードを使用します。

```fsharp
int option        // Some(1)
```

* **判別共用体型**：他の型の選択肢の集合から構築される型です。この型の例は「[F# を使う理由](../series/why-use-fsharp.md)」シリーズで見ました。関数のシグネチャでは、型の名前そのもので参照されるため、特別なキーワードはありません。
* **レコード型**：これは構造体やデータベースの行に似ており、名前付きのフィールドのリストです。この型の例も「[F# を使う理由](../series/why-use-fsharp.md)」シリーズで見ました。判別共用体型と同様に、関数のシグネチャでは型の名前で参照され、特別なキーワードはありません。

## 型の理解度テスト

ここまでで型についての理解を深めてきました。では、実際にどれくらい理解できたか、テストしてみましょう。以下にいくつかの式を示します。これらの式のシグネチャを推測してみてください。正解を確認するには、これらの式をF#のインタラクティブウィンドウで実行してみてください。

```fsharp
let testA   = float 2
let testB x = float 2
let testC x = float 2 + x
let testD x = x.ToString().Length
let testE (x:float) = x.ToString().Length
let testF x = printfn "%s" x
let testG x = printfn "%f" x
let testH   = 2 * 2 |> ignore
let testI x = 2 * 2 |> ignore
let testJ (x:int) = 2 * 2 |> ignore
let testK   = "hello"
let testL() = "hello"
let testM x = x=x
let testN x = x 1          // ヒント: x はどのような種類のものでしょうか？
let testO x:string = x 1   // ヒント: :string は何を修飾していますか？ 
```