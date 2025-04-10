---
layout: post
title: "ビルダーの実装：残りの標準メソッド"
description: "While、Using、例外処理の実装"
nav: thinking-functionally
seriesId: "コンピュテーション式"
seriesOrder: 11
---

いよいよ最終段階に入りました。実装すべきビルダーメソッドはあと少しです。これらを押さえれば、どんな課題にも取り組む準備が整います。

残りのメソッドは以下の通りです。

* 繰り返しのための `While`
* 例外処理のための `TryWith` と `TryFinally`
* 破棄可能なリソースを管理するための `Use`

覚えておいてほしいのは、すべてのメソッドを実装する必要はないということです。`While`が不要なら、無視して構いません。

始める前に重要な注意点があります。**ここで説明するすべてのメソッドは[遅延](../posts/computation-expressions-builder-part3.html)を使っています**。遅延関数を使っていない場合、これらのメソッドは期待通りの結果を生みません。

## "While"の実装

通常のコードでの"while"の意味は知っていますが、コンピュテーション式の文脈では何を意味するのでしょうか？
理解するには、継続の概念に立ち返る必要があります。

以前の記事で、一連の式が次のような継続のチェーンに変換されることを見ました。

```fsharp
Bind(1,fun x -> 
   Bind(2,fun y -> 
     Bind(x + y,fun z -> 
        Return(z)  // または Yield
```

これが"while"ループを理解するカギです。同じ方法で展開できるのです。

まず、用語を確認しましょう。whileループには2つの部分があります。

* "while"ループの先頭にある判定部分。本体を実行すべきかどうかを決めるため、毎回評価されます。falseと評価されると、whileループは「終了」します。コンピュテーション式では、この判定部分を**「ガード」**と呼びます。
  判定関数にパラメータはなく、boolを返します。つまり、シグネチャは当然`unit -> bool`です。
* whileループの本体部分。判定が失敗するまで毎回評価されます。コンピュテーション式では、これはラップされた値を評価する遅延関数です。whileループの本体は常に同じなので、同じ関数が毎回評価されます。
  本体関数にはパラメータがなく、何も返しません。そのため、シグネチャは単に`unit -> wrapped unit`です。

これを踏まえて、継続を使ったwhileループの疑似コードを作成できます。

```fsharp
// 判定関数を評価
let bool = guard()  
if not bool 
then
    // ループを抜ける
    return 何を？？
else
    // 本体関数を評価
    body()         
   
    // whileループの先頭に戻る
    
    // 再度判定関数を評価
    let bool' = guard()  
    if not bool' 
    then
        // ループを抜ける
        return 何を？？
    else 
        // 再度本体関数を評価
        body()         
        
        // whileループの先頭に戻る
        
        // 3回目の判定関数評価
        let bool'' = guard()  
        if not bool'' 
        then
            // ループを抜ける
            return 何を？？
        else
            // 3回目の本体関数評価
            body()         
            
            // 以下繰り返し
```

すぐに気づく疑問は、whileループの判定が失敗したとき何を返すべきかということです。これは`if..then..`で見た状況と同じで、答えはもちろん`Zero`値を使うことです。

次に、`body()`の結果が捨てられています。確かにunit関数なので返す値はありませんが、それでも式の中では、裏で動作を追加できるようにしたいものです。そして当然、これには`Bind`関数を使います。

ここで、`Zero`と`Bind`を使った改訂版の疑似コードを示します。

```fsharp
// 判定関数を評価
let bool = guard()  
if not bool 
then
    // ループを抜ける
    return Zero
else
    // 本体関数を評価
    Bind( body(), fun () ->  
       
        // 再度判定関数を評価
        let bool' = guard()  
        if not bool' 
        then
            // ループを抜ける
            return Zero
        else 
            // 再度本体関数を評価
            Bind( body(), fun () ->  
            
                // 3回目の判定関数評価
                let bool'' = guard()  
                if not bool'' 
                then
                    // ループを抜ける
                    return Zero
                else
                    // 再度本体関数を評価
                    Bind( body(), fun () ->  
                    
                    // 以下繰り返し
```

この場合、`Bind`に渡される継続関数はunitパラメータを持ちます。`body`関数が値を持たないからです。

最後に、疑似コードを次のような再帰関数に縮約できます。

```fsharp
member this.While(guard, body) =
    // 判定関数を評価
    if not (guard()) 
    then 
        // ループを抜ける
        this.Zero() 
    else
        // 本体関数を評価
        this.Bind( body(), fun () -> 
            // 再帰的に呼び出す
            this.While(guard, body))  
```

実際、これがほとんどすべてのビルダークラスで使われる標準的な「定型の」`While`実装です。

微妙だが重要な点として、`Zero`の値は適切に選ぶ必要があります。以前の記事で、ワークフローに応じて`Zero`の値を`None`や`Some ()`に設定できることを見ました。しかし、`While`が機能するには、`Zero`は`Some ()`でなければならず、`None`であってはいけません。`None`を`Bind`に渡すと、全体が早期に中断されてしまうからです。

また、これは再帰関数ですが、`rec`キーワードは必要ないことに注意してください。再帰的なスタンドアロン関数にのみ必要で、メソッドには必要ありません。

### "While"の使用

`trace`ビルダーでの使用例を見てみましょう。以下は`While`メソッドを含む完全なビルダークラスです。

```fsharp
type TraceBuilder() =
    member this.Bind(m, f) = 
        match m with 
        | None -> 
            printfn "Noneでバインド。終了します。"
        | Some a -> 
            printfn "Some(%A)でバインド。続行します。" a
        Option.bind f m

    member this.Return(x) = 
        Some x

    member this.ReturnFrom(x) = 
        x
        
    member this.Zero() = 
        printfn "Zero"
        this.Return ()

    member this.Delay(f) = 
        printfn "Delay"
        f

    member this.Run(f) = 
        f()

    member this.While(guard, body) =
        printfn "While: 判定"
        if not (guard()) 
        then 
            printfn "While: zero"
            this.Zero() 
        else
            printfn "While: 本体"
            this.Bind( body(), fun () -> 
                this.While(guard, body))  

// ワークフローのインスタンスを作成             
let trace = new TraceBuilder()
```

`While`のシグネチャを見ると、`body`パラメータが`unit -> unit option`、つまり遅延関数であることがわかります。上述の通り、`Delay`を適切に実装していないと、予期せぬ動作や難解なコンパイラエラーが発生します。

```fsharp
type TraceBuilder =
    // 他のメンバー
    member
      While : guard:(unit -> bool) * body:(unit -> unit option) -> unit option

```

以下は、毎回増加する可変値を使った簡単なループの例です。

```fsharp
let mutable i = 1
let test() = i < 5
let inc() = i <- i + 1

let m = trace { 
    while test() do
        printfn "i は %i です" i
        inc() 
    } 
```

## "try..with"による例外処理

例外処理も同様の方法で実装します。

たとえば`try..with`式を見ると、2つの部分があります。

* "try"の本体部分。一度だけ評価されます。コンピュテーション式では、これはラップされた値を評価する遅延関数になります。本体関数にパラメータはないので、シグネチャは単に`unit -> wrapped type`です。
* "with"部分は例外を処理します。例外をパラメータとして受け取り、"try"部分と同じ型を返すので、シグネチャは`exception -> wrapped type`です。

これを踏まえて、例外ハンドラの疑似コードを作成できます。

```fsharp
try
    let wrapped = delayedBody()  
    wrapped  // ラップされた値を返す
with
| e -> handlerPart e
```

これは標準的な実装に直接マッピングされます。

```fsharp
member this.TryWith(body, handler) =
    try 
        printfn "TryWith 本体"
        this.ReturnFrom(body())
    with 
        e ->
            printfn "TryWith 例外処理"
            handler e
```

見てのとおり、返される値を`ReturnFrom`を通して渡すのが一般的です。これにより、他のラップされた値と同じ扱いを受けます。

処理の仕組みをテストするための簡単なスニペットを示します。

```fsharp
trace { 
    try
        failwith "バン"
    with
    | e -> printfn "例外発生！ %s" e.Message
    } |> printfn "結果 %A"
```


## "try..finally"の実装

`try..finally`は`try..with`とよく似ています。

* "try"の本体部分。一度だけ評価されます。本体関数にパラメータはないので、シグネチャは`unit -> wrapped type`です。
* "finally"部分は常に呼び出されます。パラメータはなく、unitを返すので、シグネチャは`unit -> unit`です。

`try..with`と同様に、標準的な実装は明白です。

```fsharp
member this.TryFinally(body, compensation) =
    try 
        printfn "TryFinally 本体"
        this.ReturnFrom(body())
    finally 
        printfn "TryFinally 補償"
        compensation() 
```

もう一つの簡単なスニペットです。

```fsharp
trace { 
    try
        failwith "バン"
    finally
        printfn "OK" 
    } |> printfn "結果 %A"
```

## "Using"の実装

最後に実装するメソッドは`Using`です。これは`use!`キーワードを実装するビルダーメソッドです。

Microsoft Learnのドキュメントには`use!`について次のように書かれています。

```text
{| use! value = expr in cexpr |} 
```

これは次のように変換されます。

```text
builder.Bind(expr, (fun value -> builder.Using(value, (fun value -> {| cexpr |} ))))
```

つまり、`use!`キーワードは`Bind`と`Using`の両方をトリガーします。まず`Bind`が行われてラップされた値を解除し、
その後、解除されたdisposableが`Using`に渡されて破棄を確実にし、2番目のパラメータとして継続関数が渡されます。

これを実装するのは簡単です。他のメソッドと同様に、"using"式の本体または継続部分があり、一度だけ評価されます。この本体関数は"disposable"パラメータを持つので、シグネチャは`#IDisposable -> wrapped type`です。

もちろん、disposable値が必ず破棄されるようにしたいので、本体関数の呼び出しを`TryFinally`でラップする必要があります。

標準的な実装は次のとおりです。

```fsharp
member this.Using(disposable:#System.IDisposable, body) =
    let body' = fun () -> body disposable
    this.TryFinally(body', fun () -> 
        match disposable with 
            | null -> () 
            | disp -> disp.Dispose())
```

注意点：

* `TryFinally`のパラメータは`unit -> wrapped`で、最初のパラメータが*unit*なので、渡される本体の遅延版を作成しました。
* Disposableはクラスなので`null`の可能性があり、その場合は特別に扱う必要があります。そうでなければ、"finally"継続で単に破棄します。

以下は`Using`の動作デモです。`makeResource`が*ラップされた*disposableを作成していることに注意してください。ラップされていなければ、特別な
`use!`は必要なく、通常の`use`で十分です。

```fsharp
let makeResource name =
    Some { 
    new System.IDisposable with
    member this.Dispose() = printfn "%s を破棄中" name
    }

trace { 
    use! x = makeResource "こんにちは"
    printfn "Disposableを使用中"
    return 1
    } |> printfn "結果：%A" 
```


## "For"の見直し

最後に、`For`の実装を見直しましょう。以前の例では、`For`は単純なリストパラメータを受け取っていました。しかし、`Using`と`While`を理解したので、任意の`IEnumerable<_>`やシーケンスを受け入れるように変更できます。

以下が`For`の現在の標準的な実装です。

```fsharp
member this.For(sequence:seq<_>, body) =
       this.Using(sequence.GetEnumerator(),fun enum -> 
            this.While(enum.MoveNext, 
                this.Delay(fun () -> body enum.Current)))
```

見てのとおり、汎用的な`IEnumerable<_>`を扱うため、以前の実装とはかなり異なります。

* `IEnumerator<_>`を明示的に使って反復します。
* `IEnumerator<_>`は`IDisposable`を実装しているので、列挙子を`Using`でラップします。
* `While .. MoveNext`を使って反復します。
* 次に、`enum.Current`を本体関数に渡します。
* 最後に、`Delay`を使って本体関数の呼び出しを遅延させます。

## トレースなしの完全なコード 

これまで、すべてのビルダーメソッドは、トレースと出力式を追加することで必要以上に複雑になっていました。トレースは何が起こっているかを理解するのに役立ちますが、
単純なメソッドを分かりにくくする可能性があります。

そこで最後のステップとして、"trace"ビルダークラスの完全なコードを見てみましょう。今回は余計なコードを一切含まないものです。コードは難解に見えるかもしれませんが、各メソッドの目的と実装はもう馴染みのあるものになっているはずです。

```fsharp
type TraceBuilder() =

    member this.Bind(m, f) = 
        Option.bind f m

    member this.Return(x) = Some x

    member this.ReturnFrom(x) = x

    member this.Yield(x) = Some x

    member this.YieldFrom(x) = x
    
    member this.Zero() = this.Return ()

    member this.Delay(f) = f

    member this.Run(f) = f()

    member this.While(guard, body) =
        if not (guard()) 
        then this.Zero() 
        else this.Bind( body(), fun () -> 
            this.While(guard, body))  

    member this.TryWith(body, handler) =
        try this.ReturnFrom(body())
        with e -> handler e

    member this.TryFinally(body, compensation) =
        try this.ReturnFrom(body())
        finally compensation() 

    member this.Using(disposable:#System.IDisposable, body) =
        let body' = fun () -> body disposable
        this.TryFinally(body', fun () -> 
            match disposable with 
                | null -> () 
                | disp -> disp.Dispose())

    member this.For(sequence:seq<_>, body) =
        this.Using(sequence.GetEnumerator(),fun enum -> 
            this.While(enum.MoveNext, 
                this.Delay(fun () -> body enum.Current)))
                
```

これまでの議論を経て、コードはとてもコンパクトになりました。それでもこのビルダーは、すべての標準メソッドを実装し、遅延関数を使っています。
わずか数行で多くの機能を実現しています！
