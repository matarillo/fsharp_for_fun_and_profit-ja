---
layout: post
title: "match 式"
description: "F#の主力機能"
nav: thinking-functionally
seriesId: "式と構文"
seriesOrder: 9
categories: [パターン,畳み込み]
---

F#ではパターンマッチングが広く使われています。 `let` で式に値を束縛したり、関数のパラメータを定義したり、 `match..with` 構文で分岐したりするときに活躍します。

値を式に束縛することについては、[「F#を使う理由」シリーズの投稿](../posts/conciseness-pattern-matching.html)で軽く触れました。また、「[型の調査](../posts/overview-of-types-in-fsharp.html)」でも何度か取り上げる予定です。

そのため、この投稿では `match..with` 構文とその制御フローでの使い方に焦点を当てます。

## match 式とは

`match..with` 式はすでに何度か目にしています。基本的な形は以下のとおりです。

    match [何か] with 
    | パターン1 -> 式1
    | パターン2 -> 式2
    | パターン3 -> 式3
    
少し目を凝らすと、一連のラムダ式のようにも見えます。
    
    match [何か] with 
    | ラムダ式1
    | ラムダ式2
    | ラムダ式3

ここで、各ラムダ式は1つのパラメータを持ちます。

    パラメータ -> 式
    
つまり、 `match..with` は一連のラムダ式から1つを選ぶものと考えられます。では、どうやって選ぶのでしょうか？

ここでパターンが重要になります。「match with」の値がラムダ式のパラメータとマッチするかどうかで選びます。
入力値とマッチする最初のラムダ式のパラメータが「勝者」です！

たとえば、パラメータがワイルドカード `_` なら、常にマッチし、最初にあれば必ず勝者になります。

    _ -> 式  

### 順序が大切！
    
次の例を見てみましょう。

```fsharp
let x = 
    match 1 with 
    | 1 -> "a"
    | 2 -> "b"  
    | _ -> "z" 
```

ここでは、以下の順序で3つのラムダ式がマッチングされます。

    fun 1 -> "a"
    fun 2 -> "b"
    fun _ -> "z"

つまり、まず `1` パターンを試し、次に `2` パターン、最後に `_` パターンを試します。

一方、ワイルドカードを最初に置くと、最初に試されて必ず勝者になってしまいます。

```fsharp
let x = 
    match 1 with 
    | _ -> "z" 
    | 1 -> "a"
    | 2 -> "b"  
```

この場合、F#コンパイラは他のルールが決してマッチしないと親切に警告してくれます。

これが `switch` や `case` 文と `match..with` の大きな違いの1つです。 `match..with` では、**順序が重要**なのです。

## match 式のフォーマット

F#はインデントに敏感なので、この式をどのようにフォーマットするのが最適か疑問に思うかもしれません。整列に関する要素が多いからです。

[F#の構文に関する投稿](../posts/fsharp-syntax)では整列の概要を説明しましたが、 `match..with` 式には以下のような具体的なガイドラインがあります。

**ガイドライン1： `| expression` 句は `match` の直下に整列させる**

このガイドラインは分かりやすいでしょう。

```fsharp
let f x =   match x with 
            // 整列
            | 1 -> "パターン1" 
            // 整列
            | 2 -> "パターン2" 
            // 整列
            | _ -> "その他" 
```


**ガイドライン2： `match..with` は新しい行に書く**

`match..with` は同じ行に書けますが、新しい行に書くと名前の長さに関係なく一貫したインデントを保てます。

```fsharp
                                              // 醜い整列！  
let myVeryLongNameForAFunction myParameter =  match myParameter with 
                                              | 1 -> "何か" 
                                              | _ -> "その他" 

// はるかに良い
let myVeryLongNameForAFunction myParameter =  
    match myParameter with 
    | 1 -> "何か" 
    | _ -> "その他" 
```

**ガイドライン3：矢印 `->` の後の式は新しい行に書く**

結果の式を矢印と同じ行に書けますが、新しい行に書くと一貫したインデントを保ち、
マッチパターンと結果の式を分けやすくなります。

```fsharp
let f x =  
    match x with 
    | "フローを中断する非常に長いパターン" -> "何か" 
    | _ -> "その他" 

let f x =  
    match x with 
    | "フローを中断する非常に長いパターン" -> 
        "何か" 
    | _ -> 
        "その他" 
```

もちろん、すべてのパターンが非常にコンパクトな場合は、例外的に同じ行に書いても構いません。

```fsharp
let f list =  
    match list with 
    | [] -> "何か" 
    | x::xs -> "その他" 
```
        
    
## match..withは式である

`match..with` は実際には「制御フロー」の構造ではありません。「制御」が分岐を「流れる」のではなく、むしろ全体が単なる式であり、他の式と同じように評価されるのです。実際の結果は同じかもしれませんが、概念的な違いは重要です。

式であることの1つの結果として、すべての分岐が*同じ*型に評価されなければなりません。これは、if-then-else式やforループでも同じ動きを見てきました。

```fsharp
let x = 
    match 1 with 
    | 1 -> 42
    | 2 -> true  // エラー：型が間違っている
    | _ -> "hello" // エラー：型が間違っている
```

式の中で型を混ぜることはできません。

### match 式はどこでも使える

通常の式なので、match 式は式が使える場所ならどこでも使えます。

たとえば、以下はネストされたmatch 式です。

```fsharp
// ネストされたmatch..withは問題ない
let f aValue = 
    match aValue with 
    | x -> 
        match x with 
        | _ -> "何か" 
```

そして、以下はラムダにmatch 式を埋め込んだ例です。

```fsharp
[2..10]
|> List.map (fun i ->
        match i with 
        | 2 | 3 | 5 | 7 -> sprintf "%iは素数です" i
        | _ -> sprintf "%iは素数ではありません" i
        )
```



## 網羅的なマッチング

式であることのもう1つの結果として、必ず*何らかの*分岐がマッチしなければなりません。式全体が*何かに*評価される必要があるのです！

つまり、「網羅的なマッチング」という重要な概念は、F#の「すべてが式である」性質から生まれています。文指向の言語では、このような要求はありません。

以下は不完全なマッチの例です。

```fsharp
let x = 
    match 42 with 
    | 1 -> "a"
    | 2 -> "b"
```

コンパイラは、不足している分岐があると判断すると警告を出します。
そして、意図的に警告を無視すると、どのパターンもマッチしないときに厄介なランタイムエラー（ `MatchFailureException` ）が発生します。

### 網羅的なマッチングは完璧ではない

すべての可能なマッチをリストアップしたかどうかをチェックするアルゴリズムは優れていますが、常に完璧というわけではありません。時々、すべての可能なケースをマッチさせていないと指摘されるけれども、実際にはすべてをカバーしていることがわかっている場合もあります。
このような場合、コンパイラを満足させるためだけに、余分なケースを追加する必要があるかもしれません。

### ワイルドカードマッチの使い方（と避け方）

すべてのケースを確実にマッチさせる1つの方法は、最後のマッチとしてワイルドカードパラメータを置くことです。

```fsharp
let x = 
    match 42 with 
    | 1 -> "a"
    | 2 -> "b"
    | _ -> "z"
```

このパターンはよく見かけます。私もこれらの例でたくさん使いました。これは、switch文でcatch-all  `default` を持つのと同じです。

しかし、網羅的なパターンマッチングの恩恵を最大限に得たい場合は、ワイルドカードを*使わず*、
可能な限りすべてのケースを明示的にマッチさせることをお勧めします。これは特に、
union 型のケースにマッチングする場合に当てはまります。

```fsharp
type Choices = A | B | C
let x = 
    match A with 
    | A -> "a"
    | B -> "b"
    | C -> "c"
    // デフォルトのマッチはなし
```

このように常に明示的にすることで、union に新しいケースを追加したことによるエラーを捕捉できます。ワイルドカードマッチを使っていたら、気づくことはありませんでした。

すべてのケースを明示的にできない場合は、できるだけ境界条件を文書化し、ワイルドカードケースに対してランタイムエラーをアサートすることを検討してください。

```fsharp
let x = 
    match -1 with 
    | 1 -> "a"
    | 2 -> "b"
    | i when i >= 0 && i<=100 -> "ok"
    // 最後のケースは常にマッチする
    | x -> failwithf "%iは範囲外です" x
```


## パターンの種類

パターンをマッチングする方法は多数あります。次にそれらを見ていきましょう。

各種パターンの詳細については、[Microsoft Learnのドキュメント](https://learn.microsoft.com/ja-jp/dotnet/fsharp/language-reference/pattern-matching)を参照してください。

### 値への束縛

最も基本的なパターンは、マッチの一部として値を束縛することです。

```fsharp
let y = 
    match (1,0) with 
    // 名前付き値への束縛
    | (1,x) -> printfn "x=%A" x
```

*ちなみに、このパターン（および本投稿の他のパターン）は、意図的に未完成のままにしています。練習として、ワイルドカードを使わずに完成させてみてください。*

束縛される値は各パターンで異なる必要があることに注意してください。つまり、以下のようなことはできません。

```fsharp
let elementsAreEqual aTuple = 
    match aTuple with 
    | (x,x) -> 
        printfn "両方の部分が同じです" 
    | (_,_) -> 
        printfn "両方の部分が異なります" 
```

代わりに、以下のようにする必要があります。

```fsharp
let elementsAreEqual aTuple = 
    match aTuple with 
    | (x,y) -> 
        if (x=y) then printfn "両方の部分が同じです" 
        else printfn "両方の部分が異なります" 
```

この2つ目のオプションは、「ガード」（ `when` 句）を使って書き直すこともできます。ガードについては後ほど説明します。

### ANDとOR

ORロジックとANDロジックを使い、複数のパターンを組み合わせて1行にできます。

```fsharp
let y = 
    match (1,0) with 
    // OR  -- 1行に複数のケースを書くのと同じ
    | (2,x) | (3,x) | (4,x) -> printfn "x=%A" x 

    // AND  -- 両方のパターンに同時にマッチする必要がある
    // 注意：単一の"&"のみ使う
    | (2,x) & (_,1) -> printfn "x=%A" x 
```

ORロジックは、多数のunion ケースにマッチングする際によく使います。

```fsharp
type Choices = A | B | C | D
let x = 
    match A with 
    | A | B | C -> "aまたはbまたはc"
    | D -> "d"
```


### リストのマッチング

リストは `[x;y;z]` の形式で明示的にマッチングするか、「cons」つまり `head::tail` の形式でマッチングできます。

```fsharp
let y = 
    match [1;2;3] with 
    // 明示的な位置への束縛
    // 角かっこを使う！
    | [1;x;y] -> printfn "x=%A y=%A" x y

    // head::tailへの束縛 
    // 角かっこは使わない！
    | 1::tail -> printfn "tail=%A" tail 

    // 空のリスト
    | [] -> printfn "空" 
```

配列に対しても、 `[|x;y;z|]` のような似た構文を使って正確にマッチングできます。

シーケンス（別名 `IEnumerable` ）は「遅延評価」され、一度に1要素ずつアクセスすることを意図しているため、このように直接マッチングできないことを理解しておくことが重要です。
一方、リストと配列は完全にマッチングできます。

これらのパターンの中で最も一般的なのは「cons」パターンで、再帰と組み合わせてリストの要素をループ処理するのによく使います。

以下は、再帰を使ってリストをループ処理する例です。

```fsharp
// リストをループして値を出力する
let rec loopAndPrint aList = 
    match aList with 
    // 空のリストは処理終了を意味する
    | [] -> 
        printfn "空" 

    // head::tailへの束縛 
    | x::xs -> 
        printfn "要素=%A," x
        // リストの残りの部分で
        // 再度同じ処理を行う
        loopAndPrint xs 

// テスト
loopAndPrint [1..5]

// ------------------------
// リストをループして値を合計する
let rec loopAndSum aList sumSoFar = 
    match aList with 
    // 空のリストは処理終了を意味する
    | [] -> 
        sumSoFar  

    // head::tailへの束縛 
    | x::xs -> 
        let newSumSoFar = sumSoFar + x
        // リストの残りの部分と新しい合計で
        // 再度同じ処理を行う
        loopAndSum xs newSumSoFar 

// テスト
loopAndSum [1..5] 0
```

2つ目の例は、ループの1回の反復から次の反復へ状態を引き渡す方法を示しています。特別な「アキュムレータ」パラメータ（この例では `sumSoFar` ）を使います。これは非常によく使うパターンです。

### タプル、レコード、union のマッチング

パターンマッチングは、F#のすべての組み込み型で利用できます。詳細は[型に関するシリーズ](../posts/overview-of-types-in-fsharp.html)を参照してください。

```fsharp
// -----------------------
// タプルのパターンマッチング
let aTuple = (1,2)
match aTuple with 
| (1,_) -> printfn "最初の部分は1"
| (_,2) -> printfn "2番目の部分は2"


// -----------------------
// レコードのパターンマッチング
type Person = {First:string; Last:string}
let person = {First="john"; Last="doe"}
match person with 
| {First="john"}  -> printfn "ジョンにマッチしました" 
| _  -> printfn "ジョンではありません" 

// -----------------------
// union のパターンマッチング
type IntOrBool= I of int | B of bool
let intOrBool = I 42
match intOrBool with 
| I i  -> printfn "整数=%i" i
| B b  -> printfn "論理値=%b" b
```


### 全体と部分のマッチング（"as"キーワードの使用）

時には、値の個々の構成要素と*全体*の両方にマッチさせたい場合があります。この場合、 `as` キーワードを使えます。

```fsharp
let y = 
    match (1,0) with 
    // 3つの値への束縛
    | (x,y) as t -> 
        printfn "x=%A かつ y=%A" x y
        printfn "タプル全体は %A" t
```


### サブタイプのマッチング

`:?` 演算子を使ってサブタイプにマッチングでき、これによって簡易的な多態性を実現できます。

```fsharp
let x = new Object()
let y = 
    match x with 
    | :? System.Int32 -> 
        printfn "整数にマッチしました"
    | :? System.DateTime -> 
        printfn "日時にマッチしました"
    | _ -> 
        printfn "別の型です"
```

これは、親クラス（この場合はObject）のサブクラスを見つけるためにのみ機能します。式全体の型は、親クラスを入力として持ちます。

場合によっては、値を「ボックス化」する必要があることに注意してください。

```fsharp
let detectType v =
    match v with
        | :? int -> printfn "これは整数です"
        | _ -> printfn "それ以外です"
// エラーFS0008：この実行時の型変換または型テストは、型'a から int への
// このプログラムポイントより前の情報に基づく不確定な型を含んでいます。
// 実行時の型テストは一部の型では許可されていません。さらなる型注釈が必要です。
```

メッセージが問題を示しています。「実行時の型テストは一部の型では許可されていません」。
解決策は値を「ボックス化」することです。これにより参照型に強制され、型チェックができるようになります。

```fsharp
let detectTypeBoxed v =
    match box v with      // "box v"を使う 
        | :? int -> printfn "これは整数です"
        | _ -> printfn "それ以外です"

// テスト
detectTypeBoxed 1
detectTypeBoxed 3.14
```

私の意見では、オブジェクト指向プログラミングと同様に、型に基づくマッチングとディスパッチはコードの臭いです。
時には必要ですが、注意せずに使うと、貧弱な設計の兆候となります。

適切なオブジェクト指向設計では、[サブタイプテストを多態性で置き換える](https://sourcemaking.com/refactoring/replace-conditional-with-polymorphism)アプローチと、[二重ディスパッチ](https://wiki.c2.com/?DoubleDispatchExample)のような技術を使うのが正しいアプローチです。したがって、F#でこのようなオブジェクト指向を行う場合は、おそらく同じ手法を使うべきでしょう。

## 複数の値に対するマッチング

これまで見てきたパターンはすべて、*単一の*値に対するパターンマッチングでした。複数の値に対してはどのように行えばよいでしょうか？

短い答えは、できません。マッチングは単一の値に対してのみ許可されています。

しかし、ちょっと待ってください。その場で2つの値を*単一の*タプルに結合して、それにマッチングすることはできないでしょうか？はい、できます！

```fsharp
let matchOnTwoParameters x y = 
    match (x,y) with 
    | (1,y) -> 
        printfn "x=1 かつ y=%A" y
    | (x,1) -> 
        printfn "x=%A かつ y=1" x
```

実際、この小技は一連の値に対してマッチングしたい場合はいつでも使えます。単にすべての値を単一のタプルにグループ化するだけです。

```fsharp
let matchOnTwoTuples x y = 
    match (x,y) with 
    | (1,_),(1,_) -> "両方とも1で始まる"
    | (_,2),(_,2) -> "両方とも2で終わる"
    | _ -> "それ以外"

// テスト
matchOnTwoTuples (1,3) (1,2)
matchOnTwoTuples (3,2) (1,2)
```

## ガード、または"when"句

時にはパターンマッチングだけでは不十分な場合があります。以下の例を見てみましょう。

```fsharp
let elementsAreEqual aTuple = 
    match aTuple with 
    | (x,y) -> 
        if (x=y) then printfn "両方の部分が同じです" 
        else printfn "両方の部分が異なります" 
```

パターンマッチングはパターンのみに基づいています。関数や他の種類の条件テストを使うことはできません。

しかし、パターンマッチの一部として等値テストを行う方法が*あります*。それは、関数の矢印の左側に追加の `when` 句を使うことです。
これらの句は「ガード」として知られています。

以下は、同じロジックをガードを使って書き直したものです。

```fsharp
let elementsAreEqual aTuple = 
    match aTuple with 
    | (x,y) when x=y -> 
        printfn "両方の部分が同じです" 
    | _ ->
        printfn "両方の部分が異なります" 
```

これはより良い方法です。マッチ後にテストを使うのではなく、テストをパターン自体に統合したからです。

ガードは、純粋なパターンでは使えないあらゆる種類のことに使えます。

* 束縛された値の比較
* オブジェクトのプロパティのテスト
* 正規表現など、他の種類のマッチング
* 関数から派生した条件

いくつか例を見てみましょう。

```fsharp
// --------------------------------
// when句での値の比較
let makeOrdered aTuple = 
    match aTuple with 
    // xがyより大きい場合、交換
    | (x,y) when x > y -> (y,x)
        
    // それ以外の場合はそのまま
    | _ -> aTuple

// テスト        
makeOrdered (1,2)        
makeOrdered (2,1)

// --------------------------------
// when句でのプロパティのテスト        
let isAM aDate = 
    match aDate:System.DateTime with 
    | x when x.Hour <= 12-> 
        printfn "午前"
        
    // それ以外の場合
    | _ -> 
        printfn "午後"

// テスト
isAM System.DateTime.Now

// --------------------------------
// 正規表現を使ったパターンマッチング
open System.Text.RegularExpressions

let classifyString aString = 
    match aString with 
    | x when Regex.Match(x,@".+@.+").Success-> 
        printfn "%sはメールアドレスです" aString
        
    // それ以外の場合
    | _ -> 
        printfn "%sは他の何かです" aString


// テスト
classifyString "alice@example.com"
classifyString "google.com"

// --------------------------------
// 任意の条件を使ったパターンマッチング
let fizzBuzz x = 
    match x with 
    | i when i % 15 = 0 -> 
        printfn "fizzbuzz" 
    | i when i % 3 = 0 -> 
        printfn "fizz" 
    | i when i % 5 = 0 -> 
        printfn "buzz" 
    | i  -> 
        printfn "%i" i

// テスト
[1..30] |> List.iter fizzBuzz
```

### ガードの代わりにアクティブパターンを使う

ガードは一回限りのマッチングには素晴らしいです。しかし、何度も使う特定のガードがある場合は、代わりにアクティブパターンの使用を検討してください。

たとえば、上記のメールの例は次のように書き直せます。

```fsharp
open System.Text.RegularExpressions

// メールアドレスにマッチするアクティブパターンを作成
let (|EmailAddress|_|) input =
   let m = Regex.Match(input,@".+@.+") 
   if (m.Success) then Some input else None  

// マッチでアクティブパターンを使う   
let classifyString aString = 
    match aString with 
    | EmailAddress x -> 
        printfn "%sはメールアドレスです" x
        
    // それ以外の場合
    | _ -> 
        printfn "%sは他の何かです" aString

// テスト
classifyString "alice@example.com"
classifyString "google.com"
```

アクティブパターンの他の例は[以前の投稿](../posts/convenience-active-patterns.html)で見ることができます。

## "function"キーワード

これまでの例で、以下のようなコードをたくさん見てきました。

```fsharp
let f aValue = 
    match aValue with 
    | _ -> "何か" 
```

関数定義の特別なケースでは、 `function` キーワードを使ってこれを大幅に簡略化できます。

```fsharp
let f = 
    function 
    | _ -> "何か" 
```

ご覧の通り、 `aValue` パラメータは完全に消え、 `match..with` も消えました。

このキーワードは標準的なラムダの `fun` キーワードとは*同じではなく*、 `fun` と `match..with` を1つのステップで組み合わせたものです。

`function` キーワードは、関数定義やラムダが使える場所ならどこでも使えます。たとえば、ネストされたマッチでも。

```fsharp
// match..withを使う
let f aValue = 
    match aValue with 
    | x -> 
        match x with 
        | _ -> "何か" 

// functionキーワードを使う
let f = 
    function 
    | x -> 
        function 
        | _ -> "何か" 
```

または高階関数に渡されるラムダでも。

```fsharp
// match..withを使う
[2..10] |> List.map (fun i ->
        match i with 
        | 2 | 3 | 5 | 7 -> sprintf "%iは素数です" i
        | _ -> sprintf "%iは素数ではありません" i
        )

// functionキーワードを使う
[2..10] |> List.map (function 
        | 2 | 3 | 5 | 7 -> sprintf "素数"
        | _ -> sprintf "素数ではない"
        )
```

`function` の小さな欠点は、 `match..with` と比べて、元の入力値が見えず、パターン内の値の束縛に頼らなければならないことです。

## try..withを使った例外処理

[前回の投稿](../posts/exceptions.html)では、 `try..with` 式を使った例外のキャッチについて説明しました。

```fsharp
try
    failwith "失敗"
with
    | Failure msg -> "キャッチしました: " + msg
    | :? System.InvalidOperationException as ex -> "予期しない例外"
```
    
`try..with` 式は `match..with` と同じ方法でパターンマッチングを実装します。

上記の例では、カスタムパターンへのマッチングの使い方を見ることができます。

* `| Failure msg` は（アクティブパターンのような）パターンへのマッチングの例です。
* `| :? System.InvalidOperationException as ex` はサブタイプへのマッチング（ `as` の使用も含む）の例です。

`try..with` 式は完全なパターンマッチングを実装しているため、必要に応じてガードも使えます。これにより、追加の条件ロジックを加えることができます。

```fsharp
let debugMode = false
try
    failwith "失敗"
with
    | Failure msg when debugMode  -> 
        reraise()
    | Failure msg when not debugMode -> 
        printfn "本番環境で静かにログに記録: %s" msg
```

    
## match 式を関数でラップする

match 式は非常に便利ですが、注意して使わないと複雑なコードになってしまう可能性があります。

主な問題は、match 式があまりうまく合成できないことです。つまり、 `match..with` 式を連鎖させたり、簡単な式を複雑な式に組み立てるのが難しいのです。

これを避ける最良の方法は、 `match..with` 式を関数でラップすることです。そうすれば、きれいに合成できるようになります。

簡単な例を示します。 `match x with 42` は `isAnswerToEverything` 関数でラップされています。

```fsharp
let times6 x = x * 6

let isAnswerToEverything x = 
    match x with 
    | 42 -> (x,true)
    | _ -> (x,false)

// この関数は連鎖や合成に使える
[1..10] |> List.map (times6 >> isAnswerToEverything)
```

### 明示的なマッチングを置き換えるライブラリ関数

ほとんどの組み込みF#型には、すでにそのような関数が用意されています。

たとえば、リストをループ処理するために再帰を使う代わりに、 `List` モジュールの関数を使いましょう。必要なことはほとんど何でもしてくれます。

特に、先ほど書いた関数

```fsharp
let rec loopAndSum aList sumSoFar = 
    match aList with 
    | [] -> 
        sumSoFar  
    | x::xs -> 
        let newSumSoFar = sumSoFar + x
        loopAndSum xs newSumSoFar 
```

は、 `List` モジュールを使って少なくとも3つの異なる方法で書き直せます！

```fsharp
// 最もシンプル
let loopAndSum1 aList = List.sum aList 
[1..10] |> loopAndSum1 

// reduceは非常に強力    
let loopAndSum2 aList = List.reduce (+) aList 
[1..10] |> loopAndSum2 

// foldは最も強力
let loopAndSum3 aList = List.fold (fun sum i -> sum+i) 0 aList 
[1..10] |> loopAndSum3 
```

同様に、[こちらの記事](../posts/the-option-type.html)で詳しく説明したオプション型には、多くの便利な関数を持つ `Option` モジュールが関連付けられています。

たとえば、 `Some` と `None` に対してマッチングする関数は、 `Option.map` で置き換えられます。

```fsharp
// これを明示的に実装する必要はありません
let addOneIfValid optionalInt = 
    match optionalInt with 
    | Some i -> Some (i + 1)
    | None -> None

Some 42 |> addOneIfValid

// 組み込み関数を使う方がはるかに簡単です
let addOneIfValid2 optionalInt = 
    optionalInt |> Option.map (fun i->i+1)

Some 42 |> addOneIfValid2
```

<a name="folds" ></a>
### マッチングロジックを隠す「畳み込み」関数の作成

最後に、頻繁なマッチングが必要な独自の型を作る場合、
それをきれいにラップする汎用の「畳み込み」関数を作るのが
良い習慣です。

たとえば、温度を定義する型があるとします。

```fsharp
type TemperatureType  = F of float | C of float
```

おそらく、これらのケースに頻繁にマッチングすることになるので、代わりにマッチングを行ってくれる汎用関数を作りましょう。

```fsharp
module Temperature =
    let fold fahrenheitFunction celsiusFunction aTemp =
        match aTemp with
        | F f -> fahrenheitFunction f
        | C c -> celsiusFunction c
```

すべての `fold` 関数は、以下の一般的なパターンに従います。

* union 構造の各ケース（またはマッチパターンの各句）に対して1つの関数があります
* 最後に、実際にマッチングする値が来ます（なぜでしょうか？[「部分適用のための関数設計」](../posts/partial-application.html)の投稿を参照してください）

fold関数ができあがったので、別のコンテキストで使えます。

まず、発熱の検査から始めましょう。華氏で発熱を検査する関数と、摂氏で発熱を検査する関数が必要です。

そして、fold関数を使ってそれらを組み合わせます。

```fsharp
let fFever tempF =
    if tempF > 100.0 then "発熱！" else "正常"

let cFever tempC =
    if tempC > 38.0 then "発熱！" else "正常"

// foldを使って組み合わせる
let isFever aTemp = Temperature.fold fFever cFever aTemp
```

これで、テストしてみましょう。

```fsharp
let normalTemp = C 37.0
let result1 = isFever normalTemp 

let highTemp = F 103.1
let result2 = isFever highTemp 
```

まったく異なる用途として、温度変換ユーティリティを書いてみましょう。

こちらも、各ケースに対する関数を作成してから、それらを組み合わせます。

```fsharp
let fConversion tempF =
    let convertedValue = (tempF - 32.0) / 1.8
    TemperatureType.C convertedValue    // 型でラップ

let cConversion tempC =
    let convertedValue = (tempC * 1.8) + 32.0
    TemperatureType.F convertedValue    // 型でラップ

// foldを使って組み合わせる
let convert aTemp = Temperature.fold fConversion cConversion aTemp
```

変換関数は変換された値を新しい `TemperatureType` でラップしているので、 `convert` 関数のシグネチャは次のようになります。

```fsharp
val convert : TemperatureType -> TemperatureType
```

そして、テストしてみましょう。

```fsharp
let c20 = C 20.0
let resultInF = convert c20

let f75 = F 75.0
let resultInC = convert f75 
```

convertを2回続けて呼び出しても、開始時と同じ温度が返ってくるはずです！

```fsharp
let resultInC = C 20.0 |> convert |> convert
```


foldについては、今後予定されている再帰と再帰型に関するシリーズでさらに詳しく説明します。