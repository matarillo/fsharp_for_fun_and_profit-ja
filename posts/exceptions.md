---
layout: post
title: "例外"
description: "スローとキャッチの構文"
nav: thinking-functionally
seriesId: "式と構文"
seriesOrder: 8
---

F#も他の.NET言語と同じく、例外のスローとキャッチをサポートしています。制御フロー式と同様に、構文は馴染みやすいものですが、いくつか注意すべき点があります。

## 独自の例外を定義する

例外を発生（スロー）させるとき、 `InvalidOperationException` のような標準的なシステム例外を使えます。また、以下のような簡単な構文で独自の例外型を定義できます。ここで、例外の「内容」は任意のF#型です。

```fsharp
exception MyFSharpError1 of string
exception MyFSharpError2 of string * int
```

これだけです！新しい例外クラスの定義はC#よりずっと簡単です！

## 例外をスローする

例外をスローする基本的な方法は3つあります。

* "invalidArg"のような組み込み関数を使う
* 標準の.NET例外クラスを使う
* 独自のカスタム例外型を使う

### 例外をスローする方法1：組み込み関数を使う

F#には4つの便利な例外キーワードが組み込まれています。

* `failwith` は汎用的な `System.Exception` をスローします
* `invalidArg` は `ArgumentException` をスローします
* `nullArg` は `NullArgumentException` をスローします
* `invalidOp` は `InvalidOperationException` をスローします

これら4つで、通常スローする例外のほとんどをカバーできるでしょう。使い方は以下の通りです。

```fsharp
// 汎用的なSystem.Exceptionをスローする
let f x = 
   if x then "ok"
   else failwith "メッセージ"
                    
// ArgumentExceptionをスローする
let f x = 
   if x then "ok"
   else invalidArg "パラメータ名" "メッセージ" 
  
// NullArgumentExceptionをスローする
let f x = 
   if x then "ok"
   else nullArg "パラメータ名" "メッセージ"   

// InvalidOperationExceptionをスローする
let f x = 
   if x then "ok"
   else invalidOp "メッセージ"   
```

ちなみに、 `failwith` の便利な変形として `failwithf` があります。これは `printf` スタイルのフォーマットを含み、カスタムメッセージを簡単に作れます。

```fsharp
open System
let f x = 
    if x = "bad" then
        failwithf "操作 '%s' は時刻 %O に失敗しました" x DateTime.Now
    else
        printfn "操作 '%s' は時刻 %O に成功しました" x DateTime.Now

// テスト   
f "good"
f "bad"
```

### 例外をスローする方法2：標準の.NET例外クラスを使う

任意の.NET例外を明示的に `raise` できます。

```fsharp
// 例外の型を制御できる
let f x = 
   if x then "ok"
   else raise (new InvalidOperationException("メッセージ"))
```

### 例外をスローする方法3：独自のF#例外型を使う

最後に、先ほど定義した独自の型も使えます。

```fsharp
// 独自のF#例外型を使う
let f x = 
   if x then "ok"
   else raise (MyFSharpError1 "メッセージ")
```

これで例外のスローについてはほぼ説明が終わりです。

## 例外を発生させることが関数の型にどう影響するか？

以前、if-then-else式の両方の分岐が同じ型を返す必要があると述べました。では、例外を発生させることはこの制約とどう整合するのでしょうか？

答えは、例外を発生させるコードは式の型を決めるとき無視されるということです。つまり、関数のシグネチャは通常のケースだけに基づいて決まり、例外ケースは考慮されません。

例えば、以下のコードでは例外は無視され、全体の関数は予想通り `bool->int` というシグネチャを持ちます。

```fsharp
let f x = 
   if x then 42
   elif true then failwith "メッセージ"
   else invalidArg "パラメータ名" "メッセージ"   
```

質問：両方の分岐が例外を発生させる場合、関数のシグネチャはどうなると思いますか？

```fsharp
let f x = 
   if x then failwith "真の分岐でのエラー"
   else failwith "偽の分岐でのエラー"
```

試してみてください！

## 例外をキャッチする

例外は他の言語と同様にtry-catchブロックを使ってキャッチします。F#では `try-with` と呼び、各種の例外のテストには標準的なパターンマッチング構文を使います。

```fsharp
try
    failwith "失敗"
with
    | Failure msg -> "キャッチされました: " + msg
    | MyFSharpError1 msg -> " MyFSharpError1: " + msg
    | :? System.InvalidOperationException as ex -> "予期せぬエラー"
```

キャッチする例外が `failwith` で投げられた場合（つまりSystem.Exception）や、カスタムF#例外の場合、上記のような単純なタグ方式でマッチングできます。

一方、特定の.NET例外クラスをキャッチするには、より複雑な構文を使ってマッチングする必要があります。

```fsharp
:? (例外クラス) as ex 
```

再度述べますが、if-then-elseや各種ループと同様に、try-withブロックも値を返す式です。つまり、 `try-with` 式のすべての分岐が*同じ型を返さなければなりません*。

以下の例を考えてみましょう。

```fsharp
let divide x y=
    try
        (x+1) / y                      // ここにエラーがあります -- 以下を参照
    with
    | :? System.DivideByZeroException as ex -> 
          printfn "%s" ex.Message
```

これを評価しようとすると、エラーが出ます。

    error FS0043: 型 'unit' は型 'int' と一致しません

理由は、 `with` 分岐が `unit` 型なのに、 `try` 分岐が `int` 型だからです。つまり、2つの分岐の型が合っていません。

これを直すには、 `with` 分岐も `int` 型を返すようにする必要があります。セミコロンを使って1行に式をつなげるテクニックを使えば、簡単に直せます。

```fsharp
let divide x y=
    try
        (x+1) / y                      
    with
    | :? System.DivideByZeroException as ex -> 
          printfn "%s" ex.Message; 0            // ここに0を追加しました！

//テスト
divide 1 1
divide 1 0
```

これで `try-with` 式に定まった型ができたので、関数全体に `int -> int -> int` という型を割り当てられます。

前に述べたように、どの分岐が例外を投げても、型を決めるときには考慮されません。

### 例外の再スロー

必要なら、キャッチハンドラーで `reraise()` 関数を呼び出して、同じ例外を呼び出しチェーンの上に伝えられます。これはC#の `throw` キーワードと同じです。

```fsharp
let divide x y=
    try
        (x+1) / y                      
    with
    | :? System.DivideByZeroException as ex -> 
          printfn "%s" ex.Message
          reraise()

//テスト
divide 1 1
divide 1 0
```

## Try-finally

もう一つの馴染み深い式が `try-finally` です。予想通り、"finally"節は何が起きても必ず呼ばれます。

```fsharp
let f x = 
    try
        if x then "ok" else failwith "失敗"
    finally
        printf "これは必ず表示されます"
```

try-finally式全体の戻り値の型は、常に"try"節単独の戻り値の型と同じです。"finally"節は式全体の型に影響しません。そのため、上の例では、全体の式は `string` 型になります。

"finally"節は常にunitを返さなければならないため、unit以外の値はコンパイラにフラグを立てられます。

```fsharp
let f x = 
    try
        if x then "ok" else failwith "失敗"
    finally
        1+1  // この式はunit型であるべきです
```

## try-withとtry-finallyの組み合わせ

try-withとtry-finallyの式は別物で、一つの式に直接組み合わせられません。代わりに、状況に応じてネストする必要があります。

```fsharp
let divide x y=
   try
      try       
         (x+1) / y                      
      finally
         printf "これは必ず表示されます"
   with
   | :? System.DivideByZeroException as ex -> 
           printfn "%s" ex.Message; 0            
```

## 関数は例外を投げるべきか、それともエラー構造を返すべきか？

関数を設計するとき、例外を投げるべきか、それともエラーを表す構造を返すべきか迷うことがあります。このセクションでは、2つの異なるアプローチについて説明します。

### 関数ペアのアプローチ

一つのアプローチは、関数を2つ用意することです。一つは全てが正常に動くと想定し、そうでない場合は例外を投げる関数、もう一つは何か問題が起きた場合に欠損値を返す「tryXXX」関数です。

例えば、除算のために2つの異なるライブラリ関数を設計できます。一つは例外を処理せず、もう一つは例外を処理します。

```fsharp
// 例外を処理しないライブラリ関数
let divideExn x y = x / y

// 例外をNoneに変える関数
let tryDivide x y = 
   try
       Some (x / y)
   with
   | :? System.DivideByZeroException -> None // 欠損を返す
```

`tryDivide` コードでは、SomeとNoneのオプション型を使って、クライアントに値が有効かどうかを知らせています。

最初の関数では、クライアントコードが明示的に例外を処理する必要があります。

```fsharp
// クライアントコードは明示的に例外を処理する必要がある
try
    let n = divideExn 1 0
    printfn "結果は %i です" n
with
| :? System.DivideByZeroException as ex -> printfn "ゼロによる除算"
```

クライアントにこれを強制する制約はないため、このアプローチはエラーの原因になる可能性があることに注意してください。

2番目の関数では、クライアントコードはより簡単になり、クライアントは通常のケースとエラーケースの両方を処理することを強いられます。

```fsharp
// クライアントコードは両方のケースをテストする必要がある
match tryDivide 1 0 with
| Some n -> printfn "結果は %i です" n
| None -> printfn "ゼロによる除算"
```

この「通常 vs. try」アプローチは.NET BCLでは非常によく見られ、F#ライブラリでもいくつかのケースで見られます。例えば、 `List` モジュールでは以下の通りです。

* `List.find` はキーが見つからない場合 `KeyNotFoundException` を投げます
* 一方 `List.tryFind` はオプション型を返し、キーが見つからない場合は `None` を返します

このアプローチを使うなら、命名規則を持つことをお勧めします。例を以下に示します。

* クライアントが例外をキャッチすることを期待する関数には"doSomethingExn"
* 通常の例外を処理する関数には"tryDoSomething"

注意："doSomething"に接尾辞を付けないより、"doSomething" に "Exn" サフィックスを付けることをお勧めします。これにより、通常のケースでもクライアントに例外をキャッチすることを期待していることが明確になります。

このアプローチの全体的な問題点は、関数のペアを作るために余分な作業が必要になること、そして関数の安全でないバージョンを使うときに、クライアントが例外をキャッチすることに頼るため、システムの安全性が下がることです。

### エラーコードベースのアプローチ

> 「良いエラーコードベースのコードを書くのは難しいが、良い例外ベースのコードを書くのは本当に難しい。」
> [*Raymond Chen*](http://blogs.msdn.com/b/oldnewthing/archive/2005/01/14/352949.aspx)

関数型の世界では、一般的に例外を投げるよりもエラーコード（より正確には*エラー型*）を返すことが好まれます。そのため、標準的なハイブリッドアプローチとして、一般的なケース（ユーザーが気にするであろうケース）をエラー型に変換し、非常に珍しい例外はそのままにしておくというものがあります。

多くの場合、最も簡単なアプローチは、オプション型を使うことです。成功の場合は `Some` 、エラーの場合は `None` です。 `tryDivide` や `tryParse` のように、エラーケースが明らかな場合、より詳細なエラーケースを明示する必要はありません。

しかし、時には複数のエラーの可能性があり、それぞれを異なる方法で処理する必要がある場合があります。このような場合、各エラーに対応するケースを持つユニオン型が便利です。

次の例では、SqlCommandを実行しようとしています。非常によくあるエラーケースは、ログインエラー、制約エラー、外部キーエラーの3つです。そのため、これらを結果の構造体に組み込みます。その他のエラーは例外として投げられます。

```fsharp
open System.Data.SqlClient

type NonQueryResult =
    | Success of int
    | LoginError of SqlException
    | ConstraintError of SqlException
    | ForeignKeyError of SqlException 

let executeNonQuery (sqlCommmand:SqlCommand) =
    try
       use sqlConnection = new SqlConnection("myconnection")
       sqlCommmand.Connection <- sqlConnection 
       let result = sqlCommmand.ExecuteNonQuery()
       Success result
    with    
    | :?SqlException as ex ->     // SqlExceptionの場合
        match ex.Number with      
        | 18456 ->                // ログイン失敗
            LoginError ex     
        | 2601 | 2627 ->          // 制約エラーを処理
            ConstraintError ex     
        | 547 ->                  // FK（外部キー）エラーを処理
            ForeignKeyError ex     
        | _ ->                    // その他のケースは処理しない 
            reraise()          
       // SqlException以外の例外は通常通り投げられる        
```

クライアントは一般的なケースを処理することを強いられますが、一方で珍しい例外は呼び出しチェーンの上位のハンドラーによってキャッチされます。

```fsharp
let myCmd = new SqlCommand("DELETE Product WHERE ProductId=1")
let result =  executeNonQuery myCmd
match result with
| Success n -> printfn "成功"
| LoginError ex -> printfn "ログインエラー: %s" ex.Message
| ConstraintError ex -> printfn "制約エラー: %s" ex.Message
| ForeignKeyError ex -> printfn "外部キーエラー: %s" ex.Message
```

従来のエラーコードアプローチとは異なり、関数の呼び出し元はすぐにエラーを処理する必要はなく、単に構造体を渡し続けることができます。そして、それを処理する方法を知っている人に渡すまで待つことができます。以下に示します。

```fsharp
let lowLevelFunction commandString = 
  let myCmd = new SqlCommand(commandString)
  executeNonQuery myCmd          // 結果を返す    

let deleteProduct id = 
  let commandString = sprintf "DELETE Product WHERE ProductId=%i" id
  lowLevelFunction commandString  // エラーを処理せずに返す

let presentationLayerFunction = 
  let result = deleteProduct 1
  match result with
  | Success n -> printfn "成功"
  | errorCase -> printfn "エラー %A" errorCase 
```

一方で、C#とは違って、式の結果を誤って捨てることはできません。そのため、関数がエラー結果を返す場合、呼び出し元はそれを処理しなければなりません（意図的に無視したり `ignore` に送ったりする、悪意のある振る舞いをしたいのでなければ）。

```fsharp
let presentationLayerFunction = 
  do deleteProduct 1    // エラー: 結果コードを捨てています！
```

