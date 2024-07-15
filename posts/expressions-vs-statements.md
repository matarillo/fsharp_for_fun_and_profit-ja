---
layout: post
title: "式 vs. 文"
description: "式がより安全で、より良い構成要素となる理由"
nav: thinking-functionally
seriesId: "式と構文"
seriesOrder: 2
---

プログラミング言語において、「式」は、値と関数を組み合わせたものであり、コンパイラによって解釈され、新しい値が生成されます。一方、「文」は単独の実行単位で、何も返しません。別の見方をすれば、式の目的は（副作用があるかもしれませんが）値を作ることで、文の目的は副作用を持つことだけです。

C#や多くの命令型言語は式と文を区別し、それぞれをどこで使えるかルールを設けています。しかし、純粋な関数型言語では文をまったくサポートできません。なぜなら、本当に純粋な言語なら副作用がないはずだからです。

F#は純粋ではありませんが、同じ原則に従っています。F#ではすべてが式です。値や関数だけでなく、制御フロー（if-then-elseやループなど）、パターンマッチングなども含まれます。

文の代わりに式を使う利点はいくつかあります。まず、文と違って、小さな式を組み合わせて（「合成」して）、もっと大きな式にできます。つまり、すべてが式なら、すべてが合成可能でもあります。

次に、文の並びは必ず決まった順序で評価されます。そのため、文を理解するには前の文を見る必要があります。しかし、純粋な式なら、サブ式に決まった実行順序や依存関係はありません。

したがって、式 `a+b` で `a` の部分と `b` の部分が両方とも純粋なら、 `a` の部分を単独で切り離して、理解して、テストして、評価できます。 `b` の部分も同じです。
式を「切り離せる性質」も、関数型プログラミングの良いところの一つです。

<div class="alert alert-info">
F#のインタラクティブウィンドウも、すべてが式であることを前提にしています。C#のインタラクティブウィンドウを使うのは、ずっと大変でしょう。
</div>

## 式はより安全でコンパクト ##

一貫して式を使うと、コードがより安全でコンパクトになります。これがどういう意味か見てみましょう。

まず、文ベースのアプローチを見てみましょう。文は値を返さないので、文の本体内で一時変数を使い、値を代入する必要があります。以下は、F#ではなくC風の言語（まあ、C#ですね）を使った例です。

```csharp
public void IfThenElseStatement(bool aBool)
{
   int result;     //resultが使われる前の値は？
   if (aBool)
   {
      result = 42; //「else」の場合のresultは？
   }
   Console.WriteLine("result={0}", result);
}
```

"if-then"が文なので、`result`変数を文の*外*で定義して、文の*内*で代入しないといけません。これにはいくつか問題があります。

* `result` 変数を文の外で設定しないといけません。。どんな初期値を設定すればいいのでしょうか？
* `if` 文で `result` 変数への代入を忘れたらどうなりますか？ "if" 文の目的は単に副作用（変数への代入）を持つことだけです。つまり、文には潜在的にバグがあるかもしれません。なぜなら、分岐の片方で代入を忘れやすいからです。そして、代入が単なる副作用だったため、コンパイラは警告を出せませんでした。 `result` 変数はすでにスコープ内で定義されているので、それが無効だと知らずに簡単に使ってしまう可能性があります。
* "else" の場合の `result` 変数の値は何ですか？この場合、値を指定していません。指定を忘れましたか？これは潜在的なバグですか？
* 最後に、物事を行うために副作用に頼っているということは、文を別のコンテキストで使う（例えば、リファクタリングのために抽出したり、並列化したりする場合）のが簡単ではないということです。なぜなら、文自体の一部ではない変数に依存しているからです。

注意：上のコードはC#ではコンパイルできません。コンパイラは、このように未割り当てのローカル変数を使おうとすると警告を出すからです。しかし、 `result` が使われる前に*何らかの*デフォルト値を定義しなければならないのは、やっぱり問題です。

比較のために、同じコードを式指向のスタイルで書き直したものを見てみましょう。

```csharp
public void IfThenElseExpression(bool aBool)
{
    int result = aBool ? 42 : 0;
    Console.WriteLine("result={0}", result);
}
```

式指向のバージョンだと、さっきの問題はまったく当てはまりません！

* `result` 変数は、代入と同時に宣言されます。式の「外」で変数を設定する必要はなく、どんな初期値を設定すべきかという心配もありません。
* "else" が明示的に処理されています。分岐の片方で代入を忘れる可能性はありません。
* そして、 `result` への代入を忘れることはあり得ません。なぜなら、そうすれば変数自体が存在しないからです！

F#では、この2つの例は次のように書きます。

```fsharp
let IfThenElseStatement aBool = 
   let mutable result = 0       // mutableキーワードが必要
   if (aBool) then result <- 42 
   printfn "result=%i" result
```

F#では、 `mutable` キーワードはコードのにおいだと思われていて、特別なケース以外では推奨されません。学習中は絶対に避けるべきです！

式ベースのバージョンでは、可変変数がなくなり、どこにも再代入はありません。

```fsharp
let IfThenElseExpression aBool = 
   let result = if aBool then 42 else 0   
                // elseケースを指定する必要があることに注意
   printfn "result=%i" result
```

`if` 文を式に変換すれば、サブ式全体を別のコンテキストに移動してリファクタリングするのは簡単で、エラーを引き起こしません。

C#でリファクタリングしたバージョンはこうなります。

```csharp
public int StandaloneSubexpression(bool aBool)
{
    return aBool ? 42 : 0;
}

public void IfThenElseExpressionRefactored(bool aBool)
{
    int result = StandaloneSubexpression(aBool);
    Console.WriteLine("result={0}", result);
}
```

F#ではこうです。

```fsharp
let StandaloneSubexpression aBool = 
   if aBool then 42 else 0   

let IfThenElseExpressionRefactored aBool = 
   let result = StandaloneSubexpression aBool 
   printfn "result=%i" result
```



### ループにおける文 vs. 式 ###

C#に戻って、ループ文を使った文 vs. 式の似たような例を見てみましょう。

```csharp
public void LoopStatement()
{
    int i;    // iが使われる前の値は？
    int length;
    var array = new int[] { 1, 2, 3 };
    int sum;  // 配列が空の場合のsumの値は？

    length = array.Length;   // lengthへの代入を忘れたら？
    for (i = 0; i < length; i++)
    {
        sum += array[i];
    }

    Console.WriteLine("sum={0}", sum);
}
```

古いスタイルの "for" 文を使用しましたが、ここではインデックス変数がループの外で宣言されています。以前に議論した多くの問題が、ループインデックス `i` と最大値 `length` にも当てはまります。例えば、これらの変数はループの外で使えるかどうか、また割り当てられていない場合どうなるかという点です。

現代的な for ループでは、これらの問題を解決するために、ループ変数を for ループ内で宣言・代入し、さらに `sum` 変数を初期化することが求められます。

```csharp
public void LoopStatementBetter()
{
    var array = new int[] { 1, 2, 3 };
    int sum = 0;        // 初期化が必要

    for (var i = 0; i < array.Length; i++)
    {
        sum += array[i];
    }

    Console.WriteLine("sum={0}", sum);
}
```

現代的なバージョンは、ローカル変数の宣言と最初の代入を組み合わせるという一般的な原則に従っています。

しかし、もちろん `for` ループの代わりに `foreach` ループを使うことでさらに改善できます。

```csharp
public void LoopStatementForEach()
{
    var array = new int[] { 1, 2, 3 };
    int sum = 0;        // 初期化が必要

    foreach (var i in array)
    {
        sum += i;
    }

    Console.WriteLine("sum={0}", sum);
}
```

改善のたびに、コードを簡潔にするだけでなく、エラーの可能性も減らしています。

その原則を論理的に突き詰めると、完全に式ベースのアプローチに行き着きます！LINQを使用した場合は次のようになります。

```csharp
public void LoopExpression()
{
    var array = new int[] { 1, 2, 3 };

    var sum = array.Aggregate(0, (sumSoFar, i) => sumSoFar + i);

    Console.WriteLine("sum={0}", sum);
}
```

LINQ の組み込み関数 "sum" を使うこともできたのですが、今回は文に埋め込まれた合計処理のロジックをラムダ式に変換し、式の一部として使う方法を示すために  `Aggregate` を使いました。

次回の記事では、F# のさまざまな種類の式について見ていきます。

