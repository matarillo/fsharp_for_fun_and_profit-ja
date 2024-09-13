---
layout: post
title: "ビルダーの実装：DelayとRun"
description: "関数の実行タイミングの制御"
nav: thinking-functionally
seriesId: "コンピュテーション式"
seriesOrder: 8
---

ここ数回の投稿で、独自のコンピュテーション式ビルダーを作成するために必要な基本的なメソッド（Bind、Return、Zero、Combine）をすべて説明してきました。この投稿では、式の評価タイミングを制御することでワークフローをより効率的にするための追加機能を見ていきます。

## 問題：不要な評価の回避

以前のように「maybe」スタイルのワークフローを作成したとします。しかし今回は、"return"キーワードを使って早期に戻り、それ以上の処理を停止したいと考えています。

以下が完全なビルダークラスです。注目すべき重要なメソッドは`Combine`で、最初のreturnの後の二次的な式を単に無視します。

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

    member this.Zero() = 
        printfn "Zero"
        None

    member this.Combine (a,b) = 
        printfn "%Aで早期に戻ります。2番目の部分を無視します: %A" a b 
        a

    member this.Delay(f) = 
        printfn "Delay"
        f()

// ワークフローのインスタンスを作成                
let trace = new TraceBuilder()
```

何かを出力し、returnし、その後さらに何かを出力することでどのように動作するか見てみましょう。

```fsharp
trace { 
    printfn "パート1: 1を返す直前"
    return 1
    printfn "パート2: returnの後"
    } |> printfn "パート2なしのパート1の結果: %A"  
```

デバッグ出力は以下のようになるはずです。注釈を付けました。

```text
// 最初の式、"return"まで
Delay
パート1: 1を返す直前
ラップされていない1をオプションとして返します

// 2番目の式、最後の中かっこまで
Delay
パート2: returnの後
Zero   // この部分に明示的なreturnがないためzeroがここにある

// 2つの式の結合
Some 1で早期に戻ります。2番目の部分を無視します: <null>

// 最終結果
パート2なしのパート1の結果: Some 1
```

ここで問題が見えます。早期に戻ろうとしていたにもかかわらず、「パート2: returnの後」が出力されています。

なぜでしょうか？前回の投稿で述べたことを繰り返しますが、**returnとyieldはコンピュテーション式から早期に戻る*わけではありません***。コンピュテーション式全体、最後の中かっこまでが*常に*評価され、単一の値を生成します。

これは問題です。望まない副作用（この場合はメッセージの出力など）が発生する可能性があり、コードが不要な処理を行っているため、パフォーマンスの問題を引き起こす可能性があります。

では、必要になるまで2番目の部分の評価を避けるにはどうすればよいでしょうか？

## "Delay"の導入

この質問への答えは簡単です。式のパート2を関数でラップし、必要な時にのみその関数を呼び出すだけです。次のようになります。

```fsharp
let part2 = 
    fun () -> 
        printfn "パート2: returnの後"
        // その他の処理
        // Zeroを返す

// 必要な場合のみ評価
if needed then
   let result = part2()        
```

この技法を使うと、コンピュテーション式のパート2を完全に処理できますが、式が関数を返すため、関数が呼び出されるまで実際には何も*起こりません*。
そして`Combine`メソッドがそれを呼び出すことはないため、その中のコードは全く実行されません。

これがまさに`Delay`メソッドの目的です。`Return`や`Yield`からの結果は即座にこのような「遅延」関数でラップされ、それを実行するかどうかを選択できます。

ビルダーを変更して遅延を実装してみましょう。

```fsharp
type TraceBuilder() =
    // 他のメンバーは以前と同じ

    member this.Delay(funcToDelay) = 
        let delayed = fun () ->
            printfn "%A - 遅延関数の開始。" funcToDelay
            let delayedResult = funcToDelay()
            printfn "%A - 遅延関数の終了。結果は %A" funcToDelay delayedResult
            delayedResult  // 結果を返す 

        printfn "%A - %Aを使用して遅延中" funcToDelay delayed
        delayed // 新しい関数を返す
```

ご覧のように、`Delay`メソッドは実行する関数を与えられます。以前はそれをすぐに実行していました。今回行っているのは、この関数を別の関数でラップし、代わりに遅延関数を返すことです。関数がラップされる前後にいくつかのトレースステートメントを追加しました。

このコードをコンパイルすると、`Delay`のシグネチャが変更されているのがわかります。変更前は具体的な値（この場合はオプション）を返していましたが、今は関数を返します。

```fsharp
// 変更前のシグネチャ
member Delay : f:(unit -> 'a) -> 'a

// 変更後のシグネチャ
member Delay : f:(unit -> 'b) -> (unit -> 'b)
```

ちなみに、トレースを行わずにもっと簡単に`Delay`を実装することもできます。渡された関数をそのまま返すだけです。

```fsharp
member this.Delay(f) = 
    f
```

はるかに簡潔です！しかし、この場合は詳細なトレース情報も追加したかったのです。

では、もう一度試してみましょう。

```fsharp
trace { 
    printfn "パート1: 1を返す直前"
    return 1
    printfn "パート2: returnの後"
    } |> printfn "パート2なしのパート1の結果: %A"  
```

おっと。今回は何も起こりません！何が問題だったのでしょうか？

出力を見ると、次のようになっています。

<code>
パート2なしのパート1の結果: &lt;fun:Delay@84-5>
</code>

うーん。`trace`式全体の出力が今や*関数*になっています。オプションではありません。なぜでしょうか？これらの遅延をすべて作成しましたが、実際に関数を呼び出して「遅延解除」しなかったからです！

これを行う一つの方法は、コンピュテーション式の出力を関数値、例えば`f`に割り当て、それを評価することです。

```fsharp
let f = trace { 
    printfn "パート1: 1を返す直前"
    return 1
    printfn "パート2: returnの後"
    } 
f() |> printfn "パート2なしのパート1の結果: %A"  
```

これは期待通りに動作しますが、コンピュテーション式自体の中からこれを行う方法はないでしょうか？もちろんあります！

## "Run"の導入

`Run`メソッドはまさにこの目的のために存在します。コンピュテーション式の評価プロセスの最終ステップとして呼び出され、遅延を解除するのに使えます。

以下が実装例です。

```fsharp
type TraceBuilder() =
    // 他のメンバーは以前と同じ

    member this.Run(funcToRun) = 
        printfn "%A - Run開始。" funcToRun
        let runResult = funcToRun()
        printfn "%A - Run終了。結果は %A" funcToRun runResult
        runResult // 遅延関数の実行結果を返す
```

もう一度試してみましょう。

```fsharp
trace { 
    printfn "パート1: 1を返す直前"
    return 1
    printfn "パート2: returnの後"
    } |> printfn "パート2なしのパート1の結果: %A"  
```

そして結果は私たちが望んでいたとおりになります。最初の部分は評価されますが、2番目の部分は評価されません。そして、コンピュテーション式全体の結果は関数ではなく、オプションになります。

## 遅延はいつ呼び出されるのか？

`Delay`がワークフローに挿入される方法は、理解すれば簡単です。

* 最下部（または最内部）の式が遅延されます。
* これが前の式と結合される場合、`Combine`の出力も遅延されます。
* そして、最終的な遅延が`Run`に渡されるまで続きます。

この知識を使って、上の例で何が起こったかを振り返ってみましょう。

* 式の最初の部分は、print文と`return 1`です。
* 式の2番目の部分は、明示的なreturnのないprint文で、`Zero()`が呼び出されることを意味します。
* `Zero`からの`None`は`Delay`に渡され、「遅延オプション」、つまり呼び出されると`option`に評価される関数になります。
* パート1からのオプションとパート2からの遅延オプションは`Combine`で結合され、2番目のものは破棄されます。
* 結合の結果は別の「遅延オプション」になります。
* 最後に、遅延オプションは`Run`に渡され、評価されて通常のオプションを返します。

以下の図は、このプロセスを視覚的に表現しています。

![Delay](../assets/img/ce_delay.png)


上の例のデバッグトレースを見ると、詳細に何が起こったかがわかります。少し混乱するかもしれないので、注釈を付けました。
また、このトレースを*下に*たどることは、上の図の下から*上に*たどることと同じであることを覚えておくと役立ちます。なぜなら、最も外側のコードが最初に実行されるからです。

```text
// 全体の式（Combineの出力）を遅延
<fun:clo@160-66> - <fun:delayed@141-3>を使用して遅延中

// 最も外側の遅延式（Combineの出力）を実行
<fun:delayed@141-3> - Run開始。
<fun:clo@160-66> - 遅延関数の開始。

// 最初の式がSome(1)を生成
パート1: 1を返す直前
ラップされていない1をオプションとして返します

// 2番目の式が遅延でラップされる
<fun:clo@162-67> - <fun:delayed@141-3>を使用して遅延中

// 最初と2番目の式が結合される
Combine。Some 1で早期に戻ります。<fun:delayed@141-3>を無視します

// 全体の遅延式（Combineの出力）が完了
<fun:clo@160-66> - 遅延関数の終了。結果は Some 1
<fun:delayed@141-3> - Run終了。結果は Some 1

// 結果は関数ではなくOptionになった
パート2なしのパート1の結果: Some 1
```

## "Delay"は"Combine"のシグネチャを変更する

このように`Delay`がパイプラインに導入されると、`Combine`のシグネチャに影響を与えます。

当初`Combine`を書いたとき、`option`を扱うことを想定していました。しかし今や`Delay`の出力、つまり関数を扱っています。

`Combine`が期待する型を`int option`型アノテーションでハードコードすると、これが分かります。

```fsharp
member this.Combine (a: int option,b: int option) = 
    printfn "%Aで早期に戻ります。%Aを無視します" a b 
    a
```

これを行うと、"return"式でコンパイラエラーが発生します。

```fsharp
trace { 
    printfn "パート1: 1を返す直前"
    return 1
    printfn "パート2: returnの後"
    } |> printfn "パート2なしのパート1の結果: %A" 
```

エラーは次のようになります。

<pre>
error FS0001: This expression was expected to have type
    int option    
but here has type
    unit -> 'a    
</pre>

言い換えると、`Combine`に遅延関数（`unit -> 'a`）が渡されており、これは明示的なシグネチャと一致しません。

では、パラメータを結合したい場合、単純な値ではなく関数として渡された場合はどうすればよいでしょうか？

答えは簡単です。渡された関数を呼び出して、基礎となる値を取得するだけです。

前回の投稿の加算例を使ってデモンストレーションしましょう。

```fsharp
type TraceBuilder() =
    // 他のメンバーは以前と同じ

    member this.Combine (m,f) = 
        printfn "Combine。2番目のパラメータ %A を開始" f
        let y = f()
        printfn "Combine。2番目のパラメータ %A を終了。結果は %A" f y

        match m,y with
        | Some a, Some b ->
            printfn "%Aと%Aを結合" a b 
            Some (a + b)
        | Some a, None ->
            printfn "%AとNoneを結合" a 
            Some a
        | None, Some b ->
            printfn "Noneと%Aを結合" b 
            Some b
        | None, None ->
            printfn "NoneとNoneを結合"
            None
```

この新しいバージョンの`Combine`では、*2番目の*パラメータが`int option`ではなく関数になっています。そのため、結合ロジックを行う前に、まず関数を評価する必要があります。

これをテストしてみましょう。

```fsharp
trace { 
    return 1
    return 2
    } |> printfn "returnしてからreturnした結果: %A" 
```

次のような（注釈付きの）トレースが得られます。

```text
// 全体の式を遅延
<fun:clo@318-69> - <fun:delayed@295-6>を使用して遅延中

// 全体の式を実行
<fun:delayed@295-6> - Run開始。

// 遅延された全体の式を実行
<fun:clo@318-69> - 遅延関数の開始。

// 最初のreturn
ラップされていない1をオプションとして返します

// 2番目のreturnを遅延
<fun:clo@319-70> - <fun:delayed@295-6>を使用して遅延中

// combine開始
Combine。2番目のパラメータ <fun:delayed@295-6> を開始

    // 遅延された2番目のreturnがCombine内で実行される
    <fun:clo@319-70> - 遅延関数の開始。
    ラップされていない2をオプションとして返します
    <fun:clo@319-70> - 遅延関数の終了。結果は Some 2
    // 遅延された2番目のreturnが完了

Combine。2番目のパラメータ <fun:delayed@295-6> を終了。結果は Some 2
1と2を結合
// combineが完了

<fun:clo@318-69> - 遅延関数の終了。結果は Some 3
// 遅延された全体の式が完了

<fun:delayed@295-6> - Run終了。結果は Some 3
// Runが完了

// 最終結果が出力される
returnしてからreturnした結果: Some 3
```

## 型制約の理解

これまで、ビルダーの実装では「ラップされた型」（例：`int option`）とその遅延バージョン（例：`unit -> int option`）のみを使ってきました。

しかし、実際には特定の制約に従えば、他の型も使うことができます。
コンピュテーション式の型制約を正確に理解することで、すべてがどのように組み合わさるかが明確になります。

例えば、以下のことがわかっています。

* `Return`の出力は`Delay`に渡されるので、これらは互換性のある型でなければなりません。
* `Delay`の出力は`Combine`の2番目のパラメータに渡されます。
* `Delay`の出力は`Run`にも渡されます。

しかし、`Return`の出力は必ずしも「公開」されたラップ型である必要はありません。代わりに内部で定義された型でもよいのです。

![Delay](../assets/img/ce_return.png)

同様に、遅延型は単純な関数である必要はなく、制約を満たす任意の型でよいのです。

したがって、以下のような単純なreturn式のセットがあるとします。

```fsharp
    trace { 
        return 1
        return 2
        return 3
        } |> printfn "3回returnした結果: %A" 
```

この場合、さまざまな型とその流れを表す図は次のようになります。

![Delay](../assets/img/ce_types.png)

これが有効であることを証明するために、`Internal`と`Delayed`に別個の型を使用した実装を示します。

```fsharp
type Internal = Internal of int option
type Delayed = Delayed of (unit -> Internal)

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
        Internal (Some x) 

    member this.ReturnFrom(m) = 
        printfn "オプション(%A)を直接返します" m
        Internal m

    member this.Zero() = 
        printfn "Zero"
        Internal None

    member this.Combine (Internal x, Delayed g) : Internal = 
        printfn "Combine。%Aを開始" g
        let (Internal y) = g()
        printfn "Combine。%Aを終了。結果は%A" g y
        let o = 
            match x,y with
            | Some a, Some b ->
                printfn "%Aと%Aを結合" a b 
                Some (a + b)
            | Some a, None ->
                printfn "%AとNoneを結合" a 
                Some a
            | None, Some b ->
                printfn "Noneと%Aを結合" b 
                Some b
            | None, None ->
                printfn "NoneとNoneを結合"
                None
        // 新しい値をInternalでラップして返す
        Internal o                

    member this.Delay(funcToDelay) = 
        let delayed = fun () ->
            printfn "%A - 遅延関数の開始。" funcToDelay
            let delayedResult = funcToDelay()
            printfn "%A - 遅延関数の終了。結果は %A" funcToDelay delayedResult
            delayedResult  // 結果を返す 

        printfn "%A - %Aを使用して遅延中" funcToDelay delayed
        Delayed delayed // 新しい関数をDelayでラップして返す

    member this.Run(Delayed funcToRun) = 
        printfn "%A - Run開始。" funcToRun
        let (Internal runResult) = funcToRun()
        printfn "%A - Run終了。結果は %A" funcToRun runResult
        runResult // 遅延関数の実行結果を返す

// ワークフローのインスタンスを作成                
let trace = new TraceBuilder()
```

そして、ビルダークラスのメソッドのシグネチャは次のようになります。

```fsharp
type Internal = | Internal of int option
type Delayed = | Delayed of (unit -> Internal)

type TraceBuilder =
class
  new : unit -> TraceBuilder
  member Bind : m:'a option * f:('a -> 'b option) -> 'b option
  member Combine : Internal * Delayed -> Internal
  member Delay : funcToDelay:(unit -> Internal) -> Delayed
  member Return : x:int -> Internal
  member ReturnFrom : m:int option -> Internal
  member Run : Delayed -> int option
  member Zero : unit -> Internal
end
```

このような人工的なビルダーを作成するのは過剰ですが、シグネチャを見ると、さまざまなメソッドがどのように組み合わさるかが明確にわかります。

## まとめ

この投稿では、以下のことを学びました。

* コンピュテーション式内で実行を遅延させたい場合、`Delay`と`Run`を実装する必要があります。
* `Delay`を使用すると`Combine`のシグネチャが変更されます。
* `Delay`と`Combine`は、コンピュテーション式のクライアントには公開されない内部型を使用できます。

次の論理的なステップは、準備が整うまでコンピュテーション式の*外部で*実行を遅延させたいと考えることです。これについては次々回の投稿で取り上げます。
しかしその前に、メソッドのオーバーロードについて議論するために少し寄り道をします。
