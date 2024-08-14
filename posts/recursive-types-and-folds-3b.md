---
layout: post
title: "現実世界の木構造"
description: "データベース、JSONとエラーハンドリングの例"
seriesId: "再帰型と畳み込み"
seriesOrder: 6
categories: [Folds, Patterns]
---

この記事はシリーズの第6弾です。

[前回の記事](../posts/recursive-types-and-folds-3.md)では、ジェネリック型について簡単に見てきました。

この記事では、実際の場面で木構造と畳み込みを使う例をいくつか掘り下げていきます。

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
  * [`fold` の導入](../posts/recursive-types-and-folds-2.md#fold)
  * [foldの問題点](../posts/recursive-types-and-folds-2.md#problems)
  * [関数をアキュムレーターとして使う](../posts/recursive-types-and-folds-2.md#functions)
  * [`foldback` の導入](../posts/recursive-types-and-folds-2.md#foldback)
  * [畳み込みの作成ルール](../posts/recursive-types-and-folds-2.md#rules)
* **パート4: 畳み込みを理解する**
  * [反復 vs. 再帰](../posts/recursive-types-and-folds-2b.md#iteration)
  * [畳み込みの例: ファイルシステムドメイン](../posts/recursive-types-and-folds-2b.md#file-system)
  * [「畳み込み」に関するよくある質問](../posts/recursive-types-and-folds-2b.md#questions)
* **パート5: ジェネリック再帰型**
  * [ジェネリック再帰型 LinkedList](../posts/recursive-types-and-folds-3.md#linkedlist)
  * [ギフトドメインをジェネリックにする](../posts/recursive-types-and-folds-3.md#revisiting-gift)
  * [ジェネリックなコンテナ型の定義](../posts/recursive-types-and-folds-3.md#container)
  * [ギフトドメインを実装する3つ目の方法](../posts/recursive-types-and-folds-3.md#another-gift)
  * [抽象か具象か？3通りの設計の比較](../posts/recursive-types-and-folds-3.md#compare)
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


<a id="tree"></a>
<hr>

## ジェネリックな Tree 型の定義

今回は、以前検討したファイルシステムドメインに着想を得たジェネリックな `Tree` 型を使って作業を進めます。

元の設計は次のようでした。

```fsharp
type FileSystemItem =
    | File of FileInfo
    | Directory of DirectoryInfo
and FileInfo = {name:string; fileSize:int}
and DirectoryInfo = {name:string; dirSize:int; subitems:FileSystemItem list}
```

データと再帰を分離し、次のようなジェネリックな `Tree` 型を作れます。

```fsharp
type Tree<'LeafData,'INodeData> =
    | LeafNode of 'LeafData
    | InternalNode of 'INodeData * Tree<'LeafData,'INodeData> seq
```

サブアイテムを表すのに `list` ではなく `seq` を使っていることに注目してください。その理由はすぐに明らかになります。

ファイルシステムドメインは、`Tree` を使って次のようにモデル化できます。リーフノードには `FileInfo` を、内部ノードには `DirectoryInfo` を関連付けます。

```fsharp
type FileInfo = {name:string; fileSize:int}
type DirectoryInfo = {name:string; dirSize:int}

type FileSystemItem = Tree<FileInfo,DirectoryInfo>
```

### Tree 向けの `cata` と `fold`

いつものように `cata` と `fold` を定義できます。

```fsharp
module Tree = 

    let rec cata fLeaf fNode (tree:Tree<'LeafData,'INodeData>) :'r = 
        let recurse = cata fLeaf fNode  
        match tree with
        | LeafNode leafInfo -> 
            fLeaf leafInfo 
        | InternalNode (nodeInfo,subtrees) -> 
            fNode nodeInfo (subtrees |> Seq.map recurse)

    let rec fold fLeaf fNode acc (tree:Tree<'LeafData,'INodeData>) :'r = 
        let recurse = fold fLeaf fNode  
        match tree with
        | LeafNode leafInfo -> 
            fLeaf acc leafInfo 
        | InternalNode (nodeInfo,subtrees) -> 
            // このレベルでのローカルな累積値を決定
            let localAccum = fNode acc nodeInfo
            // Seq.foldを使ってすべてのサブアイテムにローカルな累積値を通す
            let finalAccum = subtrees |> Seq.fold recurse localAccum 
            // ...そして返す
            finalAccum 
```

今回は `Tree` 型に対して `foldBack` を実装しません。スタックオーバーフローを引き起こすほどツリーが深くなることは考えにくいからです。
内部データが必要な関数は `cata` を使えます。

### Tree を使ったファイルシステムドメインのモデリング

前回の例と同じ値を使ってテストしてみましょう。

```fsharp
let fromFile (fileInfo:FileInfo) = 
    LeafNode fileInfo 

let fromDir (dirInfo:DirectoryInfo) subitems = 
    InternalNode (dirInfo,subitems)

let readme = fromFile {name="readme.txt"; fileSize=1}
let config = fromFile {name="config.xml"; fileSize=2}
let build  = fromFile {name="build.bat"; fileSize=3}
let src = fromDir {name="src"; dirSize=10} [readme; config; build]
let bin = fromDir {name="bin"; dirSize=10} []
let root = fromDir {name="root"; dirSize=5} [src; bin]
```

`totalSize` 関数は、前回の記事とほぼ同じです。

```fsharp
let totalSize fileSystemItem =
    let fFile acc (file:FileInfo) = 
        acc + file.fileSize
    let fDir acc (dir:DirectoryInfo)= 
        acc + dir.dirSize
    Tree.fold fFile fDir 0 fileSystemItem 

readme |> totalSize  // 1
src |> totalSize     // 16 = 10 + (1 + 2 + 3)
root |> totalSize    // 31 = 5 + 16 + 10
```

`largestFile` 関数も同様です。

```fsharp
let largestFile fileSystemItem =
    let fFile (largestSoFarOpt:FileInfo option) (file:FileInfo) = 
        match largestSoFarOpt with
        | None -> 
            Some file                
        | Some largestSoFar -> 
            if largestSoFar.fileSize > file.fileSize then
                Some largestSoFar
            else
                Some file

    let fDir largestSoFarOpt dirInfo = 
        largestSoFarOpt

    // foldを呼び出す
    Tree.fold fFile fDir None fileSystemItem

readme |> largestFile  
// Some {name = "readme.txt"; fileSize = 1}

src |> largestFile     
// Some {name = "build.bat"; fileSize = 3}

bin |> largestFile     
// None

root |> largestFile    
// Some {name = "build.bat"; fileSize = 3}
```

このセクションのソースコードは [このgist](https://gist.github.com/swlaschin/1ef784481bae91b63a36) で入手できます。

<a id="reuse"></a>

## 現実世界での木構造型

`Tree` 型は、実際のファイルシステムもモデル化できます！
リーフノードの型を `System.IO.FileInfo` に、内部ノードの型を `System.IO.DirectoryInfo` に設定するだけです。

```fsharp
open System
open System.IO

type FileSystemTree = Tree<IO.FileInfo,IO.DirectoryInfo>
```

さまざまなノードを作成するヘルパーメソッドも用意しましょう。

```fsharp
let fromFile (fileInfo:FileInfo) = 
    LeafNode fileInfo 

let rec fromDir (dirInfo:DirectoryInfo) = 
    let subItems = seq{
        yield! dirInfo.EnumerateFiles() |> Seq.map fromFile
        yield! dirInfo.EnumerateDirectories() |> Seq.map fromDir
        }
    InternalNode (dirInfo,subItems)
```

サブアイテムに `list` ではなく `seq` を理由がこれでわかります。
`seq` は遅延評価なので、実際にディスクにアクセスしなくてもノードを作成できるのです。

次は、実際のファイル情報を使った `totalSize` 関数です。

```fsharp
let totalSize fileSystemItem =
    let fFile acc (file:FileInfo) = 
        acc + file.Length
    let fDir acc (dir:DirectoryInfo)= 
        acc 
    Tree.fold fFile fDir 0L fileSystemItem 
```

現在のディレクトリのサイズを確認してみましょう。

```fsharp
// カレントディレクトリを現在のソースディレクトリに設定
Directory.SetCurrentDirectory __SOURCE_DIRECTORY__

// カレントディレクトリをTreeとして取得
let currentDir = fromDir (DirectoryInfo("."))

// カレントディレクトリのサイズを取得
currentDir  |> totalSize  
```

同様に、一番大きなファイルを取得できます。

```fsharp
let largestFile fileSystemItem =
    let fFile (largestSoFarOpt:FileInfo option) (file:FileInfo) = 
        match largestSoFarOpt with
        | None -> 
            Some file                
        | Some largestSoFar -> 
            if largestSoFar.Length > file.Length then
                Some largestSoFar
            else
                Some file

    let fDir largestSoFarOpt dirInfo = 
        largestSoFarOpt

    // foldを呼び出す
    Tree.fold fFile fDir None fileSystemItem

currentDir |> largestFile  
```

これが、ジェネリックな再帰型を使う大きな利点の一つです。現実世界の階層構造をツリー構造に変換できれば、畳み込みのメリットをすべて「無料で」得られるのです。

<a id="map"></a>

## ジェネリック型を使ったマッピング

ジェネリック型を使うもう一つの利点は、`map` 関数のような操作ができることです。`map` は、構造を変えずにすべての要素を新しい型に変換します。

実際のファイルシステムでこれを見てみましょう。まずは、`Tree` 型の `map` 関数を定義しましょう。

`map` 関数の実装は、以下のルールに従って機械的に行うことができます。

* 構造内の各ケースを処理する関数パラメータを作成する
* 再帰しないケースの場合
  * まず、関数パラメータを使ってそのケースに関連する非再帰データを変換する
  * 次に、結果を同じケースコンストラクタでラップする
* 再帰的なケースの場合、以下のステップを実行する
  * まず、関数パラメータを使ってそのケースに関連する非再帰データを変換する
  * 次に、ネストされた値を再帰的に `map` する
  * 最後に、結果を同じケースのコンストラクタでラップする

これらのルールに従って作成した `Tree` 型の `map` 関数の実装は次のとおりです。
  
```fsharp
module Tree = 

    let rec cata ...

    let rec fold ...

    let rec map fLeaf fNode (tree:Tree<'LeafData,'INodeData>) = 
        let recurse = map fLeaf fNode  
        match tree with
        | LeafNode leafInfo -> 
            let newLeafInfo = fLeaf leafInfo
            LeafNode newLeafInfo 
        | InternalNode (nodeInfo,subtrees) -> 
            let newNodeInfo = fNode nodeInfo
            let newSubtrees = subtrees |> Seq.map recurse 
            InternalNode (newNodeInfo, newSubtrees)
```

`Tree.map` のシグネチャを見ると、すべてのリーフのデータが型 `'a` に、すべてのノードのデータが型 `'b` に変換され、
最終的な結果は `Tree<'a,'b>` になることがわかります。

```fsharp
val map :
  fLeaf:('LeafData -> 'a) ->
  fNode:('INodeData -> 'b) ->
  tree:Tree<'LeafData,'INodeData> -> 
  Tree<'a,'b>
```

`Tree.iter` 関数も同様の方法で定義できます。

```fsharp
module Tree = 

    let rec map ...

    let rec iter fLeaf fNode (tree:Tree<'LeafData,'INodeData>) = 
        let recurse = iter fLeaf fNode  
        match tree with
        | LeafNode leafInfo -> 
            fLeaf leafInfo
        | InternalNode (nodeInfo,subtrees) -> 
            subtrees |> Seq.iter recurse 
            fNode nodeInfo
```


<a id="listing"></a>
<hr>

## 例：ディレクトリ一覧の作成

`map` 関数を使ってファイルシステムをディレクトリ一覧に変換してみましょう。ディレクトリ一覧とは、各ファイルやディレクトリの情報を含む文字列の木構造のことです。
コードは以下のようになります。

```fsharp
let dirListing fileSystemItem =
    let printDate (d:DateTime) = d.ToString()
    let mapFile (fi:FileInfo) = 
        sprintf "%10i  %s  %-s"  fi.Length (printDate fi.LastWriteTime) fi.Name
    let mapDir (di:DirectoryInfo) = 
        di.FullName 
    Tree.map mapFile mapDir fileSystemItem
```

変換された文字列は次のように出力することができます。

```fsharp
currentDir 
|> dirListing 
|> Tree.iter (printfn "%s") (printfn "\n%s")
```

結果はこのようになります。

```text
  8315  10/08/2015 23:37:41  Fold.fsx
  3680  11/08/2015 23:59:01  FoldAndRecursiveTypes.fsproj
  1010  11/08/2015 01:19:07  FoldAndRecursiveTypes.sln
  1107  11/08/2015 23:59:01  HtmlDom.fsx
    79  11/08/2015 01:21:54  LinkedList.fsx
```

*この例のソースコードは、[このgist](https://gist.github.com/swlaschin/77fadc19acb8cc850276) で入手できます。*

<a id="grep"></a>
<hr>

## 例：並列 grep

もっと複雑な例として、「grep」コマンドのような並列検索機能を `fold` 関数を使って作成してみます。

ロジックは以下の通りです。

* `fold` 関数を使ってファイルを反復処理します。
* 各ファイルに対して、名前が指定のパターンに一致しなければ、 `None` を返します。
* 処理対象のファイルであれば、ファイル内のマッチした行をすべて返す非同期処理を返します。
* これらの非同期処理 (fold の出力) をすべて集約してシーケンスにします。
* 非同期処理のシーケンスを `Async.Parallel` 関数を使って単一の非同期処理に変換し、結果の一覧を取得します。

メインのコードを書く前に、ヘルパー関数が必要です。

まず、ファイル内の行を非同期で畳み込むジェネリック関数を作成します。
これがパターンマッチングの基盤となります。

```fsharp
/// ファイル内の行を非同期で畳み込む
/// 現在の行と行番号をフォルダ関数に渡す。
///
/// シグネチャ：
///   folder:('a -> int -> string -> 'a) -> 
///   acc:'a -> 
///   fi:FileInfo -> 
///   Async<'a>
let foldLinesAsync folder acc (fi:FileInfo) = 
    async {
        let mutable acc = acc
        let mutable lineNo = 1
        use sr = new StreamReader(path=fi.FullName)
        while not sr.EndOfStream do
            let! lineText = sr.ReadLineAsync() |> Async.AwaitTask
            acc <- folder acc lineNo lineText 
            lineNo <- lineNo + 1
        return acc
    }
```

次に、`Async` 値に対して `map` を行うヘルパー関数を作成します。

```fsharp
let asyncMap f asyncX = async { 
    let! x = asyncX
    return (f x)  }
```

いよいよ本題のロジックです。 `textPattern` と `FileInfo` が与えられたとき、 `textPattern` に一致する行のリストを非同期で返す関数を作ります。

```fsharp
/// ファイル内の一致する行を、async<string list>として返す
let matchPattern textPattern (fi:FileInfo) = 
    // 正規表現を設定
    let regex = Text.RegularExpressions.Regex(pattern=textPattern)
    
    // "fold"で使う関数を設定
    let folder results lineNo lineText =
        if regex.IsMatch lineText then
            let result = sprintf "%40s:%-5i   %s" fi.Name lineNo lineText
            result :: results
        else
            // そのまま通過
            results
    
    // メインのフロー
    fi
    |> foldLinesAsync folder []
    // foldの出力は逆順なので、反転させる
    |> asyncMap List.rev
```

そして、いよいよ `grep` 関数の実装です。

```fsharp
let grep filePattern textPattern fileSystemItem =
    let regex = Text.RegularExpressions.Regex(pattern=filePattern)

    /// ファイルがパターンに一致する場合
    /// マッチングを行い、Some asyncを返す、そうでなければNone
    let matchFile (fi:FileInfo) =
        if regex.IsMatch fi.Name then
            Some (matchPattern textPattern fi)
        else
            None

    /// ファイルを処理し、その非同期処理をリストに追加
    let fFile asyncs (fi:FileInfo) = 
        // 非同期処理のリストに追加
        (matchFile fi) :: asyncs 

    // ディレクトリの場合、非同期処理のリストをそのまま通過
    let fDir asyncs (di:DirectoryInfo)  = 
        asyncs 

    fileSystemItem
    |> Tree.fold fFile fDir []    // 非同期処理のリストを取得
    |> Seq.choose id              // Someを選択（ファイルが処理された場所）
    |> Async.Parallel             // すべての非同期処理を一つの非同期処理にマージ
    |> asyncMap (Array.toList >> List.collect id)  // 配列のリストを一つのリストにフラット化
```

実際に動かしてみましょう！

```fsharp
currentDir 
|> grep "fsx" "LinkedList" 
|> Async.RunSynchronously
```

結果はこのようになります。

```text
"                  SizeOfTypes.fsx:120     type LinkedList<'a> = ";
"                  SizeOfTypes.fsx:122         | Cell of head:'a * tail:LinkedList<'a>";
"                  SizeOfTypes.fsx:125     let S = size(LinkedList<'a>)";
"      RecursiveTypesAndFold-3.fsx:15      // LinkedList";
"      RecursiveTypesAndFold-3.fsx:18      type LinkedList<'a> = ";
"      RecursiveTypesAndFold-3.fsx:20          | Cons of head:'a * tail:LinkedList<'a>";
"      RecursiveTypesAndFold-3.fsx:26      module LinkedList = ";
"      RecursiveTypesAndFold-3.fsx:39              list:LinkedList<'a> ";
"      RecursiveTypesAndFold-3.fsx:64              list:LinkedList<'a> -> ";
```

およそ40行のコードでこのような機能を実現できました。簡潔に書けるのは、さまざまな種類の `fold` と `map` 関数を使うことで再帰処理を隠し、
パターンマッチングロジックだけに集中できるからです。

もちろん、この実装は効率的ではなく最適化されていません（各行に対して非同期処理を生成するため）。実用的な grep としては使えませんが、`fold` 関数の持つ力を示す良い例です。

*この例のソースコードは、[このgist](https://gist.github.com/swlaschin/137c322b5a46b97cc8be) で入手できます。*

<a id="database"></a>
<hr>

## 例：ファイルシステムをデータベースに保存する

次の例では、ファイルシステムのツリーをデータベース内に保存する方法を見ていきます。正直なところ、そんなことをする理由は特にありませんが、
階層構造を保存するのと同じ仕組みが使えるので、ひとまず実演してみましょう。

データベースでファイルシステムの階層構造を表現するために、4 つのテーブルを用意します。

* `DbDir` は、各ディレクトリの情報を保存します。
* `DbFile`は、各ファイルの情報を保存します。
* `DbDir_File`は、ディレクトリとファイルの関係を保存します。
* `DbDir_Dir`は、親ディレクトリと子ディレクトリの関係を保存します。

データベーステーブルの定義は次のとおりです。

```text
CREATE TABLE DbDir (
	DirId int IDENTITY NOT NULL,
	Name nvarchar(50) NOT NULL
)

CREATE TABLE DbFile (
	FileId int IDENTITY NOT NULL,
	Name nvarchar(50) NOT NULL,
	FileSize int NOT NULL
)

CREATE TABLE DbDir_File (
	DirId int NOT NULL,
	FileId int NOT NULL
)

CREATE TABLE DbDir_Dir (
	ParentDirId int NOT NULL,
	ChildDirId int NOT NULL
)
```

とてもシンプルですね。しかし、ディレクトリとその子アイテムとの関係すべてを保存するには、まずすべての子アイテムの ID が必要であり、
さらに各子ディレクトリもそれぞれの子の ID を必要とし、以下同様に階層が続いていきます。

そのため、階層下位のデータにアクセスできるように `cata` を使用する必要があります（ `fold` は使えません）。

### データベース関数の実装

今回は [SQL Provider](https://fsprojects.github.io/SQLProvider/) を使いません。代わりに、次のようなダミー関数をはじめとして、
独自のテーブル挿入関数を作成しました。

```fsharp
/// DbFileレコードを挿入 
let insertDbFile name (fileSize:int64) =
    let id = nextIdentity()
    printfn "%10s: inserting id:%i name:%s size:%i" "DbFile" id name fileSize
```

実際のデータベースでは、IDENTITYカラムは自動生成されますが、この例では `nextIdentity` という小さなヘルパー関数を使用します。

```fsharp
let nextIdentity =
    let id = ref 0
    fun () -> 
        id := !id + 1
        !id
        
// テスト
nextIdentity() // 1
nextIdentity() // 2
nextIdentity() // 3
```

ディレクトリを挿入するには、まずディレクトリ内のすべてのファイルの ID を知る必要があります。
つまり、`insertDbFile` 関数は生成された ID を返すようにする必要があります。

```fsharp
/// DbFileレコードを挿入し、新しいファイルIDを返す
let insertDbFile name (fileSize:int64) =
    let id = nextIdentity()
    printfn "%10s: inserting id:%i name:%s size:%i" "DbFile" id name fileSize
    id
```

同じことがディレクトリにも当てはまります。

```fsharp
/// DbDirレコードを挿入し、新しいディレクトリIDを返す
let insertDbDir name =
    let id = nextIdentity()
    printfn "%10s: inserting id:%i name:%s" "DbDir" id name
    id
```

しかし、まだ不十分です。子 ID を親ディレクトリに渡す際、ファイルとディレクトリを区別する必要があります。
関係は異なるテーブルに保存されるからです。

問題ありません。選択型を使って、両者を区別しましょう。

```fsharp
type PrimaryKey =
    | FileId of int
    | DirId of int
```

これで、データベース関数の実装を完成させられます。

```fsharp
/// DbFileレコードを挿入し、新しいPrimaryKeyを返す
let insertDbFile name (fileSize:int64) =
    let id = nextIdentity()
    printfn "%10s: inserting id:%i name:%s size:%i" "DbFile" id name fileSize
    FileId id

/// DbDirレコードを挿入し、新しいPrimaryKeyを返す
let insertDbDir name =
    let id = nextIdentity()
    printfn "%10s: inserting id:%i name:%s" "DbDir" id name
    DirId id

/// DbDir_Fileレコードを挿入
let insertDbDir_File dirId fileId =
    printfn "%10s: inserting parentDir:%i childFile:%i" "DbDir_File" dirId fileId 

/// DbDir_Dirレコードを挿入
let insertDbDir_Dir parentDirId childDirId =
    printfn "%10s: inserting parentDir:%i childDir:%i" "DbDir_Dir" parentDirId childDirId
```

### カタモーフィズムによる処理

前述のとおり、各ステップで内部 ID が必要なので、`fold` ではなく `cata` を使う必要があります。

`File` ケースを処理する関数は簡単です。挿入して、`PrimaryKey` を返します。

```fsharp
let fFile (fi:FileInfo) = 
    insertDbFile fi.Name fi.Length
```

`Directory` ケースを処理する関数は、`DirectoryInfo` と、すでに挿入された子の `PrimaryKey` のシーケンスを受け取ります。

この関数は、まずメインのディレクトリレコードを挿入し、次に子要素を挿入して、上位レベルの `PrimaryKey` を返します。

```fsharp
let fDir (di:DirectoryInfo) childIds  = 
    let dirId = insertDbDir di.Name
    // 子を挿入
    // 親にIDを返す
    dirId
```

ディレクトリレコードを挿入して ID を取得した後、子 ID ごとに、`childId` の種類に応じて
`DbDir_File` テーブルまたは `DbDir_Dir` テーブルに挿入します。

```fsharp
let fDir (di:DirectoryInfo) childIds  = 
    let dirId = insertDbDir di.Name
    let parentPK = pkToInt dirId 
    childIds |> Seq.iter (fun childId ->
        match childId with
        | FileId fileId -> insertDbDir_File parentPK fileId 
        | DirId childDirId -> insertDbDir_Dir parentPK childDirId 
    )
    // 親にIDを返す
    dirId
```

また、`PrimaryKey` 型から整数 ID を抽出する小さなヘルパー関数 `pkToInt` も作成しました。

すべてのコードをまとめて以下に示します。

```fsharp
open System
open System.IO

let nextIdentity =
    let id = ref 0
    fun () -> 
        id := !id + 1
        !id

type PrimaryKey =
    | FileId of int
    | DirId of int

/// DbFileレコードを挿入し、新しいPrimaryKeyを返す
let insertDbFile name (fileSize:int64) =
    let id = nextIdentity()
    printfn "%10s: inserting id:%i name:%s size:%i" "DbFile" id name fileSize
    FileId id

/// DbDirレコードを挿入し、新しいPrimaryKeyを返す
let insertDbDir name =
    let id = nextIdentity()
    printfn "%10s: inserting id:%i name:%s" "DbDir" id name
    DirId id

/// DbDir_Fileレコードを挿入
let insertDbDir_File dirId fileId =
    printfn "%10s: inserting parentDir:%i childFile:%i" "DbDir_File" dirId fileId 

/// DbDir_Dirレコードを挿入
let insertDbDir_Dir parentDirId childDirId =
    printfn "%10s: inserting parentDir:%i childDir:%i" "DbDir_Dir" parentDirId childDirId
    
let pkToInt primaryKey = 
    match primaryKey with
    | FileId fileId -> fileId 
    | DirId dirId -> dirId 

let insertFileSystemTree fileSystemItem =

    let fFile (fi:FileInfo) = 
        insertDbFile fi.Name fi.Length

    let fDir (di:DirectoryInfo) childIds  = 
        let dirId = insertDbDir di.Name
        let parentPK = pkToInt dirId 
        childIds |> Seq.iter (fun childId ->
            match childId with
            | FileId fileId -> insertDbDir_File parentPK fileId 
            | DirId childDirId -> insertDbDir_Dir parentPK childDirId 
        )
        // 親にIDを返す
        dirId

    fileSystemItem
    |> Tree.cata fFile fDir 
```

それでは、テストしてみましょう。

```fsharp
// カレントディレクトリをTreeとして取得
let currentDir = fromDir (DirectoryInfo("."))

// データベースに挿入
currentDir 
|> insertFileSystemTree
```

出力は次のようなものになるはずです。

```text
     DbDir: inserting id:41 name:FoldAndRecursiveTypes
    DbFile: inserting id:42 name:Fold.fsx size:8315
DbDir_File: inserting parentDir:41 childFile:42
    DbFile: inserting id:43 name:FoldAndRecursiveTypes.fsproj size:3680
DbDir_File: inserting parentDir:41 childFile:43
    DbFile: inserting id:44 name:FoldAndRecursiveTypes.sln size:1010
DbDir_File: inserting parentDir:41 childFile:44
...
     DbDir: inserting id:57 name:bin
     DbDir: inserting id:58 name:Debug
 DbDir_Dir: inserting parentDir:57 childDir:58
 DbDir_Dir: inserting parentDir:41 childDir:57
```

ファイルが反復処理されるにつれて ID が生成され、各 `DbFile` の挿入後に `DbDir_File` の挿入が続くことがわかります。

*この例のソースコードは [このgist](https://gist.github.com/swlaschin/3a416f26d873faa84cde) で入手できます。*


<a id="tojson"></a>
<hr>

## 例：木構造をJSONにシリアライズする

別のよくある課題として、木構造をJSON、XML、またはその他の形式にシリアライズおよびデシリアライズすることが挙げられます。

ここでもGiftドメインを使いますが、今回は、`Gift`型を木構造としてモデル化してみます。つまり、一つの箱に複数のものを入れられるようになります。

### Giftドメインを木構造としてモデル化する

主要な型はこれまでと変わりませんが、最後の`Gift`型が木構造として定義されている点に注目してください。

```fsharp
type Book = {title: string; price: decimal}
type ChocolateType = Dark | Milk | SeventyPercent
type Chocolate = {chocType: ChocolateType ; price: decimal}

type WrappingPaperStyle = 
    | HappyBirthday
    | HappyHolidays
    | SolidColor

// 非再帰的なケースのための統一データ
type GiftContents = 
    | Book of Book
    | Chocolate of Chocolate 

// 再帰的なケースのための統一データ
type GiftDecoration = 
    | Wrapped of WrappingPaperStyle
    | Boxed 
    | WithACard of string

type Gift = Tree<GiftContents,GiftDecoration>
```

いつものように、`Gift`の構築を補助するヘルパー関数を作成できます。

```fsharp
let fromBook book = 
    LeafNode (Book book)

let fromChoc choc = 
    LeafNode (Chocolate choc)

let wrapInPaper paperStyle innerGift = 
    let container = Wrapped paperStyle 
    InternalNode (container, [innerGift])

let putInBox innerGift = 
    let container = Boxed
    InternalNode (container, [innerGift])

let withCard message innerGift = 
    let container = WithACard message
    InternalNode (container, [innerGift])

let putTwoThingsInBox innerGift innerGift2 = 
    let container = Boxed
    InternalNode (container, [innerGift;innerGift2])
```

そして、サンプルデータを生成することができます。

```fsharp
let wolfHall = {title="Wolf Hall"; price=20m}
let yummyChoc = {chocType=SeventyPercent; price=5m}

let birthdayPresent = 
    wolfHall 
    |> fromBook
    |> wrapInPaper HappyBirthday
    |> withCard "Happy Birthday"
 
let christmasPresent = 
    yummyChoc
    |> fromChoc
    |> putInBox
    |> wrapInPaper HappyHolidays

let twoBirthdayPresents = 
    let thing1 = wolfHall |> fromBook 
    let thing2 = yummyChoc |> fromChoc
    putTwoThingsInBox thing1 thing2 
    |> wrapInPaper HappyBirthday

let twoWrappedPresentsInBox = 
    let thing1 = wolfHall |> fromBook |> wrapInPaper HappyHolidays
    let thing2 = yummyChoc |> fromChoc  |> wrapInPaper HappyBirthday
    putTwoThingsInBox thing1 thing2 
```

`description` のような関数は、内部テキストの **リスト** を処理する必要があります。そこで、文字列を `&` で連結します。

```fsharp
let description gift =

    let fLeaf leafData = 
        match leafData with
        | Book book ->
            sprintf "'%s'" book.title
        | Chocolate choc ->
            sprintf "%A chocolate" choc.chocType

    let fNode nodeData innerTexts = 
        let innerText = String.concat " & " innerTexts 
        match nodeData with
        | Wrapped style ->
            sprintf "%s wrapped in %A paper" innerText style
        | Boxed ->
            sprintf "%s in a box" innerText
        | WithACard message ->
            sprintf "%s with a card saying '%s'" innerText message 

    // メイン呼び出し
    Tree.cata fLeaf fNode gift  
```

最後に、この関数が以前と同様に動作し、複数のアイテムを正しく処理できることを確認します。

```fsharp
birthdayPresent |> description
// "'Wolf Hall' wrapped in HappyBirthday paper with a card saying 'Happy Birthday'"

christmasPresent |> description
// "SeventyPercent chocolate in a box wrapped in HappyHolidays paper"

twoBirthdayPresents |> description
// "'Wolf Hall' & SeventyPercent chocolate in a box 
//   wrapped in HappyBirthday paper"

twoWrappedPresentsInBox |> description
// "'Wolf Hall' wrapped in HappyHolidays paper 
//   & SeventyPercent chocolate wrapped in HappyBirthday paper 
//   in a box"
```

### ステップ1: `GiftDto` の定義

`Gift` 型は、さまざまな判別共用体で構成されています。経験上、このような型はシリアライゼーションにあまり向いていません。複雑な型は大抵そうなのです。

そこで、シリアライゼーションに最適化された [DTO](https://en.wikipedia.org/wiki/Data_transfer_object)型を定義するのが一般的です。
具体的には、以下の制約を守って DTO 型を設計します。

* レコード型のみ使用する
* レコードのフィールドは、`int`、`string`、`bool` などのプリミティブな値のみ使用する

これにより、次のような利点も得られます。

**シリアライゼーションの出力を制御できます。** このようなデータ型は、ほとんどのシリアライザーで同じように扱われます。
一方、 判別共用体のような特殊な型は、ライブラリによって解釈が異なる場合があります。

**エラー処理をより良くコントロールできます。** シリアライズされたデータを取り扱う際の鉄則は、「信用しない」です。
データ自体は正しい構造を持っていても、ドメイン的におかしなことがよくあります。
たとえば、本来 null ではありえない文字列が null だったり、文字列の長さがオーバーしたり、整数値が範囲外だったりします。

DTO を使うことで、デシリアライゼーション処理自体は確実に機能するようになります。その後、DTO をドメイン型に変換する際に、
適切なバリデーションを行うことができます。

では、ドメイン用の DTO 型を定義してみましょう。各 DTO 型はドメイン型に対応するので、まずは `GiftContents` から始めます。
対応する DTO 型として、`GiftContentsDto` を以下のように定義します。

```fsharp
[<CLIMutableAttribute>]
type GiftContentsDto = {
    discriminator : string // "Book" または "Chocolate"
    // "Book"ケースのみ
    bookTitle: string    
    // "Chocolate"ケースのみ
    chocolateType : string // "Dark" "Milk" "SeventyPercent"のいずれか
    // すべてのケース
    price: decimal
    }
```

ご覧の通り、元の `GiftContents` とは大きく異なります。違いを見てみましょう。

* まず、`CLIMutableAttribute` が付与されています。これにより、デシリアライザーはリフレクションを使ってオブジェクトを構築できるようになります。
* 次に、`discriminator` (判別子) があり、元の判別共用体のどのケースが使用されているかを判別します。
  この文字列はどんな値でも設定できるので、DTO からドメイン型に戻す際には慎重にチェックする必要があります。
* その次は、保存が必要なデータ項目ごとに 1 つずつフィールドが用意されています。たとえば、`Book` のケースでは `bookTitle` が必要ですが、`Chocolate` のケースではチョコレートの種類が必要です。
  最後に、どちらのケースにも存在する `price` フィールドがあります。
  なお、チョコレートの種類も文字列として保持されるので、DTO からドメインに変換する際に特別な扱いが必要になります。

`GiftDecorationDto` 型も同様に、判別子と文字列を使って作成されます。判別共用体は使われません。

```fsharp
[<CLIMutableAttribute>]
type GiftDecorationDto = {
    discriminator: string // "Wrapped" または "Boxed" または "WithACard"
    // "Wrapped"ケースのみ
    wrappingPaperStyle: string  // "HappyBirthday" または "HappyHolidays" または "SolidColor"   
    // "WithACard"ケースのみ
    message: string  
    }
```

最後に、2 つの DTO 型で構成された木構造を持つ `GiftDto` 型を定義します。

```fsharp
type GiftDto = Tree<GiftContentsDto,GiftDecorationDto>
```

### ステップ 2: `Gift` から `GiftDto` への変換

DTO 型を定義したので、
次に、`Tree.map` 関数を使って `Gift` を `GiftDto` へ変換します。
変換を行うには、`GiftContents` から `GiftContentsDto` へ、`GiftDecoration` から `GiftContentsDto` へ変換する関数をそれぞれ用意する必要があります。

以下は `giftToDto` 関数のコードです。コード自体はわかりやすいので、詳細な説明は省略します。

```fsharp
let giftToDto (gift:Gift) :GiftDto =
    
    let fLeaf leafData :GiftContentsDto = 
        match leafData with
        | Book book ->
            {discriminator= "Book"; bookTitle=book.title; chocolateType=null; price=book.price}
        | Chocolate choc ->
            let chocolateType = sprintf "%A" choc.chocType
            {discriminator= "Chocolate"; bookTitle=null; chocolateType=chocolateType; price=choc.price}

    let fNode nodeData :GiftDecorationDto = 
        match nodeData with
        | Wrapped style ->
            let wrappingPaperStyle = sprintf "%A" style
            {discriminator= "Wrapped"; wrappingPaperStyle=wrappingPaperStyle; message=null}
        | Boxed ->
            {discriminator= "Boxed"; wrappingPaperStyle=null; message=null}
        | WithACard message ->
            {discriminator= "WithACard"; wrappingPaperStyle=null; message=message}

    // メイン呼び出し
    Tree.map fLeaf fNode gift  
```

コードを見ると、`Book` や `Chocolate` などのケースは `discriminator` 文字列に変換され、`chocolateType` も同様に文字列に変換されていることがわかります。
これは、上で説明した通りです。

### ステップ 3: `TreeDto` の定義

適切な DTO はレコード型であるべきだと説明しました。木のノードは変換しましたが、木*自体*はまだ共用体型です。
したがって、`Tree` 型も `TreeDto` 型のようなものに変換する必要があります。

変換方法は、ギフトの DTO 型と同様に、すべてのデータを含むレコード型を作成します。
前と同じように `discriminator` フィールドを使用することもできますが、今回はリーフノードと内部ノードの 2 種類しかないため、デシリアライズ時に値が null かどうかをチェックするだけで十分です。
リーフ値が null でない場合は、レコードが `LeafNode` ケースを表し、そうでない場合は `InternalNode` ケースを表します。

データ型の定義は以下の通りです。

```fsharp
/// ツリーを表すDTO
/// Leaf/Nodeの選択はレコードに変換される
[<CLIMutableAttribute>]
type TreeDto<'LeafData,'NodeData> = {
    leafData : 'LeafData
    nodeData : 'NodeData
    subtrees : TreeDto<'LeafData,'NodeData>[] }
```

以前と同じように、この型には `CLIMutableAttribute` が適用されています。また、すべての選択肢のデータを格納するためのフィールドも備えています。
`subtrees` は、シリアライザーが扱いやすいように、シーケンスではなく配列として格納されています。

`TreeDto` を作成するには、お馴染みの `cata` 関数を使って通常の `Tree` からレコードを組み立てます。

```fsharp
/// ツリーをTreeDtoに変換する
let treeToDto tree : TreeDto<'LeafData,'NodeData> =
    
    let fLeaf leafData  = 
        let nodeData = Unchecked.defaultof<'NodeData>
        let subtrees = [||]
        {leafData=leafData; nodeData=nodeData; subtrees=subtrees}

    let fNode nodeData subtrees = 
        let leafData = Unchecked.defaultof<'NodeData>
        let subtrees = subtrees |> Seq.toArray 
        {leafData=leafData; nodeData=nodeData; subtrees=subtrees}

    // 再帰的にTreeDtoを構築
    Tree.cata fLeaf fNode tree 
```

F# ではレコードは null を許容しないため、欠けているデータを示すには `null` ではなく `Unchecked.defaultof<'NodeData'>` を使っています。

また、`LeafData` や `NodeData` は参照型であることを前提としています。
もし `LeafData` や `NodeData` が `int` や `bool` といった値型である場合、このアプローチは機能しなくなります。なぜなら、既定値と欠けている値を区別できなくなるからです。
そのような場合は、前のように `discriminator` フィールドを使ってください。

あるいは、`IDictionary` を使うこともできます。この場合、デシリアライズは少し面倒になりますが、null チェックの必要性はなくなります。

### ステップ 4: `TreeDto` のシリアライズ

最後に、JSON シリアライザーを使って `TreeDto` をシリアライズできます。

この例では、NuGet パッケージに依存しなくて済むように、組み込みの `DataContractJsonSerializer` を使っています。
本格的なプロジェクトでは、より適したシリアライザーを使用することもできます。

```fsharp
#r "System.Runtime.Serialization.dll"

open System.Runtime.Serialization
open System.Runtime.Serialization.Json

let toJson (o:'a) = 
    let serializer = new DataContractJsonSerializer(typeof<'a>)
    let encoding = System.Text.UTF8Encoding()
    use stream = new System.IO.MemoryStream()
    serializer.WriteObject(stream,o) 
    stream.Close()
    encoding.GetString(stream.ToArray())
```

###  ステップ 5: パイプラインの組み立て

ここまでの手順をまとめると、次のようなパイプラインになります。

* `giftToDto` 関数を使って `Gift` を `GiftDto` に変換します。<br>
   つまり、`Tree<GiftContents, GiftDecoration>` から `Tree<GiftContentsDto, GiftDecorationDto>` へ変換するために `Tree.map` 関数を使います。
* `treeToDto` 関数を使って `Tree` を `TreeDto` に変換します。<br>
   つまり、`Tree<GiftContentsDto, GiftDecorationDto>` から `TreeDto<GiftContentsDto, GiftDecorationDto>` へ変換するために `Tree.cata` 関数を使います。 
* `TreeDto` を JSON 文字列にシリアライズします。

コード例は次のとおりです。

```fsharp
let goodJson = christmasPresent |> giftToDto |> treeToDto |> toJson  
```

生成される JSON 出力は次のようになります。

```text
{
  "leafData@": null,
  "nodeData@": {
    "discriminator@": "Wrapped",
    "message@": null,
    "wrappingPaperStyle@": "HappyHolidays"
  },
  "subtrees@": [
    {
      "leafData@": null,
      "nodeData@": {
        "discriminator@": "Boxed",
        "message@": null,
        "wrappingPaperStyle@": null
      },
      "subtrees@": [
        {
          "leafData@": {
            "bookTitle@": null,
            "chocolateType@": "SeventyPercent",
            "discriminator@": "Chocolate",
            "price@": 5
          },
          "nodeData@": null,
          "subtrees@": []
        }
      ]
    }
  ]
}
```

フィールド名の前にある見栄えの悪い `@` 記号は、F# のレコード型をシリアライズする際の副作用です。
少しの手間で修正できますが、今回は割愛します。

*この例のソースコードは [このgist](https://gist.github.com/swlaschin/bbe70c768215b209c06c) で入手できます。*

<a id="fromjson"></a>
<hr>

## 例：JSONを木構造にデシリアライズする

JSON を作成したので、今度は逆に JSON を読み込んで `Gift` に変換してみましょう。

簡単です。パイプラインを逆にするだけです。

* JSON 文字列を `TreeDto` にデシリアライズします。
* `dtoToTree` 関数を使って `TreeDto` を `Tree` に変換します。<br>
   つまり、`TreeDto<GiftContentsDto, GiftDecorationDto>` から `Tree<GiftContentsDto, GiftDecorationDto>` へ変換します。
   ここでは `cata` は使えず、小さな再帰ループを作成する必要があります。
* `dtoToGift` 関数を使って `GiftDto` を `Gift` に変換します。<br>
   つまり、`Tree<GiftContentsDto, GiftDecorationDto>` から `Tree<GiftContents, GiftDecoration>` へ変換するために `Tree.map` 関数を使います。

### ステップ 1: `TreeDto` のデシリアライズ

JSON シリアライザーを使って `TreeDto` をデシリアライズできます。

```fsharp
let fromJson<'a> str = 
    let serializer = new DataContractJsonSerializer(typeof<'a>)
    let encoding = System.Text.UTF8Encoding()
    use stream = new System.IO.MemoryStream(encoding.GetBytes(s=str))
    let obj = serializer.ReadObject(stream) 
    obj :?> 'a
```

デシリアライズに失敗した場合どうなるでしょうか。今回はエラー処理を無視して、例外を伝播させます。

### ステップ 2: `TreeDto` から `Tree` への変換

`TreeDto` を `Tree` に変換するには、レコードとそのサブツリーを再帰的にループ処理し、
適切なフィールドが null かどうかによってそれぞれを `InternalNode` または `LeafNode` に変換します。

```fsharp
let rec dtoToTree (treeDto:TreeDto<'Leaf,'Node>) :Tree<'Leaf,'Node> =
    let nullLeaf = Unchecked.defaultof<'Leaf>
    let nullNode = Unchecked.defaultof<'Node>
    
    // nodeDataが存在するかチェック
    if treeDto.nodeData <> nullNode then
        if treeDto.subtrees = null then
            failwith "ノードデータが存在する場合、subtreesはnullであってはいけません"
        else
            let subtrees = treeDto.subtrees |> Array.map dtoToTree 
            InternalNode (treeDto.nodeData,subtrees)
    // leafDataが存在するかチェック
    elif treeDto.leafData <> nullLeaf then
        LeafNode (treeDto.leafData) 
    // 両方が欠けている場合は失敗
    else
        failwith "リーフまたはノードデータが必要です"
```

ご覧のように、いくつかの問題が発生する可能性があります。

* `leafData` フィールドと `nodeData` フィールドがどちらも null だった場合
* `nodeData` フィールドが null ではなく、`subtrees` フィールドが null だった場合

ここでも、エラー処理は無視して例外をスローするだけにします (今のところ)。

*質問: `TreeDto` 用の `cata` を作成して、このコードを簡潔にできますか？作成する価値はありますか？*

### ステップ 3: `GiftDto` から `Gift` への変換

適切な木構造が得られたら、`Tree.map` 関数を使って、各リーフノードと内部ノードを DTO 型から実際のドメイン型に変換します。

そのためには、`GiftContentsDto` を `GiftContents` に、`GiftDecorationDto` を `GiftDecoration` に変換する関数が必要です。

コード全体は以下の通りです。逆方向の変換よりもかなり複雑になっています。

コードは次のようにグループ化されています。

* 文字列を適切なドメイン型に変換し、入力が不正な場合は例外をスローするヘルパー関数（たとえば、`strToChocolateType`）
* DTO 全体を変換するケース変換関数（たとえば、`bookFromDto`）
* 最後に、`dtoToGift` 関数自体です。この関数は `discriminator` フィールドを見て、呼び出すべきケース変換関数を選択し、
  `discriminator` の値が認識されない場合は例外をスローします。

```fsharp
let strToBookTitle str =
    match str with
    | null -> failwith "BookTitleはnullであってはいけません" 
    | _ -> str

let strToChocolateType str =
    match str with
    | "Dark" -> Dark
    | "Milk" -> Milk
    | "SeventyPercent" -> SeventyPercent
    | _ -> failwithf "ChocolateType %s は認識されません" str

let strToWrappingPaperStyle str =
    match str with
    | "HappyBirthday" -> HappyBirthday
    | "HappyHolidays" -> HappyHolidays
    | "SolidColor" -> SolidColor
    | _ -> failwithf "WrappingPaperStyle %s は認識されません" str

let strToCardMessage str =
    match str with
    | null -> failwith "CardMessageはnullであってはいけません" 
    | _ -> str

let bookFromDto (dto:GiftContentsDto) =
    let bookTitle = strToBookTitle dto.bookTitle
    Book {title=bookTitle; price=dto.price}

let chocolateFromDto (dto:GiftContentsDto) =
    let chocType = strToChocolateType dto.chocolateType 
    Chocolate {chocType=chocType; price=dto.price}

let wrappedFromDto (dto:GiftDecorationDto) =
    let wrappingPaperStyle = strToWrappingPaperStyle dto.wrappingPaperStyle
    Wrapped wrappingPaperStyle 

let boxedFromDto (dto:GiftDecorationDto) =
    Boxed

let withACardFromDto (dto:GiftDecorationDto) =
    let message = strToCardMessage dto.message
    WithACard message 

/// GiftDtoをGiftに変換する
let dtoToGift (giftDto:GiftDto) :Gift=

    let fLeaf (leafDto:GiftContentsDto) = 
        match leafDto.discriminator with
        | "Book" -> bookFromDto leafDto
        | "Chocolate" -> chocolateFromDto leafDto
        | _ -> failwithf "不明なリーフディスクリミネータ '%s'" leafDto.discriminator 

    let fNode (nodeDto:GiftDecorationDto)  = 
        match nodeDto.discriminator with
        | "Wrapped" -> wrappedFromDto nodeDto
        | "Boxed" -> boxedFromDto nodeDto
        | "WithACard" -> withACardFromDto nodeDto
        | _ -> failwithf "不明なノードディスクリミネータ '%s'" nodeDto.discriminator 

    // ツリーをマップする
    Tree.map fLeaf fNode giftDto  
```

### ステップ 4: パイプラインの組み立て

これで、JSON 文字列を受け取って `Gift` オブジェクトを作成するパイプラインを組み立てることができます。

```fsharp
let goodGift = goodJson |> fromJson |> dtoToTree |> dtoToGift

// 説明が変わっていないか確認
goodGift |> description
// "SeventyPercent chocolate in a box wrapped in HappyHolidays paper"
```

この方法でも動作しますが、エラーハンドリングがひどいものです。

JSON を少し壊してみましょう。

```fsharp
let badJson1 = goodJson.Replace("leafData","leafDataXX")

let badJson1_result = badJson1 |> fromJson |> dtoToTree |> dtoToGift
// 例外 "データ契約型'TreeDto'は必要なデータメンバー'leafData@'が見つからなかったためデシリアライズできません。"
```

すると、見栄えの悪い例外が発生します。

または、判別子が間違っていたらどうでしょうか？

```fsharp
let badJson2 = goodJson.Replace("Wrapped","Wrapped2")

let badJson2_result = badJson2 |> fromJson |> dtoToTree |> dtoToGift
// 例外 "不明なノードディスクリミネータ 'Wrapped2'"
```

あるいは、WrappingPaperStyleの値が間違っていたら？

```fsharp
let badJson3 = goodJson.Replace("HappyHolidays","HappyHolidays2")
let badJson3_result = badJson3 |> fromJson |> dtoToTree |> dtoToGift
// 例外 "WrappingPaperStyle HappyHolidays2 は認識されません"
```

多くの例外が発生しますが、関数型プログラミングでは、可能な限り例外を排除するように努めるべきです。

その方法については、次のセクションで説明します。

*この例のソースコードは [このgist](https://gist.github.com/swlaschin/bbe70c768215b209c06c) で入手できます。*

<a id="json-with-error-handling"></a>
<hr>

## 例：JSON からのツリーのデシリアライズ - エラーハンドリング付き

エラーハンドリングの問題に対処するために、以下のような `Result` 型を使用します。

```fsharp
type Result<'a> = 
    | Success of 'a
    | Failure of string list
```

ここでは、この型がどのように機能するかは説明しません。
このアプローチに慣れていない場合は、[私の記事](../posts/recipe-part2.md) または関数型エラーハンドリングに関する[私の講演資料](https://fsharpforfunandprofit.com/rop/) を参照してください。

前のセクションのすべてのステップをもう一度見直して、例外をスローする代わりに `Result` 型を使ってみましょう。

### ステップ 1: `TreeDto` のデシリアライズ

JSON シリアライザーを使って `TreeDto` をデシリアライズする際、例外を捕捉して `Result` に変換します。

```fsharp
let fromJson<'a> str = 
    try
        let serializer = new DataContractJsonSerializer(typeof<'a>)
        let encoding = System.Text.UTF8Encoding()
        use stream = new System.IO.MemoryStream(encoding.GetBytes(s=str))
        let obj = serializer.ReadObject(stream) 
        obj :?> 'a 
        |> Result.retn
    with
    | ex -> 
        Result.failWithMsg ex.Message
```

これで、`fromJson` 関数のシグネチャは `string -> Result<'a>` になりました。

### ステップ2: `TreeDto` から `Tree` へ

前回の変換処理と同様に、レコードとそのサブツリーを再帰的にループ処理して、 `TreeDto` を `Tree` に変換します。各要素は `InternalNode` または `LeafNode` に変換します。
今回は、エラー処理のために `Result` 型を使用します。

```fsharp
let rec dtoToTreeOfResults (treeDto:TreeDto<'Leaf,'Node>) :Tree<Result<'Leaf>,Result<'Node>> =
    let nullLeaf = Unchecked.defaultof<'Leaf>
    let nullNode = Unchecked.defaultof<'Node>
    
    // nodeDataが存在するかチェック
    if treeDto.nodeData <> nullNode then
        if treeDto.subtrees = null then
            LeafNode <| Result.failWithMsg "ノードデータが存在する場合、subtreesはnullであってはいけません"
        else
            let subtrees = treeDto.subtrees |> Array.map dtoToTreeOfResults 
            InternalNode (Result.retn treeDto.nodeData,subtrees) 
    // leafDataが存在するかチェック
    elif treeDto.leafData <> nullLeaf then
        LeafNode <| Result.retn (treeDto.leafData) 
    // 両方が欠けている場合は失敗
    else
        LeafNode <| Result.failWithMsg "リーフまたはノードデータが必要です"
        
// val dtoToTreeOfResults : 
//   treeDto:TreeDto<'Leaf,'Node> -> Tree<Result<'Leaf>,Result<'Node>>
```

しかし、これではすべての内部ノードとリーフノードが `Result` でラップされてしまい、結果的に `Result` の木構造になってしまいます。
型としては `Tree<Result<'Leaf>, Result<'Node>>` になり、見栄えが悪いです。

このままでは使えません。**本来**欲しいのは、すべてのエラーをまとめて `Tree` を含む `Result` を返すことです。

では、「 `Result` の木構造」 を 「木構造 の `Result` 」へ変換するにはどうすればよいでしょうか？

答えは `sequence` 関数を使うことです。
`sequence` 関数は、二つの型を「入れ替える」ような働きをします。`sequence` については、[持ち上げられた世界に関するシリーズ](../posts/elevated-world-4.md#sequence) で詳しく説明されています。

*注: 少し複雑な `traverse` 関数を使えば `map` と `sequence` を一度のステップで結合することもできますが、
今回の例ではステップを分けることで理解しやすくしています。*

`Tree` と `Result` の組み合わせのための `sequence` 関数を作成する必要があります。
幸い、`sequence` 関数の作成は機械的なプロセスで行えます。

* 下位の型（`Result`）には `apply` と `return` 関数を定義する必要があります。 `apply` の意味は[こちら](../posts/elevated-world.md#apply)を参照してください。
* 上位の型（`Tree`）には `cata` 関数が必要です。これは既にあります。
* カタモーフィズムでは、上位型の各コンストラクタ（`LeafNode` と `InternalNode`）を `Result` 型に「持ち上げる」（例： `retn LeafNode <*> data`）ように置き換えます。

これが実際のコードです。すぐには理解できなくても心配しないでください。一度この関数を定義すれば、
以降の `Tree` と `Result` の組み合わせでも同じように使えます。

```fsharp
/// ResultのツリーをツリーのResultに変換する
let sequenceTreeOfResult tree =
    // 下位レベルから
    let (<*>) = Result.apply 
    let retn = Result.retn

    // 走査可能なレベルから
    let fLeaf data = 
        retn LeafNode <*> data

    let fNode data subitems = 
        let makeNode data items = InternalNode(data,items)
        let subItems = Result.sequenceSeq subitems 
        retn makeNode <*> data <*> subItems

    // 走査を行う
    Tree.cata fLeaf fNode tree
    
// val sequenceTreeOfResult :
//    tree:Tree<Result<'a>,Result<'b>> -> Result<Tree<'a,'b>>
```

最後に、実際の `dtoToTree` 関数はとても簡単です。`treeDto` を `dtoToTreeOfResults` に渡し、`sequenceTreeOfResult` を使って最終結果を `Result<Tree<..>>` に変換するだけです。
これがまさに我々が求めていたものです。

```fsharp
let dtoToTree treeDto =
    treeDto |> dtoToTreeOfResults |> sequenceTreeOfResult 
    
// val dtoToTree : treeDto:TreeDto<'a,'b> -> Result<Tree<'a,'b>>    
```

### ステップ3: `GiftDto` から `Gift` へ

こちらも `Tree.map` を使って、リーフノードと内部ノードをそれぞれ DTO から適切なドメイン型に変換します。

ただし、今回の関数はエラー処理を行うため、`GiftContentsDto` を `Result<GiftContents>` に、`GiftDecorationDto` を `Result<GiftDecoration>` に変換する必要があります。
結果として、またしても「 `Result` の木構造」になってしまうため、
`sequenceTreeOfResult` を再び使って正しい `Result<Tree<..>>` の形に戻す必要があります。

まずは、文字列を適切なドメイン型に変換するヘルパーメソッド (`strToChocolateType` など) を作成します。
今回は例外をスローするのではなく、`Result` を返します。

```fsharp
let strToBookTitle str =
    match str with
    | null -> Result.failWithMsg "BookTitleはnullであってはいけません"
    | _ -> Result.retn str

let strToChocolateType str =
    match str with
    | "Dark" -> Result.retn Dark
    | "Milk" -> Result.retn Milk
    | "SeventyPercent" -> Result.retn SeventyPercent
    | _ -> Result.failWithMsg (sprintf "ChocolateType %s は認識されません" str)

let strToWrappingPaperStyle str =
    match str with
    | "HappyBirthday" -> Result.retn HappyBirthday
    | "HappyHolidays" -> Result.retn HappyHolidays
    | "SolidColor" -> Result.retn SolidColor
    | _ -> Result.failWithMsg (sprintf "WrappingPaperStyle %s は認識されません" str)

let strToCardMessage str =
    match str with
    | null -> Result.failWithMsg "CardMessageはnullであってはいけません" 
    | _ -> Result.retn str
```

ケース変換メソッドは、通常の値ではなく `Result` である引数から、`Book` や `Chocolate` を構築する必要があります。
このような場合に、`Result.lift2` のような「持ち上げ」関数が役立ちます。
持ち上げの仕組みについては、[持ち上げに関する記事](../posts/elevated-world.md#lift)と[アプリカティブを使った検証に関する記事](../posts/elevated-world-3.md#validation) を参照してください。 
  
```fsharp
let bookFromDto (dto:GiftContentsDto) =
    let book bookTitle price = 
        Book {title=bookTitle; price=price}

    let bookTitle = strToBookTitle dto.bookTitle
    let price = Result.retn dto.price
    Result.lift2 book bookTitle price 

let chocolateFromDto (dto:GiftContentsDto) =
    let choc chocType price = 
        Chocolate {chocType=chocType; price=price}

    let chocType = strToChocolateType dto.chocolateType 
    let price = Result.retn dto.price
    Result.lift2 choc chocType price 

let wrappedFromDto (dto:GiftDecorationDto) =
    let wrappingPaperStyle = strToWrappingPaperStyle dto.wrappingPaperStyle
    Result.map Wrapped wrappingPaperStyle 

let boxedFromDto (dto:GiftDecorationDto) =
    Result.retn Boxed

let withACardFromDto (dto:GiftDecorationDto) =
    let message = strToCardMessage dto.message
    Result.map WithACard message 
```

そして最後に、`dtoToGift` 関数自体が、`discriminator` が不正な場合に `Result` を返すように変更されています。

変換処理によりやはり `Result` の木構造が生成されるため、`Tree.map` の出力を `sequenceTreeOfResult` に渡して ... 

```fsharp
`Tree.map fLeaf fNode giftDto |> sequenceTreeOfResult`
```

... 木構造の `Result` を返します。

`dtoToGift` の完全なコードは次のとおりです。

```fsharp
open TreeDto_WithErrorHandling

/// GiftDtoをResult<Gift>に変換する
let dtoToGift (giftDto:GiftDto) :Result<Gift>=
    
    let fLeaf (leafDto:GiftContentsDto) = 
        match leafDto.discriminator with
        | "Book" -> bookFromDto leafDto
        | "Chocolate" -> chocolateFromDto leafDto
        | _ -> Result.failWithMsg (sprintf "不明なリーフディスクリミネータ '%s'" leafDto.discriminator) 

    let fNode (nodeDto:GiftDecorationDto)  = 
        match nodeDto.discriminator with
        | "Wrapped" -> wrappedFromDto nodeDto
        | "Boxed" -> boxedFromDto nodeDto
        | "WithACard" -> withACardFromDto nodeDto
        | _ -> Result.failWithMsg (sprintf "不明なノードディスクリミネータ '%s'" nodeDto.discriminator)

    // ツリーをマップする
    Tree.map fLeaf fNode giftDto |> sequenceTreeOfResult   
```

`dtoToGift` の型シグネチャが変更されました。以前は単に `Gift` を返していましたが、今回からは `Result<Gift>` を返すようになりました。

```fsharp
// val dtoToGift : GiftDto -> Result<GiftUsingTree.Gift>
```


### ステップ4: パイプラインの組み立て

JSON 文字列を受け取って `Gift` オブジェクトを作成するパイプラインを、再度組み立てましょう。

ただし、新しいエラー処理コードを使用するために、以下の変更が必要です。

* `fromJson` 関数は `Result<TreeDto>` を返しますが、パイプラインの次の関数 (`dtoToTree`) は通常の `TreeDto` を入力として想定しています。
* 同様に、`dtoToTree` は `Result<Tree>` を返しますが、次の関数 (`dtoToGift`) は通常の `Tree` を入力として想定しています。

どちらの場合も、`Result.bind` を使って、この出力/入力の不一致の問題を解決できます。[bindの詳細な説明はこちら](../posts/elevated-world-2.md#bind)を参照してください。

それでは、以前作成した `goodJson` 文字列のデシリアライズを試してみましょう。

```fsharp
let goodGift = goodJson |> fromJson |> Result.bind dtoToTree |> Result.bind dtoToGift

// 説明が変わっていないか確認
goodGift |> description
// Success "SeventyPercent chocolate in a box wrapped in HappyHolidays paper"
```

問題ありません。

エラー処理が改善されたかどうかを確認しましょう。
もう一度 JSON を不正な形式にしてみます。

```fsharp
let badJson1 = goodJson.Replace("leafData","leafDataXX")

let badJson1_result = badJson1 |> fromJson |> Result.bind dtoToTree |> Result.bind dtoToGift
// Failure ["'TreeDto'型のデータ契約を必要なデータメンバー'leafData@'が見つからなかったためデシリアライズできません。"]
```

素晴らしい！ きちんと `Failure` ケースが得られました。

では、判別子が間違っていたらどうでしょうか？

```fsharp
let badJson2 = goodJson.Replace("Wrapped","Wrapped2")
let badJson2_result = badJson2 |> fromJson |> Result.bind dtoToTree |> Result.bind dtoToGift
// Failure ["不明なノードディスクリミネータ 'Wrapped2'"]
```

あるいは、 `WrappingPaperStyle` の値のいずれかが間違っていたら？

```fsharp
let badJson3 = goodJson.Replace("HappyHolidays","HappyHolidays2")
let badJson3_result = badJson3 |> fromJson |> Result.bind dtoToTree |> Result.bind dtoToGift
// Failure ["WrappingPaperStyle HappyHolidays2 は認識されません"]
```

ここでも、`Failure` ケースが正しく動作しています。

非常に重要な点として（例外処理アプローチでは提供できませんが）、複数のエラーが存在する場合、
さまざまなエラーを集約して、一度に 1 つのエラーではなく、*すべての*問題点をリスト化することができます。

この動作を確認しましょう。2 つのエラーを JSON 文字列に導入してみます。

```fsharp
// 2つのエラーを作成
let badJson4 = goodJson.Replace("HappyHolidays","HappyHolidays2")
                       .Replace("SeventyPercent","SeventyPercent2")
let badJson4_result = badJson4 |> fromJson |> Result.bind dtoToTree |> Result.bind dtoToGift
// Failure ["WrappingPaperStyle HappyHolidays2 は認識されません"; 
//          "ChocolateType SeventyPercent2 は認識されません"]
```

以上のように、今回の取り組みは成功だったと言えるでしょう。

*この例のソースコードは [このgist](https://gist.github.com/swlaschin/2b06fe266e3299a656c1) で入手できます。*

<hr>
    
## まとめ

このシリーズでは、カタモーフィズムと畳み込みの定義方法、そして特に今回の記事においては、それらを現実世界の問題解決に適用する方法を解説しました。
このシリーズが皆様にとって有用なものであり、ご自身のコードに適用できるヒントや洞察を提供できたことを願っています。

シリーズは当初の予定よりも長くなってしまいましたが、最後までお読みいただきありがとうございました！ ではまた！



