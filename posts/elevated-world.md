---
layout: post
title: "map と apply を理解する"
description: "高次の世界を扱うためのツールセット"
categories: ["パターン"]
seriesId: "Map, Bind, Apply なにもわからない"
seriesOrder: 1
image: "/assets/img/vgfp_map.png"
---

この連載では、`Option`や`List`などのジェネリックなデータ型を扱うためのコア関数を解説します。
これは、[関数型パターンに関する私の講演](https://fsharpforfunandprofit.com/fppatterns/)の続編です。

[このような内容を書かないと約束した](../posts/why-i-wont-be-writing-a-monad-tutorial.md)のは承知していますが、
今回は少し違うアプローチを試みました。
型クラスなどの抽象概念ではなく、コア関数自体とその実践的な使用方法に焦点を当てることが有用だと考えたのです。

つまり、これは`map`、`return`、`apply`、`bind`の一種の[「マニュアルページ」](https://en.wikipedia.org/wiki/Man_page)のようなものです。

各関数について、名前（と一般的な別名）、よく使われる演算子、型シグネチャを紹介します。
さらに、なぜその関数が必要で、どのように使われるのかを詳しく説明します。その際、視覚的な補助も交えます（私はこれが常に役立つと感じています）。

Haskellユーザーや圏論家の方々は、ここで目をそらしたくなるかもしれません。
数学的な内容はなく、かなり大雑把な説明になります。専門用語やHaskell特有の概念（型クラスなど）は避け、できるだけ全体像に焦点を当てます。
ここで紹介する概念は、どんな言語の関数型プログラミングにも応用できるはずです。

このアプローチが好みに合わない方もいるでしょう。それで構いません。
ウェブ上には[たくさんの](https://wiki.haskell.org/Monad_tutorials_timeline)、より学術的な説明があります。
[これ](https://homepages.inf.ed.ac.uk/wadler/papers/marktoberdorf/baastad.pdf)や[これ](https://www.staff.city.ac.uk/~ross/papers/Applicative.html)から始めてみるのもいいでしょう。

最後に、このサイトの多くの投稿と同じく、これも私自身の学習過程の一環として書いています。
私は決して専門家ではないので、間違いがあればぜひ指摘してください。

## 背景

まずは背景と用語の説明から始めましょう。

2つの世界でプログラミングできると想像してください。「通常の」日常的な世界と、「高次の世界」（この名前の理由はすぐに説明します）と呼ぶ世界です。

高次の世界は通常の世界とよく似ています。実際、通常の世界のすべてのものには、高次の世界に対応するものがあります。

例えば、通常の世界には`Int`という値の集合がありますが、高次の世界にはそれに対応する`E<Int>`という値の集合があります。
同様に、通常の世界の`String`に対して、高次の世界には`E<String>`があります。

![](../assets/img/vgfp_e_values.png)

また、通常の世界に`Int`と`String`の間の関数があるように、高次の世界にも`E<Int>`と`E<String>`の間の関数があります。

![](../assets/img/vgfp_e_functions.png)

「世界」という言葉を「型」の代わりに意図的に使っていることに注意してください。世界内の値の間の*関係*が、基礎となるデータ型と同じくらい重要だということを強調するためです。

### 高次の世界とは具体的に何か？

高次の世界を正確に定義するのは難しいです。高次の世界には多くの種類があり、それらに共通点がないからです。

データ構造（`Option<T>`）を表すもの、ワークフロー（`State<T>`）を表すもの、
シグナル（`Observable<T>`）を表すもの、非同期値（`Async<T>`）を表すもの、その他の概念を表すものがあります。

様々な高次の世界に具体的な共通点はありませんが、それらを扱う方法には共通点があります。
異なる高次の世界でも同じような問題が繰り返し発生します。そして、
これらの問題に対処するための標準的なツールやパターンを使うことができます。

この連載では、これらのツールとパターンについて説明していきます。

## シリーズの内容

このシリーズは以下のように展開します。

* まず、通常のものを高次の世界に持ち上げるためのツールを説明します。これには`map`、`return`、`apply`、`bind`などの関数が含まれます。
* 次に、高次の値を異なる方法で組み合わせる方法を見ていきます。これは値が独立しているか依存しているかによって変わってきます。
* その後、リストと他の高次の値を混ぜる方法をいくつか紹介します。
* 最後に、これらのテクニックをすべて使用する2つの実際の例を見ます。そこで偶然にもReaderモナドを発明することになります。

以下は、様々な関数へのショートカットリストです。

* **パート1：高次の世界への持ち上げ**
  * [`map`関数](../posts/elevated-world.md#map)
  * [`return`関数](../posts/elevated-world.md#return)
  * [`apply`関数](../posts/elevated-world.md#apply)
  * [`liftN`関数ファミリー](../posts/elevated-world.md#lift)
  * [`zip`関数とZipList世界](../posts/elevated-world.md#zip)
* **パート2：世界を横断する関数の合成方法**    
  * [`bind`関数](../posts/elevated-world-2.md#bind)
  * [Listはモナドではありません。Optionもモナドではありません](../posts/elevated-world-2.md#not-a-monad)
* **パート3：実践でのコア関数の使用**  
  * [独立データと依存データ](../posts/elevated-world-3.md#dependent)
  * [例：アプリカティブスタイルとモナディックスタイルを使用したバリデーション](../posts/elevated-world-3.md#validation)
  * [一貫した世界への持ち上げ](../posts/elevated-world-3.md#consistent)
  * [Kleisli世界](../posts/elevated-world-3.md#kleisli)
* **パート4：リストと高次の値の混合**    
  * [リストと高次の値の混合](../posts/elevated-world-4.md#mixing)
  * [`traverse`/`MapM`関数](../posts/elevated-world-4.md#traverse)
  * [`sequence`関数](../posts/elevated-world-4.md#sequence)
  * [アドホックな実装のレシピとしての「シーケンス」](../posts/elevated-world-4.md#adhoc)
  * [読みやすさ vs パフォーマンス](../posts/elevated-world-4.md#readability)
  * [ねえ、`filter`はどこ？](../posts/elevated-world-4.md#filter)
* **パート5：すべてのテクニックを使用する実際の例**    
  * [例：ウェブサイトのリストのダウンロードと処理](../posts/elevated-world-5.md#asynclist)
  * [2つの世界を1つとして扱う](../posts/elevated-world-5.md#asyncresult)
* **パート6：独自の高次の世界の設計** 
  * [独自の高次の世界の設計](../posts/elevated-world-6.md#part6)
  * [失敗のフィルタリング](../posts/elevated-world-6.md#filtering)
  * [Readerモナド](../posts/elevated-world-6.md#readermonad)
* **パート7：まとめ** 
  * [言及された演算子のリスト](../posts/elevated-world-7.md#operators)
  * [さらなる読み物](../posts/elevated-world-7.md#further-reading)
  
<a id="part1"></a>
<hr>


## パート1：高次の世界への持ち上げ 

最初の課題は、通常の世界から高次の世界にどうやって到達するかです。

まず、特定の高次の世界について以下を仮定します。

* 通常の世界のすべての型には、高次の世界に対応する型があります。
* 通常の世界のすべての値には、高次の世界に対応する値があります。
* 通常の世界のすべての関数には、高次の世界に対応する関数があります。

通常の世界から高次の世界に何かを移動させる概念を「持ち上げ」と呼びます。これが「高次の世界」という言葉を使った理由です。

これらの対応するものを「持ち上げられた型」「持ち上げられた値」「持ち上げられた関数」と呼びます。

各高次の世界は異なるので、持ち上げの共通の実装はありません。しかし、`map`や`return`などの様々な「持ち上げ」パターンに名前を付けることはできます。

*注意：これらの持ち上げられた型に標準的な名前はありません。「ラッパー型」「拡張型」「モナド型」などと呼ばれているのを見たことがあります。
これらの名前のどれにも満足できなかったので、[新しい名前を発明しました](https://xkcd.com/927/)！
また、仮定を避けようとしているので、持ち上げられた型が何らかの形で優れているとか、追加情報を含んでいるとか示唆したくありません。
この投稿で「高次」という言葉を使うことで、型自体よりも*持ち上げのプロセス*に焦点を当てられることを願っています。*

*「モナディック」という言葉を使うのは正確ではありません。これらの型がモナドの一部である必要はないからです。*

<a id="map"></a>
<hr>

## `map`関数

**一般的な名前** `map`、`fmap`、`lift`、`Select`

**一般的な演算子** `<$>`、`<!>` 

**機能**  関数を高次の世界に持ち上げます

**シグネチャ**  `(a->b) -> E<a> -> E<b>`。あるいはパラメータを逆にして `E<a> -> (a->b) -> E<b>`

### 説明

「map」は、通常の世界の関数を取り、高次の世界の対応する関数に変換するための一般的な名前です。

![](../assets/img/vgfp_map.png)

各高次の世界では、mapが独自の方法で実装されています。

### 別の見方

`map`には別の見方もあります。高次の値（`E<a>`）と通常の関数（`a->b`）を受け取り、`E<a>`の内部要素に関数`a->b`を適用して生成された新しい高次の値（`E<b>`）を返す、
*2つの*パラメータを持つ関数と考えることもできます。

![](../assets/img/vgfp_map2.png)

F#のように関数がデフォルトでカリー化される言語では、これらの見方は同じことを意味します。
他の言語では、2つの使い方を切り替えるために、カリー化や非カリー化が必要になることがあります。

*2つの*パラメータを取るバージョンでは、シグネチャが`E<a> -> (a->b) -> E<b>`となることが多いです。
高次の値が先で、通常の関数が後ろです。抽象的には同じことで、mapの概念は変わりません。
しかし、パラメータの順序は実際にmap関数を使う際に影響します。

### 実装例

F#でのオプションとリストのmap実装例を見てみましょう。

```fsharp
/// オプションのmap
let mapOption f opt =
    match opt with
    | None -> 
        None
    | Some x -> 
        Some (f x)
// 型：('a -> 'b) -> 'a option -> 'b option

/// リストのmap
let rec mapList f list =
    match list with
    | [] -> 
        []  
    | head::tail -> 
        // 新しいhead + 新しいtail
        (f head) :: (mapList f tail)
// 型：('a -> 'b) -> 'a list -> 'b list
```

これらは実際には組み込み関数ですが、一般的な型のmapがどのようなものかを示すために実装例を挙げました。

### 使用例

F#でのmapの使い方をいくつか見てみましょう。

```fsharp
// 通常の世界で関数を定義
let add1 x = x + 1
// 型：int -> int

// オプションの世界に持ち上げた関数
let add1IfSomething = Option.map add1
// 型：int option -> int option

// リストの世界に持ち上げた関数
let add1ToEachElement = List.map add1
// 型：int list -> int list
```

これらのマップされた関数を使うと、次のようなコードが書けます。

```fsharp
Some 2 |> add1IfSomething    // Some 3 
[1;2;3] |> add1ToEachElement // [2; 3; 4]
```

多くの場合、中間的な関数を作らずに、部分適用を直接使います。

```fsharp
Some 2 |> Option.map add1    // Some 3 
[1;2;3] |> List.map add1     // [2; 3; 4]
```

### 正しいmap実装の特徴

高次の世界は、ある意味で通常の世界を映し出しています。通常の世界の関数には、高次の世界に対応する関数があります。
`map`は、この対応関係を適切に保つ必要があります。

例えば、`add`の`map`が誤って`multiply`の高次版を返したり、`lowercase`の`map`が`uppercase`の高次版を返したりしてはいけません。
では、あるmap実装が本当に*正しい*対応関数を返しているかを、どうやって*確認*できるでしょうか？

[プロパティベーステストに関する私の投稿](http://fsharpforfunandprofit.com/pbt/)で説明したように、関数の正しい実装は、特定の例ではなく一般的な特性を使って定義し、テストすることができます。

これは`map`にも当てはまります。
実装は特定の高次の世界によって異なりますが、どの場合も、奇妙な動作を避けるために満たすべき特定の特性があります。

まず、通常の世界の`id`関数を`map`で高次の世界に持ち上げると、
結果の関数は高次の世界の`id`関数と*同じ*になるはずです。

![](../assets/img/vgfp_functor_law_id.png)

次に、通常の世界で2つの関数`f`と`g`を取り、それらを合成して（例えば`h`とする）、その結果を`map`で持ち上げると、
得られる関数は、`f`と`g`を*別々に*高次の世界に持ち上げてから合成した場合と*同じ*になるはずです。

![](../assets/img/vgfp_functor_law_compose.png)

これら2つの特性は「[ファンクター則](https://en.wikibooks.org/wiki/Haskell/The_Functor_class#The_functor_laws)」と呼ばれ、
**ファンクター**（プログラミングの文脈で）は、ジェネリックなデータ型 -- ここでは`E<T>` -- とファンクター則に従う`map`関数のペアとして定義されます。

*注意：「ファンクター」という言葉は混乱を招きやすいです。圏論の意味でのファンクターと、プログラミングの意味でのファンクター（上記で定義）があります。
さらに、ライブラリで定義された「ファンクター」もあります。
例えば、[HaskellのFunctor型クラス](https://hackage.haskell.org/package/base-4.7.0.2/docs/Data-Functor.html)や、[ScalazのFunctorトレイト](https://scalaz.github.io/scalaz/scalaz-2.9.0-1-6.0/doc.sxr/scalaz/Functor.scala.html)です。
SMLや[OCaml](https://realworldocaml.org/v1/en/html/functors.html)（そして[C++](http://www.cprogramming.com/tutorial/functors-function-objects-in-c++.html)）のファンクターには触れませんが、
これらはまた別物です！*

*そのため、私は「マッピング可能な」世界について話すことを好みます。実際のプログラミングでは、何らかの形でマッピングできない高次の世界を見つけるのは難しいでしょう。*

### mapの変種

mapにはよく使われる変種がいくつかあります。

* **定数map**。定数map（別名を「置換」map）は、関数の出力ではなく定数ですべての値を置き換えます。
  場合によっては、このような特殊な関数を使うとより効率的な実装が可能です。
* **世界をまたぐ関数を扱うmap**。map関数`a->b`は完全に通常の世界に属しています。しかし、マッピングしたい関数が
  通常の世界に戻らず、別の高次の世界の値を返す場合はどうでしょうか？ この課題への対処方法は[後の投稿](../posts/elevated-world-4.md)で見ていきます。

<a id="return"></a>
<hr>

## `return`関数

**一般的な名前** `return`、`pure`、`unit`、`yield`、`point`

**一般的な演算子** なし

**機能**  単一の値を高次の世界に持ち上げます

**シグネチャ**  `a -> E<a>`

### 説明

「return」（「unit」や「pure」とも呼ばれる）は、通常の値を高次の値に変換する単純な関数です。


![](../assets/img/vgfp_return.png)

この関数には様々な名前がありますが、ここではF#で一般的に使われ、コンピュテーション式でも使用される「return」を一貫して使います。

*注意：ここでは`pure`と`return`の違いには触れません。型クラスはこの記事の主題ではないためです。*

### 実装例

F#での`return`の実装例を見てみましょう。

```fsharp
// オプションの世界に値を持ち上げる
let returnOption x = Some x
// 型：'a -> 'a option

// リストの世界に値を持ち上げる
let returnList x  = [x]
// 型：'a -> 'a list
```

もちろん、オプションやリスト用にこのような特別な関数を定義する必要はありません。ここでは一般的な型の`return`の例として示しています。

<a id="apply"></a>
<hr>

## `apply`関数

**一般的な名前** `apply`、`ap`

**一般的な演算子** `<*>` 

**機能**  高次の値の中に包まれた関数を、`E<a> -> E<b>`という持ち上げられた関数に展開します

**シグネチャ**  `E<(a->b)> -> E<a> -> E<b>`

### 説明

「apply」は、高次の値の中に包まれた関数（`E<(a->b)>`）を、`E<a> -> E<b>`という形の持ち上げられた関数に変換します。

![](../assets/img/vgfp_apply.png)

一見すると重要性が分かりにくいかもしれませんが、実は非常に有用です。通常の世界の複数引数関数を高次の世界の複数引数関数に持ち上げることができるからです。
この点については後ほど詳しく見ていきます。

### 別の見方

`apply`には別の見方もあります。
高次の値（`E<a>`）と高次の関数（`E<(a->b)>`）を受け取り、関数`a->b`を`E<a>`の中身に適用して新しい高次の値（`E<b>`）を作る、*2つの*引数を持つ関数と考えることもできます。

例えば、1引数の関数（`E<(a->b)>`）があれば、それを1つの高次の引数に適用して、結果を別の高次の値として得ることができます。

![](../assets/img/vgfp_apply2.png)

2引数の関数（`E<(a->b->c)>`）があれば、`apply`を2回続けて使い、2つの高次の引数を適用して高次の出力を得ることができます。

![](../assets/img/vgfp_apply3.png)

このテクニックを使えば、任意の数の引数に対応できます。

### 実装例

F#での2つの異なる型に対する`apply`の定義例を見てみましょう。

```fsharp
module Option =

    // オプション用のapply関数
    let apply fOpt xOpt = 
        match fOpt,xOpt with
        | Some f, Some x -> Some (f x)
        | _ -> None

module List =

    // リスト用のapply関数
    // [f;g] apply [x;y] は [f x; f y; g x; g y] になる
    let apply (fList: ('a->'b) list) (xList: 'a list)  = 
        [ for f in fList do
          for x in xList do
              yield f x ]
```

ここでは、`applyOption`や`applyList`のような名前ではなく、同じ名前を使い、型ごとにモジュールに入れています。

`List.apply`の実装では、最初のリストの各関数が2番目のリストの各値に適用され、「直積」のような結果になります。
つまり、関数のリスト`[f; g]`を値のリスト`[x; y]`に適用すると、4要素のリスト`[f x; f y; g x; g y]`になります。
これが唯一の方法ではないことは後で見ていきます。

なお、この実装は`for..in..do`ループ（既存の機能）を使っているので、少し手抜きをしています！

これは`apply`の動作を分かりやすく示すためです。「ゼロから」再帰的な実装を作るのは簡単ですが（ただし、適切な末尾再帰にするのはそれほど簡単ではありません！）、
ここでは実装よりも概念に焦点を当てたいと思います。

### applyの中置演算子版

`apply`関数をそのまま使うのは少し不便なので、一般的に中置演算子版を作ります。通常`<*>`と呼ばれます。
これを使うと、次のようなコードが書けます。

```fsharp
let resultOption =  
    let (<*>) = Option.apply
    (Some add) <*> (Some 2) <*> (Some 3)
// resultOption = Some 5

let resultList =  
    let (<*>) = List.apply
    [add] <*> [1;2] <*> [10;20]
// resultList = [11; 21; 12; 22]
```

### Apply vs. Map 

`apply`と`return`の組み合わせは`map`よりも「強力」と考えられています。
`apply`と`return`があれば`map`を構築できますが、その逆はできないからです。

仕組みはこうです。通常の関数に`return`を適用し、その後`apply`を使うと、
単に`map`を使った場合と同じ結果になります。

![](../assets/img/vgfp_apply_vs_map.png)

このテクニックを使うと、中置記法をさらに簡単にできます。
最初の`return`と`apply`を`map`で置き換えられるので、一般的に`map`用の中置演算子も作ります。F#では通常`<!>`を使います。

```fsharp
let resultOption2 =  
    let (<!>) = Option.map
    let (<*>) = Option.apply

    add <!> (Some 2) <*> (Some 3)
// resultOption2 = Some 5

let resultList2 =  
    let (<!>) = List.map
    let (<*>) = List.apply

    add <!> [1;2] <*> [10;20]
// resultList2 = [11; 21; 12; 22]
```

このコードは、通常の関数を使う場合とよく似た見た目になります。つまり、通常の`add x y`の代わりに、似たような`add <!> x <*> y`を使えます。
ただし、ここでの`x`と`y`は通常の値ではなく高次の値です。この記法を「オーバーロードされた空白」と呼ぶ人もいるほどです！

もう一つ面白い例を見てみましょう。

```fsharp
let batman = 
    let (<!>) = List.map
    let (<*>) = List.apply

    // +を使った文字列の連結
    (+) <!> ["bam"; "kapow"; "zap"] <*> ["!"; "!!"]  
    
// 結果 =
// ["bam!"; "bam!!"; "kapow!"; "kapow!!"; "zap!"; "zap!!"]
```

### 正しいapply/return実装の特徴

`map`と同じように、`apply`と`return`のペアの正しい実装も、どの高次の世界で使う場合でも成り立つべき特徴があります。

いわゆる4つの["アプリカティブ則"](https://en.wikibooks.org/wiki/Haskell/Applicative_functors#Applicative_functor_laws)があり、
**アプリカティブファンクター**（プログラミングの文脈で）は、ジェネリックなデータ型コンストラクター（我々の場合は`E<T>`）と、
アプリカティブ則に従う関数のペア（`apply`と`return`）として定義されます。

`map`の法則と同様に、これらの法則もとても理にかなっています。そのうちの2つを紹介しましょう。

最初の法則は次のように言います。通常の世界の`id`関数を取り、`return`で高次の世界に持ち上げ、それから`apply`を行うと、
得られる新しい関数（`E<a> -> E<a>`型）は高次の世界の`id`関数と同じになるべきだ、と。

![](../assets/img/vgfp_apply_law_id.png)

2番目の法則はこうです。通常の世界で関数`f`と値`x`を取り、`f`を`x`に適用して結果（例えば`y`）を得て、その結果を`return`で持ち上げると、
`f`と`x`を*先に*高次の世界に持ち上げてから、そこで後から適用した場合と同じ結果になるべきだ、と。

![](../assets/img/vgfp_apply_law_homomorphism.png)

残りの2つの法則は図で表現しにくいので、ここでは説明しません。ただ、これらの法則を全て合わせることで、どんな実装も適切であることが保証されます。

<a id="lift"></a>
<hr>


## `liftN`関数ファミリー

**一般的な名前** `lift2`、`lift3`、`lift4`など

**一般的な演算子** なし

**機能**  指定された関数を使って2つ（または3つ、4つ）の高次の値を組み合わせます

**シグネチャ**  
lift2: `(a->b->c) -> E<a> -> E<b> -> E<c>`  
lift3: `(a->b->c->d) -> E<a> -> E<b> -> E<c> -> E<d>`  
など

### 説明

`apply`と`return`関数を使って、`liftN`（`lift2`、`lift3`、`lift4`など、Nは2,3,4などの数）と呼ばれる一連のヘルパー関数を定義できます。
これらは、N個の引数を持つ通常の関数を取り、対応する高次の関数に変換します。

`lift1`は単に`map`と同じなので、通常は別の関数として定義しません。

実装例を見てみましょう。

```fsharp
module Option = 
    let (<*>) = apply 
    let (<!>) = Option.map

    let lift2 f x y = 
        f <!> x <*> y
        
    let lift3 f x y z = 
        f <!> x <*> y <*> z
        
    let lift4 f x y z w = 
        f <!> x <*> y <*> z <*> w
```

`lift2`の視覚的な表現はこのようになります。

![](../assets/img/vgfp_lift2.png)

`lift`関数のシリーズを使うと、コードがより読みやすくなります。
あらかじめ用意された`lift`関数の1つを使うことで、`<*>`構文を避けられるからです。

まず、2引数関数を持ち上げる例を見てみましょう。

```fsharp
// テスト用の2引数関数を定義
let addPair x y = x + y 

// 2引数関数を持ち上げる
let addPairOpt = Option.lift2 addPair

// 通常通り呼び出す
addPairOpt (Some 1) (Some 2) 
// 結果 => Some 3
```

次に、3引数関数を持ち上げる例です。

```fsharp
// テスト用の3引数関数を定義
let addTriple x y z = x + y + z

// 3引数関数を持ち上げる
let addTripleOpt = Option.lift3 addTriple

// 通常通り呼び出す
addTripleOpt (Some 1) (Some 2) (Some 3)   
// 結果 => Some 6
```

### 「lift2」を「結合器」として見る

`apply`には、関数適用とは別の見方があります。それは、高次の値を結合する「結合器」としての見方です。

例えば、`lift2`を使う場合、最初のパラメータは組み合わせ方を指定します。

次の例では、同じ値を2つの異なる方法で組み合わています。最初は加算で、次は乗算です。

```fsharp
Option.lift2 (+) (Some 2) (Some 3)   // Some 5
Option.lift2 (*) (Some 2) (Some 3)   // Some 6
```

さらに一歩進んで、この最初の関数パラメータを取り除き、値を*汎用的に*組み合わせる方法はないでしょうか。

実はあります。タプルコンストラクタを使って値を組み合わせるのです。
こうすることで、値の使い方をまだ決めずに組み合わせられます。

図で表すとこんな感じです。

![](../assets/img/vgfp_apply_combine.png)

オプションとリスト用の実装例を見てみましょう。

```fsharp
// タプル作成関数を定義
let tuple x y = x,y

// タプルコンストラクタを組み込んだ
// オプション用の汎用結合器を作成
let combineOpt x y = Option.lift2 tuple x y 

// タプルコンストラクタを組み込んだ
// リスト用の汎用結合器を作成
let combineList x y = List.lift2 tuple x y 
```

これらの結合器を使うとどうなるか見てみましょう。

```fsharp
combineOpt (Some 1) (Some 2)        
// 結果 => Some (1, 2)

combineList [1;2] [100;200]         
// 結果 => [(1, 100); (1, 200); (2, 100); (2, 200)]
```

高次のタプルができたので、あとは`map`を使って好きな方法でペアを処理できます。

値を足したいなら、`map`関数で`+`を使うだけです。

```fsharp
combineOpt (Some 2) (Some 3)        
|> Option.map (fun (x,y) -> x + y)  
// 結果 => Some 5

combineList [1;2] [100;200]         
|> List.map (fun (x,y) -> x + y)    
// 結果 => [101; 201; 102; 202]
```

値を掛けたいなら、`map`関数で`*`を使います。

```fsharp
combineOpt (Some 2) (Some 3)        
|> Option.map (fun (x,y) -> x * y)  
// 結果 => Some 6

combineList [1;2] [100;200]         
|> List.map (fun (x,y) -> x * y)    
// 結果 => [100; 200; 200; 400]
```

このように、様々な処理が可能です。実際の使用例では、もっと複雑な操作を行うでしょう。

### lift2を使ってapplyを定義する

面白いことに、上記の`lift2`関数を使って`apply`を定義することもできます。

つまり、`lift2`関数を使って`apply`を定義できるのです。組み合わせ関数を単なる関数適用にするだけです。

`Option`の場合、こんな感じになります。

```fsharp
module Option = 

    /// lift2をゼロから定義
    let lift2 f xOpt yOpt = 
        match xOpt,yOpt with
        | Some x,Some y -> Some (f x y)
        | _ -> None

    /// lift2を使ってapplyを定義
    let apply fOpt xOpt = 
        lift2 (fun f x -> f x) fOpt xOpt 
```

この別のアプローチは覚えておく価値があります。というのも、一部の型では`apply`よりも`lift2`を定義する方が簡単だからです。

### 欠けているデータや不正なデータの組み合わせ

注目すべき点として、これまで見てきたすべての結合器には共通点があります。高次の値のどれかが「欠けている」か「不正」な場合、全体の結果も不正になるのです。

例えば、`combineList`では、パラメータの1つが空リストの場合、結果も空リストになります。
`combineOpt`では、パラメータの1つが`None`の場合、結果も`None`になります。

```fsharp
combineOpt (Some 2) None    
|> Option.map (fun (x,y) -> x + y)    
// 結果 => None

combineList [1;2] []         
|> List.map (fun (x,y) -> x * y)    
// 結果 => 空リスト
```

欠けている値や不正な値を無視する別の種類の結合器を作ることも可能です。数値に「0」を足すのが無視されるのと同じような感じです。
詳しい情報は、["涙なしのモノイド"](../posts/monoids-without-tears.md)に関する私の投稿をご覧ください。

### 片側結合器 `<*` と `*>` 

場合によっては、2つの高次の値があり、どちらか一方の値を捨てたいことがあります。

リストの例を見てみましょう。

```fsharp
let ( <* ) x y = 
    List.lift2 (fun left right -> left) x y 

let ( *> ) x y = 
    List.lift2 (fun left right -> right) x y 
```

2要素のリストと3要素のリストを組み合わせると、期待通り6要素のリストができますが、内容は片側からだけ来ています。

```fsharp
[1;2] <* [3;4;5]   // [1; 1; 1; 2; 2; 2]
[1;2] *> [3;4;5]   // [3; 4; 5; 3; 4; 5]
```

これを機能として活用できます！ある値をN回繰り返すには、`[1..n]`と組み合わせるだけです。

```fsharp
let repeat n pattern =
    [1..n] *> pattern 

let replicate n x =
    [1..n] *> [x]

repeat 3 ["a";"b"]  
// ["a"; "b"; "a"; "b"; "a"; "b"]

replicate 5 "A"
// ["A"; "A"; "A"; "A"; "A"]
```

もちろん、これは値を複製する効率的な方法ではありません。
ただ、`apply`と`return`という2つの関数から始めて、かなり複雑な動作を構築できることを示しています。

では、より実用的な観点から、このような「データを捨てる」操作がなぜ役立つのでしょうか？多くの場合、値そのものは必要ないけれど、その効果は欲しい場合があります。

例えば、パーサーでは次のようなコードをよく目にします。

```fsharp
let readQuotedString =
   readQuoteChar *> readNonQuoteChars <* readQuoteChar
```

このスニペットで、`readQuoteChar`は「入力ストリームから引用符を見つけて読み取る」ことを意味し、
`readNonQuoteChars`は「入力ストリームから引用符以外の文字列を読み取る」ことを意味します。

引用符で囲まれた文字列をパースする際、引用符を含む入力ストリームが確実に読み取られることを確認したいですが、
引用符自体には興味がなく、内部の内容だけが欲しいのです。

そのため、先頭の引用符を無視するために`*>`を使い、末尾の引用符を無視するために`<*`を使っています。


<a id="zip"></a>
<hr>

## `zip`関数とZipList世界

**一般的な名前** `zip`、`zipWith`、`map2`

**一般的な演算子** `<*>`（ZipList世界の文脈で）

**機能**  指定された関数を使って2つのリスト（または他の列挙可能なもの）を組み合わせます

**シグネチャ**  `E<(a->b->c)> -> E<a> -> E<b> -> E<c>`（Eはリストまたは他の列挙可能な型）、
   またはタプルで組み合わせる版では `E<a> -> E<b> -> E<a,b>`

### 説明

一部のデータ型では、`apply`の有効な実装が複数存在する可能性があります。
例えば、リストには`ZipList`や類似の名前でよく知られる、もう1つの`apply`の実装があります。

この実装では、各リストの対応する要素が同時に処理され、次の要素に移るために両方のリストが一緒にシフトされます。
つまり、関数のリスト`[f; g]`を値のリスト`[x; y]`に適用すると、2要素のリスト`[f x; g y]`になります。

```fsharp
// 代替の「zip」実装
// [f;g] apply [x;y] は [f x; g y] になる
let rec zipList fList xList  = 
    match fList,xList with
    | [],_ 
    | _,[] -> 
        // どちらかの側が空なら終了
        []  
    | (f::fTail),(x::xTail) -> 
        // 新しいhead + 新しいtail
        (f x) :: (zipList fTail xTail)
// 型：('a -> 'b) -> 'a list -> 'b list
```

*注意：この実装はデモンストレーション用です。末尾再帰ではないので、大きなリストには使用しないでください！*

リストの長さが異なる場合の挙動は実装によって異なります。F#ライブラリ関数の`List.map2`や`List.zip`のように例外をスローするものもあれば、
上記の実装のように余分なデータを静かに無視するものもあります。

では、実際に使ってみましょう。

```fsharp
let add10 x = x + 10
let add20 x = x + 20
let add30 x = x + 30

let result =  
    let (<*>) = zipList 
    [add10; add20; add30] <*> [1; 2; 3] 
// result => [11; 22; 33]
```

結果が`[11; 22; 33]`、つまり3要素だけになっていることに注目してください。標準の`List.apply`を使っていたら、9要素になっていたでしょう。

### 「zip」を「結合器」として解釈する

先ほど`List.apply`、より正確には`List.lift2`を結合器として解釈できることを見ました。同様に、`zipList`も結合器として考えることができます。

```fsharp
let add x y = x + y

let resultAdd =  
    let (<*>) = zipList 
    [add;add] <*> [1;2] <*> [10;20]
// resultAdd = [11; 22]
// [ (add 1 10); (add 2 20) ]
```

最初のリストに`add`関数を1つだけ入れることはできない点に注意してください。2番目と3番目のリストの各要素に対して1つの`add`が必要になります！

That could get annoying, so often, a "tupled" version of `zip` is used, whereby you don't specify a combining function at all, and just get back a list of tuples instead,
which you can then process later using `map`.
This is the same approach as was used in the `combine` functions discussed above, but for `zipList`.

### ZipList world 

In standard List world, there is an `apply` and a `return`. But with our different version of `apply` we can create a different version of List world
called ZipList world.

ZipList world is quite different from the standard List world.

In ZipList world, the `apply` function is implemented as above. But more interestingly, ZipList world has a *completely different*
implementation of `return` compared with standard List world.
In the standard List world, `return` is just a list with a single element, but for
ZipList world, it has to be an infinitely repeated value!  

In a non-lazy language like F#, we can't do this, but if we replace `List` with `Seq` (aka `IEnumerable`) then
we *can* create an infinitely repeated value, as shown below:

```fsharp
module ZipSeq =

    // define "return" for ZipSeqWorld
    let retn x = Seq.initInfinite (fun _ -> x)

    // define "apply" for ZipSeqWorld
    // (where we can define apply in terms of "lift2", aka "map2")
    let apply fSeq xSeq  = 
        Seq.map2 (fun f x -> f x)  fSeq xSeq  
    // has type : ('a -> 'b) seq -> 'a seq -> 'b seq

    // define a sequence that is a combination of two others
    let triangularNumbers = 
        let (<*>) = apply

        let addAndDivideByTwo x y = (x + y) / 2
        let numbers = Seq.initInfinite id
        let squareNumbers = Seq.initInfinite (fun i -> i * i)
        (retn addAndDivideByTwo) <*> numbers <*> squareNumbers 

    // evaulate first 10 elements 
    // and display result            
    triangularNumbers |> Seq.take 10 |> List.ofSeq |> printfn "%A"
    // Result =>
    // [0; 1; 3; 6; 10; 15; 21; 28; 36; 45]
```

This example demonstrates that an elevated world is *not* just a data type (like the List type) but consists of the datatype *and* the functions that work with it.
In this particular case, "List world" and "ZipList world" share the same data type but have quite different environments.

## What types support `map` and `apply` and `return`?

So far we have defined all these useful functions in an abstract way.
But how easy is it to find real types that have implementations of them, including all the various laws?

The answer is: very easy! In fact *almost all* types support these set of functions. You'd be hard-pressed to find a useful type that didn't. 

That means that `map` and `apply` and `return` are available (or can be easily implemented) for standard types such as `Option`, `List`, `Seq`, `Async`, etc.,
and also any types you are likely to define yourself.

## Summary

In this post, I described three core functions for lifting simple "normal" values to elevated worlds:  `map`, `return`, and `apply`,
plus some derived functions like `liftN` and `zip`.

In practice however, things are not that simple. We frequently have to work with functions that cross between the worlds.
Their input is in the normal world but their output is in the elevated world.

In the [next post](../posts/elevated-world-2.md) we'll show how these world-crossing functions can be lifted to the elevated world as well.

