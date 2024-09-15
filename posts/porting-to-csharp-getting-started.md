---
layout: post
title: "直接移植を始める"
description: "C#に相当するF#の表現"
nav: fsharp-types
seriesId: "C# からの移植"
seriesOrder: 2
---

詳細な例に取り掛かる前に、基本に立ち返って簡単な例の移植を行います。

この投稿と次の投稿では、直接移植を行う際の指針として、一般的なC#の文やキーワードに最も近いF#の表現を見ていきます。

## 基本的な構文変換ガイドライン

移植を始める前に、F#の構文がC#の構文とどのように異なるかを理解する必要があります。このセクションでは、一方から他方への変換に関する一般的なガイドラインを示します。（F#構文の簡単な概要については、「[60秒でわかるF#構文](../posts/fsharp-in-60-seconds.md)」をご覧ください）

### 波かっことインデント

C#はコードブロックの開始と終了を示すために波かっこを使います。F#は一般的にインデントだけを使います。

F#でも波かっこは使われますが、コードブロックのためではありません。代わりに、以下の場合に見られます。

* 「レコード」型の定義と使用。
* `seq`や`async`などの計算式と組み合わせて使用。一般的に、基本的な移植ではこれらの式を使うことはありません。

インデントルールの詳細については、[この投稿](../posts/fsharp-syntax.md)を参照してください。

### セミコロン

C#のセミコロンとは異なり、F#は行や文の終端を示すものを必要としません。

### カンマ

F#はパラメータやリスト要素の区切りにカンマを使いません。移植する際はカンマを使わないよう注意してください！

*リスト要素の区切りには、カンマではなくセミコロンを使います。*

```csharp
// C#の例
var list = new int[] { 1,2,3}
```

```fsharp
// F#の例
let list = [1;2;3] // セミコロン
```

*ネイティブF#関数のパラメータの区切りには、空白を使います。*

```csharp
// C#の例 
int myFunc(int x, int y, int z) { ... 関数本体 ...}
```

```fsharp
// F#の例 
let myFunc (x:int) (y:int) (z:int) :int = ... 関数本体 ...
let myFunc x y z = ... 関数本体 ...
```

カンマは一般的に、タプルや.NETライブラリ関数を呼び出す際のパラメータの区切りにのみ使われます。（タプルと複数パラメータの違いについては、[この投稿](../posts/defining-functions.md#tuples)を参照してください）

### 変数、関数、型の定義

F#では、変数と関数の両方の定義に以下の形式を使います。

```fsharp
let 名前 = // 定義
```

すべての型（クラス、構造体、インターフェースなど）の定義には以下の形式を使います。

```fsharp
type 名前 = // 定義
```

等号（`=`）の使用は、F#とC#の重要な違いです。C#が波かっこを使用する箇所で、F#は等号を使用し、その後のコードブロックはインデントする必要があります。

### 可変値

F#では、デフォルトで値は不変です。命令型の直接移植を行う場合、一部の値を可変にする必要があるかもしれません。その場合は`mutable`キーワードを使用します。
そして、値に代入する際は、等号ではなく`<-`演算子を使用します。

```csharp
// C#の例 
var variableName = 42
variableName = variableName + 1
```

```fsharp
// F#の例 
let mutable variableName = 42
variableName <- variableName + 1
```

### 代入と等値比較 

C#では、等号は代入に使用され、二重等号`==`は等値比較に使用されます。

しかしF#では、等号は等値比較に使用され、また宣言時に値を他の値に初期バインドする際にも使用されます。

```fsharp
let mutable variableName = 42     // 宣言時に42にバインド
variableName <- variableName + 1  // 変更（再代入）
variableName = variableName + 1   // 代入ではなく比較！ 
```

不等比較には、`!=`ではなくSQL風の`<>`を使用します。

```fsharp
let variableName = 42             // 宣言時に42にバインド
variableName <> 43                // 比較はtrueを返します。
variableName != 43                // エラー FS0020。
```

誤って`!=`を使用すると、おそらく[error FS0020](../troubleshooting-fsharp/index.md#FS0020)が発生します。

## 変換例 #1

これらの基本的なガイドラインを踏まえて、実際のコード例を見て、直接移植を行ってみましょう。

この最初の例はとてもシンプルなコードで、1行ずつ移植していきます。以下がC#のコードです。

```csharp
using System;
using System.Collections.Generic;

namespace PortingToFsharp
{
    public class Squarer
    {
        public int Square(int input)
        {
            var result = input * input;
            return result;
        }

        public void PrintSquare(int input)
        {
            var result = this.Square(input);
            Console.WriteLine("Input={0}. Result={1}", 
              input, result);
        }
    }
```
    
### "using"と"namespace"の変換

これらのキーワードは単純です。

* `using`は`open`になります
* 波かっこ付きの`namespace`は単に`namespace`になります。

C#とは異なり、F#のファイルは他の.NETコードと相互運用する必要がない限り、一般的に名前空間を宣言しません。ファイル名自体がデフォルトの名前空間として機能します。

注意点として、名前空間を使用する場合、"open"などの他の要素よりも前に記述する必要があります。これは多くのC#コードとは逆の順序です。

### クラスの変換

シンプルなクラスを宣言するには、以下のように記述します。

```fsharp
type myClassName() = 
   ... コード ...  
```

クラス名の後にかっこがあることに注意してください。これはクラス定義に必要です。

より複雑なクラス定義は次の例で示し、[クラスに関する完全な説明](../posts/classes.md)を読むこともできます。

### 関数/メソッドのシグネチャの変換

関数/メソッドのシグネチャについて：

* パラメータリストの周りにかっこは不要です
* パラメータの区切りにはカンマではなく空白を使います
* 波かっこの代わりに、等号が関数本体の開始を示します
* パラメータは通常型を必要としませんが、必要な場合は：
  * 型名は値やパラメータの後に来ます
  * パラメータ名と型はコロンで区切られます 
  * パラメータの型を指定する場合、予期しない動作を避けるためにペアをかっこで囲むべきでしょう
  * 関数全体の戻り値の型はコロンで始まり、他のすべてのパラメータの後に来ます

以下はC#の関数シグネチャです。

```csharp
int Square(int input) { ... コード ...}
```

そして、これが明示的な型を持つ対応するF#の関数シグネチャです。

```fsharp
let Square (input:int) :int =  ... コード ...
```

しかし、F#は通常パラメータと戻り値の型を推論できるため、明示的に指定する必要はほとんどありません。

以下は、型を推論した、より一般的なF#のシグネチャです。

```fsharp
let Square input =  ... コード ...
```

### void

C#の`void`キーワードは一般的に必要ありませんが、必要な場合は`unit`に変換されます。

つまり、以下のC#のコードは：

```csharp
void PrintSquare(int input) { ... コード ...}
```

F#のコードに以下のように変換できます。

```fsharp
let PrintSquare (input:int) :unit =  ... コード ...
```

しかし繰り返しになりますが、具体的な型はほとんど必要ないため、F#のバージョンでは以下のように書くだけです。

```fsharp
let PrintSquare input =  ... コード ...
```

### 関数/メソッド本体の変換

関数本体では、以下の組み合わせが見られる可能性が高いです。

* 変数の宣言と代入
* 関数呼び出し
* 制御フロー文
* 戻り値

制御フローを除いて、これらの変換について簡単に見ていきます。制御フローについては後ほど説明します。

### 変数宣言の変換

ほとんどの場合、C#の`var`と同じように`let`を単独で使えます。

```csharp
// C#の変数宣言
var result = input * input;
```

```fsharp
// F#の値宣言
let result = input * input
```

C#とは異なり、F#では値の宣言の一部として必ず何かを割り当て（「バインド」）する必要があります。

```csharp
// C#の例 
int unassignedVariable; //有効
```

```fsharp
// F#の例 
let unassignedVariable // 無効
```

前述のとおり、宣言後に値を変更する必要がある場合は、"mutable"キーワードを使用する必要があります。

値に型を指定する必要がある場合、型名はコロンに続いて値やパラメータの後に来ます。

```csharp
// C#の例 
int variableName = 42;
```

```fsharp
// F#の例 
let variableName:int = 42
```

### 関数呼び出しの変換

F#ネイティブの関数を呼び出す場合、かっこやカンマは不要です。つまり、関数の定義時と同じルールが関数の呼び出しにも適用されます。

以下はC#コードで関数を定義し、それを呼び出す例です。

```csharp
// メソッド/関数の定義 
int Square(int input) { ... コード  ...}

// 呼び出し
var result = Square(input);
```

しかし、F#は通常パラメータと戻り値の型を推論できるため、明示的に指定する必要はほとんどありません。
したがって、以下は関数を定義し、それを呼び出す典型的なF#コードです。

```fsharp
// 関数の定義 
let Square input = ... コード ...

// 呼び出し
let result = Square input
```

### 戻り値

C#では`return`キーワードを使用します。しかしF#では、ブロック内の最後の値が自動的に「戻り値」になります。

以下はC#コードで`result`変数を返す例です。

```csharp
public int Square(int input)
{
    var result = input * input;
    return result;   //明示的な"return"キーワード
}
```

そして、これがF#の同等のコードです。

```fsharp
let Square input = 
    let result = input * input
    result        // 暗黙的な「戻り値」
```

これは、F#が式ベースだからです。すべてが式であり、ブロック式全体の値は単にブロック内の最後の式の値です。

式指向のコードの詳細については、「[式 vs. 文](../posts/expressions-vs-statements.md)」を参照してください。

### コンソールへの出力

C#で出力を行うには、一般的に`Console.WriteLine`やそれに類似したものを使用します。F#では、一般的に型安全な`printf`やそれに類似したものを使用します。（[「printf」ファミリーの使用に関する詳細](../posts/printf.md)）

### 例#1の完全な移植

すべてをまとめると、例#1のF#への完全な直接移植は以下のようになります。

C#のコードを再度示します。
```csharp
using System;
using System.Collections.Generic;

namespace PortingToFsharp
{
    public class Squarer
    {
        public int Square(int input)
        {
            var result = input * input;
            return result;
        }

        public void PrintSquare(int input)
        {
            var result = this.Square(input);
            Console.WriteLine("Input={0}. Result={1}", 
              input, result);
        }
    }
```

そして、F#での同等なコードがこちらです。

```fsharp
namespace PortingToFsharp

open System
open System.Collections.Generic

type Squarer() =  

    let Square input = 
        let result = input * input
        result

    let PrintSquare input = 
        let result = Square input
        printf "Input=%i. Result=%i" input result
```
    

