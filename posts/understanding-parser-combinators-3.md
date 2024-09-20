---
layout: post
title: "パーサーライブラリの改善"
description: "より詳細なエラーの追加"
categories: [パターン]
seriesId: "パーサーコンビネータを理解する"
seriesOrder: 3
---

*更新：[このトピックに関する講演のスライドと動画](https://fsharpforfunandprofit.com/parser/)*

このシリーズでは、アプリカティブパーサーとパーサーコンビネータの仕組みを解説しています。

* [第1回](../posts/understanding-parser-combinators.md)では、パーシングライブラリの基礎を作りました。
* [第2回](../posts/understanding-parser-combinators-2.md)では、他の多くの便利なコンビネータでライブラリを拡張しました。
* 今回は、より役立つエラーメッセージを提供するようにライブラリを改良します。

<hr>

## 1. パーサーにラベルを付ける

以前の投稿のいくつかの失敗したコード例では、混乱するようなエラーが出ました。

```fsharp
let parseDigit = anyOf ['0'..'9']
run parseDigit "|ABC"  // Failure "Expecting '9'. Got '|'"
```

`parseDigit`は数字の文字の選択として定義されているので、最後の選択（`'9'`）が失敗したときにそのエラーメッセージを受け取ります。

しかし、このメッセージはかなり混乱を招きます。実際に欲しいのは、「数字」に言及するエラーです。例えば `Failure "Expecting digit. Got '|'"`のようなものです。

つまり、パーサーに「数字」のようなラベルを付ける方法と、失敗が発生したときにそのラベルを表示する方法が必要です。

以前の投稿での`Parser`型の定義を思い出してください。

```fsharp
type Parser<'a> = Parser of (string -> Result<'a * string>)
```

ラベルを追加するには、レコード構造に変更する必要があります。

```fsharp
type ParserLabel = string

/// パーサー構造はパース関数とラベルを持つ
type Parser<'a> = {
    parseFn : (string -> Result<'a * string>)
    label:  ParserLabel 
    }
```

レコードには2つのフィールドがあります。パース関数（`parseFn`）とラベル（`label`）です。

一つの問題は、ラベルがパーサー自体にあるものの、`Result`にはないことです。つまり、クライアントはエラーと一緒にラベルを表示する方法が分かりません。

そこで、エラーメッセージに加えて`Result`の`Failure`ケースにもラベルを追加しましょう。

```fsharp
// エイリアス 
type ParserLabel = string
type ParserError = string

type Result<'a> =
    | Success of 'a
    | Failure of ParserLabel * ParserError 
```

ついでに、パース結果を表示するヘルパー関数も定義しましょう。

```fsharp
let printResult result =
    match result with
    | Success (value,input) -> 
        printfn "%A" value
    | Failure (label,error) -> 
        printfn "Error parsing %s\n%s" label error
```

### コードの更新

`Parser`と`Result`の定義を変更したので、`bindP`のような基本的な関数も変更する必要があります。

```fsharp
/// "bindP"はパーサー生成関数fとパーサーpを取り
/// pの出力をfに渡して新しいパーサーを作成する
let bindP f p =
    let label = "unknown"           // <====== "label"は新しい     
    let innerFn input =
        ...
        match result1 with
        | Failure (label,err) ->    // <====== "label"は新しい
            ...
        | Success (value1,remainingInput) ->
            ...
    {parseFn=innerFn; label=label}  // <====== "parseFn"と"label"は新しい
```

`returnP`、`orElse`、`many`にも同様の変更を加える必要があります。完全なコードは、以下にリンクされたgistをご覧ください。

### ラベルの更新

コンビネータを使って新しい複合パーサーを作成するとき、新しいラベルを割り当てたい場合があります。
これを行うには、元の`parseFn`を新しいラベルを返す別の関数に置き換えます。

コードは以下の通りです。

```fsharp
/// パーサーのラベルを更新する
let setLabel parser newLabel = 
    // 内部関数を変更して新しいラベルを使用する
    let newInnerFn input = 
        let result = parser.parseFn input
        match result with
        | Success s ->
            // 成功の場合、何もしない
            Success s 
        | Failure (oldLabel,err) -> 
            // 失敗の場合、新しいラベルを返す
            Failure (newLabel,err)        // <====== ここで新しいラベルを使用
    // パーサーを返す
    {parseFn=newInnerFn; label=newLabel}  // <====== ここで新しいラベルを使用
```

そして、これの中置バージョンを`<?>`として作成しましょう。

```fsharp
/// setLabelの中置バージョン
let ( <?> ) = setLabel
```

新しい機能をテストしてみましょう！

```fsharp
let parseDigit_WithLabel = 
    anyOf ['0'..'9'] 
    <?> "digit"

run parseDigit_WithLabel "|ABC"  
|> printResult
```

出力は以下のようになります。

```text
Error parsing digit
Unexpected '|'
```

エラーメッセージが`Expecting '9'`ではなく`Error parsing digit`になりました。かなり良くなりました！

### デフォルトラベルの設定

`andThen`や`orElse`などの特定のコンビネータのデフォルトラベルを、入力に基づいて設定することもできます。

```fsharp
/// 2つのパーサーを"A andThen B"として組み合わせる
let andThen p1 p2 =         
    let label = sprintf "%s andThen %s" (getLabel p1) (getLabel p2)
    p1 >>= (fun p1Result -> 
    p2 >>= (fun p2Result -> 
        returnP (p1Result,p2Result) ))
    <?> label         // <====== カスタムラベルを提供

// 2つのパーサーを"A orElse B"として組み合わせる
let orElse parser1 parser2 =
    // 新しいラベルを作る
    let label =       // <====== カスタムラベルを提供
        sprintf "%s orElse %s" (getLabel parser1) (getLabel parser2)
            
            
    let innerFn input =
       ... など ...

/// 文字のリストのいずれかを選択
let anyOf listOfChars = 
    let label = sprintf "any of %A" listOfChars 
    listOfChars
    |> List.map pchar 
    |> choice
    <?> label         // <====== カスタムラベルを提供     
```

<hr>

## 2. "pchar"を"satisfy"に置き換える

これまでの実装で気になっていたのは、他のすべての関数の基礎となる基本的なプリミティブ`pchar`です。

入力モデルと密接に結びついているのが問題です。バイナリ形式からバイトをパースしたり、他の種類の入力をパースしたりする場合はどうすればいいでしょうか。
`pchar`以外のコンビネータは疎結合なので、`pchar`も疎結合にできれば、あらゆる種類のトークンストリームをパースできるようになります。
それが理想的です。

ここで、私の好きなFPのスローガン「すべてをパラメータ化せよ！」を思い出してください。`pchar`の場合、`charToMatch`パラメータを削除し、関数（述語）に置き換えます。
新しい関数を`satisfy`と呼びましょう。

```fsharp
/// 述語を満たす入力トークンにマッチする
let satisfy predicate label =
    let innerFn input =
        if String.IsNullOrEmpty(input) then
            Failure (label,"入力がありません")
        else
            let first = input.[0] 
            if predicate first then      // <====== ここで述語を使用
                let remainingInput = input.[1..]
                Success (first,remainingInput)
            else
                let err = sprintf "予期しない文字 '%c'" first
                Failure (label,err)
    // パーサーを返す
    {parseFn=innerFn;label=label}
```

パラメータ以外で`pchar`の実装から変更されたのは、この1行だけです。

```fsharp
let satisfy predicate label =
    ...
    if predicate first then
    ...
```

`satisfy`を使って、`pchar`を書き直せます。

```fsharp
/// 文字をパースする
let pchar charToMatch = 
    let predicate ch = (ch = charToMatch) 
    let label = sprintf "%c" charToMatch 
    satisfy predicate label 
```

`charToMatch`をラベルとして設定している点に注目してください。以前はこのような改良は難しかったでしょう。
「ラベル」の概念がなかったため、`pchar`は有用なエラーメッセージを返せなかったからです。

`satisfy`関数を使うと、他のパーサーもより効率的に書けます。例えば、数字のパースは元々このようでした。

```fsharp
/// 数字をパースする
let digitChar = 
    anyOf ['0'..'9']
```

しかし、述語を直接使うことで、より効率的に書き直せます。

```fsharp
/// 数字をパースする
let digitChar = 
    let predicate = Char.IsDigit 
    let label = "数字"
    satisfy predicate label 
```

同様に、より効率的な空白文字パーサーも作れます。

```fsharp
/// 空白文字をパースする
let whitespaceChar = 
    let predicate = Char.IsWhiteSpace 
    let label = "空白"
    satisfy predicate label 
```

## 3. エラーメッセージに位置とコンテキストを追加する

エラーメッセージをさらに改善するには、エラーが発生した行と列を表示するとよいでしょう。

単純な1行の入力なら、エラーの位置を追跡するのは簡単です。しかし、100行のJSONファイルをパースする場合、この情報は非常に役立ちます。

行と列を追跡するには、単純な`string`入力をより複雑なものに置き換える必要があります。
まずはそこから始めましょう。

### 位置を追跡する入力の定義

まず、行と列を保存する`Position`型と、列を1つ増やすヘルパー関数、行を1つ増やすヘルパー関数が必要です。

```fsharp
type Position = {
    line : int
    column : int
}

/// 初期位置を定義する
let initialPos = {line=0; column=0}

/// 列番号を増やす
let incrCol pos = 
    {pos with column=pos.column + 1}

/// 行番号を増やし、列を0にする
let incrLine pos = 
    {line=pos.line + 1; column=0}
```

次に、入力文字列と位置を1つの「入力状態」型に結合します。
行指向なので、入力文字列を1つの巨大な文字列ではなく行の配列として保存すると便利です。

```fsharp
/// 現在の入力状態を定義する
type InputState = {
    lines : string[]
    position : Position 
}
```

また、文字列を初期の`InputState`に変換する方法も必要です。

```fsharp
/// 文字列から新しいInputStateを作成する
let fromStr str = 
    if String.IsNullOrEmpty(str) then
        {lines=[||]; position=initialPos}
    else
        let separators = [| "\r\n"; "\n" |]
        let lines = str.Split(separators, StringSplitOptions.None)
        {lines=lines; position=initialPos}
```

最後に、そして最も重要なのは、入力から次の文字を読み取る方法です。これを`nextChar`と呼びましょう。

`nextChar`の入力は`InputState`ですが、出力はどうすべきでしょうか。

* 入力が終わりの場合、次の文字がないことを示すために`None`を返します。
* 文字が利用可能な場合は`Some`を返します。
* さらに、列（または行）が増加しているため、入力状態も変更されています。

つまり、`nextChar`の入力は`InputState`で、出力は`char option * InputState`のペアになります。

次の文字を返すロジックは以下のようになります。

* 入力の最後の文字にいる場合、EOF（`None`）を返し、状態は変更しません。
* 現在の列が行の終わりでない場合、その位置の文字を返し、列位置を増やして状態を変更します。
* 現在の列が行の終わりの場合、改行文字を返し、行位置を増やして状態を変更します。

以下が`nextChar`の実装です。

```fsharp
// 現在の行を返す
let currentLine inputState = 
    let linePos = inputState.position.line
    if linePos < inputState.lines.Length then
        inputState.lines.[linePos]
    else
        "ファイル終端"

/// 入力から次の文字を取得します（存在する場合）
/// 存在しない場合はNoneを返します。更新された入力状態も返します
/// 型シグネチャ: InputState -> InputState * char option 
let nextChar input =
    let linePos = input.position.line
    let colPos = input.position.column
    // 3つのケース
    // 1) 行数が最大行数以上の場合 -> 
    //       ファイル終端を返す
    // 2) 列位置が行の長さより小さい場合 -> 
    //       その位置の文字を返し、列位置を増やす
    // 3) 列位置が行の長さと等しい場合 -> 
    //       改行を返し、行位置を増やす

    if linePos >= input.lines.Length then
        input, None
    else
        let currentLine = currentLine input
        if colPos < currentLine.Length then
            let char = currentLine.[colPos]
            let newPos = incrCol input.position 
            let newState = {input with position=newPos}
            newState, Some char
        else 
            // 行末なので、改行を返して次の行に移動
            let char = '\n'
            let newPos = incrLine input.position 
            let newState = {input with position=newPos}
            newState, Some char
```

以前の`string`実装とは異なり、元の行の配列は変更やコピーをしません。位置だけが変わります。これにより、位置が変わるたびに新しい状態を作成しても効率的です。
テキストはどこでも共有されているからです。

実装が機能するか簡単にテストしてみましょう。
`readAllChars`というヘルパー関数を作り、異なる入力に対する結果を確認します。

```fsharp
let rec readAllChars input =
    [
        let remainingInput,charOpt = nextChar input 
        match charOpt with
        | None -> 
            // 入力終了
            ()
        | Some ch -> 
            // 最初の文字を返す
            yield ch
            // 残りの文字を返す
            yield! readAllChars remainingInput
    ]
```

いくつかの入力例でテストします。

```fsharp
fromStr "" |> readAllChars       // []
fromStr "a" |> readAllChars      // ['a'; '\n']
fromStr "ab" |> readAllChars     // ['a'; 'b'; '\n']
fromStr "a\nb" |> readAllChars   // ['a'; '\n'; 'b'; '\n']
```

この実装は、入力の最後に改行がなくても改行を追加します。これは不具合ではなく、むしろ有用な特徴だと考えています。

### パーサーを新しい入力形式に対応させる

ここで`Parser`型を再び変更する必要があります。

まず、`Failure`ケースで位置情報を返すようにします。エラーメッセージに表示するためです。

`InputState`をそのまま使うこともできますが、この用途に特化した新しい型`ParserPosition`を定義するのが良いでしょう。

```fsharp
/// パーサーの位置情報をエラーメッセージ用に保存する
type ParserPosition = {
    currentLine : string
    line : int
    column : int
    }
```

`InputState`を`ParserPosition`に変換する方法も必要です。

```fsharp
let parserPositionFromInputState (inputState:Input) = {
    currentLine = TextInput.currentLine inputState
    line = inputState.position.line
    column = inputState.position.column
    }
```

最後に、`ParserPosition`を含めるように`Result`型を更新します。

```fsharp
// Result型
type Result<'a> =
    | Success of 'a
    | Failure of ParserLabel * ParserError * ParserPosition 
```

さらに、`Parser`型を`string`から`InputState`に変更します。

```fsharp
type Input = TextInput.InputState  // 型エイリアス

/// Parser構造はパース関数とラベルを持つ
type Parser<'a> = {
    parseFn : (Input -> Result<'a * Input>)
    label:  ParserLabel 
    }
```

この追加情報を使って、`printResult`関数を拡張し、現在の行のテキストとエラーの位置を示す矢印を表示できます。

```fsharp
let printResult result =
    match result with
    | Success (value,input) -> 
        printfn "%A" value
    | Failure (label,error,parserPos) -> 
        let errorLine = parserPos.currentLine
        let colPos = parserPos.column
        let linePos = parserPos.line
        let failureCaret = sprintf "%*s^%s" colPos "" error
        printfn "%d行目 %d列目 %sのパースでエラー\n%s\n%s" linePos colPos label errorLine failureCaret 
```

ダミーのエラー値で`printResult`をテストしてみましょう。

```fsharp
let exampleError = 
    Failure ("識別子", "予期しない |",
             {currentLine = "123 ab|cd"; line=1; column=6})

printResult exampleError 
```

出力は以下のようになります。

```text
1行目 6列目 識別子のパースでエラー
123 ab|cd
      ^予期しない |
```

以前よりもずっと分かりやすくなりました！

### `run`関数の修正

`run`関数は今後、文字列ではなく`InputState`を受け取る必要があります。しかし、文字列入力に対しても実行できる便利さは残したいところです。
そこで、2つの`run`関数を作成しましょう。1つは`InputState`を受け取り、もう1つは`string`を受け取ります。

```fsharp
/// InputStateに対してパーサーを実行
let runOnInput parser input =
    // 内部関数を入力で呼び出す
    parser.parseFn input

/// 文字列に対してパーサーを実行
let run parser inputStr =
    // 内部関数を入力で呼び出す
    runOnInput parser (TextInput.fromStr inputStr)
```

### コンビネータの修正

`Failure`ケースに、これまでの2つではなく3つの項目が含まれるようになりました。
これにより一部のコードが動作しなくなりますが、修正は簡単です。今後同じ問題が起きないよう、専用の`ParserError`型を作りたい気もします。ただし今回は、単にエラーを修正するにとどめておきます。

新しい`satisfy`の実装です。

```fsharp
/// 述語を満たす入力トークンにマッチする
let satisfy predicate label =
    let innerFn input =
        let remainingInput,charOpt = TextInput.nextChar input
        match charOpt with
        | None ->
            let err = "入力が終了しました"
            let pos = parserPositionFromInputState input
            //Failure (label,err)     // <====== 旧バージョン
            Failure (label,err,pos)   // <====== 新バージョン
        | Some first ->
            if predicate first then
                Success (first,remainingInput)
            else
                let err = sprintf "予期しない文字 '%c'" first
                let pos = parserPositionFromInputState input
                //Failure (label,err)     // <====== 旧バージョン
                Failure (label,err,pos)   // <====== 新バージョン
    // パーサーを返す
    {parseFn=innerFn;label=label}
```

入力状態からパーサーの位置情報を作り、失敗時のコードは`Failure (label,err,pos)`となりました。

`bindP`も同様に修正します。

```fsharp
/// "bindP"はパーサー生成関数fとパーサーpを受け取り
/// pの出力をfに渡して新しいパーサーを作成する
let bindP f p =
    let label = "unknown"
    let innerFn input =
        let result1 = runOnInput p input
        match result1 with
        | Failure (label,err,pos) ->     // <====== 新しく位置情報（pos）を追加
            // パーサー1からのエラーを返す
            Failure (label,err,pos)  
        | Success (value1,remainingInput) ->
            // fを適用して新しいパーサーを取得
            let p2 = f value1
            // 残りの入力で新しいパーサーを実行
            runOnInput p2 remainingInput
    {parseFn=innerFn; label=label}
```

他の関数も同様に修正します。

### 位置情報付きエラーのテスト

実際のパーサーでテストしてみましょう。

```fsharp
let parseAB = 
    pchar 'A' .>>. pchar 'B' 
    <?> "AB"

run parseAB "A|C"  
|> printResult
```

出力は次のとおりです。

```text
1行目 2列目 ABのパースでエラー
A|C
 ^予期しない文字 '|'
```

これで大きく改善しました。

## 4. ライブラリに標準パーサーを追加

前回の投稿では、文字列や整数のパーサーを作成しました。今回はそれらをコアライブラリに追加し、利用者がゼロから実装する必要がないようにします。

これらのパーサーは[FParsecライブラリ](https://www.quanttec.com/fparsec/reference/charparsers.html#)を参考にしています。

まず、文字列関連のパーサーから始めましょう。コードはこれまでの説明で理解できるはずなので、コメントは省略します。

```fsharp
/// 文字をパースする
let pchar charToMatch =
    // ラベルは文字そのもの
    let label = sprintf "%c" charToMatch

    let predicate ch = (ch = charToMatch)
    satisfy predicate label

/// 文字リストのいずれかを選択する
let anyOf listOfChars =
    let label = sprintf "anyOf %A" listOfChars
    listOfChars
    |> List.map pchar // パーサーに変換
    |> choice
    <?> label
   
/// 文字リストを文字列に変換する
let charListToStr charList =
    String(List.toArray charList)

/// 文字パーサーcpを使用して0個以上の文字の並びをパースする
/// パースした文字を文字列として返す
let manyChars cp =
    many cp
    |>> charListToStr

/// 文字パーサーcpを使用して1個以上の文字の並びをパースする
/// パースした文字を文字列として返す
let manyChars1 cp =
    many1 cp
    |>> charListToStr

/// 特定の文字列をパースする
let pstring str =
    // ラベルは文字列そのもの
    let label = str

    str
    // 文字のリストに変換
    |> List.ofSeq
    // 各文字をpcharにマップ
    |> List.map pchar
    // Parser<char list>に変換
    |> sequence
    // Parser<char list>をParser<string>に変換
    |> mapP charListToStr
    <?> label
```

`pstring`のテスト例です。

```fsharp
run (pstring "AB") "ABC"  
|> printResult   
// Success
// "AB"

run (pstring "AB") "A|C"  
|> printResult
// 1行目 2列目 ABのパースでエラー
// A|C
//  ^予期しない文字 '|'
```

### 空白文字のパーサー

パースにおいて、空白文字は重要です。最終的には無視することが多いですが、処理は必要です。

```fsharp
/// 空白文字をパースする
let whitespaceChar = 
    let predicate = Char.IsWhiteSpace 
    let label = "空白"
    satisfy predicate label 

/// 0個以上の空白文字をパースする
let spaces = many whitespaceChar

/// 1個以上の空白文字をパースする
let spaces1 = many1 whitespaceChar
```

空白文字のテスト例です。

```fsharp
run spaces " ABC"  
|> printResult   
// [' ']

run spaces "A"  
|> printResult
// []

run spaces1 " ABC"  
|> printResult   
// [' ']

run spaces1 "A"  
|> printResult
// 1行目 1列目 many1 空白のパースでエラー
// A
// ^予期しない文字 'A'
```

### 数値のパーサー

最後に、整数と浮動小数点数のパーサーが必要です。

```fsharp
/// 数字をパースする
let digitChar = 
    let predicate = Char.IsDigit 
    let label = "数字"
    satisfy predicate label 

// 整数をパースする
let pint = 
    let label = "整数" 

    // ヘルパー関数
    let resultToInt (sign,digits) = 
        let i = digits |> int  // オーバーフローは今のところ無視
        match sign with
        | Some ch -> -i  // 整数を負にする
        | None -> i
        
    // 1つ以上の数字のパーサーを定義
    let digits = manyChars1 digitChar 

    // "整数"は、オプションの符号 + 1つ以上の数字
    opt (pchar '-') .>>. digits 
    |> mapP resultToInt
    <?> label

// 浮動小数点数をパースする
let pfloat = 
    let label = "浮動小数点数" 

    // ヘルパー関数
    let resultToFloat (((sign,digits1),point),digits2) = 
        let fl = sprintf "%s.%s" digits1 digits2 |> float
        match sign with
        | Some ch -> -fl  // 浮動小数点数を負にする
        | None -> fl
        
    // 1つ以上の数字のパーサーを定義 
    let digits = manyChars1 digitChar 

    // 浮動小数点数は、符号、数字、小数点、数字（指数は今のところ無視）
    opt (pchar '-') .>>. digits .>>. pchar '.' .>>. digits 
    |> mapP resultToFloat
    <?> label
```

テスト例です。

```fsharp
run pint "-123Z" 
|> printResult   
// -123

run pint "-Z123" 
|> printResult
// 1行目 2列目 整数のパースでエラー
// -Z123
//  ^予期しない文字 'Z'

run pfloat "-123.45Z" 
|> printResult   
// -123.45

run pfloat "-123Z45" 
|> printResult
// 1行目 5列目 浮動小数点数のパースでエラー
// -123Z45
//     ^予期しない文字 'Z'
```

## 5. バックトラッキング

最後に議論すべき重要なトピックは「バックトラッキング」です。

例えば、文字列`A-1`にマッチするパーサーと、文字列`A-2`にマッチするパーサーがあるとします。
入力が`A-2`の場合、最初のパーサーは3文字目で失敗し、2番目のパーサーが試行されます。

このとき、2番目のパーサーは3文字目からではなく、元の文字列の*先頭*から開始する必要があります。
つまり、入力ストリームの現在位置を元に戻し、最初の位置に戻る必要があるのです。

可変の入力ストリームを使用していれば、これは難しい問題かもしれません。しかし幸いなことに、私たちは不変データを使用しています。そのため、位置を「元に戻す」というのは、単に元の入力値を使用するだけです。
そして、これはまさに`orElse`（`<|>`）のようなコンビネータが行っていることです。

言い換えると、不変の入力状態を使用することで、バックトラッキングが「無料で」得られるのです。素晴らしいですね！

しかし、バックトラックしたくない場合もあります。例えば、次のようなパーサーがあるとします。

* `forExpression` = "for"キーワード、識別子、"in"キーワードなど
* `ifExpression` = "if"キーワード、識別子、"then"キーワードなど

そして、これらを組み合わせた式パーサーを作成します。

* `expression` = `forExpression <|> ifExpression` 

ここで、入力ストリームが`for &&& in something`だった場合、`forExpression`パーサーは`&&&`のところでエラーになります。有効な識別子を期待しているからです。
この時点で、`ifExpression`を試すためにバックトラックはしたくありません。むしろ、「'for'の後に識別子が必要です」といったエラーを表示したいのです。

ルールは次のようになります。入力が正常に消費された場合（この例では「for」キーワードが正常にマッチした場合）は、バックトラックしません。

このルールは、我々の単純なライブラリでは実装しませんが、FParsecのような本格的なライブラリではこれを実装しています。
また、[必要に応じてこれを回避する方法](https://www.quanttec.com/fparsec/reference/primitives.html#members.attempt)も用意されています。

## 最終的なパーサーライブラリのリスト

パーシングライブラリは現在500行ほどのコードになっているため、ここでは全てを示しません。[このgist](https://gist.github.com/swlaschin/485f418fede6b6a36d89#file-parserlibrary-fsx)で確認できます。

## まとめ

この投稿では、より良いエラー処理といくつかの新しいパーサーを追加しました。

これで、JSONパーサーを組み立てるために必要なものが全て揃いました。
それが[次の投稿](../posts/understanding-parser-combinators-4.md)のテーマです。

*この投稿のソースコードは[このgist](https://gist.github.com/swlaschin/485f418fede6b6a36d89#file-understanding_parser_combinators-3-fsx)で入手できます。*

