---
layout: post
title: "カリー化"
description: "複数パラメータの関数を1パラメータの小さな関数に分解する"
nav: thinking-functionally
seriesId: "関数型思考"
seriesOrder: 5
categories: ["カリー化"]
---

基本的な型について少し話がそれましたが、ここで再び関数の話題に戻りましょう。特に、先ほど触れた疑問について考えてみます。数学的な関数が1つのパラメータしか持てないのに、F#の関数がどうして複数のパラメータを持つことができるのでしょうか？

答えは実はシンプルです。複数のパラメータを持つ関数は、1つのパラメータだけを持つ一連の新しい関数として書き直されるのです。そして、これはコンパイラによって自動的に行われます。この処理は「**カリー化**」と呼ばれます。関数型プログラミングの発展に重要な影響を与えた数学者、ハスケル・カリーにちなんで名付けられました。

この仕組みを実際に見てみましょう。2つの数字を出力する非常に基本的な例を使います。

```fsharp
//通常のバージョン
let printTwoParameters x y = 
   printfn "x=%i y=%i" x y
```

内部的に、コンパイラはこれを次のように書き直します。

```fsharp
//明示的にカリー化されたバージョン
let printTwoParameters x  =    // パラメータは1つだけ！
   let subFunction y = 
      printfn "x=%i y=%i" x y  // 1つのパラメータを持つ新しい関数
   subFunction                 // サブ関数を返す
```

これを詳しく見てみましょう。

1. `printTwoParameters` という名前の関数を構築します。ただし、パラメータは "x" が*1つだけ*です。
2. その内部で、*1つだけ*のパラメータ "y" を持つサブ関数を構築します。この内部関数は "x" パラメータを使用しますが、xは明示的にパラメータとして渡されていません。"x" パラメータはスコープ内にあるので、内部関数はそれを見てパラメータとして渡さなくても使用できます。
3. 最後に、新しく作成されたサブ関数を返します。
4. この返された関数は後で "y" に対して使用されます。"x" パラメータはその中に組み込まれているので、返された関数は関数のロジックを完了するために "y" パラメータだけを必要とします。

このように書き直すことで、コンパイラは要求通りすべての関数が1つのパラメータだけを持つようにしています。つまり、 `printTwoParameters` を使用するとき、2つのパラメータを持つ関数を使っていると思うかもしれませんが、実際には1つのパラメータを持つ関数を使っているのです！これを確認するには、2つの引数の代わりに1つの引数だけを渡してみてください。

```fsharp
// 1つの引数で評価
printTwoParameters 1 

// 関数が返ってくる！
val it : (int -> unit) = <fun:printTwoParameters@286-3>
```

1つの引数で評価すると、エラーは発生せず、関数が返ってきます。

つまり、 `printTwoParameters` を2つの引数で呼び出すとき、実際には次のことが行われています。

* 最初の引数(x)で `printTwoParameters` を呼び出す
* `printTwoParameters` は "x" が組み込まれた新しい関数を返す
* その新しい関数を2番目の引数(y)で呼び出す

ここに段階的なバージョンと、その後に通常のバージョンの例を示します。

```fsharp
// 段階的なバージョン
let x = 6
let y = 99
let intermediateFn = printTwoParameters x  // "x"が組み込まれた
                                           // 関数を返す
let result  = intermediateFn y 

// 上記のインラインバージョン
let result  = (printTwoParameters x) y

// 通常のバージョン
let result  = printTwoParameters x y
```

別の例を見てみましょう。

```fsharp
//通常のバージョン
let addTwoParameters x y = 
   x + y

//明示的にカリー化されたバージョン
let addTwoParameters x  =      // パラメータは1つだけ！
   let subFunction y = 
      x + y                    // 1つのパラメータを持つ新しい関数
   subFunction                 // サブ関数を返す

// ステップバイステップで使用してみる 
let x = 6
let y = 99
let intermediateFn = addTwoParameters x  // "x"が組み込まれた
                                         // 関数を返す
let result  = intermediateFn y 

// 通常のバージョン
let result  = addTwoParameters x y
```

ここでも、「2つのパラメータを持つ関数」は実際には、中間関数を返す1つのパラメータを持つ関数です。

しかし、ちょっと待ってください。 `+` 演算自体はどうなのでしょうか？これは必ず2つのパラメータを取る二項演算ですよね？実は、そうではありません。他の関数と同様にカリー化されています。 `+` という名前の関数があり、これは1つのパラメータを取り、新しい中間関数を返します。先ほどの `addTwoParameters` と全く同じです。

`x+y` という式を書くとき、コンパイラは中置記法を解除してコードを `(+) x y` に並べ替えます。これは、"+" という名前の関数が2つのパラメータで呼び出されているということです。注意してください。"+" という名前の関数をかっこで囲む必要があります。これは、中置演算子としてではなく、通常の関数名として使用していることを示すためです。

最後に、"+" という名前の2つのパラメータを持つ関数は、他の2つのパラメータを持つ関数と同じように扱われます。

```fsharp
// プラスを単一値関数として使用 
let x = 6
let y = 99
let intermediateFn = (+) x     // xが組み込まれた加算を返す
let result  = intermediateFn y 

// プラスを2つのパラメータを持つ関数として使用
let result  = (+) x y          

// プラスを中置演算子として使用する通常のバージョン
let result  = x + y
```

これは他のすべての演算子や printf のようなビルトイン関数でも同様に機能します。

```fsharp
// 乗算の通常のバージョン
let result  = 3 * 5

// 1つのパラメータを持つ関数としての乗算
let intermediateFn = (*) 3   // "3"が組み込まれた乗算を返す
let result  = intermediateFn 5

// printfn の通常のバージョン
let result  = printfn "x=%i y=%i" 3 5  

// 1つのパラメータを持つ関数としての printfn
let intermediateFn = printfn "x=%i y=%i" 3  // "3"が組み込まれている
let result  = intermediateFn 5
```

## カリー化された関数のシグネチャ

カリー化された関数の動作がわかったところで、そのシグネチャがどのように見えるか考えてみましょう。

最初の例 `printTwoParameters` に戻ると、これは1つの引数を取り、中間関数を返すことがわかりました。中間関数も1つの引数を取り、何も返しません（つまり、unit）。したがって、中間関数の型は `int->unit` です。言い換えれば、 `printTwoParameters` の定義域は `int` で、値域は `int->unit` です。これをまとめると、最終的なシグネチャは次のようになります。

```fsharp
val printTwoParameters : int -> (int -> unit)
```

明示的にカリー化された実装を評価すると、上記のようにかっこ付きのシグネチャが表示されます。一方、暗黙的にカリー化される通常の実装を評価すると、かっこは省略されます。

```fsharp
val printTwoParameters : int -> int -> unit
```

かっこはオプションです。関数シグネチャを理解しようとするとき、頭の中でかっこを追加するとわかりやすいかもしれません。

この時点で、中間関数を返す関数と通常の2つのパラメータを持つ関数の違いは何なのか、疑問に思うかもしれません。

以下は、関数を返す1つのパラメータを持つ関数の例です。

```fsharp
let add1Param x = (+) x    
// シグネチャは = int -> (int -> int)
```

以下は、単純な値を返す2つのパラメータを持つ関数の例です。

```fsharp
let add2Params x y = (+) x y    
// シグネチャは = int -> int -> int
```

シグネチャは少し異なりますが、実用的には違いはありません。2番目の関数は自動的にカリー化されるだけです。

## 2つ以上のパラメータを持つ関数

2つ以上のパラメータを持つ関数では、カリー化はどのように機能するのでしょうか？まったく同じ方法です。最後のパラメータを除くすべてのパラメータに対して、関数は前のパラメータが組み込まれた中間関数を返します。

次に、やや人工的ですが具体例を見てみましょう。パラメータの型を明示的に指定していますが、関数自体は何もしません。

```fsharp
let multiParamFn (p1:int)(p2:bool)(p3:string)(p4:float)=
   ()   //何もしない

let intermediateFn1 = multiParamFn 42    
   // intermediateFn1 はboolを取り、
   // 新しい関数 (string -> float -> unit) を返す
let intermediateFn2 = intermediateFn1 false    
   // intermediateFn2 はstringを取り、
   // 新しい関数 (float -> unit) を返す
let intermediateFn3 = intermediateFn2 "hello"  
   // intermediateFn3 はfloatを取り、
   // 単純な値 (unit) を返す
let finalResult = intermediateFn3 3.141
```

全体の関数のシグネチャは次のようになります。

```fsharp
val multiParamFn : int -> bool -> string -> float -> unit
```

そして、中間関数のシグネチャは次のようになります。

```fsharp
val intermediateFn1 : (bool -> string -> float -> unit)
val intermediateFn2 : (string -> float -> unit)
val intermediateFn3 : (float -> unit)
val finalResult : unit = ()
```

関数シグネチャを見れば、その関数が取るパラメータの数がわかります。かっこの外側にある矢印の数を数えるだけです。関数が他の関数をパラメータとして受け取ったり返したりする場合、かっこ内に矢印が現れますが、これらはパラメータ数の計算では無視します。具体例を見てみましょう。

```fsharp
int->int->int      // 2つのintパラメータを取り、intを返す

string->bool->int  // 最初のパラメータはstring、2番目はbool、  
                   // intを返す

int->string->bool->unit // 3つのパラメータ（int,string,bool）を取り、 
                        // 何も返さない（unit）

(int->string)->int      // 1つのパラメータのみ。これは関数値
                        // （intからstringへの関数）であり、
                        // intを返す

(int->string)->(int->bool) // 関数（intからstringへの関数）を取り、 
                           // 関数（intからboolへの関数）を返す 
```


## 複数パラメータに関する問題

カリー化の背後にある論理は、理解するまでは予期せぬ結果を生む可能性があります。関数を期待されるよりも少ない引数で評価してもエラーにはならないことを覚えておいてください。代わりに、部分適用された関数が返されます。その後、この部分適用された関数を値として期待される文脈で使用すると、コンパイラから不明瞭なエラーメッセージが出る可能性があります。

以下は一見問題なさそうな関数です。

```fsharp
// 関数を作成
let printHello() = printfn "hello"
```

この関数を以下のように呼び出した場合、何が起こると思いますか？コンソールに "hello" と出力されるでしょうか？評価する前に予想してみてください。ヒントとして、関数のシグネチャを確認してみるといいでしょう。

```fsharp
// 呼び出し
printHello
```

これは期待通りには呼び出されません。元の関数は unit 引数を期待しますが、それが提供されていないため、部分適用された関数（この場合は引数なし）が返されます。

では、これはコンパイルされるでしょうか？

```fsharp
let addXY x y = 
    printfn "x=%i y=%i" x     
    x + y 
```

評価すると、コンパイラが printfn の行について警告を出すのがわかります。

```fsharp
printfn "x=%i y=%i" x
//^^^^^^^^^^^^^^^^^^^^^
//warning FS0193: この式は関数値です。つまり、引数が不足しています。
//型は ^a -> unit です。
```

カリー化を理解していなければ、このメッセージは非常に分かりにくいものでしょう！このように単独で評価されるすべての式（つまり、戻り値として使用されたり、`let` で何かに束縛されたりしていないもの）は、unit 値に評価されなければなりません。この場合、unit 値に評価されず、代わりに関数に評価されています。これは長々とした説明ですが、要するに `printfn` に引数が不足しているということです。

.NETライブラリとの接続時にこのようなエラーが発生することがよくあります。たとえば、 `TextReader` の `ReadLine` メソッドは unit パラメータを取る必要があります。これを忘れ、かっこを省略してしまうことはよくあることで、その場合、コンパイルエラーはすぐに発生せず、結果を文字列として扱おうとしたときに初めてエラーになります。

```fsharp
let reader = new System.IO.StringReader("hello");

let line1 = reader.ReadLine        // 間違っているがコンパイラは
                                   // 警告しない
printfn "The line is %s" line1     //ここでコンパイラエラー!
// ==> error FS0001: この式に必要な型は 'string' ですが、
// ここでは次の型が指定されています 'unit -> string'

let line2 = reader.ReadLine()      //正しい
printfn "The line is %s" line2     //コンパイラエラーなし 
```

上記のコードで、 `line1` は期待していた文字列ではなく、 `Readline` メソッドへのポインタまたはデリゲートになっています。 `reader.ReadLine()` での `()` の使用が実際に関数を実行しています。

## パラメータが多すぎる場合

パラメータが多すぎる場合も、同様に分かりにくいメッセージが表示される可能性があります。printf に多すぎるパラメータを渡す例をいくつか見てみましょう。

```fsharp
printfn "hello" 42
// ==> error FS0001: この式に必要な型は ''a -> 'b' ですが、
//                   ここでは次の型が指定されています 'unit'

printfn "hello %i" 42 43
// ==> error FS0001: 型が一致しません。 ''a -> 'b -> 'c'' という指定が必要ですが、
//                   ''a -> unit' が指定されました。

printfn "hello %i %i" 42 43 44
// ==> error FS0001: 型が一致しません。 ''a -> 'b -> 'c -> 'd' という指定が必要ですが、
//                   ''a -> 'b -> unit' が指定されました。
```

最後の例を詳しく見てみましょう。コンパイラは書式引数が3つのパラメータを持つことを予想しています。シグネチャ `'a -> 'b -> 'c -> 'd` は3つのパラメータを持つことを示しています。しかし、実際には2つのパラメータしか与えられていません（シグネチャ `'a -> 'b -> unit` は2つのパラメータを持つことを示しています）。

printf を使用しないケースでは、多すぎるパラメータを渡すと別の問題が発生します。単純な値を得た後、さらにその値にパラメータを渡そうとすることになるのです。この場合、コンパイラはその単純な値が関数ではないと警告します。

```fsharp
let add1 x = x + 1
let x = add1 2 3
// ==>   error FS0003: この値は関数ではないため、適用できません。
```

何が起こっているかをより明確にするために、この呼び出しを一連の明示的な中間関数に分解してみましょう。

```fsharp
let add1 x = x + 1
let intermediateFn = add1 2   //単純な値を返す
let x = intermediateFn 3      //intermediateFn は関数ではない！
// ==>   error FS0003: この値は関数ではないため、適用できません。
```
