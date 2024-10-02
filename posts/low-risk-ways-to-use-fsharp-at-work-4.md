---
layout: post
title: "データベース関連タスクにF#を使う"
description: "仕事でF#を使う26の低リスクな方法（パート4）"
categories: []
seriesId: "仕事でF#を低リスクで使う方法"
seriesOrder: 4

---

この投稿は、[仕事でF#を低リスクかつ段階的に使う方法](../posts/low-risk-ways-to-use-fsharp-at-work.md)に関する前回のシリーズの続きです。

今回は、データベース関連のタスクにおいてF#が予想外に役立つ方法を見ていきます。

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

## パート4. データベース関連のタスクにF#を使う

次のグループの提案は、すべてデータベース、特にMS SQL Serverとの作業に関するものです。

リレーショナルデータベースはほとんどのアプリケーションにとって重要な部分ですが、ほとんどのチームは他の開発タスクと同じ方法でこれらの管理にアプローチしていません。

たとえば、ストアドプロシージャの単体テストを行っているチームをいくつ知っていますか？

またはETLジョブのテストは？

または、ソース管理に保存されている非SQLスクリプト言語を使ってT-SQL管理スクリプトやその他の定型文を生成していますか？

ここで、F#は他のスクリプト言語、さらにはT-SQL自体よりも輝くことができます。

* F#のデータベース型プロバイダーは、テストと管理のための簡単で短いスクリプトを作成する力を与えます。さらに...
* スクリプトは*型チェック*され、データベーススキーマが変更された場合はコンパイル時に失敗します。これは...
* このプロセス全体がビルドと継続的インテグレーションプロセスとうまく連携することを意味し、結果として...
* データベース関連のコードに非常に高い信頼性を持つことができます！

私が言っていることを示すためにいくつかの例を見てみましょう：

* ストアドプロシージャの単体テスト
* FsCheckを使ったランダムなレコードの生成
* F#を使った簡単なETL
* SQL Agentスクリプトの生成

### セットアップ

このセクションのコードは[githubで入手可能](https://github.com/swlaschin/low-risk-ways-to-use-fsharp-at-work/tree/master/SqlInFsharp)です。
そこには、これらの例で使用するサンプルデータベース、テーブル、ストアドプロシージャを作成するためのいくつかのSQLスクリプトがあります。

したがって、これらの例を実行するには、ローカルまたはアクセス可能な場所でSQL ExpressまたはSQL Serverを実行し、関連するセットアップスクリプトを実行済みである必要があります。

### どの型プロバイダーを使うべきか？

F#用にいくつかのSQL型プロバイダーがあります - [fsharp.orgのデータアクセスページ](https://fsharp.org/guides/data-access/)を参照してください。これらの例では、
`FSharp.Data.TypeProviders` DLLの一部である[`SqlDataConnection`型プロバイダー](https://learn.microsoft.com/ja-jp/dotnet/fsharp/tutorials/type-providers/)を使います。
これは裏で[SqlMetal](https://learn.microsoft.com/ja-jp/dotnet/framework/tools/sqlmetal-exe-code-generation-tool)を使っているため、SQL Serverデータベースでのみ動作します。

[SQLProvider](https://fsprojects.github.io/SQLProvider/)プロジェクトも良い選択肢です - MySql、SQLite、その他の非Microsoftデータベースをサポートしています。

<a name="sql-linqpad"></a>
## 18. F#を使ってLINQPadを置き換える

*このセクションのコードは[githubで入手可能](https://github.com/swlaschin/low-risk-ways-to-use-fsharp-at-work/tree/master/SqlInFsharpFsharpInsteadOfLinqpad.fsx)です。*

[LINQPad](https://www.linqpad.net/)はデータベースに対するクエリを行うための優れたツールであり、また一般的なC#/VB/F#コードのスクラッチパッドでもあります。

F#インタラクティブを使って、LINQPadと同様の多くのことを行うことができます - クエリ、オートコンプリートなどが、LINQPadと同じように利用できます。

たとえば、以下は特定のメールドメインを持つ顧客の数を数えるものです。

```fsharp
[<Literal>]
let connectionString = "Data Source=localhost; Initial Catalog=SqlInFsharp; Integrated Security=True;"

type Sql = SqlDataConnection<connectionString>
let db = Sql.GetDataContext()

// gmailドメインを持つ顧客の数を見つける
query {
    for c in db.Customer do
    where (c.Email.EndsWith("gmail.com"))
    select c
    count
    }
```

生成されたSQLコードを見たい場合は、もちろんログを有効にできます：

```fsharp
// オプション、ログを有効にする
db.DataContext.Log <- Console.Out
```

このクエリのログ出力は以下の通りです：

```text
SELECT COUNT(*) AS [value]
FROM [dbo].[Customer] AS [t0]
WHERE [t0].[Email] LIKE @p0
-- @p0: Input VarChar (Size = 8000; Prec = 0; Scale = 0) [%gmail.com]
```

サブクエリを使うなど、より複雑なこともできます。以下は[Microsoft Learn](https://learn.microsoft.com/ja-jp/dotnet/fsharp/language-reference/query-expressions)からの例です：

関数型アプローチにふさわしく、クエリは素晴らしく合成可能であることに注意してください。

```fsharp
// 少なくとも1つのコースに登録した学生を見つける
query {
    for student in db.Student do
    where (query { for courseSelection in db.CourseSelection do
                   exists (courseSelection.StudentID = student.StudentID) })
    select student
}
```

そして、SQLエンジンが正規表現などの特定の関数をサポートしていない場合、データのサイズがあまり大きくないと仮定すると、
データをストリームアウトしてF#で処理を行うことができます。

```fsharp
// 各10年代に生まれた人々の最も人気のあるドメインを見つける
let getDomain email =
    Regex.Match(email,".*@(.*)").Groups.[1].Value

let getDecade (birthdate:Nullable<DateTime>) =
    if birthdate.HasValue then
        birthdate.Value.Year / 10  * 10 |> Some
    else
        None

let topDomain list = 
    list
    |> Seq.distinct
    |> Seq.head
    |> snd

db.Customer
|> Seq.map (fun c -> getDecade c.Birthdate, getDomain c.Email)
|> Seq.groupBy fst
|> Seq.sortBy fst
|> Seq.map (fun (decade, group) -> (decade,topDomain group))
|> Seq.iter (printfn "%A")
```

上記のコードからわかるように、F#で処理を行う良い点は、ヘルパー関数を別々に定義し、それらを簡単に接続できることです。

<a name="sql-testprocs"></a>
## 19. F#を使ってストアドプロシージャの単体テストを行う

*このセクションのコードは[githubで入手可能](https://github.com/swlaschin/low-risk-ways-to-use-fsharp-at-work/tree/master/SqlInFsharpTestUpsertCustomer.fs)です。*

では、型プロバイダーを使ってストアドプロシージャの単体テストを非常に簡単に作成する方法を見てみましょう。

まず、接続を設定し、各テストの前に呼び出される`resetDatabase`などの共有ユーティリティ関数を提供するヘルパーモジュール（`DbLib`と呼びます）を作成します。

```fsharp
module DbLib

[<Literal>]
let connectionString = "Data Source=localhost; Initial Catalog=SqlInFsharp;Integrated Security=True;"
type Sql = SqlDataConnection<connectionString>

let removeExistingData (db:DbContext) = 
    let truncateTable name = 
        sprintf "TRUNCATE TABLE %s" name
        |> db.DataContext.ExecuteCommand 
        |> ignore

    ["Customer"; "CustomerImport"]
    |> List.iter truncateTable

let insertReferenceData (db:DbContext) = 
    [ "US","United States";
      "GB","United Kingdom" ]
    |> List.iter (fun (code,name) -> 
        let c = new Sql.ServiceTypes.Country()
        c.IsoCode <- code;  c.CountryName <- name
        db.Country.InsertOnSubmit c
        )
    db.DataContext.SubmitChanges()

// すべてのデータを削除し、DBを既知の開始点に戻す
let resetDatabase() =
    use db = Sql.GetDataContext()
    removeExistingData db
    insertReferenceData db
```

これで、NUnitを使って、他の単体テストと同じように単体テストを書くことができます。

`Customer`テーブルと、渡された顧客IDがnullかどうかによって新しい顧客を挿入するか既存の顧客を更新する`up_Customer_Upsert`というストアドプロシージャがあるとします。

以下がテストの例です：

```fsharp
[<Test>]
let ``null idでupsert customerが呼ばれた場合、新しいidで顧客が作成されることを期待する``() = 
    DbLib.resetDatabase() 
    use db = DbLib.Sql.GetDataContext()

    // 顧客を作成
    let newId = db.Up_Customer_Upsert(Nullable(),"Alice","x@example.com",Nullable()) 

    // 新しいidをチェック
    Assert.Greater(newId,0)

    // 1人の顧客が存在することをチェック
    let customerCount = db.Customer |> Seq.length
    Assert.AreEqual(1,customerCount)
```

セットアップにコストがかかるため、テストで複数のアサートを行っていることに注意してください。これが醜すぎると感じる場合はリファクタリングできます！

以下は更新が機能することをテストするものです：

```fsharp
[<Test>]
let ``既存のidでupsert customerが呼ばれた場合、顧客が更新されることを期待する``() = 
    DbLib.resetDatabase() 
    use db = DbLib.Sql.GetDataContext()

    // 顧客を作成
    let custId = db.Up_Customer_Upsert(Nullable(),"Alice","x@example.com",Nullable()) 
    
    // 顧客を更新
    let newId = db.Up_Customer_Upsert(Nullable custId,"Bob","y@example.com",Nullable()) 
    
    // idが変更されていないことをチェック
    Assert.AreEqual(custId,newId)

    // まだ1人の顧客しかいないことをチェック
    let customerCount = db.Customer |> Seq.length
    Assert.AreEqual(1,customerCount)

    // 顧客の列が更新されていることをチェック
    let customer = db.Customer |> Seq.head
    Assert.AreEqual("Bob",customer.Name)
```

そしてもう1つ、例外をチェックするものです：

```fsharp
[<Test>]
let ``空白の名前でupsert customerが呼ばれた場合、バリデーションエラーが発生することを期待する``() = 
    DbLib.resetDatabase() 
    use db = DbLib.Sql.GetDataContext()

    try
        // 空白の名前で顧客を作成しようとする
        db.Up_Customer_Upsert(Nullable(),"","x@example.com",Nullable()) |> ignore
        Assert.Fail("SqlExceptionが発生することを期待")
    with
    | :? System.Data.SqlClient.SqlException as ex ->
        Assert.That(ex.Message,Is.StringContaining("@Name"))
        Assert.That(ex.Message,Is.StringContaining("blank"))
```

ご覧のように、全体のプロセスは非常に簡単です。

これらのテストは継続的インテグレーションスクリプトの一部としてコンパイルおよび実行できます。
そして素晴らしいのは、データベーススキーマがコードと同期が取れていない場合、テストはコンパイルすらできないということです！

<a name="sql-randomdata"></a>
## 20. FsCheckを使ってランダムなデータベースレコードを生成する

*このセクションのコードは[githubで入手可能](https://github.com/swlaschin/low-risk-ways-to-use-fsharp-at-work/tree/master/SqlInFsharpInsertDummyData.fsx)です。*

前の例で示したように、FsCheckを使ってランダムなデータを生成できます。この場合、データベースにランダムなレコードを生成するために使います。

`CustomerImport`テーブルが以下のように定義されているとします。（このテーブルは次のETLのセクションで使います）

```text
CREATE TABLE dbo.CustomerImport (
	CustomerId int NOT NULL IDENTITY(1,1)
	,FirstName varchar(50) NOT NULL 
	,LastName varchar(50) NOT NULL 
	,EmailAddress varchar(50) NOT NULL 
	,Age int NULL 

	CONSTRAINT PK_CustomerImport PRIMARY KEY CLUSTERED (CustomerId)
	)
```
    
前と同じコードを使って、`CustomerImport`のランダムなインスタンスを生成できます。 

```fsharp
[<Literal>]
let connectionString = "Data Source=localhost; Initial Catalog=SqlInFsharp; Integrated Security=True;"

type Sql = SqlDataConnection<connectionString>

// サンプリングする名前のリスト
let possibleFirstNames = 
    ["Merissa";"Kenneth";"Zora";"Oren"]
let possibleLastNames = 
    ["Applewhite";"Feliz";"Abdulla";"Strunk"]

// リストからランダムに選んで名前を生成
let generateFirstName() = 
    FsCheck.Gen.elements possibleFirstNames 

let generateLastName() = 
    FsCheck.Gen.elements possibleLastNames

// ランダムなユーザーとドメインを組み合わせてランダムなメールアドレスを生成
let generateEmail() = 
    let userGen = FsCheck.Gen.elements ["a"; "b"; "c"; "d"; "e"; "f"]
    let domainGen = FsCheck.Gen.elements ["gmail.com"; "example.com"; "outlook.com"]
    let makeEmail u d = sprintf "%s@%s" u d 
    FsCheck.Gen.map2 makeEmail userGen domainGen 
```

ここまでは順調です。

次に`age`カラムに移りますが、これはnull許容型です。これは、ランダムな`int`を生成するのではなく、
ランダムな`Nullable<int>`を生成する必要があることを意味します。ここで型チェックが本当に役立ちます - コンパイラがそれを考慮するよう強制してくれます。
すべてのケースをカバーするために、20回に1回の割合でnull値を生成することにします。

```fsharp
// ランダムなnull許容 ageを生成。
// ageがnull許容型であるため、
// コンパイラはそれを考慮するよう強制する
let generateAge() = 
    let nonNullAgeGenerator = 
        FsCheck.Gen.choose(1,99) 
        |> FsCheck.Gen.map (fun age -> Nullable age)
    let nullAgeGenerator = 
        FsCheck.Gen.constant (Nullable())

    // 20回に19回の割合でnullでない年齢を選択
    FsCheck.Gen.frequency [ 
        (19,nonNullAgeGenerator) 
        (1,nullAgeGenerator)
        ]
```

すべてをまとめると...

```fsharp
// 顧客を作成する関数
let createCustomerImport first last email age =
    let c = new Sql.ServiceTypes.CustomerImport()
    c.FirstName <- first
    c.LastName <- last
    c.EmailAddress <- email
    c.Age <- age
    c //新しいレコードを返す

// アプリカティブを使って顧客ジェネレーターを作成
let generateCustomerImport = 
    createCustomerImport 
    <!> generateFirstName() 
    <*> generateLastName() 
    <*> generateEmail() 
    <*> generateAge() 
```

ランダムジェネレーターができたら、好きな数のレコードを取得し、型プロバイダーを使って挿入できます。

以下のコードでは、10,000件のレコードを生成し、1,000件ずつのバッチでデータベースにヒットします。

```fsharp
let insertAll() =
    use db = Sql.GetDataContext()

    // オプション、ログのオン/オフを切り替え
    // db.DataContext.Log <- Console.Out
    // db.DataContext.Log <- null

    let insertOne counter customer =
        db.CustomerImport.InsertOnSubmit customer
        // 1000件ごとにバッチ処理
        if counter % 1000 = 0 then
            db.DataContext.SubmitChanges()

    // レコードを生成
    let count = 10000
    let generator = FsCheck.Gen.sample 0 count generateCustomerImport

    // レコードを挿入
    generator |> List.iteri insertOne
    db.DataContext.SubmitChanges() // 残りをコミット
```

最後に、実行して時間を計測します。

```fsharp
#time
insertAll() 
#time
```

BCPを使うほど高速ではありませんが、テストには十分適しています。たとえば、上記の10,000件のレコードを作成するのに数秒しかかかりません。

これが*単一のスタンドアロンスクリプト*であり、重いバイナリではないことを強調したいと思います。そのため、必要に応じて簡単に調整して実行できます。

もちろん、ソース管理に保存したり、変更を追跡したりできるなど、スクリプトアプローチのすべての利点が得られます。

<a name="sql-etl"></a>
## 21. F#を使って簡単なETLを行う

*このセクションのコードは[githubで入手可能](https://github.com/swlaschin/low-risk-ways-to-use-fsharp-at-work/tree/master/SqlInFsharpEtlExample.fsx)です。*

あるテーブルから別のテーブルにデータを転送する必要があるが、完全に単純なコピーではなく、
いくつかのマッピングと変換を行う必要があるとします。

これは典型的なETL（抽出/変換/ロード）の状況で、ほとんどの人は[SSIS](https://en.wikipedia.org/wiki/SQL_Server_Integration_Services)を使おうと思うでしょう。

しかし、一回限りのインポートや、大量のデータを扱わない場合など、いくつかの状況ではF#を代わりに使えます。見てみましょう。

次のようなマスターテーブルにデータをインポートするとします：

```text
CREATE TABLE dbo.Customer (
	CustomerId int NOT NULL IDENTITY(1,1)
	,Name varchar(50) NOT NULL 
	,Email varchar(50) NOT NULL 
	,Birthdate datetime NULL 
	)
```

しかし、インポート元のシステムは次のような異なる形式を持っています：

```text
CREATE TABLE dbo.CustomerImport (
	CustomerId int NOT NULL IDENTITY(1,1)
	,FirstName varchar(50) NOT NULL 
	,LastName varchar(50) NOT NULL 
	,EmailAddress varchar(50) NOT NULL 
	,Age int NULL 
	)
```

このインポートの一部として、以下のことを行う必要があります：

* `FirstName`と`LastName`カラムを1つの`Name`カラムに連結する
* `EmailAddress`カラムを`Email`カラムにマッピングする
* `Age`から`Birthdate`を計算する
* ここでは`CustomerId`はスキップします - 実際にはIDENTITYカラムを使っていないことを願っています。

最初のステップは、ソースレコードをターゲットレコードにマッピングする関数を定義することです。この場合、`makeTargetCustomer`と呼びます。

以下がそのコードです：

```fsharp
[<Literal>]
let sourceConnectionString = 
    "Data Source=localhost; Initial Catalog=SqlInFsharp; Integrated Security=True;"

[<Literal>]
let targetConnectionString = 
    "Data Source=localhost; Initial Catalog=SqlInFsharp; Integrated Security=True;"

type SourceSql = SqlDataConnection<sourceConnectionString>
type TargetSql = SqlDataConnection<targetConnectionString>

let makeName first last = 
    sprintf "%s %s" first last 

let makeBirthdate (age:Nullable<int>) = 
    if age.HasValue then
        Nullable (DateTime.Today.AddYears(-age.Value))
    else
        Nullable()

let makeTargetCustomer (sourceCustomer:SourceSql.ServiceTypes.CustomerImport) = 
    let targetCustomer = new TargetSql.ServiceTypes.Customer()
    targetCustomer.Name <- makeName sourceCustomer.FirstName sourceCustomer.LastName
    targetCustomer.Email <- sourceCustomer.EmailAddress
    targetCustomer.Birthdate <- makeBirthdate sourceCustomer.Age
    targetCustomer // 返す
```

この変換ができたら、残りのコードは簡単です。ソースから読み取り、ターゲットに書き込むだけです。

```fsharp
let transferAll() =
    use sourceDb = SourceSql.GetDataContext()
    use targetDb = TargetSql.GetDataContext()

    let insertOne counter customer =
        targetDb.Customer.InsertOnSubmit customer
        // 1000件ごとにバッチ処理
        if counter % 1000 = 0 then
            targetDb.DataContext.SubmitChanges()
            printfn "...%i レコードが転送されました" counter 

    // ソースレコードのシーケンスを取得
    sourceDb.CustomerImport
    // ターゲットレコードに変換
    |>  Seq.map makeTargetCustomer 
    // そして挿入
    |>  Seq.iteri insertOne
    
    targetDb.DataContext.SubmitChanges() // 残りをコミット
    printfn "完了"
```

これらはシーケンス操作なので、一度に1つのレコードだけがメモリ内にあります（LINQの送信バッファを除く）。そのため、大規模なデータセットでも
処理できます。

使用例を見るために、まず先ほど説明したダミーデータスクリプトを使っていくつかのレコードを挿入し、次に以下のように転送を実行します：

```fsharp
#time
transferAll() 
#time
```

ここでも、10,000件のレコードを転送するのに数秒しかかかりません。

そして再び、これは*単一のスタンドアロンスクリプト*です - 簡単なETLジョブを作成するための非常に軽量な方法です。

<a name="sql-sqlagent"></a>
## 22. F#を使ってSQL Agentスクリプトを生成する

データベース関連の最後の提案として、コードからSQL Agentスクリプトを生成するアイデアを提案します。

ある程度の規模のショップでは、数百から数千のSQL Agentジョブがあるかもしれません。私の意見では、これらはすべてスクリプトファイルとして保存され、
システムのプロビジョニング/ビルド時にデータベースにロードされるべきです。

残念ながら、開発、テスト、本番環境の間にはしばしば微妙な違いがあります：接続文字列、認可、アラート、ログ設定など。

それは自然に、スクリプトの3つの異なるコピーを保持しようとする問題につながり、次にこう考えさせます：
*1つの*スクリプトを持ち、環境ごとにパラメータ化するのはどうだろうか？

しかし今度は、多くの醜いSQLコードを扱うことになります！SQL Agentジョブを作成するスクリプトは通常数百行に及び、手動で
メンテナンスするようには設計されていませんでした。

F#の出番です！

F#では、ジョブを生成および設定するために必要なすべてのデータを保存する簡単なレコード型を作成するのが本当に簡単です。

たとえば、以下のスクリプトでは：

* `Package`、`Executable`、`Powershell`などを格納できる`Step`という共用体型を作成しました。
* これらのステップ型にはそれぞれ固有のプロパティがあり、`Package`には名前と変数があるなどです。
* `JobInfo`は名前と`Step`のリストで構成されます。
* エージェントスクリプトは、`JobInfo`と環境に関連するグローバルプロパティのセット（データベース、共有フォルダの場所など）から生成されます。

```fsharp
let thisDir = __SOURCE_DIRECTORY__
System.IO.Directory.SetCurrentDirectory (thisDir)

#load @"..\..\SqlAgentLibrary.Lib.fsx"
      
module MySqlAgentJob = 

    open SqlAgentLibrary.Lib.SqlAgentLibrary
    
    let PackageFolder = @"\shared\etl\MyJob"

    let step1 = Package {
        Name = "SSISパッケージ"
        Package = "AnSsisPackage.dtsx"
        Variables = 
            [
            "EtlServer", "EtlServer"
            "EtlDatabase", "EtlDatabase"
            "SsisLogServer", "SsisLogServer"
            "SsisLogDatabase", "SsisLogDatabase"
            ]
        }

    let step2 = Package {
        Name = "別のSSISパッケージ"
        Package = "AnotherSsisPackage.dtsx"
        Variables = 
            [
            "EtlServer", "EtlServer2"
            "EtlDatabase", "EtlDatabase2"
            "SsisLogServer", "SsisLogServer2"
            "SsisLogDatabase", "SsisLogDatabase2"
            ]
        }

    let jobInfo = {
        JobName = "私のSqlAgentジョブ"
        JobDescription = "データをある場所から別の場所にコピーする"
        JobCategory = "ETL"
        Steps = 
            [
            step1
            step2
            ]
        StepsThatContinueOnFailure = []
        JobSchedule = None
        JobAlert = None
        JobNotification = None
        }            
        
    let generate globals = 
        writeAgentScript globals jobInfo 
        
module DevEnvironment = 

    let globals = 
        [
        // グローバル
        "Environment", "DEV"
        "PackageFolder", @"\shared\etl\MyJob"
        "JobServer", "(local)"

        // 一般変数
        "JobName", "いくつかのパッケージ"
        "SetStartFlag", "2"
        "SetEndFlag", "0"

        // データベース
        "Database", "mydatabase"
        "Server",  "localhost"
        "EtlServer", "localhost"
        "EtlDatabase", "etl_config"

        "SsisLogServer", "localhost"
        "SsisLogDatabase", "etl_config"
        ] |> Map.ofList


    let generateJob() = 
        MySqlAgentJob.generate globals    

DevEnvironment.generateJob()
```

実際のF#コードは共有できませんが、アイデアはお分かりいただけたと思います。作成するのは非常に簡単です。

これらの.FSXファイルができたら、実際のSQL Agentスクリプトを一括生成し、適切なサーバーにデプロイできます。

以下は、.FSXファイルから自動生成される可能性のあるSQL Agentスクリプトの例です。

ご覧の通り、これは整形された見やすいT-SQLスクリプトです。アイデアとしては、DBAがこれをレビューし、魔法のようなことが起こっていないことを確認し、
入力として受け入れる意欲を持つことができるということです。

一方で、このようなスクリプトを維持するのはリスクがあります。SQLコードを直接編集するのは危険かもしれません。
型チェックされた（そしてより簡潔な）F#コードを使う方が、型のないT-SQLよりも良いでしょう！

```sql
USE [msdb]
GO

-- =====================================================
-- SQL Agentジョブ 'My SqlAgent Job' を削除して再作成するスクリプト
-- 
-- ジョブのステップは：
-- 1) SSISパッケージ
     -- {エラー時に続行=false} 
-- 2) 別のSSISパッケージ
     -- {エラー時に続行=false} 

-- =====================================================


-- =====================================================
-- 環境はDEV
-- 
-- その他のグローバル変数は：
-- Database = mydatabase
-- EtlDatabase = etl_config
-- EtlServer = localhost
-- JobName = My SqlAgent Job
-- JobServer = (local)
-- PackageFolder = \\shared\etl\MyJob\
-- Server = localhost
-- SetEndFlag = 0
-- SetStartFlag = 2
-- SsisLogDatabase = etl_config
-- SsisLogServer = localhost

-- =====================================================


-- =====================================================
-- ジョブの作成
-- =====================================================

-- ---------------------------------------------
-- ジョブが存在する場合は削除
-- ---------------------------------------------
IF  EXISTS (SELECT job_id FROM msdb.dbo.sysjobs_view WHERE name = 'My SqlAgent Job') 
BEGIN
    PRINT 'ジョブ "My SqlAgent Job" を削除中'
    EXEC msdb.dbo.sp_delete_job @job_name='My SqlAgent Job', @delete_unused_schedule=0
END	

-- ---------------------------------------------
-- ジョブの作成
-- ---------------------------------------------

BEGIN TRANSACTION
DECLARE @ReturnCode INT
SELECT @ReturnCode = 0

-- ---------------------------------------------
-- 必要な場合はカテゴリを作成
-- ---------------------------------------------
IF NOT EXISTS (SELECT name FROM msdb.dbo.syscategories WHERE name='ETL' AND category_class=1)
BEGIN
    PRINT 'カテゴリ "ETL" を作成中'
    EXEC @ReturnCode = msdb.dbo.sp_add_category @class=N'JOB', @type=N'LOCAL', @name='ETL'
    IF (@@ERROR <> 0 OR @ReturnCode <> 0) GOTO QuitWithRollback
END

-- ---------------------------------------------
-- ジョブの作成 
-- ---------------------------------------------

DECLARE @jobId BINARY(16)
PRINT 'ジョブ "My SqlAgent Job" を作成中'
EXEC @ReturnCode =  msdb.dbo.sp_add_job @job_name='My SqlAgent Job', 
        @enabled=1, 
        @category_name='ETL', 
        @owner_login_name=N'sa', 
        @description='データをある場所から別の場所にコピーする',
        @job_id = @jobId OUTPUT

IF (@@ERROR <> 0 OR @ReturnCode <> 0) GOTO QuitWithRollback


PRINT '-- ---------------------------------------------'
PRINT 'ステップ1の作成: "SSISパッケージ"'
PRINT '-- ---------------------------------------------'
DECLARE @Step1_Name nvarchar(50) = 'SSISパッケージ'
DECLARE @Step1_Package nvarchar(170) = 'AnSsisPackage.dtsx'
DECLARE @Step1_Command nvarchar(1700) = 
    '/FILE "\\shared\etl\MyJob\AnSsisPackage.dtsx"' + 
    ' /CHECKPOINTING OFF' + 
    ' /SET "\Package.Variables[User::SetFlag].Value";"2"' + 
    ' /SET "\Package.Variables[User::JobName].Value";""' + 
    ' /SET "\Package.Variables[User::SourceServer].Value";"localhost"' + 
    ' /SET "\Package.Variables[User::SourceDatabaseName].Value";"etl_config"' + 

    ' /REPORTING E'

EXEC @ReturnCode = msdb.dbo.sp_add_jobstep @job_id=@jobId, @step_name=@Step1_Name, 
        @step_id=1, 
        @on_success_action=3, 
        @on_fail_action=2,
        @subsystem=N'SSIS', 
        @command=@Step1_Command
          
        IF (@@ERROR <> 0 OR @ReturnCode <> 0) GOTO QuitWithRollback


PRINT '-- ---------------------------------------------'
PRINT 'ステップ2の作成: "別のSSISパッケージ"'
PRINT '-- ---------------------------------------------'
DECLARE @Step2_Name nvarchar(50) = '別のSSISパッケージ'
DECLARE @Step2_Package nvarchar(170) = 'AnotherSsisPackage.dtsx'
DECLARE @Step2_Command nvarchar(1700) = 
    '/FILE "\\shared\etl\MyJob\AnotherSsisPackage.dtsx.dtsx"' + 
    ' /CHECKPOINTING OFF' + 
    ' /SET "\Package.Variables[User::EtlServer].Value";"localhost"' + 
    ' /SET "\Package.Variables[User::EtlDatabase].Value";"etl_config"' + 
    ' /SET "\Package.Variables[User::SsisLogServer].Value";"localhost"' + 
    ' /SET "\Package.Variables[User::SsisLogDatabase].Value";"etl_config"' + 

    ' /REPORTING E'

EXEC @ReturnCode = msdb.dbo.sp_add_jobstep @job_id=@jobId, @step_name=@Step2_Name, 
        @step_id=2, 
        @on_success_action=3, 
        @on_fail_action=2,
        @subsystem=N'SSIS', 
        @command=@Step2_Command
          
        IF (@@ERROR <> 0 OR @ReturnCode <> 0) GOTO QuitWithRollback

-- ---------------------------------------------
-- ジョブスケジュール
-- ---------------------------------------------


-- ----------------------------------------------
-- ジョブアラート
-- ----------------------------------------------


-- ---------------------------------------------
-- 開始ステップの設定
-- ---------------------------------------------

EXEC @ReturnCode = msdb.dbo.sp_update_job @job_id = @jobId, @start_step_id = 1
IF (@@ERROR <> 0 OR @ReturnCode <> 0) GOTO QuitWithRollback

-- ---------------------------------------------
-- サーバーの設定
-- ---------------------------------------------


EXEC @ReturnCode = msdb.dbo.sp_add_jobserver @job_id = @jobId, @server_name = '(local)'
IF (@@ERROR <> 0 OR @ReturnCode <> 0) GOTO QuitWithRollback


PRINT '完了！'

COMMIT TRANSACTION
GOTO EndSave
QuitWithRollback:
    IF (@@TRANCOUNT > 0) ROLLBACK TRANSACTION
EndSave:
GO
```


 
## まとめ

この一連の提案が、F#の使い道について新しい光を当てたことを願っています。

私の意見では、簡潔な構文、軽量なスクリプティング（バイナリなし）、SQLの型プロバイダーの組み合わせにより、
F#はデータベース関連のタスクに信じられないほど有用です。

コメントを残して、あなたの考えを聞かせてください。





