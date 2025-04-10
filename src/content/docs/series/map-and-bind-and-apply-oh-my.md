---
layout: series_index
title: "Map, Bind, Apply を理解する"
seriesIndexId: "Map, Bind, Apply なにもわからない"
---

この連載では、ジェネリックなデータ型（`Option`や`List`など）を扱うための核となる関数をいくつか説明します。
これは[関数型パターンに関する私の講演](https://fsharpforfunandprofit.com/fppatterns/)の続編です。

[こういうことはしないと以前に約束した](../posts/why-i-wont-be-writing-a-monad-tutorial.html)のですが、
今回は多くの人がとるアプローチとは違う方法をとってみようと思いました。型クラスのような抽象概念ではなく、
コア関数自体とその実践的な使い方に焦点を当てる方が役に立つのではないかと思ったのです。

つまり、`map`、`return`、`apply`、`bind`のための「マニュアルページ」のようなものです。

各関数について、名前（と一般的な別名）、よく使われる演算子、型シグネチャを説明するセクションがあり、
そしてそれらが必要な理由と使い方の詳細について説明します。また、（私自身いつも役立つと思っている）視覚的な説明も提供します。



* [map と apply を理解する](../posts/elevated-world.html)。高次の世界を扱うためのツールセット。
* [bind を理解する](../posts/elevated-world-2.html)。または、世界をまたぐ関数を合成する方法。
* [コア関数の実際的な使い方](../posts/elevated-world-3.html)。独立したデータと依存したデータの扱い方。
* [traverse と sequence を理解する](../posts/elevated-world-4.html)。リストと高次の値を混ぜる。
* [map, apply, bind, sequence の実際的な使い方](../posts/elevated-world-5.html)。テクニックをすべて使う実践例。
* [Reader モナドの再発明](../posts/elevated-world-6.html)。または、自分だけの高次の世界をデザインする。
* [Map, Bind, Apply のまとめ](../posts/elevated-world-7.html)。
