---
layout: post
title: "電卓のウォークスルー: パート 1"
description: "型ファーストのアプローチで電卓を設計する"
categories: ["実践例", "ドメイン駆動設計"]
seriesId: "注釈付きウォークスルー"
seriesOrder: 1

---

F# や関数型プログラミング全般についてよく聞く意見の一つに、理論と実践のギャップに関する不満があります。
つまり、理論は分かっても、関数型プログラミングの原則を使って実際にアプリケーションを設計・実装するにはどうすればいいのか、ということです。

そこで、ちょっとしたアプリケーションを最初から最後まで設計・実装していく過程をお見せするのが役立つかもしれないと考えました。

これはいわば、注釈付きのライブコーディングセッションのようなものです。ある問題を取り上げ、それをコーディングしていく中で、各段階における私の思考プロセスを説明していきます。
もちろん、私も間違いを犯します。ですから、私がどのようにそれを処理し、手戻りやリファクタリングを行うのかをご覧いただけます。

注意点として、これが本番環境に対応できるコードだと主張しているわけではありません。お見せするコードは、どちらかというと探索的なスケッチのようなもので、
その結果、より重要なコードではやらないような悪いこと（テストをしないなど！）をすることになります。

このシリーズの最初の投稿では、次のようなシンプルな電卓アプリを開発していきます。

![Calculator image](@assets/img/calculator_1.png)

## 私の開発アプローチ

私のソフトウェア開発へのアプローチは折衷的で実用的です。さまざまなテクニックを組み合わせ、トップダウンとボトムアップのアプローチを交互に行うのが好きです。

普段は、要件定義から始めます。[要件駆動設計](../posts/roman-numeral-kata.md)のファンなのです！
理想的には、そのドメインの専門家になることも目指します。

次に、ドメインモデリングに取り組みます。
静的なデータ（ DDD用語でいう「集約」 ）だけでなく、ドメインイベントに焦点を当てながら（ [イベントストーミング](https://ziobrando.blogspot.com/2013/11/introducing-event-storming.html) ）、[ドメイン駆動設計](https://fsharpforfunandprofit.com/ddd/)を行います。

モデリングプロセスの一環として、[型ファースト開発](https://tomasp.net/blog/type-first-development.aspx/)を用いて設計のスケッチを作成し、
ドメインのデータ型（「名詞」）とドメインのアクティビティ（「動詞」）の両方を表す[型を作成](../series/designing-with-types.md)します。

ドメインモデルの最初のドラフトを作成したら、通常は「ボトムアップ」アプローチに切り替え、これまでに定義したモデルを実行する小さなプロトタイプをコーディングします。

この時点で実際のコーディングを行うことは、現実性を確認する役割を果たします。ドメインモデルが実際に理にかなっており、抽象的すぎないことを保証します。
そしてもちろん、多くの場合、要件とドメインモデルに関するさらなる疑問が生じるため、
ステップ1に戻り、洗練とリファクタリングを行い、満足するまでこれを繰り返します。

（もし、大規模なプロジェクトでチームと仕事をしているとしたら、この時点で[実際のシステムを段階的に構築](http://www.growing-object-oriented-software.com/)し、
ユーザーインターフェース（たとえば、紙のプロトタイプで）にも着手することができます。これらの活動はどちらも、さらに多くの疑問や要件の変更を生み出す可能性が高いため、
プロセス全体がすべてのレベルで循環することになります。）

これが理想的な世界での私のアプローチです。もちろん現実の世界は完璧ではありません。
対処すべき悪い経営、要件の不足、ばかげた締め切りなど、理想的なプロセスを使えることはほとんどありません。

しかし、この例では私がボスなので、結果が気に入らなければ、責めるべきは自分だけです！

## はじめに

さあ、始めましょう。まずは何をすべきでしょうか？

通常であれば、要件定義から始めるところですが、電卓のために本当に多くの時間を費やす必要があるのでしょうか？

面倒なので、ここでは「いいえ」とします。代わりに、電卓の仕組みはわかっているという自信を持って、そのまま飛び込んでみましょう。
（*後ほどわかりますが、私は間違っていました！ 要件をまとめようとするのは良い練習になったはずです。興味深いエッジケースがいくつかあるからです。*）

それでは、型ファースト設計から始めましょう。

私の設計では、すべてのユースケースは1つの入力と1つの出力を持つ関数です。

この例では、電卓へのパブリックインターフェースを関数としてモデル化する必要があります。関数のシグネチャは次のとおりです。

```fsharp
type Calculate = CalculatorInput -> CalculatorOutput
```

簡単でしたね！ 最初の質問は、他にモデル化する必要があるユースケースがあるかどうかです。
今のところは、ないと考えています。すべての入力を処理する単一のケースから考えていきましょう。


## 関数の入力と出力の定義

しかし、これで未定義の `CalculatorInput` と `CalculatorOutput` という2つの新しい型が作成されました
（これをF#スクリプトファイルに入力すると、赤い波線が表示されて注意されます）。
これらを定義しておきましょう。

先に進む前に、この関数の入力型と出力型は純粋でクリーンなものになることを明確にしておく必要があります。
ドメインを設計する際には、文字列、プリミティブなデータ型、検証などの面倒な世界を扱うことは決して望ましくありません。

代わりに、通常は、入力時に信頼できない乱雑な世界から素敵な原始的なドメインに変換する検証/変換関数と、
出力時にその逆を行う同様の関数が存在します。

![ドメインの入力と出力](@assets/img/domain_input_output.png)


では、まず `CalculatorInput` から見ていきましょう。入力の構造はどうなるでしょうか？
 
まず、明らかに、キーストローク、またはユーザーの意図を伝えるための何らかの方法が必要です。
しかし、電卓はステートレスなので、状態も渡す必要があります。この状態には、たとえば、これまでにタイプされた数字が含まれます。

出力に関しては、関数は当然、更新された新しい状態を出力する必要があります。

しかし、表示用にフォーマットされた出力を含む構造など、他に必要なものはあるでしょうか？ 必要ないと思います。
表示ロジックから分離したいので、
UIに状態を処理させて表示可能なものに変換させます。

エラーはどうでしょうか？ [他の投稿](https://fsharpforfunandprofit.com/rop/) では、エラー処理について多くの時間を割いて説明しました。この場合、エラー処理は必要でしょうか？

この場合は、必要ないと思います。安価なポケット電卓では、エラーはすべてディスプレイに表示されるので、ここではそのアプローチに従います。

関数の新しいバージョンは次のとおりです。

```fsharp
type Calculate = CalculatorInput * CalculatorState -> CalculatorState 
```

`CalculatorInput` はキーストロークなどを意味し、 `CalculatorState` は状態です。

この関数を、2つの別々のパラメーター（ `CalculatorInput -> CalculatorState -> CalculatorState` のような形式）ではなく、
[タプル](../posts/tuples.md) （ `CalculatorInput * CalculatorState` ）を入力として使用して定義していることに注意してください。
両方のパラメーターが常に必要であり、タプルによってそれが明確になるため、このようにしました。たとえば、入力の一部だけを適用することは望ましくありません。

実際、型ファースト設計を行う際には、すべての関数に対してこれを行います。すべての関数は1つの入力と1つの出力を持っています。
これは、後で部分適用を行う可能性がないという意味ではありません。設計段階では、パラメーターを1つだけにするということです。

純粋なドメインの一部ではないもの（構成や接続文字列など）は、この段階では*決して*表示されないことに注意してください。
ただし、実装時には、もちろん設計を実装する関数に追加されます。

## 電卓の状態を表す型を定義する

では、`CalculatorState` について見ていきましょう。現時点で必要なのは、表示する情報を保持する何かだけです。

```fsharp
type Calculate = CalculatorInput * CalculatorState -> CalculatorState 
and CalculatorState = {
    display: CalculatorDisplay
    }
```

まず、フィールドの値が何に使われるのかを明確にするためのドキュメントとして、
そして、実際にディスプレイが何であるかを後で決めることができるように、`CalculatorDisplay` という型を定義しました。

では、ディスプレイの型はどうすればよいのでしょうか？float？string？文字のリスト？複数のフィールドを持つレコード？

さて、上で述べたように、エラーを表示する必要があるかもしれないので、`string` にすることにします。

```fsharp
type Calculate = CalculatorInput * CalculatorState -> CalculatorState 
and CalculatorState = {
    display: CalculatorDisplay
    }
and CalculatorDisplay = string
```

型定義を繋ぐために `and` を使用していることに注意してください。なぜでしょうか？

F# は上から下にコンパイルされるので、型を使用する前に定義する必要があります。次のコードはコンパイルされません。

```fsharp
type Calculate = CalculatorInput * CalculatorState -> CalculatorState 
type CalculatorState = {
    display: CalculatorDisplay
    }
type CalculatorDisplay = string
```

宣言の順序を変更すれば、この問題は解決できますが、
「スケッチ」モードなので、しょっちゅう順序を変更したくはありません。
そのため、新しい宣言を下に追加し、`and` を使って繋いでいきます。

しかし、最終的な製品コードでは、設計が安定したら、`and` を使用しないように、これらの型の順序を変更します。
その理由は、`and` が[型の循環依存を隠して](../posts/cyclic-dependencies.md)リファクタリングを妨げる可能性があるからです。

## 電卓への入力型を定義する

`CalculatorInput` 型については、電卓のボタンをすべて列挙するだけにします。

```fsharp
// 上記と同じ
and CalculatorInput = 
    | Zero | One | Two | Three | Four 
    | Five | Six | Seven | Eight | Nine
    | DecimalSeparator
    | Add | Subtract | Multiply | Divide
    | Equals | Clear
```

「なぜ入力を `char` 型にしないのか？」と言う人もいるかもしれません。しかし、上で説明したように、私のドメインでは理想的なデータのみを扱いたいのです。
このように選択肢を限定することで、予期せぬ入力を処理する必要がなくなります。

また、char ではなく抽象型を使用することの副次的な利点として、`DecimalSeparator` が "." であると想定されないことが挙げられます。
実際の区切り文字は、最初に現在のカルチャ (`System.Globalization.CultureInfo.CurrentCulture`) を取得し、
次に `CurrentCulture.NumberFormat.CurrencyDecimalSeparator` を使用して区切り文字を取得することで得られます。
この実装の詳細を設計から隠すことで、実際に使用される区切り文字を変更しても、コードへの影響を最小限に抑えることができます。

## 設計の改良: 数字の処理

これで設計の第一段階は完了です。次は、内部処理をいくつか定義してみましょう。

まずは、数字の処理方法について考えてみましょう。

数字キーが押されたら、現在の表示に数字を追加したいとします。それを表す関数型を定義してみましょう。

```fsharp
type UpdateDisplayFromDigit = CalculatorDigit * CalculatorDisplay -> CalculatorDisplay
```

`CalculatorDisplay` 型は先ほど定義したものですが、この新しい `CalculatorDigit` 型は何でしょうか？

明らかに、入力として使用できるすべての数字を表す型が必要です。
`Add` や `Clear` などの他の入力はこの関数には無効です。

```fsharp
type CalculatorDigit = 
    | Zero | One | Two | Three | Four 
    | Five | Six | Seven | Eight | Nine
    | DecimalSeparator
```

では、次の質問です。どのようにしてこの型の値を取得するのでしょうか？次のように、`CalculatorInput` を `CalculatorDigit` 型にマッピングする関数が必要なのでしょうか？

```fsharp
let convertInputToDigit (input:CalculatorInput) =
    match input with
        | Zero -> CalculatorDigit.Zero
        | One -> CalculatorDigit.One
        | etc
        | Add -> ???
        | Clear -> ???
```

多くの場合、これは必要かもしれませんが、このケースではやり過ぎのように思えます。
また、この関数は `Add` や `Clear` などの数字以外の入力をどのように処理するのでしょうか？

そこで、新しい型を直接使用するために、`CalculatorInput` 型を再定義することにしましょう。

```fsharp
type CalculatorInput = 
    | Digit of CalculatorDigit // 数字
    | Add | Subtract | Multiply | Divide // 加減乗除
    | Equals | Clear // その他の操作
```

ついでに、他のボタンも分類してみましょう。

`Add | Subtract | Multiply | Divide` は数学演算に分類します。
`Equals | Clear` は、適切な言葉がないので、とりあえず「アクション」と呼ぶことにします。

新しい型 `CalculatorDigit`、`CalculatorMathOp`、`CalculatorAction` を使用した、リファクタリング後の設計の全体像は以下のとおりです。

```fsharp
type Calculate = CalculatorInput * CalculatorState -> CalculatorState 
and CalculatorState = {
    display: CalculatorDisplay
    }
and CalculatorDisplay = string
and CalculatorInput = 
    | Digit of CalculatorDigit
    | Op of CalculatorMathOp
    | Action of CalculatorAction
and CalculatorDigit = 
    | Zero | One | Two | Three | Four 
    | Five | Six | Seven | Eight | Nine
    | DecimalSeparator
and CalculatorMathOp = 
    | Add | Subtract | Multiply | Divide
and CalculatorAction = 
    | Equals | Clear

type UpdateDisplayFromDigit = CalculatorDigit * CalculatorDisplay -> CalculatorDisplay    
```

これは唯一のアプローチではありません。`Equals` と `Clear` を別々の選択肢として残しておくこともできました。

さて、`UpdateDisplayFromDigit` をもう一度見てみましょう。他に必要なパラメータはありますか？たとえば、状態の他の部分が必要ですか？

いいえ、他に何も思いつきません。これらの関数を定義するときは、できるだけ最小限にしたいのです。ディスプレイだけが必要なのに、なぜ電卓の状態全体を渡す必要があるのでしょうか？

また、`UpdateDisplayFromDigit` がエラーを返すことはあるのでしょうか？たとえば、数字を無限に追加することはできません。
許可されていない場合はどうなりますか？また、エラーが発生する可能性のある入力の組み合わせは他にありますか？たとえば、小数点記号だけを入力した場合などはどうなりますか？

この小さなプロジェクトでは、これらのどちらも明示的なエラーを作成せず、代わりに、不正な入力は黙って拒否されると仮定します。
言い換えれば、10 桁入力した後は、他の数字は無視されます。また、最初の小数点記号の後、後続の小数点記号も無視されます。

残念ながら、これらの要件を設計に直接反映させることはできません。
しかし、`UpdateDisplayFromDigit` が明示的なエラー型を返さないという事実から、少なくともエラーが黙って処理されるということはわかります。

## 設計の改良: 数学演算

では、数学演算に移りましょう。

これらはすべて二項演算で、2 つの数値を受け取って新しい結果を出力します。

これを表す関数型は次のようになります。

```fsharp
type DoMathOperation = CalculatorMathOp * Number * Number -> Number
```

`1/x` のような単項演算もある場合は、それらに別の型が必要になりますが、今回はないので、単純にしておきます。

次の決定です。どのような数値型を使用すればよいのでしょうか？ジェネリックにするべきでしょうか？

ここでも、単純に `float` を使うことにしましょう。ただし、表現を少し分離するために、`Number` のエイリアスは残しておきます。更新されたコードは以下のとおりです。

```fsharp
type DoMathOperation = CalculatorMathOp * Number * Number -> Number
and Number = float
```


さて、上で `UpdateDisplayFromDigit` について行ったように、`DoMathOperation` についても考えてみましょう。

質問1: これは最小限のパラメータセットでしょうか？たとえば、状態の他の部分が必要ですか？

回答: いいえ、他に何も思いつきません。

質問2: `DoMathOperation` がエラーを返すことはありますか？

回答: はい！ゼロで割る場合はどうでしょうか？

では、どのようにエラーを処理すればよいのでしょうか？
そこで、数学演算の結果を表す新しい型を作成し、 `DoMathOperation`  の出力にそれを利用することにします。

新しい型 `MathOperationResult` は、`Success` と `Failure` の 2 つの選択肢（判別共用体）を持つことになります。

```fsharp
type DoMathOperation = CalculatorMathOp * Number * Number -> MathOperationResult 
and Number = float
and MathOperationResult = 
    | Success of Number
    | Failure of MathOperationError
and MathOperationError = 
    | DivideByZero
```

組み込みのジェネリック型 `Choice` を使用したり、「[鉄道指向プログラミング](https://fsharpforfunandprofit.com/rop/)」のアプローチを本格的に使ったりすることもできましたが、
これは設計のスケッチなので、多くの依存関係を持たずに設計を独立させたいので、ここで具体的な型を定義することにします。

他にエラーはありますか？NaN やアンダーフロー、オーバーフローはどうでしょうか？わかりません。`MathOperationError` 型があるので、必要に応じて簡単に拡張できます。

## 数値はどこから来るのか？

`DoMathOperation` を入力として `Number` 値を使用するように定義しました。しかし、`Number` はどこから来るのでしょうか？

それは、入力された数字の並びから来ています。数字を float に変換するのです。

1 つのアプローチは、文字列の表示とともに `Number` を状態に格納し、数字が入力されるたびに更新することです。

ここでは、より単純なアプローチを採用し、表示から直接数値を取得することにします。言い換えれば、次のような関数が必要です。

```fsharp
type GetDisplayNumber = CalculatorDisplay -> Number
```

しかし、考えてみると、表示文字列が "error" などになっている可能性があるため、この関数は失敗する可能性があります。そこで、代わりにオプションを返すようにしましょう。

```fsharp
type GetDisplayNumber = CalculatorDisplay -> Number option
```

同様に、結果が成功した場合は、それを表示したいので、逆方向に動作する関数が必要です。

```fsharp
type SetDisplayNumber = Number -> CalculatorDisplay 
```

この関数がエラーになることはないので（そう願っています）、`option` は必要ありません。

## 設計の改良: 数学演算の入力処理

数学演算はまだ終わりではありません。

入力が `Add` の場合、目に見える効果は何でしょうか？何もありません。

`Add` イベントは、後から入力される数値と演算を行う必要があるため、
何らかの形で保留状態になり、次の数値の入力を待ちます。

考えてみると、`Add` イベントを保留しておくだけでなく、入力された最新の数字に加算される準備ができた以前の数字も保持しておく必要があります。

これをどこで追跡すればよいのでしょうか？もちろん `CalculatorState` です。

新しいフィールドを追加する最初の試みは以下のとおりです。

```fsharp
and CalculatorState = {
    display: CalculatorDisplay
    pendingOp: CalculatorMathOp
    pendingNumber: Number
    }
```

しかし、保留中の操作がない場合もあるので、オプションにする必要があります。

```fsharp
and CalculatorState = {
    display: CalculatorDisplay
    pendingOp: CalculatorMathOp option
    pendingNumber: Number option
    }
```

しかし、これも間違っています。`pendingNumber` なしで `pendingOp` を持つことはできますか？またはその逆は？いいえ、できません。これらは一緒に存在し、一緒に消滅します。

これは、状態がペアを含み、ペア全体がオプションである必要があることを意味します。

```fsharp
and CalculatorState = {
    display: CalculatorDisplay
    pendingOp: (CalculatorMathOp * Number) option
    }
```

しかし、まだ足りない部分があります。
演算が保留中として状態に追加された場合、演算はいつ実際に *実行* され、結果が表示されるのでしょうか？

答え: `Equals` ボタンが押されたとき、または別の数学演算ボタンが押されたときです。これについては後で説明します。

## 設計の改良: クリアボタンの処理

最後に処理するボタンは、`Clear` ボタンです。これは何をするのでしょうか？

明らかに、状態をリセットして、ディスプレイを空にし、保留中の操作をすべて削除します。

この関数を "clear" ではなく `InitState` と呼ぶことにします。そのシグネチャは以下のとおりです。

```fsharp
type InitState = unit -> CalculatorState 
```

## サービスの定義

この時点で、ボトムアップ開発に切り替えるために必要なものはすべて揃いました。
`Calculate` 関数の試作実装を構築して、設計が使い物になるかどうか、何か見落としているものがないかどうかを確認したいと思っています。

しかし、全体を実装せずに試作実装を作成するにはどうすればよいのでしょうか？

ここで、これらの型がすべて役に立ちます。`calculate` 関数が使用する「サービス」のセットを、実際に実装することなく定義することができます。

どういうことかというと、次のとおりです。

```fsharp
type CalculatorServices = {
    updateDisplayFromDigit: UpdateDisplayFromDigit
    doMathOperation: DoMathOperation
    getDisplayNumber: GetDisplayNumber
    setDisplayNumber: SetDisplayNumber
    initState: InitState
    }
```

`Calculate` 関数の実装に注入できるサービスのセットを作成しました。
これらが用意されていれば、すぐに `Calculate` 関数をコーディングし、サービスの実装は後回しにすることができます。

この時点で、小さなプロジェクトにしてはやり過ぎだと思うかもしれません。

確かに、これを [エンタープライズFizzBuzz](https://github.com/EnterpriseQualityCoding/FizzBuzzEnterpriseEdition) にしたくはありません。

しかし、ここで私は原則を示しています。「サービス」をコアコードから分離することで、すぐにプロトタイピングを開始できます。
目標は、本番対応のコードベースを作成することではなく、設計上の問題を見つけることです。まだ要件発見の段階にあります。

このアプローチは、オブジェクト指向の原則でよく使われる、
サービスのインターフェースを複数作成し、それらをコアドメインに注入する手法と似ていますので、理解しやすいのではないでしょうか。

## レビュー

では、サービスを追加して、初期設計が完成したので、レビューしてみましょう。
ここまでのコードの全体像は以下のとおりです。

```fsharp
type Calculate = CalculatorInput * CalculatorState -> CalculatorState 
and CalculatorState = {
    display: CalculatorDisplay
    pendingOp: (CalculatorMathOp * Number) option
    }
and CalculatorDisplay = string
and CalculatorInput = 
    | Digit of CalculatorDigit
    | Op of CalculatorMathOp
    | Action of CalculatorAction
and CalculatorDigit = 
    | Zero | One | Two | Three | Four 
    | Five | Six | Seven | Eight | Nine
    | DecimalSeparator
and CalculatorMathOp = 
    | Add | Subtract | Multiply | Divide
and CalculatorAction = 
    | Equals | Clear
and UpdateDisplayFromDigit = 
    CalculatorDigit * CalculatorDisplay -> CalculatorDisplay
and DoMathOperation = 
    CalculatorMathOp * Number * Number -> MathOperationResult 
and Number = float
and MathOperationResult = 
    | Success of Number
    | Failure of MathOperationError
and MathOperationError = 
    | DivideByZero

type GetDisplayNumber = 
    CalculatorDisplay -> Number option
type SetDisplayNumber = 
    Number -> CalculatorDisplay 

type InitState = 
    unit -> CalculatorState 

type CalculatorServices = {
    updateDisplayFromDigit: UpdateDisplayFromDigit
    doMathOperation: DoMathOperation
    getDisplayNumber: GetDisplayNumber
    setDisplayNumber: SetDisplayNumber
    initState: InitState
    }
```


## まとめ

これはなかなか良いのではないでしょうか。まだ「本当の」コードは書いていませんが、少し考えただけで、かなり詳細な設計を構築することができました。

[次の投稿](../posts/calculator-implementation) では、実装を作成してみることで、この設計をテストします。

*この投稿のコードは、GitHub のこの [gist](https://gist.github.com/swlaschin/0e954cbdc383d1f5d9d3#file-calculator_design-fsx) で入手できます。*

