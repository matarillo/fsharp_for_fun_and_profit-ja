---
layout: page
title: "Troubleshooting F#"
description: "Why won't my code compile?"
nav: troubleshooting-fsharp
hasComments: 1
---

「コンパイルできれば正しい」という言葉がありますが、コードをコンパイルすること自体が非常に困難な場合があります！そこで、このページではF#コードのトラブルシューティングを支援することに焦点を当てています。

まず、トラブルシューティングに関する一般的なアドバイスと、初心者がよく犯す最も一般的なエラーについて説明します。その後、一般的なエラーメッセージそれぞれについて詳しく説明し、それらがどのように発生するか、そしてどのように修正するかの例を示します。

[(エラー番号へジャンプ)](#NumericErrors)

## トラブルシューティングの一般的なガイドライン ##

最も重要なことは、F#がどのように機能するかを正確に理解するために時間と労力を費やすことです。特に、関数と型システムに関わる中核的な概念について理解することが大切です。ですので、「[関数型思考](../series/thinking-functionally.md)」と「[F#の型を理解する](../series/understanding-fsharp-types.md)」のシリーズを何度も読み返し、例を試し、本格的なコーディングを始める前にこれらのアイデアに慣れてください。関数と型の仕組みを理解していないと、コンパイラエラーが全く意味をなさないものになってしまいます。

C#のような命令型言語から来た場合、デバッガーに頼って不正確なコードを見つけて修正するという悪習慣を身につけている可能性があります。F#では、コンパイラがより厳格であるため、そこまで到達しないかもしれません。もちろん、コンパイラを「デバッグ」してその処理をステップ実行するツールはありません。コンパイラエラーをデバッグするための最良のツールは頭脳であり、F#はそれを使うことを強制します！

それでも、初心者がよく犯す一連の非常に一般的なエラーがあります。ここでそれらを簡単に説明します。

### 関数を呼び出す際にかっこを使用しない ###

F#では、空白文字が関数パラメータの標準的な区切り文字です。かっこを使用する必要はほとんどなく、特に関数を呼び出す際にはかっこを使用しないでください。

```
let add x y = x + y
let result = add (1 2)  //間違い
    // error FS0003: この値は関数ではないため、適用できません
let result = add 1 2    //正しい
```

### タプルと複数のパラメータを混同しない ###

カンマがある場合、それはタプルです。そして、タプルは2つのオブジェクトではなく1つのオブジェクトです。そのため、間違った型のパラメータを渡している、あるいはパラメータが少なすぎるというエラーが発生します。

```
addTwoParams (1,2)  // 2つの引数の代わりに1つのタプルを渡そうとしている
   // error FS0001: この式に必要な型は 'int' ですが、
   //               ここでは次の型が指定されています 'int * int' 
```

コンパイラは`(1,2)`をタプルとして扱い、それを `addTwoParams` に渡そうとします。そして、`addTwoParams`の最初のパラメータがint型であるのに対し、タプルを渡そうとしているとクレームをつけます。

*1つの*タプルを期待する関数に*2つの*引数を渡そうとすると、別の分かりにくいエラーが発生します。

```
addTuple 1 2   // 1つのタプルの代わりに2つの引数を渡そうとしている
  // error FS0003: この値は関数ではないため、適用できません。
```
  
### 引数が少なすぎたり多すぎたりしないよう注意する ###

F#コンパイラは、関数に渡す引数が少なすぎても文句を言いません（実際、「部分適用」は重要な機能です）。しかし、何が起こっているのか理解していないと、後で奇妙な「型の不一致」エラーがよく発生します。

同様に、引数が多すぎる場合のエラーは、通常、より直接的なエラーではなく「この値は関数ではありません」となります。

`printf` ファミリーの関数は、この点で非常に厳格です。引数の数は正確でなければなりません。

これは非常に重要なトピックです。部分適用がどのように機能するかを理解することが重要です。詳細な議論については、「[関数型思考](../series/thinking-functionally.md)」シリーズを参照してください。

### リストの区切り文字にはセミコロンを使用する ###

F#が明示的な区切り文字を必要とする数少ない場所（リストやレコードなど）では、セミコロンが使用されます。カンマは決して使用されません。（繰り返しになりますが、カンマはタプル用であることを思い出してください）。

```
let list1 = [1,2,3]    // 間違い！ これは3要素のタプルを含む
                       // 1要素のリストです
let list1 = [1;2;3]    // 正しい

type Customer = {Name:string, Address: string}  // 間違い
type Customer = {Name:string; Address: string}  // 正しい
```

### !をNOTとして、!=を不等号として使用しない ###

感嘆符記号は "NOT" 演算子ではありません。可変参照の参照解除演算子です。誤って使用すると、次のエラーが発生します：

```
let y = true
let z = !y
// error FS0001: この式に必要な型は ''a ref' ですが、
//               ここでは次の型が指定されています 'bool'
//               '!' 演算子は ref セルの逆参照に使用されます。
//               ここに 'not expr' を使用することをご検討ください。
```

正しい構文は、 `not` キーワードを使用することです。C構文ではなく、SQLやVB構文を思い浮かべてください。

```
let y = true
let z = not y       //正しい
```

そして、「等しくない」には、SQLやVBと同様に `<>` を使用します。

```
let z = 1 <> 2      //正しい
```

### 代入に = を使用しない ###

可変値を使用する場合、代入操作は `<-` と記述します。等号記号を使用すると、エラーが発生しないかもしれませんが、予期しない結果になる可能性があります。

```
let mutable x = 1
x = x + 1          // falseを返します。xはx+1と等しくありません
x <- x + 1         // x+1をxに代入します
```

### 隠れたタブ文字に注意する ###

インデントのルールは非常に簡単で、すぐに慣れることができます。ただし、タブは使用できず、スペースのみを使用する必要があります。

```
let add x y = 	
{tab}	x + y   
// => error FS1161: F# コードにタブを使用するには、#indent "off" オプションを使用する必要があります
```

エディタでタブをスペースに変換するように設定してください。また、他の場所からコードを貼り付ける場合は注意が必要です。コードの一部で執拗に問題が発生し続ける場合は、空白を削除して再度追加してみてください。

### 単純な値を関数値と間違えない ###

関数ポインタやデリゲートを作成しようとしている場合、既に評価済みの単純な値を誤って作成しないように注意してください。

再利用可能なパラメータなしの関数が必要な場合は、明示的にunitパラメータを渡すか、ラムダとして定義する必要があります。

```
let reader = new System.IO.StringReader("hello")
let nextLineFn   =  reader.ReadLine()  //間違い
let nextLineFn() =  reader.ReadLine()  //正しい
let nextLineFn   =  fun() -> reader.ReadLine()  //正しい

let r = new System.Random()
let randomFn   =  r.Next()  //間違い
let randomFn() =  r.Next()  //正しい
let randomFn   =  fun () -> r.Next()  //正しい
```

パラメータなしの関数についての詳細な議論は、「[関数型思考](../series/thinking-functionally.md)」シリーズを参照してください。

### 「情報が不足している」エラーのトラブルシューティングのヒント ###

F#コンパイラは現在、左から右への1パスコンパイラであるため、まだ解析されていないプログラムの後半にある型情報はコンパイラにとって利用できません。

これにより、「[FS0072: 不確定な型のオブジェクトの検索](#FS0072)」や「[FS0041: 一意のオーバーロードを決定できませんでした](#FS0041)」などの多くのエラーが発生する可能性があります。これらの特定のケースに対する推奨される修正方法は以下で説明されていますが、コンパイラが型の不足や情報不足を訴えている場合に役立つ一般的な原則がいくつかあります。これらのガイドラインは以下の通りです：

* 使用する前に定義する（これには、ファイルが正しい順序でコンパイルされていることを確認することも含まれます）
* 「既知の型」を持つものを「未知の型」を持つものより先に配置する。特に、パイプや類似の連鎖関数を、型付けされたオブジェクトが先に来るように並べ替えることができるかもしれません。
* 必要に応じて型注釈を行う。一般的なテクニックとして、すべてが機能するまで型注釈を追加し、その後、必要最小限になるまで1つずつ取り除いていくというものがあります。

可能であれば、型注釈を避けるようにしてください。見た目が良くないだけでなく、コードをより脆弱にします。明示的な依存関係がない方が、型の変更がはるかに容易になります。

<a id="NumericErrors"></a>
<div class="page-header">
	<h1>F# コンパイラエラー</h1>
	<p class="subtitle">よくあるエラーの一覧 (エラー番号順)</p>
</div>

これは、文書化に値すると思われる主要なエラーの一覧です。明らかなエラーは文書化せず、初心者にとってはわかりにくいと思われるものだけを扱います。

今後もリストに追加していく予定であり、追加すべき項目についての提案を歓迎します。

* [FS0001: この式に必要な型は 'X' ですが、ここでは次の型が指定されています 'Y'](#FS0001)
* [FS0003: この値は関数ではないため、適用できません。](#FS0003)
* [FS0008: This runtime coercion or type test involves an indeterminate type](#FS0008)
* [FS0010: Unexpected identifier in binding](#FS0010a)
* [FS0010: Incomplete structured construct](#FS0010b)
* [FS0013: The static coercion from type X to Y involves an indeterminate type](#FS0013)
* [FS0020: This expression should have type 'unit'](#FS0020)
* [FS0030: Value restriction](#FS0030)
* [FS0035: This construct is deprecated](#FS0035)
* [FS0039: The field, constructor or member X is not defined](#FS0039)
* [FS0041: A unique overload for could not be determined](#FS0041)
* [FS0049: Uppercase variable identifiers should not generally be used in patterns](#FS0049)
* [FS0072: Lookup on object of indeterminate type](#FS0072)
* [FS0588: Block following this 'let' is unfinished](#FS0588)
	
<a 「d="FS0001"></a>
## FS0001: この式に必要な型は 'X' ですが、ここでは次の型が指定されています 'Y' ##

これはおそらく最も遭遇するエラーでしょう。さまざまな状況で発生するため、最も一般的な問題を例と解決方法と共にまとめています。エラーメッセージには通常、問題が何であるかが明示的に記載されているため、注意してください。

<table class="table table-striped table-bordered table-condensed">
<thead>
  <tr>
	<th>エラーメッセージ</th>
	<th>考えられる原因</th>
  </tr>
</thead>
<tbody>
  <tr>
	<td>この式に必要な型は 'float' ですが、ここでは次の型が指定されています 'int'</td>
	<td><a href="#FS0001A">A. int と float は混合できない</a></td>
  </tr>
  <tr>
	<td>型 'int' には必要な (実数または組み込み) メンバー 'DivideByInt' がないため、'X' ではサポートされません</td>
	<td><a href="#FS0001A">A. int と float は混合できない</a></td>
  </tr>
  <tr>
	<td>型 'X' は、型 byte,int16,int32, ... のいずれとも互換性がありません</td>
	<td><a href="#FS0001B">B. 間違った数値型を使用している</a></td>
  </tr>
  <tr>
	<td>型 (関数型) は型 (単純な型) と一致しません 注意: 関数型には矢印が含まれており、例えば <code>'a -> 'b</code> のような形式になります。</td>
	<td><a href="#FS0001C">C. 関数に引数を渡しすぎている</a></td>
  </tr>
  <tr>
	<td>この式に必要な型は (関数型) ですが、ここでは次の型が指定されています (単純な型)</td>
	<td><a href="#FS0001C">C. 関数に引数を渡しすぎている</a></td>
  </tr>
  <tr>
	<td>型が一致しません。 (N項の関数) という指定が必要ですが、(N-1項の関数) が指定されました。</td>
	<td><a href="#FS0001C">C. 関数に引数を渡しすぎている</a></td>
  </tr>
  <tr>
	<td>この式に必要な型は (単純な型) ですが、ここでは次の型が指定されています (関数型)</td>
	<td><a href="#FS0001D">D. 関数への引数が足りない</a></td>
  </tr>
  <tr>
	<td>この式に必要な型は (型) ですが、ここでは次の型が指定されています (別の型)</td>
	<td><a href="#FS0001E">E. 単純な型の不一致</a><br>
	<a href="#FS0001F">F. 分岐やマッチでの返り値の型の不一致</a><br>
	<a href="#FS0001G">G. 関数内で起こる型推論の影響に注意</a><br>
	</td>
  </tr>
  <tr>
	<td>型が一致しません。 (単純な型) という指定が必要ですが、(タプル型) が指定されました。 注意: タプル型には星が含まれており、例えば <code>'a * 'b</code> のような形式になります。</td>
	<td><a href="#FS0001H">H. スペースやセミコロンではなくカンマを使ってしまっていませんか？</a></td>
  </tr>
  <tr>
	<td>型が一致しません。 (タプル型) という指定が必要ですが、(別のタプル型) が指定されました。</td>
	<td><a href="#FS0001I">I. タプルの比較やパターンマッチングには同じ型が必要</a></td>
  </tr>
  <tr>
	<td>この式に必要な型は ''a ref' ですが、ここでは次の型が指定されています 'X'</td>
	<td><a href="#FS0001J">J. "not" 演算子として ! を使用しない</a></td>
  </tr>
  <tr>
	<td>型 (型) は型 (別の型) と一致しません</td>
	<td><a href="#FS0001K">K. 演算子の優先順位（特に関数とパイプ）</a></td>
  </tr>
  <tr>
	<td>この式に必要な型は (モナド型) ですが、ここでは次の型が指定されています ''b * 'c''</td>
	<td><a href="#FS0001L">L. コンピュテーション式における let! エラー</a></td>
  </tr>
</tbody>
</table>

<a id="FS0001A"></a>
### A. int と float は混合できない ###

C# やほとんどの命令型言語とは異なり、F# では int と float を式の中で混用できません。次のようにしようとすると、型エラーが発生します。

```
1 + 2.0  //間違い
   // => error FS0001: この式に必要な型は 'float' ですが、ここでは次の型が指定されています 'int'
```
   
解決方法は、まず int を `float` にキャストすることです。

```
float 1 + 2.0  //正しい
```

この問題は、ライブラリ関数や他の場所でも発生する可能性があります。たとえば、int のリストに対して `average` を適用することはできません。

```
[1..10] |> List.average   // 間違い
   // => error FS0001: 型 'int' には必要な (実数または組み込み) メンバー 'DivideByInt' がないため、
   //    'List.average' ではサポートされません
```
   
以下のように、最初に各 int を float にキャストする必要があります。

```
[1..10] |> List.map float |> List.average  //正しい 
[1..10] |> List.averageBy float  //正しい (averageByを使う)
```

<a id="FS0001B"></a>
### B. 間違った数値型を使用している ###

数値キャストが失敗すると、「互換性がありません」というエラーが発生します。

```
printfn "hello %i" 1.0  // float ではなく int でなければならない
  // error FS0001: 型 'float' は、printf 形式の書式指定文字列の使用によって生じる型 
  //               byte,int16,int32,... のいずれとも互換性がありません
```

もし問題なければ、キャストするという方法が考えられます。

```
printfn "hello %i" (int 1.0)
```

<a id="FS0001C"></a>
### C. 関数に引数を渡しすぎている ###

```
let add x y = x + y
let result = add 1 2 3
// ==> error FS0001: 型 ''a -> 'b' は型 'int' と一致しません
```

エラーメッセージにヒントが隠れています。

解決方法は、引数を 1 つ削除することです!

`printf` に引数を渡しすぎることでも同様のエラーが発生します。

```
printfn "hello" 42
// ==> error FS0001: この式に必要な型は ''a -> 'b' 
//                   ですが、ここでは次の型が指定されています 'unit'

printfn "hello %i" 42 43
// ==> Error FS0001: 型が一致しません。 ''a -> 'b -> 'c' という指定が必要ですが、
//                   ''a -> unit' が指定されました。型 ''a -> 'b' は型 'unit' と一致しません

printfn "hello %i %i" 42 43 44
// ==> Error FS0001: 型が一致しません。 ''a -> 'b -> 'c -> 'd' という指定が必要ですが、
//                   ''a -> 'b -> unit' が指定されました。型 ''a -> 'b' は型 'unit' と一致しません
```

<a id="FS0001D"></a>
### D. 関数への引数が足りない ###

関数を呼び出すときに、必要な引数が足りないと、部分適用と呼ばれる状態になります。
この部分適用を後で使うと、単純な型ではないためエラーが発生します。

```
let reader = new System.IO.StringReader("hello");

let line = reader.ReadLine        //間違いだが、コンパイラーは文句を言わない
printfn "The line is %s" line     //ここでコンパイラー・エラー!
// ==> error FS0001: この式に必要な型は 'string'
//                   ですが、ここでは次の型が指定されています 'unit -> string'
```

これは、上で見た `ReadLine` のような、`unit` パラメータを必要とする一部の .NET ライブラリ関数でよく発生します。

解決方法は、正しい数の引数を渡すことです。結果の値の型が実際に単純な型であることを確認するために、型を確認してください。
`ReadLine` の場合は、`()` という引数を渡すことで解決します。

```
let line = reader.ReadLine()      //正しい
printfn "The line is %s" line     //コンパイラー・エラーなし 
```

<a id="FS0001E"></a>
### E. 単純な型の不一致 ###

最も単純なケースは、型が間違っているか、print のフォーマット文字列で間違った型を使っていることです。

```
printfn "hello %s" 1.0
// => error FS0001: この式に必要な型は 'string'
//                  ですが、ここでは次の型が指定されています 'float'
```

<a id="FS0001F"></a>
### F. 分岐やマッチでの返り値の型の不一致 ###

よくある間違いとして、分岐やマッチ式がある場合、各分岐は必ず同じ型を返さなければなりません。そうでないと、型エラーが発生します。

```
let f x = 
  if x > 1 then "hello"
  else 42
// => error FS0001: if' 式のすべてのブランチは、最初のブランチの型 (ここでは 'string') 
//                  に暗黙的に変換可能な値を返す必要があります。このブランチの返す値の型は 'int' です。
```

```
let g x = 
  match x with
  | 1 -> "hello"
  | _ -> 42
// error FS0001: パターン マッチ式のすべてのブランチは、最初のブランチの型 (ここでは 'string') 
//               に暗黙的に変換可能な値を返す必要があります。このブランチが返す値の型は 'int' です。
```

当然、最も簡単な解決方法は、各分岐が同じ型を返すようにすることです。

```
let f x = 
  if x > 1 then "hello"
  else "42"
  
let g x = 
  match x with
  | 1 -> "hello"
  | _ -> "42"
```

"else" ブランチがない場合、`unit` を返すものとみなされるので、"true" ブランチも `unit` を返すようにする必要があります。

```
let f x = 
  if x > 1 then "hello"
// error FS0001: 'if' 式に 'else' ブランチがありません。'then' ブランチは型 'string' です。
//               'if' はステートメ ントではなく式であるため、
//               同じ型の値を返す 'else' ブランチを追加してください。
```

両方の分岐が同じ型を返せない場合は、両方の型を保持できる新しい共用体型を作成する必要があるかもしれません。

```
type StringOrInt = | S of string | I of int  // 新しい共用体型
let f x = 
  if x > 1 then S "hello"
  else I 42
```

<a id="FS0001G"></a>  
### G. 関数内で起こる型推論の影響に注意

ある関数が、コード全体に波及する予期しない型推論を引き起こすことがあります。 
例えば、以下のコードでは、一見無害な print のフォーマット文字列によって、 `doSomething` 関数が文字列を受け取ると型推論させてしまっています。

```
let doSomething x = 
   // 何らかの処理を行う
   printfn "x is %s" x
   // さらに何らかの処理を行う

doSomething 1
// => error FS0001: この式に必要な型は 'string' 
//    ですが、ここでは次の型が指定されています 'int'
```

修正方法は、関数シグネチャを確認して、問題の根源を見つけるまで掘り下げることです。また、可能な限り汎用的な型を使い、型注釈は必要なければ避けるようにしましょう。

<a id="FS0001H"></a>  
### H. スペースやセミコロンではなくカンマを使ってしまっていませんか？ ###

F# 初心者によくあるミスとして、関数引数を区切る際に、スペースやセミコロンの代わりにカンマを誤って使ってしまうことが挙げられます。

```
// 2つの引数を取る関数定義
let add x y = x + 1

add(x,y)   // FS0001: この式に必要な型は 'int'
           // ですが、ここでは次の型が指定されています ''a * 'b'
```

修正方法: カンマを使わないようにしましょう！

```
add x y    // OK
```

ただし、カンマが使用されるケースが 1 つあります。それは .NET ライブラリ関数を呼ぶときです。
これらの関数はすべてタプルを引数として取るため、カンマを使う形式が正しいのです。
実際、C# から呼び出す場合と同じ見た目になります。

```
// 正しい
System.String.Compare("a","b")

// 正しくない
System.String.Compare "a" "b"
```

  
<a id="FS0001I"></a>  
### I. タプルの比較やパターンマッチングには同じ型が必要 ###

異なる型のタプルは比較できません。 `int * int` 型のタプルと `int * string` 型のタプルを比較しようとすると、エラーが発生します。

```
let  t1 = (0, 1)
let  t2 = (0, "hello")
t1 = t2
// => error FS0001: 型が一致しません。 'int * int'
//    という指定が必要ですが、 'int * string'
//    が指定されました。型 'int' は型 'string' と一致しません
```

また、長さも同じである必要があります。

```
let  t1 = (0, 1)
let  t2 = (0, 1, "hello")
t1 = t2
// => error FS0001: 型が一致しません。型の長さ 2 のタプルが必要です int * int
//    ただし、型の長さ 3 のタプルが指定された場合 int * int * string
```

バインディングにおけるタプルのパターンマッチングでも同様の問題が発生する可能性があります。

```
let x,y = 1,2,3
// => error FS0001: 型が一致しません。型の長さ 2 のタプルが必要です 'a * 'b  
//                  ただし、型の長さ 3 のタプルが指定された場合 int * int * int

let f (x,y) = x + y
let z = (1,"hello")
let result = f z
// => error FS0001: 型が一致しません。 'int * int'
//                  という指定が必要ですが、'int * string'
//                  が指定されました。型 'int' は型 'string' と一致しません
```



<a id="FS0001J"></a>  
### J. "not" 演算子として ! を使用しない ###

`!` を "not" 演算子として使用すると、 "ref" という単語を含む型エラーが発生します。

```
let y = true
let z = !y     //間違い
// => error FS0001: この式に必要な型は ''a ref' ですが、ここでは次の型が指定されています 'bool'
//    '!' 演算子は ref セルの逆参照に使用されます。ここに 'not expr' を使用することをご検討ください。 
```

解決策は、代わりに "not" キーワードを使用することです。

```
let y = true
let z = not y   //正しい
```


<a id="FS0001K"></a>  
### K. 演算子の優先順位（特に関数とパイプ） ###

演算子の優先順位を間違えると、型エラーが発生する可能性があります。一般に、関数適用は他の演算子と比較して最も優先順位が高いため、以下のようなケースでエラーが発生します。

```
String.length "hello" + "world"
   // => error FS0001:  型 'string' は型 'int' と一致しません

// 実際に起こっていること
(String.length "hello") + "world"  
```

解決策はかっこを使用することです。

```
String.length ("hello" + "world")  // 訂正された
```

逆に、パイプ演算子は他の演算子と比較して優先順位が低くなります。

```
let result = 42 + [1..10] |> List.sum
 // => => error FS0001:  型 ''a list' は型 'int' と一致しません

// 実際に起こっていること
let result = (42 + [1..10]) |> List.sum  
```

ここでも、解決策はかっこを使用することです。

```
let result = 42 + ([1..10] |> List.sum)
```


<a id="FS0001L"></a>  
### L. コンピュテーション式（モナド）における let! エラー ###

以下は簡単なコンピュテーション式です。

```
type Wrapper<'a> = Wrapped of 'a

type wrapBuilder() = 
    member this.Bind (wrapper:Wrapper<'a>) (func:'a->Wrapper<'b>) = 
        match wrapper with
        | Wrapped(innerThing) -> func innerThing

    member this.Return innerThing = 
        Wrapped(innerThing) 
        
let wrap = new wrapBuilder()
```

しかし、これを使用しようとするとエラーが発生します。

```
wrap {
    let! x1 = Wrapped(1)   // <== ここでエラー
    let! y1 = Wrapped(2)
    let z1 = x + y
    return z
    }
// error FS0001: この式に必要な型は 'Wrapper<'a>' ですが、ここでは次の型が指定されています
//               'Wrapper<int> * ('b -> ('c -> Wrapper<'d>) -> Wrapper<'d>)'
```

理由は、 `Bind` が2つのパラメータではなく、タプル `(wrapper,func)` を期待しているためです。（F#のドキュメントでbindのシグネチャを確認してください）。

解決策は、 bind 関数を変更して、（単一の）パラメータとしてタプルを受け取るようにすることです。

```
type wrapBuilder() = 
    member this.Bind (wrapper:Wrapper<'a>, func:'a->Wrapper<'b>) = 
        match wrapper with
        | Wrapped(innerThing) -> func innerThing
```

<a id="FS0003"></a>
## FS0003: この値は関数ではないため、適用できません。 ##

This error typically occurs when passing too many arguments to a function.

```
let add1 x = x + 1
let x = add1 2 3
// ==>   error FS0003: この値は関数ではないため、適用できません。
```

It can also occur when you do operator overloading, but the operators cannot be used as prefix or infix.

```
let (!!) x y = x + y
(!!) 1 2              // ok
1 !! 2                // failed !! cannot be used as an infix operator
// error FS0003: この値は関数ではないため、適用できません。
```

<a id="FS0008"></a>
## FS0008: This runtime coercion or type test involves an indeterminate type ##

You will often see this when attempting to use "`:?`" operator to match on a type.

```
let detectType v =
    match v with
        | :? int -> printfn "this is an int"
        | _ -> printfn "something else"
// error FS0008: This runtime coercion or type test from type 'a to int    
// involves an indeterminate type based on information prior to this program point. 
// Runtime type tests are not allowed on some types. Further type annotations are needed.
```

The message tells you the problem: "runtime type tests are not allowed on some types".  

The answer is to "box" the value which forces it into a reference type, and then you can type check it:

```
let detectTypeBoxed v =
    match box v with      // used "box v" 
        | :? int -> printfn "this is an int"
        | _ -> printfn "something else"

//test
detectTypeBoxed 1
detectTypeBoxed 3.14
```

<a id="FS0010a"></a>
## FS0010: Unexpected identifier in binding ##

Typically caused by breaking the "offside" rule for aligning expressions in a block.

```
//3456789
let f = 
  let x=1     // offside line is at column 3 
   x+1        // oops! don't start at column 4
              // error FS0010: Unexpected identifier in binding
```
         
The fix is to align the code correctly!

See also [FS0588: Block following this 'let' is unfinished](#FS0588) for another issue caused by alignment.
 
<a id="FS0010b"></a>
## FS0010: Incomplete structured construct ##

Often occurs if you are missing parentheses from a class constructor:

```
type Something() =
   let field = ()

let x1 = new Something     // Error FS0010 
let x2 = new Something()   // OK!
```

Can also occur if you forgot to put parentheses around an operator:

```
// define new operator
let (|+) a = -a

|+ 1    // error FS0010: 
        // Unexpected infix operator

(|+) 1  // with parentheses -- OK!
```

Can also occur if you are missing one side of an infix operator:

```
|| true  // error FS0010: Unexpected symbol '||'
false || true  // OK
```

Can also occur if you attempt to send a namespace definition to F# interactive. The interactive console does not allow namespaces.

```
namespace Customer  // FS0010: Incomplete structured construct 

// declare a type
type Person= {First:string; Last:string}
```

<a id="FS0013"></a>
## FS0013: The static coercion from type X to Y involves an indeterminate type ##

This is generally caused by implic

<a id="FS0020"></a>
## FS0020: This expression should have type 'unit' ##

This error is commonly found in two situations:

* Expressions that are not the last expression in the block
* Using wrong assignment operator

### FS0020 with expressions that are not the last expression in the block ###

Only the last expression in a block can return a value. All others must return unit. So this typically occurs when you have a function in a place that is not the last function. 

```
let something = 
  2+2               // => FS0020: This expression should have type 'unit'
  "hello"
```

The easy fix is use `ignore`.  But ask yourself why you are using a function and then throwing away the answer ? it might be a bug.

```
let something = 
  2+2 |> ignore     // ok
  "hello"
```

This also occurs if you think you writing C# and you accidentally use semicolons to separate expressions:

```
// 間違い
let result = 2+2; "hello";

// fixed
let result = 2+2 |> ignore; "hello";
```

### FS0020 with assignment ###

Another variant of this error occurs when assigning to a property.

    This expression should have type 'unit', but has type 'Y'. 

With this error, chances are you have confused the assignment operator "`<-`" for mutable values, with the equality comparison operator "`=`".

```
// '=' versus '<-'
let add() =
    let mutable x = 1
    x = x + 1          // warning FS0020
    printfn "%d" x    
```

The fix is to use the proper assignment operator.

```
// fixed
let add() =
    let mutable x = 1
    x <- x + 1
    printfn "%d" x
```

<a id="FS0030"></a>	
## FS0030: Value restriction ##

This is related to F#'s automatic generalization to generic types whenever possible. 

For example, given :

```
let id x = x
let compose f g x = g (f x)
let opt = None
```

F#'s type inference will cleverly figure out the generic types.

```
val id : 'a -> 'a
val compose : ('a -> 'b) -> ('b -> 'c) -> 'a -> 'c
val opt : 'a option
```

However in some cases, the F# compiler feels that the code is ambiguous, and, even though it looks like it is guessing the type correctly, it needs you to be more specific:

```
let idMap = List.map id             // error FS0030
let blankConcat = String.concat ""  // error FS0030
```

Almost always this will be caused by trying to define a partially applied function, and almost always, the easiest fix is to explicitly add the missing parameter: 

```
let idMap list = List.map id list             // OK
let blankConcat list = String.concat "" list  // OK
```

For more details see the MSDN article on ["automatic generalization"](http://msdn.microsoft.com/en-us/library/dd233183%28v=VS.100%29.aspx).

<a id="FS0035"></a>	
## FS0035: This construct is deprecated ##

F# syntax has been cleaned up over the last few years, so if you are using examples from an older F# book or webpage, you may run into this.  See the MSDN documentation for the correct syntax.

```
let x = 10
let rnd1 = System.Random x         // Good
let rnd2 = new System.Random(x)    // Good
let rnd3 = new System.Random x     // error FS0035
```

<a id="FS0039"></a>	
## FS0039: The field, constructor or member X is not defined ##

This error is commonly found in four situations:

* The obvious case where something really isn't defined! And make sure that you don't have a typo or case mismatch either.
* Interfaces
* Recursion
* Extension methods

### FS0039 with interfaces ###

In F# all interfaces are "explicit" implementations rather than "implicit". (Read the C# documentation on ["explicit interface implementation"](http://msdn.microsoft.com/en-us/library/aa288461%28v=vs.71%29.aspx) for an explanation of the difference). 

The key point is that when a interface member is explicitly implemented, it cannot be accessed through a normal class instance, but only through an instance of the interface, so you have to cast to the interface type by using the `:>` operator.

Here's an example of a class that implements an interface:

```
type MyResource() = 
   interface System.IDisposable with
       member this.Dispose() = printfn "disposed"
```

This doesn't work:

```
let x = new MyResource()
x.Dispose()  // error FS0039: The field, constructor 
             // or member 'Dispose' is not defined
```

The fix is to cast the object to the interface, as below:

```
// fixed by casting to System.IDisposable 
(x :> System.IDisposable).Dispose()   // OK

let y =  new MyResource() :> System.IDisposable 
y.Dispose()   // OK
```


### FS0039 with recursion ###

Here's a standard Fibonacci implementation: 

```
let fib i = 
   match i with
   | 1 -> 1
   | 2 -> 1
   | n -> fib(n-1) + fib(n-2)
```

Unfortunately, this will not compile: 

    Error FS0039: The value or constructor 'fib' is not defined

The reason is that when the compiler sees 'fib' in the body, it doesn't know about the function because it hasn't finished compiling it yet!

The fix is to use the "`rec`" keyword.

```
let rec fib i = 
   match i with
   | 1 -> 1
   | 2 -> 1
   | n -> fib(n-1) + fib(n-2)
```

Note that this only applies to "`let`" functions. Member functions do not need this, because the scope rules are slightly different.

```
type FibHelper() =
    member this.fib i = 
       match i with
       | 1 -> 1
       | 2 -> 1
       | n -> fib(n-1) + fib(n-2)
```

### FS0039 with extension methods ###

If you have defined an extension method, you won't be able to use it unless the module is in scope.

Here's a simple extension to demonstrate:

```
module IntExtensions = 
    type System.Int32 with
        member this.IsEven = this % 2 = 0
```

If you try to use it the extension, you get the FS0039 error:

```
let i = 2
let result = i.IsEven  
    // FS0039: The field, constructor or 
    // member 'IsEven' is not defined
```
    
The fix is just to open the `IntExtensions` module.
    
```
open IntExtensions // bring module into scope
let i = 2
let result = i.IsEven  // fixed!
```

<a id="FS0041"></a>	
## FS0041: A unique overload for could not be determined ##

This can be caused when calling a .NET library function that has multiple overloads:

```
let streamReader filename = new System.IO.StreamReader(filename) // FS0041
```

There a number of ways to fix this. One way is to use an explicit type annotation:

```
let streamReader filename = new System.IO.StreamReader(filename:string) // OK
```

You can sometimes use a named parameter to avoid the type annotation:

```
let streamReader filename = new System.IO.StreamReader(path=filename) // OK
```

Or you can try to create intermediate objects that help the type inference, again without needing type annotations:

```
let streamReader filename = 
    let fileInfo = System.IO.FileInfo(filename)
    new System.IO.StreamReader(fileInfo.FullName) // OK
```
	
<a id="FS0049"></a>	
## FS0049: Uppercase variable identifiers should not generally be used in patterns ##

When pattern matching, be aware of a subtle difference between the pure F# union types which consist of a tag only, and a .NET Enum type.

Pure F# union type:

```
type ColorUnion = Red | Yellow 
let redUnion = Red  

match redUnion with
| Red -> printfn "red"     // no problem
| _ -> printfn "something else" 
```

But with .NET enums you must fully qualify them:

```
type ColorEnum = Green=0 | Blue=1      // enum 
let blueEnum = ColorEnum.Blue  

match blueEnum with
| Blue -> printfn "blue"     // warning FS0049
| _ -> printfn "something else" 
```

The fixed version:

```
match blueEnum with
| ColorEnum.Blue -> printfn "blue" 
| _ -> printfn "something else"
```

<a id="FS0072"></a>	
## FS0072: Lookup on object of indeterminate type ##

This occurs when "dotting into" an object whose type is unknown.

Consider the following example:

```
let stringLength x = x.Length // Error FS0072
```

The compiler does not know what type "x" is, and therefore does not know if "`Length`" is a valid method. 

There a number of ways to fix this. The crudest way is to provide an explicit type annotation:

```
let stringLength (x:string) = x.Length  // OK
```

In some cases though, judicious rearrangement of the code can help. For example, the example below looks like it should work. It's obvious to a human that the `List.map` function is being applied to a list of strings, so why does `x.Length` cause an error?

```
List.map (fun x -> x.Length) ["hello"; "world"] // Error FS0072      
```

The reason is that the F# compiler is currently a one-pass compiler, and so type information present later in the program cannot be used if it hasn't been parsed yet. 

Yes, you can always explicitly annotate:

```
List.map (fun x:string -> x.Length) ["hello"; "world"] // OK
```

But another, more elegant way that will often fix the problem is to rearrange things so the known types come first, and the compiler can digest them before it moves to the next clause.

```
["hello"; "world"] |> List.map (fun x -> x.Length)   // OK
```

It's good practice to avoid explicit type annotations, so this approach is best, if it is feasible.

<a id="FS0588"></a>	
## FS0588: Block following this 'let' is unfinished ##

Caused by outdenting an expression in a block, and thus breaking the "offside rule".

```
//3456789
let f = 
  let x=1    // offside line is at column 3 
 x+1         // offside! You are ahead of the ball!
             // error FS0588: Block following this 
             // 'let' is unfinished
```

The fix is to align the code correctly.

See also [FS0010: Unexpected identifier in binding](#FS0010a) for another issue caused by alignment.