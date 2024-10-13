---
layout: post
title: "実践例：ローマ数字"
description: "パターンマッチングの実践的な応用"
nav: thinking-functionally
seriesId: "式と構文"
seriesOrder: 12
categories: ["パターン", "実践例"]
---

[前回](../posts/pattern-matching-command-line.md)はコマンドラインの解析について見ました。今回は別のパターンマッチングの例として、ローマ数字を取り上げます。

前回と同様に、内部モデルを「純粋」にして、入力から内部モデルへの変換と、内部モデルから出力への変換を別々の段階で行うよう心がけます。

![](../assets/img/function_transform2.png)

## 要件

まずは要件から始めましょう。

1. "MMMXCLXXIV"のような文字列を受け取り、整数に変換します。
   変換規則は次の通りです：I=1、V=5、X=10、L=50、C=100、D=500、M=1000

   小さい文字が大きい文字の前にある場合、大きい方の値はそれに応じて減らされます。
   たとえば、IV=4、IX=9、XC=90などです。

2. さらに、文字列が有効なローマ数字かどうかを確認します。
   たとえば、"IIVVMM"は有効なローマ数字ではありません。

## 第1版

前回と同様に、まず内部モデルを作り、次に入力を内部モデルに解析する方法を考えます。

モデルの最初の案はこうです。 `RomanNumeral` を `RomanDigits` のリストとして扱います。

```fsharp
type RomanDigit = int
type RomanNumeral = RomanDigit list 
```

いや、ちょっと待ってください！ `RomanDigit` は単なる*任意の*数字ではありません。限られた集合から選ぶべきです。

また、 `RomanNumeral` は単なる数字のリストの[型エイリアス](../posts/type-abbreviations.md)であってはなりません。独自の特別な型である方が良いでしょう。
これは[単一ケースの判別共用体](../posts/discriminated-unions.md)を作ることで実現できます。

こちらがより良いバージョンです。

```fsharp
type RomanDigit = I | V | X | L | C | D | M
type RomanNumeral = RomanNumeral of RomanDigit list 
```

### 出力：ローマ数字から整数への変換

次に、出力ロジック、つまりローマ数字を整数に変換する部分を考えましょう。

1文字の数字を変換するのは簡単です。

```fsharp
/// 1つのRomanDigitを整数に変換する
let digitToInt =
    function
    | I -> 1
    | V -> 5
    | X -> 10
    | L -> 50
    | C -> 100
    | D -> 500
    | M -> 1000

// テスト
I  |> digitToInt
V  |> digitToInt
M  |> digitToInt
```

ここでは `match..with` 式の代わりに `function` キーワードを使っています。

数字のリストを変換するには、再び再帰的なループを使います。
次の数字を先読みして、現在の数字より大きい場合にはその差を使うという特別なケースがあります。

```fsharp
let rec digitsToInt =
    function
        
    // 空リストは0
    | [] -> 0

    // 小さい数字が大きい数字の前にある特殊ケース
    // 両方の数字を変換し、その差を合計に加える 
	// 例： "IV" と "CM"
    | smaller::larger::ns when smaller < larger -> 
        (digitToInt larger - digitToInt smaller)  + digitsToInt ns

    // それ以外の場合は数字を変換して合計に加える 
    | digit::ns -> 
        digitToInt digit + digitsToInt ns

// テスト
[I;I;I;I]  |> digitsToInt
[I;V]  |> digitsToInt
[V;I]  |> digitsToInt
[I;X]  |> digitsToInt
[M;C;M;L;X;X;I;X]  |> digitsToInt // 1979
[M;C;M;X;L;I;V] |> digitsToInt // 1944
```

*「より小さい」演算を定義する必要がなかったことに注目してください。型は宣言順で自動的にソートされます。*

最後に、 `RomanNumeral` 型自体を変換するには、内容をリストに展開して `digitsToInt` を呼び出します。

```fsharp
/// RomanNumeralを整数に変換する
let toInt (RomanNumeral digits) = digitsToInt digits

// テスト
let x = RomanNumeral [I;I;I;I]
x |> toInt

let x = RomanNumeral [M;C;M;L;X;X;I;X]
x |> toInt
```

これで出力の処理が完了しました。

### 入力：文字列からローマ数字への変換

次に、入力ロジック、つまり文字列を内部モデルに変換する部分を考えましょう。

まず、1文字の変換を扱います。一見単純そうです。

```fsharp
let charToRomanDigit =
    function
    | 'I' -> I
    | 'V' -> V
    | 'X' -> X
    | 'L' -> L
    | 'C' -> C
    | 'D' -> D
    | 'M' -> M
```

コンパイラがエラーを吐きました！他の文字が入力された場合はどうなるでしょうか？

これは[網羅的パターンマッチング](../posts/correctness-exhaustive-pattern-matching.md)が不足している要件について考えさせてくれる良い例です。

では、不正な入力に対してはどうすればよいでしょうか。エラーメッセージを表示するのはどうでしょう？

再度試してみましょう。今度は他のすべての文字を扱うケースを加えます。

```fsharp
let charToRomanDigit =
    function
    | 'I' -> I
    | 'V' -> V
    | 'X' -> X
    | 'L' -> L
    | 'C' -> C
    | 'D' -> D
    | 'M' -> M
	| ch -> eprintf "%cは無効な文字です" ch
```

コンパイラはこれも気に入らないようです！通常のケースは有効な `RomanDigit` を返しますが、エラーケースは `unit` を返します。[以前の投稿](../posts/pattern-matching.md)で見たように、すべての分岐は同じ型を返さなければなりません。

これをどう直せばいいでしょうか？例外を投げることもできますが、それは少し大げさかもしれません。よく考えると、 `charToRomanDigit` が*常に*有効な `RomanDigit` を返すことができるわけではありません。
返せる場合もあれば、返せない場合もあります。つまり、ここではオプション型のようなものを使う必要があります。

さらに考えると、不正な文字が何だったかを呼び出し元に知らせる必要があるかもしれません。そこで、両方のケースを保持するためにオプション型の変種を自作する必要があります。

これが修正版です。

```fsharp
type ParsedChar = 
    | Digit of RomanDigit 
    | BadChar of char

let charToRomanDigit =
    function
    | 'I' -> Digit I
    | 'V' -> Digit V
    | 'X' -> Digit X
    | 'L' -> Digit L
    | 'C' -> Digit C
    | 'D' -> Digit D
    | 'M' -> Digit M
    | ch -> BadChar ch
```

エラーメッセージは削除しました。不正な文字が返されるので、呼び出し元が `BadChar` ケースに対して独自のメッセージを表示できます。

次に、関数のシグネチャが期待通りかを確認しましょう。

```fsharp
charToRomanDigit : char -> ParsedChar
```

良さそうです。

では、文字列をこれらの数字に変換するにはどうすればよいでしょうか？文字列をchar配列に変え、それをリストに変換し、最後に `charToRomanDigit` を使って変換します。

```fsharp
let toRomanDigitList s = 
    s.ToCharArray() // エラー FS0072
    |> List.ofArray 
    |> List.map charToRomanDigit
```

しかし、コンパイラは再び「FS0072: 型が特定できないオブジェクトに対する参照」というエラーを出します。

これは通常、関数ではなくメソッドを使った場合に起こります。どのオブジェクトでも `.ToCharArray()` を実装できるので、型推論はどの型が意図されているか判断できません。

この場合の解決方法は、パラメータに明示的な型注釈を付けることです。これが今回初めての型注釈です！

```fsharp
let toRomanDigitList (s:string) = 
    s.ToCharArray() 
    |> List.ofArray 
    |> List.map charToRomanDigit
```

しかし、シグネチャを見てください。

```fsharp
toRomanDigitList : string -> ParsedChar list
```

`RomanDigits` ではなく、厄介な `ParsedChar` がまだ含まれています。どうすればよいでしょうか？答えは、再び責任を先送りして、他の誰かに対処させることです！

この場合、「責任を先送りする」ことは実際には良い設計原則です。この関数はクライアントが何をしたいのか知りません。エラーを無視したいクライアントもいれば、すぐに失敗させたいクライアントもいるかもしれません。だから、情報を返して、クライアントに決めさせましょう。

この場合、クライアントは `RomanNumeral` 型を作るトップレベルの関数です。これが最初の試みです。

```fsharp
// 文字列をRomanNumeralに変換する
let toRomanNumeral s = 
    toRomanDigitList s
    |> RomanNumeral
```

コンパイラは満足していません。 `RomanNumeral` コンストラクタは `RomanDigits` のリストを必要としますが、 `toRomanDigitList` は `ParsedChars` のリストを返しています。

ここで**ようやく**、エラー処理ポリシーを決める必要があります。不正な文字を無視し、エラーが起きたら表示することにしましょう。これには `List.choose` 関数を使います。
これは `List.map` に似ていますが、フィルタも組み込まれています。有効な要素（ `Some something` ）は返され、 `None` の要素は除かれます。

従って、choose関数は以下のようになります。

* 有効な数字に対しては `Some digit` を返す 
* 無効な `BadChars` に対しては、エラーメッセージを表示し `None` を返す

これを行えば、 `List.choose` の出力は `RomanDigits` のリストとなり、 `RomanNumeral` コンストラクタへの入力として必要なものになります。

以下がすべてをまとめたものです。

```fsharp
/// 文字列をRomanNumeralに変換する
/// 入力の検証は行わない。たとえば、"IVIV"は有効となる
let toRomanNumeral s = 
    toRomanDigitList s
    |> List.choose (
        function 
        | Digit digit -> 
            Some digit 
        | BadChar ch -> 
            eprintfn "%cは無効な文字です" ch
            None
        )
    |> RomanNumeral
```

テストしてみましょう！

```fsharp
// 正常系のテスト

"IIII"  |> toRomanNumeral
"IV"  |> toRomanNumeral
"VI"  |> toRomanNumeral
"IX"  |> toRomanNumeral
"MCMLXXIX"  |> toRomanNumeral
"MCMXLIV" |> toRomanNumeral
"" |> toRomanNumeral

// エラーケース
"MC?I" |> toRomanNumeral
"abc" |> toRomanNumeral
```

ここまで順調です。次は検証に移りましょう。

### 検証ルール

要件には検証ルールが明記されていなかったので、ローマ数字について知っていることに基づいて推測をしてみましょう。

* 同じ数字が5つ以上連続するのは禁止
* 一部の数字は最大4つまで連続して使える。それはI、X、C、M。他の数字（V、L、D）は単独でのみ使用可
* 一部の小さい数字は大きい数字の前に来られるが、単独の場合に限る。たとえば、「IX」は有効だが、「IIIX」は無効
* ただし、これは数字のペアに限る。3つの昇順の数字が連続するのは無効。たとえば、「IX」は有効だが、「IXC」は無効
* 単独の数字は常に許可

これらの要件をパターンマッチング関数に変換すると、次のようになります。

```fsharp
let runsAllowed = 
    function 
    | I | X | C | M -> true
    | V | L | D -> false

let noRunsAllowed  = runsAllowed >> not 

// 有効性のチェック
let rec isValidDigitList digitList =
    match digitList with

    // 空リストは有効
    | [] -> true

    // 5つ以上の連続は無効
    // 例：  XXXXX
    | d1::d2::d3::d4::d5::_ 
        when d1=d2 && d1=d3 && d1=d4 && d1=d5 -> 
            false

    // 連続不可の数字が2つ以上は無効
    // 例：  VV
    | d1::d2::_ 
        when d1=d2 && noRunsAllowed d1 -> 
            false

    // 中間の2,3,4の連続は、次の数字がより大きい場合無効
    // 例：  IIIX
    | d1::d2::d3::d4::higher::ds 
        when d1=d2 && d1=d3 && d1=d4 
        && runsAllowed d1 // マッチングの順序により実際には不要
        && higher > d1 -> 
            false

    | d1::d2::d3::higher::ds 
        when d1=d2 && d1=d3 
        && runsAllowed d1 
        && higher > d1 -> 
            false

    | d1::d2::higher::ds 
        when d1=d2 
        && runsAllowed d1 
        && higher > d1 -> 
            false

    // 3つの昇順の数字の連続は無効
    // 例：  IVX
    | d1::d2::d3::_  when d1<d2 && d2<= d3 -> 
        false

    // 連続のない単一の数字は常に許可
    | _::ds -> 
        // リストの残りをチェック
        isValidDigitList ds 

```

*ここでも、「等号」と「未満」を定義する必要がなかったことに注目してください。*

検証をテストしてみましょう。

```fsharp
// 有効なケースのテスト 
let validList = [
    [I;I;I;I]
    [I;V]
    [I;X]
    [I;X;V]
    [V;X]
    [X;I;V]
    [X;I;X]
    [X;X;I;I]
    ]

let testValid = validList |> List.map isValidDigitList

let invalidList = [
    // 5つ以上の連続は許されない
    [I;I;I;I;I]
    // V、L、Dの2つ連続は許されない
    [V;V] 
    [L;L] 
    [D;D]
    // 中間の2,3,4の連続は、次の数字がより大きい場合無効
    [I;I;V]
    [X;X;X;M]
    [C;C;C;C;D]
    // 3つの昇順の数字の連続は無効
    [I;V;X]
    [X;L;D]
    ]
let testInvalid = invalidList |> List.map isValidDigitList
```

最後に、 `RomanNumeral` 型自体の有効性を確認するトップレベル関数を追加します。
```fsharp
// 有効性チェックのトップレベル関数
let isValid (RomanNumeral digitList) =
    isValidDigitList digitList


// 正常系のテスト
"IIII"  |> toRomanNumeral |> isValid
"IV"  |> toRomanNumeral |> isValid
"" |> toRomanNumeral |> isValid

// エラーケース
"IIXX" |> toRomanNumeral |> isValid
"VV" |> toRomanNumeral |> isValid

// 総仕上げ
[ "IIII"; "XIV"; "MMDXC"; 
"IIXX"; "VV"; ]
|> List.map toRomanNumeral 
|> List.iter (function
    | n when isValid n ->
        printfn "%Aは有効で、整数値は%iです" n (toInt n) 
    | n ->
        printfn "%Aは無効です" n
    )
```

## 第1版の全コード

以下が1つのモジュールにまとめた全コードです。

```fsharp
module RomanNumeralsV1 =

    // ==========================================
    // 型
    // ==========================================

    type RomanDigit = I | V | X | L | C | D | M
    type RomanNumeral = RomanNumeral of RomanDigit list 

    // ==========================================
    // 出力ロジック
    // ==========================================

    /// 1つのRomanDigitを整数に変換する
    let digitToInt =
        function
        | I -> 1
        | V -> 5
        | X -> 10
        | L -> 50
        | C -> 100
        | D -> 500
        | M -> 1000

    /// 数字のリストを整数に変換する
    let rec digitsToInt =
        function
        
        // 空リストは0
        | [] -> 0

        // 小さい数字が大きい数字の前にある特殊ケース
        // 両方の数字を変換し、その差を合計に加える 
        // 例： "IV" と "CM"
        | smaller::larger::ns when smaller < larger -> 
            (digitToInt larger - digitToInt smaller)  + digitsToInt ns

        // それ以外の場合は数字を変換して合計に加える 
        | digit::ns -> 
            digitToInt digit + digitsToInt ns

    /// RomanNumeralを整数に変換する
    let toInt (RomanNumeral digits) = digitsToInt digits

    // ==========================================
    // 入力ロジック
    // ==========================================

    type ParsedChar = 
        | Digit of RomanDigit 
        | BadChar of char

    let charToRomanDigit =
        function
        | 'I' -> Digit I
        | 'V' -> Digit V
        | 'X' -> Digit X
        | 'L' -> Digit L
        | 'C' -> Digit C
        | 'D' -> Digit D
        | 'M' -> Digit M
        | ch -> BadChar ch

    let toRomanDigitList (s:string) = 
        s.ToCharArray() 
        |> List.ofArray 
        |> List.map charToRomanDigit

    /// 文字列をRomanNumeralに変換する
    /// 入力の検証は行わない。たとえば、"IVIV"は有効となる
    let toRomanNumeral s = 
        toRomanDigitList s
        |> List.choose (
            function 
            | Digit digit -> 
                Some digit 
            | BadChar ch -> 
                eprintfn "%cは無効な文字です" ch
                None
            )
        |> RomanNumeral

    // ==========================================
    // 検証ロジック
    // ==========================================

    let runsAllowed = 
        function 
        | I | X | C | M -> true
        | V | L | D -> false

    let noRunsAllowed  = runsAllowed >> not 

    // 有効性のチェック
    let rec isValidDigitList digitList =
        match digitList with

        // 空リストは有効
        | [] -> true

        // 5つ以上の連続は無効
        // 例：  XXXXX
        | d1::d2::d3::d4::d5::_ 
            when d1=d2 && d1=d3 && d1=d4 && d1=d5 -> 
                false

        // 連続不可の数字が2つ以上は無効
        // 例：  VV
        | d1::d2::_ 
            when d1=d2 && noRunsAllowed d1 -> 
                false

        // 中間の2,3,4の連続は、次の数字がより大きい場合無効
        // 例：  IIIX
        | d1::d2::d3::d4::higher::ds 
            when d1=d2 && d1=d3 && d1=d4 
            && runsAllowed d1 // マッチングの順序により実際には不要
            && higher > d1 -> 
                false

        | d1::d2::d3::higher::ds 
            when d1=d2 && d1=d3 
            && runsAllowed d1 
            && higher > d1 -> 
                false

        | d1::d2::higher::ds 
            when d1=d2 
            && runsAllowed d1 
            && higher > d1 -> 
                false

        // 3つの昇順の数字の連続は無効
        // 例：  IVX
        | d1::d2::d3::_  when d1<d2 && d2<= d3 -> 
            false

        // 連続のない単一の数字は常に許可
        | _::ds -> 
            // リストの残りをチェック
            isValidDigitList ds 

    // 有効性チェックのトップレベル関数
    let isValid (RomanNumeral digitList) =
        isValidDigitList digitList

```

## 第2版

コードは動きますが、気になる点があります。検証ロジックが非常に複雑に見えます。ローマ人がこれほど複雑なことを考えていたはずがありません。

また、「VIV」のように、検証に失敗すべきなのに、成功してしまう例が考えられます。

```fsharp
"VIV" |> toRomanNumeral |> isValid
```

検証ルールをさらに厳しくすることもできますが、別のアプローチを試してみましょう。複雑なロジックは、多くの場合、ドメインを正しく理解していないサインです。

つまり、内部モデルを変えてすべてをシンプルにできないでしょうか？

文字を数字に対応させようとするのではなく、ローマ人がどう考えていたかを反映したドメインを作ってはどうでしょうか。このモデルでは、「I」、「II」、「III」、「IV」などがそれぞれ別の数字となります。

この考えに基づいて進めてみましょう。

ドメインの新しい型は以下のようになります。今回は、可能なすべての数字に対して数字型を用意しました。 `RomanNumeral` 型は同じままです。

```fsharp
type RomanDigit = 
    | I | II | III | IIII 
    | IV | V 
    | IX | X | XX | XXX | XXXX  
    | XL | L 
    | XC | C | CC | CCC | CCCC 
    | CD | D 
    | CM | M | MM | MMM | MMMM
type RomanNumeral = RomanNumeral of RomanDigit list 
```

### 出力：第2版

次に、1つの `RomanDigit` を整数に変える部分は以前と同じですが、ケースが増えています。

```fsharp
/// 1つのRomanDigitを整数に変換する
let digitToInt =
    function
    | I -> 1 | II -> 2 | III -> 3 | IIII -> 4 
    | IV -> 4 | V -> 5
    | IX -> 9 | X -> 10 | XX -> 20 | XXX -> 30 | XXXX -> 40 
    | XL -> 40 | L -> 50 
    | XC -> 90 | C -> 100 | CC -> 200 | CCC -> 300 | CCCC -> 400 
    | CD -> 400 | D -> 500 
    | CM -> 900 | M -> 1000 | MM -> 2000 | MMM -> 3000 | MMMM -> 4000

// テスト
I  |> digitToInt
III  |> digitToInt
V  |> digitToInt
CM  |> digitToInt
```

数字の合計を計算する部分は今やシンプルです。特別なケースは必要ありません。

```fsharp
/// 数字のリストを整数に変換する
let digitsToInt list = 
    list |> List.sumBy digitToInt 

// テスト
[IIII]  |> digitsToInt
[IV]  |> digitsToInt
[V;I]  |> digitsToInt
[IX]  |> digitsToInt
[M;CM;L;X;X;IX]  |> digitsToInt // 1979
[M;CM;XL;IV] |> digitsToInt // 1944
```

最後に、トップレベルの関数は同じです。

```fsharp
/// RomanNumeralを整数に変換する
let toInt (RomanNumeral digits) = digitsToInt digits

// テスト
let x = RomanNumeral [M;CM;LX;X;IX]
x |> toInt
```

### 入力：第2版

入力の解析については、 `ParsedChar` 型を保持します。しかし今回は、1、2、3、または4文字を一度にマッチさせる必要があります。
つまり、第1版のように1文字ずつ取り出すのではなく、メインループでマッチさせる必要があります。これはループが再帰的になることを意味します。

また、IIIIを4つの別々の `I` という数字ではなく、1つの `IIII` という数字に変えたいので、最も長いマッチを先頭に置きます。

```fsharp
type ParsedChar = 
    | Digit of RomanDigit 
    | BadChar of char

let rec toRomanDigitListRec charList = 
    match charList with
    // 最長のパターンを最初に照合

    // 4文字照合
    | 'I'::'I'::'I'::'I'::ns -> 
        Digit IIII :: (toRomanDigitListRec ns)
    | 'X'::'X'::'X'::'X'::ns -> 
        Digit XXXX :: (toRomanDigitListRec ns)
    | 'C'::'C'::'C'::'C'::ns -> 
        Digit CCCC :: (toRomanDigitListRec ns)
    | 'M'::'M'::'M'::'M'::ns -> 
        Digit MMMM :: (toRomanDigitListRec ns)

    // 3文字照合
    | 'I'::'I'::'I'::ns -> 
        Digit III :: (toRomanDigitListRec ns)
    | 'X'::'X'::'X'::ns -> 
        Digit XXX :: (toRomanDigitListRec ns)
    | 'C'::'C'::'C'::ns -> 
        Digit CCC :: (toRomanDigitListRec ns)
    | 'M'::'M'::'M'::ns -> 
        Digit MMM :: (toRomanDigitListRec ns)

    // 2文字照合
    | 'I'::'I'::ns -> 
        Digit II :: (toRomanDigitListRec ns)
    | 'X'::'X'::ns -> 
        Digit XX :: (toRomanDigitListRec ns)
    | 'C'::'C'::ns -> 
        Digit CC :: (toRomanDigitListRec ns)
    | 'M'::'M'::ns -> 
        Digit MM :: (toRomanDigitListRec ns)

    | 'I'::'V'::ns -> 
        Digit IV :: (toRomanDigitListRec ns)
    | 'I'::'X'::ns -> 
        Digit IX :: (toRomanDigitListRec ns)
    | 'X'::'L'::ns -> 
        Digit XL :: (toRomanDigitListRec ns)
    | 'X'::'C'::ns -> 
        Digit XC :: (toRomanDigitListRec ns)
    | 'C'::'D'::ns -> 
        Digit CD :: (toRomanDigitListRec ns)
    | 'C'::'M'::ns -> 
        Digit CM :: (toRomanDigitListRec ns)

    // 1文字照合
    | 'I'::ns -> 
        Digit I :: (toRomanDigitListRec ns)
    | 'V'::ns -> 
        Digit V :: (toRomanDigitListRec ns)
    | 'X'::ns -> 
        Digit X :: (toRomanDigitListRec ns)
    | 'L'::ns -> 
        Digit L :: (toRomanDigitListRec ns)
    | 'C'::ns -> 
        Digit C :: (toRomanDigitListRec ns)
    | 'D'::ns -> 
        Digit D :: (toRomanDigitListRec ns)
    | 'M'::ns -> 
        Digit M :: (toRomanDigitListRec ns)

    // 不正な文字照合
    | badChar::ns -> 
        BadChar badChar :: (toRomanDigitListRec ns)

    // 0文字照合
    | [] -> 
        []

```

この部分は第1版よりもかなり長くなりましたが、基本的には同じです。

トップレベルの関数は変わっていません。

```fsharp
let toRomanDigitList (s:string) = 
    s.ToCharArray() 
    |> List.ofArray 
    |> toRomanDigitListRec

/// 文字列をRomanNumeralに変換する
let toRomanNumeral s = 
    toRomanDigitList s
    |> List.choose (
        function 
        | Digit digit -> 
            Some digit 
        | BadChar ch -> 
            eprintfn "%cは無効な文字です" ch
            None
        )
    |> RomanNumeral

// 正常系のテスト
"IIII"  |> toRomanNumeral
"IV"  |> toRomanNumeral
"VI"  |> toRomanNumeral
"IX"  |> toRomanNumeral
"MCMLXXIX"  |> toRomanNumeral
"MCMXLIV" |> toRomanNumeral
"" |> toRomanNumeral

// エラーケース
"MC?I" |> toRomanNumeral
"abc" |> toRomanNumeral
```

### 検証：第2版

最後に、新しいドメインモデルが検証ルールにどう影響するか見てみましょう。今回、ルールは*はるかに*シンプルになりました。実際、ルールは1つだけです。

* 各数字は前の数字より小さくなければならない

```fsharp
// 有効性のチェック
let rec isValidDigitList digitList =
    match digitList with

    // 空リストは有効
    | [] -> true

    // 次の数字が等しいかより大きい場合はエラー
    | d1::d2::_ 
        when d1 <= d2  -> 
            false

    // 単一の数字は常に許可
    | _::ds -> 
        // リストの残りをチェック
        isValidDigitList ds 

// 有効性チェックのトップレベル関数
let isValid (RomanNumeral digitList) =
    isValidDigitList digitList

// 正常系のテスト
"IIII"  |> toRomanNumeral |> isValid
"IV"  |> toRomanNumeral |> isValid
"" |> toRomanNumeral |> isValid

// エラーケース
"IIXX" |> toRomanNumeral |> isValid
"VV" |> toRomanNumeral |> isValid

```

残念ながら、これだけの作業をしても、書き直しのきっかけとなった悪いケースはまだ直っていません！

```fsharp
"VIV" |> toRomanNumeral |> isValid
```

これを直すためのそれほど複雑でない方法はあるのですが、もう放置しておこうと思います！

## 第2版の全コード

以下が第2版の全コードを1つのモジュールにまとめたものです。

```fsharp
module RomanNumeralsV2 =

    // ==========================================
    // 型
    // ==========================================

    type RomanDigit = 
        | I | II | III | IIII 
        | IV | V 
        | IX | X | XX | XXX | XXXX  
        | XL | L 
        | XC | C | CC | CCC | CCCC 
        | CD | D 
        | CM | M | MM | MMM | MMMM
    type RomanNumeral = RomanNumeral of RomanDigit list 

    // ==========================================
    // 出力ロジック
    // ==========================================

    /// 1つのRomanDigitを整数に変換する
    let digitToInt =
        function
        | I -> 1 | II -> 2 | III -> 3 | IIII -> 4 
        | IV -> 4 | V -> 5
        | IX -> 9 | X -> 10 | XX -> 20 | XXX -> 30 | XXXX -> 40 
        | XL -> 40 | L -> 50 
        | XC -> 90 | C -> 100 | CC -> 200 | CCC -> 300 | CCCC -> 400 
        | CD -> 400 | D -> 500 
        | CM -> 900 | M -> 1000 | MM -> 2000 | MMM -> 3000 | MMMM -> 4000

    /// RomanNumeralを整数に変換する
    let toInt (RomanNumeral digits) = digitsToInt digits

    // ==========================================
    // 入力ロジック
    // ==========================================

    type ParsedChar = 
        | Digit of RomanDigit 
        | BadChar of char

    let rec toRomanDigitListRec charList = 
        match charList with
        // 最長のパターンを最初に照合

        // 4文字照合
        | 'I'::'I'::'I'::'I'::ns -> 
            Digit IIII :: (toRomanDigitListRec ns)
        | 'X'::'X'::'X'::'X'::ns -> 
            Digit XXXX :: (toRomanDigitListRec ns)
        | 'C'::'C'::'C'::'C'::ns -> 
            Digit CCCC :: (toRomanDigitListRec ns)
        | 'M'::'M'::'M'::'M'::ns -> 
            Digit MMMM :: (toRomanDigitListRec ns)

        // 3文字照合
        | 'I'::'I'::'I'::ns -> 
            Digit III :: (toRomanDigitListRec ns)
        | 'X'::'X'::'X'::ns -> 
            Digit XXX :: (toRomanDigitListRec ns)
        | 'C'::'C'::'C'::ns -> 
            Digit CCC :: (toRomanDigitListRec ns)
        | 'M'::'M'::'M'::ns -> 
            Digit MMM :: (toRomanDigitListRec ns)

        // 2文字照合
        | 'I'::'I'::ns -> 
            Digit II :: (toRomanDigitListRec ns)
        | 'X'::'X'::ns -> 
            Digit XX :: (toRomanDigitListRec ns)
        | 'C'::'C'::ns -> 
            Digit CC :: (toRomanDigitListRec ns)
        | 'M'::'M'::ns -> 
            Digit MM :: (toRomanDigitListRec ns)

        | 'I'::'V'::ns -> 
            Digit IV :: (toRomanDigitListRec ns)
        | 'I'::'X'::ns -> 
            Digit IX :: (toRomanDigitListRec ns)
        | 'X'::'L'::ns -> 
            Digit XL :: (toRomanDigitListRec ns)
        | 'X'::'C'::ns -> 
            Digit XC :: (toRomanDigitListRec ns)
        | 'C'::'D'::ns -> 
            Digit CD :: (toRomanDigitListRec ns)
        | 'C'::'M'::ns -> 
            Digit CM :: (toRomanDigitListRec ns)

        // 1文字照合
        | 'I'::ns -> 
            Digit I :: (toRomanDigitListRec ns)
        | 'V'::ns -> 
            Digit V :: (toRomanDigitListRec ns)
        | 'X'::ns -> 
            Digit X :: (toRomanDigitListRec ns)
        | 'L'::ns -> 
            Digit L :: (toRomanDigitListRec ns)
        | 'C'::ns -> 
            Digit C :: (toRomanDigitListRec ns)
        | 'D'::ns -> 
            Digit D :: (toRomanDigitListRec ns)
        | 'M'::ns -> 
            Digit M :: (toRomanDigitListRec ns)

        // 不正な文字照合
        | badChar::ns -> 
            BadChar badChar :: (toRomanDigitListRec ns)

        // 0文字照合
        | [] -> 
            []

    let toRomanDigitList (s:string) = 
        s.ToCharArray() 
        |> List.ofArray 
        |> toRomanDigitListRec

    /// 文字列をRomanNumeralに変換する
    /// 入力の検証は行わない。たとえば、"IVIV"は有効となる
    let toRomanNumeral s = 
        toRomanDigitList s
        |> List.choose (
            function 
            | Digit digit -> 
                Some digit 
            | BadChar ch -> 
                eprintfn "%cは無効な文字です" ch
                None
            )
        |> RomanNumeral

    // ==========================================
    // 検証ロジック
    // ==========================================

    // 有効性のチェック
    let rec isValidDigitList digitList =
        match digitList with

        // 空リストは有効
        | [] -> true

        // 次の数字が等しいかより大きい場合はエラー
        | d1::d2::_ 
            when d1 <= d2  -> 
                false

        // 単一の数字は常に許可
        | _::ds -> 
            // リストの残りをチェック
            isValidDigitList ds 

    // 有効性チェックのトップレベル関数
    let isValid (RomanNumeral digitList) =
        isValidDigitList digitList


```

## 2つのバージョンの比較

どちらのバージョンが好みですか？第2版はケースが多いため長くなっていますが、一方で実際のロジックは全ての領域で同じかより単純で、特別なケースはありません。
結果として、両バージョンのコードの総行数はほぼ同じです。

全体として、特別なケースがないため、私は第2の実装の方が好みです。

面白い実験として、同じコードをC#や好きな命令型言語で書いてみてください！

## オブジェクト指向にする

最後に、これをオブジェクト指向にする方法を見てみましょう。ヘルパー関数は気にしないので、おそらく3つのメソッドだけが必要です。

* 静的コンストラクタ
* 整数に変換するメソッド
* 文字列に変換するメソッド

以下がそれらです。

```fsharp
type RomanNumeral with

    static member FromString s = 
        toRomanNumeral s

    member this.ToInt() = 
        toInt this

    override this.ToString() = 
        sprintf "%A" this
```

*注：非推奨のオーバーライドに関するコンパイラの警告は無視してください。*

では、これをオブジェクト指向的に使ってみましょう。

```fsharp
let r = RomanNumeral.FromString "XXIV"
let s = r.ToString()
let i = r.ToInt()
```


## まとめ

この記事では、たくさんのパターンマッチングを見てきました！

しかし、前回の記事と同様に、同じくらい重要なのは、非常に小さなドメインに対しても、適切に設計された内部モデルを簡単に作れることを見てきたことです。
そして今回も、内部モデルにはプリミティブ型を使いませんでした。ドメインをより良く表現するために、小さな型をたくさん作ることをためらう理由はありません。たとえば、 `ParsedChar` 型について、C#でこれを作ろうと思いましたか？

そして明らかなように、内部モデルの選び方は設計の複雑さに大きな影響を与える可能性があります。しかし、リファクタリングをする場合でも、何かを忘れていればコンパイラがほぼ常に警告してくれるでしょう。

