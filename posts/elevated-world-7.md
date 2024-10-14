---
layout: post
title: "Map, Bind, Apply のまとめ"
description: ""
categories: ["パターン"]
seriesId: "Map, Bind, Apply なにもわからない"
seriesOrder: 7
---

## シリーズのまとめ

[このシリーズ](../series/map-and-bind-and-apply-oh-my.md)は、当初の予定よりも長くなってしまいました。最後までお付き合いいただき、ありがとうございます！

この議論が、`map`や`bind`といった様々な関数の変換について理解を深める上で、参考になったことを願っています。世界をまたぐ関数を取り扱う上での有用なテクニックも、少しは理解いただけたのではないでしょうか。
もしかしたら、m-wordの神秘性も、少しは解けたかもしれませんね。

これらの関数を自分のコードで使ってみたいと思った方は、その実装がいかに簡単かお分かりいただけたと思います。
sしかし、これらの関数やさらに多くの機能を含む優れたF#ユーティリティライブラリの使用も検討してみてください：

* **ExtCore** ([ソース](https://github.com/jack-pappas/ExtCore), [NuGet](https://www.nuget.org/packages/ExtCore/)). 
  ExtCoreはF#コアライブラリ（FSharp.Core）を拡張し、実用的なF#アプリケーションの構築をサポートすることを目的としています。
  これらの拡張には、Array、List、Set、Mapなどのモジュールの追加関数、不変のIntSet、IntMap、LazyList、Queueコレクション、
  様々なコンピュテーション式（ワークフロー）、
  そして「ワークフローコレクション」（ワークフロー内でシームレスに動作するように適応されたコレクションモジュール）が含まれます。
  
* **FSharpx.Extras** ([ホームページ](https://fsprojects.github.io/FSharpx.Extras/)). 
  FSharpx.ExtrasはFSharpxシリーズのライブラリの一部です。
  いくつかの標準的なモナド（State、Reader、Writer、Either、Continuation、Distribution）、
  アプリカティブファンクターによるバリデーション、flipのような一般的な関数、非同期プログラミングユーティリティ、
  そしてC# - F#の相互運用を容易にする関数を実装しています。
  
たとえば、[この投稿](../posts/elevated-world-4.md#traverse)で実装したモナディックな走査`List.traverseResultM`は、すでにExtCoreで
[ここ](https://github.com/jack-pappas/ExtCore/blob/4fc2302e74a9b5217d980e5ce2680f0b3db26c3d/ExtCore/ControlCollections.Choice.fs#L398)で利用可能です。
  
このシリーズが気に入った方は、["Dr Frankenfunctor and the Monadster"](../posts/monadster.md)シリーズでStateモナドについての投稿や、
「[鉄道指向プログラミング](https://fsharpforfunandprofit.com/rop/)」というトークでEitherモナドについての説明もご覧いただけます。

最初に述べたように、これを書くことは私にとっても学習プロセスでした。
私も専門家ではありませんので、もし間違いを見つけられたら、ぜひご指摘ください。

ありがとうございました！

## シリーズの内容

このシリーズで触れた様々な関数へのショートカットリストです：

* **パート1：高次の世界への持ち上げ**
  * [`map`関数](../posts/elevated-world.md#map)
  * [`return`関数](../posts/elevated-world.md#return)
  * [`apply`関数](../posts/elevated-world.md#apply)
  * [`liftN`関数ファミリー](../posts/elevated-world.md#lift)
  * [`zip`関数とZipList世界](../posts/elevated-world.md#zip)
* **パート2：世界をまたぐ関数の合成方法**    
  * [`bind`関数](../posts/elevated-world-2.md#bind)
  * [リストはモナドではない。オプションもモナドではない。](../posts/elevated-world-2.md#not-a-monad)
* **パート3：コア関数の実際的な使い方**  
  * [独立データと依存データ](../posts/elevated-world-3.md#dependent)
  * [例：アプリカティブスタイルとモナディックスタイルを使ったバリデーション](../posts/elevated-world-3.md#validation)
  * [一貫した世界への持ち上げ](../posts/elevated-world-3.md#consistent)
  * [Kleisli世界](../posts/elevated-world-3.md#kleisli)
* **パート4：リストと高次の値の混合**    
  * [リストと高次の値の混合](../posts/elevated-world-4.md#mixing)
  * [`traverse`/`MapM`関数](../posts/elevated-world-4.md#traverse)
  * [`sequence`関数](../posts/elevated-world-4.md#sequence)
  * [アドホックな実装のレシピとしての「シーケンス」](../posts/elevated-world-4.md#adhoc)
  * [読みやすさ vs パフォーマンス](../posts/elevated-world-4.md#readability)
  * [ねえ、`filter`はどこ？](../posts/elevated-world-4.md#filter)
* **パート5：すべてのテクニックを使用する実世界の例**    
  * [例：Webサイトのリストのダウンロードと処理](../posts/elevated-world-5.md#asynclist)
  * [2つの世界を1つとして扱う](../posts/elevated-world-5.md#asyncresult)
* **パート6：独自の高次の世界を設計する** 
  * [独自の高次の世界を設計する](../posts/elevated-world-6.md#part6)
  * [失敗のフィルタリング](../posts/elevated-world-6.md#filtering)
  * [Readerモナド](../posts/elevated-world-6.md#readermonad)
* **パート7：まとめ** 
  * [言及した演算子のリスト](../posts/elevated-world-7.md#operators)
  * [補足文献](../posts/elevated-world-7.md#further-reading)

<a id="operators"></a>
<hr>
  
## 付録：言及した演算子のリスト

関数型プログラミング言語は、オブジェクト指向言語と違って[変わった演算子](https://en.cppreference.com/w/cpp/language/operator_precedence)が多いことで知られています。
そこで、このシリーズで使用された演算子を、関連する議論へのリンクとともにドキュメント化することが役立つと考えました。

演算子  | 同等の関数 | 議論
-------------|---------|----
`>>`  | 左から右への合成 | このシリーズの一部ではありませんが、[ここで議論されています](../posts/function-composition.md)
`<<`  | 右から左への合成 | 上記と同様
<code>&#124;></code>  | 左から右へのパイピング | 上記と同様
<code>&lt;&#124;</code> | 右から左へのパイピング | 上記と同様
`<!>` | `map` | [ここで議論されています](../posts/elevated-world.md#map)
`<$>` | `map` | Haskellのmap演算子ですが、F#では有効な演算子ではないため、このシリーズでは`<!>`を使用しています。
`<*>` | `apply` | [ここで議論されています](../posts/elevated-world.md#apply)
`<*`  | - | 片側の結合子。[ここで議論されています](../posts/elevated-world.md#lift)
`*>`  | - | 片側の結合子。[ここで議論されています](../posts/elevated-world.md#lift)
`>>=` | 左から右への`bind` | [ここで議論されています](../posts/elevated-world-2.md#bind)
`=<<` | 右から左への`bind` | 上記と同様
`>=>` | 左から右へのKleisli合成 | [ここで議論されています](../posts/elevated-world-3.md#kleisli)
`<=<` | 右から左へのKleisli合成 | 上記と同様


<a id="further-reading"></a>
<hr>
  
## 付録：補足文献

代替チュートリアル：

* [You Could Have Invented Monads! (And Maybe You Already Have)](http://blog.sigfpe.com/2006/08/you-could-have-invented-monads-and.html).
* [Functors, Applicatives and Monads in pictures](https://www.adit.io/posts/2013-04-17-functors,_applicatives,_and_monads_in_pictures.html).
* [Kleisli composition ? la Up-Goer Five](https://web.archive.org/web/20181215060626/http://mergeconflict.com/kleisli-composition-a-la-up-goer-five/). これはユーモアがあって面白いですよ。
* [Eric LippertのC#におけるモナドのシリーズ](https://ericlippert.com/category/monads/).

学術的な方向け：

* [Monads for Functional Programming](https://homepages.inf.ed.ac.uk/wadler/papers/marktoberdorf/baastad.pdf) (PDF), by Philip Wadler. 最初のモナド論文の1つです。
* [Applicative Programming with Effects](https://www.staff.city.ac.uk/~ross/papers/Applicative.pdf) (PDF), by Conor McBride and Ross Paterson.
* [The Essence of the Iterator Pattern](https://www.cs.ox.ac.uk/jeremy.gibbons/publications/iterator.pdf) (PDF), by Jeremy Gibbons and Bruno Oliveira.

F#の例：

* [F# ExtCore](https://github.com/jack-pappas/ExtCore)と
  [FSharpx.Extras](https://github.com/fsprojects/FSharpx.Extras/blob/master/src/FSharpx.Extras/ComputationExpressions/Monad.fs)には多くの有用なコードがあります。
* [FSharpx.Async](https://github.com/fsprojects/FSharpx.Async/blob/master/src/FSharpx.Async/Async.fs)には`Async`用の`map`、`apply`、`liftN`（「Parallel」と呼ばれています）、`bind`、その他の便利な拡張機能があります。
* アプリカティブはパーシングに非常に適しています。以下の投稿で説明されています：
  * [Parsing with applicative functors in F#](https://bugsquash.blogspot.co.uk/2011/01/parsing-with-applicative-functors-in-f.html).
  * [Dive into parser combinators: parsing search queries with F# and FParsec in Kiln](https://web.archive.org/web/20160330092851/http://blog.fogcreek.com/fparsec/).

