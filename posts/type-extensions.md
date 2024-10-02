---
layout: post
title: "型に関数を付加する"
description: "F#流のメソッド作成"
nav: thinking-functionally
seriesId: "関数型思考"
seriesOrder: 11
---

これまで純粋な関数型スタイルに注目してきましたが、時にはオブジェクト指向スタイルに切り替えると便利です。
オブジェクト指向スタイルの主な特徴の1つは、クラスに関数を付け加え、そのクラスに「ドット」でアクセスして目的の動作を得られることです。

F#では、これを「型拡張」という機能で実現します。クラスだけでなく、あらゆるF#の型に関数を付け加えられます。

以下は、レコード型に関数を付け加える例です。

```fsharp
module Person = 
    type T = {First:string; Last:string} with
        // 型宣言と同時にメンバーを定義
        member this.FullName = 
            this.First + " " + this.Last

    // コンストラクタ
    let create first last = 
        {First=first; Last=last}
       
// テスト
let person = Person.create "John" "Doe"
let fullname = person.FullName
```

ここで注目すべき点は、

* `with` キーワードがメンバーのリストの開始を示します
* `member` キーワードは、これがメンバー関数（つまりメソッド）であることを示します
* `this` という単語は、ドットでアクセスされるオブジェクトのプレースホルダー（「自己識別子」と呼ばれます）です。このプレースホルダーは関数名の前に置かれ、関数本体で現在のインスタンスを参照する必要がある場合に同じプレースホルダーを使います。
特定の単語を使う必要はありません。一貫性があれば良いのです。 `this` や `self` 、 `me` 、あるいは自己参照を示す一般的な他の単語を使えます。

型を宣言するのと同時にメンバーを追加する必要はありません。同じモジュール内なら、後からいつでも追加できます。

```fsharp
module Person = 
    type T = {First:string; Last:string} with
       // 型宣言と同時にメンバーを定義
        member this.FullName = 
            this.First + " " + this.Last

    // コンストラクタ
    let create first last = 
        {First=first; Last=last}

    // 後から別のメンバーを追加
    type T with 
        member this.SortableName = 
            this.Last + ", " + this.First        
// テスト
let person = Person.create "John" "Doe"
let fullname = person.FullName
let sortableName = person.SortableName
```


これらの例は「内在的拡張」と呼ばれるものを示しています。これらは型自体にコンパイルされ、その型を使うときは常に利用できます。また、リフレクションを使うときにも表示されます。

内在的拡張では、同じ名前空間を使い、同じアセンブリにコンパイルされる限り、複数のファイルにまたがって型定義を分割することもできます。
C#の部分クラスと同様に、これは生成されたコードと作成されたコードを分けるのに役立ちます。

## オプションの拡張 

もう1つの方法として、完全に別のモジュールから追加のメンバーを追加できます。
これらは「オプションの拡張」と呼ばれます。型自体にはコンパイルされず、機能させるには他のモジュールがスコープ内にある必要があります（この動きはC#の拡張メソッドとよく似ています）。

たとえば、 `Person` 型が定義されているとします。

```fsharp
module Person = 
    type T = {First:string; Last:string} with
       // 型宣言と同時にメンバーを定義
        member this.FullName = 
            this.First + " " + this.Last

    // コンストラクタ
    let create first last = 
        {First=first; Last=last}

    // 後から別のメンバーを追加
    type T with 
        member this.SortableName = 
            this.Last + ", " + this.First        
```

以下の例は、別のモジュールで `UppercaseName` 拡張を追加する方法を示しています。
            
```fsharp
// 別のモジュールで
module PersonExtensions = 

    type Person.T with 
    member this.UppercaseName = 
        this.FullName.ToUpper()
```

では、この拡張をテストしてみましょう。

```fsharp
let person = Person.create "John" "Doe"
let uppercaseName = person.UppercaseName 
```

おっと、エラーが出ました。何が問題なのでしょうか？ `PersonExtensions` がスコープ内にないのが原因です。
C#の場合と同じように、拡張機能を使うには、それらをスコープ内に持ち込む必要があります。

それを行えば、すべてうまくいきます。

```fsharp
// まず拡張をスコープに持ち込みます！
open PersonExtensions

let person = Person.create "John" "Doe"
let uppercaseName = person.UppercaseName 
```


## システム型の拡張

.NETライブラリにある型も拡張できます。ただし、型を拡張するときは、型の略称ではなく実際の型名を使う必要があります。

たとえば、 `int` を拡張しようとすると失敗します。 `int` がその型の本当の名前ではないからです。

```fsharp
type int with
    member this.IsEven = this % 2 = 0
```

代わりに `System.Int32` を使う必要があります。

```fsharp
type System.Int32 with
    member this.IsEven = this % 2 = 0

//テスト
let i = 20
if i.IsEven then printfn "'%i' is even" i
```

## 静的メンバー

以下の方法でメンバー関数を静的にできます。

* キーワード `static` を追加する 
* `this` プレースホルダーを削除する

```fsharp
module Person = 
    type T = {First:string; Last:string} with
        // 型宣言と同時にメンバーを定義
        member this.FullName = 
            this.First + " " + this.Last

        // 静的コンストラクタ
        static member Create first last = 
            {First=first; Last=last}
      
// テスト
let person = Person.T.Create "John" "Doe"
let fullname = person.FullName
```

システム型に対しても静的メンバーを作れます。

```fsharp
type System.Int32 with
    static member IsOdd x = x % 2 = 1
    
type System.Double with
    static member Pi = 3.141

//テスト
let result = System.Int32.IsOdd 20 
let pi = System.Double.Pi
```

<a name="attaching-existing-functions" ></a>
## 既存の関数の付加

既存のスタンドアロン関数を型に付け加えるのは非常によくあるパターンです。これには以下のような利点があります。

* 開発中は、他のスタンドアロン関数を参照するスタンドアロン関数を作れます。これによりプログラミングが楽になります。型推論が、オブジェクト指向スタイル（「ドットでのアクセス」）のコードよりも関数型スタイルのコードでずっとうまく機能するからです。
* しかし、特定の重要な関数については、型にも付け加えられます。これにより、クライアントは関数型スタイルとオブジェクト指向スタイルのどちらを使うか選べます。

F#ライブラリでのこの例の1つが、リストの長さを計算する関数です。これは `List` モジュール内のスタンドアロン関数として使えますが、リストインスタンスのメソッドとしても使えます。

```fsharp
let list = [1..10]

// 関数型スタイル
let len1 = List.length list

// オブジェクト指向スタイル
let len2 = list.Length
```

次の例では、最初はメンバーのない型から始め、いくつかの関数を定義し、最後に `fullName` 関数を型に付け加えています。

```fsharp
module Person = 
    // 最初はメンバーのない型
    type T = {First:string; Last:string} 

    // コンストラクタ
    let create first last = 
        {First=first; Last=last}

    // スタンドアロン関数            
    let fullName {First=first; Last=last} = 
        first + " " + last

    // 既存の関数をメンバーとして付加 
    type T with 
        member this.FullName = fullName this
        
// テスト
let person = Person.create "John" "Doe"
let fullname = Person.fullName person  // 関数型スタイル
let fullname2 = person.FullName        // オブジェクト指向スタイル
```

スタンドアロンの `fullName` 関数は1つのパラメータ（person）を持ちます。付加されたメンバーでは、このパラメータは `this` 自己参照から来ています。

### 複数のパラメータを持つ既存の関数の付加

良いところは、以前に定義した関数が複数のパラメータを持つ場合、 `this` パラメータが最初にある限り、付加するときにそれらすべてを再指定する必要がないことです。

以下の例では、 `hasSameFirstAndLastName` 関数は3つのパラメータを持ちます。しかし、それを付加するときには1つだけ指定すれば良いのです！

```fsharp
module Person = 
    // 最初はメンバーのない型
    type T = {First:string; Last:string} 

    // コンストラクタ
    let create first last = 
        {First=first; Last=last}

    // スタンドアロン関数            
    let hasSameFirstAndLastName (person:T) otherFirst otherLast = 
        person.First = otherFirst && person.Last = otherLast

    // 既存の関数をメンバーとして付加 
    type T with 
        member this.HasSameFirstAndLastName = hasSameFirstAndLastName this
        
// テスト
let person = Person.create "John" "Doe"
let result1 = Person.hasSameFirstAndLastName person "bob" "smith" // 関数型スタイル
let result2 = person.HasSameFirstAndLastName "bob" "smith" // オブジェクト指向スタイル
```


なぜこれが機能するのでしょうか？ヒント：カリー化と部分適用について考えてみてください！

<a name="tuple-form" ></a>
## タプル形式のメソッド

メソッドが複数のパラメータを持つ場合、次のどちらかを選ぶ必要があります。

* 標準の（カリー化された）形式を使う。パラメータはスペースで区切られ、部分適用ができます。
* すべてのパラメータを一度に渡す。パラメータはカンマで区切られ、単一のタプルとして渡します。

「カリー化」形式はより関数型的で、「タプル」形式はよりオブジェクト指向的です。

タプル形式は、F#が標準の.NETライブラリとやりとりする方法でもあるので、このアプローチをもう少し詳しく見てみましょう。

テスト用に、以下にProductタイプと、それぞれのアプローチで実装された2つのメソッドを示します。
 `CurriedTotal` メソッドと `TupleTotal` メソッドは同じことをします。与えられた数量と割引に対して合計価格を計算します。

```fsharp
type Product = {SKU:string; Price: float} with

    // カリー化スタイル
    member this.CurriedTotal qty discount = 
        (this.Price * float qty) - discount

    // タプルスタイル
    member this.TupleTotal(qty,discount) = 
        (this.Price * float qty) - discount
```

そして、以下がテストコードです。

```fsharp
let product = {SKU="ABC"; Price=2.0}
let total1 = product.CurriedTotal 10 1.0 
let total2 = product.TupleTotal(10,1.0)
```

ここまでは違いはありません。

カリー化版は部分適用ができることがわかっています。

```fsharp
let totalFor10 = product.CurriedTotal 10
let discounts = [1.0..5.0] 
let totalForDifferentDiscounts 
    = discounts |> List.map totalFor10 
```

しかし、タプルアプローチにはカリー化版にはない以下のような特徴があります。

* 名前付きパラメータ
* オプションパラメータ
* オーバーロード

### タプル形式パラメータでの名前付きパラメータ

タプル形式のアプローチでは名前付きパラメータが使えます。

```fsharp
let product = {SKU="ABC"; Price=2.0}
let total3 = product.TupleTotal(qty=10,discount=1.0)
let total4 = product.TupleTotal(discount=1.0, qty=10)
```

見てのとおり、名前を使うとパラメータの順序を変えられます。  

注意：一部のパラメータが名前付きで、一部がそうでない場合、名前付きパラメータは必ず最後に来なければなりません。

### タプル形式パラメータでのオプションパラメータ

タプル形式のメソッドでは、パラメータ名の前にクエスチョンマークを付けることでオプションパラメータを指定できます。

* パラメータが設定されている場合、 `Some value` として渡されます
* パラメータが設定されていない場合、 `None` として渡されます

以下に例を示します。

```fsharp
type Product = {SKU:string; Price: float} with

    // オプションの割引
    member this.TupleTotal2(qty,?discount) = 
        let extPrice = this.Price * float qty
        match discount with
        | None -> extPrice
        | Some discount -> extPrice - discount
```

そして、これがテストです。

```fsharp
let product = {SKU="ABC"; Price=2.0}

// 割引が指定されていない
let total1 = product.TupleTotal2(10)

// 割引が指定されている
let total2 = product.TupleTotal2(10,1.0) 
```

 `None` と `Some` を明示的にマッチングするのは面倒かもしれません。オプションパラメータを扱うためのもっと洗練された解決策があります。

 `defaultArg` という関数があり、これは最初の引数としてパラメータを、2番目の引数としてデフォルト値を取ります。パラメータが設定されている場合はその値が返され、
設定されていない場合はデフォルト値が返されます。

 `defaultArg` を使って同じコードを書き直してみましょう。

```fsharp
type Product = {SKU:string; Price: float} with

    // オプションの割引
    member this.TupleTotal2(qty,?discount) = 
        let extPrice = this.Price * float qty
        let discount = defaultArg discount 0.0
        //戻り値
        extPrice - discount
```

<a id="method-overloading"></a>

### メソッドのオーバーロード

C#では、関数シグネチャ（つまり、異なるパラメータ型や数のパラメータ）のみが異なる同名の複数のメソッドを持てます。

純粋な関数型モデルでは、それは意味をなしません。関数は特定のドメイン型と特定のレンジ型で動作します。
同じ関数が異なるドメインとレンジで動作することはできません。  

しかし、F#はメソッドのオーバーロードをサポートしています。ただし、これはメソッド（つまり型に付加された関数）に限られ、さらにその中でもタプル形式のパラメータ渡しを使うものに限られます。

以下に例を示します。 `TupleTotal` メソッドのさらに別のバリエーションです！

```fsharp
type Product = {SKU:string; Price: float} with

    // 割引なし
    member this.TupleTotal3(qty) = 
        printfn "割引なしメソッドを使用"
        this.Price * float qty

    // 割引あり
    member this.TupleTotal3(qty, discount) = 
        printfn "割引ありメソッドを使用"
        (this.Price * float qty) - discount
```

通常、F#コンパイラは同じ名前の2つのメソッドがあることに対して警告を出しますが、この場合、タプルベースであり、シグネチャが異なるため、許容されます。
（どちらが呼び出されているかを明確にするために、小さなデバッグメッセージを追加しました。）

そして、これがテストです。


```fsharp
let product = {SKU="ABC"; Price=2.0}

// 割引が指定されていない
let total1 = product.TupleTotal3(10) 

// 割引が指定されている
let total2 = product.TupleTotal3(10,1.0) 
```

<a id="downsides-of-methods"></a>

## ちょっと待って！メソッドを使うことのデメリット

オブジェクト指向のバックグラウンドをお持ちの方は、慣れ親しんでいるからという理由で、メソッドをあちこちで使いたくなるかもしれません。
しかし、メソッドを使うことには大きなデメリットもあることを知っておく必要があります。

* メソッドは型推論とうまく連携しない
* メソッドは高階関数とうまく連携しない

実際、メソッドを過剰に使うことで、F#でのプログラミングの最も強力で有用な側面を不必要に回避してしまうことになります。

何を意味しているのか、見てみましょう。

### メソッドは型推論とうまく連携しない

先ほどのPersonの例に戻りましょう。同じロジックをスタンドアロン関数とメソッドの両方で実装したものです。

```fsharp
module Person = 
    // 最初はメンバーのない型
    type T = {First:string; Last:string} 

    // コンストラクタ
    let create first last = 
        {First=first; Last=last}

    // スタンドアロン関数            
    let fullName {First=first; Last=last} = 
        first + " " + last

    // 関数をメンバーとして 
    type T with 
        member this.FullName = fullName this
```

それぞれが型推論とどのくらいうまく連携するか見てみましょう。人のフルネームを表示したいとします。そこで、人を引数に取る `printFullName` 関数を定義します。

以下はモジュールレベルのスタンドアロン関数を使ったコードです。

```fsharp
open Person

// スタンドアロン関数を使う            
let printFullName person = 
    printfn "Name is %s" (fullName person) 
    
// 型推論が機能しました。
//    val printFullName : Person.T -> unit    
```

これは問題なくコンパイルされ、型推論は正しくパラメータが人であると推論しました。

次に「ドットアクセス」版を試してみましょう。

```fsharp
open Person

// 「ドットアクセス」でメソッドを使う
let printFullName2 person = 
    printfn "Name is %s" (person.FullName) 
```

これは全くコンパイルされません。なぜなら、型推論がパラメータを推論するのに十分な情報を持っていないからです。*どんな*オブジェクトでも `.FullName` を実装している可能性があります - 推論するには情報が足りないのです。

はい、関数にパラメータの型を注釈することもできますが、それでは型推論の目的が台無しになってしまいます。

### メソッドは高階関数とうまく連携しない

高階関数でも同じような問題が起きます。たとえば、人のリストが与えられたとき、全員のフルネームを取得したいとします。

スタンドアロン関数を使えば、これは簡単です。

```fsharp
open Person

let list = [
    Person.create "Andy" "Anderson";
    Person.create "John" "Johnson"; 
    Person.create "Jack" "Jackson"]

//一度にすべてのフルネームを取得
list |> List.map fullName
```

オブジェクトメソッドを使う場合、あちこちで特別なラムダを作る必要があります。

```fsharp
open Person

let list = [
    Person.create "Andy" "Anderson";
    Person.create "John" "Johnson"; 
    Person.create "Jack" "Jackson"]

//一度にすべてのフルネームを取得
list |> List.map (fun p -> p.FullName)
```

そしてこれは単純な例に過ぎません。オブジェクトメソッドはうまく合成できず、パイプしにくい、などの問題があります。

したがって、関数型プログラミングを学び始めた方々へのアドバイスです。できる限りメソッドを使わないでください。特に学習中は避けましょう。
メソッドは、関数型プログラミングの恩恵を十分に受けられなくなる足かせとなります。