---
layout: post
title: "タートルを見る13の方法"
description: "API、依存性注入、Stateモナドなどの例"
categories: [パターン]
---

> この投稿は[F# Advent Calendar in English 2015](https://sergeytihon.wordpress.com/2015/10/25/f-advent-calendar-in-english-2015/)プロジェクトの一部です。
> そこにある他の素晴らしい投稿もチェックしてください。このイベントを企画してくれたSergey Tihonに特別な感謝を捧げます。

以前、シンプルな[タートルグラフィックスシステム](https://en.wikipedia.org/wiki/Turtle_graphics)の実装方法について議論していたとき、タートルの要件はとてもシンプルでよく知られているため、
さまざまな技術を実演するのに最適な基盤になると思いつきました。

そこで、この2部構成のメガ投稿では、タートルのモデルを極限まで拡張しながら、部分適用、Success/Failure結果を用いた検証、「リフティング」の概念、
メッセージキューを持つエージェント、依存性注入、Stateモナド、イベントソーシング、ストリーム処理、そして最後にカスタムインタープリターなどを実演します。

では、早速ですが、タートルを実装する13の異なる方法をご紹介しましょう。

* [方法1. 基本的なオブジェクト指向アプローチ](../posts/13-ways-of-looking-at-a-turtle.md#way1)：可変状態を持つクラスを作ります。
* [方法2. 基本的な関数型アプローチ](../posts/13-ways-of-looking-at-a-turtle.md#way2)：不変の状態を持つ関数のモジュールを作ります。
* [方法3. オブジェクト指向のコアを持つAPI](../posts/13-ways-of-looking-at-a-turtle.md#way3)：状態を持つコアクラスを呼び出すオブジェクト指向APIを作ります。
* [方法4. 関数型のコアを持つAPI](../posts/13-ways-of-looking-at-a-turtle.md#way4)：状態を持たないコア関数を使う、状態を持つAPIを作ります。
* [方法5. エージェントの前面にあるAPI](../posts/13-ways-of-looking-at-a-turtle.md#way5)：メッセージキューを使っててエージェントと通信するAPIを作ります。
* [方法6. インターフェースを使った依存性注入](../posts/13-ways-of-looking-at-a-turtle.md#way6)：インターフェースまたは関数のレコードを使って、実装をAPIから分離します。
* [方法7. 関数を使った依存性注入](../posts/13-ways-of-looking-at-a-turtle.md#way7)：関数パラメータを渡すことで、実装をAPIから分離します。
* [方法8. Stateモナドを使ったバッチ処理](../posts/13-ways-of-looking-at-a-turtle.md#way8)：状態を追跡する特別な「タートルワークフロー」コンピュテーション式を作ります。
* [方法9. コマンドオブジェクトを使ったバッチ処理](../posts/13-ways-of-looking-at-a-turtle.md#way9)：タートルのコマンドを表す型を作り、コマンドのリストを一括処理します。
* [幕間：データ型を使った意識的な分離](../posts/13-ways-of-looking-at-a-turtle.md#decoupling)。データまたはインターフェースを使った分離に関するメモ。
* [方法10. イベントソーシング](../posts/13-ways-of-looking-at-a-turtle-2.md#way10)：過去のイベントのリストから状態を構築します。
* [方法11. 関数型リアクティブプログラミング（ストリーム処理）](../posts/13-ways-of-looking-at-a-turtle-2.md#way11)：ビジネスロジックが以前のイベントに反応することに基づいています。
* [エピソードV：タートルの逆襲](../posts/13-ways-of-looking-at-a-turtle-2.md#strikes-back)：一部のコマンドが失敗する可能性を考慮するように、タートルAPIを変更します。
* [方法12. モナディック制御フロー](../posts/13-ways-of-looking-at-a-turtle-2.md#way12)：タートルワークフロー内で、以前のコマンドの結果に基づいて決定を行います。
* [方法13. タートルインタープリター](../posts/13-ways-of-looking-at-a-turtle-2.md#way13)：タートルプログラミングとタートルの実装を完全に分離し、ほぼフリーモナドを実現します。
* [使用したテクニックの再確認](../posts/13-ways-of-looking-at-a-turtle-2.md#review)。

拡大版には、おまけの方法が2つあります。

* [方法14. 抽象データタートル](../posts/13-ways-of-looking-at-a-turtle-3.md#way14)：抽象データ型を使って、タートルの実装詳細をカプセル化します。
* [方法15. ケイパビリティベースのタートル](../posts/13-ways-of-looking-at-a-turtle-3.md#way15)：タートルの現在の状態に基づいて、
クライアントが使えるタートル関数を制御します。


この投稿のすべてのソースコードは[GitHub](https://github.com/swlaschin/13-ways-of-looking-at-a-turtle)で入手できます。

<hr>

## タートルの要件

タートルは4つの指示をサポートします。

* 現在の方向に一定の距離を移動する。
* 時計回りまたは反時計回りに一定の角度だけ回転する。
* ペンを上げ下げする。ペンが下がっているとき、タートルを動かすと線が描かれる。
* ペンの色を設定する（黒、青、赤のいずれか）。

これらの要件は自然に、次のような「タートルインターフェース」につながります。

* `Move aDistance`
* `Turn anAngle`
* `PenUp`
* `PenDown`
* `SetColor aColor`

これから紹介するすべての実装は、このインターフェースまたはそのバリエーションに基づいています。

タートルは、これらの指示をキャンバスやその他のグラフィックスコンテキストに線を描くことに変換する必要があることに注意してください。
そのため、実装ではタートルの位置と現在の状態を何らかの方法で追跡する必要があるでしょう。

<hr>

## 共通コード

実装を始める前に、いくつかの共通コードを用意しましょう。

まず、距離、角度、ペンの状態、ペンの色を表す型が必要です。

```fsharp
/// floatのエイリアス
type Distance = float

/// 角度が度数法であることを明確にするための単位の測定
type [<Measure>] Degrees

/// Degreesのfloatのエイリアス
type Angle  = float<Degrees>

/// 利用可能なペンの状態の列挙
type PenState = Up | Down

/// 利用可能なペンの色の列挙
type PenColor = Black | Red | Blue
```

また、タートルの位置を表す型も必要です。

```fsharp
/// (x,y)座標を格納する構造体
type Position = {x:float; y:float}
```

さらに、特定の角度と距離で移動した後の新しい位置を計算するためのヘルパー関数も必要です。

```fsharp
// 読みやすくするためにfloatを小数点以下2桁に丸める
let round2 (flt:float) = Math.Round(flt,2)

/// 現在の位置から角度と距離を与えられた新しい位置を計算する
let calcNewPosition (distance:Distance) (angle:Angle) currentPos = 
    // 度数をラジアンに変換（180.0度 = 1πラジアン）
    let angleInRads = angle * (Math.PI/180.0) * 1.0<1/Degrees> 
    // 現在の位置
    let x0 = currentPos.x
    let y0 = currentPos.y
    // 新しい位置
    let x1 = x0 + (distance * cos angleInRads)
    let y1 = y0 + (distance * sin angleInRads)
    // 新しいPositionを返す
    {x=round2 x1; y=round2 y1}
```

タートルの初期状態も定義しましょう。

```fsharp
/// デフォルトの初期状態
let initialPosition,initialColor,initialPenState = 
    {x=0.0; y=0.0}, Black, Down
```

そして、キャンバスに線を描くふりをするヘルパー関数も用意します。

```fsharp
let dummyDrawLine log oldPos newPos color =
    // とりあえずログに記録するだけ
    log (sprintf "...(%0.1f,%0.1f)から(%0.1f,%0.1f)まで%Aを使用して線を描く" oldPos.x oldPos.y newPos.x newPos.y color)
```

これで最初の実装の準備が整いました。

<hr>

<a id="way1"></a>

## 1. 基本的なOO - 可変状態を持つクラス

この最初のデザインでは、オブジェクト指向アプローチを使用し、シンプルなクラスでタートルを表現します。

* 状態はローカルフィールド（`currentPosition`、`currentAngle`など）に格納され、これらは可変です。
* 何が起こっているかを監視できるように、ログ関数`log`を注入します。

![](../assets/img/turtle-oo.png)

以下は完全なコードで、自明なはずです。

```fsharp
type Turtle(log) =

    let mutable currentPosition = initialPosition 
    let mutable currentAngle = 0.0<Degrees>
    let mutable currentColor = initialColor
    let mutable currentPenState = initialPenState
    
    member this.Move(distance) =
        log (sprintf "Move %0.1f" distance)
        // 新しい位置を計算 
        let newPosition = calcNewPosition distance currentAngle currentPosition 
        // 必要に応じて線を描く
        if currentPenState = Down then
            dummyDrawLine log currentPosition newPosition currentColor
        // 状態を更新
        currentPosition <- newPosition

    member this.Turn(angle) =
        log (sprintf "Turn %0.1f" angle)
        // 新しい角度を計算
        let newAngle = (currentAngle + angle) % 360.0<Degrees>
        // 状態を更新
        currentAngle <- newAngle 

    member this.PenUp() =
        log "Pen up" 
        currentPenState <- Up

    member this.PenDown() =
        log "Pen down" 
        currentPenState <- Down

    member this.SetColor(color) =
        log (sprintf "SetColor %A" color)
        currentColor <- color
```

### タートルオブジェクトの呼び出し

クライアントコードはタートルをインスタンス化し、直接対話します。

```fsharp
/// メッセージをログに記録する関数
let log message =
    printfn "%s" message 

let drawTriangle() = 
    let turtle = Turtle(log)
    turtle.Move 100.0 
    turtle.Turn 120.0<Degrees>
    turtle.Move 100.0 
    turtle.Turn 120.0<Degrees>
    turtle.Move 100.0
    turtle.Turn 120.0<Degrees>
    // (0,0)に戻り、角度は0
```

`drawTriangle()`のログ出力は以下のようになります。

```text
Move 100.0
...(0.0,0.0)から(100.0,0.0)までBlackを使用して線を描く
Turn 120.0
Move 100.0
...(100.0,0.0)から(50.0,86.6)までBlackを使用して線を描く
Turn 120.0
Move 100.0
...(50.0,86.6)から(0.0,0.0)までBlackを使用して線を描く
Turn 120.0
```

同様に、多角形を描くコードは以下のようになります。

```fsharp
let drawPolygon n = 
    let angle = 180.0 - (360.0/float n) 
    let angleDegrees = angle * 1.0<Degrees>
    let turtle = Turtle(log)

    // 1辺を描く関数を定義
    let drawOneSide() = 
        turtle.Move 100.0 
        turtle.Turn angleDegrees 

    // すべての辺について繰り返す
    for i in [1..n] do
        drawOneSide()
```

`drawOneSide()`は何も返さないことに注意してください。すべてのコードは命令的で状態を持ちます。これを次の例の純粋な関数型アプローチのコードと比較してみてください。

### 長所と短所

この単純なアプローチの長所と短所は何でしょうか？

*長所*

* 実装が非常に簡単で理解しやすい。

*短所*

* 状態を持つコードはテストが難しい。テスト前に、オブジェクトを既知の状態にする必要があります。
  これは単純な場合は簡単ですが、より複雑なオブジェクトでは面倒で間違いやすくなります。
* クライアントが特定の実装に結合してしまう。ここにはインターフェースがありません！インターフェースの使用については後ほど見ていきます。


*このバージョンのソースコードは[こちら（タートルクラス）](https://github.com/swlaschin/13-ways-of-looking-at-a-turtle/blob/master/OOTurtleLib.fsx)
と[こちら（クライアント）](https://github.com/swlaschin/13-ways-of-looking-at-a-turtle/blob/master/01-OOTurtle.fsx)で入手できます。*

<hr>

<a id="way2"></a>

## 2：基本的なFP - 不変の状態を持つ関数のモジュール

次のデザインでは、純粋な関数型アプローチを使用します。不変の`TurtleState`を定義し、
さまざまなタートル関数が状態を入力として受け取り、新しい状態を出力として返します。

このアプローチでは、クライアントが現在の状態を追跡し、次の関数呼び出しに渡す責任を負います。

![](../assets/img/turtle-fp.png)

以下は`TurtleState`の定義と初期状態の値です。

```fsharp
module Turtle = 

    type TurtleState = {
        position : Position
        angle : float<Degrees>
        color : PenColor
        penState : PenState
    }

    let initialTurtleState = {
        position = initialPosition
        angle = 0.0<Degrees>
        color = initialColor
        penState = initialPenState
    }                
```

そして、これらが「API」関数です。すべての関数が状態パラメータを受け取り、新しい状態を返します。

```fsharp
module Turtle = 
    
    // [状態の型定義は省略]
    
    let move log distance state =
        log (sprintf "Move %0.1f" distance)
        // 新しい位置を計算 
        let newPosition = calcNewPosition distance state.angle state.position 
        // 必要に応じて線を描く
        if state.penState = Down then
            dummyDrawLine log state.position newPosition state.color
        // 状態を更新
        {state with position = newPosition}

    let turn log angle state =
        log (sprintf "Turn %0.1f" angle)
        // 新しい角度を計算
        let newAngle = (state.angle + angle) % 360.0<Degrees>
        // 状態を更新
        {state with angle = newAngle}

    let penUp log state =
        log "Pen up" 
        {state with penState = Up}

    let penDown log state =
        log "Pen down" 
        {state with penState = Down}

    let setColor log color state =
        log (sprintf "SetColor %A" color)
        {state with color = color}
```

`state`が常に最後のパラメータであることに注目してください。これにより、「パイピング」イディオムの使用が容易になります。

### タートル関数の使用

クライアントは、`log`関数と`state`の両方を毎回すべての関数に渡す必要があります。

部分適用を使用して、ロガーが組み込まれた関数の新しいバージョンを作成することで、log関数を渡す必要性を排除できます。

```fsharp
/// メッセージをログに記録する関数
let log message =
    printfn "%s" message 

// logが組み込まれたバージョン（部分適用を介して）
let move = Turtle.move log
let turn = Turtle.turn log
let penDown = Turtle.penDown log
let penUp = Turtle.penUp log
let setColor = Turtle.setColor log
```

これらのシンプルなバージョンを使用すると、クライアントは自然な方法で状態をパイプ処理できます。

```fsharp
let drawTriangle() = 
    Turtle.initialTurtleState
    |> move 100.0 
    |> turn 120.0<Degrees>
    |> move 100.0 
    |> turn 120.0<Degrees>
    |> move 100.0 
    |> turn 120.0<Degrees>
    // (0,0)に戻り、角度は0
```

多角形を描く場合、各辺の繰り返しを通じて状態を「畳み込む」必要があるため、少し複雑になります。

```fsharp
let drawPolygon n = 
    let angle = 180.0 - (360.0/float n) 
    let angleDegrees = angle * 1.0<Degrees>

    // 1辺を描く関数を定義
    let oneSide state sideNumber = 
        state
        |> move 100.0 
        |> turn angleDegrees 

    // すべての辺について繰り返す
    [1..n] 
    |> List.fold oneSide Turtle.initialTurtleState
```

### 長所と短所

この純粋関数型のアプローチの長所と短所は何でしょうか？

*長所*

* 再び、実装が非常に簡単で理解しやすい。
* 状態を持たない関数はテストが容易。現在の状態を入力として常に提供するため、オブジェクトを既知の状態にするためのセットアップは不要。
* グローバルな状態がないため、関数はモジュール化され、他のコンテキストで再利用できる（この投稿の後半で見ていきます）。

*短所*

* 以前と同様に、クライアントが特定の実装に結合している。
* クライアントが状態を追跡する必要がある（ただし、この問題を解決するためのいくつかの方法をこの投稿の後半で紹介します）。

*このバージョンのソースコードは[こちら（タートル関数）](https://github.com/swlaschin/13-ways-of-looking-at-a-turtle/blob/master/FPTurtleLib.fsx)
と[こちら（クライアント）](https://github.com/swlaschin/13-ways-of-looking-at-a-turtle/blob/master/02-FPTurtle.fsx)で入手できます。*


<hr>

<a id="way3"></a>

## 3：オブジェクト指向コアを持つAPI

APIを使ってクライアントを実装から隠蔽しましょう！

この場合、APIはテキストベースで、`"move 100"`や`"turn 90"`のようなテキストコマンドを使用します。APIはこれらのコマンドを検証し、
タートル（再び状態を持つ`Turtle`クラスのOOアプローチを使用します）のメソッド呼び出しに変換する必要があります。

![](../assets/img/turtle-oo-api.png)

コマンドが有効でない場合、APIはそれをクライアントに示す必要があります。OOアプローチを使用しているため、
次のように文字列を含む`TurtleApiException`をスローします。

```fsharp
exception TurtleApiException of string
```

次に、コマンドテキストを検証する関数が必要です。

```fsharp
// 距離パラメータをfloatに変換、または例外をスロー
let validateDistance distanceStr =
    try
        float distanceStr 
    with
    | ex -> 
        let msg = sprintf "不正な距離 '%s' [%s]" distanceStr  ex.Message
        raise (TurtleApiException msg)

// 角度パラメータをfloat<Degrees>に変換、または例外をスロー
let validateAngle angleStr =
    try
        (float angleStr) * 1.0<Degrees> 
    with
    | ex -> 
        let msg = sprintf "不正な角度 '%s' [%s]" angleStr ex.Message
        raise (TurtleApiException msg)
        
// 色パラメータをPenColorに変換、または例外をスロー
let validateColor colorStr =
    match colorStr with
    | "Black" -> Black
    | "Blue" -> Blue
    | "Red" -> Red
    | _ -> 
        let msg = sprintf "色 '%s' が認識されません" colorStr
        raise (TurtleApiException msg)
```

これらを使用して、APIを作成できます。

コマンドテキストを解析するロジックは、コマンドテキストをトークンに分割し、
最初のトークンを`"move"`、`"turn"`などとマッチさせます。

以下がコードです。

```fsharp
type TurtleApi() =

    let turtle = Turtle(log)

    member this.Exec (commandStr:string) = 
        let tokens = commandStr.Split(' ') |> List.ofArray |> List.map trimString
        match tokens with
        | [ "Move"; distanceStr ] -> 
            let distance = validateDistance distanceStr 
            turtle.Move distance 
        | [ "Turn"; angleStr ] -> 
            let angle = validateAngle angleStr
            turtle.Turn angle  
        | [ "Pen"; "Up" ] -> 
            turtle.PenUp()
        | [ "Pen"; "Down" ] -> 
            turtle.PenDown()
        | [ "SetColor"; colorStr ] -> 
            let color = validateColor colorStr 
            turtle.SetColor color
        | _ -> 
            let msg = sprintf "命令 '%s' が認識されません" commandStr
            raise (TurtleApiException msg)
```

### APIの使用

`TurtleApi`クラスを使用して`drawPolygon`を実装する方法は次のとおりです。

```fsharp
let drawPolygon n = 
    let angle = 180.0 - (360.0/float n) 
    let api = TurtleApi()

    // 1辺を描く関数を定義
    let drawOneSide() = 
        api.Exec "Move 100.0"
        api.Exec (sprintf "Turn %f" angle)

    // すべての辺について繰り返す
    for i in [1..n] do
        drawOneSide()
```

コードが以前のOOバージョンと非常に似ていることがわかります。
直接呼び出し`turtle.Move 100.0`が間接的なAPI呼び出し`api.Exec "Move 100.0"`に置き換えられています。

ここで、`api.Exec "Move bad"`のような不正なコマンドでエラーをトリガーすると、次のようになります。

```fsharp
let triggerError() = 
    let api = TurtleApi()
    api.Exec "Move bad"
```

予想される例外がスローされます。

```text
'TurtleApiException'型の例外がスローされました。
```

### 長所と短所

このようなAPIレイヤーの長所と短所は何でしょうか？

* タートルの実装がクライアントから隠蔽されています。
* サービス境界にあるAPIは検証をサポートし、モニタリング、内部ルーティング、負荷分散などをサポートするように拡張できます。

*短所*

* クライアントは特定の実装に結合していませんが、APIは特定の実装に結合しています。
* システムは非常に状態を持っています。クライアントはAPIの背後にある実装を知りませんが、
  共有状態を通じて内部コアに間接的に結合されており、これによってテストが困難になる可能性があります。

*このバージョンのソースコードは[こちら](https://github.com/swlaschin/13-ways-of-looking-at-a-turtle/blob/master/03-Api_OO_Core.fsx)で入手できます。*


<hr>

<a id="way4"></a>

## 4：関数型コアを持つAPI

このシナリオの代替アプローチは、アプリケーションのコアが純粋な関数で構成され、境界が命令的で状態を持つハイブリッドデザインを使用することです。

このアプローチは[Gary Bernhardt](https://www.youtube.com/watch?v=yTkzNHF6rMs)によって「関数型コア/命令型シェル」と名付けられています。

私たちのAPI例に適用すると、APIレイヤーは純粋なタートル関数のみを使用しますが、
APIレイヤーが可変のタートル状態を格納することで状態を管理します（クライアントではなく）。

また、より関数型にするために、APIはコマンドテキストが無効な場合に例外をスローせず、
代わりに`Success`と`Failure`のケースを持つ`Result`値を返します。`Failure`ケースはエラーに使用されます。
（エラー処理の関数型アプローチについての[私の講演](https://fsharpforfunandprofit.com/rop/)で、この技術についてより詳しく説明しています。）

![](../assets/img/turtle-fp-api.png)

APIクラスの実装から始めましょう。今回は`mutable`なタートル状態を含んでいます。

```fsharp
type TurtleApi() =

    let mutable state = initialTurtleState

    /// 可変の状態値を更新する
    let updateState newState =
        state <- newState
```

検証関数はもはや例外をスローせず、`Success`または`Failure`を返します。

```fsharp
let validateDistance distanceStr =
    try
        Success (float distanceStr)
    with
    | ex -> 
        Failure (InvalidDistance distanceStr)
```

エラーケースは独自の型で文書化されています。

```fsharp
type ErrorMessage = 
    | InvalidDistance of string
    | InvalidAngle of string
    | InvalidColor of string
    | InvalidCommand of string
```

検証関数が「生の」距離ではなく`Result<Distance>`を返すようになったので、`move`関数を
`Result`の世界に持ち上げる必要があります。現在の状態も同様です。

`Result`を扱う際に使用する3つの関数があります：`returnR`、`mapR`、`lift2R`です。

* `returnR`は「通常の」値を`Result`の世界の値に変換します。

![](../assets/img/turtle-returnR.png)

* `mapR`は「通常の」1パラメータ関数を`Result`の世界の1パラメータ関数に変換します。

![](../assets/img/turtle-mapR.png)

* `lift2R`は「通常の」2パラメータ関数を`Result`の世界の2パラメータ関数に変換します。

![](../assets/img/turtle-lift2R.png)

例として、これらのヘルパー関数を使用して、通常の`move`関数を`Result`の世界の関数に変換できます。

* 距離パラメータはすでに`Result`の世界にあります
* 状態パラメータは`returnR`を使用して`Result`の世界に持ち上げられます
* `move`関数は`lift2R`を使用して`Result`の世界に持ち上げられます

```fsharp
// 現在の状態をResultに持ち上げる
let stateR = returnR state

// 距離をResultとして取得
let distanceR = validateDistance distanceStr 

// Resultの世界に持ち上げられた"move"を呼び出す
lift2R move distanceR stateR
```

*（`Result`の世界への関数の「持ち上げ」についての詳細は、[「持ち上げ」に関する一般的な投稿](../posts/elevated-world.md#lift)を参照してください）*

以下が`Exec`の完全なコードです。

```fsharp
/// コマンド文字列を実行し、Resultを返す
/// Exec : commandStr:string -> Result<unit,ErrorMessage>
member this.Exec (commandStr:string) = 
    let tokens = commandStr.Split(' ') |> List.ofArray |> List.map trimString

    // 現在の状態をResultに持ち上げる
    let stateR = returnR state

    // 新しい状態を計算する
    let newStateR = 
        match tokens with
        | [ "Move"; distanceStr ] -> 
            // 距離をResultとして取得
            let distanceR = validateDistance distanceStr 

            // Resultの世界に持ち上げられた"move"を呼び出す
            lift2R move distanceR stateR

        | [ "Turn"; angleStr ] -> 
            let angleR = validateAngle angleStr 
            lift2R turn angleR stateR

        | [ "Pen"; "Up" ] -> 
            returnR (penUp state)

        | [ "Pen"; "Down" ] -> 
            returnR (penDown state)

        | [ "SetColor"; colorStr ] -> 
            let colorR = validateColor colorStr
            lift2R setColor colorR stateR

        | _ -> 
            Failure (InvalidCommand commandStr)

    // `updateState`をResultの世界に持ち上げ、
    // 新しい状態で呼び出す
    mapR updateState newStateR

    // 最終結果を返す（updateStateの出力）
```

### APIの使用

APIは`Result`を返すので、クライアントはもはや各関数を順番に呼び出すことができません。
呼び出しからのエラーを処理し、残りのステップを中止する必要があります。

私たちの生活を楽にするために、`result`コンピュテーション式（またはワークフロー）を使用して呼び出しを連鎖させ、OOバージョンの命令的な「感じ」を保持します。

```fsharp
let drawTriangle() = 
    let api = TurtleApi()
    result {
        do! api.Exec "Move 100"
        do! api.Exec "Turn 120"
        do! api.Exec "Move 100"
        do! api.Exec "Turn 120"
        do! api.Exec "Move 100"
        do! api.Exec "Turn 120"
        }
```

*`result`コンピュテーション式のソースコードは[こちら](https://github.com/swlaschin/13-ways-of-looking-at-a-turtle/blob/master/Common.fsx#L70)で入手できます。*

同様に、`drawPolygon`コードでは、1辺を描くヘルパーを作成し、`result`式内で`n`回呼び出すことができます。

```fsharp
let drawPolygon n = 
    let angle = 180.0 - (360.0/float n) 
    let api = TurtleApi()

    // 1辺を描く関数を定義
    let drawOneSide() = result {
        do! api.Exec "Move 100.0"
        do! api.Exec (sprintf "Turn %f" angle)
        }

    // すべての辺について繰り返す
    result {
        for i in [1..n] do
            do! drawOneSide() 
    }
```

コードは命令的に見えますが、実際には純粋関数型です。返された`Result`値は`result`ワークフローによって透過的に処理されています。

### 長所と短所

*長所*

* OOバージョンのAPIと同様 - タートルの実装がクライアントから隠蔽され、検証を行うことができるなど。
* システムの状態を持つ部分は境界のみです。コアは状態を持たないため、テストが容易になります。

*短所*

* APIは依然として特定の実装に結合しています。

*このバージョンのソースコードは[こちら（APIヘルパー関数）](https://github.com/swlaschin/13-ways-of-looking-at-a-turtle/blob/master/TurtleApiHelpers.fsx)
と[こちら（APIとクライアント）](https://github.com/swlaschin/13-ways-of-looking-at-a-turtle/blob/master/04-Api_FP_Core.fsx)で入手できます。*

<hr>

<a id="way5"></a>

## 5：エージェントの前面にあるAPI

このデザインでは、APIレイヤーがメッセージキューを介して`TurtleAgent`と通信し、
クライアントは以前と同様にAPIレイヤーと対話します。

![](../assets/img/turtle-agent.png)

API（またはどこにも）に可変要素はありません。`TurtleAgent`は再帰的なメッセージ処理ループのパラメータとして
現在の状態を格納することで状態を管理します。

`TurtleAgent`には型付けされたメッセージキューがあり、すべてのメッセージが同じ型であるため、
すべての可能なコマンドを単一の判別共用体型（`TurtleCommand`）に結合する必要があります。

```fsharp
type TurtleCommand = 
    | Move of Distance 
    | Turn of Angle
    | PenUp
    | PenDown
    | SetColor of PenColor
```

エージェントの実装は以前のものと似ていますが、タートル関数を直接公開する代わりに、
受信したコマンドにパターンマッチングを行い、どの関数を呼び出すかを決定します。

```fsharp
type TurtleAgent() =

    /// メッセージをログに記録する関数
    let log message =
        printfn "%s" message 

    // ログ付きバージョン    
    let move = Turtle.move log
    let turn = Turtle.turn log
    let penDown = Turtle.penDown log
    let penUp = Turtle.penUp log
    let setColor = Turtle.setColor log

    let mailboxProc = MailboxProcessor.Start(fun inbox ->
        let rec loop turtleState = async { 
            // キューからコマンドメッセージを読み取る
            let! command = inbox.Receive()
            // メッセージを処理して新しい状態を作成
            let newState = 
                match command with
                | Move distance ->
                    move distance turtleState
                | Turn angle ->
                    turn angle turtleState
                | PenUp ->
                    penUp turtleState
                | PenDown ->
                    penDown turtleState
                | SetColor color ->
                    setColor color turtleState
            return! loop newState  
            }
        loop Turtle.initialTurtleState )

    // キューを外部に公開
    member this.Post(command) = 
        mailboxProc.Post command
```

### エージェントへのコマンドの送信

APIはエージェントを呼び出すために、`TurtleCommand`を構築し、エージェントのキューにポストします。

今回は、前回の「move」コマンドを「持ち上げる」アプローチの代わりに：

```fsharp
let stateR = returnR state
let distanceR = validateDistance distanceStr 
lift2R move distanceR stateR
```

`result`コンピュテーション式を使用します。そうすると、上記のコードは次のようになります：

```fsharp
result {
    let! distance = validateDistance distanceStr 
    move distance state
    } 
```

エージェントの実装では、`move`コマンドを呼び出すのではなく、`Command`型の`Move`ケースを作成しているので、コードは次のようになります：

```fsharp
result {
    let! distance = validateDistance distanceStr 
    let command = Move distance 
    turtleAgent.Post command
    } 
```

以下が完全なコードです：

```fsharp
member this.Exec (commandStr:string) = 
    let tokens = commandStr.Split(' ') |> List.ofArray |> List.map trimString

    // 新しい状態を計算
    let result = 
        match tokens with
        | [ "Move"; distanceStr ] -> result {
            let! distance = validateDistance distanceStr 
            let command = Move distance 
            turtleAgent.Post command
            } 

        | [ "Turn"; angleStr ] -> result {
            let! angle = validateAngle angleStr 
            let command = Turn angle
            turtleAgent.Post command
            }

        | [ "Pen"; "Up" ] -> result {
            let command = PenUp
            turtleAgent.Post command
            }

        | [ "Pen"; "Down" ] -> result { 
            let command = PenDown
            turtleAgent.Post command
            }

        | [ "SetColor"; colorStr ] -> result { 
            let! color = validateColor colorStr
            let command = SetColor color
            turtleAgent.Post command
            }

        | _ -> 
            Failure (InvalidCommand commandStr)

    // エラーがあれば返す
    result
```

### エージェントアプローチの長所と短所

*長所*

* ロックを使用せずに可変状態を保護する優れた方法。
* APIはメッセージキューを通じて特定の実装から分離されています。`TurtleCommand`は、キューの両端を分離する一種のプロトコルとして機能します。
* タートルエージェントは自然に非同期です。
* エージェントは簡単に水平方向にスケールアップできます。

*短所*

* エージェントは状態を持ち、状態を持つオブジェクトと同じ問題があります：
  * コードの理解が難しくなります。
  * テストが難しくなります。
  * アクター間の複雑な依存関係のウェブを作成しやすくなります。
* エージェントの堅牢な実装はかなり複雑になる可能性があります。スーパーバイザー、ハートビート、バックプレッシャーなどのサポートが必要になる場合があります。

*このバージョンのソースコードは[こちら](https://github.com/swlaschin/13-ways-of-looking-at-a-turtle/blob/master/05-TurtleAgent.fsx)で入手できます。*

<hr>

<a id="way6"></a>

## 6: インターフェースを使った依存性注入

エージェントバージョンを除いて、これまでのすべての実装は特定のタートル関数の実装に結びついていました。エージェントバージョンではAPIがキューを介して間接的に通信していました。

では、APIを実装から分離するいくつかの方法を見てみましょう。

### オブジェクト指向スタイルでインターフェースを設計する

まず、実装を分離するクラシックなOOの方法から始めましょう。インターフェースを使います。

このアプローチをタートルドメインに適用すると、APIレイヤーは特定のタートル実装ではなく、`ITurtle`インターフェースと通信する必要があることがわかります。
クライアントは後でAPIのコンストラクタを通じてタートル実装を注入します。

インターフェースの定義は次のとおりです。

```fsharp
type ITurtle =
    abstract Move : Distance -> unit
    abstract Turn : Angle -> unit
    abstract PenUp : unit -> unit
    abstract PenDown : unit -> unit
    abstract SetColor : PenColor -> unit
```

これらの関数にはたくさんの`unit`があることに注目してください。関数シグネチャの`unit`は副作用を示唆します。実際、`TurtleState`はどこにも使われていません。
これはOOベースのアプローチで、可変状態がオブジェクトにカプセル化されているためです。

次に、APIレイヤーを変更して、`TurtleApi`のコンストラクタでインターフェースを注入するようにします。
それ以外のAPIコードは変更されません。以下のスニペットで示されています。

```fsharp
type TurtleApi(turtle: ITurtle) =

    // その他のコード
    
    member this.Exec (commandStr:string) = 
        let tokens = commandStr.Split(' ') |> List.ofArray |> List.map trimString
        match tokens with
        | [ "Move"; distanceStr ] -> 
            let distance = validateDistance distanceStr 
            turtle.Move distance 
        | [ "Turn"; angleStr ] -> 
            let angle = validateAngle angleStr
            turtle.Turn angle  
        // 他の場合も同様
```

### OOインターフェースのいくつかの実装を作成する

では、いくつかの実装を作成してテストしてみましょう。

最初の実装は`normalSize`と呼び、オリジナルのものになります。2番目は`halfSize`と呼び、
すべての距離を半分に縮小します。

`normalSize`については、元の`Turtle`クラスに戻って`ITurtle`インターフェースをサポートするように改修できます。しかし、動作するコードを変更するのは嫌です！
代わりに、元の`Turtle`クラスの周りに「プロキシ」ラッパーを作成し、プロキシが新しいインターフェースを実装します。

一部の言語では、プロキシラッパーの作成に時間がかかる可能性がありますが、F#では[オブジェクト式](../posts/object-expressions.md)を使ってインターフェースを素早く実装できます。

```fsharp
let normalSize() = 
    let log = printfn "%s"
    let turtle = Turtle(log)
    
    // Turtleの周りにインターフェースをラップして返す
    {new ITurtle with
        member this.Move dist = turtle.Move dist
        member this.Turn angle = turtle.Turn angle
        member this.PenUp() = turtle.PenUp()
        member this.PenDown() = turtle.PenDown()
        member this.SetColor color = turtle.SetColor color
    }
```

`halfSize`バージョンを作成するには、同じことを行いますが、`Move`の呼び出しをインターセプトして距離パラメータを半分にします。

```fsharp
let halfSize() = 
    let normalSize = normalSize() 
    
    // 装飾されたインターフェースを返す 
    {new ITurtle with
        member this.Move dist = normalSize.Move (dist/2.0)   // 半分にする！
        member this.Turn angle = normalSize.Turn angle
        member this.PenUp() = normalSize.PenUp()
        member this.PenDown() = normalSize.PenDown()
        member this.SetColor color = normalSize.SetColor color
    }
```

これは実際に[「デコレータ」パターン](https://en.wikipedia.org/wiki/Decorator_pattern)が働いています。
`normalSize`を同一のインターフェースを持つプロキシでラップし、一部のメソッドの動作を変更しながら、他のメソッドはそのまま通します。


### OOスタイルで依存性を注入する

では、依存性をAPIに注入するクライアントコードを見てみましょう。

まず、`TurtleApi`が渡される三角形を描くコードです。

```fsharp
let drawTriangle(api:TurtleApi) = 
    api.Exec "Move 100"
    api.Exec "Turn 120"
    api.Exec "Move 100"
    api.Exec "Turn 120"
    api.Exec "Move 100"
    api.Exec "Turn 120"
```

そして、通常のインターフェースでAPIオブジェクトをインスタンス化して三角形を描いてみましょう。

```fsharp
let iTurtle = normalSize()   // ITurtle型
let api = TurtleApi(iTurtle)
drawTriangle(api) 
```

実際のシステムでは、依存性注入はIoCコンテナなどを使用して呼び出し元から離れた場所で行われるでしょう。

実行すると、`drawTriangle`の出力は以前と同じになります。

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

次に、半分のサイズのインターフェースで試してみます。

```fsharp
let iTurtle = halfSize()
let api = TurtleApi(iTurtle)
drawTriangle(api) 
```

出力は期待通り半分のサイズになります！

```text
Move 50.0
...Draw line from (0.0,0.0) to (50.0,0.0) using Black
Turn 120.0
Move 50.0
...Draw line from (50.0,0.0) to (25.0,43.3) using Black
Turn 120.0
Move 50.0
...Draw line from (25.0,43.3) to (0.0,0.0) using Black
Turn 120.0
```

### 関数型スタイルでインターフェースを設計する

純粋なFPの世界では、OOスタイルのインターフェースは存在しません。しかし、インターフェースの各メソッドに対応する関数を含むレコードを使用してエミュレートできます。

そこで、依存性注入の別のバージョンを作成しましょう。今回は、APIレイヤーがインターフェースの代わりに関数のレコードを使用します。

関数のレコードは通常のレコードですが、フィールドの型が関数型です。以下が使用する定義です。

```fsharp
type TurtleFunctions = {
    move : Distance -> TurtleState -> TurtleState
    turn : Angle -> TurtleState -> TurtleState
    penUp : TurtleState -> TurtleState
    penDown : TurtleState -> TurtleState
    setColor : PenColor -> TurtleState -> TurtleState
    }
```

OOバージョンとは異なり、これらの関数シグネチャに`unit`がないことに注目してください。代わりに、`TurtleState`が明示的に渡され、返されます。

また、ログも含まれていないことに注意してください。ログメソッドはレコードの作成時に関数に組み込まれます。

`TurtleApi`コンストラクタは`ITurtle`の代わりに`TurtleFunctions`レコードを受け取りますが、これらの関数は純粋なので、
APIは再び`mutable`フィールドで状態を管理する必要があります。

```fsharp
type TurtleApi(turtleFunctions: TurtleFunctions) =

    let mutable state = initialTurtleState
```

メインの`Exec`メソッドの実装は、以前に見たものと非常に似ていますが、次の違いがあります。

* 関数はレコードから取得されます（例：`turtleFunctions.move`）。
* すべての活動は`result`コンピュテーション式で行われるため、検証の結果を使用できます。

以下がコードです。

```fsharp
member this.Exec (commandStr:string) = 
    let tokens = commandStr.Split(' ') |> List.ofArray |> List.map trimString

    // unitのSuccessまたはFailureを返す
    match tokens with
    | [ "Move"; distanceStr ] -> result {
        let! distance = validateDistance distanceStr 
        let newState = turtleFunctions.move distance state
        updateState newState
        }
    | [ "Turn"; angleStr ] -> result {
        let! angle = validateAngle angleStr 
        let newState = turtleFunctions.turn angle state
        updateState newState
        }
    // 他の場合も同様
```

### 「関数のレコード」の実装を作成する

では、いくつかの実装を作成しましょう。

再び、`normalSize`実装と`halfSize`実装を持つことにします。

`normalSize`については、元の`Turtle`モジュールの関数を使用し、部分適用を使ってログを組み込むだけです。

```fsharp
let normalSize() = 
    let log = printfn "%s"
    // 関数のレコードを返す
    {
        move = Turtle.move log 
        turn = Turtle.turn log 
        penUp = Turtle.penUp log
        penDown = Turtle.penDown log
        setColor = Turtle.setColor log 
    }
```

`halfSize`バージョンを作成するには、レコードをクローンし、`move`関数だけを変更します。

```fsharp
let halfSize() = 
    let normalSize = normalSize() 
    // 縮小されたタートルを返す
    { normalSize with
        move = fun dist -> normalSize.move (dist/2.0) 
    }
```

インターフェースをプロキシする代わりにレコードをクローンすることの利点は、レコード内のすべての関数を再実装する必要がなく、気にする関数だけを変更できることです。

### 再び依存性を注入する

APIに依存性を注入するクライアントコードは、予想通りに実装されます。APIはコンストラクタを持つクラスなので、
関数のレコードは`ITurtle`インターフェースと全く同じ方法でコンストラクタに渡すことができます。

```fsharp
let turtleFns = normalSize()  // TurtleFunctions型
let api = TurtleApi(turtleFns)
drawTriangle(api) 
```

見てのとおり、`ITurtle`バージョンと`TurtleFunctions`バージョンのクライアントコードは同じように見えます！型が異なることがなければ、区別がつかないでしょう。

### インターフェースを使用する長所と短所

OOスタイルのインターフェースとFPスタイルの「関数のレコード」は非常に似ていますが、FP関数はOOインターフェースとは異なり、状態を持ちません。

*長所*

* APIはインターフェースを通じて特定の実装から分離されています。
* FPの「関数のレコード」アプローチ（OOインターフェースと比較して）：
  * 関数のレコードはインターフェースよりも簡単にクローンできます。
  * 関数は状態を持ちません。

*短所*

* インターフェースは個々の関数よりも一枚岩的で、関係のないメソッドを簡単に含むようになり、
  注意を払わないと[インターフェース分離の原則](https://en.wikipedia.org/wiki/Interface_segregation_principle)に違反する可能性があります。
* インターフェースは（個々の関数とは異なり）合成できません。
* このアプローチの問題点についての詳細は、[Mark SeemannによるこのStack Overflowの回答](https://stackoverflow.com/questions/34011895/f-how-to-pass-equivalent-of-interface/34028711?stw=2#34028711)を参照してください。
* 特にOOインターフェースアプローチについて：
  * インターフェースにリファクタリングする際に、既存のクラスを変更する必要がある場合があります。
* FPの「関数のレコード」アプローチについて：
  * OOインターフェースと比較して、ツールのサポートが少なく、相互運用性が低いです。

*これらのバージョンのソースコードは[こちら（インターフェース）](https://github.com/swlaschin/13-ways-of-looking-at-a-turtle/blob/master/06-DependencyInjection_Interface-1.fsx)
と[こちら（関数のレコード）](https://github.com/swlaschin/13-ways-of-looking-at-a-turtle/blob/master/06-DependencyInjection_Interface-2.fsx)で入手できます。*


<hr>

<a id="way7"></a>

## 7: 関数を使った依存性注入

「インターフェース」アプローチの2つの主な欠点は、インターフェースが合成できないことと、
関数型設計の重要な部分である[「必要な依存性だけを渡す」ルール](https://en.wikipedia.org/wiki/Interface_segregation_principle)に違反することです。

真の関数型アプローチでは、関数を渡します。つまり、APIレイヤーは、APIコールにパラメータとして渡される1つ以上の関数を通じて通信します。
これらの関数は通常、部分適用されており、呼び出し元は「注入」から分離されています。

一般的にコンストラクタはないため、インターフェースはコンストラクタに渡されません！（ここでAPIクラスを使っているのは、タートルの可変状態をラップするためだけです。）

このセクションのアプローチでは、依存性を注入するために関数の受け渡しを使用する2つの代替案を示します：

* 最初のアプローチでは、各依存性（タートル関数）を個別に渡します。
* 2番目のアプローチでは、1つの関数だけを渡します。特定のタートル関数を使用するかを決定するために、判別共用体型を定義します。

### アプローチ1 - 各依存性を個別の関数として渡す

依存性を管理する最も単純な方法は、常にすべての依存性を必要とする関数のパラメータとして渡すことです。

今回の場合、`Exec`メソッドがタートルを制御する唯一の関数なので、直接そこに依存性を渡すことができます：

```fsharp
member this.Exec move turn penUp penDown setColor (commandStr:string) = 
    ...
```

この点を強調しておきましょう：このアプローチでは、依存性は常に必要とする関数に「ジャストインタイム」で渡されます。コンストラクタで依存性を使用して後で使うことはありません。

以下は、これらの関数を使用する`Exec`メソッドのより大きなスニペットです：

```fsharp
member this.Exec move turn penUp penDown setColor (commandStr:string) = 
    ...

    // unitのSuccessまたはFailureを返す
    match tokens with
    | [ "Move"; distanceStr ] -> result {
        let! distance = validateDistance distanceStr 
        let newState = move distance state   // 渡された`move`関数を使用
        updateState newState
        }
    | [ "Turn"; angleStr ] -> result {
        let! angle = validateAngle angleStr   
        let newState = turn angle state   // 渡された`turn`関数を使用
        updateState newState
        }
    ...            
```

### 部分適用を使用して実装を組み込む

通常サイズまたは半分サイズの`Exec`バージョンを作成するには、異なる関数を渡すだけです：

```fsharp
let log = printfn "%s"
let move = Turtle.move log 
let turn = Turtle.turn log 
let penUp = Turtle.penUp log
let penDown = Turtle.penDown log
let setColor = Turtle.setColor log 

let normalSize() = 
    let api = TurtleApi() 
    // 関数を部分適用
    api.Exec move turn penUp penDown setColor 
    // 戻り値は関数： 
    //     string -> Result<unit,ErrorMessage> 

let halfSize() = 
    let moveHalf dist = move (dist/2.0)  
    let api = TurtleApi() 
    // 関数を部分適用
    api.Exec moveHalf turn penUp penDown setColor 
    // 戻り値は関数： 
    //     string -> Result<unit,ErrorMessage> 
```

両方の場合で、`string -> Result<unit,ErrorMessage>`型の*関数*を返しています。

### 純粋な関数型APIの使用

そこで、何かを描きたい場合、`string -> Result<unit,ErrorMessage>`型の*任意の*関数を渡すだけで済みます。`TurtleApi`はもはや必要ではなく、言及されません！

```fsharp
// API型は単なる関数
type ApiFunction = string -> Result<unit,ErrorMessage>

let drawTriangle(api:ApiFunction) = 
    result {
        do! api "Move 100"
        do! api "Turn 120"
        do! api "Move 100"
        do! api "Turn 120"
        do! api "Move 100"
        do! api "Turn 120"
        }
```

APIの使用方法は以下のとおりです：

```fsharp
let apiFn = normalSize()  // string -> Result<unit,ErrorMessage>
drawTriangle(apiFn) 

let apiFn = halfSize()
drawTriangle(apiFn) 
```

`TurtleApi`には可変状態がありましたが、最終的に「公開」されたAPIはその事実を隠す関数になっています。

APIを単一の関数にするこのアプローチは、テスト用のモックを作成するのがとても簡単です！

```fsharp
let mockApi s = 
    printfn "[MockAPI] %s" s
    Success ()
    
drawTriangle(mockApi) 
```

### アプローチ2 - すべてのコマンドを処理する単一の関数を渡す

上記のバージョンでは、5つの個別の関数を渡しました！

一般的に、3つか4つ以上のパラメータを渡している場合、設計の調整が必要であることを示唆しています。関数が本当に独立している場合、そんなに多くは必要ないはずです。

しかし、今回の場合、5つの関数は*独立していません* - セットとして提供されます - では、「関数のレコード」アプローチを使わずにまとめて渡すにはどうすればよいでしょうか？

トリックは*1つの*関数だけを渡すことです！しかし、1つの関数でどのように5つの異なるアクションを処理できるでしょうか？簡単です - 判別共用体を使って可能なコマンドを表現します。

エージェントの例でこれを見たことがありますので、その型を再度見てみましょう：

```fsharp
type TurtleCommand = 
    | Move of Distance 
    | Turn of Angle
    | PenUp
    | PenDown
    | SetColor of PenColor
```

必要なのは、この型の各ケースを処理する関数だけです。

ただし、その前に`Exec`メソッドの実装の変更点を見てみましょう：

```fsharp
member this.Exec turtleFn (commandStr:string) = 
    ...

    // unitのSuccessまたはFailureを返す
    match tokens with
    | [ "Move"; distanceStr ] -> result {
        let! distance = validateDistance distanceStr 
        let command =  Move distance      // Commandオブジェクトを作成
        let newState = turtleFn command state
        updateState newState
        }
    | [ "Turn"; angleStr ] -> result {
        let! angle = validateAngle angleStr 
        let command =  Turn angle      // Commandオブジェクトを作成
        let newState = turtleFn command state
        updateState newState
        }
    ...
```

`command`オブジェクトが作成され、`turtleFn`パラメータがそれで呼び出されていることに注目してください。

ちなみに、このコードはエージェントの実装と非常に似ています。`newState = turtleFn command state`の代わりに`turtleAgent.Post command`を使用しています：

### 部分適用を使用して実装を組み込む

このアプローチを使用して2つの実装を作成しましょう：

```fsharp
let log = printfn "%s"
let move = Turtle.move log 
let turn = Turtle.turn log 
let penUp = Turtle.penUp log
let penDown = Turtle.penDown log
let setColor = Turtle.setColor log 

let normalSize() = 
    let turtleFn = function
        | Move dist -> move dist 
        | Turn angle -> turn angle
        | PenUp -> penUp 
        | PenDown -> penDown 
        | SetColor color -> setColor color

    // 関数をAPIに部分適用
    let api = TurtleApi() 
    api.Exec turtleFn 
    // 戻り値は関数： 
    //     string -> Result<unit,ErrorMessage> 

let halfSize() = 
    let turtleFn = function
        | Move dist -> move (dist/2.0)  
        | Turn angle -> turn angle
        | PenUp -> penUp 
        | PenDown -> penDown 
        | SetColor color -> setColor color

    // 関数をAPIに部分適用
    let api = TurtleApi() 
    api.Exec turtleFn 
    // 戻り値は関数： 
    //     string -> Result<unit,ErrorMessage> 
```

前回と同様に、両方の場合で`string -> Result<unit,ErrorMessage>`型の関数を返しています。これを先ほど定義した`drawTriangle`関数に渡すことができます：

```fsharp
let api = normalSize()
drawTriangle(api) 

let api = halfSize()
drawTriangle(api) 
```

### 関数を使用する長所と短所

*長所*

* APIはパラメータ化を通じて特定の実装から分離されています。
* 依存性がコンストラクタ（「目に見えない」）ではなく、使用時点（「目の前」）で渡されるため、依存性が増殖する傾向が大幅に減少します。
* 任意の関数パラメータは自動的に「1メソッドインターフェース」になるため、改修は必要ありません。
* 通常の部分適用を使用してパラメータを「依存性注入」のために組み込むことができます。特別なパターンやIoCコンテナは必要ありません。

*短所*

* 依存する関数の数が多すぎる場合（4つ以上）、すべてを個別のパラメータとして渡すのは面倒になる可能性があります（そのため、2番目のアプローチがあります）。
* 判別共用体型はインターフェースよりも扱いにくい場合があります。

*これらのバージョンのソースコードは[こちら（5つの関数パラメータ）](https://github.com/swlaschin/13-ways-of-looking-at-a-turtle/blob/master/07-DependencyInjection_Functions-1.fsx)
と[こちら（1つの関数パラメータ）](https://github.com/swlaschin/13-ways-of-looking-at-a-turtle/blob/master/07-DependencyInjection_Functions-2.fsx)で入手できます。*


<hr>

<a id="way8"></a>

## 8: Stateモナドを使ったバッチ処理

次の2つのセクションでは、命令を1つずつ処理する「インタラクティブ」モードから、
一連の命令をグループ化して1つのユニットとして実行する「バッチ」モードに切り替えます。

最初の設計では、クライアントがタートル関数を直接使用するモデルに戻ります。

以前と同様に、クライアントは現在の状態を追跡し、次の関数呼び出しに渡す必要がありますが、
今回はいわゆる「Stateモナド」を使用して、様々な命令を通じて状態を渡すことで、状態を見えないようにします。
結果として、どこにも可変要素はありません！

これは汎用のStateモナドではなく、このデモンストレーション用に簡略化したものです。`turtle`ワークフローと呼びます。

*（Stateモナドについての詳細は、私の[「モナド怪物」トークと投稿](https://fsharpforfunandprofit.com/monadster/)と[パーサーコンビネータに関する投稿](../posts/understanding-parser-combinators.md)を参照してください）*

![](../assets/img/turtle-monad.png)

### `turtle`ワークフローの定義

最初に定義した基本的なタートル関数は、他の多くの状態変換関数と同じ「形」を持っています。入力とタートル状態、そして出力とタートル状態です。

![](../assets/img/turtle-monad-1.png)

*（これまでのところ、タートル関数から使用可能な出力はありませんでしたが、後の例では、この出力を使用して決定を行う様子を見ることができます。）*

これらの種類の関数を扱うための標準的な方法があります - 「Stateモナド」です。

その構築方法を見てみましょう。

まず、カリー化のおかげで、この形の関数を2つの別々の1パラメータ関数に再構成できることに注目してください：入力の処理は、次に状態をパラメータとして持つ別の関数を生成します。

![](../assets/img/turtle-monad-2.png)

そこで、タートル関数を入力を受け取り新しい*関数*を返すものとして考えることができます：

![](../assets/img/turtle-monad-3.png)

今回の場合、`TurtleState`を状態として使用すると、返される関数は次のようになります：

```fsharp
TurtleState -> 'a * TurtleState
```

最後に、扱いやすくするために、返される関数を独自の存在として扱い、`TurtleStateComputation`のような名前を付けることができます：

![](../assets/img/turtle-monad-4.png)

実装では、通常、関数を[単一ケース判別共用体](../posts/designing-with-types-single-case-dus.md)でラップします：

```fsharp
type TurtleStateComputation<'a> = 
    TurtleStateComputation of (Turtle.TurtleState -> 'a * Turtle.TurtleState)
```

これが「Stateモナド」の基本的なアイデアです。しかし、Stateモナドがこの型だけでなく、いくつかの関数（「return」と「bind」）も必要とし、それらがいくつかの合理的な法則に従う必要があることを理解することが重要です。

ここでは`returnT`と`bindT`関数の定義は示しませんが、[完全なソース](https://github.com/swlaschin/13-ways-of-looking-at-a-turtle/blob/8e4e8d23b838ca88702d0b318bfd57a87801305e/08-StateMonad.fsx#L46)でその定義を見ることができます。

いくつかの追加のヘルパー関数も必要です。（すべての関数にタートルの「T」サフィックスを追加します。）

特に、`TurtleStateComputation`に状態を供給して「実行」する方法が必要です：

```fsharp
let runT turtle state = 
    // タートルに対してパターンマッチングを行い
    // 内部関数を抽出する
    let (TurtleStateComputation innerFn) = turtle 
    // 渡された状態で内部関数を実行する
    innerFn state
```

最後に、`turtle`ワークフローを作成できます。これは`TurtleStateComputation`型の操作を容易にするコンピュテーション式です：

```fsharp
// コンピュテーション式ビルダーを定義する
type TurtleBuilder() =
    member this.Return(x) = returnT x
    member this.Bind(x,f) = bindT f x

// コンピュテーション式ビルダーのインスタンスを作成する
let turtle = TurtleBuilder()
```

### タートルワークフローの使用

`turtle`ワークフローを使用するには、まずタートル関数の「持ち上げられた」または「モナディック」バージョンを作成する必要があります：

```fsharp
let move dist = 
    toUnitComputation (Turtle.move log dist)
// val move : Distance -> TurtleStateComputation<unit>

let turn angle = 
    toUnitComputation (Turtle.turn log angle)
// val turn : Angle -> TurtleStateComputation<unit>

let penDown = 
    toUnitComputation (Turtle.penDown log)
// val penDown : TurtleStateComputation<unit>

let penUp = 
    toUnitComputation (Turtle.penUp log)
// val penUp : TurtleStateComputation<unit>

let setColor color = 
    toUnitComputation (Turtle.setColor log color)
// val setColor : PenColor -> TurtleStateComputation<unit>
```

`toUnitComputation`ヘルパー関数が持ち上げを行います。その動作方法は気にしないでください。効果としては、`move`関数の元のバージョン（`Distance -> TurtleState -> TurtleState`）が
`TurtleStateComputation`を返す関数（`Distance -> TurtleStateComputation<unit>`）として生まれ変わります。

これらの「モナディック」バージョンを作成したら、`turtle`ワークフロー内で次のように使用できます：

```fsharp
let drawTriangle() = 
    // 一連の命令を定義する 
    let t = turtle {
        do! move 100.0 
        do! turn 120.0<Degrees>
        do! move 100.0 
        do! turn 120.0<Degrees>
        do! move 100.0 
        do! turn 120.0<Degrees>
        } 

    // 最後に、初期状態を入力として使用して実行する
    runT t initialTurtleState 
```

`drawTriangle`の最初の部分は6つの命令を連鎖させていますが、重要なのは、それらを*実行していない*ことです。
最後に`runT`関数が使用されたときにのみ、命令が実際に実行されます。

`drawPolygon`の例は少し複雑です。まず、1辺を描くためのワークフローを定義します：

```fsharp
let oneSide = turtle {
    do! move 100.0 
    do! turn angleDegrees 
    }
```

しかし、次にすべての辺を1つのワークフローに組み合わせる方法が必要です。これを行うにはいくつかの方法があります。ここでは、ペアワイズコンバイナー`chain`を作成し、
`reduce`を使用してすべての辺を1つの操作に組み合わせる方法を採用します。

```fsharp
// 2つのタートル操作を順番に連鎖する
let chain f g  = turtle {
    do! f
    do! g
    } 

// 各辺に対応する操作のリストを作成する
let sides = List.replicate n oneSide

// すべての辺を1つの操作に連鎖する
let all = sides |> List.reduce chain 
```

以下が`drawPolygon`の完全なコードです：

```fsharp
let drawPolygon n = 
    let angle = 180.0 - (360.0/float n) 
    let angleDegrees = angle * 1.0<Degrees>

    // 1辺を描く関数を定義する
    let oneSide = turtle {
        do! move 100.0 
        do! turn angleDegrees 
        }

    // 2つのタートル操作を順番に連鎖する
    let chain f g  = turtle {
        do! f
        do! g
        } 

    // 各辺に対応する操作のリストを作成する
    let sides = List.replicate n oneSide

    // すべての辺を1つの操作に連鎖する
    let all = sides |> List.reduce chain 

    // 最後に、初期状態を使用して実行する
    runT all initialTurtleState 
```

### `turtle`ワークフローの長所と短所

*長所*

* クライアントコードは命令型コードに似ていますが、不変性を保持します。
* ワークフローは合成可能です - 2つのワークフローを定義し、それらを組み合わせて別のワークフローを作成できます。

*短所*

* 特定のタートル関数の実装に結合しています。
* 状態を明示的に追跡するよりも複雑です。
* ネストされたモナド/ワークフローのスタックは扱いが難しいです。

最後の点の例として、`seq`を含む`result`ワークフローを含む`turtle`ワークフローがあり、それらを反転して`turtle`ワークフローを外側にしたい場合を考えてみましょう。
どのようにしますか？それは明白ではありません！

*このバージョンのソースコードは[こちら](https://github.com/swlaschin/13-ways-of-looking-at-a-turtle/blob/master/08-StateMonad.fsx)で入手できます。*

<hr>

<a id="way9"></a>

## 9: コマンドオブジェクトを使ったバッチ処理

もう1つのバッチ指向のアプローチは、`TurtleCommand`型を新しい方法で再利用することです。関数をすぐに呼び出す代わりに、
クライアントはグループとして実行されるコマンドのリストを作成します。

コマンドのリストを「実行」する際、標準的なTurtleライブラリ関数を使用して各コマンドを順番に実行し、
`fold`を使用して状態をシーケンス全体に渡すことができます。

![](../assets/img/turtle-batch.png)

そして、すべてのコマンドが一度に実行されるため、このアプローチではクライアントが呼び出し間で保持する必要のある状態はありません。

以下が`TurtleCommand`の定義の再掲です：

```fsharp
type TurtleCommand = 
    | Move of Distance 
    | Turn of Angle
    | PenUp
    | PenDown
    | SetColor of PenColor
```

コマンドのシーケンスを処理するために、それらを折りたたんで状態を通過させる必要があるので、
単一のコマンドを状態に適用して新しい状態を返す関数が必要です：

```fsharp
/// コマンドをタートル状態に適用し、新しい状態を返す 
let applyCommand state command =
    match command with
    | Move distance ->
        move distance state
    | Turn angle ->
        turn angle state
    | PenUp ->
        penUp state
    | PenDown ->
        penDown state
    | SetColor color ->
        setColor color state
```

そして、すべてのコマンドを実行するには、`fold`を使用するだけです：

```fsharp
/// コマンドのリストを一度に実行する
let run aListOfCommands = 
    aListOfCommands 
    |> List.fold applyCommand Turtle.initialTurtleState
```

### コマンドのバッチを実行する

例えば、三角形を描くには、コマンドのリストを作成し、それらを実行するだけです：

```fsharp
let drawTriangle() = 
    // コマンドのリストを作成する
    let commands = [
        Move 100.0 
        Turn 120.0<Degrees>
        Move 100.0 
        Turn 120.0<Degrees>
        Move 100.0 
        Turn 120.0<Degrees>
        ]
    // 実行する
    run commands
```

コマンドは単なるコレクションなので、小さなコレクションから大きなコレクションを簡単に構築できます。

以下は`drawPolygon`の例で、`drawOneSide`がコマンドのコレクションを返し、そのコレクションが各辺ごとに複製されます：

```fsharp
let drawPolygon n = 
    let angle = 180.0 - (360.0/float n) 
    let angleDegrees = angle * 1.0<Degrees>

    // 1辺を描く関数を定義する
    let drawOneSide sideNumber = [
        Move 100.0
        Turn angleDegrees
        ]

    // すべての辺について繰り返す
    let commands = 
        [1..n] |> List.collect drawOneSide

    // コマンドを実行する
    run commands
```


### バッチコマンドの長所と短所

*長所*

* ワークフローやモナドよりも構築と使用が簡単です。
* 1つの関数だけが特定の実装に結合しています。クライアントの残りの部分は分離されています。

*短所*

* バッチ指向のみです。
* 制御フローが前のコマンドの応答に基づいていない場合にのみ適しています。
  各コマンドの結果に応答する必要がある場合は、後述する「インタープリター」アプローチを検討してください。

*このバージョンのソースコードは[こちら](https://github.com/swlaschin/13-ways-of-looking-at-a-turtle/blob/master/09-BatchCommands.fsx)で入手できます。*

<a id="decoupling"></a>

<hr>

## 幕間：データ型を使った意識的な分離

これまでの例のうち3つ（[エージェント](../posts/13-ways-of-looking-at-a-turtle.md#way5)、[関数型依存性注入](../posts/13-ways-of-looking-at-a-turtle.md#way7)、
[バッチ処理](../posts/13-ways-of-looking-at-a-turtle.md#way9)）で、`Command`型 - 各APIコールのケースを含む判別共用体 - を使用しました。
次の投稿でも、イベントソーシングとインタープリターのアプローチで同様のものが使用されるのを見ることができます。

これは偶然ではありません。オブジェクト指向設計と関数型設計の違いの1つは、OO設計が振る舞いに焦点を当てるのに対し、
関数型設計はデータ変換に焦点を当てることです。

結果として、分離へのアプローチも異なります。OO設計はカプセル化された振る舞いの束（「インターフェース」）を共有することで分離を提供することを好みますが、
関数型設計は共通のデータ型に同意することで分離を提供することを好みます。これは時々「プロトコル」と呼ばれます（ただし、私はこの言葉をメッセージ交換パターンのために予約することを好みます）。

その共通のデータ型に同意すれば、そのデータ型を出力する関数は、通常の関数合成を使用して、そのデータ型を消費する関数に接続できます。

2つのアプローチを、[WebサービスにおけるRPCまたはメッセージ指向APIの選択](https://sbdevel.wordpress.com/2009/12/17/the-case-rpc-vs-messaging/)に類似したものとして考えることもできます。
そして、[メッセージベースの設計には多くの利点](https://github.com/ServiceStack/ServiceStack/wiki/Advantages-of-message-based-web-services#advantages-of-message-based-designs)があるのと同様に、
データベースの分離には振る舞いベースの分離と同様の利点があります。

データを使用した分離の利点には以下のようなものがあります：

* 共有データ型を使用することで、合成が簡単になります。振る舞いベースのインターフェースを合成するのは難しいです。
* *すべての*関数がすでに「分離」されているため、リファクタリング時に既存の関数を改修する必要がありません。
  最悪の場合、あるデータ型を別のデータ型に変換する必要があるかもしれませんが、それは...より多くの関数とより多くの関数合成で簡単に達成できます！
* データ構造は、コードを物理的に分離されたサービスに分割する必要がある場合に、リモートサービスへのシリアル化が簡単です。
* データ構造は安全に進化させるのが簡単です。例えば、6番目のタートルアクションを追加したり、アクションを削除したり、アクションのパラメータを変更したりした場合、判別共用体型が変更され、
  共有型のすべてのクライアントは6番目のタートルアクションが考慮されるまでコンパイルに失敗します。
  一方、既存のコードを壊したくない場合は、[protobuf](https://developers.google.com/protocol-buffers/docs/proto3#updating)のようなバージョニングに優しいデータシリアル化形式を使用できます。
  これらのオプションは、インターフェースを使用する場合ほど簡単ではありません。


## まとめ

> ミームは拡散  
> 泳ぐ亀さん  
> -- *ウォレス・オサガメ・スティーヴンズ 著 「タートルを見る13の方法」*

もしもし？まだ誰かいますか？ここまで読んでいただきありがとうございます！

さて、休憩の時間です！[次の投稿](../posts/13-ways-of-looking-at-a-turtle-2.md)では、タートルを見る方法について残りの4つをカバーします。

*この投稿のソースコードは[GitHub](https://github.com/swlaschin/13-ways-of-looking-at-a-turtle)で入手できます。*

