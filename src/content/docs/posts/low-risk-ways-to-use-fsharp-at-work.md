---
layout: post
title: "仕事で F# を使う 26 の低リスクな方法"
description: "今すぐ始められます - 許可は必要ありません"
categories: []
seriesId: "仕事で F# を使う 26 の低リスクな方法"
seriesOrder: 1

---

関数型プログラミングにすっかり夢中になり、空き時間にF#を学び、その素晴らしさを同僚に熱弁して迷惑がられ、仕事で本格的に使いたくてうずうずしている...

そんなあなたが、突然壁にぶつかります。

職場には「C#のみ」というポリシーがあり、F#の使用が認められないのです。

典型的な企業環境で働いているなら、新しい言語の承認を得るのは長い道のりになるでしょう。
チームメイト、QA担当者、運用担当者、上司、上司の上司、そして[廊下の奥にいる謎の人物](https://www.joelonsoftware.com/2001/04/21/dont-let-architecture-astronauts-scare-you/)（今まで話したことのない人）を説得する必要があります。
その過程を始めることをお勧めします（[マネージャーに役立つリンク](https://fpbridge.co.uk/why-fsharp.html)）が、それでもあなたは焦れて「今すぐに何ができるだろう？」と考えているはずです。

一方で、柔軟で自由な職場環境で、好きなことができる立場にいるかもしれません。

しかし、あなたは良心的なので、ミッションクリティカルなシステムをAPLで書き直して姿を消し、後任に頭の痛む暗号のようなコードを残していく、そんな人になりたくはありません。
決して、チームの[バス係数](https://en.wikipedia.org/wiki/Bus_factor)に影響を与えるようなことはしたくないのです。

つまり、これらのシナリオでは、仕事でF#を使いたいけれど、コアとなるアプリケーションコードには使えない（または使いたくない）という状況です。

何ができるでしょうか？

心配いりません！この連載では、重要なコードに影響を与えることなく、低リスクで段階的にF#を実践できる方法をいくつか提案します。

## シリーズの内容

26の方法のリストを以下に示します。特に興味のあるものに直接アクセスできます。

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

<a name="getting-started"></a>
## はじめに

Visual Studioを使っている場合、F#はすでにインストールされているので、すぐに始められます！誰かの許可を得る必要はありません。

MacまたはLinuxを使っている場合は、残念ながら少し作業が必要です（[Mac](https://fsharp.org/use/mac/)と[Linux](https://fsharp.org/use/linux/)の手順）。

F#を対話的に使う方法は2つあります：(1) F#対話ウィンドウに直接入力する、または (2) F#スクリプトファイル（.FSX）を作成し、コードスニペットを評価する。

Visual StudioでF#対話ウィンドウを使うには：

1. `メニュー > 表示 > その他のウィンドウ > F# インタラクティブ` でウィンドウを表示します。
2. 式を入力し、二重セミコロン（`;;`）を使って入力が終わったことをインタープリターに伝えます。

たとえば：

```fsharp
let x = 1
let y = 2
x + y;;
```

個人的には、スクリプトファイルを作成する方法（`ファイル > 新規作成 > ファイル`を選択し、"F#スクリプト"を選択）を好みます。自動補完とインテリセンスが利用できるからです。

![](../assets/img/fsharp-script-intellisense.jpg)

コードの一部を実行するには、選択してマウス右クリックするか、単に`Alt+Enter`を押します。

![](../assets/img/fsharp-script-evaluate.png)

<a name="working-with-nuget"></a>
## 外部ライブラリとNuGetの使用

ほとんどのコードサンプルは、スクリプトディレクトリ下にあることが想定される外部ライブラリを参照しています。

これらのDLLを明示的にダウンロードまたはコンパイルすることもできますが、コマンドラインからNuGetを使う方が簡単だと思います。

1. まず、Chocolately（[chocolatey.org](https://chocolatey.org/)から）をインストールする必要があります。
2. 次に、`cinst nuget.commandline`を使ってNuGetコマンドラインをインストールします。
3. 最後に、スクリプトディレクトリに移動し、コマンドラインからNuGetパッケージをインストールします。
   例：`nuget install FSharp.Data -o Packages -ExcludeVersion`
   ご覧の通り、スクリプトから使う際にNuGetパッケージのバージョンを除外することを好みます。これにより、後で更新しても既存のコードが壊れません。

----------
   
## パート1：F#を使って対話的に探索し開発する

F#が価値を発揮する最初の領域は、.NETライブラリを対話的に探索するツールとしてです。

以前は、これを行うために単体テストを作成し、デバッガーでステップ実行して何が起こっているかを理解する必要があったかもしれません。
しかし、F#を使えば、そうする必要はありません。コードを直接実行できます。

いくつかの例を見てみましょう。

<a name="explore-net-interactively"></a>

## 1. F#を使って.NETフレームワークを対話的に探索する

*このセクションのコードは[githubで入手可能](https://github.com/swlaschin/low-risk-ways-to-use-fsharp-at-work/blob/master/explore-net-interactively.fsx)です。*

コーディングをしていると、.NETライブラリの動作について小さな疑問がよく生じます。

たとえば、最近私が遭遇し、F#を対話的に使って答えた質問をいくつか紹介します：

* カスタムのDateTime形式文字列は正しいですか？
* XMLシリアル化はローカルのDateTimeとUTCのDateTimeをどのように扱いますか？
* `GetEnvironmentVariable`は大文字小文字を区別しますか？

これらの質問はもちろんMicrosoft Learnのドキュメントで見つけることができますが、以下に示す簡単なF#スニペットを実行することで数秒で答えることもできます。

### カスタムのDateTime形式文字列は正しいですか？

カスタム形式で24時間表記を使いたいと思います。"h"であることは知っていますが、大文字の"H"か小文字の"h"のどちらでしょうか？

```fsharp
open System
DateTime.Now.ToString("yyyy-MM-dd hh:mm")  // "2014-04-18 01:08"
DateTime.Now.ToString("yyyy-MM-dd HH:mm")  // "2014-04-18 13:09"
```

### XMLシリアル化はローカルのDateTimeとUTCのDateTimeをどのように扱いますか？

日付に関して、XMLシリアル化はどのように機能するのでしょうか？確認してみましょう！

```fsharp
// ヒント: 現在のディレクトリをスクリプトディレクトリと同じに設定します
System.IO.Directory.SetCurrentDirectory (__SOURCE_DIRECTORY__)

open System

[<CLIMutable>] 
type DateSerTest = {Local:DateTime;Utc:DateTime}

let ser = new System.Xml.Serialization.XmlSerializer(typeof<DateSerTest>)

let testSerialization (dt:DateSerTest) = 
    let filename = "serialization.xml"
    use fs = new IO.FileStream(filename , IO.FileMode.Create)
    ser.Serialize(fs, o=dt)
    fs.Close()
    IO.File.ReadAllText(filename) |> printfn "%s"

let d = { 
    Local = DateTime.SpecifyKind(new DateTime(2014,7,4), DateTimeKind.Local)
    Utc = DateTime.SpecifyKind(new DateTime(2014,7,4), DateTimeKind.Utc)
    }

testSerialization d
```

出力は以下の通りです：

```text
<DateSerTest xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema">
  <Local>2014-07-04T00:00:00+01:00</Local>
  <Utc>2014-07-04T00:00:00Z</Utc>
</DateSerTest>
```

このように、UTC時間には"Z"が使われていることがわかります。

### GetEnvironmentVariableは大文字小文字を区別しますか？

これは簡単なスニペットで答えることができます：

```fsharp
Environment.GetEnvironmentVariable "ProgramFiles" = 
    Environment.GetEnvironmentVariable "PROGRAMFILES"
// 答え => true 
```

したがって、答えは「大文字小文字を区別しない」です。

<a name="explore-own-code-interactively"></a>

## 2. F#を使って自分のコードを対話的にテストする

*このセクションのコードは[githubで入手可能](https://github.com/swlaschin/low-risk-ways-to-use-fsharp-at-work/blob/master/explore-own-code-interactively.fsx)です。*

もちろん、.NETライブラリだけでなく、自分のコードをテストすることもできます。時には自分のコードをテストするのが非常に役立つことがあります。

これを行うには、以下に示すようにDLLを参照し、名前空間をオープンするだけです。

```fsharp

// 現在のディレクトリをスクリプトディレクトリと同じに設定
System.IO.Directory.SetCurrentDirectory (__SOURCE_DIRECTORY__)

// DLLへの相対パスを渡す
#r @"bin\debug\myapp.dll"

// 名前空間をオープンする
open MyApp

// 何かを実行
MyApp.DoSomething()
```

警告：古いバージョンのF#では、DLLへの参照を開くとロックされてコンパイルできなくなります！その場合、再コンパイル前に対話セッションをリセットしてロックを解除してください。
新しいバージョンのF#では、[DLLはシャドウコピーされる](https://visualfsharp.codeplex.com/SourceControl/changeset/4c10b32c4f417701f4e6c3284b0a8dadab5a9b98)ため、ロックはありません。

<a name="explore-webservices-interactively"></a>

## 3. F#を使ってWebサービスを対話的に操作する

*このセクションのコードは[githubで入手可能](https://github.com/swlaschin/low-risk-ways-to-use-fsharp-at-work/blob/master/explore-webservices-interactively.fsx)です。*

WebAPIとOwinライブラリを使いたい場合、実行可能ファイルを作成する必要はありません - スクリプトだけで実行できます！

これを動作させるには、いくつかのライブラリDLLが必要なので、少しセットアップが必要です。

NuGetコマンドラインのセットアップが完了していると仮定して（上記参照）、スクリプトディレクトリに移動し、以下のコマンドでセルフホスティングライブラリをインストールします。
`nuget install Microsoft.AspNet.WebApi.OwinSelfHost -o Packages -ExcludeVersion`

これらのライブラリが配置されたら、以下のコードを簡単なWebAPIアプリのスケルトンとして使用できます。

```fsharp
// 現在のディレクトリをスクリプトディレクトリと同じに設定
System.IO.Directory.SetCurrentDirectory (__SOURCE_DIRECTORY__)

// nuget install Microsoft.AspNet.WebApi.OwinSelfHostが実行されていることを前提とし、
// アセンブリが現在のディレクトリの下で利用可能
#r @"Packages\Owin\lib\net40\Owin.dll"
#r @"Packages\Microsoft.Owin\lib\net40\Microsoft.Owin.dll"
#r @"Packages\Microsoft.Owin.Host.HttpListener\lib\net40\Microsoft.Owin.Host.HttpListener.dll"
#r @"Packages\Microsoft.Owin.Hosting\lib\net40\Microsoft.Owin.Hosting.dll"
#r @"Packages\Microsoft.AspNet.WebApi.Owin\lib\net45\System.Web.Http.Owin.dll"
#r @"Packages\Microsoft.AspNet.WebApi.Core\lib\net45\System.Web.Http.dll"
#r @"Packages\Microsoft.AspNet.WebApi.Client\lib\net45\System.Net.Http.Formatting.dll"
#r @"Packages\Newtonsoft.Json\lib\net40\Newtonsoft.Json.dll"
#r "System.Net.Http.dll"

open System
open Owin 
open Microsoft.Owin
open System.Web.Http 
open System.Web.Http.Dispatcher
open System.Net.Http.Formatting

module OwinSelfhostSample =

    /// 返すレコード
    [<CLIMutable>]
    type Greeting = { Text : string }

    /// 簡単なコントローラー
    type GreetingController() =
        inherit ApiController()

        // GET api/greeting
        member this.Get()  =
            {Text="Hello!"}

    /// URIをパースする別のコントローラー
    type ValuesController() =
        inherit ApiController()

        // GET api/values 
        member this.Get()  =
            ["value1";"value2"]

        // GET api/values/5 
        member this.Get id = 
            sprintf "id is %i" id 

        // POST api/values 
        member this.Post ([<FromBody>]value:string) = 
            ()

        // PUT api/values/5 
        member this.Put(id:int, [<FromBody>]value:string) =
            ()
        
        // DELETE api/values/5 
        member this.Delete(id:int) =
            () 

    /// ルートなどを保存するヘルパークラス
    type ApiRoute = { id : RouteParameter }

    /// 重要: 対話的に実行する場合、コントローラーが見つからずエラーが発生します:
    /// "No type was found that matches the controller named 'XXX'."
    /// 解決策は、現在のアセンブリを使うようにControllerResolverをオーバーライドすることです
    type ControllerResolver() =
        inherit DefaultHttpControllerTypeResolver()

        override this.GetControllerTypes (assembliesResolver:IAssembliesResolver) = 
            let t = typeof<System.Web.Http.Controllers.IHttpController>
            System.Reflection.Assembly.GetExecutingAssembly().GetTypes()
            |> Array.filter t.IsAssignableFrom
            :> Collections.Generic.ICollection<Type>    

    /// 設定を管理するクラス
    type MyHttpConfiguration() as this =
        inherit HttpConfiguration()

        let configureRoutes() = 
            this.Routes.MapHttpRoute(
                name= "DefaultApi",
                routeTemplate= "api/{controller}/{id}",
                defaults= { id = RouteParameter.Optional }
                ) |> ignore
 
        let configureJsonSerialization() = 
            let jsonSettings = this.Formatters.JsonFormatter.SerializerSettings
            jsonSettings.Formatting <- Newtonsoft.Json.Formatting.Indented
            jsonSettings.ContractResolver <- 
                Newtonsoft.Json.Serialization.CamelCasePropertyNamesContractResolver()

        // ここでコントローラーが解決されます
        let configureServices() = 
            this.Services.Replace(
                typeof<IHttpControllerTypeResolver>, 
                new ControllerResolver())

        do configureRoutes()
        do configureJsonSerialization()
        do configureServices()

    /// 設定を使ってスタートアップクラスを作成    
    type Startup() = 

        // このコードはWeb APIを設定します。Startupクラスは
        // WebApp.Startメソッドの型パラメーターとして指定されます。
        member this.Configuration (appBuilder:IAppBuilder) = 
            // セルフホスト用にWeb APIを設定 
            let config = new MyHttpConfiguration() 
            appBuilder.UseWebApi(config) |> ignore
    

// OWINホストを開始 
do 
    // サーバーを作成
    let baseAddress = "http://localhost:9000/" 
    use app = Microsoft.Owin.Hosting.WebApp.Start<OwinSelfhostSample.Startup>(url=baseAddress) 

    // クライアントを作成し、APIにいくつかのリクエストを行う
    use client = new System.Net.Http.HttpClient() 

    let showResponse query = 
        let response = client.GetAsync(baseAddress + query).Result 
        Console.WriteLine(response) 
        Console.WriteLine(response.Content.ReadAsStringAsync().Result) 

    showResponse "api/greeting"
    showResponse "api/values"
    showResponse "api/values/42"

    // スタンドアロンスクリプトの場合、ブラウザでもテストできるように一時停止
    Console.ReadLine() |> ignore

```

出力は以下の通りです：

```text
StatusCode: 200, ReasonPhrase: 'OK', Version: 1.1, Content: System.Net.Http.StreamContent, Headers:
{
  Date: Fri, 18 Apr 2014 22:29:04 GMT
  Server: Microsoft-HTTPAPI/2.0
  Content-Length: 24
  Content-Type: application/json; charset=utf-8
}
{
  "text": "Hello!"
}
StatusCode: 200, ReasonPhrase: 'OK', Version: 1.1, Content: System.Net.Http.StreamContent, Headers:
{
  Date: Fri, 18 Apr 2014 22:29:04 GMT
  Server: Microsoft-HTTPAPI/2.0
  Content-Length: 29
  Content-Type: application/json; charset=utf-8
}
[
  "value1",
  "value2"
]
StatusCode: 200, ReasonPhrase: 'OK', Version: 1.1, Content: System.Net.Http.StreamContent, Headers:
{
  Date: Fri, 18 Apr 2014 22:29:04 GMT
  Server: Microsoft-HTTPAPI/2.0
  Content-Length: 10
  Content-Type: application/json; charset=utf-8
}
"id is 42"
```

この例は、OWINとWebApiライブラリを「そのまま」使えることを示すためのものです。

F#にさらにフレンドリーなWebフレームワークについては、[Suave](https://suave.io/)や[WebSharper](https://www.websharper.com)をご覧ください。
[fsharp.orgにはさらに多くのWeb関連の情報](https://fsharp.org/guides/web/)があります。

<a name="explore-winforms-interactively"></a>

## 4. F#を使ってUIを対話的に操作する

*このセクションのコードは[githubで入手可能](https://github.com/swlaschin/low-risk-ways-to-use-fsharp-at-work/blob/master/explore-winforms-interactively.fsx)です。*

F#インタラクティブのもう一つの使用法は、UIを実行中に - ライブで - 操作することです！

以下は、WinFormsの画面を対話的に開発する例です。

```fsharp
open System.Windows.Forms 
open System.Drawing

let form = new Form(Width= 400, Height = 300, Visible = true, Text = "Hello World") 
form.TopMost <- true
form.Click.Add (fun _ -> 
    form.Text <- sprintf "form clicked at %i" DateTime.Now.Ticks)
form.Show()
```

ウィンドウは以下のようになります：

![](../assets/img/fsharp-interactive-ui1.png)

クリック後、タイトルバーが変更されたウィンドウは以下のようになります：

![](../assets/img/fsharp-interactive-ui2.png)

次に、FlowLayoutPanelとボタンを追加しましょう。

```fsharp
let panel = new FlowLayoutPanel()
form.Controls.Add(panel)
panel.Dock = DockStyle.Fill 
panel.WrapContents <- false 

let greenButton = new Button()
greenButton.Text <- "Make the background color green" 
greenButton.Click.Add (fun _-> form.BackColor <- Color.LightGreen)
panel.Controls.Add(greenButton) 
```

現在のウィンドウは以下のようになります：

![](../assets/img/fsharp-interactive-ui3.png)

しかし、ボタンが小さすぎます ―― `AutoSize`をtrueに設定する必要があります。

```fsharp
greenButton.AutoSize <- true
```

これでよくなりました！

![](../assets/img/fsharp-interactive-ui4.png)

黄色のボタンも追加してみましょう：

```fsharp
let yellowButton = new Button()
yellowButton.Text <- "Make me yellow" 
yellowButton.AutoSize <- true
yellowButton.Click.Add (fun _-> form.BackColor <- Color.Yellow)
panel.Controls.Add(yellowButton) 
```

![](../assets/img/fsharp-interactive-ui5.png)

しかし、ボタンが切れてしまっているので、フローの方向を変更しましょう：

```fsharp
panel.FlowDirection <- FlowDirection.TopDown
```

![](../assets/img/fsharp-interactive-ui6.png)

しかし今度は、黄色のボタンが緑のボタンと同じ幅になっていません。これは`Dock`で修正できます：

```fsharp
yellowButton.Dock <- DockStyle.Fill
```

![](../assets/img/fsharp-interactive-ui7.png)

ご覧の通り、このように対話的にレイアウトを操作するのは非常に簡単です。
レイアウトのロジックに満足したら、実際のアプリケーション用にコードをC#に変換し直すことができます。

この例はWinForms固有のものです。他のUIフレームワークでは、もちろんロジックは異なります。

----------

以上が最初の4つの提案です。まだ終わりではありません！
次の投稿では、開発と DevOps スクリプトに F# を使う方法について説明します。

