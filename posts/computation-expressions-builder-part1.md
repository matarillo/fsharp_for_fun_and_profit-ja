---
layout: post
title: "ビルダーの実装：ZeroとYield"
description: "基本的なビルダーメソッドの入門"
nav: thinking-functionally
seriesId: "コンピュテーション式"
seriesOrder: 6
---

bindと継続、そしてラッパー型の使用について説明したので、ついに「ビルダー」クラスに関連する全メソッドセットに取り組む準備が整いました。

[Microsoft Learnのドキュメント](https://learn.microsoft.com/ja-jp/dotnet/fsharp/language-reference/computation-expressions)を見ると、`Bind`と`Return`だけでなく、`Delay`や`Zero`などの奇妙な名前のメソッドもあります。これらは何のためにあるのでしょうか。この記事と次の数回の記事で答えを見つけていきます。

## 行動計画

ビルダークラスの作成方法を示すため、可能な限り多くのビルダーメソッドを使用するカスタムワークフローを作成します。

しかし、上から始めて文脈なしにこれらのメソッドの意味を説明しようとするのではなく、下から上へと進めます。簡単なワークフローから始め、問題や誤りを解決するために必要な場合にのみメソッドを追加していきます。この過程で、F#がコンピュテーション式を詳細にどのように処理するかを理解できるでしょう。

このプロセスの概要は以下の通りです。

* パート1：この最初の部分では、基本的なワークフローに必要なメソッドを見ていきます。`Zero`、`Yield`、`Combine`、`For`を紹介します。
* パート2：次に、コードの実行を遅延させ、必要な時にのみ評価する方法を見ていきます。`Delay`と`Run`を紹介し、遅延コンピュテーションについて検討します。
* パート3：最後に、残りのメソッド：`While`、`Using`、例外処理をカバーします。

## 始める前に

ワークフローの作成に飛び込む前に、いくつかの一般的な注意点があります。

### コンピュテーション式のドキュメント

まず、お気づきかもしれませんが、コンピュテーション式に関するMicrosoft Learnのドキュメントは極めて乏しく、不正確ではないものの、誤解を招く可能性があります。例えば、ビルダーメソッドのシグネチャは、記載されているよりも*より*柔軟です。これを利用して、ドキュメントだけでは明らかでない機能を実装できます。後ほど例を示します。

より詳細なドキュメントが必要な場合、2つのソースをお勧めします。コンピュテーション式の背後にある概念の詳細な概要については、[Tomas PetricekとDon Symeによる「The F# Expression Zoo」論文](https://tomasp.net/academic/papers/computation-zoo/computation-zoo.pdf)が優れたリソースです。最新の正確な技術ドキュメントについては、[F#言語仕様](https://fsharp.org/specs/language-spec/)を読むべきです。コンピュテーション式に関するセクションがあります。

### ラップされた型とラップされていない型

ドキュメントに記載されているシグネチャを理解しようとする際、私が「ラップされていない」型と呼んでいるものは通常`'T`と書かれ、「ラップされた」型は通常`M<'T>`と書かれていることを覚えておいてください。つまり、`Return`メソッドのシグネチャが`'T -> M<'T>`と記載されている場合、`Return`はラップされていない型を受け取り、ラップされた型を返すということです。

このシリーズの以前の投稿と同様に、これらの型の関係を説明するために「ラップされていない」と「ラップされた」という用語を引き続き使用しますが、進めていく中でこれらの用語は限界に達するでしょう。そのため、「ラップされた型」の代わりに「コンピュテーション型」などの他の用語も使い始めます。この時点に達したら、変更の理由が明確で理解できるものと期待しています。

また、例では一般的に以下のようなシンプルなコードを使用するよう心がけます。

<pre>
let! x = ...ラップされた型の値...
</pre>

しかし、これは実際には単純化しすぎています。正確には、「x」は単一の値ではなく任意の*パターン*であり、「ラップされた型」の値は当然、ラップされた型に評価される*式*です。
Microsoft Learnのドキュメントはこのより正確なアプローチを使用しています。
定義では「パターン」と「式」を使用し、`let! pattern = expr in cexpr`のような形式になっています。

以下は、`Option`がラップされた型で、
右辺の式が`option`である`maybe`コンピュテーション式でパターンと式を使用する例です。

```fsharp
// let! pattern = expr in cexpr
maybe {
    let! x,y = Some(1,2) 
    let! head::tail = Some( [1;2;3] )
    // 以下省略
    }
```

とはいえ、すでに複雑なトピックにさらなる複雑さを加えないよう、引き続き単純化した例を使用します。

### ビルダークラスで特別なメソッドを実装する（あるいはしない）

Microsoft Learnのドキュメントでは、各特殊操作（`for..in`や`yield`など）がビルダークラスのメソッドの1つ以上の呼び出しに変換されることが示されています。

必ずしも1対1の対応関係はありませんが、一般的に特殊操作の構文をサポートするには、ビルダークラスに対応するメソッドを実装*しなければなりません*。そうしないとコンパイラが苦情を言ってエラーを出します。

一方で、構文が不要な場合は、すべてのメソッドを実装する*必要はありません*。例えば、すでに`Bind`と`Return`の2つのメソッドだけを実装することで`maybe`ワークフローをうまく実装しました。使用する必要がない場合は、`Delay`、`Use`などを実装する必要はありません。

メソッドを実装していない場合にどうなるかを見るために、`maybe`ワークフローで`for..in..do`構文を使用してみましょう。

```fsharp
maybe { for i in [1;2;3] do i }
```

次のようなコンパイラエラーが発生します。

```text
This control construct may only be used if the computation expression builder defines a 'For' method
```

時には、舞台裏で何が起こっているかを知らないと、理解しづらいエラーが発生することがあります。
例えば、ワークフローで`return`を忘れた場合、次のようになります。

```fsharp
maybe { 1 }
```

次のようなコンパイラエラーが発生します。

```text
This control construct may only be used if the computation expression builder defines a 'Zero' method
```

`Zero`メソッドとは何か、そしてなぜ必要なのかと疑問に思うかもしれません。その答えはすぐ後に出てきます。

### '!'のある操作とない操作

明らかに、多くの特殊操作には「!」記号の有無によるペアがあります。例えば、`let`と`let!`（「レットバン」と発音）、`return`と`return!`、`yield`と`yield!`などです。

違いは、「!」*のない*操作は右辺に常に*ラップされていない*型があり、「!」*のある*操作は常に*ラップされた*型があることを理解すれば簡単に覚えられます。

例えば、`Option`がラップされた型である`maybe`ワークフローを使用して、異なる構文を比較できます。

```fsharp
let x = 1           // 1は「ラップされていない」型
let! x = (Some 1)   // Some 1は「ラップされた」型
return 1            // 1は「ラップされていない」型
return! (Some 1)    // Some 1は「ラップされた」型
yield 1             // 1は「ラップされていない」型
yield! (Some 1)     // Some 1は「ラップされた」型
```

「!」バージョンは特に合成に重要です。ラップされた型が同じ型の*別の*コンピュテーション式の結果になる可能性があるためです。

```fsharp
let! x = maybe {...)       // "maybe"は「ラップされた」型を返す

// let!を使用して同じ型の別のワークフローをバインドする
let! aMaybe = maybe {...)  // 「ラップされた」型を作成
return! aMaybe             // それを返す

// let!を使用して親asyncの中で2つの子asyncをバインドする
let processUri uri = async {
    let! html = webClient.AsyncDownloadString(uri)
    let! links = extractLinks html
    ... 以下省略 ...
    }
```

## 実践 - ワークフローの最小実装の作成

さあ、始めましょう！まず、「maybe」ワークフロー（「trace」に名前を変更します）の最小バージョンを作成し、すべてのメソッドに処理内容を出力する機能を追加して、何が起こっているかを確認できるようにします。これをこの記事全体を通じてテストベッドとして使用します。

以下が`trace`ワークフローの最初のバージョンのコードです。

```fsharp
type TraceBuilder() =
    member this.Bind(m, f) = 
        match m with 
        | None -> 
            printfn "Noneとバインド中。終了します。"
        | Some a -> 
            printfn "Some(%A)とバインド中。続行します" a
        Option.bind f m

    member this.Return(x) = 
        printfn "ラップされていない%Aをオプションとして返します" x
        Some x

    member this.ReturnFrom(m) = 
        printfn "オプション(%A)を直接返します" m
        m

// ワークフローのインスタンスを作成
let trace = new TraceBuilder()
```

ここには新しいものはありません。これらのメソッドはすべて以前に見たものです。

では、サンプルコードを実行してみましょう。

```fsharp
trace { 
    return 1
    } |> printfn "結果 1: %A" 

trace { 
    return! Some 2
    } |> printfn "結果 2: %A" 

trace { 
    let! x = Some 1
    let! y = Some 2
    return x + y
    } |> printfn "結果 3: %A" 

trace { 
    let! x = None
    let! y = Some 1
    return x + y
    } |> printfn "結果 4: %A" 
```

すべてが期待通りに動作するはずです。特に、4番目の例で`None`を使用すると、次の2行（`let! y = ... return x+y`）がスキップされ、式全体の結果が`None`になることがわかるはずです。

## "do!"の導入

私たちの式は`let!`をサポートしていますが、`do!`はどうでしょうか？

通常のF#では、`do`は`let`と同じですが、式が有用な値（つまり、unit値）を返さない点が異なります。

コンピュテーション式の中では、`do!`は非常に似ています。`let!`がラップされた結果を`Bind`メソッドに渡すのと同様に、`do!`も渡しますが、`do!`の場合、「結果」はunit値であり、unitの*ラップされた*バージョンが`Bind`メソッドに渡されます。

以下は`trace`ワークフローを使用した簡単なデモンストレーションです。

```fsharp
trace { 
    do! Some (printfn "...unit を返す式")
    do! Some (printfn "...unit を返す別の式")
    let! x = Some (1)
    return x
    } |> printfn "do の結果: %A" 
```

以下が出力です。

<pre>
...unit を返す式
Some(&lt;null>)とバインド中。続行します
...unit を返す別の式
Some(&lt;null>)とバインド中。続行します
Some(1)とバインド中。続行します
ラップされていない1をオプションとして返します
do の結果: Some 1
</pre>

各`do!`の結果として`unit option`が`Bind`に渡されていることを自分で確認できます。

## "Zero"の導入

最小のコンピュテーション式はどのようなものでしょうか？何もない状態を試してみましょう。

```fsharp
trace { 
    } |> printfn "空の結果: %A" 
```

すぐにエラーが発生します。

```text
This value is not a function and cannot be applied
```

もっともです。よく考えると、コンピュテーション式に何も含まれていないのは意味がありません。結局のところ、その目的は式を連鎖させることです。

次に、`let!`や`return`のない単純な式はどうでしょうか？

```fsharp
trace { 
    printfn "hello world"
    } |> printfn "単純な式の結果: %A" 
```

今度は異なるエラーが発生します。

```text
This control construct may only be used if the computation expression builder defines a 'Zero' method
```

では、なぜ`Zero`メソッドが今必要になり、以前は必要なかったのでしょうか？答えは、この特定のケースでは明示的に何も返していないにもかかわらず、コンピュテーション式全体は*必ず*ラップされた値を返さなければならないからです。では、どのような値を返すべきでしょうか？

実際、この状況はコンピュテーション式の戻り値が明示的に指定されていない場合に常に発生します。else節のない`if..then`式でも同じことが起こります。

```fsharp
trace { 
    if false then return 1
    } |> printfn "elseのないifの結果: %A" 
```

通常のF#コードでは、「else」のない「if..then」はunit値を返しますが、コンピュテーション式では、特定の戻り値はラップされた型のメンバーでなければならず、コンパイラはこの値が何であるかを知りません。

解決策は、使用する値をコンパイラに伝えることです。それが`Zero`メソッドの目的です。

### Zeroにはどの値を使用すべきか？

では、`Zero`にはどの値を使用すべきでしょうか？作成しているワークフローの種類によって異なります。

参考になるガイドラインをいくつか紹介します。

* **ワークフローに「成功」または「失敗」の概念がありますか？** ある場合は、「失敗」値を`Zero`に使用します。例えば、`trace`ワークフローでは、`None`を失敗を示すために使用しているので、`None`を`Zero`値として使用できます。
* **ワークフローに「逐次処理」の概念がありますか？** つまり、ワークフローで1つのステップを実行し、次に別のステップを実行し、その間に舞台裏で処理が行われるような場合です。通常のF#コードでは、明示的に何も返さない式はunitと評価されます。そこで、このケースと並行して、`Zero`はunitの*ラップされた*バージョンにすべきです。例えば、オプションベースのワークフローの変種では、`Some ()`を`Zero`の意味で使用することがあります（ちなみに、これは常に`Return ()`と同じになります）。
* **ワークフローは主にデータ構造の操作に関するものですか？** その場合、`Zero`は「空の」データ構造にすべきです。例えば、「リストビルダー」ワークフローでは、空のリストを`Zero`値として使用します。

`Zero`値は、ラップされた型を結合する際にも重要な役割を果たします。そのため、注目してください。次の投稿で`Zero`について再び取り上げます。

### Zeroの実装

では、`None`を返す`Zero`メソッドをテストベッドクラスに追加して、もう一度試してみましょう。

```fsharp
type TraceBuilder() =
    // 他のメンバーは以前と同じ
    member this.Zero() = 
        printfn "Zero"
        None

// 新しいインスタンスを作成        
let trace = new TraceBuilder()

// テスト
trace { 
    printfn "hello world"
    } |> printfn "単純な式の結果: %A" 

trace { 
    if false then return 1
    } |> printfn "elseのないifの結果: %A" 
```

テストコードは、`Zero`が舞台裏で呼び出されていることを明確に示しています。そして、式全体の戻り値は`None`です。*注：`None`は`<null>`として出力されることがあります。これは無視して構いません。*

### Zeroは常に必要ですか？

覚えておいてください。`Zero`を持つことは*必須ではありません*が、ワークフローの文脈で意味がある場合にのみ持つべきです。例えば、`seq`は`Zero`を許可しませんが、`async`は許可します。

```fsharp
let s = seq {printfn "zero" }    // エラー
let a = async {printfn "zero" }  // OK
```


## "Yield"の導入

C#には、イテレータ内で早期に値を返し、戻ってきたときに中断したところから再開するための"yield"文があります。

そして、ドキュメントを見ると、F#のコンピュテーション式にも"yield"が利用可能です。これは何をするのでしょうか？試してみましょう。

```fsharp
trace { 
    yield 1
    } |> printfn "yieldの結果: %A" 
```

すると、次のエラーが発生します。

```text
This control construct may only be used if the computation expression builder defines a 'Yield' method
```

驚くことはありません。では、"yield"メソッドの実装はどのようなものでしょうか？Microsoft Learnのドキュメントによると、そのシグネチャは`'T -> M<'T>`で、これは`Return`メソッドのシグネチャとまったく同じです。ラップされていない値を受け取り、それをラップする必要があります。

では、`Return`と同じように実装して、テスト式を再試行してみましょう。

```fsharp
type TraceBuilder() =
    // 他のメンバーは以前と同じ

    member this.Yield(x) = 
        printfn "ラップされていない%Aをオプションとしてyieldします" x
        Some x

// 新しいインスタンスを作成        
let trace = new TraceBuilder()

// テスト
trace { 
    yield 1
    } |> printfn "yieldの結果: %A" 
```

これで動作し、`return`の完全な代替として使用できるように見えます。

また、`ReturnFrom`メソッドと並行する`YieldFrom`メソッドもあります。これも同様に動作し、ラップされていない値ではなくラップされた値をyieldすることができます。

では、これもビルダーメソッドのリストに追加しましょう。

```fsharp
type TraceBuilder() =
    // 他のメンバーは以前と同じ

    member this.YieldFrom(m) = 
        printfn "オプション(%A)を直接yieldします" m
        m

// 新しいインスタンスを作成        
let trace = new TraceBuilder()

// テスト
trace { 
    yield! Some 1
    } |> printfn "yield!の結果: %A" 
```

この時点で、`return`と`yield`が基本的に同じものだとしたら、なぜ2つの異なるキーワードがあるのか疑問に思うかもしれません。答えは主に、一方を実装し、他方を実装しないことで、適切な構文を強制できるからです。例えば、`seq`式は`yield`を許可しますが、`return`は許可しません。一方、`async`は`return`を許可しますが、`yield`は許可しません。以下のスニペットでそれを確認できます。

```fsharp
let s = seq {yield 1}    // OK
let s = seq {return 1}   // エラー

let a = async {return 1} // OK
let a = async {yield 1}  // エラー
```

実際、`return`と`yield`で少し異なる動作を作成することもできます。例えば、`return`を使用するとコンピュテーション式の残りの評価が停止するのに対し、`yield`は停止しないようにすることができます。

より一般的には、もちろん、`yield`はシーケンス/列挙セマンティクスに使用されるべきであり、`return`は通常、式ごとに1回使用されます（次の投稿で`yield`を複数回使用する方法を見ていきます）。

## "For"の再考

前回の投稿で`for..in..do`構文について説明しました。では、以前に議論した「リストビルダー」を再考し、追加のメソッドを加えてみましょう。以前の投稿でリストの`Bind`と`Return`の定義方法を見ましたので、追加のメソッドを実装するだけです。

* `Zero`メソッドは単に空のリストを返します。
* `Yield`メソッドは`Return`と同じように実装できます。
* `For`メソッドは`Bind`と同じように実装できます。

```fsharp
type ListBuilder() =
    member this.Bind(m, f) = 
        m |> List.collect f

    member this.Zero() = 
        printfn "Zero"
        []

    member this.Return(x) = 
        printfn "ラップされていない%Aをリストとして返します" x
        [x]

    member this.Yield(x) = 
        printfn "ラップされていない%Aをリストとしてyieldします" x
        [x]
        
    member this.For(m,f) =
        printfn "For %A" m
        this.Bind(m,f)

// ワークフローのインスタンスを作成                
let listbuilder = new ListBuilder()
```

そして、`let!`を使用したコードは次のようになります。

```fsharp
listbuilder { 
    let! x = [1..3]
    let! y = [10;20;30]
    return x + y
    } |> printfn "結果: %A" 
```

そして、`for`を使用した同等のコードは次のようになります。

```fsharp
listbuilder { 
    for x in [1..3] do
    for y in [10;20;30] do
    return x + y
    } |> printfn "結果: %A" 
```

両方のアプローチが同じ結果を生むことがわかります。

## まとめ  

この投稿では、シンプルなコンピュテーション式の基本的なメソッドの実装方法を見てきました。

繰り返しておくべきポイント：

* シンプルな式では、すべてのメソッドを実装する必要はありません。
* バン（!）のついたものは右辺にラップされた型があります。
* バンのないものは右辺にラップされていない型があります。
* 明示的に値を返さないワークフローが必要な場合は、`Zero`を実装する必要があります。
* `Yield`は基本的に`Return`と同等ですが、`Yield`はシーケンス/列挙セマンティクスに使用すべきです。
* シンプルなケースでは、`For`は基本的に`Bind`と同等です。

次の投稿では、複数の値を結合する必要がある場合について見ていきます。
