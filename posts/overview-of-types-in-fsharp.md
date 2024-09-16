---
layout: post
title: "F#の型の概要"
description: "全体像を把握する"
nav: fsharp-types
seriesId: "F#の型を理解する"
seriesOrder: 2
categories: [型]
---


F# の具体的な型を調べる前に、全体像を見てみましょう。

## 型は何のために使われるのか？

オブジェクト指向設計の経験がある場合、「関数型思考」への移行で難しく感じるポイントの一つは、型についての考え方を切り替えることです。

よく設計されたオブジェクト指向プログラムは、データよりも振る舞いに重点を置いており、「ダックタイピング」や明示的なインターフェイスを使ってポリモーフィズムを実現し、実際にやり取りされる具体的なクラスについての知識を避けるようにします。

一方、よく設計された関数型プログラムは、動作よりも *データ型* に重点を置いています。F# では、C#などの命令型言語よりも型設計が重視されており、このシリーズや後続のシリーズ後のシリーズの多くの例では、型定義の作成と改良に焦点を当てています。

では、型とは何でしょうか？ 型は意外と定義が難しいものです。有名な教科書には次のような定義があります。

> 「型システムは、フレーズを計算する値の種類に応じて分類することで、特定のプログラム動作がないことを証明するための扱いやすい構文的方法である。」
> *(ベンジャミン・ピアース著「型とプログラミング言語」)*

少し専門的な定義ですね。では、実務では型を何に使うのでしょうか？ F# の場合、型には主に 2 つの使い方が考えられます。

* 1つ目は、値への *注釈* として使い、特にコンパイル時に特定のチェックを可能にすることです。言い換えると、型を使うことで「コンパイル時の単体テスト」ができます。
* 2つ目は、関数が作用する *ドメイン* として使用することです。つまり、型は一種のデータモデリングツールであり、コード内で実世界のドメインを表すことができます。

この 2 つの定義は相互に作用します。型定義が実世界のドメインをどれだけ正確に反映しているかによって、ビジネスルールが静的にどれだけ表現されるかが決まります。ビジネスルールが静的に表現されるほど、「コンパイル時の単体テスト」が機能します。理想的なシナリオでは、プログラムがコンパイルできれば、それは本当に正しいプログラムということになります。

## F# にはどのような型があるのか？

F# はハイブリッド言語なので、関数型プログラミング由来の型とオブジェクト指向由来の型が混在しています。

一般的に、F# の型は次のようなカテゴリーに分類されます。

* **共通の .NET 型**: .NET 共通言語基盤 (CLI) に準拠した型で、すべての .NET 言語に簡単に移植できます。
* **F# 固有の型**: F# 言語の一部であり、純粋関数型プログラミング用に設計された型です。

C# に慣れ親しんでいる方なら、すべての CLI 型を知っているでしょう。これらには以下が含まれます。

* 組み込み値型 (int、bool など)
* 組み込み参照型 (string など)
* ユーザー定義値型 (enum と struct)
* クラスとインターフェース
* デリゲート
* 配列

F# 固有の型には以下が含まれます。

* [関数型](../posts/function-values-and-simple-values.md) (デリゲートや C# のラムダ式とは異なります)
* [Unit 型](../posts/how-types-work-with-functions.md#unit-type)
* [タプル](../posts/tuples.md) (現在は .NET 4.0 以降に含まれます)
* [レコード](../posts/records.md)
* [判別共用体](../posts/discriminated-unions.md)
* [オプション型](../posts/the-option-type.md)
* リスト (.NET の List クラスとは異なります)

新しい型を作るときは、クラスではなく F# 固有の型を使うことを強くお勧めします。F# 固有の型には、CLI 型に比べて以下のような利点があります。

* 不変（イミュータブル）である
* null になり得ない
* 構造による等価性と比較が組み込まれている
* きれいな出力（プリティプリント）が組み込まれている

## 直和型と直積型

F#における型の力を理解するカギは、ほとんどの新しい型が他の型から**和**と**積**という2つの基本的な操作を使って構成されることです。

つまり、F# ではまるで代数を行うかのように新しい型を定義できます。

    define typeZ = typeX "plus" typeY
    define typeW = typeX "times" typeZ

**和** と **積** が実際には何を意味するのかについては、後ほどこのシリーズでタプル (直積) と 判別共用体 (直和) 型について詳しく議論するときに説明します。

重要なポイントは、既存の型を「積」と「和」という方法を使ってさまざまに組み合わせることで、無限の新しい型を作り出せるということです。これらを総称して「代数的データ型」または ADT (抽象データ型と混同しないでください。こちらもADTと呼ばれます) と呼びます。代数的データ型は、リスト、ツリー、その他の再帰型を含むあらゆるものをモデル化するのに使えます。

特に、直和型または「共用体」は非常に価値があり、慣れればなくてはならないものになるでしょう。

## 型の定義方法

具体的な詳細は異なるかもしれませんが、すべての型定義は似ています。すべての型定義は `type` キーワードで始まり、その後に型の識別子、ジェネリック型パラメータ（ある場合）、そして定義が続きます。たとえば、以下はさまざまな型の定義例です。

```fsharp
type A = int * int
type B = {FirstName:string; LastName:string}
type C = Circle of int | Rectangle of int * int
type D = Day | Month | Year
type E<'a> = Choice1 of 'a | Choice2 of 'a * 'a

type MyClass(initX:int) =
   let x = initX
   member this.Method() = printf "x=%i" x
```

[以前の記事](../posts/function-signatures.md) で述べたように、新しい型を定義するための特別な構文があり、通常の式構文とは異なります。この違いに注意してください。

型は、名前空間またはモジュール*でのみ*宣言できます。ただし、常にトップレベルで作成する必要はありません。必要に応じて、ネストされたモジュール内に型を作って隠すこともできます。

```fsharp

module sub = 
    // モジュール内で宣言された型
    type A = int * int

    module private helper = 
        // サブモジュール内で宣言された型
        type B = B of string list

        // 内部アクセスは許可される
        let b = B ["a";"b"]

// 外部アクセスは許可されない
let b = sub.helper.B ["a";"b"]
```

型は、関数内では宣言*できません*。

```fsharp
let f x = 
    type A = int * int  // 予期しないキーワード "type"
    x * x
```

## 型の構築と分解

型が定義されると、その型のインスタンスは、型定義自体と非常によく似た「コンストラクター」式を使って作られます。

```fsharp
let a = (1,1)
let b = { FirstName="Bob"; LastName="Smith" } 
let c = Circle 99
let c' = Rectangle (2,1)
let d = Month
let e = Choice1 "a"
let myVal = MyClass 99
myVal.Method()
```


興味深いのは、*同じ* 「コンストラクター」構文が、パターンマッチングで型を「分解」するのにも使われることです。

```fsharp
let a = (1,1)                                  // "構築"
let (a1,a2) = a                                // "分解"

let b = { FirstName="Bob"; LastName="Smith" }  // "構築"
let { FirstName = b1 } = b                     // "分解" 

let c = Circle 99                              // "構築"
match c with                                   
| Circle c1 -> printf "半径 %i の円" c1        // "分解"
| Rectangle (c2,c3) -> printf "%i %i" c2 c3    // "分解"

let c' = Rectangle (2,1)                       // "構築"
match c' with                                   
| Circle c1 -> printf "半径 %i の円" c1        // "分解"
| Rectangle (c2,c3) -> printf "%i %i" c2 c3    // "分解"
```

このシリーズを読み進める中で、コンストラクターがこの両方で使われることに注目してください。

## "type" キーワードのフィールドガイド

F# ではすべての型を定義するのに同じ "type" キーワードを使うため、F#に慣れていない人にとっては、これらがどれも同じように見えるかもしれません。以下は、これらの型の一覧とその見分け方です。

<table class="table table-bordered table-striped">
<col></col>
<col width="50%"></col>
<col></col>
<tr>
<th>型</th>
<th>例</th>
<th>特徴</th>
</tr>
<tr>
<td>
<b>略称（エイリアス）</b>
</td>
<td>
<pre>
type ProductCode = string
type transform<'a> = 'a -> 'a	
</pre>
</td>
<td>
等号のみを使う。
</td>
</tr>
<tr>
<td>
<b>タプル</b>
</td>
<td>
<pre>
//type キーワードで明示的に定義しない
//使用例
let t = 1,2
let s = (3,4)	
</pre>
</td>
<td>
<code>type</code>キーワードで明示的に定義しなくても常に使える。
カンマで区切るとタプルとして扱われる（かっこはオプション）。
</td>
</tr>
<tr>
<td>
<b>レコード</b>
</td>
<td>
<pre>
type Product = {code:ProductCode; price:float }
type Message<'a> = {id:int; body:'a}

//使用例
let p = {code="X123"; price=9.99}
let m = {id=1; body="hello"}
</pre>
</td>
<td>
波かっこを使う。<br>
フィールドの区切りにセミコロンを使う。
</td>
</tr>
<tr>
<td>
<b>判別共用体</b>
</td>
<td>
<pre>
type MeasurementUnit = Cm | Inch | Mile 
type Name = 
    | Nickname of string 
    | FirstLast of string * string
type Tree<'a> = 
    | E 
    | T of Tree<'a> * 'a * Tree<'a>
//使用例
let u = Inch
let name = Nickname("John")
let t = T(E,"John",E)	
</pre>
</td>
<td>
縦棒文字を使う。<br>
型には "of" を使う。
</td>
</tr>
<tr>
<td>
<b>列挙型</b>
</td>
<td>
<pre>
type Gender = | Male = 1 | Female = 2
//使用例
let g = Gender.Male
</pre>
</td>
<td>
共用体に似ているが、等号と整数値を使う
</td>
</tr>
<tr>
<td>
<b>クラス</b>
</td>
<td>
<pre>
type Product (code:string, price:float) = 
   let isFree = price=0.0 
   new (code) = Product(code,0.0)
   member this.Code = code 
   member this.IsFree = isFree

//使用例
let p = Product("X123",9.99)
let p2 = Product("X123")	
</pre>
</td>
<td>
クラス名の後に、関数の引数のようにパラメーターを記述することで、コンストラクターとして使える。<br>
"member" キーワードを使う。<br>
セカンダリーコンストラクターには "new" キーワードを使う。
</td>
</tr>
<tr>
<td>
<b>インターフェース</b>
</td>
<td>
<pre>
type IPrintable =
   abstract member Print : unit -> unit
</pre>
</td>
<td>
クラスと同じだが、すべてのメンバーが抽象的。<br>
抽象メンバーは、具体的な実装ではなく、コロンと型シグネチャだけ記述する。
</td>
</tr>
<tr>
<td>
<b>構造体</b>
</td>
<td>
<pre>
type Product= 
   struct  
      val code:string
      val price:float
      new(code) = { code = code; price = 0.0 }
   end
   
//使用例
let p = Product()
let p2 = Product("X123")	
</pre>
</td>
<td>
"struct" キーワードを使う。<br>
フィールドの定義に "val" を使う。<br>
コンストラクターを持てる。<br>
</td>
</tr>
</table>

