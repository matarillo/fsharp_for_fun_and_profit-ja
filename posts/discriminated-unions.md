---
layout: post
title: "判別共用体"
description: "型を足し合わせる"
nav: fsharp-types
seriesId: "F#の型を理解する"
seriesOrder: 6
categories: [型]
---


タプルやレコードは、既存の型を「掛け合わせる」ことで新しい型を作る例です。このシリーズの冒頭で、新しい型を作るもう一つの方法は、既存の型を「足し合わせる」ことだと述べました。これはどういう意味でしょうか。

例えば、整数またはブール値を処理して文字列に変換する関数を定義したいとします。ただし、厳密に整数と真偽値だけを受け入れ、浮動小数点数や文字列などは受け入れたくありません。このような関数を図で表すと次のようになります。

![整数または真偽値を受け取る関数](../assets/img/fun_int_union_bool.png)

この関数の定義域はどう表現できるでしょうか。

必要なのは、取り得るすべての整数と、取り得るすべての真偽値を合わせた型です。

![整数と真偽値の和集合](../assets/img/int_union_bool.png)

つまり、「直和」の型です。この場合、新しい型は整数型と真偽値型を「足し合わせた」ものになります。

F#では、直和型を「判別共用体」型と呼びます。各構成要素（共用体の*ケース*と呼ばれます）の型には、区別（判別）できるようにラベル（*ケース識別子* または *タグ*と呼ばれます）を付ける必要があります。ラベルには任意の識別子を使えますが、大文字で始める必要があります。

上記の型は次のように定義できます。

```fsharp
type IntOrBool = 
  | I of int
  | B of bool
```

「I」と「B」は任意のラベルです。意味のあるラベルを使うこともできます。

小さな型の場合は、定義を1行で書くこともできます。

```fsharp
type IntOrBool = I of int | B of bool
```

構成要素の型には、タプル、レコード、他の共用体型など、好きな型を使えます。

```fsharp
type Person = {first:string; last:string}  // レコード型の定義
type IntOrBool = I of int | B of bool

type MixedType = 
  | Tup of int * int  // タプル
  | P of Person       // 上で定義したレコード型を使う
  | L of int list     // 整数のリスト
  | U of IntOrBool    // 上で定義した共用体型を使う
```

自身を参照する再帰的な型を定義することもできます。これは通常、木構造を定義する際に使います。再帰型については後ほど詳しく説明します。

### 直和型 vs C++のunionとVBのvariant

一見すると、直和型はC++のunion型やVisual BasicのVariant型に似ているように見えるかもしれません。しかし、重要な違いがあります。C++のunion型は型安全ではなく、格納されたデータは可能なタグのどれを使ってもアクセスできます。一方、F#の判別共用体型は安全であり、データには一つの方法でしかアクセスできません。直和型を（図に示したように）二つの型の和と考える方が、単なるデータのオーバーレイと考えるよりも実際には役に立ちます。

## 共用体型に関する重要なポイント

共用体型について知っておくべき重要な点は次のとおりです。

* 最初の構成要素の前の縦棒は省略できます。以下の定義はすべて同等です。インタラクティブウィンドウの出力を見れば分かります。

```fsharp
type IntOrBool = I of int | B of bool     // 最初の縦棒なし
type IntOrBool = | I of int | B of bool   // 最初の縦棒あり
type IntOrBool = 
   | I of int 
   | B of bool      // 別々の行に書いた場合の最初の縦棒
```

* タグまたはラベルは大文字で始める必要があります。次の例はエラーになります。

```fsharp
type IntOrBool = int of int| bool of bool
//  error FS0053: 小文字で区別される和集合のケースは、
//                RequireQualifiedAccess 属性を使用する場合にのみ許可されます
```

* 他の名前付き型（ `Person` や `IntOrBool` など）は、共用体型の外部であらかじめ定義されている必要があります。「インライン」で定義することはできません。

```fsharp
type MixedType = 
  | P of  {first:string; last:string}  // エラー
```

または

```fsharp
type MixedType = 
  | U of (I of int | B of bool)  // エラー
```

* ラベルには任意の識別子を使えます。構成要素の型の名前自体をラベルとして使うこともできますが、予想していなかった場合は混乱する可能性があります。例えば、`System`名前空間から`Int32`型と`Boolean`型を使い、ラベルも同じ名前にした場合、次のような完全に有効な定義になります。

```fsharp
open System
type IntOrBool = Int32 of Int32 | Boolean of Boolean
```

この「重複する名前付け」スタイルは実際によく使用されます。構成要素の型が何であるかを正確に文書化できるためです。

## 共用体型の値の構築

共用体型の値を作るには、ひとつのケースだけを参照する「コンストラクタ」を使います。コンストラクタは、定義されている形式に沿って、ケースラベルをあたかも関数のように使って値を作成します。 `IntOrBool` の例では、次のように書きます。

```fsharp
type IntOrBool = I of int | B of bool

let i  = I 99    // "I"コンストラクタを使う
// val i : IntOrBool = I 99

let b  = B true  // "B"コンストラクタを使う
// val b : IntOrBool = B true
```

結果の値は、ラベルと構成要素の型とともに次のように表示されます。

```fsharp
val [値の名前]: [型]      = [ラベル] [構成要素の型の表示]
val i         : IntOrBool = I        99
val b         : IntOrBool = B        true
```

ケースコンストラクタに複数の「パラメータ」がある場合も、関数を呼び出すのと同じ方法で作成します。

```fsharp
type Person = {first:string; last:string}

type MixedType = 
  | Tup of int * int
  | P of Person

let myTup  = Tup (2,99)    // "Tup"コンストラクタを使う
// val myTup : MixedType = Tup (2,99)

let myP  = P {first="太郎"; last="山田"} // "P"コンストラクタを使う
// val myP : MixedType = P {first = "太郎";last = "山田"; }
```

共用体型のケースコンストラクタは通常の関数なので、関数が使える場所ならどこでも使えます。例えば、 `List.map` の中で使うことができます。

```fsharp
type C = Circle of int | Rectangle of int * int

[1..10]
|> List.map Circle

[1..10]
|> List.zip [21..30]
|> List.map Rectangle
```

### 名前の競合

ケースに固有の名前が付けられていれば、作成する型は明確になります。

しかし、異なる型で同じラベルを持つケースがある場合はどうなるでしょうか。

```fsharp
type IntOrBool1 = I of int | B of bool
type IntOrBool2 = I of int | B of bool
```

この場合、一般的には最後に定義されたものが使われます。

```fsharp
let x = I 99                // val x: IntOrBool2 = I 99
```

ですが、明示的に型を修飾するのがより望ましい方法です。

```fsharp
let x1 = IntOrBool1.I 99    // val x1 : IntOrBool1 = I 99
let x2 = IntOrBool2.B true  // val x2 : IntOrBool2 = B true
```

型が異なるモジュールから来ている場合は、モジュール名も使えます。

```fsharp
module Module1 = 
  type IntOrBool = I of int | B of bool

module Module2 = 
  type IntOrBool = I of int | B of bool

module Module3 =
  let x = Module1.IntOrBool.I 99 // val x : Module1.IntOrBool = I 99
```


### 共用体型のパターンマッチング

タプルやレコードでは、値の「分解」は作成と同じモデルを使うことを見てきました。これは共用体型でも同様ですが、どのケースを分解すべきかが問題になります。

これこそが、**match 式**が設計された目的です。ご存じのように、match式の構文は共用体型の定義と似ています。

```fsharp
// 共用体型の定義
type MixedType = 
  | Tup of int * int
  | P of Person

// 共用体型の「分解」
let matcher x = 
  match x with
  | Tup (x,y) -> 
        printfn "タプルがマッチしました。%i %i" x y
  | P {first=f; last=l} -> 
        printfn "Personがマッチしました。%s %s" f l

let myTup = Tup (2,99)                 // "Tup"コンストラクタを使う
matcher myTup  

let myP = P {first="太郎"; last="山田"} // "P"コンストラクタを使う
matcher myP
```

ここで何が起こっているか分析してみましょう。

* match式の「分岐」は、共用体型の各ケースにマッチするように設計されたパターン式です。
* パターンは、特定のケースのタグで始まり、その後、通常の方法でそのケースの型を分解します。
* パターンの後には矢印 ( `->` ) が続き、その後に実行するコードが来ます。


## 空のケース

共用体のケースラベルの後には、型がなくても構いません。以下はすべて有効な共用体型です。

```fsharp
type Directory = 
  | Root                   // ルートに名前は不要
  | Subdirectory of string // 他のディレクトリには名前が必要

type Result = 
  | Success                // 成功状態に文字列は不要
  | ErrorMessage of string // エラーメッセージが必要
```

すべてのケースが空の場合、「列挙型スタイル」の共用体になります。

```fsharp
type Size = Small | Medium | Large
type Answer = Yes | No | Maybe
```

ただし、この「列挙型スタイル」の共用体は、後で説明する真の C# 列挙型とは異なります。

空のケースを作るには、パラメータなしでラベルをコンストラクタとして使うだけです。

```fsharp
let myDir1 = Root
let myDir2 = Subdirectory "bin"

let myResult1 = Success
let myResult2 = ErrorMessage "見つかりません"

let mySize1 = Small
let mySize2 = Medium
```

<a id="single-case"></a>

## 単一ケース

時には、1つのケースだけを持つ共用体型を作ると便利な場合があります。これは一見無意味に思えるかもしれません。価値を追加しているようには見えないからです。しかし実際には、型安全性を強化できる非常に便利な手法です*。

<sub>* 今後のシリーズでは、モジュールシグネチャと組み合わせることで、単一ケースの共用体がデータ隠蔽やケイパビリティベースのセキュリティにも役立つことを見ていきます。</sub>

たとえば、整数で表される顧客 ID と注文 ID があり、それらが互いに割り当てるべきではないという場合を考えてみましょう。

前述のように、型エイリアスのアプローチでは機能しません。エイリアスは単なる同義語であり、独立した型を作らないからです。以下は、エイリアスを使って試す方法です。

```fsharp
type CustomerId = int   // 型エイリアスを定義
type OrderId = int      // 別の型エイリアスを定義

let printOrderId (orderId:OrderId) = 
   printfn "注文IDは %i です" orderId

// 試してみる
let custId = 1          // 顧客IDを作る
printOrderId custId   // おっと！ 
```

`orderId` パラメータを明示的に `OrderId` 型として注釈を付けましたが、顧客IDが誤って渡されるのを防げません。

一方、単純な共用体型を作れば、型の区別を簡単に強制できます。

```fsharp
type CustomerId = CustomerId of int   // 共用体型を定義 
type OrderId = OrderId of int         // 別の共用体型を定義 

let printOrderId (OrderId orderId) =  // パラメータで分解
   printfn "注文IDは %i です" orderId

// 試してみる
let custId = CustomerId 1             // 顧客IDを作る
printOrderId custId                   // 良い！ コンパイラエラーになります
```

このアプローチは C# や Java でも可能ですが、各型用に特別なクラスを作り管理するオーバーヘッドがあるため、あまり使いません。F#ではこのアプローチが軽量であるため、かなり一般的です。

単一ケースの共用体型の便利な点は、完全な `match-with` 式を使わずに、値に対して直接パターンマッチングができることです。

```fsharp
// パラメータで分解
let printCustomerId (CustomerId customerIdInt) =     
   printfn "顧客IDは %i です" customerIdInt

// または、letステートメントで明示的に分解
let printCustomerId2 custId =     
   let (CustomerId customerIdInt) = custId  // ここで分解
   printfn "顧客IDは %i です" customerIdInt

// 試してみる
let custId = CustomerId 1             // 顧客IDを作る
printCustomerId custId                   
printCustomerId2 custId                   
```

ただし、よくある「落とし穴」として、場合によってはパターンマッチにかっこが必要です。そうしないと、コンパイラは関数を定義していると勘違いしてしまいます！

```fsharp
let custId = CustomerId 1                
let (CustomerId customerIdInt) = custId  // 正しいパターンマッチング
let CustomerId customerIdInt = custId    // 間違い！ 新しい関数？
```

同様に、単一ケースの列挙型スタイルの共用体型を作る必要がある場合は、型定義でケースを縦棒で始める必要があります。そうしないと、コンパイラはエイリアスを作っていると勘違いします。

```fsharp
type TypeAlias = A     // 型エイリアス！
type SingleCase = | A   // 単一ケースの共用体型
```


## 共用体の等価性

他のF#のコア型と同様に、共用体型には自動的に定義された等価比較演算子があります。二つの共用体は、同じ型で同じケースを持ち、そのケースの値が等しい場合に等しいとみなされます。

```fsharp
type Contact = Email of string | Phone of int

let email1 = Email "bob@example.com"
let email2 = Email "bob@example.com"

let areEqual = (email1=email2)
```


## 共用体の表現

共用体型には、デフォルトで適切な文字列表現があり、簡単にシリアル化できます。しかし、タプルとは異なり、ToString()の表現は役に立ちません。

```fsharp
type Contact = Email of string | Phone of int
let email = Email "bob@example.com"
printfn "%A" email    // 良い
printfn "%O" email    // 醜い！
```

