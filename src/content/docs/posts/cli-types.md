---
layout: post
title: "F#の組み込み型"
description: "整数、文字列、真偽値など"
nav: fsharp-types
seriesId: "F#の型を理解する"
seriesOrder: 10
---

この記事では、[.NETに組み込まれている標準的な型](https://learn.microsoft.com/ja-jp/dotnet/standard/class-library-overview)をF#がどう扱うかを簡単に見ていきます。

## リテラル

F# では、C# と同じ構文を使用してリテラルを表しますが、いくつかの例外があります。

組み込み型は以下のように分類できます。

* その他の型 (`bool`, `char` など)
* 文字列型
* 整数型 ( `int` 、 `uint` 、 `byte` など)
* 浮動小数点型 ( `float` 、 `decimal` など)
* ポインタ型 ( `IntPtr` など)

以下の表は、プリミティブ型とそのF#キーワード、接尾辞（ある場合）、例、対応する.NET CLR型を示しています。

### その他の型

<table class="table table-condensed table-striped">
<col width=5em></col>
<tr>
<th></th>
<th>オブジェクト</th>
<th>ユニット</th>
<th>真偽値</th>
<th>文字<br>（Unicode）</th>
<th>文字<br>（ASCII）</th>
</tr>
<tr>
<td>キーワード</td>
<td>obj</td>
<td>unit</td>
<td>bool</td>
<td>char</td>
<td>byte</td>
</tr>
<tr>
<td>接尾辞</td>
<td></td>
<td></td>
<td></td>
<td></td>
<td>B</td>
</tr>
<tr>
<td>例</td>
<td>let o = obj()</td>
<td>let u = ()</td>
<td>true false</td>
<td>'a'</td>
<td>'a'B</td>
</tr>
<tr>
<td>.NET型</td>
<td>Object</td>
<td>（相当なし）</td>
<td>Boolean</td>
<td>Char</td>
<td>Byte</td>
</tr>
</table>

オブジェクトとユニットは厳密には.NETのプリミティブ型ではありませんが、網羅性のために含めました。

### 文字列型

<table class="table table-condensed table-striped">
<col width=5em></col>
<tr>
<th></th>
<th>文字列<br>（Unicode）</th>
<th>逐語的文字列<br>（Unicode）</th>
<th>三重引用符文字列<br>（Unicode）</th>
<th>文字列<br>（ASCII）</th>
</tr>
<tr>
<td>キーワード</td>
<td>string</td>
<td>string</td>
<td>string</td>
<td>byte[]</td>
</tr>
<tr>
<td>接尾辞</td>
<td></td>
<td></td>
<td></td>
<td></td>
</tr>
<tr>
<td>例</td>
<td>"first\nsecond line"</td>
<td>@"C:\name"</td>
<td>"""can "contain"" special chars"""</td>
<td>"aaa"B</td>
</tr>
<tr>
<td>.NET型</td>
<td>String</td>
<td>String</td>
<td>String</td>
<td>Byte[]</td>
</tr>
</table>

通常の文字列内では、 `\n` 、 `\t` 、 `\\` などの特殊文字を使えます。引用符はバックスラッシュでエスケープする必要があります。 `\'` と `\"` がその例です。

逐語的文字列では、バックスラッシュは無視されます。これはWindowsのファイル名や正規表現パターンに便利です。ただし、引用符は2つ重ねる必要があります。

三重引用符文字列は、VS2012で新しく導入されました。特殊文字をエスケープする必要がないため、埋め込み引用符を簡単に扱えます。XMLに最適です。

### 整数型

<table class="table table-condensed table-striped">
<col width=5em></col>
<tr>
<th></th>
<th>8ビット<br>（符号付き）</th>
<th>8ビット<br>（符号なし）</th>
<th>16ビット<br>（符号付き）</th>
<th>16ビット<br>（符号なし）</th>
<th>32ビット<br>（符号付き）</th>
<th>32ビット<br>（符号なし）</th>
<th>64ビット<br>（符号付き）</th>
<th>64ビット<br>（符号なし）</th>
<th>任意<br>精度</th>
</tr>
<tr>
<td>キーワード</td>
<td>sbyte</td>
<td>byte</td>
<td>int16</td>
<td>uint16</td>
<td>int</td>
<td>uint32</td>
<td>int64</td>
<td>uint64</td>
<td>bigint</td>
</tr>
<tr>
<td>接尾辞</td>
<td>y</td>
<td>uy</td>
<td>s</td>
<td>us</td>
<td></td>
<td>u</td>
<td>L</td>
<td>UL</td>
<td>I</td>
</tr>
<tr>
<td>例</td>
<td>99y</td>
<td>99uy</td>
<td>99s</td>
<td>99us</td>
<td>99</td>
<td>99u</td>
<td>99L</td>
<td>99UL</td>
<td>99I</td>
</tr>
<tr>
<td>.NET型</td>
<td>SByte</td>
<td>Byte</td>
<td>Int16</td>
<td>UInt16</td>
<td>Int32</td>
<td>UInt32</td>
<td>Int64</td>
<td>UInt64</td>
<td>BigInteger</td>
</tr>
</table>


`BigInteger` は、すべてのバージョンのF#で使えます。.NET 4以降では、.NETの基本ライブラリの一部として含まれています。

整数型は16進数や8進数でも表せます。

* 16進数の接頭辞は `0x` です。たとえば、 `0xFF` は16進数で255を表します。
* 8進数の接頭辞は `0o` です。たとえば、 `0o377` は8進数で255を表します。


### 浮動小数点型

<table class="table table-condensed table-striped">
<col width="5em"></col>
<tr>
<th></th>
<th>32ビット<br>浮動小数点</th>
<th>64ビット（デフォルト）<br>浮動小数点</th>
<th>高精度<br>浮動小数点</th>
</tr>
<tr>
<td>キーワード</td>
<td>float32, single</td>
<td>float, double</td>
<td>decimal</td>
</tr>
<tr>
<td>接尾辞</td>
<td>f</td>
<td></td>
<td>m</td>
</tr>
<tr>
<td>例</td>
<td>123.456f</td>
<td>123.456</td>
<td>123.456m</td>
</tr>
<tr>
<td>.NET型</td>
<td>Single</td>
<td>Double</td>
<td>Decimal</td>
</tr>
</table>

F#ではデフォルトで `float` を使いますが、 `double` も使えることに注意してください。

### ポインタ型

<table class="table table-condensed table-striped">
<col width="5em"></col>
<tr>
<th></th>
<th>ポインタ/ハンドル<br>（符号付き）</th>
<th>ポインタ/ハンドル<br>（符号なし）</th>
</tr>
<tr>
<td>キーワード</td>
<td>nativeint</td>
<td>unativeint</td>
</tr>
<tr>
<td>接尾辞</td>
<td>n</td>
<td>un</td>
</tr>
<tr>
<td>例</td>
<td>0xFFFFFFFFn</td>
<td>0xFFFFFFFFun</td>
</tr>
<tr>
<td>.NET型</td>
<td>IntPtr</td>
<td>UIntPtr</td>
</tr>
</table>


## 組み込みプリミティブ型間のキャスト

*注：このセクションではプリミティブ型のキャストのみを扱います。クラス間のキャストについては、[オブジェクト指向プログラミングのシリーズ](../posts/casting.html)を参照してください。*


F#には直接的な「キャスト」構文はありませんが、型間のキャストを行うヘルパー関数があります。これらのヘルパー関数は型と同じ名前を持ちます。 `Microsoft.FSharp.Core` 名前空間で見つけることができます。

たとえば、C#では次のように書きます。

```csharp
var x = (int)1.23
var y = (double)1   
```

F#では次のように書きます。

```fsharp
let x = int 1.23
let y = float 1
```

F#では、数値型に対するキャスト関数しかありません。特に、 `bool` に対するキャストはなく、 `Convert` などを使う必要があります。

```fsharp
let x = bool 1  // エラー
let y = System.Convert.ToBoolean(1)  // OK
```


<a name="boxing"></a>
## ボクシングとアンボクシング

C#や他の.NET言語と同様に、プリミティブなintやfloat型は値型であり、クラスではありません。
通常はあまり意識しませんが、特定の状況では問題になることがあります。

まず、単純な例を見てみましょう。以下の例では、 `Object` 型のパラメータを受け取り、そのまま返す関数を定義します。
`int` を渡すと、暗黙的にオブジェクトにボクシングされます。テストコードから分かるように、結果は `int` ではなく `object` を返します。

```fsharp
// Object型のパラメータを持つ関数を作る
let objFunction (o:obj) = o

// テスト：整数を渡して呼び出す
let result = objFunction 1

// 結果は
// val result : obj = 1

```

`result` が整数ではなくオブジェクトであることは、注意しないと型エラーの原因になることがあります。たとえば、結果を元の値と直接比較することはできません。
 
```fsharp
let resultIsOne = (result = 1)
// error FS0001: この式に必要な型は 'obj' ですが、
// ここでは次の型が指定されています 'int'
```

この状況や似たような状況に対処するため、 `box` キーワードを使ってプリミティブ型を直接オブジェクトに変換できます。
```fsharp
let o = box 1

// 上の比較例を再テストし、ボクシングを使う
let result = objFunction 1
let resultIsOne = (result = box 1)  // OK
```

オブジェクトをプリミティブ型に戻すには、 `unbox` キーワードを使います。ただし、 `box` とは異なり、アンボクシング先の型を指定するか、コンパイラが正確に型推論できるよう十分な情報が必要となります。

```fsharp
// intをボクシング
let o = box 1

// 対象の値の型が分かっている場合
let i:int = unbox o  // OK 

// unboxで明示的に型を指定
let j = unbox<int> o  // OK 

// 型推論が可能なので、型注釈は不要
let k = 1 + unbox o  // OK 
```

したがって、先ほどの比較の例も `unbox` を使って行えます。 `int` 型との比較なので、明示的な型注釈は必要ありません。

```fsharp
let result = objFunction 1
let resultIsOne = (unbox result = 1)  // OK
```

しかし、十分な型情報を指定しないと、悪名高き「値制限」エラーに遭遇します。

```fsharp
let o = box 1

// 型が指定されていない
let i = unbox o  // error FS0030: 値の制限
```

解決方法は、型推論を助けるようにコードを並べ替えるか、どうしても駄目な場合は明示的な型注釈を追加することです。詳しくは[型推論に関する記事のトラブルシューティングのまとめ](../posts/type-inference.html#troubleshooting-summary)を参照してください。

### 型検出とボクシングの組み合わせ

パラメータの型に基づいてマッチングを行う関数を、 `:?` 演算子を使って作りたいとします。

```fsharp
let detectType v =
    match v with
        | :? int -> printfn "これは整数です"
        | _ -> printfn "それ以外です"
```

残念ながら、このコードはコンパイルに失敗し、次のエラーが出ます。

```fsharp
// error FS0008: この型 'a から型 int へのランタイム型変換またはランタイム型テストには、
// このプログラムの場所の前方にある情報に基づく不確定の型が使用されています。
// 実行時の型テストは一部の型では許可されていません。さらなる型注釈が必要です。
```

「実行時の型テストは一部の型では許可されていません。」というメッセージが問題を示しています。

解決方法は、値を「ボクシング」して参照型に換し、その後で型チェックを行うことです。

```fsharp
let detectTypeBoxed v =
    match box v with      // "box v"を使う 
        | :? int -> printfn "これは整数です"
        | _ -> printfn "それ以外です"

// テスト
detectTypeBoxed 1
detectTypeBoxed 3.14
```

