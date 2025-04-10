---
layout: post
title: "電卓のウォークスルー: パート 3"
description: "サービスとユーザーインターフェースの追加、そして災難への対処"
categories: ["実践例"]
seriesId: "注釈付きウォークスルー"
seriesOrder: 3
---

この記事では、シンプルな電卓アプリの開発を続けていきます。

[最初の記事](../posts/calculator-design.html)では、型のみを使用して（UML図は使用せず！）、設計の最初のドラフトを完成させました。
そして、[前回の記事](../posts/calculator-implementation.html)では、設計に基づいた初期実装を作成し、その過程で不足している要件を明らかにしました。

今回は、残りのコンポーネントを構築し、それらを組み合わせて完全なアプリケーションにする段階です。

## サービスの作成

実装はできましたが、その実装はいくつかのサービスに依存しており、まだサービスを作成していません。

しかし実際には、この部分は非常に簡単で単純です。
ドメインで定義された型によって制約が課せられるため、コードの書き方は実質的に1つしかありません。

すべてのコードを一度に（以下に）示し、後でいくつかのコメントを追加します。

```fsharp
// ================================================
// CalculatorConfigurationの実装
// ================================================          
module CalculatorConfiguration =

    // 設定オプションを格納するレコード
    // （例：ファイルまたは環境からロードされたもの）
    type Configuration = {
        decimalSeparator : string  // 小数点記号
        divideByZeroMsg : string  // ゼロ除算時のメッセージ
        maxDisplayLength: int     // 最大表示桁数
        }

    let loadConfig() = {
        decimalSeparator = 
            System.Globalization.CultureInfo.CurrentCulture.NumberFormat.CurrencyDecimalSeparator  // 現在のカルチャの小数点記号を取得
        divideByZeroMsg = "ERR-DIV0"   // ゼロ除算時のメッセージ
        maxDisplayLength = 10          // 最大表示桁数
        }
        
// ================================================
// CalculatorServicesの実装
// ================================================          
module CalculatorServices =
    open CalculatorDomain
    open CalculatorConfiguration

    let updateDisplayFromDigit (config:Configuration) :UpdateDisplayFromDigit = 
        fun (digit, display) ->

        // displayに追加する文字を決定する
        let appendCh= 
            match digit with
            | Zero -> 
                // 先頭に0は1つだけ許可する
                if display="0" then "" else "0"  // displayが"0"の場合は""、それ以外の場合は"0"
            | One -> "1"
            | Two -> "2"
            | Three-> "3"
            | Four -> "4"
            | Five -> "5"
            | Six-> "6"
            | Seven-> "7"
            | Eight-> "8"
            | Nine-> "9"
            | DecimalSeparator -> 
                if display="" then 
                    // 空のdisplayの場合は特別に処理する
                    "0" + config.decimalSeparator   // "0"と小数点記号を連結する
                else if display.Contains(config.decimalSeparator) then 
                    // 小数点は2つ許可しない
                    ""   // 何も追加しない
                else 
                    config.decimalSeparator  // 小数点記号を追加する
        
        // 桁数が多すぎる場合は新しい入力を無視する
        if (display.Length > config.maxDisplayLength) then
            display // 新しい入力を無視する
        else
            // 新しい文字を追加する
            display + appendCh

    let getDisplayNumber :GetDisplayNumber = fun display ->
        match System.Double.TryParse display with  // displayをdouble型に変換できるか試す
        | true, d -> Some d  // 変換できた場合はSome dを返す
        | false, _ -> None    // 変換できなかった場合はNoneを返す

    let setDisplayNumber :SetDisplayNumber = fun f ->
        sprintf "%g" f  // fを文字列に変換する

    let setDisplayError divideByZeroMsg :SetDisplayError = fun f ->
        match f with
        | DivideByZero -> divideByZeroMsg  // ゼロ除算の場合はdivideByZeroMsgを返す

    let doMathOperation  :DoMathOperation = fun (op,f1,f2) ->
        match op with
        | Add -> Success (f1 + f2)      // 加算
        | Subtract -> Success (f1 - f2) // 減算
        | Multiply -> Success (f1 * f2) // 乗算
        | Divide -> 
            try
                Success (f1 / f2)      // 除算（成功）
            with
            | :? System.DivideByZeroException ->   // ゼロ除算例外が発生した場合
                Failure DivideByZero              // ゼロ除算エラー

    let initState :InitState = fun () -> 
        {
        display=""          // displayを空にする
        pendingOp = None    // 保留中の演算子をNoneにする
        }

    let createServices (config:Configuration) = {
        updateDisplayFromDigit = updateDisplayFromDigit config  // updateDisplayFromDigitを設定
        doMathOperation = doMathOperation                      // doMathOperationを設定
        getDisplayNumber = getDisplayNumber                    // getDisplayNumberを設定
        setDisplayNumber = setDisplayNumber                      // setDisplayNumberを設定
        setDisplayError = setDisplayError (config.divideByZeroMsg)  // setDisplayErrorを設定
        initState = initState                                  // initStateを設定
        }
```

## いくつかのコメント

* 小数点記号など、サービスをパラメータ化するのに使用されるプロパティを格納する構成レコードを作成しました。
* 構成レコードは `createServices` 関数に渡され、`createServices` 関数はそれを必要とするサービスに構成を渡します。
* すべての関数は、`UpdateDisplayFromDigit` や `DoMathOperation` など、設計で定義された型のいずれかを返すという同じアプローチを使用しています。
* 除算の例外をトラップしたり、複数の小数点が追加されるのを防いだりするなど、注意すべきエッジケースはわずかです。


## ユーザーインターフェースの作成

ユーザーインターフェースには、WPFやWebベースのアプローチではなく、WinFormsを使用します。これはシンプルで、WindowsだけでなくMono/Xamarinでも動作するはずです。
また、他のUIフレームワークにも簡単に移植できるはずです。

UI開発でよくあることですが、私はこのプロセスに他のどの部分よりも多くの時間を費やしました！
ここでは、苦痛を伴う反復作業のすべてを省略し、最終バージョンに直接進みます。

約200行のコードなので、すべては表示しません（[gist](https://gist.github.com/swlaschin/0e954cbdc383d1f5d9d3#file-calculator_v1-fsx)で見ることができます）が、いくつか highlights を紹介します。

```fsharp
module CalculatorUI =

    open CalculatorDomain

    type CalculatorForm(initState:InitState, calculate:Calculate) as this = 
        inherit Form()

        // コンストラクター前の初期化
        let mutable state = initState()  // 状態を初期化
        let mutable setDisplayedText = 
            fun text -> () // 何もしない（デフォルト実装）
```

`CalculatorForm` は、いつものように `Form` のサブクラスです。

コンストラクターには2つのパラメータがあります。
1つは空の状態を作成する関数 `initState` で、もう1つは入力に基づいて状態を変換する関数 `calculate` です。
言い換えれば、ここでは標準的なコンストラクターベースの依存性注入を使用しています。

ミュータブルフィールドが2つあります（衝撃的！）。

1つは状態自体です。明らかに、ボタンが押されるたびに状態は変更されます。

2つ目は `setDisplayedText` という関数です。これは何のためのものでしょうか？

状態が変化した後、テキストを表示するコントロール（Label）を更新する必要があります。

これを行う標準的な方法は、ラベルコントロールをフォームのフィールドにすることです。

```fsharp
type CalculatorForm(initState:InitState, calculate:Calculate) as this = 
    inherit Form()

    let displayControl :Label = null  // ラベルコントロールのフィールド
```

そして、フォームが初期化されたときに、実際の値に設定します。

```fsharp
member this.CreateDisplayLabel() = 
    let display = new Label(Text="",Size=displaySize,Location=getPos(0,0))
    display.TextAlign <- ContentAlignment.MiddleRight
    display.BackColor <- Color.White
    this.Controls.Add(display)

    // 従来のスタイル - フォームが初期化されたときにフィールドを設定する
    displayControl <- display
```

しかし、これには、初期化される前にラベルコントロールにアクセスしようとして、ヌル参照例外が発生する可能性があるという問題があります。
また、誰でもどこからでもアクセスできる「グローバル」フィールドを持つよりも、目的の動作に焦点を当てたいと思います。

関数を使用することで、(a) 実際のコントロールへのアクセスをカプセル化し、(b) null参照の可能性を回避できます。

ミュータブル関数は、安全なデフォルト実装（`fun text -> ()`）で始まり、
ラベルコントロールが作成されたときに *新しい* 実装に変更されます。

```fsharp
member this.CreateDisplayLabel() = 
    let display = new Label(Text="",Size=displaySize,Location=getPos(0,0))
    this.Controls.Add(display)

    // テキストを設定する関数を更新する
    setDisplayedText <-
        (fun text -> display.Text <- text)
```


## ボタンの作成

ボタンはグリッド状に配置されているため、グリッド上の論理的な（行、列）から物理的な位置を取得するヘルパー関数 `getPos(row,col)` を作成しました。

ボタンを作成する例を次に示します。

```fsharp
member this.CreateButtons() = 
    let sevenButton = new Button(Text="7",Size=buttonSize,Location=getPos(1,0),BackColor=DigitButtonColor)  // 7のボタンを作成
    sevenButton |> addDigitButton Seven  // addDigitButton関数でSevenと関連付ける

    let eightButton = new Button(Text="8",Size=buttonSize,Location=getPos(1,1),BackColor=DigitButtonColor)  // 8のボタンを作成
    eightButton |> addDigitButton Eight  // addDigitButton関数でEightと関連付ける

    let nineButton = new Button(Text="9",Size=buttonSize,Location=getPos(1,2),BackColor=DigitButtonColor)  // 9のボタンを作成
    nineButton |> addDigitButton Nine  // addDigitButton関数でNineと関連付ける

    let clearButton = new Button(Text="C",Size=buttonSize,Location=getPos(1,3),BackColor=DangerButtonColor)  // クリアボタンを作成
    clearButton |> addActionButton Clear  // addActionButton関数でClearと関連付ける

    let addButton = new Button(Text="+",Size=doubleHeightSize,Location=getPos(1,4),BackColor=OpButtonColor)  // 加算ボタンを作成
    addButton |> addOpButton Add  // addOpButton関数でAddと関連付ける
```

すべての数字ボタンとすべての算術演算ボタンは同じ動作をするため、汎用的にイベントハンドラを設定するヘルパー関数を作成しました。

```fsharp
let addDigitButton digit (button:Button) =
    button.Click.AddHandler(EventHandler(fun _ _ -> handleDigit digit))  // クリックイベントハンドラを追加
    this.Controls.Add(button)  // コントロールに追加

let addOpButton op (button:Button) =
    button.Click.AddHandler(EventHandler(fun _ _ -> handleOp op))  // クリックイベントハンドラを追加
    this.Controls.Add(button)  // コントロールに追加
```

キーボードのサポートも追加しました。

```fsharp
member this.KeyPressHandler(e:KeyPressEventArgs) =
    match e.KeyChar with
    | '0' -> handleDigit Zero  // '0'キーを押すとhandleDigit Zeroを実行
    | '1' -> handleDigit One  // '1'キーを押すとhandleDigit Oneを実行
    | '2' -> handleDigit Two  // '2'キーを押すとhandleDigit Twoを実行
    | '.' | ',' -> handleDigit DecimalSeparator  // '.'または','キーを押すとhandleDigit DecimalSeparatorを実行
    | '+' -> handleOp Add  // '+'キーを押すとhandleOp Addを実行
    // etc
```

ボタンのクリックとキーボードの押下は、最終的に計算を実行するキー関数 `handleInput` にルーティングされます。

```fsharp
let handleInput input =
     let newState = calculate(input,state)  // 計算を実行
     state <- newState                     // 状態を更新
     setDisplayedText state.display       // 表示を更新
    
let handleDigit digit =
     Digit digit |> handleInput   // 数字入力をhandleInputに渡す

let handleOp op =
     Op op |> handleInput       // 演算子入力をhandleInputに渡す
```

ご覧のとおり、`handleInput` の実装は些細なものです。
注入された計算関数を呼び出し、ミュータブル状態に結果を設定し、表示を更新します。

これで完成です ―― 完全な電卓です！

では、試してみましょう。この[gist](https://gist.github.com/swlaschin/0e954cbdc383d1f5d9d3#file-calculator_v1-fsx)からコードを取得し、F#スクリプトとして実行してみてください。

## 災難発生！

簡単なテストから始めましょう。「1」「+」「2」「=」と入力してみてください。どうなると思いますか？

あなたの予想はわかりませんが、電卓の表示に「12」と表示されることは *想定外* ではないでしょうか？

何が起こっているのでしょうか？少し実験してみると、非常に重要なことを忘れていたことに気づきます。
「+」または「=」の演算が行われると、後続の数字は現在のバッファに *追加* されるのではなく、新しいバッファを開始する必要があるのです。
なんてこった！致命的なバグが発生しました！

もう一度思い出してください。「コンパイルできれば、おそらく動作する」と言った愚か者は誰でしたか？*

<sub>* 実は、その愚か者は私です（他にもたくさんいますが）。</sub>

では、何が問題だったのでしょうか？

コードはコンパイルされましたが、期待どおりに動作しませんでした。コードにバグがあったからではなく、*設計に欠陥があった* からです。

言い換えれば、型ファースト設計プロセスで作成された型を使用しているため、記述したコードが設計の正しい実装であるという高い確信は *あります*。
しかし、要件と設計が間違っていれば、どんなに正しいコードを書いてもそれを修正することはできません。

要件については次の記事で再検討しますが、とりあえず、問題を解決するためのパッチを適用することはできるでしょうか？

## バグの修正

新しい数字のセットを開始する場合と、既存の数字に単に追加する場合について考えてみましょう。
上で述べたように、算術演算または「=」によってリセットが強制されます。

では、これらの操作が発生したときにフラグを設定するのはどうでしょうか？
フラグが設定されている場合は、新しい表示バッファを開始し、その後、フラグを解除して、以前のように文字が追加されるようにします。

コードにどのような変更を加える必要があるでしょうか？

まず、フラグをどこかに格納する必要があります。もちろん、`CalculatorState` に格納します！

```fsharp
type CalculatorState = {
    display: CalculatorDisplay  // 表示
    pendingOp: (CalculatorMathOp * Number) option  // 保留中の演算子
    allowAppend: bool  // 追加を許可するかどうか
    }
```

（*これは今のところ良い解決策のように思えるかもしれませんが、このようなフラグを使用することは実際には設計上の臭いです。
次の記事では、フラグを使用しない[別のアプローチ](../posts/designing-with-types-representing-states.html#replace-flags)を使用します*）

## 実装の修正

この変更により、`CalculatorImplementation` コードをコンパイルすると、新しい状態が作成されるすべての場所でエラーが発生するようになりました。

実は、これがF#を使う上で気に入っている点です。
レコードに新しいフィールドを追加するような変更は、見落とされる可能性のあるものではなく、破壊的な変更になります。

コードに次の調整を行います。

* `updateDisplayFromDigit` では、`allowAppend` をtrueに設定した新しい状態を返します。
* `updateDisplayFromPendingOp` と `addPendingMathOp` では、`allowAppend` をfalseに設定した新しい状態を返します。

## サービスの修正

ほとんどのサービスは問題ありません。修正が必要なサービスは `initState` のみで、開始時に `allowAppend` がtrueになるように調整する必要があります。

```fsharp
let initState :InitState = fun () -> 
    {
    display=""  // displayを空にする
    pendingOp = None  // 保留中の演算子をNoneにする
    allowAppend = true  // 追加を許可する
    }
```

## ユーザーインターフェースの修正

`CalculatorForm` クラスは、変更なしで動作し続けます。

しかし、この変更は、`CalculatorForm` が `CalculatorDisplay` 型の内部構造についてどれだけ知っているべきかという疑問を提起します。

`CalculatorDisplay` は透過的であるべきでしょうか？その場合、内部構造を変更するたびにフォームが壊れる可能性があります。

それとも、`CalculatorDisplay` は不透明な型であるべきでしょうか？
その場合、フォームが表示できるように、`CalculatorDisplay` 型からバッファを抽出する別の「サービス」を追加する必要があります。

今のところ、変更があればフォームを調整すればよいと考えています。
しかし、より大規模なプロジェクトや長期的なプロジェクトでは、依存関係を減らそうとする場合、設計の脆弱性を軽減するために、ドメイン型をできるだけ不透明にするでしょう。

## パッチを適用したバージョンのテスト

パッチを適用したバージョンを今すぐ試してみましょう（*パッチを適用したバージョンのコードはこの[gist](https://gist.github.com/swlaschin/0e954cbdc383d1f5d9d3#file-calculator_v1_patched-fsx)から入手できます*）。

今度は動作するでしょうか？

はい。「1」「+」「2」「=」と入力すると、期待どおりに「3」が表示されます。

これで大きなバグが修正されました。ふぅ。

しかし、この実装でいろいろと遊んでみると、他にも<strike>バグ</strike>文書化されていない機能に遭遇するでしょう。

たとえば、

* `1.0 / 0.0` は `Infinity` と表示されます。ゼロ除算エラーはどうなったのでしょうか？
* 演算を通常とは異なる順序で入力すると、奇妙な動作が発生します。たとえば、「2 + + -」と入力すると、ディスプレイに「8」と表示されます！

明らかに、このコードはまだ目的を果たしていません。


## テスト駆動開発はどうでしょうか？

この時点で、あなたは「もしTDDを使っていたら、こんなことは起こらなかっただろうに」と思っているかもしれません。

確かにそうです。私はこのコードをすべて書きましたが、2つの数字を正しく加算できるかどうかを確認するテストを書くことさえしませんでした！

もしテストを書くことから始めて、それを設計の指針にしていたら、きっとこの問題に直面することはなかったでしょう。

この特定の例では、おそらくすぐに問題に気づいたでしょう。
TDDアプローチでは、「1 + 2 = 3」を確認することは、最初に書くテストの1つだったでしょう！
しかしその一方で、このような明白な欠陥については、インタラクティブなテストでも問題が明らかになります。

私が考えるに、テスト駆動開発の利点は次のとおりです。

* 実装だけでなく、コードの *設計* を促進する。
* リファクタリング中にコードが正しく保たれることを保証する。

では、テスト駆動開発によって、見落としていた要件や微妙なエッジケースを発見できるのでしょうか？
残念ながら、必ずしもそうとは言えません。テスト駆動開発が効果を発揮するのは、起こりうるすべてのケースを事前に想定できる場合に限られます。
つまり、TDDは想像力の欠如を補う魔法の杖ではないのです。

そして、もし良い要件があれば、型を設計して[不正な状態を表現できないようにする](../posts/designing-with-types-making-illegal-states-unrepresentable.html)ことができ、
テストで正当性を保証する必要はありません。

私は自動テストに反対しているのではありません。実際、特定の要件を検証するために、特に統合テストや大規模なテストでは、常に自動テストを使用しています。

たとえば、このコードをテストする方法は次のとおりです。

```fsharp
module CalculatorTests =
    open CalculatorDomain
    open System

    let config = CalculatorConfiguration.loadConfig()  // 設定をロード
    let services = CalculatorServices.createServices config  // サービスを作成
    let calculate = CalculatorImplementation.createCalculate services  // 計算関数を作成

    let emptyState = services.initState()  // 空の状態を作成

    /// 入力シーケンスが与えられたら、空の状態から始めて、
    /// 各入力を順番に適用します。最終的な状態が返されます。
    let processInputs inputs = 
        // foldのヘルパー
        let folder state input = 
            calculate(input,state)  // 入力を適用して状態を更新

        inputs 
        |> List.fold folder emptyState  // 入力リストを畳み込み、最終的な状態を取得

    /// 状態に期待される表示値が含まれていることを確認する
    let assertResult testLabel expected state =
        let actual = state.display  // 実際の表示値を取得
        if (expected <> actual) then
            printfn "Test %s failed: expected=%s actual=%s" testLabel expected actual  // テスト失敗
        else
            printfn "Test %s passed" testLabel  // テスト成功

    let ``when I input 1 + 2, I expect 3``() = 
        [Digit One; Op Add; Digit Two; Action Equals]  // 入力シーケンス
        |> processInputs  // 入力を処理
        |> assertResult "1+2=3" "3"  // 結果を確認

    let ``when I input 1 + 2 + 3, I expect 6``() = 
        [Digit One; Op Add; Digit Two; Op Add; Digit Three; Action Equals]  // 入力シーケンス
        |> processInputs  // 入力を処理
        |> assertResult "1+2+3=6" "6"  // 結果を確認

    // テストを実行
    do 
        ``when I input 1 + 2, I expect 3``()
        ``when I input 1 + 2 + 3, I expect 6``() 
```

そしてもちろん、これは[NUnitなど](../posts/low-risk-ways-to-use-fsharp-at-work-3.html)を使用して簡単に適応させることができます。

## どうすればより良い設計を開発できますか？

私は失敗しました！前にも言ったように、*実装自体* は問題ではありませんでした。
型ファースト設計プロセスはうまくいったと思います。本当の問題は、私が性急すぎて、要件をきちんと理解せずに設計に飛び込んでしまったことです。

次回、このようなことが起こらないようにするにはどうすればよいでしょうか？

1つの明白な解決策は、適切なTDDアプローチに切り替えることです。
しかし、私は少し頑固なので、型ファースト設計を続けられるかどうか試してみます。

[次の記事](../posts/calculator-complete-v2.html)では、場当たり的で自信過剰なやり方をやめ、
設計段階でこのような種類のエラーを防ぐ可能性がはるかに高い、より徹底的なプロセスを使用します。

*この記事のコードはGitHubの[このgist（パッチ未適用）](https://gist.github.com/swlaschin/0e954cbdc383d1f5d9d3#file-calculator_v1-fsx)と
[このgist（パッチ適用済み）](https://gist.github.com/swlaschin/0e954cbdc383d1f5d9d3#file-calculator_v1_patched-fsx)で入手できます。*



