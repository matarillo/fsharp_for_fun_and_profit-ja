---
layout: post
title: "部分適用"
description: "関数のパラメータの一部を固定する方法"
nav: why-use-fsharp
seriesId: "F# を使う理由"
seriesOrder: 16
categories: ["Convenience", "関数", "部分適用"]
---

F#の特に便利な機能の1つは、多くのパラメータを持つ複雑な関数の一部のパラメータを固定または「焼き付け」しつつ、他のパラメータを開いたままにできることです。この投稿では、これが実際にどのように使われるかを簡単に見ていきます。

まず、これがどのように機能するかの非常に簡単な例から始めましょう。ごく簡単な関数から始めます：

```fsharp
// 足し算関数を定義
let add x y = x + y

// 通常の使用法
let z = add 1 2
```

しかし、奇妙なこともできます。関数を1つのパラメータだけで呼び出すことができるのです！

```fsharp
let add42 = add 42
```

結果は、 "42" が焼き付けられた新しい関数で、2つではなく1つのパラメータだけを取るようになります！ この技術は「部分適用」と呼ばれ、任意の関数に対して、一部のパラメータを「固定」し、他のパラメータを後で埋めるために開いたままにできることを意味します。

```fsharp
// 新しい関数を使用
add42 2
add42 3
```

これを理解した上で、先ほど見た汎用ロガーを再度見てみましょう：

```fsharp
let genericLogger anyFunc input = 
   printfn "input is %A" input   // 入力をログに記録
   let result = anyFunc input    // 関数を評価
   printfn "result is %A" result // 結果をログに記録
   result                        // 結果を返す
```

残念ながら、ログ記録操作をハードコードしてしまいました。理想的には、ログ記録の方法を選択できるようにもっと汎用的にしたいところです。

もちろん、F#は関数型プログラミング言語なので、関数を受け渡すことでこれを実現します。

この場合、「before」と「after」のコールバック関数をライブラリ関数に渡します：

```fsharp
let genericLogger before after anyFunc input = 
   before input               // カスタム動作のためのコールバック
   let result = anyFunc input // 関数を評価
   after result               // カスタム動作のためのコールバック
   result                     // 結果を返す
```

ログ記録関数が今や4つのパラメータを持っていることがわかります。「before」と「after」のアクションが、関数とその入力と同様に明示的なパラメータとして渡されています。実際に使用するには、関数を定義し、最後のintパラメータと一緒にライブラリ関数に渡すだけです：

```fsharp
let add1 input = input + 1

// 再利用ケース1
genericLogger 
    (fun x -> printf "before=%i. " x) // 前に呼び出す関数
    (fun x -> printfn " after=%i." x) // 後に呼び出す関数
    add1                              // メイン関数
    2                                 // パラメータ

// 再利用ケース2
genericLogger
    (fun x -> printf "started with=%i " x) // 異なるコールバック
    (fun x -> printfn " ended with=%i" x) 
    add1                              // メイン関数
    2                                 // パラメータ
```

これははるかに柔軟です。動作を変更したいたびに新しい関数を作成する必要はありません。その場で動作を定義できます。

しかし、これは少し醜いと思うかもしれません。ライブラリ関数が多数のコールバック関数を公開する場合、同じ関数を何度も渡さなければならないのは不便です。

幸い、私たちはこの解決策を知っています。部分適用を使用して一部のパラメータを固定できます。そこで、この場合、 `before` と `after` 関数、そして `add1` 関数を固定し、最後のパラメータを開いたままにする新しい関数を定義しましょう。

```fsharp
// "コールバック"関数を固定した再利用可能な関数を定義
let add1WithConsoleLogging = 
    genericLogger
        (fun x -> printf "input=%i. " x) 
        (fun x -> printfn " result=%i" x)
        add1
        // 最後のパラメータはここではまだ定義されていません！
```

新しい「ラッパー」関数は今やintだけで呼び出されるので、コードはずっとクリーンになります。先ほどの例と同様に、元の `add1` 関数が使用できる場所であれば、変更なしでどこでも使用できます。

```fsharp
add1WithConsoleLogging 2
add1WithConsoleLogging 3
add1WithConsoleLogging 4
[1..5] |> List.map add1WithConsoleLogging 
```

## C#での関数型アプローチ

古典的なオブジェクト指向アプローチでは、このような種類のことを行うために、おそらく継承を使用したでしょう。たとえば、「before」と「after」のための仮想メソッドと実行する関数を持つ抽象的な `LoggerBase` クラスを作成していたかもしれません。そして、特定の種類の動作を実装するために、新しいサブクラスを作成し、必要に応じて仮想メソッドをオーバーライドしたでしょう。

しかし、古典的なスタイルの継承は現在、オブジェクト指向設計で避けられるようになっており、オブジェクトのコンポジションがはるかに好まれています。実際、「モダンな」C#では、おそらくF#と同じ方法でコードを書くでしょう。イベントを使用するか、関数を渡すかのいずれかです。

以下はF#のコードをC#に翻訳したものです（各Actionの型を指定する必要があることに注意してください）：

```csharp
public class GenericLoggerHelper<TInput, TResult>
{
    public TResult GenericLogger(
        Action<TInput> before,
        Action<TResult> after,
        Func<TInput, TResult> aFunc,
        TInput input)
    {
        before(input);             // カスタム動作のためのコールバック
        var result = aFunc(input); // 関数を実行
        after(result);             // カスタム動作のためのコールバック
        return result;
    }
}
```

そして、これが使用例です：

```csharp
[NUnit.Framework.Test]
public void TestGenericLogger()
{
    var sut = new GenericLoggerHelper<int, int>();
    sut.GenericLogger(
        x => Console.Write("input={0}. ", x),
        x => Console.WriteLine(" result={0}", x),
        x => x + 1,
        3);
}
```

C#では、LINQライブラリを使う際にこのプログラミングスタイルが欠かせません。しかし、多くの開発者はこのスタイルを十分に活用していません。そのため、彼らのコードはより汎用的で適応性のあるものになる可能性を逃しています。 `Action<>` と `Func<>` といった型宣言の見た目の悪さも、このスタイルの採用をためらわせる一因となっています。しかし、このアプローチを使えば、コードの再利用性を大幅に向上させることができます。
