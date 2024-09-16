---
layout: post
title: "タートルを見る13の方法（パート2）"
description: "イベントソーシング、FRP、モナディック制御フロー、インタープリターの例を続けます。"
categories: [パターン]
---

> この投稿は[2015年英語版F#アドベントカレンダー](https://sergeytihon.wordpress.com/2015/10/25/f-advent-calendar-in-english-2015/)プロジェクトの一部です。
> 他の素晴らしい投稿もぜひチェックしてください！また、このプロジェクトを企画してくれたSergey Tihonに特別な感謝を。

この2部構成の大型投稿では、シンプルなタートルグラフィックスモデルを極限まで拡張しながら、部分適用、バリデーション、「リフティング」の概念、
メッセージキューを持つエージェント、依存性注入、Stateモナド、イベントソーシング、ストリーム処理、そしてインタープリターを実演します！

[前回の投稿](../posts/13-ways-of-looking-at-a-turtle.md)では、タートルを見る最初の9つの方法を紹介しました。今回は残りの4つを見ていきます。

おさらいとして、13の方法を挙げておきます：

* [方法1. 基本的なオブジェクト指向アプローチ](../posts/13-ways-of-looking-at-a-turtle.md#way1)：可変状態を持つクラスを作ります。
* [方法2. 基本的な関数型アプローチ](../posts/13-ways-of-looking-at-a-turtle.md#way2)：不変の状態を持つ関数のモジュールを作ります。
* [方法3. オブジェクト指向のコアを持つAPI](../posts/13-ways-of-looking-at-a-turtle.md#way3)：状態を持つコアクラスを呼び出すオブジェクト指向APIを作ります。
* [方法4. 関数型のコアを持つAPI](../posts/13-ways-of-looking-at-a-turtle.md#way4)：状態を持たないコア関数を使う状態を持つAPIを作ります。
* [方法5. エージェントの前面にあるAPI](../posts/13-ways-of-looking-at-a-turtle.md#way5)：エージェントと通信するためのメッセージキューを使うAPIを作ります。
* [方法6. インターフェースを使った依存性注入](../posts/13-ways-of-looking-at-a-turtle.md#way6)：インターフェースまたは関数のレコードを使って実装をAPIから分離します。
* [方法7. 関数を使った依存性注入](../posts/13-ways-of-looking-at-a-turtle.md#way7)：関数パラメータを渡すことで実装をAPIから分離します。
* [方法8. Stateモナドを使ったバッチ処理](../posts/13-ways-of-looking-at-a-turtle.md#way8)：状態を追跡するための特別な「タートルワークフロー」コンピュテーション式を作ります。
* [方法9. コマンドオブジェクトを使ったバッチ処理](../posts/13-ways-of-looking-at-a-turtle.md#way9)：タートルコマンドを表す型を作り、コマンドのリストを一括処理します。
* [間奏：データ型を使った意識的な分離](../posts/13-ways-of-looking-at-a-turtle.md#decoupling)。データまたはインターフェースを使った分離に関するメモ。
* [方法10. イベントソーシング](../posts/13-ways-of-looking-at-a-turtle-2.md#way10)：過去のイベントのリストから状態を構築します。
* [方法11. 関数型リアクティブプログラミング（ストリーム処理）](../posts/13-ways-of-looking-at-a-turtle-2.md#way11)：ビジネスロジックが以前のイベントに反応することに基づいています。
* [エピソードV：タートルの逆襲](../posts/13-ways-of-looking-at-a-turtle-2.md#strikes-back)：タートルAPIが変更され、一部のコマンドが失敗する可能性がでてきます。
* [方法12. モナディック制御フロー](../posts/13-ways-of-looking-at-a-turtle-2.md#way12)：以前のコマンドの結果に基づいてタートルワークフロー内で決定を行います。
* [方法13. タートルインタープリター](../posts/13-ways-of-looking-at-a-turtle-2.md#way13)：タートルのプログラミングとタートルの実装を完全に分離し、フリーモナドに近づきます。
* [使用したテクニックの再確認](../posts/13-ways-of-looking-at-a-turtle-2.md#review)。

拡大版には、おまけの方法が2つあります。

* [方法14. 抽象データタートル](../posts/13-ways-of-looking-at-a-turtle-3.md#way14)：抽象データ型を使ってタートル実装の詳細をカプセル化します。
* [方法15. ケイパビリティベースのタートル](../posts/13-ways-of-looking-at-a-turtle-3.md#way15)：タートルの現在の状態に基づいて、
クライアントが使えるタートル関数を制御します。

タートルの上にタートル、その上にまたタートル！

この投稿のすべてのソースコードは[GitHub](https://github.com/swlaschin/13-ways-of-looking-at-a-turtle)で入手できます。

<hr>

<a id="way10"></a>

## 10: イベントソーシング - 過去のイベントのリストから状態を構築する

このデザインでは、[エージェント（方法5）](../posts/13-ways-of-looking-at-a-turtle.md#way5)と[バッチ（方法9）](../posts/13-ways-of-looking-at-a-turtle.md#way9)アプローチで使用した「コマンド」の概念を基に、
状態を更新する方法として「コマンド」を「イベント」に置き換えます。

動作の仕組みは次のとおりです：

* クライアントが`Command`を`CommandHandler`に送ります。
* `CommandHandler`は、`Command`を処理する前に、
  まずその特定のタートルに関連する過去のイベントを使って現在の状態を一から再構築します。
* `CommandHandler`はコマンドを検証し、現在の（再構築された）状態に基づいて何をするかを決めます。
  （場合によっては空の）イベントのリストを生成します。
* 生成されたイベントは、次のコマンドで使うために`EventStore`に保存されます。

![](../assets/img/turtle-event-source.png)

このようにして、クライアントもコマンドハンドラも状態を追跡する必要がありません。`EventStore`だけが可変です。

### CommandとEvent型

イベントソーシングシステムに関連する型の定義から始めましょう。まず、コマンドに関連する型です：

```fsharp
type TurtleId = System.Guid

/// タートルに対する望ましいアクション
type TurtleCommandAction = 
    | Move of Distance 
    | Turn of Angle
    | PenUp 
    | PenDown 
    | SetColor of PenColor

/// 特定のタートルに向けられた望ましいアクションを表すコマンド
type TurtleCommand = {
    turtleId : TurtleId
    action : TurtleCommandAction 
    }
```

コマンドは`TurtleId`を使って特定のタートルに向けられています。

次に、コマンドから生成される2種類のイベントを定義します：

* 状態の変化を表す`StateChangedEvent`
* タートルの動きの開始位置と終了位置を表す`MovedEvent`

```fsharp
/// 発生した状態変化を表すイベント
type StateChangedEvent = 
    | Moved of Distance 
    | Turned of Angle
    | PenWentUp 
    | PenWentDown 
    | ColorChanged of PenColor

/// 発生した移動を表すイベント
/// これはキャンバス上の線描画アクティビティに簡単に変換できます
type MovedEvent = {
    startPos : Position 
    endPos : Position 
    penColor : PenColor option
    }

/// 可能なすべてのイベントの共用体
type TurtleEvent = 
    | StateChangedEvent of StateChangedEvent
    | MovedEvent of MovedEvent
```

イベントソーシングの重要な部分として、すべてのイベントは過去形でラベル付けされています：`Move`と`Turn`ではなく`Moved`と`Turned`です。イベントは事実です - 過去に起こったことを表します。

### コマンドハンドラ

次のステップは、コマンドをイベントに変換する関数を定義することです。

以下が必要になります：

* 以前のイベントから状態を更新する（プライベートな）`applyEvent`関数。
* コマンドと状態に基づいて、生成するイベントを決める（プライベートな）`eventsFromCommand`関数。
* コマンドを処理し、イベントストアからイベントを読み取り、他の2つの関数を呼び出す公開`commandHandler`関数。

これが`applyEvent`です。[以前のバッチ処理の例](../posts/13-ways-of-looking-at-a-turtle.md#way9)で見た`applyCommand`関数とよく似ています。

```fsharp
/// 現在の状態にイベントを適用し、タートルの新しい状態を返す
let applyEvent log oldState event =
    match event with
    | Moved distance ->
        Turtle.move log distance oldState 
    | Turned angle ->
        Turtle.turn log angle oldState 
    | PenWentUp ->
        Turtle.penUp log oldState 
    | PenWentDown ->
        Turtle.penDown log oldState 
    | ColorChanged color ->
        Turtle.setColor log color oldState 
```

`eventsFromCommand`関数には、コマンドを検証してイベントを作成するための主要なロジックが含まれています。

* このデザインでは、コマンドは常に有効なので、少なくとも1つのイベントが返されます。
* `StateChangedEvent`は`TurtleCommand`から、ケースの一対一のマッピングで直接作成されます。
* `MovedEvent`は、タートルが位置を変更した場合にのみ`TurtleCommand`から作成されます。

```fsharp
// コマンドと状態に基づいて、生成するイベントを決める
let eventsFromCommand log command stateBeforeCommand =

    // --------------------------
    // TurtleCommandからStateChangedEventを作成する
    let stateChangedEvent = 
        match command.action with
        | Move dist -> Moved dist
        | Turn angle -> Turned angle
        | PenUp -> PenWentUp 
        | PenDown -> PenWentDown 
        | SetColor color -> ColorChanged color

    // --------------------------
    // 新しいイベントから現在の状態を計算する
    let stateAfterCommand = 
        applyEvent log stateBeforeCommand stateChangedEvent

    // --------------------------
    // MovedEventを作成する 
    let startPos = stateBeforeCommand.position 
    let endPos = stateAfterCommand.position 
    let penColor = 
        if stateBeforeCommand.penState=Down then
            Some stateBeforeCommand.color
        else
            None                        

    let movedEvent = {
        startPos = startPos 
        endPos = endPos 
        penColor = penColor
        }

    // --------------------------
    // イベントのリストを返す
    if startPos <> endPos then
        // タートルが移動した場合、stateChangedEventとmovedEventの両方を
        // 共通のTurtleEvent型にリフトして返す
        [ StateChangedEvent stateChangedEvent; MovedEvent movedEvent]                
    else
        // タートルが移動していない場合、stateChangedEventのみを返す
        [ StateChangedEvent stateChangedEvent]    
```

最後に、`commandHandler`が公開インターフェースです。これにはいくつかの依存関係がパラメータとして渡されます：ロギング関数、イベントストアから履歴イベントを取得する関数、
新しく生成されたイベントをイベントストアに保存する関数です。

```fsharp
/// タートルIDのStateChangedEventsを取得する関数を表す型
/// 最も古いイベントが最初に来る
type GetStateChangedEventsForId =
     TurtleId -> StateChangedEvent list

/// TurtleEventを保存する関数を表す型
type SaveTurtleEvent = 
    TurtleId -> TurtleEvent -> unit

/// メイン関数：コマンドを処理する
let commandHandler 
    (log:string -> unit) 
    (getEvents:GetStateChangedEventsForId) 
    (saveEvent:SaveTurtleEvent) 
    (command:TurtleCommand) =

    /// まずイベントストアからすべてのイベントを読み込む
    let eventHistory = 
        getEvents command.turtleId
    
    /// 次に、コマンド前の状態を再作成する
    let stateBeforeCommand = 
        let nolog = ignore // 状態再作成時にはログを取らない
        eventHistory 
        |> List.fold (applyEvent nolog) Turtle.initialTurtleState
    
    /// コマンドとstateBeforeCommandからイベントを構築する
    /// この部分では提供されたロガーを使う
    let events = eventsFromCommand log command stateBeforeCommand 
    
    // イベントをイベントストアに保存する
    events |> List.iter (saveEvent command.turtleId)
```

### コマンドハンドラの呼び出し

これでイベントをコマンドハンドラに送信する準備ができました。

まず、コマンドを作成するヘルパー関数が必要です：

```fsharp
// 標準アクションのコマンドバージョン   
let turtleId = System.Guid.NewGuid()
let move dist = {turtleId=turtleId; action=Move dist} 
let turn angle = {turtleId=turtleId; action=Turn angle} 
let penDown = {turtleId=turtleId; action=PenDown} 
let penUp = {turtleId=turtleId; action=PenUp} 
let setColor color = {turtleId=turtleId; action=SetColor color} 
```

そして、様々なコマンドをコマンドハンドラに送信して図形を描くことができます：

```fsharp
let drawTriangle() = 
    let handler = makeCommandHandler()
    handler (move 100.0)
    handler (turn 120.0<Degrees>)
    handler (move 100.0)
    handler (turn 120.0<Degrees>)
    handler (move 100.0)
    handler (turn 120.0<Degrees>)
```

注：コマンドハンドラやイベントストアの作成方法は示していません。詳細はコードを参照してください。

### イベントソーシングの利点と欠点

*利点*

* すべてのコードがステートレスなので、テストが容易です。
* イベントの再生をサポートします。

*欠点*

* CRUDアプローチよりも実装が複雑になる可能性があります（少なくとも、ツールやライブラリのサポートが少ないです）。
* 注意しないと、コマンドハンドラが過度に複雑になり、多くのビジネスロジックを実装してしまう可能性があります。


*このバージョンのソースコードは[こちら](https://github.com/swlaschin/13-ways-of-looking-at-a-turtle/blob/master/10-EventSourcing.fsx)で入手できます。*

<hr>

<a id="way11"></a>

## 11: 関数型リアクティブプログラミング（ストリーム処理）

上記のイベントソーシングの例では、すべてのドメインロジック（この場合は単に状態をトレースするだけ）がコマンドハンドラに組み込まれています。これの欠点の1つは、
アプリケーションが進化するにつれて、コマンドハンドラのロジックが非常に複雑になる可能性があることです。

これを回避する方法の1つは、「[関数型リアクティブプログラミング](https://en.wikipedia.org/wiki/Functional_reactive_programming)」とイベントソーシングを組み合わせて、
イベントストアから発信されるイベント（"シグナル"）をリッスンすることで、"読み取り側"でドメインロジックを実行するデザインを作成することです。

このアプローチでは、"書き込み側"はイベントソーシングの例と同じパターンに従います。
クライアントが`Command`を`commandHandler`に送信し、それをイベントのリストに変換して`EventStore`に保存します。

しかし、`commandHandler`は最小限の作業（状態の更新など）しか行わず、複雑なドメインロジックは実行しません。
複雑なロジックは、イベントストリームをサブスクライブする1つ以上のダウンストリーム"プロセッサ"（"アグリゲータ"とも呼ばれます）によって実行されます。

![](../assets/img/turtle-frp.png)

これらのイベントをプロセッサへの"コマンド"と考えることもでき、もちろん、プロセッサは別のプロセッサが消費する新しいイベントを生成できるので、
このアプローチは、アプリケーションがイベントストアによってリンクされたコマンドハンドラのセットで構成されるアーキテクチャスタイルに拡張できます。

この手法は「[ストリーム処理](https://www.confluent.io/blog/making-sense-of-stream-processing/)」とよく呼ばれます。
しかし、Jessica Kerrはこのアプローチを「[関数型レトロアクティブプログラミング](https://x.com/jessitron/status/408554836578537472)」と呼んでいました - 気に入ったので、この名前を借用します！

![](../assets/img/turtle-stream-processor.png)

### デザインの実装

この実装では、`commandHandler`関数はイベントソーシングの例と同じですが、作業（ただのログ記録！）がまったく行われません。コマンドハンドラは状態を再構築し、
イベントを生成するだけです。イベントをビジネスロジックにどう使うかは、もはやその範囲外です。

新しい部分はプロセッサの作成です。

しかし、プロセッサを作成する前に、イベントストアのフィードをフィルタリングして、タートル固有のイベントのみを含め、
そのうち`StateChangedEvent`または`MovedEvent`のみを選択するヘルパー関数が必要です。

```fsharp
// TurtleEventのみを選択するフィルター
let turtleFilter ev = 
    match box ev with
    | :? TurtleEvent as tev -> Some tev
    | _ -> None

// TurtleEventからMovedEventのみを選択するフィルター
let moveFilter = function 
    | MovedEvent ev -> Some ev
    | _ -> None

// TurtleEventからStateChangedEventのみを選択するフィルター
let stateChangedEventFilter = function 
    | StateChangedEvent ev -> Some ev
    | _ -> None
```

では、移動イベントをリッスンし、仮想タートルが移動したときに物理的なタートルを動かすプロセッサを作成しましょう。 

入力をプロセッサに`IObservable`（イベントストリーム）にして、`EventStore`などの特定のソースに結合しないようにします。
アプリケーションの設定時に`EventStore`の "save" イベントをこのプロセッサに接続します。

```fsharp
/// 物理的にタートルを動かす
let physicalTurtleProcessor (eventStream:IObservable<Guid*obj>) =

    // オブザーバブルからの入力を処理する関数
    let subscriberFn (ev:MovedEvent) =
        let colorText = 
            match ev.penColor with
            | Some color -> sprintf "%A色の線" color
            | None -> "線なし"
        printfn "[タートル]: (%0.2f,%0.2f)から(%0.2f,%0.2f)に%sで移動" 
            ev.startPos.x ev.startPos.y ev.endPos.x ev.endPos.y colorText 

    // すべてのイベントから始める
    eventStream
    // ストリームをTurtleEventだけにフィルタリング
    |> Observable.choose (function (id,ev) -> turtleFilter ev)
    // MovedEventだけにフィルタリング
    |> Observable.choose moveFilter
    // これらを処理
    |> Observable.subscribe subscriberFn
```

この場合、単に移動を出力しているだけです - [実際のレゴマインドストームタートル](https://www.youtube.com/watch?v=pcJHLClDKVw)の構築は読者の課題としておきます！

グラフィックスディスプレイに線を描くプロセッサも作成しましょう：

```fsharp
/// グラフィックスデバイスに線を描く
let graphicsProcessor (eventStream:IObservable<Guid*obj>) =

    // オブザーバブルからの入力を処理する関数
    let subscriberFn (ev:MovedEvent) =
        match ev.penColor with
        | Some color -> 
            printfn "[グラフィックス]: (%0.2f,%0.2f)から(%0.2f,%0.2f)に%A色で線を描く" 
                ev.startPos.x ev.startPos.y ev.endPos.x ev.endPos.y color
        | None -> 
            ()  // 何もしない

    // すべてのイベントから始める
    eventStream
    // ストリームをTurtleEventだけにフィルタリング
    |> Observable.choose (function (id,ev) -> turtleFilter ev)
    // MovedEventだけにフィルタリング
    |> Observable.choose moveFilter
    // これらを処理
    |> Observable.subscribe subscriberFn 
```
       
最後に、移動した総距離を累積して、使用したインクの量を追跡するプロセッサを作成しましょう。 

```fsharp
/// "moved"イベントをリッスンし、それらを集計して
/// 使用したインクの総量を追跡する
let inkUsedProcessor (eventStream:IObservable<Guid*obj>) =

    // 新しいイベントが発生したときに、これまでの移動距離の合計を累積する
    let accumulate distanceSoFar (ev:StateChangedEvent) =
        match ev with
        | Moved dist -> 
            distanceSoFar + dist 
        | _ -> 
            distanceSoFar 

    // オブザーバブルからの入力を処理する関数
    let subscriberFn distanceSoFar  =
        printfn "[使用インク]: %0.2f" distanceSoFar  

    // すべてのイベントから始める
    eventStream
    // ストリームをTurtleEventだけにフィルタリング
    |> Observable.choose (function (id,ev) -> turtleFilter ev)
    // StateChangedEventだけにフィルタリング
    |> Observable.choose stateChangedEventFilter
    // 総距離を累積
    |> Observable.scan accumulate 0.0
    // これらを処理
    |> Observable.subscribe subscriberFn 
```

このプロセッサは`Observable.scan`を使って、イベントを単一の値（移動した総距離）に累積しています。

### プロセッサの実践

これらを試してみましょう！

例えば、`drawTriangle`はこのようになります：

```fsharp
let drawTriangle() = 
    // 古いイベントをクリア
    eventStore.Clear turtleId   

    // IEventからイベントストリームを作成
    let eventStream = eventStore.SaveEvent :> IObservable<Guid*obj>

    // プロセッサを登録
    use physicalTurtleProcessor = EventProcessors.physicalTurtleProcessor eventStream 
    use graphicsProcessor = EventProcessors.graphicsProcessor eventStream 
    use inkUsedProcessor = EventProcessors.inkUsedProcessor eventStream 

    let handler = makeCommandHandler
    handler (move 100.0)
    handler (turn 120.0<Degrees>)
    handler (move 100.0)
    handler (turn 120.0<Degrees>)
    handler (move 100.0)
    handler (turn 120.0<Degrees>)
```

`eventStore.SaveEvent`がプロセッサにパラメータとして渡される前に`IObservable<Guid*obj>`（つまりイベントストリーム）にキャストされていることに注意してください。

`drawTriangle`は以下の出力を生成します：

```text
[使用インク]: 100.00
[タートル  ]: (0.00,0.00)から(100.00,0.00)に黒色の線で移動
[グラフィックス]: (0.00,0.00)から(100.00,0.00)に黒色で線を描く
[使用インク]: 100.00
[使用インク]: 200.00
[タートル  ]: (100.00,0.00)から(50.00,86.60)に黒色の線で移動
[グラフィックス]: (100.00,0.00)から(50.00,86.60)に黒色で線を描く
[使用インク]: 200.00
[使用インク]: 300.00
[タートル  ]: (50.00,86.60)から(0.00,0.00)に黒色の線で移動
[グラフィックス]: (50.00,86.60)から(0.00,0.00)に黒色で線を描く
[使用インク]: 300.00
```

すべてのプロセッサがイベントを正常に処理していることがわかります。

タートルは移動し、グラフィックスプロセッサは線を描き、インク使用プロセッサは移動した総距離を正しく300単位と計算しています。

ただし、インク使用プロセッサは実際の移動時だけでなく、*すべての*状態変化（回転など）で出力を発生させていることに注意してください。

これを修正するには、ストリームに`(前回の距離, 現在の距離)`のペアを入れ、値が同じイベントをフィルタリングで除外します。

新しい`inkUsedProcessor`のコードを以下に示します。変更点は：

* `accumulate`関数がペアを出力するようになりました。
* 新しいフィルター`changedDistanceOnly`を追加しました。

```fsharp
/// "moved"イベントをリッスンし、それらを集計して
/// 移動した総距離を追跡する
/// 新機能！重複イベントなし！ 
let inkUsedProcessor (eventStream:IObservable<Guid*obj>) =

    // 新しいイベントが発生したときに、これまでの移動距離の合計を累積する
    let accumulate (prevDist,currDist) (ev:StateChangedEvent) =
        let newDist =
            match ev with
            | Moved dist -> 
                currDist + dist
            | _ -> 
                currDist
        (currDist, newDist)

    // 変更のないイベントをNoneに変換し、"choose"でフィルタリングできるようにする
    let changedDistanceOnly (currDist, newDist) =
        if currDist <> newDist then 
            Some newDist 
        else 
            None

    // オブザーバブルからの入力を処理する関数
    let subscriberFn distanceSoFar  =
        printfn "[使用インク]: %0.2f" distanceSoFar  

    // すべてのイベントから始める
    eventStream
    // ストリームをTurtleEventだけにフィルタリング
    |> Observable.choose (function (id,ev) -> turtleFilter ev)
    // StateChangedEventだけにフィルタリング
    |> Observable.choose stateChangedEventFilter
    // 新機能！総距離をペアとして累積
    |> Observable.scan accumulate (0.0,0.0)   
    // 新機能！距離が変化していない場合はフィルタリング
    |> Observable.choose changedDistanceOnly
    // これらを処理
    |> Observable.subscribe subscriberFn 
```

これらの変更により、`drawTriangle`の出力は以下のようになります：

```text
[使用インク]: 100.00
[タートル  ]: (0.00,0.00)から(100.00,0.00)に黒色の線で移動
[グラフィックス]: (0.00,0.00)から(100.00,0.00)に黒色で線を描く
[使用インク]: 200.00
[タートル  ]: (100.00,0.00)から(50.00,86.60)に黒色の線で移動
[グラフィックス]: (100.00,0.00)から(50.00,86.60)に黒色で線を描く
[使用インク]: 300.00
[タートル  ]: (50.00,86.60)から(0.00,0.00)に黒色の線で移動
[グラフィックス]: (50.00,86.60)から(0.00,0.00)に黒色で線を描く
```

これで`inkUsedProcessor`からの重複メッセージはなくなりました。

### ストリーム処理の利点と欠点

*利点*

* イベントソーシングと同じ利点があります。
* 状態を持つロジックを、他の本質的でないロジックから分離します。
* コアのコマンドハンドラに影響を与えずに、ドメインロジックの追加と削除が容易です。

*欠点*

* 実装がより複雑になります。

*このバージョンのソースコードは[こちら](https://github.com/swlaschin/13-ways-of-looking-at-a-turtle/blob/master/11-FRP.fsx)で入手できます。*

<a id="strikes-back"></a>

<hr>

## エピソードV：タートルの逆襲

これまで、タートルの状態に基づいて決定を下す必要はありませんでした。そこで、最後の2つのアプローチでは、
一部のコマンドが失敗する可能性があるようにタートルAPIを変更します。

例えば、タートルが限られたアリーナ内で移動しなければならず、`move`命令によってタートルが障壁に衝突する可能性があるとしましょう。
この場合、`move`命令は`MovedOk`か`HitBarrier`の選択肢を返すことができます。

または、色付きのインクの量が限られているとしましょう。この場合、色を設定しようとすると「インク切れ」の応答が返される可能性があります。

では、これらのケースでタートル関数を更新しましょう。まず、`move`と`setColor`の新しい応答型です：

```fsharp
type MoveResponse = 
    | MoveOk 
    | HitABarrier

type SetColorResponse = 
    | ColorOk
    | OutOfInk
```

タートルがアリーナ内にいるかどうかを確認する境界チェッカーが必要です。
位置が正方形(0,0,100,100)の外に出ようとすると、応答は`HitABarrier`になるとしましょう：

```fsharp
// 位置が正方形(0,0,100,100)の外にある場合
// 位置を制限してHitBarrierを返す
let checkPosition position =
    let isOutOfBounds p = 
        p > 100.0 || p < 0.0
    let bringInsideBounds p = 
        max (min p 100.0) 0.0

    if isOutOfBounds position.x || isOutOfBounds position.y then
        let newPos = {
            x = bringInsideBounds position.x 
            y = bringInsideBounds position.y }
        HitABarrier,newPos
    else
        MoveOk,position
```

最後に、`move`関数に新しい位置をチェックする行を追加する必要があります：

```fsharp
let move log distance state =
    let newPosition = ...
    
    // 範囲外の場合、新しい位置を調整
    let moveResult, newPosition = checkPosition newPosition 
    
    ...
```

これが完全な`move`関数です：

```fsharp
let move log distance state =
    log (sprintf "Move %0.1f" distance)
    // 新しい位置を計算 
    let newPosition = calcNewPosition distance state.angle state.position 
    // 範囲外の場合、新しい位置を調整
    let moveResult, newPosition = checkPosition newPosition 
    // 必要な場合、線を描く
    if state.penState = Down then
        dummyDrawLine log state.position newPosition state.color
    // 新しい状態とMoveの結果を返す
    let newState = {state with position = newPosition}
    (moveResult,newState) 
```

`setColor`関数にも同様の変更を加え、色を`Red`に設定しようとすると`OutOfInk`を返すようにします。

```fsharp
let setColor log color state =
    let colorResult = 
        if color = Red then OutOfInk else ColorOk
    log (sprintf "SetColor %A" color)
    // 新しい状態とSetColorの結果を返す
    let newState = {state with color = color}
    (colorResult,newState) 
```

タートル関数の新バージョンが利用可能になったので、エラーケースに対応する実装を作成する必要があります。これは次の2つの例で行います。
        
*新しいタートル関数のソースコードは[こちら](https://github.com/swlaschin/13-ways-of-looking-at-a-turtle/blob/master/FPTurtleLib2.fsx)で入手できます。*

<hr>

<a id="way12"></a>

## 12: モナディック制御フロー

このアプローチでは、[方法8](../posts/13-ways-of-looking-at-a-turtle.md#way8)の`turtle`ワークフローを再利用します。
ただし今回は、前のコマンドの結果に基づいて次のコマンドの決定を行います。

その前に、`move`の変更がコードにどのような影響を与えるか見てみましょう。例えば、`move 40.0`を使って何回か前進したいとします。

以前のように`do!`を使ってコードを書くと、厄介なコンパイラエラーが発生します：

```fsharp
let drawShape() = 
    // 一連の指示を定義 
    let t = turtle {
        do! move 60.0   
        // エラー FS0001: 
        // この式は以下の型を持つと期待されていました
        //    Turtle.MoveResponse    
        // しかし、ここでは以下の型を持っています
        //     unit    
        do! move 60.0 
        } 
    // 以下省略                
```

代わりに、`let!`を使用し、応答を何かに割り当てる必要があります。

以下のコードでは、応答を値に割り当てて、それを無視しています！

```fsharp
let drawShapeWithoutResponding() = 
    // 一連の指示を定義 
    let t = turtle {
        let! response = move 60.0 
        let! response = move 60.0 
        let! response = move 60.0 
        return ()
        } 

    // 最後に、初期状態を使用してモナドを実行
    runT t initialTurtleState 
```

コードはコンパイルされ動作しますが、実行すると、3回目の呼び出しでタートルが壁（100,0）にぶつかって動かなくなっていることが出力からわかります。

```text
Move 60.0
...Draw line from (0.0,0.0) to (60.0,0.0) using Black
Move 60.0
...Draw line from (60.0,0.0) to (100.0,0.0) using Black
Move 60.0
...Draw line from (100.0,0.0) to (100.0,0.0) using Black
```

### 応答に基づく決定

`HitBarrier`を返す`move`への応答として、90度回転して次のコマンドを待つことにしましょう。あまり賢明なアルゴリズムではありませんが、デモンストレーションには十分でしょう！

これを実装する関数を設計しましょう。入力は`MoveResponse`ですが、出力は何でしょうか？ `turn`アクションを何らかの形でエンコードしたいのですが、
生の`turn`関数には私たちが持っていない状態の入力が必要です。そこで、状態が利用可能になったとき（`run`コマンドで）に実行したい指示を表す`turtle`ワークフローを返すことにしましょう。

以下がコードです：

```fsharp
let handleMoveResponse moveResponse = turtle {
    match moveResponse with
    | Turtle.MoveOk -> 
        () // 何もしない
    | Turtle.HitBarrier ->
        // 再試行の前に90度回転
        printfn "おっと -- 障壁にぶつかりました -- 回転します"
        do! turn 90.0<Degrees>
    }
```

型シグネチャは以下のようになります：

```fsharp
val handleMoveResponse : MoveResponse -> TurtleStateComputation<unit>
```

これはモナディック（または「対角」）関数です -- 通常の世界で始まり、`TurtleStateComputation`世界で終わります。

これらは、「bind」を使用したり、コンピュテーション式内で`let!`や`do!`を使用したりできる関数です。

これで、タートルワークフロー内の`move`の後に、この`handleMoveResponse`ステップを追加できます：

```fsharp
let drawShape() = 
    // 一連の指示を定義 
    let t = turtle {
        let! response = move 60.0 
        do! handleMoveResponse response 

        let! response = move 60.0 
        do! handleMoveResponse response 

        let! response = move 60.0 
        do! handleMoveResponse response 
        } 

    // 最後に、初期状態を使用してモナドを実行
    runT t initialTurtleState 
```

実行結果は以下のようになります：

```text
Move 60.0
...Draw line from (0.0,0.0) to (60.0,0.0) using Black
Move 60.0
...Draw line from (60.0,0.0) to (100.0,0.0) using Black
おっと -- 障壁にぶつかりました -- 回転します
Turn 90.0
Move 60.0
...Draw line from (100.0,0.0) to (100.0,60.0) using Black
```

移動応答が機能していることがわかります。タートルが(100,0)の端にぶつかったとき、90度回転し、次の移動は成功しました（(100,0)から(100,60)へ）。

これで完了です！このコードは、舞台裏で状態が受け渡されている間に、`turtle`ワークフロー内で決定を下せることを示しています。

### 利点と欠点

*利点*

* コンピュテーション式を使用することで、コードはロジックに焦点を当て、「配管」（この場合はタートルの状態）の処理を行うことができます。

*欠点*

* 特定のタートル関数の実装にまだ結びついています。
* コンピュテーション式の実装は複雑になる可能性があり、初心者にとってはその動作が明白ではありません。

*このバージョンのソースコードは[こちら](https://github.com/swlaschin/13-ways-of-looking-at-a-turtle/blob/master/12-BranchingOnResponse.fsx)で入手できます。*

<hr>

<a id="way13"></a>

## 13: タートルインタープリター 

最後のアプローチでは、タートルのプログラミングとその解釈を*完全に*分離する方法を見ていきます。

これは[コマンドオブジェクトを使ったバッチ処理](../posts/13-ways-of-looking-at-a-turtle.md#way9)アプローチに似ていますが、
コマンドの出力に応答できるように拡張されています。

### インタープリターの設計

我々が取るアプローチは、一連のタートルコマンドのための「インタープリター」を設計することです。クライアントがタートルにコマンドを提供し、
タートルからの出力に応答しますが、実際のタートル関数は後で特定の実装によって提供されます。

言い換えれば、以下のような一連の交互のコマンドとタートル関数があります：

![](../assets/img/turtle-interpreter-chain.png)

では、このデザインをコードでどのようにモデル化できるでしょうか？

まず最初の試みとして、このチェーンをリクエスト/レスポンスのペアの連続としてモデル化してみましょう。タートルにコマンドを送信すると、
`MoveResponse`などで適切に応答します：

```fsharp
// タートルに送信するもの
type TurtleCommand = 
    | Move of Distance 
    | Turn of Angle
    | PenUp
    | PenDown
    | SetColor of PenColor

// ... そしてタートルはこれらのうちの1つで応答する
type TurtleResponse = 
    | Moved of MoveResponse
    | Turned 
    | PenWentUp
    | PenWentDown
    | ColorSet of SetColorResponse
```

問題は、応答がコマンドと正しく一致することを保証できないことです。例えば、`Move`コマンドを送信した場合、`MoveResponse`を期待し、
決して`SetColorResponse`を期待しません。しかし、この実装ではそれを強制していません！

[不正な状態を表現不可能にする](../posts/designing-with-types-making-illegal-states-unrepresentable.md)方法を見つける必要があります - どうすればいいでしょうか？

トリックは、リクエストとレスポンスを*ペア*で組み合わせることです。つまり、`Move`コマンドには、入力として`MoveResponse`を受け取る関連する関数があり、他の各組み合わせについても同様です。
応答のないコマンドは、今のところ`unit`を返すと考えることができます。

```fsharp
Moveコマンド => (Moveコマンドのパラメータ), (関数 MoveResponse -> 何か) のペア
Turnコマンド => (Turnコマンドのパラメータ), (関数 unit -> 何か) のペア
等
```

これは以下のように機能します：

* クライアントがコマンド（例：`Move 100`）を作成し、応答を処理する追加の関数も提供します。
* Moveコマンドのタートル実装（インタープリター内）が入力（`Distance`）を処理し、`MoveResponse`を生成します。
* インタープリターは、この`MoveResponse`を取り、クライアントが提供したペアの関連する関数を呼び出します。

このように`Move`コマンドを関数と関連付けることで、内部のタートル実装が`distance`を受け入れ、`MoveResponse`を返す*必要がある*ことを保証できます。

次の質問は：出力の`何か`は何でしょうか？ クライアントが応答を処理した後の出力、つまり別のコマンド/レスポンスチェーンです！

したがって、ペアの全チェーンを再帰的な構造としてモデル化できます：

![](../assets/img/turtle-interpreter-nested.png)

コードでは：

```fsharp
type TurtleProgram = 
    //         (入力パラメータ)  (応答)
    | Move     of Distance   * (MoveResponse -> TurtleProgram)
    | Turn     of Angle      * (unit -> TurtleProgram)
    | PenUp    of (* なし *)   (unit -> TurtleProgram)
    | PenDown  of (* なし *)   (unit -> TurtleProgram)
    | SetColor of PenColor   * (SetColorResponse -> TurtleProgram)
```

型名を`TurtleCommand`から`TurtleProgram`に変更しました。これはもはや単なるコマンドではなく、コマンドと関連する応答ハンドラの完全なチェーンになったためです。

しかし、問題があります！ 各ステップには次の`TurtleProgram`が必要です - いつ停止するのでしょうか？ 次のコマンドがないことを示す方法が必要です。

この問題を解決するために、プログラム型に特別な`Stop`ケースを追加します：

```fsharp
type TurtleProgram = 
    //         (入力パラメータ)  (応答)
    | Stop
    | Move     of Distance   * (MoveResponse -> TurtleProgram)
    | Turn     of Angle      * (unit -> TurtleProgram)
    | PenUp    of (* なし *)   (unit -> TurtleProgram)
    | PenDown  of (* なし *)   (unit -> TurtleProgram)
    | SetColor of PenColor   * (SetColorResponse -> TurtleProgram)
```

この構造には`TurtleState`への言及がないことに注意してください。タートル状態の管理方法はインタープリターの内部的なものであり、「命令セット」の一部ではありません。

`TurtleProgram`は抽象構文木（AST）の一例です - 解釈（またはコンパイル）されるプログラムを表す構造です。

### インタープリターのテスト

このモデルを使って小さなプログラムを作ってみましょう。ここに古い友人`drawTriangle`があります：

```fsharp
let drawTriangle = 
    Move (100.0, fun response -> 
    Turn (120.0<Degrees>, fun () -> 
    Move (100.0, fun response -> 
    Turn (120.0<Degrees>, fun () -> 
    Move (100.0, fun response -> 
    Turn (120.0<Degrees>, fun () -> 
    Stop))))))
```

このプログラムは、クライアントのコマンドと応答のみを含むデータ構造です - どこにも実際のタートル関数は含まれていません！
そして、はい、今のところ非常に醜いですが、すぐに修正します。

次のステップは、このデータ構造を解釈することです。

実際のタートル関数を呼び出すインタープリターを作成しましょう。例えば、`Move`ケースをどのように実装すればよいでしょうか？

上記で説明したとおりです：

* `Move`ケースから距離と関連する関数を取得します。
* 距離と現在のタートル状態を使って実際のタートル関数を呼び出し、`MoveResult`と新しいタートル状態を取得します。
* 関連する関数に`MoveResult`を渡して、プログラムの次のステップを取得します。
* 最後に、新しいプログラムと新しいタートル状態でインタープリターを（再帰的に）再度呼び出します。

```fsharp
let rec interpretAsTurtle state program =
    ...
    match program  with
    | Move (dist,next) ->
        let result,newState = Turtle.move log dist state 
        let nextProgram = next result  // 次のステップを計算
        interpretAsTurtle newState nextProgram 
    ...        
```

更新されたタートル状態が次の再帰呼び出しのパラメータとして渡されるため、可変フィールドは必要ないことがわかります。

以下は`interpretAsTurtle`の完全なコードです：

```fsharp
let rec interpretAsTurtle state program =
    let log = printfn "%s"

    match program  with
    | Stop -> 
        state
    | Move (dist,next) ->
        let result,newState = Turtle.move log dist state 
        let nextProgram = next result  // 次のステップを計算 
        interpretAsTurtle newState nextProgram 
    | Turn (angle,next) ->
        let newState = Turtle.turn log angle state 
        let nextProgram = next()       // 次のステップを計算
        interpretAsTurtle newState nextProgram 
    | PenUp next ->
        let newState = Turtle.penUp log state 
        let nextProgram = next()
        interpretAsTurtle newState nextProgram 
    | PenDown next -> 
        let newState = Turtle.penDown log state 
        let nextProgram = next()
        interpretAsTurtle newState nextProgram 
    | SetColor (color,next) ->
        let result,newState = Turtle.setColor log color state 
        let nextProgram = next result
        interpretAsTurtle newState nextProgram 
```

実行してみましょう：

```fsharp
let program = drawTriangle
let interpret = interpretAsTurtle   // インタープリターを選択 
let initialState = Turtle.initialTurtleState
interpret initialState program |> ignore
```

出力は以前と全く同じです：

```text
Move 100.0
...Draw line from (0.0,0.0) to (100.0,0.0) using Black
Turn 120.0
Move 100.0
...Draw line from (100.0,0.0) to (50.0,86.6) using Black
Turn 120.0
Move 100.0
...Draw line from (50.0,86.6) to (0.0,0.0) using Black
Turn 120.0
```

しかし、これまでのアプローチとは異なり、*全く同じプログラム*を取り、新しい方法で解釈できます。
依存性注入のようなものを設定する必要はなく、単に異なるインタープリターを使用するだけです。

では、タートル状態を気にせずに移動距離を集計する別のインタープリターを作成しましょう：

```fsharp
let rec interpretAsDistance distanceSoFar program =
    let recurse = interpretAsDistance 
    let log = printfn "%s"
    
    match program with
    | Stop -> 
        distanceSoFar
    | Move (dist,next) ->
        let newDistanceSoFar = distanceSoFar + dist
        let result = Turtle.MoveOk   // 結果をハードコード
        let nextProgram = next result 
        recurse newDistanceSoFar nextProgram 
    | Turn (angle,next) ->
        // distanceSoFarは変更なし
        let nextProgram = next()
        recurse distanceSoFar nextProgram 
    | PenUp next ->
        // distanceSoFarは変更なし
        let nextProgram = next()
        recurse distanceSoFar nextProgram 
    | PenDown next -> 
        // distanceSoFarは変更なし
        let nextProgram = next()
        recurse distanceSoFar nextProgram 
    | SetColor (color,next) ->
        // distanceSoFarは変更なし
        let result = Turtle.ColorOk   // 結果をハードコード
        let nextProgram = next result
        recurse distanceSoFar nextProgram 
```

この場合、`interpretAsDistance`をローカルで`recurse`として別名を付けて、どの種類の再帰が行われているかを明確にしています。

同じプログラムをこの新しいインタープリターで実行してみましょう：

```fsharp
let program = drawTriangle           // 同じプログラム  
let interpret = interpretAsDistance  // インタープリターを選択 
let initialState = 0.0
interpret initialState program |> printfn "移動した総距離は %0.1f"
```

出力は再び予想通りです：

```text
移動した総距離は 300.0
```

### "タートルプログラム"ワークフローの作成

解釈するプログラムを作成するためのコードはかなり醜かったですね！ コンピュテーション式を作成して見栄えを良くすることはできないでしょうか？

コンピュテーション式を作成するには、`return`と`bind`関数が必要です。これらは
`TurtleProgram`型がジェネリックであることを要求します。

問題ありません！`TurtleProgram`をジェネリックにしましょう：

```fsharp
type TurtleProgram<'a> = 
    | Stop     of 'a
    | Move     of Distance * (MoveResponse -> TurtleProgram<'a>)
    | Turn     of Angle    * (unit -> TurtleProgram<'a>)
    | PenUp    of            (unit -> TurtleProgram<'a>)
    | PenDown  of            (unit -> TurtleProgram<'a>)
    | SetColor of PenColor * (SetColorResponse -> TurtleProgram<'a>)
```

`Stop`ケースに型`'a`の値が関連付けられていることに注意してください。これは`return`を適切に実装するために必要です：

```fsharp
let returnT x = 
    Stop x  
```

`bind`関数の実装はより複雑です。今のところその動作方法を気にする必要はありません - 重要なのは型が合致し、コンパイルされることです！

```fsharp
let rec bindT f inst  = 
    match inst with
    | Stop x -> 
        f x
    | Move(dist,next) -> 
        (*
        Move(dist,fun moveResponse -> (bindT f)(next moveResponse)) 
        *)
        // "next >> bindT f"は関数responseの短縮版
        Move(dist,next >> bindT f) 
    | Turn(angle,next) -> 
        Turn(angle,next >> bindT f)  
    | PenUp(next) -> 
        PenUp(next >> bindT f)
    | PenDown(next) -> 
        PenDown(next >> bindT f)
    | SetColor(color,next) -> 
        SetColor(color,next >> bindT f)
```

`bind`と`return`が揃ったので、コンピュテーション式を作成できます：

```fsharp
// コンピュテーション式ビルダーを定義
type TurtleProgramBuilder() =
    member this.Return(x) = returnT x
    member this.Bind(x,f) = bindT f x
    member this.Zero(x) = returnT ()

// コンピュテーション式ビルダーのインスタンスを作成
let turtleProgram = TurtleProgramBuilder()
```

これで、モナディック制御フローの例（方法12）で見たように、`MoveResponse`を処理するワークフローを作成できます。

```fsharp
// ヘルパー関数
let stop = fun x -> Stop x
let move dist  = Move (dist, stop)
let turn angle  = Turn (angle, stop)
let penUp  = PenUp stop 
let penDown  = PenDown stop 
let setColor color = SetColor (color,stop)

let handleMoveResponse log moveResponse = turtleProgram {
    match moveResponse with
    | Turtle.MoveOk -> 
        ()
    | Turtle.HitBarrier ->
        // 再試行の前に90度回転
        log "おっと -- 障壁にぶつかりました -- 回転します"
        let! x = turn 90.0<Degrees>
        ()
    }

// 例
let drawTwoLines log = turtleProgram {
    let! response = move 60.0
    do! handleMoveResponse log response 
    let! response = move 60.0
    do! handleMoveResponse log response 
    }
```

実際のタートル関数を使ってこれを解釈してみましょう（`interpretAsTurtle`関数が新しいジェネリック構造を処理するように修正されていると仮定します）：
    
```fsharp
let log = printfn "%s"
let program = drawTwoLines log 
let interpret = interpretAsTurtle 
let initialState = Turtle.initialTurtleState
interpret initialState program |> ignore
```

出力は、障壁に遭遇したときに`MoveResponse`が確かに正しく処理されていることを示しています：

```text
Move 60.0
...Draw line from (0.0,0.0) to (60.0,0.0) using Black
Move 60.0
...Draw line from (60.0,0.0) to (100.0,0.0) using Black
おっと -- 障壁にぶつかりました -- 回転します
Turn 90.0
```

### `TurtleProgram`型を2つの部分にリファクタリング

このアプローチは十分に機能しますが、`TurtleProgram`型に特別な`Stop`ケースがあることが気になります。できれば、
5つのタートルアクションに焦点を当て、それを無視できればいいのですが。

実際、これを行う方法があります。HaskellやScalazでは「フリーモナド」と呼ばれますが、F#は型クラスをサポートしていないため、
この問題を解決するための「フリーモナドパターン」と呼ぶことにします。
少しのボイラープレートを書く必要がありますが、それほど多くはありません。

トリックは、APIケースと "stop"/"keep going" ロジックを2つの別々の型に分離することです：

```fsharp
/// 各命令を表す型を作成
type TurtleInstruction<'next> = 
    | Move     of Distance * (MoveResponse -> 'next)
    | Turn     of Angle    * 'next
    | PenUp    of            'next
    | PenDown  of            'next
    | SetColor of PenColor * (SetColorResponse -> 'next)

/// タートルプログラムを表す型を作成
type TurtleProgram<'a> = 
    | Stop of 'a
    | KeepGoing of TurtleInstruction<TurtleProgram<'a>>
```

`Turn`、`PenUp`、`PenDown`の応答を単一の値に変更し、unit関数ではなくしたことにも注意してください。`Move`と`SetColor`は関数のままです。

この新しい「フリーモナド」アプローチでは、APIタイプ（この場合は`TurtleInstruction`）に対する単純な`map`関数を書くだけです：

```fsharp
let mapInstr f inst  = 
    match inst with
    | Move(dist,next) ->      Move(dist,next >> f) 
    | Turn(angle,next) ->     Turn(angle,f next)  
    | PenUp(next) ->          PenUp(f next)
    | PenDown(next) ->        PenDown(f next)
    | SetColor(color,next) -> SetColor(color,next >> f)
```

残りのコード（`return`、`bind`、およびコンピュテーション式）は、
[常に同じ方法で実装されます](https://github.com/swlaschin/13-ways-of-looking-at-a-turtle/blob/4a8cdf3bda9fc9db030842e99f78487aea928e57/13-Interpreter-v2.fsx#L67)。これは特定のAPIに関係なく、同じです。
つまり、より多くのボイラープレートが必要ですが、考える必要は少なくなります！

インタープリターは新しいケースを処理するように変更する必要があります。以下は`interpretAsTurtle`の新バージョンの一部です：

```fsharp
let rec interpretAsTurtle log state program =
    let recurse = interpretAsTurtle log 
    
    match program with
    | Stop a -> 
        state
    | KeepGoing (Move (dist,next)) ->
        let result,newState = Turtle.move log dist state 
        let nextProgram = next result // 次のプログラムを計算
        recurse newState nextProgram 
    | KeepGoing (Turn (angle,next)) ->
        let newState = Turtle.turn log angle state 
        let nextProgram = next        // 次のプログラムを直接使用
        recurse newState nextProgram 
```

ワークフローを作成する際のヘルパー関数も調整する必要があります。以下では、元のインタープリターでの単純なコードの代わりに、
`KeepGoing (Move (dist, Stop))`のようなやや複雑なコードがあることがわかります。

```fsharp
// ヘルパー関数
let stop = Stop()
let move dist  = KeepGoing (Move (dist, Stop))    // "Stop"は関数
let turn angle  = KeepGoing (Turn (angle, stop))  // "stop"は値
let penUp  = KeepGoing (PenUp stop)
let penDown  = KeepGoing (PenDown stop)
let setColor color = KeepGoing (SetColor (color,Stop))

let handleMoveResponse log moveResponse = turtleProgram {
    ... // 以前と同じ

// 例
let drawTwoLines log = turtleProgram {
    let! response = move 60.0
    do! handleMoveResponse log response 
    let! response = move 60.0
    do! handleMoveResponse log response 
    }
```

これらの変更を加えれば、コードは以前と同じように動作します。

### インタープリターパターンの利点と欠点

*利点*

* *分離。* 抽象構文木は、プログラムフローを実装から完全に分離し、多くの柔軟性を可能にします。
* *最適化*。抽象構文木は、実行前に操作や変更を加えて、最適化やその他の変換を行うことができます。例えば、タートルプログラムでは、
  ツリーを処理して、連続するすべての`Turn`を単一の`Turn`操作に集約することができます。
  これは、物理的なタートルとの通信回数を節約する単純な最適化です。[TwitterのStitchライブラリ](https://web.archive.org/web/20160617143939/https://engineering.twitter.com/university/videos/introducing-stitch)
  は、より洗練された方法でこのようなことを行っています。[この動画に良い説明があります](https://www.youtube.com/watch?v=VVpmMfT8aYw&feature=youtu.be&t=625)。
* *最小限のコードで多くの力を得られる*。抽象構文木を作成する「フリーモナド」アプローチにより、APIに焦点を当て、Stop/KeepGoingロジックを無視できます。また、カスタマイズが必要な最小限のコードで済みます。
  フリーモナドについて詳しく知るには、まず[この素晴らしい動画](https://www.youtube.com/watch?v=hmX2s3pe_qk)から始め、次に[この投稿](https://underscore.io/blog/posts/2015/04/14/free-monads-are-simple.html)
  と[こちらの投稿](https://www.haskellforall.com/2012/06/you-could-have-invented-free-monads.html)を参照してください。

*欠点*

* 理解するのが複雑です。
* 実行する操作が限られている場合にのみ効果的です。
* ASTが大きくなりすぎると非効率になる可能性があります。

*このバージョンのソースコードは[こちら（オリジナルバージョン）](https://github.com/swlaschin/13-ways-of-looking-at-a-turtle/blob/master/13-Interpreter-v1.fsx)
と[こちら（「フリーモナド」バージョン）](https://github.com/swlaschin/13-ways-of-looking-at-a-turtle/blob/master/13-Interpreter-v2.fsx)で入手できます。*

<hr>

<a id="review"></a>

## 使用したテクニックの再確認

この投稿では、タートルAPIを実装する13の異なる方法を見てきました。様々なテクニックを使用しました。使用されたすべてのテクニックを簡単に振り返ってみましょう：

* **純粋でステートレスな関数**。FP指向のすべての例で見られます。これらはすべてテストやモックが非常に容易です。
* **部分適用**。[最もシンプルなFPの例（方法2）](../posts/13-ways-of-looking-at-a-turtle.md#way2)で初めて見られ、メインフローがパイピングを使用できるようにタートル関数にロギング関数が適用されました。
  その後、特に[「関数を使った依存性注入アプローチ」（方法7）](../posts/13-ways-of-looking-at-a-turtle.md#way7)で広く使用されました。
* **オブジェクト式**。クラスを作成せずにインターフェースを実装するために使用されました（[方法6](../posts/13-ways-of-looking-at-a-turtle.md#way6)参照）。
* **Result型**（別名Eitherモナド）。すべての関数型APIの例（[例えば方法4](../posts/13-ways-of-looking-at-a-turtle.md#way4)）で、例外を投げる代わりにエラーを返すために使用されました。
* **アプリカティブ「リフティング」**（例：`lift2`）。通常の関数を`Result`の世界に持ち上げるために使用されました（[方法4](../posts/13-ways-of-looking-at-a-turtle.md#way4)など）。
* **状態管理の様々な方法**：
  * 可変フィールド（方法1）
  * 状態を明示的に管理し、一連の関数を通してパイプする（方法2）
  * エッジでのみ状態を持つ（方法4の関数型コア/命令型シェル）
  * エージェント内に状態を隠す（方法5）
  * ステートモナドで舞台裏で状態をスレッド化する（方法8と12の`turtle`ワークフロー）
  * コマンドのバッチ（方法9）やイベントのバッチ（方法10）、インタープリター（方法13）を使用して状態を完全に避ける
* **関数を型でラップする**。[方法8](../posts/13-ways-of-looking-at-a-turtle.md#way8)で状態を管理するため（Stateモナド）と、[方法13](../posts/13-ways-of-looking-at-a-turtle.md#way13)で応答を格納するために使用されました。
* **コンピュテーション式**、たくさんありました！3つ作成して使用しました：
  * エラー処理のための`result`
  * タートルの状態管理のための`turtle`
  * インタープリターアプローチ（[方法13](../posts/13-ways-of-looking-at-a-turtle-2.md#way13)）でASTを構築するための`turtleProgram`
* **モナディック関数のチェーン化**。`result`と`turtle`ワークフローで行われました。基礎となる関数はモナディック（「対角」）で、通常は適切に合成できませんが、
  ワークフロー内では簡単かつ透過的に順序付けできます。
* **振る舞いをデータ構造として表現する**。[「関数型依存性注入」の例（方法7）](../posts/13-ways-of-looking-at-a-turtle.md#way7)で、インターフェース全体ではなく単一の関数を渡せるようにするために使用されました。
* **データ中心のプロトコルを使用した分離**。エージェント、バッチコマンド、イベントソーシング、インタープリターの例で見られました。
* **ロックフリーと非同期処理**。エージェントを使用（方法5）。
* **コンピュテーションの「構築」と「実行」の分離**。`turtle`ワークフロー（方法8と12）と`turtleProgram`ワークフロー（方法13：インタープリター）で見られました。
* **イベントソーシングを使用して状態を再構築する**。メモリ内で可変状態を維持する代わりに、[イベントソーシング（方法10）](../posts/13-ways-of-looking-at-a-turtle-2.md#way10)
   と[FRP（方法11）](../posts/13-ways-of-looking-at-a-turtle-2.md#way11)の例で見られました。
* **イベントストリーム**と[FRP（方法11）](../posts/13-ways-of-looking-at-a-turtle-2.md#way11)の使用。ビジネスロジックを小さく、独立した、分離されたプロセッサに分割し、モノリシックなオブジェクトを避けるために使用されました。

これら13の方法を検討することは単なる楽しい演習であり、すべてのコードをすぐにストリームプロセッサやインタープリターを使用するように変換することを提案しているわけではありません！特に
関数型プログラミングに慎重な人々と一緒に作業している場合、追加の複雑さに見合う明確な利点がない限り、初期の（そしてよりシンプルな）アプローチに固執する傾向があります。

<hr>

## まとめ

> 亀は這い出て見えなくなり  
> 無数の円のひとつだけ  
> 縁の跡が残った  
> -- *ウォレス・オサガメ・スティーヴンズ 著 「タートルを見る13の方法」*

この投稿を楽しんでいただけたら幸いです。私も書くのを楽しみました。いつものように、意図したよりもずっと長くなってしまいましたが、読む価値があったと思っていただければ幸いです！

このような比較アプローチが好きで、もっと知りたい場合は、[Yan Cuiのブログで同様のことを行っている投稿](https://medium.com/theburningmonk-com/fsharp-exercises-in-programming-style/home)をチェックしてみてください。

[F#アドベントカレンダー](https://sergeytihon.wordpress.com/2015/10/25/f-advent-calendar-in-english-2015/)の残りもお楽しみください。ハッピーホリデー！  
  
*この投稿のソースコードは[GitHub](https://github.com/swlaschin/13-ways-of-looking-at-a-turtle)で入手できます。*



