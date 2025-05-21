---
layout: post
title: "プロパティベースのテスト入門"
description: "または、FsCheckとQuickCheckを使うべき理由"
categories: ["TDD"]
---

> この記事は[F# Advent Calendar in English 2014](https://sergeytihon.wordpress.com/2014/11/24/f-advent-calendar-in-english-2014/) の一部です。
> 他の素晴らしい記事もぜひご覧ください！ また、企画してくれたSergey Tihonに感謝します。

*更新：これらの記事に基づいて、プロパティベースのテストに関する講演を行いました。[スライドとビデオはこちら](https://fsharpforfunandprofit.com/pbt/)*

こんなやり取りは、できればしたくありません。

```text
私「2つの数字を足し合わせる関数が必要なんだけど、実装してくれる？」
（少し後）
同僚「'add'関数の実装が終わったよ」
私「いいね。単体テストは書いた？」
同僚「テストも必要なの？」（目を回す）「わかったよ」
（少し後）
同僚「テストを書いたよ。見て！ '1 + 2を入力したら、出力は3になるはず'」
同僚「これで完了でいいよね？」
私「それは1つのテストでしかないよ。他の入力で失敗しないってどうしてわかるの？」
同僚「わかった、もう1つやってみるよ」
（少し後）
同僚「すごいテストをもう1つ書いたよ。'2 + 2を入力したら、出力は4になるはず'。これでどう？」
私「でも、まだ特別な場合しかテストしてないよ。考えつかなかった他の入力で失敗しないってどうしてわかるの？」
同僚「もっとテストが必要なの？」
（「鬼だ」とつぶやいて立ち去る）
```

冗談はさておき、想像上の同僚の不満には一理あります。**テストはいくつ書けば十分なのでしょうか？**

今度は、開発者ではなく、「add」関数が正しく実装されているかをテストするテストエンジニアだと想像してみてください。

あいにく、実装を担当しているのは、やる気をなくしていて、いつも怠けていて、しばしば悪意のあるプログラマーです。
このプログラマーを*最悪なエンタープライズ開発者(The Enterprise Developer From Hell)*、略して「EDFH」と呼ぶことにします
（EDFHには[従兄弟がいます](https://en.wikipedia.org/wiki/Bastard_Operator_From_Hell)。もしかしたら聞いたことがあるかもしれません）。

あなたは、テスト駆動開発をエンタープライズスタイルで実践しています。つまり、テストを書いてから、EDFHがテストに合格するコードを実装します。
 
まずは、（普通のNUnitスタイルを使って）次のようなテストを書いてみましょう。

```fsharp
[<Test>]
let ``1 + 2 は 3 になるはずだ``()=
    let result = add 1 2
    Assert.AreEqual(3,result)
```

EDFHは、次のように`add`関数を実装します。

```fsharp
let add x y =
    if x=1 && y=2 then 
        3
    else
        0    
```

そして、テストはパスします！

EDFHに文句を言うと、彼らはTDDを正しく行っており、[テストに合格する最小限のコードしか書いていない](https://www.typemock.com/general-unit-testing-page-page4/)と言うのです。

なるほど。そこで、別のテストを書きます。

```fsharp
[<Test>]
let ``2 + 2 は 4 になるはずだ``()=
    let result = add 2 2
    Assert.AreEqual(4,result)
```

EDFHは、`add`関数の実装を次のように変更します。

```fsharp
let add x y =
    if x=1 && y=2 then 
        3
    else if x=2 && y=2 then 
        4
    else
        0    
```

再びEDFHに文句を言うと、このアプローチは実際にはベストプラクティスであると指摘してきます。どうやらこれは「[変換優先原則](https://blog.cleancoder.com/uncle-bob/2013/05/27/TheTransformationPriorityPremise.html)」と呼ばれているようです。

この時点で、EDFHが悪意を持っているのではないかと考え始め、このやり取りが永遠に続くのではないかと不安になります！

## 悪意のあるプログラマーに打ち勝つ

そこで問題です。悪意のあるプログラマーがどんなに頑張っても、間違った実装を作成できないようなテストをどのように書けばよいのでしょうか？

そうですね、既知の結果をもっとたくさんリストアップして、少し混ぜ合わせてみましょう。

```fsharp
[<Test>]
let ``2つの数字を足すと、その合計になるはずだ``()=
    for (x,y,expected) in [ (1,2,3); (2,2,4); (3,5,8); (27,15,42); ]
        let actual = add x y
        Assert.AreEqual(expected,actual)
```

しかし、EDFHは疲れを知らず、これらのケースもすべて含むように実装を更新してしまいます。

もっと良い方法は、乱数を生成して入力に使うことです。そうすれば、悪意のあるプログラマーは事前に何をするべきかを知ることはできません。

```fsharp
let rand = System.Random()
let randInt() = rand.Next()

[<Test>]
let ``2つの乱数を足すと、その合計になるはずだ``()=
    let x = randInt()
    let y = randInt()
    let expected = x + y
    let actual = add x y
    Assert.AreEqual(expected,actual)
```


テストがこのように書かれていれば、EDFHは`add`関数を正しく実装せざるを得なくなります！

最後の改良点は、EDFHがたまたまうまくいく数字を選んでしまうかもしれないので、乱数テストを何回か、たとえば100回繰り返してみましょう。

```fsharp
[<Test>]
let ``100回とも、2つの乱数を足すと、その合計になるはずだ``()=
    for _ in [1..100] do
        let x = randInt()
        let y = randInt()
        let expected = x + y
        let actual = add x y
        Assert.AreEqual(expected,actual)
```


これで完了です！

本当にそうでしょうか？
    
## プロパティベースのテスト

1つだけ問題があります。`add`関数をテストするために、`+`関数を使っています。つまり、ある実装を使って別のものをテストしているのです。

場合によっては許容されますが（後の記事の「テストオラクル」の使用を参照）、一般的に、テスト対象のコードをテストで複製するのは悪い考えです！
時間と労力の無駄であり、2つの実装を構築して最新の状態に保つ必要が出てきます。

では、`+`を使わずにテストできない場合、どのようにテストすればよいのでしょうか？

答えは、関数の*プロパティ（特性）*、つまり「要件」に焦点を当てたテストを作成することです。
これらのプロパティは、*どんな*正しい実装でも当てはまるものでなければなりません。

では、`add`関数のプロパティについて考えてみましょう。

まず、`add`関数が他の類似関数とどう違うのかを考えてみましょう。

たとえば、`add`と`subtract`の違いは何でしょうか？ `subtract`ではパラメーターの順序が重要ですが、`add`では重要ではありません。

そのことはプロパティとして良さそうです。加算自体に依存しませんが、間違った実装はまとめて除外してくれます。

```fsharp
[<Test>]
let ``2つの数字を足した結果は、パラメーターの順序に依存しないはずだ``()=
    for _ in [1..100] do
        let x = randInt()
        let y = randInt()
        let result1 = add x y
        let result2 = add y x // パラメーターを逆にする
        Assert.AreEqual(result1,result2)
```

良いスタートですが、これではEDFHを止めることはできません。EDFHは`x * y`を使って`add`を実装することもでき、このテストはパスしてしまいます。

では、`add`と`multiply`の違いはどうでしょうか？ 加算とは実際にはどういう意味でしょうか？

たとえば、`x + x` は `x * 2` と同じになるはず、というようなテストをまず書いてみましょうか。

```fsharp
let result1 = add x x   
let result2 = x * 2     
Assert.AreEqual(result1,result2)
```

でも、これだと乗算の存在を前提としてしまいますね！ `add` だけで定義できるプロパティって、作れるのでしょうか？

1つの有効な方法は、関数を複数回繰り返すとどうなるかを見てみることです。 `add` した結果に、さらに `add` するとどうなるでしょう？

そこから、「`add 1` を2回行う」のと「`add 2` を1回行う」のは同じ、という考えが導き出せます。テストはこんな感じです。

```fsharp
[<Test>]
let ``1 を 2 回足すのは、2 を 1 回足すのと同じだ``()=
    for _ in [1..100] do
        let x = randInt()
        let y = randInt()
        let result1 = x |> add 1 |> add 1
        let result2 = x |> add 2 
        Assert.AreEqual(result1,result2)
```

素晴らしいですね！ `add` はこのテストで完璧に動作しますが、 `multiply` は動作しません。

ただし、EDFHは `y - x` を使って `add` を実装することもできてしまい、このテストもパスしてしまう可能性があることに注意してください。

幸いなことに、先ほど「パラメーターの順序」テストも作成しました。
2つのテストを組み合わせれば、正しい実装に絞り込めるはずです。きっと。

このテストスイートを提出した後、EDFHが両方のテストに合格する実装を書いたことが判明しました。見てみましょう。

```fsharp
let add x y = 0  // 悪意のある実装
```

うあー！ どうして？ どこで間違えたのでしょうか？

実は、生成した乱数を実際に使うように実装を強制することを忘れていました！

実装が、渡されたパラメーターを使って実際に何かをするようにする必要があります。
結果が入力と特定の方法でちゃんと繋がっていることを確認しなければなりません。

独自のバージョンを再実装せずに答えがわかるような、`add`の単純なプロパティは、何かないでしょうか？

あります！

ある数にゼロを足すとどうなるでしょう？ 常に同じ数が返ってきます。

```fsharp
[<Test>]
let ``0 を足しても何も変わらない``()=
    for _ in [1..100] do
        let x = randInt()
        let result1 = x |> add 0
        let result2 = x  
        Assert.AreEqual(result1,result2)
```

これで、どんな`add`の実装でもテストできるプロパティのセットができました。EDFHは正しい実装を作成せざるを得なくなります。

## 共通コードのリファクタリング

これらの3つのテストには、重複したコードがかなりありますね。リファクタリングしましょう。

まず、100組のランダムな整数を生成する処理を行う`propertyCheck`という関数を記述します。

`propertyCheck`は、プロパティ自体のパラメーターも必要です。これは、2つの整数を受け取り、ブール値を返す関数になります。

```fsharp
let propertyCheck property = 
    // property の型は int -> int -> bool
    for _ in [1..100] do
        let x = randInt()
        let y = randInt()
        let result = property x y
        Assert.IsTrue(result)
```

これで、プロパティを別の関数に抜き出すことで、テストの1つを次のように再定義できます。

```fsharp
let commutativeProperty x y = 
    let result1 = add x y
    let result2 = add y x // パラメーターを逆にする
    result1 = result2

[<Test>]
let ``2つの数字を足した結果は、パラメーターの順序に依存しないはずだ``()=
    propertyCheck commutativeProperty 
```

他の2つのプロパティについても、同じことができます。

リファクタリング後、完全なコードは次のようになります。

```fsharp
let rand = System.Random()
let randInt() = rand.Next()

let add x y = x + y  // 正しい実装

let propertyCheck property = 
    // property の型は int -> int -> bool
    for _ in [1..100] do
        let x = randInt()
        let y = randInt()
        let result = property x y
        Assert.IsTrue(result)

let commutativeProperty x y = 
    let result1 = add x y
    let result2 = add y x // パラメーターを逆にする
    result1 = result2

[<Test>]
let ``2つの数字を足した結果は、パラメーターの順序に依存しないはずだ``()=
    propertyCheck commutativeProperty 

let adding1TwiceIsAdding2OnceProperty x _ = 
    let result1 = x |> add 1 |> add 1
    let result2 = x |> add 2 
    result1 = result2

[<Test>]
let ``1 を 2 回足すのは、2 を 1 回足すのと同じだ``()=
    propertyCheck adding1TwiceIsAdding2OnceProperty 

let identityProperty x _ = 
    let result1 = x |> add 0
    result1 = x

[<Test>]
let ``0 を足しても何も変わらない``()=
    propertyCheck identityProperty 
```


## ここまでのまとめ

ここまでで、どんな`add`の実装でも満たすべきプロパティのセットを定義しました。

* パラメーターの順序は関係ない（「交換法則」プロパティ）
* `add`を1で2回行うのは、`add`を2で1回行うのと同じ
* ゼロを足しても何も変わらない（「単位元」プロパティ）

これらのプロパティの良い点は、特別なマジックナンバーだけでなく、*すべての*入力で機能することです。しかし、もっと重要なのは、加算の本質を示していることです。

実際、このアプローチを論理的な結論まで持っていくと、これらのプロパティを持つものを*加算として定義する*ことができます。

これはまさに数学者が行っていることです。
[Wikipediaで加算を調べると](https://en.wikipedia.org/wiki/Addition#Properties)、交換法則、結合法則、単位元などによって完全に定義されていることがわかります。

私たちの実験では、「結合法則」の定義を見逃し、代わりに、より弱いプロパティ（`x+1+1 = x+2`）を作成したことに注意してください。
後で、EDFHがこのプロパティを満たす悪意のある実装を書くことができ、結合法則の方が優れていることを見ていきます。  

残念ながら、最初の試みでプロパティを完璧にするのは難しいですが、それでも、私たちが思いついた3つのプロパティを使うことで、実装が正しいという自信を深めることができました。
そして実際、私たちも何かを学びました。要件をより深く理解できたのです。

## プロパティによる仕様

このようなプロパティの集合は、*仕様*と考えることができます。

歴史的に、単体テストは、機能テストであると同時に、[一種の仕様としても使われてきました](https://en.wikipedia.org/wiki/Unit_testing#Documentation)。
しかし、「マジック」データを使ったテストの代わりにプロパティを使った仕様へのアプローチは、多くの場合、より短く、曖昧さが少ない代替手段だと思います。

数学的な種類の関数だけがこのように指定できると思うかもしれませんが、今後の記事では、このアプローチがWebサービスやデータベースのテストにもどのように使用できるかを見ていきます。

もちろん、すべてのビジネス要件をこのようなプロパティとして表現できるわけではなく、ソフトウェア開発の社会的側面を軽視してはいけません。
技術者ではない顧客と仕事をする場合は、[実例による仕様](https://en.wikipedia.org/wiki/Specification_by_example)やドメイン駆動設計が役立ちます。

また、これらのプロパティをすべて設計するのは大変な作業だと思うかもしれません。そして、それは正しいです！ それが一番難しい部分です。
フォローアップ記事では、労力をいくらか軽減できる可能性のあるプロパティを考え出すためのヒントを紹介します。 

しかし、事前に追加の労力をかけても（ちなみに、この活動の専門用語は「問題について考える」といいます）、
自動テストと明確な仕様を持つことで節約できる全体的な時間は、後から先行コストを補って余りあるものになります。

実際、単体テストの利点を促進するために使用される議論は、プロパティベースのテストにも同様に適用できます！
そのため、TDDのファンがプロパティベースのテストを考え出す時間がないと言う場合は、全体像を見ていない可能性があります。

## QuickCheckとFsCheckの紹介

独自のプロパティチェックシステムを実装しましたが、いくつかの問題があります。

* 整数関数にしか使えません。
  文字列パラメーターを持つ関数、あるいは実際には、自分で定義したものも含めて、あらゆる型のパラメーターを持つ関数に、同じアプローチを使えると良いでしょう。
* 2つのパラメーターを持つ関数にしか使えません（`adding1TwiceIsAdding2OnceProperty`プロパティと`identity`プロパティでは、一方のパラメーターを無視しなければなりませんでした）。
  任意の数のパラメーターを持つ関数に、同じアプローチを使えると良いでしょう。
* プロパティに対する反例がある場合、それが何であるかわかりません！ テストが失敗したときに、あまり役に立ちません！
* 生成した乱数のログがなく、シードを設定する方法もないため、エラーを簡単にデバッグして再現することができません。
* 設定できません。たとえば、ループの回数を100から他の値に簡単に変更することができません。

これらすべてをやってくれるフレームワークがあれば良いのに！

ありがたいことに、あります！ 「[QuickCheck](https://en.wikipedia.org/wiki/QuickCheck)」ライブラリは、もともとKoen ClaessenとJohn HughesによってHaskell用に開発され、
その後、他の多くの言語に移植されました。

F#（そしてC#）で使われているQuickCheckのバージョンは、Kurt Schelfthoutによって作られた素晴らしい「[FsCheck](https://fsharp.github.io/FsCheck/)」ライブラリです。
Haskell QuickCheckをベースにしていますが、NUnitやxUnitなどのテストフレームワークとの統合など、いくつかの優れた追加機能があります。

では、FsCheckが私たちの手作りのプロパティテストシステムと同じことをどのように行うかを見てみましょう。

## FsCheckを使って加算のプロパティをテストする

まず、FsCheckをインストールしてDLLを読み込む必要があります（FsCheckは少し扱いにくい場合があります。手順とトラブルシューティングについては、このページの下部を参照してください）。

スクリプトファイルの先頭は次のようになります。

```fsharp
System.IO.Directory.SetCurrentDirectory (__SOURCE_DIRECTORY__)
#I @"Packages\FsCheck.1.0.3\lib\net45"
//#I @"Packages\FsCheck.0.9.2.0\lib\net40-Client"  // VS2012の場合は古いバージョンを使う
#I @"Packages\NUnit.2.6.3\lib"
#r @"FsCheck.dll"
#r @"nunit.framework.dll"

open System
open FsCheck
open NUnit.Framework
```

FsCheckが読み込まれたら、`Check.Quick`を使って「プロパティ」関数を渡すことができます。ここでは、「プロパティ」関数はブール値を返す（任意のパラメーターを持つ）関数であるとだけ言っておきましょう。

```fsharp
let add x y = x + y  // 正しい実装

let commutativeProperty (x,y) = 
    let result1 = add x y
    let result2 = add y x // パラメーターを逆にする
    result1 = result2

// プロパティを対話的にチェック            
Check.Quick commutativeProperty 

let adding1TwiceIsAdding2OnceProperty x = 
    let result1 = x |> add 1 |> add 1
    let result2 = x |> add 2 
    result1 = result2

// プロパティを対話的にチェック            
Check.Quick adding1TwiceIsAdding2OnceProperty 

let identityProperty x = 
    let result1 = x |> add 0
    result1 = x

// プロパティを対話的にチェック            
Check.Quick identityProperty 
```

プロパティの1つを対話的にチェックすると、たとえば`Check.Quick commutativeProperty`を使うと、次のメッセージが表示されます。

```text
Ok, passed 100 tests.
```

## FsCheckを使って満たされないプロパティを見つける

`add`の悪意のある実装がある場合にどうなるかを見てみましょう。以下のコードでは、EDFHは`add`を乗算として実装しています！

この実装は交換法則のプロパティを*満たしますが*、`adding1TwiceIsAdding2OnceProperty`はどうでしょうか？

```fsharp
let add x y =
    x * y // 悪意のある実装

let adding1TwiceIsAdding2OnceProperty x = 
    let result1 = x |> add 1 |> add 1
    let result2 = x |> add 2 
    result1 = result2

// プロパティを対話的にチェック            
Check.Quick adding1TwiceIsAdding2OnceProperty 
```

FsCheckの結果は次のとおりです。

```text
Falsifiable, after 1 test (1 shrink) (StdGen (1657127138,295941511)):
1
```

これは、`adding1TwiceIsAdding2OnceProperty`への入力として`1`を使うと`false`になることを意味し、実際にそうなっていることが簡単にわかります。

## 悪意のあるEDFHの再来

ランダムテストを使うことで、悪意のある実装者にとって、作業は難しくなりました。今度は戦術を変える必要があります！

EDFHは、`adding1TwiceIsAdding2OnceProperty`でまだいくつかのマジックナンバー（つまり1と2）を使っていることに気づき、これを悪用する実装を作成することにしました。
低い入力値には正しい実装を、高い入力値には間違った実装を使います。

```fsharp
let add x y = 
    if (x < 10) || (y < 10) then
        x + y  // 低い値には正しい実装
    else
        x * y  // 高い値には間違った実装
```

なんてこった！ すべてのプロパティを再テストすると、今度はすべてパスしてしまいます！  

テストでマジックナンバーを使うと、こういうことになるんですね！

他に方法はないのでしょうか？ 数学者からヒントを得て、結合法則のプロパティテストを作成しましょう。

```fsharp
let associativeProperty x y z = 
    let result1 = add x (add y z)    // x + (y + z)
    let result2 = add (add x y) z    // (x + y) + z
    result1 = result2

// プロパティを対話的にチェック            
Check.Quick associativeProperty 
```

おや！ 反例が見つかりました。

```text
Falsifiable, after 38 tests (4 shrinks) (StdGen (127898154,295941554)):
8
2
10
```

これは、`(8+2)+10` は `8+(2+10)` と同じではないことを意味します。 

FsCheckはプロパティを壊す入力を見つけただけでなく、最小の例を見つけたことに注意してください。 
入力`8,2,9`はパスするのに、1つ大きくすると (`8,2,10`) 失敗することを知っています。 これはとても便利ですね！

## FsCheckのしくみ：ジェネレーター

実際にFsCheckを使ってみたので、ここで少し立ち止まって、そのしくみを見てみましょう。

FsCheckが行う最初のことは、ランダムな入力を生成することです。これは「生成」と呼ばれ、それぞれの型に関連付けられたジェネレーターがあります。

たとえば、サンプルデータのリストを生成するには、ジェネレーターと2つのパラメーター（リストの要素数と「サイズ」）を使います。
「サイズ」の正確な意味は、生成される型とコンテキストによって異なります。「サイズ」が使用されるものの例としては、整数の最大値、リストの長さ、ツリーの深さなどがあります。

整数を生成するコードの例を次に示します。

```fsharp
// 整数のジェネレーターを取得
let intGenerator = Arb.generate<int>

// 最大サイズ1の整数を3つ生成
Gen.sample 1 3 intGenerator    // 例：[0; 0; -1]

// 最大サイズ10の整数を3つ生成
Gen.sample 10 3 intGenerator   // 例：[-4; 8; 5]

// 最大サイズ100の整数を3つ生成
Gen.sample 100 3 intGenerator  // 例：[-37; 24; -62] 
```

この例では、整数は均一に生成されず、ゼロの周りに集中しています。
ちょっとしたコードで、これを自分で確認できます。

```fsharp
// 値が中心点の周りにどのように集中しているかを確認
intGenerator 
|> Gen.sample 10 1000 
|> Seq.groupBy id 
|> Seq.map (fun (k,v) -> (k,Seq.length v))
|> Seq.sortBy (fun (k,v) -> k)
|> Seq.toList 
```

結果は次のようになります。

```fsharp
[(-10, 3); (-9, 14); (-8, 18); (-7, 10); (-6, 27); (-5, 42); (-4, 49);
   (-3, 56); (-2, 76); (-1, 119); (0, 181); (1, 104); (2, 77); (3, 62);
   (4, 47); (5, 44); (6, 26); (7, 16); (8, 14); (9, 12); (10, 3)]
```

ほとんどの値が中央にあり（0は181回、1は104回生成されます）、外側の値はまれである（10は3回しか生成されません）ことがわかります。

より大きなサンプルでも繰り返すことができます。これは、[-30,30]の範囲で10000個の要素を生成します。

```fsharp
intGenerator 
|> Gen.sample 30 10000 
|> Seq.groupBy id 
|> Seq.map (fun (k,v) -> (k,Seq.length v))
|> Seq.sortBy (fun (k,v) -> k)
|> Seq.toList 
```

`Gen.sample`以外にも、たくさんのジェネレーター関数が用意されています（詳細なドキュメントは[こちら](https://fsharp.github.io/FsCheck/TestData.html)）。

## FsCheckのしくみ：あらゆる型の自動生成

ジェネレーターロジックの素晴らしい点は、複合値も自動的に生成してくれることです。

たとえば、3つの整数のタプルのジェネレーターは次のようになります。

```fsharp
let tupleGenerator = Arb.generate<int*int*int>

// 最大サイズ1のタプルを3つ生成
Gen.sample 1 3 tupleGenerator 
// 結果：[(0, 0, 0); (0, 0, 0); (0, 1, -1)]

// 最大サイズ10のタプルを3つ生成
Gen.sample 10 3 tupleGenerator 
// 結果：[(-6, -4, 1); (2, -2, 8); (1, -4, 5)]

// 最大サイズ100のタプルを3つ生成
Gen.sample 100 3 tupleGenerator 
// 結果：[(-2, -36, -51); (-5, 33, 29); (13, 22, -16)]
```


基本型のジェネレーターを作成したら、`option`型と`list`型のジェネレーターも作成できます。
`int option`型のジェネレーターの例を次に示します。

```fsharp
let intOptionGenerator = Arb.generate<int option>
// 最大サイズ5のint optionを10個生成
Gen.sample 5 10 intOptionGenerator 
// 結果：[Some 0; Some -1; Some 2; Some 0; Some 0; 
//           Some -4; null; Some 2; Some -2; Some 0]
```

`int list`型のジェネレーターの例を次に示します。

```fsharp
let intListGenerator = Arb.generate<int list>
// 最大サイズ5のint listを10個生成
Gen.sample 5 10 intListGenerator 
// 結果：[ []; []; [-4]; [0; 3; -1; 2]; [1]; 
//            [1]; []; [0; 1; -2]; []; [-1; -2]]
```

そしてもちろん、ランダムな文字列も生成できます！
    
```fsharp
let stringGenerator = Arb.generate<string>

// 最大サイズ1の文字列を3つ生成
Gen.sample 1 3 stringGenerator 
// 結果：[""; "!"; "I"]

// 最大サイズ10の文字列を3つ生成
Gen.sample 10 3 stringGenerator 
// 結果：[""; "eiX$a^"; "U%0Ika&r"]
```

ジェネレーターの最も優れた点は、ユーザー定義型でも動作することです！


```fsharp
type Color = Red | Green of int | Blue of bool

let colorGenerator = Arb.generate<Color>

// 最大サイズ50の色を10個生成
Gen.sample 50 10 colorGenerator 

// 結果：[Green -47; Red; Red; Red; Blue true; 
//           Green 2; Blue false; Red; Blue true; Green -12]
```

これは、別のユーザー定義型を含むユーザー定義レコード型を生成する例です。

```fsharp
type Point = {x:int; y:int; color: Color}

let pointGenerator = Arb.generate<Point>

// 最大サイズ50の点を10個生成
Gen.sample 50 10 pointGenerator 

(* 結果
[{x = -8; y = 12; color = Green -4;}; 
 {x = 28; y = -31; color = Green -6;}; 
 {x = 11; y = 27; color = Red;}; 
 {x = -2; y = -13; color = Red;};
 {x = 6; y = 12; color = Red;};
 // etc
*)
```

型の生成方法をより細かく制御する方法もありますが、それは別の記事で説明します。

## FsCheckのしくみ：縮小

最小の反例を作成することは、QuickCheckスタイルのテストの優れた点の1つです。

これはどのように行われるのでしょうか？

FsCheckが使用するプロセスには、2つの部分があります。

まず、小さいものから始めて大きくしていく、ランダムな入力のシーケンスを生成します。これは、上記で説明した「ジェネレーター」フェーズです。

いずれかの入力が原因でプロパティが失敗した場合、最初のパラメーターを「縮小」して、より小さい数を見つけようとします。
縮小の正確なプロセスは型によって異なります（オーバーライドすることもできます）が、数値の場合は、適切な方法で小さくなるとしましょう。

たとえば、`isSmallerThan80`という単純なプロパティがあるとします。

```fsharp
let isSmallerThan80 x = x < 80
```

乱数を生成した結果、プロパティが`100`で失敗することがわかり、より小さい数を試したいとします。`Arb.shrink`は、すべて100より小さい整数のシーケンスを生成します。
これらのそれぞれが、プロパティが再び失敗するまで、順番にプロパティで試されます。

```fsharp
isSmallerThan80 100 // falseなので、縮小を開始

Arb.shrink 100 |> Seq.toList 
//  [0; 50; 75; 88; 94; 97; 99]
```

リストの各要素について、別の失敗が見つかるまで、プロパティをテストします。

```fsharp
isSmallerThan80 0 // true
isSmallerThan80 50 // true
isSmallerThan80 75 // true
isSmallerThan80 88 // falseなので、再び縮小
```

プロパティは`88`で失敗したので、それを開始点として再び縮小します。

```fsharp
Arb.shrink 88 |> Seq.toList 
//  [0; 44; 66; 77; 83; 86; 87]
isSmallerThan80 0 // true
isSmallerThan80 44 // true
isSmallerThan80 66 // true
isSmallerThan80 77 // true
isSmallerThan80 83 // falseなので、再び縮小
```

今度はプロパティが`83`で失敗したので、それを開始点として再び縮小します。

```fsharp
Arb.shrink 83 |> Seq.toList 
//  [0; 42; 63; 73; 78; 81; 82]
// 最小の失敗は81なので、再び縮小
```

プロパティは`81`で失敗したので、それを開始点として再び縮小します。

```fsharp
Arb.shrink 81 |> Seq.toList 
//  [0; 41; 61; 71; 76; 79; 80]
// 最小の失敗は80
```

この時点以降、80の縮小は機能しません。これ以上小さい値は見つかりません。

この場合、FsCheckは`80`がプロパティの反例であり、4回の縮小が必要であったことを報告します。

ジェネレーターと同様に、FsCheckはほとんどすべての型に対して縮小シーケンスを生成します。


```fsharp
Arb.shrink (1,2,3) |> Seq.toList 
//  [(0, 2, 3); (1, 0, 3); (1, 1, 3); (1, 2, 0); (1, 2, 2)]

Arb.shrink "abcd" |> Seq.toList 
//  ["bcd"; "acd"; "abd"; "abc"; "abca"; "abcb"; "abcc"; "abad"; "abbd"; "aacd"]

Arb.shrink [1;2;3] |> Seq.toList 
//  [[2; 3]; [1; 3]; [1; 2]; [1; 2; 0]; [1; 2; 2]; [1; 0; 3]; [1; 1; 3]; [0; 2; 3]]
```

そして、ジェネレーターと同様に、必要に応じて縮小の動作をカスタマイズする方法があります。

## FsCheckの設定：テスト回数の変更

`isSmallerThan80`という単純なプロパティについて触れましたが、FsCheckがどのように処理するかを見てみましょう。

```fsharp
// テストする単純なプロパティ
let isSmallerThan80 x = x < 80

Check.Quick isSmallerThan80 
// 結果：Ok, passed 100 tests.
```

おやおや！ FsCheckは反例を見つけられませんでした！

この時点で、いくつかのことを試すことができます。まず、テストの回数を増やしてみましょう。

デフォルト（「Quick」）設定を変更することで、これを行います。`MaxTest`という設定できるフィールドがあります。デフォルトは100なので、1000に増やしてみましょう。

最後に、特定の設定を使うには、`Check.Quick(property)`ではなく`Check.One(config,property)`を使う必要があります。

```fsharp
let config = {
    Config.Quick with 
        MaxTest = 1000
    }
Check.One(config,isSmallerThan80 )
// 結果：Ok, passed 1000 tests.
```

あれ？ FsCheckは1000回のテストでも反例を見つけられませんでした！ もう一度、10000回のテストで試してみましょう。

```fsharp
let config = {
    Config.Quick with 
        MaxTest = 10000
    }
Check.One(config,isSmallerThan80 )
// 結果：Falsifiable, after 8660 tests (1 shrink) (StdGen (539845487,295941658)):
//         80
```

なるほど、ようやくうまくいきましたね。でも、なぜこんなにたくさんのテストが必要だったのでしょうか？

その答えは、`StartSize`と`EndSize`という他の設定にあります。

ジェネレーターは小さい数値から始めて、徐々に大きくしていくことを思い出してください。これは、`StartSize`と`EndSize`の設定によって制御されます。
デフォルトでは、`StartSize`は1、`EndSize`は100です。つまり、テストの最後には、ジェネレーターへの「サイズ」パラメーターは100になります。

しかし、見てきたように、サイズが100であっても、極端な値の数はほとんど生成されません。この場合、80より大きい数は生成されにくいということです。

そこで、`EndSize`をもっと大きくして、どうなるか見てみましょう！

```fsharp
let config = {
    Config.Quick with 
        EndSize = 1000
    }
Check.One(config,isSmallerThan80 )
// 結果：Falsifiable, after 21 tests (4 shrinks) (StdGen (1033193705,295941658)):
//         80
```

これならいいですね！ 8660回ではなく、わずか21回のテストで済みました！

## FsCheckの設定：詳細モードとロギング

FsCheckの自作ソリューションに対する利点の1つは、ロギングと再現性であると述べましたが、それを見てみましょう。

悪意のある実装を調整して、境界を`25`にします。FsCheckがロギングによってこの境界をどのように検出するかを見てみましょう。

```fsharp
let add x y = 
    if (x < 25) || (y < 25) then
        x + y  // 低い値には正しい実装
    else
        x * y  // 高い値には間違った実装

let associativeProperty x y z = 
    let result1 = add x (add y z)    // x + (y + z)
    let result2 = add (add x y) z    // (x + y) + z
    result1 = result2

// プロパティを対話的にチェック            
Check.Quick associativeProperty 
```

結果は次のとおりです。

```text
Falsifiable, after 66 tests (12 shrinks) (StdGen (1706196961,295941556)):
1
24
25
```

ここでも、FsCheckは`25`が正確な境界点であることを非常に迅速に見つけました。しかし、どのようにして見つけたのでしょうか？

まず、FsCheckが何をしているかを確認する最も簡単な方法は、「詳細」モードを使用することです。つまり、`Check.Quick`ではなく`Check.Verbose`を使用します。

```fsharp
// プロパティを対話的にチェック            
Check.Quick associativeProperty 

// トレース/ロギングあり
Check.Verbose associativeProperty 
```

このようにすると、以下に示すような出力が表示されます。さまざまな要素を説明するために、すべてのコメントを追加しました。

```text
0:    // テスト 1
-1    // パラメーター 1
-1    // パラメーター 2 
0     // パラメーター 3 
      // associativeProperty -1 -1 0  => true、続行
1:    // テスト 2
0
0
0     // associativeProperty 0 0 0  => true、続行
2:    // テスト 3
-2
0
-3    // associativeProperty -2 0 -3  => true、続行
3:    // テスト 4
1
2
0     // associativeProperty 1 2 0  => true、続行
// etc
49:   // テスト 50
46
-4
50    // associativeProperty 46 -4 50  => false、縮小開始
// etc
shrink:
35
-4
50    // associativeProperty 35 -4 50  => false、縮小続行
shrink:
27
-4
50    // associativeProperty 27 -4 50  => false、縮小続行
// etc
shrink:
25
1
29    // associativeProperty 25 1 29  => false、縮小続行
shrink:
25
1
26    // associativeProperty 25 1 26  => false、縮小続行
// 次の縮小は失敗
Falsifiable, after 50 tests (10 shrinks) (StdGen (995282583,295941602)):
25
1
26
```

この表示は多くのスペースを占有します！ もっとコンパクトにできますか？

はい。独自のカスタム関数を記述し、FsCheckの`Config`構造体を介してそれらを使用するように指示することで、各テストと縮小の表示方法を制御できます。

これらの関数はジェネリックであり、パラメーターのリストは不明な長さのリスト（`obj list`）で表されます。
しかし、3つのパラメーターを持つプロパティをテストしていることがわかっているので、3つの要素を持つリストパラメーターをハードコードし、すべてを1行に出力できます。

設定には`Replay`と呼ばれるスロットもあり、通常は`None`です。これは、実行ごとに結果が異なることを意味します。

`Replay`を`Some seed`に設定すると、テストはまったく同じ方法で再生されます。
シードは`StdGen (someInt,someInt)`のように見え、実行ごとに表示されるため、実行を保存したい場合は、そのシードを設定に貼り付けるだけで済みます。

繰り返しになりますが、特定の設定を使うには、`Check.Quick(property)`ではなく`Check.One(config,property)`を使う必要があります。

デフォルトのトレース関数を変更し、再生シードを明示的に設定したコードを次に示します。

```fsharp
// テストを表示するための関数を定義
let printTest testNum [x;y;z] = 
    sprintf "#%-3i %3O %3O %3O\n" testNum x y z

// 縮小を表示するための関数を定義
let printShrink [x;y;z] = 
    sprintf "shrink %3O %3O %3O\n" x y z

// 新しいFsCheck設定を作成
let config = {
    Config.Quick with 
        Replay = Random.StdGen (995282583,295941602) |> Some 
        Every = printTest 
        EveryShrink = printShrink
    }

// 新しい設定で指定されたプロパティをチェック
Check.One(config,associativeProperty)
```

出力ははるかにコンパクトになり、次のようになります。

```text
#0    -1  -1   0
#1     0   0   0
#2    -2   0  -3
#3     1   2   0
#4    -4   2  -3
#5     3   0  -3
#6    -1  -1  -1
// etc
#46  -21 -25  29
#47  -10  -7 -13
#48   -4 -19  23
#49   46  -4  50
// 最初のパラメーターの縮小を開始
shrink  35  -4  50
shrink  27  -4  50
shrink  26  -4  50
shrink  25  -4  50
// 2番目のパラメーターの縮小を開始
shrink  25   4  50
shrink  25   2  50
shrink  25   1  50
// 3番目のパラメーターの縮小を開始
shrink  25   1  38
shrink  25   1  29
shrink  25   1  26
Falsifiable, after 50 tests (10 shrinks) (StdGen (995282583,295941602)):
25
1
26
```

これで、必要に応じてFsCheckのロギングをカスタマイズするのが非常に簡単であることがわかりました。

縮小がどのように行われたかを詳しく見てみましょう。
入力の最後のセット（46、-4、50）はfalseだったので、縮小が開始されました。
 
```fsharp
// 入力値の最後のセット (46,-4,50) は false だったので、縮小が開始されました
associativeProperty 46 -4 50  // false なので縮小

// 46 から始まる可能性のある縮小のリスト
Arb.shrink 46 |> Seq.toList 
// 結果 [0; 23; 35; 41; 44; 45]
```

リスト `[0; 23; 35; 41; 44; 45]` をループして、プロパティを失敗させる最初の要素で停止します。

```fsharp
// x パラメーターを縮小するときに失敗する次のテストを見つける
let x,y,z = (46,-4,50) 
Arb.shrink x
|> Seq.tryPick (fun x -> if associativeProperty x y z then None else Some (x,y,z) )
// 答え (35, -4, 50)
```

失敗を引き起こした最初の要素は、入力 `(35, -4, 50)` の一部である `x=35` でした。

そこで、今度は 35 から始めて、それを縮小します。

```fsharp
// x パラメーターを縮小するときに失敗する次のテストを見つける
let x,y,z = (35,-4,50) 
Arb.shrink x
|> Seq.tryPick (fun x -> if associativeProperty x y z then None else Some (x,y,z) )
// 答え (27, -4, 50)
```

失敗を引き起こした最初の要素は、今度は入力 `(27, -4, 50)` の一部である `x=27` になりました。

そこで、今度は 27 から始めて、続行します。

```fsharp
// x パラメーターを縮小するときに失敗する次のテストを見つける
let x,y,z = (27,-4,50) 
Arb.shrink x
|> Seq.tryPick (fun x -> if associativeProperty x y z then None else Some (x,y,z) )
// 答え (26, -4, 50)

// x パラメーターを縮小するときに失敗する次のテストを見つける
let x,y,z = (26,-4,50) 
Arb.shrink x
|> Seq.tryPick (fun x -> if associativeProperty x y z then None else Some (x,y,z) )
// 答え (25, -4, 50)

// x パラメーターを縮小するときに失敗する次のテストを見つける
let x,y,z = (25,-4,50) 
Arb.shrink x
|> Seq.tryPick (fun x -> if associativeProperty x y z then None else Some (x,y,z) )
// 答え None
```

この時点で、`x=25`はこれ以上小さくできません。縮小シーケンスのどれも失敗を引き起こしませんでした。
これで`x`パラメーターは完了です！

今度は、このプロセスを`y`パラメーターで繰り返します。

```fsharp
// y パラメーターを縮小するときに失敗する次のテストを見つける
let x,y,z = (25,-4,50) 
Arb.shrink y
|> Seq.tryPick (fun y -> if associativeProperty x y z then None else Some (x,y,z) )
// 答え (25, 4, 50)

// y パラメーターを縮小するときに失敗する次のテストを見つける
let x,y,z = (25,4,50) 
Arb.shrink y
|> Seq.tryPick (fun y -> if associativeProperty x y z then None else Some (x,y,z) )
// 答え (25, 2, 50)

// y パラメーターを縮小するときに失敗する次のテストを見つける
let x,y,z = (25,2,50) 
Arb.shrink y
|> Seq.tryPick (fun y -> if associativeProperty x y z then None else Some (x,y,z) )
// 答え (25, 1, 50)

// y パラメーターを縮小するときに失敗する次のテストを見つける
let x,y,z = (25,1,50) 
Arb.shrink y
|> Seq.tryPick (fun y -> if associativeProperty x y z then None else Some (x,y,z) )
// 答え None
```

この時点で、`y=1`はこれ以上小さくできません。縮小シーケンスのどれも失敗を引き起こしませんでした。
これで`y`パラメーターは完了です！

最後に、このプロセスを`z`パラメーターで繰り返します。

```fsharp
// z パラメーターを縮小するときに失敗する次のテストを見つける
let x,y,z = (25,1,50) 
Arb.shrink z
|> Seq.tryPick (fun z -> if associativeProperty x y z then None else Some (x,y,z) )
// 答え (25, 1, 38)

// z パラメーターを縮小するときに失敗する次のテストを見つける
let x,y,z = (25,1,38) 
Arb.shrink z
|> Seq.tryPick (fun z -> if associativeProperty x y z then None else Some (x,y,z) )
// 答え (25, 1, 29)

// z パラメーターを縮小するときに失敗する次のテストを見つける
let x,y,z = (25,1,29) 
Arb.shrink z
|> Seq.tryPick (fun z -> if associativeProperty x y z then None else Some (x,y,z) )
// 答え (25, 1, 26)

// z パラメーターを縮小するときに失敗する次のテストを見つける
let x,y,z = (25,1,26) 
Arb.shrink z
|> Seq.tryPick (fun z -> if associativeProperty x y z then None else Some (x,y,z) )
// 答え None
```

これで、すべてのパラメーターが完了しました！

縮小後の最終的な反例は `(25,1,26)` です。

## 事前条件の追加

チェックするプロパティの新しいアイデアがあるとしましょう。「加算は乗算ではない」というプロパティを作成します。これは、実装における悪意のある（または偶発的な）混同を防ぐのに役立ちます。

最初の試みは次のとおりです。
```fsharp
let additionIsNotMultiplication x y = 
    x + y <> x * y
```

しかし、このテストを実行すると、失敗します！

```fsharp
Check.Quick additionIsNotMultiplication 
// Falsifiable, after 3 tests (0 shrinks) (StdGen (2037191079,295941699)):
// 0
// 0
```

ええと、明らかに`0+0`と`0*0`は等しいです。しかし、FsCheckにこれらの入力だけを無視して、他のすべての入力をそのままにするように指示するにはどうすればよいでしょうか？

これは、「条件」またはフィルター式を使用して行います。フィルター式は、`==>`（FsCheckによって定義された演算子）を使用してプロパティ関数の前に追加されます。

例を次に示します。

```fsharp
let additionIsNotMultiplication x y = 
    x + y <> x * y

let preCondition x y = 
    (x,y) <> (0,0)

let additionIsNotMultiplication_withPreCondition x y = 
    preCondition x y ==> additionIsNotMultiplication x y 
```

新しいプロパティは`additionIsNotMultiplication_withPreCondition`であり、他のプロパティと同様に`Check.Quick`に渡すことができます。

```fsharp
Check.Quick additionIsNotMultiplication_withPreCondition
// Falsifiable, after 38 tests (0 shrinks) (StdGen (1870180794,295941700)):
// 2
// 2
```

おっと！ もう1つのケースを忘れていました！ 事前条件をもう一度修正しましょう。

```fsharp
let preCondition x y = 
    (x,y) <> (0,0)
    && (x,y) <> (2,2)

let additionIsNotMultiplication_withPreCondition x y = 
    preCondition x y ==> additionIsNotMultiplication x y 
```

これでうまくいきます。

```fsharp
Check.Quick additionIsNotMultiplication_withPreCondition
// Ok, passed 100 tests.
```
    
この種の事前条件は、少数のケースを除外したい場合にのみ使用する必要があります。

ほとんどの入力が無効になる場合、このフィルタリングはコストがかかります。この場合、より良い方法があり、それは将来の記事で説明します。

FsCheckのドキュメントには、プロパティを調整する方法の詳細が[こちら](https://fsharp.github.io/FsCheck/Properties.html)にあります。
    
## プロパティの命名規則

これらのプロパティ関数は、「通常の」関数とは目的が異なるため、どのように名前を付けるべきでしょうか？

HaskellやErlangの世界では、慣例によりプロパティに`prop_`というプレフィックスを付けます。.NETの世界では、`AbcProperty`のようなサフィックスを使う方が一般的です。

また、F#では、プロパティを整理し、他の関数と区別するために使用できる名前空間、モジュール、属性（`[<Test>]`など）があります。

## 複数のプロパティの組み合わせ

プロパティのセットを作成したら、クラス型の静的メンバーとして追加することで、それらをグループに（いや、さらに進んで、なんと*仕様*としても！）まとめることができます。

その後、`Check.QuickAll`を実行し、クラスの名前を渡すことができます。

たとえば、3つの加算プロパティは次のとおりです。

```fsharp
let add x y = x + y // 正しい実装

let commutativeProperty x y = 
    add x y = add y x    

let associativeProperty x y z = 
    add x (add y z) = add (add x y) z    

let leftIdentityProperty x = 
    add x 0 = x

let rightIdentityProperty x = 
    add 0 x = x
```

`Check.QuickAll`で使用する対応する静的クラスは次のとおりです。
 
```fsharp
type AdditionSpecification =
    static member ``交換法則`` x y = commutativeProperty x y
    static member ``結合法則`` x y z = associativeProperty x y z 
    static member ``左単位元`` x = leftIdentityProperty x 
    static member ``右単位元`` x = rightIdentityProperty x 

Check.QuickAll<AdditionSpecification>()
```

## プロパティベースのテストと実例ベースのテストの組み合わせ

この記事の冒頭では、「マジック」ナンバーを使って入力空間のごく一部をテストするテストを軽視していました。

しかし、実例ベースのテストは、プロパティベースのテストを補完する役割があると私は考えています。

実例ベースのテストは、抽象度が低いため、理解しやすい場合が多く、プロパティと組み合わせて優れたエントリポイントとドキュメントを提供します。

例を次に示します。

```fsharp
type AdditionSpecification =
    static member ``交換法則`` x y = commutativeProperty x y
    static member ``結合法則`` x y z = associativeProperty x y z 
    static member ``左単位元`` x = leftIdentityProperty x 
    static member ``右単位元`` x = rightIdentityProperty x 

    // いくつかの例も
    static member ``1 + 2 = 3``() =  
        add 1 2 = 3

    static member ``1 + 2 = 2 + 1``() =  
        add 1 2 = add 2 1 

    static member ``42 + 0 = 0 + 42``() =  
        add 42 0 = add 0 42 
```

## NUnitからFsCheckを使う

追加のプラグイン（NUnitの場合は`FsCheck.NUnit`など）を使用することで、NUnitやその他のテストフレームワークからFsCheckを使用できます。

テストに`Test`や`Fact`のマークを付けるのではなく、`Property`属性を使用します。
通常のテストとは異なり、これらのテストにはパラメーターを付けることができます！

テストの例を次に示します。

```fsharp
open NUnit.Framework
open FsCheck
open FsCheck.NUnit

[<Property(QuietOnSuccess = true)>]
let ``交換法則`` x y = 
    commutativeProperty x y

[<Property(Verbose= true)>]
let ``結合法則`` x y z = 
    associativeProperty x y z 
    
[<Property(EndSize=300)>]
let ``左単位元`` x = 
    leftIdentityProperty x 
```

ご覧のとおり、アノテーションのプロパティを介して、テストごとに設定（`Verbose`や`EndSize`など）を変更できます。

また、`QuietOnSuccess`フラグを使用すると、FsCheckを標準のテストフレームワークと互換性を持たせることができます。標準のテストフレームワークは、成功した場合はサイレントになり、何か問題が発生した場合にのみメッセージを表示します。


## まとめ

この記事では、プロパティベースのテストの基本を紹介しました。

しかし、扱うべきことはまだまだたくさんあります！ 今後の記事では、次のようなトピックについて説明します。

* **[コードに適用できるプロパティを考え出す方法](../posts/property-based-testing-2)**。プロパティは数学的なものである必要はありません。
  逆関数（シリアライズ/デシリアライズのテスト用）、冪等性（複数回の更新や重複メッセージの安全な処理用）など、
  より一般的なプロパティと、テストオラクルについて見ていきます。
* **独自のジェネレーターと縮小器を作成する方法**。FsCheckがランダムな値をうまく生成できることを確認しました。
  しかし、正の数、有効なメールアドレス、電話番号など、制約のある値はどうでしょうか。FsCheckは、独自の値を構築するためのツールを提供します。
* **モデルベースのテストを行う方法**、特に、同時実行性の問題をテストする方法。

また、悪意のあるプログラマーの概念も紹介しました。このような悪意のあるプログラマーは非現実的で行き過ぎていると思うかもしれません。

しかし、多くの場合、*私たち自身*が、意図せず悪意のあるプログラマーのように振る舞ってしまうことがあります。
いくつかの特別な場合にうまくいく実装を、喜んで作ってしまいがちです。これは悪意からではなく、単に、より一般的なケースを考慮できていない、あるいは、その必要性に気づいていないことから起こります。

水の中にいる魚が水に気づかないように、私たちも自分が立てている前提に気づかないことがよくあります。プロパティベースのテストは、そうした前提を意識することを強制します。

それでは、また次回。テストがんばりましょう！

*この記事で使用されているコードサンプルは、[GitHubで入手できます](https://github.com/swlaschin/PropertyBasedTesting/blob/master/part1.fsx)。*

**もっと知りたいですか？ [プロパティベースのテストのプロパティを選択する方法に関するフォローアップ記事](../posts/property-based-testing-2.html)を書きました**

*更新：これらの記事に基づいて、プロパティベースのテストに関する講演を行いました。[スライドとビデオはこちら](https://fsharpforfunandprofit.com/pbt/)。*

## 付録：FsCheckのインストールとトラブルシューティング

FsCheckを使用する最も簡単な方法は、F#プロジェクトを作成し、NuGetパッケージ「FsCheck.NUnit」を追加することです。これにより、FsCheckとNUnitの両方が`packages`ディレクトリにインストールされます。

対話型開発にFSXスクリプトファイルを使用している場合は、次のように、適切なパッケージの場所からDLLを読み込む必要があります。

```fsharp
// 現在のディレクトリをスクリプトディレクトリと同じに設定します
System.IO.Directory.SetCurrentDirectory (__SOURCE_DIRECTORY__)

// nuget install FsCheck.Nunit が実行済みであり、
// アセンブリが現在のディレクトリ以下で使用可能であることを前提としています
#I @"Packages\FsCheck.1.0.3\lib\net45"
//#I @"Packages\FsCheck.0.9.2.0\lib\net40-Client"  // VS2012の場合は古いバージョンを使用します
#I @"Packages\NUnit.2.6.3\lib"

#r @"FsCheck.dll"
#r @"nunit.framework.dll"

open System
open FsCheck
open NUnit.Framework
```

次に、以下を実行して、FsCheckが正しく機能していることをテストします。

```fsharp
let revRevIsOrig (xs:list<int>) = List.rev(List.rev xs) = xs

Check.Quick revRevIsOrig 
```

エラーが発生しない場合は、すべて正常です。

*エラーが*発生した場合は、おそらく古いバージョンのVisual Studioを使用しているためです。VS2013にアップグレードするか、それができない場合は、次の手順を実行します。

* まず、最新のF#コアがインストールされていることを確認します（[現在は3.1](https://stackoverflow.com/questions/20332046/correct-version-of-fsharp-core)）。
* `app.config`に[適切なバインディングリダイレクト](https://blog.ploeh.dk/2014/01/30/how-to-use-fsharpcore-430-when-all-you-have-is-431/)があることを確認します。
* NUnitアセンブリがGACからではなく、ローカルで参照されていることを確認します。

これらの手順により、コンパイルされたコードが機能するはずです。

F#インタラクティブでは、さらに難しい場合があります。VS2013を使用していない場合は、`System.InvalidCastException: Unable to cast object of type 'Arrow'`などのエラーが発生する可能性があります。

これに対する最善の解決策は、VS2013にアップグレードすることです！ それができない場合は、0.9.2などの古いバージョンのFsCheckを使用できます（VS2012で正常にテスト済みです）

