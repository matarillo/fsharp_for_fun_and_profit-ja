---
layout: post
title: "畳み込みを理解する"
description: "再帰と反復の比較"
seriesId: "再帰型と畳み込み"
seriesOrder: 4
categories: [畳み込み, パターン]
---

これはシリーズの第 4 回目です。

[前回の記事](../posts/recursive-types-and-folds.md) では、再帰型に対してトップダウンの反復関数を作成する「畳み込み」を紹介しました。

今回は、畳み込みについてさらに詳しく理解していきます。

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

<a id="iteration"></a>
<hr>

## 反復 vs 再帰

現在、 `cata` 、 `fold` 、 `foldback` という 3 つの関数があります。

これらの違いは何でしょうか？ `fold` で動作しないものが `foldBack` では動作することはわかりました。
しかし、違いを簡単に覚えられますか？

3 つの違いを区別する 1 つの方法は、次のように覚えることです。

* `fold`: トップダウンの *反復*
* `cata`: ボトムアップの *再帰*
* `foldBack`: ボトムアップの *反復*

これはどういう意味でしょうか？

`fold` では、アキュムレーターが最上位レベルで初期化され、下位の各レベルに渡されて、最終的に最下位レベルに到達します。

コードで表現すると、各レベルは次のように処理されます。

```text
accumulatorFromHigherLevel, combined with 
  stuffFromThisLevel 
    => stuffToSendDownToNextLowerLevel
```

命令型言語では、これはアキュムレーターを保持する可変変数を持つ「forループ」とまったく同じです。

```fsharp
var accumulator = initialValue
foreach level in levels do
{
  accumulator, combined with 
    stuffFromThisLevel 
      => update accumulator
}
```

つまり、このようなトップダウンの畳み込みは反復と見なせます。実際、 F# コンパイラはこのような末尾再帰関数を裏で反復に変換します。

一方、`cata` では、アキュムレーターは下位レベルから始まり、上位レベルに順次渡され、最終的に最上位レベルに到達します。

コードで表現すると、各レベルは次のように処理されます。

```text
accumulatorFromLowerLevel, combined with 
  stuffFromThisLevel 
    => stuffToSendUpToNextHigherLevel
```

これはまさに、再帰ループです。

```fsharp
let recurse (head::tail) =
    if atBottomLevel then
       return something
    else    // 最下位レベルでない場合
       let accumulatorFromLowerLevel = recurse tail
       return stuffFromThisLevel, combined with 
          accumulatorFromLowerLevel
```

最後に、`foldback` は「逆向きの反復」と考えることができます。アキュムレーターはすべてのレベルを通過しますが、最上位ではなく最下位から始まります。
これは、`cata` と同様に、内側の値が最初に計算され、上に渡されるという利点がありますが、
反復であるため、スタックオーバーフローが発生しません。

これまで議論してきた概念の多くは、反復と再帰という観点で表現すると、より明確になります。たとえば：

* 反復版（ `fold` と `foldback` ）はスタックがなく、スタックオーバーフローを引き起こしません。
* 「合計金額」関数は内部データが必要ないので、トップダウンの反復版（ `fold` ）が問題なく動作しました。
* 一方、「説明」関数は正しいフォーマットにするために内部テキストが必要だったため、再帰版（ `cata` ）またはボトムアップの反復版（ `foldback` ）がより適していました。

<a id="file-system"></a>

## ファイルシステムドメインにおける畳み込みの例

前回の記事では、畳み込みを作成するためのいくつかのルールについて説明しました。
今回は、これらのルールを適用して、[第2回目の記事](../posts/recursive-types-and-folds-1b.md#file-system)で扱った
「ファイルシステム」ドメインの畳み込みを作成できるか見てみましょう。

復習のため、前回の記事で扱った単純な「ファイルシステム」ドメインを以下に示します。

```fsharp
type FileSystemItem =
    | File of File
    | Directory of Directory
and File = {name:string; fileSize:int}
and Directory = {name:string; dirSize:int; subitems:FileSystemItem list}
```

ここで注意してほしいのは、各ディレクトリはサブアイテムの *リスト* を保持しているため、ファイルシステムは `Gift` のような線形構造ではなく、木構造であるということです。
畳み込みの実装では、この点を考慮する必要があります。

サンプル値は以下のとおりです。

```fsharp
let readme = File {name="readme.txt"; fileSize=1}
let config = File {name="config.xml"; fileSize=2}
let build  = File {name="build.bat"; fileSize=3}
let src = Directory {name="src"; dirSize=10; subitems=[readme; config; build]}
let bin = Directory {name="bin"; dirSize=10; subitems=[]}
let root = Directory {name="root"; dirSize=5; subitems=[src; bin]}
```

畳み込み関数は `foldFS` としましょう。
ルールに従って、アキュムレーターのパラメータ `acc` を追加し、それを `File` ケースに渡してみましょう。

```fsharp
let rec foldFS fFile fDir acc item :'r = 
    let recurse = foldFS fFile fDir 
    match item with
    | File file -> 
        fFile acc file
    | Directory dir -> 
        // 実装予定
```

`Directory` ケースはもう少し複雑です。
サブアイテムについて知ることはできないため、使用できるデータは、`name`、`dirSize`、そして上位レベルから渡され渡されるアキュムレーター `acc` だけです。これらを組み合わせて新しいアキュムレーターを作成します。

```fsharp
| Directory dir -> 
    let newAcc = fDir acc (dir.name,dir.dirSize) 
    // 実装予定
```

*注: この例では、グループ化のために `name` と `dirSize` をタプルとして扱っていますが、もちろん別々のパラメータとして渡すこともできます。*

次に、この新しいアキュムレーターを各サブアイテムに順番に渡す必要があります。 
しかし、各サブアイテムはそれぞれ新しいアキュムレーターを返すため、以下のアプローチが必要になります。

* 新しく作成したアキュムレーターを最初のサブアイテムに渡す。
* その出力（別のアキュムレーター）を 2 番目のサブアイテムに渡す。
* その出力（別のアキュムレーター）を 3 番目のサブアイテムに渡す。
* 以降同様。最後のサブアイテムの出力が最終結果になります。

このアプローチはすでに利用可能です。まさに `List.fold` が行っていることなのです。以下が `Directory` ケースのコードです。

```fsharp
| Directory dir -> 
    let newAcc = fDir acc (dir.name,dir.dirSize) 
    dir.subitems |> List.fold recurse newAcc 
```

そしてこちらが `foldFS` 関数の全体です。

```fsharp
let rec foldFS fFile fDir acc item :'r = 
    let recurse = foldFS fFile fDir 
    match item with
    | File file -> 
        fFile acc file
    | Directory dir -> 
        let newAcc = fDir acc (dir.name,dir.dirSize) 
        dir.subitems |> List.fold recurse newAcc 
```

これで、前回の記事で実装した 2 つの関数を書き直すことができます。

まず、すべてのサイズを合計する `totalSize` 関数です。

```fsharp
let totalSize fileSystemItem =
    let fFile acc (file:File) = 
        acc + file.fileSize
    let fDir acc (name,size) = 
        acc + size
    foldFS fFile fDir 0 fileSystemItem 
```

テストすると、以前と同じ結果が得られます。

```fsharp
readme |> totalSize  // 1
src |> totalSize     // 16 = 10 + (1 + 2 + 3)
root |> totalSize    // 31 = 5 + 16 + 10
```

### ファイルシステムドメイン: `largestFile` の例

「ファイルツリーの中で一番大きいファイルは何か？」という関数も再実装できます。

前回と同じく、ファイルツリーが空の場合もあるため、 `File option` を返します。つまり、アキュムレーターも `File option` になります。

少し複雑なのが `File` ケースのハンドラです。

* 渡されたアキュムレーターが `None` ならば、現在のファイルが新しいアキュムレーターになります。
* 渡されたアキュムレーターが `Some file` ならば、そのファイルのサイズと現在のファイルのサイズを比較します。大きい方が新しいアキュムレーターになります。

コードは以下の通りです。

```fsharp
let fFile (largestSoFarOpt:File option) (file:File) = 
    match largestSoFarOpt with
    | None -> 
        Some file                
    | Some largestSoFar -> 
        if largestSoFar.fileSize > file.fileSize then
            Some largestSoFar
        else
            Some file
```

一方、 `Directory` のハンドラは簡単です。単に「これまでの最大値」であるアキュムレーターを次のレベルに渡すだけです。

```fsharp
let fDir largestSoFarOpt (name,size) = 
    largestSoFarOpt
```

実装全体は以下の通りです。

```fsharp
let largestFile fileSystemItem =
    let fFile (largestSoFarOpt:File option) (file:File) = 
        match largestSoFarOpt with
        | None -> 
            Some file                
        | Some largestSoFar -> 
            if largestSoFar.fileSize > file.fileSize then
                Some largestSoFar
            else
                Some file

    let fDir largestSoFarOpt (name,size) = 
        largestSoFarOpt

    // 畳み込みを呼び出す
    foldFS fFile fDir None fileSystemItem
```

テストすると、以前と同じ結果が得られます。

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

この実装と、[前回の記事](../posts/recursive-types-and-folds-1b.md#file-system) の再帰版を比較してみると興味深いです。
個人的には、今回の方が実装しやすいと思います。

### 木構造走査の種類

これまで説明してきた畳み込み関数は、さまざまな種類の木構造走査に対応しています。

* 今回実装した `fold` 関数は、より正確には「先行順・深さ優先」探索と呼ばれます。
* `foldback` 関数は、「後行順・深さ優先」探索になります。
* `cata` 関数は「走査」とは呼べません。各内部ノードがすべての部分結果のリストを一度に扱うためです。

ロジックを調整することで、他にも変種を作成できます。

さまざまな種類の木構造走査については、[Wikipedia](https://ja.wikipedia.org/wiki/%E6%9C%A8%E6%A7%8B%E9%80%A0_%28%E3%83%87%E3%83%BC%E3%82%BF%E6%A7%8B%E9%80%A0%29#%E8%B5%B0%E6%9F%BB%E6%B3%95) を参照してください。

### `foldback` は必要か？

ファイルシステムドメインで `foldback` 関数を実装する必要はあるでしょうか？

私はそう思いません。内部データにアクセスしたいのであれば、前回の記事で紹介した「単純な」カタモーフィズム実装を使えばよいからです。

しかし、最初に「スタックオーバーフローに注意しなければならない」と言わなかったでしょうか？

確かに、再帰型が深くネストしている場合はそうです。しかし、ディレクトリごとにサブディレクトリが 2 つしかないファイルシステムを考えてみましょう。64 レベルネストした場合、ディレクトリはいくつになるでしょうか？
（ヒント：似たような問題があります。[チェス盤と小麦の問題](https://en.wikipedia.org/wiki/Wheat_and_chessboard_problem) など。）

以前、スタックオーバーフローは、1000 を超えるネストレベルでのみ発生することと、そのレベルのネストは通常、ファイルシステムドメインのような木構造ではなく、
*線形* の再帰型でのみ発生することを説明しました。


<a id="questions"></a>

## 「畳み込み」に関するよくある質問

ここまでで、さまざまな実装とそれぞれの長所短所について、少し圧倒されているかもしれませんね。

そこで、少し休憩して、よくある質問にお答えしましょう。

### 「左畳み込み」と「右畳み込み」の違い

畳み込みの用語について、しばしば混乱が見られます。「左」と「右」、「前方」と「後方」などです。

* **左畳み込み**または**前方畳み込み**は、 `fold` と呼んでいるトップダウンの反復的なアプローチです。
* **右畳み込み**または**後方畳み込み**は、 `foldBack` と呼んでいるボトムアップの反復的なアプローチです。

ただし、これらの用語は、 `Gift` のような線形の再帰構造にしか適用されません。
より複雑な木構造になると、これらの区別は単純すぎます。
なぜなら、幅優先、深さ優先、先行順、後行順など、多くの走査方法があるからです。

### どのタイプの畳み込み関数を使うべきか

以下にガイドラインを示します。

* 再帰型があまり深くネストしない場合（たとえば100レベル未満）、最初の記事で説明した単純な `cata` カタモーフィズムで十分です。
  これは機械的に実装するのが非常に簡単で、メインの再帰型を `'r` に置き換えるだけです。
* 再帰型が深くネストしていて、スタックオーバーフローを防ぎたい場合は、反復的な `fold` を使用します。
* 反復的な畳み込みを使用しているが、内部データにアクセスする必要がある場合は、アキュムレーターとして継続関数を渡します。
* 一般的に、反復的なアプローチは再帰的なアプローチよりも高速でメモリ使用量が少なくなります。（ただし、ネストした継続を多く渡すとその利点が失われます。）

別の考え方として、「結合」関数を見てみましょう。各ステップで、異なるレベルのデータを結合しているはずです。

```text
level1 data [combined with] level2 data [combined with] level3 data [combined with] level4 data
```

結合関数が次のように「左結合的」であれば、

```text
(((level1 combineWith level2) combineWith level3) combineWith level4)
```

反復的なアプローチを使用しますが、結合関数が次のように「右結合的」であれば、

```text
(level1 combineWith (level2 combineWith (level3 combineWith level4)))
```

`cata` または `foldback` アプローチを使います。

そして、結合の順番が関係ない場合（たとえば加算など）は、どちらを使用しても問題ありません。

### 末尾再帰かどうかを確認する方法

関数が末尾再帰かどうかをパッと見で判断するのは簡単ではありません。確実な方法は、各ケースの最後の式を確認することです。

最後の式が「再帰」の呼び出しなら、その関数は末尾再帰です。その後に他の処理があれば、末尾再帰ではありません。

これまで議論した3つの実装で確認してみましょう。

まず、元の `cataGift` 関数における `WithACard` ケースのコードです。

```fsharp
| WithACard (gift,message) -> 
    fCard (recurse gift,message) 
//         ~~~~~~~  <= 再帰呼び出しが最後の式ではありません。
//                     末尾再帰？ いいえ！
```

この `cataGift` 関数は**末尾再帰ではありません**。

次に、`foldGift` 関数のコードです。

```fsharp
| WithACard (innerGift,message) -> 
    let newAcc = fCard acc message 
    recurse newAcc innerGift
//  ~~~~~~~  <= 再帰呼び出しが最後の式です。
//              末尾再帰？ はい！
```

こちらは**末尾再帰です**。

最後に、`foldbackGift` 関数のコードです。

```fsharp
| WithACard (innerGift,message) -> 
    let newGenerator innerVal =
        let newInnerVal = fCard innerVal message 
        generator newInnerVal 
    recurse newGenerator innerGift 
//  ~~~~~~~  <= 再帰呼び出しが最後の式です。
//              末尾再帰？ はい！
```

こちらも**末尾再帰です**。

### 畳み込み処理を途中で打ち切るには？

C# のような言語では、`break` ステートメントを使ってループを途中で抜け出すことができます。

```csharp
foreach (var elem in collection)
{
    // 何かを行う
    
    if ( x == "error")
    {
        break;
    }
}
```

では、畳み込みで同じことをするにはどうすればよいでしょうか？

実は、途中で打ち切ることはできません。畳み込みはすべての要素を順に処理するように設計されています。ビジターパターンも同じような制限があります。

しかし、以下の 3 つの方法で回避することができます。

1つ目は、 `fold` 関数を使わずに、必要な条件で終了する独自の再帰関数を作成することです。

以下の例では、合計が 100 を超えたらループを抜け出します。

```fsharp
let rec firstSumBiggerThan100 sumSoFar listOfInts =
    match listOfInts with
    | [] -> 
        sumSoFar // すべての整数を使い果たした！
    | head::tail -> 
        let newSumSoFar = head + sumSoFar 
        if newSumSoFar > 100 then
            newSumSoFar 
        else
            firstSumBiggerThan100 newSumSoFar tail

// テスト
[30;40;50;60] |> firstSumBiggerThan100 0  // 120
[1..3..100] |> firstSumBiggerThan100 0  // 117
```

2つ目は、 `fold` 関数を使いますが、渡されるアキュムレーターに「無視フラグ」のようなものを追加します。
このフラグが設定されると、残りの反復は何もしません。

以下の例では、 `sumSoFar` と `ignoreFlag` のタプルをアキュムレーターとして、合計を求めます。

```fsharp
let firstSumBiggerThan100 listOfInts =

    let folder accumulator i =
        let (ignoreFlag,sumSoFar) = accumulator
        if not ignoreFlag then
            let newSumSoFar = i + sumSoFar 
            let newIgnoreFlag  = newSumSoFar > 100 
            (newIgnoreFlag, newSumSoFar)
        else
            // アキュムレーターをそのまま渡す
            accumulator 

    let initialAcc = (false,0)

    listOfInts 
    |> List.fold folder initialAcc  // foldを使用
    |> snd // sumSoFarを取得

/// テスト    
[30;40;50;60] |> firstSumBiggerThan100  // 120
[1..3..100] |> firstSumBiggerThan100  // 117
```

3つ目は、2つ目の方法の変形で、残りのデータを無視することを示す特別な値を作成しますが、
コンピュテーション式でラップして自然に見えるようにします。

この方法は [Tomas Petricek's blog](https://tomasp.net/blog/imperative-ii-break.aspx/) で紹介されており、コードは以下のようになります。

```fsharp
let firstSumBiggerThan100 listOfInts =
    let mutable sumSoFar = 0
    imperative { 
        for x in listOfInts do 
            sumSoFar <- x + sumSoFar 
            if sumSoFar > 100 then do! break
    }
    sumSoFar
```

<hr>
    
## まとめ

この記事の目的は、畳み込みをより深く理解し、ファイルシステムのような木構造に適用する方法を示すことでした。
お役に立てれば幸いです！

本シリーズのここまでは、すべての例が非常に具体的でした。各ドメインに対してカスタムの畳み込みを実装してきました。
もう少し汎用的に、再利用可能な畳み込みの実装を構築できないでしょうか？

[次の記事](../posts/recursive-types-and-folds-3.md)では、ジェネリックな再帰型とその扱い方について見ていきます。

*この記事のソースコードは[このgist](https://gist.github.com/swlaschin/e065b0e99dd68cd35846)で入手できます。*




