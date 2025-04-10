---
layout: post
title: "ビルダーの実装：遅延性の追加"
description: "ワークフローを外部から遅延させる"
nav: thinking-functionally
seriesId: "コンピュテーション式"
seriesOrder: 10
---

[以前の記事](../posts/computation-expressions-builder-part3.md)で、ワークフロー内の式を必要になるまで評価しないようにする方法を見ました。

しかし、その方法はワークフロー*内部*の式を対象としていました。では、*ワークフロー全体*を必要になるまで遅延させたい場合はどうすればよいでしょうか。

## 問題

以下は「maybe」ビルダークラスのコードです。このコードは以前の記事の`trace`ビルダーを基にしていますが、トレース処理をすべて取り除いて、シンプルにしています。

```fsharp
type MaybeBuilder() =

    member this.Bind(m, f) = 
        Option.bind f m

    member this.Return(x) = 
        Some x

    member this.ReturnFrom(x) = 
        x

    member this.Zero() = 
        None

    member this.Combine (a,b) = 
        match a with
        | Some _ -> a  // aが正常なら、bをスキップ
        | None -> b()  // aが不正なら、bを実行

    member this.Delay(f) = 
        f

    member this.Run(f) = 
        f()

// ワークフローのインスタンスを作成             
let maybe = new MaybeBuilder()
```

先に進む前に、これがどのように動作するか理解しておいてください。以前の記事の用語を使って分析すると、使われている型は次のようになります。

* ラッパー型：`'a option`
* 内部型：`'a option`
* 遅延型：`unit -> 'a option`

では、このコードをチェックして、すべてが期待通りに動作するか確認しましょう。

```fsharp
maybe { 
    printfn "パート1：1を返す直前"
    return 1
    printfn "パート2：returnの後"
    } |> printfn "パート1の結果（パート2は実行されない）：%A" 

// 結果 - 2番目の部分は評価されない    

maybe { 
    printfn "パート1：Noneを返す直前"
    return! None
    printfn "パート2：Noneの後、続行"
    } |> printfn "パート1とパート2の結果：%A" 

// 結果 - 2番目の部分は評価される    
```

しかし、コードを子ワークフローにリファクタリングした場合はどうなるでしょうか。

```fsharp
let childWorkflow = 
    maybe {printfn "子ワークフロー"} 

maybe { 
    printfn "パート1：1を返す直前"
    return 1
    return! childWorkflow 
    } |> printfn "パート1の結果（子ワークフローは実行されない）：%A" 
```

出力を見ると、子ワークフローは結局必要なかったにもかかわらず評価されています。この場合は問題ないかもしれませんが、多くの場合、これを避けたいでしょう。

では、どうすれば避けられるでしょうか。

## 内部型を遅延でラップする

明らかな方法は、*ビルダーの結果全体*を遅延関数でラップし、結果を「実行」するには単に遅延関数を評価するだけにすることです。

そこで、新しいラッパー型を次のように定義します。

```fsharp
type Maybe<'a> = Maybe of (unit -> 'a option)
```

単純な`option`をオプションを評価する関数に置き換え、その関数を[単一ケースユニオン](../posts/designing-with-types-single-case-dus.md)でラップしました。

そして、`Run`メソッドも変更する必要があります。以前は渡された遅延関数を評価していましたが、今は評価せずに新しいラッパー型でラップするだけにします。

```fsharp
// 変更前
member this.Run(f) = 
    f()

// 変更後    
member this.Run(f) = 
    Maybe f
```

*他のメソッドも1つ修正し忘れています。どのメソッドか分かりますか？すぐに気づくでしょう！*

もう1つ、結果を「実行」する方法が必要になります。

```fsharp
let run (Maybe f) = f()
```

前の例で新しい型を試してみましょう。

```fsharp
let m1 = maybe { 
    printfn "パート1：1を返す直前"
    return 1
    printfn "パート2：returnの後"
    } 
```

これを実行すると、次のような結果が得られます。

```fsharp
val m1 : Maybe<int> = Maybe <fun:m1@123-7>
```

良さそうです。他には何も出力されていません。

では、実行してみましょう。

```fsharp
run m1 |> printfn "パート1の結果（パート2は実行されない）：%A" 
```

出力は次のようになります。

```text
パート1：1を返す直前
パート1の結果（パート2は実行されない）：Some 1
```

完璧です。パート2は実行されませんでした。

しかし、次の例で問題にぶつかります。

```fsharp
let m2 = maybe { 
    printfn "パート1：Noneを返す直前"
    return! None
    printfn "パート2：Noneの後、続行"
    } 
```

おっと！`ReturnFrom`の修正を忘れていました！ご存知の通り、このメソッドは*ラップされた型*を受け取りますが、今やラップされた型を再定義しています。

修正は次のとおりです。

```fsharp
member this.ReturnFrom(Maybe f) = 
    f()
```

外部から`Maybe`を受け取り、すぐに実行してオプションを取得します。

しかし、今度は別の問題が発生します。`return! None`で明示的に`None`を返すことができなくなりました。代わりに`Maybe`型を返す必要があります。どうやってこれを作ればいいのでしょうか？

ヘルパー関数を作成して`Maybe`型を構築することもできますが、もっと簡単な方法があります。
`maybe`式を使って新しい`Maybe`型を作れるのです！

```fsharp
let m2 = maybe { 
    return! maybe {printfn "パート1：Noneを返す直前"}
    printfn "パート2：Noneの後、続行"
    } 
```

これが`Zero`メソッドが役立つ理由です。`Zero`とビルダーインスタンスがあれば、何もしない新しい型のインスタンスでも作成できます。

しかし、ここでもう一つのエラーが発生します。恐ろしい「値の制限」です。

```text
Value restriction. The value 'm2' has been inferred to have generic type
```

これが起こる理由は、*両方の*式が`None`を返しているからです。しかし、コンパイラは`None`がどの型なのか分かりません。コードは`Option<obj>`型の`None`を使っています（おそらく暗黙的なボックス化のため）が、コンパイラはその型がもっとジェネリックになり得ることを知っています。

2つの解決策があります。1つは型を明示的にすることです。

```fsharp
let m2_int: Maybe<int> = maybe { 
    return! maybe {printfn "パート1：Noneを返す直前"}
    printfn "パート2：Noneの後、続行"
    } 
```

もう1つは、単にNone以外の値を返すことです。

```fsharp
let m2 = maybe { 
    return! maybe {printfn "パート1：Noneを返す直前"}
    printfn "パート2：Noneの後、続行"
    return 1
    } 
```

これらの解決策のどちらでも問題は解決します。

例を実行すると、結果は期待通りになります。今回は2番目の部分*が*実行されます。

```fsharp
run m2 |> printfn "パート1とパート2の結果：%A" 
```

トレース出力：

```text
パート1：Noneを返す直前
パート2：Noneの後、続行
パート1とパート2の結果：Some 1
```

最後に、子ワークフローの例をもう一度試してみましょう。

```fsharp
let childWorkflow = 
    maybe {printfn "子ワークフロー"} 

let m3 = maybe { 
    printfn "パート1：1を返す直前"
    return 1
    return! childWorkflow 
    } 

run m3 |> printfn "パート1の結果（子ワークフローは実行されない）：%A" 
```

これで、望んでいた通り子ワークフローは評価されません。

そして、子ワークフローを評価する必要がある場合も、次のように動作します。

```fsharp
let m4 = maybe { 
    return! maybe {printfn "パート1：Noneを返す直前"}
    return! childWorkflow 
    } 

run m4 |> printfn "パート1と子ワークフローの結果：%A" 
```

### ビルダークラスの再確認 

新しいビルダークラスのコード全体をもう一度見てみましょう。

```fsharp
type Maybe<'a> = Maybe of (unit -> 'a option)

type MaybeBuilder() =

    member this.Bind(m, f) = 
        Option.bind f m

    member this.Return(x) = 
        Some x

    member this.ReturnFrom(Maybe f) = 
        f()

    member this.Zero() = 
        None

    member this.Combine (a,b) = 
        match a with
        | Some _' -> a    // aが正常なら、bをスキップ
        | None -> b()     // aが不正なら、bを実行

    member this.Delay(f) = 
        f

    member this.Run(f) = 
        Maybe f

// ワークフローのインスタンスを作成             
let maybe = new MaybeBuilder()

let run (Maybe f) = f()
```

以前の記事の用語を使ってこの新しいビルダーを分析すると、使用されている型は次のようになります。

* ラッパー型：`Maybe<'a>`
* 内部型：`'a option`
* 遅延型：`unit -> 'a option`

この場合、標準の`'a option`を内部型として使うのが便利でした。`Bind`や`Return`を全く変更する必要がなかったからです。

別の設計として、内部型にも`Maybe<'a>`を使うこともできます。これによりより一貫性が出ますが、コードの読みにくさが増します。

## 真の遅延性

最後の例の変形を見てみましょう。

```fsharp
let child_twice: Maybe<unit> = maybe { 
    let workflow = maybe {printfn "子ワークフロー"} 

    return! maybe {printfn "パート1：Noneを返す直前"}
    return! workflow 
    return! workflow 
    } 

run child_twice |> printfn "子ワークフローを2回実行した結果：%A" 
```
  
何が起こるでしょうか？子ワークフローは何回実行されるべきでしょうか？

上記の遅延実装では、子ワークフローが要求時にのみ評価されることは保証されますが、2回実行されるのを止めることはできません。

状況によっては、ワークフローが*最大1回*だけ実行され、その後キャッシュされる（「メモ化」される）ことを保証する必要があるかもしれません。これはF#に組み込まれている`Lazy`型を使えば簡単に実現できます。

必要な変更点は次の通りです。

* `Maybe`を変更して、遅延の代わりに`Lazy`をラップする
* `ReturnFrom`と`run`を変更して、遅延値の評価を強制する
* `Run`を変更して、`lazy`内から遅延を実行する

変更を加えた新しいクラスは次のようになります。

```fsharp
type Maybe<'a> = Maybe of Lazy<'a option>

type MaybeBuilder() =

    member this.Bind(m, f) = 
        Option.bind f m

    member this.Return(x) = 
        Some x

    member this.ReturnFrom(Maybe f) = 
        f.Force()

    member this.Zero() = 
        None

    member this.Combine (a,b) = 
        match a with
        | Some _' -> a    // aが正常なら、bをスキップ
        | None -> b()     // aが不正なら、bを実行

    member this.Delay(f) = 
        f

    member this.Run(f) = 
        Maybe (lazy f())

// ワークフローのインスタンスを作成             
let maybe = new MaybeBuilder()

let run (Maybe f) = f.Force()
```

そして、上記の「子を2回実行する」コードを動かすと、次のような結果になります。

```text
パート1：Noneを返す直前
子ワークフロー
子ワークフローを2回実行した結果：<null>
```
  
これから、子ワークフローが1回だけ実行されたことが明らかです。

## まとめ：即時 vs. 遅延 vs. 遅延評価 

このページでは、`maybe`ワークフローの3つの異なる実装を見てきました。常に即時評価される実装、遅延関数を使う実装、そしてメモ化を伴う遅延評価を使う実装です。

では... どのアプローチを使うべきでしょうか？

唯一の「正解」はありません。選択は以下のような要因に依存します。

* *式内のコードの実行コストが低く、重要な副作用がないなら？* この場合は、最初の即時バージョンを使いましょう。単純で理解しやすく、ほとんどの`maybe`ワークフローの実装がまさにこの方法を使っています。
* *式内のコードの実行コストが高い、呼び出しごとに結果が変わる可能性がある（非決定的）、または重要な副作用があるなら？* この場合は、2番目の遅延バージョンを使います。これはほとんどの他のワークフロー、特にI/O関連（`async`など）のワークフローが行っていることです。
* F#は純粋な関数型言語を目指しているわけではないので、ほとんどすべてのF#コードはこの2つのカテゴリのいずれかに該当します。しかし、*保証された副作用のないスタイルでコーディングする必要がある場合、または高コストのコードが最大1回しか評価されないことを保証したい場合は*、3番目の遅延評価オプションを使います。

どの選択をしても、ドキュメントで明確にしておくことが重要です。たとえば、遅延と遅延評価の実装はクライアントにとっては全く同じに見えますが、セマンティクスが大きく異なり、クライアントコードはそれぞれのケースで異なる書き方をする必要があります。

これで遅延と遅延評価について終わりましたので、ビルダーメソッドに戻って仕上げていきましょう。

