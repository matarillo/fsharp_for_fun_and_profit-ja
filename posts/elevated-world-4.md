---
layout: post
title: "traverseとsequenceを理解する"
description: "リストと高次の値を混ぜる"
categories: ["パターン"]
seriesId: "Map, Bind, Applyなにもわからない"
seriesOrder: 4
image: "/assets/img/vgfp_sequence_stack.png"
---

この投稿は連載記事の一部です。
[最初の2つの投稿](../posts/elevated-world.md)では、ジェネリックデータ型を扱うためのコア関数について説明しました。`map`、`bind`などです。
[前回の投稿](../posts/elevated-world-3.md)では、「アプリカティブ」と「モナディック」スタイルについて議論し、値と関数を互いに一貫性のある形で高次の世界に持ち上げる方法を説明しました。

今回の投稿では、よくある問題を見ていきます。高次の値のリストを扱う方法です。

## シリーズの内容

このシリーズで言及される様々な関数へのショートカットリストです。

* **パート1：高次の世界への持ち上げ**
  * [`map`関数](../posts/elevated-world.md#map)
  * [`return`関数](../posts/elevated-world.md#return)
  * [`apply`関数](../posts/elevated-world.md#apply)
  * [`liftN`関数ファミリー](../posts/elevated-world.md#lift)
  * [`zip`関数とZipList世界](../posts/elevated-world.md#zip)
* **パート2：世界をまたぐ関数の合成方法**    
  * [`bind`関数](../posts/elevated-world-2.md#bind)
  * [リストはモナドではない。オプションもモナドではない。](../posts/elevated-world-2.md#not-a-monad)
* **パート3：コア関数の実際的な使い方**  
  * [独立データと依存データ](../posts/elevated-world-3.md#dependent)
  * [例：アプリカティブスタイルとモナディックスタイルを使ったバリデーション](../posts/elevated-world-3.md#validation)
  * [一貫した世界への持ち上げ](../posts/elevated-world-3.md#consistent)
  * [Kleisli世界](../posts/elevated-world-3.md#kleisli)
* **パート4：リストと高次の値の混合**    
  * [リストと高次の値の混合](../posts/elevated-world-4.md#mixing)
  * [`traverse`/`MapM`関数](../posts/elevated-world-4.md#traverse)
  * [`sequence`関数](../posts/elevated-world-4.md#sequence)
  * [アドホックな実装のレシピとしての「シーケンス」](../posts/elevated-world-4.md#adhoc)
  * [読みやすさ vs パフォーマンス](../posts/elevated-world-4.md#readability)
  * [ねえ、`filter`はどこ？](../posts/elevated-world-4.md#filter)
* **パート5：すべてのテクニックを使用する実世界の例**    
  * [例：Webサイトのリストのダウンロードと処理](../posts/elevated-world-5.md#asynclist)
  * [2つの世界を1つとして扱う](../posts/elevated-world-5.md#asyncresult)
* **パート6：独自の高次の世界を設計する** 
  * [独自の高次の世界を設計する](../posts/elevated-world-6.md#part6)
  * [失敗のフィルタリング](../posts/elevated-world-6.md#filtering)
  * [Readerモナド](../posts/elevated-world-6.md#readermonad)
* **パート7：まとめ** 
  * [言及した演算子のリスト](../posts/elevated-world-7.md#operators)
  * [補足文献](../posts/elevated-world-7.md#further-reading)

<a id="mixing"></a>
<hr>

## パート4：リストと高次の値の混合

よくある問題は、高次の値のリストやコレクションをどう扱うかです。

いくつかの例を見てみましょう。

* **例1：** `string -> int option`というシグネチャを持つ`parseInt`関数があり、文字列のリストがあるとします。すべての文字列を一度に解析したいとします。
`map`を使えば文字列のリストをオプションのリストに変換できます。しかし、必要なのは「オプションのリスト」ではなく、「リストのオプション」です。
つまり、解析された整数のリストを、失敗した場合にオプションでラップしたものです。

* **例2：** `CustomerId -> Result<Customer>`というシグネチャを持つ`readCustomerFromDb`関数があるとします。
この関数は、レコードが見つかって返された場合は`Success`を、そうでない場合は`Failure`を返します。そして、`CustomerId`のリストがあり、すべての顧客を一度に読み取りたいとします。
`map`を使えばIDのリストを結果のリストに変換できます。しかし、必要なのは`Result<Customer>`のリストではなく、`Customer list`を含む`Result`です。
エラーが発生した場合、`Result`は`Failure`ケースになってほしいのです。

* **例3：** `Uri -> Async<string>`というシグネチャを持つ`fetchWebPage`関数があるとします。この関数は、要求に応じてページの内容をダウンロードするタスクを返します。
そして、`Uri`のリストがあり、すべてのページを一度にフェッチしたいとします。
`map`を使えば`Uri`のリストを`Async`のリストに変換できます。しかし、必要なのは`Async`のリストではありません。
文字列のリストを含む単一の`Async`が求められています。

### オプション生成関数のマッピング

まず最初のケースの解決策を考え出し、それを他のケースに一般化できるかどうか見てみましょう。

一般的な解決方法は以下の通りです。

* まず、`map`を使って`string`のリストを`Option<int>`のリストに変換します。
* 次に、`Option<int>`のリストを`Option<int list>`に変換する関数を作ります。

しかし、これにはリストを2回通過する必要があります。1回の通過でできないでしょうか？

できます！リストの構築には「cons」関数を使います。F#では`::`演算子がこれに相当します。cons関数は、リストの先頭に新しい要素を追加する働きをします。
cons操作を`Option`の世界に持ち上げると、`Option.apply`を使って高次の`cons`で先頭の`Option`を末尾の`Option`に結合できます。

```fsharp
let (<*>) = Option.apply
let retn = Some

let rec mapOption f list =
    let cons head tail = head :: tail
    match list with
    | [] -> 
        retn []
    | head::tail ->
        retn cons <*> (f head) <*> (mapOption f tail)
```

*注意：`::`は関数ではないため、このコンテキストでは使用できません。また、`List.Cons`はタプルを引数に取るため、ここでは適していません。そのため、`cons`関数を明示的に定義しました。*

実装を図で表すと次のようになります。

![](../assets/img/vgfp_mapOption.png)

この動作の仕組みがわからない場合は、このシリーズの最初の投稿の `apply` に関するセクションを読んでください。

また、実装で `Some` を使用するのではなく、明示的に `retn` を定義して使用していることに注目してください。次のセクションでその理由がわかります。

では、テストしてみましょう！

```fsharp
let parseInt str =
    match (System.Int32.TryParse str) with
    | true,i -> Some i
    | false,_ -> None
// string -> int option
    
let good = ["1";"2";"3"] |> mapOption parseInt
// Some [1; 2; 3]

let bad = ["1";"x";"y"] |> mapOption parseInt
// None
```

まず、`string -> int option` 型の `parseInt` を定義します。この関数は既存の .NET ライブラリを利用しています。

`mapOption` を使って適切な値のリストに対して実行すると、オプションの中にリストがある `Some [1; 2; 3]` が得られます。これが期待通りの結果です。

そして、一部の値が不正なリストを使用すると、結果全体に対して `None` が得られます。

### Result生成関数のマッピング

これを繰り返しますが、今度は以前のバリデーション例で使用した `Result` 型を使います。

`mapResult` 関数は次のようになります。

```fsharp
let (<*>) = Result.apply
let retn = Success

let rec mapResult f list =
    let cons head tail = head :: tail
    match list with
    | [] -> 
        retn []
    | head::tail ->
        retn cons <*> (f head) <*> (mapResult f tail)
```

ここでも `Success` を使用するのではなく、明示的に `retn` を定義しています。そのおかげで、`mapResult` と `mapOption` のコード本体が全く同じになっています！

では、`parseInt` を `Option` ではなく `Result` を返すように変更しましょう。

```fsharp
let parseInt str =
    match (System.Int32.TryParse str) with
    | true,i -> Success i
    | false,_ -> Failure [str + " is not an int"]
```

次に、テストを再度実行します。今回は失敗した場合、より詳細な情報が得られるようになっています。

```fsharp
let good = ["1";"2";"3"] |> mapResult parseInt
// Success [1; 2; 3]

let bad = ["1";"x";"y"] |> mapResult parseInt
// Failure ["x is not an int"; "y is not an int"]
```

### 汎用的なmapXXX関数は作成できるか？

`mapOption`と`mapResult`の実装は全く同じコードです。
唯一の違いは、異なる`retn`と`<*>`関数（それぞれOptionとResultに対するもの）を使用している点です。

このことから、次のような疑問が生じます。
高次の型ごとに`mapResult`、`mapOption`などの特定の実装を作る代わりに、すべての高次型で動作する、完全に汎用的なバージョンの`mapXXX`を作成できないでしょうか？

すぐに思いつくアプローチは、これら2つの関数を追加のパラメータとして渡すことです。以下のようになります。

```fsharp
let rec mapE (retn,ap) f list =
    let cons head tail = head :: tail
    let (<*>) = ap 

    match list with
    | [] -> 
        retn []
    | head::tail ->
        (retn cons) <*> (f head) <*> (mapE retn ap f tail)
```

しかし、これにはいくつかの問題があります。まず、このコードはF#ではコンパイルできません！
さらに、仮にコンパイルできたとしても、同じ2つのパラメータがどこでも確実に渡されるようにしたいところです。

この問題に対処するため、次のような方法が考えられます。2つのパラメータを含むレコード構造を作成し、高次の世界の型ごとに1つのインスタンスを作成します。

```fsharp
type Applicative<'a,'b> = {
    retn: 'a -> E<'a>
    apply: E<'a->'b> -> E<'a> -> E<'b>
    }            

// Optionに適用する関数
let applOption = {retn = Option.Some; apply=Option.apply}

// Resultに適用する関数
let applResult = {retn = Result.Success; apply=Result.apply}
```

`Applicative`レコードのインスタンス（たとえば`appl`）を、汎用的な`mapE`関数への追加パラメータとして使用します。

```fsharp
let rec mapE appl f list =
    let cons head tail = head :: tail
    let (<*>) = appl.apply
    let retn = appl.retn

    match list with
    | [] -> 
        retn []
    | head::tail ->
        (retn cons) <*> (f head) <*> (mapE retn ap f tail)
```

使用時には、使用したい特定のapplicativeインスタンスを渡します。

```fsharp
// Option特有のバージョンを構築
let mapOption = mapE applOption    

// 使用例
let good = ["1";"2";"3"] |> mapOption parseInt        
```

残念ながら、上記のアプローチも、少なくともF#では機能しません。定義した`Applicative`型はコンパイルできないのです。これは、F#が「高カインド型」をサポートしていないためです。
つまり、`Applicative`型をジェネリック型でパラメータ化することができず、具体的な型でしかパラメータ化できません。

「高カインド型」をサポートするHaskellのような言語では、ここで定義した`Applicative`型は「型クラス」に似ています。
さらに、型クラスを使用すると、関数を明示的に渡す必要がなくなります。コンパイラが代わりに処理してくれます。

実は、F#でも静的型制約を使用して同様の効果を得る巧妙（そしてハッキー）な方法があります。
ここでは詳しく説明しませんが、[FSharpxライブラリ](https://github.com/fsprojects/FSharpx.Extras/blob/master/src/FSharpx.Extras/ComputationExpressions/Monad.fs)でその使用例を見ることができます。

このような抽象化の代替案は、扱いたい高次の世界ごとに`mapXXX`関数を作成することです。
`mapOption`、`mapResult`、`mapAsync`などです。

個人的には、この直接的なアプローチでも十分実用的だと考えています。実際、日常的に扱う高次の世界はそれほど多くありません。抽象化は失われますが、明示性が得られます。
これはチームで作業する際にしばしば有用です。

では、これらの`mapXXX`関数、別名`traverse`を見ていきましょう。

<a id="traverse"></a>
<hr>

## `traverse` / `mapM` 関数

**一般的な名前**: `mapM`, `traverse`, `for`

**一般的な演算子**: なし

**機能**:  世界をまたぐ関数を、コレクションで動作するように変換します

**シグネチャ**:  `(a->E<b>) -> a list -> E<b list>` （またはlistが他のコレクション型に置き換わったバリエーション）

### 説明

前述のように、XXXがアプリカティブな世界（`apply`と`return`を持つ世界）を表す`mapXXX`関数のセットを定義できます。
これらの`mapXXX`関数は、世界をまたぐ関数をコレクションで動作するように変換します。

![](../assets/img/vgfp_traverse.png)

また、先ほど述べたように、言語が型クラスをサポートしている場合、単一の実装（`mapM`または`traverse`と呼ばれる）で済みます。
ここからは、この一般的な概念を`traverse`と呼ぶことにします。これが`map`とは異なることを明確にするためです。

### Map vs. Traverse 

`map`と`traverse`の違いを理解するのは難しいかもしれません。そこで、図を使って説明してみましょう。

まず、「高次の」世界が「通常の」世界の上に位置するというアナロジーを使用して、視覚的な表記法を導入します。

これらの高次の世界のほとんど（実際にはほぼすべて！）には`apply`と`return`関数があります。これらを「アプリカティブな世界」と呼びます。
例として`Option`、`Result`、`Async`などがあります。

また、高次の世界の一部には`traverse`関数があります。`traverse`関数を持つ世界を「走査可能（Traversable）な世界」と呼びます。典型的な例として`List`を使うことにします。

走査可能な世界が上にある場合、`List<a>`のような型が生成され、
アプリカティブな世界が上にある場合、`Result<a>`のような型が生成されます。

![](../assets/img/vgfp_mstack_1.png)

*重要：ここでは一貫性のために`List<_>`という構文を「リストの世界」を表すために使用しています。これは.NETのListクラスとは異なります！
F#では、これは不変の`list`型で実装されます。*

しかし、これからは同じ「スタック」の中で両方の種類の高次の世界を扱うことになります。

走査可能な世界をアプリカティブな世界の上に積み重ねると、`List<Result<a>>`のような型が生成されます。
あるいは、アプリカティブな世界を走査可能な世界の上に積み重ねると、`Result<List<a>>`のような型が生成されます。

![](../assets/img/vgfp_mstack_2.png)

この表記法を用いて、様々な種類の関数がどのように表現されるか確認していきましょう。

まず、`a -> Result<b>`のような単純な世界をまたぐ関数から始めましょう。ここで、目標の世界はアプリカティブな世界です。
図では、入力は通常の世界（左側）で、出力（右側）は通常の世界の上に積み重ねられたアプリカティブな世界です。

![](../assets/img/vgfp_traverse_cross.png)

次に、通常の`a`値のリストがあり、`a -> Result<b>`のような関数を使用して各`a`値を変換するために`map`を使用すると、
結果もリストになりますが、内容は`a`値の代わりに`Result<b>`値になります。

![](../assets/img/vgfp_traverse_map.png)

`traverse`の場合、効果は全く異なります。
`a`値のリストをその関数で変換するために`traverse`を使用すると、
出力はリストではなく`Result`になります。そして、`Result`の内容は`List<b>`になります。

![](../assets/img/vgfp_traverse_traverse.png)

つまり、`traverse`では、`List`は通常の世界に付属したままで、アプリカティブな世界（`Result`など）が上部に追加されます。

これらの説明は非常に抽象的に聞こえるかもしれませんが、実際には非常に有用な技法です。この使用例については後ほど見ていきます。

### `traverse`のアプリカティブバージョンとモナディックバージョン

`traverse`は、アプリカティブスタイルまたはモナディックスタイルで実装できることがわかっています。そのため、しばしば2つの別々の実装から選択することになります。
アプリカティブバージョンは通常`A`で終わり、モナディックバージョンは`M`で終わります。これは覚えやすいですね！

これがどのように機能するか、お馴染みの`Result`型を使って見てみましょう。

まず、アプリカティブアプローチとモナディックアプローチの両方を使用して`traverseResult`を実装します。

```fsharp
module List =

    /// Result生成関数をリストにマップして新しいResultを取得します
    /// アプリカティブスタイルを使用
    /// ('a -> Result<'b>) -> 'a list -> Result<'b list>
    let rec traverseResultA f list =

        // アプリカティブ関数を定義
        let (<*>) = Result.apply
        let retn = Result.Success

        // "cons"関数を定義
        let cons head tail = head :: tail

        // リストをループ処理
        match list with
        | [] -> 
            // 空の場合、[]をResultに持ち上げる
            retn []
        | head::tail ->
            // そうでない場合、fを使用してheadをResultに持ち上げ
            // 残りのリストの持ち上げられたバージョンとconsする
            retn cons <*> (f head) <*> (traverseResultA f tail)


    /// Result生成関数をリストにマップして新しいResultを取得します
    /// モナディックスタイルを使用
    /// ('a -> Result<'b>) -> 'a list -> Result<'b list>
    let rec traverseResultM f list =

        // モナディック関数を定義
        let (>>=) x f = Result.bind f x
        let retn = Result.Success

        // "cons"関数を定義
        let cons head tail = head :: tail

        // リストをループ処理
        match list with
        | [] -> 
            // 空の場合、[]をResultに持ち上げる
            retn []
        | head::tail ->
            // そうでない場合、fを使用してheadをResultに持ち上げ
            // 次にtraverseを使用してtailをResultに持ち上げ
            // そしてheadとtailをconsして返す
            f head                 >>= (fun h -> 
            traverseResultM f tail >>= (fun t ->
            retn (cons h t) ))
```

アプリカティブバージョンは、先ほど使用した実装と同じです。

モナディックバージョンは、最初の要素に関数`f`を適用し、それを`bind`に渡します。
モナディックスタイルの常として、結果が不正ならリストの残りの部分はスキップされます。

一方、結果が適切なら、リストの次の要素が処理され、以降も同様です。その後、結果が再びconsで結合されます。

*注意：これらの実装はデモンストレーション用のみです！これらの実装は末尾再帰ではないため、大きなリストでは失敗します！*

では、2つの関数をテストして、どのように異なるか見てみましょう。まず、`parseInt`関数が必要です：

```fsharp
/// 整数を解析してResultを返します
/// string -> Result<int>
let parseInt str =
    match (System.Int32.TryParse str) with
    | true,i -> Result.Success i
    | false,_ -> Result.Failure [str + " is not an int"]
```

適切な値（すべて解析可能）のリストを渡すと、両方の実装で結果は同じになります。

```fsharp
// リストにラップされた文字列を渡す
// （アプリカティブバージョン）
let goodA = ["1"; "2"; "3"] |> List.traverseResultA parseInt
// 整数のリストを含むResultが返される
// Success [1; 2; 3]

// リストにラップされた文字列を渡す
// （モナディックバージョン）
let goodM = ["1"; "2"; "3"] |> List.traverseResultM parseInt
// 整数のリストを含むResultが返される
// Success [1; 2; 3]
```

しかし、不正な値を含むリストを渡すと、結果は異なります。

```fsharp
// リストにラップされた文字列を渡す
// （アプリカティブバージョン）
let badA = ["1"; "x"; "y"] |> List.traverseResultA parseInt
// 整数のリストを含むResultが返される
// Failure ["x is not an int"; "y is not an int"]

// リストにラップされた文字列を渡す
// （モナディックバージョン）
let badM = ["1"; "x"; "y"] |> List.traverseResultM parseInt
// 整数のリストを含むResultが返される
// Failure ["x is not an int"]
```

アプリカティブバージョンはすべてのエラーを返しますが、モナディックバージョンは最初のエラーのみを返します。

### `fold`を使用した`traverse`の実装

前述のとおり、「ゼロから」の実装は末尾再帰ではなく、大きなリストでは失敗します。
もちろん、コードをより複雑にすることでこの問題を解決できます。

一方、コレクション型に`List`のような「右畳み込み」関数がある場合、それを使用して実装をより簡単、高速、そして安全にできます。

個人的には、できるだけ`fold`やその関連関数を活用するようにしています。そうすることで、末尾再帰を正しく実装する心配をする必要がなくなります！

では、`List.foldBack`を使用して`traverseResult`を再実装してみましょう。コードをできるだけ似た状態に保ちつつ、
再帰関数を作成する代わりに、リストのループ処理を畳み込み関数に委ねています。


```fsharp
/// Result生成関数をリストにマップして新しいResultを取得します
/// アプリカティブスタイルを使用
/// ('a -> Result<'b>) -> 'a list -> Result<'b list>
let traverseResultA f list =

    // アプリカティブ関数を定義
    let (<*>) = Result.apply
    let retn = Result.Success

    // "cons"関数を定義
    let cons head tail = head :: tail

    // リストを右から畳み込む
    let initState = retn []
    let folder head tail = 
        retn cons <*> (f head) <*> tail

    List.foldBack folder list initState 

/// Result生成関数をリストにマップして新しいResultを取得
/// モナディックスタイルを使用
/// ('a -> Result<'b>) -> 'a list -> Result<'b list>
let traverseResultM f list =

    // モナディック関数を定義
    let (>>=) x f = Result.bind f x
    let retn = Result.Success

    // "cons"関数を定義
    let cons head tail = head :: tail

    // リストを右から畳み込む
    let initState = retn []
    let folder head tail = 
        f head >>= (fun h -> 
        tail >>= (fun t ->
        retn (cons h t) ))

    List.foldBack folder list initState 
```

このアプローチはすべてのコレクションクラスで機能するわけではないことに注意してください。一部の型には右畳み込みがないため、
`traverse`は異なる方法で実装する必要があります。

### リスト以外の型についてはどうか？

これらの例ではすべてコレクション型として`list`型を使用しています。他の型に対しても`traverse`を実装できるでしょうか？

はい、できます。たとえば、`Option`は1要素のリストと考えることができ、同じ手法を使用できます。

例として、`Option`に対する`traverseResultA`の実装を見てみましょう。

```fsharp
module Option = 

    /// Result生成関数をOptionにマップして新しいResultを取得します
    /// ('a -> Result<'b>) -> 'a option -> Result<'b option>
    let traverseResultA f opt =

        // アプリカティブ関数を定義
        let (<*>) = Result.apply
        let retn = Result.Success

        // オプションをループ処理
        match opt with
        | None -> 
            // 空の場合、NoneをResultに持ち上げる
            retn None
        | Some x -> 
            // 値をResultに持ち上げる
            (retn Some) <*> (f x) 
```

これで、文字列を`Option`でラップし、それに`parseInt`を適用できます。`Option`の`Result`ではなく、スタックを反転させて`Result`の`Option`を取得します。

```fsharp
// Optionでラップされた文字列を渡す
let good = Some "1" |> Option.traverseResultA parseInt
// Optionを含むResultが返される
// Success (Some 1)
```

解析できない文字列を渡すと、失敗になります。

```fsharp
// Optionでラップされた文字列を渡す
let bad = Some "x" |> Option.traverseResultA parseInt
// Optionを含むResultが返される
// Failure ["x is not an int"]
```

`None`を渡すと、`None`を含む`Success`が返されます！

```fsharp
// Optionでラップされた文字列を渡す
let goodNone = None |> Option.traverseResultA parseInt
// Optionを含むResultが返される
// Success (None)
```

この最後の結果は一見驚くかもしれませんが、こう考えてください。解析は失敗していないので、`Failure`は全くありませんでした。

### Traversable（走査可能）

`mapXXX`や`traverseXXX`のような関数を実装できる型は*Traversable*と呼ばれます。たとえば、コレクション型はTraversableですし、他にもいくつかあります。

前述のように、型クラスを持つ言語では、Traversable型は`traverse`の実装を1つだけ持てば十分です。
しかし、型クラスのない言語では、Traversable型は高次の型ごとに1つの実装が必要になります。

また、これまで作成してきた汎用関数とは異なり、`traverse`を実装するには、（コレクション内の）操作対象の型が適切な`apply`と`return`関数を持っている必要があることに注意してください。
つまり、内部の型がApplicativeでなければなりません。

### 正しい`traverse`実装の性質

常のことですが、`traverse`の正しい実装は、どの高次の世界で作業していても成り立つべきいくつかの性質を持っています。

これらは「[Traversable則](https://hackage.haskell.org/package/base-4.8.1.0/docs/Data-Traversable.html)」と呼ばれます。
**Traversable**はジェネリックなデータ型コンストラクタである`E<T>` と、
これらの法則に従う関数のセット（`traverse`または`traverseXXX`）として定義されます。

これらの法則は以前のものと似ています。たとえば、恒等関数が正しくマップされること、合成が保持されること、などです。

<a id="sequence"></a>
<hr>

## `sequence`関数

**一般的な名前**: `sequence`

**一般的な演算子**: なし

**機能**:  高次の値のリストを、リストを含む高次の値に変換します

**シグネチャ**:  `E<a> list -> E<a list>`  （またはリストが他のコレクション型に置き換わったバリエーション）

### 説明

前述のように、`traverse`関数を使用して、アプリカティブ型（`Result`など）を生成する関数がある場合に`map`の代替として使用できます。

しかし、`List<Result>`を与えられて、それを`Result<List>`に変更する必要がある場合はどうでしょうか。つまり、スタック内の世界の順序を入れ替える必要がある場合です。

![](../assets/img/vgfp_sequence_stack.png)

ここで`sequence`が役立ちます。まさにこれが`sequence`の機能だからです！ `sequence`関数は「レイヤーを入れ替え」ます。

入れ替えの順序は固定されています。

* Traversable世界は上位から*下に*入れ替わります。
* Applicative世界は下位から*上に*入れ替わります。

`traverse`の実装がすでにある場合、`sequence`はそこから簡単に導出できることに注意してください。
実際、`sequence`を`traverse`に`id`関数を組み込んだものと考えることができます。

### `sequence`のアプリカティブバージョンとモナディックバージョン

`traverse`と同様に、`sequence`にもアプリカティブバージョンとモナディックバージョンがあり得ます。

* アプリカティブなものには`sequenceA`
* モナディックなもの（または単に`sequence`）には`sequenceM`

### 簡単な例

`Result`用の`sequence`実装を実装してテストしてみましょう。

```fsharp
module List =   

    /// "list<Result>"を"Result<list>"に変換し
    /// applyを使用して結果を収集します
    /// Result<'a> list -> Result<'a list>
    let sequenceResultA x = traverseResultA id x

    /// "list<Result>"を"Result<list>"に変換し
    /// bindを使用して結果を収集します
    /// Result<'a> list -> Result<'a list>
    let sequenceResultM x = traverseResultM id x
```

簡単すぎましたね！では、テストしてみましょう。まずはアプリカティブバージョンから。

```fsharp
let goodSequenceA = 
    ["1"; "2"; "3"] 
    |> List.map parseInt
    |> List.sequenceResultA
// Success [1; 2; 3]

let badSequenceA = 
    ["1"; "x"; "y"] 
    |> List.map parseInt
    |> List.sequenceResultA
// Failure ["x is not an int"; "y is not an int"]
```

次はモナディックバージョンです。

```fsharp
let goodSequenceM = 
    ["1"; "2"; "3"] 
    |> List.map parseInt
    |> List.sequenceResultM
// Success [1; 2; 3]

let badSequenceM = 
    ["1"; "x"; "y"] 
    |> List.map parseInt
    |> List.sequenceResultM
// Failure ["x is not an int"]
```

以前と同様に、`Result<List>`が返されます。また、以前と同様に、モナディックバージョンは最初のエラーで停止し、アプリカティブバージョンはすべてのエラーを蓄積します。


<a id="adhoc"></a>
<hr>

## アドホックな実装のレシピとしての「シーケンス」

先ほど説明したように、Applicativeのような型クラスがサポートされている言語では、`traverse`と`sequence`の実装は1回で済みます。
F#のような言語は高カインド型をサポートしていないので、走査したい型ごとに実装を作成する必要があります。

しかし、F#のような言語において、`traverse`と`sequence`の概念は関係ない、抽象的すぎて役に立たない、ということでしょうか？そうは思いません。

これらをライブラリ関数として考えるのではなく、*レシピ* 、
つまり、特定の問題を解決するときに機械的に従うべき指示集として考えるのが有用だと思います。

多くの場合、問題はコンテキストに固有であり、ライブラリ関数を作成する必要はありません。必要に応じてヘルパー関数を作成すればいいからです。

例を挙げて説明しましょう。タプルを含むオプションのリストが与えられたとします。このようなものです。

```fsharp
let tuples = [Some (1,2); Some (3,4); None; Some (7,8);]
// List<Option<Tuple<int>>>
```

このデータは`List<Option<Tuple<int>>>`の形式です。そして、何らかの理由で、これを各リストがオプションを含む*タプル*に変換する必要があるとします。
次のようなものです。

```fsharp
let desiredOutput = [Some 1; Some 3; None; Some 7],[Some 2; Some 4; None; Some 8]
// Tuple<List<Option<int>>>
```

望ましい結果は`Tuple<List<Option<int>>>`の形式です。

では、この変換を行う関数をどう書くか、考えてみてください。急いで！

もちろん、何らかの解決策は思いつくでしょう。ただし、それを正しく行うには少し考えとテストが必要かもしれません。

一方で、この作業が単に世界のスタックを別のスタックに変換することだと認識すれば、ほとんど考えずに*機械的に*関数を作成できます。

![](../assets/img/vgfp_tuple_sequence-1.png)

### 解決策の設計

解決策を設計するには、どの世界が上に移動し、どの世界が下に移動するかに注意を払う必要があります。

* タプルの世界は最終的に一番上にある必要があるので、「上に」入れ替える必要があります。これは、「アプリカティブ」の役割を果たすことを意味します。
* オプションとリストの世界は「下に」入れ替える必要があります。これは、両方が「走査可能」の役割を果たすことを意味します。

この変換を行うために、2つのヘルパー関数が必要になります。

* `optionSequenceTuple`はオプションを下に移動し、タプルを上に移動します。

![](../assets/img/vgfp_tuple_sequence-2.png)

* `listSequenceTuple`はリストを下に移動し、タプルを上に移動します。

![](../assets/img/vgfp_tuple_sequence-3.png)

これらのヘルパー関数をライブラリに入れる必要はありますか？ いいえ。
また必要になる可能性は低く、たまに必要になっても、依存関係を避けるためにゼロから書く方が良いでしょう。

一方で、前に実装した`List.sequenceResult`関数を考えてみましょう。この関数は`List<Result<a>>`を`Result<List<a>>`に変換します。
これは頻繁に使用するので、ライブラリ化する価値があります。

### 解決策の実装

解決策の構造が分かれば、機械的にコーディングを進められます。

まず、タプルがアプリカティブの役割を果たすように、`apply`と`return`関数を定義します。

```fsharp
let tupleReturn x = (x, x)
let tupleApply (f,g) (x,y) = (f x, g y)
```

次に、以前と全く同じ右畳み込みのテンプレートを使用して、`List`を走査可能、タプルをアプリカティブとして`listSequenceTuple`を定義します。

```fsharp
let listSequenceTuple list =
    // アプリカティブ関数を定義
    let (<*>) = tupleApply 
    let retn = tupleReturn 

    // "cons"関数を定義
    let cons head tail = head :: tail

    // リストを右から畳み込む
    let initState = retn []
    let folder head tail = retn cons <*> head <*> tail

    List.foldBack folder list initState 
```

ここでは特に考える必要はありません。単にテンプレートに従うだけです。

すぐにテストしてみましょう。

```fsharp
[ (1,2); (3,4)] |> listSequenceTuple    
// 結果 => ([1; 3], [2; 4])
```

そして、予想通り2つのリストを含むタプルが得られます。

同様に、同じ右畳み込みのテンプレートを再び使用して`optionSequenceTuple`を定義します。
今回は`Option`が走査可能で、タプルは依然としてアプリカティブです。

```fsharp
let optionSequenceTuple opt =
    // アプリカティブ関数を定義
    let (<*>) = tupleApply 
    let retn = tupleReturn 

    // オプションを右から畳み込む
    let initState = retn None
    let folder x _ = (retn Some) <*> x 

    Option.foldBack folder opt initState 
```

これもテストしてみましょう。

```fsharp
Some (1,2) |> optionSequenceTuple
// 結果 => (Some 1, Some 2)
```

そして、予想通り2つのオプションを含むタプルが得られます。

最後に、すべての部品を組み合わせます。ここでも特に考える必要はありません。

```fsharp
let convert input =
    input
    
    // List<Option<Tuple<int>>>からList<Tuple<Option<int>>>へ
    |> List.map optionSequenceTuple
    
    // List<Tuple<Option<int>>>からTuple<List<Option<int>>>へ
    |> listSequenceTuple
```

そして、使ってみれば、期待通りのものが得られます。

```fsharp
let output = convert tuples
// ( [Some 1; Some 3; None; Some 7], [Some 2; Some 4; None; Some 8] )

output = desiredOutput |> printfn "出力は正しいですか？ %b"
// 出力は正しいですか？ true
```

確かに、この解決策は、再利用可能な関数を1つ用意するよりも手間がかかりますが、機械的なので、コーディングにはほんの数分しかかかりません。
そして、自分で解決策を考え出すよりもはるかに簡単です。

*もっと知りたいですか？実際の問題で`sequence`を使う例については、[この投稿](../posts/recursive-types-and-folds-3b.md#json-with-error-handling)を参照してください。*

<a id="readability"></a>
<hr>

## 読みやすさ vs パフォーマンス

この投稿の冒頭で、私たち関数型プログラマーの傾向として、まず`map`を適用し、その後で質問する傾向があると述べました。

つまり、`parseInt`のような`Result`を生成する関数があれば、まず結果を収集し、その後でそれらをどう扱うかを考えるでしょう。
そのため、コードは次のようになります。

```fsharp
["1"; "2"; "3"] 
|> List.map parseInt
|> List.sequenceResultM
```

しかし、これはリストを2回通過することになります。前述のように、`traverse`を使えば`map`と`sequence`を1ステップで組み合わせ、
リストを1回だけ走査すれば済みます。

```fsharp
["1"; "2"; "3"] 
|> List.traverseResultM parseInt
```

`traverse`がより簡潔でおそらくより効率的であるなら、なぜ`sequence`を使うのでしょうか？

時には特定の構造が与えられて選択の余地がない場合もありますが、他の状況では、2ステップの`map-sequence`アプローチの方が理解しやすいため、私は前者のアプローチを選ぶことがあります。
「マップ」してから「入れ替える」という心的モデルは、ほとんどの人にとって1ステップの走査よりも把握しやすいようです。

言い換えれば、パフォーマンスへの影響が証明されない限り、読みやすさを優先することをお勧めします。多くの人がまだ関数型プログラミングを学んでいる段階です。
過度に難解な表現は理解の妨げになるというのが私の経験です。


<a id="filter"></a>
<hr>

## ねえ、`filter`はどこ？

`map`や`sequence`などの関数がリストを他の型に変換するのを見てきましたが、フィルタリングについてはどうでしょうか？これらの手法を使って要素をフィルタリングすることはできるのでしょうか？

答えは……できません！ `map`、`traverse`、`sequence`はすべて「構造を保持」します。
10個の要素を持つリストから始めると、結果も10個の要素を持つリストになります。ただし、スタックの位置が変わっているだけです。
あるいは、3つの枝を持つ木から始めると、結果も3つの枝を持つ木になります。

上のタプルの例では、元のリストに4つの要素がありましたが、変換後も、タプル内の2つの新しいリストにそれぞれ4つの要素があります。

型の構造を*変更*する必要がある場合は、`fold`のようなものを使用する必要があります。foldを使えば古い構造から新しい構造を構築できます。
つまり、foldを使って一部の要素が欠落した新しいリストを作成できます（それが、フィルタリングです）。

foldの様々な使用法は独自のシリーズに値するので、フィルタリングの議論は別の機会に取っておきます。

## まとめ

この投稿では、高次の値のリストを扱う方法として`traverse`と`sequence`について学びました。

[次の投稿](../posts/elevated-world-5.md)では、これまで議論してきたすべてのテクニックを使用する実践的な例を詳しく見ていきます。

