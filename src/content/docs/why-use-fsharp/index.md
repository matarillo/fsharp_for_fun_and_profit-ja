---
layout: page
title: "F# を使う理由"
description: "Why you should consider using F# for your next project"
nav: why-use-fsharp
hasIcons: 1
image: "@assets/img/four-concepts2.png"
---

F#は科学や数値解析といった専門分野で優れていますが、企業向けの開発にも最適な選択肢です。
次回のプロジェクトではF#を使うべきだと思える理由を5つ紹介します。

## ![](@assets/img/glyphicons/glyphicons_030_pencil.png) 簡潔さ

F#には波かっこやセミコロンなどの、[コーディング上の「ノイズ」](../posts/fvsc-sum-of-squares.md)がありません。

強力な[型推論システム](../posts/conciseness-type-inference.md)のおかげで、オブジェクトの型をほとんど指定する必要がありません。

また、C#と比べて、同じ問題を解決するのに[より少ないコード行数](../posts/fvsc-download.md)で済みます。

```
// ワンライナー
[1..100] |> List.sum |> printfn "sum=%d"

// かっこも、セミコロンも、波かっこも不要
let square x = x * x
let sq = square 42 

// 単純な型は１行で書ける
type Person = {First:string; Last:string}

// 複合的な型も数行で書ける
type Employee = 
  | Worker of Person
  | Manager of Employee list

// 型推論
let jdoe = {First="John";Last="Doe"}
let worker = Worker jdoe
```

## ![](@assets/img/glyphicons/glyphicons_343_thumbs_up.png) 便利さ


F#では多くの一般的なプログラミング作業がより簡単です。
これには、[複雑な型定義](../posts/conciseness-type-definitions.md)の作成と使用、[リスト処理](../posts/conciseness-extracting-boilerplate.md)、[比較と等価性](../posts/convenience-types.md)、[状態機械](../posts/designing-with-types-representing-states.md)などが含まれます。


また、関数が第一級オブジェクトであるため、[他の関数をパラメータとして受け取る](../posts/conciseness-extracting-boilerplate.md)関数や、[既存の関数を組み合わせて](../posts/conciseness-functions-as-building-blocks.md)新しい関数を作る関数を作成することで、強力で再利用可能なコードを簡単に作れます。

```
// 自動的な等値判定と比較
type Person = {First:string; Last:string}
let person1 = {First="john"; Last="Doe"}
let person2 = {First="john"; Last="Doe"}
printfn "Equal? %A"  (person1 = person2)

// "use" キーワードでIDisposableのロジックが簡単
use reader = new StreamReader(..)

// 関数の合成が簡単
let add2times3 = (+) 2 >> (*) 3
let result = add2times3 5
```

## ![](@assets/img/glyphicons/glyphicons_150_check.png) 正確性


F#には[強力な型システム](../posts/correctness-type-checking.md)があり、[null参照例外](../posts/the-option-type.md#option-is-not-null)などの一般的なエラーを防ぎます。

値は[デフォルトで不変](../posts/correctness-immutability.md)なので、多くの種類のエラーを防げます。

さらに、[型システム](../posts/correctness-exhaustive-pattern-matching.md)を使ってビジネスロジックを表現することで、
[間違ったコードを書くことが不可能](../posts/designing-for-correctness.md)になったり、
[単位の混乱](../posts/units-of-measure.md)を避けられたりするため、ユニットテストの必要性が大幅に減ります。


```
// 厳密な型チェック
printfn "print string %s" 123 //コンパイルエラー

// すべての値はデフォルトで不変
person1.First <- "new name"  //割り当てエラー

// nullチェックは完全に不要
let makeNewString str = 
   //strは常に安全に追加可能
   let newString = str + " new!"
   newString

// ビジネスロジックを型に埋め込む
emptyShoppingCart.remove   // コンパイルエラー!

// 測定単位
let distance = 10<m> + 10<ft> // エラー!
```

## ![](@assets/img/glyphicons/glyphicons_054_clock.png) 並行処理 


F#には、複数の処理を同時に行う際に役立つ組み込みライブラリがいくつかあります。
非同期プログラミングや並列処理が[とても簡単](../posts/concurrency-async-and-parallel.md)にできます。

F#には組み込みの[アクターモデル](../posts/concurrency-actor-model.md)もあり、イベント処理や[関数型リアクティブプログラミング](../posts/concurrency-reactive.md)のサポートも優れています。

そして、データ構造がデフォルトで不変なので、状態の共有やロックの回避がずっと簡単です。

```
// "async" キーワードで非同期ロジックが簡単
let! result = async {something}

// 並列処理が簡単
Async.Parallel [ for i in 0..40 -> 
      async { return fib(i) } ]

// メッセージキュー
MailboxProcessor.Start(fun inbox-> async{
	let! msg = inbox.Receive()
	printfn "message is: %s" msg
	})
```

## ![](@assets/img/glyphicons/glyphicons_280_settings.png) 完全性

F#は基本的に関数型言語ですが、100% 純粋ではない他のスタイルもサポートしています。
これにより、Webサイト、データベース、他のアプリケーションなど、純粋でない世界とのやり取りがずっと簡単になります。

特に、F#は関数型とオブジェクト指向のハイブリッド言語として設計されているため、[C#でできることはほぼすべてできます](../posts/completeness-anything-csharp-can-do.md)。


F#は[.NETエコシステムの一部](../posts/completeness-seamless-dotnet-interop.md)ですから、すべてのサードパーティの.NETライブラリやツールにスムーズにアクセスできます。
（Monoや新しい .NET Coreを通じて）Linuxやスマートフォンなどのほとんどのプラットフォームで動作します。


さらに、Visual Studio（Windows用）やXamarin（Mac用）とよく統合されているため、IntelliSenseサポート、デバッガー、
ユニットテスト、ソース管理、その他の開発タスク用の多くのプラグインを備えた優れたIDEが使えます。
Linuxでは、代わりにMonoDevelop IDEを使用できます。

```
// 必要であれば非純粋なコードも書ける
let mutable counter = 0

// C#互換のクラスやインターフェースを作成できる
type IEnumerator<'a> = 
    abstract member Current : 'a
    abstract MoveNext : unit -> bool 

// 拡張メソッドが書ける
type System.Int32 with
    member this.IsEven = this % 2 = 0

let i=20
if i.IsEven then printfn "'%i' is even" i
	
// UIコードが書ける
open System.Windows.Forms 
let form = new Form(Width= 400, Height = 300, 
   Visible = true, Text = "Hello World") 
form.TopMost <- true
form.Click.Add (fun args-> printfn "clicked!")
form.Show()
```

## 「F# を使う理由」シリーズ

以下のシリーズでは、F#単独のコードスニペット（しばしばC#コードとの比較も）を使って、F#のそれぞれの利点を紹介します。

* [「F# を使う理由」シリーズの紹介](../posts/why-use-fsharp-intro.md)。F#の利点の概要
* [60秒でわかるF#の文法](../posts/fsharp-in-60-seconds.md)。F#コードの読み方の超簡単な概要
* [F#とC#の比較：簡単な合計](../posts/fvsc-sum-of-squares.md)。ループを使わずに1からNまでの二乗の合計を求めてみる
* [F#とC#の比較：ソート](../posts/fvsc-quicksort.md)。F#がC#よりも宣言的であること、そしてパターンマッチングの紹介
* [F#とC#の比較：Webページのダウンロード](../posts/fvsc-download.md)。F#がコールバックに優れていること、そして'use'キーワードの紹介
* [4つの重要な概念](../posts/key-concepts.md)。F#を標準的な命令型言語と区別する概念
* [簡潔さ](../posts/conciseness-intro.md)。なぜ簡潔さが重要なのか？
* [型推論](../posts/conciseness-type-inference.md)。複雑な型構文に気を取られないようにする方法
* [低オーバーヘッドの型定義](../posts/conciseness-type-definitions.md)。新しい型を作るのにペナルティがない
* [関数を使ってボイラープレートコードを抽出する](../posts/conciseness-extracting-boilerplate.md)。DRY原則への関数型アプローチ
* [関数をビルディングブロックとして使用する](../posts/conciseness-functions-as-building-blocks.md)。関数合成とミニ言語でコードをより読みやすくする
* [簡潔さのためのパターンマッチング](../posts/conciseness-pattern-matching.md)。パターンマッチングで一度にマッチングと束縛ができる
* [利便性](../posts/convenience-intro.md)。プログラミングの退屈な作業とボイラープレートコードを減らす機能
* [型に関する既定のふるまい](../posts/convenience-types.md)。コーディング不要の不変性と組み込み等価性
* [インターフェースとしての関数](../posts/convenience-functions-as-interfaces.md)。関数を使用すると、オブジェクト指向のデザインパターンが簡単に実現できる
* [部分適用](../posts/convenience-partial-application.md)。関数のパラメータの一部を固定する方法
* [アクティブパターン](../posts/convenience-active-patterns.md)。強力なマッチングのための動的パターン
* [正確性](../posts/correctness-intro.md)。「コンパイル時ユニットテスト」の書き方
* [不変性](../posts/correctness-immutability.md)。コードを予測可能にする
* [網羅的パターンマッチング](../posts/correctness-exhaustive-pattern-matching.md)。正確性を確保するための強力な技術
* [型システムを使って正しいコードを確保する](../posts/correctness-type-checking.md)。F#では型システムは敵ではなく味方
* [実践例：正確性のための設計](../posts/designing-for-correctness.md)。不正な状態を表現不可能にする方法
* [並行性](../posts/concurrency-intro.md)。ソフトウェア開発の次の大革命？
* [非同期プログラミング](../posts/concurrency-async-and-parallel.md)。Asyncクラスでバックグラウンドタスクをカプセル化する
* [メッセージとエージェント](../posts/concurrency-actor-model.md)。並行性について考えやすくする
* [関数型リアクティブプログラミング](../posts/concurrency-reactive.md)。イベントをストリームに変換する
* [完全性](../posts/completeness-intro.md)。F#は.NETエコシステム全体の一部
* [.NETライブラリとのシームレスな相互運用](../posts/completeness-seamless-dotnet-interop.md)。.NETライブラリを扱うための便利な機能
* [C#でできることは何でも...](../posts/completeness-anything-csharp-can-do.md)。F#でのオブジェクト指向コードの駆け足ツアー
* [F# を使う理由：結論](../posts/why-use-fsharp-conclusion.md)。
