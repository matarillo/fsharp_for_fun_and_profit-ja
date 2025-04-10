---
layout: post
title: "制御フロー式"
description: "そしてそれらを使わない方法"
nav: thinking-functionally
seriesId: "式と構文"
seriesOrder: 7
---

この投稿では、以下の制御フロー式について見ていきます。

* if-then-else
* for x in collection （C#のforeachと同じです）
* for x = start to end
* while-do 

これらの制御フロー式は、みなさんにとってとてもなじみ深いものでしょう。しかし、これらは関数型というよりも、非常に「命令型」です。

そのため、できるだけこれらを使わないことを強くお勧めします。特に関数型の考え方を学んでいる段階では避けたほうがいいでしょう。これらに頼ってしまうと、命令型の思考から抜け出すのがとても難しくなります。

この記事では、慣用的な構文を使って、これらの制御フロー式を避ける方法の例を紹介します。もし使う必要がある場合は、注意すべき「落とし穴」がいくつかあります。

## If-then-else

### If-then-elseを使わない方法

`if-then-else`を避けるには、代わりに「match」を使うのが一番です。ブール値に対してマッチングを行えば、従来のthen/elseの分岐と似たようなことができます。しかし、もっといいのは、等値テストを避けて、対象そのものに対してマッチングを行うことです。以下の最後の例をご覧ください。

```fsharp
// 悪い例
let f x = 
    if x = 1 
    then "a" 
    else "b"

// あまり良くない例
let f x = 
    match x=1 with
    | true -> "a" 
    | false -> "b"

// 最良の例
let f x = 
    match x with
    | 1 -> "a" 
    | _ -> "b"
```

直接マッチングのほうがいい理由の一つは、後で必要になるかもしれない有用な情報を等値テストが捨ててしまうからです。

次のシナリオでこれを示します。リストの最初の要素を取得して表示したいとします。当然、空のリストに対してこれを試みないよう注意する必要があります。

最初の例では、空かどうかのテストを行い、その後で最初の要素を取得する*2つ目の*操作を行っています。2番目の例に示すように、マッチングと要素の抽出を1つのステップで行うほうがずっといいでしょう。

```fsharp
// 悪い例
let f list = 
    if List.isEmpty list
    then printfn "空です" 
    else printfn "最初の要素は %s です" (List.head list)

// はるかに良い例
let f list = 
    match list with
    | [] -> printfn "空です" 
    | x::_ -> printfn "最初の要素は %s です" x
```

2番目の例は理解しやすいだけでなく、より効率的です。

ブール値テストが複雑な場合でも、追加の `when` 句（ガードと呼ばれる）を使えば、matchで対応できます。以下の最初と2番目の例を比べて、その違いを確認してください。

```fsharp
// 悪い例
let f list = 
    if List.isEmpty list
        then printfn "空です" 
        elif (List.head list) > 0
            then printfn "最初の要素は 0 より大きいです" 
            else printfn "最初の要素は 0 以下です" 

// はるかに良い例
let f list = 
    match list with
    | [] -> printfn "空です" 
    | x::_ when x > 0 -> printfn "最初の要素は 0 より大きいです" 
    | x::_ -> printfn "最初の要素は 0 以下です" 
```

ここでも、2番目の例のほうが理解しやすく、より効率的です。

この話の教訓は次の通りです。if-then-elseを使っていたり、ブール値に対してマッチングを行っていたりする場合は、コードのリファクタリングを検討してみてください。

### If-then-elseの使い方

if-then-elseを使う必要がある場合、構文は見慣れたものですが、注意すべき点があります。 `if-then-else` は*文*ではなく*式*です。F#のすべての式と同じく、特定の型の値を返す必要があります。

以下は、戻り値の型が文字列である2つの例です。

```fsharp
let v = if true then "a" else "b"    // value : string
let f x = if x then "a" else "b"     // function : bool->string
```

ただし、その結果として、両方の分岐が同じ型を返さなければなりません。これが守られていないと、式全体が一貫した型を返せず、コンパイラーがエラーを出します。

以下は、各分岐で異なる型を返す例です。

```fsharp
let v = if true then "a" else 2  
  // error FS0001: この式に必要な型は 'string'
  //               ですが、ここでは次の型が指定されています 'int' 
```

"else"句は省略できますが、省略すると、"else"句はunit型を返すと見なされるため、"then"句もunit型を返す必要があります。この間違いを犯すと、コンパイラーから警告が出ます。

```fsharp
let v = if true then "a"    
  // error FS0001: この式に必要な型は 'unit'    
  //               ですが、ここでは次の型が指定されています 'string' 
```

"then"句がunit型を返す場合は、コンパイラーは問題なく受け入れます。

```fsharp
let v2 = if true then printfn "a"   // OK - printfnはunit型を返すため
```

注意すべき点として、分岐内で早期に値を返す方法はありません。戻り値は式全体となります。つまり、if-then-else式は、C#のif-then-else文よりも、C#の三項演算子（<if式>?<then式>:<else式>）に近いのです。

### ワンライナーでのif-then-else

if-then-elseが実際に役立つのは、他の関数に渡すための簡単なワンライナーを作るときです。

```fsharp
let posNeg x = if x > 0 then "+" elif x < 0 then "-" else "0"
[-5..5] |> List.map posNeg
```

### 関数を返す

if-then-else式は任意の値を返せます。これには関数値も含まれることを忘れないでください。たとえば、

```fsharp
let greetings = 
    if (System.DateTime.Now.Hour < 12) 
    then (fun name -> "おはようございます、" + name)
    else (fun name -> "こんにちは、" + name)

// テスト
greetings "アリス"
```

もちろん、両方の関数は同じ型でなければなりません。つまり、関数シグネチャが同じである必要があります。

## ループ ##

### ループを使わない方法 ###

ループを避けるには、代わりに組み込みのリストやシーケンス関数を使うのが一番です。やりたいことのほとんどは、明示的なループを使わずにできます。そして、副次的な利点として、可変値の使用も避けられることが多いです。以下にいくつかの例を示します。より詳しくは、リストとシーケンス操作に関する今後のシリーズをお読みください。

例：何かを10回出力する。

```fsharp
// 悪い例
for i = 1 to 10 do
   printf "%i" i

// はるかに良い例
[1..10] |> List.iter (printf "%i") 
```

例：リストの合計を求める。

```fsharp
// 悪い例
let sum list = 
    let mutable total = 0    // ああ - 可変値です
    for e in list do
        total <- total + e   // 可変値を更新
    total                    // 合計を返す

// はるかに良い例
let sum list = List.reduce (+) list

// テスト
sum [1..10]
```

例：ランダムな数値のシーケンスを生成して出力する。

```fsharp
// 悪い例
let printRandomNumbersUntilMatched matchValue maxValue =
  let mutable continueLooping = true  // また可変値です
  let randomNumberGenerator = new System.Random()
  while continueLooping do
    // 1からmaxValueまでのランダムな数を生成
    let rand = randomNumberGenerator.Next(maxValue)
    printf "%d " rand
    if rand = matchValue then 
       printfn "\n%dが見つかりました！" matchValue
       continueLooping <- false

// はるかに良い例
let printRandomNumbersUntilMatched matchValue maxValue =
  let randomNumberGenerator = new System.Random()
  let sequenceGenerator _ = randomNumberGenerator.Next(maxValue)
  let isNotMatch = (<>) matchValue

  // ランダム数のシーケンスを作って処理
  Seq.initInfinite sequenceGenerator 
    |> Seq.takeWhile isNotMatch
    |> Seq.iter (printf "%d ")

  // 完了
  printfn "\n%dが見つかりました！" matchValue

// テスト
printRandomNumbersUntilMatched 10 20
```

if-then-elseの場合と同じく、ここにも教訓があります。ループと可変値を使っていることに気づいたら、それらを避けるようにコードのリファクタリングを考えてみてください。

### 3種類のループ 

どうしてもループを使いたい場合は、C#と同様の3種類のループ式から選べます。

* `for-in-do` 。 `for x in 列挙可能なもの do 何か` という形式です。C#の `foreach` ループと同じで、F#で最もよく見かける形です。
* `for-to-do` 。 `for x = 開始 to 終了 do 何か` という形式です。C#の標準的な `for (i=開始; i<終了; i++)` ループと同じです。
* `while-do`  。 `while テスト do 何か` という形式です。C#の `while` ループと同じです。F#には `do-while` に相当するものがないので注意してください。

使い方は簡単なので、これ以上詳しく説明しません。困ったことがあれば、[Microsoft Learnのドキュメント](https://learn.microsoft.com/ja-jp/dotnet/fsharp/language-reference/loops-for-in-expression)を見てください。

### ループの使い方

if-then-else式と同じく、ループ式も見慣れた形をしていますが、やはり注意点がいくつかあります。

* すべてのループ式は、式全体として必ずunit型を返します。そのため、ループ内から値を返す方法はありません。
* すべての"do"束縛と同じく、ループ内の式もunit型を返す必要があります。
* "break"や"continue"に相当するものはありません（一般的に、シーケンスを使えばもっとうまく対処できます）

以下は、unit型の制約の例です。ループ内の式はunit型であるべきで、int型ではないため、コンパイラーは警告を出します。

```fsharp
let f =
  for i in [1..10] do
    i + i  // 警告: この式はunit型であるべきです

// バージョン2
let f =
  for i in [1..10] do
    i + i |> ignore   // 修正済み
```

### ワンライナーでのループ

ループが実際に役立つ場面の1つは、リストやシーケンスのジェネレーターとしてです。

```fsharp
let myList = [for x in 0..100 do if x*x < 100 then yield x ]
```

## まとめ

冒頭で述べたことを繰り返しますが、関数型思考を学んでいるときは、命令型の制御フローを使わないようにしてください。
そして、ルールを裏付ける例外を理解してください。つまり、使っていいワンライナーのことです。
