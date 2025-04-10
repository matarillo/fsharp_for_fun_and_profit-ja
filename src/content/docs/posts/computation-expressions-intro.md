---
layout: post
title: "コンピュテーション式：入門編"
description: "謎を解き明かす"
nav: thinking-functionally
seriesId: "Computation Expressions"
seriesOrder: 1
---

多くの要望に応え、コンピュテーション式の謎について語る時が来ました。コンピュテーション式とは何か、実践でどのように役立つかを説明します（そして、[禁止されたm-word](https://fsharpforfunandprofit.com/about/#forbidden-words)の使用は避けるよう努めます）。

このシリーズでは、コンピュテーション式とは何か、独自のコンピュテーション式の作り方、そしてコンピュテーション式に関する一般的なパターンについて学びます。その過程で、継続、bind関数、ラッパー型などについても見ていきます。

## 背景

コンピュテーション式は、難解で理解しにくいという評判があるようです。

一方で、使うのは簡単です。F#コードをある程度書いた人なら、`seq{...}`や`async{...}`のような標準的なコンピュテーション式を使ったことがあるでしょう。

では、新しいコンピュテーション式をどのように作るのでしょうか？舞台裏ではどのように動いているのでしょうか？

残念ながら、多くの説明がかえって混乱を招いているようです。ある種の心理的な壁を越える必要があるようです。
一度その壁を越えてしまえば全てが明らかになりますが、こちら側にいる人にとっては、依然として不可解です。

[公式のMicrosoft Learnドキュメント](https://learn.microsoft.com/ja-jp/dotnet/fsharp/language-reference/computation-expressions)を参考にしても、明確ではありますが、初心者にはあまり役立ちません。

たとえば、コンピュテーション式内で次のようなコードを見かけたとき、

```fsharp
{| let! pattern = expr in cexpr |}
```

これは単に次のメソッド呼び出しの糖衣構文だと説明しています。

```fsharp
builder.Bind(expr, (fun pattern -> {| cexpr |}))
```

しかし...これは正確には何を意味するのでしょうか？

このシリーズの終わりまでに、上記のドキュメントが明白になることを願っています。信じられませんか？続けて読んでみてください！

## 実践でのコンピュテーション式

コンピュテーション式のメカニズムに入る前に、コンピュテーション式を使う前と後のコードを比較した簡単な例をいくつか見てみましょう。

まずは簡単な例から始めましょう。コードがあり、各ステップをログに記録したいとします。そこで、小さなログ関数を定義し、値が作成されるたびにそれを呼び出します。

```fsharp
let log p = printfn "expression is %A" p

let loggedWorkflow = 
    let x = 42
    log x
    let y = 43
    log y
    let z = x + y
    log z
    //return
    z
```

これを実行すると、次の出力が表示されます。

```text
expression is 42
expression is 43
expression is 85
```

簡単ですね。

しかし、毎回全てのログステートメントを明示的に書くのは面倒です。これを隠す方法はないでしょうか？

そう尋ねてくれてありがとうございます...コンピュテーション式はまさにそれができます。以下は全く同じことを行うコンピュテーション式です。

まず、`LoggingBuilder`という新しい型を定義します。

```fsharp
type LoggingBuilder() =
    let log p = printfn "expression is %A" p

    member this.Bind(x, f) = 
        log x
        f x

    member this.Return(x) = 
        x
```

*謎めいた`Bind`と`Return`が何のためにあるのかはまだ気にしないでください。すぐに説明します。*

次に、この型のインスタンス（この場合は`logger`）を作成します。

```fsharp
let logger = new LoggingBuilder()
```

これで`logger`値を使って、元のロギング例を次のように書き直せます。

```fsharp
let loggedWorkflow = 
    logger
        {
        let! x = 42
        let! y = 43
        let! z = x + y
        return z
        }
```

これを実行すると、全く同じ出力が得られますが、`logger{...}`ワークフローを使うことで繰り返しのコードを隠せたことがわかります。

### 安全な除算

次に、古典的な例を見てみましょう。

一連の数字を次々に割っていきたいとします。ただし、その中のひとつがゼロかもしれません。どう処理すればいいでしょうか？例外を投げるのは美しくありません。`option`型を使うのが良さそうです。

まず、除算を行い`int option`を返すヘルパー関数を作る必要があります。
全てうまくいけば`Some`を、除算が失敗すれば`None`を返します。

そして、除算を連鎖させ、各除算後に失敗したかどうかをテストし、成功した場合のみ続行します。

まずはヘルパー関数、そしてメインのワークフローを見てみましょう。

```fsharp
let divideBy bottom top =
    if bottom = 0
    then None
    else Some(top/bottom)
```

パラメータリストで除数を先に置いていることに注意してください。これにより`12 |> divideBy 3`のような式が書けるので、連鎖が容易になります。

では、使ってみましょう。これは開始数を3回除算しようとするワークフローです。

```fsharp
let divideByWorkflow init x y z = 
    let a = init |> divideBy x
    match a with
    | None -> None  // 諦める
    | Some a' ->    // 続行
        let b = a' |> divideBy y
        match b with
        | None -> None  // 諦める
        | Some b' ->    // 続行
            let c = b' |> divideBy z
            match c with
            | None -> None  // 諦める
            | Some c' ->    // 続行
                //return 
                Some c'
```

使用例はこうです。

```fsharp
let good = divideByWorkflow 12 3 2 1
let bad = divideByWorkflow 12 3 0 1
```

`bad`ワークフローは3番目のステップで失敗し、全体で`None`を返します。

ここで非常に重要な点は、*ワークフロー全体*も`int option`を返さなければならないということです。単なる`int`を返すことはできません。なぜなら、失敗した場合にどう評価すればよいでしょうか？
そして、ワークフロー「内部」で使用した型（この場合はoption型）が、最終的に出力される型と同じでなければならないことがわかります。この点を覚えておいてください。後でまた出てきます。

とにかく、この継続的なテストと分岐は本当に醜いですね！コンピュテーション式に変えると改善されるでしょうか？

再び新しい型（`MaybeBuilder`）を定義し、その型のインスタンス（`maybe`）を作成します。

```fsharp
type MaybeBuilder() =

    member this.Bind(x, f) = 
        match x with
        | None -> None
        | Some a -> f a

    member this.Return(x) = 
        Some x
   
let maybe = new MaybeBuilder()
```

これを`MaybeBuilder`と呼んでいるのは`divideByBuilder`ではなく、option型をこのようにコンピュテーション式で扱う問題が一般的で、`maybe`がこれの標準的な名前だからです。

`maybe`ワークフローを定義したので、元のコードを書き直してみましょう。

```fsharp
let divideByWorkflow init x y z = 
    maybe 
        {
        let! a = init |> divideBy x
        let! b = a |> divideBy y
        let! c = b |> divideBy z
        return c
        }    
```

ずっと、ずっと良くなりました。`maybe`式が分岐ロジックを完全に隠しています！

テストすると、前と同じ結果が得られます。

```fsharp
let good = divideByWorkflow 12 3 2 1
let bad = divideByWorkflow 12 3 0 1
```


### "or else"テストの連鎖

前の「除算」の例では、各ステップが成功した場合にのみ続行したいと考えました。

しかし、逆の場合もあります。時には、一連の「or else」テストに制御の流れが依存することがあります。一つのことを試し、それが成功すれば完了です。失敗した場合は別のことを試し、それも失敗したら第三のことを試す、といった具合です。

簡単な例を見てみましょう。3つの辞書があり、キーに対応する値を見つけたいとします。各検索は成功するか失敗する可能性があるので、検索を一連の流れでつなげる必要があります。

```fsharp
let map1 = [ ("1","One"); ("2","Two") ] |> Map.ofList
let map2 = [ ("A","Alice"); ("B","Bob") ] |> Map.ofList
let map3 = [ ("CA","California"); ("NY","New York") ] |> Map.ofList

let multiLookup key =
    match map1.TryFind key with
    | Some result1 -> Some result1   // 成功
    | None ->   // 失敗
        match map2.TryFind key with
        | Some result2 -> Some result2 // 成功
        | None ->   // 失敗
            match map3.TryFind key with
            | Some result3 -> Some result3  // 成功
            | None -> None // 失敗
```

F#では全てが式なので、早期リターンはできません。全てのテストを積み重ねて一つの式にする必要があります。
                
使用例はこのようになります。

```fsharp
multiLookup "A" |> printfn "Result for A is %A" 
multiLookup "CA" |> printfn "Result for CA is %A" 
multiLookup "X" |> printfn "Result for X is %A" 
```

うまく動作しますが、簡略化できるでしょうか？

もちろんできます。こちらは「or else」ビルダーで、このような検索を簡略化できます。

```fsharp
type OrElseBuilder() =
    member this.ReturnFrom(x) = x
    member this.Combine (a,b) = 
        match a with
        | Some _ -> a  // aが成功 - aを使用
        | None -> b    // aが失敗 - 代わりにbを使用
    member this.Delay(f) = f()

let orElse = new OrElseBuilder()
```

検索コードをこのように変更できます。

```fsharp
let map1 = [ ("1","One"); ("2","Two") ] |> Map.ofList
let map2 = [ ("A","Alice"); ("B","Bob") ] |> Map.ofList
let map3 = [ ("CA","California"); ("NY","New York") ] |> Map.ofList

let multiLookup key = orElse {
    return! map1.TryFind key
    return! map2.TryFind key
    return! map3.TryFind key
    }
```

予想通り動作することを確認できます。

```fsharp
multiLookup "A" |> printfn "Result for A is %A" 
multiLookup "CA" |> printfn "Result for CA is %A" 
multiLookup "X" |> printfn "Result for X is %A" 
```

### コールバックを使用した非同期呼び出し

最後に、コールバックを見てみましょう。.NETで非同期操作を行う標準的なアプローチは、非同期操作が完了したときに呼び出される[AsyncCallbackデリゲート](https://learn.microsoft.com/ja-jp/dotnet/standard/asynchronous-programming-patterns/using-an-asynccallback-delegate-to-end-an-asynchronous-operation)を使用することです。

これは、このテクニックを使用してWebページをダウンロードする例です。

```fsharp
open System.Net
let req1 = HttpWebRequest.Create("https://tryfsharp.org")
let req2 = HttpWebRequest.Create("https://google.com")
let req3 = HttpWebRequest.Create("https://bing.com")

req1.BeginGetResponse((fun r1 -> 
    use resp1 = req1.EndGetResponse(r1)
    printfn "Downloaded %O" resp1.ResponseUri

    req2.BeginGetResponse((fun r2 -> 
        use resp2 = req2.EndGetResponse(r2)
        printfn "Downloaded %O" resp2.ResponseUri

        req3.BeginGetResponse((fun r3 -> 
            use resp3 = req3.EndGetResponse(r3)
            printfn "Downloaded %O" resp3.ResponseUri

            ),null) |> ignore
        ),null) |> ignore
    ),null) |> ignore
```

`BeginGetResponse`と`EndGetResponse`への多くの呼び出し、そしてネストされたラムダの使用により、これは非常に理解しづらくなっています。重要なコード（この場合は単なるprint文）がコールバックロジックに埋もれています。

実際、この階段状のアプローチの管理は、コールバックの連鎖を必要とするコードでは常に問題です。これは「[運命のピラミッド](https://raynos.github.io/presentation/shower/controlflow.htm?full#PyramidOfDoom)」とさえ呼ばれています（ただし、[どの解決策もあまりエレガントではありません](https://web.archive.org/web/20170609232359/http://adamghill.com/callbacks-considered-a-smell/)、個人的な意見ですが）。

もちろん、F#ではこのような種類のコードは決して書きません。F#には`async`コンピュテーション式が組み込まれており、ロジックを簡略化し、コードをフラット化します。

```fsharp
open System.Net
let req1 = HttpWebRequest.Create("http://tryfsharp.org")
let req2 = HttpWebRequest.Create("http://google.com")
let req3 = HttpWebRequest.Create("http://bing.com")

async {
    use! resp1 = req1.AsyncGetResponse()  
    printfn "Downloaded %O" resp1.ResponseUri

    use! resp2 = req2.AsyncGetResponse()  
    printfn "Downloaded %O" resp2.ResponseUri

    use! resp3 = req3.AsyncGetResponse()  
    printfn "Downloaded %O" resp3.ResponseUri

    } |> Async.RunSynchronously
```

`async`ワークフローがどのように実装されているかは、このシリーズの後半で詳しく見ていきます。

## まとめ

これで、コンピュテーション式の非常に簡単な例について、「使用前」と「使用後」を見てきました。
これらはコンピュテーション式が役立つ問題の種類を十分に代表しています。

* ロギングの例では、各ステップの間に副作用を実行したいと考えました。
* 安全な除算の例では、エラーを優雅に処理し、ハッピーパスに集中したいと考えました。
* 複数の辞書検索の例では、最初の成功で早期リターンしたいと考えました。
* 最後に、非同期の例では、コールバックを隠し、「運命のピラミッド」を避けたいと考えました。

全ての場合に共通しているのは、コンピュテーション式が各式の間で「舞台裏で何かをしている」ということです。

悪い例えかもしれませんが、コンピュテーション式はSVNやgitのポストコミットフック、あるいは更新のたびに呼び出されるデータベーストリガーのようなものと考えることができます。
実際、コンピュテーション式とはそれだけのものです。*バックグラウンド*で呼び出される独自のコードをこっそり挿入することを可能にし、それによってフォアグラウンドの重要なコードに集中できるようにするものです。

なぜ「コンピュテーション式」と呼ばれるのでしょうか？明らかに何らかの式なので、そこについては明白です。F#チームは当初、「各letの間でバックグラウンドで何かをする式」と呼びたかったようですが、人々には少し扱いにくいと考えたのか、代わりに短い名前「コンピュテーション式」に落ち着きました。

そして、「コンピュテーション式」と「ワークフロー」の違いについて、私は`{...}`と`let!`構文を指して*「コンピュテーション式」*という言葉を使い、*「ワークフロー」*は適切な場合の特定の実装のために予約しています。全てのコンピュテーション式の実装がワークフローというわけではありません。たとえば、「非同期ワークフロー」や「maybeワークフロー」について話すのは適切ですが、「seqワークフロー」とは言いません。

言い換えれば、次のコードでは、`maybe`が使用しているワークフローであり、`{ let! a = .... return c }`という特定のコードの塊がコンピュテーション式だと言えます。

```fsharp
maybe 
    {
    let! a = x |> divideBy y 
    let! b = a |> divideBy w
    let! c = b |> divideBy z
    return c
    }    
```

これで独自のコンピュテーション式を作り始めたくなったかもしれませんが、まず継続について少し回り道をする必要があります。それが次の話題です。


*2015-01-11 追記：「状態」コンピュテーション式を使用したカウントの例を削除しました。混乱を招き、主要な概念から注意をそらしていたためです。*