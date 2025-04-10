---
layout: post
title: "F# syntax in 60 seconds"
description: "A very quick overview on how to read F# code"
nav: why-use-fsharp
seriesId: "F# を使う理由"
seriesOrder: 2
---

これからF#のコードを見ていきますが、F#の構文に慣れていない初心者の方のために、とても簡単な概要を説明します。

まだ細かい部分までは説明しませんが、これから出てくるコード例の概要を理解するのに十分のはずです。すべてを理解できなくても心配しないでください。実際のコード例に到達したときに、より詳細な説明をしていく予定です。

F# の構文と標準的な C 風の構文との 2 つの大きな違いは次のとおりです。

* コードブロックを区切るために、波かっこ ({ }) を使わない。代わりに、インデントを使う (Python もこの点で似ている)。
* カンマではなく、空白を使って引数を区切る。

F# の構文を敬遠する人もいるかもしれません。 もしあなたがその一人であれば、次の言葉を考えてみてください。

> 「記法を最適化して、最初の 10 分間はわかりやすくしても、その後の読みやすさを損なうのは、非常に悪い間違いです。」 (David MacIver, [Scala の構文に関する記事](https://rickyclarkson.blogspot.com/2008/01/in-defence-of-0l-in-scala.html) 経由)

個人的には、F# の構文は慣れると非常に明快でわかりやすいと思います。多くの点で、キーワードや特殊ケースが少ないため、C# の構文よりもシンプルです。

以下のコード例は、普段よく使う F# スクリプトの基本的な概念のほとんどを網羅したシンプルなものです。

ぜひ、このコードをインタラクティブに試したり、少し遊んでみたりしてみてください。

* F# スクリプト ファイル (.fsx 拡張子) にこのコードを入力し、インタラクティブ ウィンドウに送信します。詳細は [F# のインストールと使用方法](../installing-and-using.html) ページを参照してください。
* または、このコードをインタラクティブ ウィンドウで実行してみてもかまいません。入力の完了をインタープリターに伝えるために、常に末尾に `;;` を使用するようにしてください。


```fsharp
// シングルラインコメントはスラッシュを 2 つ使う
(* マルチラインコメントは (* ... *) で囲む

- マルチラインコメント終了 - *)

// ======== "変数" (実際は変数ではない) ==========
// "let" キーワードは (不変の) 値を定義する
let myInt = 5
let myFloat = 3.14
let myString = "hello"	//型は不要であることに注意

// ======== リスト ============
let twoToFive = [2;3;4;5]        // 角カッコ ([ ]) は、セミコロン (;) で区切られた
                                 // リストを作成する
let oneToFive = 1 :: twoToFive   // :: は最初の要素を持つ新しいリストを作成する
// 結果は [1;2;3;4;5]
let zeroToFive = [0;1] @ twoToFive   // @ は 2 つのリストを連結する

// 重要: 区切りにはカンマ (,) は決して使わず、常にセミコロン (;) を使用すること!

// ======== 関数 ========
// "let" キーワードは名前付き関数も定義する。
let square x = x * x          // かっこ ( ) を使用しないことに注意
square 3                      // 関数を呼び出してみよう。ここでもかっこは不要

let add x y = x + y           // add (x, y) を使わないように! 
                              // 全く別の意味になってしまう
add 2 3                       // もう一度関数を呼び出してみよう

// 複数行の関数定義は、インデントだけでよい。セミコロンは不要
let evens list =
   let isEven x = x%2 = 0     // "isEven" を内部 (入れ子) 関数として定義する
   List.filter isEven list    // List.filter は
                              // ブール値関数と処理対象のリストを取る
                              // 2 つの引数を持つライブラリ関数

evens oneToFive               // 関数を呼び出してみよう

// かっこを使って優先順位を明確にすることができる
// この例では、まず "map" を 2 つの引数で実行し、その後その結果に対して "sum" を実行する
// かっこがない場合、"List.map" が List.sum に引数として渡されてしまう
let sumOfSquaresTo100 =
   List.sum ( List.map square [1..100] )

// パイプ ( "|>" ) を使って演算の結果を次の演算に流すことができる
// 以下は、sumOfSquares 関数と同じだが、パイプを使って書いたもの
let sumOfSquaresTo100piped =
   [1..100] |> List.map square |> List.sum  // "square" は前に定義済み

// "fun" キーワードを使ってラムダ式 (匿名関数) を定義できる
let sumOfSquaresTo100withFun =
   [1..100] |> List.map (fun x->x*x) |> List.sum

// F# では戻り値は暗黙的であり、"return" は不要
// 関数は常に、使用された最後の式の値を返す

// ======== パターンマッチ ========
// match..with.. は強化版の case/switch 文である
let simplePatternMatch =
   let x = "a"
   match x with
    | "a" -> printfn "x is a"
    | "b" -> printfn "x is b"
    | _ -> printfn "x is something else"   // アンダーバー (_) は何にでもマッチする

// Some(..) と None は、Nullableラッパーに大体相当する
let validValue = Some(99)
let invalidValue = None

// この例では、match..with を "Some" と "None" にマッチさせ
// 同時に "Some" の値を取り出している
let optionPatternMatch input =
   match input with
    | Some i -> printfn "input is an int=%d" i
    | None -> printfn "input is missing"

optionPatternMatch validValue
optionPatternMatch invalidValue

// ========= 複雑なデータ型 =========

// タプル型はペアやトリプレットなどを表す。カンマ (,) で要素を区切る
let twoTuple = 1,2
let threeTuple = "a",2,true

// レコード型は名前付きフィールドを持つ。セミコロン (;) でフィールドを区切る
type Person = {First:string; Last:string}
let person1 = {First="john"; Last="Doe"}

// 共用体型は複数の選択肢を持つ。縦棒 (|) で選択肢を区切る
type Temp = 
	| DegreesC of float
	| DegreesF of float
let temp = DegreesF 98.6

// 型を再帰的に組み合わせることで、さらに複雑な型を定義することもできる
// 例：同じ型の要素を持つリストを含む共用型
type Employee = 
  | Worker of Person
  | Manager of Employee list
let jdoe = {First="John";Last="Doe"}
let worker = Worker jdoe

// ========= プリント =========
// F# には、C# の Console.Write/WriteLine 関数と似た
// printf/printfn 関数がある
printfn "Printing an int %i, a float %f, a bool %b" 1 2.0 true
printfn "A string %s, and something generic %A" "hello" [1;2;3;4]

// 複雑な型は、専用の整形済み出力形式を持っている
printfn "twoTuple=%A,\nPerson=%A,\nTemp=%A,\nEmployee=%A" 
         twoTuple person1 temp worker

// また、String.Format と同様に、データを書式指定して文字列にする
// sprintf/sprintfn 関数も存在する

```

ここからは、簡単な F# コードとそれに相当する C# コードを比較していきましょう。