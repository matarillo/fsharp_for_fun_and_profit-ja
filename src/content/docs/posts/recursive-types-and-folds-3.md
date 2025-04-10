---
layout: post
title: "ジェネリック再帰型"
description: "ドメインを3つの方法で実装する"
seriesId: "再帰型と畳み込み"
seriesOrder: 5
categories: ["畳み込み", "パターン"]
---


これはシリーズ記事の第5回目です。

[前回](../posts/recursive-types-and-folds-2b.html)では、特定のドメイン型に対する畳み込みを理解するために時間を費やしました。

今回は視野を広げ、ジェネリック再帰型の使い方を見ていきます。

## シリーズの内容

シリーズの内容は次の通りです。

* **パート1: 再帰型とカタモーフィズム入門**
  * [シンプルな再帰型](../posts/recursive-types-and-folds.html#basic-recursive-type)
  * [すべてをパラメーター化](../posts/recursive-types-and-folds.html#parameterize)
  * [カタモーフィズムの紹介](../posts/recursive-types-and-folds.html#catamorphisms)
  * [カタモーフィズムの利点](../posts/recursive-types-and-folds.html#benefits)
  * [カタモーフィズム作成のルール](../posts/recursive-types-and-folds.html#rules)
* **パート2: カタモーフィズムの例**
  * [カタモーフィズムの例: ファイルシステムドメイン](../posts/recursive-types-and-folds-1b.html#file-system)
  * [カタモーフィズムの例: 製品ドメイン](../posts/recursive-types-and-folds-1b.html#product)
* **パート3: 畳み込みの紹介**
  * [カタモーフィズム実装の欠陥](../posts/recursive-types-and-folds-2.html#flaw)
  * [`fold` の導入](../posts/recursive-types-and-folds-2.html#fold)
  * [foldの問題点](../posts/recursive-types-and-folds-2.html#problems)
  * [関数をアキュムレーターとして使う](../posts/recursive-types-and-folds-2.html#functions)
  * [`foldback` の導入](../posts/recursive-types-and-folds-2.html#foldback)
  * [畳み込みの作成ルール](../posts/recursive-types-and-folds-2.html#rules)
* **パート4: 畳み込みを理解する**
  * [反復 vs. 再帰](../posts/recursive-types-and-folds-2b.html#iteration)
  * [畳み込みの例: ファイルシステムドメイン](../posts/recursive-types-and-folds-2b.html#file-system)
  * [「畳み込み」に関するよくある質問](../posts/recursive-types-and-folds-2b.html#questions)
* **パート5: ジェネリック再帰型**
  * [ジェネリック再帰型 LinkedList](../posts/recursive-types-and-folds-3.html#linkedlist)
  * [ギフトドメインをジェネリックにする](../posts/recursive-types-and-folds-3.html#revisiting-gift)
  * [ジェネリックなコンテナ型の定義](../posts/recursive-types-and-folds-3.html#container)
  * [ギフトドメインを実装する3つ目の方法](../posts/recursive-types-and-folds-3.html#another-gift)
  * [抽象か具象か？3通りの設計の比較](../posts/recursive-types-and-folds-3.html#compare)
* **パート6: 木構造の実践的な利用**
  * [ジェネリックな Tree 型の定義](../posts/recursive-types-and-folds-3b.html#tree)
  * [Tree 型の実践的な利用](../posts/recursive-types-and-folds-3b.html#reuse)
  * [Tree 型の写像](../posts/recursive-types-and-folds-3b.html#map)
  * [例：ディレクトリ一覧の作成](../posts/recursive-types-and-folds-3b.html#listing)
  * [例：並列 grep](../posts/recursive-types-and-folds-3b.html#grep)
  * [例：ファイルシステムのデータベースへの保存](../posts/recursive-types-and-folds-3b.html#database)
  * [例：Tree から JSON へシリアライズ](../posts/recursive-types-and-folds-3b.html#tojson)
  * [例：JSON から Tree へデシリアライズ](../posts/recursive-types-and-folds-3b.html#fromjson)
  * [例：JSON から Tree へデシリアライズ - エラー処理版](../posts/recursive-types-and-folds-3b.html#json-with-error-handling)

<a id="linkedlist"></a>
<hr>

## ジェネリック再帰型 LinkedList

ここで質問です。代数的型しかなく、それらを直積（[タプル](../posts/tuples.html)、[レコード](../posts/records.html)）
または直和（[判別共用体](../posts/discriminated-unions.html)）としてしか組み合わせられない場合、これらの操作だけでリスト型を作成するにはどうすればよいでしょうか？

答えは、もちろん再帰です！

最も基本的な再帰型であるリストから始めましょう。

今回定義する型を `LinkedList` と呼ぶことにしますが、基本的に F# の `list` 型と同じものです。

では、リストを再帰的に定義するにはどうすればよいでしょうか？

リストは空か、要素と別のリストで構成されます。
言い換えれば、次のような選択型（判別共用体）として定義できます。

```fsharp
type LinkedList<'a> = 
    | Empty
    | Cons of head:'a * tail:LinkedList<'a>
```

`Empty` ケースは空のリストを表します。`Cons` ケースはタプルを持ちます。 
タプルは先頭要素と、別のリストである末尾で構成されます。

そして、個別の `LinkedList` 値は次のように定義できます。

```fsharp
let linkedList = Cons (1, Cons (2, Cons(3, Empty)))  
```

ネイティブな F# リスト型を使った同等の定義は次のようになります。

```fsharp
let linkedList = 1 :: 2 :: 3 :: []
```

これは単に `[1; 2; 3]` です。

### LinkedList用の `cata`

[このシリーズの最初の記事](../posts/recursive-types-and-folds.html#rules) のルールに従って、`Empty` と `Cons` をそれぞれ `fEmpty` と `fCons` に置き換えることで、`cata` 関数を機械的に作成できます。

```fsharp
module LinkedList = 

    let rec cata fCons fEmpty list :'r=
        let recurse = cata fCons fEmpty 
        match list with
        | Empty -> 
            fEmpty
        | Cons (element,list) -> 
            fCons element (recurse list)
```

*注: `LinkedList<'a>` に関連するすべての関数を `LinkedList` というモジュールにまとめます。 ジェネリック型を使用する利点の一つとして、型名が類似するモジュール名と競合しないことが挙げられます！*

いつものように、ケース処理関数のシグネチャは、型コンストラクタのシグネチャと平行しており、`LinkedList` が `'r` に置き換わっています。

```fsharp
val cata : 
    fCons:('a -> 'r -> 'r) ->   
    fEmpty:'r ->                
    list:LinkedList<'a> 
    -> 'r
```

### LinkedList用の `fold`

[以前の記事](../posts/recursive-types-and-folds-2.html#rules)のルールを使って、トップダウンの反復的な `fold` 関数も作成できます。

```fsharp
module LinkedList = 

    let rec cata ...
    
    let rec foldWithEmpty fCons fEmpty acc list :'r=
        let recurse = foldWithEmpty fCons fEmpty 
        match list with
        | Empty -> 
            fEmpty acc 
        | Cons (element,list) -> 
            let newAcc = fCons acc element 
            recurse newAcc list
```

この `foldWithEmpty` 関数は標準の `List.fold` 関数とは少し異なり、空のリストに対する処理（`fEmpty`）をするための追加のパラメータを持っています。
しかし、そのパラメータを削除してアキュムレータを返すだけにすれば、次のようなバリエーションになります。

```fsharp
module LinkedList = 

    let rec fold fCons acc list :'r=
        let recurse = fold fCons 
        match list with
        | Empty -> 
            acc 
        | Cons (element,list) -> 
            let newAcc = fCons acc element 
            recurse newAcc list
```

シグネチャを [List.fold ドキュメント](https://fsharp.github.io/fsharp-core-docs/reference/fsharp-collections-listmodule.html#fold)と比べてみれば、等価であることがわかります。
`'State` は `'r` に、`'T list` は `LinkedList<'a>` に置き換えられています。

```fsharp
LinkedList.fold : ('r     -> 'a -> 'r    ) -> 'r      -> LinkedList<'a> -> 'r
List.fold       : ('State -> 'T -> 'State) -> 'State -> 'T list         -> 'State
```


`fold` 関数の動作を確認するために、小さなリストで合計を計算してみましょう。

```fsharp
let linkedList = Cons (1, Cons (2, Cons(3, Empty)))  
linkedList |> LinkedList.fold (+) 0
// Result => 6
```

### LinkedList用の `foldback`

最後に、以前の記事で説明した「関数アキュムレーター」のアプローチを使って `foldBack` 関数を作成できます。

```fsharp
module LinkedList = 

    let rec cata ...
    
    let rec fold ...

    let foldBack fCons list acc :'r=
        let fEmpty' generator = 
            generator acc 
        let fCons' generator element= 
            fun innerResult -> 
                let newResult = fCons element innerResult 
                generator newResult 
        let initialGenerator = id
        foldWithEmpty fCons' fEmpty' initialGenerator  list 
```

ここでも、シグネチャを [List.foldBack ドキュメント](https://fsharp.github.io/fsharp-core-docs/reference/fsharp-collections-listmodule.html#foldBack)と比べてみれば、等価であることがわかります。
`'State` は `'r` に、`'T list` は `LinkedList<'a>` に置き換えられています。

```fsharp
LinkedList.foldBack : ('a -> 'r     -> 'r    ) -> LinkedList<'a> -> 'r     -> 'r
List.foldBack       : ('T -> 'State -> 'State) -> 'T list        -> 'State -> 'State
```

### `foldBack` を使ったリスト型の変換

[最初の記事](../posts/recursive-types-and-folds.html#benefits)で、カタモーフィズムは構造が似た型同士の変換に使えることを説明しました。

それでは、 `LinkedList` からネイティブな `list` 型への変換と、その逆の変換を行う関数を作成して、それを示してみましょう。

`LinkedList` からネイティブな `list` へ変換するには、 `Cons` を `::` に、`Empty` を `[]` に置き換えるだけです。

```fsharp
module LinkedList = 

    let toList linkedList = 
        let fCons head tail = head::tail
        let initialState = [] 
        foldBack fCons linkedList initialState 
```

逆の変換を行うには、`::` を `Cons` に、`[]` を `Empty` に置き換えればよいです。

```fsharp
module LinkedList = 

    let ofList list = 
        let fCons head tail = Cons(head,tail)
        let initialState = Empty
        List.foldBack fCons list initialState 
```

簡単ですね！ `toList` をテストしてみましょう。

```fsharp
let linkedList = Cons (1, Cons (2, Cons(3, Empty)))  
linkedList |> LinkedList.toList       
// Result => [1; 2; 3]
```

そして `ofList` もテストしてみましょう。

```fsharp
let list = [1;2;3]
list |> LinkedList.ofList       
// Result => Cons (1,Cons (2,Cons (3,Empty)))
```

どちらも期待通りに動作します。

### `foldBack`を使った他の関数の実装

以前、カタモーフィズム関数（線形リストの場合は `foldBack` ）が再帰型で使用できる最も基本的な関数であり、実際には唯一必要な関数であると述べました。

実際に、いくつかの一般的な関数を`foldBack`を使って実装してみましょう。

以下は`foldBack`を使った`map`の定義です。

```fsharp
module LinkedList = 

    /// 関数"f"をすべての要素にマップする
    let map f list = 
        // ヘルパー関数    
        let folder head tail =
            Cons(f head,tail)
            
        foldBack folder list Empty
```

テストしてみましょう。

```fsharp
let linkedList = Cons (1, Cons (2, Cons(3, Empty)))  

linkedList |> LinkedList.map (fun i -> i+10)
// Result => Cons (11,Cons (12,Cons (13,Empty)))
```

以下は`foldBack`を使った`filter`の定義です。

```fsharp
module LinkedList = 

    /// "pred"が真である要素の新しいリストを返す
    let filter pred list = 
        // ヘルパー関数
        let folder head tail =
            if pred head then 
                Cons(head,tail)
            else
                tail

        foldBack folder list Empty
```

テストしてみましょう。

```fsharp
let isOdd n = (n%2=1)
let linkedList = Cons (1, Cons (2, Cons(3, Empty)))  

linkedList |> LinkedList.filter isOdd
// Result => Cons (1,Cons (3,Empty))
```

最後に、`fold`を使った`rev`の定義です。

```fsharp
/// リストの要素を逆順にする
let rev list = 
    // ヘルパー関数
    let folder tail head =
        Cons(head,tail)

    fold folder Empty list 
```

テストしてみましょう。

```fsharp
let linkedList = Cons (1, Cons (2, Cons(3, Empty)))  
linkedList |> LinkedList.rev
// Result => Cons (3,Cons (2,Cons (1,Empty)))
```

これで納得していただけたでしょうか？

### ジェネレータ関数の回避

以前、ジェネレータや継続を使わずに`foldBack`を実装する（場合によってはより効率的な）方法があると述べました。

見てきたように、`foldBack`は逆方向の反復であり、つまり逆順のリストに`fold`を適用するのと同じです！

そのため、以下のように実装できます。

```fsharp
let foldBack_ViaRev fCons list acc :'r=
    let fCons' acc element = 
        // パラメータを入れ替えるだけ！
        fCons element acc 
    list
    |> rev
    |> fold fCons' acc 
```

これはリストのコピーを余計に作成しますが、その代わりに保留中の継続が大量になることを防げます。
パフォーマンスが問題になる場合は、実際の環境で、2つのバージョンのプロファイルを比較する価値があるかもしれません。


<a id="revisiting-gift"></a>

## ギフトドメインをジェネリックにする

この記事の残りの部分では、`Gift` 型を見直し、さらに汎用的にできるかどうかを検討します。

おさらいとして、元の設計は次のとおりです。

```fsharp
type Gift =
    | Book of Book
    | Chocolate of Chocolate 
    | Wrapped of Gift * WrappingPaperStyle
    | Boxed of Gift 
    | WithACard of Gift * message:string
```

3つのケースは再帰的で、2つは再帰的ではありません。

さて、この設計の焦点はドメインのモデリングにあったため、個別のケースが多く存在します。

しかし、ドメインモデリングではなく *再利用性* に焦点を当てたい場合、設計を本質的なものに単純化するべきです。個別なケースはすべて妨げになります。

再利用できるようにするために、すべての非再帰的なケースを1つのケース、たとえば `GiftContents` にまとめ、
すべての再帰的なケースを別のケース、たとえば `GiftDecoration` にまとめましょう。

```fsharp
// 非再帰的なケースのための統一データ
type GiftContents = 
    | Book of Book
    | Chocolate of Chocolate 

// 再帰的なケースのための統一データ
type GiftDecoration = 
    | Wrapped of WrappingPaperStyle
    | Boxed 
    | WithACard of string

type Gift =
    // 非再帰的なケース
    | Contents of GiftContents
    // 再帰的なケース
    | Decoration of Gift * GiftDecoration
```

メインの `Gift` 型には、非再帰的なものと再帰的なものの2つのケースしか残りません。

<a id="container"></a>

## ジェネリックなコンテナ型の定義

型が単純化されたので、*任意の*コンテンツと*任意の*装飾を許可することで「ジェネリック化」できます。

```fsharp
type Container<'ContentData,'DecorationData> =
    | Contents of 'ContentData
    | Decoration of 'DecorationData * Container<'ContentData,'DecorationData> 
```

以前と同様に、標準的なプロセスを使用して、機械的に `cata`、`fold`、`foldBack` を作成できます。

```fsharp
module Container = 

    let rec cata fContents fDecoration (container:Container<'ContentData,'DecorationData>) :'r = 
        let recurse = cata fContents fDecoration 
        match container with
        | Contents contentData -> 
            fContents contentData 
        | Decoration (decorationData,subContainer) -> 
            fDecoration decorationData (recurse subContainer)
            
    (*
    val cata :
        // 関数パラメータ
        fContents:('ContentData -> 'r) ->
        fDecoration:('DecorationData -> 'r -> 'r) ->
        // 入力
        container:Container<'ContentData,'DecorationData> -> 
        // 戻り値
        'r
    *)
            
    let rec fold fContents fDecoration acc (container:Container<'ContentData,'DecorationData>) :'r = 
        let recurse = fold fContents fDecoration 
        match container with
        | Contents contentData -> 
            fContents acc contentData 
        | Decoration (decorationData,subContainer) -> 
            let newAcc = fDecoration acc decorationData
            recurse newAcc subContainer
            
    (*
    val fold :
        // 関数パラメータ
        fContents:('a -> 'ContentData -> 'r) ->
        fDecoration:('a -> 'DecorationData -> 'a) ->
        // アキュムレータ
        acc:'a -> 
        // 入力
        container:Container<'ContentData,'DecorationData> -> 
        // 戻り値
        'r
    *)
            
    let foldBack fContents fDecoration (container:Container<'ContentData,'DecorationData>) :'r = 
        let fContents' generator contentData =
            generator (fContents contentData)
        let fDecoration' generator decorationData =
            let newGenerator innerValue =
                let newInnerValue = fDecoration decorationData innerValue 
                generator newInnerValue 
            newGenerator 
        fold fContents' fDecoration' id container
            
    (*
    val foldBack :
        // 関数パラメータ
        fContents:('ContentData -> 'r) ->
        fDecoration:('DecorationData -> 'r -> 'r) ->
        // 入力
        container:Container<'ContentData,'DecorationData> -> 
        // 戻り値
        'r
    *)
```


### ギフトドメインをコンテナ型に変換する

ギフト型をこのジェネリックコンテナ型に変換しましょう。

```fsharp
type Gift = Container<GiftContents,GiftDecoration>
```

次に、ジェネリック型の「実際の」ケースを隠しながら値を構築するためのヘルパーメソッドが必要です。

```fsharp
let fromBook book = 
    Contents (Book book)

let fromChoc choc = 
    Contents (Chocolate choc)

let wrapInPaper paperStyle innerGift = 
    let container = Wrapped paperStyle 
    Decoration (container, innerGift)

let putInBox innerGift = 
    let container = Boxed
    Decoration (container, innerGift)

let withCard message innerGift = 
    let container = WithACard message
    Decoration (container, innerGift)
```

これで、テスト値を作成できます。

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
```


### コンテナ型を使った`totalCost`関数

「合計金額」関数は、内部データが必要ないため、`fold`を使って書くことができます。

これまでの実装とは異なり、関数のパラメータは `fContents` と `fDecoration` の2つしかないので、
それぞれに対してパターンマッチングを行い、実際のデータを取り出す必要があります。

コードは以下の通りです。

```fsharp
let totalCost gift =  

    let fContents costSoFar contentData = 
        match contentData with
        | Book book ->
            costSoFar + book.price
        | Chocolate choc ->
            costSoFar + choc.price

    let fDecoration costSoFar decorationInfo = 
        match decorationInfo with
        | Wrapped style ->
            costSoFar + 0.5m
        | Boxed ->
            costSoFar + 1.0m
        | WithACard message ->
            costSoFar + 2.0m

    // 初期アキュムレータ
    let initialAcc = 0m

    // foldを呼び出す
    Container.fold fContents fDecoration initialAcc gift 
```

期待通りに動作します。

```fsharp
birthdayPresent |> totalCost 
// 22.5m

christmasPresent |> totalCost 
// 6.5m
```

### コンテナ型を使った`description`関数

「説明」関数は、内部データが必要なので、`foldBack`を使って書く必要があります。
上記のコードと同様に、各ケースで実際のデータを取得するためにパターンマッチングが必要です。

```fsharp
let description gift =

    let fContents contentData = 
        match contentData with
        | Book book ->
            sprintf "'%s'" book.title
        | Chocolate choc ->
            sprintf "%A chocolate" choc.chocType

    let fDecoration decorationInfo innerText = 
        match decorationInfo with
        | Wrapped style ->
            sprintf "%s wrapped in %A paper" innerText style
        | Boxed ->
            sprintf "%s in a box" innerText 
        | WithACard message ->
            sprintf "%s with a card saying '%s'" innerText message 

    // メイン呼び出し
    Container.foldBack fContents fDecoration gift  
```

やはり、コードは期待通りに動作します。

```fsharp
birthdayPresent |> description
// CORRECT "'Wolf Hall' wrapped in HappyBirthday paper with a card saying 'Happy Birthday'"

christmasPresent |> description
// CORRECT "SeventyPercent chocolate in a box wrapped in HappyHolidays paper"
```

<a id="another-gift"></a>

## ギフトドメインを実装する3つ目の方法

かなり良さそうに見えますね。

しかし、実は隠していたことがあります。

実は、上記のコードは必要ありませんでした。
ジェネリック型を新しく作成することなく、`Gift`をモデル化する方法が*もう一つ*あるのです！

`Gift`型は基本的に、装飾の線形シーケンスで、最後にコンテンツが来るものです。 これを単にペア（ `Content` と `Decoration` のリスト）としてモデル化できます。
もしくは、もう少し扱いやすくするために、コンテンツ用のフィールドと装飾用のフィールドを持つレコードとしてモデル化することもできます。

```fsharp
type Gift = {contents: GiftContents; decorations: GiftDecoration list}
```

以上です！他の新しい型は必要ありません！

### レコード型を使った値の構築

前と同じように、この型を使って値を構築するヘルパー関数を作成しましょう。

```fsharp
let fromBook book = 
    { contents = (Book book); decorations = [] }

let fromChoc choc = 
    { contents = (Chocolate choc); decorations = [] }

let wrapInPaper paperStyle innerGift = 
    let decoration = Wrapped paperStyle 
    { innerGift with decorations = decoration::innerGift.decorations }

let putInBox innerGift = 
    let decoration = Boxed
    { innerGift with decorations = decoration::innerGift.decorations }

let withCard message innerGift = 
    let decoration = WithACard message
    { innerGift with decorations = decoration::innerGift.decorations }
```

これらのヘルパー関数を使うと、値の構築方法は前のバージョンと*まったく同じ*です。 本来のコンストラクタを隠しておくほうがいいのは、こういう理由です！

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
```

### レコード型を使った `totalCost` 関数

`totalCost` 関数は、さらに簡単に書けるようになりました。

```fsharp
let totalCost gift =  
    
    let contentCost = 
        match gift.contents with
        | Book book ->
            book.price
        | Chocolate choc ->
            choc.price

    let decorationFolder costSoFar decorationInfo = 
        match decorationInfo with
        | Wrapped style ->
            costSoFar + 0.5m
        | Boxed ->
            costSoFar + 1.0m
        | WithACard message ->
            costSoFar + 2.0m

    let decorationCost = 
        gift.decorations |> List.fold decorationFolder 0m

    // 合計コスト
    contentCost + decorationCost 
```

### レコード型を使った `description` 関数

同様に、 `description` 関数も簡単に書けます。

```fsharp
let description gift =

    let contentDescription = 
        match gift.contents with
        | Book book ->
            sprintf "'%s'" book.title
        | Chocolate choc ->
            sprintf "%A chocolate" choc.chocType

    let decorationFolder decorationInfo innerText = 
        match decorationInfo with
        | Wrapped style ->
            sprintf "%s wrapped in %A paper" innerText style
        | Boxed ->
            sprintf "%s in a box" innerText 
        | WithACard message ->
            sprintf "%s with a card saying '%s'" innerText message 

    List.foldBack decorationFolder gift.decorations contentDescription
```

<a id="compare"></a>

### 抽象か具象か？3通りの設計の比較

いきなり多くの選択肢が出てきて困惑しているかもしれませんが、当然のことです！

しかし、この 3 つの定義は相互に変換可能です。

**オリジナル版**

```fsharp
type Gift =
    | Book of Book
    | Chocolate of Chocolate 
    | Wrapped of Gift * WrappingPaperStyle
    | Boxed of Gift 
    | WithACard of Gift * message:string
```

**ジェネリックコンテナ版**

```fsharp
type Container<'ContentData,'DecorationData> =
    | Contents of 'ContentData
    | Decoration of 'DecorationData * Container<'ContentData,'DecorationData> 
    
type GiftContents = 
    | Book of Book
    | Chocolate of Chocolate 

type GiftDecoration = 
    | Wrapped of WrappingPaperStyle
    | Boxed 
    | WithACard of string

type Gift = Container<GiftContents,GiftDecoration>
```

**レコード版**

```fsharp
type GiftContents = 
    | Book of Book
    | Chocolate of Chocolate 

type GiftDecoration = 
    | Wrapped of WrappingPaperStyle
    | Boxed 
    | WithACard of string

type Gift = {contents: GiftContents; decorations: GiftDecoration list}
```

直感的に理解できない場合は、[データ型のサイズ](../posts/type-size-and-design.html) に関する記事を読むとよいでしょう。
一見まったく異なるように見える型でも、「等価」になりえることを説明しています。

### 設計の選択

では、どの設計が最適なのでしょうか？ 答えはいつものように「状況次第」です。

ドメインのモデリングとドキュメント化のためには、5 つの明示的なケースを持つ最初の設計が好ましいです。
他の人が理解しやすいことは、再利用性のために抽象化を導入することよりも重要です。

多くの状況に適用できる、再利用性の高いモデルが欲しい場合は、2 番目の「コンテナ」の設計を選択するでしょう。
この型は、コンテンツが特定の一種類で、ラッパーが別の一種類であるという、よくある状況を表現しているように思えます。
したがって、この抽象化は再利用できるはずです。

最後の「ペア」モデルは悪くはありませんが、2 つの要素を分離することで、このシナリオにとっては過剰な抽象化になっています。
（デコレータパターンのような）他の状況ではこの設計が最適かもしれませんが、この場合はそうではないと思います。

さらに、すべての利点を得る選択肢が 1 つあります。

前述のように、すべての設計は論理的に等価であるため、相互に「損失のない」マッピングがあります。
その場合、公開する設計は、最初のようなドメイン指向のものにして、内部的にはより効率的で再利用可能な「プライベート」型にマップできます。

F# のリスト実装自体もこれを採用しています。
たとえば、`List` モジュール内の一部の関数（`foldBack` や `sort` など）は、リストを配列に変換し、操作を行った後、再びリストに戻します。

<hr>
    
## まとめ

この記事では、`Gift`をジェネリック型としてモデル化するいくつかの方法と、各アプローチの長所と短所を見てきました。

[次の記事](../posts/recursive-types-and-folds-3b.html)では、ジェネリックな再帰型の実用的な例を見ていきます。

*この記事のソースコードは[このgist](https://gist.github.com/swlaschin/c423a0f78b22496a0aff)です。*