---
layout: post
title: "関数を構成要素として使用する"
description: "関数合成とミニ言語によってコードの可読性が向上する"
nav: why-use-fsharp
seriesId: "F# を使う理由"
seriesOrder: 11
categories: [Conciseness, Functions]
---

良い設計の有名な原則の1つは、基本的な操作のセットを作成し、これらの構成要素をさまざまな方法で組み合わせて、より複雑な動作を構築することです。オブジェクト指向言語では、この目標を達成するために「流れるようなインターフェース」、「ストラテジーパターン」、「デコレーターパターン」などの実装アプローチが生まれます。F#では、これらはすべて同じ方法、つまり関数合成を通じて行われます。

整数を使用した簡単な例から始めましょう。算術計算を行ういくつかの基本的な関数を作成したとします：

```fsharp
// 構成要素
let add2 x = x + 2
let mult3 x = x * 3
let square x = x * x

// テスト
[1..10] |> List.map add2 |> printfn "%A"
[1..10] |> List.map mult3 |> printfn "%A"
[1..10] |> List.map square |> printfn "%A" 
```

次に、これらを基に新しい関数を作成したいとします：

```fsharp
// 新しい合成関数
let add2ThenMult3 = add2 >> mult3
let mult3ThenSquare = mult3 >> square 
```

`>>` 演算子は合成演算子です。これは「最初の関数を実行し、次に2番目の関数を実行する」という意味です。

この関数の組み合わせ方がいかに簡潔かに注目してください。パラメータ、型、その他の無関係なノイズはありません。

もちろん、これらの例は以下のように、より明示的で冗長に書くこともできます：

```fsharp
let add2ThenMult3 x = mult3 (add2 x)
let mult3ThenSquare x = square (mult3 x) 
```

しかし、この明示的なスタイルは少し煩雑です：

* 明示的なスタイルでは、xパラメータと括弧を追加する必要がありますが、これらはコードの意味に何も加えません。
* また、明示的なスタイルでは、関数が適用される順序とは逆に書かれています。 `add2ThenMult3` の例では、最初に2を足してから掛けたいのです。 `add2 >> mult3` の構文は、 `mult3(add2 x)` よりも視覚的に明確です。

では、これらの合成をテストしてみましょう：

```fsharp
// テスト
add2ThenMult3 5
mult3ThenSquare 5
[1..10] |> List.map add2ThenMult3 |> printfn "%A"
[1..10] |> List.map mult3ThenSquare |> printfn "%A"
```

## 既存の関数の拡張

次に、これらの既存の関数にログ記録の動作を追加したいとします。これらも合成して、ログ記録が組み込まれた新しい関数を作ることができます。

```fsharp
// ヘルパー関数
let logMsg msg x = printf "%s%i" msg x; x     //改行なし 
let logMsgN msg x = printfn "%s%i" msg x; x   //改行あり

// 新しい合成関数（ログ機能が改善されています！）
let mult3ThenSquareLogged = 
   logMsg "before=" 
   >> mult3 
   >> logMsg " after mult3=" 
   >> square
   >> logMsgN " result=" 

// テスト
mult3ThenSquareLogged 5
[1..10] |> List.map mult3ThenSquareLogged //リスト全体に適用
```

新しい関数 `mult3ThenSquareLogged` は名前が少し醜いですが、使いやすく、その中に含まれる関数の複雑さをうまく隠しています。構成要素となる関数をうまく定義すれば、この関数の合成が新しい機能を得るための強力な方法になることがわかります。

でもちょっと待ってください、まだ続きがあるんです！F#では関数は第一級のエンティティであり、他のF#コードによって操作することができます。以下は、合成演算子を使用して関数のリストを単一の操作にまとめる例です。

```fsharp
let listOfFunctions = [
   mult3; 
   square;
   add2;
   logMsgN "result=";
   ]

// リスト内のすべての関数を単一の関数に合成
let allFunctions = List.reduce (>>) listOfFunctions 

//テスト
allFunctions 5
```

## ミニ言語

ドメイン特化言語（DSL）は、より読みやすく簡潔なコードを作成するための技術として広く認識されています。関数型アプローチはこれに非常に適しています。

必要に応じて、独自の字句解析器、構文解析器などを持つ完全な「外部」DSLを作成することもでき、F#にはこれを非常に簡単にするさまざまなツールセットがあります。

しかし多くの場合、F#の構文内にとどまり、必要な動作をカプセル化する「動詞」と「名詞」のセットを設計するだけで十分です。

新しい型を簡潔に作成し、それに対してマッチングを行う能力により、流れるようなインターフェースを素早く設定することが非常に簡単になります。例えば、以下は単純な語彙を使用して日付を計算する小さな関数です。この1つの関数のために、2つの新しい列挙型スタイルの型が定義されていることに注目してください。

```fsharp
// 語彙を設定
type DateScale = Hour | Hours | Day | Days | Week | Weeks
type DateDirection = Ago | Hence

// 語彙に基づいてマッチングを行う関数を定義
let getDate interval scale direction =
    let absHours = match scale with
                   | Hour | Hours -> 1 * interval
                   | Day | Days -> 24 * interval
                   | Week | Weeks -> 24 * 7 * interval
    let signedHours = match direction with
                      | Ago -> -1 * absHours 
                      | Hence ->  absHours 
    System.DateTime.Now.AddHours(float signedHours)

// いくつかの例をテスト
let example1 = getDate 5 Days Ago
let example2 = getDate 1 Hour Hence

// C#の同等のコードは、おそらく以下のようになるでしょう：
// getDate().Interval(5).Days().Ago()
// getDate().Interval(1).Hour().Hence()
```

上の例では、「名詞」に多くの型を使用していますが、「動詞」は1つだけです。

次の例では、多くの「動詞」を持つ流れるようなインターフェースの関数型の等価物を構築する方法を示します。

描画プログラムを作成していて、さまざまな形状があるとします。各形状には色、サイズ、ラベル、クリック時に実行されるアクションがあり、各形状を設定するための流れるようなインターフェースが欲しいとします。

以下は、C#での流れるようなインターフェースの単純なメソッドチェーンの例です：

```fsharp
FluentShape.Default
   .SetColor("red")
   .SetLabel("box")
   .OnClick( s => Console.Write("clicked") );
```

「流れるようなインターフェース」と「メソッドチェーン」の概念は、実際にはオブジェクト指向設計にのみ関連します。F#のような関数型言語では、最も近い等価物は、パイプライン演算子を使用して一連の関数を連鎖させることです。

まず、基礎となるShape型から始めましょう：

```fsharp
// 基礎となる型を作成
type FluentShape = {
    label : string; 
    color : string; 
    onClick : FluentShape->FluentShape // 関数型
    }
```
	
いくつかの基本的な関数を追加します：

```fsharp
let defaultShape = 
    {label=""; color=""; onClick=fun shape->shape}

let click shape = 
    shape.onClick shape

let display shape = 
    printfn "My label=%s and my color=%s" shape.label shape.color
    shape   //同じ形状を返す
```

「メソッドチェーン」が機能するためには、すべての関数がチェーンの次で使用できるオブジェクトを返す必要があります。そのため、`display`関数が何も返さずに形状を返しているのがわかります。

次に、「ミニ言語」として公開し、言語のユーザーが構成要素として使用するヘルパー関数を作成します。

```fsharp
let setLabel label shape = 
   {shape with FluentShape.label = label}

let setColor color shape = 
   {shape with FluentShape.color = color}

//既存のものにクリックアクションを追加
let appendClickAction action shape = 
   {shape with FluentShape.onClick = shape.onClick >> action}
```

`appendClickAction` が関数をパラメータとして受け取り、それを既存のクリックアクションと合成していることに注目してください。関数型アプローチによる再利用をより深く理解し始めると、このような「高階関数」、つまり他の関数に作用する関数をより多く目にするようになります。このように関数を組み合わせることは、関数型プログラミングの方法を理解するための鍵の1つです。

さて、この「ミニ言語」のユーザーとして、基本的なヘルパー関数をより複雑な関数に合成し、独自の関数ライブラリを作成することができます。（C#では、このような操作は拡張メソッドを使用して行われるかもしれません。）

```fsharp
// 2つの「基本」関数を合成して複合関数を作成
let setRedBox = setColor "red" >> setLabel "box" 

// 前の関数と合成して別の関数を作成
// 色の値を上書きしますが、ラベルはそのままです
let setBlueBox = setRedBox >> setColor "blue"  

// appendClickActionの特殊なケースを作成
let changeColorOnClick color = appendClickAction (setColor color)   
```

これらの関数を組み合わせて、望みの動作を持つオブジェクトを作成できます。

```fsharp
//テスト用の値を設定
let redBox = defaultShape |> setRedBox
let blueBox = defaultShape |> setBlueBox 

// クリック時に色が変わる形状を作成
redBox 
    |> display
    |> changeColorOnClick "green"
    |> click
    |> display  // クリック後の新バージョン

// クリック時にラベルと色が変わる形状を作成
blueBox 
    |> display
    |> appendClickAction (setLabel "box2" >> setColor "green")  
    |> click
    |> display  // クリック後の新バージョン
```

2番目の場合、実際には2つの関数を `appendClickAction` に渡していますが、まず最初にそれらを1つに合成しています。このような操作は、適切に構造化された関数型ライブラリでは簡単にできますが、C#ではラムダ式の中にラムダ式を入れるなどしないと難しいです。

ここでもっと複雑な例を示します。虹の各色について、色を設定し形状を表示する `showRainbow` 関数を作成します。

```fsharp
let rainbow =
    ["red";"orange";"yellow";"green";"blue";"indigo";"violet"]

let showRainbow = 
    let setColorAndDisplay color = setColor color >> display 
    rainbow 
    |> List.map setColorAndDisplay 
    |> List.reduce (>>)

// showRainbow関数をテスト
defaultShape |> showRainbow 
```

関数がより複雑になっていますが、コードの量はまだかなり少ないことに注目してください。その理由の1つは、関数合成を行う際に関数のパラメータを無視できることが多く、視覚的な煩雑さが減るためです。例えば、 `showRainbow` 関数は確かに形状をパラメータとして受け取りますが、それは明示的に表示されていません！このパラメータの省略は「ポイントフリー」スタイルと呼ばれます。「[関数型思考](../series/thinking-functionally.md)」シリーズでさらに詳しく説明します。
