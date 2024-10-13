---
layout: post
title: "メッセージとエージェント"
description: "並行処理を考えやすくする"
nav: why-use-fsharp
seriesId: "F# を使う理由"
seriesOrder: 25
categories: ["並行処理"]
---

この記事では、並行処理のためのメッセージベース（またはアクターベース）アプローチについて見ていきます。

このアプローチでは、あるタスクが別のタスクと通信したい場合、直接接触するのではなく、メッセージを送ります。メッセージはキューに入れられ、受信側のタスク（「アクター」または「エージェント」として知られる）がキューからメッセージを1つずつ取り出して処理します。

このメッセージベースのアプローチは、低レベルのネットワークソケット（TCP/IPを基盤とする）から企業全体のアプリケーション統合システム（たとえばMSMQやIBM WebSphere MQ）まで、多くの状況に適用されてきました。

ソフトウェア設計の観点から見ると、メッセージベースのアプローチには以下のような利点があります。

* ロックを使わずに共有データやリソースを管理できます。
* 各エージェントを1つのことだけを行うように設計できるため、「単一責任の原則」を簡単に守ることができます。
* 「パイプライン」モデルのプログラミングを促進します。このモデルでは、「プロデューサー」が「コンシューマー」にメッセージを送ります。プロデューサーとコンシューマーは互いに独立しており、直接的な結合がありません。このアプローチには以下のような追加の利点があります。
  * キューがバッファとして機能し、クライアント側の待機をなくします。
  * スループットを最大化するために、必要に応じてキューの片側または両側を簡単にスケールアップできます。
  * 分離によってエージェントがクライアントに影響を与えずに作成・破棄できるため、エラーを優雅に処理できます。

実際に開発を行う立場から見ると、メッセージベースのアプローチで最も魅力的なのは、任意のアクターのコードを書く際に、並行性について頭を悩ませる必要がないことです。メッセージキューは、並行して発生する可能性のある操作を「直列化」します。そしてこれにより、メッセージ処理のロジックについて考え（そしてコードを書く）ことがずっと簡単になります。なぜなら、あなたのコードが他のイベントからの割り込みから隔離されることを確信できるからです。

これらの利点を考えれば、Ericssonの社内チームが高度に並行な電話アプリケーションを書くためのプログラミング言語を設計しようとしたとき、メッセージベースのアプローチを採用したErlangを作ったのも不思議ではありません。Erlangは今やこのトピック全体の代表例となっています。そして、他の言語でも同様のアプローチを実装することへの関心を大いに高めているのです。

## F#がメッセージベースのアプローチを実装する方法 ##

F#には `MailboxProcessor` と呼ばれる組み込みのエージェントクラスがあります。これらのエージェントはスレッドと比べて非常に軽量で、同時に数万個をインスタンス化できます。

これらはErlangのエージェントに似ていますが、Erlangのものとは異なり、プロセスの境界を越えては動作せず、同じプロセス内でのみ機能します。
また、MSMQのような重量級のキューイングシステムとは異なり、メッセージは永続化されません。アプリがクラッシュすると、メッセージは失われます。

しかし、これらは些細な問題で、回避することができます。将来のシリーズでは、メッセージキューの代替実装について詳しく説明します。基本的なアプローチはすべての場合で同じです。

F#での簡単なエージェント実装を見てみましょう。

```fsharp

#nowarn "40"
let printerAgent = MailboxProcessor.Start(fun inbox-> 

    // メッセージ処理関数
    let rec messageLoop = async{
        
        // メッセージを読み取る
        let! msg = inbox.Receive()
        
        // メッセージを処理する
        printfn "message is: %s" msg

        // ループの先頭に戻る
        return! messageLoop  
        }

    // ループを開始する 
    messageLoop 
    )

```

 `MailboxProcessor.Start` 関数は単純な関数パラメータを取ります。その関数は永久にループし、キュー（または「受信トレイ」）からメッセージを読み取って処理します。

*注：警告「FS0040」を避けるために `#nowarn "40"` プラグマを追加しました。この場合、安全に無視できます。*

以下は使用例です。

```fsharp
// テスト
printerAgent.Post "hello" 
printerAgent.Post "hello again" 
printerAgent.Post "hello a third time" 
```

この記事の残りの部分では、もう少し有用な2つの例を見ていきます。

* ロックを使わない共有状態の管理
* 共有IOへの直列化されバッファリングされたアクセス

これらの両方のケースで、並行処理に対するメッセージベースのアプローチは優雅で、効率的で、プログラミングが簡単です。

## 共有状態の管理 ##

まず、共有状態の問題を見てみましょう。

よくあるシナリオは、複数の並行タスクやスレッドによってアクセスされ変更される必要のある状態があることです。
非常に単純なケースを使い、要件は以下のようだとしましょう。

* 複数のタスクが同時に増加させることができる共有の「カウンター」と「合計」。
* カウンターと合計の変更は原子的でなければならない - 両方が同時に更新されることを保証する必要があります。

### 共有状態に対するロックアプローチ ###

これらの要件に対する一般的な解決策はロックやミューテックスを使うことです。そこで、ロックを使うコードを書いて、どのように動作するか見てみましょう。

まず、状態をロックで保護する静的な `LockedCounter` クラスを書きましょう。

```fsharp
open System
open System.Threading
open System.Diagnostics

// ユーティリティ関数
type Utility() = 
    static let rand = new Random()
    
    static member RandomSleep() = 
        let ms = rand.Next(1,10)
        Thread.Sleep ms

// ロックを使った共有カウンターの実装
type LockedCounter () = 

    static let _lock = new Object()

    static let mutable count = 0
    static let mutable sum = 0

    static let updateState i = 
        // カウンターを増加させ...
        sum <- sum + i
        count <- count + 1
        printfn "Count is: %i. Sum is: %i" count sum 

        // ...短い遅延をエミュレート
        Utility.RandomSleep()


    // 状態を隠すパブリックインターフェース
    static member Add i = 
        // クライアントの待機時間を計測
        let stopwatch = new Stopwatch()
        stopwatch.Start() 

        // ロック開始。C#のlock{...}と同じ
        lock _lock (fun () ->
        
            // 待機時間を確認
            stopwatch.Stop()
            printfn "Client waited %i" stopwatch.ElapsedMilliseconds

            // コアロジックを実行
            updateState i 
            )
        // ロック解放
```

このコードに関する注意点はこちらです。

* このコードは、可変変数とロックを使った非常に命令型のアプローチで書かれています。
* パブリックの `Add` メソッドには、ロックの取得と解放のために明示的な `Monitor.Enter` と `Monitor.Exit` 式があります。これはC#の `lock{...}` 文と同じです。
* クライアントがロックを取得するのにどれくらい待つ必要があるかを計測するために、ストップウォッチも追加しました。
* コアの「ビジネスロジック」は `updateState` メソッドで、状態を更新するだけでなく、処理にかかる時間をエミュレートするために小さなランダムな待機も追加しています。

単独でテストしてみましょう。

```fsharp
// 単独でテスト
LockedCounter.Add 4
LockedCounter.Add 5
```

次に、カウンターにアクセスしようとするタスクを作成します。

```fsharp
let makeCountingTask addFunction taskId  = async {
    let name = sprintf "Task%i" taskId
    for i in [1..3] do 
        addFunction i
    }

// 単独でテスト
let task = makeCountingTask LockedCounter.Add 1
Async.RunSynchronously task
```

この場合、競合がまったくない場合、待機時間はすべて0です。

しかし、10個の子タスクを作成して、すべてが同時にカウンターにアクセスしようとするとどうなるでしょうか？

```fsharp
let lockedExample5 = 
    [1..10]
        |> List.map (fun i -> makeCountingTask LockedCounter.Add i)
        |> Async.Parallel
        |> Async.RunSynchronously
        |> ignore
```

おや！ほとんどのタスクがかなり長い時間待っています。2つのタスクが同時に状態を更新しようとすると、一方が他方の作業が完了するのを待ってから自分の作業を行う必要があり、これがパフォーマンスに影響します。

そして、タスクを増やせば増やすほど、競合が増加し、タスクは作業よりも待機に多くの時間を費やすことになります。

### 共有状態に対するメッセージベースのアプローチ ###

メッセージキューがどのように役立つか見てみましょう。以下がメッセージベースのバージョンです。

```fsharp
type MessageBasedCounter () = 

    static let updateState (count,sum) msg = 

        // カウンターを増加させ...
        let newSum = sum + msg
        let newCount = count + 1
        printfn "Count is: %i. Sum is: %i" newCount newSum 

        // ...短い遅延をエミュレート
        Utility.RandomSleep()

        // 新しい状態を返す
        (newCount,newSum)

    // エージェントを作成
    static let agent = MailboxProcessor.Start(fun inbox -> 

        // メッセージ処理関数
        let rec messageLoop oldState = async{

            // メッセージを読み取る
            let! msg = inbox.Receive()

            // コアロジックを実行
            let newState = updateState oldState msg

            // ループの先頭に戻る
            return! messageLoop newState 
            }

        // ループを開始
        messageLoop (0,0)
        )

    // 実装を隠すパブリックインターフェース
    static member Add i = agent.Post i
```

このコードに関する注意点はこちらです。

* コアの「ビジネスロジック」は再び `updateState` メソッドにありますが、状態が不変なので、新しい状態が作成されてメインループに返される点を除いて、先ほどの例とほぼ同じ実装です。
* エージェントはメッセージ（この場合は単純なint）を読み取り、 `updateState` メソッドを呼び出します。
* パブリックメソッド `Add` は `updateState` メソッドを直接呼び出す代わりに、エージェントにメッセージを投稿します。
* このコードはより関数型の方法で書かれています。可変変数やロックはどこにもありません。実際、並行性を扱うコードはまったくありません！
コードはビジネスロジックにのみ焦点を当てればよく、結果としてずっと理解しやすくなっています。

単独でテストしてみましょう。

```fsharp
// 単独でテスト
MessageBasedCounter.Add 4
MessageBasedCounter.Add 5
```

次に、先ほど定義したタスクを再利用しますが、今回は `MessageBasedCounter.Add` を呼び出します。

```fsharp
let task = makeCountingTask MessageBasedCounter.Add 1
Async.RunSynchronously task
```

最後に、5つの子タスクを作成して、同時にカウンターにアクセスしようとしてみましょう。

```fsharp
let messageExample5 = 
    [1..5]
        |> List.map (fun i -> makeCountingTask MessageBasedCounter.Add i)
        |> Async.Parallel
        |> Async.RunSynchronously
        |> ignore
```

クライアントの待機時間を測定することはできません。なぜなら、待機時間がないからです！

## 共有IO ##

ファイルなどの共有IOリソースにアクセスする際にも、同様の並行性の問題が発生します。

* IOが遅い場合、ロックがなくてもクライアントは多くの時間を待機に費やす可能性があります。
* 複数のスレッドが同時にリソースに書き込むと、データが破損する可能性があります。

これらの問題は両方とも、非同期呼び出しとバッファリングを組み合わせることで解決できます - これはまさにメッセージキューが行うことです。

次の例では、多くのクライアントが同時に書き込むロギングサービスの例を考えてみましょう。
（この単純なケースでは、直接コンソールに書き込むだけです。）

まず、並行性制御のない実装を見て、次にすべてのリクエストを直列化するためにメッセージキューを使う実装を見てみましょう。

### 直列化のないIO ###

破損を非常に明確で再現可能にするために、まず「遅い」コンソールを作成しましょう。これはログメッセージの各文字を個別に書き込み、
各文字の間に1ミリ秒の一時停止を入れます。その1ミリ秒の間に、別のスレッドが書き込みを行う可能性があり、
メッセージの望ましくない混在が発生する可能性があります。

```fsharp
let slowConsoleWrite msg = 
    msg |> String.iter (fun ch->
        System.Threading.Thread.Sleep(1)
        System.Console.Write ch
        )

// 単独でテスト
slowConsoleWrite "abc"
```

次に、数回ループして毎回ロガーに自分の名前を書き込む単純なタスクを作成します。

```fsharp
let makeTask logger taskId = async {
    let name = sprintf "Task%i" taskId
    for i in [1..3] do 
        let msg = sprintf "-%s:Loop%i-" name i
        logger msg 
    }

// 単独でテスト
let task = makeTask slowConsoleWrite 1
Async.RunSynchronously task
```


次に、遅いコンソールへのアクセスをカプセル化するロギングクラスを書きます。これにはロックや直列化がなく、基本的にスレッドセーフではありません。

```fsharp
type UnserializedLogger() = 
    // インターフェース
    member this.Log msg = slowConsoleWrite msg

// 単独でテスト
let unserializedLogger = UnserializedLogger()
unserializedLogger.Log "hello"
```

では、これらすべてを実際の例に組み合わせてみましょう。5つの子タスクを作成し、それらを並列で実行し、すべてが遅いコンソールに書き込もうとします。

```fsharp
let unserializedExample = 
    let logger = new UnserializedLogger()
    [1..5]
        |> List.map (fun i -> makeTask logger.Log i)
        |> Async.Parallel
        |> Async.RunSynchronously
        |> ignore
```

おっと！出力が非常に乱れています！

### メッセージによる直列化されたIO ###

では、 `UnserializedLogger` をメッセージキューをカプセル化した `SerializedLogger` クラスに置き換えるとどうなるでしょうか。

 `SerializedLogger` 内のエージェントは、単に入力キューからメッセージを読み取り、遅いコンソールに書き込みます。ここでも並行性を扱うコードはなく、ロックは使われていません。

```fsharp
type SerializedLogger() = 

    // メールボックスプロセッサを作成
    let agent = MailboxProcessor.Start(fun inbox -> 

        // メッセージ処理関数
        let rec messageLoop () = async{

            // メッセージを読み取る
            let! msg = inbox.Receive()

            // ログに書き込む
            slowConsoleWrite msg

            // ループの先頭に戻る
            return! messageLoop ()
            }

        // ループを開始
        messageLoop ()
        )

    // パブリックインターフェース
    member this.Log msg = agent.Post msg

// 単独でテスト
let serializedLogger = SerializedLogger()
serializedLogger.Log "hello"
```

これで、先ほどの直列化されていない例を繰り返すことができますが、今回は `SerializedLogger` を使います。再び、5つの子タスクを作成し、並列で実行します。

```fsharp
let serializedExample = 
    let logger = new SerializedLogger()
    [1..5]
        |> List.map (fun i -> makeTask logger.Log i)
        |> Async.Parallel
        |> Async.RunSynchronously
        |> ignore
```

なんという違いでしょう！今回の出力は完璧です。

## まとめ ##

このメッセージベースのアプローチについては、まだまだ話すことがたくさんあります。将来のシリーズでは、以下のようなトピックについて、より詳細に説明したいと思います。

* MSMQやTPL Dataflowを使ったメッセージキューの代替実装。
* キャンセルと帯域外メッセージ。
* エラー処理と再試行、および一般的な例外処理。
* 子エージェントの作成や削除によってスケールアップ・ダウンする方法。
* バッファオーバーランの回避と、飢餓状態や不活性の検出。

