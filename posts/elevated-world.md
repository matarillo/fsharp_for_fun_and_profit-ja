---
layout: post
title: "map と apply を理解する"
description: "高次の世界を扱うためのツールセット"
categories: ["パターン"]
seriesId: "Map, Bind, Apply なにもわからない"
seriesOrder: 1
image: "/assets/img/vgfp_map.png"
---

この一連の投稿では、`Option`や`List`などのジェネリックなデータ型を扱うためのコア関数を解説します。
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

この一連の投稿では、これらのツールとパターンについて説明していきます。

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

## The `return` function

**Common Names**: `return`, `pure`, `unit`, `yield`, `point`

**Common Operators**: None

**What it does**:  Lifts a single value into the elevated world

**Signature**:  `a -> E<a>`

### Description

"return" (also known as "unit" or "pure") simply creates a elevated value from a normal value.


![](../assets/img/vgfp_return.png)

This function goes by many names, but I'm going to be consistent and call it `return` as that is the common term for it in F#, and is the term used in computation expressions.

*NOTE: I'm ignoring the difference between `pure` and `return`, because type classes are not the focus of this post.*

### Implementation examples

Here are two examples of `return` implementations in F#:

```fsharp
// A value lifted to the world of Options
let returnOption x = Some x
// has type : 'a -> 'a option

// A value lifted to the world of Lists
let returnList x  = [x]
// has type : 'a -> 'a list
```

Obviously, we don't need to define special functions like this for options and lists. Again, I've just done it to show what `return` might look for some common types.

<a id="apply"></a>
<hr>

## The `apply` function

**Common Names**: `apply`, `ap`

**Common Operators**: `<*>` 

**What it does**:  Unpacks a function wrapped inside a elevated value into a lifted function `E<a> -> E<b>`

**Signature**:  `E<(a->b)> -> E<a> -> E<b>`

### Description

"apply" unpacks a function wrapped inside a elevated value (`E<(a->b)>`) into a lifted function `E<a> -> E<b>`

![](../assets/img/vgfp_apply.png)

This might seem unimportant, but is actually very valuable, as it allows you to lift a multi-parameter function in the normal world into a
multi-parameter function in the elevated world, as we'll see shortly.

### Alternative interpretation

An alternative interpretation of `apply` is that it is a *two* parameter function that takes a elevated value (`E<a>`) and a elevated function (`E<(a->b)>`),
and returns a new elevated value (`E<b>`) generated by applying the function `a->b` to the internal elements of `E<a>`.

For example, if you have a one-parameter function (`E<(a->b)>`), you can apply it to a single elevated parameter to get the output as another elevated value.

![](../assets/img/vgfp_apply2.png)

If you have a two-parameter function (`E<(a->b->c)>`), you can use `apply` twice in succession with two elevated parameters to get the elevated output.

![](../assets/img/vgfp_apply3.png)

You can continue to use this technique to work with as many parameters as you wish.

### Implementation examples

Here are some examples of defining `apply` for two different types in F#:

```fsharp
module Option =

    // The apply function for Options
    let apply fOpt xOpt = 
        match fOpt,xOpt with
        | Some f, Some x -> Some (f x)
        | _ -> None

module List =

    // The apply function for lists
    // [f;g] apply [x;y] becomes [f x; f y; g x; g y]
    let apply (fList: ('a->'b) list) (xList: 'a list)  = 
        [ for f in fList do
          for x in xList do
              yield f x ]
```

In this case, rather than have names like `applyOption` and `applyList`, I have given the functions the same name but put them in a per-type module.

Note that in the `List.apply` implementation, each function in the first list is applied to each value in the second list, resulting in a "cross-product" style result. 
That is, the list of functions `[f; g]` applied to the list of values `[x; y]` becomes the four-element list `[f x; f y; g x; g y]`. We'll see shortly that this is not the only
way to do it.  

Also, of course, I'm cheating by building this implementation on a `for..in..do` loop -- functionality that already exists!

I did this for clarity in showing how `apply` works. It's easy enough to create a "from scratch" recursive implementation,
(though it is not so easy to create one that is properly tail-recursive!) but I want to focus on the concepts not on the implementation for now.

### Infix version of apply

Using the `apply` function as it stands can be awkward, so it is common to create an infix version, typically called `<*>`.
With this in place you can write code like this:

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

The combination of `apply` and `return` is considered "more powerful" than `map`, because if you have `apply` and `return`,
you can construct `map` from them, but not vice versa.

Here's how it works: to construct a lifted function from a normal function, just use `return` on the normal function and then `apply`.
This gives you the same result as if you had simply done `map` in the first place.

![](../assets/img/vgfp_apply_vs_map.png)

This trick also means that our infix notation can be simplified a little. The initial `return` then `apply` can be replaced with `map`,
and we so typically create an infix operator for `map` as well, such as `<!>` in F#.

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

This makes the code look more like using the function normally. That is, instead of the normal `add x y`, we can use the similar looking `add <!> x <*> y`,
but now `x` and `y` can be elevated values rather than normal values.  Some people have even called this style "overloaded whitespace"!

Here's one more for fun:

```fsharp
let batman = 
    let (<!>) = List.map
    let (<*>) = List.apply

    // string concatenation using +
    (+) <!> ["bam"; "kapow"; "zap"] <*> ["!"; "!!"]  
    
// result =
// ["bam!"; "bam!!"; "kapow!"; "kapow!!"; "zap!"; "zap!!"]
```

### The properties of a correct apply/return implementation

As with `map`, a correct implementation of the `apply`/`return` pair should have some properties that are true no matter what elevated world we are working with.

There are four so-called ["Applicative Laws"](https://en.wikibooks.org/wiki/Haskell/Applicative_functors#Applicative_functor_laws),
and an **Applicative Functor** (in the programming sense) is defined as a generic data type constructor -- `E<T>` -- plus a pair of
functions (`apply` and `return`) that obey the applicative laws.

Just as with the laws for `map`, these laws are quite sensible. I'll show two of them.

The first law says that if you take the `id` function in the normal world, and you lift it into the elevated world with `return`, and then you do `apply`,
the new function, which is of type `E<a> -> E<a>`, should be the same as the `id` function in the elevated world.

![](../assets/img/vgfp_apply_law_id.png)

The second law says that if you take a function `f` and a value `x` in the normal world, and you apply `f` to `x` to get a result (`y`, say), and then lift the result using `return`,
the resulting value should be the same as if you lifted `f` and `x` into the elevated world *first*, and then applied them there afterwards.

![](../assets/img/vgfp_apply_law_homomorphism.png)

The other two laws are not so easily diagrammed, so I won't document them here, but together the laws ensure that any implementation is sensible.

<a id="lift"></a>
<hr>


## The `liftN` family of functions

**Common Names**: `lift2`, `lift3`, `lift4` and similar

**Common Operators**: None

**What it does**:  Combines two (or three, or four) elevated values using a specified function 

**Signature**:  
lift2: `(a->b->c) -> E<a> -> E<b> -> E<c>`,  
lift3: `(a->b->c->d) -> E<a> -> E<b> -> E<c> -> E<d>`,  
etc.

### Description

The `apply` and `return` functions can be used to define a series of helper functions `liftN` (`lift2`, `lift3`, `lift4`, etc)
that take a normal function with N parameters (where N=2,3,4, etc) and transform it to a corresponding elevated function.

Note that `lift1` is just `map`, and so it is not usually defined as a separate function.

Here's what an implementation might look like:

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

Here's a visual representation of `lift2`:

![](../assets/img/vgfp_lift2.png)

The `lift` series of functions can be used to make code a bit more readable because,
by using one of the pre-made `lift` functions, we can avoid the `<*>` syntax.

First, here's an example of lifting a two-parameter function:

```fsharp
// define a two-parameter function to test with
let addPair x y = x + y 

// lift a two-param function
let addPairOpt = Option.lift2 addPair

// call as normal
addPairOpt (Some 1) (Some 2) 
// result => Some 3
```

And here's an example of lifting a three-parameter function:

```fsharp
// define a three-parameter function to test with
let addTriple x y z = x + y + z

// lift a three-param function
let addTripleOpt = Option.lift3 addTriple

// call as normal
addTripleOpt (Some 1) (Some 2) (Some 3)   
// result => Some 6
```

### Interpreting "lift2" as a "combiner"

There is an alternative interpretation of `apply` as a "combiner" of elevated values, rather than as function application.

For example, when using `lift2`, the first parameter is a parameter specifying how to combine the values.

Here's an example where the same values are combined in two different ways: first with addition, then with multiplication.

```fsharp
Option.lift2 (+) (Some 2) (Some 3)   // Some 5
Option.lift2 (*) (Some 2) (Some 3)   // Some 6
```

Going further, can we eliminate the need for this first function parameter and have a *generic* way of combining the values?

Why, yes we can! We can just use a tuple constructor to combine the values.
When we do this we are combining the values without making any decision about how they will be used yet.

Here's what it looks like in a diagram:

![](../assets/img/vgfp_apply_combine.png)

and here's how you might implement it for options and lists:

```fsharp
// define a tuple creation function
let tuple x y = x,y

// create a generic combiner of options
// with the tuple constructor baked in
let combineOpt x y = Option.lift2 tuple x y 

// create a generic combiner of lists
// with the tuple constructor baked in
let combineList x y = List.lift2 tuple x y 
```

Let's see what happens when we use the combiners:

```fsharp
combineOpt (Some 1) (Some 2)        
// Result => Some (1, 2)

combineList [1;2] [100;200]         
// Result => [(1, 100); (1, 200); (2, 100); (2, 200)]
```

Now that we have an elevated tuple, we can work with the pair in any way we want, we just need to use `map` to do the actual combining.

Want to add the values? Just use `+` in the `map` function:

```fsharp
combineOpt (Some 2) (Some 3)        
|> Option.map (fun (x,y) -> x + y)  
// Result => // Some 5

combineList [1;2] [100;200]         
|> List.map (fun (x,y) -> x + y)    
// Result => [101; 201; 102; 202]
```

Want to multiply the values? Just use `*` in the `map` function:

```fsharp
combineOpt (Some 2) (Some 3)        
|> Option.map (fun (x,y) -> x * y)  
// Result => Some 6

combineList [1;2] [100;200]         
|> List.map (fun (x,y) -> x * y)    
// Result => [100; 200; 200; 400]
```

And so on. Obviously, real-world uses would be somewhat more interesting.

### Defining `apply` in terms of `lift2`

Interestingly, the `lift2` function above can be actually used as an alternative basis for defining `apply`.

That is, we can define `apply` in terms of the `lift2` function by setting the combining function to be just function application.

Here's a demonstration of how this works for `Option`:

```fsharp
module Option = 

    /// define lift2 from scratch
    let lift2 f xOpt yOpt = 
        match xOpt,yOpt with
        | Some x,Some y -> Some (f x y)
        | _ -> None

    /// define apply in terms of lift2
    let apply fOpt xOpt = 
        lift2 (fun f x -> f x) fOpt xOpt 
```

This alternative approach is worth knowing about because for some types it's easier to define `lift2` than `apply`.

### Combining missing or bad data

Notice that in all the combiners we've looked at, if one of the elevated values is "missing" or "bad" somehow, then the overall result is also bad.

For example, with `combineList`, if one of the parameters is an empty list, the result is also an empty list,
and with `combineOpt`, if one of the parameters is `None`, the result is also `None`.

```fsharp
combineOpt (Some 2) None    
|> Option.map (fun (x,y) -> x + y)    
// Result => None

combineList [1;2] []         
|> List.map (fun (x,y) -> x * y)    
// Result => Empty list
```

It's possible to create an alternative kind of combiner that ignores missing or bad values, just as adding "0" to a number is ignored.
For more information, see my post on ["Monoids without tears"](../posts/monoids-without-tears.md).

### One sided combiners `<*` and `*>` 

In some cases you might have two elevated values, and want to discard the value from one side or the other.

Here's an example for lists:

```fsharp
let ( <* ) x y = 
    List.lift2 (fun left right -> left) x y 

let ( *> ) x y = 
    List.lift2 (fun left right -> right) x y 
```

We can then combine a 2-element list and a 3-element list to get a 6-element list as expected, but the contents come from only one side or the other.

```fsharp
[1;2] <* [3;4;5]   // [1; 1; 1; 2; 2; 2]
[1;2] *> [3;4;5]   // [3; 4; 5; 3; 4; 5]
```

We can turn this into a feature! We can replicate a value N times by crossing it with `[1..n]`.

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

Of course, this is by no means an efficient way to replicate a value, but it does show that starting with just the two functions `apply` and `return`,
you can build up some quite complex behavior.

On a more practical note though, why might this "throwing away data" be useful? Well in many cases, we might not want the values, but we *do* want the effects.

For example, in a parser, you might see code like this:

```fsharp
let readQuotedString =
   readQuoteChar *> readNonQuoteChars <* readQuoteChar
```

In this snippet, `readQuoteChar` means "match and read a quote character from the input stream" and
`readNonQuoteChars` means "read a series of non-quote characters from the input stream".

When we are parsing a quoted string we want ensure the input stream that contains the quote character is read,
but we don't care about the quote characters themselves, just the inner content.

Hence the use of `*>` to ignore the leading quote and `<*` to ignore the trailing quote.


<a id="zip"></a>
<hr>

## The `zip` function and ZipList world

**Common Names**: `zip`, `zipWith`, `map2`

**Common Operators**: `<*>` (in the context of ZipList world)

**What it does**:  Combines two lists (or other enumerables) using a specified function 

**Signature**:  `E<(a->b->c)> -> E<a> -> E<b> -> E<c>` where `E` is a list or other enumerable type,
   or `E<a> -> E<b> -> E<a,b>` for the tuple-combined version.

### Description

Some data types might have more than one valid implementation of `apply`. For example, there is another possible implementation of `apply` for lists,
commonly called `ZipList` or some variant of that.

In this implementation, the corresponding elements in each list are processed at the same time, and then both lists are shifted to get the next element. 
That is, the list of functions `[f; g]` applied to the list of values `[x; y]` becomes the two-element list `[f x; g y]`

```fsharp
// alternate "zip" implementation
// [f;g] apply [x;y] becomes [f x; g y]
let rec zipList fList xList  = 
    match fList,xList with
    | [],_ 
    | _,[] -> 
        // either side empty, then done
        []  
    | (f::fTail),(x::xTail) -> 
        // new head + new tail
        (f x) :: (zipList fTail xTail)
// has type : ('a -> 'b) -> 'a list -> 'b list
```

*WARNING: This implementation is just for demonstration. It's not tail-recursive, so don't use it for large lists!*

If the lists are of different lengths, some implementations throw an exception (as the F# library functions `List.map2` and `List.zip` do),
while others silently ignore the extra data (as the implementation above does).

Ok, let's see it in use:

```fsharp
let add10 x = x + 10
let add20 x = x + 20
let add30 x = x + 30

let result =  
    let (<*>) = zipList 
    [add10; add20; add30] <*> [1; 2; 3] 
// result => [11; 22; 33]
```

Note that the result is `[11; 22; 33]` -- only three elements. If we had used the standard `List.apply`, there would have been nine elements.

### Interpreting "zip" as a "combiner"

We saw above that `List.apply`, or rather `List.lift2`, could be intepreted as a combiner. Similarly, so can `zipList`. 

```fsharp
let add x y = x + y

let resultAdd =  
    let (<*>) = zipList 
    [add;add] <*> [1;2] <*> [10;20]
// resultAdd = [11; 22]
// [ (add 1 10); (add 2 20) ]
```

Note that we can't just have *one* `add` function in the first list -- we have to have one `add` for every element in the second and third lists!  

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

