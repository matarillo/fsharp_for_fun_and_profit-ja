---
layout: post
title: "簡潔性のためのパターンマッチング"
description: "パターンマッチングは一度の手順でマッチングと束縛が可能"
nav: why-use-fsharp
seriesId: "F# を使う理由"
seriesOrder: 12
categories: [Conciseness, Patterns]
---

これまで、 `match..with` 式でのパターンマッチングのロジックを見てきました。一見すると単なるswitch/case文のように見えますが、実はパターンマッチングはもっと汎用的です。値、条件、型に基づいてさまざまな方法で式を比較し、同時に値の割り当てや抽出を行うことができるのです。

パターンマッチングについては後の投稿で詳しく説明しますが、まずは簡潔性を助ける一つの方法について、簡単に紹介しましょう。
ここでは、式に値を束縛する（変数への代入に相当する関数型の方法）ためにパターンマッチングがどのように使用されるかを見ていきます。

以下の例では、タプルやリストの内部メンバーに直接束縛しています：

```fsharp
//タプルに直接マッチング
let firstPart, secondPart, _ =  (1,2,3)  // アンダースコアは無視を意味する

//リストに直接マッチング
let elem1::elem2::rest = [1..10]       // 今は警告を無視してください

//match..with内でのリストマッチング
let listMatcher aList = 
    match aList with
    | [] -> printfn "リストは空です" 
    | [firstElement] -> printfn "リストには一つの要素 %A があります" firstElement 
    | [first; second] -> printfn "リストは %A と %A です" first second 
    | _ -> printfn "リストには2つ以上の要素があります"

listMatcher [1;2;3;4]
listMatcher [1;2]
listMatcher [1]
listMatcher []
```

レコードのような複雑な構造の内部に値を束縛することもできます。次の例では、 `Address` 型を作成し、そのアドレスを含む `Customer` 型を作ります。次に、顧客の値を作成し、それに対してさまざまなプロパティをマッチングさせます。

```fsharp
// 型を作成
type Address = { Street: string; City: string; }   
type Customer = { ID: int; Name: string; Address: Address}   

// 顧客を作成 
let customer1 = { ID = 1; Name = "Bob"; 
      Address = {Street="123 Main"; City="NY" } }     

// 名前のみを抽出
let { Name=name1 } =  customer1 
printfn "顧客の名前は %s です" name1

// 名前とIDを抽出 
let { ID=id2; Name=name2; } =  customer1 
printfn "%s という名前の顧客のIDは %i です" name2 id2

// 名前と住所を抽出
let { Name=name3;  Address={Street=street3}  } =  customer1   
printfn "%s という名前の顧客は %s に住んでいます" name3 street3
```

最後の例では、 `Address` のサブ構造の中まで到達して、顧客名と同様に通りの名前も取り出せることに注目してください。

ネストした構造を処理し、欲しいフィールドだけを抽出し、それらを値に割り当てる、これらすべてを一度の手順で行えるこの能力は非常に便利です。かなりのコーディングの面倒さを取り除き、典型的なF#コードの簡潔性を生み出すもう一つの要因となっています。
