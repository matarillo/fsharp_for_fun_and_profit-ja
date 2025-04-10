---
layout: post
title: "電卓のウォークスルー: パート 2"
description: "仮実装で設計を検証する"
categories: ["実践例"]
seriesId: "注釈付きウォークスルー"
seriesOrder: 2

---

この記事では、前回に引き続き、シンプルな電卓アプリの開発を進めていきます。

![電卓の画像](@assets/img/calculator_1.png)

[前回の記事](../posts/calculator-design.html)では、UML図を使わずに型だけを使って設計の最初のドラフトを作成しました。

今回は、その設計を使って仮実装を行い、検証していきます。

この時点で実際にコードを書くことで、ドメインモデルが本当に理にかなっているか、抽象的すぎないかを確認できます。
そしてもちろん、要件やドメインモデルに関する新たな疑問が出てくることもよくあります。


## 最初の実装

それでは、電卓のメイン関数を試しに実装してみましょう。

まず、各入力の種類に対応するスケルトンを作成し、それぞれ適切に処理するようにします。

```fsharp
let createCalculate (services:CalculatorServices) :Calculate = 
    fun (input,state) -> 
        match input with
        | Digit d ->
            let newState = // 何か処理を行う
            newState //return
        | Op op ->
            let newState = // 何か処理を行う
            newState //return
        | Action Clear ->
            let newState = // 何か処理を行う
            newState //return
        | Action Equals ->
            let newState = // 何か処理を行う
            newState //return
```

このスケルトンには、各入力タイプに対応するケースがあり、それぞれ適切に処理されるようになっています。
いずれの場合も、新しい状態が返されることに注意してください。

しかし、この関数の書き方は奇妙に見えるかもしれません。もう少し詳しく見てみましょう。

まず、`createCalculate` は電卓関数そのものではなく、別の関数を**返す**関数であることがわかります。
返される関数は `Calculate` 型の値です。末尾の `:Calculate` はそれを意味しています。

最初の部分だけを見てみましょう。

```fsharp
let createCalculate (services:CalculatorServices) :Calculate = 
    fun (input,state) -> 
        match input with
            // code
```

関数を返すので、ラムダ式を使って書くことにしました。それが `fun (input,state) -> ` の部分です。

しかし、以下のように内部関数を使って書くこともできます。

```fsharp
let createCalculate (services:CalculatorServices) :Calculate = 
    let innerCalculate (input,state) = 
        match input with
            // code
    innerCalculate // 内部関数を返す
```

どちらのアプローチも基本的には同じ*です。好きな方を選んでください！

<sub>* ただし、パフォーマンスに違いがあるかもしれません。</sub>

## サービスの依存性注入

`createCalculate` は単に関数を返すだけでなく、`services` パラメータも受け取ります。
このパラメータは、サービスの「依存性注入」を行うために使用されます。

つまり、サービスは `createCalculate` 関数自体でのみ使用され、返される `Calculate` 型の関数では見えません。

アプリケーションのすべてのコンポーネントを組み立てる「メイン」コードまたは「ブートストラップ」コードは、次のようになります。

```fsharp
// サービスを作成する
let services = CalculatorServices.createServices()

// サービスを「ファクトリー」メソッドに注入する
let calculate = CalculatorImplementation.createCalculate services

// 返された "calculate" 関数は Calculate 型であり、
// たとえば UI に渡すことができる

// UI を作成して実行する
let form = new CalculatorUI.CalculatorForm(calculate)
form.Show()
```

## 実装：数字の処理

それでは、計算関数の様々な部分の実装を始めましょう。まずは数字の処理ロジックから始めます。

メイン関数をクリーンに保つために、すべての処理をヘルパー関数 `updateDisplayFromDigit` に委譲しましょう。

```fsharp
let createCalculate (services:CalculatorServices) :Calculate = 
    fun (input,state) -> 
        match input with
        | Digit d ->
            let newState = updateDisplayFromDigit services d state
            newState //return
```

`updateDisplayFromDigit` の結果から `newState` 値を作成し、それを別のステップで返していることに注意してください。 

以下のように、明示的な `newState` 値を使わずに、1 ステップで同じことを行うこともできます。

```fsharp
let createCalculate (services:CalculatorServices) :Calculate = 
    fun (input,state) -> 
        match input with
        | Digit d ->
            updateDisplayFromDigit services d state
```

ひとつのアプローチが常に最適というわけではありません。状況に応じてどちらかを選択します。 

単純な場合は、余分な行を避ける方が良いですが、明示的な戻り値がある方が読みやすい場合もあります。
値の名前は戻り値の型を示唆し、デバッガで監視する必要がある場合に役立ちます。

さて、`updateDisplayFromDigit` を実装しましょう。これはとても簡単です。

* まず、サービス内の `updateDisplayFromDigit` を使用して、実際にディスプレイを更新します。
* 次に、新しいディスプレイから新しい状態を作成して返します。

```fsharp
let updateDisplayFromDigit services digit state =
    let newDisplay = services.updateDisplayFromDigit (digit,state.display)
    let newState = {state with display=newDisplay}
    newState //return
```

## 実装：Clear と Equals の処理

数学演算の実装に進む前に、より単純な `Clear` と `Equals` の処理を見てみましょう。

`Clear` では、提供されている `initState` サービスを使用して状態を初期化します。

`Equals` では、保留中の数学演算があるかどうかを確認します。ある場合は、それを実行してディスプレイを更新し、ない場合は何もしません。
このロジックは、`updateDisplayFromPendingOp` というヘルパー関数に記述します。

`createCalculate` は次のようになります。

```fsharp
let createCalculate (services:CalculatorServices) :Calculate = 
    fun (input,state) -> 
        match input with
        | Digit d -> // 上記と同じ
        | Op op -> // 後で実装
        | Action Clear ->
            let newState = services.initState()
            newState //return
        | Action Equals ->
            let newState = updateDisplayFromPendingOp services state
            newState //return
```

次に、`updateDisplayFromPendingOp` についてです。数分間考えて、ディスプレイを更新するための次のアルゴリズムを考え出しました。

* まず、保留中の演算があるかどうかを確認します。ない場合は、何もしません。
* 次に、ディスプレイから現在の数値を取得しようとします。取得できない場合は、何もしません。
* 次に、保留中の数値とディスプレイから取得した現在の数値を使用して演算を実行します。エラーが発生した場合は、何もしません。
* 最後に、結果でディスプレイを更新し、新しい状態を返します。 
* 新しい状態では、保留中の演算が処理されたため、`None` に設定されます。

このロジックを命令型スタイルのコードで記述すると、次のようになります。

```fsharp
// updateDisplayFromPendingOp の最初のバージョン
// * 非常に命令型で醜い
let updateDisplayFromPendingOp services state =
    if state.pendingOp.IsSome then
        let op,pendingNumber = state.pendingOp.Value
        let currentNumberOpt = services.getDisplayNumber state.display
        if currentNumberOpt.IsSome then
            let currentNumber = currentNumberOpt.Value 
            let result = services.doMathOperation (op,pendingNumber,currentNumber)
            match result with
            | Success resultNumber ->
                let newDisplay = services.setDisplayNumber resultNumber 
                let newState = {display=newDisplay; pendingOp=None}
                newState //return
            | Failure error -> 
                state // 元の状態は変更されない
        else
            state // 元の状態は変更されない
    else
        state // 元の状態は変更されない
```

うわあ！真似しないでください！ 

このコードはアルゴリズムに正確に従っていますが、本当に醜く、エラーが発生しやすいです（オプション型に `.Value` を使用するのはコードの臭いです）。

プラス面としては、「サービス」を多用することで、実際の実装の詳細から分離できたことです。

では、これをより関数型に書き直すにはどうすればよいでしょうか？

<a id="bind"></a>

## `bind` の活用

ポイントは、「もし何かが存在すれば、その値に対して処理を行う」というパターンが、
まさに[こちら](../posts/computation-expressions-continuations.html)と[こちら](https://fsharpforfunandprofit.com/rop/)で説明されている `bind` パターンと同じであると認識することです。

`bind` パターンを効果的に使用するには、コードを小さなチャンクに分割するのが良いでしょう。

まず、`if state.pendingOp.IsSome then do something` というコードは `Option.bind` で置き換えることができます。

```fsharp
let updateDisplayFromPendingOp services state =
    let result =
        state.pendingOp
        |> Option.bind ???
```

しかし、関数は状態を返さなければならないことを忘れないでください。
`bind` の全体的な結果が `None` の場合、新しい状態は作成されて**いません**。そのため、渡された元の状態を返す必要があります。

これは、組み込みの `defaultArg` 関数を使用して行うことができます。この関数は、オプションに適用されると、オプションの値が存在する場合はその値を返し、`None` の場合は2番目のパラメータを返します。

```fsharp
let updateDisplayFromPendingOp services state =
    let result =
        state.pendingOp
        |> Option.bind ???
    defaultArg result state
```

また、以下のように結果を直接 `defaultArg` にパイプすることで、少し整理することもできます。

```fsharp
let updateDisplayFromPendingOp services state =
    state.pendingOp
    |> Option.bind ???
    |> defaultArg <| state
```

`state` に対する逆パイプは確かに奇妙に見えますね。慣れるまで少し時間がかかるかもしれません。

さて、次に進みましょう！ `bind` のパラメータはどうすれば良いでしょうか？ これが呼び出されたときは、`pendingOp` が存在することがわかっているので、次のように、それらのパラメータを使ってラムダ式を書くことができます。

```fsharp
let result = 
    state.pendingOp
    |> Option.bind (fun (op,pendingNumber) ->
        let currentNumberOpt = services.getDisplayNumber state.display
        // code
        )
```

あるいは、代わりにローカルヘルパー関数を作成し、それを次のように `bind` に接続することもできます。

```fsharp
let executeOp (op,pendingNumber) = 
    let currentNumberOpt = services.getDisplayNumber state.display
    /// etc

let result = 
    state.pendingOp
    |> Option.bind executeOp 
```

個人的には、ロジックが複雑な場合は2番目のアプローチを好んでいます。なぜなら、`bind` をチェーン状に繋げていく処理をシンプルに記述できるからです。
具体的には、コードを以下のように書くようにしています。

```fsharp
let doSomething input = output option を返す
let doSomethingElse input = output option を返す
let doAThirdThing input = output option を返す

state.pendingOp
|> Option.bind doSomething
|> Option.bind doSomethingElse
|> Option.bind doAThirdThing
```

このアプローチでは、各ヘルパー関数は入力としてオプション以外の値を受け取りますが、常に *オプション* を出力する必要があることに注意してください。

## bind の実践的な使用

保留中の演算を取得できたら、次は加算（またはその他の演算）を実行するために、ディスプレイから現在の数値を取得します。

あまり複雑なロジックは含めずに、ヘルパー関数 (`getCurrentNumber`) はシンプルに保ちたいと思います。

* 入力はペア `(op,pendingNumber)` です
* 出力は、`currentNumber` が `Some` の場合はトリプル `(op,pendingNumber,currentNumber)`、そうでない場合は `None` です。

言い換えれば、`getCurrentNumber` のシグネチャは `pair -> triple option` になるので、`Option.bind` 関数で使用できることが保証されます。

ペアをトリプルに変換するにはどうすればよいでしょうか？これは、`Option.map` を使用して `currentNumber` オプションをトリプルオプションに変換するだけで行うことができます。
`currentNumber` が `Some` の場合、`map` の出力は `Some triple` になります。
一方、`currentNumber` が `None` の場合、`map` の出力も `None` になります。

```fsharp
let getCurrentNumber (op,pendingNumber) = 
    let currentNumberOpt = services.getDisplayNumber state.display
    currentNumberOpt 
    |> Option.map (fun currentNumber -> (op,pendingNumber,currentNumber))

let result = 
    state.pendingOp
    |> Option.bind getCurrentNumber
    |> Option.bind ???
```

パイプを使用して `getCurrentNumber` をより慣用的に書き直すことができます。

```fsharp
let getCurrentNumber (op,pendingNumber) = 
    state.display
    |> services.getDisplayNumber 
    |> Option.map (fun currentNumber -> (op,pendingNumber,currentNumber))
```

有効な値を持つトリプルができたので、数学演算用のヘルパー関数を書くために必要なものはすべて揃いました。

* トリプルを入力として受け取ります（`getCurrentNumber` の出力）
* 数学演算を実行します
* `Success/Failure` の結果をパターンマッチングし、該当する場合は新しい状態を出力します。

```fsharp
let doMathOp (op,pendingNumber,currentNumber) = 
    let result = services.doMathOperation (op,pendingNumber,currentNumber)
    match result with
    | Success resultNumber ->
        let newDisplay = services.setDisplayNumber resultNumber 
        let newState = {display=newDisplay; pendingOp=None}
        Some newState // 何かを返す
    | Failure error -> 
        None // 失敗
```

ネストされた `if` を持つ以前のバージョンとは異なり、このバージョンは成功時に `Some` を返し、失敗時に `None` を返すことに注意してください。

## エラーの表示

`Failure` ケースのコードを書いている時に、あることに気が付きました。
失敗した場合、何も表示せずにディスプレイをそのままにしています。エラーか何かを表示するべきではないでしょうか？

見落としていた要件を見つけてしまいました！ こういうことがあるので、私はできるだけ早く設計の実装を作成するのが好きなのです。
あらゆるケースを処理する実際のコードを書くと、必ず「このケースではどうなるのだろう？」という疑問が湧いてきます。

では、この新しい要件をどのように実装すればよいでしょうか？

これを行うには、`MathOperationError` を受け取り、`CalculatorDisplay` を生成する新しい「サービス」が必要です。

```fsharp
type SetDisplayError = MathOperationError -> CalculatorDisplay 
```

また、`CalculatorServices` 構造体にも追加する必要があります。

```fsharp
type CalculatorServices = {
    // 以前と同じ
    setDisplayNumber: SetDisplayNumber 
    setDisplayError: SetDisplayError 
    initState: InitState 
    }
```

`doMathOp` は、新しいサービスを使用するように変更できます。`Success` ケースと `Failure` ケースの両方で新しいディスプレイが生成され、それが新しい状態にラップされます。

```fsharp
let doMathOp (op,pendingNumber,currentNumber) = 
    let result = services.doMathOperation (op,pendingNumber,currentNumber)
    let newDisplay = 
        match result with
        | Success resultNumber ->
            services.setDisplayNumber resultNumber 
        | Failure error -> 
            services.setDisplayError error
    let newState = {display=newDisplay;pendingOp=None}
    Some newState // 何かを返す
```

結果パイプラインで `Option.bind` を使い続けられるように、結果に `Some` を残しておきます*。

<sub>* 代替案としては、`Some` を返さずに、結果パイプラインで `Option.map` を使用する方法があります。</sub>

すべてをまとめると、`updateDisplayFromPendingOp` の最終バージョンは次のようになります。
`defaultArg` をパイプに適したものにする `ifNone` ヘルパーも追加しました。

```fsharp
// defaultArg をパイプに適したものにするヘルパー
let ifNone defaultValue input = 
    // パラメータを逆にするだけ！
    defaultArg input defaultValue 

// updateDisplayFromPendingOp の3番目のバージョン
// * Failure ケースでディスプレイにエラーを表示するように更新
// * 不自然な defaultArg 構文を置き換え
let updateDisplayFromPendingOp services state =
    // CurrentNumber を抽出するヘルパー
    let getCurrentNumber (op,pendingNumber) = 
        state.display
        |> services.getDisplayNumber 
        |> Option.map (fun currentNumber -> (op,pendingNumber,currentNumber))

    // 数学演算を実行するヘルパー
    let doMathOp (op,pendingNumber,currentNumber) = 
        let result = services.doMathOperation (op,pendingNumber,currentNumber)
        let newDisplay = 
            match result with
            | Success resultNumber ->
                services.setDisplayNumber resultNumber 
            | Failure error -> 
                services.setDisplayError error
        let newState = {display=newDisplay;pendingOp=None}
        Some newState // 何かを返す

    // すべてのヘルパーを接続する
    state.pendingOp
    |> Option.bind getCurrentNumber
    |> Option.bind doMathOp 
    |> ifNone state // 何か失敗した場合は元の状態を返す
```

## `bind` の代わりに "maybe" コンピュテーション式を使用する

これまで、`bind` を直接使ってきました。これで `if/else` の入れ子をなくすことができました。

F# では、[コンピュテーション式](../posts/computation-expressions-intro.html)を使うことで、複雑な処理を別の方法で隠すことができます。

今回はオプション型を使うので、オプション型をきれいに処理できる "maybe" コンピュテーション式を作れます。
(他の型を使う場合は、型ごとに別のコンピュテーション式が必要です)

定義はたったの4行です！
```fsharp
type MaybeBuilder() =
    member this.Bind(x, f) = Option.bind f x
    member this.Return(x) = Some x

let maybe = new MaybeBuilder()
```

このコンピュテーション式を使用すると、`bind` の代わりに `maybe` を使用できるようになり、コードは次のようになります。

```fsharp
let doSomething input = output option を返す
let doSomethingElse input = output option を返す
let doAThirdThing input = output option を返す

let finalResult = maybe {
    let! result1 = doSomething
    let! result2 = doSomethingElse result1
    let! result3 = doAThirdThing result2
    return result3
    }
```

今回のケースでは、`updateDisplayFromPendingOp` のさらに別のバージョン（4つ目です！）を書くことができます。

```fsharp
// updateDisplayFromPendingOp の4番目のバージョン
// * "maybe" コンピュテーション式を使用するように変更
let updateDisplayFromPendingOp services state =

    // 数学演算を実行するヘルパー
    let doMathOp (op,pendingNumber,currentNumber) = 
        let result = services.doMathOperation (op,pendingNumber,currentNumber)
        let newDisplay = 
            match result with
            | Success resultNumber ->
                services.setDisplayNumber resultNumber 
            | Failure error -> 
                services.setDisplayError error
        {display=newDisplay;pendingOp=None}
        
    // 2つのオプションを取得して組み合わせる
    let newState = maybe {
        let! (op,pendingNumber) = state.pendingOp
        let! currentNumber = services.getDisplayNumber state.display
        return doMathOp (op,pendingNumber,currentNumber)
        }
    newState |> ifNone state
```

*この* 実装では、`services.getDisplayNumber` を直接呼び出すことができるので、`getCurrentNumber` ヘルパーは不要になりました。

では、これらの変種のうち、私はどれが好みでしょうか？

それは状況によります。

* [鉄道指向プログラミング](https://fsharpforfunandprofit.com/rop/) アプローチのように、「パイプライン」の感覚が非常に強い場合は、明示的な `bind` を使用することを好みます。
* 一方、さまざまな場所からオプションを取得し、それらをさまざまな方法で組み合わせたい場合は、`maybe` コンピュテーション式の方が簡単です。

したがって、この場合は、`maybe` を使用した最後の実装を選択します。

## 実装：数学演算の処理

これで、数学演算ケースの実装を行う準備が整いました。

まず、保留中の演算がある場合、`Equals` ケースと同様に、結果がディスプレイに表示されます。
しかし、*さらに*、新しい保留中の演算を状態にプッシュする必要があります。

数学演算ケースでは、*2つ*の状態変換があり、`createCalculate` は次のようになります。

```fsharp
let createCalculate (services:CalculatorServices) :Calculate = 
    fun (input,state) -> 
        match input with
        | Digit d -> // 上記と同じ
        | Op op ->
            let newState1 = updateDisplayFromPendingOp services state
            let newState2 = addPendingMathOp services op newState1 
            newState2 //return
```

`updateDisplayFromPendingOp` は既に上で定義しました。
したがって、演算を状態にプッシュするヘルパー関数として `addPendingMathOp` が必要です。

`addPendingMathOp` のアルゴリズムは次のとおりです。

* ディスプレイから現在の数値を取得しようとします。取得できない場合は、何もしません。
* 演算と現在の数値で状態を更新します。

醜いバージョンは次のとおりです。

```fsharp
// addPendingMathOp の最初のバージョン
// * 非常に命令型で醜い
let addPendingMathOp services op state = 
    let currentNumberOpt = services.getDisplayNumber state.display
    if currentNumberOpt.IsSome then 
        let currentNumber = currentNumberOpt.Value 
        let pendingOp = Some (op,currentNumber)
        let newState = {state with pendingOp=pendingOp}
        newState //return
    else                
        state // 元の状態は変更されない
```

ここでも、`updateDisplayFromPendingOp` で使用したのと同じ手法を使用して、これをより関数型にすることができます。

`Option.map` と `newStateWithPending` ヘルパー関数を使用した、より慣用的なバージョンは次のとおりです。

```fsharp
// addPendingMathOp の2番目のバージョン
// * "map" とヘルパー関数を使用
let addPendingMathOp services op state = 
    let newStateWithPending currentNumber =
        let pendingOp = Some (op,currentNumber)
        {state with pendingOp=pendingOp}
        
    state.display
    |> services.getDisplayNumber 
    |> Option.map newStateWithPending 
    |> ifNone state
```

そして、`maybe` を使用したバージョンは次のとおりです。

```fsharp
// addPendingMathOp の3番目のバージョン
// * "maybe" を使用
let addPendingMathOp services op state = 
    maybe {            
        let! currentNumber = 
            state.display |> services.getDisplayNumber 
        let pendingOp = Some (op,currentNumber)
        return {state with pendingOp=pendingOp}
        }
    |> ifNone state // 何か失敗した場合は元の状態を返す
```

前と同じように、おそらく `maybe` を使用した最後の実装を選択します。しかし、`Option.map` を使用したバージョンも問題ありません。

## 実装：レビュー

これで実装部分は完了です。コードをレビューしましょう。

```fsharp
let updateDisplayFromDigit services digit state =
    let newDisplay = services.updateDisplayFromDigit (digit,state.display)
    let newState = {state with display=newDisplay}
    newState //return

let updateDisplayFromPendingOp services state =

    // 数学演算を実行するヘルパー
    let doMathOp (op,pendingNumber,currentNumber) = 
        let result = services.doMathOperation (op,pendingNumber,currentNumber)
        let newDisplay = 
            match result with
            | Success resultNumber ->
                services.setDisplayNumber resultNumber 
            | Failure error -> 
                services.setDisplayError error
        {display=newDisplay;pendingOp=None}
        
    // 2つのオプションを取得して組み合わせる
    let newState = maybe {
        let! (op,pendingNumber) = state.pendingOp
        let! currentNumber = services.getDisplayNumber state.display
        return doMathOp (op,pendingNumber,currentNumber)
        }
    newState |> ifNone state

let addPendingMathOp services op state = 
    maybe {            
        let! currentNumber = 
            state.display |> services.getDisplayNumber 
        let pendingOp = Some (op,currentNumber)
        return {state with pendingOp=pendingOp}
        }
    |> ifNone state // 何か失敗した場合は元の状態を返す

let createCalculate (services:CalculatorServices) :Calculate = 
    fun (input,state) -> 
        match input with
        | Digit d ->
            let newState = updateDisplayFromDigit services d state
            newState //return
        | Op op ->
            let newState1 = updateDisplayFromPendingOp services state
            let newState2 = addPendingMathOp services op newState1 
            newState2 //return
        | Action Clear ->
            let newState = services.initState()
            newState //return
        | Action Equals ->
            let newState = updateDisplayFromPendingOp services state
            newState //return
```

悪くないですね。実装全体で60行未満のコードです。

## まとめ

実装を作成することで、設計が合理的であることを証明しました。さらに、見落としていた要件も見つかりました。

[次の投稿](../posts/calculator-complete-v1.html)では、サービスとユーザーインターフェースを実装して、完全なアプリケーションを作成します。

*この投稿のコードは、GitHub のこの[gist](https://gist.github.com/swlaschin/0e954cbdc383d1f5d9d3#file-calculator_implementation-fsx) で入手できます。*