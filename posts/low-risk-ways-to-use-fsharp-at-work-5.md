---
layout: post
title: "仕事でF#を使うその他の興味深い方法"
description: "仕事でF#を使う26の低リスクな方法（パート5）"
categories: []
seriesId: "仕事でF#を低リスクで使う方法"
seriesOrder: 5

---

この投稿は、[仕事でF#を低リスクかつ段階的に使う方法](../posts/low-risk-ways-to-use-fsharp-at-work.md)に関するシリーズの結論です。

最後に、コアや重要なコードに影響を与えることなく、F#がさまざまな開発タスクの周辺でどのように役立つかについて、いくつかの方法を見ていきます。

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

## パート5: コアの外でF#を使うその他の方法

この最後のグループの提案は、申し訳ありませんが、少し雑多なものです。
これらは主に分析とデータ処理にF#を使うことに関するもので、前回の投稿には収まらなかったものです。

<a name="other-parsers"></a>
## 23. パーシングにF#を使う

日常的な開発の過程で、何かをパースする必要がある場面は驚くほど多いです：文字列をスペースで分割する、CSVファイルを読み込む、
テンプレートで置換を行う、Webクローラー用にHTMLリンクを見つける、URIのクエリ文字列をパースするなど。

F#はML由来の言語であり、簡単な正規表現から本格的なパーサーまで、あらゆる種類のパーシングタスクに理想的です。

もちろん、一般的なタスクには多くの既製ライブラリがありますが、時には独自のものを書く必要があります。
良い例は、[先ほど見た](../posts/low-risk-ways-to-use-fsharp-at-work-3.md#test-bdd)BDDフレームワークのTickSpecです。

TickSpecは、Given/When/Thenのいわゆる「Gherkin」形式をパースする必要があります。別のライブラリに依存するよりも、
[Phil](http://trelford.com/blog/post/TickSpec.aspx)にとっては、数百行で独自のパーサーを書く方が簡単（そして楽しい）だったのではないかと想像します。
[ソースコードの一部はこちら](https://github.com/fsprojects/TickSpec/blob/master/TickSpec/LineParser.fs)で見ることができます。

独自のパーサーを書く価値があるもう一つの状況は、ひどいXML設定形式を持つ複雑なシステム（ルールエンジンなど）がある場合です。
設定を手動で編集する代わりに、非常に単純なドメイン固有言語（DSL）を作成し、それをパースして複雑なXMLに変換することができます。

Martin Fowlerは[DSLに関する彼の本](https://ptgmedia.pearsoncmg.com/images/9780321712943/samplepages/0321712943.pdf)で、
この例を挙げています。[ステートマシンを作成するためにパースされるDSL](https://www.informit.com/articles/article.aspx?p=1592379&seqNum=3)です。
そして、こちらがそのDSLの[F#実装](https://www.fssnip.net/5h)です。

より複雑なパーシングタスクには、[FParsec](https://www.quanttec.com/fparsec/)の使用を強くお勧めします。これはこの種のことに完璧に適しています。
例えば、以下のパーシングに使われています：
[FogCreekの検索クエリ](https://web.archive.org/web/20130430065730/http://blog.fogcreek.com/fparsec/)、
[CSVファイル](https://blog.jb55.com/post/4247991875/f-csv-parsing-with-fparsec)、
[チェス表記](https://github.com/iigorr/pgn.net)、
[負荷テストシナリオ用のカスタムDSL](https://web.archive.org/web/20120228172540/http://www.frenk.com/2012/01/real-world-f-my-experience-part-two/)。

<a name="other-diagramming"></a>
## 24. ダイアグラムと可視化にF#を使う

何かをパースまたは分析した後、データでいっぱいの表よりも、結果を視覚的に表示できると常に良いです。

例えば、[以前の投稿](../posts/cycles-and-modularity-in-the-wild.md)で、[GraphViz](https://www.graphviz.org/)と組み合わせてF#を使い、
依存関係のダイアグラムを作成しました。以下にサンプルを示します：

![](../assets/img/tickspec_svg.png)

ダイアグラム自体を生成するコードは短く、約60行だけでした。
[こちら](https://gist.github.com/swlaschin/5742974#file-type-dependency-graph-fsx-L428)で見ることができます。

GraphVizの代替として、[FSGraph](https://github.com/piotrosz/FSGraph)の使用も検討できます。

より数学的またはデータ中心の可視化には、いくつかの優れたライブラリがあります：

* [FSharp.Charting](https://fslab.org/FSharp.Charting/) - F#スクリプティングとよく統合されたデスクトップ向け可視化。
* [FsPlot](https://github.com/TahaHachana/FsPlot) - HTMLでのインタラクティブな可視化。
* [VegaHub](https://github.com/panesofglass/VegaHub) - [Vega](https://vega.github.io/vega/)と連携するF#ライブラリ。
* [F# for Visualization](https://web.archive.org/web/20210616224725/www.ffconsultancy.com/products/fsharp_for_visualization/index.html) 

そして最後に、800ポンドのゴリラ - Excelがあります。

利用可能であれば、Excelの組み込み機能を使うのは素晴らしいです。そしてF#スクリプティングはExcelとうまく連携します。

[Excelでチャートを作成](https://learn.microsoft.com/ja-jp/previous-versions/visualstudio/visual-studio-2010/hh297098%28v=vs.100%29)したり、
[Excelで関数をプロットしたり](https://brandewinder.com/2013/02/06/Plot-functions-from-FSharp-to-Excel/)できます。さらにパワフルな統合のために、
[FCell](https://web.archive.org/web/20161003070717/http://fcell.io/)や[Excel-DNA](https://excel-dna.net/)プロジェクトがあります。

<a name="other-data-access"></a>
## 25. WebベースのデータストアへのアクセスにF#を使う

Web上には、引き出して愛されるのを待っている多くの公開データがあります。
型プロバイダーの魔法により、F#はこれらのWeb規模のデータストアをワークフローに直接統合するのに適しています。

ここでは、FreebaseとWorld Bankという2つのデータストアを見ていきます。
近々さらに多くのものが利用可能になる予定です - 最新情報は[fsharp.orgのデータアクセスページ](https://fsharp.org/guides/data-access/)を参照してください。

## Freebase 

*このセクションのコードは[githubで入手可能](https://github.com/swlaschin/low-risk-ways-to-use-fsharp-at-work/blob/master/freebase.fsx)です。*

[Freebase](https://en.wikipedia.org/wiki/Freebase_(database))は、多くのソースから収集された構造化データの大規模な協力型知識ベースとオンラインコレクションです。

始めるには、これまで見てきたように型プロバイダーのDLLをリンクするだけです。

このサイトはスロットル制限があるため、頻繁に使う場合はAPIキーが必要になるでしょう
（[APIの詳細はこちら](https://developers.google.com/freebase/usage-limits?hl=ja)）

```fsharp
// 現在のディレクトリをスクリプトディレクトリと同じに設定
System.IO.Directory.SetCurrentDirectory (__SOURCE_DIRECTORY__)

// スクリプトディレクトリ下にFSharp.Dataが必要
//    nuget install FSharp.Data -o Packages -ExcludeVersion  
#r @"Packages\FSharp.Data\lib\net40\FSharp.Data.dll"
open FSharp.Data

// キーなし
let data = FreebaseData.GetDataContext()

// キーあり
(*
[<Literal>]
let FreebaseApiKey = "<ここにfreebase対応のgoogle APIキーを入力>"
type FreebaseDataWithKey = FreebaseDataProvider<Key=FreebaseApiKey>
let data = FreebaseDataWithKey.GetDataContext()
*)
```

型プロバイダーがロードされたら、次のような質問を始めることができます...

*「アメリカの大統領は誰？」*

```fsharp
data.Society.Government.``US Presidents``
|> Seq.map (fun p ->  p.``President number`` |> Seq.head, p.Name)
|> Seq.sortBy fst
|> Seq.iter (fun (n,name) -> printfn "%sは%i番目でした" name n )
```

結果：

```text
George Washingtonは1番目でした
John Adamsは2番目でした
Thomas Jeffersonは3番目でした
James Madisonは4番目でした
James Monroeは5番目でした
John Quincy Adamsは6番目でした
...
Ronald Reaganは40番目でした
George H. W. Bushは41番目でした
Bill Clintonは42番目でした
George W. Bushは43番目でした
Barack Obamaは44番目でした
```

たった4行のコードでこれだけできるのは悪くありません！

では、*「カサブランカはどんな賞を受賞した？」*はどうでしょうか？

```fsharp
data.``Arts and Entertainment``.Film.Films.IndividualsAZ.C.Casablanca.``Awards Won``
|> Seq.map (fun award -> award.Year, award.``Award category``.Name)
|> Seq.sortBy fst
|> Seq.iter (fun (year,name) -> printfn "%s -- %s" year name)
```

結果は：

```text
1943 -- Academy Award for Best Director
1943 -- Academy Award for Best Picture
1943 -- Academy Award for Best Screenplay
```

以上がFreebaseです。役立つものもあれば些細なものもある、たくさんの良い情報があります。

[Freebase型プロバイダーの使い方の詳細](https://yukitos.github.io/FSharp.Data/ja/library/Freebase.html)。

## Freebaseを使って現実的なテストデータを生成する

FsCheckを使って[テストデータを生成する](../posts/low-risk-ways-to-use-fsharp-at-work-3.md#test-dummy)方法を見てきました。
同様に、Freebaseからデータを取得することで、より現実的なデータを得ることができます。

[Kit Eason](https://x.com/kitlovesfsharp)が[ツイート](https://x.com/kitlovesfsharp/status/296240699735695360)でこの方法を示しました。
以下は彼のコードに基づく例です：

```fsharp
let randomElement =
    let random = new System.Random()
    fun (arr:string array) -> arr.[random.Next(arr.Length)]

let surnames = 
    FreebaseData.GetDataContext().Society.People.``Family names``
    |> Seq.truncate 1000
    |> Seq.map (fun name -> name.Name)
    |> Array.ofSeq
            
let firstnames = 
    FreebaseData.GetDataContext().Society.Celebrities.Celebrities
    |> Seq.truncate 1000
    |> Seq.map (fun celeb -> celeb.Name.Split([|' '|]).[0])
    |> Array.ofSeq

// 10人のランダムな人物を生成して表示
type Person = {Forename:string; Surname:string}
Seq.init 10 ( fun _ -> 
    {Forename = (randomElement firstnames); 
     Surname = (randomElement surnames) }
     )
|> Seq.iter (printfn "%A")
```

結果は：

<pre>
{Forename = "Kelly"; Surname = "Deasy";}
{Forename = "Bam"; Surname = "Br?z?";}
{Forename = "Claire"; Surname = "Sludden";}
{Forename = "Kenneth"; Surname = "Kl?tz";}
{Forename = "?tienne"; Surname = "Defendi";}
{Forename = "Billy"; Surname = "Paleti";}
{Forename = "Alix"; Surname = "Nuin";}
{Forename = "Katherine"; Surname = "Desporte";}
{Forename = "Jasmine";  Surname = "Belousov";}
{Forename = "Josh";  Surname = "Kramarsic";}
</pre>

## 世界銀行

*このセクションのコードは[githubで入手可能](https://github.com/swlaschin/low-risk-ways-to-use-fsharp-at-work/blob/master/world-bank.fsx)です。*

Freebaseとは対照的に、[世界銀行オープンデータ](https://data.worldbank.org/)は、世界中の詳細な経済・社会情報を多く持っています。

セットアップはFreebaseと同じですが、APIキーは必要ありません。

```fsharp
// 現在のディレクトリをスクリプトディレクトリと同じに設定
System.IO.Directory.SetCurrentDirectory (__SOURCE_DIRECTORY__)

// スクリプトディレクトリ下にFSharp.Dataが必要
//    nuget install FSharp.Data -o Packages -ExcludeVersion  
#r @"Packages\FSharp.Data\lib\net40\FSharp.Data.dll"
open FSharp.Data

let data = WorldBankData.GetDataContext()
```

型プロバイダーをセットアップしたら、次のような本格的なクエリを実行できます：

*「低所得国と高所得国の栄養失調率を比較するとどうなりますか？」*

```fsharp
// 処理する国のリストを作成
let groups = 
 [| data.Countries.``Low income``
    data.Countries.``High income``
    |]

// 特定の年の指標からデータを取得
let getYearValue (year:int) (ind:Runtime.WorldBank.Indicator) =
    ind.Name,year,ind.Item year

// データを取得
[ for c in groups -> 
    c.Name,
    c.Indicators.``Malnutrition prevalence, weight for age (% of children under 5)`` |> getYearValue 2010
] 
// データを表示
|> Seq.iter (
    fun (group,(indName, indYear, indValue)) -> 
       printfn "%s -- %s %i %0.2f%% " group indName indYear indValue)
```

結果は：

```text
Low income -- Malnutrition prevalence, weight for age (% of children under 5) 2010 23.19% 
High income -- Malnutrition prevalence, weight for age (% of children under 5) 2010 1.36% 
```

同様に、以下は妊産婦死亡率を比較するコードです：

```fsharp
// 処理する国のリストを作成
let countries = 
 [| data.Countries.``European Union``
    data.Countries.``United Kingdom``
    data.Countries.``United States`` |]

// データを取得
[ for c in countries  -> 
    c.Name,
    c.Indicators.``Maternal mortality ratio (modeled estimate, per 100,000 live births)`` |> getYearValue 2010
] 
// データを表示
|> Seq.iter (
    fun (group,(indName, indYear, indValue)) -> 
       printfn "%s -- %s %i %0.1f" group indName indYear indValue)
```

結果は：

```text
European Union -- Maternal mortality ratio (modeled estimate, per 100,000 live births) 2010 9.0 
United Kingdom -- Maternal mortality ratio (modeled estimate, per 100,000 live births) 2010 12.0 
United States -- Maternal mortality ratio (modeled estimate, per 100,000 live births) 2010 21.0 
```

[世界銀行型プロバイダーの使い方の詳細](https://fsprojects.github.io/FSharp.Data/library/WorldBank.html)。

<a name="other-data-science"></a>
## 26. データサイエンスと機械学習にF#を使う

これらの提案をすべて実践しているとします。FParsecでWebログを解析し、
SQL型プロバイダーで内部データベースから統計を抽出し、
Webサービスから外部データを取得しています。これらのデータを全て手に入れました - それで何ができるでしょうか？

最後に、データサイエンスと機械学習にF#を使うことについて簡単に見てみましょう。

これまで見てきたように、F#は探索的プログラミングに適しています - インテリセンス付きのREPLがあります。しかし、PythonやRとは異なり、
コードは型チェックされるので、2時間の処理ジョブの途中で例外によってコードが失敗することはありません！

PythonのPandasライブラリやRの'tseries'パッケージに馴染みがあれば、
[Deedle](https://bluemountaincapital.github.io/Deedle/)を真剣に検討すべきです。これは使いやすく、高品質なデータおよび時系列操作用のパッケージです。
DeedleはREPLを使った探索的プログラミングに適していますが、効率的にコンパイルされた.NETコードでも使えます。

そして、Rをよく使う場合は、[R型プロバイダー](https://bluemountaincapital.github.io/FSharpRProvider)（もちろん）があります。
これは、RパッケージをあたかもNETライブラリであるかのように使えることを意味します。素晴らしいですね！

他にもF#フレンドリーなパッケージがたくさんあります。fsharp.orgでそれらについて知ることができます。

* [データサイエンス/数学/機械学習](https://fsharp.org/guides/data-science/)

----------

## シリーズのまとめ

ふう！長い例のリストと多くのコードを見てきました。最後まで読んでいただいた方、おめでとうございます！

これによってF#の価値について新しい洞察が得られたことを願っています。
F#は単なる数学的または金融的な言語ではありません - 実用的な言語でもあります。
そして、開発、テスト、データ管理のワークフローにおけるあらゆる種類のことに役立ちます。

最後に、このシリーズを通じて強調してきたように、これらの使い方はすべて安全で、リスクが低く、段階的です。最悪の場合でも何が起こるでしょうか？

さあ、チームメイトや上司を説得してF#を試してみてください。そしてその結果を教えてください。

<a name="other-balance-power"></a>

## 追記

この投稿の後、Simon Cousinsがツイートで1つ忘れているものがあると指摘しました - 追加せずにはいられません。

<blockquote class="twitter-tweet" lang="en"><p><a href="https://twitter.com/ScottWlaschin">@ScottWlaschin</a> 27: イギリスの発電所群の発電スケジュールをバランスさせる。本気で、<a href="https://twitter.com/search?q=%23fsharp&amp;src=hash">#fsharp</a>の代替案はリスクが高すぎた</p>&mdash; Simon Cousins (@simontcousins) <a href="https://twitter.com/simontcousins/statuses/459591939902697472">2014年4月25日</a></blockquote>
<script async src="//platform.twitter.com/widgets.js" charset="utf-8"></script>

Simonの実世界でのF#の使用（発電用）について、[彼のブログ](https://web.archive.org/web/20160712051833/http://simontylercousins.net/does-the-language-you-use-make-a-difference-revisited)でもっと読むことができます。
[fsharp.org](https://fsharp.org/testimonials/)にはF#についてのさらなる証言があります。



