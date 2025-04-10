---
layout: post
title: "printfで書式付きテキストを作る"
description: "出力とログ記録のヒントとテクニック"
nav: thinking-functionally
seriesId: "式と構文"
seriesOrder: 10
---

この記事では、少し脱線して、フォーマットされたテキストの作り方を見ていきます。出力や書式設定の関数は技術的にはライブラリ関数ですが、
実際には言語の中核部分のように使われています。

F#では、テキストの書式設定に2つの異なる方法があります。

* .NETで共通に使用されている「[複合書式指定](https://learn.microsoft.com/ja-jp/dotnet/standard/base-types/composite-formatting)」テクニック。 `String.Format` や `Console.WriteLine` などで使われます。
* `printf` と、[それに関連する関数](https://fsharp.github.io/fsharp-core-docs/reference/fsharp-core-printfmodule.html)（ `printfn` 、 `sprintf` など）を使うC言語風のテクニック。

## String.Format vs printf

複合書式指定はすべての.NET言語で使えます。C#を使ったことがある人なら馴染みがあるでしょう。

```fsharp
Console.WriteLine("文字列: {0}。整数: {1}。浮動小数点数: {2}。真偽値: {3}","こんにちは",42,3.14,true)
```

一方、 `printf` はC言語風の書式文字列を使います。

```fsharp
printfn "文字列: %s。整数: %i。浮動小数点数: %f。真偽値: %b" "こんにちは" 42 3.14 true
```

見てきたように、F#では `printf` がよく使われますが、 `String.Format` 、 `Console.Write` などはあまり使われません。

なぜ `printf` がF#で好まれ、慣用的な方法とされるのでしょうか？理由は以下の通りです。

* 静的型チェックが行われる。
* F# の関数として適切に動作するため、部分適用などをサポートする。
* ネイティブなF#型に対応している。

### printfは静的型チェックされる

`String.Format` と違って、`printf` はパラメータの型と数の両方について*静的型チェック*が行われます。

たとえば、以下の `printf` を使ったコードはコンパイルに失敗します。

```fsharp
// パラメータの型が間違っている
printfn "文字列: %s" 42 

// パラメータの数が間違っている
printfn "文字列: %s" "こんにちは" 42 
```

一方、同じことを複合書式指定で行うと、コンパイルは通りますが、正しく動作しないか、実行時エラーを起こします。

```fsharp
// パラメータの型が間違っている
Console.WriteLine("文字列: {0}", 42)   // 動いてしまう！

// パラメータの数が間違っている
Console.WriteLine("文字列: {0}","こんにちは",42)  // 動いてしまう！
Console.WriteLine("文字列: {0}。整数: {1}","こんにちは") // FormatException
```

### printfは部分適用ができる

.NETの書式設定関数は、すべてのパラメータを*同時に*渡す必要があります。

しかし、 `printf` は標準的なF# 関数であり、適切に動作するため、[部分適用](../posts/partial-application.html)ができます。

いくつか例を見てみましょう。

```fsharp
// 部分適用 - 明示的なパラメータ
let printStringAndInt s i =  printfn "文字列: %s。整数: %i" s i
let printHelloAndInt i = printStringAndInt "こんにちは" i
do printHelloAndInt 42

// 部分適用 - ポイントフリースタイル
let printInt =  printfn "整数: %i"
do printInt 42
```

もちろん、 `printf` は標準的な関数と同じように、関数パラメータとしてどこでも使えます。

```fsharp
let doSomething printerFn x y = 
    let result = x + y
    printerFn "結果は" result 

let callback = printfn "%s %i"
do doSomething callback 3 4
```

リストなどの高階関数でも使えます。

```fsharp
[1..5] |> List.map (sprintf "i=%i")
```

### printfはネイティブなF#型に対応している

プリミティブ型以外の場合、.NETの書式設定関数は `ToString()` メソッドのみを使えますが、 `printf` は `%A` 指定子を使ってネイティブなF#型に対応しています。

```fsharp
// タプルの出力
let t = (1,2)
Console.WriteLine("タプル: {0}", t)
printfn "タプル: %A" t

// レコードの出力
type Person = {First:string; Last:string}
let johnDoe = {First="John"; Last="Doe"}
Console.WriteLine("レコード: {0}", johnDoe )
printfn "レコード: %A" johnDoe 

// 判別共用体の出力
type Temperature = F of int | C of int
let freezing = F 32
Console.WriteLine("共用体: {0}", freezing )
printfn "共用体: %A" freezing 
```

見てわかるように、タプル型には適切な `ToString()` がありますが、他のユーザー定義型にはありません。
そのため、.NETの書式設定関数でそれらを使いたい場合は、明示的に `ToString()` メソッドをオーバーライドする必要があります。

## printfの注意点

`printf` を使う際には、いくつかの「落とし穴」に気をつける必要があります。

まず、パラメータが多すぎる場合ではなく、*少なすぎる*場合、コンパイラはすぐにエラーを報告せず、後でわかりにくいエラーを出す可能性があります。

```fsharp
// パラメータが少なすぎる
printfn "文字列: %s 整数: %i" "こんにちは" 
```

もちろん、これがエラーにならない理由は、 `printf` が単に部分適用されているだけだからです！
なぜこんなことが起こるのかわからない場合は、[部分適用の説明](../posts/partial-application.html)を見てください。

もう一つの問題は、「書式文字列」が実際には文字列ではないことです。

.NETの書式設定モデルでは、書式文字列は普通の文字列なので、それらを渡したり、リソースファイルに保存したりできます。
つまり、次のコードは問題なく動きます。

```fsharp
let netFormatString = "文字列: {0}"
Console.WriteLine(netFormatString, "こんにちは")
```

一方、 `printf` の最初の引数である「書式文字列」は実際には文字列ではなく、 `TextWriterFormat` と呼ばれるものです。
つまり、次のコードは**動きません**。

```fsharp
let fsharpFormatString = "文字列: %s"
printfn fsharpFormatString  "こんにちは" 
```

コンパイラは、文字列定数 `"文字列: %s"` を適切なTextWriterFormatに変換するために、裏で魔法をかけています。
TextWriterFormatは、 `string->unit` や `string->int->unit` などの書式文字列の型を「知っている」重要な部品であり、
これにより `printf` が型安全になります。

コンパイラのまねをしたい場合は、 `Microsoft.FSharp.Core.Printf` モジュールの `Printf.TextWriterFormat` 型を使って、文字列から独自のTextWriterFormat値を作れます。

書式文字列が「インライン」の場合、コンパイラは束縛時に型を推測できます。

```fsharp
let format:Printf.TextWriterFormat<_> = "文字列: %s"
printfn format "こんにちは" 
```

しかし、書式文字列が本当に動的（たとえばリソースに保存されているか、実行時に作られる）な場合、コンパイラは型を推測できないので、
コンストラクタで明示的に指定する必要があります。

以下の例では、最初の書式文字列は文字列パラメータを1つ持ち、unitを返します。そのため、書式の型として `string->unit` を指定する必要があります。
そして2番目の場合は、書式の型として `string->int->unit` を指定する必要があります。

```fsharp
let formatAString = "文字列: %s"
let formatAStringAndInt = "文字列: %s。整数: %i"

// TextWriterFormatに変換
let twFormat1  = Printf.TextWriterFormat<string->unit>(formatAString)
printfn twFormat1 "こんにちは" 
let twFormat2  = Printf.TextWriterFormat<string->int->unit>(formatAStringAndInt)
printfn twFormat2  "こんにちは" 42
```

`printf` と `TextWriterFormat` がどのように連携しているかの詳細については、今は深く掘り下げません。ただ、単純な書式文字列を渡しているだけではないことを覚えておいてください。

最後に、 `printf` とその仲間は*スレッドセーフではありません*が、 `Console.Write` とその仲間は*スレッドセーフである*ことを覚えておくと役立つでしょう。

## 書式の指定方法

`%` で始まる書式指定は、C言語で使われるものとよく似ていますが、F#独自のカスタマイズもいくつかあります。

Cと同じく、 `%` の直後の文字には特別な意味があります。以下のような形式になっています。

    %[フラグ][幅][.精度]指定子

これらの属性について、詳しく見ていきましょう。

### 基本的な書式指定

最もよく使う書式指定子は次のとおりです。

* `%s` - 文字列用
* `%b` - 真偽値用
* `%i` - 整数用
* `%f` - 浮動小数点数用
* `%A` - タプル、レコード、判別共用体の整形出力用
* `%O` - その他のオブジェクト用（ `ToString()` を使う）

これら6つで、基本的なニーズのほとんどを満たせるでしょう。

### % のエスケープ

単独の `%` 文字はエラーを引き起こします。エスケープするには、2 つ重ねます。

```fsharp
printfn "エスケープなし: %" // エラー
printfn "エスケープ: %%" 
```

### 幅と位置揃えの制御

固定幅の列や表を書式設定する際、位置揃えと幅を制御する必要があります。

それには「幅」と「フラグ」オプションを使います。

* `%5s`、`%5i` - 数字で値の幅を設定します
* `%*s`、`%*i` - アスタリスクで値の幅を動的に設定します（書式設定する値の直前の追加パラメータから）
* `%-s`、`%-i` - ハイフンで値を左揃えにします

これらの使用例を示します。

```fsharp
let rows = [ (1,"a"); (-22,"bb"); (333,"ccc"); (-4444,"dddd") ] 

// 位置揃えなし
for (i,s) in rows do
    printfn "|%i|%s|" i s

// 位置揃えあり
for (i,s) in rows do
    printfn "|%5i|%5s|" i s

// 2列目を左揃えに
for (i,s) in rows do
    printfn "|%5i|%-5s|" i s

// 1列目の幅を動的に20に設定
for (i,s) in rows do
    printfn "|%*i|%-5s|" 20 i s 

// 1列目と2列目の幅を動的に設定
for (i,s) in rows do
    printfn "|%*i|%-*s|" 20 i 10 s 
```

### 整数の書式設定

基本的な整数型には、特別なオプションがいくつかあります。

* `%i`または`%d` - 符号付き整数用 
* `%u` - 符号なし整数用 
* `%x`と`%X` - 小文字と大文字の16進数用
* `%o` - 8進数用

例を示します。

```fsharp
printfn "signed8: %i unsigned8: %u" -1y -1y
printfn "signed16: %i unsigned16: %u" -1s -1s
printfn "signed32: %i unsigned32: %u" -1 -1
printfn "signed64: %i unsigned64: %u" -1L -1L
printfn "大文字16進数: %X 小文字16進数: %x 8進数: %o" 255 255 255
printfn "バイト: %i " 'A'B
```

これらの指定子は、整数型の中での型安全性を強制するものではありません。上の例からわかるように、符号付き整数を符号なし指定子に渡しても問題ありません。
違いは、どのように書式設定されるかです。符号なし指定子は、実際の型に関係なく、整数を符号なしとして扱います。

`BigInteger` は基本的な整数型ではないので、 `%A` または `%O` で書式設定する必要があることに注意してください。

```fsharp
printfn "bigInt: %i " 123456789I  // エラー
printfn "bigInt: %A " 123456789I  // OK
```

フラグを使って、符号とゼロ埋めの書式設定を制御できます。

* `%0i` - ゼロで埋めます
* `%+i` - プラス記号を表示します
* `% i` - プラス記号の代わりに空白を表示します

例を示します。

```fsharp
let rows = [ (1,"a"); (-22,"bb"); (333,"ccc"); (-4444,"dddd") ] 

// 位置揃えあり
for (i,s) in rows do
    printfn "|%5i|%5s|" i s

// プラス記号付き
for (i,s) in rows do
    printfn "|%+5i|%5s|" i s

// ゼロ埋め
for (i,s) in rows do
    printfn "|%0+5i|%5s|" i s 

// 左揃え
for (i,s) in rows do
    printfn "|%-5i|%5s|" i s 

// 左揃えとプラス記号
for (i,s) in rows do
    printfn "|%+-5i|%5s|" i s 

// 左揃えとプラスの代わりに空白
for (i,s) in rows do
    printfn "|% -5i|%5s|" i s 
```

### 浮動小数点数と10進数の書式設定

浮動小数点型にも、特別なオプションがいくつかあります。

* `%f` - 標準的な形式
* `%e`または`%E` - 指数形式
* `%g`または`%G` - `f`と`e`のうち、よりコンパクトな方
* `%M` - 10進数用

例を示します。

```fsharp
let pi = 3.14
printfn "浮動小数点: %f 指数: %e コンパクト: %g" pi pi pi 

let petabyte = pown 2.0 50
printfn "浮動小数点: %f 指数: %e コンパクト: %g" petabyte petabyte petabyte 
```

10進数型は浮動小数点指定子で使えますが、精度が失われる可能性があります。
`%M` 指定子を使うと、精度が失われないことが保証されます。次の例でその違いがわかります。

```fsharp
let largeM = 123456789.123456789M  // 10進数
printfn "浮動小数点: %f 10進数: %M" largeM largeM 
```

精度指定子（例： `%.2f` や `%.4f` ）を使って、浮動小数点数の精度を制御できます。
`%f` と `%e` 指定子の場合、精度は小数点以下の桁数に影響しますが、 `%g` の場合は合計の桁数に影響します。
例を示します。

```fsharp
printfn "2桁の精度: %.2f 4桁の精度: %.4f" 123.456789 123.456789
// 出力 => 2桁の精度: 123.46 4桁の精度: 123.4568
printfn "2桁の精度: %.2e 4桁の精度: %.4e" 123.456789 123.456789
// 出力 => 2桁の精度: 1.23e+002 4桁の精度: 1.2346e+002
printfn "2桁の精度: %.2g 4桁の精度: %.4g" 123.456789 123.456789
// 出力 => 2桁の精度: 1.2e+02 4桁の精度: 123.5
```

位置揃えと幅のフラグは、浮動小数点数と10進数にも使えます。

```fsharp
printfn "|%f|" pi     // 通常   
printfn "|%10f|" pi   // 幅指定
printfn "|%010f|" pi  // ゼロ埋め
printfn "|%-10f|" pi  // 左揃え
printfn "|%0-10f|" pi // 左揃えゼロ埋め
```

### カスタム書式設定関数

単純な値ではなく、関数を渡せる特別な書式指定子が2つあります。

* `%t` - 入力なしでテキストを出力する関数を受け取ります
* `%a` - 与えられた入力からテキストを出力する関数を受け取ります

`%t` の使用例を示します。

```fsharp
open System.IO

// 関数を定義
let printHello (tw:TextWriter) = tw.Write("こんにちは")

// テスト
printfn "カスタム関数: %t" printHello 
```

明らかに、コールバック関数はパラメータを取らないので、おそらく他の値を参照するクロージャになるでしょう。
以下は、乱数を出力する例です。

```fsharp
open System
open System.IO

// クロージャを使って関数を定義
let printRand = 
    let rand = new Random()
    // 実際の出力関数を返す
    fun (tw:TextWriter) -> tw.Write(rand.Next(1,100))

// テスト
for i in [1..5] do
    printfn "乱数 = %t" printRand 
```

`%a` 指定子の場合、コールバック関数は追加のパラメータを取ります。つまり、 `%a` 指定子を使う際は、関数と書式設定する値の両方を渡す必要があります。

タプルのカスタム書式設定の例を示します。

```fsharp
open System
open System.IO

// コールバック関数を定義
// データパラメータがTextWriterの後にくることに注意
let printLatLong (tw:TextWriter) (lat,long) = 
    tw.Write("緯度:{0} 経度:{1}", lat, long)

// テスト
let latLongs = [ (1,2); (3,4); (5,6)]
for latLong  in latLongs  do
    // 関数と値の両方をprintfnに渡す
    printfn "緯度経度 = %a" printLatLong latLong  
```


### 日付の書式設定

F#には日付用の特別な書式指定子はありません。

日付を書式設定したい場合、以下のような選択肢があります。

* `ToString` を使って日付を文字列に変換し、 `%s` 指定子を使う
* 上で説明した `%a` 指定子を使ってカスタムコールバック関数を使う

以下に、2つのアプローチの使用例を示します。

```fsharp
// 日付を書式設定する関数
let yymmdd1 (date:DateTime) = date.ToString("yy.MM.dd")

// TextWriterに日付を書式設定する関数
let yymmdd2 (tw:TextWriter) (date:DateTime) = tw.Write("{0:yy.MM.dd}", date)

// テスト
for i in [1..5] do
    let date = DateTime.Now.AddDays(float i)

    // %sを使用
    printfn "ToStringを使用 = %s" (yymmdd1 date)
    
    // %aを使用
    printfn "コールバックを使用 = %a" yymmdd2 date
```

どちらのアプローチが良いでしょうか？

`ToString` と `%s` の方がテストや使用が簡単ですが、TextWriterに直接書き込むよりは効率が悪くなります。


## printf関数ファミリー

printfには多くの派生関数があります。以下に簡単なガイドを示します。

F#関数 | C#での同等品 | コメント
-------------|---------|----
`printf` と `printfn` | `Console.Write` と `Console.WriteLine` | "print"で始まる関数は標準出力に書き込みます。
`eprintf` と `eprintfn` | `Console.Error.Write` と `Console.Error.WriteLine` | "eprint"で始まる関数は標準エラー出力に書き込みます。
`fprintf` と `fprintfn` | `TextWriter.Write` と `TextWriter.WriteLine` | "fprint"で始まる関数はTextWriterに書き込みます。
`sprintf` | `String.Format` | "sprint"で始まる関数は文字列を返します。
`bprintf` | `StringBuilder.AppendFormat` | "bprint"で始まる関数はStringBuilderに書き込みます。
`kprintf` 、 `kfprintf` 、 `ksprintf` 、 `kbprintf` | 同等品なし | 継続を受け取る関数。次のセクションで説明します。

*`bprintf` とkXXXファミリーを除くすべての関数は、自動的に使えます（[Microsoft.FSharp.Core.ExtraTopLevelOperators](https://fsharp.github.io/fsharp-core-docs/reference/fsharp-core-extratopleveloperators.html)を通じて）。
しかし、モジュールを使ってアクセスする必要がある場合は、[`Printf` モジュール](https://fsharp.github.io/fsharp-core-docs/reference/fsharp-core-printfmodule.html)にあります。*

使い方自体は、 `kXXX` ファミリー（詳細は後述）を除けば、どれも明らかでしょう。

部分適用を使ってTextWriterやStringBuilderを「組み込む」テクニックは特に便利です。

StringBuilderを使った例を示します。

```fsharp
let printToSb s i = 
    let sb = new System.Text.StringBuilder()

    // 部分適用を使ってStringBuilderを固定
    let myPrint format = Printf.bprintf sb format    

    do myPrint "文字列: %s " s
    do myPrint "整数: %i" i

    // 結果を取得
    sb.ToString()

// テスト
printToSb "こんにちは" 42
```

TextWriterを使った例を示します。

```fsharp
open System
open System.IO

let printToFile filename s i =
    let myDocsPath = Environment.GetFolderPath(Environment.SpecialFolder.MyDocuments) 
    let fullPath = Path.Combine(myDocsPath, filename)
    use sw = new StreamWriter(path=fullPath)

    // 部分適用を使ってTextWriterを固定
    let myPrint format = fprintf sw format

    do myPrint "文字列: %s " s
    do myPrint "整数: %i" i

    // 結果を取得
    sw.Close()

// テスト
printToFile "myfile.txt" "こんにちは" 42
```

### printfの部分適用についてさらに詳しく

上の両方の例で、部分適用を作る際に書式パラメータを渡す必要があったことに注意してください。

つまり、次のようにする必要がありました。

```fsharp
let myPrint format = fprintf sw format
```

ポイントフリー版ではうまくいきません。

```fsharp
let myPrint = fprintf sw 
```

これは、コンパイラが正しくない型について文句を言うのを防ぐためです。理由は明白ではありません。 `printf` の最初のパラメータである `TextWriterFormat` について、上で簡単に触れました。実は、 `printf` は `String.Format` のような単純な関数ではなく、
TextWriterFormat（または類似のStringFormat）をパラメータとして渡すことで「実体化」する必要があるジェネリック関数なのです。

したがって、安全を期すには、過度に部分適用をするのではなく、常に `printf` を書式パラメータと一緒に使うようにしましょう。

## kprintf関数

4つの `kXXX` 関数は、 `printf` ファミリーの関数と似ていますが、追加のパラメータ（継続）を取ります。つまり、書式設定が完了した直後に呼び出される関数です。

簡単な例を示します。

```fsharp
let doAfter s = 
    printfn "完了"
    // 結果を返す
    s

let result = Printf.ksprintf doAfter "%s" "こんにちは"
```

なぜこれが必要なのでしょうか？いくつかの理由があります。

* 結果を、ロギングフレームワークなどの別の関数に渡せます。
* TextWriterをフラッシュするなどのことができます。
* イベントを発生させることができます。

外部のロギングフレームワークとカスタムイベントを使ったサンプルを見てみましょう。

まず、log4netやSystem.Diagnostics.Traceに似た簡単なロギングクラスを作ります。
実際には、サードパーティのライブラリに置き換えられるでしょう。

```fsharp
open System
open System.IO

// log4netやSystem.Diagnostics.Traceのような
// ロギングライブラリ
type Logger(name) = 
    
    let currentTime (tw:TextWriter) = 
        tw.Write("{0:s}",DateTime.Now)

    let logEvent level msg = 
        printfn "%t %s [%s] %s" currentTime level name msg

    member this.LogInfo msg = 
        logEvent "INFO" msg

    member this.LogError msg = 
        logEvent "ERROR" msg

    static member CreateLogger name = 
        new Logger(name)
```

次に、アプリケーションコードで以下のことを行います。

* ロギングフレームワークのインスタンスを作ります。ここではファクトリーメソッドをハードコードしていますが、IoCコンテナを使うこともできます。
* `logInfo` と `logError` というヘルパー関数を作ります。これらはロギングフレームワークを呼び出し、 `logError` の場合はポップアップメッセージも表示します。

```fsharp
// アプリケーションコード
module MyApplication = 

    let logger = Logger.CreateLogger("MyApp")

    // Loggerクラスを使ってlogInfoを作る
    let logInfo format = 
        let doAfter s = 
            logger.LogInfo(s)
        Printf.ksprintf doAfter format 

    // Loggerクラスを使ってlogErrorを作る
    let logError format = 
        let doAfter s = 
            logger.LogError(s)
            System.Windows.Forms.MessageBox.Show(s) |> ignore
        Printf.ksprintf doAfter format 
    
    // ロギングを試すための関数
    let test() = 
        do logInfo "メッセージ #%i" 1
        do logInfo "メッセージ #%i" 2
        do logError "おっと！アプリでエラーが発生しました"
```


最後に、 `test` 関数を実行すると、メッセージがコンソールに書き込まれ、ポップアップメッセージも表示されるはずです。

```fsharp
MyApplication.test()
```

ロギングライブラリをラップした「FormattingLogger」クラスを作り、オブジェクト指向のヘルパーメソッドを作ることもできます。以下に示します。

```fsharp
type FormattingLogger(name) = 

    let logger = Logger.CreateLogger(name)

    // Loggerクラスを使ってlogInfoを作る
    member this.logInfo format = 
        let doAfter s = 
            logger.LogInfo(s)
        Printf.ksprintf doAfter format 

    // Loggerクラスを使ってlogErrorを作る
    member this.logError format = 
        let doAfter s = 
            logger.LogError(s)
            System.Windows.Forms.MessageBox.Show(s) |> ignore
        Printf.ksprintf doAfter format 

    static member createLogger name = 
        new FormattingLogger(name)

// アプリケーションコード
module MyApplication2 = 

    let logger = FormattingLogger.createLogger("MyApp2")

    let test() = 
        do logger.logInfo "メッセージ #%i" 1
        do logger.logInfo "メッセージ #%i" 2
        do logger.logError "おっと！アプリ2でエラーが発生しました"

// テスト
MyApplication2.test()

```

オブジェクト指向のアプローチは、より馴染みがあるかもしれませんが、必ずしも優れているわけではありません！関数型とオブジェクト指向メソッドの長所と短所については[ここ](../posts/type-extensions.html#downsides-of-methods)で議論されています。


