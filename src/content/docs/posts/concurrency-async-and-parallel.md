---
layout: post
title: "非同期プログラミング"
description: "Asyncクラスによるバックグラウンドタスクのカプセル化"
nav: why-use-fsharp
seriesId: "F# を使う理由"
seriesOrder: 24
categories: ["並行性"]
---

この記事では、F#で非同期コードを書くいくつかの方法と、並列処理の簡単な例も見ていきます。

## 従来の非同期プログラミング ##

前回の記事で触れたように、F#では `Thread` 、 `AutoResetEvent` 、 `BackgroundWorker` 、 `IAsyncResult` など、.NETでおなじみのものを直接使えます。

タイマーイベントが発生するのを待つ簡単な例を見てみましょう。

```fsharp
open System

let userTimerWithCallback = 
    // 待機用のイベントを作成
    let event = new System.Threading.AutoResetEvent(false)

    // タイマーを作成し、イベントを通知するイベントハンドラを追加
    let timer = new System.Timers.Timer(2000.0)
    timer.Elapsed.Add (fun _ -> event.Set() |> ignore )

    // 開始
    printfn "Waiting for timer at %O" DateTime.Now.TimeOfDay
    timer.Start()

    // 待機中に何か有用な処理を行う
    printfn "Doing something useful while waiting for event"

    // AutoResetEventを通じてタイマーをブロック
    event.WaitOne() |> ignore

    // 完了
    printfn "Timer ticked at %O" DateTime.Now.TimeOfDay
```

これは同期メカニズムとして `AutoResetEvent` を使っています。

* ラムダ式が `Timer.Elapsed` イベントに登録され、イベントが発生するとAutoResetEventが通知されます。
* メインスレッドはタイマーを開始し、待機中に他の処理を行い、その後イベントが発生するまでブロックします。
* 最後に、メインスレッドは約2秒後に続行します。

上のコードはかなり簡単ですが、AutoResetEventをインスタンス化する必要があり、
ラムダ式が正しく定義されていないとバグの原因になる可能性があります。

## 非同期ワークフローの紹介 ##

F#には「非同期ワークフロー」と呼ばれる組み込みの構造があり、非同期コードをより簡単に書けるようになっています。
これらのワークフローは、バックグラウンドタスクをカプセル化したオブジェクトで、それらを管理するための便利な操作をいくつか提供しています。

前の例を非同期ワークフローを使って書き直すとこうなります。

```fsharp
open System
//open Microsoft.FSharp.Control  // Async.*はこのモジュールにあります

let userTimerWithAsync = 

    // タイマーと関連する非同期イベントを作成
    let timer = new System.Timers.Timer(2000.0)
    let timerEvent = Async.AwaitEvent (timer.Elapsed) |> Async.Ignore

    // 開始
    printfn "Waiting for timer at %O" DateTime.Now.TimeOfDay
    timer.Start()

    // 待機中に何か有用な処理を行う
    printfn "Doing something useful while waiting for event"

    // 非同期処理が完了するのを待つことで、タイマーイベントをブロック
    Async.RunSynchronously timerEvent

    // 完了
    printfn "Timer ticked at %O" DateTime.Now.TimeOfDay
```

変更点は以下の通りです。

*  `AutoResetEvent` とラムダ式が消え、代わりに `let timerEvent = Control.Async.AwaitEvent (timer.Elapsed)` が使われています。これはラムダ式を必要とせず、イベントから直接 `async` オブジェクトを作成します。 `ignore` は結果を無視するために追加されています。
*  `event.WaitOne()` が `Async.RunSynchronously timerEvent` に置き換えられました。これは非同期オブジェクトが完了するまでブロックします。

以上です。より簡単で理解しやすくなりました。

非同期ワークフローは `IAsyncResult` 、begin/endペア、その他の標準的な.NETメソッドでも使えます。

たとえば、 `BeginWrite` から生成された `IAsyncResult` をラップして非同期ファイル書き込みを行う方法は次のようになります。

```fsharp
let fileWriteWithAsync = 

    // 書き込み用のストリームを作成
    use stream = new System.IO.FileStream("test.txt",System.IO.FileMode.Create)

    // 開始
    printfn "Starting async write"
    let asyncResult = stream.BeginWrite(Array.empty,0,0,null,null)
	
    // IAsyncResultの周りに非同期ラッパーを作成
    let async = Async.AwaitIAsyncResult(asyncResult) |> Async.Ignore

    // 待機中に何か有用な処理を行う
    printfn "Doing something useful while waiting for write to complete"

    // 非同期処理が完了するのを待つことで、タイマーをブロック
    Async.RunSynchronously async 

    // 完了
    printfn "Async write completed"
```

## 非同期ワークフローの作成とネスト ##

非同期ワークフローは手動でも作成できます。
新しいワークフローは `async` キーワードとかっこを使って作成します。
かっこ内には、バックグラウンドで実行される一連の式が含まれます。

この簡単なワークフローは2秒間スリープするだけです。

```fsharp
let sleepWorkflow  = async{
    printfn "Starting sleep workflow at %O" DateTime.Now.TimeOfDay
    do! Async.Sleep 2000
    printfn "Finished sleep workflow at %O" DateTime.Now.TimeOfDay
    }

Async.RunSynchronously sleepWorkflow  
```

*注： `do! Async.Sleep 2000` というコードは `Thread.Sleep` に似ていますが、非同期ワークフローで動作するように設計されています。*

ワークフローには、他の非同期ワークフローを内部にネストすることができます。
かっこ内で、ネストされたワークフローは `let!` 構文を使ってブロックできます。

```fsharp
let nestedWorkflow  = async{

    printfn "Starting parent"
    let! childWorkflow = Async.StartChild sleepWorkflow

    // 子に機会を与え、その後作業を続ける
    do! Async.Sleep 100
    printfn "Doing something useful while waiting "

    // 子をブロック
    let! result = childWorkflow

    // 完了
    printfn "Finished parent" 
    }

// ワークフロー全体を実行
Async.RunSynchronously nestedWorkflow  
```


## ワークフローのキャンセル  ##

非同期ワークフローの非常に便利な点の1つは、組み込みのキャンセルメカニズムをサポートしていることです。特別なコードは必要ありません。

1から100までの数字を出力する簡単なタスクを考えてみましょう。

```fsharp
let testLoop = async {
    for i in [1..100] do
        // 何かを行う
        printf "%i before.." i
        
        // 少し待つ 
        do! Async.Sleep 10  
        printfn "..after"
    }
```

通常の方法でテストできます。

```fsharp
Async.RunSynchronously testLoop
```

ここで、このタスクを途中でキャンセルしたいとします。最良の方法は何でしょうか？

C#では、フラグを作成して渡し、頻繁にチェックする必要がありますが、F#ではこの技術が `CancellationToken` クラスを使って組み込まれています。

タスクをキャンセルする例を見てみましょう。

```fsharp
open System
open System.Threading

// キャンセルソースを作成
let cancellationSource = new CancellationTokenSource()

// タスクを開始するが、今回はキャンセルトークンを渡す
Async.Start (testLoop,cancellationSource.Token)

// 少し待つ
Thread.Sleep(200)  

// 200ms後にキャンセル
cancellationSource.Cancel()
```

F#では、ネストされた非同期呼び出しは自動的にキャンセルトークンをチェックします！

この場合、それは以下の行でした。

```fsharp
do! Async.Sleep(10) 
```

出力を見ると、この行でキャンセルが発生したことがわかります。

## ワークフローの直列・並列合成 ##

非同期ワークフローの他の便利な点は、直列や並列など、様々な方法で簡単に組み合わせられることです。

まず、指定された時間だけスリープする簡単なワークフローを作成しましょう。

```fsharp
// 指定時間スリープするワークフローを作成
let sleepWorkflowMs ms = async {
    printfn "%i ms workflow started" ms
    do! Async.Sleep ms
    printfn "%i ms workflow finished" ms
    }
```

これらを直列に組み合わせたバージョンは次のようになります。

```fsharp
let workflowInSeries = async {
    let! sleep1 = sleepWorkflowMs 1000
    printfn "Finished one" 
    let! sleep2 = sleepWorkflowMs 2000
    printfn "Finished two" 
    }

#time
Async.RunSynchronously workflowInSeries 
#time
```

そして、これらを並列に組み合わせたバージョンは次のようになります。

```fsharp
// 作成
let sleep1 = sleepWorkflowMs 1000
let sleep2 = sleepWorkflowMs 2000

// 並列で実行
#time
[sleep1; sleep2] 
    |> Async.Parallel
    |> Async.RunSynchronously 
#time
```

<div class="alert alert-info">
注：#timeコマンドはタイマーのオン/オフを切り替えます。これはインタラクティブウィンドウでのみ機能するため、このサンプルを正しく動作させるにはインタラクティブウィンドウに送信する必要があります。
</div>

 `#time` オプションを使って合計経過時間を表示しています。並列で実行されるため、2秒かかります。直列で実行した場合は3秒かかるはずです。

また、両方のタスクが同時にコンソールに書き込むため、出力が乱れることがあるかもしれません！

この最後のサンプルは、「フォーク/ジョイン」アプローチの典型的な例です。複数の子タスクが生成され、親がそれらすべての完了を待ちます。
ご覧のように、F#ではこれが非常に簡単に実現できます！

## 例：非同期Webダウンローダー ##

この、より現実的な例では、既存のコードを非同期スタイルに変換する簡単さと、
それによって得られるパフォーマンスの向上を見てみましょう。

まず、シリーズの最初で見たものと非常によく似た、シンプルなURLダウンローダーがあります。

```fsharp
open System.Net
open System
open System.IO

let fetchUrl url =        
    let req = WebRequest.Create(Uri(url)) 
    use resp = req.GetResponse() 
    use stream = resp.GetResponseStream() 
    use reader = new IO.StreamReader(stream) 
    let html = reader.ReadToEnd() 
    printfn "finished downloading %s" url 
```

そして、これを時間計測するコードがあります。

```fsharp
// 取得するサイトのリスト
let sites = ["https://www.bing.com/";
             "https://www.google.com/";
             "https://www.microsoft.com/";
             "https://www.amazon.com/";
             "https://www.yahoo.com/"]

#time                     // インタラクティブタイマーをオン
sites                     // サイトのリストから開始
|> List.map fetchUrl      // 各サイトをループしてダウンロード
#time                     // タイマーをオフ
```

かかった時間をメモしておいて、改善できるか見てみましょう！

明らかに、上の例は非効率です - 一度に1つのウェブサイトしか訪問していません。すべてのサイトを同時に訪問できれば、プログラムはより高速になるでしょう。

では、これを並行アルゴリズムに変換するにはどうすればよいでしょうか？ ロジックは以下のようになります。

* ダウンロードする各Webページに対してタスクを作成し、各タスクでは以下のようなダウンロードロジックを実行します。
  * Webサイトからページのダウンロードを開始します。その間、一時停止して他のタスクに順番を譲ります。
  * ダウンロードが完了したら、起動して残りのタスクを続行します。
* 最後に、すべてのタスクを開始して実行させます！

残念ながら、これは標準的なC言語風の言語では非常に難しいです。たとえば、C#では非同期タスクが完了したときのコールバックを作成する必要があります。これらのコールバックの管理は面倒で、ロジックの理解を妨げる多くの余分なサポートコードを生成します。これに対する洗練された解決策もありますが、一般的に、C#での並行プログラミングのシグナル対ノイズ比は非常に高いです*。

<sub>* これは執筆時点での話です。将来のバージョンのC#では、F#が現在持っているものと似た `await` キーワードが導入される予定です。</sub>

しかし、予想通り、F#ではこれが簡単です。以下は、ダウンローダーコードの並行F#バージョンです。

```fsharp
open Microsoft.FSharp.Control.CommonExtensions   
                                        // AsyncGetResponseを追加

// Webページの内容を非同期に取得
let fetchUrlAsync url =        
    async {                             
        let req = WebRequest.Create(Uri(url)) 
        use! resp = req.AsyncGetResponse()  // 新しいキーワード "use!"  
        use stream = resp.GetResponseStream() 
        use reader = new IO.StreamReader(stream) 
        let html = reader.ReadToEnd() 
        printfn "finished downloading %s" url 
        }
```

新しいコードが元のコードとほぼ同じに見えることに注目してください。変更点はわずかです。

* `use resp = ` から `use! resp =` への変更は、まさに上で説明した変更です - 非同期操作が行われている間、他のタスクに順番を譲ります。
* また、 `CommonExtensions` 名前空間で定義されている拡張メソッド `AsyncGetResponse` を使っています。これは、メインのワークフロー内にネストできる非同期ワークフローを返します。
* さらに、一連のステップ全体が `async {...}` ラッパーで囲まれており、これによって非同期で実行できるブロックに変換されます。

そして、非同期バージョンを使った時間計測ダウンロードの例です。

```fsharp
// 取得するサイトのリスト
let sites = ["https://www.bing.com/";
             "https://www.google.com/";
             "https://www.microsoft.com/";
             "https://www.amazon.com/";
             "https://www.yahoo.com/"]

#time                      // インタラクティブタイマーをオン
sites 
|> List.map fetchUrlAsync  // 非同期タスクのリストを作成
|> Async.Parallel          // タスクを並列実行するよう設定
|> Async.RunSynchronously  // タスクを開始
#time                      // タイマーをオフ
```


これがどのように機能するかは次の通りです。

*  `fetchUrlAsync` が各サイトに適用されます。これはすぐにダウンロードを開始するのではなく、後で実行するための非同期ワークフローを返します。
* すべてのタスクを同時に実行するように設定するために、 `Async.Parallel` 関数を使います。
* 最後に `Async.RunSynchronously` を呼び出して、すべてのタスクを開始し、すべてが停止するのを待ちます。

このコードを自分で試してみると、非同期バージョンが同期バージョンよりもはるかに高速であることがわかるでしょう。わずかなコード変更でこれだけの成果が得られるのは素晴らしいですね！最も重要なのは、基本的なロジックがまだ非常に明確で、ノイズで乱れていないことです。


## 例：並列計算 ##

最後に、並列計算をもう一度簡単に見てみましょう。

始める前に、以下のサンプルコードは基本的な原理を示すためのものだということを警告しておきます。
この種の「おもちゃ」の並列化バージョンに対するベンチマークは意味がありません。なぜなら、実際の並行コードにはたくさんの依存関係があるからです。

さらに、並行処理は必ずしもコードの速度向上に最適な方法とは限らないことを認識しておきましょう。ほとんどの場合、アルゴリズムの改善に時間を費やす方が効果的です。
私のクイックソートの直列バージョンが、あなたのバブルソートの並列バージョンに勝つと、賭けてもいいですよ！
（パフォーマンス改善の詳細については、「[最適化シリーズ](../series/optimization.html)」を参照してください）

とはいえ、その注意点を踏まえた上で、CPUを少し使う小さなタスクを作成してみましょう。これを直列と並列でテストします。

```fsharp
let childTask() = 
    // CPUを使う 
    for i in [1..1000] do 
        for i in [1..1000] do 
            do "Hello".Contains("H") |> ignore 
            // 結果は気にしません！

// 子タスクを単独でテスト
// 必要に応じて上限を調整し
// これが約0.2秒で実行されるようにします
#time
childTask()
#time
```

これが約0.2秒で実行されるように、ループの上限を必要に応じて調整してください。

次に、これらをまとめて（合成を使って）1つの直列タスクにし、タイマーでテストしてみましょう。

```fsharp
let parentTask = 
    childTask
    |> List.replicate 20
    |> List.reduce (>>)

// テスト
#time
parentTask()
#time
```

これは約4秒かかるはずです。

ここで `childTask` を並列化可能にするために、 `async` でラップする必要があります。

```fsharp
let asyncChildTask = async { return childTask() }
```

そして、複数の非同期を1つの並列タスクにまとめるには、 `Async.Parallel` を使います。

これをテストして、タイミングを比較してみましょう。

```fsharp
let asyncParentTask = 
    asyncChildTask
    |> List.replicate 20
    |> Async.Parallel

// テスト
#time
asyncParentTask 
|> Async.RunSynchronously
#time
```

デュアルコアマシンでは、並列バージョンは約50％高速です。もちろん、コアやCPUの数に応じて速くなりますが、それは非線形的です。4コアは1コアよりも高速ですが、4倍速くはなりません。

一方で、非同期Webダウンロードの例と同様に、わずかなコード変更で大きな違いを生み出すことができ、しかもコードは読みやすく理解しやすいままです。したがって、並列処理が本当に役立つ場合に備えて、簡単に実現できると知っておくのは良いことです。


