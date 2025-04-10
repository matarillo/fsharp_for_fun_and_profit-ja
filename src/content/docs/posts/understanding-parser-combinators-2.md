---
layout: post
title: "便利なパーサーコンビネータの作成"
description: "15個ほどのコンビネータでほとんどのものを解析できます"
categories: ["コンビネータ", "パターン"]
seriesId: "パーサーコンビネータの理解"
seriesOrder: 2
---

*更新：[このトピックに関する私の講演のスライドとビデオ](https://fsharpforfunandprofit.com/parser/)*

このシリーズでは、アプリカティブパーサーとパーサーコンビネータの仕組みを見ていきます。

* [最初の投稿](../posts/understanding-parser-combinators.md)でパーシングライブラリの基礎を作りました。
* この投稿では、他の多くの便利なコンビネータを使ってライブラリを拡張します。
  コンビネータ名は[FParsec](https://www.quanttec.com/fparsec/)で使われているものをコピーしているので、簡単に移行できます。

<hr>


## 1. `map` ―― パーサーの内容を変換する

パースするとき、「if」や「where」などの予約語のような特定の文字列に一致させたいことがよくあります。文字列は単なる文字の列なので、
最初の投稿で`anyOf`を定義したときと同じ手法を使えるはずです。ただし、`orElse`の代わりに`andThen`を使います。

以下は、そのアプローチを使って`pstring`パーサーを作ろうとした（失敗した）試みです。

```fsharp
let pstring str = 
    str
    |> Seq.map pchar // パーサーに変換
    |> Seq.reduce andThen
```

これは機能しません。`andThen`の出力は入力と異なる（文字ではなくタプル）ため、`reduce`アプローチが失敗します。

この問題を解決するには、別の手法が必要です。

まずは、特定の長さの文字列に一致させることから始めましょう。
たとえば、3桁の数字を連続して一致させたい場合、`andThen`を使って次のようにできます。

```fsharp
let parseDigit =
    anyOf ['0'..'9']

let parseThreeDigits = 
    parseDigit .>>. parseDigit .>>. parseDigit 
```

次のように実行すると、

```fsharp
run parseThreeDigits "123A"
```

結果は以下のようになります。
 
```fsharp
Success ((('1', '2'), '3'), "A")
```

動作はしますが、結果にはタプル内のタプル`(('1', '2'), '3')`が含まれており、見た目が悪く使いにくいです。
単純な文字列（`"123"`）があれば、はるかに便利でしょう。

しかし、`('1', '2'), '3')`を`"123"`に変換するには、パーサー内部に入り込み、任意の関数を使って結果を変換できる関数が必要です。

もちろん、必要なのは関数型プログラマの親友、`map`です。

`map`や類似の関数を理解するために、2つの世界があると考えるのが好きです。通常の物事が存在する「通常の世界」と、`Parser`が存在する「パーサーの世界」です。

パーサーの世界は通常の世界の一種の「鏡」と考えられます。次のルールに従うからです。

* 通常の世界のすべての型（たとえば`char`）には、パーサーの世界に対応する型（`Parser<char>`）があります。

![](../assets/img/parser-world-return.png)

そして、

* 通常の世界のすべての値（たとえば`"ABC"`）には、パーサーの世界に対応する値（つまり、`"ABC"`を返す`Parser<string>`）があります。

さらに、

* 通常の世界のすべての関数（たとえば`char -> string`）には、パーサーの世界に対応する関数（`Parser<char> -> Parser<string>`）があります。

![](../assets/img/parser-world-map.png)

この比喩を使うと、`map`は通常の世界の関数をパーサーの世界の関数に変換（または「持ち上げ」）します。

![](../assets/img/parser-map.png)

*ちなみに、この比喩が気に入ったなら、[さらに詳しく説明した連載](../posts/elevated-world.md)があります。*

これが`map`の機能です。では、どのように実装すればいいでしょうか。

ロジックは次のとおりです。

* `innerFn`内でパーサーを実行して結果を取得します。
* 結果が成功だった場合、指定された関数を成功値に適用して新しい変換された値を取得し、
* 元の値の代わりに新しくマップされた値を返します。

以下がコードです（他のmap関数との混同を避けるため、map関数を`mapP`と名付けました）。

```fsharp
let mapP f parser = 
    let innerFn input =
        // 入力でパーサーを実行
        let result = run parser input

        // 結果を失敗/成功でテスト
        match result with
        | Success (value,remaining) -> 
            // 成功した場合、fで変換した値を返す
            let newValue = f value
            Success (newValue, remaining)

        | Failure err -> 
            // 失敗した場合、エラーを返す
            Failure err
    // 内部関数を返す
    Parser innerFn 
```

`mapP`のシグネチャを見てみましょう。

```fsharp
val mapP : 
    f:('a -> 'b) -> Parser<'a> -> Parser<'b>
```

これは、関数`'a -> 'b`を関数`Parser<'a> -> Parser<'b>`に変換する、まさに望んでいたシグネチャです。

`map`の中置バージョンを定義するのも一般的です。

```fsharp
let ( <!> ) = mapP
```

そして、パースの文脈では、マッピング関数をパーサーの後に置き、パラメータを反転させることがよくあります。
これにより、パイプラインイディオムで`map`を使うのがはるかに便利になります。

```fsharp
let ( |>> ) x f = mapP f x
```

### `mapP`を使って3桁の数字をパースする

`mapP`が使えるようになったので、`parseThreeDigits`を再検討し、タプルを文字列に変換できます。

以下がコードです。

```fsharp
let parseDigit = anyOf ['0'..'9']

let parseThreeDigitsAsStr = 
    // タプルを返すパーサーを作る
    let tupleParser = 
        parseDigit .>>. parseDigit .>>. parseDigit

    // タプルを文字列に変換する関数を作る
    let transformTuple ((c1, c2), c3) = 
        String [| c1; c2; c3 |]

    // "map"を使って組み合わせる
    mapP transformTuple tupleParser 
```

または、より簡潔な実装もできます。

```fsharp
let parseThreeDigitsAsStr = 
    (parseDigit .>>. parseDigit .>>. parseDigit)
    |>> fun ((c1, c2), c3) -> String [| c1; c2; c3 |]
```


テストすると、結果にタプルではなく文字列が含まれます。

```fsharp
run parseThreeDigitsAsStr "123A"  // Success ("123", "A")
```

さらに進んで、文字列を整数にマップすることもできます。

```fsharp
let parseThreeDigitsAsInt = 
    mapP int parseThreeDigitsAsStr 
```

これをテストすると、Successブランチに`int`が含まれます。

```fsharp
run parseThreeDigitsAsInt "123A"  // Success (123, "A")
```

`parseThreeDigitsAsInt`の型を確認してみましょう。

```fsharp
val parseThreeDigitsAsInt : Parser<int>
```

これは`Parser<char>`や`Parser<string>`ではなく、`Parser<int>`になりました。
`Parser`が文字や文字列だけでなく*任意の*型を含められるという事実は、より複雑なパーサーを組み立てるときに非常に価値のある重要な特徴です。


## 2. `apply`と`return` ―― 関数をパーサーの世界に持ち上げる

文字のリストに一致するパーサーを作るという目標を達成するには、`returnP`と`applyP`と呼ぶ2つのヘルパー関数が必要です。

* `returnP`は単に通常の値をパーサーの世界の値に変換します。
* `applyP`は関数を含むパーサー（`Parser< 'a->'b >`）をパーサーの世界の関数（`Parser<'a> -> Parser<'b >`）に変換します。

以下は`returnP`の図です。

![](../assets/img/parser-return.png)

そして、これが`returnP`の実装です。

```fsharp
let returnP x = 
    let innerFn input =
        // 入力を無視してxを返す
        Success (x,input )
    // 内部関数を返す
    Parser innerFn 
```

`returnP`のシグネチャは望んでいたとおりです。

```fsharp
val returnP : 
    'a -> Parser<'a>
```

次に`applyP`の図を示します。

![](../assets/img/parser-apply.png)

そして、これが`.>>.`と`map`を使った`applyP`の実装です。

```fsharp
let applyP fP xP = 
    // ペア(f,x)を含むパーサーを作る
    (fP .>>. xP) 
    // fをxに適用してペアをマップする
    |> mapP (fun (f,x) -> f x)
```

`applyP`の中置バージョンは`<*>`と書きます。

```fsharp
let ( <*> ) = applyP
```
    
ここでも、`applyP`のシグネチャは望んでいたとおりです。

```fsharp
val applyP : 
    Parser<('a -> 'b)> -> Parser<'a> -> Parser<'b>
```

なぜこの2つの関数が必要なのでしょうか。`map`は通常の世界の関数をパーサーの世界の関数に持ち上げますが、1つのパラメータの関数に限られます。

`returnP`と`applyP`の素晴らしい点は、一緒に使うことで、パラメータの数に関係なく、通常の世界の*任意の*関数をパーサーの世界の関数に持ち上げられることです。

たとえば、2つのパラメータを持つ関数をパーサーの世界に持ち上げる`lift2`関数を次のように定義できます。

```fsharp
// 2つのパラメータを持つ関数をパーサーの世界に持ち上げる
let lift2 f xP yP =
    returnP f <*> xP <*> yP
```

`lift2`のシグネチャは次のとおりです。

```fsharp
val lift2 : 
    f:('a -> 'b -> 'c) -> Parser<'a> -> Parser<'b> -> Parser<'c>
```

これが`lift2`の図です。

![](../assets/img/parser-lift2.png)

*この仕組みについてもっと知りたい場合は、[`lift2`に関する私の「マニュアルページ」投稿](../posts/elevated-world.md)や[「Monadster」を使った説明](../posts/monadster.md)をご覧ください。*

`lift2`を実際に使う例を見てみましょう。まず、整数の加算をパーサーの加算に持ち上げます。

```fsharp
let addP = 
    lift2 (+)
```

シグネチャは次のようになります。

```fsharp
val addP : 
    Parser<int> -> Parser<int> -> Parser<int>
```

これは`addP`が確かに2つの`Parser<int>`パラメータを取り、別の`Parser<int>`を返すことを示しています。


次に`startsWith`関数をパーサーの世界に持ち上げます。

```fsharp
let startsWith (str:string) prefix =
    str.StartsWith(prefix)  

let startsWithP =
    lift2 startsWith 
```

ここでも、`startsWithP`のシグネチャは`startsWith`のシグネチャと並行していますが、パーサーの世界に持ち上げられています。

```fsharp
val startsWith : 
    str:string -> prefix:string -> bool
    
val startsWithP : 
    Parser<string> -> Parser<string> -> Parser<bool>
```


## 3. `sequence` ―― パーサーのリストを1つのパーサーに変換する

これで、シーケンシングコンビネータを実装するのに必要なツールが揃いました。ロジックは次のとおりです。

* リストの「cons」演算子から始めます。これは「head」要素を要素の「tail」に前置して新しいリストを作る2つのパラメータを持つ関数です。
* `lift2`を使って`cons`をパーサーの世界に持ち上げます。
* これで、head `Parser`をtailの`Parser`のリストに前置して新しい`Parser`のリストを作る関数ができました。ここで、
  * headパーサーは渡されたパーサーのリストの最初の要素です。
  * tailは同じ関数をリストの次のパーサーで再帰的に呼び出すことで生成されます。
* 入力リストが空の場合は、空のリストを含む`Parser`を返します。

実装は以下のとおりです。

```fsharp
let rec sequence parserList =
    // "cons"関数を定義（2つのパラメータを持つ関数）
    let cons head tail = head::tail

    // パーサーの世界に持ち上げる
    let consP = lift2 cons

    // パーサーのリストを再帰的に処理
    match parserList with
    | [] -> 
        returnP []
    | head::tail ->
        consP head (sequence tail)
```

`sequence`のシグネチャは次のとおりです。

```fsharp
val sequence : 
    Parser<'a> list -> Parser<'a list>
```

これは入力が`Parser`のリストで、出力が要素のリストを含む`Parser`であることを示しています。

3つのパーサーのリストを作成し、それらを1つに結合してテストしてみましょう。

```fsharp
let parsers = [ pchar 'A'; pchar 'B'; pchar 'C' ]
let combined = sequence parsers

run combined "ABCD" 
// Success (['A'; 'B'; 'C'], "D")
```

見ての通り、実行すると元のリストの各パーサーに対応する文字のリストが返ってきます。

### `pstring`パーサーの実装

ついに、文字列に一致するパーサー（`pstring`と呼びます）を実装できます。

ロジックは次のとおりです。

* 文字列を文字のリストに変換します。
* 各文字を`Parser<char>`に変換します。
* `sequence`を使って`Parser<char>`のリストを単一の`Parser<char list>`に変換します。
* 最後に、`map`を使って`Parser<char list>`を`Parser<string>`に変換します。

以下がコードです。

```fsharp
/// 文字のリストから文字列を作るヘルパー
let charListToStr charList = 
     String(List.toArray charList)

// 特定の文字列に一致する
let pstring str = 
    str
    // 文字のリストに変換
    |> List.ofSeq
    // 各文字をpcharにマップ
    |> List.map pchar 
    // Parser<char list>に変換
    |> sequence
    // Parser<char list>をParser<string>に変換
    |> mapP charListToStr 
```

テストしてみましょう。

```fsharp
let parseABC = pstring "ABC"

run parseABC "ABCDE"  // Success ("ABC", "DE")
run parseABC "A|CDE"  // Failure "Expecting 'B'. Got '|'"
run parseABC "AB|DE"  // Failure "Expecting 'C'. Got '|'"
```

期待通りに動作しています。よかった！

## 4. `many`と`many1` ―― パーサーを複数回マッチさせる

よくある要件として、特定のパーサーをできるだけ多く一致させることがあります。たとえば：

* 整数を一致させるとき、できるだけ多くの数字文字を一致させたいです。
* 空白文字の連続を一致させるとき、できるだけ多くの空白文字を一致させたいです。

これらの2つのケースには、少し異なる要件があります。

* 空白文字を一致させるとき、多くの場合オプションなので、「0回以上」のマッチャーが欲しいです。これを`many`と呼びます。
* 一方、整数の数字を一致させるときは、*少なくとも1個*の数字に一致させたいので、「1回以上」のマッチャーが欲しいです。これを`many1`と呼びます。

これらを作る前に、パーサーを0回以上一致させるヘルパー関数を定義します。ロジックは次のとおりです。

* パーサーを実行します。
* パーサーが`Failure`を返した場合（これが重要です）、空のリストを返します。つまり、この関数は決して失敗しません！
* パーサーが成功した場合：
  * 関数を再帰的に呼び出して残りの値を取得します（これも空のリストかもしれません）。
  * そして、最初の値と残りの値を組み合わせます。

以下がコードです。

```fsharp
let rec parseZeroOrMore parser input =
    // 入力でパーサーを実行
    let firstResult = run parser input 
    // 結果を失敗/成功でテスト
    match firstResult with
    | Failure err -> 
        // パースが失敗したら空のリストを返す
        ([],input)  
    | Success (firstValue,inputAfterFirstParse) -> 
        // パースが成功したら、再帰的に呼び出して
        // 後続の値を取得
        let (subsequentValues,remainingInput) = 
            parseZeroOrMore parser inputAfterFirstParse
        let values = firstValue::subsequentValues
        (values,remainingInput)  
```

このヘルパー関数を使えば、`many`を簡単に定義できます ―― `parseZeroOrMore`のラッパーにすぎません。

```fsharp
/// 指定されたパーサーの0回以上の出現に一致する
let many parser = 

    let rec innerFn input =
        // 入力をパース -- 常に成功するのでSuccessでラップ
        Success (parseZeroOrMore parser input)

    Parser innerFn
```

`many`のシグネチャを見ると、出力が確かに`Parser`でラップされた値のリストであることがわかります。

```fsharp
val many : 
    Parser<'a> -> Parser<'a list>
```

では、`many`をテストしてみましょう。

```fsharp
let manyA = many (pchar 'A')

// 成功するケースをいくつかテスト
run manyA "ABCD"  // Success (['A'], "BCD")
run manyA "AACD"  // Success (['A'; 'A'], "CD")
run manyA "AAAD"  // Success (['A'; 'A'; 'A'], "D")

// 一致がないケースをテスト
run manyA "|BCD"  // Success ([], "|BCD")
```

最後のケースでは、一致するものがなくても関数は成功することに注意してください。

`many`の使用は単一の文字に限定されません。たとえば、繰り返される文字列のシーケンスにも一致させることができます。

```fsharp
let manyAB = many (pstring "AB")

run manyAB "ABCD"  // Success (["AB"], "CD")
run manyAB "ABABCD"  // Success (["AB"; "AB"], "CD")
run manyAB "ZCD"  // Success ([], "ZCD")
run manyAB "AZCD"  // Success ([], "AZCD")
```

最後に、空白文字に一致させる元の例を実装してみましょう。

```fsharp
let whitespaceChar = anyOf [' '; '\t'; '\n']
let whitespace = many whitespaceChar 

run whitespace "ABC"  // Success ([], "ABC")
run whitespace " ABC"  // Success ([' '], "ABC")
run whitespace "\tABC"  // Success (['\t'], "ABC")
```

### `many1`の定義

「1回以上」のコンビネータ`many1`も定義できます。ロジックは次のとおりです。

* パーサーを実行します。
* 失敗した場合、その失敗を返します。
* 成功した場合：
  * ヘルパー関数`parseZeroOrMore`を呼び出して残りの値を取得します。
  * 最初の値と残りの値を組み合わせます。

```fsharp
/// 指定されたパーサーの1回以上の出現に一致する
let many1 parser = 
    let rec innerFn input =
        // 入力でパーサーを実行
        let firstResult = run parser input 
        // 結果を失敗/成功でテスト
        match firstResult with
        | Failure err -> 
            Failure err // 失敗
        | Success (firstValue,inputAfterFirstParse) -> 
            // 最初が見つかったら、次はzeroOrMoreを探す
            let (subsequentValues,remainingInput) = 
                parseZeroOrMore parser inputAfterFirstParse
            let values = firstValue::subsequentValues
            Success (values,remainingInput)  
    Parser innerFn
```

`many1`のシグネチャを見ると、出力が`Parser`でラップされた値のリストであることがわかります。

```fsharp
val many1 : 
    Parser<'a> -> Parser<'a list>
```

`many1`をテストしてみましょう。

```fsharp
// 1桁の数字のパーサーを定義
let digit = anyOf ['0'..'9']

// 1桁以上の数字のパーサーを定義
let digits = many1 digit 

run digits "1ABC"  // Success (['1'], "ABC")
run digits "12BC"  // Success (['1'; '2'], "BC")
run digits "123C"  // Success (['1'; '2'; '3'], "C")
run digits "1234"  // Success (['1'; '2'; '3'; '4'], "")

run digits "ABC"   // Failure "Expecting '9'. Got 'A'"
```

最後のケースは誤解を招くエラーを出します。「9」を期待しているとありますが、実際には「数字を期待している」と言うべきです。
これは次の投稿で修正します。

### 整数をパースする

`many1`を使って、整数のパーサーを作れます。実装のロジックは次のとおりです。

* 数字のパーサーを作ります。
* `many1`を使って数字のリストを取得します。
* `map`を使って、結果（数字のリスト）を文字列に変換し、さらに整数に変換します。

以下がコードです。

```fsharp
let pint = 
    // ヘルパー
    let resultToInt digitList = 
        // 今のところ整数のオーバーフローは無視
        String(List.toArray digitList) |> int
        
    // 1桁の数字のパーサーを定義
    let digit = anyOf ['0'..'9']

    // 1桁以上の数字のパーサーを定義
    let digits = many1 digit 

    // 数字を整数にマップ
    digits 
    |> mapP resultToInt
```

テストしてみましょう。

```fsharp
run pint "1ABC"  // Success (1, "ABC")
run pint "12BC"  // Success (12, "BC")
run pint "123C"  // Success (123, "C")
run pint "1234"  // Success (1234, "")

run pint "ABC"   // Failure "Expecting '9'. Got 'A'"
```

## 5. `opt` ―― パーサーを0回または1回一致させる

パーサーを0回または1回だけ一致させたい場合があります。たとえば、上の`pint`パーサーは負の値を扱えません。
これを修正するには、オプションのマイナス記号を扱える必要があります。

`opt`コンビネータは簡単に定義できます。

* 指定されたパーサーの結果を、`Some`にマップしてオプションに変更します。
* 常に`None`を返す別のパーサーを作ります。
* `<|>`を使って、最初のパーサーが失敗した場合に2つ目の（「None」）パーサーを選択します。

以下がコードです。

```fsharp
let opt p = 
    let some = p |>> Some
    let none = returnP None
    some <|> none
```

使用例を示します。数字の後にオプションのセミコロンを一致させます。

```fsharp
let digit = anyOf ['0'..'9']
let digitThenSemicolon = digit .>>. opt (pchar ';')

run digitThenSemicolon "1;"  // Success (('1', Some ';'), "")
run digitThenSemicolon "1"   // Success (('1', None), "")
```

オプションのマイナス記号を扱うように`pint`を書き直すと次のようになります。

```fsharp
let pint = 
    // ヘルパー
    let resultToInt (sign,charList) = 
        let i = String(List.toArray charList) |> int
        match sign with
        | Some ch -> -i  // 整数を負にする
        | None -> i
        
    // 1桁の数字のパーサーを定義
    let digit = anyOf ['0'..'9']

    // 1桁以上の数字のパーサーを定義
    let digits = many1 digit 

    // パースして変換
    opt (pchar '-') .>>. digits 
    |>> resultToInt 
```

`resultToInt`ヘルパー関数が、数字のリストだけでなく記号オプションも扱うように変更されています。

実際に動かしてみましょう。

```fsharp
run pint "123C"   // Success (123, "C")
run pint "-123C"  // Success (-123, "C")
```

## 6. 結果を捨てる

入力の一部に一致させる必要があるが、パースされた値自体は不要な場合がよくあります。たとえば、

* 引用符で囲まれた文字列では、引用符をパースする必要はありますが、引用符自体は不要です。
* セミコロンで終わる文では、セミコロンの存在を確認する必要はありますが、セミコロン自体は不要です。
* 空白区切りでは、空白の存在を確認する必要はありますが、実際の空白データは不要です。

これらの要件を扱うために、パーサーの結果を捨てる新しいコンビネータを定義します。

* `p1 >>. p2`は`.>>.`と同様に`p1`と`p2`を順に適用しますが、`p1`の結果を捨てて`p2`の結果を保持します。
* `p1 .>> p2`は`.>>.`と同様に`p1`と`p2`を順に適用しますが、`p1`の結果を保持し`p2`の結果を捨てます。

これらは簡単に定義できます。`.>>.`の結果（タプル）をマップし、ペアの1つの要素だけを保持します。

```fsharp
/// 左側のパーサーの結果のみを保持
let (.>>) p1 p2 = 
    // ペアを作成
    p1 .>>. p2 
    // 最初の値のみを保持
    |> mapP (fun (a,b) -> a) 

/// 右側のパーサーの結果のみを保持   
let (>>.) p1 p2 = 
    // ペアを作成
    p1 .>>. p2 
    // 2番目の値のみを保持
    |> mapP (fun (a,b) -> b) 
```

これらのコンビネータを使うと、先ほどの`digitThenSemicolon`の例を簡略化できます。

```fsharp
let digit = anyOf ['0'..'9']

// 以下で.>>を使用
let digitThenSemicolon = digit .>> opt (pchar ';')  

run digitThenSemicolon "1;"  // Success ('1', "")
run digitThenSemicolon "1"   // Success ('1', "")
```

セミコロンの有無にかかわらず、結果が同じになっていることがわかります。

空白を含む例を見てみましょう。

以下のコードは、"AB"の後に1つ以上の空白文字、そして"CD"を探すパーサーを作成します。

```fsharp
let whitespaceChar = anyOf [' '; '\t'; '\n']
let whitespace = many1 whitespaceChar 

let ab = pstring "AB"
let cd = pstring "CD"
let ab_cd = (ab .>> whitespace) .>>. cd

run ab_cd "AB \t\nCD"   // Success (("AB", "CD"), "")
```

結果には"AB"と"CD"のみが含まれています。その間の空白は破棄されました。

### `between`の導入

特に一般的な要件は、引用符や括弧などの区切り文字の間にあるパーサーを探すことです。

このためのコンビネータを作るのは簡単です。

```fsharp
/// 中央のパーサーの結果のみを保持
let between p1 p2 p3 = 
    p1 >>. p2 .>> p3 
```

これを使って、引用符で囲まれた整数をパースする例を示します。

```fsharp
let pdoublequote = pchar '"'
let quotedInteger = between pdoublequote pint pdoublequote

run quotedInteger "\"1234\""   // Success (1234, "")
run quotedInteger "1234"       // Failure "Expecting '"'. Got '1'"
```

## 7. 区切り文字付きリストのパース

もう1つの一般的な要件は、コンマや空白のような何かで区切られたリストをパースすることです。

「1回以上」のリストを実装するには、以下の手順が必要です。

* まず、区切り文字とパーサーを1つの組み合わせたパーサーにしますが、`>>.`を使って区切り文字の値を捨てます。
* 次に、`many`を使って区切り文字/パーサーの組み合わせのリストを探します。
* そして、最初のパーサーをそれに前置し、結果を結合します。

以下がコードです。

```fsharp
/// pをsepで区切って1回以上出現させる
let sepBy1 p sep =
    let sepThenP = sep >>. p            
    p .>>. many sepThenP 
    |>> fun (p,pList) -> p::pList
```

「0回以上」バージョンでは、`sepBy1`が一致を見つけられない場合に空のリストを代替として選択できます。

```fsharp
/// pをsepで区切って0回以上出現させる
let sepBy p sep =
    sepBy1 p sep <|> returnP []
```

以下は`sepBy1`と`sepBy`のテストで、コメントに結果を示しています。

```fsharp
let comma = pchar ',' 
let digit = anyOf ['0'..'9']

let zeroOrMoreDigitList = sepBy digit comma
let oneOrMoreDigitList = sepBy1 digit comma

run oneOrMoreDigitList "1;"      // Success (['1'], ";")
run oneOrMoreDigitList "1,2;"    // Success (['1'; '2'], ";")
run oneOrMoreDigitList "1,2,3;"  // Success (['1'; '2'; '3'], ";")
run oneOrMoreDigitList "Z;"      // Failure "Expecting '9'. Got 'Z'"

run zeroOrMoreDigitList "1;"     // Success (['1'], ";")
run zeroOrMoreDigitList "1,2;"   // Success (['1'; '2'], ";")
run zeroOrMoreDigitList "1,2,3;" // Success (['1'; '2'; '3'], ";")
run zeroOrMoreDigitList "Z;"     // Success ([], "Z;")
```

## `bind`はどうすればいいでしょうか？

これまで実装してこなかったコンビネータの1つに`bind`（または`>>=`）があります。

関数型プログラミングについて少しでも知っているか、[関数型プログラミングのパターン](https://fsharpforfunandprofit.com/fppatterns/)に関する私の講演を見たことがあれば、
`bind`が多くの関数を実装するのに使える強力なツールであることをご存知でしょう。

ここまで、`map`や`.>>.`などのコンビネータの実装を明示的に示し、理解しやすくすることを優先してきました。

しかし、ここまで経験を積んだので、`bind`を実装してみて、何ができるか見てみましょう。

以下が`bindP`（私がそう呼ぶことにします）の実装です。

```fsharp
/// "bindP"はパーサー生成関数fとパーサーpを取り、
/// pの出力をfに渡して新しいパーサーを作ります
let bindP f p =
    let innerFn input =
        let result1 = run p input 
        match result1 with
        | Failure err -> 
            // parser1のエラーを返す
            Failure err  
        | Success (value1,remainingInput) ->
            // fを適用して新しいパーサーを取得
            let p2 = f value1
            // 残りの入力でパーサーを実行
            run p2 remainingInput
    Parser innerFn 
```

`bindP`のシグネチャは次のようになります。

```fsharp
val bindP : 
    f:('a -> Parser<'b>) -> Parser<'a> -> Parser<'b>
```

これは標準的な`bind`シグネチャに一致しています。入力`f`は「対角線」関数（`'a -> Parser<'b>`）で、出力は「水平」関数（`Parser<'a> -> Parser<'b>`）です。
`bind`の動作に関する詳細は[この投稿](../posts/elevated-world-2.md#bind)を参照してください。

`bind`の中置バージョンは`>>=`です。パラメータが反転していることに注意してください。`f`が2番目のパラメータになり、F#のパイプラインイディオムに便利になります。

```fsharp
let ( >>= ) p f = bindP f p
```

### `bindP`と`returnP`を使って他のコンビネータを再実装する

`bindP`と`returnP`の組み合わせを使って、他の多くのコンビネータを再実装できます。以下にいくつかの例を示します。

```fsharp
let mapP f =         
    bindP (f >> returnP)

let andThen p1 p2 =         
    p1 >>= (fun p1Result -> 
    p2 >>= (fun p2Result -> 
        returnP (p1Result,p2Result) ))

let applyP fP xP =         
    fP >>= (fun f -> 
    xP >>= (fun x -> 
        returnP (f x) ))

// （"many"が定義されていると仮定）
        
let many1 p =         
    p      >>= (fun head -> 
    many p >>= (fun tail -> 
        returnP (head::tail) ))
        
```

`Failure`パスをチェックするコンビネータは`bind`を使って実装できないことに注意してください。これには`orElse`や`many`が含まれます。

## レビュー

コンビネータを際限なく作り続けることもできますが、ここまでで JSONパーサーを組み立てるのに必要なものはすべて揃ったと思います。ここで一度立ち止まって、これまでの成果を振り返ってみましょう。

前回の投稿では、以下のコンビネータを作成しました。

* `.>>.`（`andThen`）は2つのパーサーを順番に適用し、結果をタプルで返します。
* `<|>`（`orElse`）は最初のパーサーを適用し、失敗した場合は2番目のパーサーを適用します。
* `choice`は`orElse`を拡張して、パーサーのリストから選択します。

そして今回の投稿では、以下の追加コンビネータを作成しました。

* `bindP`はパーサーの結果を別のパーサー生成関数につなげます。
* `mapP`はパーサーの結果を変換します。
* `returnP`は通常の値をパーサーの世界に持ち上げます。
* `applyP`は関数を含むパーサー（`Parser< 'a->'b >`）をパーサーの世界の関数（`Parser<'a> -> Parser<'b >`）に変換します。
* `lift2`は`applyP`を使って2パラメータ関数をパーサーの世界に持ち上げます。
* `sequence`はパーサーのリストをリストを含むパーサーに変換します。
* `many`は指定されたパーサーの0回以上の出現に一致します。
* `many1`は指定されたパーサーの1回以上の出現に一致します。
* `opt`は指定されたパーサーのオプションの出現に一致します。
* `.>>`は左側のパーサーの結果のみを保持します。
* `>>。`は右側のパーサーの結果のみを保持します。
* `between`は中央のパーサーの結果のみを保持します。
* `sepBy`は区切り文字付きのパーサーの0回以上の出現をパースします。
* `sepBy1`は区切り文字付きのパーサーの1回以上の出現をパースします。

「コンビネータ」の概念がなぜそれほど強力なのか、おわかりいただけたと思います。基本的な関数をいくつか用意するだけで、有用な関数のライブラリを素早く簡潔に組み立てられました。

## これまでのパーサーライブラリのリスト

以下はこれまでのパーシングライブラリの完全なリストです ―― 200行ほどのコードになりました！

*以下に表示されるソースコードは[このgist](https://gist.github.com/swlaschin/a3dbb114a9ee95b2e30d#file-parserlibrary_v2-fsx)でも利用可能です。*

```fsharp
open System

/// パースの成功/失敗を表す型
type Result<'a> =
    | Success of 'a
    | Failure of string 

/// パース関数をラップする型
type Parser<'T> = Parser of (string -> Result<'T * string>)

/// 1文字をパースする
let pchar charToMatch = 
    // ネストした内部関数を定義
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

/// 入力でパーサーを実行する
let run parser input = 
    // パーサーをアンラップして内部関数を取得
    let (Parser innerFn) = parser 
    // 入力で内部関数を呼び出す
    innerFn input

/// "bindP"はパーサー生成関数fとパーサーpを取り、
/// pの出力をfに渡して新しいパーサーを作ります
let bindP f p =
    let innerFn input =
        let result1 = run p input 
        match result1 with
        | Failure err -> 
            // parser1のエラーを返す
            Failure err  
        | Success (value1,remainingInput) ->
            // fを適用して新しいパーサーを取得
            let p2 = f value1
            // 残りの入力でパーサーを実行
            run p2 remainingInput
    Parser innerFn 

/// bindPの中置バージョン
let ( >>= ) p f = bindP f p

/// 値をパーサーに持ち上げる
let returnP x = 
    let innerFn input =
        // 入力を無視してxを返す
        Success (x,input)
    // 内部関数を返す
    Parser innerFn 

/// パーサー内の値に関数を適用する
let mapP f = 
    bindP (f >> returnP)

/// mapPの中置バージョン
let ( <!> ) = mapP

/// mapPの"パイピング"バージョン
let ( |>> ) x f = mapP f x

/// ラップされた関数をラップされた値に適用する
let applyP fP xP =         
    fP >>= (fun f -> 
    xP >>= (fun x -> 
        returnP (f x) ))

/// applyの中置バージョン
let ( <*> ) = applyP

/// 2パラメータ関数をパーサーの世界に持ち上げる
let lift2 f xP yP =
    returnP f <*> xP <*> yP

/// 2つのパーサーを"AそしてB"として組み合わせる
let andThen p1 p2 =         
    p1 >>= (fun p1Result -> 
    p2 >>= (fun p2Result -> 
        returnP (p1Result,p2Result) ))

/// andThenの中置バージョン
let ( .>>. ) = andThen

/// 2つのパーサーを"AまたはB"として組み合わせる
let orElse p1 p2 =
    let innerFn input =
        // 入力でparser1を実行
        let result1 = run p1 input

        // 結果を失敗/成功でテスト
        match result1 with
        | Success result -> 
            // 成功なら元の結果を返す
            result1

        | Failure err -> 
            // 失敗なら入力でparser2を実行
            let result2 = run p2 input

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

/// パーサーのリストをリストのパーサーに変換
let rec sequence parserList =
    // "cons"関数を定義、これは2パラメータ関数
    let cons head tail = head::tail

    // パーサーの世界に持ち上げる
    let consP = lift2 cons

    // パーサーのリストを再帰的に処理
    match parserList with
    | [] -> 
        returnP []
    | head::tail ->
        consP head (sequence tail)

/// (ヘルパー) 指定されたパーサーの0回以上の出現に一致
let rec parseZeroOrMore parser input =
    // 入力でパーサーを実行
    let firstResult = run parser input 
    // 結果を失敗/成功でテスト
    match firstResult with
    | Failure err -> 
        // パースが失敗したら空のリストを返す
        ([],input)  
    | Success (firstValue,inputAfterFirstParse) -> 
        // パースが成功したら、再帰的に呼び出して
        // 後続の値を取得
        let (subsequentValues,remainingInput) = 
            parseZeroOrMore parser inputAfterFirstParse
        let values = firstValue::subsequentValues
        (values,remainingInput)  

/// 指定されたパーサーの0回以上の出現に一致
let many parser = 
    let rec innerFn input =
        // 入力をパース -- 常に成功するのでSuccessでラップ
        Success (parseZeroOrMore parser input)

    Parser innerFn

/// 指定されたパーサーの1回以上の出現に一致
let many1 p =         
    p      >>= (fun head -> 
    many p >>= (fun tail -> 
        returnP (head::tail) ))

/// pのオプションの出現をパースし、オプション値を返す
let opt p = 
    let some = p |>> Some
    let none = returnP None
    some <|> none

/// 左側のパーサーの結果のみを保持
let (.>>) p1 p2 = 
    // ペアを作成
    p1 .>>. p2 
    // 最初の値のみを保持
    |> mapP (fun (a,b) -> a) 

/// 右側のパーサーの結果のみを保持
let (>>.) p1 p2 = 
    // ペアを作成
    p1 .>>. p2 
    // 2番目の値のみを保持
    |> mapP (fun (a,b) -> b) 

/// 中央のパーサーの結果のみを保持
let between p1 p2 p3 = 
    p1 >>. p2 .>> p3 

/// pをsepで区切って1回以上出現させる
let sepBy1 p sep =
    let sepThenP = sep >>. p            
    p .>>. many sepThenP 
    |>> fun (p,pList) -> p::pList

/// pをsepで区切って0回以上出現させる
let sepBy p sep =
    sepBy1 p sep <|> returnP []
```


## まとめ

この投稿では、前回の基本的なパースコードをもとに、15個ほどのコンビネータのライブラリを組み立てました。これらを組み合わせてほぼすべてのものをパースできます。

これから、これらを使ってJSONパーサーを組み立てますが、その前に一旦立ち止まってエラーメッセージをクリーンアップしましょう。
それが[次の投稿](../posts/understanding-parser-combinators-3.md)のトピックになります。

*この投稿のソースコードは[このgist](https://gist.github.com/swlaschin/a3dbb114a9ee95b2e30d#file-understanding_parser_combinators-2-fsx)で利用可能です。*
