---
layout: post
title: "F#とC#の比較：単純な合計"
description: "ループを使わずに1からNまでの二乗の合計を求めてみる"
nav: why-use-fsharp
seriesId: "F#を使う理由"
seriesOrder: 3
categories: ["F# vs C#"]
---

実際のF#コードがどのように見えるか確認するために、簡単な問題から始めましょう：「1からNまでの二乗の合計を求める」。

F#の実装とC#の実装を比較してみます。まず、F#のコードです：

```fsharp
// square関数を定義
let square x = x * x

// sumOfSquares関数を定義
let sumOfSquares n = 
   [1..n] |> List.map square |> List.sum

// 試してみる
sumOfSquares 100
```

謎めいた `|>` はパイプ演算子と呼ばれます。これは単に一つの式の出力を次の式の入力にパイプします。つまり、`sumOfSquares` のコードは以下のように読めます：

1. 1からnまでのリストを作成（角かっこはリストを構築します）。
2. そのリストを `List.map` というライブラリ関数にパイプし、先ほど定義した「square」関数を使って入力リストを出力リストに変換します。
3. 結果の二乗のリストを `List.sum` というライブラリ関数にパイプします。何をするか想像できますか？
4. 明示的な「return」文はありません。`List.sum` の出力が関数全体の結果となります。

次に、C言語ベースの言語の古典的な（非関数型の）スタイルを使ったC#の実装を示します（LINQを使った、もっと関数型のバージョンは後で説明します）。

```csharp
public static class SumOfSquaresHelper
{
   public static int Square(int i)
   {
      return i * i;
   }

   public static int SumOfSquares(int n)
   {
      int sum = 0;
      for (int i = 1; i <= n; i++)
      {
         sum += Square(i);
      }
      return sum;
   }
}
```

どのような違いがありますか？

* F#のコードはより簡潔です
* F#のコードには型宣言がありません
* F#は対話的に開発できます

これらを順番に見ていきましょう。

### コードが少ない

最も明白な違いは、C#のコードがはるかに多いことです。C#は13行に対し、F#は3行です（コメントを除く）。C#のコードにはかっこ、セミコロンなど、多くの「ノイズ」があります。また、C#では関数は単独では存在できず、何らかのクラス（「SumOfSquaresHelper」）に追加する必要があります。F#はかっこの代わりに空白を使い、行終端子も必要なく、関数は単独で存在できます。

F#では、「square」関数のように、関数全体を1行で書くのが一般的です。`sumOfSquares` 関数も1行で書くことができました。C#では通常、これは悪い習慣として避けられます。

関数が複数行ある場合、F#はインデントを使ってコードブロックを示すため、かっこが不要になります。（Pythonを使ったことがある人なら、同じアイデアです）。つまり、`sumOfSquares` 関数は次のようにも書けます：

```fsharp
let sumOfSquares n = 
   [1..n] 
   |> List.map square 
   |> List.sum
```

唯一の欠点は、コードを慎重にインデントする必要があることです。個人的には、そのトレードオフは価値があると思います。

### 型宣言がない

次の違いは、C#のコードではすべての使用する型を明示的に宣言する必要があることです。たとえば、`int i` パラメータや `int SumOfSquares` 戻り値の型などです。
もちろん、C#では多くの場所で「var」キーワードを使えますが、関数のパラメータと戻り値の型には使えません。

F#のコードでは、型を全く宣言していません。これは重要なポイントです：F#は型なし言語のように見えますが、
実際にはC#と同じくらい型安全です。というより、さらに型安全です！
F#は「型推論」という技術を使って、コンテキストから使用している型を推論します。ほとんどの場合、驚くほどうまく機能し、コードの複雑さを大幅に減らします。

この場合、型推論アルゴリズムは整数のリストから始まったことに注目します。これは、square関数とsum関数も整数を扱っていることを意味し、最終的な値も整数でなければならないことを意味します。対話ウィンドウのコンパイル結果を見ると、推論された型を確認できます。次のようなものが表示されるでしょう：

```fsharp
val square : int -> int
```

これは、"square"関数が整数を受け取り、整数を返すことを意味します。

元のリストが浮動小数点数を使っていた場合、型推論システムはsquare関数が代わりに浮動小数点数を使っていると推論したでしょう。試してみてください：

```fsharp
// square関数を定義
let squareF x = x * x

// sumOfSquares関数を定義
let sumOfSquaresF n = 
   [1.0 .. n] |> List.map squareF |> List.sum  // "1.0"は浮動小数点数です

sumOfSquaresF 100.0
```

型チェックは非常に厳密です！元の `sumOfSquares` 例で浮動小数点数のリスト（`[1.0..n]`）を使おうとしたり、`sumOfSquaresF` 例で整数のリスト（`[1 ..n]`）を使おうとすると、コンパイラから型エラーが出ます。

### 対話的な開発

最後に、F#には対話ウィンドウがあり、そこですぐにコードをテストし、遊ぶことができます。C#にはこれを簡単に行う方法がありません。

たとえば、square関数を書いてすぐにテストできます：

```fsharp
// square関数を定義
let square x = x * x

// テスト
let s2 = square 2
let s3 = square 3
let s4 = square 4
```

うまく動作することを確認できたら、次のコードに進めます。

こうした対話性は、段階的にコーディングするアプローチを後押しします。魅力にはまってしまうかもしれませんね！

さらに、多くの人が、対話的にコードを設計することで、分離や明示的な依存関係などの良い設計プラクティスが強制され、
したがって、対話的な評価に適したコードは、テストも容易になると主張しています。逆に、対話的にテストできないコードは、
おそらくテストも難しいでしょう。

### C#コードの再考

私の元の例は「旧スタイル」のC#で書かれていました。C#は関数型の機能を多く取り入れているので、LINQの拡張を使ってより簡潔に例を書き直すことができます。

そこで、F#コードを1行ずつ翻訳した別のC#バージョンを紹介します。

```csharp
public static class FunctionalSumOfSquaresHelper
{
   public static int SumOfSquares(int n)
   {
      return Enumerable.Range(1, n)
         .Select(i => i * i)
         .Sum();
   }
}
```

しかし、かっこやピリオド、セミコロンのノイズに加えて、C#バージョンではF#バージョンとは異なり、パラメータと戻り値の型を宣言する必要があります。

多くのC#開発者はこれを些細な例と考えるかもしれませんが、ロジックがより複雑になるとループに戻ってしまうかもしれません。しかし、F#ではこのような明示的なループはほとんど見ることがありません。
たとえば、[より複雑なループからボイラープレートを排除する方法についてのこの投稿](../posts/conciseness-extracting-boilerplate.html)を参照してください。


