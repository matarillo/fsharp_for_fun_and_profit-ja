---
layout: post
title: "関数型リアクティブプログラミング"
description: "イベントをストリームに変換する"
nav: why-use-fsharp
seriesId: "F# を使う理由"
seriesOrder: 26
categories: [Concurrency]
---

イベントは私たちの身の回りに溢れています。ほとんどのプログラムがイベント処理を必要としています。ユーザーインターフェースのボタンクリック、サーバーでのソケット待ち受け、システムのシャットダウン通知など、様々な場面でイベントが発生します。

イベントは、オブジェクト指向設計でよく使われる「オブザーバー」パターンの基礎にもなっています。

しかし、並行処理全般と同じように、イベント処理の実装は厄介な場合があります。単純なイベントロジックなら簡単ですが、「2つのイベントが連続して起きたら何かをして、1つだけなら別のことをする」とか、「2つのイベントがほぼ同時に起きたら何かをする」といった複雑なロジックはどうでしょう？さらに、これらの要件を組み合わせて、もっと複雑なことをしようとしたら？

こういった要件を何とか実装できたとしても、結果的にコードがスパゲッティのようになり、理解が難しくなりがちです。これは最善を尽くしても避けられないことがあります。

もっと簡単にイベント処理ができる方法はないのでしょうか？

前回のメッセージキューに関する記事で、リクエストが「直列化」されることで扱いやすくなるという利点を見ました。

実は、イベントに対しても似たようなアプローチが使えます。そのアイデアは、一連のイベントを「イベントストリーム」に変換するというものです。
イベントストリームはIEnumerableによく似ています。そのため、次の自然な流れとして、LINQがコレクションを扱うのとほぼ同じ方法で扱えるようになります。
つまり、フィルタリングやマッピング、分割、結合といった操作が可能になるのです。

F#には、従来のアプローチに加えて、このモデルのサポートも組み込まれています。

## シンプルなイベントストリーム ##

まずは、2つのアプローチを比較する簡単な例から見ていきましょう。最初に、古典的なイベントハンドラーのアプローチを実装します。

以下の機能を持つユーティリティ関数を定義します。

* タイマーを作る
* `Elapsed` イベントにハンドラーを登録する
* タイマーを5秒間動かし、その後止める

コードは以下のようになります。

```fsharp
open System
open System.Threading

/// タイマーを作り、イベントハンドラーを登録し、
/// その後タイマーを5秒間動かします
let createTimer timerInterval eventHandler =
    // タイマーをセットアップ
    let timer = new System.Timers.Timer(float timerInterval)
    timer.AutoReset <- true
    
    // イベントハンドラーを追加
    timer.Elapsed.Add eventHandler

    // 非同期タスクを返す
    async {
        // タイマーを開始...
        timer.Start()
        // ...5秒間動かす...
        do! Async.Sleep 5000
        // ...そして停止
        timer.Stop()
        }
```

では、対話的にテストしてみましょう。

```fsharp
// ハンドラーを作る。イベント引数は無視します
let basicHandler _ = printfn "tick %A" DateTime.Now

// ハンドラーを登録
let basicTimer1 = createTimer 1000 basicHandler

// タスクを今すぐ実行
Async.RunSynchronously basicTimer1 
```

次に、タイマーを作る同じようなユーティリティメソッドを作りますが、今回はイベントストリームである「Observable」も返すようにします。

```fsharp
let createTimerAndObservable timerInterval =
    // タイマーをセットアップ
    let timer = new System.Timers.Timer(float timerInterval)
    timer.AutoReset <- true

    // イベントは自動的にIObservableになります
    let observable = timer.Elapsed  

    // 非同期タスクを返す
    let task = async {
        timer.Start()
        do! Async.Sleep 5000
        timer.Stop()
        }

    // 非同期タスクとObservableを返す
    (task,observable)
```

そして、再び対話的にテストします。

```fsharp
// タイマーと対応するObservableを作る
let basicTimer2 , timerEventStream = createTimerAndObservable 1000

// イベントストリームで何かが起きるたびに
// 時間を表示するよう登録
timerEventStream 
|> Observable.subscribe (fun _ -> printfn "tick %A" DateTime.Now)

// タスクを今すぐ実行
Async.RunSynchronously basicTimer2
```

違いは、イベントに直接ハンドラーを登録する代わりに、イベントストリームを「購読」していることです。
一見些細な違いに見えますが、実はこれが重要なポイントです。

## イベントを数える ##

次の例では、少し複雑な要件を扱ってみましょう。

    500ミリ秒ごとに発火するタイマーを作ります。
    発火するたびに、これまでの発火回数と現在時刻を表示します。

これを古典的な命令型の方法で行うなら、おそらく可変のカウンターを持つクラスを作ることになるでしょう。以下のようになります。

```fsharp
type ImperativeTimerCount() =
    
    let mutable count = 0

    // イベントハンドラー。イベント引数は無視します
    member this.handleEvent _ =
      count <- count + 1
      printfn "timer ticked with count %i" count
```

先ほど作ったユーティリティ関数を使ってテストできます。

```fsharp
// ハンドラークラスを作る
let handler = new ImperativeTimerCount()

// ハンドラーメソッドを登録
let timerCount1 = createTimer 500 handler.handleEvent

// タスクを今すぐ実行
Async.RunSynchronously timerCount1 
```

では、これと同じことを関数型の方法でやってみましょう。

```fsharp
// タイマーと対応するObservableを作る
let timerCount2, timerEventStream = createTimerAndObservable 500

// イベントストリームの変換を設定
timerEventStream 
|> Observable.scan (fun count _ -> count + 1) 0 
|> Observable.subscribe (fun count -> printfn "timer ticked with count %i" count)

// タスクを今すぐ実行
Async.RunSynchronously timerCount2
```

ここでは、LINQでリストを変換するのと同じように、イベント変換のレイヤーを重ねていく様子が見られます。

最初の変換は `scan` で、各イベントに対して状態を蓄積します。これは、リストで使う `List.fold` 関数とよく似ています。
この場合、蓄積される状態は単なるカウンターです。

そして、イベントが起きるたびに、カウントが出力されます。

この関数型アプローチでは、可変状態を持たず、特別なクラスを作る必要もありませんでした。これが大きな違いです。

## 複数のイベントストリームをマージする ##

最後の例として、複数のイベントストリームをマージする方法を見てみましょう。

有名な「FizzBuzz」問題をもとに、こんな要件を考えてみました。

    '3'と'5'という2つのタイマーを作ります。'3'タイマーは300ミリ秒ごとに動き、'5'タイマーは
    500ミリ秒ごとに動きます。
    
    イベントの処理は次のようにします。
    a) すべてのイベントで、タイマーの番号と時刻を表示します
    b) 前回のイベントと同時に起きた場合は、'FizzBuzz'と表示します
    そうでない場合は、
    c) '3'タイマーだけが動いたら、'Fizz'と表示します
    d) '5'タイマーだけが動いたら、'Buzz'と表示します

まずは、両方の実装で使えるコードを作りましょう。

タイマーの番号と動いた時刻を記録する、汎用的なイベント型が必要です。

```fsharp
type FizzBuzzEvent = {label:int; time: DateTime}
```

そして、2つのイベントが同時かどうかを判断する関数も必要です。ここでは寛大に、50ミリ秒以内の差なら同時とみなすことにします。

```fsharp
let areSimultaneous (earlierEvent,laterEvent) =
    let {label=_;time=t1} = earlierEvent
    let {label=_;time=t2} = laterEvent
    t2.Subtract(t1).Milliseconds < 50
```

命令型の設計では、前回のイベントを覚えておく必要があります。そうすることで、イベントを比較できるからです。
また、前回のイベントがない最初の場合には、特別な処理が必要になります。

```fsharp
type ImperativeFizzBuzzHandler() =
 
    let mutable previousEvent: FizzBuzzEvent option = None
 
    let printEvent thisEvent  = 
      let {label=id; time=t} = thisEvent
      printf "[%i] %i.%03i " id t.Second t.Millisecond
      let simultaneous = previousEvent.IsSome && areSimultaneous (previousEvent.Value,thisEvent)
      if simultaneous then printfn "FizzBuzz"
      elif id = 3 then printfn "Fizz"
      elif id = 5 then printfn "Buzz"
 
    member this.handleEvent3 eventArgs =
      let event = {label=3; time=DateTime.Now}
      printEvent event
      previousEvent <- Some event
 
    member this.handleEvent5 eventArgs =
      let event = {label=5; time=DateTime.Now}
      printEvent event
      previousEvent <- Some event
```

コードがみるみる複雑になっていきますね！こんな単純な要件なのに、すでに変更可能な状態、複雑な条件分岐、特殊なケース処理が登場しています。

テストしてみましょう。

```fsharp
// クラスを作る
let handler = new ImperativeFizzBuzzHandler()

// 2つのタイマーを作って、それぞれにハンドラーを設定
let timer3 = createTimer 300 handler.handleEvent3
let timer5 = createTimer 500 handler.handleEvent5
 
// 2つのタイマーを同時に動かす
[timer3;timer5]
|> Async.Parallel
|> Async.RunSynchronously
```

確かに動きはしますが、このコードにバグがないと自信を持って言えますか？何か変更を加えたとき、うっかり壊してしまう可能性はないでしょうか？

この命令型コードの問題は、要件を分かりにくくする余計な要素がたくさんあることです。

関数型のバージョンならもっとうまくできるでしょうか？見てみましょう！

まず、各タイマーに対して2つのイベントストリームを作ります。

```fsharp
let timer3, timerEventStream3 = createTimerAndObservable 300
let timer5, timerEventStream5 = createTimerAndObservable 500
```

次に、「生の」イベントストリーム上の各イベントを、私たちのFizzBuzzイベント型に変換します。

```fsharp
// 時間イベントを適切な番号を持つFizzBuzzイベントに変換
let eventStream3  = 
   timerEventStream3  
   |> Observable.map (fun _ -> {label=3; time=DateTime.Now})

let eventStream5  = 
   timerEventStream5  
   |> Observable.map (fun _ -> {label=5; time=DateTime.Now})
```

ここで、2つのイベントが同時かどうかを確認するには、2つの異なるストリームからのイベントを何らかの方法で比較する必要があります。

実は、これは思ったより簡単です。次のような手順で行えます。

* 2つのストリームを1つにまとめる
* 続けて起きたイベントをペアにする
* そのペアが同時かどうかを調べる
* その結果に基づいて、入力ストリームを2つの新しい出力ストリームに分ける

これを実際のコードで見てみましょう。

```fsharp
// 2つのストリームをまとめる
let combinedStream = 
    Observable.merge eventStream3 eventStream5
 
// イベントのペアを作る
let pairwiseStream = 
   combinedStream |> Observable.pairwise
 
// ペアが同時かどうかでストリームを分ける
let simultaneousStream, nonSimultaneousStream = 
    pairwiseStream |> Observable.partition areSimultaneous
```


最後に、 `nonSimultaneousStream` をイベントの番号に基づいてさらに分けられます。

```fsharp
// 同時でないストリームを番号で分ける
let fizzStream, buzzStream  =
    nonSimultaneousStream  
    // イベントのペアを最初のイベントに変換
    |> Observable.map (fun (ev1,_) -> ev1)
    // イベントの番号が3かどうかで分ける
    |> Observable.partition (fun {label=id} -> id=3)
```

ここまでの流れを振り返ってみましょう。2つの元のイベントストリームから、4つの新しいストリームを作りました。

* `combinedStream` はすべてのイベントを含みます
* `simultaneousStream` は同時に起きたイベントだけを含みます
* `fizzStream` は番号が3の、同時でないイベントだけを含みます
* `buzzStream` は番号が5の、同時でないイベントだけを含みます

あとは各ストリームに動作をつけるだけです。

```fsharp
// combinedStreamからイベントを表示
combinedStream 
|> Observable.subscribe (fun {label=id;time=t} -> 
                              printf "[%i] %i.%03i " id t.Second t.Millisecond)
 
// 同時ストリームからイベントを表示
simultaneousStream 
|> Observable.subscribe (fun _ -> printfn "FizzBuzz")

// 同時でないストリームからイベントを表示
fizzStream 
|> Observable.subscribe (fun _ -> printfn "Fizz")

buzzStream 
|> Observable.subscribe (fun _ -> printfn "Buzz")
```

テストしてみましょう。

```fsharp
// 2つのタイマーを同時に動かす
[timer3;timer5]
|> Async.Parallel
|> Async.RunSynchronously
```

すべてのコードを1つにまとめると次のようになります。

```fsharp
// イベントストリームと生のObservableを作る
let timer3, timerEventStream3 = createTimerAndObservable 300
let timer5, timerEventStream5 = createTimerAndObservable 500

// 時間イベントを適切な番号を持つFizzBuzzイベントに変換
let eventStream3  = timerEventStream3  
                    |> Observable.map (fun _ -> {label=3; time=DateTime.Now})
let eventStream5  = timerEventStream5  
                    |> Observable.map (fun _ -> {label=5; time=DateTime.Now})

// 2つのストリームをまとめる
let combinedStream = 
   Observable.merge eventStream3 eventStream5
 
// イベントのペアを作る
let pairwiseStream = 
   combinedStream |> Observable.pairwise
 
// ペアが同時かどうかでストリームを分ける
let simultaneousStream, nonSimultaneousStream = 
   pairwiseStream |> Observable.partition areSimultaneous

// 同時でないストリームを番号で分ける
let fizzStream, buzzStream  =
    nonSimultaneousStream  
    // イベントのペアを最初のイベントに変換
    |> Observable.map (fun (ev1,_) -> ev1)
    // イベントの番号が3かどうかで分ける
    |> Observable.partition (fun {label=id} -> id=3)

// combinedStreamからイベントを表示
combinedStream 
|> Observable.subscribe (fun {label=id;time=t} -> 
                              printf "[%i] %i.%03i " id t.Second t.Millisecond)
 
// 同時ストリームからイベントを表示
simultaneousStream 
|> Observable.subscribe (fun _ -> printfn "FizzBuzz")

// 同時でないストリームからイベントを表示
fizzStream 
|> Observable.subscribe (fun _ -> printfn "Fizz")

buzzStream 
|> Observable.subscribe (fun _ -> printfn "Buzz")

// 2つのタイマーを同時に動かす
[timer3;timer5]
|> Async.Parallel
|> Async.RunSynchronously
```

このコードは少し長く見えるかもしれません。でも、こういう段階を踏んだアプローチは非常に分かりやすく、自己説明的です。

このスタイルには次のような利点があります。

* 実際に動かさなくても、要件を満たしていることが見て取れます。命令型のバージョンではそうはいきません。
* 設計の観点から見ると、各最終的な「出力」ストリームは単一責任の原則に従っています。
  つまり1つのことだけを行うので、それに振る舞いを関連付けるのが非常に簡単です。
* このコードには条件分岐、変更可能な状態、例外的なケースがありません。メンテナンスや変更が容易だと思います。
* デバッグが簡単です。例えば、 `simultaneousStream` の出力を「のぞき見」して、
  想定通りの内容が含まれているかを簡単に確認できます。

```fsharp
// デバッグ用コード
//simultaneousStream |> Observable.subscribe (fun e -> printfn "sim %A" e)
//nonSimultaneousStream |> Observable.subscribe (fun e -> printfn "non-sim %A" e)
```

これは命令型のバージョンでは、ずっと難しいでしょう。

## まとめ ##

関数型リアクティブプログラミング（FRPと呼ばれています）は大きなトピックで、ここではその一部に触れただけです。この入門で、このアプローチの有用性の一端を感じ取っていただけたら嬉しいです。

もっと学びたい方は、上で使った基本的な変換が含まれているF#の[Observableモジュール](https://fsharp.github.io/fsharp-core-docs/reference/fsharp-control-observablemodule.html)のドキュメントをご覧ください。
また、.NET 4の一部として提供されている[Reactive Extensions (Rx)](https://learn.microsoft.com/ja-jp/previous-versions/dotnet/reactive-extensions/hh242985%28v=vs.103%29)ライブラリもあります。これには他にもたくさんの便利な変換が含まれています。



 
