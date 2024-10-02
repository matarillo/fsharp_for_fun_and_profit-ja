---
layout: post
title: "ビルダーの実装：Combine"
description: "一度に複数の値を返す方法"
nav: thinking-functionally
seriesId: "コンピュテーション式"
seriesOrder: 7
---

この投稿では、`Combine`メソッドを使ってコンピュテーション式から複数の値を返す方法を見ていきます。

## これまでの経緯

これまでの式ビルダークラスは次のようになっています。

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

    member this.Zero() = 
        printfn "Zero"
        None

    member this.Yield(x) = 
        printfn "ラップされていない%Aをオプションとしてyieldします" x
        Some x

    member this.YieldFrom(m) = 
        printfn "オプション(%A)を直接yieldします" m
        m
        
// ワークフローのインスタンスを作成                
let trace = new TraceBuilder()
```

このクラスはこれまでうまく機能してきました。しかし、問題に直面しようとしています。

## 2つの'yield'の問題

以前、`yield`が`return`と同じように値を返すのに使えることを見ました。

通常、`yield`は1回だけではなく、列挙などのプロセスの異なる段階で値を返すために複数回使われます。試してみましょう。

```fsharp
trace { 
    yield 1
    yield 2
    } |> printfn "yieldしてからyieldした結果: %A" 
```

しかし、エラーメッセージが出ます。

```text
This control construct may only be used if the computation expression builder defines a 'Combine' method.
```

`yield`の代わりに`return`を使っても、同じエラーが出ます。

```fsharp
trace { 
    return 1
    return 2
    } |> printfn "returnしてからreturnした結果: %A" 
```

この問題は他の文脈でも発生します。たとえば、何かを実行してから値を返したい場合、次のようになります。

```fsharp
trace { 
    if true then printfn "hello" 
    return 1
    } |> printfn "ifしてからreturnした結果: %A" 
```

ここでも'Combine'メソッドがないという同じエラーメッセージが出ます。

## 問題の理解

何が起こっているのでしょうか？

理解するために、コンピュテーション式の舞台裏に戻ってみましょう。`return`と`yield`は実際には一連の継続の最後のステップにすぎないことを見てきました。次のようなイメージです。

```fsharp
Bind(1,fun x -> 
   Bind(2,fun y -> 
     Bind(x + y,fun z -> 
        Return(z)  // または Yield
```

`return`（または`yield`）をインデントを「リセット」するものと考えることができます。そのため、`return/yield`してから再び`return/yield`すると、次のようなコードが生成されます。

```fsharp
Bind(1,fun x -> 
   Bind(2,fun y -> 
     Bind(x + y,fun z -> 
        Yield(z)  
// 新しい式を開始        
Bind(3,fun w -> 
   Bind(4,fun u -> 
     Bind(w + u,fun v -> 
        Yield(v)
```

しかし、これは実際には次のように簡略化できます。

```fsharp
let value1 = ある式 
let value2 = 別の式 
```

言い換えれば、コンピュテーション式に*2つ*の値があるということです。そして明らかな疑問は、これら2つの値をどのように組み合わせてコンピュテーション式全体の単一の結果にするかということです。

これは非常に重要なポイントです。**ReturnとYieldはコンピュテーション式から早期に戻る*わけではありません***。そうではなく、コンピュテーション式全体、最後の波かっこまでが*常に*評価され、*単一の*値を生成します。繰り返しますが、コンピュテーション式のすべての部分が*常に評価される*のです。ショートサーキットは発生しません。早期に戻って値を返したい場合は、自分でコードを書く必要があります（その方法は後で見ていきます）。

では、差し迫った質問に戻りましょう。2つの式が2つの値をもたらします。これらの複数の値をどのように1つに組み合わせるべきでしょうか？

## "Combine"の導入

答えは`Combine`メソッドを使うことです。このメソッドは2つの*ラップされた*値を受け取り、それらを組み合わせて別のラップされた値を作ります。具体的な動作は私たちが決めることができます。

今回の場合、特に`int option`を扱っているので、思いつく単純な実装の1つは、数値を足し合わせることです。各パラメータはもちろん`option`（ラップされた型）なので、それらを分解して4つの可能なケースを処理する必要があります。

```fsharp
type TraceBuilder() =
    // 他のメンバーは以前と同じ

    member this.Combine (a,b) = 
        match a,b with
        | Some a', Some b' ->
            printfn "%Aと%Aを組み合わせています" a' b' 
            Some (a' + b')
        | Some a', None ->
            printfn "%AとNoneを組み合わせています" a' 
            Some a'
        | None, Some b' ->
            printfn "Noneと%Aを組み合わせています" b' 
            Some b'
        | None, None ->
            printfn "NoneとNoneを組み合わせています"
            None

// 新しいインスタンスを作成        
let trace = new TraceBuilder()
```

テストコードを再度実行してみます。

```fsharp
trace { 
    yield 1
    yield 2
    } |> printfn "yieldしてからyieldした結果: %A" 
```

しかし、今度は異なるエラーメッセージが出ます。

```text
This control construct may only be used if the computation expression builder defines a 'Delay' method
```

`Delay`メソッドは、コンピュテーション式の評価を必要になるまで遅延させるためのフックです。これについては近々詳しく説明します。今のところ、デフォルトの実装を作成しましょう。

```fsharp
type TraceBuilder() =
    // 他のメンバーは以前と同じ

    member this.Delay(f) = 
        printfn "Delay"
        f()

// 新しいインスタンスを作成        
let trace = new TraceBuilder()
```

テストコードを再度実行します。

```fsharp
trace { 
    yield 1
    yield 2
    } |> printfn "yieldしてからyieldした結果: %A" 
```

ついにコードが完了します。

```text
Delay
ラップされていない1をオプションとしてyieldします
Delay
ラップされていない2をオプションとしてyieldします
1と2を組み合わせています
yieldしてからyieldした結果: Some 3
```

ワークフロー全体の結果は、すべてのyieldの合計である`Some 3`です。

ワークフローに「失敗」（たとえば`None`）がある場合、2番目のyieldは発生せず、全体の結果は代わりに`Some 1`になります。

```fsharp
trace { 
    yield 1
    let! x = None
    yield 2
    } |> printfn "yieldしてからNoneの結果: %A" 
```

2つではなく3つの`yield`を持つこともできます。

```fsharp
trace { 
    yield 1
    yield 2
    yield 3
    } |> printfn "3回yieldした結果: %A" 
```

結果は予想通り`Some 6`になります。
        
`yield`と`return`を混ぜて使うこともできます。構文の違いを除けば、全体的な効果は同じです。

```fsharp
trace { 
    yield 1
    return 2
    } |> printfn "yieldしてからreturnした結果: %A" 

trace { 
    return 1
    return 2
    } |> printfn "returnしてからreturnした結果: %A" 
```

## シーケンス生成にCombineを使う

数値を足し合わせることは`yield`の本来の目的ではありませんが、`StringBuilder`のように文字列を連結するような場合には同様のアイデアを使うかもしれません。

いいえ、`yield`は自然にシーケンス生成の一部として使われます。そして今、`Combine`を理解したので、前回の「ListBuilder」ワークフローに必要なメソッドを追加できます。

* `Combine`メソッドは単にリストの連結です。
* `Delay`メソッドは今のところデフォルトの実装を使えます。

以下が完全なクラスです。

```fsharp
type ListBuilder() =
    member this.Bind(m, f) = 
        m |> List.collect f

    member this.Zero() = 
        printfn "Zero"
        []
        
    member this.Yield(x) = 
        printfn "ラップされていない%Aをリストとしてyieldします" x
        [x]

    member this.YieldFrom(m) = 
        printfn "リスト(%A)を直接yieldします" m
        m

    member this.For(m,f) =
        printfn "For %A" m
        this.Bind(m,f)
        
    member this.Combine (a,b) = 
        printfn "%Aと%Aを組み合わせています" a b 
        List.concat [a;b]

    member this.Delay(f) = 
        printfn "Delay"
        f()

// ワークフローのインスタンスを作成                
let listbuilder = new ListBuilder()
```

そして、これを使用した例です。

```fsharp
listbuilder { 
    yield 1
    yield 2
    } |> printfn "yieldしてからyieldした結果: %A" 

listbuilder { 
    yield 1
    yield! [2;3]
    } |> printfn "yieldしてからyield!した結果: %A" 
```

そして、`for`ループといくつかの`yield`を含むより複雑な例です。

```fsharp
listbuilder { 
    for i in ["red";"blue"] do
        yield i
        for j in ["hat";"tie"] do
            yield! [i + " " + j;"-"]
    } |> printfn "for..in..doの結果: %A" 
```

結果は次のようになります。

```text
["red"; "red hat"; "-"; "red tie"; "-"; "blue"; "blue hat"; "-"; "blue tie"; "-"]    
```

`for..in..do`と`yield`を組み合わせることで、組み込みの`seq`式構文（ただし、`seq`は遅延評価です）にかなり近づいていることがわかります。

舞台裏で何が起こっているのかを理解するまで、これをしばらく試してみることを強くお勧めします。
上の例からわかるように、`yield`を創造的に使って、単純なリストだけでなく、さまざまな不規則なリストを生成できます。

*注：`While`について疑問に思っているかもしれませんが、これは今後の投稿で`Delay`を見た後まで保留にしています。*

## "combine"の処理順序

`Combine`メソッドは2つのパラメータしか持ちません。では、2つ以上の値を組み合わせる場合はどうなるでしょうか？たとえば、次のように4つの値を組み合わせる場合を考えてみましょう。

```fsharp
listbuilder { 
    yield 1
    yield 2
    yield 3
    yield 4
    } |> printfn "4回yieldした結果: %A" 
```

出力を見ると、予想通り値が対ごとに組み合わされていることがわかります。

```text
[3]と[4]を組み合わせています
[2]と[3; 4]を組み合わせています
[1]と[2; 3; 4]を組み合わせています
4回yieldした結果: [1; 2; 3; 4]
```

微妙だが重要な点は、最後の値から始まり「後ろ向き」に組み合わされることです。まず"3"と"4"が組み合わされ、その結果が"2"と組み合わされ、というように進みます。

![Combine](../assets/img/combine.png)

## シーケンス以外のCombine

先ほどの問題例の2つ目では、シーケンスではなく、単に2つの別々の式が連続していました。

```fsharp
trace { 
    if true then printfn "hello"  //式1
    return 1                      //式2
    } |> printfn "combineの結果: %A" 
```

これらの式をどのように組み合わせるべきでしょうか？

ワークフローがサポートする概念に応じて、一般的にいくつかの方法があります。

### "成功"または"失敗"を持つワークフローのCombineの実装

ワークフローに"成功"や"失敗"の概念がある場合、標準的なアプローチは次のとおりです。

* 最初の式が"成功"（文脈に応じてその意味は異なります）した場合、その値を使います。
* そうでない場合は、2番目の式の値を使います。

この場合、通常`Zero`には"失敗"値を使います。

このアプローチは、最初の成功が"勝ち"となり、全体の結果になるような一連の"または"式をチェーンするのに便利です。

```text
if (最初の式を実行)
または (2番目の式を実行)
または (3番目の式を実行)
```

たとえば、`maybe`ワークフローでは、最初の式が`Some`の場合はそれを返し、そうでない場合は2番目の式を返すのが一般的です。次のように実装します。

```fsharp
type TraceBuilder() =
    // 他のメンバーは以前と同じ
    
    member this.Zero() = 
        printfn "Zero"
        None  // 失敗
    
    member this.Combine (a,b) = 
        printfn "%Aと%Aを組み合わせています" a b
        match a with
        | Some _ -> a  // aが成功 -- aを使う
        | None -> b    // aが失敗 -- 代わりにbを使う
        
// 新しいインスタンスを作成        
let trace = new TraceBuilder()
```

**例：パース**

この実装を使ったパースの例を試してみましょう。

```fsharp
type IntOrBool = I of int | B of bool

let parseInt s = 
    match System.Int32.TryParse(s) with
    | true,i -> Some (I i)
    | false,_ -> None

let parseBool s = 
    match System.Boolean.TryParse(s) with
    | true,i -> Some (B i)
    | false,_ -> None

trace { 
    return! parseBool "42"  // 失敗
    return! parseInt "42"
    } |> printfn "パースの結果: %A" 
```

次のような結果が得られます。

```text
Some (I 42)
```

最初の`return!`式が`None`となり、無視されているのがわかります。そのため、全体の結果は2番目の式である`Some (I 42)`になります。

**例：辞書検索**

この例では、複数の辞書で同じキーを検索し、値が見つかったら返します。

```fsharp
let map1 = [ ("1","One"); ("2","Two") ] |> Map.ofList
let map2 = [ ("A","Alice"); ("B","Bob") ] |> Map.ofList

trace { 
    return! map1.TryFind "A"
    return! map2.TryFind "A"
    } |> printfn "マップ検索の結果: %A" 
```

次のような結果が得られます。

```text
マップ検索の結果: Some "Alice"
```

最初の検索が`None`となり、無視されているのがわかります。そのため、全体の結果は2番目の検索結果になります。

ご覧のように、この手法はパースや（おそらく失敗する）一連の操作を評価する際に非常に便利です。

### 順次ステップを持つワークフローのCombineの実装

ワークフローに順次ステップの概念がある場合、全体の結果は単に最後のステップの値となり、それ以前のすべてのステップは副作用のためだけに評価されます。

通常のF#では、これは次のように書かれます。

```text
do some expression
do some other expression 
final expression
```

またはセミコロン構文を使って、単に次のように書きます。

```text
some expression; some other expression; final expression
```

通常のF#では、各式（最後のものを除く）はunit値に評価されます。

コンピュテーション式の同等のアプローチは、各式（最後のものを除く）を*ラップされた*unit値として扱い、それを次の式に「渡す」ことです。これを最後の式に到達するまで繰り返します。

これはもちろんbindが行うことそのものなので、最も簡単な実装は`Bind`メソッド自体を再利用することです。また、このアプローチが機能するためには、`Zero`がラップされたunit値であることが重要です。

```fsharp
type TraceBuilder() =
    // 他のメンバーは以前と同じ

    member this.Zero() = 
        printfn "Zero"
        this.Return ()  // None ではなく unit

    member this.Combine (a,b) = 
        printfn "%Aと%Aを組み合わせています" a b
        this.Bind( a, fun ()-> b )
        
// 新しいインスタンスを作成        
let trace = new TraceBuilder()
```

通常のbindとの違いは、継続がunitパラメータを持ち、`b`に評価されることです。これにより、`a`は一般的に`WrapperType<unit>`型、または今回の場合は`unit option`型になります。

この`Combine`の実装で動作する順次処理の例を示します。

```fsharp
trace { 
    if true then printfn "hello......."
    if false then printfn ".......world"
    return 1
    } |> printfn "順次combineの結果: %A" 
```

以下がトレース結果です。式全体の結果が、通常のF#コードと同様にシーケンスの最後の式の結果になっていることに注目してください。

```text
hello.......
Zero
ラップされていない<null>をオプションとして返します
Zero
ラップされていない<null>をオプションとして返します
ラップされていない1をオプションとして返します
Some nullとSome 1を組み合わせています
Some nullとSome 1を組み合わせています
順次combineの結果: Some 1
```

### データ構造を構築するワークフローのCombineの実装

最後に、ワークフローの別の一般的なパターンは、データ構造を構築することです。この場合、`Combine`は2つのデータ構造を適切な方法でマージする必要があります。
そして、`Zero`メソッドは必要に応じて（そして可能であれば）空のデータ構造を作成する必要があります。

上の「リストビルダー」の例では、まさにこのアプローチを使いました。`Combine`は単にリストの連結で、`Zero`は空のリストでした。

## "Combine"と"Zero"を混ぜる際のガイドライン

オプション型に対する2つの異なる`Combine`の実装を見てきました。

* 1つ目は、オプションを「成功/失敗」の指標として使い、最初の成功が「勝ち」となる場合です。この場合、`Zero`は`None`として定義されました。
* 2つ目は順次的なものでした。この場合、`Zero`は`Some ()`として定義されました。

両方のケースがうまく機能しましたが、これは運が良かっただけでしょうか、それとも`Combine`と`Zero`を正しく実装するためのガイドラインはあるのでしょうか？

まず、`Combine`はパラメータを入れ替えても同じ結果を与える必要は*ありません*。
つまり、`Combine(a,b)`は`Combine(b,a)`と同じである必要はありません。リストビルダーはこの良い例です。

一方で、`Zero`と`Combine`を結びつける便利なルールがあります。

**ルール：`Combine(a,Zero)`は`Combine(Zero,a)`と同じであり、これは単に`a`と同じでなければなりません。**

算術からのアナロジーを使うと、`Combine`を加算のように考えることができます（これは悪いアナロジーではありません - 実際に2つの値を「加算」しているのです）。そして`Zero`はもちろん数字のゼロです！したがって、上記のルールは次のように表現できます。

**ルール：`a + 0`は`0 + a`と同じであり、これは単に`a`と同じです。ここで`+`は`Combine`を、`0`は`Zero`を意味します。**

オプション型に対する最初の`Combine`実装（「成功/失敗」）を見ると、このルールに確かに従っていることがわかります。2番目の実装（`Some()`での「bind」）も同様です。

一方で、「bind」実装の`Combine`を使いながら、`Zero`を`None`として定義したままにしていた場合、加算ルールに従わないことになり、何かが間違っているというヒントになります。


## bindを使わない"Combine"

他のすべてのビルダーメソッドと同様に、必要ない場合は実装する必要はありません。そのため、強く順序付けられたワークフローの場合、`Bind`と`Return`を全く実装せずに、`Combine`、`Zero`、`Yield`だけを持つビルダークラスを簡単に作成できます。

以下は、動作する最小限の実装の例です。

```fsharp
type TraceBuilder() =

    member this.ReturnFrom(x) = x

    member this.Zero() = Some ()

    member this.Combine (a,b) = 
        a |> Option.bind (fun ()-> b )

    member this.Delay(f) = f()

// ワークフローのインスタンスを作成                
let trace = new TraceBuilder()
```

そして、これを使用した例です。

```fsharp
trace { 
    if true then printfn "hello......."
    if false then printfn ".......world"
    return! Some 1
    } |> printfn "最小限のcombineの結果: %A" 
```

同様に、データ構造指向のワークフローがある場合、`Combine`といくつかの他のヘルパーだけを実装できます。たとえば、以下はリストビルダークラスの最小限の実装です。

```fsharp
type ListBuilder() =

    member this.Yield(x) = [x]

    member this.For(m,f) =
        m |> List.collect f

    member this.Combine (a,b) = 
        List.concat [a;b]

    member this.Delay(f) = f()

// ワークフローのインスタンスを作成                
let listbuilder = new ListBuilder()
```

最小限の実装でも、次のようなコードを書くことができます。

```fsharp
listbuilder { 
    yield 1
    yield 2
    } |> printfn "結果: %A" 

listbuilder { 
    for i in [1..5] do yield i + 2
    yield 42
    } |> printfn "結果: %A" 
```


## スタンドアロンの"Combine"関数

前回の投稿で、"bind"関数がしばしばスタンドアロン関数として使用され、通常`>>=`演算子が与えられることを見ました。

`Combine`関数も、しばしばスタンドアロン関数として使用されます。bindとは異なり、標準的な記号はありません -- combineの動作に応じて異なる場合があります。

対称的な結合操作はしばしば`++`や`<+>`と書かれます。
そして、先ほどオプションに使用した「左優先」の結合（つまり、最初の式が失敗した場合にのみ2番目の式を実行する）は、ときに`<++`と書かれます。

以下は、辞書検索の例で使用したオプションのスタンドアロンの左優先結合の例です。

```fsharp
module StandaloneCombine = 

    let combine a b = 
        match a with
        | Some _ -> a  // aが成功 -- aを使う
        | None -> b    // aが失敗 -- bを使う

    // 中置バージョンを作成
    let ( <++ ) = combine

    let map1 = [ ("1","One"); ("2","Two") ] |> Map.ofList
    let map2 = [ ("A","Alice"); ("B","Bob") ] |> Map.ofList

    let result = 
        (map1.TryFind "A") 
        <++ (map1.TryFind "B")
        <++ (map2.TryFind "A")
        <++ (map2.TryFind "B")
        |> printfn "オプションの加算結果: %A"
```


## まとめ 

この投稿で`Combine`について学んだことは何でしょうか？

* コンピュテーション式で複数のラップされた値を組み合わせたり「加算」したりする必要がある場合、`Combine`（と`Delay`）を実装する必要があります。
* `Combine`は値を対ごとに、最後から最初へと組み合わせます。
* すべてのケースで機能する`Combine`の普遍的な実装はありません -- ワークフローの特定のニーズに応じてカスタマイズする必要があります。
* `Combine`と`Zero`を関連づける合理的なルールがあります。
* `Combine`の実装に`Bind`は必要ありません。
* `Combine`はスタンドアロン関数として公開できます。

次の投稿では、内部式がいつ正確に評価されるかを制御するロジックを追加し、真の短絡評価と遅延評価を導入します。