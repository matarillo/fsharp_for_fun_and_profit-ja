---
layout: post
title: "テストにF#を使う"
description: "仕事でF#を使う26の低リスクな方法（パート3）"
categories: []
seriesId: "仕事でF#を低リスクで使う方法"
seriesOrder: 3

---

この投稿は、[仕事でF#を低リスクかつ段階的に使う方法](../posts/low-risk-ways-to-use-fsharp-at-work.html)に関する前回のシリーズの続きです。
ミッションクリティカルなコードに影響を与えることなく、低リスクで段階的にF#を実践するにはどうすればよいでしょうか？

今回は、テストにF#を使うことについて説明します。

## シリーズの内容

本題に入る前に、26の方法の完全なリストを示します：

**パート1 - F#を使って対話的に探索し開発する**

<a href="/posts/low-risk-ways-to-use-fsharp-at-work.html#explore-net-interactively">1. F#を使って.NETフレームワークを対話的に探索する</a><br />
<a href="/posts/low-risk-ways-to-use-fsharp-at-work.html#explore-own-code-interactively">2. F#を使って自分のコードを対話的にテストする</a> <br />
<a href="/posts/low-risk-ways-to-use-fsharp-at-work.html#explore-webservices-interactively">3. F#を使ってWebサービスを対話的に操作する</a><br />
<a href="/posts/low-risk-ways-to-use-fsharp-at-work.html#explore-winforms-interactively">4. F#を使ってUIを対話的に操作する</a><br />

**パート2 - 開発およびDevOpsスクリプトにF#を使う**

<a href="/posts/low-risk-ways-to-use-fsharp-at-work-2.html#fake">5. ビルドとCIスクリプトにFAKEを使う</a><br />
<a href="/posts/low-risk-ways-to-use-fsharp-at-work-2.html#dev-website-responding">6. Webサイトの応答をチェックするF#スクリプト</a><br />
<a href="/posts/low-risk-ways-to-use-fsharp-at-work-2.html#dev-rss-to-csv">7. RSSフィードをCSVに変換するF#スクリプト</a><br />
<a href="/posts/low-risk-ways-to-use-fsharp-at-work-2.html#dev-wmi-stats">8. WMIを使ってプロセスの統計をチェックするF#スクリプト</a><br />
<a href="/posts/low-risk-ways-to-use-fsharp-at-work-2.html#dev-cloud">9. クラウドの設定と管理にF#を使う</a><br />

**パート3 - テストにF#を使う**

<a href="/posts/low-risk-ways-to-use-fsharp-at-work-3.html#test-nunit">10. 読みやすい名前の単体テストをF#で書く</a><br />
<a href="/posts/low-risk-ways-to-use-fsharp-at-work-3.html#test-runner">11. F#を使って単体テストをプログラムで実行する</a><br />
<a href="/posts/low-risk-ways-to-use-fsharp-at-work-3.html#test-other">12. F#を使って他の方法で単体テストを書くことを学ぶ</a><br />
<a href="/posts/low-risk-ways-to-use-fsharp-at-work-3.html#test-fscheck">13. FsCheckを使ってより良い単体テストを書く</a><br />
<a href="/posts/low-risk-ways-to-use-fsharp-at-work-3.html#test-dummy">14. FsCheckを使ってランダムなダミーデータを作成する</a><br />
<a href="/posts/low-risk-ways-to-use-fsharp-at-work-3.html#test-mock">15. F#を使ってモックを作成する</a><br />
<a href="/posts/low-risk-ways-to-use-fsharp-at-work-3.html#test-canopy">16. F#を使って自動化されたブラウザテストを行う</a><br />
<a href="/posts/low-risk-ways-to-use-fsharp-at-work-3.html#test-bdd">17. 振る舞い駆動開発にF#を使う</a><br />

**パート4. データベース関連のタスクにF#を使う**

<a href="/posts/low-risk-ways-to-use-fsharp-at-work-4.html#sql-linqpad">18. F#を使ってLINQpadを置き換える</a><br />
<a href="/posts/low-risk-ways-to-use-fsharp-at-work-4.html#sql-testprocs">19. F#を使ってストアドプロシージャの単体テストを行う</a><br />
<a href="/posts/low-risk-ways-to-use-fsharp-at-work-4.html#sql-randomdata">20. FsCheckを使ってランダムなデータベースレコードを生成する</a><br />
<a href="/posts/low-risk-ways-to-use-fsharp-at-work-4.html#sql-etl">21. F#を使って簡単なETLを行う</a><br />
<a href="/posts/low-risk-ways-to-use-fsharp-at-work-4.html#sql-sqlagent">22. F#を使ってSQL Agentスクリプトを生成する</a><br />

**パート5: F#を使うその他の興味深い方法**

<a href="/posts/low-risk-ways-to-use-fsharp-at-work-5.html#other-parsers">23. パーシングにF#を使う</a><br />
<a href="/posts/low-risk-ways-to-use-fsharp-at-work-5.html#other-diagramming">24. ダイアグラムと可視化にF#を使う</a><br />
<a href="/posts/low-risk-ways-to-use-fsharp-at-work-5.html#other-data-access">25. WebベースのデータストアへのアクセスにF#を使う</a><br />
<a href="/posts/low-risk-ways-to-use-fsharp-at-work-5.html#other-data-science">26. データサイエンスと機械学習にF#を使う</a><br />
<a href="/posts/low-risk-ways-to-use-fsharp-at-work-5.html#other-balance-power">（ボーナス）27: イギリスの発電所群の発電スケジュールをバランスさせる</a><br />


----------
   
## パート3 - テストにF#を使う

コアコードに触れずにF#で有用なコードを書き始めたい場合、テストを書くことは素晴らしい始め方です。

F#は構文がよりコンパクトなだけでなく、テスト名をより読みやすくする「二重バッククォート」構文など、多くの優れた機能があります。

このシリーズのすべての提案と同様に、これは低リスクな選択肢だと考えます。
テストメソッドは通常短いので、F#を深く理解していなくてもほとんどの人が読むことができます。
最悪の場合でも、簡単にC#に移植することができます。



<a name="test-nunit"></a>

## 10. 読みやすい名前の単体テストをF#で書く

*このセクションのコードは[githubで入手可能](https://github.com/swlaschin/low-risk-ways-to-use-fsharp-at-work/blob/master/TestsInFsharp/TestWithNUnit.fs)です。*

C#と同様に、F#でもNUnit、MsUnit、xUnitなどの標準的なフレームワークを使って標準的な単体テストを書くことができます。

以下は、NUnitで使うためのテストクラスの例です。

```fsharp
[<TestFixture>]
type TestClass() = 

    [<Test>]
    member this.When2IsAddedTo2Expect4() = 
        Assert.AreEqual(4, 2+2)
```

ご覧のように、`TestFixture`属性を持つクラスと、`Test`属性を持つpublic voidメソッドがあります。
すべて標準的なものです。

しかし、C#ではなくF#を使うと、いくつかの素晴らしい追加機能があります。まず、二重バッククォート構文を使ってより読みやすい名前を作成でき、
次に、クラスの代わりに`let`束縛関数をモジュールで使えるため、コードが簡略化されます。

```fsharp
[<Test>]
let ``When 2 is added to 2 expect 4``() = 
    Assert.AreEqual(4, 2+2)
```

二重バッククォート構文を使うと、テスト結果がより読みやすくなります。以下は標準的なクラス名を使ったテストの出力です：

```text
TestClass.When2IsAddedTo2Expect4
Result: Success
```

対して、より親しみやすい名前を使った出力：

```text
MyUnitTests.When 2 is added to 2 expect 4
Result: Success
```

したがって、非プログラマーにもわかりやすいテスト名を書きたい場合は、F#を試してみてください！

<a name="test-runner"></a>

## 11. F#を使って単体テストをプログラムで実行する

しばしば、単体テストをプログラムで実行したいことがあります。これにはさまざまな理由があり、
カスタムフィルターの使用、カスタムログの記録、テストマシンにNUnitをインストールしたくない場合などがあります。

これを行う簡単な方法の1つは、[Fuchuライブラリ](https://github.com/mausch/Fuchu)を使うことです。Fuchuを使うと、複雑なテスト属性を使わずに、
特にパラメータ化されたテストを直接整理することができます。

以下は例です：

```fsharp
let add1 x = x + 1

// 任意のアサーションフレームワークを使った簡単なテスト：
// Fuchu独自のもの、Nunit、FsUnitなど
let ``Assert that add1 is x+1`` x _notUsed = 
   NUnit.Framework.Assert.AreEqual(x+1, add1 x)

// 1つの値を持つ単一のテストケース
let simpleTest = 
   testCase "Test with 42" <| 
     ``Assert that add1 is x+1`` 42

// 1つのパラメータを持つパラメータ化されたテストケース
let parameterizedTest i = 
   testCase (sprintf "Test with %i" i) <| 
     ``Assert that add1 is x+1`` i
```

これらのテストは、`run simpleTest`のようなコードを使ってF#インタラクティブで直接実行できます。

また、これらのテストを1つ以上のリスト、またはリストの階層的なリストに組み合わせることもできます：

```fsharp
// テストの階層を作成
// "Tests"属性で開始点としてマークする
[<Fuchu.Tests>]
let tests = 
   testList "Test group A" [
      simpleTest 
      testList "Parameterized 1..10" ([1..10] |> List.map parameterizedTest) 
      testList "Parameterized 11..20" ([11..20] |> List.map parameterizedTest) 
   ]
```

*上記のコードは[githubで入手可能](https://github.com/swlaschin/low-risk-ways-to-use-fsharp-at-work/blob/master/TestsInFsharp/OrganizeTestsWithFuchu.fs)です。*

最後に、Fuchuを使うと、テストアセンブリが独自のテストランナーになります。アセンブリをライブラリではなくコンソールアプリにし、`program.fs`ファイルに次のコードを追加するだけです：

```fsharp
[<EntryPoint>]
let main args = 
    let exitCode = defaultMainThisAssembly args
    
    Console.WriteLine("Press any key")
    Console.ReadLine() |> ignore

    // 終了コードを返す
    exitCode 
```

[Fuchuの詳細はこちら](https://bugsquash.blogspot.com/2012/06/fuchu-functional-test-library-for-net.html)。

### NUnitテストランナーを使う

既存のテストランナー（NUnitのものなど）を使う必要がある場合、
簡単なスクリプトを作成するのは非常に簡単です。

以下に、`Nunit.Runners`パッケージを使った小さな例を示します。

さて、これはF#の最も刺激的な使い方ではないかもしれませんが、F#の「オブジェクト式」構文を使って
`NUnit.Core.EventListener`インターフェースを作成することを示しているので、デモとして残しておくことにしました。

```fsharp
// 現在のディレクトリをスクリプトディレクトリと同じに設定
System.IO.Directory.SetCurrentDirectory (__SOURCE_DIRECTORY__)

// スクリプトディレクトリ下にNunit.Runnersが必要
//    nuget install NUnit.Runners -o Packages -ExcludeVersion 

#r @"Packages\NUnit.Runners\tools\lib\nunit.core.dll"
#r @"Packages\NUnit.Runners\tools\lib\nunit.core.interfaces.dll"

open System
open NUnit.Core

module Setup = 
    open System.Reflection
    open NUnit.Core
    open System.Diagnostics.Tracing

    let configureTestRunner path (runner:TestRunner) = 
        let package = TestPackage("MyPackage")
        package.Assemblies.Add(path) |> ignore
        runner.Load(package) |> ignore

    let createListener logger =

        let replaceNewline (s:string) = 
            s.Replace(Environment.NewLine, "")

        // これはF#の「オブジェクト式」構文の例です。
        // インターフェースを実装するためにクラスを作成する必要はありません
        {new NUnit.Core.EventListener
            with
        
            member this.RunStarted(name:string, testCount:int) =
                logger "Run started "

            member this.RunFinished(result:TestResult ) = 
                logger ""
                logger "-------------------------------"
                result.ResultState
                |> sprintf "Overall result: %O" 
                |> logger 

            member this.RunFinished(ex:Exception) = 
                ex.StackTrace 
                |> replaceNewline 
                |> sprintf "Exception occurred: %s" 
                |> logger 

            member this.SuiteFinished(result:TestResult) = ()
            member this.SuiteStarted(testName:TestName) = ()

            member this.TestFinished(result:TestResult)=
                result.ResultState
                |> sprintf "Result: %O" 
                |> logger 

            member this.TestOutput(testOutput:TestOutput) = 
                testOutput.Text 
                |> replaceNewline 
                |> logger 

            member this.TestStarted(testName:TestName) = 
                logger ""
            
                testName.FullName 
                |> replaceNewline 
                |> logger 

            member this.UnhandledException(ex:Exception) = 
                ex.StackTrace 
                |> replaceNewline 
                |> sprintf "Unhandled exception occurred: %s"
                |> logger 
            }


// DLL内のすべてのテストを実行
do 
    let dllPath = @".\bin\MyUnitTests.dll"

    CoreExtensions.Host.InitializeService();

    use runner = new NUnit.Core.SimpleTestRunner()
    Setup.configureTestRunner dllPath runner
    let logger = printfn "%s"
    let listener = Setup.createListener logger
    let result = runner.Run(listener, TestFilter.Empty, true, LoggingThreshold.All)

    // コマンドラインから実行している場合、ユーザー入力を待つ
    Console.ReadLine() |> ignore

    // 対話セッションから実行している場合、MyUnitTests.dllを再コンパイルする前にセッションをリセット
```

*上記のコードは[githubで入手可能](https://github.com/swlaschin/low-risk-ways-to-use-fsharp-at-work/blob/master/TestsInFsharp/nunit-test-runner.fsx)です。*

<a name="test-other"></a>

## 12. F#を使って他の方法で単体テストを書くことを学ぶ

[上記の単体テストコード](#test-nunit)は私たちにとって馴染み深いものですが、テストを書く他の方法もあります。
異なるスタイルでコーディングすることを学ぶことは、レパートリーに新しいテクニックを追加し、一般的に思考を広げる素晴らしい方法です。
そのうちのいくつかを簡単に見てみましょう。

まず最初は[FsUnit](https://github.com/fsharp/FsUnit)です。これは`Assert`をより流暢で慣用的なアプローチ（自然言語とパイピング）に置き換えます。

以下は簡単な例です：

```fsharp
open NUnit.Framework
open FsUnit

let inline add x y = x + y

[<Test>]
let ``When 2 is added to 2 expect 4``() = 
    add 2 2 |> should equal 4

[<Test>]
let ``When 2.0 is added to 2.0 expect 4.01``() = 
    add 2.0 2.0 |> should (equalWithin 0.1) 4.01

[<Test>]
let ``When ToLower(), expect lowercase letters``() = 
    "FSHARP".ToLower() |> should startWith "fs"
```

*上記のコードは[githubで入手可能](https://github.com/swlaschin/low-risk-ways-to-use-fsharp-at-work/blob/master/TestsInFsharp/TestWithFsUnit.fs)です。*
 
非常に異なるアプローチを使うのが[Unquote](https://github.com/swensensoftware/unquote)です。
Unquoteのアプローチは、任意のF#式を[F#クォーテーション](https://learn.microsoft.com/ja-jp/dotnet/fsharp/language-reference/code-quotations)でラップしてから評価することです。
テスト式が例外をスローすると、テストは失敗し、例外だけでなく、例外が発生するまでの各ステップも出力します。
この情報は、アサートが失敗した理由をより深く理解するのに役立つ可能性があります。

以下は非常に簡単な例です：
 
```fsharp
[<Test>]
let ``When 2 is added to 2 expect 4``() = 
    test <@ 2 + 2 = 4 @>
```

また、`=?`や`>?`などのショートカット演算子もあり、テストをさらに簡単に書くことができます - どこにもアサートはありません！

```fsharp
[<Test>]
let ``2 + 2 is 4``() = 
   let result = 2 + 2
   result =? 4

[<Test>]
let ``2 + 2 is bigger than 5``() = 
   let result = 2 + 2
   result >? 5
```

*上記のコードは[githubで入手可能](https://github.com/swlaschin/low-risk-ways-to-use-fsharp-at-work/blob/master/TestsInFsharp/TestWithUnquote.fs)です。*

<a name="test-fscheck"></a>

## 13. FsCheckを使ってより良い単体テストを書く

*このセクションのコードは[githubで入手可能](https://github.com/swlaschin/low-risk-ways-to-use-fsharp-at-work/blob/master/TestsInFsharp/TestWithFsCheck.fs)です。*

数字をローマ数字に変換する関数を書いたとして、そのテストケースを作成したいとします。

次のようなテストを書き始めるかもしれません：

```fsharp
[<Test>]
let ``Test that 497 is CDXCVII``() = 
    arabicToRoman 497 |> should equal "CDXCVII"
```

しかし、このアプローチの問題点は、非常に特定の例だけをテストしていることです。私たちが考えていないエッジケースがあるかもしれません。

より良いアプローチは、*すべての*ケースで真でなければならないものを見つけることです。そして、このもの（「プロパティ」）がすべてのケース、または少なくとも大きなランダムな部分集合に対して真であることをチェックするテストを作成できます。

たとえば、ローマ数字の例では、「すべてのローマ数字には最大で1つの'V'文字がある」や「すべてのローマ数字には最大で3つの'X'文字がある」というプロパティがあると言えます。そして、このプロパティが実際に真であることをチェックするテストを構築できます。

ここで[FsCheck](https://github.com/fsharp/FsCheck)が役立ちます。
FsCheckはまさにこの種のプロパティベースのテスティングのために設計されたフレームワークです。F#で書かれていますが、C#コードのテストにも同様に適しています。

では、ローマ数字にFsCheckをどのように使うか見てみましょう。

まず、すべてのローマ数字に対して成り立つと予想されるプロパティをいくつか定義します。

```fsharp
let maxRepetitionProperty ch count (input:string) = 
    let find = String.replicate (count+1) ch
    input.Contains find |> not

// すべてのローマ数字に対して成り立つプロパティ
let ``has max rep of one V`` roman = 
    maxRepetitionProperty "V" 1 roman 

// すべてのローマ数字に対して成り立つプロパティ
let ``has max rep of three Xs`` roman = 
    maxRepetitionProperty "X" 3 roman 
```

これを使って、以下のようなテストを作成します：

1. FsCheckに渡すのに適したプロパティチェッカー関数を作成します。
2. `Check.Quick`関数を使って、数百のランダムなテストケースを生成し、そのプロパティチェッカーに送ります。

```fsharp
[<Test>]
let ``Test that roman numerals have no more than one V``() = 
    let property num = 
        // 数字をローマ数字に変換し、プロパティをチェック
        arabicToRoman num |> ``has max rep of one V``

    Check.QuickThrowOnFailure (testWithRange property)

[<Test>]
let ``Test that roman numerals have no more than three Xs``() = 
    let property num = 
        // 数字をローマ数字に変換し、プロパティをチェック
        arabicToRoman num |> ``has max rep of three Xs``

    Check.QuickThrowOnFailure (testWithRange property)
```

テストの結果は以下の通りです。1つだけでなく、100個のランダムな数字がテストされているのがわかります。

```text
Test that roman numerals have no more than one V
   Ok, passed 100 tests.

Test that roman numerals have no more than three Xs
   Ok, passed 100 tests.
```

テストを「ローマ数字にはXが2つ以上ない」に変更すると、テスト結果は偽になり、以下のようになります：

```text
Falsifiable, after 33 tests 

30
```

つまり、33個の異なる入力を生成した後、FsCheckは要求されたプロパティを満たさない数（30）を正しく見つけました。非常に素晴らしいですね！

### 実践でのFsCheckの使い方

すべての状況でこの方法でテストできるプロパティがあるわけではありませんが、思っているよりも一般的かもしれません。

たとえば、プロパティベースのテストは特に「アルゴリズム的な」コードに有用です。以下にいくつかの例を示します：

* リストを反転させてから再び反転させると、元のリストが得られます。
* 整数を因数分解してから因数を掛け合わせると、元の数が得られます。

しかし、退屈なビジネスアプリケーションでも、プロパティベースのテストが役立つ場合があります。たとえば、以下のようなことをプロパティとして表現できます：

* **ラウンドトリップ**。たとえば、レコードをデータベースに保存してから再読み込みすると、レコードのフィールドは変更されていないはずです。
  同様に、何かをシリアライズしてからデシリアライズすると、元のものが戻ってくるはずです。
* **不変条件**。販売注文に商品を追加する場合、個々の明細の合計は注文合計と同じになるはずです。
  または、各ページの単語数の合計は、本全体の単語数の合計と同じになるはずです。
  より一般的には、2つの異なる経路で計算する場合、同じ答えが得られるはずです（[モノイド準同型！](../posts/monoids-part2.html#monoid-homomorphism)）
* **丸め**。レシピに材料を追加する場合、材料のパーセンテージの合計（小数点以下2桁の精度）は常に正確に100%になるはずです。
  同様のルールは、株式、税金計算などのほとんどの分割ロジックに必要です。
  （例：[DDDブックの「シェアパイ」の例](https://books.google.co.uk/books?id=xColAAPGubgC&pg=PA198&lpg=PA198&dq=%22domain+driven+design%22+%22share+pie%22&source=bl&ots=q9-HdfTK4p&sig=IUnHGFUdwQv2p0tuWVbrqqwdAk4&hl=en&sa=X&ei=IdFbU5bLK8SMOPLFgfgC#v=onepage&q=%22domain%20driven%20design%22%20%22share%20pie%22&f=false)）。
  このような状況で丸めを正しく行うことを確認するのは、FsCheckが真価を発揮する場面です。
  
他のアイデアについては、この[SOの質問](https://stackoverflow.com/questions/2446242/difficulty-thinking-of-properties-for-fscheck?rq=1)を参照してください。

FsCheckはリファクタリングにも非常に役立ちます。テストが非常に徹底的であると信頼できれば、自信を持って微調整や最適化に取り組むことができます。

FsCheckに関するその他のリンク：

* [プロパティベースのテスト入門](../posts/property-based-testing.html)と[プロパティベースのテストのプロパティ選択](../posts/property-based-testing-2.html)に関するフォローアップを書きました。
* [FsCheckのドキュメント](https://github.com/fsharp/FsCheck/blob/master/Docs/Documentation.html)。
* [実践でのFsCheckの使用に関する記事](https://brandewinder.com/2014/03/22/fscheck-and-xunit-is-the-bomb/)。
* [FsCheckに言及しているローマ数字kata](../posts/roman-numeral-kata.html)に関する私の投稿。

プロパティベースのテスト一般については、QuickCheckに関する記事やビデオを探してください。

* [John HughesによるQuickCheckの紹介](https://www.researchgate.net/publication/254051198_Specification_based_testing_with_QuickCheck)
* [QuickCheckを使ってRiakのバグを見つける](https://web.archive.org/web/20140703090110/https://skillsmatter.com/skillscasts/4505-quickchecking-riak)に関する興味深い講演（ビデオ）

<a name="test-dummy"></a>

## 14. FsCheckを使ってランダムなダミーデータを作成する

*このセクションのコードは[githubで入手可能](https://github.com/swlaschin/low-risk-ways-to-use-fsharp-at-work/blob/master/TestsInFsharp/RandomDataWithFsCheck.fs)です。*

テストに加えて、FsCheckはランダムなダミーデータの作成にも使えます。

たとえば、以下はランダムな顧客を生成する完全なコードです。

これをSQL Type Provider（後で説明）やCSVライターと組み合わせると、簡単に
データベースやCSVファイルに何千行もの顧客のランダムなデータを生成できます。
または、JSON型プロバイダーと組み合わせて、バリデーションロジックのテストや負荷テストのためにWebサービスを呼び出すこともできます。

*（コードを理解できなくても心配しないでください - このサンプルは、どれほど簡単かを示すためのものです！）*

```fsharp
// ドメインオブジェクト
type EmailAddress = EmailAddress of string
type PhoneNumber = PhoneNumber of string
type Customer = {
    name: string
    email: EmailAddress
    phone: PhoneNumber
    birthdate: DateTime
    }

// サンプリングする名前のリスト
let possibleNames = [
    "Georgianne Stephan"
    "Sharolyn Galban"
    "Beatriz Applewhite"
    "Merissa Cornwall"
    "Kenneth Abdulla"
    "Zora Feliz"
    "Janeen Strunk"
    "Oren Curlee"
    ]

// リストからランダムに選んで名前を生成
let generateName() = 
    FsCheck.Gen.elements possibleNames 

// ランダムなユーザーとドメインを組み合わせてランダムなEmailAddressを生成
let generateEmail() = 
    let userGen = FsCheck.Gen.elements ["a"; "b"; "c"; "d"; "e"; "f"]
    let domainGen = FsCheck.Gen.elements ["gmail.com"; "example.com"; "outlook.com"]
    let makeEmail u d = sprintf "%s@%s" u d |> EmailAddress
    FsCheck.Gen.map2 makeEmail userGen domainGen 

// ランダムなPhoneNumberを生成
let generatePhone() = 
    let areaGen = FsCheck.Gen.choose(100,999)
    let n1Gen = FsCheck.Gen.choose(1,999)
    let n2Gen = FsCheck.Gen.choose(1,9999)
    let makeNumber area n1 n2 = sprintf "(%03i)%03i-%04i" area n1 n2 |> PhoneNumber
    FsCheck.Gen.map3 makeNumber areaGen n1Gen n2Gen 
    
// ランダムな誕生日を生成
let generateDate() = 
    let minDate = DateTime(1920,1,1).ToOADate() |> int
    let maxDate = DateTime(2014,1,1).ToOADate() |> int
    let oaDateGen = FsCheck.Gen.choose(minDate,maxDate)
    let makeDate oaDate = float oaDate |> DateTime.FromOADate 
    FsCheck.Gen.map makeDate oaDateGen

// 顧客を作成する関数
let createCustomer name email phone birthdate =
    {name=name; email=email; phone=phone; birthdate=birthdate}

// アプリカティブを使って顧客ジェネレーターを作成
let generateCustomer = 
    createCustomer 
    <!> generateName() 
    <*> generateEmail() 
    <*> generatePhone() 
    <*> generateDate() 

[<Test>]
let printRandomCustomers() =
    let size = 0
    let count = 10
    let data = FsCheck.Gen.sample size count generateCustomer

    // 出力
    data |> List.iter (printfn "%A")
```

そして、結果のサンプルは以下の通りです：

```text
{name = "Georgianne Stephan";
 email = EmailAddress "d@outlook.com";
 phone = PhoneNumber "(420)330-2080";
 birthdate = 11/02/1976 00:00:00;}

{name = "Sharolyn Galban";
 email = EmailAddress "e@outlook.com";
 phone = PhoneNumber "(579)781-9435";
 birthdate = 01/04/2011 00:00:00;}

{name = "Janeen Strunk";
 email = EmailAddress "b@gmail.com";
 phone = PhoneNumber "(265)405-6619";
 birthdate = 21/07/1955 00:00:00;}
```


<a name="test-mock"></a>

## 15. F#を使ってモックを作成する

C#で書かれたコードのテストケースをF#で書く場合、インターフェースのモックやスタブを作成したいかもしれません。

C#では[Moq](https://github.com/Moq/moq4)や[NSubstitute](https://nsubstitute.github.io/)を使うかもしれません。
F#ではオブジェクト式を使ってインターフェースを直接作成するか、[Foqライブラリ](https://github.com/fsprojects/Foq?tab=readme-ov-file)を使うことができます。

どちらも簡単に行えて、Moqと似た方法で使えます。

以下はC#でのMoqコードです：

```csharp
// Moq メソッド
var mock = new Mock<IFoo>();
mock.Setup(foo => foo.DoSomething("ping")).Returns(true);
var instance = mock.Object;

// Moq 引数のマッチング：
mock.Setup(foo => foo.DoSomething(It.IsAny<string>())).Returns(true);

// Moq プロパティ
mock.Setup(foo => foo.Name ).Returns("bar");
```

そして以下はF#での同等のFoqコードです：

```fsharp
// Foq メソッド
let mock = 
    Mock<IFoo>()
        .Setup(fun foo -> <@ foo.DoSomething("ping") @>).Returns(true)
        .Create()

// Foq 引数のマッチング
mock.Setup(fun foo -> <@ foo.DoSomething(any()) @>).Returns(true)

// Foq プロパティ
mock.Setup(fun foo -> <@ foo.Name @>).Returns("bar")
```

F#でのモックについての詳細は以下を参照してください：

* [F# as a Unit Testing Language](http://trelford.com/blog/post/fstestlang.aspx)
* [Mocking with Foq](http://trelford.com/blog/post/Foq.aspx)
* [Testing and mocking your C# code with F#](https://brandewinder.com/2013/01/27/Testing-and-mocking-your-C-sharp-code-with-F-sharp/)

また、ネットワーク越しのSMTPなどの外部サービスをモックする必要がある場合、[mountebank](https://www.mbtest.org/)という興味深いツールがあります。
これは[F#で簡単に対話できます](https://blog.nikosbaxevanis.com/2014/04/22/mountebank-mocks-with-fsharp/)。

<a name="test-canopy"></a>

## 16. F#を使って自動化されたブラウザテストを行う

単体テストに加えて、[Selenium](https://www.selenium.dev/)や[WatiN](https://github.com/dev4s/WatiN)を使ってブラウザを操作する、
何らかの自動化されたWebテストを行うべきです。

しかし、自動化をどの言語で書くべきでしょうか？Ruby？Python？C#？答えはもうわかっていますね！

さらに簡単にするには、F#で書かれたSelenium上に構築されたWebテストフレームワーク[Canopy](https://lefthandedgoat.github.io/canopy/)を試してみてください。
彼らのサイトでは*「すぐに学べます。UIの自動化をしたことがなく、F#を知らなくても大丈夫です。」*と主張しており、私もそう信じています。

以下はCanopyサイトから抜粋したスニペットです。ご覧の通り、コードは簡単で理解しやすいです。

また、FAKEはCanopyと統合されているので、[CIビルドの一部として自動化されたブラウザテストを実行できます](https://web.archive.org/web/20170204031005/http://fsharp.github.io/FAKE/canopy.html)。

```fsharp
//firefoxブラウザのインスタンスを開始
start firefox

//これがテストの定義方法です
"taking canopy for a spin" &&& fun _ ->
    //URLに移動
    url "http://lefthandedgoat.github.io/canopy/testpages/"

    //id 'welcome'を持つ要素のテキストが
    //'Welcome'であることをアサート
    "#welcome" == "Welcome"

    //id 'firstName'を持つ要素の値が'John'であることをアサート
    "#firstName" == "John"

    //id 'firstName'を持つ要素の値を
    //'Something Else'に変更
    "#firstName" << "Something Else"

    //別の要素の値を確認し、ボタンをクリックし、
    //要素が更新されたことを確認
    "#button_clicked" == "button not clicked"
    click "#button"
    "#button_clicked" == "button clicked"

//すべてのテストを実行
run()
```


<a name="test-bdd"></a>
## 17. 振る舞い駆動開発にF#を使う

*このセクションのコードは[githubで入手可能](https://github.com/swlaschin/low-risk-ways-to-use-fsharp-at-work/blob/master/TestsInFsharp/TickSpec.StepDefinitions.fs)です。*

振る舞い駆動開発（BDD）に馴染みがない場合、アイデアは要件を人間が読めると同時に*実行可能*な方法で表現することです。

これらのテストを書くための標準フォーマット（Gherkin）はGiven/When/Then構文を使います - 以下は例です：

```text
機能: 返金または交換された商品は在庫に戻すべきである

シナリオ1: 返金された商品は在庫に戻すべきである
	Given 顧客が黒いセーターを買う
	And 私は在庫に3着の黒いセーターが残っている 
	When 彼らがセーターを返品して返金を受ける 
	Then 私は在庫に4着の黒いセーターを持っているはずである
```

.NETですでにBDDを使っているなら、おそらく[SpecFlow](https://specflow.org/)か同様のものを使っているでしょう。

代わりに[TickSpec](https://github.com/fsprojects/TickSpec)の使用を検討すべきです。
なぜなら、F#のすべてのものと同様に、構文がはるかに軽量だからです。

たとえば、以下は上記のシナリオの完全な実装です。

```fsharp
type StockItem = { Count : int }

let mutable stockItem = { Count = 0 }

let [<Given>] ``顧客が黒いセーターを買う`` () = 
    ()
      
let [<Given>] ``私は在庫に (.*)着の黒いセーターが残っている`` (n:int) =  
    stockItem <- { stockItem with Count = n }
      
let [<When>] ``彼らがセーターを返品して返金を受ける`` () =  
    stockItem <- { stockItem with Count = stockItem.Count + 1 }
      
let [<Then>] ``私は在庫に (.*)着の黒いセーターを持っているはずである`` (n:int) =     
    let passed = (stockItem.Count = n)
    Assert.True(passed)
```
 
C#の同等のコードはより冗長で、二重バッククォート構文がないことが本当に不利です：

```csharp
[Given(@"顧客が黒いセーターを買う")]
public void GivenACustomerBuysABlackJumper()
{
   // コード
}

[Given(@"私は在庫に (.*)着の黒いセーターが残っている")]
public void GivenIHaveNBlackJumpersLeftInStock(int n)
{
   // コード
}
```

*例は[TickSpec](https://github.com/fsprojects/TickSpec)サイトから取られています。*

## F#でのテストのまとめ ##

もちろん、これまで見てきたすべてのテスト技術を組み合わせることができます（[このスライドデッキが示すように](https://www.slideshare.net/slideshow/testing-cinfdublinaltnet2013/27590095)）：

* 単体テスト（FsUnit、Unquote）とプロパティベースのテスト（FsCheck）。
* BDD（TickSpec）で書かれた自動化された受け入れテスト（または少なくともスモークテスト）をブラウザ自動化（Canopy）で駆動。
* 両方のタイプのテストを毎ビルド時に実行（FAKEで）。

テスト自動化に関する多くのアドバイスがあり、他の言語からの概念をこれらのF#ツールに簡単に移植できることがわかるでしょう。楽しんでください！



