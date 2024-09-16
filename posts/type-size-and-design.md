---
layout: post
title: "代数的型のサイズとドメインモデリング"
description: "趣味と実益を兼ねた濃度の理解"
categories: []
---

この記事では、代数的型の「サイズ」、つまり集合で言う濃度の計算方法と、この知識が設計の決定にどう役立つかを見ていきます。

## はじめに

型の「サイズ」を定義するために、それを集合と考え、可能な要素の数を数えます。

例えば、可能なブール値は2つなので、`Boolean`型のサイズは2です。

サイズが1の型はあるでしょうか？はい、`unit`型にはただ1つの値しかありません。それは`()`です。

サイズが0の型はあるでしょうか？つまり、値が全くない型は存在するでしょうか？F#にはありませんが、Haskellにはあります。それは`Void`と呼ばれます。

次のような型ではどうでしょうか。

```fsharp
type ThreeState = 
    | Checked
    | Unchecked
    | Unknown
```

このサイズはいくつでしょうか？可能な値は3つなので、サイズは3です。

次のような型はどうでしょうか。

```fsharp
type Direction = 
    | North
    | East
    | South
    | West
```

明らかに4です。

これでお分かりいただけたと思います！

## 複合型のサイズの計算

ここで、複合型のサイズの計算を見ていきましょう。[「F# の型を理解する」](../series/understanding-fsharp-types.md)シリーズを思い出してほしいのですが、代数的型には2種類あります。
[タプル](../posts/tuples.md)やレコードなどの「積」型と、F#では[判別共用体](../posts/discriminated-unions.md)と呼ばれる「和」型です。

例えば、`Speed`と`Direction`があり、それらを`Velocity`というレコード型に組み合わせるとします。

```fsharp
type Speed = 
    | Slow
    | Fast

type Velocity = {
    direction: Direction
    speed: Speed 
    }
```

`Velocity`のサイズはいくつでしょうか？

可能な値をすべて書き出すと以下のようになります。

```fsharp
{direction=North; speed=Slow}; {direction=North; speed=Fast}
{direction=East;  speed=Slow}; {direction=East;  speed=Fast}
{direction=South; speed=Slow}; {direction=South; speed=Fast}
{direction=West;  speed=Slow}; {direction=West;  speed=Fast}
```

可能な値は8つあり、2つの`Speed`値と4つの`Direction`値のすべての組み合わせに対応しています。

これを一般化してルールにすると次のようになります。

* **ルール：直積型のサイズは、構成要素の型のサイズの積です。**

つまり、次のようなレコード型があるとします。

```fsharp
type RecordType = {
    a : TypeA
    b : TypeB }
```

サイズは次のように計算されます。

```fsharp
size(RecordType) = size(TypeA) * size(TypeB)
```

同様に、タプルの場合も

```fsharp
type TupleType = TypeA * TypeB    
```

サイズはこのようになります。

```fsharp
size(TupleType) = size(TypeA) * size(TypeB)
```

### 直和型

直和型も同じように分析できます。次のように定義された`Movement`型があるとします。

```fsharp
type Movement = 
    | Moving of Direction
    | NotMoving
```

可能性をすべて書き出して数えると

```fsharp
Moving North
Moving East
Moving South
Moving West
NotMoving
```

合計で5つです。これは偶然にも`size(Direction) + 1`になります。こちらも面白い例です。

```fsharp
type ThingsYouCanSay =
    | Yes
    | Stop
    | Goodbye

type ThingsICanSay =
    | No
    | GoGoGo
    | Hello

type HelloGoodbye = 
    | YouSay of ThingsYouCanSay 
    | ISay of ThingsICanSay 
```

ここでも、可能性をすべて書き出して数えてみましょう。

```fsharp
YouSay Yes
ISay No
YouSay Stop
ISay GoGoGo
YouSay Goodbye
ISay Hello
```

`YouSay`ケースで3つの可能な値があり、`ISay`ケースでも3つの可能な値があるので、合計6つになります。

ここでも、一般的なルールを作ることができます。

* **ルール：直和型または共用体型のサイズは、構成要素の型のサイズの和です。**

つまり、次のような共用体型があるとします。

```fsharp
type SumType = 
    | CaseA of TypeA
    | CaseB of TypeB
```

サイズは次のように計算されます。

```fsharp
size(SumType) = size(TypeA) + size(TypeB)
```

## ジェネリック型の扱い

ジェネリック型を加えるとどうなるでしょうか？

例えば、次のような型のサイズはどうでしょうか。

```fsharp
type Optional<'a> =   
    | Something of 'a
    | Nothing
```

まず言えることは、`Optional<'a>`は「型」ではなく「型コンストラクタ」だということです。`Optional<string>`は型です。`Optional<int>`も型ですが、`Optional<'a>`は型ではありません。

それでも、`size(Optional<string>)`が`size(string) + 1`、`Optional<int>`が`size(int) + 1`となることに注目すれば、サイズを計算できます。

つまり、次のように言えます。

```fsharp
size(Optional<'a>) = size('a) + 1
```

同様に、次のような2つのジェネリックを持つ型の場合

```fsharp
type Either<'a,'b> =   
    | Left of 'a
    | Right of 'b
```

そのサイズは、ジェネリック構成要素のサイズを使って計算できます（上記の「和のルール」を使用）。

```fsharp
size(Either<'a,'b>) = size('a) + size('b)
```

## 再帰型

再帰型はどうでしょうか？最も単純なものとして、連結リストを見てみましょう。

連結リストは空か、タプルを持つセルがあります。先頭は`'a`で、末尾は別のリストです。定義は次のようになります。

```fsharp
type LinkedList<'a> = 
    | Empty
    | Node of head:'a * tail:LinkedList<'a>
```

サイズを計算するために、各構成要素に名前をつけましょう。

```fsharp
let S = size(LinkedList<'a>)
let N = size('a)
```

これで次のように書けます。

```fsharp
S = 
    1         // "Empty"ケースのサイズ
    +         // 共用体型
    N * S     // タプルサイズ計算を使用した"Cell"ケースのサイズ
```

この式で少し遊んでみましょう。まず

```fsharp
S = 1 + (N * S)
```

から始めて、最後のSを式で置き換えると

```fsharp
S = 1 + (N * (1 + (N * S)))
```

整理すると

```fsharp
S = 1 + N + (N^2 * S)
```

（ここで`N^2`は「Nの2乗」を意味します）

再び最後のSを式で置き換えると

```fsharp
S = 1 + N + (N^2 * (1 + (N * S)))
```

さらに整理すると

```fsharp
S = 1 + N + N^2 + (N^3 * S)
```

このパターンが見えてきましたね！`S`の式は無限に展開できます。

```fsharp
S = 1 + N + N^2 + N^3 + N^4 + N^5 + ...
```

これをどう解釈すればいいでしょうか？リストは次のケースの和だと言えます。

* 空のリスト（サイズ = 1）
* 1要素のリスト（サイズ = N）
* 2要素のリスト（サイズ = N x N）
* 3要素のリスト（サイズ = N x N x N）
* 以下同様

この式がそれを表現しています。

余談ですが、`S = 1/(1-N)`という式を使って`S`を直接計算できます。これは`Direction`（サイズ=4）のリストのサイズが「-1/3」になることを意味します。
うーん、変ですね！これは[この「-1/12」の動画](https://www.youtube.com/watch?v=w-I6XTVZXww)を思い出させます。

## 関数のサイズの計算

関数はどうでしょうか？サイズを計算できるでしょうか？

もちろん、可能な実装をすべて書き出して数えるだけです。簡単ですね！

例えば、カードの`Suit`（スート）を`Color`（色）に対応させる`SuitColor`関数があるとします。

```fsharp
type Suit = Heart | Spade | Diamond | Club
type Color = Red | Black

type SuitColor = Suit -> Color
```

1つの実装は、どのスートが与えられても赤を返すものです。

```fsharp
(Heart -> Red); (Spade -> Red); (Diamond -> Red); (Club -> Red)
```

別の実装は、`Club`以外のすべてのスートに対して赤を返すものです。

```fsharp
(Heart -> Red); (Spade -> Red); (Diamond -> Red); (Club -> Black)
```

実際、この関数の可能な実装をすべて書き出すと16通りあります。

```fsharp
(Heart -> Red); (Spade -> Red); (Diamond -> Red); (Club -> Red)
(Heart -> Red); (Spade -> Red); (Diamond -> Red); (Club -> Black)
(Heart -> Red); (Spade -> Red); (Diamond -> Black); (Club -> Red)
(Heart -> Red); (Spade -> Red); (Diamond -> Black); (Club -> Black)

(Heart -> Red); (Spade -> Black); (Diamond -> Red); (Club -> Red)
(Heart -> Red); (Spade -> Black); (Diamond -> Red); (Club -> Black)  // 正しいもの！
(Heart -> Red); (Spade -> Black); (Diamond -> Black); (Club -> Red)
(Heart -> Red); (Spade -> Black); (Diamond -> Black); (Club -> Black)

(Heart -> Black); (Spade -> Red); (Diamond -> Red); (Club -> Red)
(Heart -> Black); (Spade -> Red); (Diamond -> Red); (Club -> Black)
(Heart -> Black); (Spade -> Red); (Diamond -> Black); (Club -> Red)
(Heart -> Black); (Spade -> Red); (Diamond -> Black); (Club -> Black)

(Heart -> Black); (Spade -> Black); (Diamond -> Red); (Club -> Red)
(Heart -> Black); (Spade -> Black); (Diamond -> Red); (Club -> Black)
(Heart -> Black); (Spade -> Black); (Diamond -> Black); (Club -> Red)
(Heart -> Black); (Spade -> Black); (Diamond -> Black); (Club -> Black)
```

別の見方をすると、各値が特定の実装を表すレコード型を定義できます。
`Heart`入力に対してどの色を返すか、`Spade`入力に対してどの色を返すか、といった具合です。

`SuitColor`の実装の型定義は次のようになります。

```fsharp
type SuitColorImplementation = {
    Heart : Color
    Spade : Color
    Diamond : Color
    Club : Color }
```

このレコード型のサイズはいくつでしょうか？

```fsharp
size(SuitColorImplementation) = size(Color) * size(Color) * size(Color) * size(Color)
```

ここには4つの`size(Color)`があります。言い換えると、入力ごとに1つの`size(Color)`があるので、次のように書けます。

```fsharp
size(SuitColorImplementation) = size(Color)のsize(Suit)乗
```

一般に、次のような関数型があるとします。

```fsharp
type Function<'input,'output> = 'input -> 'output
```

関数のサイズは`size(出力型)`の`size(入力型)`乗になります。

```fsharp
size(Function) =  size(output) ^ size(input)
```

これもルールにしましょう。

* **ルール：関数型のサイズは`size(出力型)`の`size(入力型)`乗です。**


## 型間の変換

さて、これはとても興味深いですが、実用的でしょうか？

私はそう思います。このような型のサイズを理解することは、ある型から別の型への変換を設計する上で役立ちます。これは私たちがよく行うことです！

例えば、はい/いいえの回答を表す共用体型とレコード型があるとします。

```fsharp
type YesNoUnion = 
    | Yes
    | No

type YesNoRecord = { 
    isYes: bool }
```

これらの間でどのようにマッピングできるでしょうか？

両方ともサイズは2なので、一方の型の各値を他方の型に対応させることができるはずです。

```fsharp
let toUnion yesNoRecord =
    if yesNoRecord.isYes then 
        Yes
    else
        No

let toRecord yesNoUnion =
    match yesNoUnion with
    | Yes -> {isYes = true}
    | No ->  {isYes = false}
```

これは「損失のない」変換と呼べるものです。変換を往復させると、元の値を復元できます。
数学者はこれを同型写像（アイソモーフィズム：ギリシャ語で「同じ形」の意味）と呼びます。

別の例を見てみましょう。はい、いいえ、たぶんの3つのケースを持つ型があります。

```fsharp
type YesNoMaybe = 
    | Yes
    | No
    | Maybe
```

この型を次の型に損失なく変換できるでしょうか？

```fsharp
type YesNoOption = { maybeIsYes: bool option }    
```

`option`のサイズはいくつでしょうか？内部の型のサイズに1を足したものです。この場合、内部の型は`bool`です。したがって、`YesNoOption`のサイズも3です。

変換関数は次のようになります。

```fsharp
let toYesNoMaybe yesNoOption =
    match yesNoOption.maybeIsYes with
    | None -> Maybe
    | Some b -> if b then Yes else No

let toYesNoOption yesNoMaybe =
    match yesNoMaybe with
    | Yes ->   {maybeIsYes = Some true}
    | No ->    {maybeIsYes = Some false}
    | Maybe -> {maybeIsYes = None}
```

ここからルールを作れます。

* **ルール：2つの型のサイズが同じであれば、損失のない変換関数のペアを作成できます**

試してみましょう。`Nibble`型と`TwoNibbles`型があります。

```fsharp
type Nibble = {
    bit1: bool
    bit2: bool
    bit3: bool
    bit4: bool }

type TwoNibbles = {
    high: Nibble
    low: Nibble }
```

`TwoNibbles`を`byte`に、そしてその逆に変換できるでしょうか？

`Nibble`のサイズは`2 x 2 x 2 x 2` = 16（積のサイズルールを使用）で、`TwoNibbles`のサイズはsize(Nibble) x size(Nibble)、つまり`16 x 16`で256です。

したがって、`TwoNibbles`から`byte`への、そしてその逆の変換が可能です。

## 損失のある変換

型のサイズが異なる場合はどうなるでしょうか？

目標の型が元の型より「大きい」場合は、常に損失なく変換できます。しかし、目標の型が元の型より「小さい」場合は問題があります。

例えば、`int`型は`string`型より小さいです。`int`を正確に`string`に変換できますが、`string`を簡単に`int`に変換することはできません。

`string`を`int`にマッピングしたい場合、整数でない文字列の一部を、目標の型の特別な非整数値にマッピングする必要があります。

![](../assets/img/type-size-1.png)

つまり、サイズから、目標の型は単なる`int`型ではなく、`int + 1`型でなければならないことがわかります。言い換えると、Option型です！

興味深いことに、BCLの`Int32.TryParse`関数は2つの値（成功/失敗を示す`bool`と、パースされた結果の`int`）を返します。つまり、`bool * int`というタプルです。

そのタプルのサイズは`2 x int`で、実際に必要な値よりもはるかに多くなります。Option型の勝利です！

次に、`string`を`Direction`に変換する場合を考えてみましょう。一部の文字列は有効ですが、ほとんどは無効です。
しかし今回は、1つの無効なケースを持つのではなく、空の入力、長すぎる入力、その他の無効な入力を区別したいとします。

![](../assets/img/type-size-2.png)

もはやOption型で目標をモデル化することはできないので、7つのケースすべてを含むカスタム型を設計しましょう。

```fsharp
type StringToDirection_V1 = 
    | North
    | East
    | South
    | West
    | Empty    
    | NotValid
    | TooLong
```

しかし、この設計は成功した変換と失敗した変換を混在させています。分離してはどうでしょうか？

```fsharp
type Direction = 
    | North
    | East
    | South
    | West

type ConversionFailure = 
    | Empty    
    | NotValid
    | TooLong

type StringToDirection_V2 = 
    | Success of Direction
    | Failure of ConversionFailure
```

`StringToDirection_V2`のサイズはいくつでしょうか？

`Success`ケースには4つの`Direction`の選択肢があり、`Failure`ケースには3つの`ConversionFailure`の選択肢があるので、
合計サイズは7で、最初のバージョンと同じです。

つまり、これらの設計は「等価」で、どちらも使えるということです。

個人的には、バージョン2を好みますが、レガシーコードにバージョン1があっても、バージョン1からバージョン2へ、そしてその逆へ損失なく変換できるのは良いニュースです。
これは、必要に応じてバージョン2に安全にリファクタリングできることを意味します。


## コアドメインの設計

異なる型間で損失なく変換できることを知ると、必要に応じてドメイン設計を調整できます。

例えば、この型：

```fsharp
type Something_V1 =
    | CaseA1 of TypeX * TypeY
    | CaseA2 of TypeX * TypeZ
```

は、次のように損失なく変換できます。

```fsharp
type Inner =
    | CaseA1 of TypeY
    | CaseA2 of TypeZ

type Something_V2 = 
    TypeX * Inner 
```

あるいは、次のようにもできます。

```fsharp
type Something_V3 = {
    x: TypeX
    inner: Inner }
```

実際の例を見てみましょう：

* 登録ユーザーと未登録ユーザーがいるウェブサイトがあります。
* すべてのユーザーにセッションIDがあります。
* 登録ユーザーにのみ、追加情報があります。

この要件を次のようにモデル化できます。

```fsharp
module Customer_V1 =

    type UserInfo = {name:string} //など
    type SessionId = SessionId of int

    type WebsiteUser = 
        | RegisteredUser of SessionId * UserInfo
        | GuestUser of SessionId 
```

あるいは、共通の`SessionId`を上位レベルに引き上げて、次のようにもできます。

```fsharp
module Customer_V2 =

    type UserInfo = {name:string} //など
    type SessionId = SessionId of int

    type WebsiteUserInfo = 
        | RegisteredUser of UserInfo
        | GuestUser 

    type WebsiteUser = {
        sessionId : SessionId
        info: WebsiteUserInfo }
```

どちらが良いでしょうか？ある意味では、両方とも「同じ」ですが、使用パターンによって最適な設計は異なります。

* ユーザーの種類をセッションIDより重視する場合は、バージョン1が良いでしょう。
* ユーザーの種類を気にせず、常にセッションIDを見る場合は、バージョン2が良いでしょう。

これらが同型であることを知っていれば、必要に応じて両方の型を定義し、異なるコンテキストで使用し、必要に応じて損失なく相互に変換できるのが良い点です。

## 外部世界とのインターフェース

`Direction`や`WebsiteUser`のようなきれいなドメイン型がありますが、どこかで外部世界とインターフェースを取る必要があります。
データベースに保存したり、JSONとして受け取ったりする場合などです。

問題は、外部世界には素晴らしい型システムがないことです！すべてが文字列、整数、ブール値などのプリミティブになりがちです。

私たちのドメインから外部世界に行くことは、「小さな」値の集合から「大きな」値の集合への移行を意味し、これは簡単にできます。
しかし、外部世界から私たちのドメインに入ってくるということは、「大きな」値の集合から「小さな」値の集合への移行を意味し、これには検証とエラーケースが必要です。

例えば、ドメイン型は次のようになるかもしれません：

```fsharp
type DomainCustomer = {
    Name: String50
    Email: EmailAddress
    Age: PositiveIntegerLessThan130 }
```

値には制約があります：名前は最大50文字、検証済みのメールアドレス、1から129の間の年齢です。

一方、DTO型は次のようになるかもしれません：

```fsharp
type CustomerDTO = {
    Name: string
    Email: string
    Age: int }
```

値に制約はありません：名前は任意の文字列、未検証のメールアドレス、2^32の異なる値（負の値を含む）を取り得る年齢です。

これは、`CustomerDTO`から`DomainCustomer`へのマッピングを作成できないことを意味します。
無効な入力をマッピングするために、少なくとも1つの別の値（`DomainCustomer + 1`）が必要で、できれば様々なエラーを文書化するためにさらに多くの値が必要です。

これは自然に、私の[関数型エラー処理](https://fsharpforfunandprofit.com/rop/)の講演で説明した`Success/Failure`モデルにつながります。

最終的なマッピングは、`CustomerDTO`から`SuccessFailure<DomainCustomer>`または類似のものへのマッピングになります。

これから最後のルールが導かれます：

* **ルール：誰も信用しないこと。外部ソースからデータをインポートする場合は、必ず無効な入力を処理すること。**

このルールを真剣に受け止めると、いくつかの影響があります：

* ドメイン型に直接デシリアライズしようとしない（例：ORMは使用しない）。DTOタイプにのみデシリアライズする。
* データベースやその他の「信頼できる」ソースから読み取るすべてのレコードを常に検証する。

すべてが`Success/Failure`型でラップされていると面倒になると思うかもしれません。それは事実ですが（！）、これを簡単にする方法があります。
例えば、[この投稿](../posts/elevated-world-5.md#asynclist)を参照してください。

## さらに読むべき資料

代数的型の「代数」はよく知られています。最近の良いまとめとして、
["The algebra (and calculus!) of algebraic data types"](https://codewords.recurse.com/issues/three/algebra-and-calculus-of-algebraic-data-types)
と[Chris Taylorによるシリーズ](https://web.archive.org/web/20170929124618/http://chris-taylor.github.io/blog/2013/02/13/the-algebra-of-algebraic-data-types-part-iii/)があります。

この記事を書いた後、2つの類似した投稿を指摘されました：

* [Tomas Petricekによるもの](https://tomasp.net/blog/types-and-math.aspx/)で、ほぼ同じ内容です！
* [Bartosz Milewskiによるもの](https://bartoszmilewski.com/2015/01/13/simple-algebraic-data-types/)で、圏論のシリーズの一部です。

一部の記事で触れられていますが、代数的型の数式を使って、微分など、興味深い操作ができます！

学術論文が好きな方は、2001年のConor McBrideによる["The Derivative of a Regular Type is its Type of One-Hole Contexts"](http://strictlypositive.org/diff.pdf) (PDF)で元の議論を読むことができ、
2005年のAbbott、Altenkirch、Ghani、McBrideによる["Differentiating Data Structures"](https://www.cs.nott.ac.uk/~txa/publ/jpartial.pdf) (PDF)でフォローアップを読むことができます。

## まとめ

この記事は世界で最も刺激的なトピックではないかもしれませんが、私はこのアプローチを興味深く、また有用だと感じ、皆さんと共有したいと思いました。

あなたの考えを聞かせてください。読んでいただきありがとうございます！

