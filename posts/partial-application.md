---
layout: post
title: "部分適用"
description: "関数のパラメータの一部を固定する"
nav: thinking-functionally
seriesId: "関数型思考"
seriesOrder: 6
categories: [カリー化, 部分適用]
---


前回のカリー化に関する投稿では、複数のパラメータを持つ関数を小さな一つのパラメータを持つ関数に分解することを見ました。この方法は数学的に正しいだけでなく、**部分関数適用**と呼ばれる非常に強力な技術にもつながります。部分関数適用は関数型プログラミングで広く使われており、理解することが重要です。

部分適用の考え方は次のようなものです。関数の最初のいくつかのパラメータを固定すると、残りのパラメータに対する新しい関数が得られます。カリー化について学んだことを踏まえれば、この部分適用がどのように自然に生じるかが理解できるでしょう。

以下に、部分適用を示す簡単な例をいくつか挙げます。

```fsharp
// 部分適用によって"加算器"を作成
let add42 = (+) 42    // 部分適用
add42 1
add42 3

// add42関数を各要素に適用して新しいリストを作成
[1;2;3] |> List.map add42 

// "未満"の部分適用によって"テスター"を作成
let twoIsLessThan = (<) 2   // 部分適用
twoIsLessThan 1
twoIsLessThan 3

// twoIsLessThan関数で各要素をフィルタリング
[1;2;3] |> List.filter twoIsLessThan 

// printfnの部分適用によって"プリンター"を作成
let printer = printfn "printing param=%i" 

// 各要素をループしてprinter関数を呼び出す
[1;2;3] |> List.iter printer   
```

これらの例では、それぞれ部分適用された関数を作成し、その関数を複数の場面で再利用しています。

部分適用は、関数パラメータを固定するのにも同様に簡単に使えます。以下に例を示します。

```fsharp
// List.mapを使用する例
let add1 = (+) 1
let add1ToEach = List.map add1   // "add1"関数を固定

// テスト
add1ToEach [1;2;3;4]

// List.filterを使用する例
let filterEvens = 
   List.filter (fun i -> i%2 = 0) // フィルター関数を固定

// テスト
filterEvens [1;2;3;4]
```

次の、より複雑な例を見てみましょう。この例では、同じアプローチを使って透過的な「プラグイン」動作を作成する方法を示します。

* 2つの数字を足す関数を作成します。この関数は、2つの数字と結果をログに記録するロギング関数も受け取ります。
* ロギング関数は2つのパラメータを持ちます。（文字列の） `name` と（ジェネリックな） `value` です。したがって、シグネチャは `string->'a->unit` となります。
* 次に、ロギング関数のさまざまな実装を作成します。例えば、コンソールロガーやポップアップロガーなどです。
* 最後に、メイン関数を部分適用して、特定のロガーが組み込まれた新しい関数を作成します。

```fsharp
// プラガブルなロギング関数をサポートする加算器を作成
let adderWithPluggableLogger logger x y = 
    logger "x" x
    logger "y" y
    let result = x + y
    logger "x+y"  result 
    result 

// コンソールに書き込むロギング関数を作成
let consoleLogger argName argValue = 
    printfn "%s=%A" argName argValue 

// コンソールロガーを部分適用した加算器を作成
let addWithConsoleLogger = adderWithPluggableLogger consoleLogger 
addWithConsoleLogger  1 2 
addWithConsoleLogger  42 99

// ポップアップウィンドウを作成するロギング関数を作成
let popupLogger argName argValue = 
    let message = sprintf "%s=%A" argName argValue 
    System.Windows.Forms.MessageBox.Show(
                                 text=message,caption="Logger") 
      |> ignore

// ポップアップロガーを部分適用した加算器を作成
let addWithPopupLogger  = adderWithPluggableLogger popupLogger 
addWithPopupLogger  1 2 
addWithPopupLogger  42 99
```

ロガーが組み込まれたこれらの関数は、他の関数と同じように使用できます。例えば、42を加算する部分適用を作成し、それをリスト関数に渡すことができます。これは先ほどの単純な `add42` 関数と同じように行えます。

```fsharp
// 42が組み込まれた別の加算器を作成
let add42WithConsoleLogger = addWithConsoleLogger 42 
[1;2;3] |> List.map add42WithConsoleLogger  
[1;2;3] |> List.map add42               // ロガーなしの場合と比較 
```

これらの部分適用された関数は非常に便利なツールです。柔軟性がある（しかし複雑な）ライブラリ関数を作成できると同時に、再利用可能なデフォルトを簡単に作成できます。そのため、関数を呼び出す側が常に複雑さに直面する必要がなくなります。

## 部分適用のための関数設計

パラメータの順序が部分適用の使いやすさに大きな違いをもたらすことがお分かりいただけたと思います。例えば、`List` ライブラリの `List.map` や `List.filter` など、ほとんどの関数は以下のような形式を持っています。

    List-関数 [関数パラメータ] [リスト]

このパターンでは、リストは常に最後のパラメータになります。以下に完全な形式の例をいくつか示します。

```fsharp
List.map    (fun i -> i+1) [0;1;2;3]
List.filter (fun i -> i>1) [0;1;2;3]
List.sortBy (fun i -> -i ) [0;1;2;3]
```

同じ例を部分適用を使用して書くと、次のようになります。

```fsharp
let eachAdd1 = List.map (fun i -> i+1) 
eachAdd1 [0;1;2;3]

let excludeOneOrLess = List.filter (fun i -> i>1) 
excludeOneOrLess [0;1;2;3]

let sortDesc = List.sortBy (fun i -> -i) 
sortDesc [0;1;2;3]
```

もしライブラリ関数のパラメータの順序が異なっていたら、部分適用での使用がはるかに不便になっていたでしょう。

自分で複数のパラメータを持つ関数を書く際、最適なパラメータの順序は何かと疑問に思うかもしれません。すべての設計上の問題と同様、この質問に対する「正しい」答えはありません。しかし、一般的に受け入れられているガイドラインがいくつかあります。

1. より静的である可能性が高いパラメータを先に置く
2. データ構造やコレクション（または最も変化するであろう引数）を最後に置く
3. 「減算」のような一般的な操作については、予想される順序で配置する

ガイドライン1は分かりやすいでしょう。部分適用で「固定」される可能性が最も高いパラメータを最初に置くべきです。先ほどのロガーの例でこれを見ました。

ガイドライン2は、構造やコレクションを関数から関数へとパイプで渡すのを容易にします。リスト関数でこれをすでに何度も見てきました。

```fsharp
// リスト関数を使用したパイピング
let result = 
   [1..10]
   |> List.map (fun i -> i+1)
   |> List.filter (fun i -> i>5)
```

同様に、部分適用されたリスト関数は簡単に合成できます。リストパラメータ自体を簡単に省略できるからです。

```fsharp
let compositeOp = List.map (fun i -> i+1) 
                  >> List.filter (fun i -> i>5)
let result = compositeOp [1..10]
```

### 部分適用のためのBCL関数のラッピング

.NET基本クラスライブラリ（BCL）の関数はF#で簡単に使えますが、F#のような関数型言語での使用を想定して設計されているわけではありません。例えば、BCLの関数ではデータパラメータが最初に来ることが多いですが、F#では先ほど見たように、通常データパラメータが最後に来るべきです。

しかし、これらの関数をF#の慣用的なスタイルに合わせるラッパーを作るのは簡単です。以下の例では、.NETの文字列関数を書き直しています。文字列ターゲットを最初ではなく最後のパラメータにしています。

```fsharp
// .NET文字列関数のラッパーを作成
let replace oldStr newStr (s:string) = 
  s.Replace(oldValue=oldStr, newValue=newStr)

let startsWith lookFor (s:string) = 
  s.StartsWith(lookFor)
```

文字列が最後のパラメータになったことで、これらの関数を期待通りにパイプで使えるようになります。

```fsharp
let result = 
     "hello" 
     |> replace "h" "j" 
     |> startsWith "j"

["the"; "quick"; "brown"; "fox"] 
     |> List.filter (startsWith "f")
```

また、関数合成でも使えます。

```fsharp
let compositeOp = replace "h" "j" >> startsWith "j"
let result = compositeOp "hello"
```

### 「パイプ」関数の理解

部分適用の仕組みを理解したところで、「パイプ」関数がどのように動作するかが分かるはずです。

パイプ関数は以下のように定義されています。

```fsharp
let (|>) x f = f x
```

この関数が行うのは、関数の引数を関数の後ろではなく前に置けるようにすることだけです。それだけのことです。

```fsharp
let doSomething x y z = x+y+z
doSomething 1 2 3       // すべてのパラメータが関数の後ろにある
```

関数が複数のパラメータを持つ場合、入力が最後のパラメータであるように見えます。実際には、関数が部分適用され、単一のパラメータ（入力）を持つ新しい関数が返されているのです。

同じ例を部分適用を使って書き直すと次のようになります。

```fsharp
let doSomething x y  = 
   let intermediateFn z = x+y+z
   intermediateFn        // intermediateFnを返す

let doSomethingPartial = doSomething 1 2
doSomethingPartial 3     // 関数の後ろにパラメータは1つだけになった
3 |> doSomethingPartial  // 上と同じ - 最後のパラメータがパイプで渡される
```

これまで見てきたように、パイプ演算子はF#で非常によく使われます。自然な処理の流れを保つために頻繁に使用されます。以下にさらにいくつかの使用例を示します。

```fsharp
"12" |> int               // 文字列 "12" を整数にパースする
1 |> (+) 2 |> (*) 3       // 算術演算の連鎖
```

### 逆パイプ関数

逆パイプ関数 `<|` を見かけることがあるかもしれません。この関数は次のように定義されています。

```fsharp
let (<|) f x = f x
```

一見すると、この関数は通常の関数呼び出しと変わりません。では、なぜこの関数が存在するのでしょうか？

その理由は、逆パイプ関数を中置演算子として使うことで、かっこの必要性が減り、コードをよりクリーンに書けるからです。以下の例を見てみましょう。

```fsharp
printf "%i" 1+2          // エラー
printf "%i" (1+2)        // かっこを使用
printf "%i" <| 1+2       // 逆パイプを使用
```

さらに、パイプを両方向から使うと、疑似的な中置記法を得ることもできます。次の例をご覧ください。

```fsharp
let add x y = x + y
(1+2) add (3+4)          // エラー
1+2 |> add <| 3+4        // 疑似中置記法
```
