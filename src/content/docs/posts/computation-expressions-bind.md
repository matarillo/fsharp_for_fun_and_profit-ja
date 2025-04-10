---
layout: post
title: "'bind'の紹介"
description: "独自の'let!'を作るための段階"
nav: thinking-functionally
seriesId: "コンピュテーション式"
seriesOrder: 3
---

前回の投稿では、`let`を裏で継続を行うための便利な構文として考える方法について説明しました。
また、継続のパイプラインにフックを追加できる`pipeInto`関数を紹介しました。

これで、最初のビルダーメソッド`Bind`を見る準備が整いました。このメソッドはこのアプローチを形式化し、あらゆるコンピュテーション式の核心となります。

### "Bind"の紹介

[コンピュテーション式に関するMicrosoft Learnのページ](https://learn.microsoft.com/ja-jp/dotnet/fsharp/language-reference/computation-expressions)では、`let!`式を`Bind`メソッドの糖衣構文として説明しています。もう一度見てみましょう。

`let!`式のドキュメントと実例です。

```fsharp
// ドキュメント
{| let! pattern = expr in cexpr |}

// 実例
let! x = 43 in 何らかの式
```

そして`Bind`メソッドのドキュメントと実例です。

```fsharp
// ドキュメント
builder.Bind(expr, (fun pattern -> {| cexpr |}))

// 実例
builder.Bind(43, (fun x -> 何らかの式))
```

これについて興味深い点がいくつかあります。

* `Bind`は2つのパラメータ、式（`43`）とラムダを取ります。
* ラムダのパラメータ（`x`）は、最初のパラメータとして渡された式に束縛されます（少なくともこの場合は。後でもっと詳しく説明します）。
* `Bind`のパラメータは`let!`での順序と逆になっています。

つまり、複数の`let!`式をこのようにつなげると、

```fsharp
let! x = 1
let! y = 2
let! z = x + y
```

コンパイラはこれを`Bind`の呼び出しに変換します。

```fsharp
Bind(1, fun x ->
Bind(2, fun y ->
Bind(x + y, fun z ->
など
```

何をしようとしているのか。もうお分かりだと思います。

`pipeInto`関数は`Bind`メソッドとまったく同じです。

これは重要な洞察です。つまり、*コンピュテーション式は自分たちでできることに対して、きれいな構文を作る方法に過ぎません*。

### スタンドアロンのbind関数

このような"bind"関数は実際、標準的な関数型パターンであり、コンピュテーション式に依存しません。

まず、なぜ"bind"と呼ばれるのでしょうか？これまで見てきたように、"bind"関数やメソッドは、入力値を関数に与えると考えることができます。これは関数のパラメータに値を"[束縛する](../posts/function-values-and-simple-values.html)"として知られています（すべての関数は[1つのパラメータ](../posts/currying.html)だけを持つことを思い出してください）。

このように`bind`を考えると、パイプや合成に似ていることがわかります。

実際、次のように中置演算子にすることもできます。

```fsharp
let (>>=) m f = pipeInto(m,f)
```

*ちなみに、この記号">>="はbindを中置演算子として書く標準的な方法です。他のF#コードでこの記号を見かけたら、おそらくこれを表しています。*

安全な除算の例に戻ると、ワークフローを1行で次のように書けます。

```fsharp
let divideByWorkflow x y w z = 
    x |> divideBy y >>= divideBy w >>= divideBy z 
```

これが通常のパイプや合成とどう違うのか、疑問に思うかもしれません。一見すると明らかではありません。

答えは2つあります。

* 第一に、`bind`関数は各状況に合わせた*追加の*カスタマイズされた動作を持ちます。パイプや合成のような汎用的な関数ではありません。

* 第二に、値パラメータ（上記の`m`）の入力型は、必ずしも関数パラメータ（上記の`f`）の出力型と同じではありません。bindはこの不一致を上手く処理し、関数をつなげられるようにします。

次の投稿で見るように、bindは一般に何らかの"ラッパー"型と連携します。値パラメータの型は`WrapperType<TypeA>`かもしれませんが、bind関数の関数パラメータの型は常に`TypeA -> WrapperType<TypeB>`です。

安全な除算のbindの場合、ラッパー型は`Option`です。値パラメータ（上記の`m`）の型は`Option<int>`で、関数パラメータ（上記の`f`）の型は`int -> Option<int>`です。

bindを別の文脈で使用する例として、中置bind関数を使ったログ記録ワークフローを示します。

```fsharp
let (>>=) m f = 
    printfn "式は %A" m
    f m

let loggingWorkflow = 
    1 >>= (+) 2 >>= (*) 42 >>= id
```

この場合、ラッパー型はありません。すべて`int`です。しかし、bindには裏で記録を行う特殊な動作があります。

## Option.bindと"maybe"ワークフローの再考

F#ライブラリでは、多くの場所で`Bind`関数やメソッドを見かけるでしょう。今や、それらの目的がわかるはずです。

特に便利なのは`Option.bind`で、これは先ほど手作業で書いたものとまったく同じことをします。つまり、

* 入力パラメータが`None`の場合、継続関数を呼び出しません。
* 入力パラメータが`Some`の場合、継続関数を呼び出し、`Some`の中身を渡します。

これが私たちの手作りの関数です。

```fsharp
let pipeInto (m,f) =
   match m with
   | None -> 
       None
   | Some x -> 
       x |> f
```

そして、これが`Option.bind`の実装です。

```fsharp
module Option = 
    let bind f m =
       match m with
       | None -> 
           None
       | Some x -> 
           x |> f 
```

この話から得られる教訓は、安易に独自の関数を作らないということです。ライブラリ関数を再利用できるかもしれません。

以下は`Option.bind`を使って書き直した"maybe"ワークフローです。

```fsharp
type MaybeBuilder() =
    member this.Bind(m, f) = Option.bind f m
    member this.Return(x) = Some x
```


## これまでの異なるアプローチの振り返り

「安全な除算」の例に対して、これまで4つの異なるアプローチを使ってきました。もう一度並べて比較してみましょう。

*注意：元の`pipeInto`関数を`bind`に名前変更し、オリジналのカスタム実装の代わりに`Option.bind`を使っています。*

まず、明示的なワークフローを使った元のバージョンです。

```fsharp
module DivideByExplicit = 

    let divideBy bottom top =
        if bottom = 0
        then None
        else Some(top/bottom)

    let divideByWorkflow x y w z = 
        let a = x |> divideBy y 
        match a with
        | None -> None  // 諦める
        | Some a' ->    // 続ける
            let b = a' |> divideBy w
            match b with
            | None -> None  // 諦める
            | Some b' ->    // 続ける
                let c = b' |> divideBy z
                match c with
                | None -> None  // 諦める
                | Some c' ->    // 続ける
                    //戻り値
                    Some c'
    // テスト
    let good = divideByWorkflow 12 3 2 1
    let bad = divideByWorkflow 12 3 0 1
```

次に、独自バージョンの"bind"（別名"pipeInto"）を使ったものです。

```fsharp
module DivideByWithBindFunction = 

    let divideBy bottom top =
        if bottom = 0
        then None
        else Some(top/bottom)

    let bind (m,f) =
        Option.bind f m

    let return' x = Some x
       
    let divideByWorkflow x y w z = 
        bind (x |> divideBy y, fun a ->
        bind (a |> divideBy w, fun b ->
        bind (b |> divideBy z, fun c ->
        return' c 
        )))

    // テスト
    let good = divideByWorkflow 12 3 2 1
    let bad = divideByWorkflow 12 3 0 1
```

次に、コンピュテーション式を使ったものです。

```fsharp
module DivideByWithCompExpr = 

    let divideBy bottom top =
        if bottom = 0
        then None
        else Some(top/bottom)

    type MaybeBuilder() =
        member this.Bind(m, f) = Option.bind f m
        member this.Return(x) = Some x

    let maybe = new MaybeBuilder()

    let divideByWorkflow x y w z = 
        maybe 
            {
            let! a = x |> divideBy y 
            let! b = a |> divideBy w
            let! c = b |> divideBy z
            return c
            }    

    // テスト
    let good = divideByWorkflow 12 3 2 1
    let bad = divideByWorkflow 12 3 0 1
```

最後に、bindを中置演算子として使ったものです。

```fsharp
module DivideByWithBindOperator = 

    let divideBy bottom top =
        if bottom = 0
        then None
        else Some(top/bottom)

    let (>>=) m f = Option.bind f m

    let divideByWorkflow x y w z = 
        x |> divideBy y 
        >>= divideBy w 
        >>= divideBy z 

    // テスト
    let good = divideByWorkflow 12 3 2 1
    let bad = divideByWorkflow 12 3 0 1
```

bind関数は非常に強力だとわかります。次の投稿では、`bind`をラッパー型と組み合わせることで、背景で追加情報を渡す優雅な方法が作れることを見ていきます。

## 練習問題：どれくらい理解できましたか？

次の投稿に進む前に、ここまでの内容をすべて理解できたかどうか、自分でテストしてみませんか？

ここに小さな練習問題があります。

**パート1 - ワークフローの作成** 

まず、文字列をintに変換する関数を作ります。

```fsharp
let strToInt str = ???
```

そして、独自のコンピュテーション式ビルダークラスを作成し、以下のようにワークフローで使えるようにします。

```fsharp
let stringAddWorkflow x y z = 
    yourWorkflow 
        {
        let! a = strToInt x
        let! b = strToInt y
        let! c = strToInt z
        return a + b + c
        }    

// テスト
let good = stringAddWorkflow "12" "3" "2"
let bad = stringAddWorkflow "12" "xyz" "2"
```

**パート2 ―― bind関数の作成** 

パート1が完成したら、アイデアを拡張して2つの関数を追加します。

```fsharp
let strAdd str i = ???
let (>>=) m f = ???
```

これらの関数を使えば、次のようなコードが書けるはずです。

```fsharp
let good = strToInt "1" >>= strAdd "2" >>= strAdd "3"
let bad = strToInt "1" >>= strAdd "xyz" >>= strAdd "3"
```


## まとめ

この投稿で触れた要点をまとめます。

* コンピュテーション式は継続渡しのための便利な構文を提供し、連鎖のロジックを隠してくれます。
* `bind`は1つのステップの出力を次のステップの入力につなぐ鍵となる関数です。
* 記号`>>=`はbindを中置演算子として書く標準的な方法です。
