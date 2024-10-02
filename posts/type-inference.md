---
layout: post
title: "型推論を理解する"
description: "魔法のカーテンの裏側"
nav: fsharp-types
seriesId: "F#の型を理解する"
seriesOrder: 12
categories: [型]
---

型の話を終える前に、型推論についてもう一度見てみましょう。型推論とは、どの型がどこで使われているかをF#コンパイラが推測する魔法のような機能です。これまでの例を通じて何度も目にしてきましたが、どのように動くのでしょうかか。うまくいかない場合はどうすればいいのでしょうか。

## 型推論の仕組み

まるで魔法のように見えますが、そのルールはほとんど単純明快です。基本的なロジックは、「Hindley-Milner」または「HM」というアルゴリズムに基づいています（より正確には「Damas-MilnerのアルゴリズムW」と呼ぶべきです）。詳しく知りたい場合は、ぜひ検索してみてください。

このアルゴリズムを理解して「コンパイラのように考える」ことができるようになると、問題が発生したときに効果的にトラブルシューティングできるようになるので、時間をかけて理解することをお勧めします。

単純な値や関数の型を決めるルールをいくつか紹介します。

* リテラルを見る
* その値が相互作用する関数や他の値を見る
* 明示的な型制約を見る
* どこにも制約がない場合は、自動的にジェネリック型に一般化する

これらを順番に見ていきましょう。

### リテラルを見る

リテラルはコンパイラにコンテキストのヒントを与えます。これまで見てきたように、型チェックは非常に厳密です。intとfloatは自動的に相互キャストされません。この利点は、コンパイラがリテラルを見ることで型を推論できることです。リテラルがintで、それに「x」を足しているなら、「x」もintでなければなりません。しかし、リテラルがfloatで、それに「x」を足しているなら、「x」もfloatでなければなりません。

いくつかの例を見てみましょう。これらをインタラクティブウィンドウで実行して、シグネチャを確認してください。

```fsharp
let inferInt x = x + 1
let inferFloat x = x + 1.0
let inferDecimal x = x + 1m     // mサフィックスはdecimalを意味します
let inferSByte x = x + 1y       // yサフィックスは符号付きバイトを意味します
let inferChar x = x + 'a'       // 文字
let inferString x = x + "my string"
```

### 相互作用する関数や他の値を見る

どこにもリテラルがない場合、コンパイラは相互作用する関数や他の値を分析して型を推論しようとします。以下の例では、 `inferIndirectXxx` 関数は型がわかっている関数を呼び出しています。これにより、 `inferIndirectXxx` 関数の型を推論する情報が得られます。

```fsharp
let inferInt x = x + 1
let inferIndirectInt x = inferInt x       // xがintだと推論します

let inferFloat x = x + 1.0
let inferIndirectFloat x = inferFloat x   // xがfloatだと推論します
```

もちろん、代入も相互作用とみなされます。 `x` が特定の型で、`y` が `x` に束縛（代入）されている場合、`y` は `x` と同じ型でなければなりません。

```fsharp
let x = 1
let y = x     // yもintだと推論します
```

他の相互作用には、制御構造や外部ライブラリがあります。

```fsharp
// if..elseはboolを意味します
let inferBool x = if x then false else true      
// for..doはシーケンスを意味します
let inferStringList x = for y in x do printfn "%s" y  
// ::はリストを意味します
let inferIntList x = 99x                      
// .NETライブラリメソッドは強く型付けされています
let inferStringAndBool x = System.String.IsNullOrEmpty(x)
```

### 明示的な型制約や注釈を見る

明示的な型制約や注釈が指定されている場合、コンパイラはそれらを使います。以下の例では、 `inferInt2` がint型のパラメータを取ることをコンパイラに明示的に伝えています。これにより、コンパイラは `inferInt2` の戻り値もintだと推論でき、さらに `inferIndirectInt2` が `int->int` 型だと推論できます。

```fsharp
let inferInt2 (x:int) = x 
let inferIndirectInt2 x = inferInt2 x 

let inferFloat2 (x:float) = x 
let inferIndirectFloat2 x = inferFloat2 x 
```

なお、 `printf` 文の書式指定子も明示的な型制約とみなされます。

```fsharp
let inferIntPrint x = printf "x is %i" x 
let inferFloatPrint x = printf "x is %f" x 
let inferGenericPrint x = printf "x is %A" x 
```

### 自動的な一般化

これらすべての後でも制約が見つからない場合、コンパイラは単に型をジェネリックにします。

```fsharp
let inferGeneric x = x 
let inferIndirectGeneric x = inferGeneric x 
let inferIndirectGenericAgain x = (inferIndirectGeneric x).ToString() 
```

### あらゆる方向に作用します

型推論はトップダウン、ボトムアップ、前から後ろ、後ろから前、中央から外側へ、型情報があるところならどこでも機能します。

次の例を考えてみましょう。内部関数にはリテラルがあるので、 `int` を返すことがわかります。そして外部関数は `string` を返すと明示的に指示されています。しかし、中間にある `action` 関数の型は何でしょうか。

```fsharp
let outerFn action : string =  
   let innerFn x = x + 1 // intを返すサブ関数を定義
   action (innerFn 2)    // actionをinnerFnに適用した結果
```

型推論は次のように進みます。

* `1` は `int` 型です
* したがって、 `x+1` は `int` 型でなければならず、 `x` も `int` 型でなければなりません
* したがって、 `innerFn` は `int->int` 型でなければなりません
* 次に、 `(innerFn 2)` は `int` を返すので、 `action` は `int` を入力として受け取ります
* `action` の出力は `outerFn` の戻り値なので、 `action` の出力型は `outerFn` の出力型と同じです
* `outerFn` の出力型は `string` 型に明示的に制約されているので、 `action` の出力型も `string` 型です
* これらをまとめると、 `action` 関数のシグネチャは `int->string` だとわかります
* 最後に、コンパイラは `outerFn` の型を次のように推論します。

```fsharp
val outerFn: (int -> string) -> string
```

### 初歩的なことだよ、ワトソン君！

コンパイラはシャーロック・ホームズに匹敵する推論を行うことができます。ここで、これまで学んだことをどれだけ理解したかをテストする難しい例を見てみましょう。

`doItTwice` という関数があるとします。この関数は任意の入力関数（ `f` と呼びましょう）を受け取り、元の関数を2回連続で実行する新しい関数を生成します。以下がそのコードです。

```fsharp
let doItTwice f  = (f >> f)
```

見てわかるように、これは `f` を自身と合成しています。つまり、「 `f` を実行」し、その結果に対してもう一度「 `f` を実行」するという意味です。

さて、コンパイラは `doItTwice` のシグネチャについて何を推論できるでしょうか？

まず、 `f` のシグネチャを見てみましょう。最初の `f` の呼び出しの出力は、2回目の `f` の呼び出しの入力でもあります。したがって、 `f` の出力と入力は同じ型でなければなりません。つまり、 `f` のシグネチャは `'a -> 'a` でなければなりません。型はジェネリック（ `'a` と書かれています）です。他の情報がないからです。

`doItTwice` に戻ると、今や `'a -> 'a` 型の関数パラメータを取ることがわかりました。しかし、何を返すのでしょうか。ここでは、段階的に推論してみましょう。

* まず、 `doItTwice` は関数を生成するので、関数型を返さなければなりません。
* 生成された関数の入力は、最初の `f` の呼び出しへの入力と同じ型です。
* 生成された関数の出力は、2回目の `f` の呼び出しの出力と同じ型です。
* したがって、生成された関数も `'a -> 'a` 型でなければなりません。
* すべてをまとめると、 `doItTwice` の定義域は `'a -> 'a` で、値域も `'a -> 'a` なので、シグネチャは `('a -> 'a) -> ('a -> 'a)` でなければなりません。

頭が混乱してきましたか？何度か読むと理解できるようになるかもしれません。

たった1行のコードに対して、かなり高度な推論ですね。幸いなことに、コンパイラがこれをすべて行ってくれます。しかし、問題が発生してコンパイラが何をしているのかを判断する必要がある場合は、このような推論を理解する必要があります。

テストしてみましょう！実際には、理論よりもはるかに理解しやすいです。

```fsharp
let doItTwice f  = (f >> f)

let add3 x = x + 3
let add6 = doItTwice add3
// テスト
add6 5             // 結果 = 11

let square x = x * x
let fourthPower = doItTwice square
// テスト
fourthPower 3      // 結果 = 81

let chittyBang x = "Chitty " + x + " Bang"
let chittyChittyBangBang = doItTwice chittyBang
// テスト
chittyChittyBangBang "&"      // 結果 = "Chitty Chitty & Bang Bang"
```

これで、より理解が深まったはずです。

## 型推論でうまくいかないこと

残念ながら、型推論は完璧ではありません。時々、コンパイラは何をすべきか全くわからなくなります。ここでも、何が起こっているかを理解することで、コンパイラを殺したくなるのではなく、冷静でいられるはずです。型エラーの主な理由は以下の通りです。

* 宣言の順序が間違っている
* 情報が不足している
* オーバーロードされたメソッド
* ジェネリックな数値関数の癖

### 宣言の順序が間違っている

基本的なルールとして、関数は使う前に宣言しなければなりません。

このコードは失敗します。

```fsharp
let square2 x = square x   // 失敗：squareが定義されていません
let square x = x * x
```

しかし、これは問題ありません。

```fsharp
let square x = x * x       
let square2 x = square x   // squareはすでに前で定義されています
```

そして、C#とは異なり、F#ではファイルのコンパイル順序が重要なので、ファイルが正しい順序でコンパイルされていることを確認してください（Visual Studioでは、コンテキストメニューから順序を変更できます）。

### 再帰的または同時宣言

「順序が間違っている」問題の変種として、再帰関数や互いに参照し合う定義の場合があります。この場合、どんなに順序を変えても解決しません。コンパイラを助けるための追加のキーワードが必要です。

関数がコンパイルされるとき、関数識別子は本体で使えません。そのため、単純な再帰関数を定義すると、コンパイラエラーが発生します。解決方法は、関数定義の一部として「rec」キーワードを追加することです。

```fsharp
// コンパイラは"fib"が何を意味するのかわかりません
let fib n =
   if n <= 2 then 1
   else fib (n - 1) + fib (n - 2)
   // error FS0039: 値またはコンストラクター 'fib' が定義されていません。s
```

以下は、「rec fib」を追加して修正したバージョンです。

```fsharp
let rec fib n =              // LETの代わりにLET REC
   if n <= 2 then 1
   else fib (n - 1) + fib (n - 2)
```

同様に、互いに参照し合う2つの関数には「let rec ? and」構文を使います。以下は、「rec」キーワードがないと失敗する非常に人為的な例です。

```fsharp
let rec showPositiveNumber x =               // LETの代わりにLET REC
   match x with 
   | x when x >= 0 -> printfn "%i is positive" x 
   | _ -> showNegativeNumber x

and showNegativeNumber x =                   // LETの代わりにAND

   match x with 
   | x when x < 0 -> printfn "%i is negative" x 
   | _ -> showPositiveNumber x
```

`and` キーワードは、同様の方法で同時に型を宣言するのにも使えます。

```fsharp
type A = None | AUsesB of B
   // error FS0039: 型 'B' が定義されていません。
type B = None | BUsesA of A
```

修正版は以下です。

```fsharp
type A = None | AUsesB of B
and B = None | BUsesA of A    // TYPEの代わりにANDを使う
```

### 情報が不足している

時々、コンパイラは型を決めるのに情報が足りないことがあります。次の例では、コンパイラは `Length` メソッドがどの型で動くべきかわかりません。かといって、ジェネリックにもできないので、エラーを報告します。

```fsharp
let stringLength s = s.Length
  // error FS0072: このプログラムの場所の前方にある情報に基づく
  // 不確定の型のオブジェクトに対する参照です。
  // 場合によっては、オブジェクトの型を制約する型の注釈がこのプログラムの場所の前に必要です。...
```

このようなエラーは、明示的な注釈で解決できます。

```fsharp
let stringLength (s:string) = s.Length
```

一見、十分な情報があるように見えても、コンパイラがそれを認識していないことがあります。たとえば、以下の `List.map` 関数が文字列のリストに適用されているのは人間には明らかですが、なぜ `x.Length` がエラーになるのでしょうか？

```fsharp
List.map (fun x -> x.Length) ["hello"; "world"]       // OKではありません
```

理由は、F#コンパイラが現在1パスのコンパイラであり、まだ解析されていないプログラムの後半の情報は無視されるからです。（F#チームは、コンパイラをより高度にすることは可能だと言っていますが、そうするとIntelliSenseとの相性が悪くなり、より不親切で理解しづらいエラーメッセージが生成される可能性があります。そのため、今のところは、この制限を受け入れる必要があります。）

このような場合は、常に明示的に注釈をつけることができます。

```fsharp
List.map (fun (x:string) -> x.Length) ["hello"; "world"]       // OK
```

しかし、よりエレガントに問題を解決できるのは、既知の型が先に来るようにコードを並べ替えることです。こうすることで、コンパイラは次の句に移る前に型を処理できます。

```fsharp
["hello"; "world"] |> List.map (fun s -> s.Length)   // OK
```

関数型プログラマーは明示的な型注釈を避けようと努めるものなので、この方がずっと望ましいでしょう！

このテクニックは他にも応用できます。経験則として、「既知の型」を持つものを「未知の型」を持つものより前に置くように心がけるとよいでしょう。

### オーバーロードされたメソッド

.NETの外部クラスやメソッドを呼び出す際、オーバーロードが原因でエラーが発生することがよくあります。

以下の `concat` の例のように、コンパイラがどのオーバーロードされたメソッドを呼び出すべきかわかるように、外部関数のパラメータを明示的に注釈しなければならないことがよくあります。

```fsharp
let concat x = System.String.Concat(x)           // 失敗
let concat (x:string) = System.String.Concat(x)  // 動きます
let concat x = System.String.Concat(x:string)    // 動きます
```

オーバーロードされたメソッドが異なる引数名を持つ場合、引数に名前を付けることでコンパイラにヒントを与えることもできます。以下は `StreamReader` コンストラクタの例です。

```fsharp
let makeStreamReader x = new System.IO.StreamReader(x)        // 失敗
let makeStreamReader x = new System.IO.StreamReader(path=x)   // 動きます
```

### ジェネリックな数値関数の癖

数値関数は少し紛らわしいことがあります。一見ジェネリックに見えますが、一度特定の数値型に束縛されると固定され、異なる数値型で使おうとするとエラーが発生します。次の例でこれを示します。

```fsharp
let myNumericFn x = x * x
myNumericFn 10
myNumericFn 10.0             // 失敗
  // error FS0001: この式に必要な型は 'int' ですが、
  // ここでは次の型が指定されています 'float'

let myNumericFn2 x = x * x
myNumericFn2 10.0     
myNumericFn2 10               // 失敗
  // error FS0001: この式に必要な型は 'float' ですが、
  // ここでは次の型が指定されています 'int'
```

数値型に関しては、「inline」キーワードと「静的型パラメータ」を使って回避する方法があります。ここではこれらの概念について詳しく説明しませんが、Micrsoft LearnのF#リファレンスで調べることができます。

<a name="troubleshooting-summary"></a>
## 「情報不足」のトラブルシューティングのまとめ

まとめると、型が欠落している、または情報が不足しているとコンパイラが文句を言っている場合にできることは以下の通りです。

* 使う前に定義する（これにはファイルが正しい順序でコンパイルされていることを確認することも含まれます）
* 「既知の型」を持つものを「未知の型」を持つものより前に置く。特に、パイプや同様の連鎖関数を並べ替えて、型付けされたオブジェクトが最初に来るようにできるかもしれません。
* 必要に応じて注釈を付ける。よく使われるテクニックの一つは、すべてが動くまで注釈を追加し、その後、必要最小限になるまで一つずつ取り除いていくことです。
可能な限り注釈を避けるようにしてください。見た目が良くないだけでなく、コードが壊れやすくなります。明示的な依存関係がない方が、型を変更するのがずっと簡単です。

## 型推論の問題をデバッグする

すべてを順序付けし注釈を付けた後でも、おそらくまだ型エラーが発生したり、関数が予想よりもジェネリックでないとわかることがあります。ここまで学んだことで、なぜこれが起こったのかを判断するためのツールを手に入れたはずです（それでもまだ苦労するかもしれませんが）。

たとえば、以下を見てください。

```fsharp
let myBottomLevelFn x = x

let myMidLevelFn x = 
   let y = myBottomLevelFn x
   // 何かの処理
   let z= y
   // 何かの処理
   printf "%s" z         // これがジェネリックな型を台無しにします！
   // さらに何かの処理
   x

let myTopLevelFn x =
   // 何かの処理
   myMidLevelFn x 
   // さらに何かの処理
   x
```

この例では、関数が連鎖しています。最下層の関数は間違いなくジェネリックですが、最上層の関数はどうでしょうか。ジェネリックであることを期待するかもしれませんが、実際にはそうではありません。この場合、次のようになります。

```fsharp
val myTopLevelFn : string -> string
```

何がうまくいかなかったのでしょうか。答えは中間レベルの関数にあります。 `%s` がzを文字列に強制したため、yとxも文字列に強制されてしまったのです。

これは非常に単純な例ですが、数千行のコードでは、問題を引き起こすたった1行が埋もれてしまう可能性があります。一つの解決方法は、すべてのシグネチャを見ることです。この場合、シグネチャは次のようになります。

```fsharp
val myBottomLevelFn : 'a -> 'a       // 予想通りジェネリック
val myMidLevelFn : string -> string  // ここがヒント！ジェネリックであるべき
val myTopLevelFn : string -> string
```

予期しないシグネチャを見つけたら、それが問題の原因だとわかります。そこから掘り下げて、問題が見つかるまでプロセスを繰り返すことができます。
