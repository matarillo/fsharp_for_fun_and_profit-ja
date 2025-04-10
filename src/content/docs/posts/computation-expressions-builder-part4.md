---
layout: post
title: "ビルダーの実装：オーバーロード"
description: "メソッドの奇妙な技"
nav: thinking-functionally
seriesId: "コンピュテーション式"
seriesOrder: 9
---

この記事では寄り道して、コンピュテーション式ビルダーのメソッドでできるいくつかの技を見ていきます。

最終的に、この回り道は行き止まりに終わるでしょう。しかし、この道のりの中で、独自のコンピュテーション式を設計するためのより良い方法について、新たな気づきが得られることを期待しています。

## 洞察：ビルダーメソッドはオーバーロードできる

ある時点で、こんな洞察を得るかもしれません。

* ビルダーメソッドは普通のクラスメソッドです。スタンドアロンの関数とは違い、メソッドは[異なるパラメータ型でのオーバーロード](../posts/type-extensions.md#method-overloading)をサポートします。つまり、パラメータの型が異なる限り、任意のメソッドに対して*異なる実装*を作れるのです。

そして、これをどう活用できるだろうかと興奮するかもしれません。しかし、実際には思ったほど役立たないことがわかります。いくつか例を見てみましょう。

## "return"のオーバーロード

ユニオン型があるとします。各ユニオンケースに対して複数の実装で`Return`や`Yield`をオーバーロードすることを考えるかもしれません。

たとえば、`Return`に2つのオーバーロードがある非常に簡単な例を示します。

```fsharp
type SuccessOrError = 
| Success of int
| Error of string

type SuccessOrErrorBuilder() =
    
    member this.Bind(m, f) = 
        match m with
        | Success s -> f s
        | Error _ -> m

    /// intを受け入れるようにオーバーロード
    member this.Return(x:int) = 
        printfn "Return a success %i" x
        Success x

    /// stringを受け入れるようにオーバーロード
    member this.Return(x:string) = 
        printfn "Return an error %s" x
        Error x

// ワークフローのインスタンスを作成               
let successOrError = new SuccessOrErrorBuilder()

```

これを使用すると次のようになります。

```fsharp
successOrError { 
    return 42
    } |> printfn "Result for success: %A" 
// Result for success: Success 42

successOrError { 
    return "error for step 1"
    } |> printfn "Result for error: %A" 
//Result for error: Error "error for step 1"    
```

これに何の問題があるのでしょうか？

まず、[ラッパー型に関する議論](../posts/computation-expressions-wrapper-types-part2.md)に戻ると、ラッパー型は*ジェネリック*であるべきだと指摘しました。ワークフローは可能な限り再利用可能であるべきです。なぜ実装を特定のプリミティブ型に縛る必要があるのでしょうか？

この場合、ユニオン型を次のように再設計する必要があります。

```fsharp
type SuccessOrError<'a,'b> = 
| Success of 'a
| Error of 'b
```

しかし、ジェネリックの結果として、`Return`メソッドはもはやオーバーロードできなくなります！

第二に、内部の型を式の中で露出させるのは良くない考えかもしれません。「成功」と「失敗」のケースという概念は有用ですが、より良い方法は「失敗」ケースを隠し、`Bind`の中で自動的に処理することです。次のようにします。

```fsharp
type SuccessOrError<'a,'b> = 
| Success of 'a
| Error of 'b

type SuccessOrErrorBuilder() =
    
    member this.Bind(m, f) = 
        match m with
        | Success s -> 
            try
                f s
            with
            | e -> Error e.Message
        | Error _ -> m

    member this.Return(x) = 
        Success x

// ワークフローのインスタンスを作成               
let successOrError = new SuccessOrErrorBuilder()
```

このアプローチでは、`Return`は成功の場合にのみ使用され、失敗のケースは隠されます。

```fsharp
successOrError { 
    return 42
    } |> printfn "Result for success: %A" 

successOrError { 
    let! x = Success 1
    return x/0
    } |> printfn "Result for error: %A" 
```

この技法についてはこの後の記事でさらに詳しく見ていきます。

## 複数のCombine実装

メソッドをオーバーロードしたくなるもう一つのケースは、`Combine`を実装するときです。

`trace`ワークフローの`Combine`メソッドを再考してみましょう。以前の`Combine`の実装では、単に数字を足し合わせていました。

しかし、要件を変更して次のようにしたらどうでしょうか。

* `trace`ワークフローで複数の値をyieldする場合、それらをリストに結合したい。

`combine`を使用した最初の試みは次のようになるでしょう。

```fsharp
member this.Combine (a,b) = 
    match a,b with
    | Some a', Some b' ->
        printfn "combining %A and %A" a' b' 
        Some [a';b']
    | Some a', None ->
        printfn "combining %A with None" a' 
        Some [a']
    | None, Some b' ->
        printfn "combining None with %A" b' 
        Some [b']
    | None, None ->
        printfn "combining None with None"
        None
```

`Combine`メソッドでは、渡されたオプションから値を取り出し、それらをリストに結合して`Some`でラップします（例：`Some [a';b']`）。

2つのyieldの場合、期待通りに動作します。

```fsharp
trace { 
    yield 1
    yield 2
    } |> printfn "Result for yield then yield: %A" 
   
// Result for yield then yield: Some [1; 2]
```

`None`をyieldする場合も、期待通りに動作します。

```fsharp
trace { 
    yield 1
    yield! None
    } |> printfn "Result for yield then None: %A" 

// Result for yield then None: Some [1]
```

しかし、*3つの*値を結合する場合はどうなるでしょうか？次のような場合です。

```fsharp
trace { 
    yield 1
    yield 2
    yield 3
    } |> printfn "Result for yield x 3: %A" 
```

これを試すと、コンパイラエラーが発生します。

```text
error FS0001: Type mismatch. Expecting a
    int option    
but given a
    'a list option    
The type 'int' does not match the type ''a list'        
```
        
問題は何でしょうか？

答えは、2番目と3番目の値（`yield 2; yield 3`）を結合した後、*整数のリスト*を含むオプション、つまり`int list option`が得られることです。エラーは1番目の値（`Some 1`）と結合された値（`Some [2;3]`）を結合しようとしたときに発生します。つまり、`Combine`の2番目のパラメータに`int list option`を渡していますが、1番目のパラメータは通常の`int option`のままです。コンパイラは2番目のパラメータが1番目と同じ型であることを要求しています。

ここで、オーバーロードの技を使いたくなるかもしれません。2番目のパラメータの型が異なる`Combine`の*2つの異なる実装*を作成できます。1つは`int option`を受け取り、もう1つは`int list option`を受け取ります。

以下は、異なるパラメータ型を持つ2つのメソッドです。

```fsharp
/// リストオプションと結合
member this.Combine (a, listOption) = 
    match a,listOption with
    | Some a', Some list ->
        printfn "combining %A and %A" a' list 
        Some ([a'] @ list)
    | Some a', None ->
        printfn "combining %A with None" a'
        Some [a']
    | None, Some list ->
        printfn "combining None with %A" list
        Some list
    | None, None ->
        printfn "combining None with None"
        None

/// リストでないオプションと結合
member this.Combine (a,b) = 
    match a,b with
    | Some a', Some b' ->
        printfn "combining %A and %A" a' b' 
        Some [a';b']
    | Some a', None ->
        printfn "combining %A with None" a' 
        Some [a']
    | None, Some b' ->
        printfn "combining None with %A" b' 
        Some [b']
    | None, None ->
        printfn "combining None with None"
        None
```

これで、前述の3つの結果を結合すると、期待通りの結果が得られます。

```fsharp
trace { 
    yield 1
    yield 2
    yield 3
    } |> printfn "Result for yield x 3: %A" 

// Result for yield x 3: Some [1; 2; 3]    
```

残念ながら、この技は以前のコードを壊してしまいました！今`None`をyieldしようとすると、コンパイラエラーが発生します。

```fsharp
trace { 
    yield 1
    yield! None
    } |> printfn "Result for yield then None: %A" 
```

エラーは次のようになります。

```text
error FS0041: A unique overload for method 'Combine' could not be determined based on type information prior to this program point. A type annotation may be needed. 
```

しかし、イライラする前に、コンパイラの立場で考えてみてください。あなたがコンパイラで、`None`が与えられたら、*どちらの*メソッドを呼び出しますか？

正解はありません。なぜなら、`None`は*どちらの*メソッドの2番目のパラメータとしても渡せるからです。コンパイラは、これが`int list option`型の`None`（1番目のメソッド）なのか、`int option`型の`None`（2番目のメソッド）なのかわかりません。

コンパイラが言う通り、型注釈が役立ちます。`None`を`int option`型に強制してみましょう。

```fsharp
trace { 
    yield 1
    let x:int option = None
    yield! x
    } |> printfn "Result for yield then None: %A" 
```

これは確かに醜いですが、実際にはあまり頻繁には起こらないかもしれません。

より重要なのは、これは設計のまずさを示す手がかりだということです。このコンピュテーション式は、時に`'a option`を返し、時に`'a list option`を返します。設計では一貫性を保つべきですから、`yield`の数に関わらず、コンピュテーション式が*常に同じ*型を返すようにする必要があります。

つまり、複数の`yield`を許可したい場合は、最初から単なるオプションではなく`'a list option`をラッパー型として使うべきです。この場合、`Yield`メソッドがリストオプションを作成し、`Combine`メソッドは再び単一のメソッドに統合できます。

以下は3番目のバージョンのコードです。

```fsharp
type TraceBuilder() =
    member this.Bind(m, f) = 
        match m with 
        | None -> 
            printfn "Binding with None. Exiting."
        | Some a -> 
            printfn "Binding with Some(%A). Continuing" a
        Option.bind f m

    member this.Zero() = 
        printfn "Zero"
        None

    member this.Yield(x) = 
        printfn "Yield an unwrapped %A as a list option" x
        Some [x]

    member this.YieldFrom(m) = 
        printfn "Yield an option (%A) directly" m
        m

    member this.Combine (a, b) = 
        match a,b with
        | Some a', Some b' ->
            printfn "combining %A and %A" a' b'
            Some (a' @ b')
        | Some a', None ->
            printfn "combining %A with None" a'
            Some a'
        | None, Some b' ->
            printfn "combining None with %A" b'
            Some b'
        | None, None ->
            printfn "combining None with None"
            None

    member this.Delay(f) = 
        printfn "Delay"
        f()

// ワークフローのインスタンスを作成              
let trace = new TraceBuilder()
```

これで、サンプルのコードは特別な工夫なしに期待通りに動作します。

```fsharp
trace { 
    yield 1
    yield 2
    } |> printfn "Result for yield then yield: %A" 

// Result for yield then yield: Some [1; 2]

trace { 
    yield 1
    yield 2
    yield 3
    } |> printfn "Result for yield x 3: %A" 

// Result for yield x 3: Some [1; 2; 3]
    
trace { 
    yield 1
    yield! None
    } |> printfn "Result for yield then None: %A" 

// Result for yield then None: Some [1]
```

コードがよりクリーンになっただけでなく、`Return`の例と同様に、特定の型（`int option`）からよりジェネリックな型（`'a option`）へと、コードをよりジェネリックにしました。

## "For"のオーバーロード

オーバーロードが必要になる正当なケースの1つは`For`メソッドです。考えられる理由としては：

* さまざまな種類のコレクション（例：リスト*と*`IEnumerable`）をサポートしたい場合
* 特定の種類のコレクションに対して、より効率的なループ実装がある場合
* リストの「ラップされた」バージョン（例：LazyList）があり、ラップされていない値とラップされた値の両方でループをサポートしたい場合

以下は、シーケンスもサポートするように拡張されたリストビルダーの例です。

```fsharp
type ListBuilder() =
    member this.Bind(m, f) = 
        m |> List.collect f

    member this.Yield(x) = 
        printfn "Yield an unwrapped %A as a list" x
        [x]

    member this.For(m,f) =
        printfn "For %A" m
        this.Bind(m,f)

    member this.For(m:_ seq,f) =
        printfn "For %A using seq" m
        let m2 = List.ofSeq m
        this.Bind(m2,f)

// ワークフローのインスタンスを作成            
let listbuilder = new ListBuilder()
```

使用例は以下のとおりです。

```fsharp
listbuilder { 
    let list = [1..10]
    for i in list do yield i
    } |> printfn "Result for list: %A" 

listbuilder { 
    let s = seq {1..10}
    for i in s do yield i
    } |> printfn "Result for seq : %A" 
```

2つ目の`For`メソッドをコメントアウトすると、「シーケンス」の例がコンパイルに失敗することがわかります。つまり、オーバーロードが必要なのです。

## まとめ

メソッドは必要に応じてオーバーロードできますが、考えなしにこの解決策に飛びつかないよう注意が必要です。オーバーロードが必要になることは、設計が良くないサインかもしれません。

次の記事では、式が評価されるタイミングを正確に制御する話に戻ります。今度はビルダーの*外部*で遅延を使用します。
