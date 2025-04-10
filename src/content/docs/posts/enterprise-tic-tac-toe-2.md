---
layout: post
title: "エンタープライズ三目並べ パート2"
description: "過去の設計を捨て、ケイパビリティ中心のアプローチへ"
categories: ["実践例"]
seriesId: "注釈付きウォークスルー"
seriesOrder: 6
---

*更新：[このトピックに関する講演のスライドとビデオ](https://fsharpforfunandprofit.com/ettt/)*

*このシリーズでは、関数型プログラミングの理論と実践のギャップを埋めることを目指しています。
小さなプロジェクトを選び、設計から実装まで、筆者の思考プロセスを具体的に示していきます。*

[以前の記事](../posts/enterprise-tic-tac-toe.md) では、三目並べゲームの設計を行いました。

直接コードに落とし込んだものとしては悪くありませんでしたが、いくつか気になる点がありました。

残念ながら、考えれば考えるほど、小さな懸念が大きないらだちへと変わり、筆者はますます不満に思いました。

この記事では、なぜ筆者がそれほど不満だったのか、そして最終的にどのようにして満足のいく設計にたどり着いたのかを説明します。

## 以前の設計

以前の記事を簡単に振り返り、以前の設計を示します。

  * 実装のみにわかる非公開の `GameState` があります。
  * プレイヤーが移動するための関数 (`PlayerXMoves` と `PlayerOMoves`) がいくつかあります。
  * UI (またはその他のクライアント) はゲームの状態を各移動に渡し、更新されたゲームの状態を受け取ります。
  * 各移動は、ゲームの状態 (進行中、勝利、引き分け) を含む `MoveResult` も返します。ゲームがまだ進行中の場合は、どちらのターンであるかと、可能な移動も返します。

コードを以下に示します。

```fsharp
module TicTacToeDomain =

    type HorizPosition = Left | HCenter | Right
    type VertPosition = Top | VCenter | Bottom
    type CellPosition = HorizPosition * VertPosition 

    type Player = PlayerO | PlayerX

    type CellState = 
        | Played of Player 
        | Empty

    type Cell = {
        pos : CellPosition 
        state : CellState 
        }

    type PlayerXPos = PlayerXPos of CellPosition 
    type PlayerOPos = PlayerOPos of CellPosition 

    type ValidMovesForPlayerX = PlayerXPos list
    type ValidMovesForPlayerO = PlayerOPos list
        
    type MoveResult = 
        | PlayerXToMove of ValidMovesForPlayerX 
        | PlayerOToMove of ValidMovesForPlayerO 
        | GameWon of Player 
        | GameTied 

    // "ユースケース"        
    type NewGame<'GameState> = 
        'GameState * MoveResult      
    type PlayerXMoves<'GameState> = 
        'GameState -> PlayerXPos -> 'GameState * MoveResult
    type PlayerOMoves<'GameState> = 
        'GameState -> PlayerOPos -> 'GameState * MoveResult
```

## 以前の設計の問題点

では、この設計の何が問題なのでしょうか？ なぜ筆者はそれほど不満だったのでしょうか？

まず、`PlayerXPos` 型と `PlayerOPos` 型の使い方に疑問を感じました。
`CellPosition` を型でラップして、特定のプレイヤーが「所有」しているように見せるという考えでした。
これにより、有効な移動をこれらの型のいずれかに限定することで、プレイヤーXが2回連続でプレイすることを防ぐことができます。
つまり、プレイヤーXが移動した後、次の実行の有効な移動は `PlayerOPos` 型でラップされるため、プレイヤーOだけがそれを使用できます。

問題は、`PlayerXPos` 型と `PlayerOPos` 型が公開されているため、悪意のあるユーザーが偽造して2回プレイできてしまうことです。

これらの型はゲームの状態のようにパラメーター化することで非公開にできますが、設計が非常に複雑になってしまいます。

次に、移動が偽造不可能だったとしても、ゲームの状態が宙に浮いたままです。

ゲームの状態の内部が非公開であることは事実ですが、悪意のあるユーザーはゲームの状態を再利用することで問題を起こす可能性があります。
たとえば、前のターンのゲームの状態を使って有効な移動の1つをプレイしようとしたり、その逆をしたりする可能性があります。

このケースでは危険ではありませんが、一般的には問題になる可能性があります。

このように、この設計にはいくつか問題があり、筆者は不満を感じていました。

## なぜ悪意のあるユーザーを想定するのか？

なぜAPIのユーザーがそれほど悪意を持っていると想定するのでしょうか？偽の移動を偽造したりするのでしょうか？

それは、筆者がこれを設計のガイドラインとして使っているからです。 悪意のあるユーザーが筆者の意図しない操作をできる場合、設計はおそらく不十分です。

[ケイパビリティベースのセキュリティ](../posts/capability-based-security.md) に関するシリーズでは、
[最小権限の原則](https://en.wikipedia.org/wiki/Principle_of_least_privilege)（「POLA」）に沿って設計することで、結果として優れた設計になることを指摘しています。

つまり、呼び出し側が必要とする最小限のインターフェースを設計すると、偶発的な複雑さを回避し (優れた設計)、セキュリティを向上させることができます (POLA)。

その投稿にはちょっとしたヒントがありました。 **悪意のある呼び出し側を想定して設計すると、よりモジュール化されたコードになるでしょう**。

筆者は自分のアドバイスに従って、どうなるか試してみるつもりです。

## POLA向け設計

POLA向けに設計してみましょう。つまり、ユーザーに何かを行うための最小限の「ケイパビリティ（能力）」だけを与え、それ以上のものは与えないようにします。

ここでは、ユーザーに特定の位置を「X」または「O」でマークするケイパビリティを与えたいと考えています。

以前のコードは次のとおりです。

```fsharp
type PlayerXMoves = 
    GameState * PlayerXPos -> // 入力
        GameState * MoveResult // 出力
```

ユーザーは、プレイしたい場所（`PlayerXPos`）を渡しています。

しかし今度は、ユーザーから位置を選択するケイパビリティを取り上げてみましょう。位置情報が組み込まれた関数、たとえば`MoveCapability`をユーザーに与えるのはどうでしょうか？

```fsharp
type MoveCapability = 
    GameState -> // 入力
        GameState * MoveResult // 出力
```

さらに、ゲームの状態も関数に組み込んでしまいましょう。こうすることで、悪意のあるユーザーが誤ったゲーム状態を渡すことができなくなります。

これは、入力がなくなり、すべてが組み込まれることを意味します。

```fsharp
type MoveCapability = 
    unit -> // 入力なし
        GameState * MoveResult // 出力
```

しかし、今度はユーザーが可能なすべての移動に対して、それぞれに対応するケイパビリティのセットを与える必要があります。
これらのケイパビリティはどこから来るのでしょうか？

答えは、`MoveResult`です。`MoveResult`を変更し、位置のリストではなく、ケイパビリティのリストを返すようにします。

```fsharp
type MoveResult = 
    | PlayerXToMove of MoveCapability list 
    | PlayerOToMove of MoveCapability list 
    | GameWon of Player 
    | GameTied 
```

素晴らしい！こちらのアプローチの方がはるかに良いと思います。

`MoveCapability`にゲームの状態が組み込まれているため、出力にゲームの状態を含める必要もなくなりました。

そのため、移動関数は大幅に簡略化され、次のようになります。

```fsharp
type MoveCapability = 
    unit -> MoveResult 
```

ご覧ください！`'GameState`パラメータがなくなりました！

## UIの視点からの簡単なウォークスルー

UIの視点に立って、新しい設計をどのように使うか考えてみましょう。

* まず、前回の移動で得られた、利用可能なケイパビリティのリストがあるとします。
* 次に、ユーザーはプレイするケイパビリティ（つまり、マス目）を1つ選びます。ユーザーは任意のセル位置を指定してプレイすることはできません。これは良いことです。
  しかし、ユーザーはどのケイパビリティがどのマス目に対応するのか、どのようにして知るのでしょうか？ケイパビリティは完全に不透明で、外部からはその機能がわかりません。
* ユーザーが何らかの方法でケイパビリティを選択したら、（パラメータなしで）実行します。
* そして、移動の結果を表示するためにディスプレイを更新します。
  しかし、何を表示すればよいのか、UIには判断材料がありません。セルを抽出するためのゲーム状態はもはや存在しないからです。
  
UIのゲームループの擬似コードを以下に示します。
  
```fsharp
// ゲームオーバーになるまでループ
let rec playMove moveResult = 

    let availableCapabilities = // moveResultから取得
    
    // ユーザー入力からケイパビリティを取得
    let capability = ??
    
    // ケイパビリティを使用
    let newMoveResult = capability()
    
    // 更新されたグリッドを表示
    let cells = ??  // どこから取得？
    
    // 再度プレイ
    match newMoveResult with
    | PlayerXToMove capabilities -> 
        // 別の移動をプレイ
        playMove newMoveResult
    | etc            
```

最初の問題に対処しましょう。ユーザーは、どのケイパビリティがどのマス目に関連付けられているのか、どのようにして知るのでしょうか？

その答えは、ケイパビリティに「ラベル」を付ける新しい構造を作ることです。ここでは、セルの位置でラベル付けします。
```fsharp
type NextMoveInfo = {
    posToPlay : CellPosition 
    capability : MoveCapability }
```

そして、`MoveResult` を変更し、ラベル付けされていないケイパビリティのリストではなく、ラベル付けされたケイパビリティのリストを返すようにします。

```fsharp
type MoveResult = 
    | PlayerXToMove of NextMoveInfo list 
    | PlayerOToMove of NextMoveInfo list 
    | GameWon of Player 
    | GameTied 
```

セル位置はユーザーの情報のためだけのものであることに注意してください。実際の位置は依然としてケイパビリティに組み込まれており、偽造はできません。

2番目の問題です。UIは移動の結果として何を表示すればよいのでしょうか？その情報を新しい構造で直接返すようにしましょう。

```fsharp
/// UIが盤面を表示するために必要なすべての情報
type DisplayInfo = {
    cells : Cell list
    }
```

そして、`MoveResult` を再度変更します。今度は、それぞれの場合に `DisplayInfo` を返すようにします。

```fsharp
type MoveResult = 
    | PlayerXToMove of DisplayInfo * NextMoveInfo list 
    | PlayerOToMove of DisplayInfo * NextMoveInfo list 
    | GameWon of DisplayInfo * Player 
    | GameTied of DisplayInfo 
```

## 循環依存の解消

最終的な設計は以下のとおりです。

```fsharp
/// 特定の位置に移動するためのケイパビリティ。
/// ゲームの状態、プレイヤー、位置はすでに、関数に「組み込まれて」います。
type MoveCapability = 
    unit -> MoveResult 

/// ケイパビリティと、ケイパビリティが関連付けられている位置。
/// これにより、UIはユーザーが特定のケイパビリティを選んで実行できるよう、
/// 情報を表示できます。
type NextMoveInfo = {
    // 位置はUI情報のためだけにあります
    // 実際の位置はケイパビリティに組み込まれています
    posToPlay : CellPosition 
    capability : MoveCapability }

/// 移動の結果。以下を含みます。
/// * 現在の盤面の状態に関する情報。
/// * 次の移動のためのケイパビリティ（存在する場合）。
type MoveResult = 
    | PlayerXToMove of DisplayInfo * NextMoveInfo list 
    | PlayerOToMove of DisplayInfo * NextMoveInfo list 
    | GameWon of DisplayInfo * Player 
    | GameTied of DisplayInfo 
```

しかし、これはコンパイルできません。

`MoveCapability` は `MoveResult` に依存し、`MoveResult` は `NextMoveInfo` に依存し、`NextMoveInfo` は再び `MoveCapability` に依存しています。しかし、F# コンパイラは一般的に前方参照を許可しません。

このような循環依存は、一般的に良くないとされています（私自身も「 [循環依存は悪だ](../posts/cyclic-dependencies.md) 」という記事を書いています！）。
循環依存を削除するために使える [回避策](../posts/removing-cyclic-dependencies.md) はいくつかあります。

しかし今回は、`type` キーワードの代わりに `and` キーワードを使って、これらの型をリンクします。これは、まさにこのような場合に役立ちます。

```fsharp
type MoveCapability = 
    // etc
and NextMoveInfo = {
    // etc
and MoveResult = 
    // etc
```

## APIの見直し

APIは現在どのようになっているでしょうか？

当初のAPIには、3つのユースケースのスロットとヘルパー関数 `getCells` がありました。

```fsharp
type TicTacToeAPI<'GameState>  = 
    {
    newGame : NewGame<'GameState>
    playerXMoves : PlayerXMoves<'GameState> 
    playerOMoves : PlayerOMoves<'GameState> 
    getCells : GetCells<'GameState>
    }
```

しかし、`playerXMoves` と `playerOMoves` は、前の移動の `MoveResult` で返されるため、必要なくなりました。

また、`DisplayInfo` を直接返すようになったため、`getCells` も必要なくなりました。

これらの変更を経て、新しいAPIは1つのスロットだけになり、次のようになります。

```fsharp
type NewGame = unit -> MoveResult

type TicTacToeAPI = 
    {
    newGame : NewGame 
    }
```

`NewGame` を定数からパラメータのない関数に変更しました。これは実際には、`MoveCapability` の一種です。

## 新しい設計の全体像

新しい設計の全体像は以下のとおりです。

```fsharp
module TicTacToeDomain =

    type HorizPosition = Left | HCenter | Right
    type VertPosition = Top | VCenter | Bottom
    type CellPosition = HorizPosition * VertPosition 

    type Player = PlayerO | PlayerX

    type CellState = 
        | Played of Player 
        | Empty

    type Cell = {
        pos : CellPosition 
        state : CellState 
        }

    /// UIが盤面を表示するのに必要な情報すべて
    type DisplayInfo = {
        cells : Cell list
        }
    
    /// 特定の位置に移動するためのケイパビリティ。
    /// ゲームの状態、プレイヤー、位置はすでに、関数に組み込まれています。
    type MoveCapability = 
        unit -> MoveResult 

    /// ケイパビリティと、ケイパビリティが関連付けられている位置。
    /// これにより、UIが情報を表示し、
    /// ユーザーが特定のケイパビリティを選んで実行できるようにします。
    and NextMoveInfo = {
        // 位置はUI情報のためだけにあります
        // 実際の位置はケイパビリティに組み込まれています
        posToPlay : CellPosition 
        capability : MoveCapability }

    /// 移動の結果。以下を含みます。
    /// * 現在の盤面の状態に関する情報。
    /// * 次の移動のためのケイパビリティ（存在する場合）。
    and MoveResult = 
        | PlayerXToMove of DisplayInfo * NextMoveInfo list 
        | PlayerOToMove of DisplayInfo * NextMoveInfo list 
        | GameWon of DisplayInfo * Player 
        | GameTied of DisplayInfo 

    // newGame関数のみが実装からエクスポートされます
    // 他の関数はすべて、前の移動の結果から得られます
    type TicTacToeAPI  = 
        {
        newGame : MoveCapability
        }
```

以前の設計よりも、こちらの設計の方がはるかに良いと感じています。

* UIがゲームの状態を気にする必要がありません。
* 見苦しい型パラメータがありません。
* APIがさらにカプセル化され、悪意のあるUIはほとんど何もできません。
* コードが短くなりました。これは良い兆候です。

## アプリケーション全体

この新しい設計を使うように、実装とコンソールアプリケーションを更新しました。

GitHubで公開されているアプリケーション全体は、[このgist](https://gist.github.com/swlaschin/7a5233a91912e66ac1e4) で確認できます。

実装も少しシンプルになりました。すべての状態が非表示になり、`PlayerXPos`のような型を扱う必要がなくなったからです。

## ロギングの再検討

前回の記事では、APIにロギング機能を組み込む方法を紹介しました。

しかし、今回の設計では、ケイパビリティは不透明でパラメータがないため、特定のプレイヤーが特定の場所を選んだという情報を、どのようにログに記録すればよいのでしょうか？

ケイパビリティ自体をログに記録することはできませんが、`NextMoveInfo` から得られるコンテキストであれば、ログに記録できます。具体的にどのように動作するかを見てみましょう。

まず、`MoveCapability` が与えられたとき、プレイヤーと使われたセル位置もログに記録する、別の `MoveCapability` に変換します。

そのためのコードは次のとおりです。

```fsharp
/// MoveCapabilityをログ記録バージョンに変換する
let transformCapability transformMR player cellPos (cap:MoveCapability) :MoveCapability =
    
    // 実行時にプレイヤーとcellPosをログに記録する、新しいケイパビリティを作る
    let newCap() =
        printfn "LOGINFO: %A played %A" player cellPos
        let moveResult = cap() 
        transformMR moveResult 
    newCap
```

このコードの動作は以下のとおりです。

* 元のケイパビリティと同様に、パラメータなしで `MoveResult` を返す、新しいケイパビリティ `newCap` 関数を作ります。
* 呼び出されたら、プレイヤーとセルの位置をログに記録します。これらは、渡された `MoveCapability` からは取得できないため、明示的に渡す必要があります。
* 次に、元のケイパビリティを呼び出して結果を取得します。
* 結果自体には次の移動のためのケイパビリティが含まれているため、`MoveResult` 内の各ケイパビリティを再帰的に変換し、新しい `MoveResult` を返す必要があります。
  これは、渡された `transformMR` 関数によって行われます。

これで `MoveCapability` を変換できるようになったので、次は `NextMoveInfo` を変換します。
  
```fsharp
/// NextMoveをログ記録バージョンに変換する
let transformNextMove transformMR player (move:NextMoveInfo) :NextMoveInfo = 
    let cellPos = move.posToPlay 
    let cap = move.capability
    {move with capability = transformCapability transformMR player cellPos cap} 
```

このコードの動作は以下のとおりです。

* `NextMoveInfo` が与えられたら、そのケイパビリティを変換されたものに置き換えます。 `transformNextMove` の出力は、新しい `NextMoveInfo` です。
* `cellPos` は元の移動から取得します。
* プレイヤーと `transformMR` 関数は移動からは取得できないため、再度明示的に渡す必要があります。
   
最後に、`MoveResult` を変換する関数を実装します。
   
```fsharp
/// MoveResultをログ記録バージョンに変換する
let rec transformMoveResult (moveResult:MoveResult) :MoveResult =
    
    let tmr = transformMoveResult // 省略形！

    match moveResult with
    | PlayerXToMove (display,nextMoves) ->
        let nextMoves' = nextMoves |> List.map (transformNextMove tmr PlayerX) 
        PlayerXToMove (display,nextMoves') 
    | PlayerOToMove (display,nextMoves) ->
        let nextMoves' = nextMoves |> List.map (transformNextMove tmr PlayerO)
        PlayerOToMove (display,nextMoves') 
    | GameWon (display,player) ->
        printfn "LOGINFO: Game won by %A" player 
        moveResult
    | GameTied display ->
        printfn "LOGINFO: Game tied" 
        moveResult
```

このコードの動作は以下のとおりです。

* `MoveResult` が与えられると、それぞれの場合を処理します。出力は新しい `MoveResult` です。
* `GameWon` と `GameTied` の場合は、結果をログに記録し、元の `moveResult` を返します。
* `PlayerXToMove` の場合は、それぞれの `NextMoveInfo` を取得し、必要なプレイヤー（`PlayerX`）と `transformMR` 関数を渡して変換します。
  `transformMR` 関数は、まさにこの関数自身への参照であることに注意してください。そのため、`transformMoveResult` に `rec` を付けて、この自己参照を許可する必要があります。
* `PlayerOToMove` の場合は、`PlayerXToMove` の場合と同じ処理をしますが、プレイヤーを `PlayerO` に変更します。

最後に、`newGame` から返される `MoveResult` を変換することで、API全体にロギング機能を組み込むことができます。

```fsharp
/// APIにロギングを注入する
let injectLogging api =
   
    // 関数をログ記録バージョンに置き換えた、
    // 新しいAPIを作る
    { api with
        newGame = fun () -> api.newGame() |> transformMoveResult
        }
```

これで完了です。ロギングの実装は以前より少し複雑になりましたが、それでも可能です。

## 再帰に関する注意点

このコードでは、互いに再帰的に呼び出す関数をあちこちで渡しています。
このような処理を行う場合、意図せずにスタックオーバーフローを起こさないように注意が必要です。

今回のようなゲームでは、ネストされた呼び出しの回数が少ないため、問題にはなりません。
しかし、何万回もネストされた呼び出しを行う場合は、潜在的な問題を考慮する必要があります。

場合によっては、F#コンパイラが末尾呼び出しの最適化を行いますが、念のため、コードに負荷テストを実行することをお勧めします。

## データ中心設計とケイパビリティ中心設計

元の設計と新しい設計には、興味深い違いがあります。

元の設計は*データ中心*でした。各プレイヤーが使う関数を用意しましたが、それは毎回異なるデータを渡して使う、*同じ*関数でした。

新しい設計は*関数中心*（あるいは私が好む言い方では*ケイパビリティ中心*）です。データはほとんどなくなり、
各関数の呼び出しの結果は、次のステップで使う*別の*関数のセットになり、これが際限なく続きます。

これは、[継続ベース](../posts/computation-expressions-continuations.md) のアプローチに似ています。
ただし、継続を渡すのではなく、関数が継続のリストを返し、その中から1つを選んで使うという点が異なります。

## ケイパビリティとRESTful設計 - 最高の組み合わせ

仮に、この設計をWebサービスに変えたいとしたら、どのようにすればよいでしょうか？

*データ中心*設計では、呼び出す関数（Web APIのエンドポイントURI）があり、それにデータ（JSONまたはXMLとして）を渡します。
呼び出しの結果は、ディスプレイ（DOMなど）を更新するためのデータです。

しかし、*ケイパビリティ中心*設計では、データはどこにあり、関数をどのように渡せばよいのでしょうか？このアプローチは、Webサービスにはまったく向いていないように思えます。

驚くべきことに、これを実現する方法があり、それは[HATEOAS](https://en.wikipedia.org/wiki/HATEOAS) を使うRESTful設計で採用されているアプローチと全く同じです。

各ケイパビリティはサーバーによってURIにマッピングされ、そのURIにアクセスすることは、ケイパビリティを実行すること（関数を呼び出すこと）と同じになります。

たとえば、この三目並べの設計に基づいたWebアプリケーションでは、サーバーは最初に、各マス目に対応する9つのURIを返します。
そして、いずれかのマス目がクリックされ、関連付けられたURIにアクセスされると、サーバーは残りのプレイされていないマス目に対する8つのURIを返します。
プレイ済みのマス目のURIはリストに含まれないため、再度クリックすることはできません。

もちろん、8つのプレイされていないマス目の1つをクリックすると、サーバーは7つの新しいURIを返し、というように続きます。

このモデルこそ、RESTのあるべき姿です。アプリにエンドポイントをハードコードするのではなく、返されたページの内容に基づいて、次に行うことを決めます。

このアプローチの欠点は、ステートレスではないように見えることです。

* データ中心設計では、移動に必要なデータはすべて毎回渡されるため、バックエンドサービスのスケーリングは容易です。
* しかし、ケイパビリティ中心設計では、状態をどこかに保存する必要があります。
  ゲームの状態全体をURIにエンコードできれば、ステートレスサーバーも実現できますが、そうでない場合は、何らかの状態ストレージが必要になります。

一部のWebフレームワークでは、この関数中心のアプローチを設計の核としています。特に有名なのは [Seaside](https://en.wikipedia.org/wiki/Seaside_%28software%29) です。

F#用の優れた [WebSharperフレームワーク](https://websharper.com) も [同様のアプローチ](https://websharper.com/blog-entry/3965) を採用していると思います
（WebSharperはまだ十分に理解していないので、間違っていたらご指摘ください）。

## まとめ

この記事では、元の設計を見直し、より関数中心的な設計に置き換えました。こちらの設計の方が気に入っています。

もちろん、関心の分離、API、強固なセキュリティモデル、自己文書化コード、ロギングなど、私たちが重視する要素はすべて維持されています。

三目並べの分析はこれで終わりにします。十分に検討できたと思います。この2つのウォークスルーが興味深いものであったなら幸いです。私自身も多くの学びがありました。

*注：この記事のコードはGitHubの [このgist](https://gist.github.com/swlaschin/7a5233a91912e66ac1e4) で入手できます。*