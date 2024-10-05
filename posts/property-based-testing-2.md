---
layout: post
title: "プロパティベースのテストのプロパティ選択"
description: "FsCheckやQuickCheckを使いたいけど、どんなプロパティを使えばいいのかわからない"
categories: ["TDD"]
image: "/assets/img/property_commutative.png"
---

*更新情報: これらの投稿に基づいて、プロパティベースのテストに関する講演を行いました。[スライドとビデオはこちら](https://fsharpforfunandprofit.com/pbt/) です。*

[前回の投稿](../posts/property-based-testing.md)では、プロパティベースのテストの基本と、ランダムなテストを生成することで時間を大幅に節約できることを説明しました。

しかし、よくある問題があります。FsCheckやQuickCheckのようなプロパティベースのテストツールを見ると、誰もが素晴らしいと思うのですが…
いざ自分でプロパティを作成しようとすると、「どんなプロパティを使えばいいんだ？何も思いつかない！」という不満が必ず出てきます。

この投稿の目的は、コードに適用できるプロパティを発見するのに役立つ、いくつかの一般的なパターンを紹介することです。

## プロパティのカテゴリー

私の経験では、多くのプロパティは、以下に挙げる7つのアプローチのいずれかを使うことで発見できます。

* [「異なるパス、同じ目的地」](#different-paths)
* [「行って帰って元通り」](#there-and-back)
* [「変わらないものもある」](#some-things-never-change)
* [「変われば変わるほど、元のままだ」](#idempotence)
* [「まずは小さな問題を解く」](#structural-induction)
* [「証明は難しくても、検証は簡単」](#hard-to-prove-easy-to-verify)
* [「テストオラクル」](#test-oracle)

これは決して包括的なリストではなく、私にとって最も役立ったものです。
他の視点については、マイクロソフトのPEXチームがまとめた[パターンのリスト](https://citeseerx.ist.psu.edu/document?repid=rep1&type=pdf&doi=feeaae51dfdd95372fb3518b40884f6ade17dfcc)をご覧ください。


<a id="different-paths"></a>

### 「異なるパス、同じ目的地」

この種のプロパティは、操作を異なる順序で組み合わせても、同じ結果になることを前提としています。
例えば、下の図では、`X` を実行してから `Y` を実行しても、`Y` を実行してから `X` を実行しても、同じ結果になります。

![可換プロパティ](../assets/img/property_commutative.png)

加算の可換性は、このパターンの分かりやすい例です。例えば、「1を足す」を実行してから「2を足す」を実行した結果は、「2を足す」を実行してから「1を足す」を実行した結果と同じです。

このパターンを一般化すると、広範囲にわたる有用なプロパティを生成できます。この投稿の後半で、このパターンの使い方をさらに紹介します。

<a id="there-and-back"></a>

### 「行って帰って元通り」

この種のプロパティは、ある操作とその逆の操作を組み合わせることで、元の値と同じ値になることを前提としています。

下の図では、`X` を実行すると `ABC` が何らかのバイナリ形式にシリアル化され、`X` の逆の操作である何らかのデシリアライズを実行すると、同じ `ABC` の値が返されます。
  
![逆演算](../assets/img/property_inverse.png)

シリアル化/デシリアライズに加えて、`addition`/`subtraction`、`write`/`read`、`setProperty`/`getProperty` など、他の操作のペアもこの方法でチェックできます。

厳密な逆演算ではない場合でも、`insert`/`contains`、`create`/`exists` などのペアもこのパターンに当てはまります。

<a id="some-things-never-change"></a>

### 「変わらないものもある」

この種のプロパティは、何らかの変換後も保持される不変条件に基づいています。

下の図では、変換によって項目の順序が変わりますが、変換後も同じ4つの項目が存在しています。

![不変条件](../assets/img/property_invariant.png)

一般的な不変条件には、コレクションのサイズ（例えば `map` の場合）、コレクションの内容（例えば `sort` の場合）、サイズに比例した高さや深さ（例えば平衡木）などがあります。

<a id="idempotence"></a>

### 「変われば変わるほど、元のままだ」

この種のプロパティは、「冪等性」に基づいています。つまり、操作を2回行っても、1回行った場合と同じ結果になるということです。

下の図では、`distinct` を使って集合をフィルタリングすると2つの項目が返されますが、`distinct` を2回行っても、同じ集合が返されます。

![冪等性](../assets/img/property_idempotence.png)

この冪等性という概念は、データベースの更新やメッセージ処理など、様々な場面で役立ちます。

<a id="structural-induction"></a>

### 「まずは小さな問題を解く」

この種のプロパティは、「構造帰納法」に基づいています。つまり、大きなものを小さな部分に分解することができ、その小さな部分について何らかのプロパティが真である場合、
大きなものについてもそのプロパティが真であることを証明できることがよくあります。

下の図では、4つの項目からなるリストを、1つの項目と3つの項目からなるリストに分割し、さらにそれを1つの項目と2つの項目からなるリストに分割できることがわかります。
2つの項目からなるリストについてプロパティが成り立つことが証明できれば、3つの項目からなるリスト、そして4つの項目からなるリストについても成り立つと推測できます。

![帰納法](../assets/img/property_induction.png)

帰納法のプロパティは、リストや木などの再帰的な構造に自然に適用できることがよくあります。

<a id="hard-to-prove-easy-to-verify"></a>

### 「証明は難しくても、検証は簡単」

結果を求めるアルゴリズムは複雑でも、答えの検証は簡単なことがよくあります。

下の図では、迷路のルートを見つけるのは難しいですが、それが正しいかどうかを確認するのは簡単です。

![見つけるのは難しくても、検証は簡単](../assets/img/property_easy_verification.png)

素因数分解など、有名な問題の多くはこの種の問題です。しかし、このアプローチは、単純な問題にも使うことができます。

例えば、文字列のトークナイザが正しく動作するかどうかを、すべてのトークンを再び連結することで確認できます。結果の文字列は、元の文字列と同じになるはずです。

<a id="test-oracle"></a>

### 「テストオラクル」

多くの場合、結果を確認するために使用できる、アルゴリズムまたはプロセスの代替バージョン（「テストオラクル」）があります。

![テストオラクル](../assets/img/property_test_oracle.png)

例えば、最適化の調整を行った高性能なアルゴリズムをテストしたい場合があります。
この場合、はるかに遅いが、正しく書くのがはるかに簡単な、ブルートフォースアルゴリズムと比較することができます。

同様に、並列または並行アルゴリズムの結果を、線形なシングルスレッドバージョンと比較することもできます。


## カテゴリーを実際の例で活用する

このセクションでは、これらのカテゴリーを適用して、「リストをソートする」「リストを反転する」などの単純な関数のプロパティを考えられるかどうかを見ていきます。

### リストのソートに「異なるパス、同じ目的地」を適用する

では、まず「*異なるパス、同じ目的地*」から始めて、「リストのソート」関数に適用してみましょう。

`List.sort`の*前*に1つの操作を組み合わせ、*後*に別の操作を組み合わせることで、最終的に同じ結果になるような方法を考えられるでしょうか？
つまり、「上に行ってから上を横切る」のと「下を横切ってから上に行く」のが同じになるようにです。

![リストのソート？](../assets/img/property_list_sort.png)

これはどうでしょうか？

* **パス1:** リストの各要素に1を足してから、ソートします。
* **パス2:** ソートしてから、リストの各要素に1を足します。
* 両方のリストは等しくなるはずです。

![1を足してからソートする場合と、ソートしてから1を足す場合](../assets/img/property_list_sort1.png)

このプロパティを実装したコードを以下に示します。

```fsharp
let ``+1 then sort should be same as sort then +1`` sortFn aList = 
    let add1 x = x + 1
    
    let result1 = aList |> sortFn |> List.map add1
    let result2 = aList |> List.map add1 |> sortFn 
    result1 = result2

// テスト    
let goodSort = List.sort
Check.Quick (``+1 then sort should be same as sort then +1`` goodSort)
// OK、100個のテストに合格しました。
```

さて、これはうまくいきますが、他の多くの変換でもうまくいきます。
例えば、`List.sort` を単なる恒等関数として実装した場合でも、このプロパティは同様に満たされます。これは自分でテストできます。

```fsharp
let badSort aList = aList
Check.Quick (``+1 then sort should be same as sort then +1`` badSort)
// OK、100個のテストに合格しました。
```

このプロパティの問題点は、「ソート済みであること」を全く活用していないことです。ソートはおそらくリストの順序を変更するでしょうし、確かに最小の要素が最初に来るはずです。

*確実に*ソート後にリストの先頭に来る項目を追加するのはどうでしょうか？

* **パス1:** リストの*末尾*に `Int32.MinValue` を追加してから、ソートします。
* **パス2:** ソートしてから、リストの*先頭*に `Int32.MinValue` を追加します。
* 両方のリストは等しくなるはずです。

![最小値を使ったリストのソート](../assets/img/property_list_sort2.png)

コードは以下の通りです。

```fsharp
let ``append minValue then sort should be same as sort then prepend minValue`` sortFn aList = 
    let minValue = Int32.MinValue
   
    let appendThenSort = (aList @ [minValue]) |> sortFn 
    let sortThenPrepend = minValue :: (aList |> sortFn)
    appendThenSort = sortThenPrepend 

// テスト
Check.Quick (``append minValue then sort should be same as sort then prepend minValue`` goodSort)
// OK、100個のテストに合格しました。
```

悪い実装は今度は失敗します。

```fsharp
Check.Quick (``append minValue then sort should be same as sort then prepend minValue`` badSort)
// 反証可能、1回のテスト（2回の縮小）後
// [0]
```

つまり、`[0; minValue]` の不正なソートは `[minValue; 0]` とは*同じではない*ということです。

これはいいですね。

しかし…そこには、エンタープライズデベロッパーフロムヘル（[前回の投稿](../posts/property-based-testing.md)を参照）が利用できるハードコードされたものがあります。
EDFHは、常に `Int32.MinValue` を使用し、常にテストリストの先頭または末尾に追加するという事実を悪用します。

つまり、EDFHは私たちがどちらのパスにいるのかを特定し、それぞれの場合に特別な処理をすることができます。

```fsharp
// エンタープライズデベロッパーフロムヘルが再び襲来
let badSort2 aList = 
    match aList with
    | [] -> []
    | _ -> 
        let last::reversedTail = List.rev aList 
        if (last = Int32.MinValue) then
            // 最小値が最後にある場合は、先頭に移動する
            let unreversedTail = List.rev reversedTail
            last :: unreversedTail 
        else
            aList // そのままにする
```

そこで、この関数をテストしてみると…

```fsharp
// おやおや、悪い実装がパスしてしまいました。
Check.Quick (``append minValue then sort should be same as sort then prepend minValue`` badSort2)
// OK、100個のテストに合格しました。
```

これを修正するには、(a) リスト内のどの数値よりも小さい乱数を生成し、(b) 常に追加するのではなく、乱数で決めた位置に挿入します。
しかし、複雑になりすぎるので、ここで一旦立ち止まって考え直してみましょう。

「ソート済みであること」を利用した別の方法として、最初にすべての値の符号を反転し、
ソートの*後*に符号を反転するパスでは、さらに反転を追加するという方法があります。

![符号の反転を使ったリストのソート](../assets/img/property_list_sort3.png)

```fsharp
let ``negate then sort should be same as sort then negate then reverse`` sortFn aList = 
    let negate x = x * -1

    let negateThenSort = aList |> List.map negate |> sortFn 
    let sortThenNegateAndReverse = aList |> sortFn |> List.map negate |> List.rev
    negateThenSort = sortThenNegateAndReverse 
```

このプロパティは、どちらのパスにいるのかを特定するのに役立つマジックナンバーがないため、EDFHが打ち負かすのは困難です。

```fsharp
// テスト
Check.Quick ( ``negate then sort should be same as sort then negate then reverse`` goodSort)
// OK、100個のテストに合格しました。

// テスト
Check.Quick ( ``negate then sort should be same as sort then negate then reverse``  badSort)
// 反証可能、1回のテスト（1回の縮小）後
// [1; 0]

// テスト
Check.Quick ( ``negate then sort should be same as sort then negate then reverse``  badSort2)
// 反証可能、5回のテスト（3回の縮小）後
// [1; 0]
```

整数のリストのソートしかテストしていないと主張する人もいるかもしれません。
しかし、`List.sort` 関数はジェネリックであり、整数自体については何も知らないので、このプロパティがソートのコアロジックをテストしていることに私は大きな自信を持っています。


### リストの反転関数に「異なるパス、同じ目的地」を適用する

さて、`List.sort` については十分です。同じ考え方をリストの反転関数に適用してみるのはどうでしょうか？

同じ追加/先頭に追加のトリックを実行できます。

![リストの反転](../assets/img/property_list_rev.png)

プロパティのコードは以下の通りです。

```fsharp
let ``append any value then reverse should be same as reverse then prepend same value`` revFn anyValue aList = 
  
    let appendThenReverse = (aList @ [anyValue]) |> revFn 
    let reverseThenPrepend = anyValue :: (aList |> revFn)
    appendThenReverse = reverseThenPrepend 
```

正しい関数と2つの正しくない関数のテスト結果を以下に示します。

```fsharp
// テスト
let goodReverse = List.rev
Check.Quick (``append any value then reverse should be same as reverse then prepend same value`` goodReverse)
// OK、100個のテストに合格しました。

// 悪い実装は失敗する
let badReverse aList = []
Check.Quick (``append any value then reverse should be same as reverse then prepend same value`` badReverse)
// 反証可能、1回のテスト（2回の縮小）後
// true, []

// 悪い実装は失敗する
let badReverse2 aList = aList 
Check.Quick (``append any value then reverse should be same as reverse then prepend same value`` badReverse2)
// 反証可能、1回のテスト（1回の縮小）後
// true, [false]
```

ここで興味深いことに気づくかもしれません。リストの型を指定していません。このプロパティは*どんな*リストでも機能します。

このような場合、FsCheckはbool、文字列、整数などのランダムなリストを生成します。

どちらの失敗例でも、`anyValue` はboolです。つまり、FsCheckは最初にboolのリストを使用しています。

練習問題です。このプロパティは十分でしょうか？EDFHが合格する実装を作成できる方法はありますか？

## 「行って帰って元通り」

複数パスのスタイルのプロパティが利用できない場合や複雑すぎる場合があるので、他のアプローチを見てみましょう。

まずは、逆演算を含むプロパティから始めます。

リストのソートからもう一度始めましょう。ソートの逆演算はありますか？うーん、ないですね。なので、ソートは今は飛ばします。

リストの反転はどうでしょうか？ 実は、反転はそれ自体が逆演算なのです。

![逆演算を使ったリストの反転](../assets/img/property_list_rev_inverse.png)

これをプロパティにしてみましょう。

```fsharp
let ``reverse then reverse should be same as original`` revFn aList = 
    let reverseThenReverse = aList |> revFn |> revFn
    reverseThenReverse = aList
```

そして、合格します。

```fsharp
let goodReverse = List.rev
Check.Quick (``reverse then reverse should be same as original`` goodReverse)
// OK、100個のテストに合格しました。
```

しかし、残念ながら、このプロパティでは、誤った実装でもテストをパスしてしまう可能性があります。

```fsharp
let badReverse aList = aList 
Check.Quick (``reverse then reverse should be same as original`` badReverse)
// OK、100個のテストに合格しました。
```

それでも、逆演算を含むプロパティを使用することは、
逆関数（デシリアライズなど）が実際に主関数（シリアル化など）を「元に戻す」ことを検証するのに非常に役立ちます。

次の投稿では、これを使った実際の例をいくつか紹介します。

## 「証明は難しくても、検証は簡単」

ここまでは、操作の最終結果を気にせずにプロパティをテストしてきました。

しかし、実際には最終結果が重要です。

通常、テスト対象の関数を複製しなければ、結果が正しいかどうかを判断することはできません。
しかし、多くの場合、結果が*間違っている*かどうかはかなり簡単に判断できます。上記の迷路の図では、パスが機能するかどうかを簡単に確認できます。

*最短*パスを探している場合は、それを確認できないかもしれませんが、少なくとも*有効な*パスがあることはわかります。

この原則は非常に一般的に適用できます。

例えば、`文字列の分割`関数が機能しているかどうかを確認したいとします。トークナイザを書く必要はありません。
トークンを連結すると元の文字列に戻ることだけを確認すればよいのです。

![文字列分割プロパティ](../assets/img/property_string_split.png)

このプロパティのコアコードは以下の通りです。

```fsharp
let concatWithComma s t = s + "," + t

let tokens = originalString.Split [| ',' |] 
let recombinedString = 
    // 常に少なくとも1つのトークンがあるので、reduceを安全に使用できる
    tokens |> Array.reduce concatWithComma 

// 結果を元のものと比較する
originalString = recombinedString 
```

しかし、どのようにして元の文字列を作成すればよいのでしょうか？FsCheckによって生成されたランダムな文字列には、カンマがほとんど含まれていない可能性があります。

FsCheckがランダムデータを生成する方法を正確に制御する方法がありますが、それについては後で説明します。

ここでは、トリックを使います。そのトリックとは、FsCheckにランダムな文字列のリストを生成させ、それらを連結して `originalString` を構築するというものです。

このプロパティの完全なコードは以下の通りです。

```fsharp
let ``concatting the elements of a string split by commas recreates the original string`` aListOfStrings = 
    // 文字列を作成するためのヘルパー
    let addWithComma s t = s + "," + t
    let originalString = aListOfStrings |> List.fold addWithComma ""
    
    // プロパティ
    let tokens = originalString.Split [| ',' |] 
    let recombinedString = 
        // 常に少なくとも1つのトークンがあるので、reduceを安全に使用できる
        tokens |> Array.reduce addWithComma 

    // 結果を元のものと比較する
    originalString = recombinedString 
```

これをテストすると、満足のいく結果が得られます。

```fsharp
Check.Quick ``concatting the elements of a string split by commas recreates the original string`` 
// OK、100個のテストに合格しました。
```

### リストのソートにおける「証明は難しくても、検証は簡単」

では、この原則をソートされたリストにどのように適用すればよいのでしょうか？どのようなプロパティが簡単に検証できるのでしょうか？

最初に思いつくのは、リスト内の要素の各ペアについて、最初の要素が2番目の要素よりも小さくなるということです。

![ペアワイズプロパティ](../assets/img/property_list_sort_pairwise.png)


これをプロパティにしてみましょう。

```fsharp
let ``adjacent pairs from a list should be ordered`` sortFn aList = 
    let pairs = aList |> sortFn |> Seq.pairwise
    pairs |> Seq.forall (fun (x,y) -> x <= y )
```

しかし、チェックしようとするとおかしなことが起こります。エラーが発生します。

```fsharp
let goodSort = List.sort
Check.Quick (``adjacent pairs from a list should be ordered`` goodSort)
```

```text
System.Exception: Geneflect: type not handled System.IComparable
   at FsCheck.ReflectArbitrary.reflectObj@102-4.Invoke(String message)
   at Microsoft.FSharp.Core.PrintfImpl.go@523-3[b,c,d](String fmt, Int32 len, FSharpFunc`2 outputChar, FSharpFunc`2 outa, b os, FSharpFunc`2 finalize, FSharpList`1 args, Int32 i)
   at Microsoft.FSharp.Core.PrintfImpl.run@521[b,c,d](FSharpFunc`2 initialize, String fmt, Int32 len, FSharpList`1 args)
```

`System.Exception: type not handled System.IComparable` はどういう意味でしょうか？これは、FsCheckがランダムなリストを生成しようとしていますが、要素が `IComparable` 型である必要があることしか理解していないために起こります。
`IComparable` はインスタンス化できる型ではありません。そのため、FsCheckはエラーを発生させてしまうのです。

これを防ぐにはどうすればよいでしょうか？解決策は、次のように、プロパティに `int list` などの特定の型を指定することです。

```fsharp
let ``adjacent pairs from a list should be ordered`` sortFn (aList:int list) = 
    let pairs = aList |> sortFn |> Seq.pairwise
    pairs |> Seq.forall (fun (x,y) -> x <= y )
```

これで、コードがちゃんと動くようになりました。

```fsharp
let goodSort = List.sort
Check.Quick (``adjacent pairs from a list should be ordered`` goodSort)
// OK、100個のテストに合格しました。
```

プロパティが制約されているにもかかわらず、プロパティは依然として非常に一般的なものであることに注意してください。例えば、代わりに `string list` を使用することもでき、同じように動作します。

```fsharp
let ``adjacent pairs from a string list should be ordered`` sortFn (aList:string list) = 
    let pairs = aList |> sortFn |> Seq.pairwise
    pairs |> Seq.forall (fun (x,y) -> x <= y )

Check.Quick (``adjacent pairs from a string list should be ordered`` goodSort)
// OK、100個のテストに合格しました。
```

**ヒント: FsCheckが「type not handled」をスローする場合は、プロパティに明示的な型制約を追加してください**

これで終わりでしょうか？いいえ！このプロパティの問題点の1つは、EDFHによる悪意のある実装を捕捉できないことです。

```fsharp
// 悪い実装がパスする
let badSort aList = []
Check.Quick (``adjacent pairs from a list should be ordered`` badSort)
// OK、100個のテストに合格しました。
```

馬鹿げた実装も動作することに驚きましたか？

うーん。これは、ソートに関連する*ペアワイズ順序以外の*プロパティが見落とされているに違いないということを示しています。何が欠けているのでしょうか？

これは、プロパティベースのテストを行うことで、設計に関する洞察が得られる良い例です。ソートの意味を理解していると思っていましたが、定義をもう少し厳密にする必要に迫られています。

実際には、次の原則を使うことで、この特定の問題を解決します。

## 「変わらないものもある」

有用な種類のプロパティは、長さや内容を保持するなど、何らかの変換後も保持される不変条件に基づいています。

それらは通常、それ自体では正しい実装を保証するのに十分ではありませんが、より一般的なプロパティに対するカウンターチェックとして機能することがよくあります。

例えば、[前回の投稿](../posts/property-based-testing.md)では、加算の可換性と結合性を表すプロパティを作成しましたが、単にゼロを返す実装でも同様に満たされてしまうことに気づきました。
`x + 0 = x` をプロパティとして追加して初めて、その特定の悪意のある実装を排除することができました。

そして、上記の「リストのソート」の例では、空のリストを返すだけの関数で「ペアワイズ順序」プロパティを満たすことができました。どうすれば修正できるでしょうか？

最初の試みとして、ソートされたリストの長さを確認することができます。長さが異なる場合、ソート関数は明らかに不正行為をしています。

```fsharp
let ``sort should have same length as original`` sortFn (aList:int list) = 
    let sorted = aList |> sortFn 
    List.length sorted = List.length aList
```

チェックしてみると、動作します。

```fsharp
let goodSort = List.sort
Check.Quick (``sort should have same length as original`` goodSort )
// OK、100個のテストに合格しました。
```

そして、確かに悪い実装は失敗します。

```fsharp
let badSort aList = []
Check.Quick (``sort should have same length as original`` badSort )
// 反証可能、1回のテスト（1回の縮小）後
// [0]
```

残念ながら、BDFHは敗北せず、別の準拠した実装を考え出すことができます。最初の要素をN回繰り返すだけです。

```fsharp
// 悪い実装は同じ長さを持つ
let badSort2 aList = 
    match aList with 
    | [] -> []
    | head::_ -> List.replicate (List.length aList) head 

// 例えば    
// badSort2 [1;2;3]  => [1;1;1]
```

これでこれをテストすると、合格します。

```fsharp
Check.Quick (``sort should have same length as original`` badSort2)
// OK、100個のテストに合格しました。
```

さらに、ペアワイズプロパティも満たしています。

```fsharp
Check.Quick (``adjacent pairs from a list should be ordered`` badSort2)
// OK、100個のテストに合格しました。
```

### ソートの不変条件 - 2回目の試み

では、もう一度試してみましょう。真の結果 `[1;2;3]` と偽の結果 `[1;1;1]` の違いは何でしょうか？

答え: 偽の結果はデータを捨てています。真の結果は常に元のリストと同じ内容を含んでいますが、順序が異なります。

![順列プロパティ](../assets/img/property_list_sort_permutation.png)

これは新しいプロパティにつながります。ソートされたリストは常に元のリストの順列です。なるほど！では、プロパティを順列で書いてみましょう。

```fsharp
let ``a sorted list is always a permutation of the original list`` sortFn (aList:int list) = 
    let sorted = aList |> sortFn 
    let permutationsOfOriginalList = permutations aList 

    // ソートされたリストは順列のシーケンスに含まれていなければならない
    permutationsOfOriginalList 
    |> Seq.exists (fun permutation -> permutation = sorted) 
```

いいですね。あとは順列関数だけです。

Stack Overflowに行って、~~盗んで~~[実装を借用して](https://stackoverflow.com/a/4610704/1136133)きましょう。以下になります。

```fsharp
/// aListと挿入するanElementが与えられた場合、
/// anElementがaListに挿入された、
/// 可能なすべてのリストを生成する
let rec insertElement anElement aList =
    // https://stackoverflow.com/a/4610704/1136133 より
    seq { 
        match aList with
        // 空の場合はシングルトンを返す
        | [] -> yield [anElement] 
        // 空でない場合？
        | first::rest ->
            // anElementをリストの先頭に追加して返す
            yield anElement::aList
            // また、すべてのサブリストの先頭にfirstを追加して返す
            for sublist in insertElement anElement rest do
                yield first::sublist
        }

/// リストが与えられた場合、そのすべての順列を返す
let rec permutations aList =
    seq { 
        match aList with
        | [] -> yield []
        | first::rest ->
            // 各サブ順列について、
            // firstをどこかに挿入して返す
            for sublist in permutations rest do
                yield! insertElement first sublist
        }
```

いくつかの簡単な対話型テストで、期待通りに動作することを確認します。

```fsharp
permutations ['a';'b';'c'] |> Seq.toList
//  [['a'; 'b'; 'c']; ['b'; 'a'; 'c']; ['b'; 'c'; 'a']; ['a'; 'c'; 'b'];
//  ['c'; 'a'; 'b']; ['c'; 'b'; 'a']]

permutations ['a';'b';'c';'d'] |> Seq.toList
//  [['a'; 'b'; 'c'; 'd']; ['b'; 'a'; 'c'; 'd']; ['b'; 'c'; 'a'; 'd'];
//   ['b'; 'c'; 'd'; 'a']; ['a'; 'c'; 'b'; 'd']; ['c'; 'a'; 'b'; 'd'];
//   ['c'; 'b'; 'a'; 'd']; ['c'; 'b'; 'd'; 'a']; ['a'; 'c'; 'd'; 'b'];
//   ['c'; 'a'; 'd'; 'b']; ['c'; 'd'; 'a'; 'b']; ['c'; 'd'; 'b'; 'a'];
//   ['a'; 'b'; 'd'; 'c']; ['b'; 'a'; 'd'; 'c']; ['b'; 'd'; 'a'; 'c'];
//   ['b'; 'd'; 'c'; 'a']; ['a'; 'd'; 'b'; 'c']; ['d'; 'a'; 'b'; 'c'];
//   ['d'; 'b'; 'a'; 'c']; ['d'; 'b'; 'c'; 'a']; ['a'; 'd'; 'c'; 'b'];
//   ['d'; 'a'; 'c'; 'b']; ['d'; 'c'; 'a'; 'b']; ['d'; 'c'; 'b'; 'a']]

permutations [3;3] |> Seq.toList
//  [[3; 3]; [3; 3]]
```

素晴らしい！では、FsCheckを実行してみましょう。

```fsharp
Check.Quick (``a sorted list is always a permutation of the original list`` goodSort)
```

うーん。おかしいですね。何も起こっていないようです。そして、なぜかCPUの使用率が最大になっています。何が起こっているのでしょうか？

何が起こっているかというと、あなたは長い間そこに座っていることになるということです。家で一緒にやっている場合は、今すぐ右クリックして対話型セッションをキャンセルすることをお勧めします。

一見無害に見える `permutations` は、通常のサイズのリストでは*本当に*遅いです。
例えば、わずか10個の項目のリストには3,628,800個の順列があります。20個の項目になると、天文学的な数字になります。

そしてもちろん、FsCheckは何百回もこれらのテストを行うことになります。そのため、重要なヒントがあります。

**ヒント: プロパティチェックが非常に高速であることを確認してください。何度も実行することになります。**

すでに見てきたように、最良の場合でも、FsCheckはプロパティを100回評価します。そして、縮小が必要な場合は、さらに多くなります。
そのため、テストの実行速度が速いことを確認してください。

しかし、データベース、ネットワーク、その他の低速な依存関係など、実際のシステムを扱っている場合はどうでしょうか？

[QuickCheckの使用に関するビデオ](https://vimeo.com/68383317)（強くお勧めします）の中で、John Hughesは、
彼のチームがネットワークのパーティションやノードの障害によって引き起こされる可能性のある、分散データストアの欠陥を検出しようとしていたときのことを語っています。

もちろん、実際のノードを何千回も強制終了するのは遅すぎるので、コアロジックを仮想モデルに抽出して、代わりにそれをテストしました。
その結果、この種のテストを容易にするために、コードは*後でリファクタリング*されました。つまり、プロパティベースのテストは、TDDと同様に、コードの設計に影響を与えたのです。


### ソートの不変条件 - 3回目の試み

わかりました。順列をループで処理することはできません。では、同じ考え方を使いますが、この場合に特化した関数、`isPermutationOf` 関数を記述しましょう。

```fsharp
let ``a sorted list has same contents as the original list`` sortFn (aList:int list) = 
    let sorted = aList |> sortFn 
    isPermutationOf aList sorted
```
    
`isPermutationOf` とその関連ヘルパー関数のコードは以下の通りです。

```fsharp
/// 要素とリスト、および以前にスキップされた他の要素が与えられた場合、
/// 指定された要素を含まない新しいリストを返す。
/// 見つからない場合は、Noneを返す
let rec withoutElementRec anElement aList skipped = 
    match aList with
    | [] -> None
    | head::tail when anElement = head -> 
        // 一致したので、スキップされたものと残りのものから新しいリストを作成し、
        // それを返す
        let skipped' = List.rev skipped
        Some (skipped' @ tail)
    | head::tail  -> 
        // 一致しないので、headをスキップされたものの先頭に追加して再帰する
        let skipped' = head :: skipped
        withoutElementRec anElement tail skipped' 

/// 要素とリストが与えられた場合、
/// 指定された要素を含まない新しいリストを返す。
/// 見つからない場合は、Noneを返す
let withoutElement x aList = 
    withoutElementRec x aList [] 

/// 2つのリストが与えられた場合、
/// 順序に関係なく同じ内容であればtrueを返す
let rec isPermutationOf list1 list2 = 
    match list1 with
    | [] -> List.isEmpty list2 // 両方とも空の場合はtrue
    | h1::t1 -> 
        match withoutElement h1 list2 with
        | None -> false
        | Some t2 -> 
            isPermutationOf t1 t2
```

もう一度テストしてみましょう。そして、今回は宇宙の熱的死の前に完了します。

```fsharp
Check.Quick (``a sorted list has same contents as the original list``  goodSort)
// OK、100個のテストに合格しました。
```

素晴らしいのは、悪意のある実装がこのプロパティを満たさなくなったことです。

```fsharp
Check.Quick (``a sorted list has same contents as the original list``  badSort2)
// 反証可能、2回のテスト（5回の縮小）後
// [1; 0]
```

実際、`adjacent pairs from a list should be ordered` と `a sorted list has same contents as the original list` という2つのプロパティがあれば、
*実装が正しいこと*を保証できます。

## 補足: プロパティの組み合わせ

上で、`ソート済み`プロパティを定義するには*2つ*のプロパティが必要であることに触れました。
単一のテストができるように、これらを1つのプロパティ `ソート済み` にまとめることができればよいのですが。

もちろん、2つのコードを1つの関数にマージすることはできますが、関数はできるだけ小さくしておくことが望ましいです。
さらに、`同じ内容を持つ`のようなプロパティは、他のコンテキストでも再利用できる可能性があります。

では、プロパティで動作するように設計された `AND` と `OR` に相当するものが必要になります。

FsCheckの出番です。プロパティを組み合わせるための組み込み演算子があります。`AND` の場合は `.&.`、`OR` の場合は `.|.` です。

使用例を以下に示します。

```fsharp
let ``list is sorted``sortFn (aList:int list) = 
    let prop1 = ``adjacent pairs from a list should be ordered`` sortFn aList 
    let prop2 = ``a sorted list has same contents as the original list`` sortFn aList 
    prop1 .&. prop2 
```

`sort` の適切な実装で結合されたプロパティをテストすると、すべてが期待通りに動作します。

```fsharp
let goodSort = List.sort
Check.Quick (``list is sorted`` goodSort )
// OK、100個のテストに合格しました。
```

そして、悪い実装をテストすると、結合されたプロパティも失敗します。

```fsharp
let badSort aList = []
Check.Quick (``list is sorted`` badSort )
// 反証可能、1回のテスト（0回の縮小）後
// [0]
```

しかし、ここで問題があります。2つのプロパティのどちらが失敗したのでしょうか？

そこで、各プロパティに「ラベル」を追加して、区別できるようにしたいところです。FsCheckでは、これは `|@` 演算子を使って行います。

```fsharp
let ``list is sorted (labelled)``sortFn (aList:int list) = 
    let prop1 = ``adjacent pairs from a list should be ordered`` sortFn aList 
                |@ "adjacent pairs from a list should be ordered"
    let prop2 = ``a sorted list has same contents as the original list`` sortFn aList 
                |@ "a sorted list has same contents as the original list"
    prop1 .&. prop2 
```

そして、悪いソートでテストすると、「Label of failing property: a sorted list has same contents as the original list」というメッセージが表示されます。

```fsharp
Check.Quick (``list is sorted (labelled)`` badSort )
//  反証可能、1回のテスト（2回の縮小）後
//  失敗したプロパティのラベル: a sorted list has same contents as the original list
//  [0]
```

これらの演算子の詳細については、[FsCheckのドキュメントの「And, Or and Labels」](https://fsharp.github.io/FsCheck/Properties.html)を参照してください。

それでは、プロパティを考案する戦略に戻りましょう。

## "小さな問題を解く"

再帰的なデータ構造や再帰的な問題を抱えている場合があります。このような場合、小さな部分に当てはまるプロパティを見つけることができます。

例えば、ソートの場合、次のようなことを言うことができます。

```text
リストがソートされているとは、次の場合です。
* 最初の要素が2番目の要素よりも小さい（または等しい）。
* 最初の要素の後の残りの要素もソートされている。
```

このロジックをコードで表現すると、次のようになります。

```fsharp
let rec ``First element is <= than second, and tail is also sorted`` sortFn (aList:int list) = 
    let sortedList = aList |> sortFn 
    match sortedList with
    | [] -> true
    | [first] -> true
    | [first;second] -> 
        first <= second
    | first::second::tail -> 
        first <= second &&
        let subList = second::tail 
        ``First element is <= than second, and tail is also sorted`` sortFn subList  
```

このプロパティは、実際のソート関数で満たされます。

```fsharp
let goodSort = List.sort
Check.Quick (``First element is <= than second, and tail is also sorted`` goodSort )
// OK、100個のテストに合格しました。
```

しかし、残念ながら、前の例と同様に、悪意のある実装も合格してしまいます。

```fsharp
let badSort aList = []
Check.Quick (``First element is <= than second, and tail is also sorted`` badSort )
// OK、100個のテストに合格しました。

let badSort2 aList = 
    match aList with 
    | [] -> []
    | head::_ -> List.replicate (List.length aList) head 

Check.Quick (``First element is <= than second, and tail is also sorted`` badSort2)
// OK、100個のテストに合格しました。
```

そのため、前と同様に、コードが正しいことを保証するためには、別のプロパティ（`同じ内容を持つ` 不変条件など）が必要です。

再帰的なデータ構造がある場合は、再帰的なプロパティを探してみてください。コツをつかめば、かなり明白で、簡単に手に入れることができます。

## EDFHは本当に問題なのか？

最後のいくつかの例では、些細な、しかし間違った実装が、良い実装と同じようにプロパティを満たすことがよくあることに触れました。

しかし、*本当に*これに時間を費やす必要があるのでしょうか？つまり、最初の要素を複製するだけのソートアルゴリズムを実際にリリースした場合、すぐに明らかになるのではないでしょうか？

確かに、本当に悪意のある実装が問題になる可能性は低いでしょう。
一方、プロパティベースのテストは*テスト*プロセスではなく、*設計*プロセス、つまりシステムが実際に何をしようとしているのかを明確にするのに役立つ手法と考えるべきです。
そして、設計の重要な側面が単純な実装だけで満たされている場合、見落としているものがあるのかもしれません。それを発見することで、設計がより明確になり、より堅牢になるでしょう。

## 「変われば変わるほど、元のままだ」

次のタイプのプロパティは「冪等性」です。冪等性とは、単に何かを2回行っても1回行った場合と同じ結果になることを意味します。
「座ってください」と言ってからもう一度「座ってください」と言っても、2回目の命令は何の効果もありません。

冪等性は、[信頼性の高いシステムに不可欠](https://queue.acm.org/detail.cfm?id=2187821)であり、
サービス指向およびメッセージベースのアーキテクチャの[重要な側面](https://web.archive.org/web/20170606080642/http://soapatterns.org/design_patterns/idempotent_capability)です。

これらの種類の現実世界のシステムを設計している場合は、要求とプロセスが冪等であることを保証する価値があります。

今はこれ以上詳しく説明しませんが、2つの簡単な例を見てみましょう。

まず、古い友人である `sort` は冪等ですが（安定性を無視）、`reverse` は明らかに冪等ではありません。

```fsharp
let ``sorting twice gives the same result as sorting once`` sortFn (aList:int list) =
    let sortedOnce = aList |> sortFn 
    let sortedTwice = aList |> sortFn |> sortFn 
    sortedOnce = sortedTwice

// テスト
let goodSort = List.sort
Check.Quick (``sorting twice gives the same result as sorting once`` goodSort )
// OK、100個のテストに合格しました。
```

一般に、あらゆる種類のクエリは冪等であるべきです。言い換えれば、[「質問をしても答えは変わらない」](https://en.wikipedia.org/wiki/Command%E2%80%93query_separation)べきです。

現実の世界では、そうではないかもしれません。データストアに対する単純なクエリを異なる時間に実行すると、異なる結果が得られる可能性があります。

簡単なデモを以下に示します。

まず、クエリごとに異なる結果を返す `NonIdempotentService` を作成します。

```fsharp
type NonIdempotentService() =
    let mutable data = 0
    member this.Get() = 
        data
    member this.Set value = 
        data <- value

let ``querying NonIdempotentService after update gives the same result`` value1 value2 =
    let service = NonIdempotentService()
    service.Set value1

    // 最初のGET
    let get1 = service.Get()

    // 別のタスクがデータストアを更新する
    service.Set value2

    // 最初の時と同じように2回目のGETを呼び出す
    let get2 = service.Get() 
    get1 = get2 
```

しかし、今テストしてみると、必要な冪等性プロパティを満たしていないことがわかります。

```fsharp
Check.Quick ``querying NonIdempotentService after update gives the same result``
// 反証可能、2回のテスト後
```

代わりに、各トランザクションにタイムスタンプを要求する（粗雑な） `IdempotentService` を作成できます。
この設計では、同じタイムスタンプを使用した複数のGETは、常に同じデータを取得します。

```fsharp
type IdempotentService() =
    let mutable data = Map.empty
    member this.GetAsOf (dt:DateTime) = 
        data |> Map.find dt
    member this.SetAsOf (dt:DateTime) value = 
        data <- data |> Map.add dt value

let ``querying IdempotentService after update gives the same result`` value1 value2 =
    let service = IdempotentService()
    let dt1 = DateTime.Now.AddMinutes(-1.0)
    service.SetAsOf dt1 value1

    // 最初のGET
    let get1 = service.GetAsOf dt1 

    // 別のタスクがデータストアを更新する
    let dt2 = DateTime.Now
    service.SetAsOf dt2 value2

    // 最初の時と同じように2回目のGETを呼び出す
    let get2 = service.GetAsOf dt1 
    get1 = get2 
```

そして、これは動作します。

```fsharp
Check.Quick ``querying IdempotentService after update gives the same result``
// OK、100個のテストに合格しました。
```

そのため、REST GETハンドラやデータベースクエリサービスを構築していて、冪等性を確保したい場合は、etag、「as-of」時間、日付範囲などの手法の使用を検討する必要があります。

これを行う方法のヒントが必要な場合は、[冪等性パターン](https://blog.jonathanoliver.com/idempotency-patterns/)を検索すると、いくつかの良い結果が得られます。

## "2つの頭脳は1つよりも優れている"

そして最後に、重要なことですが、「テストオラクル」について説明します。テストオラクルとは、単に正しい答えを与える代替実装であり、結果をチェックするために使用できます。

多くの場合、テストオラクルの実装は本番環境には適していません。
遅すぎたり、並列化できなかったり、[詩的すぎたり](https://xkcd.com/1026/)しますが、テストに非常に役立つことに変わりはありません。

「リストのソート」の場合、シンプルだが遅い実装が数多く存在します。例えば、挿入ソートの簡単な実装を以下に示します。

```fsharp
module InsertionSort = 
    
    // リストをループして、新しい要素をリストに挿入する。
    // より大きな要素が見つかったら、その前に挿入する
    let rec insert newElem list = 
        match list with 
        | head::tail when newElem > head -> 
            head :: insert newElem tail
        | other -> // 空のリストを含む
            newElem :: other 

    // リストの残りの部分をソートしてから、
    // 先頭をその中に挿入することでリストをソートする
    let rec sort list = 
        match list with
        | []   -> []
        | head::tail -> 
            insert head (sort tail)

    // テスト
    // insertionSort  [5;3;2;1;1]
```

これを用意したら、挿入ソートの結果と比較してテストするプロパティを書くことができます。

```fsharp
let ``sort should give same result as insertion sort`` sortFn (aList:int list) = 
    let sorted1 = aList |> sortFn 
    let sorted2 = aList |> InsertionSort.sort
    sorted1 = sorted2 
```

良いソートをテストすると、動作します。いいですね。

```fsharp
let goodSort = List.sort
Check.Quick (``sort should give same result as insertion sort`` goodSort)
// OK、100個のテストに合格しました。
```

そして、悪いソートをテストすると、動作しません。さらにいいですね。

```fsharp
let badSort aList = aList 
Check.Quick (``sort should give same result as insertion sort`` badSort)
// 反証可能、4回のテスト（6回の縮小）後
// [1; 0]
```

## 2つの異なる方法でローマ数字を生成する

また、*どちらの*実装が正しいかわからない場合に、2つの異なる実装をクロスチェックするために、テストオラクルアプローチを使用することもできます。

例えば、私の投稿「['ローマ数字Kataの解説付き解説'](../posts/roman-numeral-kata.md)」では、ローマ数字を生成するための2つの全く異なるアルゴリズムを考え出しました。
これらを互いに比較して、一挙に両方をテストすることはできるでしょうか？

最初のアルゴリズムは、ローマ数字がタリーに基づいていることを理解した上で、次のような単純なコードを作成しました。

```fsharp
let arabicToRomanUsingTallying arabic = 
   (String.replicate arabic "I")
    .Replace("IIIII","V")
    .Replace("VV","X")
    .Replace("XXXXX","L")
    .Replace("LL","C")
    .Replace("CCCCC","D")
    .Replace("DD","M")
    // オプションの置換
    .Replace("IIII","IV")
    .Replace("VIV","IX")
    .Replace("XXXX","XL")
    .Replace("LXL","XC")
    .Replace("CCCC","CD")
    .Replace("DCD","CM")
```

ローマ数字を考える別の方法は、そろばんを想像することです。各ワイヤーには4つの「ユニット」ビーズと1つの「ファイブ」ビーズがあります。

これは、いわゆる「バイナリ」アプローチにつながります。

```fsharp
let biQuinaryDigits place (unit,five,ten) arabic =
  let digit =  arabic % (10*place) / place
  match digit with
  | 0 -> ""
  | 1 -> unit
  | 2 -> unit + unit
  | 3 -> unit + unit + unit
  | 4 -> unit + five // 5より1つ少なくなるように変更
  | 5 -> five
  | 6 -> five + unit
  | 7 -> five + unit + unit
  | 8 -> five + unit + unit + unit
  | 9 -> unit + ten  // 10より1つ少なくなるように変更
  | _ -> failwith "Expected 0-9 only"

let arabicToRomanUsingBiQuinary arabic = 
  let units = biQuinaryDigits 1 ("I","V","X") arabic
  let tens = biQuinaryDigits 10 ("X","L","C") arabic
  let hundreds = biQuinaryDigits 100 ("C","D","M") arabic
  let thousands = biQuinaryDigits 1000 ("M","?","?") arabic
  thousands + hundreds + tens + units
```

これで、2つの全く異なるアルゴリズムができました。これらを互いにクロスチェックして、同じ結果が得られるかどうかを確認できます。

```fsharp
let ``biquinary should give same result as tallying`` arabic = 
    let tallyResult = arabicToRomanUsingTallying arabic 
    let biquinaryResult = arabicToRomanUsingBiQuinary arabic 
    tallyResult = biquinaryResult 
```

しかし、このコードを実行しようとすると、`String.replicate` の呼び出しにより、`ArgumentException: The input must be non-negative` が発生します。

```fsharp
Check.Quick ``biquinary should give same result as tallying``
// ArgumentException: The input must be non-negative.
```

そのため、正の入力のみを含める必要があります。また、アルゴリズムがそこで破綻するため、4000より大きい数値も除外する必要があります。

このフィルタはどのように実装すればよいでしょうか？

前回の投稿で、事前条件を使用できることを説明しました。しかし、この例では、別の方法を試して、ジェネレータを変更してみましょう。

まず、必要なようにフィルタリングされた*新しい*任意の整数 `arabicNumber` を定義します
（「任意」とは、前回の投稿で説明したように、ジェネレータアルゴリズムとシュリンカアルゴリズムの組み合わせです）。

```fsharp
let arabicNumber = Arb.Default.Int32() |> Arb.filter (fun i -> i > 0 && i <= 4000) 
```

次に、`Prop.forAll` ヘルパーを使用して、*「arabicNumber」のみを使用するように制約された*新しいプロパティを作成します。

このプロパティには、「arabicNumberのすべての値について、バイナリはタリーと同じ結果を返す」という、かなり巧妙な名前を付けます。

```fsharp
let ``for all values of arabicNumber biquinary should give same result as tallying`` = 
    Prop.forAll arabicNumber ``biquinary should give same result as tallying`` 
```

最後に、クロスチェックテストを実行できます。

```fsharp
Check.Quick ``for all values of arabicNumber biquinary should give same result as tallying``
// OK、100個のテストに合格しました。
```

これでOKです。どちらのアルゴリズムも正しく動作しているようです。

## 「モデルベース」テスト

後の投稿で詳しく説明する「モデルベース」テストは、テストオラクルのバリエーションです。

その仕組みは、テスト対象の（複雑な）システムと並行して、簡略化されたモデルを作成するというものです。

そして、テスト対象のシステムに何かを行うときは、
モデルにも同じ（ただし簡略化された）ことを行います。

最後に、モデルの状態とテスト対象のシステムの状態を比較します。同じであれば、完了です。そうでない場合は、SUTにバグがあるか、モデルが間違っているため、やり直す必要があります。

<a id="zendo"></a>

## 幕間: プロパティを見つけるゲーム

これで、さまざまなプロパティのカテゴリーの説明は終わりです。1分ほどで、もう一度すべてを説明します。しかし、その前に、幕間です。

プロパティを見つけようとするのが精神的な挑戦だと感じる場合は、あなただけではありません。ゲームだと思うと役に立つでしょうか？

実は、プロパティベースのテストに基づいたゲームがあります。

それは[Zendo](https://boardgamegeek.com/boardgame/6830/zendo)といいます。
テーブルの上にオブジェクトのセット（プラスチック製のピラミッドなど）を配置し、各レイアウトがパターン、つまりルール、または私たちが今言うように*プロパティ*に準拠するようにするというものです。

他のプレイヤーは、見えているものに基づいて、ルール（プロパティ）が何であるかを推測する必要があります。

進行中のZendoゲームの写真を以下に示します。

![Zendo](../assets/img/zendo1.png)

白い石はプロパティが満たされていることを意味し、黒い石は失敗を意味します。ここのルールがわかりますか？
「セットには地面に触れていない黄色のピラミッドがなければならない」のようなものだと思います。

なるほど、Zendoは実際にはプロパティベースのテストからインスピレーションを得たものではありませんが、
楽しいゲームであり、[プログラミングカンファレンス](https://thestrangeloop.com/sessions/zendo-%E2%80%93-the-scientific-method-in-a-box)に登場することさえあります。

Zendoについてもっと知りたい場合は、[ルールはこちら](https://www.looneylabs.com/rules/zendo)です。

<a id="dollar"></a>

## カテゴリーをもう一度適用する

これらのカテゴリーをすべて念頭に置いて、別の問題の例を見て、プロパティを見つけられるかどうかを確認しましょう。

このサンプルは、Kent Beckの著書「テスト駆動開発入門」で説明されている、よく知られた `Dollar` の例に基づいています。

[*Growing Object-Oriented Software Guided by Tests*](http://www.growing-object-oriented-software.com/) で有名なNat Pryceは、
しばらく前にプロパティベースのテストに関するブログ記事（[「QuickCheckを使ったテスト駆動開発の探求」](http://www.natpryce.co/articles/000795.html)）を書きました。

その中で彼は、プロパティベースのテストが実際に役立つことについて、いくつかの不満を表明しました。そこで、彼が参照した例を再検討し、私たちに何ができるかを見てみましょう。

設計自体を批判して、より型駆動型にすることはしません。[他の人がそれをやっています](https://spin.atomicobject.com/typed-language-tdd-part2/)。
代わりに、設計をそのまま受け入れて、どのようなプロパティを考え出すことができるかを見てみましょう。

では、何があるのでしょうか？

* `Amount` を格納する `Dollar` クラス。
* 明らかな方法で金額を変換するメソッド `Add` と `Times`。

```fsharp
// メンバーを持つOOスタイルのクラス
type Dollar(amount:int) =
    member val Amount  = amount with get, set
    member this.Add add = 
        this.Amount <- this.Amount + add
    member this.Times multiplier  = 
        this.Amount <- this.Amount * multiplier  
    static member Create amount  = 
        Dollar amount  
```

では、まず対話型で試して、期待通りに動作することを確認しましょう。

```fsharp
let d = Dollar.Create 2
d.Amount  // 2
d.Times 3 
d.Amount  // 6
d.Add 1
d.Amount  // 7
```

しかし、これは単なる遊びであり、本当のテストではありません。では、どのようなプロパティを考え出すことができるでしょうか？

もう一度すべてを検討してみましょう。

* 同じ結果に至る異なるパス
* 逆演算
* 不変条件
* 冪等性
* 構造帰納法
* 検証が容易
* テストオラクル

今のところ、「異なるパス」は飛ばしましょう。逆演算はどうでしょうか？使用できる逆演算はありますか？

はい、セッターとゲッターは、プロパティを作成できる逆演算を形成します。

```fsharp
let ``set then get should give same result`` value = 
    let obj = Dollar.Create 0
    obj.Amount <- value
    let newValue = obj.Amount
    value = newValue 

Check.Quick ``set then get should give same result`` 
// OK、100個のテストに合格しました。
```

冪等性も関係があります。例えば、2回連続でセットを行うことは、1回だけ行うことと同じです。
そのためのプロパティを以下に示します。

```fsharp
let ``set amount is idempotent`` value = 
    let obj = Dollar.Create 0
    obj.Amount <- value
    let afterFirstSet = obj.Amount
    obj.Amount <- value
    let afterSecondSet = obj.Amount
    afterFirstSet = afterSecondSet 

Check.Quick ``set amount is idempotent`` 
// OK、100個のテストに合格しました。
```

「構造帰納法」のプロパティはありますか？ いいえ、このケースには関係ありません。

「検証が容易」なプロパティはありますか？ 明らかなものはありません。
 
最後に、テストオラクルはありますか？ いいえ。これも関係ありませんが、実際に複雑な通貨管理システムを設計している場合は、
サードパーティシステムと結果をクロスチェックすると非常に役立つ可能性があります。

### 不変のDollarのプロパティ

告白します！上記のコードでは少しズルをして、可変クラスを作成しました。これは、ほとんどのOOオブジェクトが設計される方法です。

しかし、「テスト駆動開発入門」では、Kentはすぐにその問題に気づき、不変クラスに変更しているので、私も同じことをしましょう。

不変バージョンは以下の通りです。

```fsharp
type Dollar(amount:int) =
    member val Amount  = amount 
    member this.Add add = 
        Dollar (amount + add)
    member this.Times multiplier  = 
        Dollar (amount * multiplier)
    static member Create amount  = 
        Dollar amount  
    
// 対話型テスト
let d1 = Dollar.Create 2
d1.Amount  // 2
let d2 = d1.Times 3 
d2.Amount  // 6
let d3 = d2.Add 1
d3.Amount  // 7
```

不変コードの良い点は、セッターのテストの必要性をなくせることです。そのため、作成した2つのプロパティは無関係になりました。

正直言って、どちらにしてもかなり些細なことだったので、大した損失ではありません。

では、今度はどのような新しいプロパティを考案できるでしょうか？

`Times` メソッドを見てみましょう。どのようにテストすればよいでしょうか？どの戦略を使用できるでしょうか？

「同じ結果に至る異なるパス」が非常に適用できると思います。「ソート」で行ったのと同じように、「内側」と「外側」の両方でtimes演算を行い、同じ結果が得られるかどうかを確認できます。

![Dollar times](../assets/img/property_dollar_times.png)

このプロパティをコードで表現すると、次のようになります。

```fsharp
let ``create then times should be same as times then create`` start multiplier = 
    let d0 = Dollar.Create start
    let d1 = d0.Times(multiplier)
    let d2 = Dollar.Create (start * multiplier)     
    d1 = d2
```

素晴らしい！動作するかどうか見てみましょう。

```fsharp
Check.Quick ``create then times should be same as times then create``
// 反証可能、1回のテスト後
```

おっと、動作しません。

なぜでしょうか？ `Dollar` が参照型であり、デフォルトでは等価比較されないことを忘れていたからです。

この間違いの結果、見落としていたかもしれないプロパティを発見しました。
忘れないうちに、それをコード化しましょう。

```fsharp
let ``dollars with same amount must be equal`` amount = 
    let d1 = Dollar.Create amount 
    let d2 = Dollar.Create amount 
    d1 = d2

Check.Quick ``dollars with same amount must be equal`` 
// 反証可能、1回のテスト後
```

そこで、`IEquatable` などをサポートすることで、これを修正する必要があります。

よろしければ、そうしてください。私はF#のレコード型に切り替えて、等価性を無料で手に入れます。

### Dollarプロパティ - バージョン3

`Dollar` を書き直したものがこちらです。

```fsharp
type Dollar = {amount:int } 
    with 
    member this.Add add = 
        {amount = this.amount + add }
    member this.Times multiplier  = 
        {amount = this.amount * multiplier }
    static member Create amount  = 
        {amount=amount}
```

そして、2つのプロパティが満たされました。

```fsharp
Check.Quick ``dollars with same amount must be equal`` 
// OK、100個のテストに合格しました。

Check.Quick ``create then times should be same as times then create``
// OK、100個のテストに合格しました。
```

このアプローチを異なるパスに拡張できます。例えば、次のように、金額を抽出して直接比較できます。

![Dollar times](../assets/img/property_dollar_times2.png)

コードは以下のようになります。

```fsharp
let ``create then times then get should be same as times`` start multiplier = 
    let d0 = Dollar.Create start
    let d1 = d0.Times(multiplier)
    let a1 = d1.amount
    let a2 = start * multiplier     
    a1 = a2

Check.Quick ``create then times then get should be same as times``
// OK、100個のテストに合格しました。
```

また、`Add` もミックスに含めることができます。

例えば、次のように、2つの異なるパスで `Times` の後に `Add` を実行できます。

![Dollar times](../assets/img/property_dollar_times3.png)

コードは以下の通りです。

```fsharp
let ``create then times then add should be same as times then add then create`` start multiplier adder = 
    let d0 = Dollar.Create start
    let d1 = d0.Times(multiplier)
    let d2 = d1.Add(adder)
    let directAmount = (start * multiplier) + adder
    let d3 = Dollar.Create directAmount 
    d2 = d3

Check.Quick ``create then times then add should be same as times then add then create`` 
// OK、100個のテストに合格しました。
```

このように、「異なるパス、同じ結果」アプローチは非常に実り多く、この方法で*多くの*パスを生成できます。

### Dollarプロパティ - バージョン4

では、これで終わりにしましょうか？私はそうは思いません。

コードの臭いがし始めています。この `(start * multiplier) + adder` コードは、ロジックが重複しているように見え、脆くなる可能性があります。

これらのケースすべてに共通する部分を抽象化することはできるでしょうか？

考えてみると、ロジックは*実際には*次のとおりです。

* 金額を「内側」で何らかの方法で変換する。
* 金額を「外側」で同じ方法で変換する。
* 結果が同じであることを確認する。

しかし、これをテストするには、`Dollar` クラスが任意の変換をサポートする必要があります。それを `Map` と呼ぶことにしましょう。

これで、すべてのテストを次の1つのプロパティに減らすことができます。

![Dollar map](../assets/img/property_dollar_map.png)

`Dollar` に `Map` メソッドを追加しましょう。また、`Times` と `Add` を `Map` で書き直すこともできます。

```fsharp
type Dollar = {amount:int } 
    with 
    member this.Map f = 
        {amount = f this.amount}
    member this.Times multiplier = 
        this.Map (fun a -> a * multiplier)
    member this.Add adder = 
        this.Map (fun a -> a + adder)
    static member Create amount  = 
        {amount=amount}
```

これで、プロパティのコードは以下のようになります。

```fsharp
let ``create then map should be same as map then create`` start f = 
    let d0 = Dollar.Create start
    let d1 = d0.Map f  
    let d2 = Dollar.Create (f start)     
    d1 = d2
```

しかし、どうやってテストすればいいのでしょうか？どのような関数を渡せばいいのでしょうか？

心配しないでください。FsCheckが対応しています。このような場合、FsCheckは実際にランダムな関数を生成してくれます。

試してみてください。動作します。

```fsharp
Check.Quick ``create then map should be same as map then create`` 
// OK、100個のテストに合格しました。
```

新しい「map」プロパティは、「times」を使用した元のプロパティよりもはるかに一般的であるため、後者を安全に削除できます。

### 関数パラメータのログ出力

現状のプロパティにはちょっとした問題があります。FsCheckが生成している関数が何であるかを確認したい場合、Verboseモードは役に立ちません。

```fsharp
Check.Verbose ``create then map should be same as map then create`` 
```

出力は以下のようになります。

```text
0:
18
<fun:Invoke@3000>
1:
7
<fun:Invoke@3000>
-- etc
98:
47
<fun:Invoke@3000>
99:
36
<fun:Invoke@3000>
OK、100個のテストに合格しました。
```

関数の値が実際には何であったのかわかりません。

しかし、次のように、関数を特別な `F` ケースでラップすることで、FsCheckにさらに役立つ情報を表示するように指示できます。

```fsharp
let ``create then map should be same as map then create2`` start (F (_,f)) = 
    let d0 = Dollar.Create start
    let d1 = d0.Map f  
    let d2 = Dollar.Create (f start)     
    d1 = d2
```

そして、Verboseモードを使用すると...

```fsharp
Check.Verbose ``create then map should be same as map then create2`` 
```

...使用された各関数の詳細なログが表示されます。

```text
0:
0
{ 0->1 }
1:
0
{ 0->0 }
2:
2
{ 2->-2 }
-- etc
98:
-5
{ -5->-52 }
99:
10
{ 10->28 }
OK、100個のテストに合格しました。
```

各 `{ 2->-2 }`、`{ 10->28 }` などは、その反復で使用された関数を表しています。

＠  tdd-vs-pbt

## TDDとプロパティベースのテスト

プロパティベースのテスト（PBT）はTDDとどのように適合するのでしょうか？これはよくある質問なので、私の考えを簡単に説明しましょう。

まず、TDDは*具体的な例*を扱いますが、PBTは*普遍的なプロパティ*を扱います。

前回の投稿で述べたように、例は設計への入り口として有用であり、ドキュメントの一種になり得ると考えています。
しかし、私の意見では、例に基づいたテスト*だけ*に頼るのは間違いです。

プロパティベースのアプローチは、例に基づいたテストに比べて、次のような多くの利点があります。

* プロパティベースのテストはより一般的であるため、脆さが軽減されます。
* プロパティベースのテストは、一連の例よりも、要件をより適切かつ簡潔に記述します。
* その結果、1つのプロパティベースのテストで、多くの例に基づいたテストを置き換えることができます。
* ランダムな入力を生成することで、プロパティベースのテストは、nullの処理、データの欠落、ゼロ除算、負の数など、見落としていた問題を明らかにすることがよくあります。
* プロパティベースのテストは、あなたに考えさせます。
* プロパティベースのテストは、あなたにクリーンな設計を強制します。

最後の2つのポイントが、私にとって最も重要です。プログラミングとは、コードを書くことではなく、要件を満たす設計を作成することです。

そのため、要件と何がうまくいかないかについて深く考えるのに役立つものはすべて、あなたの個人的なツールボックスの重要なツールになるはずです。

例えば、ローマ数字のセクションでは、`int` を受け入れるのは悪い考えであること（コードが壊れる！）がわかりました。
とりあえず修正しましたが、実際にはドメインで `PositiveInteger` の概念をモデル化し、コードを単なる `int` ではなく、その型を使用するように変更する必要があります。
これは、PBTを使用することで、バグを見つけるだけでなく、ドメインモデルを実際に改善できることを示しています。

同様に、Dollarのシナリオで `Map` メソッドを導入したことで、テストが容易になっただけでなく、Dollarの「API」の有用性が実際に改善されました。

しかし、全体像に目を向けると、TDDとプロパティベースのテストは全く対立していません。
どちらも正しいプログラムを構築するという同じ目標を共有しており、どちらも実際にはコーディングよりも設計に関するものです（「テスト駆動*開発*」ではなく「テスト駆動*設計*」と考えてください）。

## ついに終わり

これで、プロパティベースのテストに関する長い投稿は終わりです。

これで、独自のコードベースに持ち帰って適用できる、いくつかの有用なアプローチが得られたことを願っています。

次回は、実際の例と、ドメインに合ったカスタムジェネレータを作成する方法について説明します。


*この投稿で使用されているコードサンプルは、[GitHubで入手できます](https://github.com/swlaschin/PropertyBasedTesting/blob/master/part2.fsx)*。