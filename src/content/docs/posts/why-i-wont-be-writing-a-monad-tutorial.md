---
layout: post
title: "モナドのチュートリアルを書かない理由"
description: ""
categories: []
---

*「Haskellの世界では、コンパイラをまだ実装していない人のことを初心者と呼びます。彼らはモナドのチュートリアルを書いただけなのです」 - [Pseudonymn](https://web.archive.org/web/20150905084601/http://sequence.complete.org/node?page=10)*

まずは、お話から始めましょう。

### アリス、数を学ぶ

*幼いアリスと数学者の父親が、ふれあい動物園にいます……*

アリス：見て！子猫たち。

![2匹の子猫](@assets/img/two_kitties.jpg)

お父さん：かわいいね。2匹いるよ。

アリス：見て！子犬たち。

![2匹の子犬](@assets/img/two_puppies.jpg)

お父さん：そうだね。数えられるかな？子犬も2匹いるよ。

アリス：見て！お馬さんたち。

![2匹の馬](@assets/img/two_horses.jpg)

お父さん：そうだね。子猫と子犬と馬に共通点があるのがわかる？

アリス：ううん。全然違うよ！

お父さん：いや、実は共通点があるんだ。わかるかな？

アリス：ううん！子犬は子猫じゃないし、馬も子猫じゃない。

お父さん：説明しようか？まず、[集合の帰属関係に関して厳密に整列されていて、かつSのすべての要素がSの部分集合でもあるような集合S](https://en.wikipedia.org/wiki/Ordinal_number#Von_Neumann_definition_of_ordinals)について考えてみよう。何かヒントになるかな？

アリス：[泣き出す]

### 人を惹きつけ、影響を与える方法

分別のある親なら、順序数の形式的な定義から始めて数を数える方法を説明しようとはしませんよね。

では、なぜモナドのような概念を説明する時に、多くの人がその形式的な定義を強調するのでしょうか？

大学の数学の授業ならそれでいいかもしれませんが、何か役立つものを作ろうとしている普通のプログラマーには明らかに不向きです。

しかし、このアプローチの残念な結果として、モナドの概念には神秘的な雰囲気が漂ってしまいました。モナドは、真の悟りに至るために[渡らなければならない橋](https://www.thefreedictionary.com/pons+asinorum)になってしまったのです。そしてもちろん、それを渡るための[モナドのチュートリアルはたくさん](https://wiki.haskell.org/Monad_tutorials_timeline)あります。

真実はこうです。役立つ関数型コードを書くのに、モナドを理解する*必要はありません*。これは特に、HaskellよりF#に当てはまります。

モナドは[万能な解決策](https://en.wikipedia.org/wiki/Law_of_the_instrument)ではありません。モナドを使っても、生産性が上がるわけでも、コードのバグが減るわけでもありません。

だから、本当に、モナドのことは心配しないでください。

### モナドのチュートリアルを書かない理由

モナドのチュートリアルを書かないのはそのためです。関数型プログラミングを学ぶ人の役に立つとは思えません。むしろ、混乱と不安を生み出すだけです。

もちろん、[多くの](../posts/recipe-part2.html)異なる[記事](../posts/computation-expressions-wrapper-types.html)でモナドの例を使いますが、ここ以外では、このサイトのどこでも「モナド」という言葉を使わないようにします。
実際、「モナド」は[禁止ワードリスト](https://fsharpforfunandprofit.com/about/#forbidden-words)の筆頭に挙げられています。


### モナドのチュートリアルを書くべき理由

一方で、*あなた*はモナドのチュートリアルを書くべきだと思います。誰かに何かを説明しようとすると、自分自身の理解も深まります。

チュートリアルを書く手順は以下の通りです。

1. まず、リスト、シーケンス、オプション、非同期ワークフロー、コンピュテーション式などを使った実践的なコードをたくさん書きます。
2. 経験を積むにつれて、詳細ではなく、物事の形に注目して、より多くの抽象化を使うようになります。
3. ある時点で、すべての抽象化に共通点があるという、はっとする瞬間が訪れます。
4. これでビンゴ！モナドのチュートリアルを書く時が来ました！

重要なのは、[*この順番でやる*](https://byorgey.wordpress.com/2009/01/12/abstraction-intuition-and-the-monad-tutorial-fallacy/)ということです。最後のステップにいきなり飛んで、そこから逆算することはできません。抽象化を理解するためには、細部を一つ一つ積み重ねていくことが不可欠なのです。

チュートリアル頑張ってください。私はブリトーを食べに行きます。









