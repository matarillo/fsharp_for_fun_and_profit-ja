---
layout: post
title: "実践例：コマンドライン引数の解析"
description: "実践的なパターンマッチング"
nav: thinking-functionally
seriesId: "式と構文"
seriesOrder: 11
categories: [パターン, 実践例]
---

match 式のしくみを理解したところで、実践的な例を見てみましょう。ただし、その前に設計アプローチについて説明します。

## F#でのアプリケーション設計

ジェネリック関数が入力を受け取って出力を生み出すことは見てきました。ある意味で、このアプローチは関数型コードのどのレベルにも当てはまります。トップレベルでさえ同じです。

実際、関数型アプリケーションは入力を受け取り、それを変換し、出力を生み出すと言えます。

![](../assets/img/function_transform1.png)

理想的には、この変換はドメインをモデル化するために作った純粋な型安全な世界の中で行われます。でも、残念ながら現実の世界は型付けされていません！
つまり、入力と出力はおそらく単純な文字列やバイト列です。

これをどうやって扱うのでしょうか？最も簡単な解決策は、入力を純粋な内部モデルに変換する段階と、内部モデルを出力に変換する段階を別々に設けることです。

![](../assets/img/function_transform2.png)

こうすることで、アプリケーションの中核から現実世界の厄介な部分を隠せます。この「モデルを純粋に保つ」アプローチは、大規模では「[ヘキサゴナルアーキテクチャ](https://alistair.cockburn.us/hexagonal-architecture/)」の概念に、小規模ではMVCパターンに似ています。

この投稿と[次の投稿](../posts/roman-numerals)では、このアプローチの簡単な例をいくつか見ていきます。

## 例：コマンドラインの解析

[前回の投稿](../posts/match-expression)では、match式について一般的に説明しました。今回は、実際に役立つ例を見てみましょう。具体的には、コマンドラインの解析です。

基本的な内部モデルを持つバージョンと、いくつか改良を加えたバージョンの2つを設計し実装します。

### 要件

コマンドラインオプションに、「verbose」、「subdirectories」、「orderby」の3つがあるとします。
「verbose」と「subdirectories」はフラグで、「orderby」には「by size」と「by name」の2つの選択肢があります。

コマンドラインパラメータは次のようになります。

	MYAPP [/V] [/S] [/O order]
	/V    詳細表示
	/S    サブディレクトリを含む
	/O    並び順。パラメータは以下のいずれか 
			N - 名前で並べ替え
			S - サイズで並べ替え

## 最初のバージョン

上記の設計ルールに従うと、以下のことがわかります。

* 入力は文字列の配列（またはリスト）で、各引数に対応します。
* 内部モデルは（小さな）ドメインをモデル化する型の集まりです。
* 出力はこの例では扱いません。

まず、パラメータの内部モデルを作り、次に入力を内部モデルで使う型に解析する方法を見ていきます。

最初のモデルを試作してみましょう。

```fsharp
// 後で使う定数
let OrderByName = "N"
let OrderBySize = "S"

// オプションを表す型を設定
type CommandLineOptions = {
    verbose: bool;
    subdirectories: bool;
    orderby: string; 
    }
```

これで良さそうです。次に引数を解析してみましょう。

解析のロジックは、前回の投稿で紹介した `loopAndSum` の例とよく似ています。

* 引数のリストに対して再帰的なループを作ります。
* ループの各回で、1つの引数を解析します。
* これまでに解析したオプションは、各ループにパラメータとして渡します（「アキュムレータ」パターン）。

```fsharp
let rec parseCommandLine args optionsSoFar = 
    match args with 
    // 空のリストは処理完了を意味します
    | [] -> 
        optionsSoFar  

    // verboseフラグのマッチング
    | "/v"::xs -> 
        let newOptionsSoFar = { optionsSoFar with verbose=true}
        parseCommandLine xs newOptionsSoFar 

    // subdirectoriesフラグのマッチング
    | "/s"::xs -> 
        let newOptionsSoFar = { optionsSoFar with subdirectories=true}
        parseCommandLine xs newOptionsSoFar 

    // orderByフラグのマッチング
    | "/o"::xs -> 
        // 次の引数に対するサブマッチを開始
        match xs with
        | "S"::xss -> 
            let newOptionsSoFar = { optionsSoFar with orderby=OrderBySize}
            parseCommandLine xss newOptionsSoFar 
            
        | "N"::xss -> 
            let newOptionsSoFar = { optionsSoFar with orderby=OrderByName}
            parseCommandLine xss newOptionsSoFar 
            
        // 認識できないオプションを処理し、ループを続ける
        | _ -> 
            eprintfn "OrderByには2番目の引数が必要です"
            parseCommandLine xs optionsSoFar 

    // 認識できないオプションを処理し、ループを続ける
    | x::xs -> 
        eprintfn "オプション '%s' は認識できません" x
        parseCommandLine xs optionsSoFar 
```

このコードは、わかりやすいと思います。

各マッチは `option::restOfList` パターンで構成されています。
オプションがマッチすると、新しい `optionsSoFar` 値を作り、リストの残りに対してループを繰り返します。リストが空になるまでこれを続け、
空になったらループを終了し、 `optionsSoFar` 値を最終結果として返します。

特殊なケースが2つあります。

* 「orderBy」オプションのマッチングでは、リストの残りの最初の項目を調べるサブマッチパターンを作ります。見つからない場合は2番目のパラメータがないと警告します。
* メインの `match..with` の最後のマッチはワイルドカードではなく、「値への束縛」です。ワイルドカードと同じく常に成功しますが、値に束縛しているため、マッチしなかった引数を表示できます。
* エラーの表示には `printf` ではなく `eprintf` を使います。これによりSTDOUTではなくSTDERRに書き込まれます。

では、これをテストしてみましょう。

```fsharp
parseCommandLine ["/v"; "/s"] 
```
            
おっと！うまくいきませんでした。初期の `optionsSoFar` 引数を渡す必要があります！もう一度試してみましょう。

```fsharp
// 渡すデフォルト値を定義
let defaultOptions = {
    verbose = false;
    subdirectories = false;
    orderby = ByName
    }

// テスト
parseCommandLine ["/v"] defaultOptions
parseCommandLine ["/v"; "/s"] defaultOptions
parseCommandLine ["/o"; "S"] defaultOptions
```

出力が期待通りかどうか確認してください。

エラーケースもチェックしておきましょう。

```fsharp
parseCommandLine ["/v"; "xyz"] defaultOptions
parseCommandLine ["/o"; "xyz"] defaultOptions
```

これらのケースでエラーメッセージが表示されるはずです。

この実装を終える前に、少し気になる点を直しましょう。
デフォルトオプションを毎回渡していますが、これを省略できないでしょうか？

これはよくある状況です。再帰関数が「アキュムレータ」パラメータを取りますが、毎回初期値を渡したくないという場合です。

解決策は簡単です。デフォルト値を使って再帰関数を呼び出す別の関数を作るだけです。

通常、この2つ目の関数を「公開」し、再帰関数は非公開です。したがって、以下のようにコードを書き直します。

* `parseCommandLine` を `parseCommandLineRec` にリネームします。他の命名規則も使えます。たとえば、アポストロフィをつけた `parseCommandLine'` や、 `innerParseCommandLine` などです。
* デフォルト値を使って `parseCommandLineRec` を呼び出す新しい `parseCommandLine` を作ります。

```fsharp
// 「ヘルパー」再帰関数を作る
let rec parseCommandLineRec args optionsSoFar = 
	// 実装は上記と同じ

// 「公開」解析関数を作る
let parseCommandLine args = 
    // デフォルト値を作る
    let defaultOptions = {
        verbose = false;
        subdirectories = false;
        orderby = OrderByName
        }

    // 初期オプションを使って再帰関数を呼び出す
    parseCommandLineRec args defaultOptions 
```

この場合、ヘルパー関数は独立して使えます。でも、本当に非公開にする場合は、 `parseCommandLine` の定義内にネストしたサブ関数として置くこともできます。

```fsharp
// 「公開」解析関数を作る
let parseCommandLine args = 
    // デフォルト値を作る
    let defaultOptions = 
		// 実装は上記と同じ

	// 内部再帰関数
	let rec parseCommandLineRec args optionsSoFar = 
		// 実装は上記と同じ

    // 初期オプションを使って再帰関数を呼び出す
    parseCommandLineRec args defaultOptions 
```

こうすると、複雑になるだけだと思うので、別々にしました。

では、すべてのコードをモジュールにまとめて一度に見てみましょう。

```fsharp
module CommandLineV1 =

    // 後で使う定数
    let OrderByName = "N"
    let OrderBySize = "S"

    // オプションを表す型を設定
    type CommandLineOptions = {
        verbose: bool;
        subdirectories: bool;
        orderby: string; 
        }

    // 「ヘルパー」再帰関数を作る
    let rec parseCommandLineRec args optionsSoFar = 
        match args with 
        // 空のリストは処理完了を意味します
        | [] -> 
            optionsSoFar  

        // verboseフラグのマッチング
        | "/v"::xs -> 
            let newOptionsSoFar = { optionsSoFar with verbose=true}
            parseCommandLineRec xs newOptionsSoFar 

        // subdirectoriesフラグのマッチング
        | "/s"::xs -> 
            let newOptionsSoFar = { optionsSoFar with subdirectories=true}
            parseCommandLineRec xs newOptionsSoFar 

        // orderByフラグのマッチング
        | "/o"::xs -> 
            // 次の引数に対するサブマッチを開始
            match xs with
            | "S"::xss -> 
                let newOptionsSoFar = { optionsSoFar with orderby=OrderBySize}
                parseCommandLineRec xss newOptionsSoFar 
            
            | "N"::xss -> 
                let newOptionsSoFar = { optionsSoFar with orderby=OrderByName}
                parseCommandLineRec xss newOptionsSoFar 
            
            // 認識できないオプションを処理し、ループを続ける
            | _ -> 
                eprintfn "OrderByには2番目の引数が必要です"
                parseCommandLineRec xs optionsSoFar 

        // 認識できないオプションを処理し、ループを続ける
        | x::xs -> 
            eprintfn "オプション '%s' は認識できません" x
            parseCommandLineRec xs optionsSoFar 

    // 「公開」解析関数を作る
    let parseCommandLine args = 
        // デフォルト値を作る
        let defaultOptions = {
            verbose = false;
            subdirectories = false;
            orderby = OrderByName
            }

        // 初期オプションを使って再帰関数を呼び出す
        parseCommandLineRec args defaultOptions 


// 正常系
CommandLineV1.parseCommandLine ["/v"] 
CommandLineV1.parseCommandLine  ["/v"; "/s"] 
CommandLineV1.parseCommandLine  ["/o"; "S"] 

// エラー処理
CommandLineV1.parseCommandLine ["/v"; "xyz"] 
CommandLineV1.parseCommandLine ["/o"; "xyz"] 
```

## 第2バージョン

最初のモデルでは、可能な値を表すのにboolとstringを使いました。

```fsharp
type CommandLineOptions = {
    verbose: bool;
    subdirectories: bool;
    orderby: string; 
    }
```

これには2つの問題があります。

* **ドメインを*本当に*表現していません。** たとえば、 `orderby` は*どんな*文字列でも良いのでしょうか？「ABC」を設定したらコードは壊れるでしょうか？

* **値が自己文書化されていません。** たとえば、verbose値はboolです。そのboolが「verbose」オプションを表しているとわかるのは、それが見つかる*コンテキスト*（ `verbose` という名前のフィールド）があるからです。
そのboolを渡して、コンテキストから外すと、それが何を表しているのかわからなくなります。次のような多くのブール型パラメータを持つC#の関数を見たことがあるでしょう。

```csharp
myObject.SetUpComplicatedOptions(true,false,true,false,false);
```

boolがドメインレベルで何も表現していないため、間違いを犯しやすくなります。

これらの問題の解決策は、ドメインを定義する際にできるだけ具体的にすることです。通常は、非常に具体的な型をたくさん作ります。

では、 `CommandLineOptions` の新しいバージョンを見てみましょう。

```fsharp
type OrderByOption = OrderBySize | OrderByName
type SubdirectoryOption = IncludeSubdirectories | ExcludeSubdirectories
type VerboseOption = VerboseOutput | TerseOutput

type CommandLineOptions = {
    verbose: VerboseOption;
    subdirectories: SubdirectoryOption;
    orderby: OrderByOption
    }
```

注目すべき点がいくつかあります。

* どこにもboolや文字列はありません。
* 名前がとても明示的です。これは値が単独で取り出された場合にドキュメントとして機能するだけでなく、名前が一意であることも意味します。
これは型推論に役立ち、結果として明示的な型注釈を避けられます。

ドメインに変更を加えたら、解析ロジックを直すのは簡単です。

では、改訂後のコードをすべて「v2」モジュールにまとめてみましょう。

```fsharp
module CommandLineV2 =

    type OrderByOption = OrderBySize | OrderByName
    type SubdirectoryOption = IncludeSubdirectories | ExcludeSubdirectories
    type VerboseOption = VerboseOutput | TerseOutput

    type CommandLineOptions = {
        verbose: VerboseOption;
        subdirectories: SubdirectoryOption;
        orderby: OrderByOption
        }

    // 「ヘルパー」再帰関数を作る
    let rec parseCommandLineRec args optionsSoFar = 
        match args with 
        // 空のリストは処理完了を意味します
        | [] -> 
            optionsSoFar  

        // verboseフラグのマッチング
        | "/v"::xs -> 
            let newOptionsSoFar = { optionsSoFar with verbose=VerboseOutput}
            parseCommandLineRec xs newOptionsSoFar 

        // subdirectoriesフラグのマッチング
        | "/s"::xs -> 
            let newOptionsSoFar = { optionsSoFar with subdirectories=IncludeSubdirectories}
            parseCommandLineRec xs newOptionsSoFar 

        // 並び順フラグのマッチング
        | "/o"::xs -> 
            // 次の引数に対するサブマッチを開始
            match xs with
            | "S"::xss -> 
                let newOptionsSoFar = { optionsSoFar with orderby=OrderBySize}
                parseCommandLineRec xss newOptionsSoFar 
            | "N"::xss -> 
                let newOptionsSoFar = { optionsSoFar with orderby=OrderByName}
                parseCommandLineRec xss newOptionsSoFar 
            // 認識できないオプションを処理し、ループを続ける
            | _ -> 
                printfn "OrderByには2番目の引数が必要です"
                parseCommandLineRec xs optionsSoFar 

        // 認識できないオプションを処理し、ループを続ける
        | x::xs -> 
            printfn "オプション '%s' は認識できません" x
            parseCommandLineRec xs optionsSoFar 

    // 「公開」解析関数を作る
    let parseCommandLine args = 
        // デフォルト値を作る
        let defaultOptions = {
            verbose = TerseOutput;
            subdirectories = ExcludeSubdirectories;
            orderby = OrderByName
            }

        // 初期オプションを使って再帰関数を呼び出す
        parseCommandLineRec args defaultOptions 
            
// ==============================
// テスト    

// 正常系
CommandLineV2.parseCommandLine ["/v"] 
CommandLineV2.parseCommandLine ["/v"; "/s"] 
CommandLineV2.parseCommandLine ["/o"; "S"] 

// エラー処理
CommandLineV2.parseCommandLine ["/v"; "xyz"] 
CommandLineV2.parseCommandLine ["/o"; "xyz"] 
```

## 再帰の代わりにfoldを使う？

前回の投稿で、できるだけ再帰を避け、 `List` モジュールの `map` や `fold` のような組み込み関数を使うのが良いと言いました。

では、このアドバイスに従って、このコードを直せるでしょうか？

残念ながら、簡単にはできません。問題は、リスト関数が一般的に一度に1つの要素を処理するのに対し、「orderby」オプションは「先読み」引数も必要とすることです。

これを `fold` のようなものでうまく動かすには、先読みモードかどうかを示す「解析モード」フラグを作る必要があります。
これは可能ですが、上記の単純な再帰バージョンと比べると、余計な複雑さが加わるだけだと思います。

そして、実際の状況では、これ以上複雑なものは[FParsec](https://www.quanttec.com/fparsec/)のような適切な解析システムに切り替える必要があるというシグナルでしょう。

しかし、 `fold` でもできることを示しておきます。

```fsharp
module CommandLineV3 =

    type OrderByOption = OrderBySize | OrderByName
    type SubdirectoryOption = IncludeSubdirectories | ExcludeSubdirectories
    type VerboseOption = VerboseOutput | TerseOutput

    type CommandLineOptions = {
        verbose: VerboseOption;
        subdirectories: SubdirectoryOption;
        orderby: OrderByOption
        }

    type ParseMode = TopLevel | OrderBy

    type FoldState = {
        options: CommandLineOptions ;
        parseMode: ParseMode;
        }

    // トップレベルの引数を解析
    // 新しいFoldStateを返す
    let parseTopLevel arg optionsSoFar = 
        match arg with 

        // verboseフラグのマッチング
        | "/v" -> 
            let newOptionsSoFar = {optionsSoFar with verbose=VerboseOutput}
            {options=newOptionsSoFar; parseMode=TopLevel}

        // subdirectoriesフラグのマッチング
        | "/s"-> 
            let newOptionsSoFar = { optionsSoFar with subdirectories=IncludeSubdirectories}
            {options=newOptionsSoFar; parseMode=TopLevel}

        // 並び順フラグのマッチング
        | "/o" -> 
            {options=optionsSoFar; parseMode=OrderBy}

        // 認識できないオプションを処理し、ループを続ける
        | x -> 
            printfn "オプション '%s' は認識できません" x
            {options=optionsSoFar; parseMode=TopLevel}

    // orderBy引数を解析
    // 新しいFoldStateを返す
    let parseOrderBy arg optionsSoFar = 
        match arg with
        | "S" -> 
            let newOptionsSoFar = { optionsSoFar with orderby=OrderBySize}
            {options=newOptionsSoFar; parseMode=TopLevel}
        | "N" -> 
            let newOptionsSoFar = { optionsSoFar with orderby=OrderByName}
            {options=newOptionsSoFar; parseMode=TopLevel}
        // 認識できないオプションを処理し、ループを続ける
        | _ -> 
            printfn "OrderByには2番目の引数が必要です"
            {options=optionsSoFar; parseMode=TopLevel}

    // ヘルパーfold関数を作る
    let foldFunction state element  = 
        match state with
        | {options=optionsSoFar; parseMode=TopLevel} ->
            // 新しい状態を返す
            parseTopLevel element optionsSoFar

        | {options=optionsSoFar; parseMode=OrderBy} ->
            // 新しい状態を返す
            parseOrderBy element optionsSoFar
           
    // 「公開」解析関数を作る
    let parseCommandLine args = 

        let defaultOptions = {
            verbose = TerseOutput;
            subdirectories = ExcludeSubdirectories;
            orderby = OrderByName
            }
      
        let initialFoldState = 
            {options=defaultOptions; parseMode=TopLevel}

        // 初期状態でfoldを呼び出す
        args |> List.fold foldFunction initialFoldState 

// ==============================
// テスト    

// 正常系
CommandLineV3.parseCommandLine ["/v"] 
CommandLineV3.parseCommandLine ["/v"; "/s"] 
CommandLineV3.parseCommandLine ["/o"; "S"] 

// エラー処理
CommandLineV3.parseCommandLine ["/v"; "xyz"] 
CommandLineV3.parseCommandLine ["/o"; "xyz"] 
```

ところで、このバージョンの微妙な動作の変化に気づきましたか？

以前のバージョンでは、「orderBy」オプションにパラメータがない場合、再帰ループは次回にそれを解析していました。
しかし、'fold'バージョンでは、このトークンは飲み込まれて失われてしまいます。

これを確認するために、2つの実装を比較してみましょう。

```fsharp
// verboseが設定される
CommandLineV2.parseCommandLine ["/o"; "/v"] 

// verboseが設定されない！ 
CommandLineV3.parseCommandLine ["/o"; "/v"] 
```

これを直すにはさらに多くの作業が必要です。これも、デバッグとメンテナンスがしやすいという点で、2 番目の実装が最適であることを示しています。

## まとめ

この投稿では、パターンマッチングを実際の例に当てはめる方法を見てきました。

より重要なのは、どんなに小さなドメインでも、適切に設計された内部モデルを簡単に作れることを見てきたことです。そして、この内部モデルは、文字列やboolのようなプリミティブな型を使うよりも、型安全性と文書化が向上します。

次の例では、さらにパターンマッチングを行います！
