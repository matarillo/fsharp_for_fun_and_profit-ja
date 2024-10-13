---
layout: post
title: "ゼロからJSONパーサーを書く"
description: "250行のコードで"
categories: ["コンビネータ", "パターン"]
seriesId: "パーサーコンビネータを理解する"
seriesOrder: 4
---

*更新: [この話題に関する私の講演のスライドと動画](https://fsharpforfunandprofit.com/parser/)*

このシリーズでは、アプリカティブパーサーとパーサーコンビネータの仕組みを見ていきます。

* [最初の投稿](../posts/understanding-parser-combinators.md)では、パーシングライブラリの基礎を作りました。
* [2番目の投稿](../posts/understanding-parser-combinators-2.md)では、他の多くの便利なコンビネータでライブラリを拡張しました。
* [3番目の投稿](../posts/understanding-parser-combinators-3.md)では、エラーメッセージを改善しました。
* この最後の投稿では、これまでに作成したライブラリを使ってJSONパーサーを組み立てます。

<hr>

まず何よりも、過去数回の投稿で開発したパーサーライブラリスクリプトをロードし、`ParserLibrary`名前空間をオープンする必要があります。

```fsharp
#load "ParserLibrary.fsx"

open System
open ParserLibrary
```

`ParserLibrary.fsx`は[ここからダウンロード](https://gist.github.com/swlaschin/485f418fede6b6a36d89#file-parserlibrary-fsx)できます。

## 1. JSONの仕様を表現するモデルの作成

JSONの仕様は[json.org](https://www.json.org/)で確認できます。要約すると次のようになります。

* `value`は`string`、`number`、`bool`、`null`、`object`、`array`のいずれかです。
  これらの構造は入れ子にできます。
* `string`は、ダブルクォートで囲まれた0個以上のUnicode文字の列です。バックスラッシュでエスケープします。
* `number`はC言語やJavaの数値とよく似ていますが、8進数と16進数は使いません。
* `boolean`は`true`または`false`のリテラルです。
* `null`は`null`リテラルです。
* `object`は名前と値のペアの順序なし集合です。
  * 左波かっこ`{`で始まり、右波かっこ`}`で終わります。
  * 各名前の後にコロン`:`が続き、ペアはカンマ`,`で区切ります。
* `array`は値の順序付きコレクションです。
  * 左かぎかっこ`[`で始まり、右かぎかっこ`]`で終わります。
  * 値はカンマ`,`で区切ります。
* 任意のトークンのペア間に空白を入れられます。

F#では、この定義を自然に以下のようにモデル化できます。

```fsharp
type JValue = 
    | JString of string
    | JNumber of float
    | JBool   of bool
    | JNull
    | JObject of Map<string, JValue>
    | JArray  of JValue list
```

JSONパーサーの作成目標は次のとおりです。

* 文字列を入力として、`JValue`値を出力できること。

## 2. `Null`と`Bool`から始める

まずは比較的簡単な、nullとブール値のリテラルをパースすることから始めましょう。

### Nullのパース

`null`リテラルのパースは簡単です。手順は次のとおりです。

* "null"という文字列にマッチする。
* 結果を`JNull`ケースにマップする。

コードは以下のようになります。

```fsharp
let jNull = 
    pstring "null" 
    |>> (fun _ -> JNull)  // JNullにマップ
    <?> "null"            // ラベルを付ける
```

パーサーが返す値は常に"null"なので、実際にはその値を気にしません。

このような状況はよくあるので、`>>%`という小さなユーティリティ関数を作り、より簡潔に書けるようにします。

```fsharp
// パーサーpを適用し、結果を無視して、xを返す。
let (>>%) p x =
    p |>> (fun _ -> x)
```

これで`jNull`を次のように書き直せます。

```fsharp
let jNull = 
    pstring "null" 
    >>% JNull   // 新しいユーティリティコンビネータを使う
    <?> "null"  
```

テストしてみましょう。

```fsharp
run jNull "null"   
// 成功: JNull

run jNull "nulp" |> printResult  
// 行:0 列:3 nullのパースエラー
// nulp
//    ^予期しない 'p'
```

良さそうです。次は別のものを試してみましょう。

### Boolのパース

boolパーサーはnullと似ています。

* "true"にマッチするパーサーを作ります。
* "false"にマッチするパーサーを作ります。
* そして`<|>`を使ってそれらを選択します。

コードは以下のようになります。

```fsharp
let jBool =   
    let jtrue = 
        pstring "true" 
        >>% JBool true   // JBoolにマップ
    let jfalse = 
        pstring "false" 
        >>% JBool false  // JBoolにマップ 

    // trueとfalseの間で選択
    jtrue <|> jfalse
    <?> "bool"           // ラベルを付ける
```

いくつかのテストを行ってみましょう。

```fsharp
run jBool "true"   
// 成功: JBool true

run jBool "false"
// 成功: JBool false

run jBool "truX" |> printResult  
// 行:0 列:0 boolのパースエラー
// truX
// ^予期しない 't'
```

ただし、このエラーメッセージは誤解を招く可能性があります。この問題は、前回の投稿で説明したバックトラッキングに起因しています。
"true" が失敗したため、今は "false" をパースしようとしていて、 "t" が予期しない文字となっています。

## 3. `String`のパース

次はやや複雑な、文字列のパース処理に取り組みましょう。

文字列パースの仕様は以下のような"鉄道図"で表されています。

![](../assets/img/json_string.gif)

*全ての図は[json.org](https://www.json.org/)から引用。*

このような図からパーサーを組み立てるには、ボトムアップで作業し、小さな"プリミティブ"パーサーを作成し、それらを組み合わせてより大きなものを作ります。

まずは「クォートとバックスラッシュ以外のUnicode文字」から始めましょう。簡単な条件を使っているので、`satisfy`関数を使えます。

```fsharp
let jUnescapedChar = 
    let label = "文字"
    satisfy (fun ch -> ch <> '\\' && ch <> '\"') label 
```

すぐにテストできます。

```fsharp
run jUnescapedChar "a"   // 成功 'a'

run jUnescapedChar "\\" |> printResult
// 行:0 列:0 文字のパースエラー
// \
// ^予期しない '\'
```

はい、うまくいきました。

### エスケープ文字

次は、エスケープ文字の場合を考えましょう。

この場合、マッチさせる文字列のリスト（`"\""`、`"\n"`など）があり、それぞれに対して結果として使用する文字があります。

処理の流れは以下のとおりです。

* まず、`(マッチする文字列, 結果の文字)`の形式のペアのリストを定義します。
* それぞれに対して、`pstring マッチする文字列 >>% 結果の文字`を使ってパーサーを組み立てます。
* 最後に、`choice`関数を使ってこれらのパーサーをすべて組み合わせます。

コードは以下のようになります。

```fsharp
/// エスケープ文字をパースする
let jEscapedChar = 
    [ 
    // (マッチする文字列, 結果の文字)
    ("\\\"",'\"')      // クォート
    ("\\\\",'\\')      // バックスラッシュ 
    ("\\/",'/')        // スラッシュ
    ("\\b",'\b')       // バックスペース
    ("\\f",'\f')       // フォームフィード
    ("\\n",'\n')       // 改行
    ("\\r",'\r')       // キャリッジリターン
    ("\\t",'\t')       // タブ
    ] 
    // 各ペアをパーサーに変換
    |> List.map (fun (toMatch,result) -> 
        pstring toMatch >>% result)
    // そしてそれらを1つにまとめる
    |> choice
    <?> "エスケープ文字" // ラベルを設定
```

ここでもすぐにテストしてみましょう。

```fsharp
run jEscapedChar "\\\\" // 成功 '\'
run jEscapedChar "\\t"  // 成功 '\009'

run jEscapedChar "a" |> printResult
// 行:0 列:0 エスケープ文字のパースエラー
// a
// ^予期しない 'a'
```

うまく動作していますね！

### Unicode文字

最後に取り組むのは、16進数を用いたUnicode文字のパース処理です。

処理の流れは以下のとおりです。

* まず、`バックスラッシュ`、`u`、`16進数の数字`のプリミティブを定義します。
* 4つの`16進数の数字`を使って、これらを組み合わせます。
* パーサーの出力が入れ子になったタプルになって扱いにくいため、
  数字をintに変換し、さらにcharに変換するヘルパー関数が必要です。

コードは以下のようになります。
  
```fsharp
/// Unicode文字をパースする
let jUnicodeChar = 
    
    // "プリミティブ"パーサーを設定        
    let backslash = pchar '\\'
    let uChar = pchar 'u'
    let hexdigit = anyOf (['0'..'9'] @ ['A'..'F'] @ ['a'..'f'])

    // パーサーの出力（入れ子になったタプル）を
    // 文字に変換する
    let convertToChar (((h1,h2),h3),h4) = 
        let str = sprintf "%c%c%c%c" h1 h2 h3 h4
        Int32.Parse(str,Globalization.NumberStyles.HexNumber) |> char

    // メインパーサーを設定
    backslash  >>. uChar >>. hexdigit .>>. hexdigit .>>. hexdigit .>>. hexdigit
    |>> convertToChar 
```

笑顔の絵文字 `\u263A` でテストしてみましょう。

```fsharp
run jUnicodeChar "\\u263A"  
```

### 完全な`String`パーサー

ここまでの要素を組み合わせて、完全な文字列パーサーを作成します。

* `quote`のプリミティブを定義します。
* `jUnescapedChar`、`jEscapedChar`、`jUnicodeChar`の選択肢として`jchar`を定義します。
* 全体のパーサーは、2つの引用符の間に0個以上の`jchar`が来るものとします。

```fsharp
let quotedString = 
    let quote = pchar '\"' <?> "quote"
    let jchar = jUnescapedChar <|> jEscapedChar <|> jUnicodeChar 

    // メインパーサーを設定
    quote >>. manyChars jchar .>> quote 
```

最後に、引用符で囲まれた文字列を`JString`ケースでラップし、ラベルを付けます。

```fsharp
/// JStringをパースする
let jString = 
    // 文字列をJStringでラップ
    quotedString
    |>> JString           // JStringに変換
    <?> "引用符で囲まれた文字列"   // ラベルを追加
```

完成した`jString`関数をテストしてみましょう。

```fsharp
run jString "\"\""    // 成功 ""
run jString "\"a\""   // 成功 "a"
run jString "\"ab\""  // 成功 "ab"
run jString "\"ab\\tde\""      // 成功 "ab\tde"
run jString "\"ab\\u263Ade\""  // 成功 "ab?de"
```

## 4. `Number`のパース

数値のパース処理は、以下の"鉄道図"で表されます。

![](../assets/img/json_number.gif)

ここも、ボトムアップで作業を進めましょう。最も基本的な要素である単一の文字や数字から始めます。


```fsharp
let optSign = opt (pchar '-')

let zero = pstring "0"

let digitOneNine = 
    satisfy (fun ch -> Char.IsDigit ch && ch <> '0') "1-9"

let digit = 
    satisfy (fun ch -> Char.IsDigit ch ) "digit"

let point = pchar '.'

let e = pchar 'e' <|> pchar 'E'

let optPlusMinus = opt (pchar '-' <|> pchar '+')
```

次に、数値の"整数部"を組み立てます。これは以下のいずれかです。

* 数字の0
* `nonZeroInt`: `digitOneNine`の後に0個以上の通常の数字が続くもの

```fsharp
let nonZeroInt = 
    digitOneNine .>>. manyChars digit 
    |>> fun (first,rest) -> string first + rest

let intPart = zero <|> nonZeroInt
```

`nonZeroInt`パーサーでは、`digitOneNine`（char型）の出力と`manyChars digit`（string型）の出力を組み合わせる必要があるため、
簡単なマップ関数が必要です。

オプションの小数部は、小数点の後に1つ以上の数字が続くものです。

```fsharp
let fractionPart = point >>. manyChars1 digit
```

指数部は`e`の後にオプションの符号が続き、さらに1つ以上の数字が続きます。

```fsharp
let exponentPart = e >>. optPlusMinus .>>. manyChars1 digit
```

これらのコンポーネントを使って、数値全体を組み立てることができます。

```fsharp
optSign .>>. intPart .>>. opt fractionPart .>>. opt exponentPart
|>> convertToJNumber
<?> "number"   // ラベルを追加
```

ただし、`convertToJNumber`はまだ定義していません。
この関数は、パーサーが出力する4つ組を受け取り、それをfloat型に変換します。

float型の処理を自分で書くよりも、怠惰になって.NETフレームワークに変換させましょう！
つまり、各コンポーネントを文字列に変換し、連結して、全体の文字列をfloat型に解析します。

問題は、符号や指数などのコンポーネントの一部がオプションであることです。
渡された関数を使ってオプションを文字列に変換し、オプションが`None`の場合は空文字列を返すヘルパーを書きましょう。

`|>?`と呼ぶことにしますが、`jNumber`パーサー内でのみローカルに使用されるので、実際には重要ではありません。

```fsharp
// オプション値を文字列に変換するユーティリティ関数、もしくは存在しない場合は""を返す
let ( |>? ) opt f = 
    match opt with
    | None -> ""
    | Some x -> f x
```

これで`convertToJNumber`を作成できます。

* 符号は文字列に変換されます。
* 小数部は文字列に変換され、小数点が前に付きます。
* 指数部は文字列に変換され、指数の符号も文字列に変換されます。

```fsharp
let convertToJNumber (((optSign,intPart),fractionPart),expPart) = 
    // 文字列に変換し、.NETに解析させる！ - 粗いが今のところはOK。

    let signStr = 
        optSign 
        |>? string   // 例: "-"

    let fractionPartStr = 
        fractionPart 
        |>? (fun digits -> "." + digits )  // 例: ".456"

    let expPartStr = 
        expPart 
        |>? fun (optSign, digits) ->
            let sign = optSign |>? string
            "e" + sign + digits          // 例: "e-12"

    // 部分を合わせてfloatに変換し、JNumberでラップする
    (signStr + intPart + fractionPartStr + expPartStr)
    |> float
    |> JNumber
```

かなり荒削りな実装で、文字列に変換するのは遅い可能性があるので、もっと良いバージョンを書くのは自由です。

これで、完全な`jNumber`関数に必要なものがすべて揃いました。

```fsharp
/// JNumberをパースする
let jNumber = 

    // "プリミティブ"パーサーを設定        
    let optSign = opt (pchar '-')

    let zero = pstring "0"

    let digitOneNine = 
        satisfy (fun ch -> Char.IsDigit ch && ch <> '0') "1-9"

    let digit = 
        satisfy (fun ch -> Char.IsDigit ch ) "digit"

    let point = pchar '.'

    let e = pchar 'e' <|> pchar 'E'

    let optPlusMinus = opt (pchar '-' <|> pchar '+')

    let nonZeroInt = 
        digitOneNine .>>. manyChars digit 
        |>> fun (first,rest) -> string first + rest

    let intPart = zero <|> nonZeroInt

    let fractionPart = point >>. manyChars1 digit

    let exponentPart = e >>. optPlusMinus .>>. manyChars1 digit

    // オプション値を文字列に変換するユーティリティ関数、もしくは存在しない場合は""を返す
    let ( |>? ) opt f = 
        match opt with
        | None -> ""
        | Some x -> f x

    let convertToJNumber (((optSign,intPart),fractionPart),expPart) = 
        // 文字列に変換し、.NETに解析させる！ - 粗いが今のところはOK。

        let signStr = 
            optSign 
            |>? string   // 例: "-"

        let fractionPartStr = 
            fractionPart 
            |>? (fun digits -> "." + digits )  // 例: ".456"

        let expPartStr = 
            expPart 
            |>? fun (optSign, digits) ->
                let sign = optSign |>? string
                "e" + sign + digits          // 例: "e-12"

        // 部分を合わせてfloatに変換し、JNumberでラップする
        (signStr + intPart + fractionPartStr + expPartStr)
        |> float
        |> JNumber

    // メインパーサーを設定
    optSign .>>. intPart .>>. opt fractionPart .>>. opt exponentPart
    |>> convertToJNumber
    <?> "number"   // ラベルを追加
```

少し長くなりましたが、各コンポーネントは仕様に従っているので、まだ十分に読みやすいと思います。

テストを始めましょう。

```fsharp
run jNumber "123"     // JNumber 123.0
run jNumber "-123"    // JNumber -123.0
run jNumber "123.4"   // JNumber 123.4
```

失敗するケースはどうでしょうか？

```fsharp
run jNumber "-123."   // JNumber -123.0 -- 失敗するはず！
run jNumber "00.1"    // JNumber 0      -- 失敗するはず！
```

予想外の結果が出ています！これらのケースは確実に失敗するはずですよね？

いえ、そうではありません。`-123.`のケースで起こっていることは、パーサーが小数点まですべてを消費して停止し、小数点を次のパーサーにマッチさせるために残しているのです！
つまり、エラーではありません。

同様に、`00.1`のケースでは、パーサーは最初の`0`だけを消費して停止し、残りの入力（`0.4`）を次のパーサーにマッチさせるために残しています。
これもエラーではありません。

これを適切に修正するのは範囲外なので、パーサーに空白を追加して強制的に終了させましょう。

```fsharp
let jNumber_ = jNumber .>> spaces1
```

では、もう一度テストしてみましょう。

```fsharp
run jNumber_ "123"     // JNumber 123.0
run jNumber_ "-123"    // JNumber -123.0

run jNumber_ "-123." |> printResult
// 行:0 列:4 numberとmany1 whitespaceのパースエラー
// -123.
//     ^予期しない '.'
```

エラーが適切に検出されるようになりました。

小数部をテストしてみましょう。

```fsharp
run jNumber_ "123.4"   // JNumber 123.4

run jNumber_ "00.4" |> printResult
// 行:0 列:1 numberとmany1 whitespaceのパースエラー
// 00.4
//  ^予期しない '0'
```

次に指数部をテストします。

```fsharp
// 指数のみ
run jNumber_ "123e4"     // JNumber 1230000.0

// 小数部と指数部
run jNumber_ "123.4e5"   // JNumber 12340000.0
run jNumber_ "123.4e-5"  // JNumber 0.001234
```

ここまでのところ、すべて良好です。前進しましょう！

## 5. `Array`のパース

次は`Array`のケースです。ここでも鉄道図を使用して実装をガイドします。

![](../assets/img/json_array.gif)

ここでもプリミティブから始めます。各トークンの後にオプションの空白を追加していることに注意してください。

```fsharp
let jArray = 

    let left = pchar '[' .>> spaces
    let right = pchar ']' .>> spaces
    let comma = pchar ',' .>> spaces
    let value = jValue .>> spaces    
```

そして、カンマで区切られた値のリストを作成し、リスト全体を左右のかっこで囲みます。

```fsharp
let jArray = 
    ...

    // リストパーサーを設定
    let values = sepBy1 value comma

    // メインパーサーを設定
    between left values right 
    |>> JArray
    <?> "array"
```

待ってください - この`jValue`は何でしょうか？

```fsharp
let jArray = 
    ...
    let value = jValue .>> spaces    // <=== この"jValue"は何？
    ...
```

仕様では、`Array`は値のリストを含むことができると言っています。そこで、それらをパースできる`jValue`パーサーがあると仮定しましょう。

しかし、`JValue`をパースするには、まず`Array`をパースする必要があります！

パースにおける一般的な問題に遭遇しました - 相互に再帰的な定義です。`Array`を作るには`JValue`パーサーが必要ですが、`JValue`を作るには`Array`パーサーが必要です。

これにどう対処すればよいでしょうか？

### 前方参照

解決策は前方参照を使うことです。
今すぐに`Array`パーサーを定義するためにダミーの`JValue`パーサーを使用し、後で前方参照を「本物の」`JValue`パーサーで修正します。

これは、可変参照が便利な場面の1つです！

このために、ヘルパー関数が必要です。処理の流れは次のようになります。

* 後で置き換えられるダミーパーサーを定義します。
* 入力ストリームをダミーパーサーに転送する実際のパーサーを定義します。
* 実際のパーサーとダミーパーサーへの参照の両方を返します。

クライアントが参照を修正すると、実際のパーサーはダミーパーサーを置き換えた新しいパーサーに入力を転送します。

コードは以下のようになります。

```fsharp
let createParserForwardedToRef<'a>() =

    let dummyParser= 
        let innerFn input : Result<'a * Input> = failwith "未修正の転送されたパーサー"
        {parseFn=innerFn; label="unknown"}
    
    // プレースホルダーParserへの参照
    let parserRef = ref dummyParser 

    // ラッパーParser
    let innerFn input = 
        // プレースホルダーに入力を転送
        runOnInput !parserRef input 
    let wrapperParser = {parseFn=innerFn; label="unknown"}

    wrapperParser, parserRef
```

これを使って、`JValue`型のパーサーのプレースホルダーを作成できます。

```fsharp
let jValue,jValueRef = createParserForwardedToRef<JValue>()
```

### `Array`パーサーの完成

`Array`パーサーに戻ると、`jValue`プレースホルダーを使用してコンパイルが成功するようになりました。

```fsharp
let jArray = 

    // "プリミティブ"パーサーを設定        
    let left = pchar '[' .>> spaces
    let right = pchar ']' .>> spaces
    let comma = pchar ',' .>> spaces
    let value = jValue .>> spaces   

    // リストパーサーを設定
    let values = sepBy1 value comma

    // メインパーサーを設定
    between left values right 
    |>> JArray
    <?> "array"
```

今すぐにテストしようとすると、参照を修正していないため例外が発生します。

```fsharp
run jArray "[ 1, 2 ]"

// System.Exception: 未修正の転送されたパーサー
```

そこで、とりあえず参照を既に作成したパーサーの1つ、たとえば`jNumber`を使うように修正しましょう。

```fsharp
jValueRef := jNumber  
```

これで配列内に数値のみを使用する限り、`jArray`関数を正常にテストできます！

```fsharp
run jArray "[ 1, 2 ]"
// 成功 (JArray [JNumber 1.0; JNumber 2.0],

run jArray "[ 1, 2, ]" |> printResult
// 行:0 列:6 arrayのパースエラー
// [ 1, 2, ]
//       ^予期しない ','
```

## 6. `Object`のパース

`Object`のパーサーは`Array`のものと非常によく似ています。

まず、鉄道図を見てみましょう。

![](../assets/img/json_object.gif)

これを使って、パーサーを直接作成できるので、コメントなしで提示します。

```fsharp
let jObject = 

    // "プリミティブ"パーサーを設定        
    let left = pchar '{' .>> spaces
    let right = pchar '}' .>> spaces
    let colon = pchar ':' .>> spaces
    let comma = pchar ',' .>> spaces
    let key = quotedString .>> spaces 
    let value = jValue .>> spaces

    // リストパーサーを設定
    let keyValue = (key .>> colon) .>>. value
    let keyValues = sepBy1 keyValue comma

    // メインパーサーを設定
    between left keyValues right 
    |>> Map.ofList  // keyValueのリストをMapに変換
    |>> JObject     // JObjectでラップ     
    <?> "object"    // ラベルを追加
```

（ただし、現時点では値として数値のみがサポートされていることを覚えておいてください）テストして正常に動作することを確認しましょう。

```fsharp
run jObject """{ "a":1, "b"  :  2 }"""
// JObject (map [("a", JNumber 1.0); ("b", JNumber 2.0)]),

run jObject """{ "a":1, "b"  :  2, }""" |> printResult
// 行:0 列:18 objectのパースエラー
// { "a":1, "b"  :  2, }
//                   ^予期しない ','
```

## 7. すべてを組み合わせる

最後に、`choice`コンビネータを使用して6つのパーサーすべてを組み合わせ、これを先ほど作成した`JValue`パーサー参照に割り当てることができます。

```fsharp
jValueRef := choice 
    [
    jNull 
    jBool
    jNumber
    jString
    jArray
    jObject
    ]
```

これで全ての準備が整いました！

### 完全なパーサーのテスト：例1

パースを試みるJSONの文字列の例を挙げてみましょう。

```fsharp
let example1 = """{
    "name" : "Scott",
    "isMale" : true,
    "bday" : {"year":2001, "month":12, "day":25 },
    "favouriteColors" : ["blue", "green"]
}"""
run jValue example1
```

結果は次のようになります。

```text
JObject
    (map
        [("bday", JObject(map
                [("day", JNumber 25.0); 
                ("month", JNumber 12.0);
                ("year", JNumber 2001.0)]));
        ("favouriteColors", JArray [JString "blue"; JString "green"]);
        ("isMale", JBool true); 
        ("name", JString "Scott")
        ])
```

### 完全なパーサーのテスト：例2

こちらは[json.orgの例ページ](https://json.org/example.html)からのものです。

```fsharp
let example2= """{"widget": {
    "debug": "on",
    "window": {
        "title": "Sample Konfabulator Widget",
        "name": "main_window",
        "width": 500,
        "height": 500
    },
    "image": { 
        "src": "Images/Sun.png",
        "name": "sun1",
        "hOffset": 250,
        "vOffset": 250,
        "alignment": "center"
    },
    "text": {
        "data": "Click Here",
        "size": 36,
        "style": "bold",
        "name": "text1",
        "hOffset": 250,
        "vOffset": 100,
        "alignment": "center",
        "onMouseUp": "sun1.opacity = (sun1.opacity / 100) * 90;"
    }
}}  """

run jValue example2
```

結果は次のようになります。

```text
JObject(map
    [("widget",JObject(map
            [("debug", JString "on");
            ("image",JObject(map
                [("alignment", JString "center");
                    ("hOffset", JNumber 250.0); ("name", JString "sun1");
                    ("src", JString "Images/Sun.png");
                    ("vOffset", JNumber 250.0)]));
            ("text",JObject(map
                [("alignment", JString "center");
                    ("data", JString "Click Here");
                    ("hOffset", JNumber 250.0); 
                    ("name", JString "text1");
                    ("onMouseUp", JString "sun1.opacity = (sun1.opacity / 100) * 90;");
                    ("size", JNumber 36.0); 
                    ("style", JString "bold");
                    ("vOffset", JNumber 100.0)]));
            ("window",JObject(map
                [("height", JNumber 500.0);
                    ("name", JString "main_window");
                    ("title", JString "Sample Konfabulator Widget");
                    ("width", JNumber 500.0)]))]))]),
```

## JSONパーサーの完全なリスト

以下がJSONパーサーの完全なリストです - 約250行の有用なコードです。

*以下に表示されているソースコードは、[このgist](https://gist.github.com/swlaschin/149deab2d457d8c1be37#file-jsonparser-fsx)でも利用可能です。*

```fsharp
#load "ParserLibrary.fsx"

open System
open ParserLibrary

(*
// --------------------------------
JSON仕様（https://www.json.org/より）
// --------------------------------

JSON仕様は[json.org](https://www.json.org/)で確認できます。ここで要約します：

* `value`は`string`、`number`、`bool`、`null`、`object`、`array`のいずれかです。
  * これらの構造は入れ子にできます。
* `string`は、ダブルクォートで囲まれた0個以上のUnicode文字の列で、バックスラッシュによるエスケープを使用します。
* `number`はC言語やJavaの数値とよく似ていますが、8進数と16進数の形式は使用しません。
* `boolean`は`true`または`false`のリテラルです。
* `null`は`null`リテラルです。
* `object`は名前/値のペアの順序なし集合です。
  * オブジェクトは{ (左波かっこ)で始まり} (右波かっこ)で終わります。
  * 各名前の後には: (コロン)が続き、名前/値のペアは, (カンマ)で区切られます。
* `array`は値の順序付きコレクションです。
  * 配列は[ (左かぎかっこ)で始まり] (右かぎかっこ)で終わります。
  * 値は, (カンマ)で区切られます。
* 任意のトークンのペアの間に空白を挿入できます。

*)

type JValue = 
    | JString of string
    | JNumber of float
    | JBool   of bool
    | JNull
    | JObject of Map<string, JValue>
    | JArray  of JValue list


// ======================================
// 前方参照
// ======================================

/// 前方参照を作成する
let createParserForwardedToRef<'a>() =

    let dummyParser= 
        let innerFn input : Result<'a * Input> = failwith "未修正の転送されたパーサー"
        {parseFn=innerFn; label="unknown"}
    
    // プレースホルダーParserへの参照
    let parserRef = ref dummyParser 

    // ラッパーParser
    let innerFn input = 
        // プレースホルダーに入力を転送
        runOnInput !parserRef input 
    let wrapperParser = {parseFn=innerFn; label="unknown"}

    wrapperParser, parserRef

let jValue,jValueRef = createParserForwardedToRef<JValue>()

// ======================================
// ユーティリティ関数
// ======================================

// パーサーpを適用し、結果を無視して、xを返す。
let (>>%) p x =
    p |>> (fun _ -> x)

// ======================================
// JNullのパース
// ======================================

let jNull = 
    pstring "null" 
    >>% JNull   // JNullにマップ
    <?> "null"  // ラベルを付ける

// ======================================
// JBoolのパース
// ======================================

let jBool =   
    let jtrue = 
        pstring "true" 
        >>% JBool true   // JBoolにマップ
    let jfalse = 
        pstring "false" 
        >>% JBool false  // JBoolにマップ 

    // trueとfalseの間で選択
    jtrue <|> jfalse
    <?> "bool"           // ラベルを付ける


// ======================================
// JStringのパース
// ======================================

/// エスケープされていない文字をパースする
let jUnescapedChar = 
    satisfy (fun ch -> ch <> '\\' && ch <> '\"') "char"

/// エスケープされた文字をパースする
let jEscapedChar = 
    [ 
    // (マッチする文字列, 結果の文字)
    ("\\\"",'\"')      // クォート
    ("\\\\",'\\')      // バックスラッシュ 
    ("\\/",'/')        // スラッシュ
    ("\\b",'\b')       // バックスペース
    ("\\f",'\f')       // フォームフィード
    ("\\n",'\n')       // 改行
    ("\\r",'\r')       // キャリッジリターン
    ("\\t",'\t')       // タブ
    ] 
    // 各ペアをパーサーに変換
    |> List.map (fun (toMatch,result) -> 
        pstring toMatch >>% result)
    // そしてそれらを1つにまとめる
    |> choice

/// Unicode文字をパースする
let jUnicodeChar = 
    
    // "プリミティブ"パーサーを設定        
    let backslash = pchar '\\'
    let uChar = pchar 'u'
    let hexdigit = anyOf (['0'..'9'] @ ['A'..'F'] @ ['a'..'f'])

    // パーサーの出力（入れ子になったタプル）を
    // 文字に変換する
    let convertToChar (((h1,h2),h3),h4) = 
        let str = sprintf "%c%c%c%c" h1 h2 h3 h4
        Int32.Parse(str,Globalization.NumberStyles.HexNumber) |> char

    // メインパーサーを設定
    backslash  >>. uChar >>. hexdigit .>>. hexdigit .>>. hexdigit .>>. hexdigit
    |>> convertToChar 


/// クォートで囲まれた文字列をパースする
let quotedString = 
    let quote = pchar '\"' <?> "クォート"
    let jchar = jUnescapedChar <|> jEscapedChar <|> jUnicodeChar 

    // メインパーサーを設定
    quote >>. manyChars jchar .>> quote 

/// JStringをパースする
let jString = 
    // 文字列をJStringでラップ
    quotedString
    |>> JString           // JStringに変換
    <?> "クォートで囲まれた文字列"   // ラベルを追加

// ======================================
// JNumberのパース
// ======================================

/// JNumberをパースする
let jNumber = 

    // "プリミティブ"パーサーを設定        
    let optSign = opt (pchar '-')

    let zero = pstring "0"

    let digitOneNine = 
        satisfy (fun ch -> Char.IsDigit ch && ch <> '0') "1-9"

    let digit = 
        satisfy (fun ch -> Char.IsDigit ch ) "digit"

    let point = pchar '.'

    let e = pchar 'e' <|> pchar 'E'

    let optPlusMinus = opt (pchar '-' <|> pchar '+')

    let nonZeroInt = 
        digitOneNine .>>. manyChars digit 
        |>> fun (first,rest) -> string first + rest

    let intPart = zero <|> nonZeroInt

    let fractionPart = point >>. manyChars1 digit

    let exponentPart = e >>. optPlusMinus .>>. manyChars1 digit

    // オプション値を文字列に変換するユーティリティ関数、もしくは存在しない場合は""を返す
    let ( |>? ) opt f = 
        match opt with
        | None -> ""
        | Some x -> f x

    let convertToJNumber (((optSign,intPart),fractionPart),expPart) = 
        // 文字列に変換し、.NETに解析させる！ - 粗いが今のところはOK。

        let signStr = 
            optSign 
            |>? string   // 例: "-"

        let fractionPartStr = 
            fractionPart 
            |>? (fun digits -> "." + digits )  // 例: ".456"

        let expPartStr = 
            expPart 
            |>? fun (optSign, digits) ->
                let sign = optSign |>? string
                "e" + sign + digits          // 例: "e-12"

        // 部分を合わせてfloatに変換し、JNumberでラップする
        (signStr + intPart + fractionPartStr + expPartStr)
        |> float
        |> JNumber

    // メインパーサーを設定
    optSign .>>. intPart .>>. opt fractionPart .>>. opt exponentPart
    |>> convertToJNumber
    <?> "number"   // ラベルを追加

// ======================================
// JArrayのパース
// ======================================

let jArray = 

    // "プリミティブ"パーサーを設定        
    let left = pchar '[' .>> spaces
    let right = pchar ']' .>> spaces
    let comma = pchar ',' .>> spaces
    let value = jValue .>> spaces   

    // リストパーサーを設定
    let values = sepBy1 value comma

    // メインパーサーを設定
    between left values right 
    |>> JArray
    <?> "array"

// ======================================
// JObjectのパース
// ======================================


let jObject = 

    // "プリミティブ"パーサーを設定        
    let left = pchar '{' .>> spaces
    let right = pchar '}' .>> spaces
    let colon = pchar ':' .>> spaces
    let comma = pchar ',' .>> spaces
    let key = quotedString .>> spaces 
    let value = jValue .>> spaces

    // リストパーサーを設定
    let keyValue = (key .>> colon) .>>. value
    let keyValues = sepBy1 keyValue comma

    // メインパーサーを設定
    between left keyValues right 
    |>> Map.ofList  // keyValueのリストをMapに変換
    |>> JObject     // JObjectでラップ     
    <?> "object"    // ラベルを追加

// ======================================
// jValue参照の修正
// ======================================

// 前方参照を修正
jValueRef := choice 
    [
    jNull 
    jBool
    jNumber
    jString
    jArray
    jObject
    ]
```

## まとめ

この投稿では、前回までの投稿で開発したパーサーライブラリを使用してJSONパーサーを組み立てました。

パーサーライブラリを作り、それを使って実際のパーサーをゼロから組み立てたことで、
パーサーコンビネータの仕組みと、その有用性について十分に理解できたことを願っています。

最初の投稿で述べたことを繰り返しますが、この技術を本番環境で使う場合は、
実運用に最適化された、F#用の[FParsecライブラリ](https://www.quanttec.com/fparsec/)を調査することをお勧めします。

また、F#以外の言語を使用している場合でも、ほぼ確実にパーサーコンビネータライブラリが利用可能です。

* パーサーコンビネータ全般についての詳細情報は、FParsecに影響を与えたHaskellライブラリである"Parsec"でインターネット検索してください。
* FParsecの使用例については、以下の投稿のいずれかを試してみてください：
  * [FogCreekのKilnのフレーズ検索クエリの実装](https://web.archive.org/web/20160304040941/http://blog.fogcreek.com/fparsec/)
  * [LOGOパーサー](http://trelford.com/blog/post/FParsec.aspx)
  * [Small Basicパーサー](http://trelford.com/blog/post/parser.aspx)
  * [C#パーサー](http://trelford.com/blog/post/parsecsharp.aspx)と[F#でC#コンパイラを構築する](https://neildanson.wordpress.com/2014/02/11/building-a-c-compiler-in-f/)
  * [F#で48時間でSchemeを書く](https://lucabolognese.wordpress.com/2011/08/05/write-yourself-a-scheme-in-48-hours-in-f-part-vi/)
  * [OpenGLのシェーディング言語GLSLのパース](https://laurent.le-brun.eu/site/index.php/2010/06/07/54-fsharp-and-fparsec-a-glsl-parser-example)

ありがとうございました！
  
*この投稿のソースコードは[このgist](https://gist.github.com/swlaschin/149deab2d457d8c1be37#file-understanding_parser_combinators-4-fsx)で利用可能です。*

