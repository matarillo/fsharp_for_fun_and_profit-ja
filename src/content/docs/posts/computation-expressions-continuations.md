---
layout: post
title: "継続を理解する"
description: "'let'の舞台裏の仕組み"
nav: thinking-functionally
seriesId: "コンピュテーション式"
seriesOrder: 2
---

前回の投稿では、コンピュテーション式を使って複雑なコードを簡潔にできることを見ました。

コンピュテーション式を使う前のコードは以下のようなものでした。

```fsharp

let log p = printfn "式は %A" p

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

そして、コンピュテーション式を使った後のコードは次のようになりました。

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

通常の`let`ではなく`let!`を使うのが重要です。この仕組みを自分で再現して理解できるでしょうか？できます。ただし、まず継続について理解する必要があります。

## 継続

命令型プログラミングでは、関数から「戻る」という概念があります。関数を呼び出すと、スタックをプッシュしたりポップしたりするように、「中に入って」から「出てきます」。

そのように動作するC#の典型的なコードを示します。`return`キーワードに注目してください。

```csharp
public int Divide(int top, int bottom)
{
    if (bottom==0)
    {
        throw new InvalidOperationException("0による除算");
    }
    else
    {
        return top/bottom;
    }
}

public bool IsEven(int aNumber)
{
    var isEven = (aNumber % 2 == 0);
    return isEven;
}
```

このようなコードは何度も見たことがあるでしょう。しかし、このアプローチには気づきにくい点があります。それは、*何をするかを決めるのは、常に呼び出された関数だ*ということです。

たとえば、`Divide`の実装が例外を投げると決めています。でも、例外が欲しくない場合はどうでしょう？`nullable<int>`が欲しかったり、画面に"#DIV/0"と表示したいかもしれません。すぐにキャッチしなければならない例外を投げる理由はありません。つまり、呼び出された関数ではなく、呼び出し元が何をすべきかを決めたらいいのではないでしょうか。

同様に、`IsEven`の例では、ブール値の戻り値で何をするのでしょうか？分岐するのか、それともレポートに印刷するのか？分かりません。しかし、呼び出し元が処理しなければならないブール値を返すのではなく、呼び出し元に次に何をするかを決めさせるのはどうでしょうか。

これが継続です。**継続**は単なる関数ですが、別の関数に渡すことで次に何をするかを伝えるものです。

以下は、呼び出し元が各ケースを処理する関数を渡せるように書き直したC#コードです。分かりやすくするために、これをビジターパターンに似ていると考えることもできます。余計にややこしいかもしれませんが。

```csharp
public T Divide<T>(int top, int bottom, Func<T> ifZero, Func<int,T> ifSuccess)
{
    if (bottom==0)
    {
        return ifZero();
    }
    else
    {
        return ifSuccess( top/bottom );
    }
}

public T IsEven<T>(int aNumber, Func<int,T> ifOdd, Func<int,T> ifEven)
{
    if (aNumber % 2 == 0)
    {
        return ifEven(aNumber);
    }
    else
    {   return ifOdd(aNumber);
    }
}
```

C#の関数は今や汎用的な`T`を返すようになっており、両方の継続は`T`を返す`Func`です。

C#では多くの`Func`パラメータを渡すのは見た目が悪いので、あまり使われません。しかし、F#では関数を渡すのが簡単です。このコードがどのように移植されるか見てみましょう。

これが「変更前」のコードです。

```fsharp
let divide top bottom = 
    if (bottom=0) 
    then invalidOp "0による除算"
    else (top/bottom)
    
let isEven aNumber = 
    aNumber % 2 = 0     
```

そして、これが「変更後」のコードです。

```fsharp
let divide ifZero ifSuccess top bottom = 
    if (bottom=0) 
    then ifZero()
    else ifSuccess (top/bottom)
    
let isEven ifOdd ifEven aNumber = 
    if (aNumber % 2 = 0)
    then aNumber |> ifEven 
    else aNumber |> ifOdd 
```

いくつか注目すべき点があります。まず、C#の例とは違い、追加の関数（`ifZero`など）をパラメータリストの最後ではなく*最初*に置いています。なぜでしょうか？[部分適用](../posts/partial-application.md)を使いたいからです。

また、`isEven`の例では、`aNumber |> ifEven`と`aNumber |> ifOdd`と書いています。これは、現在の値を継続にパイプで渡し、継続が常に評価される最後のステップであることを明確にしています。*この投稿の後半で、まさにこのパターンを使うので、ここで何が起きているか理解しておいてください。*

### 継続の例

継続の力を手に入れたので、呼び出し元が望むことに応じて、同じ`divide`関数を3つの全く異なる方法で使うことができます。

すぐに作成できる3つのシナリオを紹介します。

* 結果をメッセージにパイプで渡して表示する
* 悪いケースでは`None`を、良いケースでは`Some`を使って結果をオプションに変換する
* 悪いケースでは例外を投げ、良いケースでは結果をそのまま返す

```fsharp
// シナリオ1：結果をメッセージにパイプで渡す
// ----------------------------------------
// メッセージを表示する関数を設定
let ifZero1 () = printfn "不正"
let ifSuccess1 x = printfn "正常 %i" x

// 部分適用を使う
let divide1  = divide ifZero1 ifSuccess1

//テスト
let good1 = divide1 6 3
let bad1 = divide1 6 0

// シナリオ2：結果をオプションに変換する
// ----------------------------------------
// Optionを返す関数を設定
let ifZero2() = None
let ifSuccess2 x = Some x
let divide2  = divide ifZero2 ifSuccess2

//テスト
let good2 = divide2 6 3
let bad2 = divide2 6 0

// シナリオ3：悪いケースで例外を投げる
// ----------------------------------------
// 例外を投げる関数を設定
let ifZero3() = failwith "0による除算"
let ifSuccess3 x = x
let divide3  = divide ifZero3 ifSuccess3

//テスト
let good3 = divide3 6 3
let bad3 = divide3 6 0
```

このアプローチでは、呼び出し元が`divide`から例外をキャッチする必要はありません。呼び出し元が例外を投げるかどうかを決めます。呼び出される側ではありません。つまり、`divide`関数はさまざまな状況でより再利用しやすくなっただけでなく、循環的複雑度も1レベル下がりました。

同じ3つのシナリオを`isEven`の実装にも適用できます。

```fsharp
// シナリオ1：結果をメッセージにパイプで渡す
// ----------------------------------------
// メッセージを表示する関数を設定
let ifOdd1 x = printfn "%iは奇数" x
let ifEven1 x = printfn "%iは偶数" x

// 部分適用を使う
let isEven1  = isEven ifOdd1 ifEven1

//テスト
let good1 = isEven1 6 
let bad1 = isEven1 5

// シナリオ2：結果をオプションに変換する
// ----------------------------------------
// Optionを返す関数を設定
let ifOdd2 _ = None
let ifEven2 x = Some x
let isEven2  = isEven ifOdd2 ifEven2

//テスト
let good2 = isEven2 6 
let bad2 = isEven2 5

// シナリオ3：悪いケースで例外を投げる
// ----------------------------------------
// 例外を投げる関数を設定
let ifOdd3 _ = failwith "アサート失敗"
let ifEven3 x = x
let isEven3  = isEven ifOdd3 ifEven3

//テスト
let good3 = isEven3 6 
let bad3 = isEven3 5 
```

この場合、利点はより微妙ですが、同じです。呼び出し元は`if/then/else`でブール値を扱う必要がありません。複雑さが減り、エラーの可能性も低くなります。

些細な違いに見えるかもしれませんが、このように関数を渡すことで、合成や部分適用など、お気に入りの関数型テクニックをすべて使えるようになります。

[型を使った設計](../posts/designing-with-types-single-case-dus.md)のシリーズでも継続を見ました。その使用により、コンストラクタでの可能性のある検証エラーの場合に、単に例外を投げるのではなく、呼び出し元が何をするかを決められるようになりました。

```fsharp
type EmailAddress = EmailAddress of string

let CreateEmailAddressWithContinuations success failure (s:string) = 
    if System.Text.RegularExpressions.Regex.IsMatch(s,@"^\S+@\S+\.\S+$") 
        then success (EmailAddress s)
        else failure "メールアドレスには@記号が必要です"
```
        
success関数はメールをパラメータとして受け取り、error関数は文字列を受け取ります。両方の関数は同じ型を返す必要がありますが、型は自由に選べます。

以下は、継続を使用する簡単な例です。両方の関数がprintfを行い、何も返しません（つまりunit）。

```fsharp
// 関数を設定 
let success (EmailAddress s) = printfn "メール%sの作成に成功" s        
let failure  msg = printfn "メールの作成エラー：%s" msg
let createEmail = CreateEmailAddressWithContinuations success failure

// テスト
let goodEmail = createEmail "x@example.com"
let badEmail = createEmail "example.com"
```

### 継続渡しスタイル

このように継続を使うと、「[継続渡しスタイル](https://ja.wikipedia.org/wiki/%E7%B6%99%E7%B6%9A%E6%B8%A1%E3%81%97%E3%82%B9%E3%82%BF%E3%82%A4%E3%83%AB)」（CPS）と呼ばれるプログラミングスタイルになります。このスタイルでは、*すべての*関数が「次に何をするか」を示す追加の関数パラメータで呼び出されます。

違いを理解するために、標準的な直接スタイルのプログラミングを見てみましょう。

直接スタイルを使うと、関数の「中に入って」「出てくる」ような感じになります。

```text
関数を呼び出す ->
   <- 関数から戻る
別の関数を呼び出す ->
   <- 関数から戻る
さらに別の関数を呼び出す ->
   <- 関数から戻る
```
 
一方、継続渡しスタイルでは、次のような関数の連鎖になります。
 
```text
何かを評価して ->
   それを評価して別の関数に渡す ->
      さらに評価して別の関数に渡す ->
         また評価して別の関数に渡す ->
            ...など...
```

この2つのスタイルには明らかに大きな違いがあります。

直接スタイルでは、関数の階層があります。トップレベルの関数は一種の「マスターコントローラー」で、サブルーチンを1つずつ呼び出し、分岐するタイミングやループするタイミングを決め、全体的に制御フローを明示的に調整します。

一方、継続渡しスタイルでは、「マスターコントローラー」はありません。代わりに、データではなく制御フローの一種の「パイプライン」があり、実行ロジックがパイプを通って流れるにつれて、「担当の関数」が変わっていきます。

GUIでボタンクリックにイベントハンドラを付けたり、[BeginInvoke](https://learn.microsoft.com/ja-jp/dotnet/standard/asynchronous-programming-patterns/calling-synchronous-methods-asynchronously)でコールバックを使ったりしたことがあれば、気づかぬうちにこのスタイルを使っていたことになります。実際、このスタイルは`async`ワークフローを理解する上で重要になります。これについては、このシリーズの後半で説明します。

## 継続と'let'

では、これらすべてが`let`とどのように関係するのでしょうか？

`let`が実際に何をするのか、[再確認](../posts/let-use-do.md)してみましょう。

（トップレベルでない）「let」は単独では使えず、必ず大きなコードブロックの一部でなければならないことを思い出してください。

つまり、

```fsharp
let x = someExpression
```

は実際には次のような意味です。

```fsharp
let x = someExpression in [xを含む式]
```

そして、2番目の式（本体の式）で`x`を見るたびに、1番目の式（`someExpression`）で置き換えます。

たとえば、次の式は、

```fsharp
let x = 42
let y = 43
let z = x + y          
```
  
実際には（冗長な`in`キーワードを使って）次のような意味になります。

```fsharp
let x = 42 in   
  let y = 43 in 
    let z = x + y in
       z    // 結果
```

面白いことに、ラムダは`let`によく似ています。

```fsharp
fun x -> [xを含む式]
```

そして、`x`の値もパイプで渡すと、次のようになります。

```fsharp
someExpression |> (fun x -> [xを含む式] )
```

これは`let`とよく似ていませんか？ここに`let`とラムダを並べてみます。

```fsharp
// let
let x = someExpression in [xを含む式]

// 値をラムダにパイプで渡す
someExpression |> (fun x -> [xを含む式] )
```

両方に`x`があり、`someExpression`があります。ラムダの本体で`x`を見るたびに、`someExpression`で置き換えます。
確かに、ラムダの場合は`x`と`someExpression`の順序が逆になっていますが、それ以外は基本的に`let`と同じです。

この技法を使って、元の例を次のようなスタイルで書き直せます。

```fsharp
42 |> (fun x ->
  43 |> (fun y -> 
     x + y |> (fun z -> 
       z)))
```

このように書くと、`let`スタイルを継続渡しスタイルに変換したことがわかります！

* 1行目では値`42`があります。これをどうしたいでしょうか？先ほどの`isEven`関数と同じように、継続に渡しましょう。そして、その継続のコンテキストで`42`を`x`と呼ぶことにします。
* 2行目では値`43`があります。これをどうしたいでしょうか？これも継続に渡し、そのコンテキストで`y`と呼びます。
* 3行目では`x`と`y`を足して新しい値を作ります。これをどうしたいでしょうか？また別の継続に渡し、別のラベル（`z`）を付けます。
* 最後の行で終了し、式全体が`z`と評価されます。

### 継続を関数でラップする

明示的なパイプを取り除いて、この論理をラップする小さな関数を作りましょう。予約語なので「let」とは呼べません。さらに重要なのは、パラメータが`let`とは逆順になっていることです。
「x」が右側にあり、「someExpression」が左側にあります。そこで、とりあえず`pipeInto`と呼ぶことにします。

`pipeInto`の定義は非常に単純です。

```fsharp
let pipeInto (someExpression,lambda) =
    someExpression |> lambda 
```

*両方のパラメータを空白で区切られた2つの別々のパラメータとしてではなく、タプルとして一度に渡していることに注意してください。これらは常にペアで来ます。*

この`pipeInto`関数を使って、例をもう一度書き直すことができます。
      
```fsharp
pipeInto (42, fun x ->
  pipeInto (43, fun y -> 
    pipeInto (x + y, fun z -> 
       z)))
```

またはインデントを削除して、このように書くこともできます。
      
```fsharp
pipeInto (42, fun x ->
pipeInto (43, fun y -> 
pipeInto (x + y, fun z -> 
z)))
```

「それで何だ？」と思うかもしれません。なぜパイプを関数でラップする必要があるのでしょうか？

答えは、コンピュテーション式と同じように、`pipeInto`関数に「舞台裏」で何かを行う*追加のコード*を入れられるからです。

### 「ログ記録」の例を再考する

`pipeInto`を少しログを追加するように再定義してみましょう。

```fsharp
let pipeInto (someExpression,lambda) =
   printfn "式は %A" someExpression 
   someExpression |> lambda 
```

では...このコードをもう一度実行してみましょう。

```fsharp
pipeInto (42, fun x ->
pipeInto (43, fun y -> 
pipeInto (x + y, fun z -> 
z
)))
```

出力は何になるでしょうか？

```text
式は 42
式は 43
式は 85
```

これは、以前の実装と全く同じ出力です。私たちは独自の小さなコンピュテーション式ワークフローを作成したのです！

コンピュテーション式版と並べて比較すると、自作版が`let!`によく似ていることがわかります。ただし、パラメータの順序が逆で、継続に明示的な矢印があります。

![computation expression: logging](@assets/img/compexpr_logging.png)

### 「安全な除算」の例を再考する

「安全な除算」の例でも同じことをしてみましょう。元のコードは次のようなものでした。

```fsharp
let divideBy bottom top =
    if bottom = 0
    then None
    else Some(top/bottom)

let divideByWorkflow x y w z = 
    let a = x |> divideBy y 
    match a with
    | None -> None  // 諦める
    | Some a' ->    // 続行
        let b = a' |> divideBy w
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

この「段階的な」スタイルは、継続を使うべきだという明らかな手がかりだとわかるはずです。

`pipeInto`に追加のコードを入れて、マッチングを代わりに行わせることができるか見てみましょう。求めているロジックは次のとおりです。

* `someExpression`パラメータが`None`の場合、継続のラムダを呼び出さない。
* `someExpression`パラメータが`Some`の場合、継続のラムダを呼び出し、`Some`の中身を渡す。

これが実装です。

```fsharp
let pipeInto (someExpression,lambda) =
   match someExpression with
   | None -> 
       None
   | Some x -> 
       x |> lambda 
```

この新しいバージョンの`pipeInto`を使って、元のコードを次のように書き直せます。

```fsharp
let divideByWorkflow x y w z = 
    let a = x |> divideBy y 
    pipeInto (a, fun a' ->
        let b = a' |> divideBy w
        pipeInto (b, fun b' ->
            let c = b' |> divideBy z
            pipeInto (c, fun c' ->
                Some c' //return 
                )))
```

これをかなり簡潔にできます。

まず、`a`、`b`、`c`を削除し、`divideBy`式で直接置き換えます。つまり、これを

```fsharp
let a = x |> divideBy y 
pipeInto (a, fun a' ->
```

こうします。

```fsharp
pipeInto (x |> divideBy y, fun a' ->
```

次に、`a'`を単に`a`に、以下同様に名前を変更し、段階的なインデントも削除して、次のようにできます。

```fsharp
let divideByResult x y w z = 
    pipeInto (x |> divideBy y, fun a ->
    pipeInto (a |> divideBy w, fun b ->
    pipeInto (b |> divideBy z, fun c ->
    Some c //return 
    )))
```

最後に、結果をオプションでラップする小さなヘルパー関数`return'`を作ります。全部まとめると、コードは次のようになります。

```fsharp
let divideBy bottom top =
    if bottom = 0
    then None
    else Some(top/bottom)

let pipeInto (someExpression,lambda) =
   match someExpression with
   | None -> 
       None
   | Some x -> 
       x |> lambda 

let return' c = Some c

let divideByWorkflow x y w z = 
    pipeInto (x |> divideBy y, fun a ->
    pipeInto (a |> divideBy w, fun b ->
    pipeInto (b |> divideBy z, fun c ->
    return' c 
    )))

let good = divideByWorkflow 12 3 2 1
let bad = divideByWorkflow 12 3 0 1
```

再度、コンピュテーション式版と並べて比較すると、自作版が意味的に同じであることがわかります。構文だけが異なります。

![computation expression: logging](@assets/img/compexpr_safedivide.png)

### まとめ

この投稿では、継続と継続渡しスタイルについて説明し、`let`を舞台裏で継続を行う便利な構文として考える方法を学びました。

これで、独自バージョンの`let`を作成するために必要なものがすべて揃いました。次の投稿では、この知識を実践に移します。

