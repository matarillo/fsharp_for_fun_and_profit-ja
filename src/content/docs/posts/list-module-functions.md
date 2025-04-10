---
layout: post
title: "コレクション関数の選び方"
description: "迷える人のためのガイド"
categories: []
---

新しい言語を学ぶには、言語自体以上のものが必要です。
生産性を上げるには、標準ライブラリの大部分を暗記し、残りの部分についても概ね把握しておく必要があります。
たとえば、C#を知っているなら、Java言語自体はすぐに習得できますが、Java Class Libraryに慣れるまでは本当の意味で上達したとは言えません。

同様に、F#のコレクションを扱う関数すべてにある程度慣れるまでは、F#で本当に効率的に作業することはできません。

C#ではLINQメソッドを数個知っていれば十分です<sup>1</sup>（`Select`、`Where`など）。
しかしF#では、現在Listモジュールに約100の関数があり（SeqモジュールやArrayモジュールでも同様です）。これはかなりの数です。
 
<small><sup>1</sup> 実際にはもっとありますが、少数で事足ります。F#ではすべてを知ることがより重要です。</small>

C#からF#に移行する場合、大量のリスト関数に圧倒されることがあります。

そこで、求める関数を見つけるためのガイドとして、この投稿を書きました。
お遊びで、ゲームブック『きみならどうする？』のスタイルで作成しました。
 
![](@assets/img/cyoa_list_module.jpg)
 
## どのコレクションを使うべき？

まず、異なる種類の標準コレクションに関する情報をまとめた表を示します。F#固有のものが5つあります。`list`、`seq`、`array`、`map`、`set`です。
また、`ResizeArray`と`IDictionary`もよく使用されます。

<table class="table table-condensed table-striped">
<tr>
<th></th>
<th>不変？</th>
<th>備考</th>
</tr>
<tr>
<th>list</th>
<td>はい</td>
<td>
    <b>長所：</b>
    <ul>
    <li>パターンマッチングが可能。</li>
    <li>再帰を使った複雑な繰り返しが可能。</li>
    <li>前方への繰り返しが高速。先頭への追加が高速。</li>
    </ul>
    <b>短所：</b>
    <ul>
    <li>インデックスによるアクセスやその他のアクセス方法が遅い。</li>
    </ul>
</td>
</tr>
<tr>
<th>seq</th>
<td>はい</td>
<td>
    <p><code>IEnumerable</code>の別名。</p>
    <b>長所：</b>
    <ul>
    <li>遅延評価。</li>
    <li>メモリ効率が良い（一度に1要素だけ読み込む）。</li>
    <li>無限シーケンスを表現できる。</li>
    <li>IEnumerableを使用する.NETライブラリとの相互運用性がある。</li>
    </ul>
    <b>短所：</b>
    <ul>
    <li>パターンマッチングができない。</li>
    <li>前方のみの繰り返し。</li>
    <li>インデックスによるアクセスやその他のアクセス方法が遅い。</li>
    </ul>
</td>
</tr>
<tr>
<th>array</th>
<td>いいえ</td>
<td>
    <p>BCLの<code>Array</code>と同じ。</p>
    <b>長所：</b>
    <ul>
    <li>ランダムアクセスが高速。</li>
    <li>メモリ効率が良く、特に構造体の場合にキャッシュ局所性がある。</li>
    <li>Arrayを使用する.NETライブラリとの相互運用性がある。</li>
    <li>2次元、3次元、4次元配列をサポート。</li>
    </ul>
    <b>短所：</b>
    <ul>
    <li>パターンマッチングの制限がある。</li>
    <li><a href="https://ja.wikipedia.org/wiki/%E6%B0%B8%E7%B6%9A%E3%83%87%E3%83%BC%E3%82%BF%E6%A7%8B%E9%80%A0">永続的</a>ではない。</li>
    </ul>
</td>
</tr>
<tr>
<th>map</th>
<td>はい</td>
<td>不変のディクショナリ。キーに<code>IComparable</code>の実装が必要。</td>
</tr>
<tr>
<th>set</th>
<td>はい</td>
<td>不変のセット。要素に<code>IComparable</code>の実装が必要。</td>
</tr>
<tr>
<th>ResizeArray</th>
<td>いいえ</td>
<td>BCLの<code>List</code>の別名。長所と短所は配列と似ているが、サイズ変更が可能。</td>
</tr>
<tr>
<th>IDictionary</th>
<td>はい</td>
<td>
    <p>要素に<code>IComparable</code>の実装が不要な代替ディクショナリとして、
    BCLの<a href="https://learn.microsoft.com/ja-jp/dotnet/api/system.collections.generic.idictionary-2">IDictionary</a>を使用できます。
    F#でのコンストラクタは<a href="https://fsharp.github.io/fsharp-core-docs/reference/fsharp-core-extratopleveloperators.html#dict"><code>dict</code></a>です。</p>
    <p><code>Add</code>などのミューテーションメソッドは存在しますが、呼び出すと実行時エラーが発生します。</p>
</tr>
</table>



これらがF#で頻繁に使用される主なコレクション型で、一般的な場合には十分です。

ただし、他の種類のコレクションが必要な場合、多くの選択肢があります。

* .NETのコレクションクラスを使用できます。[従来の可変なもの](https://learn.microsoft.com/ja-jp/dotnet/api/system.collections.generic)や、
  [System.Collections.Immutable名前空間](https://learn.microsoft.com/ja-jp/dotnet/api/system.collections.immutable)にある新しいものがあります。
* または、F#のコレクションライブラリの1つを使用することもできます。
  * [**FSharpx.Collections**](https://fsprojects.github.io/FSharpx.Collections/)、FSharpxシリーズのプロジェクトの一部。
  * [**ExtCore**](https://github.com/jack-pappas/ExtCore)。一部はFSharp.CoreのMapやSet型のほぼ直接的な代替として、特定のシナリオでパフォーマンスが向上します（例：HashMap）。他は特定のコーディングタスクに役立つユニークな機能を提供します（例：LazyListやLruCache）。
  * [**Imms**](https://github.com/GregRos/Imms)：.NET用の高性能な不変データ構造。
  * [**Persistent**](https://www.nuget.org/packages/persistent-collections)：効率的な永続的（不変）データ構造。

## ドキュメントについて

特に記載がない限り、F# v4ではすべての関数が`list`、`seq`、`array`で利用可能です。`Map`モジュールと`Set`モジュールにもいくつかの関数がありますが、ここでは`map`と`set`については触れません。

関数のシグネチャには、標準的なコレクション型として`list`を使用します。`seq`と`array`のバージョンのシグネチャも同様です。

関数名をクリックするとリンクが開きます。
これらの関数の一部は最新のF#では非推奨です。それらについては、コメントが含まれているGitHub上のソースコードに直接リンクします。

## 利用可能性に関する注意
 
これらの関数の利用可能性は、使用するF#のバージョンによって異なる場合があります。

* F#バージョン3（Visual Studio 2013）では、リスト、配列、シーケンス間に一定の不一致がありました。
* F#バージョン4（Visual Studio 2015）では、この不一致が解消され、ほぼすべての関数が3つのコレクション型すべてで利用可能になりました。

F# v3とF# v4の変更点を知りたい場合は、[このチャート](https://web.archive.org/web/20150102110622/http://blogs.msdn.com/cfs-filesystemfile.ashx/__key/communityserver-blogs-components-weblogfiles/00-00-01-39-71-metablogapi/3125.collectionAPI_5F00_254EA354.png)
  （[出典元](https://web.archive.org/web/20150102044332/http://blogs.msdn.com/b/fsharpteam/archive/2014/11/12/announcing-a-preview-of-f-4-0-and-the-visual-f-tools-in-vs-2015.aspx)）を参照してください。
このチャートはF# v4の新しいAPI（緑）、既存のAPI（青）、意図的に残された空白部分（白）を示しています。

以下で説明する関数の中には、このチャートにないものもあります。これらはさらに新しいものです。
古いバージョンのF#を使用している場合は、GitHub上のコードを参考に自分で実装することができます。
 
この注意事項を踏まえた上で、冒険を始めましょう。
 
<a id="toc"></a>
<hr>
## 目次

* [1. どんなコレクションを持っていますか？](#1)
* [2. 新しいコレクションの作成](#2)
* [3. 空または1要素のコレクションの作成](#3)
* [4. 既知のサイズの新しいコレクションの作成](#4)
* [5. 既知のサイズで、各要素が同じ値を持つ新しいコレクションの作成](#5)
* [6. 既知のサイズで、各要素が異なる値を持つ新しいコレクションの作成](#6)
* [7. 新しい無限コレクションの作成](#7)
* [8. 不定サイズの新しいコレクションの作成](#8)
* [9. 1つのリストの操作](#9)
* [10. 既知の位置にある要素の取得](#10)
* [11. 検索による要素の取得](#11)
* [12. コレクションから要素のサブセットを取得](#12)
* [13. 分割、チャンク化、グループ化](#13)
* [14. コレクションの集計または要約](#14)
* [15. 要素の順序の変更](#15)
* [16. コレクションの要素のテスト](#16)
* [17. 各要素を別のものに変換](#17)
* [18. 各要素に対する繰り返し処理](#18)
* [19. 繰り返し処理を通じた状態の受け渡し](#19)
* [20. 各要素のインデックスの操作](#20)
* [21. コレクション全体を異なるコレクション型に変換](#21)
* [22. コレクション全体の動作の変更](#22)
* [23. 2つのコレクションの操作](#23)
* [24. 3つのコレクションの操作](#24)
* [25. 3つ以上のコレクションの操作](#25)
* [26. コレクションの結合と分割](#26)
* [27. その他の配列専用関数](#27)
* [28. IDisposableを使用したシーケンスの操作](#28)

<a id="1"></a>
<hr>
## 1. どんなコレクションを持っていますか？

どのようなコレクションを持っていますか？

* コレクションを持っておらず、作成したい場合は、[セクション2](#2)に進んでください。
* すでに操作したいコレクションを持っている場合は、[セクション9](#9)に進んでください。
* 操作したい2つのコレクションがある場合は、[セクション23](#23)に進んでください。
* 操作したい3つのコレクションがある場合は、[セクション24](#24)に進んでください。
* 操作したい3つ以上のコレクションがある場合は、[セクション25](#25)に進んでください。
* コレクションを結合または分割したい場合は、[セクション26](#26)に進んでください。

<a id="2"></a>
<hr>
## 2. 新しいコレクションの作成

新しいコレクションを作成したいのですね。どのように作成しますか？

* 新しいコレクションが空または1つの要素を持つ場合は、[セクション3](#3)に進んでください。
* 新しいコレクションが既知のサイズの場合は、[セクション4](#4)に進んでください。
* 新しいコレクションが潜在的に無限の場合は、[セクション7](#7)に進んでください。
* コレクションのサイズが不明な場合は、[セクション8](#8)に進んでください。

<a id="3"></a>
<hr>
## 3. 空または1要素のコレクションの作成

空または1要素の新しいコレクションを作成したい場合は、以下の関数を使います。

* [`empty : 'T list`](https://fsharp.github.io/fsharp-core-docs/reference/fsharp-collections-listmodule.html#empty)
  指定した型の空のリストを返します。
* [`singleton : value:'T -> 'T list`](https://fsharp.github.io/fsharp-core-docs/reference/fsharp-collections-listmodule.html#singleton)
  1つの項目だけを含むリストを返します。

コレクションのサイズが事前に分かっている場合、一般的には別の関数を使う方が効率的です。以下の[セクション4](#4)を参照してください。

### 使用例

```fsharp
let list0 = List.empty
// list0 = []

let list1 = List.singleton "hello"
// list1 = ["hello"]
```


<a id="4"></a>
<hr>
## 4. 既知のサイズの新しいコレクションの作成

* コレクションのすべての要素が同じ値を持つ場合は、[セクション5](#5)に進んでください。
* コレクションの要素が異なる可能性がある場合は、[セクション6](#6)に進んでください。


<a id="5"></a>
<hr>
## 5. 既知のサイズで、各要素が同じ値を持つ新しいコレクションの作成

既知のサイズで、各要素が同じ値を持つ新しいコレクションを作成したい場合は、`replicate`を使います。

* [`replicate : count:int -> initial:'T -> 'T list`](https://fsharp.github.io/fsharp-core-docs/reference/fsharp-collections-listmodule.html#replicate)
  指定された初期値を複製してコレクションを作成します。
* （配列のみ）[`create : count:int -> value:'T -> 'T[]`](https://fsharp.github.io/fsharp-core-docs/reference/fsharp-collections-arraymodule.html#create)
  すべての要素が最初に指定された値である配列を作成します。
* （配列のみ）[`zeroCreate : count:int -> 'T[]`](https://fsharp.github.io/fsharp-core-docs/reference/fsharp-collections-arraymodule.html#zeroCreate)
  エントリが最初にデフォルト値である配列を作成します。

`Array.create`は基本的に`replicate`と同じです（ただし実装が微妙に異なります）。`replicate`はF# v4で初めて`Array`用に実装されました。

### 使用例

```fsharp
let repl = List.replicate 3 "hello"
// val repl : string list = ["hello"; "hello"; "hello"]

let arrCreate = Array.create 3 "hello"
// val arrCreate : string [] = [|"hello"; "hello"; "hello"|]

let intArr0 : int[] = Array.zeroCreate 3
// val intArr0 : int [] = [|0; 0; 0|]

let stringArr0 : string[] = Array.zeroCreate 3
// val stringArr0 : string [] = [|null; null; null|]
```

`zeroCreate`では、ターゲットの型をコンパイラが知っている必要があることに注意してください。


<a id="6"></a>
<hr>
## 6. 既知のサイズで、各要素が異なる値を持つ新しいコレクションの作成

既知のサイズで、各要素が潜在的に異なる値を持つ新しいコレクションを作成したい場合、以下の3つの方法から選べます。

* [`init : length:int -> initializer:(int -> 'T) -> 'T list`](https://fsharp.github.io/fsharp-core-docs/reference/fsharp-collections-listmodule.html#init)
  各インデックスに対して指定されたジェネレータを呼び出してコレクションを作成します。
* リストと配列の場合、`[1; 2; 3]`（リスト）や`[|1; 2; 3|]`（配列）のようなリテラル構文も使えます。
* リスト、配列、シーケンスの場合、`for .. in .. do .. yield`というコンプリヘンション構文を使用できます。

### 使用例

```fsharp
// リスト初期化子を使用
let listInit1 = List.init 5 (fun i-> i*i)
// val listInit1 : int list = [0; 1; 4; 9; 16]

// リストコンプリヘンションを使用
let listInit2 = [for i in [1..5] do yield i*i]
// val listInit2 : int list = [1; 4; 9; 16; 25]

// リテラル
let listInit3 = [1; 4; 9; 16; 25]
// val listInit3 : int list = [1; 4; 9; 16; 25]

let arrayInit3 = [|1; 4; 9; 16; 25|]
// val arrayInit3 : int [] = [|1; 4; 9; 16; 25|]
```

リテラル構文では増分も指定できます。

```fsharp
// +2の増分を持つリテラル
let listOdd= [1..2..10]
// val listOdd : int list = [1; 3; 5; 7; 9]
```

コンプリヘンション構文はさらに柔軟で、複数回`yield`できます。

```fsharp
// リストコンプリヘンションを使用
let listFunny = [
    for i in [2..3] do 
        yield i
        yield i*i
        yield i*i*i
        ]
// val listFunny : int list = [2; 4; 8; 3; 9; 27]
```

また、簡易的なインラインフィルタとしても使えます。

```fsharp
let primesUpTo n = 
   let rec sieve l  = 
      match l with 
      | [] -> []
      | p::xs -> 
            p :: sieve [for x in xs do if (x % p) > 0 then yield x]
   [2..n] |> sieve 

primesUpTo 20
// [2; 3; 5; 7; 11; 13; 17; 19]
```

他に2つのテクニックがあります。

* `yield!`を使用してリストを返すことができます。
* 再帰も使用できます。

以下は、両方のテクニックを使用して2ずつ10までカウントアップする例です。

```fsharp
let rec listCounter n = [
    if n <= 10 then
        yield n
        yield! listCounter (n+2)
    ]

listCounter 3
// val it : int list = [3; 5; 7; 9]
listCounter 4
// val it : int list = [4; 6; 8; 10]
```

<a id="7"></a>
<hr>
## 7. 新しい無限コレクションの作成

無限リストが必要な場合、リストや配列ではなくシーケンスを使う必要があります。

* [`initInfinite : initializer:(int -> 'T) -> seq<'T>`](https://fsharp.github.io/fsharp-core-docs/reference/fsharp-collections-seqmodule.html#initInfinite)
  繰り返し処理時に、指定された関数を呼び出して連続した要素を返す新しいシーケンスを生成します。
* 再帰ループを使用したシーケンスコンプリヘンションでも無限シーケンスを生成できます。

### 使用例

```fsharp
// ジェネレータバージョン
let seqOfSquares = Seq.initInfinite (fun i -> i*i)
let firstTenSquares = seqOfSquares |> Seq.take 10

firstTenSquares |> List.ofSeq // [0; 1; 4; 9; 16; 25; 36; 49; 64; 81]

// 再帰バージョン
let seqOfSquares_v2 = 
    let rec loop n = seq {
        yield n * n
        yield! loop (n+1)
        }
    loop 1
let firstTenSquares_v2 = seqOfSquares_v2 |> Seq.take 10 
```

<a id="8"></a>
<hr>
## 8. 不定サイズの新しいコレクションの作成

コレクションのサイズが事前に分からない場合があります。この場合、停止シグナルを受け取るまで要素を追加し続ける関数が必要です。
ここで`unfold`が役立ちます。停止シグナルは`None`（停止）または`Some`（続行）を返すかどうかです。

* [`unfold : generator:('State -> ('T * 'State) option) -> state:'State -> 'T list`](https://fsharp.github.io/fsharp-core-docs/reference/fsharp-collections-listmodule.html#unfold)
  指定された計算によって生成された要素を含むコレクションを返します。

### 使用例

この例では、空の行が入力されるまでコンソールから読み取りを繰り返します。

```fsharp
let getInputFromConsole lineNo =
    let text = System.Console.ReadLine()
    if System.String.IsNullOrEmpty(text) then
        None
    else
        // 値と新しいスレッド状態を返す
        // "text"が生成されるシーケンスに含まれる
        Some (text,lineNo+1)

let listUnfold = List.unfold getInputFromConsole 1
```

`unfold`はジェネレータを通じて状態を受け渡す必要があります。これを無視することもできますし（上の`ReadLine`の例のように）、
これまでの処理内容を記録するために使うこともできます。たとえば、`unfold`を使ってフィボナッチ数列のジェネレータを作成できます。

```fsharp
let fibonacciUnfolder max (f1,f2)  =
    if f1 > max then
        None
    else
        // 値と新しいスレッド状態を返す
        let fNext = f1 + f2
        let newState = (f2,fNext)
        // f1が生成されるシーケンスに含まれる
        Some (f1,newState)

let fibonacci max = List.unfold (fibonacciUnfolder max) (1,1)
fibonacci 100
// int list = [1; 1; 2; 3; 5; 8; 13; 21; 34; 55; 89]
```

<a id="9"></a>
<hr>
## 9. 1つのリストの操作

1つのリストを操作する場合で...

* 既知の位置にある要素を取得したい場合は、[セクション10](#10)に進んでください。
* 検索によって1つの要素を取得したい場合は、[セクション11](#11)に進んでください。
* コレクションのサブセットを取得したい場合は、[セクション12](#12)に進んでください。
* コレクションを分割、チャンク化、またはグループ化して小さなコレクションにしたい場合は、[セクション13](#13)に進んでください。
* コレクションを単一の値に集計または要約したい場合は、[セクション14](#14)に進んでください。
* 要素の順序を変更したい場合は、[セクション15](#15)に進んでください。
* コレクション内の要素をテストしたい場合は、[セクション16](#16)に進んでください。
* 各要素を別のものに変換したい場合は、[セクション17](#17)に進んでください。
* 各要素に対して繰り返し処理を行いたい場合は、[セクション18](#18)に進んでください。
* 繰り返し処理を通じて状態を受け渡したい場合は、[セクション19](#19)に進んでください。
* 繰り返し処理やマッピング中に各要素のインデックスを知る必要がある場合は、[セクション20](#20)に進んでください。
* コレクション全体を異なるコレクション型に変換したい場合は、[セクション21](#21)に進んでください。
* コレクション全体の動作を変更したい場合は、[セクション22](#22)に進んでください。
* コレクションをその場で変更したい場合は、[セクション27](#27)に進んでください。
* IDisposableを使用した遅延コレクションを使いたい場合は、[セクション28](#28)に進んでください。

<a id="10"></a>
<hr>
## 10. 既知の位置にある要素の取得

以下の関数は、位置によってコレクション内の要素を取得します。

* [`head : list:'T list -> 'T`](https://fsharp.github.io/fsharp-core-docs/reference/fsharp-collections-listmodule.html#head)
  コレクションの最初の要素を返します。
* [`last : list:'T list -> 'T`](https://fsharp.github.io/fsharp-core-docs/reference/fsharp-collections-listmodule.html#last)
  コレクションの最後の要素を返します。
* [`item : index:int -> list:'T list -> 'T`](https://fsharp.github.io/fsharp-core-docs/reference/fsharp-collections-listmodule.html#item)
  コレクションの指定インデックスにある要素を返します。最初の要素のインデックスは0です。<br>
  注意：リストとシーケンスで`nth`と`item`の使用は避けてください。これらはランダムアクセス用に設計されていないため、一般的に遅くなります。
* [`nth : list:'T list -> index:int -> 'T`](https://github.com/fsharp/fsharp/blob/4331dca3648598223204eed6bfad2b41096eec8a/src/fsharp/FSharp.Core/list.fsi#L520)
  `item`の古いバージョンです。注意：v4では非推奨 - 代わりに`item`を使用してください。
* （配列のみ）[`get : array:'T[] -> index:int -> 'T`](https://fsharp.github.io/fsharp-core-docs/reference/fsharp-collections-arraymodule.html#get)
  `item`のもう1つのバージョンです。
* [`exactlyOne : list:'T list -> 'T`](https://fsharp.github.io/fsharp-core-docs/reference/fsharp-collections-listmodule.html#exactlyOne)
  コレクションの唯一の要素を返します。

しかし、コレクションが空の場合はどうなるでしょうか？その場合、`head`と`last`は例外（ArgumentException）で失敗します。

また、インデックスがコレクション内に見つからない場合はどうでしょうか？その場合も再び例外が発生します（リストの場合はArgumentException、配列の場合はIndexOutOfRangeException）。

そのため、一般的にこれらの関数の使用は避け、以下の`tryXXX`の同等品を使用することをお勧めします。

* [`tryHead : list:'T list -> 'T option`](https://fsharp.github.io/fsharp-core-docs/reference/fsharp-collections-listmodule.html#tryHead)
  コレクションの最初の要素を返します。コレクションが空の場合はNoneを返します。
* [`tryLast : list:'T list -> 'T option`](https://fsharp.github.io/fsharp-core-docs/reference/fsharp-collections-listmodule.html#tryLast)
  コレクションの最後の要素を返します。コレクションが空の場合はNoneを返します。
* [`tryItem : index:int -> list:'T list -> 'T option`](https://fsharp.github.io/fsharp-core-docs/reference/fsharp-collections-listmodule.html#tryItem)
  コレクションの指定インデックスにある要素を返します。インデックスが有効でない場合はNoneを返します。

### 使用例

```fsharp
let head = [1;2;3] |> List.head
// val head : int = 1

let badHead : int = [] |> List.head
// System.ArgumentException: リストが空です。

let goodHeadOpt = 
    [1;2;3] |> List.tryHead 
// val goodHeadOpt : int option = Some 1

let badHeadOpt : int option = 
    [] |> List.tryHead 
// val badHeadOpt : int option = None    

let goodItemOpt = 
    [1;2;3] |> List.tryItem 2
// val goodItemOpt : int option = Some 3

let badItemOpt = 
    [1;2;3] |> List.tryItem 99
// val badItemOpt : int option = None
```

前述のように、リストに対する`item`関数の使用は避けるべきです。たとえば、リストの各項目を処理したい場合、命令型プログラミングの背景から
次のようなループを書きたくなるかもしれません。

```fsharp
// こうしないでください！
let helloBad = 
    let list = ["a";"b";"c"]
    let listSize = List.length list
    [ for i in [0..listSize-1] do
        let element = list |> List.item i
        yield "hello " + element 
    ]
// val helloBad : string list = ["hello a"; "hello b"; "hello c"]
```

こうしないでください！代わりに`map`のようなものを使ってください。より簡潔で効率的です。

```fsharp
let helloGood = 
    let list = ["a";"b";"c"]
    list |> List.map (fun element -> "hello " + element)
// val helloGood : string list = ["hello a"; "hello b"; "hello c"]
```

<a id="11"></a>
<hr>
## 11. 検索による要素の取得

`find`と`findIndex`を使用して、要素またはそのインデックスを検索できます。

* [`find : predicate:('T -> bool) -> list:'T list -> 'T`](https://fsharp.github.io/fsharp-core-docs/reference/fsharp-collections-listmodule.html#find)
  指定された関数がtrueを返す最初の要素を返します。
* [`findIndex : predicate:('T -> bool) -> list:'T list -> int`](https://fsharp.github.io/fsharp-core-docs/reference/fsharp-collections-listmodule.html#findIndex)
  指定された関数がtrueを返す最初の要素のインデックスを返します。

また、逆方向にも検索できます。

* [`findBack : predicate:('T -> bool) -> list:'T list -> 'T`](https://fsharp.github.io/fsharp-core-docs/reference/fsharp-collections-listmodule.html#findBack)
  指定された関数がtrueを返す最後の要素を返します。
* [`findIndexBack : predicate:('T -> bool) -> list:'T list -> int`](https://fsharp.github.io/fsharp-core-docs/reference/fsharp-collections-listmodule.html#findIndexBack)
  指定された関数がtrueを返す最後の要素のインデックスを返します。

しかし、項目が見つからない場合はどうなるでしょうか？その場合、これらの関数は例外（KeyNotFoundException）で失敗します。

そのため、`head`や`item`と同様に、一般的にこれらの関数の使用は避け、以下の`tryXXX`の同等品を使用することをお勧めします。

* [`tryFind : predicate:('T -> bool) -> list:'T list -> 'T option`](https://fsharp.github.io/fsharp-core-docs/reference/fsharp-collections-listmodule.html#tryFind)
  指定された関数がtrueを返す最初の要素を返します。そのような要素が存在しない場合はNoneを返します。
* [`tryFindBack : predicate:('T -> bool) -> list:'T list -> 'T option`](https://fsharp.github.io/fsharp-core-docs/reference/fsharp-collections-listmodule.html#tryFindBack)
  指定された関数がtrueを返す最後の要素を返します。そのような要素が存在しない場合はNoneを返します。
* [`tryFindIndex : predicate:('T -> bool) -> list:'T list -> int option`](https://fsharp.github.io/fsharp-core-docs/reference/fsharp-collections-listmodule.html#tryFindIndex)
  指定された関数がtrueを返す最初の要素のインデックスを返します。そのような要素が存在しない場合はNoneを返します。
* [`tryFindIndexBack : predicate:('T -> bool) -> list:'T list -> int option`](https://fsharp.github.io/fsharp-core-docs/reference/fsharp-collections-listmodule.html#tryFindIndexBack)
  指定された関数がtrueを返す最後の要素のインデックスを返します。そのような要素が存在しない場合はNoneを返します。

`map`の後に`find`を行う場合、多くの場合`pick`（または、より良い選択として`tryPick`）を使用して2つのステップを1つに結合できます。使用例は以下を参照してください。

* [`pick : chooser:('T -> 'U option) -> list:'T list -> 'U`](https://fsharp.github.io/fsharp-core-docs/reference/fsharp-collections-listmodule.html#pick)
  与えられた関数を連続した要素に適用し、選択関数がSomeを返す最初の結果を返します。
* [`tryPick : chooser:('T -> 'U option) -> list:'T list -> 'U option`](https://fsharp.github.io/fsharp-core-docs/reference/fsharp-collections-listmodule.html#tryPick)
  与えられた関数を連続した要素に適用し、選択関数がSomeを返す最初の結果を返します。そのような要素が存在しない場合はNoneを返します。


### 使用例

```fsharp
let listOfTuples = [ (1,"a"); (2,"b"); (3,"b"); (4,"a"); ]

listOfTuples |> List.find ( fun (x,y) -> y = "b")
// (2, "b")

listOfTuples |> List.findBack ( fun (x,y) -> y = "b")
// (3, "b")

listOfTuples |> List.findIndex ( fun (x,y) -> y = "b")
// 1

listOfTuples |> List.findIndexBack ( fun (x,y) -> y = "b")
// 2

listOfTuples |> List.find ( fun (x,y) -> y = "c")
// KeyNotFoundException
```

`pick`では、boolを返す代わりにoptionを返します。

```fsharp
listOfTuples |> List.pick ( fun (x,y) -> if y = "b" then Some (x,y) else None)
// (2, "b")
```

<a id="pick-vs-find"></a>
### PickとFindの比較

`pick`関数は不要に見えるかもしれませんが、optionを返す関数を扱う際に便利です。

たとえば、文字列を解析してint型のSomeを返し、有効な整数でない場合はNoneを返す`tryInt`関数があるとします。

```fsharp
// string -> int option
let tryInt str = 
    match System.Int32.TryParse(str) with
    | true, i -> Some i
    | false, _ -> None
```

そして、リスト内の最初の有効な整数を見つけたいとします。素朴な方法は以下のようになります。

* `tryInt`を使用してリストをマップする
* `find`を使用して最初のSomeを見つける
* `Option.get`を使用してoptionの中身を取得する

コードは次のようになるでしょう。

```fsharp
let firstValidNumber = 
    ["a";"2";"three"]
    // 入力をマップする
    |> List.map tryInt 
    // 最初のSomeを見つける
    |> List.find (fun opt -> opt.IsSome)
    // optionからデータを取得する
    |> Option.get
// val firstValidNumber : int = 2
```

しかし、`pick`はこれらのステップをすべて一度に行います！そのため、コードがはるかに簡潔になります。

```fsharp
let firstValidNumber = 
    ["a";"2";"three"]
    |> List.pick tryInt 
```

`pick`と同じ方法で多くの要素を返したい場合は、`choose`の使用を検討してください（[セクション12](#12)参照）。

<a id="12"></a>
<hr>
## 12. コレクションから要素のサブセットを取得

前のセクションでは1つの要素を取得する方法を説明しました。では、複数の要素を取得するにはどうすればよいでしょうか？幸運なことに、選択肢がたくさんあります。

コレクションの前方から要素を抽出するには、以下のいずれかを使います。

* [`take: count:int -> list:'T list -> 'T list`](https://fsharp.github.io/fsharp-core-docs/reference/fsharp-collections-listmodule.html#take)
  コレクションの最初のN個の要素を返します。
* [`takeWhile: predicate:('T -> bool) -> list:'T list -> 'T list`](https://fsharp.github.io/fsharp-core-docs/reference/fsharp-collections-listmodule.html#takeWhile)
  与えられた述語がtrueを返す間、元のコレクションのすべての要素を含む新しいコレクションを返し、その後の要素は返しません。
* [`truncate: count:int -> list:'T list -> 'T list`](https://fsharp.github.io/fsharp-core-docs/reference/fsharp-collections-listmodule.html#truncate)
  最大N個の要素を新しいコレクションで返します。

コレクションの後方から要素を抽出するには、以下のいずれかを使います。

* [`skip: count:int -> list: 'T list -> 'T list`](https://fsharp.github.io/fsharp-core-docs/reference/fsharp-collections-listmodule.html#skip)
  最初のN個の要素を除いたコレクションを返します。
* [`skipWhile: predicate:('T -> bool) -> list:'T list -> 'T list`](https://fsharp.github.io/fsharp-core-docs/reference/fsharp-collections-listmodule.html#skipWhile)
  与えられた述語がtrueを返す間、コレクションの要素をスキップし、残りの要素を返します。
* [`tail: list:'T list -> 'T list`](https://fsharp.github.io/fsharp-core-docs/reference/fsharp-collections-listmodule.html#tail)
  最初の要素を除いたコレクションを返します。

その他の要素のサブセットを抽出するには、以下のいずれかを使います。

* [`filter: predicate:('T -> bool) -> list:'T list -> 'T list`](https://fsharp.github.io/fsharp-core-docs/reference/fsharp-collections-listmodule.html#filter)
  与えられた関数がtrueを返す要素のみを含む新しいコレクションを返します。
* [`except: itemsToExclude:seq<'T> -> list:'T list -> 'T list when 'T : equality`](https://fsharp.github.io/fsharp-core-docs/reference/fsharp-collections-listmodule.html#except)
  入力コレクションの個別の要素のうち、itemsToExcludeシーケンスに現れないものを含む新しいコレクションを返します。値の比較には汎用のハッシュと等価性の比較を使います。
* [`choose: chooser:('T -> 'U option) -> list:'T list -> 'U list`](https://fsharp.github.io/fsharp-core-docs/reference/fsharp-collections-listmodule.html#choose)
  与えられた関数をコレクションの各要素に適用します。関数がSomeを返す要素で構成されたコレクションを返します。
* [`where: predicate:('T -> bool) -> list:'T list -> 'T list`](https://fsharp.github.io/fsharp-core-docs/reference/fsharp-collections-listmodule.html#where)
  与えられた述語がtrueを返す要素のみを含む新しいコレクションを返します。
  注意：「where」は「filter」の同義語です。
* (配列のみ) [`sub : 'T [] -> int -> int -> 'T []`](https://fsharp.github.io/fsharp-core-docs/reference/fsharp-collections-arraymodule.html#sub)
  指定された開始インデックスと長さのサブ範囲を含む配列を作成します。
* スライス構文も使えます。`myArray.[2..5]`。例は以下を参照してください。

リストを個別の要素に絞り込むには、以下のいずれかを使います。

* [`distinct: list:'T list -> 'T list when 'T : equality`](https://fsharp.github.io/fsharp-core-docs/reference/fsharp-collections-listmodule.html#distinct)
  汎用のハッシュと等価性の比較に基づいて、重複のないエントリのみを含むコレクションを返します。
* [`distinctBy: projection:('T -> 'Key) -> list:'T list -> 'T list when 'Key : equality`](https://fsharp.github.io/fsharp-core-docs/reference/fsharp-collections-listmodule.html#distinctBy)
  与えられたキー生成関数によって返されたキーに対する汎用のハッシュと等価性の比較に基づいて、重複のないエントリのみを含むコレクションを返します。

### 使用例

前方から要素を取得：

```fsharp
[1..10] |> List.take 3    
// [1; 2; 3]

[1..10] |> List.takeWhile (fun i -> i < 3)    
// [1; 2]

[1..10] |> List.truncate 4
// [1; 2; 3; 4]

[1..2] |> List.take 3    
// System.InvalidOperationException: 入力シーケンスの要素数が不足しています。

[1..2] |> List.takeWhile (fun i -> i < 3)  
// [1; 2]

[1..2] |> List.truncate 4
// [1; 2]   // エラーなし！
```

後方から要素を取得：

```fsharp
[1..10] |> List.skip 3    
// [4; 5; 6; 7; 8; 9; 10]

[1..10] |> List.skipWhile (fun i -> i < 3)    
// [3; 4; 5; 6; 7; 8; 9; 10]

[1..10] |> List.tail
// [2; 3; 4; 5; 6; 7; 8; 9; 10]

[1..2] |> List.skip 3    
// System.ArgumentException: インデックスが正しい範囲外です。

[1..2] |> List.skipWhile (fun i -> i < 3)  
// []

[1] |> List.tail |> List.tail
// System.ArgumentException: 入力リストが空でした。
```

その他の要素のサブセットを抽出：

```fsharp
[1..10] |> List.filter (fun i -> i%2 = 0) // 偶数
// [2; 4; 6; 8; 10]

[1..10] |> List.where (fun i -> i%2 = 0) // 偶数
// [2; 4; 6; 8; 10]

[1..10] |> List.except [3;4;5]
// [1; 2; 6; 7; 8; 9; 10]
```

スライスを抽出：

```fsharp
Array.sub [|1..10|] 3 5
// [|4; 5; 6; 7; 8|]

[1..10].[3..5] 
// [4; 5; 6]

[1..10].[3..] 
// [4; 5; 6; 7; 8; 9; 10]

[1..10].[..5] 
// [1; 2; 3; 4; 5; 6]
```

リストのスライシングは遅い可能性があるので注意してください。ランダムアクセスではないためです。一方、配列のスライシングは高速です。
  
個別の要素を抽出：
  
```fsharp
[1;1;1;2;3;3] |> List.distinct
// [1; 2; 3]

[ (1,"a"); (1,"b"); (1,"c"); (2,"d")] |> List.distinctBy fst
// [(1, "a"); (2, "d")]
```

  
<a id="choose-vs-fliter"></a> 
### ChooseとFilterの比較

`pick`と同様に、`choose`関数は一見扱いにくく見えるかもしれませんが、オプションを返す関数を扱う場合に便利です。
  
実際、`choose`は`filter`に対して、[`pick`が`find`に対するのと同じ関係](#pick-vs-find)にあります。ブールフィルタを使う代わりに、`Some`と`None`で信号を送ります。

前と同様に、文字列を解析して有効な整数の場合は`Some int`を返し、そうでない場合は`None`を返す`tryInt`関数があるとします。

```fsharp
// string -> int option
let tryInt str = 
    match System.Int32.TryParse(str) with
    | true, i -> Some i
    | false, _ -> None
```

ここで、リスト内のすべての有効な整数を見つけたいとします。素朴な方法は以下のようになります。

* `tryInt`を使ってリストをマップする
* `Some`のものだけを含むようにフィルタリングする
* `Option.get`を使って各オプションから値を取り出す

コードは次のようになるでしょう。

```fsharp
let allValidNumbers = 
    ["a";"2";"three"; "4"]
    // 入力をマップ
    |> List.map tryInt 
    // "Some"のみを含める
    |> List.filter (fun opt -> opt.IsSome)
    // 各オプションからデータを取得
    |> List.map Option.get
// val allValidNumbers : int list = [2; 4]
```

しかし、`choose`はこれらのステップをすべて一度に行います。そのため、コードがはるかに簡潔になります。

```fsharp
let allValidNumbers = 
    ["a";"2";"three"; "4"]
    |> List.choose tryInt 
```

すでにオプションのリストがある場合、`choose`に`id`を渡すことで、フィルタリングと"Some"の返却を1ステップで行えます。

```fsharp
let reduceOptions = 
    [None; Some 1; None; Some 2]
    |> List.choose id
// val reduceOptions : int list = [1; 2]
```

`choose`と同じ方法で最初の要素を返したい場合は、`pick`の使用を検討してください（[セクション11](#11)参照）。

`choose`と同様の操作を他のラッパー型（成功/失敗の結果など）で行いたい場合は、[ここで議論されています](../posts/elevated-world-5.md)。
  
<a id="13"></a>
<hr>
## 13. 分割、チャンク化、グループ化

コレクションを分割する方法はたくさんあります。使用例を見て、違いを確認してください。

* [`chunkBySize: chunkSize:int -> list:'T list -> 'T list list`](https://fsharp.github.io/fsharp-core-docs/reference/fsharp-collections-listmodule.html#chunkBySize)
  入力コレクションを最大`chunkSize`のチャンクに分割します。
* [`groupBy : projection:('T -> 'Key) -> list:'T list -> ('Key * 'T list) list when 'Key : equality`](https://fsharp.github.io/fsharp-core-docs/reference/fsharp-collections-listmodule.html#groupBy)
  コレクションの各要素にキー生成関数を適用し、一意のキーのリストを生成します。各一意のキーには、そのキーに一致するすべての要素のリストが含まれます。
* [`pairwise: list:'T list -> ('T * 'T) list`](https://fsharp.github.io/fsharp-core-docs/reference/fsharp-collections-listmodule.html#pairwise)
  入力コレクションの各要素とその前の要素のペアを含むコレクションを返します。ただし、最初の要素は2番目の要素の前の要素としてのみ返されます。
* (Seq以外) [`partition: predicate:('T -> bool) -> list:'T list -> ('T list * 'T list)`](https://fsharp.github.io/fsharp-core-docs/reference/fsharp-collections-listmodule.html#partition)
  与えられた述語がtrueを返す要素とfalseを返す要素をそれぞれ含む2つのコレクションにコレクションを分割します。
* (Seq以外) [`splitAt: index:int -> list:'T list -> ('T list * 'T list)`](https://fsharp.github.io/fsharp-core-docs/reference/fsharp-collections-listmodule.html#splitAt)
  指定されたインデックスでコレクションを2つのコレクションに分割します。
* [`splitInto: count:int -> list:'T list -> 'T list list`](https://fsharp.github.io/fsharp-core-docs/reference/fsharp-collections-listmodule.html#splitInto)
  入力コレクションを最大count個のチャンクに分割します。
* [`windowed : windowSize:int -> list:'T list -> 'T list list`](https://fsharp.github.io/fsharp-core-docs/reference/fsharp-collections-listmodule.html#windowed)
  入力コレクションから要素を取り出した、スライディングウィンドウのリストを返します。各ウィンドウは新しいコレクションとして返されます。
  `pairwise`とは異なり、ウィンドウはタプルではなくコレクションです。
  
### 使用例
  
```fsharp
[1..10] |> List.chunkBySize 3
// [[1; 2; 3]; [4; 5; 6]; [7; 8; 9]; [10]]  
// 最後のチャンクは1つの要素を持つことに注意

[1..10] |> List.splitInto 3
// [[1; 2; 3; 4]; [5; 6; 7]; [8; 9; 10]]
// 最初のチャンクが4つの要素を持つことに注意

['a'..'i'] |> List.splitAt 3
// (['a'; 'b'; 'c'], ['d'; 'e'; 'f'; 'g'; 'h'; 'i'])

['a'..'e'] |> List.pairwise
// [('a', 'b'); ('b', 'c'); ('c', 'd'); ('d', 'e')]

['a'..'e'] |> List.windowed 3
// [['a'; 'b'; 'c']; ['b'; 'c'; 'd']; ['c'; 'd'; 'e']]

let isEven i = (i%2 = 0)
[1..10] |> List.partition isEven 
// ([2; 4; 6; 8; 10], [1; 3; 5; 7; 9])

let firstLetter (str:string) = str.[0]
["apple"; "alice"; "bob"; "carrot"] |> List.groupBy firstLetter 
// [('a', ["apple"; "alice"]); ('b', ["bob"]); ('c', ["carrot"])]  
```

`splitAt`と`pairwise`以外のすべての関数は、エッジケースを適切に処理します。

```fsharp
[1] |> List.chunkBySize 3
// [[1]]

[1] |> List.splitInto 3
// [[1]]

['a'; 'b'] |> List.splitAt 3
// InvalidOperationException: 入力シーケンスの要素数が不足しています。

['a'] |> List.pairwise
// InvalidOperationException: 入力シーケンスの要素数が不足しています。

['a'] |> List.windowed 3
// []

[1] |> List.partition isEven 
// ([], [1])

[] |> List.groupBy firstLetter 
//  []
```


<a id="14"></a>
<hr>
## 14. コレクションの集計または要約

コレクション内の要素を集計する最も一般的な方法は`reduce`を使うことです。

* [`reduce : reduction:('T -> 'T -> 'T) -> list:'T list -> 'T`](https://fsharp.github.io/fsharp-core-docs/reference/fsharp-collections-listmodule.html#reduce)
  コレクションの各要素に関数を適用し、アキュムレータ引数を計算全体に通します。
* [`reduceBack : reduction:('T -> 'T -> 'T) -> list:'T list -> 'T`](https://fsharp.github.io/fsharp-core-docs/reference/fsharp-collections-listmodule.html#reduceBack)
  コレクションの各要素に関数を適用し、末尾から始めて、アキュムレータ引数を計算全体に通します。

また、よく使われる集計には`reduce`の特定バージョンがあります。
  
* [`max : list:'T list -> 'T when 'T : comparison`](https://fsharp.github.io/fsharp-core-docs/reference/fsharp-collections-listmodule.html#max)
  Operators.maxを使って比較し、コレクションのすべての要素の中で最大のものを返します。
* [`maxBy : projection:('T -> 'U) -> list:'T list -> 'T when 'U : comparison`](https://fsharp.github.io/fsharp-core-docs/reference/fsharp-collections-listmodule.html#maxBy)
  関数の結果にOperators.maxを適用して比較し、コレクションのすべての要素の中で最大のものを返します。
* [`min : list:'T list -> 'T when 'T : comparison`](https://fsharp.github.io/fsharp-core-docs/reference/fsharp-collections-listmodule.html#min)
  Operators.minを使って比較し、コレクションのすべての要素の中で最小のものを返します。
* [`minBy : projection:('T -> 'U) -> list:'T list -> 'T when 'U : comparison `](https://fsharp.github.io/fsharp-core-docs/reference/fsharp-collections-listmodule.html#minBy)
  関数の結果にOperators.minを適用して比較し、コレクションのすべての要素の中で最小のものを返します。
* [`sum : list:'T list -> 'T when 'T has static members (+) and Zero`](https://fsharp.github.io/fsharp-core-docs/reference/fsharp-collections-listmodule.html#sum)
  コレクション内の要素の合計を返します。
* [`sumBy : projection:('T -> 'U) -> list:'T list -> 'U when 'U has static members (+) and Zero`](https://fsharp.github.io/fsharp-core-docs/reference/fsharp-collections-listmodule.html#sumBy)
  関数をコレクションの各要素に適用して生成された結果の合計を返します。
* [`average : list:'T list -> 'T when 'T has static members (+) and Zero and DivideByInt`](https://fsharp.github.io/fsharp-core-docs/reference/fsharp-collections-listmodule.html#average)
  コレクション内の要素の平均を返します。
  整数のリストは平均を取れないことに注意してください - floatまたはdecimalにキャストする必要があります。
* [`averageBy : projection:('T -> 'U) -> list:'T list -> 'U when 'U has static members (+) and Zero and DivideByInt`](https://fsharp.github.io/fsharp-core-docs/reference/fsharp-collections-listmodule.html#averageBy)
  関数をコレクションの各要素に適用して生成された結果の平均を返します。
  
最後に、いくつかのカウント関数があります。

* [`length: list:'T list -> int`](https://fsharp.github.io/fsharp-core-docs/reference/fsharp-collections-listmodule.html#length)
  コレクションの長さを返します。
* [`countBy : projection:('T -> 'Key) -> list:'T list -> ('Key * int) list when 'Key : equality`](https://fsharp.github.io/fsharp-core-docs/reference/fsharp-collections-listmodule.html#countBy)
  各要素にキー生成関数を適用し、一意のキーとそのキーの元のコレクションでの出現回数を含むコレクションを返します。

### 使用例

`reduce`は初期状態を持たない`fold`の変種です - `fold`については[セクション19](#19)を参照してください。
考え方の一つは、各要素間に演算子を挿入するだけというものです。

```fsharp
["a";"b";"c"] |> List.reduce (+)     
// "abc"
```

これは以下と同じです。

```fsharp
"a" + "b" + "c"
```

別の例を示します。

```fsharp
[2;3;4] |> List.reduce (*)     
// 以下と同じ
2 * 3 * 4
// 結果は24
```

要素の結合方法によっては結合の順序が重要になるため、「reduce」には2つの変種があります。

* `reduce`はリストを前方に進みます。
* `reduceBack`は、予想通り、リストを後方に進みます。

その違いを示します。まず`reduce`から：

```fsharp
[1;2;3;4] |> List.reduce (fun state x -> (state)*10 + x)

// 以下から構築              // 各ステップの状態
1                            // 1
(1)*10 + 2                   // 12 
((1)*10 + 2)*10 + 3          // 123 
(((1)*10 + 2)*10 + 3)*10 + 4 // 1234

// 最終結果は1234   
```

*同じ*結合関数を`reduceBack`で使うと、異なる結果が得られます。以下のようになります。

```fsharp
[1;2;3;4] |> List.reduceBack (fun x state -> x + 10*(state))

// 以下から構築              // 各ステップの状態
4                            // 4
3 + 10*(4)                   // 43  
2 + 10*(3 + 10*(4))          // 432  
1 + 10*(2 + 10*(3 + 10*(4))) // 4321  

// 最終結果は4321   
```
  
関連する関数`fold`と`foldBack`についての詳細な議論は、再度[セクション19](#19)を参照してください。

その他の集計関数はもっと分かりやすいです。
  
```fsharp
type Suit = Club | Diamond | Spade | Heart 
type Rank = Two | Three | King | Ace
let cards = [ (Club,King); (Diamond,Ace); (Spade,Two); (Heart,Three); ]

cards |> List.max        // (Heart, Three)
cards |> List.maxBy snd  // (Diamond, Ace)
cards |> List.min        // (Club, King)
cards |> List.minBy snd  // (Spade, Two)

[1..10] |> List.sum
// 55

[ (1,"a"); (2,"b") ] |> List.sumBy fst
// 3

[1..10] |> List.average
// 型 'int' は演算子 'DivideByInt' をサポートしていません

[1..10] |> List.averageBy float
// 5.5

[ (1,"a"); (2,"b") ] |> List.averageBy (fst >> float)
// 1.5

[1..10] |> List.length
// 10

[ ("a","A"); ("b","B"); ("a","C") ]  |> List.countBy fst
// [("a", 2); ("b", 1)]
  
[ ("a","A"); ("b","B"); ("a","C") ]  |> List.countBy snd
// [("A", 1); ("B", 1); ("C", 1)]
```

ほとんどの集計関数は空のリストを好みません！安全を期すなら`fold`関数の使用を検討してください - [セクション19](#19)を参照。

```fsharp
let emptyListOfInts : int list = []

emptyListOfInts |> List.reduce (+)     
// ArgumentException: 入力リストが空でした。

emptyListOfInts |> List.max
// ArgumentException: 入力シーケンスが空でした。

emptyListOfInts |> List.min
// ArgumentException: 入力シーケンスが空でした。

emptyListOfInts |> List.sum      
// 0

emptyListOfInts |> List.averageBy float
// ArgumentException: 入力シーケンスが空でした。

let emptyListOfTuples : (int*int) list = []
emptyListOfTuples |> List.countBy fst
// (int * int) list = []
```
  
<a id="15"></a>
<hr>
## 15. 要素の順序の変更

反転、ソート、順列を使用して要素の順序を変更できます。以下のすべては*新しい*コレクションを返します。

* [`rev: list:'T list -> 'T list`](https://fsharp.github.io/fsharp-core-docs/reference/fsharp-collections-listmodule.html#rev)
  要素を逆順にした新しいコレクションを返します。
* [`sort: list:'T list -> 'T list when 'T : comparison`](https://fsharp.github.io/fsharp-core-docs/reference/fsharp-collections-listmodule.html#sort)
  Operators.compareを使用して与えられたコレクションをソートします。
* [`sortDescending: list:'T list -> 'T list when 'T : comparison`](https://fsharp.github.io/fsharp-core-docs/reference/fsharp-collections-listmodule.html#sortDescending)
  Operators.compareを使用して与えられたコレクションを降順にソートします。
* [`sortBy: projection:('T -> 'Key) -> list:'T list -> 'T list when 'Key : comparison`](https://fsharp.github.io/fsharp-core-docs/reference/fsharp-collections-listmodule.html#sortBy)
  与えられた射影によって提供されたキーを使用して与えられたコレクションをソートします。キーはOperators.compareを使用して比較されます。
* [`sortByDescending: projection:('T -> 'Key) -> list:'T list -> 'T list when 'Key : comparison`](https://fsharp.github.io/fsharp-core-docs/reference/fsharp-collections-listmodule.html#sortByDescending)
  与えられた射影によって提供されたキーを使用して与えられたコレクションを降順にソートします。キーはOperators.compareを使用して比較されます。
* [`sortWith: comparer:('T -> 'T -> int) -> list:'T list -> 'T list`](https://fsharp.github.io/fsharp-core-docs/reference/fsharp-collections-listmodule.html#sortWith)
  与えられた比較関数を使用して与えられたコレクションをソートします。
* [`permute : indexMap:(int -> int) -> list:'T list -> 'T list`](https://fsharp.github.io/fsharp-core-docs/reference/fsharp-collections-listmodule.html#permute)
  指定された順列に従ってすべての要素を並べ替えたコレクションを返します。
  
また、その場でソートする配列専用の関数もあります。
  
* (配列のみ) [`sortInPlace: array:'T[] -> unit when 'T : comparison`](https://fsharp.github.io/fsharp-core-docs/reference/fsharp-collections-arraymodule.html#sortInPlace)
  配列をその場で変異させて要素をソートします。要素はOperators.compareを使用して比較されます。
* (配列のみ) [`sortInPlaceBy: projection:('T -> 'Key) -> array:'T[] -> unit when 'Key : comparison`](https://fsharp.github.io/fsharp-core-docs/reference/fsharp-collections-arraymodule.html#sortInPlaceBy)
  与えられたキー生成関数を使用して、配列をその場で変異させて要素をソートします。キーはOperators.compareを使用して比較されます。
* (配列のみ) [`sortInPlaceWith: comparer:('T -> 'T -> int) -> array:'T[] -> unit`](https://fsharp.github.io/fsharp-core-docs/reference/fsharp-collections-arraymodule.html#sortInPlaceWith)
  与えられた比較関数を順序として使用して、配列をその場で変異させて要素をソートします。

### 使用例
  
```fsharp
[1..5] |> List.rev
// [5; 4; 3; 2; 1]

[2;4;1;3;5] |> List.sort
// [1; 2; 3; 4; 5]

[2;4;1;3;5] |> List.sortDescending
// [5; 4; 3; 2; 1]

[ ("b","2"); ("a","3"); ("c","1") ]  |> List.sortBy fst
// [("a", "3"); ("b", "2"); ("c", "1")]

[ ("b","2"); ("a","3"); ("c","1") ]  |> List.sortBy snd
// [("c", "1"); ("b", "2"); ("a", "3")]

// 比較関数の例
let tupleComparer tuple1 tuple2  =
    if tuple1 < tuple2 then 
        -1 
    elif tuple1 > tuple2 then 
        1 
    else
        0

[ ("b","2"); ("a","3"); ("c","1") ]  |> List.sortWith tupleComparer
// [("a", "3"); ("b", "2"); ("c", "1")]

[1..10] |> List.permute (fun i -> (i + 3) % 10)
// [8; 9; 10; 1; 2; 3; 4; 5; 6; 7]

[1..10] |> List.permute (fun i -> 9 - i)
// [10; 9; 8; 7; 6; 5; 4; 3; 2; 1]
```

<a id="16"></a> 
<hr>  
## 16. コレクションの要素のテスト

これらの関数はすべてtrueまたはfalseを返します。

* [`contains: value:'T -> source:'T list -> bool when 'T : equality`](https://fsharp.github.io/fsharp-core-docs/reference/fsharp-collections-listmodule.html#contains)
  コレクションが指定された要素を含むかどうかをテストします。
* [`exists: predicate:('T -> bool) -> list:'T list -> bool`](https://fsharp.github.io/fsharp-core-docs/reference/fsharp-collections-listmodule.html#exists)
  コレクションの要素のいずれかが与えられた述語を満たすかどうかをテストします。
* [`forall: predicate:('T -> bool) -> list:'T list -> bool`](https://fsharp.github.io/fsharp-core-docs/reference/fsharp-collections-listmodule.html#forall)
  コレクションのすべての要素が与えられた述語を満たすかどうかをテストします。
* [`isEmpty: list:'T list -> bool`](https://fsharp.github.io/fsharp-core-docs/reference/fsharp-collections-listmodule.html#isEmpty)
  コレクションに要素が含まれていない場合はtrue、そうでない場合はfalseを返します。

### 使用例
  
```fsharp
[1..10] |> List.contains 5
// true

[1..10] |> List.contains 42
// false

[1..10] |> List.exists (fun i -> i > 3 && i < 5)
// true

[1..10] |> List.exists (fun i -> i > 5 && i < 3)
// false

[1..10] |> List.forall (fun i -> i > 0)
// true

[1..10] |> List.forall (fun i -> i > 5)
// false

[1..10] |> List.isEmpty
// false
```

<a id="17"></a>
<hr>
## 17. 各要素を別のものに変換する

私は時々、関数型プログラミングを「変換指向プログラミング」と考えるのが好きです。`map`（LINQでは`Select`）は、このアプローチの最も基本的な要素の1つです。
実際、私はこのテーマについて[ここ](./elevated-world.md)で連載を書いています。

* [`map: mapping:('T -> 'U) -> list:'T list -> 'U list`](https://fsharp.github.io/fsharp-core-docs/reference/fsharp-collections-listmodule.html#map)
  与えられた関数をコレクションの各要素に適用した結果を要素とする新しいコレクションを作成します。

時には、各要素がリストにマップされ、すべてのリストをフラット化したい場合があります。この場合は、`collect`（LINQでは`SelectMany`）を使います。
  
* [`collect: mapping:('T -> 'U list) -> list:'T list -> 'U list`](https://fsharp.github.io/fsharp-core-docs/reference/fsharp-collections-listmodule.html#collect)
  リストの各要素に与えられた関数を適用します。すべての結果を連結し、結合されたリストを返します。
  
その他の変換関数には以下があります。
  
* [セクション12](#12)の`choose`は、mapとオプションフィルタを組み合わせたものです。
* （Seqのみ）[`cast: source:IEnumerable -> seq<'T>`](https://fsharp.github.io/fsharp-core-docs/reference/fsharp-collections-seqmodule.html#cast)
  型の緩い`System.Collections`シーケンスを型付きシーケンスとしてラップします。

### 使用例

以下は、従来の方法で`map`を使用する例です。リストとマッピング関数を受け取り、新しく変換されたリストを返す関数として使います。

```fsharp
let add1 x = x + 1

// リスト変換としてのmap
[1..5] |> List.map add1
// [2; 3; 4; 5; 6]

// マップされるリストには何でも入れられます！
let times2 x = x * 2
[ add1; times2] |> List.map (fun f -> f 5)
// [6; 10]
```

`map`を*関数変換器*として考えることもできます。要素から要素への関数をリストからリストへの関数に変換します。

```fsharp
let add1ToEachElement = List.map add1
// "add1ToEachElement"は、intからintへの変換ではなく、リストからリストへの変換を行います
// val add1ToEachElement : (int list -> int list)

// 使用例
[1..5] |> add1ToEachElement 
// [2; 3; 4; 5; 6]
```

`collect`はリストをフラット化するのに役立ちます。既にリストのリストがある場合、`collect`と`id`を使ってフラット化できます。

```fsharp
[2..5] |> List.collect (fun x -> [x; x*x; x*x*x] )
// [2; 4; 8; 3; 9; 27; 4; 16; 64; 5; 25; 125]

// collectと"id"の使用
let list1 = [1..3]
let list2 = [4..6]
[list1; list2] |> List.collect id
// [1; 2; 3; 4; 5; 6]
```

### Seq.cast

最後に、`Seq.cast`は、ジェネリックではなく特殊なコレクションクラスを持つBCLの古い部分を扱う際に便利です。

たとえば、正規表現ライブラリにこの問題があります。以下のコードは、`MatchCollection`が`IEnumerable<T>`ではないためコンパイルできません。

```fsharp
open System.Text.RegularExpressions

let matches = 
    let pattern = "\d\d\d"
    let matchCollection = Regex.Matches("123 456 789",pattern)
    matchCollection
    |> Seq.map (fun m -> m.Value)     // エラー
    // エラー: 型 'MatchCollection' は型 'seq<'a>' と互換性がありません
    |> Seq.toList
```

修正方法は、`MatchCollection`を`Seq<Match>`にキャストすることです。そうすればコードはうまく動作します。

```fsharp
let matches = 
    let pattern = "\d\d\d"
    let matchCollection = Regex.Matches("123 456 789",pattern)
    matchCollection
    |> Seq.cast<Match> 
    |> Seq.map (fun m -> m.Value)
    |> Seq.toList
// 出力 = ["123"; "456"; "789"]
```

<a id="18"></a>
<hr>
## 18. 各要素に対する繰り返し処理

通常、コレクションを処理する際は、`map`を使って各要素を新しい値に変換します。
しかし、時には有用な値を*生成しない*関数（「unit関数」）ですべての要素を処理する必要があります。

* [`iter: action:('T -> unit) -> list:'T list -> unit`](https://fsharp.github.io/fsharp-core-docs/reference/fsharp-collections-listmodule.html#iter)
  与えられた関数をコレクションの各要素に適用します。
* あるいは、for-loopを使うこともできます。for-loop内の式は`unit`を返す*必要があります*。

### 使用例

unit関数の最も一般的な例は、すべて副作用に関するものです。コンソールへの出力、データベースの更新、キューへのメッセージの配置などです。
以下の例では、単にunit関数として`printfn`を使います。

```fsharp
[1..3] |> List.iter (fun i -> printfn "iは%iです" i)
(*
iは1です
iは2です
iは3です
*)

// または部分適用を使用
[1..3] |> List.iter (printfn "iは%iです")

// またはfor loopを使用
for i = 1 to 3 do
    printfn "iは%iです" i

// またはfor-in loopを使用
for i in [1..3] do
    printfn "iは%iです" i
```

前述のように、`iter`やfor-loop内の式はunitを返す必要があります。以下の例では、要素に1を加えようとしてコンパイルエラーが発生します。

```fsharp
[1..3] |> List.iter (fun i -> i + 1)
//                               ~~~
// エラー FS0001: 型 'unit' は型 'int' と一致しません

// for-loopの式は*必ず*unitを返す必要があります
for i in [1..3] do
     i + 1  // エラー
     // この式は型 'unit' を持つべきですが、
     // 型 'int' を持っています。'ignore' を使用してください...
```

コードに論理的なバグがないことを確信し、このエラーを解消したい場合は、結果を`ignore`にパイプできます。

```fsharp
[1..3] |> List.iter (fun i -> i + 1 |> ignore)

for i in [1..3] do
     i + 1 |> ignore
```

<a id="19"></a>
<hr>
## 19. 繰り返し処理を通じた状態の受け渡し

`fold`関数は、コレクション操作の中で最も基本的かつ強力な関数です。他のすべての関数（`unfold`のような生成器を除く）は、これを使って書くことができます。以下の例を参照してください。

* [`fold<'T,'State> : folder:('State -> 'T -> 'State) -> state:'State -> list:'T list -> 'State`](https://fsharp.github.io/fsharp-core-docs/reference/fsharp-collections-listmodule.html#fold)
  コレクションの各要素に関数を適用し、アキュムレータ引数を計算全体に通します。
* [`foldBack<'T,'State> : folder:('T -> 'State -> 'State) -> list:'T list -> state:'State -> 'State`](https://fsharp.github.io/fsharp-core-docs/reference/fsharp-collections-listmodule.html#foldBack)
  コレクションの各要素に関数を適用し、末尾から始めて、アキュムレータ引数を計算全体に通します。
  警告: 無限リストに対して`Seq.foldBack`を使うと、ランタイムはハハハと笑って、その後すぐに静かになります。
  
`fold`関数は「左畳み込み」、`foldBack`は「右畳み込み」とも呼ばれます。

`scan`関数は`fold`に似ていますが、中間結果も返すため、繰り返し処理の追跡やモニタリングに使えます。

* [`scan<'T,'State>  : folder:('State -> 'T -> 'State) -> state:'State -> list:'T list -> 'State list`](https://fsharp.github.io/fsharp-core-docs/reference/fsharp-collections-listmodule.html#scan)
  `fold`と同様ですが、中間結果と最終結果の両方を返します。
* [`scanBack<'T,'State> : folder:('T -> 'State -> 'State) -> list:'T list -> state:'State -> 'State list`](https://fsharp.github.io/fsharp-core-docs/reference/fsharp-collections-listmodule.html#scanBack)
  `foldBack`と同様ですが、中間結果と最終結果の両方を返します。

fold関数のように、`scan`は「左スキャン」、`scanBack`は「右スキャン」とも呼ばれます。
  
最後に、`mapFold`は`map`と`fold`を1つの素晴らしい超能力に組み合わせます。`map`と`fold`を別々に使うよりも複雑ですが、より効率的です。

* [`mapFold<'T,'State,'Result> : mapping:('State -> 'T -> 'Result * 'State) -> state:'State -> list:'T list -> 'Result list * 'State`](https://fsharp.github.io/fsharp-core-docs/reference/fsharp-collections-listmodule.html#mapFold)
  mapとfoldを組み合わせます。与えられた関数を入力コレクションの各要素に適用した結果を要素とする新しいコレクションを作成します。この関数は最終値の蓄積にも使われます。
* [`mapFoldBack<'T,'State,'Result> : mapping:('T -> 'State -> 'Result * 'State) -> list:'T list -> state:'State -> 'Result list * 'State`](https://fsharp.github.io/fsharp-core-docs/reference/fsharp-collections-listmodule.html#mapFoldBack)
  mapとfoldBackを組み合わせます。与えられた関数を入力コレクションの各要素に適用した結果を要素とする新しいコレクションを作成します。この関数は最終値の蓄積にも使われます。

### `fold`の例

`fold`の考え方の1つは、`reduce`と同じですが、初期状態のための追加パラメータがあるというものです。

```fsharp
["a";"b";"c"] |> List.fold (+) "hello: "    
// "hello: abc"
// "hello: " + "a" + "b" + "c"

[1;2;3] |> List.fold (+) 10    
// 16
// 10 + 1 + 2 + 3
```

`reduce`と同様に、`fold`と`foldBack`は非常に異なる結果を生む可能性があります。

```fsharp
[1;2;3;4] |> List.fold (fun state x -> (state)*10 + x) 0
                                // 各ステップでの状態
1                               // 1
(1)*10 + 2                      // 12 
((1)*10 + 2)*10 + 3             // 123 
(((1)*10 + 2)*10 + 3)*10 + 4    // 1234
// 最終結果は1234   
```

そして、これが`foldBack`のバージョンです。

```fsharp
List.foldBack (fun x state -> x + 10*(state)) [1;2;3;4] 0
                                // 各ステップでの状態  
4                               // 4
3 + 10*(4)                      // 43  
2 + 10*(3 + 10*(4))             // 432  
1 + 10*(2 + 10*(3 + 10*(4)))    // 4321  
// 最終結果は4321   
```

`foldBack`は`fold`とはパラメータの順序が異なることに注意してください。リストは最後から2番目、初期状態が最後にあるため、パイピングが便利ではありません。

### 再帰 vs 繰り返し

`fold`と`foldBack`を混同しやすいです。私は`fold`を*繰り返し*に関するもの、`foldBack`を*再帰*に関するものと考えると理解しやすいと感じています。

リストの合計を計算したいとします。繰り返しの方法では、for-loopを使うでしょう。
（ミュータブルな）アキュムレータから始めて、各繰り返しを通じてそれを更新していきます。

```fsharp
let iterativeSum list = 
    let mutable total = 0
    for e in list do
        total <- total + e
    total // 合計を返す
```

一方、再帰的なアプローチでは、リストに頭部と尾部がある場合、
まず尾部（より小さなリスト）の合計を計算し、それに頭部を加えます。

尾部がどんどん小さくなり、最終的に空になるまでこれを繰り返します。

```fsharp
let rec recursiveSum list = 
    match list with
    | [] -> 
        0
    | head::tail -> 
        head + (recursiveSum tail)
```

どちらのアプローチが良いでしょうか？

集計の場合、繰り返し方法（`fold`）の方が理解しやすいことが多いです。
しかし、新しいリストの構築などの場合、再帰的な方法（`foldBack`）の方が理解しやすいです。

たとえば、各要素を対応する文字列に変換する関数をゼロから作成する場合、
次のように書くかもしれません。

```fsharp
let rec mapToString list = 
    match list with
    | [] -> 
        []
    | head::tail -> 
        head.ToString() :: (mapToString tail)

[1..3] |> mapToString 
// ["1"; "2"; "3"]
```

`foldBack`を使えば、同じロジックを「そのまま」転用できます。

* 空リストに対するアクション = `[]`
* 非空リストに対するアクション = `head.ToString() :: state`

結果の関数は次のようになります。

```fsharp
let foldToString list = 
    let folder head state = 
        head.ToString() :: state
    List.foldBack folder list []

[1..3] |> foldToString 
// ["1"; "2"; "3"]
```

一方、`fold`の大きな利点は、パイピングとよく合うため「インライン」で使いやすいことです。

幸い、（少なくともリスト構築の場合）最後にリストを反転させれば、`foldBack`と同じように`fold`を使えます。

```fsharp
// "foldToString"のインラインバージョン
[1..3] 
|> List.fold (fun state head -> head.ToString() :: state) []
|> List.rev
// ["1"; "2"; "3"]
```

### `fold`を使って他の関数を実装する

前述のように、`fold`はリストを操作するための中核的な関数であり、ほとんどの他の関数をエミュレートできます。
ただし、カスタム実装ほど効率的ではない場合があります。

たとえば、`fold`を使って`map`を実装すると次のようになります。

```fsharp
/// 関数"f"をすべての要素にマップする
let myMap f list = 
    // ヘルパー関数
    let folder state head =
        f head :: state

    // メインフロー
    list
    |> List.fold folder []
    |> List.rev

[1..3] |> myMap (fun x -> x + 2)
// [3; 4; 5]
```

そして、`fold`を使って`filter`を実装すると次のようになります。

```fsharp
/// "pred"がtrueの要素の新しいリストを返す
let myFilter pred list = 
    // ヘルパー関数
    let folder state head =
        if pred head then 
            head :: state
        else
            state

    // メインフロー
    list
    |> List.fold folder []
    |> List.rev

let isOdd n = (n%2=1)
[1..5] |> myFilter isOdd 
// [1; 3; 5]
```

もちろん、同様の方法で他の関数もエミュレートできます。

### `scan`の例

先ほど、`fold`の中間ステップの例を示しました。

```fsharp
[1;2;3;4] |> List.fold (fun state x -> (state)*10 + x) 0
                                // 各ステップでの状態
1                               // 1
(1)*10 + 2                      // 12 
((1)*10 + 2)*10 + 3             // 123 
(((1)*10 + 2)*10 + 3)*10 + 4    // 1234
// 最終結果は1234   
```

この例では、中間状態を手動で計算する必要がありました。

`scan`を使っていれば、これらの中間状態を無料で手に入れられたでしょう！

```fsharp
[1;2;3;4] |> List.scan (fun state x -> (state)*10 + x) 0
// 左から蓄積 ===> [0; 1; 12; 123; 1234]
```

`scanBack`も同じように動作しますが、もちろん逆向きです。

```fsharp
List.scanBack (fun x state -> (state)*10 + x) [1;2;3;4] 0
// [4321; 432; 43; 4; 0]  <=== 右から蓄積
```

「右スキャン」の場合も、「左スキャン」と比べてパラメータの順序が逆になっています。

### `scan`を使った文字列の切り詰め

`scan`が役立つ例を紹介します。ニュースサイトがあり、見出しを50文字に収める必要があるとします。

単純に50文字で切り詰めると見栄えが悪くなります。代わりに、単語の境界で切り詰めたいと思います。

`scan`を使ってこれを行う方法の1つを示します。

* 見出しを単語に分割します。
* `scan`を使って単語を再び連結し、各単語を追加した断片のリストを生成します。
* 50文字未満の最長の断片を取得します。

```fsharp
// まずテキストを単語に分割
let text = "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor."
let words = text.Split(' ')
// [|"Lorem"; "ipsum"; "dolor"; "sit"; ... ]

// 一連の断片を蓄積
let fragments = words |> Seq.scan (fun frag word -> frag + " " + word) ""
(*
" Lorem" 
" Lorem ipsum" 
" Lorem ipsum dolor"
" Lorem ipsum dolor sit" 
" Lorem ipsum dolor sit amet,"
など
*)

// 50文字未満の最長の断片を取得
let longestFragUnder50 = 
    fragments 
    |> Seq.takeWhile (fun s -> s.Length <= 50) 
    |> Seq.last 

// 最初の空白を削除
let longestFragUnder50Trimmed = 
    longestFragUnder50 |> (fun s -> s.[1..])

// 結果は：
//   "Lorem ipsum dolor sit amet, consectetur"
```

`Array.scan`ではなく`Seq.scan`を使っていることに注意してください。これにより遅延スキャンが行われ、不要な断片の作成を避けられます。

最後に、完全なロジックをユーティリティ関数としてまとめます。

```fsharp
// 全体を関数として
let truncText max (text:string) = 
    if text.Length <= max then
        text
    else
        text.Split(' ')
        |> Seq.scan (fun frag word -> frag + " " + word) ""
        |> Seq.takeWhile (fun s -> s.Length <= max-3) 
        |> Seq.last 
        |> (fun s -> s.[1..] + "...")
    
"a small headline" |> truncText 50
// "a small headline"

text |> truncText 50
// "Lorem ipsum dolor sit amet, consectetur..."
```

もちろん、もっと効率的な実装があることは分かっています。しかし、この小さな例が`scan`の力を示していることを願っています。

### `mapFold`の例

`mapFold`関数は、1つのステップでmapとfoldを行うことができ、時々便利です。

以下は、`mapFold`を使って加算と合計を1つのステップで組み合わせる例です。

```fsharp
let add1 x = x + 1

// mapを使ってadd1
[1..5] |> List.map (add1)   
// 結果 => [2; 3; 4; 5; 6]

// foldを使って合計
[1..5] |> List.fold (fun state x -> state + x) 0   
// 結果 => 15

// mapFoldを使ってmapと合計
[1..5] |> List.mapFold (fun state x -> add1 x, (state + x)) 0   
// 結果 => ([2; 3; 4; 5; 6], 15)
```


<a id="20"></a>
<hr>
## 20. 各要素のインデックスの操作

繰り返し処理を行う際、しばしば要素のインデックスが必要になります。ミュータブルなカウンターを使うこともできますが、ライブラリに任せてリラックスするのはいかがでしょうか？

* [`mapi: mapping:(int -> 'T -> 'U) -> list:'T list -> 'U list`](https://fsharp.github.io/fsharp-core-docs/reference/fsharp-collections-listmodule.html#mapi)
  `map`と同様ですが、整数のインデックスも関数に渡されます。`map`の詳細については[セクション17](#17)を参照してください。
* [`iteri: action:(int -> 'T -> unit) -> list:'T list -> unit`](https://fsharp.github.io/fsharp-core-docs/reference/fsharp-collections-listmodule.html#iteri)
  `iter`と同様ですが、整数のインデックスも関数に渡されます。`iter`の詳細については[セクション18](#18)を参照してください。
* [`indexed: list:'T list -> (int * 'T) list`](https://fsharp.github.io/fsharp-core-docs/reference/fsharp-collections-listmodule.html#indexed)
  入力リストの対応する要素と各要素のインデックス（0から）をペアにした新しいリストを返します。

  
### 使用例
  
```fsharp
['a'..'c'] |> List.mapi (fun index ch -> sprintf "%i番目の要素は'%c'です" index ch)
// ["0番目の要素は'a'です"; "1番目の要素は'b'です"; "2番目の要素は'c'です"]

// 部分適用を使用
['a'..'c'] |> List.mapi (sprintf "%i番目の要素は'%c'です")
// ["0番目の要素は'a'です"; "1番目の要素は'b'です"; "2番目の要素は'c'です"]

['a'..'c'] |> List.iteri (printfn "%i番目の要素は'%c'です")
(*
0番目の要素は'a'です
1番目の要素は'b'です
2番目の要素は'c'です
*)
```

`indexed`はインデックスを含むタプルを生成します - `mapi`の特定の使用法のショートカットです。

```fsharp
['a'..'c'] |> List.mapi (fun index ch -> (index, ch) )
// [(0, 'a'); (1, 'b'); (2, 'c')]

// "indexed"は上の短縮版です
['a'..'c'] |> List.indexed
// [(0, 'a'); (1, 'b'); (2, 'c')]
```


<a id="21"></a>
<hr>
## 21. コレクション全体を異なるコレクション型に変換する

あるコレクションの種類から別のコレクションに変換する必要がよくあります。これらの関数がその役割を果たします。

`ofXXX`関数は`XXX`からモジュールの型に変換するために使います。たとえば、`List.ofArray`は配列をリストに変換します。

* （Array以外）[`ofArray : array:'T[] -> 'T list`](https://fsharp.github.io/fsharp-core-docs/reference/fsharp-collections-listmodule.html#ofArray)
  与えられた配列から新しいコレクションを作成します。
* （Seq以外）[`ofSeq: source:seq<'T> -> 'T list`](https://fsharp.github.io/fsharp-core-docs/reference/fsharp-collections-listmodule.html#ofSeq)
  与えられた列挙可能オブジェクトから新しいコレクションを作成します。
* （List以外）[`ofList: source:'T list -> seq<'T>`](https://fsharp.github.io/fsharp-core-docs/reference/fsharp-collections-seqmodule.html#ofList)
  与えられたリストから新しいコレクションを作成します。

`toXXX`関数はモジュールの型から`XXX`型に変換するために使います。たとえば、`List.toArray`はリストを配列に変換します。
  
* （Array以外）[`toArray: list:'T list -> 'T[]`](https://fsharp.github.io/fsharp-core-docs/reference/fsharp-collections-listmodule.html#toArray)
  与えられたコレクションから配列を作成します。
* （Seq以外）[`toSeq: list:'T list -> seq<'T>`](https://fsharp.github.io/fsharp-core-docs/reference/fsharp-collections-listmodule.html#toSeq)
  与えられたコレクションをシーケンスとして扱います。
* （List以外）[`toList: source:seq<'T> -> 'T list`](https://fsharp.github.io/fsharp-core-docs/reference/fsharp-collections-seqmodule.html#toList)
  与えられたコレクションからリストを作成します。

### 使用例

```fsharp
[1..5] |> List.toArray      // [|1; 2; 3; 4; 5|]
[1..5] |> Array.ofList      // [|1; 2; 3; 4; 5|]
// など
```

### 破棄可能なリソースを含むシーケンスの使用

これらの変換関数の重要な用途の1つは、遅延評価されるシーケンス（`seq`）を完全に評価されたコレクション（`list`など）に変換することです。特に
ファイルハンドルやデータベース接続などの破棄可能なリソースが関係している場合に重要です。シーケンスをリストに変換しないと、
要素にアクセスする際にエラーが発生する可能性があります。詳細は[セクション28](#28)を参照してください。



<a id="22"></a>
<hr>
## 22. コレクション全体の動作を変更する

コレクション全体の動作を変更する特別な関数（Seqのみ）がいくつかあります。

* （Seqのみ）[`cache: source:seq<'T> -> seq<'T>`](https://fsharp.github.io/fsharp-core-docs/reference/fsharp-collections-seqmodule.html#cache)
  入力シーケンスのキャッシュされたバージョンに対応するシーケンスを返します。この結果のシーケンスは入力シーケンスと同じ要素を持ちます。結果は
  複数回列挙できます。入力シーケンスは最大で1回だけ、必要な分だけ列挙されます。
* （Seqのみ）[`readonly : source:seq<'T> -> seq<'T>`](https://fsharp.github.io/fsharp-core-docs/reference/fsharp-collections-seqmodule.html#readonly)
  与えられたシーケンスオブジェクトに委譲する新しいシーケンスオブジェクトを構築します。これにより、元のシーケンスが型キャストによって再発見され変更されることがないようにします。
* （Seqのみ）[`delay : generator:(unit -> seq<'T>) -> seq<'T>`](https://fsharp.github.io/fsharp-core-docs/reference/fsharp-collections-seqmodule.html#delay)
  与えられた遅延シーケンス仕様から構築されるシーケンスを返します。

### `cache`の例

`cache`の使用例を示します。

```fsharp
let uncachedSeq = seq {
    for i = 1 to 3 do
        printfn "%iを計算中" i
        yield i
    }

// 2回繰り返す    
uncachedSeq |> Seq.iter ignore
uncachedSeq |> Seq.iter ignore
```

シーケンスを2回繰り返した結果は予想通りです。

```text
1を計算中
2を計算中
3を計算中
1を計算中
2を計算中
3を計算中
```

しかし、シーケンスをキャッシュすると...

```fsharp
let cachedSeq = uncachedSeq |> Seq.cache

// 2回繰り返す    
cachedSeq |> Seq.iter ignore
cachedSeq |> Seq.iter ignore
```

...各項目は1回だけ出力されます。

```text
1を計算中
2を計算中
3を計算中
```

### `readonly`の例

`readonly`を使ってシーケンスの基底型を隠す例を示します。

```fsharp
// シーケンスの基底型を出力
let printUnderlyingType (s:seq<_>) =
    let typeName = s.GetType().Name 
    printfn "%s" typeName 

[|1;2;3|] |> printUnderlyingType 
// Int32[]

[|1;2;3|] |> Seq.readonly |> printUnderlyingType 
// mkSeq@589   // 一時的な型
```

### `delay`の例

`delay`の例を示します。

```fsharp
let makeNumbers max =
    [ for i = 1 to max do
        printfn "%dを評価中。" i
        yield i ]

let eagerList = 
    printfn "eagerListの作成開始" 
    let list = makeNumbers 5
    printfn "eagerListの作成完了" 
    list

let delayedSeq = 
    printfn "delayedSeqの作成開始" 
    let list = Seq.delay (fun () -> makeNumbers 5 |> Seq.ofList)
    printfn "delayedSeqの作成完了" 
    list
```

上のコードを実行すると、`eagerList`を作成するだけで全ての「評価中」メッセージが出力されますが、`delayedSeq`の作成ではリストの繰り返しが開始されません。

```text
eagerListの作成開始
1を評価中。
2を評価中。
3を評価中。
4を評価中。
5を評価中。
eagerListの作成完了

delayedSeqの作成開始
delayedSeqの作成完了
```

シーケンスが繰り返されるときにのみリストの作成が行われます。

```fsharp
eagerList |> Seq.take 3  // リストはすでに作成済み
delayedSeq |> Seq.take 3 // リスト作成が開始される
```

`delay`を使う代わりに、リストを`seq`に埋め込む方法もあります。

```fsharp
let embeddedList = seq {
    printfn "embeddedListの作成開始" 
    yield! makeNumbers 5 
    printfn "embeddedListの作成完了" 
    }
```

`delayedSeq`と同様に、シーケンスが繰り返されるまで`makeNumbers`関数は呼び出されません。

<a id="23"></a>
<hr>
## 23. 2つのリストの操作

2つのリストがある場合、mapやfoldなどの一般的な関数のほとんどに相当するものがあります。

* [`map2: mapping:('T1 -> 'T2 -> 'U) -> list1:'T1 list -> list2:'T2 list -> 'U list`](https://fsharp.github.io/fsharp-core-docs/reference/fsharp-collections-listmodule.html#map2)
  2つのコレクションの対応する要素に与えられた関数を適用した結果を要素とする新しいコレクションを作成します。
* [`mapi2: mapping:(int -> 'T1 -> 'T2 -> 'U) -> list1:'T1 list -> list2:'T2 list -> 'U list`](https://fsharp.github.io/fsharp-core-docs/reference/fsharp-collections-listmodule.html#mapi2)
  `mapi`と同様ですが、同じ長さの2つのリストの対応する要素をマッピングします。
* [`iter2: action:('T1 -> 'T2 -> unit) -> list1:'T1 list -> list2:'T2 list -> unit`](https://fsharp.github.io/fsharp-core-docs/reference/fsharp-collections-listmodule.html#iter2)
  2つのコレクションに同時に与えられた関数を適用します。コレクションは同じサイズでなければなりません。
* [`iteri2: action:(int -> 'T1 -> 'T2 -> unit) -> list1:'T1 list -> list2:'T2 list -> unit`](https://fsharp.github.io/fsharp-core-docs/reference/fsharp-collections-listmodule.html#iteri2)
  `iteri`と同様ですが、同じ長さの2つのリストの対応する要素をマッピングします。
* [`forall2: predicate:('T1 -> 'T2 -> bool) -> list1:'T1 list -> list2:'T2 list -> bool`](https://fsharp.github.io/fsharp-core-docs/reference/fsharp-collections-listmodule.html#forall2)
  2つのコレクションの長さの小さい方まで、対応する要素に述語が適用されます。いずれかの適用がfalseを返すと全体の結果はfalse、そうでなければtrueです。
* [`exists2: predicate:('T1 -> 'T2 -> bool) -> list1:'T1 list -> list2:'T2 list -> bool`](https://fsharp.github.io/fsharp-core-docs/reference/fsharp-collections-listmodule.html#exists2)
  2つのコレクションの長さの小さい方まで、対応する要素に述語が適用されます。いずれかの適用がtrueを返すと全体の結果はtrue、そうでなければfalseです。
* [`fold2<'T1,'T2,'State> : folder:('State -> 'T1 -> 'T2 -> 'State) -> state:'State -> list1:'T1 list -> list2:'T2 list -> 'State`](https://fsharp.github.io/fsharp-core-docs/reference/fsharp-collections-listmodule.html#fold2)
  2つのコレクションの対応する要素に関数を適用し、アキュムレータ引数を計算全体に通します。
* [`foldBack2<'T1,'T2,'State> : folder:('T1 -> 'T2 -> 'State -> 'State) -> list1:'T1 list -> list2:'T2 list -> state:'State -> 'State`](https://fsharp.github.io/fsharp-core-docs/reference/fsharp-collections-listmodule.html#foldBack2)
  2つのコレクションの対応する要素に関数を適用し、アキュムレータ引数を計算全体に通します。
* [`compareWith: comparer:('T -> 'T -> int) -> list1:'T list -> list2:'T list -> int`](https://fsharp.github.io/fsharp-core-docs/reference/fsharp-collections-listmodule.html#compareWith)
  与えられた比較関数を使用して2つのコレクションを要素ごとに比較します。比較関数からの最初の非ゼロ結果を返します。コレクションの終わりに
  達した場合、最初のコレクションが短ければ-1を、2番目のコレクションが短ければ1を返します。
* [セクション26：コレクションの結合と分割](#26)の`append`、`concat`、`zip`も参照してください。

### 使用例

これらの関数は簡単に使えます。

```fsharp
let intList1 = [2;3;4]
let intList2 = [5;6;7]

List.map2 (fun i1 i2 -> i1 + i2) intList1 intList2 
//  [7; 9; 11]

// ヒント：||>演算子を使ってタプルを2つの引数としてパイプできます
(intList1,intList2) ||> List.map2 (fun i1 i2 -> i1 + i2) 
//  [7; 9; 11]

(intList1,intList2) ||> List.mapi2 (fun index i1 i2 -> index,i1 + i2) 
 // [(0, 7); (1, 9); (2, 11)]

(intList1,intList2) ||> List.iter2 (printf "i1=%i i2=%i; ") 
// i1=2 i2=5; i1=3 i2=6; i1=4 i2=7;

(intList1,intList2) ||> List.iteri2 (printf "index=%i i1=%i i2=%i; ") 
// index=0 i1=2 i2=5; index=1 i1=3 i2=6; index=2 i1=4 i2=7;

(intList1,intList2) ||> List.forall2 (fun i1 i2 -> i1 < i2)  
// true

(intList1,intList2) ||> List.exists2 (fun i1 i2 -> i1+10 > i2)  
// true

(intList1,intList2) ||> List.fold2 (fun state i1 i2 -> (10*state) + i1 + i2) 0 
// 801 = 234 + 567

List.foldBack2 (fun i1 i2 state -> i1 + i2 + (10*state)) intList1 intList2 0 
// 1197 = 432 + 765

(intList1,intList2) ||> List.compareWith (fun i1 i2 -> i1.CompareTo(i2))  
// -1

(intList1,intList2) ||> List.append
// [2; 3; 4; 5; 6; 7]

[intList1;intList2] |> List.concat
// [2; 3; 4; 5; 6; 7]

(intList1,intList2) ||> List.zip
// [(2, 5); (3, 6); (4, 7)]
```

### 必要な関数がない場合は？

`fold2`と`foldBack2`を使えば、簡単に独自の関数を作成できます。たとえば、`filter2`関数は次のように定義できます。

```fsharp
/// ペアの各要素に関数を適用
/// いずれかの結果が合格すれば、そのペアを結果に含める
let filterOr2 filterPredicate list1 list2 =
    let pass e = filterPredicate e 
    let folder e1 e2 state =    
        if (pass e1) || (pass e2) then
            (e1,e2)::state
        else
            state
    List.foldBack2 folder list1 list2 ([])

/// ペアの各要素に関数を適用
/// 両方の結果が合格した場合のみ、そのペアを結果に含める
let filterAnd2 filterPredicate list1 list2 =
    let pass e = filterPredicate e 
    let folder e1 e2 state =     
        if (pass e1) && (pass e2) then
            (e1,e2)::state
        else
            state
    List.foldBack2 folder list1 list2 []

// テスト
let startsWithA (s:string) = (s.[0] = 'A')
let strList1 = ["A1"; "A3"]
let strList2 = ["A2"; "B1"]

(strList1, strList2) ||> filterOr2 startsWithA 
// [("A1", "A2"); ("A3", "B1")]
(strList1, strList2) ||> filterAnd2 startsWithA 
// [("A1", "A2")]
```

[セクション25](#25)も参照してください。

<a id="24"></a>
<hr>
## 24. 3つのリストの操作

3つのリストがある場合、利用可能な組み込み関数は1つだけです。ただし、独自の3リスト関数を作成する方法については[セクション25](#25)を参照してください。

* [`map3: mapping:('T1 -> 'T2 -> 'T3 -> 'U) -> list1:'T1 list -> list2:'T2 list -> list3:'T3 list -> 'U list`](https://fsharp.github.io/fsharp-core-docs/reference/fsharp-collections-listmodule.html#map3)
  3つのコレクションの対応する要素に同時に与えられた関数を適用した結果を要素とする新しいコレクションを作成します。
* [セクション26：コレクションの結合と分割](#26)の`append`、`concat`、`zip3`も参照してください。
  
<a id="25"></a>
<hr>
## 25. 3つ以上のリストの操作

3つ以上のリストを操作する場合、組み込みの関数はありません。

これが頻繁に発生しない場合は、`zip2`や`zip3`を連続して使ってリストを1つのタプルにまとめ、それを`map`で処理することができます。

alternatively、アプリカティブを使用して関数を「ジップリスト」の世界に「持ち上げる」こともできます。

```fsharp
let (<*>) fList xList = 
    List.map2 (fun f x -> f x) fList xList 

let (<!>) = List.map

let addFourParams x y z w = 
    x + y + z + w

// "addFourParams"をリストの世界に持ち上げ、整数ではなくリストをパラメータとして渡す
addFourParams <!> [1;2;3] <*> [1;2;3] <*> [1;2;3] <*> [1;2;3] 
// 結果 = [4; 8; 12]
```

これが魔法のように見える場合は、[このシリーズ](../posts/elevated-world.md#lift)でこのコードが何をしているかの説明を参照してください。


<a id="26"></a>
<hr>
## 26. コレクションの結合と分割

最後に、コレクションを結合したり分割したりする関数がいくつかあります。

* [`append: list1:'T list -> list2:'T list -> 'T list`](https://fsharp.github.io/fsharp-core-docs/reference/fsharp-collections-listmodule.html#append)
  最初のコレクションの要素に続いて2番目のコレクションの要素を含む新しいコレクションを返します。
* `@`はリストの`append`の中置バージョンです。
* [`concat: lists:seq<'T list> -> 'T list`](https://fsharp.github.io/fsharp-core-docs/reference/fsharp-collections-listmodule.html#concat)
  与えられた関数をコレクションの対応する要素に同時に適用した結果を要素とする新しいコレクションを作成します。
* [`zip: list1:'T1 list -> list2:'T2 list -> ('T1 * 'T2) list`](https://fsharp.github.io/fsharp-core-docs/reference/fsharp-collections-listmodule.html#zip)
  2つのコレクションをペアのリストに結合します。2つのコレクションは同じ長さでなければなりません。
* [`zip3: list1:'T1 list -> list2:'T2 list -> list3:'T3 list -> ('T1 * 'T2 * 'T3) list`](https://fsharp.github.io/fsharp-core-docs/reference/fsharp-collections-listmodule.html#zip3)
  3つのコレクションをトリプルのリストに結合します。コレクションは同じ長さでなければなりません。
* （Seq以外）[`unzip: list:('T1 * 'T2) list -> ('T1 list * 'T2 list)`](https://fsharp.github.io/fsharp-core-docs/reference/fsharp-collections-listmodule.html#unzip)
  ペアのコレクションを2つのコレクションに分割します。
* （Seq以外）[`unzip3: list:('T1 * 'T2 * 'T3) list -> ('T1 list * 'T2 list * 'T3 list)`](https://fsharp.github.io/fsharp-core-docs/reference/fsharp-collections-listmodule.html#unzip3)
  トリプルのコレクションを3つのコレクションに分割します。


### 使用例

これらの関数は簡単に使えます。

```fsharp
List.append [1;2;3] [4;5;6]
// [1; 2; 3; 4; 5; 6]

[1;2;3] @ [4;5;6]
// [1; 2; 3; 4; 5; 6]

List.concat [ [1]; [2;3]; [4;5;6] ]
// [1; 2; 3; 4; 5; 6]

List.zip [1;2] [10;20] 
// [(1, 10); (2, 20)]

List.zip3 [1;2] [10;20] [100;200]
// [(1, 10, 100); (2, 20, 200)]

List.unzip [(1, 10); (2, 20)]
// ([1; 2], [10; 20])

List.unzip3 [(1, 10, 100); (2, 20, 200)]
// ([1; 2], [10; 20], [100; 200])
```

`zip`関数は長さが同じである必要があることに注意してください。

```fsharp
List.zip [1;2] [10] 
// ArgumentException: リストの長さが異なります。
```

<a id="27"></a>
<hr>
## 27. その他の配列専用関数

配列はミュータブル（変更可能）なので、リストやシーケンスには適用できない関数がいくつかあります。

* [セクション15](#15)の「その場でのソート」関数を参照してください。
* `Array.blit: source:'T[] -> sourceIndex:int -> target:'T[] -> targetIndex:int -> count:int -> unit`
   最初の配列から一定範囲の要素を読み取り、2番目の配列に書き込みます。
* `Array.copy: array:'T[] -> 'T[]`
   与えられた配列の要素を含む新しい配列を作成します。
* `Array.fill: target:'T[] -> targetIndex:int -> count:int -> value:'T -> unit`
   配列の指定範囲の要素を与えられた値で埋めます。
* `Array.set: array:'T[] -> index:int -> value:'T -> unit`
   配列の要素を設定します。
* これらに加えて、他のすべての[BCL配列関数](https://learn.microsoft.com/ja-jp/dotnet/api/system.array)も利用可能です。

ここでは例を挙げません。[F# コアライブラリのドキュメント](https://fsharp.github.io/fsharp-core-docs/reference/fsharp-collections-arraymodule.html)を参照してください。

<a id="28"></a>
<hr>

## 28. 破棄可能なリソースを含むシーケンスの使用

`List.ofSeq`のような変換関数の重要な用途の1つは、遅延評価されるシーケンス（`seq`）を完全に評価されたコレクション（`list`など）に変換することです。これは特に
ファイルハンドルやデータベース接続などの破棄可能なリソースが関係している場合に重要です。リソースが利用可能な間にシーケンスをリストに変換しないと、
後でリソースが破棄された後に要素にアクセスしようとするとエラーが発生する可能性があります。

これは長めの例になるので、まずデータベースとUIをエミュレートするヘルパー関数から始めましょう。

```fsharp
// 破棄可能なデータベース接続
let DbConnection() = 
    printfn "接続を開いています"
    { new System.IDisposable with
        member this.Dispose() =
            printfn "接続を破棄しています" }

// データベースからいくつかのレコードを読み込む
let readNCustomersFromDb dbConnection n =
    let makeCustomer i = 
        sprintf "顧客 %i" i

    seq {
        for i = 1 to n do
            let customer = makeCustomer i
            printfn "DBから%sを読み込んでいます" customer 
            yield customer 
        } 

// UIにいくつかのレコードを表示する
let showCustomersinUI customers = 
    customers |> Seq.iter (printfn "UIで%sを表示しています")
```

素朴な実装では、接続が閉じられた*後に*シーケンスが評価されてしまいます。

```fsharp
let readCustomersFromDb() =
    use dbConnection = DbConnection()
    let results = readNCustomersFromDb dbConnection 2
    results

let customers = readCustomersFromDb()
customers |> showCustomersinUI
```

出力は以下のようになります。接続が閉じられた後にシーケンスが評価されていることがわかります。

```text
接続を開いています
接続を破棄しています
DBから顧客 1を読み込んでいます  // エラー！接続が閉じられています！
UIで顧客 1を表示しています
DBから顧客 2を読み込んでいます
UIで顧客 2を表示しています
```

より良い実装では、接続が開いている間にシーケンスをリストに変換し、シーケンスを即座に評価します。

```fsharp
let readCustomersFromDb() =
    use dbConnection = DbConnection()
    let results = readNCustomersFromDb dbConnection 2
    results |> List.ofSeq
    // 接続が開いている間にリストに変換

let customers = readCustomersFromDb()
customers |> showCustomersinUI
```

結果はずっと良くなります。接続が破棄される前にすべてのレコードが読み込まれます。

```text
接続を開いています
DBから顧客 1を読み込んでいます
DBから顧客 2を読み込んでいます
接続を破棄しています
UIで顧客 1を表示しています
UIで顧客 2を表示しています
```

3つ目の選択肢として、破棄可能なリソースをシーケンス自体に埋め込む方法があります。

```fsharp
let readCustomersFromDb() =
    seq {
        // 破棄可能なリソースをシーケンス内に配置
        use dbConnection = DbConnection()
        yield! readNCustomersFromDb dbConnection 2
        } 

let customers = readCustomersFromDb()
customers |> showCustomersinUI
```

出力を見ると、接続が開いている間にUI表示も行われていることがわかります。

```text
接続を開いています
DBから顧客 1を読み込んでいます
UIで顧客 1を表示しています
DBから顧客 2を読み込んでいます
UIで顧客 2を表示しています
接続を破棄しています
```

これは（接続が開いている時間が長くなり）悪いことかもしれませんし、（メモリ使用量が最小限になり）良いことかもしれません。状況によって異なります。

<a id="29"></a>
<hr>

## 29. 冒険の終わり

最後まで到達しましたね - お疲れさまでした！実際のところ、あまり冒険らしくはありませんでしたね。ドラゴンも何もいませんでした。それでも、役に立つ内容だったことを願っています。

