---
layout: post
title: "レコード"
description: "ラベル付きタプルの拡張"
nav: fsharp-types
seriesId: "F#の型を理解する"
seriesOrder: 5
categories: [型]
---

前回の投稿で述べたように、単純なタプルは多くの場面で役立ちます。しかし、欠点もあります。すべてのタプル型はあらかじめ定義されているため、地理座標に使う浮動小数点のペアと、複素数に使う似たようなタプルを区別できません。また、タプルの要素が数個を超えると、どの要素がどの位置にあるのかわかりにくくなります。

こういった状況では、タプルの各スロットに*ラベル*を付けたくなるでしょう。これで、各要素の用途を文書化し、同じ型のタプルを区別することができます。

ここで「レコード」型の出番です。レコード型はまさにそのもので、各要素にラベルが付いたタプルです。

```fsharp
type ComplexNumber = { real: float; imaginary: float }
type GeoCoord = { lat: float; long: float }
```

レコード型は標準的な前置き `type [型名] =` に続いて波かっこを使います。波かっこの中には `ラベル: 型` のペアがセミコロンで区切られてリストになっています（F#のすべてのリストはセミコロンで区切られることを覚えておいてください。カンマはタプル用です）。

レコード型とタプル型の「型構文」を比べてみましょう。

```fsharp
type ComplexNumberRecord = { real: float; imaginary: float }
type ComplexNumberTuple = float * float
```

レコード型には「乗算」はなく、ラベル付きの型がリストになっています。

<div class="alert alert-info">
リレーショナルデータベース理論では、似たような「レコード型」の概念を使います。リレーショナルモデルでは、関係 (リレーション) は同じ有限の属性集合を持つタプルの（空かもしれない）有限集合です。この属性の集合は、普通、列名 (カラム名) の集合と呼ばれています。
</div>

## レコードの作成とマッチング

レコード値を作るには、型定義と似た形式を使いますが、ラベルの後に等号を使います。これは「レコード式」と呼ばれます。

```fsharp
type ComplexNumberRecord = { real: float; imaginary: float }
let myComplexNumber = { real = 1.1; imaginary = 2.2 } // 等号を使う！

type GeoCoord = { lat: float; long: float } // 型ではコロンを使う
let myGeoCoord = { lat = 1.1; long = 2.2 }  // letでは等号を使う
```

レコードを「分解」するには、同じ構文を使います。

```fsharp
let myGeoCoord = { lat = 1.1; long = 2.2 }   // "構築"
let { lat=myLat; long=myLong } = myGeoCoord  // "分解"
```

いつものように、一部の値が要らない場合はアンダースコアをプレースホルダーとして使えます。あるいは、もっと簡単に、要らないラベルを完全に省略することもできます。

```fsharp
let { lat=_; long=myLong2 } = myGeoCoord  // "分解"
let { long=myLong3 } = myGeoCoord         // "分解"
```

単一のプロパティだけが必要な場合は、パターンマッチングの代わりにドット表記を使えます。

```fsharp
let x = myGeoCoord.lat
let y = myGeoCoord.long
```

分解時にはラベルを省略できますが、構築時には省略できないことに注意してください。

```fsharp
let myGeoCoord = { lat = 1.1; }  // error FS0764: 型 'GeoCoord' のフィールド 'long' に
                                 // 割り当てが指定されていません
```

<div class="alert alert-info">
レコード型の最も目立つ特徴の1つは波かっこの使用です。C言語系の言語とは違い、F#では波かっこはほとんど使いません。レコード、シーケンス、コンピュテーション式（シーケンスはその特殊な場合）、およびオブジェクト式（インターフェースの実装をその場で作る）にのみ使います。これらの他の用途については後で説明します。
</div>

### ラベルの順序

タプルとは違い、レコードではラベルの順序は重要ではありません。したがって、以下の2つの値は同じです。

```fsharp
let myGeoCoordA = { lat = 1.1; long = 2.2 }    
let myGeoCoordB = { long = 2.2; lat = 1.1 }   // 上と同じ
```

### 名前の衝突

上記の例では、ラベル名 `lat` と `long` だけでレコードを構築できました。不思議なことに、コンパイラはどのレコード型を作るべきか知っていました（実際には、それほど不思議ではありません。正確に一致するラベルを持つレコード型は1つしかなかっただけです）。

でも、同じラベルを持つレコード型が 2 つ存在した場合はどうなるでしょうか？コンパイラは、どちらを意味しているのか区別できるでしょうか？答えは、区別できない、です。コンパイラは最後に定義された型を使い、場合によっては警告を出します。以下を評価してみてください。

```fsharp
type Person1 = {first:string; last:string}
type Person2 = {first:string; last:string}
let p = {first="Alice"; last="Jones"}  
```

`p` の型は何でしょうか？答えは `Person2` です。これは、そのラベルを持つ最後に定義された型です。

そして、分解しようとすると、あいまいなフィールドラベルに関する警告が出ます。

```fsharp
let {first=f; last=l} = p
```

これを修正するには、少なくとも1つのラベルに型名を修飾子として加えるだけです。

```fsharp
let p = {Person1.first="Alice"; last="Jones"}
let { Person1.first=f; last=l} = p
```

必要なら、完全修飾名（名前空間付き）を追加することもできます。以下は[モジュール](../posts/organizing-functions.md)を使った例です。

```fsharp
module Module1 = 
  type Person = {first:string; last:string}

module Module2 = 
  type Person = {first:string; last:string}

module Module3 = 
  let p = {Module1.Person.first="Alice"; 
           Module1.Person.last="Jones"}
```

もちろん、ローカル名前空間に1つのバージョンしかないことが確認できれば、これを一切行う必要はありません。

```fsharp
module Module3b = 
  open Module1                   // ローカル名前空間に取り込む
  let p = {first="Alice"; last="Jones"}  // Module1.Personになる
```

要するに、レコード型を定義する際には、できるだけ一意のラベルを使うべきということです。そうしないと、コードの見栄えが悪くなるか、最悪の場合は予期しない動作をすることになります。

<div class="alert alert-info">
F#では、他の一部の関数型言語とは違い、構造がまったく同じ 2 つの型は同じ型ではありません。これは「公称型システム」と呼ばれ、2つの型は名前が同じ場合にのみ等しくなります。これに対して、「構造的型システム」では、同一の構造を持つ定義は、名前が異なっていても同じ型になります。
</div>

## レコード型の実践的な使い方

レコード型はどのように使えるでしょうか？いくつか見ていきましょう。

### 関数の戻り値としてレコードを使う

タプルと同じく、レコードは関数から複数の値を返すのに便利です。先ほど説明したタプルの例を、レコードを使って書き直してみましょう。

```fsharp
// TryParseのタプルバージョン
let tryParseTuple intStr = 
   try
      let i = System.Int32.Parse intStr
      (true,i)
   with _ -> (false,0)  // どんな例外でも

// レコードバージョンでは、戻り値を保持する型を作る
type TryParseResult = {success:bool; value:int} 

// TryParseのレコードバージョン
let tryParseRecord intStr = 
   try
      let i = System.Int32.Parse intStr
      {success=true;value=i}
   with _ -> {success=false;value=0}  

// テスト
tryParseTuple "99"
tryParseRecord "99"
tryParseTuple "abc"
tryParseRecord "abc"
```

戻り値に明示的なラベルがあると、理解がとても簡単になることがわかります（もちろん、実際には後で説明する `Option` 型を使うでしょう）。

そして、タプルではなくレコードを使った、単語と文字数のカウントの例です。

```fsharp
// 戻り値の型を定義
type WordAndLetterCountResult = {wordCount:int; letterCount:int} 

let wordAndLetterCount (s:string) = 
   let words = s.Split [|' '|]
   let letterCount = words |> Array.sumBy (fun word -> word.Length ) 
   {wordCount=words.Length; letterCount=letterCount}

// テスト
wordAndLetterCount "to be or not to be"
```

### 他のレコードからレコードを作る

ほとんどの F# の値と同じく、レコードは不変で、要素を変更することはできません。では、レコードを変更するにはどうすればいいでしょうか？ここでも答えは「変更できない」です。常に新しいレコードを作る必要があります。

例えば、 `GeoCoord` レコードを受け取って、各要素に1を加える関数を書くとしましょう。 以下のようにできます。

```fsharp
let addOneToGeoCoord aGeoCoord =
   let {lat=x; long=y} = aGeoCoord
   {lat = x + 1.0; long = y + 1.0}   // 新しいものを作る

// 試してみる
addOneToGeoCoord {lat=1.1; long=2.2}
```

ここでも、関数のパラメータで直接分解することで簡単にでき、関数は1行になります。

```fsharp
let addOneToGeoCoord {lat=x; long=y} = {lat=x+1.0; long=y+1.0}

// 試してみる
addOneToGeoCoord {lat=1.0; long=2.0}
```

または、好みに応じてドット表記を使ってプロパティを取得することもできます。

```fsharp
let addOneToGeoCoord aGeoCoord =
   {lat=aGeoCoord.lat + 1.0; long= aGeoCoord.long + 1.0}   
```

多くの場合、1つか2つのフィールドだけを調整し、他のすべてをそのままにしておく必要があります。このよくあるケースを簡単にするために、特別な構文があります。それが `with` キーワードです。元の値から始まり、"with" が続き、その後に変更したいフィールドを指定します。例をいくつか示します。

```fsharp
let g1 = {lat=1.1; long=2.2}
let g2 = {g1 with lat=99.9}   // 新しいものを作る

let p1 = {first="Alice"; last="Jones"}  
let p2 = {p1 with last="Smith"}  
```

"with" の技術用語は、「コピーおよび更新のレコード式」です。

### レコードの等価性

タプルと同じく、レコードには自動的に定義された等価比較演算があります。2つのレコードは、同じ型を持ち、各スロットの値が等しい場合に等しいとみなされます。

また、レコードには自動的に定義されたハッシュ値もあり、これはレコード内の値に基づいています。そのため、レコードを辞書のキーとして問題なく使えます。

```fsharp
{first="Alice"; last="Jones"}.GetHashCode()
```

### レコードの表現

[以前の投稿](../posts/convenience-types.md)で述べたように、レコードにはデフォルトできれいな文字列表現があり、簡単にシリアル化できます。しかし、タプルとは違い、`ToString()` の表現は役に立ちません。

```fsharp
printfn "%A" {first="Alice"; last="Jones"}   // 良い
{first="Alice"; last="Jones"}.ToString()     // 醜い
printfn "%O" {first="Alice"; last="Jones"}   // 醜い
```

## サブコーナー：print フォーマット文字列での %A vs. %O

先ほど、同じレコードに対して print フォーマット指定子 `%A` と `%O` がまったく違う結果を生むことを確認しました。

```fsharp
printfn "%A" {first="Alice"; last="Jones"}
printfn "%O" {first="Alice"; last="Jones"}
```

なぜこんな違いがあるのでしょうか？

`%A` は、対話式出力に使うのと同じプリティプリンターを使って値を出力します。一方、 `%O` は `Object.ToString()` を使います。これは、`ToString` メソッドをオーバーライドしていない場合、 `%O` はデフォルトの（通常は役に立たない）出力を生むことを意味します。したがって、普通は `%O` より `%A` を使うようにしてください。コアの F# 型はデフォルトでプリティプリントを持っているからです。

ただし、F# の「クラス」型は標準のプリティプリント形式を持たないため、 `ToString` をオーバーライドしない限り、 `%A` と `%O` は同様に非協力的だということに注意してください。

