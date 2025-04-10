---
layout: post
title: "測定単位"
description: "数値型の型安全性"
nav: fsharp-types
seriesId: "F#の型を理解する"
seriesOrder: 11
---

以前の「[F#を使う理由](../posts/correctness-type-checking.html#units-of-measure)」シリーズで触れたように、F#には数値型にメタデータとして測定単位情報を加えられる、とても便利な機能があります。

F#コンパイラは、同じ測定単位を持つ数値だけを組み合わせられるようにします。これにより、誤った組み合わせを防ぎ、コードの安全性を高めます。

## 測定単位の定義

測定単位の定義は、 `[<Measure>]` 属性に続けて `type` キーワードと名前を指定します。

```fsharp
[<Measure>] 
type cm

[<Measure>] 
type inch
```

多くの場合、定義は 1 行で記述されます。

```fsharp
[<Measure>] type cm
[<Measure>] type inch
```

定義ができたら、数値型と測定単位を関連付けるには、山かっこ内に測定単位名を入れます。

```fsharp
let x = 1<cm>    // int
let y = 1.0<cm>  // float
let z = 1.0m<cm> // decimal 
```

山かっこ内で測定単位を組み合わせて、複合単位を作ることもできます。

```fsharp
[<Measure>] type m
[<Measure>] type sec
[<Measure>] type kg

let distance = 1.0<m>    
let time = 2.0<sec>    
let speed = 2.0<m/sec>    
let acceleration = 2.0<m/sec^2>    
let force = 5.0<kg m/sec^2>    
```

### 派生の測定単位

特定の単位の組み合わせをよく使う場合、*派生*の測定単位を定義して使えます。

```fsharp
[<Measure>] type N = kg m/sec^2

let force1 = 5.0<kg m/sec^2>    
let force2 = 5.0<N>

force1 = force2 // true
```

### SI単位と定数

物理学やその他の科学系アプリケーションで測定単位を使うなら、SI単位と関連する定数を利用したいでしょう。これらをすべて自分で定義する必要はありません。以下のように、あらかじめ定義されています。

* F# 4.1以降（Visual Studio 2017に同梱）では、これらはコアF#ライブラリの `FSharp.Data.UnitSystems.SI` 名前空間に組み込まれています（F# Core Library Documentationの[UnitNames](https://fsharp.github.io/fsharp-core-docs/reference/fsharp-data-unitsystems-si-unitnames.html)と[UnitSymbols](https://fsharp.github.io/fsharp-core-docs/reference/fsharp-data-unitsystems-si-unitsymbols.html)を参照）。
* F# 3.0（Visual Studio 2012に同梱）では、これらはコアF#ライブラリの `Microsoft.FSharp.Data.UnitSystems.SI` 名前空間に組み込まれています（GitHubの[MicrosoftDocs/visualfsharpdocs アーカイブ](https://github.com/MicrosoftDocs/visualfsharpdocs/blob/main/docs/conceptual/microsoft.fsharp.data.unitsystems.si-namespace-%5Bfsharp%5D.html)を参照）。
* F# 2.0（Visual Studio 2010に同梱）では、F# powerpackをインストールして入手する必要があります（F# powerpackは https://github.com/fsprojects-archive/zzarchive-powerpack にアーカイブされています）。


## 型チェックと型推論

測定単位は通常の型と同じように扱います。静的チェック*と*型推論の両方が行われます。

```fsharp
[<Measure>] type foot
[<Measure>] type inch

let distance = 3.0<foot>    

// 結果の型推論
let distance2 = distance * 2.0

// 入力と出力の型推論
let addThreeFeet ft = 
    ft + 3.0<foot>    
```

もちろん、使う時には厳密な型チェックが行われます。

```fsharp
addThreeFeet 1.0        // エラー
addThreeFeet 1.0<inch>  // エラー
addThreeFeet 1.0<foot>  // OK
```



### 型注釈

測定単位の型注釈を明示的に指定したい場合は、通常の方法で行えます。
数値型には山かっこで測定単位を付ける必要があります。

```fsharp
let untypedTimesThree (ft:float) = 
    ft * 3.0

let footTimesThree (ft:float<foot>) = 
    ft * 3.0
```

    
### 乗算と除算による測定単位の組み合わせ

コンパイラは、個々の値が乗算または除算されたとき、測定単位がどう変換されるかを理解します。
たとえば以下の例では、 `speed` 値には自動的に `<m/sec>` という測定単位が割り当てられます。

```fsharp
[<Measure>] type m
[<Measure>] type sec
[<Measure>] type kg

let distance = 1.0<m>    
let time = 2.0<sec>    
let speed = distance/time 
let acceleration = speed/time
let mass = 5.0<kg>    
let force = mass * speed/time
```

上記の `acceleration` と `force` の型を見ると、この仕組みの他の例を理解できるでしょう。


## 無次元の値

特定の測定単位を持たない数値は*無次元*と呼びます。値が無次元であることを明示したい場合は、 `1` という測定単位を使えます。

```fsharp
// 無次元
let x = 42

// これも無次元
let x = 42<1>
```

### 測定単位と無次元の値の混在

無次元の値を測定単位を持つ値に*足す*ことはできませんが、無次元の値を*掛けたり割ったり*することはできます。

```fsharp
// 加算のテスト
3.0<foot> + 2.0<foot>  // OK
3.0<foot> + 2.0        // エラー

// 乗算のテスト
3.0<foot> * 2.0        // OK   
```

ただし、ジェネリクスを使用した別の方法については、後述の「ジェネリックな測定単位」のセクションを参照してください。

## 単位間の変換

単位の変換が必要な場合はどうすればよいでしょうか。

簡単です。まず、*両方の*単位を使った変換値を定義し、次に元の値にその変換係数を掛けます。

フィートとインチの例を示します。

```fsharp
[<Measure>] type foot
[<Measure>] type inch

// 変換係数
let inchesPerFoot = 12.0<inch/foot>    

// テスト    
let distanceInFeet = 3.0<foot>    
let distanceInInches = distanceInFeet * inchesPerFoot 
```

そして、こちらは温度の例です。

```fsharp
[<Measure>] type degC
[<Measure>] type degF

let convertDegCToF c = 
    c * 1.8<degF/degC> + 32.0<degF>

// テスト    
let f = convertDegCToF 0.0<degC>    
```

コンパイラは変換関数のシグネチャを正しく推論しました。

```fsharp
val convertDegCToF : float<degC> -> float<degF>
```

定数 `32.0<degF>` に明示的に `degF` の注釈を付けたことで、結果も `degF` になります。この注釈を省くと、結果は単なるfloatになり、関数のシグネチャがかなり奇妙なものに変わってしまいます。試してみてください。

```fsharp
let badConvertDegCToF c = 
    c * 1.8<degF/degC> + 32.0
```

### 無次元の値と測定単位付きの値の間の変換

無次元の数値から測定単位付きの値に変換するには、単に1を掛けますが、その1には適切な単位の注釈を付けます。

```fsharp
[<Measure>] type foot

let ten = 10.0   // 通常の値

// 無次元から測定単位を持つ値への変換
let tenFeet = ten * 1.0<foot>  // 測定単位を持つ値
```

逆方向に変換するには、1で割るか、逆単位を掛けます。

```fsharp
// 測定単位を持つ値から無次元への変換
let tenAgain = tenFeet / 1.0<foot>  // 測定単位なし
let tenAnotherWay = tenFeet * 1.0<1/foot>  // 測定単位なし
```

上記の方法は型安全で、間違った型を変換しようとするとエラーが出ます。

型チェックが必要ない場合は、代わりに標準のキャスト関数を使って変換できます。

```fsharp
let tenFeet = 10.0<foot>  // 測定単位を持つ値
let tenDimensionless = float tenFeet // 測定単位なし
```

## ジェネリックな測定単位

多くの場合、測定単位に関係なく、どんな値でも扱える関数を書きたいものです。

たとえば、以下はおなじみの `square` 関数です。しかし、測定単位を持つ値で使おうとすると、エラーが出ます。

```fsharp
let square x = x * x

// テスト
square 10<foot>   // エラー
```

どうすればよいでしょうか。特定の測定単位を指定したくはありませんが、かといって上記の単純な定義では機能しません。

答えは、測定単位名が通常入る箇所にアンダースコアを使って、*ジェネリックな*測定単位を示すことです。

```fsharp
let square (x:int<_>) = x * x

// テスト
square 10<foot>   // OK
square 10<sec>    // OK
```

これで `square` 関数は望み通りに動きます。関数のシグネチャではジェネリックな測定単位を示すのに文字 `'u` が使われていることがわかります。
また、コンパイラが戻り値の型を「単位の2乗」と推論していることにも注目してください。

```fsharp
val square : int<'u> -> int<'u ^ 2>
```


実際、ジェネリックな型を指定するときに好きな文字を使うこともできます。

```fsharp
// アンダースコアを使う
let square (x:int<_>) = x * x

// 文字を使う
let square (x:int<'u>) = x * x

// アンダースコアを使う
let speed (distance:float<_>) (time:float<_>) = 
    distance / time

// 文字を使う
let speed (distance:float<'u>) (time:float<'v>) = 
    distance / time
```

単位が同じであることを明示的に示すために、文字を使う必要がある場合もあります。

```fsharp
let ratio (distance1:float<'u>) (distance2:float<'u>) = 
    distance1 / distance2
```


### リストでのジェネリックな測定単位の使用

測定単位を直接使えない場合があります。たとえば、フィートのリストを直接定義することはできません。

```fsharp
// エラー
[1.0<foot>..10.0<foot>]
```

代わりに、上で説明した「1を掛ける」トリックを使う必要があります。

```fsharp
// mapを使った変換 -- OK
[1.0..10.0] |> List.map (fun i -> i * 1.0<foot>)

// ジェネレータを使う -- OK
[ for i in [1.0..10.0] -> i * 1.0<foot> ]
```


### 定数でのジェネリックな測定単位の使用

定数との乗算は（上で見たように）OKですが、加算しようとするとエラーが出ます。

```fsharp
let x = 10<foot> + 1  // エラー
```

修正方法は、定数にジェネリックな型を加えることです。

```fsharp
let x = 10<foot> + 1<_>  // OK
```

同じような状況が、`fold`のような高階関数に定数を渡す際にも起こります。

```fsharp
let feet = [ for i in [1.0..10.0] -> i * 1.0<foot> ]

// OK
feet |> List.sum  

// エラー
feet |> List.fold (+) 0.0   

// ジェネリックな0を使って修正
feet |> List.fold (+) 0.0<_>  
```

### 関数でのジェネリックな測定単位の問題

いくつかのケースで型推論が失敗します。たとえば、測定単位を使った簡単な `add1` 関数を作ってみましょう。

```fsharp
// ジェネリックな関数を定義しようとする
let add1 n = n + 1.0<_>
// warning FS0064: このコンストラクトによって、
// コードの総称性は型の注釈よりも低くなります。
// 型変数 ''u' は型 ''1' に制約されました
 
// テスト
add1 10.0<foot>   
// error FS0001: error FS0001: この式に必要な型は 'float' ですが、
// ここでは次の型が指定されています 'float<foot>'
```

警告メッセージにヒントがあります。入力パラメータ `n` には測定単位がないため、 `1<_>` の測定単位が無視されます。`add1`関数には測定単位がなくなるので、測定単位を持つ値で呼び出そうとするとエラーが出ます。

では、測定単位の型を明示的に注釈することで解決できるでしょうか。

```fsharp
// 明示的な型注釈を持つ関数を定義
let add1 (n:float<'u>) : float<'u> =  n + 1.0<_>
```

しかし、同じ警告 FS0064 が再び表示されます。

アンダースコアを `1.0<'u>` のようなより明示的なものに置き換えてみましょうか？

```fsharp
let add1 (n:float<'u>) : float<'u> = n + 1.0<'u>  
// error FS0634: ゼロではない定数に汎用ユニットを含めることはできません。
```

今度はコンパイラエラーが出ました。

答えは、LanguagePrimitivesモジュールの便利なユーティリティ関数を使うことです。 `FloatWithMeasure` 、 `Int32WithMeasure` などです。

```fsharp
// 関数を定義
let add1 n  = 
    n + (LanguagePrimitives.FloatWithMeasure 1.0)

// テスト
add1 10.0<foot>   // やった！
```

ジェネリックな整数についても、同じアプローチを使えます。

```fsharp
open LanguagePrimitives

let add2Int n  = 
    n + (Int32WithMeasure 2)

add2Int 10<foot>   // OK
```

### 型定義でのジェネリックな測定単位の使用

これで関数の問題は解決しました。では、型定義で測定単位を使いたい場合はどうでしょうか。

たとえば、任意の測定単位で動作するジェネリックな座標レコードを定義したいとします。まずは、素朴なアプローチから始めましょう。

```fsharp
type Coord = 
    { X: float<'u>; Y: float<'u>; }
// error FS0039: 型パラメーター 'u が定義されていません。
```

これではうまくいきませんでした。では、測定単位を型パラメータとして追加してみましょう。

```fsharp
type Coord<'u> = 
    { X: float<'u>; Y: float<'u>; }
// error FS0702: 必要なのは型パラメーターではなく測定単位パラメーターです。
// 明示的な測定単位パラメーターは、[<Measure>] 属性でマークされている必要があります。
```

これもうまくいきませんでしたが、エラーメッセージが何をすべきかを教えてくれています。以下が最終的な正しいバージョンで、 `Measure` 属性を使っています。

```fsharp
type Coord<[<Measure>] 'u> = 
    { X: float<'u>; Y: float<'u>; }

// テスト
let coord = {X=10.0<foot>; Y=2.0<foot>}
```

場合によっては、複数の測定単位を定義する必要があるかもしれません。次の例では、通貨の換算レートは2つの通貨の比率として定義されているため、ジェネリックな測定単位を2つ定義する必要があります。
 
```fsharp
type CurrencyRate<[<Measure>]'u、[<Measure>]'v> = 
    { Rate: float<'u/'v>; Date: System.DateTime}

// テスト
[<Measure>] type EUR
[<Measure>] type USD
[<Measure>] type GBP

let mar1 = System.DateTime(2012,3,1)
let eurToUsdOnMar1 = {Rate= 1.2<USD/EUR>; Date=mar1 }
let eurToGbpOnMar1 = {Rate= 0.8<GBP/EUR>; Date=mar1 }

let tenEur = 10.0<EUR>
let tenEurInUsd = eurToUsdOnMar1.Rate * tenEur 
```

もちろん、通常のジェネリック型と測定単位の型を混ぜることもできます。

たとえば、製品価格はジェネリックな製品型と通貨付きの価格で構成されるかもしれません。

```fsharp
type ProductPrice<'product; [<Measure>] 'currency> = 
    { Product: 'product、Price: float<'currency>; }
```
    
### 実行時の測定単位

遭遇するかもしれない問題の1つは、測定単位が.NETの型システムの一部ではないということです。

F#はアセンブリに測定単位に関する追加のメタデータを格納しますが、このメタデータはF#でしか理解されません。

つまり、実行時に値がどの測定単位を持っているかを判断する（簡単な）方法も、実行時に動的に測定単位を割り当てる方法もありません。

また、測定単位をパブリックAPIの一部として他の.NET言語（F#アセンブリを除く）に公開する方法もありません。


