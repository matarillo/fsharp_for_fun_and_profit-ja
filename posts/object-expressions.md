---
layout: post
title: "オブジェクト式"
description: ""
nav: fsharp-types
seriesId: "F#におけるオブジェクト指向プログラミング"
seriesOrder: 5
categories: ["オブジェクト指向", "インターフェース"]
---

[前回の投稿](../posts/interfaces.md)で見たように、F#でインターフェースを実装するのはC#よりも少し扱いにくいです。しかしF#には「オブジェクト式」という切り札があります。

オブジェクト式を使うと、クラスを作成せずにその場でインターフェースを実装できます。

### オブジェクト式を使ったインターフェースの実装

オブジェクト式は主にインターフェースの実装に使われます。
これを行うには、`new MyInterface with ...`という構文を使い、全体を波かっこで囲みます（F#での波かっこの数少ない用途の1つです！）。

以下は、`IDisposable`を実装するオブジェクトを複数作成する例です。

```fsharp
// IDisposableを実装する新しいオブジェクトを作成
let makeResource name = 
   { new System.IDisposable 
     with member this.Dispose() = printfn "%s disposed" name }

let useAndDisposeResources = 
    use r1 = makeResource "first resource"
    printfn "using first resource" 
    for i in [1..3] do
        let resourceName = sprintf "\tinner resource %d" i
        use temp = makeResource resourceName 
        printfn "\tdo something with %s" resourceName 
    use r2 = makeResource "second resource"
    printfn "using second resource" 
    printfn "done." 
```

このコードを実行すると、以下の出力が表示されます。オブジェクトがスコープ外になると実際に`Dispose()`が呼び出されていることがわかります。

<pre>
using first resource
    do something with   inner resource 1
    inner resource 1 disposed
    do something with   inner resource 2
    inner resource 2 disposed
    do something with   inner resource 3
    inner resource 3 disposed
using second resource
done.
second resource disposed
first resource disposed
</pre>

同じアプローチを`IAddingService`にも適用し、その場で作成できます。

```fsharp
let makeAdder id = 
   { new IAddingService with 
     member this.Add x y =
         printfn "Adder%i is adding" id 
         let result = x + y   
         printfn "%i + %i = %i" x y result 
         result 
         }

let testAdders = 
    for i in [1..3] do
        let adder = makeAdder i
        let result = adder.Add i i 
        () //結果を無視
```

オブジェクト式は非常に便利で、インターフェースを多用するライブラリと連携する際に、作成するクラスを大幅に減らすことができます。
