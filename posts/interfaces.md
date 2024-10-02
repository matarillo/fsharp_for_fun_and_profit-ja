---
layout: post
title: "インターフェース"
description: ""
nav: fsharp-types
seriesId: "F#におけるオブジェクト指向プログラミング"
seriesOrder: 4
categories: [オブジェクト指向, インターフェース]
---

F#ではインターフェースが利用可能で完全にサポートされていますが、C#での使い方とは異なる重要な点がいくつかあります。

### インターフェースの定義

インターフェースの定義は抽象クラスの定義と似ています。実際、似過ぎていて混同してしまうかもしれません。

以下はインターフェースの定義例です。

```fsharp
type MyInterface =
   // 抽象メソッド
   abstract member Add: int -> int -> int

   // 抽象不変プロパティ
   abstract member Pi : float 

   // 抽象読み書き可能プロパティ
   abstract member Area : float with get,set
```

そして、これは同等の抽象基底クラスの定義です。

```fsharp
[<AbstractClass>]
type AbstractBaseClass() =
   // 抽象メソッド
   abstract member Add: int -> int -> int

   // 抽象不変プロパティ
   abstract member Pi : float 

   // 抽象読み書き可能プロパティ
   abstract member Area : float with get,set
```

では、どこが違うのでしょうか？通常通り、すべての抽象メンバーはシグネチャのみ定義されています。唯一の違いは`[<AbstractClass>]`属性がないことのようです。

しかし、以前の抽象メソッドに関する議論で、`[<AbstractClass>]`属性が必要だと強調しました。そうしないと、コンパイラはメソッドに実装がないと警告するのです。では、インターフェースの定義はなぜそれを回避できるのでしょうか？

答えは簡単ですが、微妙です。*インターフェースにはコンストラクタがありません*。つまり、インターフェース名の後にかっこがないのです。

```fsharp
type MyInterface =   // <- かっこがない！
```

これだけです。かっこを取り除くと、クラス定義がインターフェースに変わります！

### 明示的および暗黙的なインターフェースの実装

クラスでインターフェースを実装する段階になると、F#はC#とかなり異なります。C#では、クラス定義にインターフェースのリストを追加し、暗黙的にインターフェースを実装できます。

F#ではそうではありません。F#では、すべてのインターフェースを*明示的に*実装する必要があります。

明示的なインターフェース実装では、インターフェースのメンバーにはインターフェースのインスタンスを通じてのみアクセスできます（たとえば、クラスをインターフェース型にキャストすることで）。インターフェースのメンバーはクラス自体の一部として可視化されません。

C#は明示的および暗黙的なインターフェース実装の両方をサポートしていますが、ほとんどの場合、暗黙的なアプローチが使われ、多くのプログラマーは[C#の明示的インターフェース](https://learn.microsoft.com/ja-jp/dotnet/csharp/programming-guide/interfaces/explicit-interface-implementation)を知らないほどです。


### F#でのインターフェースの実装 ###

では、F#でインターフェースをどのように実装するのでしょうか？抽象基底クラスのように単純に「継承」することはできません。以下のように、`interface XXX with`構文を使って各インターフェースメンバーに明示的な実装を提供する必要があります。

```fsharp
type IAddingService =
    abstract member Add: int -> int -> int

type MyAddingService() =
    
    interface IAddingService with 
        member this.Add x y = 
            x + y

    interface System.IDisposable with 
        member this.Dispose() = 
            printfn "破棄されました"
```

上記のコードは、`MyAddingService`クラスが`IAddingService`と`IDisposable`インターフェースを明示的に実装する方法を示しています。必要な`interface XXX with`セクションの後、メンバーは通常の方法で実装されます。

（余談ですが、`MyAddingService()`にはコンストラクタがありますが、`IAddingService`にはないことに再度注目してください。）

### インターフェースの使用

では、この加算サービスインターフェースを使ってみましょう。

```fsharp
let mas = new MyAddingService()
mas.Add 1 2    // エラー 
```

すぐにエラーが発生します。インスタンスが`Add`メソッドを全く実装していないように見えます。もちろん、これが本当に意味するのは、まず`:>`演算子を使ってインターフェースにキャストする必要があるということです。

```fsharp
// インターフェースにキャスト
let mas = new MyAddingService()
let adder = mas :> IAddingService
adder.Add 1 2  // OK
```

これは非常に扱いにくく見えるかもしれませんが、実際にはほとんどの場合、キャストは暗黙的に行われるため問題ありません。

たとえば、通常はインターフェースパラメータを指定する関数にインスタンスを渡します。この場合、キャストは自動的に行われます。

```fsharp
// インターフェースを必要とする関数
let testAddingService (adder:IAddingService) = 
    printfn "1+2=%i" <| adder.Add 1 2  // OK

let mas = new MyAddingService()
testAddingService mas // 自動的にキャスト
```

そして、`IDisposable`の特別なケースでは、`use`キーワードも必要に応じてインスタンスを自動的にキャストします。

```fsharp
let testDispose = 
    use mas = new MyAddingService()
    printfn "テスト中"
    // ここでDispose()が呼び出される
```

