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

<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.7.2/css/all.min.css" integrity="sha512-Evv84Mr4kqVGRNSgIGL/F/aIDqQb7xQ2vcrdIwxfjThSH8CSR7PBEakCr51Ck+w+/U6swU2Im1vVX0SVk9ABhg==" crossorigin="anonymous" referrerpolicy="no-referrer" />

## <i class="fa-solid fa-pencil"></i> 簡潔性

F#には波かっこやセミコロンなどの、[コーディング上の「ノイズ」](posts/fvsc-sum-of-squares.html)がありません。

強力な[型推論システム](posts/conciseness-type-inference.html)のおかげで、オブジェクトの型をほとんど指定する必要がありません。

また、C#と比べて、同じ問題を解決するのに[より少ないコード行数](posts/fvsc-download.html)で済みます。

```fsharp
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

## <i class="fa-solid fa-thumbs-up"></i> 利便性


F#では多くの一般的なプログラミング作業がより簡単です。
これには、[複雑な型定義](posts/conciseness-type-definitions.html)の作成と使用、[リスト処理](posts/conciseness-extracting-boilerplate.html)、[比較と等価性](posts/convenience-types.html)、[状態機械](posts/designing-with-types-representing-states.html)などが含まれます。


また、関数が第一級オブジェクトであるため、[他の関数をパラメータとして受け取る](posts/conciseness-extracting-boilerplate.html)関数や、[既存の関数を組み合わせて](posts/conciseness-functions-as-building-blocks.html)新しい関数を作る関数を作成することで、強力で再利用可能なコードを簡単に作れます。

```fsharp
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

## <i class="fa-solid fa-square-check"></i> 正確性


F#には[強力な型システム](posts/correctness-type-checking.html)があり、[null参照例外](posts/the-option-type.html#option-is-not-null)などの一般的なエラーを防ぎます。

値は[デフォルトで不変](posts/correctness-immutability.html)なので、多くの種類のエラーを防げます。

さらに、[型システム](posts/correctness-exhaustive-pattern-matching.html)を使ってビジネスロジックを表現することで、
[間違ったコードを書くことが不可能](posts/designing-for-correctness.html)になったり、
[単位の混乱](posts/units-of-measure.html)を避けられたりするため、ユニットテストの必要性が大幅に減ります。


```fsharp
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

## <i class="fa-solid fa-clock"></i> 並行性


F#には、複数の処理を同時に行う際に役立つ組み込みライブラリがいくつかあります。
非同期プログラミングや並列処理が[とても簡単](posts/concurrency-async-and-parallel.html)にできます。

F#には組み込みの[アクターモデル](posts/concurrency-actor-model.html)もあり、イベント処理や[関数型リアクティブプログラミング](posts/concurrency-reactive.html)のサポートも優れています。

そして、データ構造がデフォルトで不変なので、状態の共有やロックの回避がずっと簡単です。

```fsharp
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

## <i class="fa-solid fa-screwdriver-wrench"></i> 完全性

F#は基本的に関数型言語ですが、100% 純粋ではない他のスタイルもサポートしています。
これにより、Webサイト、データベース、他のアプリケーションなど、純粋でない世界とのやり取りがずっと簡単になります。

特に、F#は関数型とオブジェクト指向のハイブリッド言語として設計されているため、[C#でできることはほぼすべてできます](posts/completeness-anything-csharp-can-do.html)。


F#は[.NETエコシステムの一部](posts/completeness-seamless-dotnet-interop.html)ですから、すべてのサードパーティの.NETライブラリやツールにスムーズにアクセスできます。
（Monoや新しい .NET Coreを通じて）Linuxやスマートフォンなどのほとんどのプラットフォームで動作します。


さらに、Visual Studio（Windows用）やXamarin（Mac用）とよく統合されているため、IntelliSenseサポート、デバッガー、
ユニットテスト、ソース管理、その他の開発タスク用の多くのプラグインを備えた優れたIDEが使えます。
Linuxでは、代わりにMonoDevelop IDEを使用できます。

```fsharp
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

* [「F# を使う理由」シリーズの紹介](posts/why-use-fsharp-intro.html)。F#の利点の概要
* [60秒でわかるF#の文法](posts/fsharp-in-60-seconds.html)。F#コードの読み方の超簡単な概要
* [F#とC#の比較：簡単な合計](posts/fvsc-sum-of-squares.html)。ループを使わずに1からNまでの二乗の合計を求めてみる
* [F#とC#の比較：ソート](posts/fvsc-quicksort.html)。F#がC#よりも宣言的であること、そしてパターンマッチングの紹介
* [F#とC#の比較：Webページのダウンロード](posts/fvsc-download.html)。F#がコールバックに優れていること、そして'use'キーワードの紹介
* [4つの重要な概念](posts/key-concepts.html)。F#を標準的な命令型言語と区別する概念
* [簡潔性](posts/conciseness-intro.html)。なぜ簡潔性が重要なのか？
* [型推論](posts/conciseness-type-inference.html)。複雑な型構文に気を取られないようにする方法
* [低オーバーヘッドの型定義](posts/conciseness-type-definitions.html)。新しい型を作るのにペナルティがない
* [関数を使ってボイラープレートコードを抽出する](posts/conciseness-extracting-boilerplate.html)。DRY原則への関数型アプローチ
* [関数をビルディングブロックとして使用する](posts/conciseness-functions-as-building-blocks.html)。関数合成とミニ言語でコードをより読みやすくする
* [簡潔性のためのパターンマッチング](posts/conciseness-pattern-matching.html)。パターンマッチングで一度にマッチングと束縛ができる
* [利便性](posts/convenience-intro.html)。プログラミングの退屈な作業とボイラープレートコードを減らす機能
* [型に関する既定のふるまい](posts/convenience-types.html)。コーディング不要の不変性と組み込み等価性
* [インターフェースとしての関数](posts/convenience-functions-as-interfaces.html)。関数を使用すると、オブジェクト指向のデザインパターンが簡単に実現できる
* [部分適用](posts/convenience-partial-application.html)。関数のパラメータの一部を固定する方法
* [アクティブパターン](posts/convenience-active-patterns.html)。強力なマッチングのための動的パターン
* [正確性](posts/correctness-intro.html)。「コンパイル時ユニットテスト」の書き方
* [不変性](posts/correctness-immutability.html)。コードを予測可能にする
* [網羅的パターンマッチング](posts/correctness-exhaustive-pattern-matching.html)。正確性を確保するための強力な技術
* [型システムを使って正しいコードを確保する](posts/correctness-type-checking.html)。F#では型システムは敵ではなく味方
* [実践例：正確性のための設計](posts/designing-for-correctness.html)。不正な状態を表現不可能にする方法
* [並行性](posts/concurrency-intro.html)。ソフトウェア開発の次の大革命？
* [非同期プログラミング](posts/concurrency-async-and-parallel.html)。Asyncクラスでバックグラウンドタスクをカプセル化する
* [メッセージとエージェント](posts/concurrency-actor-model.html)。並行性について考えやすくする
* [関数型リアクティブプログラミング](posts/concurrency-reactive.html)。イベントをストリームに変換する
* [完全性](posts/completeness-intro.html)。F#は.NETエコシステム全体の一部
* [.NETライブラリとのシームレスな相互運用](posts/completeness-seamless-dotnet-interop.html)。.NETライブラリを扱うための便利な機能
* [C#でできることは何でも...](posts/completeness-anything-csharp-can-do.html)。F#でのオブジェクト指向コードの駆け足ツアー
* [F# を使う理由：結論](posts/why-use-fsharp-conclusion.html)。
