---
layout: post  
title: "Readerモナドを使った依存関係の注入"  
description: "依存関係の注入の6つのアプローチ（その3）"  
date: 2020-12-22  
categories: []  
seriesId: "Dependency Injection"  
seriesOrder: 3  

---

このシリーズでは、依存関係の注入に対する6つの異なるアプローチについて取り上げています。

* [第1回](./dependencies.html)では、「依存関係の保持」（依存関係をインライン化する）と「依存関係の排除」（I/Oを実装の端に押しやる）について見てきました。
* [第2回](./dependencies-2.html)では、依存関係を通常の関数パラメータとして注入する方法について説明しました。
* 今回は、従来のオブジェクト指向スタイルの依存関係の注入と、それに対応する関数型の手法であるReaderモナドを紹介します。

----

## ログ記録の問題を再考する

前回の記事で、ログ記録の問題について簡単に触れました。ドメインの深い部分から、どのように依存関係にアクセスすればよいのでしょうか？

たとえば、2つの文字列を比較するコードがあります。このコードは純粋ですが、同時にロガーも必要とします。最も明白な解決策は、`ILogger`をパラメータとして渡すことです。

```fsharp
let compareTwoStrings (logger:ILogger) str1 str2 =
  logger.Debug "compareTwoStrings: Starting"

  let result =
    if str1 > str2 then
      Bigger
    else if str1 < str2 then
      Smaller
    else
      Equal

  logger.Info (sprintf "compareTwoStrings: result=%A" result)
  logger.Debug "compareTwoStrings: Finished"
  result
```

## 依存関係の「注入」

前述の通り、依存関係をパラメータとして渡す一般的な方法は、それらを*先頭*に置くことです。こうすることで、部分適用が可能になります。  
上記コードの関数シグネチャを図にすると、以下のようになります。

![](@assets/img/Dependencies5a.jpg)

では、依存関係を*最後*に渡したらどうなるでしょう？ その場合、関数シグネチャは次のようになります。

![](@assets/img/Dependencies5b.jpg)

この方法の利点は何でしょうか？ それは、このシグネチャを次のように解釈し直せるという点にあります。

![](@assets/img/Dependencies5c.jpg)

つまり、元々の関数は`ComparisonResult`を返していましたが、今やそれは*関数*を返しています。その関数は、`ILogger -> ComparisonResult`というシグネチャを持っています。

ここでやっているのは、依存関係の必要性を遅延させることです。関数は「依存関係が利用可能である前提で処理を行う」と宣言し、実際に依存関係を提供するのはあとになります。


## オブジェクト指向スタイルの依存関係の注入

よく考えてみると、これはまさに従来のオブジェクト指向スタイルの依存関係の注入のやり方と同じです。

* まず、クラスとそのメソッドを、後で依存関係が提供されることを前提に実装します。
* その後、クラスのインスタンスを作成する際に*実際の*依存関係を渡します。

以下は、F#でのクラス定義の例です。


```fsharp
// コンストラクタ経由でロガーを受け取る
type StringComparisons(logger:ILogger) =

  member __.CompareTwoStrings str1 str2  =
    logger.Debug "compareTwoStrings: Starting"

    let result = ...

    logger.Info (sprintf "compareTwoStrings: result=%A" result)
    logger.Debug "compareTwoStrings: Finished"
    result
```

そして、後でロガーインスタンスを使ってこのクラスを構築するコードは以下のようになります。

```fsharp
// ロガーを作成
let logger : ILogger = defaultLogger
// クラスを構築
let stringComparisons = StringComparisons logger
// メソッドを呼び出し
stringComparisons.CompareTwoStrings "a" "b"
```

興味深いのは、F#ではこのクラスのコンストラクタ呼び出し（`StringComparisons logger`）が、まるで関数呼び出しのように見えることです。依存関係（ロガー）を最後のパラメータとして渡しているように見えます。

## 関数型スタイルの依存関係の注入：関数を返す

では、「依存関係を後から渡す」関数型のやり方はどうでしょうか？ 前述の通り、それは単に*関数*を返すことを意味します。この関数は`ILogger`をパラメータとして取り、後でその値を渡す形になります。

以下は、`compareTwoStrings`関数の`ILogger`を*最後*のパラメータとして記述した例です。

```fsharp
let compareTwoStrings str1 str2 (logger:ILogger) =
  logger.Debug "compareTwoStrings: Starting"

  let result = ...

  logger.Info (sprintf "compareTwoStrings: result=%A" result)
  logger.Debug "compareTwoStrings: Finished"
  result
```

そして、まったく同じ関数を、返り値が`ILogger -> ComparisonResult`となるように書き直したのが以下です。

```fsharp
let compareTwoStrings str1 str2 =
  fun (logger:ILogger) ->
    logger.Debug "compareTwoStrings: Starting"

    let result = ...

    logger.Info (sprintf "compareTwoStrings: result=%A" result)
    logger.Debug "compareTwoStrings: Finished"
    result
```

## Readerモナド

実はこのようなパターンは関数型では非常に一般的であり、特別な名前がついています。それが「Readerモナド」あるいは「環境モナド」です。

“モナド”という言葉が出てくると身構えてしまいがちですが、実際のところ、これは「何らかのコンテキストや環境（今回の場合は`ILogger`）をパラメータとして受け取る関数」に名前を付けているだけです。

![](@assets/img/Dependencies5d.jpg)

使いやすくするために、この関数を汎用型でラップします。

```fsharp
type Reader<'env,'a> = Reader of action:('env -> 'a)
```

これは「Readerは、ある環境`'env`を入力として取り、値`'a`を返す関数を持っている」という意味になります。

この型を使って、先ほどの関数を次のように書き換えます。


```fsharp
let compareTwoStrings str1 str2 :Reader<ILogger,ComparisonResult> =
  fun (logger:ILogger) ->
    logger.Debug "compareTwoStrings: Starting"

    let result = ...

    logger.Info (sprintf "compareTwoStrings: result=%A" result)
    logger.Debug "compareTwoStrings: Finished"
    result
  |> Reader // <------------------ ここが新しい！
```

返り値の型が `ILogger -> ComparisonResult` から `Reader<ILogger, ComparisonResult>` に変わったことに注目してください。

ここで疑問がわくかもしれません。「なぜわざわざこんなことを？」と。

その理由は、`Reader`型が他の型、たとえば`Option`や`Result`、`List`、`Async`と同様に合成や変換、連結が可能だからです。  
[Railway Oriented Programming](https://fsharpforfunandprofit.com/rop/)の記事を読んだことがある方なら、`Result`を返す関数を連結するパターンを思い出すかもしれません。それとまったく同様に、`Reader`を返す関数にも`map`や`bind`（または`flatMap`）といった関数を適用できます。つまり、これはモナドなのです！

以下は便利な`Reader`用関数をまとめたモジュールです。

```fsharp
module Reader =
  /// 指定した環境でReaderを実行する
  let run env (Reader action)  =
    action env  // 内部関数を単に呼び出す

  /// 環境自体を返すReaderを作成する
  let ask = Reader id

  /// Readerに関数をマップする
  let map f reader =
    Reader (fun env -> f (run env reader))

  /// ReaderにflatMapを適用する
  let bind f reader =
    let newAction env =
      let x = run env reader
      run env (f x)
    Reader newAction
```

### `reader` 計算式

`bind`関数があるということは、計算式（computation expression）も簡単に作れるということです。以下に`Reader`用の基本的な計算式を定義します。

```fsharp
type ReaderBuilder() =
  member __.Return(x) = Reader (fun _ -> x)
  member __.Bind(x,f) = Reader.bind f x
  member __.Zero() = Reader (fun _ -> ())

// Builderインスタンス
let reader = ReaderBuilder()
```

必ずしも`reader`計算式を使う必要はありませんが、多くの場合、使った方がコードが簡潔になります。

## Reader を返す関数の構築

では、実際にどのように使うのか見てみましょう。第1回のコードを、3つのパートに分割して再構成します： 文字列の読み取り、比較、出力の表示です。

まずは、`reader` 計算式を使って書き直した `compareTwoStrings` の例です。

```fsharp
let compareTwoStrings str1 str2  =
  reader {
    let! (logger:ILogger) = Reader.ask
    logger.Debug "compareTwoStrings: Starting"

    let result = ...

    logger.Info (sprintf "compareTwoStrings: result=%A" result)
    logger.Debug "compareTwoStrings: Finished"
    return result
    }
```

以前の実装と非常によく似ていますが、いくつか注目すべき点があります：

* 全体が `reader { ... }` の中に収まっています。
* `ILogger` パラメータは消えており、代わりに `Reader.ask` を使って環境値（この場合は `ILogger`）にアクセスしています。
* 計算式の中では、`let!` や `do!` を使って Reader の中身を「取り出す」ことができます。
  この場合、`let!` を使って `ask` から環境を取得しています。
* `let! (logger:ILogger) = Reader.ask` に型注釈を付けることで、関数全体に明示的な型注釈を付けなくてもコンパイラが型推論できます。


同様に、コンソールから文字列を読み取る関数も以下のように書けます：

```fsharp
let readFromConsole() =
  reader {
    let! (console:IConsole) = Reader.ask

    console.WriteLn "Enter the first value"
    let str1 = console.ReadLn()
    console.WriteLn "Enter the second value"
    let str2 = console.ReadLn()

    return str1,str2
    }
```

この場合、`ask` の型注釈は `IConsole` です。

しかし、*2つ*の異なるサービスが必要な場合はどうなるでしょう？ 以下のように書こうとすると：

```fsharp
let readFromConsole() =
  reader {
    let! (console:IConsole) = Reader.ask
    let! (logger:ILogger) = Reader.ask     // エラー
    ...
```

これはコンパイルエラーになります。 というのも、最初の行で Reader の型が `Reader<IConsole,_>` と推論され、2行目では `Reader<ILogger,_>` と推論されてしまうため、型の整合性が取れないからです。

この問題を解決するには、いくつかのアプローチがあります。

### アプローチ1：推論による継承制約の利用

F# では継承の仕組みを使って、この問題を回避できます。 `console` が `IConsole` を継承しており、`logger` が `ILogger` を継承している必要があるとすれば、Reader の型は「両方のインターフェースを継承しているもの」として推論されるようになります。

F# でこの継承制約を明示するには、型注釈の前に `#` を付けます：

```fsharp
let readFromConsole() =
  reader {
    let! (console:#IConsole) = Reader.ask
    let! (logger:#ILogger) = Reader.ask     // これでOK！
    ...
```

これにより型エラーは解消されます。推論される実際の型は `Reader<'a,...> when 'a :> ILogger and 'a :> IConsole` のようになります。

同様に、`compareTwoStrings` も次のように修正できます：

```fsharp
let compareTwoStrings str1 str2  =
  reader {
    let! (logger:#ILogger) = Reader.ask
    logger.Debug "Starting"
```

また、結果を出力する関数も以下のように実装できます：

```fsharp
let writeToConsole (result:ComparisonResult) =
  reader {
    let! (console:#IConsole) = Reader.ask

    match result with
    | Bigger ->
      console.WriteLn "The first value is bigger"
    | Smaller ->
      console.WriteLn "The first value is smaller"
    | Equal ->
      console.WriteLn "The values are equal"

    }
```

### 継承制約を使った Reader 関数の合成


では、これら3つのReader関数を合成してみましょう。

まず、`ILogger` と `IConsole` の両方を実装する型を定義します：

```fsharp
type IServices =
    inherit ILogger
    inherit IConsole
```

そして、3つの関数を含む計算式を次のように記述します：

```fsharp
let program :Reader<IServices,_> = reader {
  let! str1,str2 = readFromConsole()
  let! result = compareTwoStrings str1 str2
  do! writeToConsole result
  }
```

ここで注意すべきなのは、`program` はまだ実行されていないという点です。`Async` 値や[自作のパーサー](https://fsharpforfunandprofit.com/parser/)と同様に、「実行可能な潜在的な値」ではありますが、実際に実行するには `IServices` を渡す必要があります。

例えば、コンソールとロガーのデフォルト実装があるとすれば、`IServices` の実装は次のようになります：

```fsharp
let services =
  { new IServices
    interface IConsole with
      member __.ReadLn() = defaultConsole.ReadLn()
      member __.WriteLn str = defaultConsole.WriteLn str
    interface ILogger with
      member __.Debug str = defaultLogger.Debug str
      member __.Info str = defaultLogger.Info str
      member __.Error str = defaultLogger.Error str
    }
```

そして、次のようにして全体を実行します：

```fsharp
Reader.run services program
```

### アプローチ2：環境のマッピング

継承制約によるアプローチも便利ですが、実装すべきメソッドが増えてくると煩雑になります。 この問題を回避するために、1メソッドだけを持つ中間インターフェースを挟む方法もありますが、詳しくは [Bartosz Sypytkowski の記事](https://bartoszsypytkowski.com/dealing-with-complex-dependency-injection-in-f/) に譲ります。

ここでは、継承を使わない別の方法を紹介します。

最初に、各関数が必要とする型を正確に要求するように定義します。  
複数のサービスが必要な場合は、環境からタプルで取り出します：

```fsharp
let readFromConsole() =
  reader {
    // IConsole, ILogger のペアを要求する
    let! (console:IConsole),(logger:ILogger) = Reader.ask  // タプル
    ...
    return str1,str2
    }

let compareTwoStrings str1 str2  =
  reader {
    // ILogger を要求する
    let! (logger:ILogger) = Reader.ask
    logger.Debug "compareTwoStrings: Starting"

    let result = ...

    return result
    }

let writeToConsole (result:ComparisonResult) =
  reader {
    // IConsole を要求する
    let! (console:IConsole) = Reader.ask

    match result with
    ...
    }
```

このまま3つの関数を計算式で合成しようとすると、次のように多くのエラーが出ます：

```fsharp
let program_bad = reader {
  let! str1, str2 = readFromConsole()
  let! result = compareTwoStrings str1 str2 // エラー
  do! writeToConsole result // エラー
  }
```

というのも、各Reader関数が異なる環境型を要求しているためです。`readFromConsole` は `IConsole * ILogger` を、`compareTwoStrings` は `ILogger` を、`writeToConsole` は `IConsole` を期待しており、互換性がありません。

この問題を解決するために、「すべての部分環境に変換可能なスーパータイプ」を用意します：

```fsharp
type Services = {
  Logger : ILogger
  Console : IConsole
  }
```

次に、基本型から部分環境に変換する関数を使って、Reader の環境型を変換します。これを `withEnv` と呼びます：

```fsharp
/// Readerの環境を基本型から部分型に変換する
let withEnv (f:'superEnv->'subEnv) reader =
  Reader (fun superEnv -> (run (f superEnv) reader))
// 新しいReaderの環境は "superEnv"
```

※ この `withEnv` の型シグネチャは「map」とよく似ていますが、型の方向が逆（逆変換）です。このような型のことを「コントラマップ（contramap）」と呼びます。

では、各Reader関数に対して `Reader.withEnv` を使い、環境を変換しながら合成してみましょう：

```fsharp
let program = reader {
  // 環境を変換するための補助関数
  let getConsole services = services.Console
  let getLogger services = services.Logger
  let getConsoleAndLogger services = services.Console,services.Logger // タプル

  let! str1, str2 =
    readFromConsole()
    |> Reader.withEnv getConsoleAndLogger
  let! result =
    compareTwoStrings str1 str2
    |> Reader.withEnv getLogger
  do! writeToConsole result
    |> Reader.withEnv getConsole
  }
```

このように `withEnv` を使うことで、計算式のコードは多少複雑になりますが、サービス実装の柔軟性は格段に高まります。

この `program` もまだ実行されていません。実行するには `Services` を渡す必要があります：

```fsharp
let services = {
  Console = defaultConsole
  Logger = defaultLogger
  }

Reader.run services program
```

## 参考リンク

Readerモナドの別の活用例は、[このシリーズの最後の記事](./dependencies-5.html#approach-4b-reader-monad)をご覧ください。

ReaderモナドはF#ではあまり一般的ではありませんが、Haskellや関数型スタイルのScalaではよく使われます。
F#における活用例としては、[Carsten König](http://gettingsharper.de/2015/03/10/dependency-injection-a-functional-way/) や
[Matthew Podwysocki](http://codebetter.com/matthewpodwysocki/2010/01/07/much-ado-about-monads-reader-edition/) がおすすめの投稿です。

## 依存関係を後から渡すことの長所と短所

OOスタイルの依存関係の注入も、関数型のReaderも、どちらも「コードを作成した後に依存関係を渡す」という点で共通しています。

では、どちらが優れているのでしょうか？ また、どんなときに使うべきなのでしょうか？

まず、C#のフレームワーク（たとえばASP.NET）と連携する場合には、F#側でもその方法に合わせた方が楽です。

それ以外の場合、Readerモナドには多くの利点があります。前回紹介した「依存関係のパラメータ化」のような醜いパラメータ列が不要になり、OOスタイルよりも合成がしやすく、`map` や `bind` といった標準的なツールを使って処理を構成できます。

ただし、良いことばかりではありません。Readerモナドは、他の型との組み合わせが難しいという、モナド共通の問題を抱えています。

たとえば、`Reader` と `Result` の両方を返したい場合、それらを簡単に組み合わせることはできません。さらに `Async` を加えようとすると、状況はさらに複雑になります。もちろん解決策はありますが、型を合わせるのに多くの時間を費やす「型テトリス」に陥りやすくなります。 そのため、I/Oが多い「境界」部分では、Readerの使用はおすすめしません。ログ記録のような依存関係を純粋なコードに注入する場合に限定して使うとよいでしょう。

まとめると、Readerはツールボックスの中に持っておくべき便利な道具です。特に、コードの純粋性を保ちたい（Haskell的な）スタイルにこだわる場合には有効です。 しかし、F#はHaskellではありません。Readerをデフォルトとして使うのはやりすぎだと思います。状況に応じて、このシリーズで紹介した他のアプローチを使い分けるのがよいでしょう。


まだ終わりではありません！ [次回の記事](./dependencies-4.html)では、依存関係を管理するもうひとつのアプローチ、「インタープリターパターン」について取り上げます。

*この記事のソースコードは [この gist](https://gist.github.com/swlaschin/4ed2e4e8ea5b63c968bc469fbce620b5) で公開されています。*
