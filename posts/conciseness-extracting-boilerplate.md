---
layout: post
title: "関数を使用してボイラープレートコードを抽出する"
description: "DRY原則への関数型アプローチ"
nav: why-use-fsharp
seriesId: "F# を使う理由"
seriesOrder: 10
categories: [Conciseness, Functions, Folds]
---

このシリーズの最初の例では、F#とC#の両方で実装された、平方和を計算する簡単な関数を見ました。
ここで、以下のような類似した新しい関数が必要になったとしましょう：

* Nまでのすべての数の積を計算する
* Nまでの奇数の和を数える
* Nまでの数の交互和を計算する

明らかに、これらの要件はすべて似ていますが、共通の機能をどのように抽出できるでしょうか？

まずは、C#での直接的な実装から始めましょう：

```csharp
public static int Product(int n)
{
    int product = 1;
    for (int i = 1; i <= n; i++)
    {
        product *= i;
    }
    return product;
}

public static int SumOfOdds(int n)
{
    int sum = 0;
    for (int i = 1; i <= n; i++)
    {
        if (i % 2 != 0) { sum += i; }
    }
    return sum;
}

public static int AlternatingSum(int n)
{
    int sum = 0;
    bool isNeg = true;
    for (int i = 1; i <= n; i++)
    {
        if (isNeg)
        {
            sum -= i;
            isNeg = false;
        }
        else
        {
            sum += i;
            isNeg = true;
        }
    }
    return sum;
}
```

これらの実装に共通しているのは何でしょうか？ それはループのロジックです！ プログラマーとして、私たちはDRY原則（「繰り返すな」）を覚えておくように言われていますが、ここではほぼ同じループロジックを毎回繰り返しています。これら3つのメソッドの違いだけを抽出できないか見てみましょう：

<table class="table">
<thead>
  <tr>
    <th>関数</th>
    <th>初期値</th>
    <th>内部ループのロジック</th>
  </tr>
</thead>
<tbody>
  <tr>
    <td>Product</td>
    <td>product=1</td>
    <td>i番目の値を実行中の合計に掛ける</td>
  </tr>
  <tr>
    <td>SumOfOdds</td>
    <td>sum=0</td>
    <td>偶数でない場合、i番目の値を実行中の合計に加える</td>
  </tr>
  <tr>
    <td>AlternatingSum</td>
    <td>int sum = 0<br>bool isNeg = true</td>
    <td>isNegフラグを使用して加算するか減算するかを決定し、次の処理のためにフラグを反転させる</td>
  </tr>
</tbody>
</table>

重複するコードを取り除き、セットアップと内部ループのロジックだけに焦点を当てる方法はありますか？ はい、あります。以下がF#での同じ3つの関数です：

```fsharp
let product n = 
    let initialValue = 1
    let action productSoFar x = productSoFar * x
    [1..n] |> List.fold action initialValue

//テスト
product 10

let sumOfOdds n = 
    let initialValue = 0
    let action sumSoFar x = if x%2=0 then sumSoFar else sumSoFar+x 
    [1..n] |> List.fold action initialValue

//テスト
sumOfOdds 10

let alternatingSum n = 
    let initialValue = (true,0)
    let action (isNeg,sumSoFar) x = if isNeg then (false,sumSoFar-x)
                                             else (true ,sumSoFar+x)
    [1..n] |> List.fold action initialValue |> snd

//テスト
alternatingSum 100
```

これら3つの関数はすべて同じパターンを持っています：

1. 初期値を設定する
2. ループ内の各要素に対して実行されるアクション関数を設定する
3. ライブラリ関数 `List.fold` を呼び出す。これは強力な汎用関数で、初期値から始めて、リスト内の各要素に対してアクション関数を順番に実行します。

アクション関数には常に2つのパラメータがあります：実行中の合計（または状態）とアクションを実行するリスト要素（上記の例では "x" と呼ばれています）です。

最後の関数 `alternatingSum` では、初期値とアクションの結果にタプル（値のペア）を使用していることに気づくでしょう。これは、実行中の合計と `isNeg` フラグの両方をループの次の反復に渡す必要があるためです - 使用できる「グローバル」な値はありません。foldの最終結果もタプルなので、欲しい最終合計を抽出するために "snd"（2番目）関数を使用する必要があります。

`List.fold` を使用し、ループのロジックを完全に避けることで、F#のコードはいくつかの利点を得ています：

* **主要なプログラムロジックが強調され、明示的になります**。関数間の重要な違いが非常に明確になり、共通点は背景に押しやられます。
* **定型的なループコードが排除されます**。結果としてコードはC#バージョンよりも簡潔になります（F#コードは4-5行に対し、C#コードは少なくとも9行）。
* **ループロジックにエラーが発生することはありません**（例えば、1つずれるなど）。なぜなら、そのロジックが私たちに露出していないからです。

ちなみに、平方和の例も `fold` を使って書くことができます：

```fsharp
let sumOfSquaresWithFold n = 
    let initialValue = 0
    let action sumSoFar x = sumSoFar + (x*x)
    [1..n] |> List.fold action initialValue 

//テスト
sumOfSquaresWithFold 100
```

## C#での "Fold" ##

C#で "fold" アプローチを使用できますか？はい、できます。LINQには `fold` に相当する `Aggregate` があります。以下がそれを使用して書き直したC#コードです：

```csharp
public static int ProductWithAggregate(int n)
{
    var initialValue = 1;
    Func<int, int, int> action = (productSoFar, x) => 
        productSoFar * x;
    return Enumerable.Range(1, n)
            .Aggregate(initialValue, action);
}

public static int SumOfOddsWithAggregate(int n)
{
    var initialValue = 0;
    Func<int, int, int> action = (sumSoFar, x) =>
        (x % 2 == 0) ? sumSoFar : sumSoFar + x;
    return Enumerable.Range(1, n)
        .Aggregate(initialValue, action);
}

public static int AlternatingSumsWithAggregate(int n)
{
    var initialValue = Tuple.Create(true, 0);
    Func<Tuple<bool, int>, int, Tuple<bool, int>> action =
        (t, x) => t.Item1
            ? Tuple.Create(false, t.Item2 - x)
            : Tuple.Create(true, t.Item2 + x);
    return Enumerable.Range(1, n)
        .Aggregate(initialValue, action)
        .Item2;
}
```

ある意味では、これらの実装は元のC#バージョンよりも単純で安全ですが、ジェネリック型からの余計なノイズのせいで、このアプローチはF#での同等のコードほどエレガントではありません。C#プログラマーのほとんどが明示的なループを好む理由がわかります。

## より現実的な例 ##

実世界でよく出てくるやや関連性の高い例は、要素がクラスや構造体である場合にリストの「最大」要素を取得する方法です。
LINQの "max" メソッドは最大値のみを返し、最大値を含む要素全体は返しません。

以下は明示的なループを使用した解決策です：

```csharp
public class NameAndSize
{
    public string Name;
    public int Size;
}

public static NameAndSize MaxNameAndSize(IList<NameAndSize> list)
{
    if (list.Count() == 0)
    {
        return default(NameAndSize);
    }

    var maxSoFar = list[0];
    foreach (var item in list)
    {
        if (item.Size > maxSoFar.Size)
        {
            maxSoFar = item;
        }
    }
    return maxSoFar;
}

```

LINQでこれを効率的に（つまり、1回のパスで）行うのは難しいように見え、[Stack Overflowの質問](http://stackoverflow.com/questions/1101841/linq-how-to-perform-max-on-a-property-of-all-objects-in-a-collection-and-ret)として取り上げられています。Jon Skeetさんも[この問題について記事を書いています](http://codeblog.jonskeet.uk/2005/10/02/a-short-case-study-in-linq-efficiency/)。

ここでも、foldが救世主です！

以下が `Aggregate` を使用したC#コードです：

```csharp
public class NameAndSize
{
    public string Name;
    public int Size;
}

public static NameAndSize MaxNameAndSize(IList<NameAndSize> list)
{
    if (!list.Any())
    {
        return default(NameAndSize);
    }

    var initialValue = list[0];
    Func<NameAndSize, NameAndSize, NameAndSize> action =
        (maxSoFar, x) => x.Size > maxSoFar.Size ? x : maxSoFar;
    return list.Aggregate(initialValue, action);
}
```

このC#バージョンは空のリストに対してnullを返すことに注意してください。これは危険そうです - では代わりに何をすべきでしょうか？例外をスローする？それも正しくないように思えます。

以下がfoldを使用したF#コードです：

```fsharp
type NameAndSize= {Name:string;Size:int}
 
let maxNameAndSize list = 
    
    let innerMaxNameAndSize initialValue rest = 
        let action maxSoFar x = if maxSoFar.Size < x.Size then x else maxSoFar
        rest |> List.fold action initialValue 

    // 空のリストを処理する
    match list with
    | [] -> 
        None
    | first::rest -> 
        let max = innerMaxNameAndSize first rest
        Some max
```

F#コードには2つの部分があります：

* `innerMaxNameAndSize` 関数は、これまで見てきたものと似ています。
* 2つ目の部分、 `match list with` は、リストが空かどうかで分岐します。
空のリストの場合は `None` を返し、空でない場合は `Some` を返します。
これにより、関数の呼び出し元が両方のケースを処理することが保証されます。

そしてテスト：

```fsharp
//テスト
let list = [
    {Name="Alice"; Size=10}
    {Name="Bob"; Size=1}
    {Name="Carol"; Size=12}
    {Name="David"; Size=5}
    ]    
maxNameAndSize list
maxNameAndSize []
```

実は、 `maxNameAndSize` 関数を書く必要はありませんでした。F#にはすでに `maxBy` 関数があるからです！

```fsharp
// 組み込み関数を使用する
list |> List.maxBy (fun item -> item.Size)
[] |> List.maxBy (fun item -> item.Size)
```

しかし、ご覧のとおり、空のリストをうまく処理できません。以下は `maxBy` を安全にラップしたバージョンです。

```fsharp
let maxNameAndSize list = 
    match list with
    | [] -> 
        None
    | _ -> 
        let max = list |> List.maxBy (fun item -> item.Size)
        Some max
```
