---
layout: post
title: "開発と DevOps スクリプトに F# を使う"
description: "仕事で F# を使う 26 の低リスクな方法（パート2）"
categories: []
seriesId: "仕事で F# を使う 26 の低リスクな方法"
seriesOrder: 2

---

この投稿は、[仕事で F#を低リスクで使う方法](../posts/low-risk-ways-to-use-fsharp-at-work.md)のシリーズの続きです。
ミッションクリティカルなコードに影響を与えることなく、低リスクで段階的にF#を実践できる方法をいくつか提案してきました。

今回は、ビルドやその他の開発・DevOpsスクリプトにF#を使う方法について説明します。

F#が初めての方は、前回の投稿の[はじめに](../posts/low-risk-ways-to-use-fsharp-at-work.md#getting-started)と
[NuGetの使用](../posts/low-risk-ways-to-use-fsharp-at-work.md#working-with-nuget)のセクションを読むとよいでしょう。

## シリーズの内容

26の方法へのショートカットリストは以下の通りです：

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
<a href="/posts/low-risk-ways-to-use-fsharp-at-work-3.html#test-runner">11. F#を使ってプログラムで単体テストを実行する</a><br />
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

## パート2: 開発とDevOpsスクリプトにF#を使う

次の提案は、開発活動に関連するさまざまなスクリプト（ビルド、継続的インテグレーション、デプロイメントなど）にF#を使うことに関するものです。

このような小規模なタスクには、REPLを備えた優れたスクリプト言語が必要です。
PowerShellや[ScriptCS](https://scriptcs.net/)、あるいはPythonを使うこともできますが、F#を試してみてはいかがでしょうか？

* F#はPythonのように軽量です（型宣言がほとんどまたは全くありません）。
* F#は.NETライブラリ（コアライブラリとNuGetでダウンロードしたライブラリの両方）にアクセスできます。
* F#には型プロバイダー（PowerShellやScriptCSに対する大きな利点）があり、幅広いデータソースに簡単にアクセスできます。
* これらすべてが簡潔で型安全な方法で、インテリセンスも利用できます！

このようにF#を使うことで、あなたとあなたの同僚の開発者は、F#コードを使って実践的な問題を解決することができます。
このような低リスクなアプローチに対して、マネージャーからの抵抗はないはずです - 最悪の場合でも、別のツールに簡単に切り替えることができます。

もちろん、隠れた目的として、同僚の開発者がF#を使う機会を得れば、彼らはF#にはまり、
[F#をエンドツーエンドで使う](http://www.colinbull.net/2013/02/23/FSharp-end-to-end/)一歩近づくことができるでしょう！

### F#スクリプトで何ができますか？

次のいくつかのセクションでは、F#スクリプトの3つの例を見ていきます：

* <a href="#dev-website-responding">Webサイトの応答をチェックするF#スクリプト</a><br />
* <a href="#dev-rss-to-csv">RSSフィードをCSVに変換するF#スクリプト</a><br />
* <a href="#dev-wmi-stats">WMIを使ってプロセスの統計をチェックするF#スクリプト</a><br />

しかし、もちろん、F#スクリプトはほとんどすべての.NETライブラリと統合できます。以下は、スクリプト化できるその他のユーティリティの提案です：

* 簡単なファイルコピー、ディレクトリ走査、アーカイブ（例：ログファイルの）。
  .NET 4.5を使っている場合は、新しい[System.IO.Compression.ZipArchive](https://learn.microsoft.com/ja-jp/dotnet/api/system.io.compression.zipfileextensions.createentryfromfile)
  クラスを使って、サードパーティのライブラリを必要とせずにZIP圧縮と解凍を行うことができます。
* JSONを扱う作業。既知の形式
  （[JSON Type Provider](https://fsprojects.github.io/FSharp.Data/library/JsonProvider.html)を使用）
  または未知の形式（[JSONパーサー](https://fsprojects.github.io/FSharp.Data/library/JsonValue.html)を使用）。
* [Octokit](https://www.nuget.org/packages/Octokit/)を使ってGitHubと対話する。
* Excelからデータを抽出したり、Excelのデータを操作したりする。F#はOffice自動化用のCOMをサポートしています。または、型プロバイダーやライブラリを使うこともできます。
* [Math.NET](https://numerics.mathdotnet.com/)を使って数値計算を行う。
* Webクローリング、リンクチェック、スクリーンスクレイピング。組み込みの非同期ワークフローとエージェントにより、この種の「マルチスレッド」コードを非常に簡単に書くことができます。
* [Quartz.NET](https://www.quartz-scheduler.net/)を使ってスケジューリングを行う。

これらの提案があなたの興味を刺激し、F#をもっと使いたいと思ったら、[F#コミュニティプロジェクト](https://fsharp.org/community/projects/)のページをチェックしてください。
F#用に書かれている有用なライブラリの優れた情報源であり、そのほとんどがF#スクリプティングでうまく機能します。

### F#スクリプトのデバッグ

F#スクリプトを使う大きな利点は、プロジェクト全体を作成したり、Visual Studioを起動したりする必要がないことです。

しかし、Visual Studioを使っていない場合にスクリプトをデバッグする必要がある場合、どうすればよいでしょうか？以下にいくつかのヒントを示します：

* まず、`printfn`を使ってコンソールに出力する従来の方法を使えます。
  通常、これを簡単な`log`関数でラップし、フラグでログ出力のオン/オフを切り替えられるようにします。
* [FsEye](https://github.com/swensensoftware/fseye)ツールを使って、対話セッションで変数を検査し、監視できます。
* 最後に、Visual Studioのデバッガーを使うこともできます。コツは、[デバッガーをアタッチする](https://stackoverflow.com/questions/9336353/can-i-run-fsx-files-from-within-visual-studio-without-setting-up-a-project/9337016#9337016)ことです。
  fsi.exeプロセスに対して行い、その後[`Debugger.Break`](https://learn.microsoft.com/ja-jp/dotnet/api/system.diagnostics.debugger.break)
  を使って特定のポイントで停止できます。

<a name="fake"></a>

## 5. ビルドとCIスクリプトにFAKEを使う

*このセクションのコードは[githubで入手可能](https://github.com/swlaschin/low-risk-ways-to-use-fsharp-at-work/blob/master/fake.fsx)です。*

まずは[FAKE](https://fake.build/)から始めましょう。FAKEはF#で書かれたクロスプラットフォームのビルド自動化ツールで、Rubyの[Rake](https://ruby.github.io/rake/)に相当するものです。

FAKEには、git、NuGet、単体テスト、Octopus Deploy、Xamarinなどの組み込みサポートがあり、依存関係のある複雑なスクリプトを簡単に開発できます。

[TFSでXAMLの使用を避ける](http://blog.ctaggart.com/2014/01/code-your-tfs-builds-in-f-instead-of.html)ためにも使えます。

FAKEをRakeのようなものではなく使う理由の1つは、ツールチェーン全体で.NETコードを標準化できることです。
理論的には[NAnt](https://en.wikipedia.org/wiki/NAnt)を代わりに使えますが、実際には、XMLのためにお勧めしません。
[PSake](https://github.com/psake/psake)も可能性はありますが、FAKEよりも複雑だと思います。

また、FAKEを使って特定のビルドサーバーへの依存を取り除くこともできます。たとえば、TeamCityの統合を使ってテストやその他のタスクを実行する代わりに、
[FAKEで実行する](https://www.jamescrowley.net/2014/04/22/code-coverage-using-dotcover-and-f-make/)ことを検討できます。これにより、TeamCityをインストールせずに完全なビルドを実行できます。

以下は、非常に簡単なFAKEスクリプトの例で、[FAKEサイトのより詳細な例](https://v5.fake.build/fake-gettingstarted.html)から取られています。

```fsharp
// Include Fake lib
// Assumes NuGet has been used to fetch the FAKE libraries
#r "packages/FAKE/tools/FakeLib.dll"
open Fake

// Properties
let buildDir = "./build/"

// Targets
Target "Clean" (fun _ ->
    CleanDir buildDir
)

Target "Default" (fun _ ->
    trace "Hello World from FAKE"
)

// Dependencies
"Clean"
  ==> "Default"

// start build
RunTargetOrDefault "Default"
```

構文に慣れるまで少し時間がかかりますが、その努力は十分に価値があります。

FAKEに関する補足文献：

* [FAKEへの移行](https://bugsquash.blogspot.com/2010/11/migrating-to-fake.html)
* [HanselmanのFAKEについて](https://www.hanselman.com/blog/exploring-fake-an-f-build-system-for-all-of-net)。多くのコメントは実際にFAKEを使っている人々からのものです。
* [NAntユーザーがFAKEを試す](https://putridparrot.com/blog/trying-fake-out/)

<a name="dev-website-responding"></a>

## 6. Webサイトの応答をチェックするF#スクリプト

*このセクションのコードは[githubで入手可能](https://github.com/swlaschin/low-risk-ways-to-use-fsharp-at-work/blob/master/dev-website-responding.fsx)です。*

このスクリプトは、Webサイトが200で応答しているかをチェックします。
これは、たとえばデプロイメント後のスモークテストの基礎として役立つかもしれません。

```fsharp
// Requires FSharp.Data under script directory 
//    nuget install FSharp.Data -o Packages -ExcludeVersion  
#r @"Packages\FSharp.Data\lib\net40\FSharp.Data.dll"
open FSharp.Data

let queryServer uri queryParams = 
    try
        let response = Http.Request(uri, query=queryParams, silentHttpErrors = true)
        Some response 
    with
    | :? System.Net.WebException as ex -> None

let sendAlert uri message = 
    // send alert via email, say
    printfn "Error for %s. Message=%O" uri message

let checkServer (uri,queryParams) = 
    match queryServer uri queryParams with
    | Some response -> 
        printfn "Response for %s is %O" uri response.StatusCode 
        if (response.StatusCode <> 200) then
            sendAlert uri response.StatusCode 
    | None -> 
        sendAlert uri "No response"

// test the sites    
let google = "https://google.com", ["q","fsharp"]
let bad = "https://example.bad", []

[google;bad]
|> List.iter checkServer 
```

結果は次のようになります：

```text
Response for https://google.com is 200
Error for https://example.bad. Message=No response
```

ここでは`Fsharp.Data`のHttp utilitiesコードを使っていますが、これは`HttpClient`の便利なラッパーを提供しています。
[HttpUtilitiesの詳細はこちら](https://fsprojects.github.io/FSharp.Data/library/Http.html)。

<a name="dev-rss-to-csv"></a>

## 7. RSSフィードをCSVに変換するF#スクリプト

*このセクションのコードは[githubで入手可能](https://github.com/swlaschin/low-risk-ways-to-use-fsharp-at-work/blob/master/dev-rss-to-csv.fsx)です。*

これは、Xml型プロバイダーを使ってRSSフィード（この場合は[StackOverflowのF#質問](https://stackoverflow.com/questions/tagged/f%23?sort=newest&pageSize=10)）を解析し、
後で分析するためにCSVファイルに変換する小さなスクリプトです。
 
RSS解析コードはたった1行であることに注目してください！コードの大部分はCSVの書き込みに関するものです。
もちろん、CSVライブラリを使うこともできました（NuGetにはたくさんあります）が、どれほど簡単かを示すためにそのままにしておきました。
 
```fsharp
// sets the current directory to be same as the script directory
System.IO.Directory.SetCurrentDirectory (__SOURCE_DIRECTORY__)

// Requires FSharp.Data under script directory 
//    nuget install FSharp.Data -o Packages -ExcludeVersion 
#r @"Packages\FSharp.Data\lib\net40\FSharp.Data.dll"
#r "System.Xml.Linq.dll"
open FSharp.Data

type Rss = XmlProvider<"https://stackoverflow.com/feeds/tag/f%23">

// prepare a string for writing to CSV            
let prepareStr obj =
    obj.ToString()
     .Replace("\"","\"\"") // replace single with double quotes
     |> sprintf "\"%s\""   // surround with quotes

// convert a list of strings to a CSV
let listToCsv list =
    let combine s1 s2 = s1 + "," + s2
    list 
    |> Seq.map prepareStr 
    |> Seq.reduce combine 

// extract fields from Entry
let extractFields (entry:Rss.Entry) = 
    [entry.Title.Value; 
     entry.Author.Name; 
     entry.Published.ToShortDateString()]

// write the lines to a file
do 
    use writer = new System.IO.StreamWriter("fsharp-questions.csv")
    let feed = Rss.GetSample()
    feed.Entries
    |> Seq.map (extractFields >> listToCsv)
    |> Seq.iter writer.WriteLine
    // writer will be closed automatically at the end of this scope
```
    
型プロバイダーが、フィードの実際の内容に基づいて利用可能なプロパティを示すインテリセンス（以下に示す）を生成することに注目してください。これはとてもクールです。

![](../assets/img/fsharp-xml-dropdown.png)    

結果は以下のようになります：

```text
"Optimising F# answer for Euler #4","DropTheTable","18/04/2014"
"How to execute a function, that creates a lot of objects, in parallel?","Lawrence Woodman","01/04/2014"
"How to invoke a user defined function using R Type Provider","Dave","19/04/2014"
"Two types that use themselves","trn","19/04/2014"
"How does function [x] -> ... work","egerhard","19/04/2014"
```

XML型プロバイダーの詳細については、[FSharp.Dataのページ](https://fsprojects.github.io/FSharp.Data/library/XmlProvider.html)を参照してください。
    
<a name="dev-wmi-stats"></a>
    
## 8. WMIを使ってプロセスの統計をチェックするF#スクリプト

*このセクションのコードは[githubで入手可能](https://github.com/swlaschin/low-risk-ways-to-use-fsharp-at-work/blob/master/dev-wmi-stats.fsx)です。*

Windowsを使っている場合、WMIにアクセスできることは非常に便利です。
幸いなことに、WMI用のF#型プロバイダーがあり、使いやすくなっています。

この例では、システム時間を取得し、プロセスのいくつかの統計もチェックします。
これは、たとえば負荷テスト中や後に役立つかもしれません。

```fsharp
// sets the current directory to be same as the script directory
System.IO.Directory.SetCurrentDirectory (__SOURCE_DIRECTORY__)

// Requires FSharp.Management under script directory 
//    nuget install FSharp.Management -o Packages -ExcludeVersion 
#r @"System.Management.dll"
#r @"Packages\FSharp.Management\lib\net40\FSharp.Management.dll"
#r @"Packages\FSharp.Management\lib\net40\FSharp.Management.WMI.dll"

open FSharp.Management

// get data for the local machine
type Local = WmiProvider<"localhost">
let data = Local.GetDataContext()

// get the time and timezone on the machine
let time = data.Win32_UTCTime |> Seq.head
let tz = data.Win32_TimeZone |> Seq.head
printfn "Time=%O-%O-%O %O:%O:%O" time.Year time.Month time.Day time.Hour time.Minute time.Second 
printfn "Timezone=%O" tz.StandardName 

// find the "explorer" process
let explorerProc = 
    data.Win32_PerfFormattedData_PerfProc_Process
    |> Seq.find (fun proc -> proc.Name.Contains("explorer") )

// get stats about it
printfn "ElapsedTime=%O" explorerProc.ElapsedTime
printfn "ThreadCount=%O" explorerProc.ThreadCount
printfn "HandleCount=%O" explorerProc.HandleCount
printfn "WorkingSetPeak=%O" explorerProc.WorkingSetPeak
printfn "PageFileBytesPeak=%O" explorerProc.PageFileBytesPeak
```

出力は以下のようになります：

```text
Time=2014-4-20 14:2:35
Timezone=GMT Standard Time
ElapsedTime=2761906
ThreadCount=67
HandleCount=3700
WorkingSetPeak=168607744
PageFileBytesPeak=312565760
```

ここでも、型プロバイダーを使うことでインテリセンス（以下に示す）が得られます。何百ものWMIオプションに対して非常に便利です。

![](../assets/img/fsharp-wmi-dropdown.png)

[WMI型プロバイダーの詳細はこちら](https://fsprojects.github.io/FSharp.Management/WMIProvider.html)。


<a name="dev-cloud"></a>

## 9. クラウドの設定と管理にF#を使う

特に言及に値する領域の1つは、クラウドサービスの設定と管理にF#を使うことです。
fsharp.orgの[クラウドページ](https://fsharp.org/guides/cloud/)には多くの役立つリンクがあります。

簡単なスクリプティングには、[Fog](https://dmohl.github.io/Fog/)がAzure用の素晴らしいラッパーです。

たとえば、blobをアップロードするコードは以下のように簡単です：

```fsharp
UploadBlob "testcontainer" "testblob" "This is a test" |> ignore
```

またはメッセージを追加して受信する場合：

```fsharp
AddMessage "testqueue" "This is a test message" |> ignore

let result = GetMessages "testqueue" 20 5
for m in result do
    DeleteMessage "testqueue" m
```

これにF#を使う特に素晴らしい点は、マイクロスクリプトで行えることです - 重いツールは必要ありません。

   
## まとめ
   
これらの提案が役立つと思っていただけたら幸いです。実際に適用してみた場合は、コメントで教えてください。

次は：テストにF#を使うことについてです。
