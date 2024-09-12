---
layout: post
title: "継承と抽象クラス"
description: ""
nav: fsharp-types
seriesId: "F#におけるオブジェクト指向プログラミング"
seriesOrder: 3
categories: [オブジェクト指向, クラス]
---

この記事は[前回のクラスに関する投稿](../posts/classes.md)の続きです。今回はF#における継承、抽象クラスやインターフェースの定義と使用方法に焦点を当てます。

## 継承

クラスが別のクラスを継承することを宣言するには、次の構文を使います。

```fsharp
type DerivedClass(param1, param2) =
   inherit BaseClass(param1)
```

`inherit`キーワードは`DerivedClass`が`BaseClass`を継承することを示します。同時に、`BaseClass`のコンストラクタも呼び出す必要があります。

ここでF#とC#を比較すると参考になるでしょう。以下は非常にシンプルな2つのクラスのC#コードです。

```csharp
public class MyBaseClass
{
    public MyBaseClass(int param1)
    {
        this.Param1 = param1;
    }
    public int Param1 { get; private set; }
}

public class MyDerivedClass: MyBaseClass
{
    public MyDerivedClass(int param1,int param2): base(param1)
    {
        this.Param2 = param2;
    }
    public int Param2 { get; private set; }
}
```

継承の宣言`class MyDerivedClass: MyBaseClass`が、`base(param1)`を呼び出すコンストラクタとは別になっていることに注目してください。

次にF#版を見てみましょう。

```fsharp
type BaseClass(param1) =
   member this.Param1 = param1

type DerivedClass(param1, param2) =
   inherit BaseClass(param1)
   member this.Param2 = param2

// テスト
let derived = new DerivedClass(1,2)
printfn "param1=%O" derived.Param1
printfn "param2=%O" derived.Param2
```

C#とは異なり、F#では継承部分の宣言`inherit BaseClass(param1)`に、継承元のクラスとそのコンストラクタの両方が含まれています。

## 抽象メソッドと仮想メソッド

継承の重要な目的の1つは、抽象メソッドや仮想メソッドなどを持つことができる点です。

### 基底クラスでの抽象メソッドの定義

C#では抽象メソッドを`abstract`キーワードとメソッドのシグネチャで示します。F#も同じ概念ですが、関数シグネチャの書き方がC#とは大きく異なります。

```fsharp
// 具体的な関数定義
let Add x y = x + y

// 関数シグネチャ
// val Add : int -> int -> int
```

抽象メソッドを定義するには、シグネチャの構文と`abstract member`キーワードを使います。

```fsharp
type BaseClass() =
   abstract member Add: int -> int -> int
```

等号がコロンに置き換わっていることに注意してください。これは予想通りで、等号は値の束縛に使われ、コロンは型注釈に使われるためです。

ただし、上記のコードをコンパイルしようとすると、エラーが発生します。コンパイラはメソッドの実装がないと警告します。これを解決するには次のいずれかが必要です。

* メソッドのデフォルト実装を提供する
* クラス全体も抽象であることをコンパイラに伝える

これらの選択肢については後ほど詳しく見ていきます。

### 抽象プロパティの定義

抽象の不変プロパティも同様に定義します。シグネチャは単純な値のものと同じです。

```fsharp
type BaseClass() =
   abstract member Pi : float
```

抽象プロパティが読み書き可能な場合は、get/setキーワードを追加します。

```fsharp
type BaseClass() =
   abstract Area : float with get,set
```

### デフォルト実装（ただし仮想メソッドはなし）

基底クラスで抽象メソッドのデフォルト実装を提供するには、`member`キーワードの代わりに`default`キーワードを使います。

```fsharp
// デフォルト実装付き
type BaseClass() =
   // 抽象メソッド
   abstract member Add: int -> int -> int
   // 抽象プロパティ
   abstract member Pi : float 

   // デフォルト
   default this.Add x y = x + y
   default this.Pi = 3.14
```

デフォルトメソッドは通常の方法で定義されますが、`member`の代わりに`default`を使う点が異なります。

F#とC#の大きな違いの1つは、C#では`virtual`キーワードを使って抽象定義とデフォルト実装を1つのメソッドにまとめられることです。F#ではこれができません。抽象メソッドとデフォルト実装を別々に宣言する必要があります。`abstract member`がシグネチャを持ち、`default`が実装を持ちます。

### 抽象クラス

少なくとも1つの抽象メソッドがデフォルト実装を持たない場合、そのクラス全体が抽象クラスとなります。この場合、`AbstractClass`属性でクラスに注釈を付ける必要があります。

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

このように注釈を付けると、コンパイラは実装がないことについて警告しなくなります。

### サブクラスでのメソッドのオーバーライド

サブクラスで抽象メソッドやプロパティをオーバーライドするには、`member`キーワードの代わりに`override`キーワードを使います。それ以外は、オーバーライドされたメソッドは通常の方法で定義します。

```fsharp
[<AbstractClass>]
type Animal() =
   abstract member MakeNoise: unit -> unit 

type Dog() =
   inherit Animal() 
   override this.MakeNoise () = printfn "ワン"

// テスト
// let animal = new Animal()  // 抽象クラスのインスタンス化でエラー
let dog = new Dog()
dog.MakeNoise()
```

基底メソッドを呼び出すには、C#と同様に`base`キーワードを使います。

```fsharp
type Vehicle() =
   abstract member TopSpeed: unit -> int
   default this.TopSpeed() = 60

type Rocket() =
   inherit Vehicle() 
   override this.TopSpeed() = base.TopSpeed() * 10

// テスト
let vehicle = new Vehicle()
printfn "vehicle.TopSpeed = %i" <| vehicle.TopSpeed()
let rocket = new Rocket()
printfn "rocket.TopSpeed = %i" <| rocket.TopSpeed()
```

### 抽象メソッドのまとめ

抽象メソッドは基本的に単純でC#と似ています。C#に慣れている人にとって、難しいかもしれない点は2つだけです。

* 関数シグネチャの仕組みとその構文を理解する必要があります。詳しい説明は[関数シグネチャに関する投稿](../posts/function-signatures.md)をご覧ください。
* 1つにまとまった仮想メソッドがありません。抽象メソッドとデフォルト実装を別々に定義する必要があります。

