---
layout: post  
title: "パラメータによる依存関係の注入"  
description: "依存関係の注入の6つのアプローチ 第2回"  
date: 2020-12-21  
categories: []  
seriesId: "Dependency Injection"  
seriesOrder: 2

---


このシリーズでは、依存関係の注入に関する6つの異なるアプローチについて見ていきます。

* [第1回](./dependencies.html)では、「依存関係の保持（インライン化）」と「依存関係の排除（I/Oを実装の端へ押しやる）」というアプローチを紹介しました。
* 今回は、「依存関係のパラメータ化」による管理方法について見ていきます。

----


## 依存関係のパラメータ化

純粋なコードと非純粋なコードを分離する努力をしたとしても、他の依存関係を管理する必要が出てくる場合があります。たとえば次のような場合です：

* 前回のコードを、異なる比較アルゴリズムに対応させるにはどうすればよいか？
* 前回のコードを、I/Oをモック化できるようにするには？（統合テストではなくモックを使いたいと仮定した場合）

このような「パラメータ化」の要件を実現するには、単純かつ明快な方法として、望む振る舞いを関数としてメインのコードに渡す、という方法があります。

たとえば、異なる比較アルゴリズムをサポートしたい場合は、次のように `comparison` オプションを引数として渡すことができます：

```fsharp
let compareTwoStrings (comparison:StringComparison) str1 str2 =
  // StringComparison 列挙体でカルチャや大文字小文字の区別を指定できる
  let result = String.Compare(str1,str2,comparison)
  if result > 0 then
    Bigger
  else if result < 0 then
    Smaller
  else
    Equal
```

この関数は、もとの2引数に加えて、3つ目の引数を取るようになっています。

![](@assets/img/Dependencies3a.jpg)

しかし、引数が増えたことで、もとの `compareTwoStrings` の契約（2つの入力を取る）を破ってしまいました：

```fsharp
type CompareTwoStrings = string -> string -> ComparisonResult
```

とはいえ、心配はいりません。`comparison` を部分適用すれば、この契約に準拠する新たな関数を作ることができます：

```fsharp
// いずれも `CompareTwoStrings` と同じ型を持つ
let compareCaseSensitive = compareTwoStrings StringComparison.CurrentCulture
let compareCaseInsensitive = compareTwoStrings StringComparison.CurrentCultureIgnoreCase
```

![](@assets/img/Dependencies3b.jpg)

このとき、「ストラテジー（戦略）」となる引数を最初に持ってくることで、部分適用がしやすくなっている点に注目してください。

### I/Oのための依存関係のパラメータ化

同じパラメータ化の手法は、I/O関数やその他インフラサービスの複数の実装をサポートしたいときにも使えます。単にそれらを引数として渡せばよいのです。

```fsharp
// 「インフラサービス」を引数として受け取る
let compareTwoStrings (readLn:unit->string) (writeLn:string->unit) =
  writeLn "1つ目の値を入力してください"
  let str1 = readLn()
  writeLn "2つ目の値を入力してください"
  let str2 = readLn()
  // 以下省略
```

最上位のコードでは、`readLn` と `writeLn` の実装を定義し、それを関数に渡します：

```fsharp
let program() =
  let readLn() = Console.ReadLine()
  let writeLn str = printfn "%s" str
  // パラメータ化された関数を呼び出す
  compareTwoStrings readLn writeLn
```

もちろん、これらのコンソール実装をファイルやソケットなどを使った別の実装に差し替えることもできます。


### 複数の依存関係を1つの引数にまとめる

関数が多くのインフラサービスに依存している場合、それぞれを個別の引数として渡すよりも、インターフェースや関数のレコードとして1つのオブジェクトにまとめる方が一般的に扱いやすくなります。

```fsharp
type IConsole =
  abstract ReadLn : unit -> string
  abstract WriteLn : string -> unit
```

メインの関数は、このインターフェースを単一の引数として受け取ります：

```fsharp
// すべての「インフラサービス」を1つのインターフェースで受け取る
let compareTwoStrings (console:IConsole) =
  console.WriteLn "1つ目の値を入力してください"
  let str1 = console.ReadLn()
  console.WriteLn "2つ目の値を入力してください"
  let str2 = console.ReadLn()
  // 以下省略
```

そして最上位の関数（いわゆる「コンポジションルート」）で、必要なインターフェースを構築して、メイン関数に渡します：

```fsharp
let program() =
  let console = {
    new IConsole with
      member this.ReadLn() = Console.ReadLine()
      member this.WriteLn str = printfn "%s" str
    }
  // パラメータ化された関数を呼び出す
  compareTwoStrings console
```

## 依存関係のパラメータ化のメリットとデメリット

「ストラテジー」スタイルの依存関係に対しては、パラメータ化はごく標準的なアプローチです。あまりに一般的なので、話題にすらならないことも多いです。たとえば `List.map` や `List.sortBy` など、ほとんどのコレクション関数で見られます。

インフラサービスやその他の非決定的な依存関係をパラメータ化する場合は、メリットが少し曖昧になります。以下の観点から、この方法を取るかどうか検討できます：

**モック化のしやすさ**：この方法を使えばインフラをモック化できますが、そもそもI/Oを実装の端へ押しやっていれば、モックは不要で、純粋な部分だけを単体テストすれば済むはずです。

**ベンダーロックインの回避**：インフラ（たとえばデータベースアクセス）をパラメータ化しておけば、後で実装を切り替えやすくなるという意見もあります。しかし、やはりI/Oを分離しているなら、端では特定のデータベース実装をハードコーディングしても問題ありません。純粋な意思決定コードとは分離されているので、別ベンダーに切り替えるのも比較的簡単なはずです。さらに、あえて汎用化しないことで、特定ベンダーの便利な機能を活用することもできます。（ベンダー固有の機能を使わないのであれば、なぜそのベンダーを使っているのでしょう？）

**カプセル化**：I/O中心のパイプラインで、ビジネスロジックがほとんどない場合、複数のコンポーネントがそれぞれ異なるインフラサービスを必要とすることがあります。その場合、各サービスを部分適用した関数として各コンポーネントに渡し、それらをつなげて構築する方が、結果的にシンプルになることもあります：

![](@assets/img/Dependencies4a.jpg)

このようにすることで、パイプラインの各コンポーネントを疎結合に保つことができます。多少の純粋性のルールを破ることになっても、F# は Haskell ではありませんし、私自身はこのアプローチを *I/Oが中心の処理であれば* 問題ないと考えています。もしビジネスロジックが中心なら、「依存関係の排除」アプローチを採る方がよいでしょう。


## 補足：純粋関数は不純な引数を取れるのか？

非決定的な依存関係を関数の引数として渡した場合、その関数は不純とみなされるのでしょうか？私の考えでは、答えは「いいえ」です。`List.map` に不純な関数を渡しても、`List.map` 自体が不純になるわけではありません。

Haskell では、「不純」な関数は型に `IO` を含むことで明示されます。`IO` 型はコールスタック全体に「汚染」を広げていき、最終的に `main` 関数の出力にも `IO` が現れ、明示的に不純であることが示されます。一方、F# のコンパイラにはそのような仕組みはありません。一部の人は `Async` を Haskell の `IO` と同等のものとして使い、非決定性の指標にしています。私個人としてはどちらでもよく、状況によっては有効かもしれませんが、一般原則として強制すべきものとは思っていません。


## ロギングはどう管理するか？

純粋なドメインコードの中から、I/O やその他の非決定的な処理を行いたくなる場面も時にはあります。このようなケースでは、「依存関係の排除」だけでは対応できず、何らかの方法で依存関係を渡さなければなりません。

このような状況の典型例が「ロギング」です。ドメインの中心処理の中で、さまざまな操作をログに出力したいというケースがよくあります。以下のようなロガーインターフェースがあったとしましょう：

```fsharp
type ILogger =
  abstract Debug : string -> unit
  abstract Info : string -> unit
  abstract Error : string -> unit
```

では、ドメインの中からこのロガーをどう使えばよいでしょうか？

最も簡単なのは、グローバルオブジェクト（シングルトンのロガー、またはロガーを生成するファクトリー）にアクセスすることです。一般的にグローバルは避けるべきですが、ロギングに関してはコードをすっきりさせるための例外と考えてもよいでしょう。

より明示的にしたい場合は、ロガーを必要な関数すべてに引数として渡す必要があります。たとえば以下のようになります：

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

このアプローチの利点は、関数が完全に独立しており、単体でテストしやすいことです。
一方の欠点は、ネストの深い関数が多数あるときに、毎回引数として渡すのが煩雑になることです。
次回とその次の記事では、この問題に対する別のアプローチとして「Readerモナド」や「インタープリターパターン」を紹介します。


## まとめ

この記事では、通常の関数引数を使って依存関係を渡す方法を紹介しました。

前回紹介した「依存関係の排除」と比べてどうでしょうか？
私の考えでは、まずは常に「依存関係の排除」のアプローチから始めるべきです。可能な限り、I/O 依存関係を端へ押しやり、コアな処理から分離しましょう。

とはいえ、状況によっては I/O 依存関係を引数で渡してしまっても問題ないケースもあると私は思いますよ！
特に I/O 処理が中心となるパイプラインや、ロギングの必要がある場合などは、その方が理にかなっていると言えるでしょう。

もし「純粋性」をより厳格に保ちたいのであれば、次回の記事をお楽しみに！[次回](./dependencies-3.html)では、「Readerモナド」について取り上げます。

*この記事のソースコードは [この gist](https://gist.github.com/swlaschin/047f8c9a631ac0a620ab0a815d474911) で公開されています。*
