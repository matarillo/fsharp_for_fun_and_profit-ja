---
layout: post
title: "タートルを見る13の方法 - 追補"
description: "おまけの方法：抽象データタートルとケイパビリティベースのタートル"
categories: [パターン]
---

この2部構成の大型投稿の第3部では、シンプルなタートルグラフィックスモデルを限界まで拡張し続けます。

[第1回](../posts/13-ways-of-looking-at-a-turtle.md)と[第2回](../posts/13-ways-of-looking-at-a-turtle-2.md)では、
タートルグラフィックスの実装を13の異なる視点から説明しました。

しかし、投稿後に触れ忘れた方法があったことに気づきました。
そこで今回は、おまけとして2つの方法を紹介します。

* [方法14：抽象データタートル](../posts/13-ways-of-looking-at-a-turtle-3.md#way14)。抽象データ型を使ってタートルの実装詳細をカプセル化します。
* [方法15：ケイパビリティベースのタートル](../posts/13-ways-of-looking-at-a-turtle-3.md#way15)。タートルの現在の状態に基づいて、
  クライアントが利用できるタートル関数を制御します。

前回紹介した13の方法を振り返ってみましょう。

* [方法1：基本的なオブジェクト指向アプローチ](../posts/13-ways-of-looking-at-a-turtle.md#way1)。可変状態を持つクラスを作成します。
* [方法2：基本的な関数型アプローチ](../posts/13-ways-of-looking-at-a-turtle.md#way2)。不変の状態を持つ関数のモジュールを作成します。
* [方法3：オブジェクト指向コアを持つAPI](../posts/13-ways-of-looking-at-a-turtle.md#way3)。状態を持つコアクラスを呼び出すオブジェクト指向APIを作成します。
* [方法4：関数型コアを持つAPI](../posts/13-ways-of-looking-at-a-turtle.md#way4)。状態を持たないコア関数を使う状態を持つAPIを作成します。
* [方法5：エージェントの前面にあるAPI](../posts/13-ways-of-looking-at-a-turtle.md#way5)。エージェントとメッセージキューを使って通信するAPIを作成します。
* [方法6：インターフェースを使った依存性注入](../posts/13-ways-of-looking-at-a-turtle.md#way6)。インターフェースや関数のレコードを使って実装とAPIを分離します。
* [方法7：関数を使った依存性注入](../posts/13-ways-of-looking-at-a-turtle.md#way7)。関数パラメータを渡すことで実装とAPIを分離します。
* [方法8：状態モナドを使ったバッチ処理](../posts/13-ways-of-looking-at-a-turtle.md#way8)。状態を追跡する特別な「タートルワークフロー」計算式を作成します。
* [方法9：コマンドオブジェクトを使ったバッチ処理](../posts/13-ways-of-looking-at-a-turtle.md#way9)。タートルコマンドを表す型を作成し、コマンドのリストを一度に処理します。
* [幕間：データ型を使った意識的な分離](../posts/13-ways-of-looking-at-a-turtle.md#decoupling)。データまたはインターフェースを使った分離に関するメモ。
* [方法10：イベントソーシング](../posts/13-ways-of-looking-at-a-turtle-2.md#way10)。過去のイベントのリストから状態を構築します。
* [方法11：関数型リアクティブプログラミング（ストリーム処理）](../posts/13-ways-of-looking-at-a-turtle-2.md#way11)。ビジネスロジックを過去のイベントへの反応に基づいて構築します。
* [エピソードV：タートルの逆襲](../posts/13-ways-of-looking-at-a-turtle-2.md#strikes-back)。タートルAPIを変更し、一部のコマンドが失敗する可能性を導入します。
* [方法12：モナディック制御フロー](../posts/13-ways-of-looking-at-a-turtle-2.md#way12)。タートルワークフロー内で、以前のコマンドの結果に基づいて決定を行います。
* [方法13：タートルインタープリター](../posts/13-ways-of-looking-at-a-turtle-2.md#way13)。タートルのプログラミングと実装を完全に分離し、フリーモナドに近づきます。
* [使用したテクニックの再確認](../posts/13-ways-of-looking-at-a-turtle-2.md#review)。

この投稿のソースコードは[GitHub](https://github.com/swlaschin/13-ways-of-looking-at-a-turtle)で入手できます。

<hr>

<a id="way14"></a>

## 14：抽象データタートル

このデザインでは、[抽象データ型](https://ja.wikipedia.org/wiki/%E6%8A%BD%E8%B1%A1%E3%83%87%E3%83%BC%E3%82%BF%E5%9E%8B)の概念を使ってタートルの操作をカプセル化します。

つまり、「タートル」は不透明な型として定義され、対応する一連の操作が付随します。これは標準的なF#の型である`List`、`Set`、`Map`の定義方法と同じです。

言い換えると、この型に対して機能する関数がいくつかありますが、型の「中身」を見ることは許されません。

ある意味、これは[方法1のOOアプローチ](../posts/13-ways-of-looking-at-a-turtle.md#way1)と[方法2の関数型アプローチ](../posts/13-ways-of-looking-at-a-turtle.md#way2)の第3の選択肢と考えられます。

* OO実装では、内部の詳細がうまくカプセル化され、アクセスはメソッドを介してのみ行われます。OOクラスの欠点は、可変であることです。
* 関数型実装では、`TurtleState`は不変ですが、欠点は状態の内部が公開されていることです。
  クライアントがこれらのフィールドにアクセスしている可能性があるため、`TurtleState`の設計を変更すると、これらのクライアントが壊れる可能性があります。

抽象データ型の実装は、両方の利点を組み合わせています。タートルの状態は元の関数型の方法と同様に不変ですが、OO方式と同様にクライアントはアクセスできません。

このデザイン（および任意の抽象型）は次のようになります。

* タートル状態型自体は公開されていますが、コンストラクタとフィールドはプライベートです。
* 関連する`Turtle`モジュールの関数は、タートル状態型の内部を見ることができます（つまり、関数型設計から変更されません）。
* タートル状態のコンストラクタはプライベートなので、`Turtle`モジュールにコンストラクタ関数が必要です。
* クライアントはタートル状態型の内部を見ることができないため、`Turtle`モジュールの関数に完全に依存する必要があります。

これが全てです。以前の関数型バージョンにいくつかのプライバシー修飾子を追加するだけで完成です。

### 実装

まず、タートル状態型と`Turtle`モジュールの両方を`AdtTurtle`という共通モジュールの中に置きます。
これにより、タートル状態は`AdtTurtle.Turtle`モジュールの関数からアクセス可能ですが、`AdtTurtle`の外部からはアクセスできません。

次に、タートル状態型は`TurtleState`ではなく`Turtle`と呼ばれるようになります。これは、ほとんどオブジェクトのように扱うためです。

最後に、関連するモジュール`Turtle`（関数を含む）には、いくつかの特別な属性があります。

* `RequireQualifiedAccess`は、関数にアクセスする際にモジュール名を使用する必要があることを意味します（`List`モジュールと同様）。
* `ModuleSuffix`は、モジュールが状態型と同じ名前を持つために必要です。これは汎用型（例えば`Turtle<'a>`の代わりに）では必要ありません。

```fsharp
module AdtTurtle = 

    /// タートルを表すプライベート構造体
    type Turtle = private {
        position : Position
        angle : float<Degrees>
        color : PenColor
        penState : PenState
    }
    
    /// タートルを操作するための関数
    /// "RequireQualifiedAccess"はモジュール名を必ず使用する必要があることを意味します
    ///    （Listモジュールと同様）
    /// "ModuleSuffix"は、モジュールが状態型と
    ///    同じ名前を持つために必要です
    [<RequireQualifiedAccess>]
    [<CompilationRepresentation (CompilationRepresentationFlags.ModuleSuffix)>]
    module Turtle =
```

衝突を避けるもう一つの方法は、状態型に異なるケースを持たせるか、小文字のエイリアスを持つ異なる名前を付けることです。

```fsharp
type TurtleState = { ... }
type turtle = TurtleState 

module Turtle =
    let something (t:turtle) = t
```

名前の付け方に関わらず、新しい`Turtle`を構築する方法が必要です。

コンストラクタにパラメータがなく、状態が不変の場合は、関数ではなく初期値だけが必要です（例えば`Set.empty`のように）。

そうでない場合は、`make`（または`create`など）と呼ばれる関数を定義できます。

```fsharp
[<RequireQualifiedAccess>]
[<CompilationRepresentation (CompilationRepresentationFlags.ModuleSuffix)>]
module Turtle =

    /// 指定された色で新しいタートルを返します
    let make(initialColor) = {
        position = initialPosition
        angle = 0.0<Degrees>
        color = initialColor
        penState = initialPenState
    }                
```

タートルモジュールの残りの関数は、[方法2](../posts/13-ways-of-looking-at-a-turtle.md#way2)の実装から変更ありません。

### 抽象データ型のクライアント

クライアントを見てみましょう。

まず、状態が本当にプライベートかどうかを確認しましょう。以下のように状態を明示的に作成しようとすると、コンパイラエラーが発生します。

```fsharp
let initialTurtle = {
    position = initialPosition
    angle = 0.0<Degrees>
    color = initialColor
    penState = initialPenState
}
// コンパイラエラー FS1093: 
//    型'Turtle'の共用体ケースまたはフィールドは
//    このコードの場所からアクセスできません
```

コンストラクタを使用し、フィールド（`position`など）に直接アクセスしようとすると、再びコンパイラエラーが発生します。

```fsharp
let turtle = Turtle.make(Red)
printfn "%A" turtle.position
// コンパイラエラー FS1093: 
//    型'Turtle'の共用体ケースまたはフィールドは
//    このコードの場所からアクセスできません
```

しかし、`Turtle`モジュールの関数を使用する限り、以前と同様に安全に状態値を作成し、関数を呼び出すことができます。

```fsharp
// 部分適用を介してlogを組み込んだバージョン
let move = Turtle.move log
let turn = Turtle.turn log
// 以下同様

let drawTriangle() =
    Turtle.make(Red)
    |> move 100.0 
    |> turn 120.0<Degrees>
    |> move 100.0 
    |> turn 120.0<Degrees>
    |> move 100.0 
    |> turn 120.0<Degrees>
```

### 抽象データ型の利点と欠点

*利点*

* すべてのコードがステートレスなので、テストが容易です。
* 状態のカプセル化により、常に型の動作や特性に焦点が当てられます。
* クライアントは特定の実装に依存することがないため、安全に実装を変更できます。
* テストやパフォーマンスなどの目的で、実装を簡単に入れ替えられます（例えば、シャドーイングや異なるアセンブリへのリンクによって）。

*欠点*

* クライアントが現在のタートルの状態を管理する必要があります。
* クライアントは実装を制御できません（例えば、依存性注入を使用して）。

F#での抽象データ型についての詳細は、Bryan Eddsによる[このトークとスレッド](https://www.reddit.com/r/fsharp/comments/36s0zr/structuring_f_programs_with_abstract_data_types/)を参照してください。

*このバージョンのソースコードは[こちら](https://github.com/swlaschin/13-ways-of-looking-at-a-turtle/blob/master/14-AdtTurtle.fsx)で入手できます。*

<hr>

<a id="way15"></a>

## 15：ケイパビリティベースのタートル

[方法12](../posts/13-ways-of-looking-at-a-turtle-2.md#way12)の「モナディック制御フロー」アプローチでは、タートルが障壁に当たったことを知らせる応答を処理しました。

しかし、障壁に当たったにもかかわらず、`move`操作を何度も呼び出すことを止められませんでした。

障壁に当たった後、`move`操作がもう使えなくなるとどうでしょうか。使えないので乱用できません。

これを実現するには、APIを提供するのではなく、各呼び出しの後に、クライアントが次のステップで呼び出せる関数のリストを返すべきです。
通常、関数のリストには`move`、`turn`、`penUp`などが含まれますが、障壁に当たったときは`move`がそのリストから削除されます。シンプルですが効果的です。

このテクニックは、ケイパビリティベースのセキュリティと呼ばれる認証・セキュリティ技術と密接に関連しています。
詳細に興味がある場合は、[ケイパビリティベースのセキュリティに関する一連の投稿](../posts/capability-based-security.md)を参照してください。

### ケイパビリティベースのタートルの設計

まず、各呼び出しの後に返される関数のレコードを定義します。

```fsharp
type MoveResponse = 
    | MoveOk 
    | HitABarrier

type SetColorResponse = 
    | ColorOk
    | OutOfInk

type TurtleFunctions = {
    move     : MoveFn option
    turn     : TurnFn
    penUp    : PenUpDownFn 
    penDown  : PenUpDownFn 
    setBlack : SetColorFn  option
    setBlue  : SetColorFn  option
    setRed   : SetColorFn  option
    }
and MoveFn =      Distance -> (MoveResponse * TurtleFunctions)
and TurnFn =      Angle    -> TurtleFunctions
and PenUpDownFn = unit     -> TurtleFunctions
and SetColorFn =  unit     -> (SetColorResponse * TurtleFunctions)
```

これらの宣言を詳しく見てみましょう。

まず、どこにも`TurtleState`はありません。公開されたタートル関数が状態をカプセル化します。同様に`log`関数もありません。

次に、関数のレコード`TurtleFunctions`はAPI内の各関数（`move`、`turn`など）のフィールドを定義します。

* `move`関数はオプショナルで、使用できない可能性があります。
* `turn`、`penUp`、`penDown`関数は常に使用可能です。
* `setColor`操作は3つの別々の関数に分割されています。各色に1つずつです。赤インクは使えなくても、青インクは使える可能性があるからです。
  これらの関数が使用できない可能性があることを示すため、再び`option`を使用しています。

また、各関数の型エイリアスを宣言して、扱いやすくしています。どこでも`Distance -> (MoveResponse * TurtleFunctions)`と書くよりも`MoveFn`と書く方が簡単です。
これらの定義は相互に再帰的なので、`and`キーワードを使用する必要がありました。

最後に、このデザインの`MoveFn`の署名と[方法12の以前のデザイン](../posts/13-ways-of-looking-at-a-turtle-2.md#way12)の`move`の署名の違いに注目してください。

以前のバージョン：

```fsharp
val move : 
    Log -> Distance -> TurtleState -> (MoveResponse * TurtleState)
```

新しいバージョン：

```fsharp
val move : 
    Distance -> (MoveResponse * TurtleFunctions)
```

入力側では、`Log`と`TurtleState`パラメータがなくなり、出力側では`TurtleState`が`TurtleFunctions`に置き換わっています。

つまり、すべてのAPI関数の出力を`TurtleFunctions`レコードに変更する必要があります。

### タートル操作の実装

実際に移動できるかどうか、または特定の色を使用できるかどうかを判断するために、まずこれらの要因を追跡する`TurtleState`型を拡張する必要があります。

```fsharp
type Log = string -> unit

type private TurtleState = {
    position : Position
    angle : float<Degrees>
    color : PenColor
    penState : PenState
    
    canMove : bool                // 新規追加！
    availableInk: Set<PenColor>   // 新規追加！
    logger : Log                  // 新規追加！
}
```

これは次の項目で拡張されています。

* `canMove`。falseの場合、障壁に到達しており、有効な`move`関数を返すべきではありません。
* `availableInk`は色のセットを含みます。色がこのセットにない場合、その色に対する有効な`setColorXXX`関数を返すべきではありません。
* 最後に、`log`関数を状態に追加しました。これにより、各操作に明示的に渡す必要がなくなります。タートルの作成時に一度設定されます。

`TurtleState`が少し醜くなっていますが、プライベートなので問題ありません！クライアントがこれを見ることはありません。

この拡張された状態を利用して、`move`を変更できます。まずプライベートにし、次に新しい状態を返す前に`canMove`フラグを設定します（`moveResult <> HitABarrier`を使用）。

```fsharp
/// 関数はプライベートです！クライアントはTurtleFunctionsレコードを介してのみアクセス可能
let private move log distance state =

    log (sprintf "Move %0.1f" distance)
    // 新しい位置を計算
    let newPosition = calcNewPosition distance state.angle state.position 
    // 境界外の場合、新しい位置を調整
    let moveResult, newPosition = checkPosition newPosition 
    // 必要に応じて線を描画
    if state.penState = Down then
        dummyDrawLine log state.position newPosition state.color
        
    // 新しい状態とMove結果を返す
    let newState = {
        state with 
         position = newPosition
         canMove = (moveResult <> HitABarrier)   // 新規追加！ 
        }
    (moveResult,newState) 
```

`canMove`をtrueに戻す方法が必要です！そこで、回転すると再び移動できると仮定しましょう。

その論理を`turn`関数に追加しましょう。

```fsharp
let private turn log angle state =
    log (sprintf "Turn %0.1f" angle)
    // 新しい角度を計算
    let newAngle = (state.angle + angle) % 360.0<Degrees>
    // 新規追加！！ 回転後は常に移動可能と仮定
    let canMove = true
    // 状態を更新
    {state with angle = newAngle; canMove = canMove} 
```

`penUp`と`penDown`関数は、プライベートにする以外は変更ありません。

最後の操作`setColor`では、一度使用されるとすぐにインクを利用可能セットから削除します！

```fsharp
let private setColor log color state =
    let colorResult = 
        if color = Red then OutOfInk else ColorOk
    log (sprintf "SetColor %A" color)
    
    // 新規追加！ 色のインクを利用可能なインクから削除
    let newAvailableInk = state.availableInk |> Set.remove color
    
    // 新しい状態とSetColor結果を返す
    let newState = {state with color = color; availableInk = newAvailableInk}
    (colorResult,newState) 
```

最後に、`TurtleState`から`TurtleFunctions`レコードを作成する関数が必要です。これを`createTurtleFunctions`と呼びましょう。

以下に完全なコードを示し、詳細を説明します。

```fsharp
/// TurtleStateに関連するTurtleFunctions構造を作成
let rec private createTurtleFunctions state =
    let ctf = createTurtleFunctions  // エイリアス

    // move関数を作成
    // タートルが移動できない場合はNoneを返す
    let move = 
        // 内部関数
        let f dist = 
            let resp, newState = move state.logger dist state
            (resp, ctf newState)

        // タートルが移動可能な場合は内部関数のSomeを返し、
        // そうでない場合はNoneを返す
        if state.canMove then
            Some f
        else
            None

    // turn関数を作成
    let turn angle = 
        let newState = turn state.logger angle state
        ctf newState

    // ペンの状態関数を作成
    let penDown() = 
        let newState = penDown state.logger state
        ctf newState

    let penUp() = 
        let newState = penUp state.logger state
        ctf newState

    // 色設定関数を作成
    let setColor color = 
        // 内部関数
        let f() = 
            let resp, newState = setColor state.logger color state
            (resp, ctf newState)

        // その色が利用可能な場合は内部関数のSomeを返し、
        // そうでない場合はNoneを返す
        if state.availableInk |> Set.contains color then
            Some f
        else
            None

    let setBlack = setColor Black
    let setBlue = setColor Blue
    let setRed = setColor Red
    
    // 構造を返す
    {
    move     = move
    turn     = turn
    penUp    = penUp 
    penDown  = penDown 
    setBlack = setBlack
    setBlue  = setBlue  
    setRed   = setRed   
    }
```
  
この動作を見てみましょう。

まず、この関数は自身を参照するため、`rec`キーワードが必要です。また、より短いエイリアス（`ctf`）も追加しています。

次に、APIの各関数の新しいバージョンが作成されます。例えば、新しい`turn`関数は次のように定義されます。

```fsharp
let turn angle = 
    let newState = turn state.logger angle state
    ctf newState
```
  
これは元の`turn`関数をロガーと状態で呼び出し、再帰呼び出し（`ctf`）を使用して新しい状態を関数のレコードに変換します。

`move`のようなオプショナルな関数の場合、少し複雑になります。
内部関数`f`が元の`move`を使用して定義され、`state.canMove`フラグの設定に応じて、`f`が`Some`として返されるか、`None`が返されます。

```fsharp
// move関数を作成
// タートルが移動できない場合はNoneを返す
let move = 
    // 内部関数
    let f dist = 
        let resp, newState = move state.logger dist state
        (resp, ctf newState)

    // タートルが移動可能な場合は内部関数のSomeを返し、
    // そうでない場合はNoneを返す
    if state.canMove then
        Some f
    else
        None
```

同様に、`setColor`の場合、内部関数`f`が定義され、色パラメータが`state.availableInk`コレクションに含まれているかどうかに応じて返されるかどうかが決まります。

```fsharp
let setColor color = 
    // 内部関数
    let f() = 
        let resp, newState = setColor state.logger color state
        (resp, ctf newState)

    // その色が利用可能な場合は内部関数のSomeを返し、
    // そうでない場合はNoneを返す
    if state.availableInk |> Set.contains color then
        Some f
    else
        None
```

最後に、これらの関数がすべてレコードに追加されます。

```fsharp
// 構造を返す
{
move     = move
turn     = turn
penUp    = penUp 
penDown  = penDown 
setBlack = setBlack
setBlue  = setBlue  
setRed   = setRed   
}
```

これが`TurtleFunctions`レコードの構築方法です！

あと一つ必要なのは、`TurtleFunctions`の初期値を作成するコンストラクタです。APIに直接アクセスできなくなったので、これがクライアントが利用できる唯一のパブリック関数となります！

```fsharp
/// 初期のタートルを返します。
/// これが唯一のパブリック関数です！
let make(initialColor, log) = 
    let state = {
        position = initialPosition
        angle = 0.0<Degrees>
        color = initialColor
        penState = initialPenState
        canMove = true
        availableInk = [Black; Blue; Red] |> Set.ofList
        logger = log
    }                
    createTurtleFunctions state
```

この関数は`log`関数を組み込み、新しい状態を作成し、`createTurtleFunctions`を呼び出してクライアントが使用する`TurtleFunction`レコードを返します。

### ケイパビリティベースのタートルのクライアントの実装

では、これを使ってみましょう。まず、`move 60`を行い、その後再び`move 60`を試みます。
2回目の移動で境界（100の位置）に達するはずなので、その時点で`move`関数は利用できなくなるはずです。

まず、`Turtle.make`で`TurtleFunctions`レコードを作成します。そして、すぐに移動することはできず、まず`move`関数が利用可能かどうかを確認する必要があります。

```fsharp
let testBoundary() =
    let turtleFns = Turtle.make(Red,log)
    match turtleFns.move with
    | None -> 
        log "エラー：移動1を実行できません"
    | Some moveFn -> 
        ...    
```

最後のケースでは、`moveFn`が利用可能なので、60の距離で呼び出すことができます。

関数の出力は、`MoveResponse`型と新しい`TurtleFunctions`レコードのペアです。

`MoveResponse`は無視し、`TurtleFunctions`レコードを再度確認して、次の移動ができるかどうかを確認します。

```fsharp
let testBoundary() =
    let turtleFns = Turtle.make(Red,log)
    match turtleFns.move with
    | None -> 
        log "エラー：移動1を実行できません"
    | Some moveFn -> 
        let (moveResp,turtleFns) = moveFn 60.0 
        match turtleFns.move with
        | None -> 
            log "エラー：移動2を実行できません"
        | Some moveFn -> 
            ...
```

そして最後にもう一度：

```fsharp
let testBoundary() =
    let turtleFns = Turtle.make(Red,log)
    match turtleFns.move with
    | None -> 
        log "エラー：移動1を実行できません"
    | Some moveFn -> 
        let (moveResp,turtleFns) = moveFn 60.0 
        match turtleFns.move with
        | None -> 
            log "エラー：移動2を実行できません"
        | Some moveFn -> 
            let (moveResp,turtleFns) = moveFn 60.0 
            match turtleFns.move with
            | None -> 
                log "エラー：移動3を実行できません"
            | Some moveFn -> 
                log "成功"
```

これを実行すると、以下の出力が得られます：

```text
Move 60.0
...Draw line from (0.0,0.0) to (60.0,0.0) using Red
Move 60.0
...Draw line from (60.0,0.0) to (100.0,0.0) using Red
エラー：移動3を実行できません
```

これにより、この概念が実際に機能していることがわかります！

このネストされたオプションマッチングは非常に醜いので、簡単な`maybe`ワークフローを作成して見た目を良くしましょう：

```fsharp
type MaybeBuilder() =         
    member this.Return(x) = Some x
    member this.Bind(x,f) = Option.bind f x
    member this.Zero() = Some()
let maybe = MaybeBuilder()
```

そして、「maybe」ワークフロー内で使用できるログ関数を作成します：

```fsharp
/// メッセージをログに記録し、Some()を返す関数
/// 「maybe」ワークフロー内で使用
let logO message =
    printfn "%s" message
    Some ()
```

これで、`maybe`ワークフローを使用して色を設定してみましょう：

```fsharp
let testInk() =
    maybe {
    // タートルを作成
    let turtleFns = Turtle.make(Black,log)
    
    // "setRed"関数の取得を試みる
    let! setRedFn = turtleFns.setRed 

    // 取得できた場合、使用する
    let (resp,turtleFns) = setRedFn() 

    // "move"関数の取得を試みる
    let! moveFn = turtleFns.move 

    // 取得できた場合、赤インクで60の距離を移動
    let (resp,turtleFns) = moveFn 60.0 

    // "setRed"関数がまだ利用可能かどうかを確認
    do! match turtleFns.setRed with
        | None -> 
            logO "エラー：赤インクをもう使用できません"
        | Some _ -> 
            logO "成功：赤インクをまだ使用できます"
    
    // "setBlue"関数がまだ利用可能かどうかを確認
    do! match turtleFns.setBlue with
        | None -> 
            logO "エラー：青インクをもう使用できません"
        | Some _ -> 
            logO "成功：青インクをまだ使用できます"

    } |> ignore
```

この出力は次のようになります：

```text
SetColor Red
Move 60.0
...Draw line from (0.0,0.0) to (60.0,0.0) using Red
エラー：赤インクをもう使用できません
成功：青インクをまだ使用できます
```

実際、`maybe`ワークフローを使用するのはあまり良いアイデアではありません。最初の失敗でワークフローが終了してしまうからです！
実際のコードでは、もう少し良いものを考える必要がありますが、この概念は理解していただけたと思います。

### ケイパビリティベースのアプローチの利点と欠点

*利点*

* クライアントがAPIを乱用することを防ぎます。
* クライアントに影響を与えずにAPIを進化（および退化）させることができます。例えば、関数のレコードで各色関数に`None`をハードコードすることで、モノクロのみのタートルに移行できます。
  その後、`setColor`の実装を安全に削除できます。このプロセス中、クライアントは一切壊れません！これはRESTfulウェブサービスの[HATEOASアプローチ](https://en.wikipedia.org/wiki/HATEOAS)に似ています。
* 関数のレコードがインターフェースとして機能するため、クライアントは特定の実装から分離されています。

*欠点*

* 実装が複雑です。
* クライアントのロジックが非常に複雑になります。関数が利用可能かどうかを常に確認する必要があるためです！
* データ指向のAPIとは異なり、APIは簡単にシリアライズできません。

ケイパビリティベースのセキュリティについての詳細は、[私の投稿](../posts/capability-based-security.md)を参照するか、[「エンタープライズ三目並べ」のビデオ](https://fsharpforfunandprofit.com/ettt/)をご覧ください。

*このバージョンのソースコードは[こちら](https://github.com/swlaschin/13-ways-of-looking-at-a-turtle/blob/master/15-CapabilityBasedTurtle.fsx)で入手できます。*

## まとめ

> 私には三つの心があった  
> フィンガーツリーのように  
> その中にいるのは三匹の不変タートル  
> -- *ウォレス・オサガメ・スティーヴンズ 著 「タートルを見る13の方法」*

追加の方法を2つ紹介できて、すっきりしました！お読みいただきありがとうございます！

*この投稿のソースコードは[GitHubで入手可能](https://github.com/swlaschin/13-ways-of-looking-at-a-turtle)です。*



