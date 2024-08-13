---
layout: post
title: "畳み込みの例"
description: "他のドメインへのルールの適用"
seriesId: "再帰型と畳み込み"
seriesOrder: 2
categories: [Folds, Patterns]
---

このブログ記事はシリーズの第2弾です。

[前回の記事](../posts/recursive-types-and-folds.md)では、再帰型に対して関数を作成するための手法である「カタモーフィズム」を紹介しました。
また、カタモーフィズムを機械的に実装するためのいくつかのルールも列挙しました。
今回は、これらのルールを使って、別のドメインに対するカタモーフィズムを実装してみましょう。

## シリーズの内容

シリーズの内容は次の通りです。

* **パート1: 再帰型とカタモーフィズム入門**
  * [シンプルな再帰型](../posts/recursive-types-and-folds.md#basic-recursive-type)
  * [すべてをパラメーター化](../posts/recursive-types-and-folds.md#parameterize)
  * [カタモーフィズムの紹介](../posts/recursive-types-and-folds.md#catamorphisms)
  * [カタモーフィズムの利点](../posts/recursive-types-and-folds.md#benefits)
  * [カタモーフィズム作成のルール](../posts/recursive-types-and-folds.md#rules)
* **パート2: カタモーフィズムの例**
  * [カタモーフィズムの例: ファイルシステムドメイン](../posts/recursive-types-and-folds-1b.md#file-system)
  * [カタモーフィズムの例: 製品ドメイン](../posts/recursive-types-and-folds-1b.md#product)
* **パート3: 畳み込みの紹介**
  * [カタモーフィズム実装の欠陥](../posts/recursive-types-and-folds-2.md#flaw)
  * [`fold` 関数の紹介](../posts/recursive-types-and-folds-2.md#fold)
  * [`fold` 関数の問題点](../posts/recursive-types-and-folds-2.md#problems)
  * [関数としての蓄積器の使用](../posts/recursive-types-and-folds-2.md#functions)
  * [`foldback` 関数の紹介](../posts/recursive-types-and-folds-2.md#foldback)
  * [畳み込み作成のルール](../posts/recursive-types-and-folds-2.md#rules)
* **パート4: 畳み込みの理解**
  * [反復 vs. 再帰](../posts/recursive-types-and-folds-2b.md#iteration)
  * [畳み込みの例: ファイルシステムドメイン](../posts/recursive-types-and-folds-2b.md#file-system)
  * [「fold」に関するよくある質問](../posts/recursive-types-and-folds-2b.md#questions)
* **パート5: ジェネリック再帰型**
  * [ジェネリック再帰型: リンクドリスト](../posts/recursive-types-and-folds-3.md#linkedlist)
  * [ギフトドメインをジェネリックにする](../posts/recursive-types-and-folds-3.md#revisiting-gift)
  * [ジェネリックなコンテナ型の定義](../posts/recursive-types-and-folds-3.md#container)
  * [ギフトドメイン実装の別の方法](../posts/recursive-types-and-folds-3.md#another-gift)
  * [抽象型か具体型か? 3つの設計の比較](../posts/recursive-types-and-folds-3.md#compare)
* **パート6: 実世界の木構造**
  * [ジェネリックな木構造型の定義](../posts/recursive-types-and-folds-3b.md#tree)
  * [実世界の木構造型](../posts/recursive-types-and-folds-3b.md#reuse)
  * [木構造型のマッピング](../posts/recursive-types-and-folds-3b.md#map)
  * [例: ディレクトリ一覧の作成](../posts/recursive-types-and-folds-3b.md#listing)
  * [例: 並列 grep](../posts/recursive-types-and-folds-3b.md#grep)
  * [例: ファイルシステムのデータベースへの保存](../posts/recursive-types-and-folds-3b.md#database)
  * [例: 木構造の JSON シリアライズ](../posts/recursive-types-and-folds-3b.md#tojson)
  * [例: JSON からの木構造のデシリアライズ](../posts/recursive-types-and-folds-3b.md#fromjson)
  * [例: エラー処理付きの JSON からの木構造のデシリアライズ](../posts/recursive-types-and-folds-3b.md#json-with-error-handling)
  

<a id="rules"></a>
<hr>

  
## カタモーフィズム作成のルール

前回の記事で見たように、カタモーフィズムの作成は機械的なプロセスであり、以下のルールに従って行えます。

* データ構造の各ケースを処理するための関数パラメータを作成する。
* 再帰的でないケースについては、そのケースに関連するすべてのデータを関数パラメータに渡す。
* 再帰的なケースについては、以下の2ステップを実行する。
  * まず、ネストされた値に対してカタモーフィズムを再帰的に呼び出す。
  * 次に、そのケースに関連するすべてのデータを関数ハンドラーに渡す。ただし、ネストされた値の部分は、カタモーフィズムの結果で置き換える。

それでは、これらのルールを適用して、他のドメインでカタモーフィズムを作成できるかどうか見てみましょう。

<a id="file-system"></a>
<hr>

## カタモーフィズムの例: ファイルシステムドメイン

非常に単純なファイルシステムモデルから始めましょう。

* ファイルには名前とサイズがあります。
* ディレクトリには名前、サイズ、およびサブアイテムのリストがあります。

次のようにモデル化できます。

```fsharp
type FileSystemItem =
    | File of File
    | Directory of Directory
and File = {name:string; fileSize:int}
and Directory = {name:string; dirSize:int; subitems:FileSystemItem list}
```

正直、非常に粗いモデルですが、今回の例には十分です！

それでは、サンプルのファイルとディレクトリを見てみましょう。

```fsharp
let readme = File {name="readme.txt"; fileSize=1}
let config = File {name="config.xml"; fileSize=2}
let build  = File {name="build.bat"; fileSize=3}
let src = Directory {name="src"; dirSize=10; subitems=[readme; config; build]}
let bin = Directory {name="bin"; dirSize=10; subitems=[]}
let root = Directory {name="root"; dirSize=5; subitems=[src; bin]}
```

カタモーフィズムを作成する時が来ました。

まずはシグネチャを見て、必要なものを確認しましょう。

`File` コンストラクタは `File` を取り、 `FileSystemItem` を返します。
上記のガイドラインに従うと、 `File` ケースのハンドラーは `File -> 'r` というシグネチャを持つ必要があります。

```fsharp
// ケースコンストラクタ
File  : File -> FileSystemItem

// Fileケースを処理する関数パラメータ
fFile : File -> 'r
```

これは簡単ですね。 `cataFS` (と呼ぶことにします) の初期スケルトンを組み立ててみましょう。

```fsharp
let rec cataFS fFile fDir item :'r = 
    let recurse = cataFS fFile fDir 
    match item with
    | File file -> 
        fFile file
    | Directory dir -> 
        // 実装予定
```

`Directory` ケースはもう少し複雑です。
上記のガイドラインを単純に適用すると、`Directory` ケースのハンドラーは `Directory -> 'r` というシグネチャを持ちますが、これは間違っています。
なぜなら、`Directory` レコード自体が `FileSystemItem` を含んでおり、それも `'r` で置き換える必要があるからです。どうすればよいでしょうか？

1つの方法は、`Directory` レコードを `(string, int, FileSystemItem list)` というタプルに「展開」し、その中で `FileSystemItem` を `'r` で置き換えることです。

つまり、次のような変換の流れになります。

```fsharp
// ケースコンストラクタ（Directoryをレコードとして）
Directory : Directory -> FileSystemItem

// ケースコンストラクタ（Directoryをタプルとして展開）
Directory : (string, int, FileSystemItem list) -> FileSystemItem
//   'rに置き換える ===> ~~~~~~~~~~~~~~          ~~~~~~~~~~~~~~

// Directoryケースを処理する関数パラメータ
fDir :      (string, int, 'r list)             -> 'r
```

もう1つの問題は、`Directory` ケースに関連するデータが `FileSystemItem` の *リスト* であることです。これを `'r` のリストに変換するにはどうすればよいでしょうか？

`recurse` ヘルパーは `FileSystemItem` を `'r` に変換するので、
`List.map` にマッピング関数として `recurse` を渡せば、必要な `'r` のリストが得られます。

すべてをまとめると、次のような実装になります。

```fsharp
let rec cataFS fFile fDir item :'r = 
    let recurse = cataFS fFile fDir 
    match item with
    | File file -> 
        fFile file
    | Directory dir -> 
        let listOfRs = dir.subitems |> List.map recurse 
        fDir (dir.name,dir.dirSize,listOfRs) 
```

型シグネチャを見ると、まさに望んでいたものになっています。

```fsharp
val cataFS :
    fFile : (File -> 'r) ->
    fDir  : (string * int * 'r list -> 'r) -> 
    // 入力値
    FileSystemItem -> 
    // 戻り値
    'r
```

これで完成です。設定には少し手間がかかりますが、一度構築すれば、他の多くの関数の基盤となる、便利で再利用可能な関数ができあがります。

## ファイルシステムドメイン： `totalSize` の例

それでは、実際に使ってみましょう。

まず、アイテムとそのすべてのサブアイテムの合計サイズを返す `totalSize` 関数を簡単に定義できます。

```fsharp
let totalSize fileSystemItem =
    let fFile (file:File) = 
        file.fileSize
    let fDir (name,size,subsizes) = 
        (List.sum subsizes) + size
    cataFS fFile fDir fileSystemItem
```

結果は次のようになります。

```fsharp
readme |> totalSize  // 1
src |> totalSize     // 16 = 10 + (1 + 2 + 3)
root |> totalSize    // 31 = 5 + 16 + 10
```
  
### ファイルシステムドメイン： `largestFile` の例
  
「ツリー内の最大のファイルは何か？」のような、もう少し複雑な関数を考えてみましょう。

まず、何を返すべきか考えてみましょう。つまり、 `'r` は何になるでしょうか？

単なる `File` だと思うかもしれません。しかし、サブディレクトリが空で、ファイルが存在しない場合はどうでしょうか？

そこで、`'r` を `File option` にしましょう。

`File` ケースの関数は、 `Some file` を返すはずです。

```fsharp
let fFile (file:File) = 
    Some file
```

`Directory` ケースの関数は、もう少し考える必要があります。

* サブファイルのリストが空の場合、`None` を返す
* サブファイルのリストが空でない場合、最大のものを返す

```fsharp
let fDir (name,size,subfiles) = 
    match subfiles with
    | [] -> 
        None  // 空のディレクトリ
    | subfiles -> 
        // 最大のものを返す
```
  
しかし、 `'r` は `File` ではなく `File option` です。つまり、`subfiles` はファイルのリストではなく、`File option` のリストです。

では、これらの中で最大のものをどうやって見つけるのでしょうか？おそらく `List.maxBy` を使って、サイズを渡したいでしょう。しかし、`File option` のサイズとは何でしょうか？

`File option` のサイズを提供するヘルパー関数を書いてみましょう。次のロジックを使います。

* `File option` が `None` の場合、0 を返す
* そうでない場合、オプション内のファイルのサイズを返す

コードは次のようになります。

```fsharp
// 欠落している場合のデフォルト値を提供するヘルパー
let ifNone deflt opt =
    defaultArg opt deflt 

// オプションのファイルサイズを取得する    
let fileSize fileOpt = 
    fileOpt 
    |> Option.map (fun file -> file.fileSize)
    |> ifNone 0
```

すべてまとめると、`largestFile` 関数が完成します。

```fsharp
let largestFile fileSystemItem =

    // 欠落している場合のデフォルト値を提供するヘルパー
    let ifNone deflt opt =
        defaultArg opt deflt 

    // File optionのサイズを取得するヘルパー
    let fileSize fileOpt = 
        fileOpt 
        |> Option.map (fun file -> file.fileSize)
        |> ifNone 0

    // Fileケースを処理する        
    let fFile (file:File) = 
        Some file

    // Directoryケースを処理する        
    let fDir (name,size,subfiles) = 
        match subfiles with
        | [] -> 
            None  // 空のディレクトリ
        | subfiles -> 
            // ヘルパーを使用して最大のFile optionを見つける
            subfiles 
            |> List.maxBy fileSize  

    // カタモーフィズムを呼び出す
    cataFS fFile fDir fileSystemItem
```
  
テストすると、期待通りの結果が得られます。

```fsharp
readme |> largestFile  
// Some {name = "readme.txt"; fileSize = 1}

src |> largestFile     
// Some {name = "build.bat"; fileSize = 3}

bin |> largestFile     
// None

root |> largestFile    
// Some {name = "build.bat"; fileSize = 3}
```

設定は少し面倒ですが、カタモーフィズムを全く使わずにゼロから書く場合と比べて、それほど手間はかかりません。

<a id="product"></a>
<hr>

## カタモーフィズムの例： 製品ドメイン

次は少し複雑なドメインを考えてみましょう。何らかの製品を製造・販売していると想像してください。

* 一部の製品は購入品で、オプションでベンダーがあります。
* 一部の製品は自社で製造される製品で、サブコンポーネントから組み立てられます。
  サブコンポーネントとは、別の製品をある数量使ったものです。

ドメインは次のように型で表現できます。
  
```fsharp
type Product =
    | Bought of BoughtProduct 
    | Made of MadeProduct 
and BoughtProduct = {
    name : string 
    weight : int 
    vendor : string option }
and MadeProduct = {
    name : string 
    weight : int 
    components:Component list }
and Component = {
    qty : int
    product : Product }
```

これらの型は相互に再帰的です。 `Product` 型は `MadeProduct` 型を参照し、 `MadeProduct` 型は `Component` 型を参照し、 `Component` 型は再び `Product` 型を参照します。

製品の例をいくつか示します。

```fsharp
let label = 
    Bought {name="label"; weight=1; vendor=Some "ACME"}
let bottle = 
    Bought {name="bottle"; weight=2; vendor=Some "ACME"}
let formulation = 
    Bought {name="formulation"; weight=3; vendor=None}

let shampoo = 
    Made {name="shampoo"; weight=10; components=
    [
    {qty=1; product=formulation}
    {qty=1; product=bottle}
    {qty=2; product=label}
    ]}

let twoPack = 
    Made {name="twoPack"; weight=5; components=
    [
    {qty=2; product=shampoo}
    ]}
```

カタモーフィズムを設計するには、すべてのコンストラクタで `Product` 型を `'r` に置き換える必要があります。

前の例と同様に、`Bought` ケースは簡単です。

```fsharp
// ケースコンストラクタ
Bought  : BoughtProduct -> Product

// Boughtケースを処理する関数パラメータ 
fBought : BoughtProduct -> 'r
```

`Made` ケースは少し複雑です。`MadeProduct` をタプルに展開する必要があります。タプルには `Component` が含まれているので、それも展開する必要があります。
最終的に、内側の `Product` に到達し、これを機械的に `'r` に置き換えることができます。

変換の流れは次のとおりです。

```fsharp
// ケースコンストラクタ
Made  : MadeProduct -> Product

// ケースコンストラクタ（MadeProductをタプルとして展開）
Made  : (string,int,Component list) -> Product

// ケースコンストラクタ（Componentをタプルとして展開）
Made  : (string,int,(int,Product) list) -> Product
//  'rに置き換える ===> ~~~~~~~           ~~~~~~~

// Madeケースを処理する関数パラメータ 
fMade : (string,int,(int,'r) list)      -> 'r
```

`cataProduct` 関数を実装する場合、前と同じようにリストのマッピングが必要です。 `Component` のリストを `(int,'r)` のリストに変換します。

そのためのヘルパー関数が必要です。

```fsharp
// ComponentをComptを(int * 'r)のタプルに変換します
let convertComponentToTuple comp =
    (comp.qty,recurse comp.product)
```

このコードでは、`recurse` 関数を使用して内側の製品 (`comp.product`) を `'r` に変換し、その後 `int * 'r` のタプルを作成しています。

`convertComponentToTuple` が利用可能になったので、`List.map` を使ってすべてのコンポーネントをタプルに変換できます。

```fsharp
let componentTuples = 
    made.components 
    |> List.map convertComponentToTuple 
```

`componentTuples` は `(int * 'r)` のリストで、これは `fMade` 関数に必要なものです。

`cataProduct` の完全な実装は次のようになります。

```fsharp
let rec cataProduct fBought fMade product :'r = 
    let recurse = cataProduct fBought fMade 

    // ComponentをComptを(int * 'r)のタプルに変換します
    let convertComponentToTuple comp =
        (comp.qty,recurse comp.product)

    match product with
    | Bought bought -> 
        fBought bought 
    | Made made -> 
        let componentTuples =  // (int * 'r) list
            made.components 
            |> List.map convertComponentToTuple 
        fMade (made.name,made.weight,componentTuples) 
```

### 製品ドメイン： `productWeight` の例

`cataProduct` を使って、製品の重量を計算してみましょう。

```fsharp
let productWeight product =

    // Boughtケースを処理する
    let fBought (bought:BoughtProduct) = 
        bought.weight

    // Madeケースを処理する
    let fMade (name,weight,componentTuples) = 
        // 1つのコンポーネントタプルの重量を計算するヘルパー
        let componentWeight (qty,weight) =
            qty * weight
        // すべてのコンポーネントタプルの重量を合計する
        let totalComponentWeight = 
            componentTuples 
            |> List.sumBy componentWeight 
        // Madeケースの重量も加える
        totalComponentWeight + weight

    // カタモーフィズムを呼び出す
    cataProduct fBought fMade product
```

インタラクティブに動作を確認してみましょう。

```fsharp
label |> productWeight    // 1
shampoo |> productWeight  // 17 = 10 + (2x1 + 1x2 + 1x3)
twoPack |> productWeight  // 39 = 5  + (2x17)
```
    
期待通りの結果が得られました。

`cataProduct` のようなヘルパー関数を使わずに、ゼロから `productWeight` を実装してみてください。
もちろん可能ですが、再帰のロジックを正しく記述するのに時間がかかるでしょう。

### 製品ドメイン： `mostUsedVendor` 関数の例

もっと複雑な関数を作ってみましょう。**最もよく使われているベンダー**を見つけたいとします。

ロジックは単純です。製品がベンダーを参照するたびに、そのベンダーに 1 ポイントを与え、ポイントが最も多いベンダーが勝ちです。

ここでも、関数が何を返すべきか考えてみましょう。つまり、`'r` は何になるでしょうか？

単純に点数のようなものと考えがちですが、ベンダー名も必要です。では、タプルにしましょうか。しかし、ベンダーがない場合はどうでしょうか？

そこで、タプルではなく、小さな型 `VendorScore` を作成し、`'r` を `VendorScore option` にしましょう。

```fsharp
type VendorScore = {vendor:string; score:int}
```

`VendorScore` からデータを簡単に取得するためのヘルパー関数も定義しましょう。

```fsharp
let vendor vs = vs.vendor
let score vs = vs.score
```

さて、木全体の結果が得られない限り、最もよく使われているベンダーを特定することはできません。
そのため、`Bought` ケースと `Made` ケースの両方で、木構造を再帰的に上っていく際に追加できるリストを返す必要があります。
そして、**すべての**スコアを取得した後、降順にソートしてポイントが最も高いベンダーを見つけます。
  
つまり、`'r` はオプションではなく、`VendorScore list` にしなければならないのです！
  
`Bought` ケースのロジックは次のようになります。

* ベンダーが存在する場合は、スコアが 1 の `VendorScore` を返しますが、単一の項目ではなく、1 要素のリストとして返します。
* ベンダーが存在しない場合は、空のリストを返します。
  
```fsharp
let fBought (bought:BoughtProduct) = 
    // ベンダーがある場合、スコアを1に設定
    bought.vendor
    |> Option.map (fun vendor -> {vendor = vendor; score = 1} )
    // => VendorScore option
    |> Option.toList
    // => VendorScore list
```

`Made` ケースの関数はもう少し複雑です。

* サブスコアのリストが空の場合は、空のリストを返します。
* サブスコアのリストが空でない場合は、ベンダーごとに集計して新しいリストを返します。

しかし、`fMade` 関数に渡されるサブ結果のリストは、サブスコアのリストではなく、 `qty * 'r` というタプルのリストになります。ここで、 `'r` は `VendorScore list` です。ややこしいですね！

必要な手順は次のとおりです。

* 数量 ( `qty` ) は関係ないので、 `qty * 'r` を単に `'r` に変換します。これで、`VendorScore list` のリストができます。これには `List.map snd` を使えます。
* しかし、これでは `VendorScore list` のリストになってしまいます。リストのリストを単純なリストに平坦化するには、 `List.collect` を使います。実際には、`List.collect snd` を使うと、両方のステップを一度に行うことができます。
* このリストをベンダーごとにグループ化し、 `key=vendor; values=VendorScore list` というタプルのリストにします。
* 各ベンダーのスコア（ `values=VendorScore list` ）を集計し、単一の値にして、 `key=vendor; values=VendorScore` というタプルのリストにします。

この時点で、 `cata` 関数は `VendorScore` のリストを返します。 このリストから最高スコアを取得するには、`List.sortByDescending` と `List.tryHead` を使います。 リストが空の場合もあるため、`maxBy` は使えないことに注意してください。

以下は `mostUsedVendor` 関数の全体像です。

```fsharp
let mostUsedVendor product =

    let fBought (bought:BoughtProduct) = 
        // ベンダーがある場合、スコアを1に設定
        bought.vendor
        |> Option.map (fun vendor -> {vendor = vendor; score = 1} )
        // => VendorScore option
        |> Option.toList
        // => VendorScore list

    let fMade (name,weight,subresults) = 
        // subresultsは(qty * VendorScore list)のリスト

        // スコアの合計を取得するヘルパー
        let totalScore (vendor,vendorScores) =
            let totalScore = vendorScores |> List.sumBy score
            {vendor=vendor; score=totalScore}

        subresults 
        // => (qty * VendorScore list)のリスト
        |> List.collect snd  // サブ結果のqty部分を無視
        // => VendorScoreのリスト 
        |> List.groupBy vendor 
        // 2番目の項目はVendorScoreのリスト、合計に縮小
        |> List.map totalScore 
        // => VendorScoreのリスト 

    // カタモーフィズムを呼び出す
    cataProduct fBought fMade product
    |> List.sortByDescending score  // 最高スコアを見つける
    // リストが空の場合はNone、そうでなければ最初の要素を返す
    |> List.tryHead
```

この関数をテストしてみましょう。

```fsharp
label |> mostUsedVendor    
// Some {vendor = "ACME"; score = 1}

formulation |> mostUsedVendor  
// None

shampoo |> mostUsedVendor  
// Some {vendor = "ACME"; score = 2}

twoPack |> mostUsedVendor  
// Some {vendor = "ACME"; score = 4}
```

  
`fMade` 関数の実装方法は他にもあります。 `List.fold` を使って一度の処理で全体を処理することもできましたが、
このバージョンは最もわかりやすく読みやすい実装です。

また、`cataProduct` を使わずに `mostUsedVendor` をゼロから書くこともできます。
パフォーマンスが重要であれば、そちらの方が良いかもしれません。汎用的なカタモーフィズムは、（ `qty * VendorScore option` のリストのような）
一般化されすぎていて無駄な中間値を作成するからです。

一方で、カタモーフィズムを使うことで、カウントロジックだけに集中し、再帰処理のロジックを無視することができます。

したがって、いつものように、再利用と新規作成のメリットとデメリットを検討する必要があります。 共通コードを一度書いて標準化された方法で使うことの利点と、
カスタムコードのパフォーマンス向上、追加作業、潜在的なバグの問題を天秤にかけなければなりません。

<hr>

## まとめ

この記事では、再帰型を定義する方法とカタモーフィズムについて説明しました。

また、カタモーフィズムの使い方もいくつか紹介しました。

* `Gift -> 'r` のような、再帰型を「折りたたむ」関数は、その型のカタモーフィズムを使って書くことができます。
* カタモーフィズムを使って型の内部構造を隠せます。
* 各ケースを処理する関数を調整することで、カタモーフィズムを使ってある型から別の型へマッピングできます。
* 型のケースコンストラクタを渡すことで、カタモーフィズムを使って元の値のクローンを作成できます。

しかし、カタモーフィズムの世界は完璧ではありません。 このページにあるカタモーフィズムの実装にはすべて、潜在的に深刻な欠陥があります。

[次回の記事](../posts/recursive-types-and-folds-2.md) では、
何がうまくいかないのか、どのように修正すればいいのか、そしてその過程で様々な種類の「fold」を見ていきます。

それでは、また次回お会いしましょう！

* この記事のソースコードは [このgist](https://gist.github.com/swlaschin/dc2b3fcdca319ca8be60) で入手できます。

* 追記： コメントで Paul Schnapp 氏が指摘した `mostUsedVendor` 関数のロジックエラーを修正しました。 ありがとう、Paul さん!
