---
layout: post
title: "実世界の循環依存とモジュール性"
description: "C#とF#で実プロジェクトの指標を比較"
categories: []
seriesId: "循環依存"
seriesOrder: 3
image: "@assets/img/specflow_svg.png"
---

(*2013-06-15更新。記事末尾のコメントを参照*)

(*2014-04-12更新。[続編の記事](https://fsharpforfunandprofit.com/posts/roslyn-vs-fsharp-compiler/)でRoslynにも同様の分析を適用*)

(*2015-01-23更新。[Evelina Gabasovaによるこの分析のより明確なバージョン](http://evelinag.com/blog/2014/06-09-comparing-dependency-networks/)を強くお勧めします。
彼女は本当にこの分野に詳しいので、まず彼女の記事を読むことをお勧めします！*)

この記事は、[モジュール構成](../posts/recipe-part3.html)と[循環依存](../posts/cyclic-dependencies.html)に関する以前の2つの記事の続編です。

C#とF#で書かれた実際のプロジェクトを比較し、モジュール性と循環依存の数がどのように異なるかを見てみるのは面白いと思いました。


## 計画

C#で書かれたプロジェクトとF#で書かれたプロジェクトを10個ずつ程度選び、何らかの方法で比較する計画を立てました。

この作業に多くの時間をかけたくなかったので、ソースファイルを分析しようとするのではなく、少しずるをして[Mono.Cecil](https://www.mono-project.com/docs/tools+libraries/libraries/Mono.Cecil/)ライブラリを使用してコンパイルされたアセンブリを分析することにしました。

これにより、NuGetを使用して直接バイナリを入手することもできました。

選んだプロジェクトは以下の通りです。

*C#プロジェクト*

* [Mono.Cecil](https://www.nuget.org/packages/Mono.Cecil/)、ECMA CIL形式のプログラムやライブラリを検査するもの。
* [NUnit](https://www.nuget.org/packages/NUnit/)
* [SignalR](https://www.nuget.org/packages/Microsoft.AspNet.SignalR/)、リアルタイムWeb機能のため。
* [NancyFx](https://www.nuget.org/packages/Nancy/)、Webフレームワーク。
* [YamlDotNet](https://www.nuget.org/packages/YamlDotNet.Core/)、YAMLのパースと出力のため。
* [SpecFlow](https://www.nuget.org/packages/SpecFlow/)、BDDツール。
* [Json.NET](https://www.nuget.org/packages/Newtonsoft.Json/)。
* [Entity Framework](https://www.nuget.org/packages/EntityFramework/5.0.0)。
* [ELMAH](https://www.nuget.org/packages/elmah/)、ASP.NETのロギングフレームワーク。
* [NuGet](https://www.nuget.org/packages/Nuget.Core/)自体。
* [Moq](https://www.nuget.org/packages/Moq/)、モッキングフレームワーク。
* [NDepend](https://www.ndepend.com/)、コード分析ツール。
* 公平を期すため、私がC#で書いたビジネスアプリケーション。


*F#プロジェクト*

残念ながら、F#プロジェクトは選択の幅が広くありません。以下を選びました。

* [FSharp.Core](https://www.nuget.org/packages/FSharp.Core/)、F#のコアライブラリ。
* [FSPowerPack](https://www.nuget.org/packages/FSPowerPack.Community/)。
* [FsUnit](https://www.nuget.org/packages/FsUnit/)、NUnitの拡張。
* [Canopy](https://www.nuget.org/packages/canopy/)、Seleniumテスト自動化ツールのラッパー。
* [FsSql](https://www.nuget.org/packages/FsSql/)、優れたADO.NETラッパー。
* [WebSharper](https://www.nuget.org/packages/WebSharper/2.4.85.235)、Webフレームワーク。
* [TickSpec](https://www.nuget.org/packages/TickSpec/)、BDDツール。
* [FSharpx](https://www.nuget.org/packages/FSharpx.Core/)、F#ライブラリ。
* [FParsec](https://www.nuget.org/packages/FParsec/)、パーサーライブラリ。
* [FsYaml](https://www.nuget.org/packages/FsYaml/)、FParsecを基にしたYAMLライブラリ。
* [Storm](https://codeplexarchive.org/codeplex/project/storm)、Webサービスのテストツール。
* [Foq](https://www.nuget.org/packages/Foq/)、モッキングフレームワーク。
* 今度はF#で書いた別のビジネスアプリケーション。

SpecFlowとTickSpec、MoqとFoqは直接比較可能なものとして選びました。

しかし、ご覧の通り、F#プロジェクトのほとんどはC#のものと直接比較できません。たとえば、NancyやEntity Frameworkに相当するF#プロジェクトはありません。

それでも、プロジェクトを比較することで何らかのパターンが観察できることを期待しました。そして、その期待は的中しました。結果については後ほど詳しく説明します！


## どの指標を使うか

2つの点を調べたいと思いました。「モジュール性」と「循環依存」です。

まず、「モジュール性」の単位は何にすべきでしょうか。

コーディングの観点からは、通常ファイルを単位として作業します（[Smalltalkは顕著な例外](https://stackoverflow.com/questions/3561145/what-is-a-smalltalk-image)です）。そのため、*ファイル*をモジュール性の単位と考えるのが理にかなっています。ファイルは関連する項目をグループ化するために使用され、2つのコードが異なるファイルにある場合、同じファイル内にある場合ほど「関連性が強い」とは言えません。

C#では、ベストプラクティスとして1ファイルに1クラスを置きます。つまり、20ファイルは20クラスを意味します。クラスにはネストしたクラスがある場合もありますが、まれな例外を除いて、ネストしたクラスは親クラスと同じファイルにあります。これは、ネストしたクラスを無視し、トップレベルのクラスをファイルの代わりとしてモジュール性の単位として使用できることを意味します。

F#では、ベストプラクティスとして1ファイルに1つの*モジュール*（時にはそれ以上）を置きます。つまり、20ファイルは20モジュールを意味します。裏側では、モジュールは静的クラスに変換され、モジュール内で定義されたクラスはネストしたクラスに変換されます。したがって、ここでもネストしたクラスを無視し、トップレベルのクラスをモジュール性の単位として使用できます。

C#とF#のコンパイラは、LINQやラムダ式などのために多くの「隠れた」型を生成します。場合によっては、これらを除外し、明示的にコード化された「作成された」型のみを含めたいことがあります。
また、F#の判別共用体から生成されるケースクラスも「作成された」クラスとは見なしません。つまり、3つのケースを持つ共用体型は4つではなく1つの作成された型としてカウントされます。

したがって、*トップレベル型*の定義は次のようになります。ネストされておらず、コンパイラによって生成されていない型です。

モジュール性の指標として選んだのは以下の通りです。

* **トップレベル型の数**。上記の定義による。
* **作成された型の数**。上記の定義による。
* **すべての型の数**。この数にはコンパイラが生成した型も含まれます。トップレベル型の数と比較することで、トップレベル型がどの程度代表的かがわかります。
* **プロジェクトのサイズ**。明らかに、大きなプロジェクトにはより多くの型があるので、プロジェクトのサイズに基づいて調整する必要があります。選んだサイズの指標は、ファイルの物理的なサイズではなく命令の数です。これにより、埋め込みリソースなどの問題を排除できます。

### 依存関係

モジュール性の単位が決まったら、モジュール間の依存関係を見ることができます。

この分析では、同じアセンブリ内の型間の依存関係のみを含めたいと思います。つまり、`String`や`List`などのシステム型への依存は依存関係としてカウントしません。

トップレベル型`A`と別のトップレベル型`B`があるとします。以下の場合、`A`から`B`への*依存関係*が存在すると言えます。

* 型`A`またはそのネストした型が、型`B`またはそのネストした型から継承（または実装）している。
* 型`A`またはそのネストした型が、型`B`またはそのネストした型をパラメータまたは戻り値として参照するフィールド、プロパティ、メソッドを持っている。これにはプライベートメンバーも含まれます。結局のところ、依存関係には変わりありません。
* 型`A`またはそのネストした型が、型`B`またはそのネストした型を参照するメソッド実装を持っている。

これは完璧な定義ではないかもしれません。しかし、私の目的には十分です。

すべての依存関係に加えて、「公開」または「公開された」依存関係を見るのも有用かもしれないと考えました。`A`から`B`への*公開依存関係*は以下の場合に存在します。

* 型`A`またはそのネストした型が、型`B`またはそのネストした型から継承（または実装）している。
* 型`A`またはそのネストした型が、型`B`またはそのネストした型をパラメータまたは戻り値として参照する*公開*フィールド、プロパティ、メソッドを持っている。
* 最後に、公開依存関係は、ソース型自体が公開されている場合にのみカウントされます。

依存関係の指標として選んだのは以下の通りです。

* **依存関係の総数**。これは単にすべての型のすべての依存関係の合計です。大きなプロジェクトにはより多くの依存関係があることは明らかですが、プロジェクトのサイズも考慮に入れます。
* **X個以上の依存関係を持つ型の数**。これにより、「過度に」複雑な型がいくつあるかがわかります。

### 循環依存

この依存関係の定義に基づくと、*循環依存*は2つの異なるトップレベル型が互いに依存する場合に発生します。

この定義に含まれないものに注意してください。モジュール内のネストした型が同じモジュール内の別のネストした型に依存する場合、それは循環依存ではありません。

循環依存がある場合、すべてのモジュールがリンクされた集合があります。たとえば、`A`が`B`に依存し、`B`が`C`に依存し、`C`が`A`に依存する場合、`A`、`B`、`C`はリンクされています。グラフ理論では、これを*強連結成分*と呼びます。

循環依存の指標として選んだのは以下の通りです。

* **サイクルの数**。つまり、1つ以上のモジュールを含む強連結成分の数です。
* **最大の成分のサイズ**。これにより、依存関係がどの程度複雑かがわかります。

すべての依存関係と公開依存関係のみの両方について循環依存を分析しました。

## 実験の実施

まず、NuGetを使用して各プロジェクトのバイナリをダウンロードしました。次に、各アセンブリに対して以下の手順を実行する小さなF#スクリプトを作成しました。

1. [Mono.Cecil](https://www.mono-project.com/docs/tools+libraries/libraries/Mono.Cecil/)を使用してアセンブリを分析し、ネストした型を含むすべての型を抽出。
2. 各型について、他の型への公開参照と実装参照を抽出し、内部（同じアセンブリ）と外部（異なるアセンブリ）に分類。
3. 「トップレベル」型のリストを作成。
4. 下位レベルの依存関係に基づいて、各トップレベル型から他のトップレベル型への依存関係リストを作成。

この依存関係リストを使用して、以下に示すさまざまな統計を抽出しました。また、依存関係グラフをSVG形式で描画しました（[graphViz](https://www.graphviz.org/)を使用）。

サイクル検出には、[QuickGraphライブラリ](https://codeplexarchive.org/codeplex/project/quickgraph)を使用して強連結成分を抽出し、さらに処理と描画を行いました。

詳細が気になる方は、[使用したスクリプトへのリンク](https://gist.github.com/swlaschin/5742974)と[生データ](https://gist.github.com/swlaschin/5742994)を用意しました。

これは適切な統計的研究ではなく、単なる簡単な分析であることを認識することが重要です。しかし、結果は非常に興味深いものでした。以下でその詳細を見ていきましょう。

## モジュール性

まずモジュール性から見ていきましょう。

C#プロジェクトのモジュール性関連の結果は以下の通りです。

<table class="table table-striped table-condensed">
<thead>
<tr><th>プロジェクト</th><th>コードサイズ</th><th>トップレベル型</th><th>作成された型</th><th>すべての型</th><th>コード/トップ</th><th>コード/作成</th><th>コード/すべて</th><th>作成/トップ</th><th>すべて/トップ</th></tr>
</thead>
<tbody>
<tr><td>ef	</td><td>269521	</td><td>514	</td><td>565	</td><td>876	</td><td>524	</td><td>477	</td><td>308	</td><td>1.1	</td><td>1.7	</td></tr>
<tr><td>jsonDotNet	</td><td>148829	</td><td>215	</td><td>232	</td><td>283	</td><td>692	</td><td>642	</td><td>526	</td><td>1.1	</td><td>1.3	</td></tr>
<tr><td>nancy	</td><td>143445	</td><td>339	</td><td>366	</td><td>560	</td><td>423	</td><td>392	</td><td>256	</td><td>1.1	</td><td>1.7	</td></tr>
<tr><td>cecil	</td><td>101121	</td><td>240	</td><td>245	</td><td>247	</td><td>421	</td><td>413	</td><td>409	</td><td>1.0	</td><td>1.0	</td></tr>
<tr><td>nuget	</td><td>114856	</td><td>216	</td><td>237	</td><td>381	</td><td>532	</td><td>485	</td><td>301	</td><td>1.1	</td><td>1.8	</td></tr>
<tr><td>signalR	</td><td>65513	</td><td>192	</td><td>229	</td><td>311	</td><td>341	</td><td>286	</td><td>211	</td><td>1.2	</td><td>1.6	</td></tr>
<tr><td>nunit	</td><td>45023	</td><td>173	</td><td>195	</td><td>197	</td><td>260	</td><td>231	</td><td>229	</td><td>1.1	</td><td>1.1	</td></tr>
<tr><td>specFlow	</td><td>46065	</td><td>242	</td><td>287	</td><td>331	</td><td>190	</td><td>161	</td><td>139	</td><td>1.2	</td><td>1.4	</td></tr>
<tr><td>elmah	</td><td>43855	</td><td>116	</td><td>140	</td><td>141	</td><td>378	</td><td>313	</td><td>311	</td><td>1.2	</td><td>1.2	</td></tr>
<tr><td>yamlDotNet	</td><td>23499	</td><td>70	</td><td>73	</td><td>73	</td><td>336	</td><td>322	</td><td>322	</td><td>1.0	</td><td>1.0	</td></tr>
<tr><td>fparsecCS	</td><td>57474	</td><td>41	</td><td>92	</td><td>93	</td><td>1402	</td><td>625	</td><td>618	</td><td>2.2	</td><td>2.3	</td></tr>
<tr><td>moq	</td><td>133189	</td><td>397	</td><td>420	</td><td>533	</td><td>335	</td><td>317	</td><td>250	</td><td>1.1	</td><td>1.3	</td></tr>
<tr><td>ndepend	</td><td>478508	</td><td>734	</td><td>828	</td><td>843	</td><td>652	</td><td>578	</td><td>568	</td><td>1.1	</td><td>1.1	</td></tr>
<tr><td>ndependPlat	</td><td>151625	</td><td>185	</td><td>205	</td><td>205	</td><td>820	</td><td>740	</td><td>740	</td><td>1.1	</td><td>1.1	</td></tr>
<tr><td>personalCS	</td><td>422147	</td><td>195	</td><td>278	</td><td>346	</td><td>2165	</td><td>1519	</td><td>1220	</td><td>1.4	</td><td>1.8	</td></tr>
<tr><td>合計	</td><td>2244670	</td><td>3869	</td><td>4392	</td><td>5420	</td><td>580	</td><td>511	</td><td>414	</td><td>1.1	</td><td>1.4	</td></tr>
</tbody>
</table>

F#プロジェクトの結果は以下の通りです。

<table class="table table-striped table-condensed">
<thead>
<tr><th>プロジェクト</th><th>コードサイズ</th><th>トップレベル型</th><th>作成された型</th><th>すべての型</th><th>コード/トップ</th><th>コード/作成</th><th>コード/すべて</th><th>作成/トップ</th><th>すべて/トップ</th></tr>
</thead>
<tbody>
<tr><td>fsxCore	</td><td>339596	</td><td>173	</td><td>328	</td><td>2024	</td><td>1963	</td><td>1035	</td><td>168	</td><td>1.9	</td><td>11.7	</td></tr>
<tr><td>fsCore	</td><td>226830	</td><td>154	</td><td>313	</td><td>1186	</td><td>1473	</td><td>725	</td><td>191	</td><td>2.0	</td><td>7.7	</td></tr>
<tr><td>fsPowerPack	</td><td>117581	</td><td>93	</td><td>150	</td><td>410	</td><td>1264	</td><td>784	</td><td>287	</td><td>1.6	</td><td>4.4	</td></tr>
<tr><td>storm	</td><td>73595	</td><td>67	</td><td>70	</td><td>405	</td><td>1098	</td><td>1051	</td><td>182	</td><td>1.0	</td><td>6.0	</td></tr>
<tr><td>fParsec	</td><td>67252	</td><td>8	</td><td>24	</td><td>245	</td><td>8407	</td><td>2802	</td><td>274	</td><td>3.0	</td><td>30.6	</td></tr>
<tr><td>websharper	</td><td>47391	</td><td>52	</td><td>128	</td><td>285	</td><td>911	</td><td>370	</td><td>166	</td><td>2.5	</td><td>5.5	</td></tr>
<tr><td>tickSpec	</td><td>30797	</td><td>34	</td><td>49	</td><td>170	</td><td>906	</td><td>629	</td><td>181	</td><td>1.4	</td><td>5.0	</td></tr>
<tr><td>websharperHtml	</td><td>14787	</td><td>18	</td><td>28	</td><td>72	</td><td>822	</td><td>528	</td><td>205	</td><td>1.6	</td><td>4.0	</td></tr>
<tr><td>canopy	</td><td>15105	</td><td>6	</td><td>16	</td><td>103	</td><td>2518	</td><td>944	</td><td>147	</td><td>2.7	</td><td>17.2	</td></tr>
<tr><td>fsYaml	</td><td>15191	</td><td>7	</td><td>11	</td><td>160	</td><td>2170	</td><td>1381	</td><td>95	</td><td>1.6	</td><td>22.9	</td></tr>
<tr><td>fsSql	</td><td>15434	</td><td>13	</td><td>18	</td><td>162	</td><td>1187	</td><td>857	</td><td>95	</td><td>1.4	</td><td>12.5	</td></tr>
<tr><td>fsUnit	</td><td>1848	</td><td>2	</td><td>3	</td><td>7	</td><td>924	</td><td>616	</td><td>264	</td><td>1.5	</td><td>3.5	</td></tr>
<tr><td>foq	</td><td>26957	</td><td>35	</td><td>48	</td><td>103	</td><td>770	</td><td>562	</td><td>262	</td><td>1.4	</td><td>2.9	</td></tr>
<tr><td>personalFS	</td><td>118893	</td><td>30	</td><td>146	</td><td>655	</td><td>3963	</td><td>814	</td><td>182	</td><td>4.9	</td><td>21.8	</td></tr>
<tr><td>合計	</td><td>1111257	</td><td>692	</td><td>1332	</td><td>5987	</td><td>1606	</td><td>834	</td><td>186	</td><td>1.9	</td><td>8.7	</td></tr>

</tbody>
</table>

各列の説明。

* **コードサイズ**はCecilが報告するすべてのメソッドのCIL命令の数です。
* **トップレベル型**は上記の定義を使用したアセンブリ内のトップレベル型の総数です。
* **作成された型**は、ネストした型、列挙型などを含むアセンブリ内の型の総数ですが、コンパイラが生成した型は除外しています。
* **すべての型**は、コンパイラが生成した型を含むアセンブリ内の型の総数です。

これらの基本的な指標に、いくつかの追加の計算列を加えました。

* **コード/トップ**はトップレベル型/モジュールあたりのCIL命令の数です。これは各モジュール性の単位に関連付けられたコードの量を示す指標です。一般的に、多いほど良いと言えます。複数のファイルを扱う必要がないからです。一方で、トレードオフもあります。1つのファイルに多すぎるコード行があると、コードの読解が困難になります。C#とF#の両方において、1ファイルあたり500〜1000行のコードが良い実践とされており、調査したソースコードでもいくつかの例外を除いてそうなっているようです。
* **コード/作成**は作成された型あたりのCIL命令の数です。これは各作成された型の「大きさ」を示す指標です。
* **コード/すべて**は型あたりのCIL命令の数です。これは各型の「大きさ」を示す指標です。
* **作成/トップ**はトップレベル型に対する作成された型すべての比率です。これは各モジュール性の単位に含まれる作成された型の概算数を示します。
* **すべて/トップ**はトップレベル型に対するすべての型の比率です。これは各モジュール性の単位に含まれる型の概算数を示します。

### 分析

最初に気づいたのは、いくつかの例外を除いて、C#プロジェクトのコードサイズがF#プロジェクトよりも大きいことです。部分的には、より大きなプロジェクトを選んだからです。しかし、SpecFlowとTickSpecのような比較的似たプロジェクトでも、SpecFlowのコードサイズの方が大きいです。SpecFlowがTickSpecよりも多くの機能を持っている可能性もありますが、F#でより汎用的なコードを使用した結果かもしれません。現時点ではどちらとも言えません。本当に同等の比較を行うには、さらなる調査が必要でしょう。

次に、トップレベル型の数について見てみましょう。先ほど、これはプロジェクト内のファイル数に相当するはずだと述べました。本当にそうでしょうか？

すべてのプロジェクトのソースを入手して徹底的にチェックしたわけではありませんが、いくつかのサンプルチェックを行いました。たとえば、Nancyには339のトップレベルクラスがあり、約339のファイルがあるはずです。実際には322の.csファイルがあったので、悪くない推定と言えます。

一方、SpecFlowには242のトップレベル型がありますが、.csファイルは171個しかないので、ここではやや過大評価しています。Cecilでも同様で、240のトップレベルクラスがありますが、.csファイルは128個しかありません。

FSharpXプロジェクトでは、173のトップレベルクラスがあり、約173のファイルがあるはずです。実際には78の.fsファイルしかないので、2倍以上の過大評価となっています。Stormを見ても、67のトップレベルクラスがありますが、実際には35の.fsファイルしかないので、やはり2倍の過大評価となっています。

したがって、トップレベルクラスの数は常にファイル数を過大評価しているようですが、C#よりもF#の方がその傾向が強いようです。この分野についてはさらに詳細な分析が必要かもしれません。

### コードサイズとトップレベル型の数の比率

F#コードの「コード/トップ」比率は、C#コードよりも一貫して大きくなっています。全体として、C#の平均的なトップレベル型は580命令に変換されます。しかしF#ではその数は1606命令で、約3倍になっています。

これはF#コードがC#コードよりも簡潔であるためだと予想されます。1つのモジュールに500行のF#コードがあれば、500行のC#コードよりもはるかに多くのCIL命令が生成されるのではないでしょうか。

「コードサイズ」と「トップレベル型」を視覚的にプロットすると、以下のようなグラフになります。

![](@assets/img/Metrics_CodeSize_TopLevel.png)

驚いたことに、このグラフではF#とC#のプロジェクトがはっきりと区別されています。C#プロジェクトは、プロジェクトサイズが異なっても、1000命令あたり1〜2のトップレベル型という一貫した比率を示しているようです。
F#プロジェクトも一貫しており、1000命令あたり約0.6のトップレベル型という比率を示しています。

実際、F#プロジェクトのトップレベル型の数は、プロジェクトが大きくなるにつれてC#プロジェクトのように線形に増加するのではなく、頭打ちになる傾向があるようです。

このグラフから読み取れるメッセージは、同じサイズのプロジェクトであれば、F#の実装の方がモジュールの数が少なく、結果として複雑さも低くなる可能性があるということです。

おそらく2つの例外に気づいたでしょう。2つのC#プロジェクトが外れ値になっています。50KマークにあるのはFParsecCSで、425Kマークにあるのは私のビジネスアプリケーションです。

FParsecCSについては、パーサーには必然的に大きなC#クラスが必要なのだろうと確信しています。しかし、私のビジネスアプリケーションの場合、長年にわたって蓄積された不要なコードが原因だと分かっています。
実際、巨大なクラスがいくつかあり、本来ならより小さなクラスに分割すべきものです。したがって、C#のコードベースではこのような指標は*悪い*兆候かもしれません。

### コードサイズとすべての型の数の比率

一方、コンパイラが生成したものを含むすべての型の数とコードの比率を比較すると、非常に異なる結果が得られます。

以下は「コードサイズ」と「すべての型」の対応するグラフです。

![](@assets/img/Metrics_CodeSize_AllTypes.png)

F#については驚くほど線形になっています。型の総数（コンパイラが生成したものを含む）は、プロジェクトのサイズと密接に関係しているようです。
一方、C#の型の数はかなりばらつきがあるようです。

型の平均「サイズ」は、C#コードよりもF#コードの方がやや小さくなっています。C#の平均的な型は約400命令に変換されます。しかしF#ではその数は約180命令です。

これが何故なのかはよく分かりません。F#の型がより細分化されているからでしょうか、それともF#コンパイラがC#コンパイラよりも多くの小さな型を生成しているからでしょうか？より詳細な分析を行わないと判断できません。

### トップレベル型と作成された型の比率

コードサイズと型数を比較した後、今度は型数同士を比較してみましょう。

![](@assets/img/Metrics_TopLevel_AuthTypes.png)

ここでも大きな違いが見られます。C#では、モジュール性の単位ごとに平均1.1の作成された型があります。しかしF#では平均1.9で、いくつかのプロジェクトではそれよりもはるかに多くなっています。

もちろん、F#ではネストした型の作成は簡単ですが、C#ではかなり珍しいので、これは公平な比較ではないと言えるかもしれません。
しかし、[F#でたった数行で十数個の型を作成できる](../posts/conciseness-type-definitions.html)能力が、設計の質に何らかの影響を与えているのは確かでしょう。
C#でもこれは不可能ではありませんが、簡単ではありません。これは、C#では潜在的に可能な細かさを実現しようとする誘惑が少ないことを意味しているのではないでしょうか？

最も高い比率（4.9）を示しているのは、私のF#ビジネスアプリケーションです。これは、このリストの中で唯一、特定のビジネスドメインを中心に設計されたF#プロジェクトであるためだと考えています。
[ここで説明されている概念](../series/designing-with-types.html)を使用して、ドメインを正確にモデル化するために多くの「小さな」型を作成しました。DDDの原則を使用して作成された他のプロジェクトでも、
同じように高い数値が見られるはずです。

## 依存関係

次に、トップレベルクラス間の依存関係を見てみましょう。

C#プロジェクトの結果は以下の通りです。

<table class="table table-striped table-condensed">
<thead>
<tr><th>プロジェクト</th><th>トップレベル型</th><th>依存関係の総数</th><th>依存/トップ</th><th>1つ以上の依存</th><th>3つ以上の依存</th><th>5つ以上の依存</th><th>10以上の依存</th><th>図</th></tr>
</thead>
<tbody>
<tr><td>ef	</td><td>514	</td><td>2354	</td><td>4.6	</td><td>76%	</td><td>51%	</td><td>32%	</td><td>13%	</td><td><a href='@assets/svg/ef.all.dot.svg'>svg</a>&nbsp<a href='@assets/svg/ef.all.dot'>dotfile</a>	</td></tr>
<tr><td>jsonDotNet	</td><td>215	</td><td>913	</td><td>4.2	</td><td>69%	</td><td>42%	</td><td>30%	</td><td>14%	</td><td><a href='@assets/svg/jsonDotNet.all.dot.svg'>svg</a>&nbsp<a href='@assets/svg/jsonDotNet.all.dot'>dotfile</a>	</td></tr>
<tr><td>nancy	</td><td>339	</td><td>1132	</td><td>3.3	</td><td>78%	</td><td>41%	</td><td>22%	</td><td>6%	</td><td><a href='@assets/svg/nancy.all.dot.svg'>svg</a>&nbsp<a href='@assets/svg/nancy.all.dot'>dotfile</a>	</td></tr>
<tr><td>cecil	</td><td>240	</td><td>1145	</td><td>4.8	</td><td>73%	</td><td>43%	</td><td>23%	</td><td>13%	</td><td><a href='@assets/svg/cecil.all.dot.svg'>svg</a>&nbsp<a href='@assets/svg/cecil.all.dot'>dotfile</a>	</td></tr>
<tr><td>nuget	</td><td>216	</td><td>833	</td><td>3.9	</td><td>71%	</td><td>43%	</td><td>26%	</td><td>12%	</td><td><a href='@assets/svg/nuget.all.dot.svg'>svg</a>&nbsp<a href='@assets/svg/nuget.all.dot'>dotfile</a>	</td></tr>
<tr><td>signalR	</td><td>192	</td><td>641	</td><td>3.3	</td><td>66%	</td><td>34%	</td><td>19%	</td><td>10%	</td><td><a href='@assets/svg/signalR.all.dot.svg'>svg</a>&nbsp<a href='@assets/svg/signalR.all.dot'>dotfile</a>	</td></tr>
<tr><td>nunit	</td><td>173	</td><td>499	</td><td>2.9	</td><td>75%	</td><td>39%	</td><td>13%	</td><td>4%	</td><td><a href='@assets/svg/nunit.all.dot.svg'>svg</a>&nbsp<a href='@assets/svg/nunit.all.dot'>dotfile</a>	</td></tr>
<tr><td>specFlow	</td><td>242	</td><td>578	</td><td>2.4	</td><td>64%	</td><td>25%	</td><td>17%	</td><td>5%	</td><td><a href='@assets/svg/specFlow.all.dot.svg'>svg</a>&nbsp<a href='@assets/svg/specFlow.all.dot'>dotfile</a>	</td></tr>
<tr><td>elmah	</td><td>116	</td><td>300	</td><td>2.6	</td><td>72%	</td><td>28%	</td><td>22%	</td><td>6%	</td><td><a href='@assets/svg/elmah.all.dot.svg'>svg</a>&nbsp<a href='@assets/svg/elmah.all.dot'>dotfile</a>	</td></tr>
<tr><td>yamlDotNet	</td><td>70	</td><td>228	</td><td>3.3	</td><td>83%	</td><td>30%	</td><td>11%	</td><td>4%	</td><td><a href='@assets/svg/yamlDotNet.all.dot.svg'>svg</a>&nbsp<a href='@assets/svg/yamlDotNet.all.dot'>dotfile</a>	</td></tr>
<tr><td>fparsecCS	</td><td>41	</td><td>64	</td><td>1.6	</td><td>59%	</td><td>29%	</td><td>5%	</td><td>0%	</td><td><a href='@assets/svg/fparsecCS.all.dot.svg'>svg</a>&nbsp<a href='@assets/svg/fparsecCS.all.dot'>dotfile</a>	</td></tr>
<tr><td>moq	</td><td>397	</td><td>1100	</td><td>2.8	</td><td>63%	</td><td>29%	</td><td>17%	</td><td>7%	</td><td><a href='@assets/svg/moq.all.dot.svg'>svg</a>&nbsp<a href='@assets/svg/moq.all.dot'>dotfile</a>	</td></tr>
<tr><td>ndepend	</td><td>734	</td><td>2426	</td><td>3.3	</td><td>67%	</td><td>37%	</td><td>25%	</td><td>10%	</td><td><a href='@assets/svg/ndepend.all.dot.svg'>svg</a>&nbsp<a href='@assets/svg/ndepend.all.dot'>dotfile</a>	</td></tr>
<tr><td>ndependPlat	</td><td>185	</td><td>404	</td><td>2.2	</td><td>67%	</td><td>24%	</td><td>11%	</td><td>4%	</td><td><a href='@assets/svg/ndependPlat.all.dot.svg'>svg</a>&nbsp<a href='@assets/svg/ndependPlat.all.dot'>dotfile</a>	</td></tr>
<tr><td>personalCS	</td><td>195	</td><td>532	</td><td>2.7	</td><td>69%	</td><td>29%	</td><td>19%	</td><td>7%	</td><td>	</td></tr>
<tr><td>合計	</td><td>3869	</td><td>13149	</td><td>3.4	</td><td>70%	</td><td>37%	</td><td>22%	</td><td>9%	</td><td>	</td></tr>

</tbody>
</table>

F#プロジェクトの結果は以下の通りです。

<table class="table table-striped table-condensed">
<thead>
<tr><th>プロジェクト</th><th>トップレベル型</th><th>依存関係の総数</th><th>依存/トップ</th><th>1つ以上の依存</th><th>3つ以上の依存</th><th>5つ以上の依存</th><th>10以上の依存</th><th>図</th></tr>
</thead>
<tbody>
<tr><td>fsxCore	</td><td>173	</td><td>76	</td><td>0.4	</td><td>30%	</td><td>4%	</td><td>1%	</td><td>0%	</td><td><a href='@assets/svg/fsxCore.all.dot.svg'>svg</a>&nbsp<a href='@assets/svg/fsxCore.all.dot'>dotfile</a>	</td></tr>
<tr><td>fsCore	</td><td>154	</td><td>287	</td><td>1.9	</td><td>55%	</td><td>26%	</td><td>14%	</td><td>3%	</td><td><a href='@assets/svg/fsCore.all.dot.svg'>svg</a>&nbsp<a href='@assets/svg/fsCore.all.dot'>dotfile</a>	</td></tr>
<tr><td>fsPowerPack	</td><td>93	</td><td>68	</td><td>0.7	</td><td>38%	</td><td>13%	</td><td>2%	</td><td>0%	</td><td><a href='@assets/svg/fsPowerPack.all.dot.svg'>svg</a>&nbsp<a href='@assets/svg/fsPowerPack.all.dot'>dotfile</a>	</td></tr>
<tr><td>storm	</td><td>67	</td><td>195	</td><td>2.9	</td><td>72%	</td><td>40%	</td><td>18%	</td><td>4%	</td><td><a href='@assets/svg/storm.all.dot.svg'>svg</a>&nbsp<a href='@assets/svg/storm.all.dot'>dotfile</a>	</td></tr>
<tr><td>fParsec	</td><td>8	</td><td>9	</td><td>1.1	</td><td>63%	</td><td>25%	</td><td>0%	</td><td>0%	</td><td><a href='@assets/svg/fParsec.all.dot.svg'>svg</a>&nbsp<a href='@assets/svg/fParsec.all.dot'>dotfile</a>	</td></tr>
<tr><td>websharper	</td><td>52	</td><td>18	</td><td>0.3	</td><td>31%	</td><td>0%	</td><td>0%	</td><td>0%	</td><td><a href='@assets/svg/websharper.all.dot.svg'>svg</a>&nbsp<a href='@assets/svg/websharper.all.dot'>dotfile</a>	</td></tr>
<tr><td>tickSpec	</td><td>34	</td><td>48	</td><td>1.4	</td><td>50%	</td><td>15%	</td><td>9%	</td><td>3%	</td><td><a href='@assets/svg/tickSpec.all.dot.svg'>svg</a>&nbsp<a href='@assets/svg/tickSpec.all.dot'>dotfile</a>	</td></tr>
<tr><td>websharperHtml	</td><td>18	</td><td>37	</td><td>2.1	</td><td>78%	</td><td>39%	</td><td>6%	</td><td>0%	</td><td><a href='@assets/svg/websharperHtml.all.dot.svg'>svg</a>&nbsp<a href='@assets/svg/websharperHtml.all.dot'>dotfile</a>	</td></tr>
<tr><td>canopy	</td><td>6	</td><td>8	</td><td>1.3	</td><td>50%	</td><td>33%	</td><td>0%	</td><td>0%	</td><td><a href='@assets/svg/canopy.all.dot.svg'>svg</a>&nbsp<a href='@assets/svg/canopy.all.dot'>dotfile</a>	</td></tr>
<tr><td>fsYaml	</td><td>7	</td><td>10	</td><td>1.4	</td><td>71%	</td><td>14%	</td><td>0%	</td><td>0%	</td><td><a href='@assets/svg/fsYaml.all.dot.svg'>svg</a>&nbsp<a href='@assets/svg/fsYaml.all.dot'>dotfile</a>	</td></tr>
<tr><td>fsSql	</td><td>13	</td><td>14	</td><td>1.1	</td><td>54%	</td><td>8%	</td><td>8%	</td><td>0%	</td><td><a href='@assets/svg/fsSql.all.dot.svg'>svg</a>&nbsp<a href='@assets/svg/fsSql.all.dot'>dotfile</a>	</td></tr>
<tr><td>fsUnit	</td><td>2	</td><td>0	</td><td>0.0	</td><td>0%	</td><td>0%	</td><td>0%	</td><td>0%	</td><td><a href='@assets/svg/fsUnit.all.dot.svg'>svg</a>&nbsp<a href='@assets/svg/fsUnit.all.dot'>dotfile</a>	</td></tr>
<tr><td>foq	</td><td>35	</td><td>66	</td><td>1.9	</td><td>66%	</td><td>29%	</td><td>11%	</td><td>0%	</td><td><a href='@assets/svg/foq.all.dot.svg'>svg</a>&nbsp<a href='@assets/svg/foq.all.dot'>dotfile</a>	</td></tr>
<tr><td>personalFS	</td><td>30	</td><td>111	</td><td>3.7	</td><td>93%	</td><td>60%	</td><td>27%	</td><td>7%	</td><td></td></tr>
<tr><td>合計	</td><td>692	</td><td>947	</td><td>1.4	</td><td>49%	</td><td>19%	</td><td>8%	</td><td>1%	</td><td>	</td></tr>

</tbody>
</table>
     
各列の説明。

* **トップレベル型**は、前述の通りアセンブリ内のトップレベル型の総数です。
* **依存関係の総数**はトップレベル型間の依存関係の総数です。
* **依存/トップ**はトップレベル型/モジュールあたりの依存関係の数です。これは平均的なトップレベル型/モジュールが持つ依存関係の数を示す指標です。
* **1つ以上の依存**は、1つ以上の他のトップレベル型に依存するトップレベル型の数です。
* **3つ以上の依存**。上記と同様ですが、3つ以上の他のトップレベル型に依存する場合です。
* **5つ以上の依存**。上記と同様です。
* **10以上の依存**。上記と同様です。この数の依存関係を持つトップレベル型は、理解や保守が難しくなります。これはプロジェクトの複雑さを示す指標です。

**図**列には、依存関係から生成されたSVGファイルへのリンクと、SVGの生成に使用された[DOTファイル](https://www.graphviz.org/)へのリンクが含まれています。
これらの図については後ほど説明します。
(私のアプリケーションの内部を公開することはできないので、指標のみを提示します)


### 分析

これらの結果は非常に興味深いものです。C#では、プロジェクトサイズが大きくなるにつれて依存関係の総数が増加します。平均して、各トップレベル型は他の3〜4の型に依存しています。

一方、F#プロジェクトの依存関係の総数は、プロジェクトサイズにあまり左右されないようです。各F#モジュールは平均して1〜2の他のモジュールにしか依存していません。
最大のプロジェクト（FSharpX）は、多くの小さなプロジェクトよりも低い比率を示しています。私のビジネスアプリケーションとStormプロジェクトだけが例外です。

以下は、コードサイズと依存関係の数の関係を示すグラフです。

![](@assets/img/Metrics_CodeSize_Dependencies.png)

C#プロジェクトとF#プロジェクトの違いが非常に明確です。C#の依存関係はプロジェクトサイズに比例して線形に増加しているようです。一方、F#の依存関係は平坦なようです。

### 依存関係の分布

トップレベル型あたりの平均依存関係数は興味深いですが、ばらつきを理解するには十分ではありません。多くの依存関係を持つモジュールがたくさんあるのでしょうか？それとも、各モジュールは少数の依存関係しか持たないのでしょうか？

これは保守性に影響を与える可能性があります。おそらく、1つか2つの依存関係しか持たないモジュールの方が、10個以上の依存関係を持つモジュールよりも、アプリケーションの文脈で理解しやすいでしょう。

洗練された統計分析を行う代わりに、シンプルに保ち、1つ以上の依存関係を持つトップレベル型の数、3つ以上の依存関係を持つトップレベル型の数、などを単純にカウントすることにしました。

以下は、同じ結果を視覚的に表示したものです。

![](@assets/img/Metrics_CS_DependencyPercent.png)

![](@assets/img/Metrics_FS_DependencyPercent.png)


これらの数字から何が推測できるでしょうか？

* まず、F#プロジェクトでは、モジュールの半分以上が外部依存関係を*全く*持っていません。これは少し驚きですが、C#プロジェクトと比べてジェネリクスを多用しているためだと考えられます。

* 次に、F#プロジェクトのモジュールは、C#プロジェクトのクラスと比べて一貫して依存関係が少ないです。

* 最後に、F#プロジェクトでは、多数の依存関係を持つモジュールはかなりまれで、全体の2%未満です。一方、C#プロジェクトでは、9%のクラスが10個以上の他のクラスへの依存関係を持っています。

F#グループで最も悪い例は、私自身のF#アプリケーションで、これらの指標に関しては私のC#アプリケーションよりも悪い結果となっています。
これは、ドメイン固有の型の形で非ジェネリックを多用しているためかもしれませんし、単にコードがさらなるリファクタリングを必要としているだけかもしれません！

### 依存関係の図

ここで依存関係の図を見てみるのも有用かもしれません。これらはSVGファイルなので、ブラウザで表示できるはずです。

ほとんどの図が非常に大きいことに注意してください。開いた後、全体を見るためには大きくズームアウトする必要があります！

まずは[SpecFlow](..@assets/svg/specFlow.all.dot.svg)と[TickSpec](..@assets/svg/tickSpec.all.dot.svg)の図を比較してみましょう。

SpecFlowの図はこちらです。

[![](@assets/img/specflow_svg.png)](..@assets/svg/specFlow.all.dot.svg)

TickSpecの図はこちらです。

[![](@assets/img/tickspec_svg.png)](..@assets/svg/tickSpec.all.dot.svg)

各図は、プロジェクト内で見つかったすべてのトップレベル型をリストアップしています。ある型から別の型への依存関係がある場合、矢印で示されています。
可能な限り依存関係は左から右に向かって示されているので、右から左に向かう矢印は循環依存があることを意味します。

レイアウトはグラフビズによって自動的に行われていますが、一般的に型は列または「ランク」に整理されています。たとえば、SpecFlowの図には12のランクがあり、TickSpecの図には5つのランクがあります。

ご覧の通り、典型的な依存関係の図には通常、多くの入り組んだ線があります！図の複雑さは、コードの複雑さを視覚的に表現しているようなものです。
たとえば、SpecFlowプロジェクトの保守を任された場合、クラス間のすべての関係を理解するまでは本当に安心できないでしょう。そしてプロジェクトが複雑なほど、理解するのに時間がかかります。

### オブジェクト指向設計 vs 関数型設計の違いが明らかに？

TickSpecの図はSpecFlowのものよりもはるかに単純です。これはTickSpecがSpecFlowほど多くの機能を持っていないからでしょうか？

答えは違います。機能の数とは全く関係がないと思います。むしろコードの組織化方法が異なるからです。

SpecFlowのクラス（[dotfile](..@assets/svg/specFlow.all.dot)）を見ると、インターフェースを作成することで優れたオブジェクト指向設計とTDDの実践に従っていることがわかります。
たとえば、`TestRunnerManager`と`ITestRunnerManager`があります。
また、オブジェクト指向設計でよく見られる他のパターンもたくさんあります。「リスナー」クラスとインターフェース、「プロバイダー」クラスとインターフェース、「コンパレーター」クラスとインターフェースなどです。

一方、TickSpecのモジュール（[dotfile](..@assets/svg/tickSpec.all.dot)）を見ると、インターフェースは全くありません。また、「リスナー」や「プロバイダー」、「コンパレーター」もありません。
コード内でそのようなものが必要な場合もあるかもしれませんが、モジュールの外部には公開されていないか、より可能性が高いのは、その役割が型ではなく関数によって果たされているのでしょう。

ちなみに、SpecFlowのコードを批判しているわけではありません。よく設計されているように見えますし、非常に有用なライブラリです。ただ、オブジェクト指向設計と関数型設計の違いをいくつか浮き彫りにしていると思います。

### MoqとFoqの比較

[Moq](..@assets/svg/moq.all.dot.svg)と[Foq](..@assets/svg/foq.all.dot.svg)の図も比較してみましょう。これら2つのプロジェクトはほぼ同じことを行っているので、コードは比較可能なはずです。

前と同様に、F#で書かれたプロジェクトの方が依存関係の図がはるかに小さくなっています。

Moqのクラス（[dotfile](..@assets/svg/moq.all.dot)）を見ると、分析から除外しなかった「Castle」ライブラリが含まれていることがわかります。
依存関係を持つ249のクラスのうち、Moq固有のものは66だけです。Moq名前空間内のクラスのみを考慮していれば、もっときれいな図が得られたかもしれません。

一方、Foqのモジュール（[dotfile](..@assets/svg/foq.all.dot)）を見ると、依存関係を持つモジュールは23しかなく、Moqのクラスだけでもそれより少ないです。

つまり、F#のコード組織化には何か大きな違いがあるのです。

### FParsecとFParsecCSの比較

FParsecプロジェクトは興味深い自然実験です。このプロジェクトには2つのアセンブリがあり、サイズはほぼ同じですが、1つはC#で書かれ、もう1つはF#で書かれています。

C#コードは高速な解析のために設計されており、F#コードはよりハイレベルなので、直接比較するのは少し不公平かもしれません。しかし...不公平を承知で比較してみましょう！

F#アセンブリの["FParsec"](..@assets/svg/fParsec.all.dot.svg)とC#アセンブリの["FParsecCS"](..@assets/svg/fparsecCS.all.dot.svg)の図がこちらです。

どちらもきれいで明確です。素晴らしいコードですね！

図からは明確ではありませんが、私の分析方法がC#アセンブリに不利に働いています。

たとえば、C#の図を見ると、`Operator`、`OperatorType`、`InfixOperator`などの間に依存関係があることがわかります。
しかし実際には、ソースコードを見るとこれらのクラスはすべて同じ物理ファイルにあります。
F#では、これらはすべて同じモジュールにあり、その関係は公開依存関係としてカウントされません。つまり、C#コードは不利な扱いを受けているのです。

それでも、ソースコードを見ると、C#コードは20のソースファイルがあるのに対し、F#は8つしかないので、複雑さに違いがあることは確かです。

### 何を依存関係とみなすか？

ただし、私の方法を擁護すると、これらのFParsec C#クラスを同じファイルにまとめているのは優れたコーディング実践だけであり、C#コンパイラによって強制されているわけではありません。
別の保守担当者が来て、知らずに異なるファイルに分離してしまうかもしれません。そうすると本当に複雑さが増してしまいます。F#ではそれほど簡単にはできませんし、少なくとも偶然にはできません。

つまり、「モジュール」と「依存関係」の定義によります。私の見方では、モジュールには本当に「密接に結びついた」もので、簡単に切り離すべきではないものが含まれます。
したがって、モジュール内の依存関係はカウントせず、モジュール間の依存関係はカウントします。

別の見方をすれば、F#は一部の領域（モジュール）で高い結合を奨励する代わりに、他の領域では低い結合を実現しています。C#では、利用可能な厳密な結合の唯一の種類はクラスベースです。
名前空間の使用など、それよりも緩い結合は、優れた実践やNDependのようなツールを使用して強制する必要があります。

F#のアプローチが良いか悪いかは好みの問題です。結果として、特定の種類のリファクタリングが難しくなる可能性があります。

## 循環依存

最後に、あの忌まわしい循環依存に目を向けましょう。（なぜそれらが悪いのかについては、[この記事](../posts/cyclic-dependencies.html)を読んでください）

C#プロジェクトの循環依存の結果は以下の通りです。


<table class="table table-striped table-condensed">
<thead>
<tr><th>プロジェクト</th><th>トップレベル型</th><th>サイクル数</th><th>参加</th><th>参加%</th><th>最大成分サイズ</th><th>サイクル数（公開）</th><th>参加（公開）</th><th>参加%（公開）</th><th>最大成分サイズ（公開）</th><th>図</th></tr>
</thead>
<tbody>
<tr><td>ef	</td><td>514	</td><td>14	</td><td>123	</td><td>24%	</td><td>79	</td><td>1	</td><td>7	</td><td>1%	</td><td>7	</td><td><a href='@assets/svg/ef.all.cycles.dot.svg'>svg</a>&nbsp<a href='@assets/svg/ef.all.cycles.dot'>dotfile</a>	</td></tr>
<tr><td>jsonDotNet	</td><td>215	</td><td>3	</td><td>88	</td><td>41%	</td><td>83	</td><td>1	</td><td>11	</td><td>5%	</td><td>11	</td><td><a href='@assets/svg/jsonDotNet.all.cycles.dot.svg'>svg</a>&nbsp<a href='@assets/svg/jsonDotNet.all.cycles.dot'>dotfile</a>	</td></tr>
<tr><td>nancy	</td><td>339	</td><td>6	</td><td>35	</td><td>10%	</td><td>21	</td><td>2	</td><td>4	</td><td>1%	</td><td>2	</td><td><a href='@assets/svg/nancy.all.cycles.dot.svg'>svg</a>&nbsp<a href='@assets/svg/nancy.all.cycles.dot'>dotfile</a>	</td></tr>
<tr><td>cecil	</td><td>240	</td><td>2	</td><td>125	</td><td>52%	</td><td>123	</td><td>1	</td><td>50	</td><td>21%	</td><td>50	</td><td><a href='@assets/svg/cecil.all.cycles.dot.svg'>svg</a>&nbsp<a href='@assets/svg/cecil.all.cycles.dot'>dotfile</a>	</td></tr>
<tr><td>nuget	</td><td>216	</td><td>4	</td><td>24	</td><td>11%	</td><td>10	</td><td>0	</td><td>0	</td><td>0%	</td><td>1	</td><td><a href='@assets/svg/nuget.all.cycles.dot.svg'>svg</a>&nbsp<a href='@assets/svg/nuget.all.cycles.dot'>dotfile</a>	</td></tr>
<tr><td>signalR	</td><td>192	</td><td>3	</td><td>14	</td><td>7%	</td><td>7	</td><td>1	</td><td>5	</td><td>3%	</td><td>5	</td><td><a href='@assets/svg/signalR.all.cycles.dot.svg'>svg</a>&nbsp<a href='@assets/svg/signalR.all.cycles.dot'>dotfile</a>	</td></tr>
<tr><td>nunit	</td><td>173	</td><td>2	</td><td>80	</td><td>46%	</td><td>78	</td><td>1	</td><td>48	</td><td>28%	</td><td>48	</td><td><a href='@assets/svg/nunit.all.cycles.dot.svg'>svg</a>&nbsp<a href='@assets/svg/nunit.all.cycles.dot'>dotfile</a>	</td></tr>
<tr><td>specFlow	</td><td>242	</td><td>5	</td><td>11	</td><td>5%	</td><td>3	</td><td>1	</td><td>2	</td><td>1%	</td><td>2	</td><td><a href='@assets/svg/specFlow.all.cycles.dot.svg'>svg</a>&nbsp<a href='@assets/svg/specFlow.all.cycles.dot'>dotfile</a>	</td></tr>
<tr><td>elmah	</td><td>116	</td><td>2	</td><td>9	</td><td>8%	</td><td>5	</td><td>1	</td><td>2	</td><td>2%	</td><td>2	</td><td><a href='@assets/svg/elmah.all.cycles.dot.svg'>svg</a>&nbsp<a href='@assets/svg/elmah.all.cycles.dot'>dotfile</a>	</td></tr>
<tr><td>yamlDotNet	</td><td>70	</td><td>0	</td><td>0	</td><td>0%	</td><td>1	</td><td>0	</td><td>0	</td><td>0%	</td><td>1	</td><td><a href='@assets/svg/yamlDotNet.all.cycles.dot.svg'>svg</a>&nbsp<a href='@assets/svg/yamlDotNet.all.cycles.dot'>dotfile</a>	</td></tr>
<tr><td>fparsecCS	</td><td>41	</td><td>3	</td><td>6	</td><td>15%	</td><td>2	</td><td>1	</td><td>2	</td><td>5%	</td><td>2	</td><td><a href='@assets/svg/fparsecCS.all.cycles.dot.svg'>svg</a>&nbsp<a href='@assets/svg/fparsecCS.all.cycles.dot'>dotfile</a>	</td></tr>
<tr><td>moq	</td><td>397	</td><td>9	</td><td>50	</td><td>13%	</td><td>15	</td><td>0	</td><td>0	</td><td>0%	</td><td>1	</td><td><a href='@assets/svg/moq.all.cycles.dot.svg'>svg</a>&nbsp<a href='@assets/svg/moq.all.cycles.dot'>dotfile</a>	</td></tr>
<tr><td>ndepend	</td><td>734	</td><td>12	</td><td>79	</td><td>11%	</td><td>22	</td><td>8	</td><td>36	</td><td>5%	</td><td>7	</td><td><a href='@assets/svg/ndepend.all.cycles.dot.svg'>svg</a>&nbsp<a href='@assets/svg/ndepend.all.cycles.dot'>dotfile</a>	</td></tr>
<tr><td>ndependPlat	</td><td>185	</td><td>2	</td><td>5	</td><td>3%	</td><td>3	</td><td>0	</td><td>0	</td><td>0%	</td><td>1	</td><td><a href='@assets/svg/ndependPlat.all.cycles.dot.svg'>svg</a>&nbsp<a href='@assets/svg/ndependPlat.all.cycles.dot'>dotfile</a>	</td></tr>
<tr><td>personalCS	</td><td>195	</td><td>11	</td><td>34	</td><td>17%	</td><td>8	</td><td>5	</td><td>19	</td><td>10%	</td><td>7	</td><td><a href='@assets/svg/personalCS.all.cycles.dot.svg'>svg</a>&nbsp<a href='@assets/svg/personalCS.all.cycles.dot'>dotfile</a>	</td></tr>
<tr><td>合計	</td><td>3869	</td><td>	</td><td>683	</td><td>18%	</td><td>	</td><td>	</td><td>186	</td><td>5%	</td><td>	</td><td><a href='@assets/svg/TOTAL.all.cycles.dot.svg'>svg</a>&nbsp<a href='@assets/svg/TOTAL.all.cycles.dot'>dotfile</a>	</td></tr>

</tbody>                                                     
</table>

F#プロジェクトの結果は以下の通りです。

<table class="table table-striped table-condensed">
<thead>
<tr><th>プロジェクト</th><th>トップレベル型</th><th>サイクル数</th><th>参加</th><th>参加%</th><th>最大成分サイズ</th><th>サイクル数（公開）</th><th>参加（公開）</th><th>参加%（公開）</th><th>最大成分サイズ（公開）</th><th>図</th></tr>
</thead>
<tbody>
<tr><td>fsxCore	</td><td>173	</td><td>0	</td><td>0	</td><td>0%	</td><td>1	</td><td>0	</td><td>0	</td><td>0%	</td><td>1	</td><td>.	</td></tr>
<tr><td>fsCore	</td><td>154	</td><td>2	</td><td>5	</td><td>3%	</td><td>3	</td><td>0	</td><td>0	</td><td>0%	</td><td>1	</td><td><a href='@assets/svg/fsCore.all.cycles.dot.svg'>svg</a>&nbsp<a href='@assets/svg/fsCore.all.cycles.dot'>dotfile</a>	</td></tr>
<tr><td>fsPowerPack	</td><td>93	</td><td>1	</td><td>2	</td><td>2%	</td><td>2	</td><td>0	</td><td>0	</td><td>0%	</td><td>1	</td><td><a href='@assets/svg/fsPowerPack.all.cycles.dot.svg'>svg</a>&nbsp<a href='@assets/svg/fsPowerPack.all.cycles.dot'>dotfile</a>	</td></tr>
<tr><td>storm	</td><td>67	</td><td>0	</td><td>0	</td><td>0%	</td><td>1	</td><td>0	</td><td>0	</td><td>0%	</td><td>1	</td><td>.	</td></tr>
<tr><td>fParsec	</td><td>8	</td><td>0	</td><td>0	</td><td>0%	</td><td>1	</td><td>0	</td><td>0	</td><td>0%	</td><td>1	</td><td>.	</td></tr>
<tr><td>websharper	</td><td>52	</td><td>0	</td><td>0	</td><td>0%	</td><td>1	</td><td>0	</td><td>0	</td><td>0%	</td><td>0	</td><td>.	</td></tr>
<tr><td>tickSpec	</td><td>34	</td><td>0	</td><td>0	</td><td>0%	</td><td>1	</td><td>0	</td><td>0	</td><td>0%	</td><td>1	</td><td>.	</td></tr>
<tr><td>websharperHtml	</td><td>18	</td><td>0	</td><td>0	</td><td>0%	</td><td>1	</td><td>0	</td><td>0	</td><td>0%	</td><td>1	</td><td>.	</td></tr>
<tr><td>canopy	</td><td>6	</td><td>0	</td><td>0	</td><td>0%	</td><td>1	</td><td>0	</td><td>0	</td><td>0%	</td><td>1	</td><td>.	</td></tr>
<tr><td>fsYaml	</td><td>7	</td><td>0	</td><td>0	</td><td>0%	</td><td>1	</td><td>0	</td><td>0	</td><td>0%	</td><td>1	</td><td>.	</td></tr>
<tr><td>fsSql	</td><td>13	</td><td>0	</td><td>0	</td><td>0%	</td><td>1	</td><td>0	</td><td>0	</td><td>0%	</td><td>1	</td><td>.	</td></tr>
<tr><td>fsUnit	</td><td>2	</td><td>0	</td><td>0	</td><td>0%	</td><td>0	</td><td>0	</td><td>0	</td><td>0%	</td><td>0	</td><td>.	</td></tr>
<tr><td>foq	</td><td>35	</td><td>0	</td><td>0	</td><td>0%	</td><td>1	</td><td>0	</td><td>0	</td><td>0%	</td><td>1	</td><td>.	</td></tr>
<tr><td>personalFS	</td><td>30	</td><td>0	</td><td>0	</td><td>0%	</td><td>1	</td><td>0	</td><td>0	</td><td>0%	</td><td>1	</td><td>.	</td></tr>
<tr><td>合計	</td><td>692	</td><td>	</td><td>7	</td><td>1%	</td><td>	</td><td>	</td><td>0	</td><td>0%	</td><td>	</td><td>.	</td></tr>
</tbody>
</table>

各列の説明。

* **トップレベル型**は、前述の通りアセンブリ内のトップレベル型の総数です。
* **サイクル数**は全体のサイクルの数です。理想的にはゼロになるはずです。しかし、数が多いからといって必ずしも悪いわけではありません。1つの巨大なサイクルよりも10個の小さなサイクルの方が良いと私は考えます。
* **参加**。サイクルに参加しているトップレベル型の数です。
* **参加%**。サイクルに参加しているトップレベル型の数を、全型に対する割合で表したものです。
* **最大成分サイズ**は最大の循環成分内のトップレベル型の数です。これはサイクルの複雑さを示す指標です。互いに依存する型が2つだけなら、123の型が互いに依存する場合に比べてサイクルははるかに単純です。
* **...（公開）**列は同じ定義ですが、公開依存関係のみを使用しています。公開依存関係のみに分析を限定するとどのような効果があるか見てみるのも興味深いと思いました。
* **図**列にはサイクルの依存関係のみから生成されたSVGファイルへのリンクと、SVGの生成に使用された[DOTファイル](https://www.graphviz.org/)へのリンクが含まれています。以下で分析します。

### 分析

F#コードでサイクルを探そうとしても、がっかりするでしょう。F#プロジェクトでサイクルがあるのは2つだけで、それも非常に小さなものです。たとえば、FSharp.Coreでは、同じファイル内の隣接する2つの型の間に相互依存がありますが、これは[ここ](https://github.com/fsharp/fsharp/blob/master/src/fsharp/FSharp.Core/quotations.fs#L146)で見ることができます。

一方、ほぼすべてのC#プロジェクトに1つ以上のサイクルがあります。Entity Frameworkが最も多くのサイクルを持ち、クラスの24%が関与しています。Cecilが最悪の参加率で、
クラスの半分以上がサイクルに関与しています。

NDependでさえサイクルがありますが、公平を期すために言えば、これには正当な理由があるかもしれません。まず、NDependはクラス間ではなく名前空間間のサイクル除去に重点を置いています。また、
サイクルが同じソースファイルで宣言された型の間にある可能性があります。その結果、私の方法では良く組織化されたC#コードに対してやや不利に働く可能性があります（上記のFParsec vs FParsecCSの議論で述べたように）。

![](@assets/img/Metrics_TopLevel_Participation.png)

なぜC#とF#でこのような違いがあるのでしょうか？

* C#では、サイクルの作成を妨げるものは何もありません - これは偶発的な複雑さの完璧な例です。実際、それらを避けるには[特別な努力](https://softwareengineering.stackexchange.com/questions/60549/how-strictly-do-you-follow-the-no-dependency-cycle-rule-ndepend)が必要です。
* F#では、もちろん逆です。サイクルを簡単に作ることはできません。

## 私のビジネスアプリケーションの比較

もう1つの比較をしてみましょう。私の日常業務の一部として、C#で多数のビジネスアプリケーションを書き、最近ではF#でも書いています。
ここにリストされている他のプロジェクトとは異なり、これらは特定のビジネスニーズに焦点を当てたもので、ドメイン固有のコード、カスタムビジネスルール、特別なケースなどがたくさんあります。

両プロジェクトは締め切りのプレッシャーの下で作られ、要件の変更や理想的なコードを書くことを妨げる通常の現実世界の制約のもとで作られました。私の立場にいる多くの開発者と同様に、
整理してリファクタリングする機会があればいいのですが、ビジネスは満足していて、新しいことに取り組まなければならないのです。

ともかく、これらを比較してみましょう。コードの詳細は指標以外は明かせませんが、それでも十分有用だと思います。

まずC#プロジェクトから見てみましょう。

* トップレベル型が195個あり、コード約2Kにつき1つです。他のC#プロジェクトと比較すると、これよりもはるかに多くのトップレベル型があるはずです。そして実際、そうだと分かっています。
  多くのプロジェクト（このプロジェクトは6年前のものです）と同様に、特に締め切りが迫っている中では、リファクタリングよりも既存のクラスにメソッドを追加する方がリスクが低いのです。
  古いコードを安定させることは、美しくすることよりも常に優先順位が高いのです！結果として、時間とともにクラスが大きくなりすぎてしまいます。
* クラスが大きいことの裏返しとして、クラス間の依存関係は少なくなっています！C#プロジェクトの中でも比較的良いスコアを示しています。
  これは、依存関係だけが指標ではないことを示しています。バランスが必要です。
* 循環依存に関しては、C#プロジェクトとしては典型的です。いくつか（11個）ありますが、最大のものでも8つのクラスしか含んでいません。

次に、私のF#プロジェクトを見てみましょう。

* 30のモジュールがあり、コード約4Kにつき1つです。他のF#プロジェクトと比較すると、過剰ではありませんが、リファクタリングの余地はあるかもしれません。
  * 余談ですが、このコードを保守した経験から、C#コードとは異なり、機能要求が来たときに既存のモジュールに無理にコードを追加する必要を感じないことに気づきました。
  むしろ、多くの場合、新しい機能のためのコードをすべて*新しい*モジュールに入れる方が速くリスクが低いことがわかりました。
  モジュールには状態がないため、関数はどこにでも存在できます - 同じクラスに存在する必要はありません。
  時間が経つとこのアプローチも問題を引き起こす可能性がありますが（COBOLを思い出す人もいるかもしれません）、今のところ、新鮮な空気のように感じています。
* 指標を見ると、モジュールあたりの「作成された」型の数が異常に多いことがわかります（4.9）。前述のように、これはDDDスタイルの細かい設計の結果だと思います。
  作成された型あたりのコード量は他のF#プロジェクトと同程度なので、サイズが大きすぎたり小さすぎたりすることはないようです。
* また、前に述べたように、モジュール間の依存関係はF#プロジェクトの中で最悪です。他のほぼすべてのモジュールに依存するいくつかのAPI/サービス関数があることは知っていますが、これは
  リファクタリングが必要かもしれないという手がかりかもしれません。
  * しかし、C#コードとは異なり、これらの問題のあるモジュールがどこにあるかを正確に知っています。これらのモジュールがすべてアプリケーションの最上位層にあり、Visual Studioのモジュールリストの一番下に表示されることをほぼ確信できます。
  どうしてそんなに確信できるのでしょうか？なぜなら...
* 循環依存に関しては、F#プロジェクトとしては典型的です。つまり、まったくありません。


## まとめ

この分析は好奇心から始まりました - C#とF#プロジェクトの組織に意味のある違いはあるのでしょうか？

結果がこれほど明確だったことに驚きました。これらの指標を見れば、どの言語でアセンブリが書かれたかを確実に予測できるでしょう。

* **プロジェクトの複雑さ**。同じ命令数に対して、C#プロジェクトはF#プロジェクトよりもはるかに多くのトップレベル型（したがってファイル）を持つ傾向があります - 2倍以上のようです。
* **細かい粒度の型**。同じ数のモジュールに対して、C#プロジェクトはF#プロジェクトよりも作成された型が少ない傾向があり、型の粒度がF#ほど細かくない可能性があります。
* **依存関係**。C#プロジェクトでは、クラス間の依存関係の数がプロジェクトのサイズに比例して線形に増加します。F#プロジェクトでは、依存関係の数ははるかに少なく、比較的一定です。
* **サイクル**。C#プロジェクトでは、注意を払わないとサイクルが簡単に発生します。F#プロジェクトでは、サイクルは非常にまれで、存在しても非常に小さいです。

おそらく、これは言語の違いというよりも、プログラマーの能力の違いによるものではないでしょうか？
まず、全体的にC#プロジェクトの品質はかなり良いと思います - 私がより良いコードを書けるとは決して言えません！
そして、特に2つのケースでは、C#とF#のプロジェクトは同じ人物によって書かれたものですが、それでも違いが見られたので、このような議論は当てはまらないと思います。

## 今後の課題

*単に*バイナリを使用するこのアプローチは、限界に達しているかもしれません。より正確な分析を行うには、ソースコードからの指標も使用する必要があるでしょう（あるいはpdbファイルかもしれません）。

たとえば、「型あたりの命令数」が高いという指標は、ソースファイルが小さい（簡潔なコード）場合は良いことですが、大きい（膨れ上がったクラス）場合は良くありません。同様に、私のモジュール性の定義では、
ソースファイルではなくトップレベル型を使用したため、F#よりもC#にやや不利に働きました。

したがって、この分析が完璧だとは主張しません（そして分析コードにひどいミスをしていないことを願っています！）が、さらなる調査の有用な出発点になると思います。

<hr>

## 2013-06-15更新

この投稿はかなりの関心を集めました。フィードバックに基づいて、以下の変更を加えました。

**プロファイルされたアセンブリ**

* FoqとMoqを追加しました（Phil Trelfordのリクエストにより）。
* FParsecのC#コンポーネントを追加しました（Dave Thomasほかのリクエストにより）。
* 2つのNDependアセンブリを追加しました。
* 私自身のプロジェクト2つ（C#とF#）を追加しました。

ご覧の通り、7つの新しいデータポイント（C#プロジェクト5つとF#プロジェクト2つ）を追加しても、全体的な分析結果は変わりませんでした。

**アルゴリズムの変更**

* 「作成された」型の定義をより厳密にしました。「GeneratedCodeAttribute」を持つ型とF#の合計型のサブタイプを除外しました。これはF#プロジェクトに影響を与え、「作成/トップ」比率をやや減少させました。

**テキストの変更**

* 分析の一部を書き直しました。
* YamlDotNetとFParsecの不公平な比較を削除しました。
* FParsecのC#コンポーネントとF#コンポーネントの比較を追加しました。
* MoqとFoqの比較を追加しました。
* 私自身の2つのプロジェクトの比較を追加しました。

オリジナルの投稿は[こちら](https://fsharpforfunandprofit.com/archives/cycles-and-modularity-in-the-wild_20130614.html)でまだ見ることができます。




