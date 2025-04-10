---
layout: post
title: "パーサーコンビネータを理解する"
description: "パーサーコンビネータライブラリをゼロから書く"
categories: ["コンビネータ", "パターン"]
seriesId: "パーサーコンビネータを理解する"
seriesOrder: 1
---

*更新：[この話題に関する私の講演のスライドとビデオ](https://fsharpforfunandprofit.com/parser/)*

このシリーズでは、いわゆる「アプリカティブパーサー」がどのように動作するかを詳しく見ていきます。
何かを深く理解するためには、自分で作ってみるのが一番です。
そこで、まずは基本的なパーサーライブラリをゼロから書き、次に便利な「パーサーコンビネータ」をいくつか作り、最後に完全なJSONパーサーを組み上げることで締めくくりたいと思います。

「アプリカティブパーサー」や「パーサーコンビネータ」といった用語を聞くと、このアプローチは複雑に思えるかもしれません。
しかし、これらの概念を前もって説明しようとするのではなく、まずはコーディングを始めてみましょう。

一連の実装を通じて、複雑な内容へと段階的に進んでいきます。各実装は前のものとわずかに異なるだけです。
このアプローチを使うことで、各段階でのデザインと概念が理解しやすくなり、
このシリーズの終わりには、パーサーコンビネータの謎は完全に解けているはずです。

このシリーズは4つの記事で構成されています。

* 第1回の今回は、パーサーコンビネータの基本概念を見て、ライブラリのコアを組み立てます。
* [第2回](../posts/understanding-parser-combinators-2.md)では、便利なコンビネータのライブラリを組み立てます。
* [第3回](../posts/understanding-parser-combinators-3.md)では、役立つエラーメッセージの提供に取り組みます。
* [最終回](../posts/understanding-parser-combinators-4.md)では、このパーサーライブラリを使ってJSONパーサーを組み立てます。

ここではパフォーマンスや効率性に焦点を当てませんが、[FParsec](https://www.quanttec.com/fparsec/)のようなライブラリを効果的に使えるようになる理解が得られると思います。
そして、FParsecを作ったStephan Tolksdorfに感謝します。
.NETでのパーシングには、まずFParsecを検討すべきです。

<hr>

## 実装1. ハードコードされた文字のパース

最初の実装として、単一の、ハードコードされた文字（この場合は文字「A」）をパースするだけのものを作ってみましょう。これ以上シンプルなものはありません。

仕組みは次のとおりです。

* パーサーへの入力は文字のストリームです。複雑なものを使うこともできますが、今は単に`string`を使います。
* ストリームが空の場合、`false`と空の文字列のペアを返します。
* ストリームの最初の文字が`A`の場合、`true`と残りの文字列のストリームのペアを返します。
* ストリームの最初の文字が`A`でない場合、`false`と（変更されていない）元のストリームのペアを返します。

コードは次のようになります。

```fsharp
let A_Parser str =
    if String.IsNullOrEmpty(str) then
        (false,"")
    else if str.[0] = 'A' then
        let remaining = str.[1..]
        (true,remaining)
    else
        (false,str)
```

`A_Parser`の型シグネチャは次のようになります。

```fsharp
val A_Parser :
    string -> (bool * string)
```

これは、入力が文字列で、出力がブール値と別の文字列（残りの入力）のペアであることを示しています。図で表すと次のようになります。

![](../assets/img/parser-1.png)

では、テストしてみましょう。まず、適切な入力を使ってテストします。

```fsharp
let inputABC = "ABC"
A_Parser inputABC    
```

結果は次のようになります。

```fsharp
(true, "BC")
```

見ての通り、`A`が消費され、残りの入力は`"BC"`だけになっています。

次に、不適切な入力でテストしてみます。

```fsharp
let inputZBC = "ZBC"
A_Parser inputZBC    
```

結果は次のようになります。

```fsharp
(false, "ZBC")
```

この場合、最初の文字は消費されず、残りの入力はまだ`"ZBC"`のままです。

これで、非常にシンプルなパーサーができました。ここまでが理解できれば、これからの内容も簡単です。

<hr>

## 実装2. 指定された文字のパース

ハードコードされた文字ではなく、マッチさせたい文字を渡せるようにリファクタリングしましょう。

今回は、真偽値を返す代わりに、何が起こったかを示すメッセージを返すようにします。

関数名を`pchar`（"parse char"の略）とします。コードは次のようになります。

```fsharp
let pchar (charToMatch,str) =
    if String.IsNullOrEmpty(str) then
        let msg = "No more input"
        (msg,"")
    else 
        let first = str.[0] 
        if first = charToMatch then
            let remaining = str.[1..]
            let msg = sprintf "Found %c" charToMatch
            (msg,remaining)
        else
            let msg = sprintf "Expecting '%c'. Got '%c'" charToMatch first
            (msg,str)
```

このコードは前の例と似ていますが、予期しない文字がエラーメッセージに表示されるようになっています。

`pchar`の型シグネチャは次のようになります。

```fsharp
val pchar :
    (char * string) -> (string * string)
```

これは、入力が（マッチさせる文字、文字列）のペアで、出力が（文字列）結果と別の文字列（残りの入力）のペアであることを示しています。

では、テストしてみましょう。まず、適切な入力を使ってテストします。

```fsharp
let inputABC = "ABC"
pchar('A',inputABC)  
```

結果は次のようになります。

```fsharp
("Found A", "BC")
```

先ほどと同様に、`A`が消費され、残りの入力は`"BC"`だけになっています。

次に、不適切な入力でテストします。

```fsharp
let inputZBC = "ZBC"
pchar('A',inputZBC)  
```

結果は次のようになります。

```fsharp
("Expecting 'A'. Got 'Z'", "ZBC")
```

ここでも先ほどと同様に、最初の文字は消費されず、残りの入力はまだ`"ZBC"`のままです。

`Z`を渡すと、パーサーは成功します。

```fsharp
pchar('Z',inputZBC)  // ("Found Z", "BC")
```


<hr>

## 実装3. 成功/失敗の返却

マッチの成功と失敗を区別できるようにしたいですが、文字列型のメッセージを返すだけでは役に立ちません。
そこで、その違いを示す特別な「選択」型を定義しましょう。これを`Result`と呼びます。

```fsharp
type Result<'a> =
    | Success of 'a
    | Failure of string 
```

`Success`ケースはジェネリックで、任意の値を含むことができます。`Failure`ケースはエラーメッセージを含みます。

*注：このSuccess/Failureアプローチの詳細については、[関数型エラー処理](https://fsharpforfunandprofit.com/rop/)に関する私の講演をご覧ください。*

これでパーサーを書き直して、`Result`ケースの1つを返すようにできます。

```fsharp
let pchar (charToMatch,str) =
    if String.IsNullOrEmpty(str) then
        Failure "No more input"
    else
        let first = str.[0] 
        if first = charToMatch then
            let remaining = str.[1..]
            Success (charToMatch,remaining)
        else
            let msg = sprintf "Expecting '%c'. Got '%c'" charToMatch first
            Failure msg
```

`pchar`の型シグネチャは次のようになりました。

```fsharp
val pchar :
    (char * string) -> Result<char * string>
```

これは、出力が`Result`（成功の場合、マッチした文字と残りの入力文字列を含む）になったことを示しています。

もう一度テストしてみましょう。まず、適切な入力を使ってテストします。

```fsharp
let inputABC = "ABC"
pchar('A',inputABC)  
```

結果は次のようになります。

```fsharp
Success ('A', "BC")
```

先ほどと同様に、`A`が消費され、残りの入力は`"BC"`だけになっています。また、実際にマッチした文字（この場合は`A`）も取得できます。

次に、不適切な入力を使ってテストします。

```fsharp
let inputZBC = "ZBC"
pchar('A',inputZBC)  
```

結果は次のようになります。

```fsharp
Failure "Expecting 'A'. Got 'Z'"
```

この場合、適切なエラーメッセージと共に`Failure`ケースが返されます。

関数の入力と出力を図で表すと、次のようになります。

![](../assets/img/parser-2.png)



<hr>

## 実装4. カリー化された実装への切り替え

前の実装では、関数への入力はタプル（ペア）でした。これは両方の入力を一度に渡す必要があります。

F#のような関数型言語では、カリー化されたバージョンを使うのがより一般的です。次のようになります。

```fsharp
let pchar charToMatch str = 
    if String.IsNullOrEmpty(str) then
        Failure "No more input"
    else
        let first = str.[0] 
        if first = charToMatch then
            let remaining = str.[1..]
            Success (charToMatch,remaining)
        else
            let msg = sprintf "Expecting '%c'. Got '%c'" charToMatch first
            Failure msg
```

違いがわかりますか？唯一の違いは最初の行にありますが、それでも気づきにくいものです。

カリー化されていない（タプル）バージョンはこうです。

```fsharp
let pchar (charToMatch,str) =
    ...
```

そしてカリー化されたバージョンはこうです。

```fsharp
let pchar charToMatch str = 
    ...
```

型シグネチャを見ると、違いがより明確になります。
カリー化されていない（タプル）バージョンの型シグネチャはこうです。

```fsharp
val pchar :
    (char * string) -> Result<char * string>
```

そしてカリー化されたバージョンの型シグネチャはこうです。

```fsharp
val pchar :
    char -> string -> Result<char * string>
```

カリー化されたバージョンの`pchar`を図で表すと、こうなります。

![](../assets/img/parser-3.png)

### カリー化とは何か？

カリー化の仕組みがよくわからない場合は、[こちらの投稿](../posts/currying.md)を参照してください。
基本的には、複数のパラメータを持つ関数を、一連の単一パラメータ関数として書けることを意味します。

つまり、この2パラメータ関数は、

```fsharp
let add x y = 
    x + y
```

ラムダを返す1パラメータ関数として書くことができます。

```fsharp
let add x = 
    fun y -> x + y  // ラムダを返す
```

または、内部関数を返す関数として書くこともできます。

```fsharp
let add x = 
    let innerFn y = x + y
    innerFn // innerFnを返す 
```

### 内部関数を使って書き直す

カリー化を利用して、パーサーを1パラメータ関数（パラメータは`charToMatch`）として書き直し、内部関数を返すようにできます。

新しい実装では、内部関数を`innerFn`と名付けています。

```fsharp
let pchar charToMatch = 
    // ネストされた内部関数を定義
    let innerFn str =
        if String.IsNullOrEmpty(str) then
            Failure "No more input"
        else
            let first = str.[0] 
            if first = charToMatch then
                let remaining = str.[1..]
                Success (charToMatch,remaining)
            else
                let msg = sprintf "Expecting '%c'. Got '%c'" charToMatch first
                Failure msg
    // 内部関数を返す
    innerFn 
```

この実装の型シグネチャは次のようになります。

```fsharp
val pchar :
    char -> string -> Result<char * string>
```

前のバージョンと*まったく同じ*です。

つまり、上記の2つの実装は実際には同じです。

```fsharp
// 2パラメータの実装
let pchar charToMatch str = 
    ...

// 内部関数を持つ1パラメータの実装
let pchar charToMatch = 
    let innerFn str =
        ...    
    // 内部関数を返す
    innerFn 
```


### カリー化された実装の利点

カリー化された実装の良いところは、パースしたい文字を部分適用できることです。たとえば、このようになります。

```fsharp
let parseA = pchar 'A' 
```

そして後で2番目の「入力ストリーム」パラメータを提供できます。

```fsharp
let inputABC = "ABC"
parseA inputABC  // Success ('A', "BC")

let inputZBC = "ZBC"
parseA inputZBC  // Failure "Expecting 'A'. Got 'Z'"
```

ここで立ち止まって、何が起こっているかを振り返ってみましょう。

* `pchar`関数には2つの入力があります。
* 1つの入力（マッチする文字）を提供すると、*関数*が返されます。
* このパース関数に2つ目の入力（文字のストリーム）を提供すると、最終的な`Result`値が作成されます。

`pchar`の図をもう一度見てみましょう。今回は部分適用に焦点を当てています。

![](../assets/img/parser-4a.png)

先に進む前に、この論理を理解することが非常に重要です。残りの投稿はこの基本設計にしたがって作られるからです。



<hr>

## 実装5. パース関数を型にカプセル化する

（上の例の）`parseA`を見ると、関数型であることがわかります。

```fsharp
val parseA : string -> Result<char * string>
```

この型は少し複雑で使いにくいので、`Parser`という「ラッパー」型にカプセル化してみましょう。

```fsharp
type Parser<'T> = Parser of (string -> Result<'T * string>)
```

カプセル化することで、このデザインから、

![](../assets/img/parser-4a.png)

このデザインに移行します。

![](../assets/img/parser-4b.png)

実装の変更は非常にシンプルです。内部関数の返し方を変更するだけです。

つまり、こうだったものを、

```fsharp
let pchar charToMatch = 
    let innerFn str =
        ...
    // 内部関数を返す
    innerFn 
```

このように変更するのです。

```fsharp
let pchar charToMatch = 
    let innerFn str =
        ...
    // 「ラップされた」内部関数を返す
    Parser innerFn 
```

### ラップされた関数のテスト

では、もう一度テストしてみましょう。

```fsharp
let parseA = pchar 'A' 
let inputABC = "ABC"
parseA inputABC  // コンパイルエラー 
```

しかし、今度はコンパイルエラーが発生します。

```text
error FS0003: この値は関数ではなく、適用できません
```

これは当然です。関数が`Parser`データ構造にラップされているため、直接アクセスできなくなったからです。

そこで、内部関数を取り出し、入力ストリームに対して実行するヘルパー関数が必要になります。
これを`run`と呼びましょう。

`run`の実装は次のようになります。

```fsharp
let run parser input = 
    // パーサーをアンラップして内部関数を取得
    let (Parser innerFn) = parser 
    // 内部関数を入力で呼び出す
    innerFn input
```

これで`parseA`パーサーをさまざまな入力に対して実行できるようになりました。

```fsharp
let inputABC = "ABC"
run parseA inputABC  // Success ('A', "BC")

let inputZBC = "ZBC"
run parseA inputZBC  // Failure "Expecting 'A'. Got 'Z'"
```

以上です！基本的な`Parser`型ができました。ここまでの内容がすべて理解できたことを願っています。

<hr>

## 2つのパーサーを順番に組み合わせる： "and then" コンビネータ

最後の実装は基本的な解析ロジックには十分です。後でもう一度見直しますが、
ここでレベルを上げて、パーサーを組み合わせる方法をいくつか開発しましょう。冒頭で言及した「パーサーコンビネータ」です。

まず、2つのパーサーを順番に組み合わせることから始めます。たとえば、「A」そして「B」にマッチするパーサーが欲しいとします。
次のように書いてみることができます。

```fsharp
let parseA = pchar 'A'   
let parseB = pchar 'B'

let parseAThenB = parseA >> parseB  
```

しかし、これはコンパイルエラーになります。`parseA`の出力が`parseB`の入力と一致しないため、このように合成することはできません。

[関数型プログラミングのパターン](https://fsharpforfunandprofit.com/fppatterns/)に馴染みがあれば、このようなラップされた型のシーケンスを連鎖させる必要性がよく発生し、
その解決策は`bind`関数であることがわかるでしょう。

しかし、この場合、`bind`を実装せずに直接`andThen`の実装に進みます。

実装ロジックは次のようになります。

* 最初のパーサーを実行する。
* 失敗した場合は、そのまま返す。
* そうでない場合、2番目のパーサーを残りの入力で実行する。
* 失敗した場合は、そのまま返す。
* 両方のパーサーが成功した場合、両方の解析された値を含むペア（タプル）を返す。

`andThen`のコードは次のようになります。

```fsharp
let andThen parser1 parser2 =
    let innerFn input =
        // parser1を入力で実行
        let result1 = run parser1 input
        
        // 結果をFailure/Successでテスト
        match result1 with
        | Failure err -> 
            // parser1のエラーを返す
            Failure err  

        | Success (value1,remaining1) -> 
            // parser2を残りの入力で実行
            let result2 =  run parser2 remaining1
            
            // 結果をFailure/Successでテスト
            match result2 with 
            | Failure err ->
                // parser2のエラーを返す 
                Failure err 
            
            | Success (value2,remaining2) -> 
                // 両方の値をペアとして組み合わせる
                let newValue = (value1,value2)
                // parser2の後の残りの入力を返す
                Success (newValue,remaining2)

    // 内部関数を返す
    Parser innerFn 
```

実装は上で説明したロジックに従っています。

また、通常の`>>`合成のように使えるよう、`andThen`の中置バージョンも定義します。

```fsharp
let ( .>>. ) = andThen
```

*注：カスタム演算子を定義するにはかっこが必要ですが、中置で使用する際にはかっこは必要ありません。*

`andThen`のシグネチャを見てみましょう。

```fsharp
val andThen : 
     parser1:Parser<'a> -> parser2:Parser<'b> -> Parser<'a * 'b>
```

これを見ると、任意の2つのパーサーに対して機能し、異なる型（`'a`と`'b`）でも構わないことがわかります。

### `andThen`のテスト

テストして動作を確認しましょう。

まず、複合パーサーを作成します。

```fsharp
let parseA = pchar 'A'   
let parseB = pchar 'B'
let parseAThenB = parseA .>>. parseB 
```

型を見ると、3つの値すべてが`Parser`型であることがわかります。

```fsharp
val parseA : Parser<char> 
val parseB : Parser<char> 
val parseAThenB : Parser<char * char> 
```

`parseAThenB`は`Parser<char * char>`型です。つまり、解析された値は文字のペアです。

組み合わされたパーサー`parseAThenB`も単なる`Parser`なので、以前と同じように`run`を使えます。

```fsharp
run parseAThenB "ABC"  // Success (('A', 'B'), "C")

run parseAThenB "ZBC"  // Failure "Expecting 'A'. Got 'Z'"

run parseAThenB "AZC"  // Failure "Expecting 'B'. Got 'Z'"
```

成功の場合、ペア`('A', 'B')`が返され、
どちらかの文字が入力にない場合に失敗することがわかります。


<hr>

## 2つのパーサーから選択する： "or else" コンビネータ

パーサーを組み合わせるもう1つの重要な方法を見てみましょう。「orElse」コンビネータです。

たとえば、「A」*または*「B」にマッチするパーサーが欲しい場合、どのように組み合わせればよいでしょうか。

実装ロジックは次のようになります。

* 最初のパーサーを実行する。
* 成功した場合、解析された値と残りの入力を返す。
* 失敗した場合、2番目のパーサーを元の入力で実行する。
* そして、2番目のパーサーの結果（成功または失敗）を返す。

`orElse`のコードは次のようになります。

```fsharp
let orElse parser1 parser2 =
    let innerFn input =
        // parser1を入力で実行
        let result1 = run parser1 input

        // 結果をFailure/Successでテスト
        match result1 with
        | Success result -> 
            // 成功した場合、元の結果を返す
            result1

        | Failure err -> 
            // 失敗した場合、parser2を入力で実行
            let result2 = run parser2 input

            // parser2の結果を返す
            result2 

    // 内部関数を返す
    Parser innerFn 
```

`orElse`の中置バージョンも定義します。

```fsharp
let ( <|> ) = orElse
```

`orElse`のシグネチャを見てみましょう。

```fsharp
val orElse : 
    parser1:Parser<'a> -> parser2:Parser<'a> -> Parser<'a>
```

これを見ると、任意の2つのパーサーに対して機能しますが、両方が*同じ*型`'a`である必要があることがわかります。

### `orElse`のテスト

テストする時間です。まず、組み合わせたパーサーを作成します。

```fsharp
let parseA = pchar 'A'   
let parseB = pchar 'B'
let parseAOrElseB = parseA <|> parseB 
```

型を見ると、3つの値すべてが`Parser<char>`型であることがわかります。

```fsharp
val parseA : Parser<char> 
val parseB : Parser<char> 
val parseAOrElseB : Parser<char>
```

`parseAOrElseB`を実行すると、最初の文字が「A」または「B」の場合に正常に処理されることがわかります。

```fsharp
run parseAOrElseB "AZZ"  // Success ('A', "ZZ")

run parseAOrElseB "BZZ"  // Success ('B', "ZZ")

run parseAOrElseB "CZZ"  // Failure "Expecting 'B'. Got 'C'"
```

### `andThen`と`orElse`の組み合わせ

これら2つの基本的なコンビネータを使って、より複雑なものを組み立てられます。たとえば、「AそしてBまたはC」というものです。

`aAndThenBorC`をシンプルなパーサーから組み立てる方法は次のとおりです。

```fsharp
let parseA = pchar 'A'   
let parseB = pchar 'B'
let parseC = pchar 'C'
let bOrElseC = parseB <|> parseC
let aAndThenBorC = parseA .>>. bOrElseC 
```

実際に動作させてみましょう。

```fsharp
run aAndThenBorC "ABZ"  // Success (('A', 'B'), "Z")
run aAndThenBorC "ACZ"  // Success (('A', 'C'), "Z")
run aAndThenBorC "QBZ"  // Failure "Expecting 'A'. Got 'Q'"
run aAndThenBorC "AQZ"  // Failure "Expecting 'C'. Got 'Q'"
```

最後の例では誤解を招くエラーが出ています。「C」を期待していると言っていますが、実際には「B」または「C」を期待しているはずです。
今はこれを修正しませんが、後の投稿でより良いエラーメッセージを実装します。

<hr>

## パーサーのリストから選択する： "choice" と "anyOf"

ここで、コンビネータの力が発揮され始めます。`orElse`が手元にあれば、それを使ってさらに多くのコンビネータを組み立てられるからです。

たとえば、2つのパーサーだけでなく、パーサーの*リスト*から選択したい場合はどうでしょうか。

これは簡単です。物事を対で組み合わせる方法があれば、`reduce`を使ってリスト全体を組み合わせることができます
（`reduce`の操作についての詳細は、[モノイドに関するこの投稿](../posts/monoids-without-tears.md)を参照してください）。

```fsharp
/// パーサーのリストから任意のものを選択
let choice listOfParsers = 
    List.reduce ( <|> ) listOfParsers 
```

*入力リストが空の場合、これは失敗しますが、今のところはそれを無視します。*

`choice`のシグネチャは次のとおりです。

```fsharp
val choice :
    Parser<'a> list -> Parser<'a>
```

これは、予想通り、入力がパーサーのリストで、出力が単一のパーサーであることを示しています。

`choice`が利用可能になったので、リスト内の任意の文字にマッチする`anyOf`パーサーを次のロジックで作成できます。

* 入力は文字のリスト
* リスト内の各文字は`pchar`を使ってその文字用のパーサーに変換される
* 最後に、すべてのパーサーが`choice`を使って組み合わされる

コードは次のようになります。

```fsharp
/// 文字のリストから任意のものを選択
let anyOf listOfChars = 
    listOfChars
    |> List.map pchar // パーサーに変換
    |> choice
```

任意の小文字と任意の数字用のパーサーを作成してテストしてみましょう。

```fsharp
let parseLowercase = 
    anyOf ['a'..'z']

let parseDigit = 
    anyOf ['0'..'9']
```

テストすると、予想通りに動作します。

```fsharp
run parseLowercase "aBC"  // Success ('a', "BC")
run parseLowercase "ABC"  // Failure "Expecting 'z'. Got 'A'"

run parseDigit "1ABC"  // Success ("1", "ABC")
run parseDigit "9ABC"  // Success ("9", "ABC")
run parseDigit "|ABC"  // Failure "Expecting '9'. Got '|'"
```

ここでも、エラーメッセージは誤解を招きます。小文字の場合、'z'だけでなく任意の小文字が期待されており、数字の場合、'9'だけでなく任意の数字が期待されています。
先ほど述べたように、後の投稿でエラーメッセージに取り組みます。

## レビュー

ここで一旦立ち止まって、これまでの内容を振り返ってみましょう。

* パース関数のラッパーである`Parser`型を作成しました。
* パース関数は入力（例：文字列）を受け取り、関数に組み込まれた基準を使って入力のマッチを試みます。
* マッチが成功すると、パース関数はマッチした項目と残りの入力を含む`Success`を返します。
* マッチが失敗すると、パース関数は失敗の理由を含む`Failure`を返します。
* 最後に、`Parser`を組み合わせて新しい`Parser`を作る方法である「コンビネータ」をいくつか見ました。`andThen`、`orElse`、`choice`です。

## これまでのパーサーライブラリのリスト

これまでのパーサーライブラリの完全なリストを以下に示します。約90行のコードです。

*以下に表示されているソースコードは、[このgist](https://gist.github.com/swlaschin/cb42417079ae2c5f99db#file-parserlibrary_v1-fsx)でも利用できます。*

```fsharp
open System

/// パース成功/失敗を表す型
type Result<'a> =
    | Success of 'a
    | Failure of string 

/// パース関数をラップする型
type Parser<'T> = Parser of (string -> Result<'T * string>)

/// 単一の文字をパースする
let pchar charToMatch = 
    // ネストされた内部関数を定義
    let innerFn str =
        if String.IsNullOrEmpty(str) then
            Failure "No more input"
        else
            let first = str.[0] 
            if first = charToMatch then
                let remaining = str.[1..]
                Success (charToMatch,remaining)
            else
                let msg = sprintf "Expecting '%c'. Got '%c'" charToMatch first
                Failure msg
    // "ラップされた"内部関数を返す
    Parser innerFn 

/// パーサーを入力で実行する
let run parser input = 
    // パーサーをアンラップして内部関数を取得
    let (Parser innerFn) = parser 
    // 内部関数を入力で呼び出す
    innerFn input

/// 2つのパーサーを "A そして B" として組み合わせる
let andThen parser1 parser2 =
    let innerFn input =
        // parser1を入力で実行
        let result1 = run parser1 input
        
        // 結果をFailure/Successでテスト
        match result1 with
        | Failure err -> 
            // parser1のエラーを返す
            Failure err  

        | Success (value1,remaining1) -> 
            // parser2を残りの入力で実行
            let result2 =  run parser2 remaining1
            
            // 結果をFailure/Successでテスト
            match result2 with 
            | Failure err ->
                // parser2のエラーを返す 
                Failure err 
            
            | Success (value2,remaining2) -> 
                // 両方の値をペアとして組み合わせる
                let newValue = (value1,value2)
                // parser2の後の残りの入力を返す
                Success (newValue,remaining2)

    // 内部関数を返す
    Parser innerFn 

/// andThenの中置バージョン
let ( .>>. ) = andThen

/// 2つのパーサーを "A または B" として組み合わせる
let orElse parser1 parser2 =
    let innerFn input =
        // parser1を入力で実行
        let result1 = run parser1 input

        // 結果をFailure/Successでテスト
        match result1 with
        | Success result -> 
            // 成功した場合、元の結果を返す
            result1

        | Failure err -> 
            // 失敗した場合、parser2を入力で実行
            let result2 = run parser2 input

            // parser2の結果を返す
            result2 

    // 内部関数を返す
    Parser innerFn 

/// orElseの中置バージョン
let ( <|> ) = orElse

/// パーサーのリストから任意のものを選択
let choice listOfParsers = 
    List.reduce ( <|> ) listOfParsers 

/// 文字のリストから任意のものを選択
let anyOf listOfChars = 
    listOfChars
    |> List.map pchar // パーサーに変換
    |> choice
```


## まとめ

この投稿では、パーシングライブラリの基礎と、いくつかのシンプルなコンビネータを作成しました。

[次の投稿](../posts/understanding-parser-combinators-2.md)では、これをもとに、もっと多くのコンビネータを含むライブラリを作ります。

*この投稿のソースコードは[このgist](https://gist.github.com/swlaschin/cb42417079ae2c5f99db#file-understanding_parser_combinators-fsx)で利用できます。*


## 追加情報

* この技術を本番環境で使うことに興味がある場合は、
  実運用に最適化された、F#用の[FParsecライブラリ](https://www.quanttec.com/fparsec/)を必ず調査してください。
* パーサーコンビネータ一般に関する詳細情報については、"Parsec"（FParsecとこの投稿に影響を与えたHaskellライブラリ）でインターネット検索してください。
* FParsecの使用例については、以下の投稿のいずれかを試してみてください。
  * [FogCreekのKilnによる、フレーズ検索クエリの実装](https://web.archive.org/web/20160304040941/http://blog.fogcreek.com/fparsec/)
  * [LOGOパーサー](http://trelford.com/blog/post/FParsec.aspx)
  * [Small Basicパーサー](http://trelford.com/blog/post/parser.aspx)
  * [C#パーサー](http://trelford.com/blog/post/parsecsharp.aspx)と[F#でC#コンパイラを構築する](https://neildanson.wordpress.com/2014/02/11/building-a-c-compiler-in-f/)
  * [F#で48時間でSchemeを書く](https://lucabolognese.wordpress.com/2011/08/05/write-yourself-a-scheme-in-48-hours-in-f-part-vi/)
  * [OpenGLのシェーディング言語GLSLのパース](https://laurent.le-brun.eu/site/index.php/2010/06/07/54-fsharp-and-fparsec-a-glsl-parser-example)




