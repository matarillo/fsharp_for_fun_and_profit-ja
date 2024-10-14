---
layout: post
title: "エンタープライズ三目並べ"
description: "純粋関数型で実装するときの設計判断をウォークスルーする"
categories: ["実践例"]
seriesId: "注釈付きチュートリアル"
seriesOrder: 5
---

*更新: [このトピックに関する講演のスライドとビデオ](https://fsharpforfunandprofit.com/ettt/)*

*このシリーズでは、関数型プログラミングの理論と実践のギャップを埋めることを目指しています。
小さなプロジェクトを選び、設計から実装まで、筆者の思考プロセスを具体的に示していきます。*

今回は、三目並べ (○×ゲーム) を題材に、関数型スタイルで実装する方法をウォークスルーしていきましょう。

![tic-tac-toe](../assets/img/tic-tac-toe.png)

念のため、私はゲーム開発者ではないので、パフォーマンスやUXにはこだわりません。
設計プロセス、つまり誰もが知っているであろう三目並べのルールを関数型コードに落とし込むことに集中します。

さらに言うと、あえて設計を少し凝りすぎて、関数型でどこまでできるかをお見せします。オブジェクトは一切使いません。すべてを不変にして、すべてに[型](../series/designing-with-types.md)を付けます。
[ケイパビリティベースのセキュリティ](../posts/capability-based-security.md)なども盛り込みます。
パフォーマンスは*確実に*犠牲になります。幸い、三目並べは高いフレームレートを必要としませんからね！

今回はこのバージョンを「エンタープライズ三目並べ」と呼ぶことにします。

なぜ「エンタープライズ」なのか？エンタープライズには、以下のようなものが必要だからです。

* 専門チームがコードの各部分を同時に開発できるように、**関心の分離**が必要になります。
* 各チームが並行して効率的に作業できるように、**文書化されたAPI**が必要です。
* 許可されていない操作が行われないように、**セキュリティモデル**が必要です。
* アーキテクトが実装がUML図と一致していることを確認できるように、**十分に文書化されたコード**が必要です。
* システムがSOXに準拠していることを保証するために、**監査とログ記録**が必要です。
* 急速な顧客獲得の課題に対応できるよう、**スケーラビリティ**が必要です。

もちろん、これらは*建前*で、本当の理由は別にあることは誰もが知っていますよね？
「エンタープライズ設計」の本当の理由は、現場の声を聞けば明らかです。

* *開発マネージャー:* 「フロントエンドチームとバックエンドチームは仲が悪くて、同じ部屋で仕事をしたくないから、関心の分離が必要なんだ。」
* *フロントエンドチーム:* 「バックエンドを作ってる連中が、コミットするたびに私たちのコードを壊すから、文書化されたAPIが必要なんだ。」
* *バックエンドチーム:* 「フロントエンドを作ってる連中は、制限しないと何かバカなことをやらかすから、セキュリティモデルが必要なんだ。」
* *メンテナンスチーム:* 「私たちに投げつけられるスパゲッティコードをリバースエンジニアリングするのにうんざりしてるから、ちゃんと文書化されたコードが必要なんだ。」
* *テスターと運用担当者:* 「システムが中で何をしているのかを知るために、監査とログ記録が必要なんだ。」
* *全員:* 「スケーラビリティなんて本当は必要ないんだけど、CTOがバズワードに踊らされてるから仕方ないんだ。」

[PHPのEasy Plus](https://github.com/Herzult/SimplePHPEasyPlus)や
[JavaのエンタープライズFizzBuzz](https://github.com/EnterpriseQualityCoding/FizzBuzzEnterpriseEdition)など、
すでに素晴らしい「エンタープライズ」プロジェクトはいくつかありますが、
この作品も、その仲間入りができればと思っています。

冗談はさておき、コードが他のエンタープライズプロジェクトほど~~ひどく~~面白くならないことを願っています。
実際、「エンタープライズ」に対応できる、それでいて読みやすい関数型コードを作成できることを示したいと考えています。

## ドメイン設計

> 「ゲームのルールを知らない人がソースコードを見ればルールを理解できるようにゲームを書きなさい」 -- [Raganwald](http://raganwald.com/)

いつものように、型ファーストで設計を進めていきましょう。このアプローチでは、

* まずは型だけを定義します。実装コードは書きません。
* 各ユースケース、つまりゲームで起こりうる動作を、1つの入力と1つの出力を持つ関数型で表現します。複数のパラメータが必要な場合はタプルを使います。
* 設計は基本的にトップダウンとアウトサイドインで行いますが、必要に応じてボトムアップも取り入れます。
* UIはとりあえず考えません。コアドメインの設計には、イベントやオブザーバブルは登場しません。純粋関数型で設計します。

この記事のタイトルを「**型に導かれて育つ関数型ソフトウェア**」にしても良かったかもしれませんね。

前にも言ったように、私は、オブジェクトよりも、ゲームで起こりうるイベントを起点に設計を進めるのが好きです。
私は古い人間なので「ユースケース」と呼んでいますが、[イベントストーミング](https://ziobrando.blogspot.com/2013/11/introducing-event-storming.html)のようなアプローチも好きです。

さて、三目並べの「ドメイン」には、考慮すべき3つの「イベント駆動型ユースケース」（ここでは、マウスクリック）があります。

* ゲームの初期化
* プレイヤーXが手を打つ
* プレイヤーOが手を打つ

まずは、ゲームの初期化から始めましょう。これは、オブジェクト指向でいう`new`でオブジェクトを作る操作に相当します。

三目並べには設定パラメータは必要ないので、入力は「なし」（`unit`）で、出力はプレイ準備のできたゲームの状態になります。

```fsharp
type InitGame = unit -> Game
```

ここで、`Game`というのは何でしょうか？ すべてが不変なので、他のユースケースでは、既存のゲームの状態を入力として受け取り、少しだけ変化したゲームの状態を返す必要があります。
そう考えると、`Game`という名前は少し正確ではありませんね。`GameState`の方が適切でしょう。 プレイヤーXが手を打つ関数は、次のようになります。

```fsharp
type PlayerXMoves = GameState * SomeOtherStuff -> GameState
```

`SomeOtherStuff`を入力パラメータに追加したのは、*必ず*何かしらの追加情報が必要になるからです！ この「追加情報」が何なのかは後で考えます。

さて、次に何をしましょうか？ `GameState`の中身を詳しく見ていくべきでしょうか？

いいえ。まだ設計の初期段階なので、高レベルにとどまり、「アウトサイドイン」で設計を進めていきましょう。
このアプローチなら、重要なことに集中し、実装の詳細に気を取られずに済みます。

## 手を打つ関数を設計する

先ほど、各ユースケースに対応する関数を用意すると言いました。つまり、次のような関数です。

```fsharp
type PlayerXMoves = GameState * SomeOtherStuff -> GameState 
type PlayerOMoves = GameState * SomeOtherStuff -> GameState 
```

各プレイヤーの手番で、現在のゲーム状態とプレイヤーが選択した場所などの入力を受け取り、*新しい*ゲーム状態を返します。

ここで問題になるのは、両方の関数が全く同じに見え、簡単に取り違えてしまう可能性があることです。
正直なところ、ユーザーインターフェースが常に正しい関数を呼び出すとは限りません。少なくとも、潜在的な問題になる可能性があります。

1つの解決策は、*2つ*の関数ではなく、*1つ*の関数にすることです。そうすれば、間違いようがありません。

しかし、今度は2つの異なる入力ケースを処理する必要があります。どうすれば良いでしょうか？ 簡単です！ 判別共用体を使えば良いのです。

```fsharp
type UserAction = 
    | PlayerXMoves of SomeStuff
    | PlayerOMoves of SomeStuff
```

そして、プレイヤーが手を打つ処理は、ゲームの状態と一緒にユーザーアクションを渡すだけで実現できます。

```fsharp
type Move = UserAction * GameState -> GameState 
```

これで、UIが呼び出す関数は2つから1つになり、間違いが減りました。

このアプローチは、ユーザーが1人の場合に最適です。なぜなら、ユーザーが可能な操作をすべて網羅できるからです。たとえば、他のゲームでは、次のような型になるかもしれません。

```fsharp
type UserAction = 
    | MoveLeft 
    | MoveRight 
    | Jump
    | Fire
```

しかし、今回のケースでは、この方法はあまり適切ではありません。なぜなら、三目並べには*2人*のプレイヤーがいるからです。
各プレイヤーに専用の関数を割り当て、他のプレイヤーの関数を使えないようにしたいのです。こうすることで、ユーザーインターフェースが間違った関数を呼ぶことを防ぐだけでなく、ケイパビリティベースのセキュリティも実現できます。

しかし、これで元の課題に戻ってしまいました。2つの関数をどのように区別すれば良いでしょうか？

解決策は、型を使って区別することです。 `SomeOtherStuff`を各プレイヤーが*所有*するようにします。

```fsharp
type PlayerXMoves = GameState * PlayerX's Stuff -> GameState 
type PlayerOMoves = GameState * PlayerO's Stuff -> GameState 
```

このように、2つの関数を区別することで、PlayerOはPlayerXの`Stuff`なしにPlayerXの関数を呼び出すことができなくなります。
少し複雑に聞こえるかもしれませんが、ご安心ください。 見た目ほど難しくはありません！

## SomeOtherStuffの正体

さて、謎の`SomeOtherStuff`の正体を探っていきましょう。つまり、プレイヤーが手を打つにはどんな情報が必要なのか、ということです。

多くのゲームでは、状況やシステムの状態に応じて、様々な情報が必要になります。

しかし、三目並べの場合は単純です。プレイヤーが印を付けるグリッド上の位置、つまり「左上」「中央下」などを指定するだけで十分です。

では、この位置を型を使ってどのように表現すれば良いでしょうか？

最も分かりやすいのは、整数でインデックス化された2次元グリッドを使う方法でしょう。たとえば、`(1,1)`、`(1,2)`、`(1,3)`のように。
しかし、正直に言うと、境界チェックを扱う単体テストを書くのは面倒ですし、タプルの要素のどちらが行でどちらが列なのかを覚えるのも苦手です。
テストを書かなくても済むようなコードを書きたいですよね！

そこで、水平方向と垂直方向の位置をそれぞれ明示的に列挙した型を定義することにします。

```fsharp
type HorizPosition = Left | HCenter | Right
type VertPosition = Top | VCenter | Bottom
```

そして、グリッド内のマス（これを「セル」と呼ぶことにします）の位置は、これらの組み合わせで表現します。

```fsharp
type CellPosition = HorizPosition * VertPosition 
```

「移動関数」の定義に戻ると、次のようになります。

```fsharp
type PlayerXMoves = GameState * CellPosition -> GameState 
type PlayerOMoves = GameState * CellPosition -> GameState 
```

これは、「プレイヤーが手を打つには、ゲームの状態と選んだセルの位置を入力として、更新されたゲームの状態を出力とする」という意味になります。

プレイヤーXとプレイヤーOはどちらも*同じ*セルに印を付けることができます。そのため、先ほども触れたように、両者を区別する必要があります。

そこで、[単一ケース共用体](../posts/designing-with-types-single-case-dus.md)を使って、それぞれをラップすることにします。

```fsharp
type PlayerXPos = PlayerXPos of CellPosition 
type PlayerOPos = PlayerOPos of CellPosition 
```

これで、移動関数の型が異なり、混同することがなくなりました。

```fsharp
type PlayerXMoves = GameState * PlayerXPos -> GameState 
type PlayerOMoves = GameState * PlayerOPos -> GameState 
```

## GameStateの正体

今度は、ゲームの状態を表す`GameState`について考えてみましょう。プレイヤーが手を打つ間のゲームの状態を完全に表現するには、どんな情報が必要でしょうか？

必要なのは、各セルの状態を保持したリストだけでしょう。ということで、ゲームの状態を次のように定義できます。

```fsharp
type GameState = {
    cells : Cell list
    }
```

では、`Cell`を定義するには何が必要でしょうか？

まず、セルの位置が必要です。そして、セルに「X」か「O」が置かれているか、空なのかを表す必要があります。そこで、セルを次のように定義します。

```fsharp
type CellState = 
    | X
    | O
    | Empty

type Cell = {
    pos : CellPosition 
    state : CellState 
    }
```

## 出力を設計する

次は出力についてです。 UIを更新するには、どんな情報が必要でしょうか？

1つの方法は、ゲームの状態全体をUIに渡して、UI側で全てを再描画する方法です。
あるいは、より効率的に、UI側で以前の状態をキャッシュしておき、差分を計算して更新が必要な部分だけを書き換えることもできます。

何千ものセルを持つような複雑なアプリケーションでは、変更されたセルだけを明示的に返すことで、
UIの処理を効率化し、負担を軽減できます。

```fsharp
// "ChangedCells"を追加
type PlayerXMoves = GameState * PlayerXPos -> GameState * ChangedCells
type PlayerOMoves = GameState * PlayerOPos -> GameState * ChangedCells
```

しかし、三目並べはシンプルなゲームなので、今回はゲームの状態だけを返し、`ChangedCells`のようなものは返さないことにします。

とはいえ、最初に言ったように、UIはできるだけシンプルにしたいと考えています。
UIは「考える」べきではなく、バックエンドから必要な情報をすべて受け取って、指示通りに表示するだけで良いはずです。

現状では、セルは`GameState`から直接取得できますが、UIが`GameState`の内部構造を知る必要はないでしょう。
そこで、UIに`GameState`からセルを抽出するための関数（`GetCells`）を提供することにします。

```fsharp
type GetCells = GameState -> Cell list
```

別の方法として、`GetCells`がすべてのセルを2次元グリッドに整理して返すことも考えられます。これはUI側の処理をさらに簡略化します。

```fsharp
type GetCells = GameState -> Cell[,] 
```

しかし、この方法では、ゲームエンジンがUIがインデックス付きグリッドを使用していると想定してしまいます。UIがバックエンドの内部構造を知るべきではないのと同様に、バックエンドもUIの動作方法を想定するべきではありません。

UIがバックエンドと同じ`Cell`の定義を共有するのは問題ありません。UIに`Cell`のリストを渡し、UI側で自由に表示させれば良いのです。

これで、UIがゲームを表示するために必要な情報はすべて揃いました。

## 設計の振り返り

さて、ここまでの設計を振り返ってみましょう。

```fsharp
module TicTacToeDomain =

    type HorizPosition = Left | HCenter | Right
    type VertPosition = Top | VCenter | Bottom
    type CellPosition = HorizPosition * VertPosition 

    type CellState = 
        | X
        | O
        | Empty

    type Cell = {
        pos : CellPosition 
        state : CellState 
        }
        
    type PlayerXPos = PlayerXPos of CellPosition 
    type PlayerOPos = PlayerOPos of CellPosition 

    // ゲームの状態 (非公開)
    type GameState = exn  // プレースホルダー

    // ユースケース
    type InitGame = unit -> GameState
    type PlayerXMoves = GameState * PlayerXPos -> GameState 
    type PlayerOMoves = GameState * PlayerOPos -> GameState 

    // ヘルパー関数
    type GetCells = GameState -> Cell list
```

`GameState`の実装を隠しながらコードをコンパイルするために、`GameState`の代わりに汎用例外クラス (`exn`) をプレースホルダーとして使っている点に注意してください。
`unit` や `string` を使うこともできましたが、`exn` は他の型と混同される可能性が低く、
後でうっかり見落とされることも防げます。

## タプルについて

設計段階では、入力パラメータを個別に扱うのではなく、1つのタプルにまとめて記述しています。

つまり、次のような書き方にしています。

```fsharp
InputParam1 * InputParam2 * InputParam3 -> Result 
```

より一般的な書き方は、次の通りです。

```fsharp
InputParam1 -> InputParam2 -> InputParam3 -> Result
```

タプルを使うのは、入力と出力を明確にするためです。
実装段階では、部分適用などの関数型プログラミングのテクニックを活用するために、一般的な書き方に変更する可能性が高いでしょう。

## 設計のウォークスルー

大まかな設計ができたので、実際に使われているところを想像しながら、ウォークスルーをしてみましょう。
大規模な設計では、試作版を作って動作を確認することもありますが、今回は設計が小さいので、頭の中でシミュレーションできます。

では、私たちがUIになったつもりで、上記の設計に従ってゲームを表示してみましょう。
まずは、初期化関数を呼び出して、新しいゲームの状態を取得します。

```fsharp
type InitGame = unit -> GameState 
```

これで `GameState` が取得できました。初期状態のグリッドを表示する準備が整いました。

UIは、たとえば空のボタンを並べたグリッドを作成し、各ボタンにセルを関連付けて、「空」の状態を描画します。

UIは何も考える必要がないので、これは良い設計と言えるでしょう。
すべてのセルのリストが明示的に提供され、初期状態が `Empty` であることが分かっているので、UIはデフォルトの状態を意識する必要はありません。与えられた情報をそのまま表示すれば良いのです。

1つ気になる点があります。ゲームのセットアップに何も入力が必要なく、*かつ*ゲームの状態は不変なので、どのゲームでも初期状態は全く同じになります。

ということは、初期状態を作る関数は必要なく、すべてのゲームで再利用される「定数」があれば十分です。

```fsharp
type InitialGameState = GameState 
```

## ゲーム終了の判定

ウォークスルーの続きとして、実際に手を打ってみましょう。

* プレイヤー (XまたはO) がセルをクリックします。
* プレイヤーと `CellPosition` を組み合わせて、`PlayerXPos` などの適切な型を作成します。
* それを `GameState` と一緒に、対応する `Move` 関数に渡します。

```fsharp
type PlayerXMoves = 
    GameState * PlayerXPos -> GameState 
```

関数は、新しい `GameState` を出力します。 UIは `GetCells` を呼び出して、新しいセルのリストを取得します。 UIはこのリストを基に表示を更新し、次の手番に備えます。

素晴らしいですね！

…と言いたいところですが、ゲームの終了を判定する方法がありません。

この設計では、ゲームは永遠に続いてしまいます。ゲームが終了したかどうかをUIに伝えるために、移動関数の出力に何かを追加する必要があります。

そこで、ゲームの状態を管理するための `GameStatus` 型を定義しましょう。

```fsharp
type GameStatus = 
    | InProcess // 進行中
    | PlayerXWon // プレイヤーXの勝ち
    | PlayerOWon // プレイヤーOの勝ち
    | Tie // 引き分け
```

そして、これを移動関数の出力に追加します。

```fsharp
type PlayerXMoves = 
    GameState * PlayerXPos -> GameState * GameStatus 
```

これで、`GameStatus` が `InProcess` (進行中) である間はゲームを続け、そうでない場合は終了することができます。

UIの疑似コードは次のようになります。

```fsharp
// ゲームが終わるまでループ
let rec playMove gameState = 
    let pos = // ユーザー入力から位置を取得
    let newGameState,status = 
        playerXMoves (gameState,pos) // 手を打つ
    match status with
    | InProcess -> 
        // 次の手を打つ
        playMove newGameState
    | PlayerXWon -> 
        // プレイヤーXの勝利を表示
    | etc // その他の終了状態

// 初期状態でゲームを開始
let startGame() = 
    playMove initialGameState
```

これでゲームをプレイするのに必要なものは揃ったと思うので、エラー処理について考えていきましょう。

## どんなエラーが起こりうる？

ゲームの内部実装を考える前に、UIチームがこの設計を使う際に、どんなエラーを起こす可能性があるかを考えてみましょう。

**UIが不正な `GameState` を作成して、ゲームを壊してしまう可能性は？**

いいえ。ゲームの状態の内部構造はUIから隠蔽されているので、そのような心配はありません。

**UIが不正な `CellPosition` を渡してしまう可能性は？**

いいえ。`CellPosition` の水平方向と垂直方向の要素は制限されているため、不正な値で作成することはできません。
検証は不要です。

**UIが*正しい* `CellPosition` を*間違った*タイミングで渡してしまう可能性は？**

それはあり得ますね！ 現状の設計では、プレイヤーが同じマスに2回手を打つことを防ぐものがありません。

**UIがプレイヤーXに連続して2回手を打たせてしまう可能性は？**

これも、現状の設計では防ぐことができません。

**ゲームが終了したにもかかわらず、UIが `GameStatus` をチェックし忘れたらどうなるでしょう？ ゲームロジックはそれでも手を受け入れるべきでしょうか？**

もちろん受け入れるべきではありませんが、これも現状の設計では防げていません。

ここで重要なのは、実装に特別な検証コードを追加することなく、これらの3つの問題を*設計段階で*解決できるかどうかです。
言い換えれば、これらのルールを*型*に組み込むことができるかどうかです。

「なぜこんなに型にこだわる必要があるんだ？」と思うかもしれません。

検証コードよりも型を使うメリットは、型が設計の一部になるということです。つまり、今回のようなビジネスルールがコードから明確に読み取れるようになります。
一方、検証コードは、あちこちに散らばっていて、分かりにくいクラスに埋もれていることが多いため、すべての制約を把握するのが難しくなりがちです。

一般的に、私は可能な限りコードよりも型で表現することを好みます。

## 型でルールを徹底する

では、型を使ってルールを表現できるのでしょうか？答えはイエスです！

同じマスに2回手が打たれないようにするには、ゲームエンジンを改造して、有効な手のリストを出力するようにします。
そして、*次の*手番でプレイできるのは、このリストに含まれる手*だけ*という制限を加えます。

こうすることで、移動関数の型は次のようになります。

```fsharp
type ValidPositionsForNextMove = CellPosition list

// 移動関数は、次の移動で可能な位置のリストを返す
type PlayerXMoves = 
    GameState * PlayerXPos -> // 入力
        GameState * GameStatus * ValidPositionsForNextMove // 出力
```

さらに、プレイヤーXが連続して2回手を打てないように、この仕組みを拡張してみましょう。`ValidPositionsForNextMove` を、単なる位置のリストではなく、`PlayerOPos` のリストに変更するだけです。
こうすれば、プレイヤーXはこれらの位置に手を打つことができなくなります。

```fsharp
type ValidMovesForPlayerX = PlayerXPos list
type ValidMovesForPlayerO = PlayerOPos list

type PlayerXMoves = 
    GameState * PlayerXPos -> // 入力
        GameState * GameStatus * ValidMovesForPlayerO // 出力

type PlayerOMoves = 
    GameState * PlayerOPos -> // 入力
        GameState * GameStatus * ValidMovesForPlayerX // 出力
```

この仕組みにより、ゲーム終了時には*有効な手がなくなる*という効果も得られます。UIは無限にループを続けることができなくなり、ゲームの終了を認識して適切な処理を行う必要が生じます。

これで、3つのルールすべてを型システムに組み込むことができました。手動で検証を行う必要はありません。


## リファクタリング

少しリファクタリングを行いましょう。

まず、プレイヤーXとプレイヤーOのケースを持つ選択肢型がいくつかあります。

```fsharp
type CellState = 
    | X
    | O
    | Empty

type GameStatus = 
    | InProcess 
    | PlayerXWon 
    | PlayerOWon 
    | Tie
```

プレイヤーを表す型を新たに定義し、ケースをパラメータ化して、より見やすくしてみましょう。

```fsharp
type Player = PlayerO | PlayerX

type CellState = 
    | Played of Player 
    | Empty

type GameStatus = 
    | InProcess 
    | Won of Player
    | Tie
```

次に、有効な手はゲームが `InProcess` (進行中) の場合にのみ必要で、`Won` (勝利) や `Tie` (引き分け) の場合は不要であることに注目しましょう。
そこで、`GameStatus` と `ValidMovesForPlayer` を `MoveResult` という1つの型にまとめます。

```fsharp
type ValidMovesForPlayerX = PlayerXPos list
type ValidMovesForPlayerO = PlayerOPos list

type MoveResult = 
    | PlayerXToMove of GameState * ValidMovesForPlayerX
    | PlayerOToMove of GameState * ValidMovesForPlayerO
    | GameWon of GameState * Player 
    | GameTied of GameState 
```

`InProcess` ケースを、`PlayerXToMove` と `PlayerOToMove` の2つのケースに置き換えました。こちらの方が分かりやすいと思います。

移動関数は次のようになります。

```fsharp
type PlayerXMoves = 
    GameState * PlayerXPos -> 
        GameState * MoveResult

type PlayerOMoves = 
    GameState * PlayerOPos -> 
        GameState * MoveResult
```

新しい `GameState` を `MoveResult` の一部として返すこともできましたが、UIで使われないことを明確にするために、あえて分離しました。

また、分離しておくことで、ゲームの状態を一連の関数呼び出しに渡していくヘルパーコードを記述する選択肢も残されます。
これは少し高度なテクニックなので、この記事では説明しません。

最後に、`InitialGameState` も `MoveResult` を利用して、最初のプレイヤーが可能な手のリストを返すように変更しましょう。
ゲームの状態と最初の移動のセットの両方が含まれるようになったので、`NewGame` という名前に変更します。

```fsharp
type NewGame = GameState * MoveResult
```

最初の `MoveResult` が `PlayerXToMove` ケースの場合、UIはプレイヤーXが最初に移動することしかできないように制限されます。
繰り返しますが、これにより、UIはルールを意識せずに済むようになります。

## 設計の再確認

これまでの設計を振り返ってみましょう。ウォークスルーを経て、設計は次のように進化しました。

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

    // ゲームの状態 (非公開)
    type GameState = exn  // プレースホルダー

    type ValidMovesForPlayerX = PlayerXPos list
    type ValidMovesForPlayerO = PlayerOPos list

    // 移動の結果
    type MoveResult = 
        | PlayerXToMove of ValidMovesForPlayerX
        | PlayerOToMove of ValidMovesForPlayerO
        | GameWon of Player 
        | GameTied 

    // ユースケース
    type NewGame = 
        GameState * MoveResult
    type PlayerXMoves = 
        GameState * PlayerXPos -> GameState * MoveResult
    type PlayerOMoves = 
        GameState * PlayerOPos -> GameState * MoveResult

    // ヘルパー関数
    type GetCells = GameState -> Cell list
```

しかし、アウトサイドイン設計の旅はまだ終わりではありません。残された課題があります。それは、UIから GameState の実装をどのように隠蔽するかということです。

## 公開されている型と非公開の型の分離

どんな設計でも、「インターフェース」と「実装」を分離しておくことは重要です。今回の三目並べの設計では、以下の2種類があります。

* UIとゲームエンジンがどちらも使用する、共有データ構造と関数 (`CellState`、`MoveResult`、`PlayerXPos` など)
* ゲームロジックからのみアクセスされるべき、非公開のデータ構造と関数 (今のところ `GameState` のみ)

これらの型を分けておくことは、当然ながら良いことです。では、F#ではどのように分離すれば良いのでしょうか？

最も簡単な方法は、別々のモジュールに配置することです。

```fsharp
/// UIとゲームロジックで共有される型
module TicTacToeDomain = 

    type HorizPosition = Left | HCenter | Right
    type VertPosition = Top | VCenter | Bottom
    type CellPosition = HorizPosition * VertPosition 

    type Player = PlayerO | PlayerX

    type CellState = 
        | Played of Player 
        | Empty

    type PlayerXMoves = 
        GameState * PlayerXPos -> GameState * MoveResult
    // etc

/// 内部ゲームロジックで使用される非公開の型
module TicTacToeImplementation = 
    open TicTacToeDomain 

    // 非公開の実装の詳細
    type GameState = {
        cells : Cell list
        }

    // etc
```

しかし、ゲームロジックの内部を非公開にしたい場合、`GameState` をどう扱えば良いでしょうか？`PlayerXMoves` などの公開関数で使われていますが、その構造は秘密にしておきたいところです。
どうすれば良いのでしょうか？

### オプション1：公開型と非公開型を同じモジュールに配置する

1つの方法は、公開型と非公開型を同じモジュールに配置し、このモジュールを他のすべてのモジュールが依存する「コア」ドメインモジュールにすることです。

この方法を示すコード例を以下に示します。

```fsharp
module TicTacToeImplementation = 

    // 公開型
    type HorizPosition = Left | HCenter | Right
    type VertPosition = Top | VCenter | Bottom
    type CellPosition = HorizPosition * VertPosition 

    type CellState = 
        | Played of Player 
        | Empty

    type PlayerXMoves = 
        GameState * PlayerXPos -> GameState * MoveResult
    // etc

    // --------------------
    // 非公開型

    type private InternalType = // to do

    // --------------------
    // 非公開コンストラクターを持つ公開型

    type GameState = private {
        cells : Cell list
        }

    // etc
```

すべての型が1つのモジュールに定義されています。

`CellState` など、多くの型はデフォルトで公開されます。これは問題ありません。

`InternalType` など、一部の型は `private` としてマークされています。これは、モジュールの外部から使用できないことを意味します。

`GameState` は非公開ではありませんが、そのコンストラクターは非公開です。つまり、モジュールの外部で*使用*することはできますが、コンストラクターが非公開なので、新たに作成することはできません。
これはまさに私たちが求めるものです。

これで問題は解決したように見えますが、このアプローチはしばしば新たな問題を引き起こします。
たとえば、`public` と `private` の修飾子を正しく使い分けようとすると、次のようなコンパイルエラーが発生しやすくなります。

```
型 'XXX' は、それが使用されている値、メンバー、または型 'YYY' よりもアクセスレベルが低くなっています
```

さらに、たとえこの問題がなくても、「インターフェース」と「実装」を同じファイルに配置すると、
実装が大きくなるにつれて、複雑さが増していく傾向があります。

### オプション2：`GameState` を抽象基本クラスで表現する

オブジェクト指向的な考え方では、`GameState` を抽象基本クラスやインターフェースとして定義し、
具体的な実装クラスをその抽象クラスから継承させる、という方法があります。

こうすることで、共有型はすべて抽象基本クラスを参照すれば良くなり、具体的な実装は隠蔽されます。

F#では、次のように記述できます。

```fsharp
/// UIとゲームロジックで共有される型
module TicTacToeDomain = 

    // 抽象基本クラス
    type GameState() = class end

/// 内部ゲームロジックで使用される非公開の型
module TicTacToeImplementation = 
    open TicTacToeDomain 

    type GameStateImpl() =
        inherit GameState()

    // etc
```

しかし、この方法にはいくつか問題点があります。

まず、これは関数型プログラミング的ではありません。
F#では、必要な場合にクラスやインターフェースを使うことができますが、できればもっと関数型らしい解決策を見つけたいところです。

次に、安全性の問題があります。実際の実装では、内部データにアクセスするために、`GameState` を想定される型にダウンキャストする必要があります。
しかし、もし `GameState` を継承した実装クラスが2つあった場合、たとえば、実装Bのゲーム状態を実装Aのゲーム状態を期待している関数に渡してしまう、といったことが起こりえます。
こうなると、プログラムは予期せぬ動作をしてしまうでしょう。

純粋なオブジェクト指向では、`GameState`自体が状態を持つメソッドを持つため、このような状況は起こりえないことに注意してください。今回のケースでは、純粋関数型のAPIを使用しています。

### オプション3：実装をパラメータ化する

改めて要件を確認してみましょう。「`GameState` は公開するが、実装は隠蔽する」

このように表現すると、関数型プログラミングではどうすれば良いかが見えてきます。それは、*ジェネリックパラメーター* (あるいは「パラメトリック多相」) を使うことです。

つまり、`GameState` を、具体的な実装を表す*ジェネリック型*として定義します。

こうすることで、UIは `GameState` 型を扱うことができます。しかし、具体的な実装型は分からないので、UIが誤って内部構造にアクセスして情報を取り出すことはできません。
*たとえ実装型が公開されていても*、です。

この最後の点は重要なので、別の例を使って説明します。C#で `List<T>` 型のオブジェクトを受け取ったとします。
リストに対する様々な操作はできますが、`T` が何であるかを知ることはできません。そのため、`T` が `int` や `string`、`bool` であると決めつけてコードを書くことはできません。
そして、この「隠蔽性」は、`T` が公開型かどうかとは無関係です。

このアプローチを採用すれば、ゲーム状態の内部構造を完全に公開しても問題ありません。
UIは、たとえアクセスしようとしても、その情報を使うことができないからです。

この方法を示すコード例を以下に示します。

まず、共有型です。`GameState<'T>` がパラメータ化されたゲーム状態を表します。

```fsharp
/// UIとゲームロジックで共有される型
module TicTacToeDomain = 

    // パラメータ化されていない型
    type PlayerXPos = PlayerXPos of CellPosition 
    type PlayerOPos = PlayerOPos of CellPosition 

    // パラメータ化された型
    type PlayerXMoves<'GameState> = 
        'GameState * PlayerXPos -> 'GameState * MoveResult
    type PlayerOMoves<'GameState> = 
        'GameState * PlayerOPos -> 'GameState * MoveResult

    // etc
```

ゲーム状態を使用しない型は変更されていませんが、`PlayerXMoves<'T>` がゲーム状態の型でパラメータ化されていることが分かります。

このようにジェネリクスを追加すると、多くの型に連鎖的に変更が及ぶことが多く、すべての型をパラメータ化する必要が出てきます。
このようなジェネリクスを扱うのは、型推論が非常に役立つ場面の一つです。

次に、ゲームロジック内部の型です。UIはこれらの型を知ることはできないので、すべて公開することができます。

```fsharp
module TicTacToeImplementation =
    open TicTacToeDomain

    // 公開可能
    type GameState = {
        cells : Cell list
        }
```

最後に、`playerXMoves` 関数の実装例を示します。

```fsharp
let playerXMoves : PlayerXMoves<GameState> = 
    fun (gameState,move) ->
        // ロジック
```

この関数は具体的な実装を参照していますが、`PlayerXMoves<'T>` 型に準拠しているため、UIコードに渡すことができます。

さらに、ジェネリックパラメータを使用することで、「GameStateA」のように、同じ実装がプログラム全体で一貫して使用されることが保証されます。

つまり、`InitGame<GameStateA>` によって作成されたゲーム状態は、*同じ*実装型 `GameStateA` を使ってパラメータ化された `PlayerXMoves<GameStateA>` 関数に*しか*渡すことができません。

## 「依存性注入」ですべてを繋ぎ合わせる

いよいよ、設計した要素を組み合わせて、全体を完成させましょう。

UIコードは、`GameState` の*ジェネリック*な実装、つまり `newGame` 関数と `move` 関数のジェネリックバージョンで動作するように設計されています。

しかし、いずれは *具体的な* 実装の `newGame` 関数と `move` 関数にアクセスする必要があります。どのようにして、これらを組み合わせれば良いのでしょうか？

その答えは、依存性注入の関数型版です。最上位層に「アプリケーション」または「プログラム」コンポーネントを配置し、
そこで具体的な実装を構築してUIに渡します。

具体的なコード例を見てみましょう。

* `GameImplementation` モジュールは、`newGame` 関数と `move` 関数の具体的な実装を提供します。
* `UserInterface` モジュールは、コンストラクターでこれらの実装を受け取る `TicTacToeForm` クラスを提供します。
* `Application` モジュールは、これらすべてを繋ぎ合わせます。 `TicTacToeForm` を作成し、`GameImplementation` モジュールから提供された実装を渡します。

このアプローチを示すコード例を以下に示します。

```fsharp
module TicTacToeImplementation = 
    open TicTacToeDomain 

    /// 新しいゲームの状態を作成する
    let newGame : NewGame<GameState> = 
        // 新しいゲームと現在可能な移動を返す
        let validMoves = // to do
        gameState, PlayerXToMove validMoves

    let playerXMoves : PlayerXMoves<GameState> = 
        fun (gameState,move) ->
            // 実装

module WinFormUI = 
    open TicTacToeDomain
    open System.Windows.Forms

    type TicTacToeForm<'T>
        (
        // 必要な関数を
        // コンストラクターの引数として渡す
        newGame:NewGame<'T>, 
        playerXMoves:PlayerXMoves<'T>,
        playerOMoves:PlayerOMoves<'T>,
        getCells:GetCells<'T>
        ) = 
        inherit Form()
     // 実装はこれから

module WinFormApplication = 
    open WinFormUI

    // 実装から関数を取得
    let newGame = TicTacToeImplementation.newGame
    let playerXMoves = TicTacToeImplementation.playerXMoves
    let playerOMoves = TicTacToeImplementation.playerOMoves
    let getCells = TicTacToeImplementation.getCells

    // フォームを作成してゲームを開始
    let form = 
        new TicTacToeForm<_>(newGame,playerXMoves,playerOMoves,getCells)
    form.Show()
```

コードに関して、いくつか補足説明します。

まず、WPFではなくWinFormsを使っています。WinFormsはMonoをサポートしており、NuGetパッケージに依存せずに動作するためです。もっと高機能なUIを使いたい場合は、[ETO.Forms](https://picoe.ca/2012/09/11/introducing-eto-forms-a-cross-platform-ui-for-net/)を試してみてください。

`TicTacToeForm<'T>` には、次のように型パラメーターを明示的に指定しています。

```fsharp
TicTacToeForm<'T>(newGame:NewGame<'T>, playerXMoves:PlayerXMoves<'T>, etc)
```

代わりに、次のように型パラメーターを省略することもできます。

```fsharp
TicTacToeForm(newGame:NewGame<_>, playerXMoves:PlayerXMoves<_>, etc)
```

あるいは、

```fsharp
TicTacToeForm(newGame, playerXMoves, etc)
```

として、コンパイラーに型を推論させることも可能です。しかし、多くの場合、次のような「ジェネリック性が低い」という警告が表示されます。

```
警告 FS0064: この構造体は、型注釈で示されているよりもコードのジェネリック性を低下させます。
型変数 'T は、型 'XXX' に制約されています。
```

`TicTacToeForm<'T>` のように明示的に型パラメーターを指定することで、この警告を回避できます。ただし、見た目は少し煩雑になります。

## もう少しリファクタリング

エクスポートする関数が4つもありますね。少し多すぎるので、レコードにまとめてしまいましょう。

```fsharp
// 実装からエクスポートされる関数
// UIが使用するため
type TicTacToeAPI<'GameState>  = 
    {
    newGame : NewGame<'GameState>
    playerXMoves : PlayerXMoves<'GameState> 
    playerOMoves : PlayerOMoves<'GameState> 
    getCells : GetCells<'GameState>
    }
```

これで、関数をまとめて扱うための入れ物として使えるだけでなく、APIでどんな関数が使えるのかを分かりやすく示すドキュメントにもなります。

実装では、「api」オブジェクトを作成する必要があります。

```fsharp
module TicTacToeImplementation = 
    open TicTacToeDomain 

    /// エクスポートする関数を作成
    let newGame : NewGame<GameState> = // etc
    let playerXMoves : PlayerXMoves<GameState> = // etc
    // etc

    // 関数をエクスポート
    let api = {
        newGame = newGame 
        playerOMoves = playerOMoves 
        playerXMoves = playerXMoves 
        getCells = getCells
        }
```

その結果、UIコードは次のようにシンプルになります。

```fsharp
module WinFormUI = 
    open TicTacToeDomain
    open System.Windows.Forms

    type TicTacToeForm<'T>(api:TicTacToeAPI<'T>) = 
        inherit Form()
     // 実装はこれから

module WinFormApplication = 
    open WinFormUI

    // 実装から関数を取得
    let api = TicTacToeImplementation.api

    // フォームを作成してゲームを開始
    let form = new TicTacToeForm<_>(api)
    form.Show()
```

## 最小限の実装でプロトタイプを作成する

いよいよ最終版に近づいてきましたが、今度は「依存性注入」設計を実際に試してみるために、
相互作用をテストするための最小限のコードを書いて、もう一度ウォークスルーをしてみましょう。

例として、`newGame` 関数と `playerXMoves` 関数を実装するための最小限のコードを示します。

* `newGame` は、セルがなく、可能な移動もない、ゲーム開始時の状態を返します。
* `move` の実装は簡単です。ゲームオーバーを返すだけです。

```fsharp
let newGame : NewGame<GameState> = 
    // 何も空の初期ゲーム状態を作成
    let gameState = { cells=[]}
    let validMoves = []
    gameState, PlayerXToMove validMoves

let playerXMoves : PlayerXMoves<GameState> = 
    // ダミー実装
    fun gameState move ->  gameState,GameTied

let playerOMoves : PlayerOMoves<GameState> = 
    // ダミー実装
    fun gameState move ->  gameState,GameTied

let getCells gameState = 
    gameState.cells 

let api = {
    newGame = newGame 
    playerOMoves = playerOMoves 
    playerXMoves = playerXMoves 
    getCells = getCells
    }
```

次に、UIの最小限の実装を作成します。ここでは、画面に何かを描画したり、クリックに反応したりする処理は実装しません。ロジックをテストできるように、関数のモックアップを作成するだけです。

最初の試みとして、次のようなコードを作成しました。

```fsharp
type TicTacToeForm<'GameState>(api:TicTacToeAPI<'GameState>) = 
    inherit Form()

    let mutable gameState : 'GameState = ???
    let mutable lastMoveResult : MoveResult = ???

    let displayCells gameState = 
        let cells = api.getCells gameState 
        for cell in cells do
            // 表示を更新

    let startGame()= 
        let initialGameState,initialResult = api.newGame
        gameState <- initialGameState
        lastMoveResult <- initialResult 
        // gameState からセルグリッドを作成

    let handleMoveResult moveResult =
        match moveResult with
        | PlayerXToMove availableMoves -> 
            // 可能な移動を表示
        | PlayerOToMove availableMoves -> 
            // 可能な移動を表示
        | GameWon player -> 
            let msg = sprintf "%A Won" player 
            MessageBox.Show(msg) |> ignore
        | GameTied -> 
            MessageBox.Show("Tied") |> ignore

    // クリックを処理
    let handleClick() =
        let gridIndex = 0,0  // とりあえずダミー
        let cellPos = createCellPosition gridIndex
        match lastMoveResult with
        | PlayerXToMove availableMoves -> 
            let playerXmove = PlayerXPos cellPos
            // 移動が可能な移動に含まれている場合は、
            // APIに送信
            let newGameState,newResult = 
                api.playerXMoves gameState playerXmove 
            handleMoveResult newResult 

            // グローバル変数を更新
            gameState <- newGameState
            lastMoveResult <- newResult 
        | PlayerOToMove availableMoves -> 
            let playerOmove = PlayerOPos cellPos
            // 移動が可能な移動に含まれている場合は、
            // APIに送信
            // etc
        | GameWon player -> 
            ?? // 最後の移動の後で既に表示済み
```

見ての通り、ここでは一般的なフォームのイベント処理方法を使う予定です。各セルに「クリックされた」というイベントハンドラを関連付けます。
コントロールやピクセルの位置を `CellPosition` に変換する方法は、今は考えません。とりあえずダミーデータを入れておきます。

また、純粋関数型にこだわることはせず、再帰的なループも使いません。代わりに、現在の `gameState` を可変にして、移動ごとに更新していきます。

しかし、ここで1つ問題が発生します。ゲーム開始前の `gameState` は何でしょうか？ また、どのように初期化すれば良いでしょうか？
同様に、ゲーム終了時には、どのような値に設定すれば良いでしょうか？

```fsharp
let mutable gameState : 'GameState = ???
```

`GameState option` を使うことも考えられますが、これは少し強引な解決策に思えますし、何か重要なことを見落としているような気がします。

同じように、最後の移動の結果 (`lastMoveResult`) を保持するためのフィールドも必要です。これを使って、どちらのターンなのか、ゲームが終了したのかなどを管理します。

しかし、これもゲーム開始前にどのような値に設定すれば良いのか、という問題があります。

ここで、UIが取り得る状態について、整理してみましょう。*ゲーム*自体の状態ではなく、*UI*の状態です。

* 最初は、ゲームが開始されていない「アイドル」状態です。
* ユーザーがゲームを開始すると、「プレイ中」状態になります。
* プレイヤーが手を打つ間は、「プレイ中」状態が続きます。
* ゲームが終了すると、勝敗メッセージを表示します。
* ユーザーがメッセージを確認したら、再び「アイドル」状態に戻ります。

繰り返しますが、これはUIのみに関する状態であり、内部のゲーム状態とは関係ありません。

そこで、いつものように、これらの状態を表す型を定義しましょう。

```fsharp
type UiState = 
    | Idle
    | Playing
    | Won
    | Lost
```

しかし、よく考えると `Won` と `Lost` の状態は必要ないかもしれません。ゲーム終了後は、すぐに `Idle` に戻れば十分でしょう。

そうすると、型は次のようになります。

```fsharp
type UiState = 
    | Idle
    | Playing
```

このような型を定義するメリットは、各状態に必要なデータを簡単に保持できることです。

* `Idle` 状態では、どんなデータを保持する必要があるでしょうか？ 特にありませんね。
* `Playing` 状態では、どんなデータを保持する必要があるでしょうか？
  まさに、先ほど問題になった `gameState` と `lastMoveResult` を格納するのに最適な場所です。
  これらはゲームプレイ中にのみ必要で、それ以外の状態では不要です。

最終的なバージョンは次のようになります。実際のゲーム状態が何であるか分からないため、`UiState` に `<'GameState>` を追加しました。

```fsharp
type UiState<'GameState> = 
    | Idle
    | Playing of 'GameState * MoveResult 
```

この型を使うことで、ゲーム状態をクラスのフィールドとして直接格納する必要がなくなりました。代わりに、`Idle` に初期化された `uiState` という可変変数を用意します。

```fsharp
type TicTacToeForm<'GameState>(api:TicTacToeAPI<'GameState>) = 
    inherit Form()

    let mutable uiState = Idle
```

ゲームを開始するときは、UIの状態を `Playing` に変更します。

```fsharp
let startGame()= 
    uiState <- Playing api.newGame
    // gameState からセルグリッドを作成
```

クリックを処理するときは、`uiState` が `Playing` の場合にのみ処理を実行します。
必要な `gameState` と `lastMoveResult` は、`Playing` のデータに含まれているので、簡単にアクセスできます。

```fsharp
let handleClick() =
    match uiState with
    | Idle -> ()
        // 何もしない

    | Playing (gameState,lastMoveResult) ->
        let gridIndex = 0,0  // とりあえずダミー
        let cellPos = createCellPosition gridIndex
        match lastMoveResult with
        | PlayerXToMove availableMoves -> 
            let playerXmove = PlayerXPos cellPos
            // 移動が可能な移動に含まれている場合は、
            // APIに送信
            let newGameState,newResult = 
                api.playerXMoves gameState playerXmove 

            // 結果を処理
            // 例：ゲームが終了した場合
            handleMoveResult newResult 

            // newGameState で uiState を更新
            uiState <- Playing (newGameState,newResult)

        | PlayerOToMove availableMoves -> 
            // etc
        | _ -> 
            // 他の状態は無視
```

`PlayerXToMove` ケースの最後の行を見ると、グローバル変数 `uiState` が新しいゲーム状態で更新されていることが分かります。

```fsharp
| PlayerXToMove availableMoves -> 
    // 省略

    let newGameState,newResult = // 新しい状態を取得

    // newGameState で uiState を更新
    uiState <- Playing (newGameState,newResult)
```

さて、このプロトタイピングでどんな成果が得られたのでしょうか？

見た目はあまり綺麗ではありませんが、目的は達成できました。

目標は、UIを簡単に実装して、設計通りに動作するかを確認することであり、
ドメイン型とAPIの設計は変更されていないため、設計は問題ないと判断できます。

さらに、UIの要件についても理解を深めることができました。
これで、プロトタイピングは終了です。

## 完成したゲーム パート1：設計

最後に、実装とユーザーインターフェースを含む、完全なゲームのコードを見ていきましょう。

このコードを読みたくなければ、以下の[質問とまとめ](#questions)に進んでください。

*ここに示されているすべてのコードは、GitHubの[このgist](https://gist.github.com/swlaschin/3418b549bd222396da82)で入手できます。*

まずは、最終的なドメイン設計です。

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

    // ユースケース
    type NewGame<'GameState> = 
        'GameState * MoveResult
    type PlayerXMoves<'GameState> = 
        'GameState -> PlayerXPos -> 'GameState * MoveResult
    type PlayerOMoves<'GameState> = 
        'GameState -> PlayerOPos -> 'GameState * MoveResult

    // ヘルパー関数
    type GetCells<'GameState> = 
        'GameState -> Cell list

    // 実装からエクスポートされる関数
    // UIが使用するため
    type TicTacToeAPI<'GameState>  = 
        {
        newGame : NewGame<'GameState>
        playerXMoves : PlayerXMoves<'GameState> 
        playerOMoves : PlayerOMoves<'GameState> 
        getCells : GetCells<'GameState>
        }
```

## 完成したゲーム パート2：ゲームロジックの実装

次は、設計したゲームロジックを実際に実装したコードです。コードの詳細な説明は省略しますが、コメントを読めば、何をしているのか理解できると思います。

```fsharp
module TicTacToeImplementation =
    open TicTacToeDomain

    /// ゲーム状態の非公開実装
    type GameState = {
        cells : Cell list
        }

    /// すべての水平方向の位置のリスト
    let allHorizPositions = [Left; HCenter; Right]

    /// すべての垂直方向の位置のリスト
    let allVertPositions = [Top; VCenter; Bottom]

    /// 1行のセルの位置のリストを格納する型
    type Line = Line of CellPosition list

    /// 3つ並んでいるか確認する8つのラインのリスト
    let linesToCheck = 
        let makeHLine v = Line [for h in allHorizPositions do yield (h,v)]
        let hLines= [for v in allVertPositions do yield makeHLine v] 

        let makeVLine h = Line [for v in allVertPositions do yield (h,v)]
        let vLines = [for h in allHorizPositions do yield makeVLine h] 

        let diagonalLine1 = Line [Left,Top; HCenter,VCenter; Right,Bottom]
        let diagonalLine2 = Line [Left,Bottom; HCenter,VCenter; Right,Top]

        // 確認するすべてのラインを返す
        [
        yield! hLines
        yield! vLines
        yield diagonalLine1 
        yield diagonalLine2 
        ]

    /// gameState からセルを取得
    let getCells gameState = 
        gameState.cells 

    /// セルの位置に対応するセルを取得
    let getCell gameState posToFind = 
        gameState.cells 
        |> List.find (fun cell -> cell.pos = posToFind)

    /// GameState 内の特定のセルを更新し、
    /// 新しい GameState を返す
    let private updateCell newCell gameState =

        // ヘルパー関数
        let substituteNewCell oldCell =
            if oldCell.pos = newCell.pos then
                newCell
            else 
                oldCell

        // 新しいセルと交換されたセルのコピーを取得
        let newCells = gameState.cells |> List.map substituteNewCell 

        // 新しいセルを持つ新しいゲーム状態を返す
        {gameState with cells = newCells }

    /// 指定されたプレイヤーがゲームに勝った場合に true を返す
    let private isGameWonBy player gameState = 

        // 特定のプレイヤーがセルをプレイしたかどうかを確認するヘルパー関数
        let cellWasPlayedBy playerToCompare cell = 
            match cell.state with
            | Played player -> player = playerToCompare
            | Empty -> false

        // ライン内のすべてのセルが同じプレイヤーによってプレイされているかどうかを確認するヘルパー関数
        let lineIsAllSamePlayer player (Line cellPosList) = 
            cellPosList 
            |> List.map (getCell gameState)
            |> List.forall (cellWasPlayedBy player)

        linesToCheck
        |> List.exists (lineIsAllSamePlayer player)


    /// すべてのセルがプレイされた場合に true を返す
    let private isGameTied gameState = 
        // セルが任意のプレイヤーによってプレイされたかどうかを確認するヘルパー関数
        let cellWasPlayed cell = 
            match cell.state with
            | Played _ -> true
            | Empty -> false

        gameState.cells
        |> List.forall cellWasPlayed 

    /// プレイヤーの残りの移動を決定する
    let private remainingMovesForPlayer playerMove gameState = 

        // セルがプレイ可能であれば Some を返すヘルパー関数
        let playableCell cell = 
            match cell.state with
            | Played player -> None
            | Empty -> Some (playerMove cell.pos)

        gameState.cells
        |> List.choose playableCell


    /// 新しいゲームの状態を作成
    let newGame = 

        // allPositions は位置のクロス積
        let allPositions = [
            for h in allHorizPositions do 
            for v in allVertPositions do 
                yield (h,v)
            ]

        // 最初はすべてのセルが空
        let emptyCells = 
            allPositions 
            |> List.map (fun pos -> {pos = pos; state = Empty})

        // 初期ゲーム状態を作成
        let gameState = { cells=emptyCells }

        // プレイヤーXの有効な移動の初期セットはすべての位置
        let validMoves = 
            allPositions 
            |> List.map PlayerXPos

        // 新しいゲームを返す
        gameState, PlayerXToMove validMoves

    // プレイヤーXが移動
    let playerXMoves gameState (PlayerXPos cellPos) = 
        let newCell = {pos = cellPos; state = Played PlayerX}
        let newGameState = gameState |> updateCell newCell 

        if newGameState |> isGameWonBy PlayerX then
            // 新しい状態と移動結果を返す
            newGameState, GameWon PlayerX
        elif newGameState |> isGameTied then
            // 新しい状態と移動結果を返す
            newGameState, GameTied 
        else
            let remainingMoves = 
                newGameState |> remainingMovesForPlayer PlayerOPos 
            newGameState, PlayerOToMove remainingMoves

    // プレイヤーOが移動
    let playerOMoves gameState (PlayerOPos cellPos) = 
        let newCell = {pos = cellPos; state = Played PlayerO}
        let newGameState = gameState |> updateCell newCell 

        if newGameState |> isGameWonBy PlayerO then
            // 新しい状態と移動結果を返す
            newGameState, GameWon PlayerO
        elif newGameState |> isGameTied then
            // 新しい状態と移動結果を返す
            newGameState, GameTied 
        else
            let remainingMoves = 
                newGameState |> remainingMovesForPlayer PlayerXPos 
            newGameState, PlayerXToMove remainingMoves

        // 練習 - playerXMoves と playerOMoves から
        // 重複コードを削除するようにリファクタリング


    /// アプリケーションにAPIをエクスポート
    let api = {
        newGame = newGame 
        playerOMoves = playerOMoves 
        playerXMoves = playerXMoves 
        getCells = getCells
        }
```

## ゲーム完成編 パート3: コンソールで遊ぶ

いよいよゲーム実装の仕上げです。今回は、コンソールで遊べるようにするコードを見ていきましょう。

もちろん、コンソールへの入出力を行うので、この部分は純粋な関数型とはいえません。
どうしても気になる場合は、`IO`などを使って純粋な関数に書き換えることもできます。

個人的には、ゲームの核となるロジックが純粋であれば、UI部分は多少目をつぶっても良いかなと思っています。あくまで私の考えですが。

```fsharp
/// コンソールベースのユーザーインターフェース
module ConsoleUi =
    open TicTacToeDomain
    
    /// UIの状態を管理
    type UserAction<'a> =
        | ContinuePlay of 'a
        | ExitGame

    /// コンソールに可能な手を表示
    let displayAvailableMoves moves = 
        moves
        |> List.iteri (fun i move -> 
            printfn "%i) %A" i move )

    /// ユーザーが選んだ番号に
    /// 対応する手を取得
    let getMove moveIndex moves = 
        if moveIndex < List.length moves then
            let move = List.nth moves moveIndex 
            Some move
        else
            None

    /// ユーザーがゲームを終了していない場合は、
    /// 入力された文字列を番号として解釈し、
    /// その番号に対応する手を取得
    let processMoveIndex inputStr gameState availableMoves makeMove processInputAgain = 
        match Int32.TryParse inputStr with
        // TryParse は (解析成功?, 番号) のタプルを返す
        | true,inputIndex ->
            // 解析成功。対応する手を取得
            match getMove inputIndex availableMoves with
            | Some move -> 
                // 対応する手が見つかったので、実行
                let moveResult = makeMove gameState move 
                ContinuePlay moveResult // 結果を返す
            | None ->
                // 対応する手が見つからない
                printfn "...%i に対応する手が見つかりません。もう一度入力してください。" inputIndex 
                // 再入力
                processInputAgain()
        | false, _ -> 
            // 番号の解析に失敗
            printfn "...表示された手に対応する番号を入力してください。"             
            // 再入力
            processInputAgain()

    /// ユーザーに入力を求める。入力された文字列を
    /// 手の番号または「終了」コマンドとして処理
    let rec processInput gameState availableMoves makeMove = 

        // 同じパラメーターで
        // この関数をもう一度呼び出す
        let processInputAgain() = 
            processInput gameState availableMoves makeMove 

        printfn "いずれかの番号を入力してください。(終了する場合は q を入力)" 
        let inputStr = Console.ReadLine()
        if inputStr = "q" then
            ExitGame
        else
            processMoveIndex inputStr gameState availableMoves makeMove processInputAgain
            
    /// コンソールに盤面をグリッド状に表示
    let displayCells cells = 
        let cellToStr cell = 
            match cell.state with
            | Empty -> "-"            
            | Played player ->
                match player with
                | PlayerO -> "O"
                | PlayerX -> "X"

        let printCells cells  = 
            cells
            |> List.map cellToStr
            |> List.reduce (fun s1 s2 -> s1 + "|" + s2) 
            |> printfn "|%s|"

        let topCells = 
            cells |> List.filter (fun cell -> snd cell.pos = Top) 
        let centerCells = 
            cells |> List.filter (fun cell -> snd cell.pos = VCenter) 
        let bottomCells = 
            cells |> List.filter (fun cell -> snd cell.pos = Bottom) 
        
        printCells topCells
        printCells centerCells 
        printCells bottomCells 
        printfn ""   // スペースを追加
        
    /// ゲーム終了後、
    /// 再プレイするかどうかを確認
    let rec askToPlayAgain api  = 
        printfn "もう一度プレイしますか？ (y/n)"             
        match Console.ReadLine() with
        | "y" -> 
            ContinuePlay api.newGame
        | "n" -> 
            ExitGame
        | _ -> askToPlayAgain api 

    /// メインゲームループ。
    /// ユーザー入力ごとに繰り返す。
    let rec gameLoop api userAction = 
        printfn "\n------------------------------\n"  // 手の間の区切り線
        
        match userAction with
        | ExitGame -> 
            printfn "ゲームを終了します。"             
        | ContinuePlay (state,moveResult) -> 
            // まず、盤面を表示
            state |> api.getCells |> displayCells

            // 次に、結果に応じて処理
            match moveResult with
            | GameTied -> 
                printfn "ゲーム終了 - 引き分けです。"             
                printfn ""             
                let nextUserAction = askToPlayAgain api 
                gameLoop api nextUserAction
            | GameWon player -> 
                printfn "ゲーム終了 - %A の勝利です。" player            
                printfn ""             
                let nextUserAction = askToPlayAgain api 
                gameLoop api nextUserAction
            | PlayerOToMove availableMoves -> 
                printfn "プレイヤーOの手番です。" 
                displayAvailableMoves availableMoves
                let newResult = processInput state availableMoves api.playerOMoves
                gameLoop api newResult 
            | PlayerXToMove availableMoves -> 
                printfn "プレイヤーXの手番です。" 
                displayAvailableMoves availableMoves
                let newResult = processInput state availableMoves api.playerXMoves
                gameLoop api newResult 

    /// 指定された API でゲームを開始
    let startGame api =
        let userAction = ContinuePlay api.newGame
        gameLoop api userAction 
```

最後に、すべての部品を組み合わせて、UIを起動するアプリケーションコードです。

```fsharp
module ConsoleApplication = 

    let startGame() =
        let api = TicTacToeImplementation.api
        ConsoleUi.startGame api
```

## ゲームの実行例

実際にゲームを実行すると、以下のような出力となります。

```text
|-|X|-|
|X|-|-|
|O|-|-|

プレイヤーOの手番です。
0) PlayerOPos (Left, Top)
1) PlayerOPos (HCenter, VCenter)
2) PlayerOPos (HCenter, Bottom)
3) PlayerOPos (Right, Top)
4) PlayerOPos (Right, VCenter)
5) PlayerOPos (Right, Bottom)
いずれかの番号を入力してください。(終了する場合は q を入力)
1

------------------------------

|-|X|-|
|X|O|-|
|O|-|-|

プレイヤーXの手番です。
0) PlayerXPos (Left, Top)
1) PlayerXPos (HCenter, Bottom)
2) PlayerXPos (Right, Top)
3) PlayerXPos (Right, VCenter)
4) PlayerXPos (Right, Bottom)
いずれかの番号を入力してください。(終了する場合は q を入力)
1

------------------------------

|-|X|-|
|X|O|-|
|O|X|-|

プレイヤーOの手番です。
0) PlayerOPos (Left, Top)
1) PlayerOPos (Right, Top)
2) PlayerOPos (Right, VCenter)
3) PlayerOPos (Right, Bottom)
いずれかの番号を入力してください。(終了する場合は q を入力)
1

------------------------------

|-|X|O|
|X|O|-|
|O|X|-|

ゲーム終了 - PlayerO の勝利です。

もう一度プレイしますか？ (y/n)
```

## ロギング機能

エンタープライズレベルのアプリケーションには、ロギング機能が欠かせません。では、三目並べゲームにロギング機能を追加してみましょう。

追加は容易です。必要な情報を記録する関数を作成し、API関数を置き換えるだけで実現できます。

```fsharp
module Logger = 
    open TicTacToeDomain
     
    let logXMove (PlayerXPos cellPos)= 
        printfn "X が %A に置きました" cellPos

    let logOMove (PlayerOPos cellPos)= 
        printfn "O が %A に置きました" cellPos

    /// APIにロギング機能を注入
    let injectLogging api =

        // 手の関数をロギングするバージョンに置き換え
        let playerXMoves state move = 
            logXMove move 
            api.playerXMoves state move 

        // 手の関数をロギングするバージョンに置き換え
        let playerOMoves state move = 
            logOMove move 
            api.playerOMoves state move 
                                     
        // 手の関数をロギングする
        // バージョンに置き換えた
        // 新しいAPIを作成
        { api with
            playerXMoves = playerXMoves
            playerOMoves = playerOMoves
            }
```

実際のシステム開発では、`log4net` のような本格的なロギングツールを導入し、より詳細な情報を出力する必要があるでしょう。しかし、ここではロギング機能の基本的な実装方法を理解することを目的としています。

このロギング機能を利用するには、アプリケーションのメイン部分で、元の API をロギング機能付きのバージョンに置き換えるだけです。

```fsharp
module ConsoleApplication = 

    let startGame() =
        let api = TicTacToeImplementation.api
        let loggedApi = Logger.injectLogging api
        ConsoleUi.startGame loggedApi 
```

これでロギング機能の追加は完了です。

ところで、ゲームの初期状態を定数ではなく関数として定義していたことを覚えていますか？

```fsharp
type InitGame = unit -> GameState
```

設計の初期段階で定数に変更しましたが、今になってその判断を後悔しています。なぜなら、ゲーム開始イベントをフックしてログを記録することができなくなってしまったからです。
各ゲームの開始をログに記録したい場合は、関数に戻した方が良いでしょう。

<a id="questions"></a>

## よくある質問

**質問：`GameState` の内部構造を隠蔽することに腐心していましたが、`PlayerXPos` と `PlayerOPos` 型は公開されていますね。なぜでしょうか？**

うっかりしていました！ 実は、単なる設計の練習なので、面倒になってコードを更新するのを怠ってしまいました。

現在の設計では、悪意のあるユーザーインターフェースが `PlayerXPos` を構築し、
プレイヤーXの番ではないときにXを置いたり、すでに置かれている場所に置いたりできてしまうのは事実です。

ゲームの状態と同じように、型パラメーターを使って `PlayerXPos` の実装を隠蔽すれば、このような事態を防ぐことができます。
もちろん、関連するすべてのクラスもそれに合わせて調整する必要があります。

以下は、その一例です。

```fsharp
type MoveResult<'PlayerXPos,'PlayerOPos> = 
    | PlayerXToMove of 'PlayerXPos list
    | PlayerOToMove of 'PlayerOPos list
    | GameWon of Player 
    | GameTied 

type NewGame<'GameState,'PlayerXPos,'PlayerOPos> = 
    'GameState * MoveResult<'PlayerXPos,'PlayerOPos>      

type PlayerXMoves<'GameState,'PlayerXPos,'PlayerOPos> = 
    'GameState -> 'PlayerXPos -> 
        'GameState * MoveResult<'PlayerXPos,'PlayerOPos>      
type PlayerOMoves<'GameState,'PlayerXPos,'PlayerOPos> = 
    'GameState -> 'PlayerOPos -> 
        'GameState * MoveResult<'PlayerXPos,'PlayerOPos>      
```

また、UI側で、ユーザーが選択した `CellPosition` が有効かどうかを判断する仕組みも必要になります。
`MoveResult` と `CellPosition` を受け取り、有効な位置であれば `Some` move を返し、そうでなければ `None` を返すような関数です。

```fsharp
type GetValidXPos<'PlayerXPos,'PlayerOPos> = 
    CellPosition * MoveResult<'PlayerXPos,'PlayerOPos> -> 'PlayerXPos option
```

しかし、このように型パラメーターが増えていくと、コードが複雑で見づらくなってしまうという問題があります。

これは、型による安全性と設計の簡潔さの間のトレードオフです。どこまで型を使って偶発的なバグを防ぎ、どこで設計の複雑さを許容するのか、適切なバランスを見極める必要があります。

今回のケースでは、`GameState` は将来的に変更される可能性が高く、
UIが実装の詳細に依存しないようにするため、非公開にするべきだと考えています。

一方、手の型については、(a) 実装が変更される可能性は低いと考えられる、(b) 悪意のあるUI操作による影響はそれほど大きくない、という理由から、
実装を公開しても問題ないと判断しました。

*2015年2月16日更新: [次の投稿](../posts/enterprise-tic-tac-toe-2.md) では、この問題をより洗練された方法で解決し、`GameState` も排除しています！*

**質問：`initGame` と `move` 関数を定義するのに、なぜあの独特な構文を使っているのですか？**

つまり、なぜ以下のように関数を定義しているのか、ということですね。

```fsharp
/// 新しいゲームの状態を作成
let newGame : NewGame<GameState> = 
    // 実装

let playerXMoves : PlayerXMoves<GameState> = 
    fun (gameState,move) ->
        // 実装
```

通常の書き方ではなく。

```fsharp
/// 新しいゲームの状態を作成
let newGame  = 
    // 実装

let playerXMoves (gameState,move) = 
    // 実装

```

これは、関数を値として扱いたい場合に用いる書き方です。 `x :int = ...` のように「*x* は *int* 型の値です」と宣言するのと同じように、
`playerXMoves : PlayerXMoves = ...` は「*playerXMoves* は *PlayerXMoves* 型の値です」と宣言しています。
この場合、値が単純な値ではなく関数であるという点が異なります。

この書き方は、型ファーストのアプローチに基づいています。型を定義し、その型に適合するものを実装するという考え方です。

通常のコードでこの書き方をお勧めするかというと、おそらくそうではありません。

これは、あくまで探索的な設計プロセスの一環として行っているものです。
設計が安定したら、通常の書き方に戻すのが一般的です。


**質問：これは非常に手間がかかるように思えます。結局、別の形での [BDUF](https://en.wikipedia.org/wiki/Big_Design_Up_Front) ではないのですか？**

これは設計を行うための回りくどい方法のように思えるかもしれませんが、実際にはそれほど時間はかかりません。
別の言語で探索的なプロトタイプを作成するよりも、 おそらく早く終わるでしょう。

型を使って設計を文書化し、REPL を「実行可能な仕様チェッカー」として使用して、
すべてが正しく連携するようにすることで、何度か迅速な反復を行ってきました。

そして、このプロセスを経て、いくつかの優れた特性を持つ、しっかりとした設計を得ることができました。

* UIとコアロジックを分離する「API」があるため、必要に応じて各部分の作業を並行して進めることができます。
* 型はドキュメントとして機能し、UML図では決してできない方法で実装を制約します。
* 設計は型で表現されているため、開発中に発生するであろう変更にも、自信を持って対応できます。

このプロセス全体は、この方法に慣れれば、実際には非常にアジャイルな開発手法と言えるでしょう。

**質問：正直に言って、本当に三目並べをこのように開発するのですか？**

状況によります。もし私一人で開発するなら、おそらくしないでしょう。 :-)  

しかし、フロントエンドとバックエンドに異なるチームがいる、より複雑なシステムであれば、私は間違いなくこのような設計ファーストのアプローチを採用するでしょう。
そのような場合、データ隠蔽や抽象インターフェースといった概念は非常に重要であり、このアプローチはそれを実現するのに有効だと考えています。

**質問：なぜ設計はそれほど具体的なのでしょうか？ 再利用できるものはまったくないように思えます。なぜですか？**

はい、このコードは `Cell`、`GameState` などの非常に具体的な型で記述されています。そして、そのどれも再利用できないのは事実です。

このような、ドメイン固有で再利用不可能な設計と、
リストやツリーのようなものの[抽象的で再利用可能なライブラリ](https://msdn.microsoft.com/en-us/library/ee353738.aspx)との間には、常に葛藤があります。

理想的には、低レベルの再利用可能なコンポーネントから始めて、それらを組み合わせることで、より大きく、より具体的なコンポーネント (DSLなど) を構築し、
最終的にアプリケーションを開発するべきです（Tomas は、[まさにこの点](https://tomasp.net/blog/2015/library-layers/index.html)に関する優れた記事を書いています）。

今回、私がそのような方法を取らなかったのは、第一に、私は常に*具体的*な設計から始めることを好むからです。
何度か何かを構築してみるまでは、優れた抽象化がどのようなものかさえわからないからです。

UIとコアロジックは分離しましたが、現時点では、それ以上の抽象化を行うことは適切ではないと考えています。
もし、三目並べに似たゲームをたくさん作るのであれば、いくつかの有用な抽象化が見えてくるかもしれません。

第二に、具体的な型を用いた設計は、専門家以外の人にとって理解しやすいという利点があります。
ドメインエキスパートのような非プログラマーに、これらのドメイン型を見せることで、彼らが理解し、意見を述べることができると期待しています。
より抽象的な型では、それは難しいでしょう。

## 練習問題

もっと学びたい方のために、練習問題を用意しました。

* `playerXMoves` 関数と `playerOMoves` 関数は、非常によく似たコードになっていますね。コードの重複を減らすには、どのようにリファクタリングすればよいでしょうか？
* セキュリティ監査を実施し、悪意のあるユーザーやUIが、現在の設計でゲームを不正に操作する可能性のある方法をすべて洗い出してみてください。そして、それらの脆弱性を修正しましょう！

## まとめ

この記事では、主に型を使ってシステムを設計する方法を解説しました。時には、問題を明確にするためにコードの断片を使用することもありましたね。

これは明らかに設計過剰な例でしたが、「実用的な」プロジェクトにも適用できるアイデアがいくつか含まれていることを願っています。

最初に、この設計は「エンタープライズレベル」に対応できると豪語しました。本当にそうでしょうか？

* UIに公開する関数を介して、関心の分離は*実現できています*。
* きちんと文書化されたAPIを*用意できました*。マジックナンバーはなく、型の名前はそれ自体が説明になっており、公開される関数のリストは1か所にまとめられています。
* 許可されていない操作を防ぐためのセキュリティモデルを*実装しました*。現状では、誤ってゲームを破壊することは困難です。
  さらに、手の型もパラメーター化すれば、ゲームを不正に操作することは非常に難しくなります。
* コードは十分に文書化されていると*思います*。これは「エンタープライズレベル」の設計ですが、コードは非常に明快で、何をしているのかが明確です。無駄な抽象化はありません。からかうような `AbstractSingletonProxyFactoryBean` なんてものもありません。
* 事後的に、コア設計に影響を与えることなく、監査とロギングを簡単かつ洗練された方法で追加*できました*。
* グローバルなセッションデータがないため、*スケーラビリティ*は自然と確保されます。必要なのは、ブラウザにゲームの状態を保存することだけです（あるいは、MongoDBを使用してWebスケールにすることも可能です）。

もちろん、これは完璧な設計ではありません。改善できる点はいくつか思い浮かびます。しかし、コードを書きながら考えた割には、全体としては満足のいく出来栄えです。

皆さんはどう思いましたか？ コメント欄で意見を聞かせてください！

**2015年2月16日更新：結局、この設計に不満を持つようになりました。[次の投稿](../posts/enterprise-tic-tac-toe-2.md) では、その理由と、より優れた設計を紹介します。**

*注：この記事のコードは、GitHubの[このgist](https://gist.github.com/swlaschin/3418b549bd222396da82)で入手できます。*

