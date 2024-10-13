---
layout: post
title: "型推論"
description: "複雑な型構文に惑わされないようにする方法"
nav: why-use-fsharp
seriesId: "F# を使う理由"
seriesOrder: 8
categories: ["簡潔性", "型"]
---

これまでに見てきたように、F#は「型推論」という技術を使用して、通常のコードで明示的に指定する必要のある型注釈の数を大幅に減らしています。さらに、型を指定する必要がある場合でも、C#と比べて構文がより簡潔です。

これを示すために、標準的なLINQ関数を二つラップするC#のメソッドを見てみましょう。実装は単純ですが、メソッドのシグネチャは非常に複雑です：

```csharp
public IEnumerable<TSource> Where<TSource>(
    IEnumerable<TSource> source,
    Func<TSource, bool> predicate
    )
{
    //標準のLINQ実装を使用
    return source.Where(predicate);
}

public IEnumerable<IGrouping<TKey, TSource>> GroupBy<TSource, TKey>(
    IEnumerable<TSource> source,
    Func<TSource, TKey> keySelector
    )
{
    //標準のLINQ実装を使用
    return source.GroupBy(keySelector);
}
```

そして、これらと全く同じF#の等価コードを見てみましょう。型注釈が全く必要ないことがわかります！

```fsharp
let Where source predicate = 
    //標準のF#実装を使用
    Seq.filter predicate source

let GroupBy source keySelector = 
    //標準のF#実装を使用
    Seq.groupBy keySelector source
```
	
<div class="alert alert-info">	
標準のF#実装における「filter」と「groupBy」のパラメータの順序が、C#で使用されているLINQ実装とちょうど逆になっていることに気づくかもしれません。「source」パラメータが最初ではなく、最後に配置されています。これには理由があります。「<a href="/series/thinking-functionally.html">関数型思考</a>」シリーズで説明します。
</div>

型推論アルゴリズムは、多くの情報源から情報を収集して型を決定するのに優れています。次の例では、 `list` の値が文字列のリストであることを正しく推論しています。

```fsharp
let i  = 1
let s = "hello"
let tuple  = s,i      // タプルにパック   
let s2,i2  = tuple    // アンパック
let list = [s2]       // 型は string list
```

そして、この例では、 `sumLengths` 関数が文字列のリストを受け取り、整数を返すことを正しく推論しています。

```fsharp
let sumLengths strList = 
    strList |> List.map String.length |> List.sum

// 関数の型は: string list -> int
```


