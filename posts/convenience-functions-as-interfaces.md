---
layout: post
title: "関数をインターフェースとして使用する"
description: "関数を使用すると、OOデザインパターンが簡単に実現できる"
nav: why-use-fsharp
seriesId: "F# を使う理由"
seriesOrder: 15
categories: ["利便性", "関数"]
---


関数型プログラミングの重要な側面の1つは、ある意味で全ての関数が「インターフェース」であるということです。つまり、オブジェクト指向設計におけるインターフェースの多くの役割が、関数の動作方法に暗黙的に含まれているのです。

実際、「実装ではなくインターフェースに対してプログラミングする」という重要な設計原則は、F#では自然に実現されます。

この仕組みを理解するために、C#とF#で同じデザインパターンを比較してみましょう。たとえば、C#では「デコレーターパターン」を使用してコアコードを拡張したいかもしれません。

まず、計算機のインターフェースがあるとします：

```csharp
interface ICalculator 
{
   int Calculate(int input);
}
```

そして、具体的な実装があります：

```csharp
class AddingCalculator: ICalculator
{
   public int Calculate(int input) { return input + 1; }
}
```

次に、ログ機能を追加したい場合、コアの計算機実装をログ記録用のラッパーでくるむことができます。

```csharp
class LoggingCalculator: ICalculator
{
   ICalculator _innerCalculator;

   LoggingCalculator(ICalculator innerCalculator)
   {
      _innerCalculator = innerCalculator;
   }

   public int Calculate(int input) 
   { 
      Console.WriteLine("input is {0}", input);
      var result  = _innerCalculator.Calculate(input);
      Console.WriteLine("result is {0}", result);
      return result; 
   }
}
```

ここまでは分かりやすいですね。しかし、これが機能するためには、クラスのインターフェースをあらかじめ定義しておく必要があることに注意してください。 `ICalculator` インターフェースがなかった場合、既存のコードを改修する必要が出てきます。

ここでF#の強みが発揮されます。F#では、事前にインターフェースを定義しなくても同じことができます。シグネチャが同じであれば、任意の関数を他の関数と透過的に交換できるのです。

以下がF#での同等のコードです。

```fsharp
let addingCalculator input = input + 1

let loggingCalculator innerCalculator input = 
   printfn "input is %A" input
   let result = innerCalculator input
   printfn "result is %A" result
   result
```

言い換えれば、関数のシグネチャがそのままインターフェースとなるのです。

## 汎用ラッパー

さらに素晴らしいのは、F#のログ記録コードをデフォルトで完全に汎用化できることです。これにより、どんな関数に対しても使用できます。以下に例を示します：

```fsharp
let add1 input = input + 1
let times2 input = input * 2

let genericLogger anyFunc input = 
   printfn "input is %A" input   // 入力をログに記録
   let result = anyFunc input    // 関数を評価
   printfn "result is %A" result // 結果をログに記録
   result                        // 結果を返す

let add1WithLogging = genericLogger add1
let times2WithLogging = genericLogger times2
```

新しく「ラップされた」関数は、元の関数が使用できる場所ならどこでも使用できます。違いは誰にも分かりません！

```fsharp
// テスト
add1WithLogging 3
times2WithLogging 3

[1..5] |> List.map add1WithLogging
```

同じ汎用ラッパーアプローチを他の目的にも使用できます。たとえば、以下は関数の実行時間を計測する汎用ラッパーです。

```fsharp
let genericTimer anyFunc input = 
   let stopwatch = System.Diagnostics.Stopwatch()
   stopwatch.Start() 
   let result = anyFunc input  // 関数を評価
   printfn "elapsed ms is %A" stopwatch.ElapsedMilliseconds
   result

let add1WithTimer = genericTimer add1WithLogging 

// テスト
add1WithTimer 3
```

このような汎用ラッピングができることは、関数指向アプローチの大きな利点の1つです。任意の関数を取り、それに基づいて類似の関数を作成できます。新しい関数が元の関数と全く同じ入力と出力を持つ限り、元の関数が使用される場所であればどこでも新しい関数で置き換えることができます。さらにいくつか例を挙げます：

* 遅い関数に対する汎用キャッシュラッパーを簡単に書くことができ、値は1回だけ計算されます。
* 関数に対する汎用「遅延」ラッパーも簡単に書くことができ、結果が必要になった時にのみ内部関数が呼び出されます。

## ストラテジーパターン

この同じアプローチを別の一般的なデザインパターンである、「ストラテジーパターン」にも適用できます。

よく知られた継承の例を使ってみましょう。 `Animal` スーパークラスと、`Cat` と `Dog` サブクラスです。それぞれは、異なる鳴き声を出すために `MakeNoise()` メソッドをオーバーライドします。

真の関数型設計では、サブクラスは存在せず、代わりに `Animal` クラスはコンストラクタで渡される `NoiseMaking` 関数を持つことになります。このアプローチは、OO設計における「ストラテジー」パターンとまさに同じです。

```fsharp
type Animal(noiseMakingStrategy) = 
   member this.MakeNoise = 
      noiseMakingStrategy() |> printfn "Making noise %s" 
   
// 猫を作成
let meowing() = "ニャー"
let cat = Animal(meowing)
cat.MakeNoise

// 犬を作成
let woofOrBark() = if (System.DateTime.Now.Second % 2 = 0) 
                   then "ワン" else "バウ"
let dog = Animal(woofOrBark)
dog.MakeNoise
dog.MakeNoise  // 1秒後にもう一度試す
```

ここでも、事前に何らかの `INoiseMakingStrategy` インターフェースを定義する必要がないことに注目してください。適切なシグネチャを持つ関数であれば、どれでも機能します。
その結果、関数モデルでは、 `IComparer` 、 `IFormatProvider` 、 `IServiceProvider` などの標準的な.NETの「ストラテジー」インターフェースが不要になります。

他の多くのデザインパターンも同様に簡略化できます。

