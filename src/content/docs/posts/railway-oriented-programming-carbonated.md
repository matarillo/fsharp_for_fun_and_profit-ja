---
layout: post
title: "鉄道指向プログラミング：炭酸化バージョン"
description: "FizzBuzzを実装する3つの方法"
categories: []
---

[鉄道指向プログラミング](../posts/recipe-part2.html)の記事に続いて、同じ手法を[FizzBuzz](http://web.archive.org/web/20110818113955/http://imranontech.com/2007/01/24/using-fizzbuzz-to-find-developers-who-grok-coding/)問題に適用し、
他の実装と比較してみようと思います。

この記事の大部分は、[Dave FayramのFizzBuzzに関する投稿](http://web.archive.org/web/20160307132000/http://dave.fayr.am/posts/2012-10-4-finding-fizzbuzz.html)から直接<s>盗んだ</s>インスピレーションを得たもので、
[raganwald](http://weblog.raganwald.com/2007/01/dont-overthink-fizzbuzz.html)からもいくつかのアイデアを取り入れています。

## FizzBuzz：命令型バージョン

FizzBuzz問題の要件を再確認しましょう。

```text
1から100までの数字を出力するプログラムを書いてください。
* 3の倍数の場合は、数字の代わりに「Fizz」と出力します。
* 5の倍数の場合は「Buzz」と出力します。
* 3と5の両方の倍数の場合は「FizzBuzz」と出力します。
```

以下はF#による基本的な解決策です。

```fsharp
module FizzBuzz_Match = 

    let fizzBuzz i = 
        match i with
        | _ when i % 15 = 0 -> 
            printf "FizzBuzz"
        | _ when i % 3 = 0 -> 
            printf "Fizz"
        | _ when i % 5 = 0 -> 
            printf "Buzz"
        | _ -> 
            printf "%i" i

        printf "; "
   
    // FizzBuzzを実行
    [1..100] |> List.iter fizzBuzz
```

整数`i`を受け取り、`match`と`when`句を使って各種テストを行い、適切な値を出力する`fizzBuzz`関数を定義しました。

シンプルで分かりやすく、簡単なハックには適していますが、この実装にはいくつかの問題があります。

まず、「15」の特別なケースが必要でした。「3」と「5」のケースのコードを再利用できませんでした。
これは、「7」など別のケースを追加したい場合、すべての組み合わせ（つまり「21」、「35」、「105」）に対しても特別なケースを追加する必要があることを意味します。もちろん、さらに数を増やすと、ケースの組み合わせが爆発的に増加します。

次に、マッチングの順序が重要です。「15」のケースがパターンリストの最後にあった場合、コードは正しく実行されますが、要件を満たしていないことになります。
また、新しいケースを追加する必要がある場合、正確性を確保するために、常に最大のものを最初に配置することを忘れないようにしなければなりません。これはまさに、微妙なバグを引き起こす種類のものです。

「3」と「5」のケースのコードを再利用し、「15」のケースを完全に排除する別の実装を試してみましょう。

```fsharp
module FizzBuzz_IfPrime = 

    let fizzBuzz i = 
        let mutable printed = false

        if i % 3 = 0 then
            printed <- true
            printf "Fizz"

        if i % 5 = 0 then
            printed <- true
            printf "Buzz"

        if not printed then
            printf "%i" i
        
        printf "; "
    
    // FizzBuzzを実行
    [1..100] |> List.iter fizzBuzz
```

この実装では、「3」と「5」の両方のケースが使用されるため、「15」の出力値は正しくなります。また、順序を気にする必要もありません（少なくともそれほど気にする必要はありません）。

しかし、これらの分岐はもはや独立していないため、デフォルトケースを処理できるように、いずれかの分岐が使用されたかどうかを追跡する必要があります。
そのため、可変変数が導入されました。F#では可変変数はコードの臭いとされるので、この実装は理想的ではありません。

ただし、このバージョンには、3と5だけでなく、複数の因数をサポートするように簡単にリファクタリングできるという利点があります。

以下は、まさにそれを行ったバージョンです。`fizzBuzz`に「ルール」のリストを渡します。
各ルールは、因数と対応する出力ラベルで構成されています。`fizzBuzz`関数は、これらのルールを順番に処理していきます。

```fsharp
module FizzBuzz_UsingFactorRules = 

    let fizzBuzz rules i  = 
        let mutable printed = false

        for factor,label in rules do
            if i % factor = 0 then
                printed <- true
                printf "%s" label

        if not printed then
            printf "%i" i
        
        printf "; "
    
    // FizzBuzzを実行
    let rules = [ (3,"Fizz"); (5,"Buzz") ]
    [1..100] |> List.iter (fizzBuzz rules)
```

追加の数字を処理したい場合は、ルールのリストに追加するだけです。

```fsharp
module FizzBuzz_UsingFactorRules = 

    // 既存のコードは上記と同じ
    
    let rules2 = [ (3,"Fizz"); (5,"Buzz"); (7,"Baz") ]
    [1..105] |> List.iter (fizzBuzz rules2)
```

まとめると、C#とほぼ同じような非常に命令型の実装を作成しました。柔軟性はありますが、可変変数はコードの臭いの一種です。別の方法はないでしょうか？

## FizzBuzz：パイプラインバージョン

次のバージョンでは、「パイプライン」モデルを使用します。ここでは、データを一連の関数に通して最終結果を得ます。

このデザインでは、「3」のケースを処理する関数、「5」のケースを処理する関数などの関数のパイプラインを想定しています。そして最後に、適切なラベルが出力され、印刷される準備が整います。

以下は、この概念を示す擬似コードです。

```fsharp
data |> handleThreeCase |> handleFiveCase |> handleAllOtherCases |> printResult
```

追加の要件として、パイプラインに副作用がないようにします。これは、中間関数が何も出力してはならないことを意味します。
代わりに、生成されたラベルをパイプの最後まで渡し、その時点で結果を出力する必要があります。

### パイプラインの設計

最初のステップとして、パイプを通して渡されるデータを定義する必要があります。

まず、上記の擬似コードの`handleThreeCase`と呼ばれる最初の関数から始めましょう。その入力と出力は何でしょうか？

明らかに、入力は処理される整数です。しかし、出力は運が良ければ文字列「Fizz」かもしれません。または、運が悪ければ元の整数かもしれません。

次に、2番目の関数`handleFiveCase`の入力について考えてみましょう。これも整数が必要です。
しかし、「15」の場合は、「Fizz」という文字列も必要で、それに「Buzz」を追加できるようにする必要があります。

最後に、`handleAllOtherCases`関数は整数を文字列に変換しますが、これは「Fizz」や「Buzz」がまだ生成されていない場合のみです。

したがって、データ構造には処理中の整数と「これまでのラベル」の両方を含める必要があることは明らかです。

次の疑問は、上流の関数がラベルを作成したかどうかをどのように知るかです？
`handleAllOtherCases`は、何かをする必要があるかどうかを判断するためにこれを知る必要があります。

一つの方法は、空の文字列（または恐ろしいことにnull文字列）を使うことですが、良い方法として`string option`を使いましょう。

そこで、以下が最終的に使用するデータ型です。

```fsharp
type Data = {i:int; label:string option}
```

### パイプラインバージョン1

このデータ構造を使って、`handleThreeCase`と`handleFiveCase`がどのように機能するかを定義できます。

* まず、入力整数`i`が因数で割り切れるかテストします。
* 割り切れる場合、`label`を見ます - `None`の場合、`Some "Fizz"`または`Some "Buzz"`に置き換えます。
* ラベルが既に値を持っている場合、「Buzz」（または他の適切な値）を追加します。
* 入力が因数で割り切れない場合、データを変更せずに渡します。

このデザインに基づいた実装が以下です。「Fizz」と「Buzz」の両方に対応する汎用的な関数で、
[raganwald](https://weblog.raganwald.com/2007/01/dont-overthink-fizzbuzz.html)にちなんで`carbonate` （炭酸化）と呼びます。

```fsharp
let carbonate factor label data = 
    let {i=i; label=labelSoFar} = data
    if i % factor = 0 then
        // 新しいデータレコードを渡す
        let newLabel = 
            match labelSoFar with
            | Some s -> s + label 
            | None -> label 
        {data with label=Some newLabel}
    else
        // 変更されていないデータを渡す
        data
```

`handleAllOtherCases`関数のデザインは少し異なります。

* ラベルを見ます - `None`でない場合、前の関数がラベルを作成したので何もしません。
* しかし、ラベルが`None`の場合、整数の文字列表現に置き換えます。

以下がコードです - これを`labelOrDefault`と呼びます。

```fsharp
let labelOrDefault data = 
    let {i=i; label=labelSoFar} = data
    match labelSoFar with
    | Some s -> s
    | None -> sprintf "%i" i
```

これでコンポーネントが揃ったので、パイプラインを組み立てることができます。

```fsharp
let fizzBuzz i = 
    {i=i; label=None}
    |> carbonate 3 "Fizz"
    |> carbonate 5 "Buzz"
    |> labelOrDefault     // 文字列に変換
    |> printf "%s; "      // 出力
```

最初の関数（`carbonate 3 "Fizz"`）に渡すための初期レコードを`{i=i; label=None}`で作成する必要があることに注意してください。

最後に、すべてのコードをまとめると以下のようになります。

```fsharp
module FizzBuzz_Pipeline_WithRecord = 

    type Data = {i:int; label:string option}

    let carbonate factor label data = 
        let {i=i; label=labelSoFar} = data
        if i % factor = 0 then
            // 新しいデータレコードを渡す
            let newLabel = 
                match labelSoFar with
                | Some s -> s + label 
                | None -> label 
            {data with label=Some newLabel}
        else
            // 変更されていないデータを渡す
            data

    let labelOrDefault data = 
        let {i=i; label=labelSoFar} = data
        match labelSoFar with
        | Some s -> s
        | None -> sprintf "%i" i

    let fizzBuzz i = 
        {i=i; label=None}
        |> carbonate 3 "Fizz"
        |> carbonate 5 "Buzz"
        |> labelOrDefault     // 文字列に変換
        |> printf "%s; "      // 出力

    [1..100] |> List.iter fizzBuzz
```

### パイプラインバージョン2

新しいレコード型の作成はドキュメントの形式として有用ですが、
このような場合、特別なデータ構造を作成するよりもタプルを使用する方が慣用的でしょう。

以下は、タプルを使用した修正版の実装です。

```fsharp
module FizzBuzz_Pipeline_WithTuple = 

    // type Data = int * string option

    let carbonate factor label data = 
        let (i,labelSoFar) = data
        if i % factor = 0 then
            // 新しいデータレコードを渡す
            let newLabel = 
                labelSoFar 
                |> Option.map (fun s -> s + label)
                |> defaultArg <| label 
            (i,Some newLabel)
        else
            // 変更されていないデータを渡す
            data

    let labelOrDefault data = 
        let (i,labelSoFar) = data
        labelSoFar 
        |> defaultArg <| sprintf "%i" i

    let fizzBuzz i = 
        (i,None)   // レコードの代わりにタプルを使用
        |> carbonate 3 "Fizz"
        |> carbonate 5 "Buzz"
        |> labelOrDefault     // 文字列に変換
        |> printf "%s; "      // 出力

    [1..100] |> List.iter fizzBuzz
```

練習として、変更が必要だったすべてのコードを見つけてみてください。

### SomeとNoneの明示的なテストの排除

上記のタプルコードでは、明示的なOptionマッチングコード`match .. Some .. None`を、ビルトインのOption関数である`map`と`defaultArg`に置き換えました。

以下が`carbonate`での変更点です。

```fsharp
// 変更前
let newLabel = 
    match labelSoFar with
    | Some s -> s + label 
    | None -> label 

// 変更後
let newLabel = 
    labelSoFar 
    |> Option.map (fun s -> s + label)
    |> defaultArg <| label 
```

そして`labelOrDefault`での変更点。

```fsharp
// 変更前
match labelSoFar with
| Some s -> s
| None -> sprintf "%i" i

// 変更後
labelSoFar 
|> defaultArg <| sprintf "%i" i
```

`|> defaultArg <|`という奇妙に見えるイディオムについて疑問に思うかもしれません。

optionが`defaultArg`の*最初*のパラメータであり、*2番目*ではないため、通常の部分適用は機能しません。しかし、「双方向」パイピングは機能するため、この奇妙に見えるコードになっています。

以下が意味するところです。

```fsharp
// OK - 通常の使用法
defaultArg myOption defaultValue

// エラー：パイピングが機能しない
myOption |> defaultArg defaultValue

// OK - 双方向パイピングは機能する
myOption |> defaultArg <| defaultValue
```

### パイプラインバージョン3

`carbonate`関数は任意の因数に対して汎用的なので、先ほどの命令型バージョンと同様に、「ルール」をサポートするようにコードを簡単に拡張できます。

しかし、一つの問題点は、「3」と「5」のケースをパイプラインにハードコードしていることです。以下のようになっています。

```fsharp
|> carbonate 3 "Fizz"
|> carbonate 5 "Buzz"
```

どうすれば新しい関数をパイプラインに動的に追加できるでしょうか？

答えは非常にシンプルです。各ルールに対して動的に関数を作成し、それらの関数を合成を使って1つにまとめます。

以下は、それを示すスニペットです。

```fsharp
let allRules = 
    rules
    |> List.map (fun (factor,label) -> carbonate factor label)
    |> List.reduce (>>)
```

各ルールは関数にマップされます。そして関数のリストは`>>`を使って1つの関数に結合されます。

すべてをまとめると、以下の最終的な実装になります。

```fsharp
module FizzBuzz_Pipeline_WithRules = 

    let carbonate factor label data = 
        let (i,labelSoFar) = data
        if i % factor = 0 then
            // 新しいデータレコードを渡す
            let newLabel = 
                labelSoFar 
                |> Option.map (fun s -> s + label)
                |> defaultArg <| label 
            (i,Some newLabel)
        else
            // 変更されていないデータを渡す
            data

    let labelOrDefault data = 
        let (i,labelSoFar) = data
        labelSoFar 
        |> defaultArg <| sprintf "%i" i

    let fizzBuzz rules i = 

        // すべてのルールから単一の関数を作成
        let allRules = 
            rules
            |> List.map (fun (factor,label) -> carbonate factor label)
            |> List.reduce (>>)

        (i,None)   
        |> allRules
        |> labelOrDefault     // 文字列に変換
        |> printf "%s; "      // 出力

    // テスト
    let rules = [ (3,"Fizz"); (5,"Buzz"); (7,"Baz") ]
    [1..105] |> List.iter (fizzBuzz rules)
```

この「パイプライン」バージョンを以前の命令型バージョンと比較すると、デザインがはるかに関数型になっています。
可変変数はなく、最後の`printf`文を除いて副作用もありません。

ただし、`List.reduce`の使用には微妙なバグがあります。それが何か分かりますか？** この問題とその修正については、このページの最後の追伸で説明します。

<sub>** ヒント：空のルールリストを試してみてください。</sub>


## FizzBuzz：鉄道指向バージョン

パイプラインバージョンはFizzBuzzの十分に適切な関数型実装ですが、
念のため、[鉄道指向プログラミング](../posts/recipe-part2.html)の記事で説明した「二軌道」設計を使用できるかどうか見てみましょう。

簡単に思い出すと、「鉄道指向プログラミング」（別名「Either」モナド）では、2つのケースを持つ共用体型を定義します。「成功」と「失敗」で、それぞれ異なる「軌道」を表します。
そして、これらの「二軌道」関数を一連のつなぎ合わせて鉄道を作ります。

実際に使用する関数のほとんどは、「スイッチ」または「ポイント」関数と呼んだものです。入力は*一*軌道ですが、出力は二軌道で、成功ケースと失敗ケースがあります。
これらのスイッチ関数は、「bind」と呼ばれる接着剤関数を使って二軌道関数に変換されます。

以下は、必要な関数の定義を含むモジュールです。

```fsharp
module RailwayCombinatorModule = 

    let (|Success|Failure|) =
        function 
        | Choice1Of2 s -> Success s
        | Choice2Of2 f -> Failure f

    /// 単一の値を二軌道の結果に変換
    let succeed x = Choice1Of2 x

    /// 単一の値を二軌道の結果に変換
    let fail x = Choice2Of2 x

    // 成功関数または失敗関数のいずれかを適用
    let either successFunc failureFunc twoTrackInput =
        match twoTrackInput with
        | Success s -> successFunc s
        | Failure f -> failureFunc f

    // スイッチ関数を二軌道関数に変換
    let bind f = 
        either f fail
```

ここではF#のコアライブラリに組み込まれている`Choice`型を使用しています。しかし、Success/Failure型のように見せるためのヘルパーを作成しました。アクティブパターンと2つのコンストラクタです。

では、FizzBuzzをこれにどう適応させればよいでしょうか？

まず、明白なことから始めましょう。「炭酸化」を成功とし、マッチしない整数を失敗と定義します。

つまり、成功軌道にはラベルが含まれ、失敗軌道には整数が含まれます。

したがって、`carbonate`「スイッチ」関数は次のようになります。

```fsharp
let carbonate factor label i = 
    if i % factor = 0 then
        succeed label
    else
        fail i
```

この実装は、上で議論したパイプライン設計で使用したものと似ていますが、入力がレコードやタプルではなく、単なる整数なのでよりクリーンです。

次に、コンポーネントを接続する必要があります。ロジックは以下のようになります。

* 整数が既に炭酸化されている場合、無視する
* 整数が炭酸化されていない場合、次のスイッチ関数の入力に接続する

以下が実装です。

```fsharp
let connect f = 
    function
    | Success x -> succeed x 
    | Failure i -> f i
```

これを書く別の方法は、ライブラリモジュールで定義した`either`関数を使用することです。

```fsharp
let connect' f = 
    either succeed f
```

これらの実装が全く同じことを行っていることを理解してください！

次に、「二軌道」パイプラインを以下のように作成できます。

```fsharp
let fizzBuzz = 
    carbonate 15 "FizzBuzz"      // 短絡のため15-FizzBuzzルールが必要
    >> connect (carbonate 3 "Fizz")
    >> connect (carbonate 5 "Buzz")
    >> either (printf "%s; ") (printf "%i; ")
```

これは表面的には「一軌道」パイプラインに似ていますが、実際には異なる技法を使用しています。
スイッチは、パイピング（`|>`）ではなく、合成（`>>`）を通じて接続されています。

結果として、`fizzBuzz`関数には整数パラメータがありません - 他の関数を組み合わせて関数を定義しています。どこにもデータはありません。

他にもいくつか変更点があります。

* 「15」のテストを明示的に再導入する必要がありました。これは、成功か失敗の2つの軌道しかないためです。
  「5」のケースが「3」のケースの出力に追加できる「半完成軌道」がありません。
* 前の例の`labelOrDefault`関数が`either`に置き換えられました。成功の場合、文字列が出力されます。失敗の場合、整数が出力されます。

以下が完全な実装です。

```fsharp
module FizzBuzz_RailwayOriented_CarbonationIsSuccess = 

    open RailwayCombinatorModule 

    // 値を炭酸化
    let carbonate factor label i = 
        if i % factor = 0 then
            succeed label
        else
            fail i

    let connect f = 
        function
        | Success x -> succeed x 
        | Failure i -> f i

    let connect' f = 
        either succeed f

    let fizzBuzz = 
        carbonate 15 "FizzBuzz"      // 短絡のため15-FizzBuzzルールが必要
        >> connect (carbonate 3 "Fizz")
        >> connect (carbonate 5 "Buzz")
        >> either (printf "%s; ") (printf "%i; ")

    // テスト
    [1..100] |> List.iter fizzBuzz
```

### 炭酸化を失敗とみなす？

上の例では炭酸化を「成功」と定義しました - 確かに自然なことのように思えます。しかし、鉄道指向プログラミングモデルを思い出すと、
「成功」はデータを次の関数に渡すべきことを意味し、「失敗」は中間の関数をすべてバイパスして直接終点に行くことを意味します。

FizzBuzzの場合、「中間の関数をすべてバイパスする」軌道は炭酸化されたラベルを持つ軌道であり、「次の関数に渡す」軌道は整数を持つ軌道です。

したがって、軌道を逆にすべきです。「失敗」は炭酸化を意味し、「成功」は炭酸化されていないことを意味します。

このようにすることで、独自の`connect`関数を書く代わりに、事前定義された`bind`関数を再利用できます。

以下は軌道を入れ替えたコードです。

```fsharp
module FizzBuzz_RailwayOriented_CarbonationIsFailure = 

    open RailwayCombinatorModule 

    // 値を炭酸化
    let carbonate factor label i = 
        if i % factor = 0 then
            fail label
        else
            succeed i

    let fizzBuzz = 
        carbonate 15 "FizzBuzz"
        >> bind (carbonate 3 "Fizz")
        >> bind (carbonate 5 "Buzz")
        >> either (printf "%i; ") (printf "%s; ") 

    // テスト
    [1..100] |> List.iter fizzBuzz
```

### 結局、2つの軌道とは何なのか？

軌道を簡単に入れ替えられるという事実は、設計に弱点があることを示唆しているかもしれません。適合しないデザインを使おうとしているのでしょうか？

なぜ一方の軌道が「成功」で、もう一方が「失敗」でなければならないのでしょうか？あまり違いがないように見えます。

そこで、二軌道のアイデアは維持しつつ、「成功」と「失敗」のラベルを取り除いてはどうでしょうか。

代わりに、一方の軌道を「炭酸化済み」、もう一方を「未炭酸化」と呼ぶことができます。

これを実現するために、「成功/失敗」の場合と同様に、アクティブパターンとコンストラクタメソッドを定義できます。

```fsharp
let (|Uncarbonated|Carbonated|) =
    function 
    | Choice1Of2 u -> Uncarbonated u
    | Choice2Of2 c -> Carbonated c

/// 単一の値を二軌道の結果に変換
let uncarbonated x = Choice1Of2 x
let carbonated x = Choice2Of2 x
```

ドメイン駆動設計を行う場合、適切な[ユビキタス言語](https://bliki-ja.github.io/UbiquitousLanguage)を使用したコードを書くことは良い習慣です。
適用できない言語ではなく、ドメインに適した言語を使うべきです。

この場合、FizzBuzzが私たちのドメインだとすれば、関数は「成功」や「失敗」ではなく、ドメインに適した用語である`carbonated`と`uncarbonated`を使用できます。

```fsharp
let carbonate factor label i = 
    if i % factor = 0 then
        carbonated label
    else
        uncarbonated i

let connect f = 
    function
    | Uncarbonated i -> f i
    | Carbonated x -> carbonated x 
```

前と同様に、`connect`関数は`either`を使って書き直すこともできます（または、以前のように事前定義された`bind`を使用できます）。

```fsharp
let connect' f = 
    either f carbonated 
```

以下は1つのモジュールにまとめたすべてのコードです。

```fsharp
module FizzBuzz_RailwayOriented_UsingCustomChoice = 

    open RailwayCombinatorModule 

    let (|Uncarbonated|Carbonated|) =
        function 
        | Choice1Of2 u -> Uncarbonated u
        | Choice2Of2 c -> Carbonated c

    /// 単一の値を二軌道の結果に変換
    let uncarbonated x = Choice1Of2 x
    let carbonated x = Choice2Of2 x

    // 値を炭酸化
    let carbonate factor label i = 
        if i % factor = 0 then
            carbonated label
        else
            uncarbonated i

    let connect f = 
        function
        | Uncarbonated i -> f i
        | Carbonated x -> carbonated x 

    let connect' f = 
        either f carbonated 
        
    let fizzBuzz = 
        carbonate 15 "FizzBuzz"
        >> connect (carbonate 3 "Fizz")
        >> connect (carbonate 5 "Buzz")
        >> either (printf "%i; ") (printf "%s; ") 

    // テスト
    [1..100] |> List.iter fizzBuzz
```

### ルールの追加

これまでのバージョンにはいくつかの問題があります。

* 「15」のテストが醜いです。これを取り除いて「3」と「5」のケースを再利用できないでしょうか？
* 「3」と「5」のケースがハードコードされています。これをより動的にできないでしょうか？

実は、一石二鳥でこれらの問題を同時に解決できます。

すべての「スイッチ」関数を*直列*に結合する代わりに、*並列*に「加算」することができます。
[鉄道指向プログラミング](../posts/recipe-part2.html)の記事では、この技法を検証関数の結合に使用しました。
FizzBuzzでは、すべての因数を一度に処理するためにこれを使用します。

コツは、2つの関数を結合するための「追加」または「連結」関数を定義することです。2つの関数をこの方法で追加できれば、続けて好きなだけ追加できます。

では、2つの炭酸化関数があるとして、それらをどのように連結すればよいでしょうか？

以下が可能性のあるケースです。

* 両方が炭酸化された出力を持つ場合、ラベルを新しい炭酸化されたラベルに連結します。
* 一方が炭酸化された出力を持ち、もう一方が持たない場合、炭酸化された方を使用します。
* どちらも炭酸化された出力を持たない場合、どちらかの未炭酸化の出力を使用します（両方とも同じになります）。

以下がコードです。

```fsharp
// 2つの炭酸化関数を連結
let (<+>) switch1 switch2 x = 
    match (switch1 x),(switch2 x) with
    | Carbonated s1,Carbonated s2 -> carbonated (s1 + s2)
    | Uncarbonated f1,Carbonated s2  -> carbonated s2
    | Carbonated s1,Uncarbonated f2 -> carbonated s1
    | Uncarbonated f1,Uncarbonated f2 -> uncarbonated f1
```

ちなみに、このコードはほとんど数学のようで、`uncarbonated`が「ゼロ」の役割を果たしています。以下のようなイメージです。

```text
何か + 何か = 組み合わされた何か
ゼロ + 何か = 何か
何か + ゼロ = 何か
ゼロ + ゼロ = ゼロ
```

これは偶然ではありません！関数型コードでは、このような種類のパターンが何度も現れます。将来の記事でこれについて話します。

とにかく、この「連結」関数を使って、メインの`fizzBuzz`を以下のように書き直すことができます。

```fsharp
let fizzBuzz = 
    let carbonateAll = 
        carbonate 3 "Fizz" <+> carbonate 5 "Buzz"

    carbonateAll 
    >> either (printf "%i; ") (printf "%s; ") 
```

2つの`carbonate`関数が加算され、以前と同様に`either`に渡されます。

以下が完全なコードです。

```fsharp
module FizzBuzz_RailwayOriented_UsingAppend = 

    open RailwayCombinatorModule 

    let (|Uncarbonated|Carbonated|) =
        function 
        | Choice1Of2 u -> Uncarbonated u
        | Choice2Of2 c -> Carbonated c

    /// 単一の値を二軌道の結果に変換
    let uncarbonated x = Choice1Of2 x
    let carbonated x = Choice2Of2 x

    // 2つの炭酸化関数を連結
    let (<+>) switch1 switch2 x = 
        match (switch1 x),(switch2 x) with
        | Carbonated s1,Carbonated s2 -> carbonated (s1 + s2)
        | Uncarbonated f1,Carbonated s2  -> carbonated s2
        | Carbonated s1,Uncarbonated f2 -> carbonated s1
        | Uncarbonated f1,Uncarbonated f2 -> uncarbonated f1

    // 値を炭酸化
    let carbonate factor label i = 
        if i % factor = 0 then
            carbonated label
        else
            uncarbonated i

    let fizzBuzz = 
        let carbonateAll = 
            carbonate 3 "Fizz" <+> carbonate 5 "Buzz"

        carbonateAll 
        >> either (printf "%i; ") (printf "%s; ") 

    // テスト
    [1..100] |> List.iter fizzBuzz
```

この加算ロジックを利用できるようになったので、コードを簡単にリファクタリングしてルールを使用できます。
先ほどの「パイプライン」実装と同様に、`reduce`を使用してすべてのルールを一度に加算できます。

以下がルールを使用したバージョンです。

```fsharp
module FizzBuzz_RailwayOriented_UsingAddition = 

    // 上記と同じコード
        
    let fizzBuzzPrimes rules = 
        let carbonateAll  = 
            rules
            |> List.map (fun (factor,label) -> carbonate factor label)
            |> List.reduce (<+>)
        
        carbonateAll 
        >> either (printf "%i; ") (printf "%s; ") 

    // テスト
    let rules = [ (3,"Fizz"); (5,"Buzz"); (7,"Baz") ]
    [1..105] |> List.iter (fizzBuzzPrimes rules)
```


## まとめ

この記事では、3つの異なる実装を見てきました。

* 可変値を使用し、副作用とロジックを混在させた命令型バージョン。
* データ構造を一連の関数に通す「パイプライン」バージョン。
* 2つの別々の軌道を持ち、関数を並列に「加算」して結合する「鉄道指向」バージョン。

私の意見では、命令型バージョンが最悪の設計です。素早くハックするのは簡単でしたが、脆弱でエラーを起こしやすい多くの問題があります。

2つの関数型バージョンのうち、少なくともこの問題に関しては「鉄道指向」バージョンの方がよりクリーンだと思います。

タプルや特別なレコードの代わりに`Choice`型を使用することで、コード全体をより優雅にしました。
`carbonate`のパイプラインバージョンと鉄道指向バージョンを比較すれば、その違いが分かります。

もちろん、他の状況では鉄道指向アプローチがうまく機能せず、パイプラインアプローチの方が適している場合もあるでしょう。この記事が両方について有用な洞察を提供できたことを願っています。

*FizzBuzzファンの方は、[関数型リアクティブプログラミング](../posts/concurrency-reactive.html)のページもチェックしてみてください。そこには問題のさらに別のバリエーションがあります。*

## 追伸：List.reduceの使用には注意が必要

`List.reduce`の使用には注意が必要です - 空のリストで失敗します。つまり、空のルールセットがある場合、コードは`System.ArgumentException`をスローします。

パイプラインの場合、以下のスニペットをモジュールに追加することでこれを確認できます。

```fsharp
module FizzBuzz_Pipeline_WithRules = 

    // 以前のコード
    
    // バグ
    let emptyRules = []
    [1..105] |> List.iter (fizzBuzz emptyRules)
```

修正方法は、`List.reduce`を`List.fold`に置き換えることです。`List.fold`には追加のパラメータが必要です。初期（または「ゼロ」）値です。
この場合、恒等関数`id`を初期値として使用できます。

以下が修正されたコードのバージョンです。

```fsharp
let allRules = 
    rules
    |> List.map (fun (factor,label) -> carbonate factor label)
    |> List.fold (>>) id
```

同様に、鉄道指向の例では以下のようになっていました。

```fsharp
let allRules = 
    rules
    |> List.map (fun (factor,label) -> carbonate factor label)
    |> List.reduce (<+>)
```

これは以下のように修正すべきです。

```fsharp
let allRules = 
    rules
    |> List.map (fun (factor,label) -> carbonate factor label)
    |> List.fold (<+>) zero
```

ここで、`zero`はリストが空の場合に使用する「デフォルト」関数です。

練習として、このケースの`zero`関数を定義してみてください。（ヒント：実は別の名前ですでに定義しています）