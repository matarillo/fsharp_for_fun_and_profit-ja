---
layout: post
title: "クラス"
description: ""
nav: fsharp-types
seriesId: "F#におけるオブジェクト指向プログラミング"
seriesOrder: 2
categories: ["オブジェクト指向", "クラス"]
---

この投稿と次の投稿では、F#でクラスやメソッドを作成・使用する基本を説明します。

## クラスの定義

F#の他のデータ型と同様、クラス定義も`type`キーワードで始まります。

クラスを他の型と区別する特徴は、作成時に必ずパラメータを渡すこと（コンストラクタ）です。そのため、クラス名の後には*必ずかっこ*が付きます。

また、他の型とは異なり、クラスには必ずメンバーとして関数を持たせる必要があります。この投稿ではクラスに関数を持たせる方法を説明しますが、他の型に関数を持たせる一般的な方法については[型拡張に関する投稿](../posts/type-extensions.md)を参照してください。

たとえば、`CustomerName`という名前のクラスを作成し、3つのパラメータでコンストラクタを定義する場合、次のように書きます。

```fsharp
type CustomerName(firstName, middleInitial, lastName) = 
    member this.FirstName = firstName
    member this.MiddleInitial = middleInitial
    member this.LastName = lastName  
```

C#での同等の表現と比較してみましょう。

```csharp
public class CustomerName
{
    public CustomerName(string firstName, 
       string middleInitial, string lastName)
    {
        this.FirstName = firstName;
        this.MiddleInitial = middleInitial;
        this.LastName = lastName;
    }

    public string FirstName { get; private set; }
    public string MiddleInitial { get; private set; }
    public string LastName { get; private set; }
}
```

F#版では、プライマリコンストラクタがクラス宣言自体に組み込まれています。別のメソッドとしては定義されません。つまり、クラス宣言はコンストラクタと同じパラメータを持ち、これらのパラメータは自動的に不変（イミュータブル）の非公開フィールドとなり、渡された元の値を保持します。

上記の例では、`CustomerName`クラスを次のように宣言したため：

```fsharp
type CustomerName(firstName, middleInitial, lastName)
```

`firstName`、`middleInitial`、`lastName`は自動的に不変の非公開フィールドになります。

### コンストラクタでの型指定

上記の`CustomerName`クラスの定義では、C#版とは異なり、パラメータを文字列に制限していません。一般的に、使用方法から型推論によって値が文字列に強制されますが、明示的に型を指定する必要がある場合は、通常の方法でコロンの後に型名を記述します。

以下は、コンストラクタで明示的に型を指定したバージョンのクラスです。

```fsharp
type CustomerName2(firstName:string, 
                   middleInitial:string, lastName:string) = 
    member this.FirstName = firstName
    member this.MiddleInitial = middleInitial
    member this.LastName = lastName
```

F#の小さな特徴として、コンストラクタにタプルをパラメータとして渡す必要がある場合、明示的に注釈を付ける必要があります。コンストラクタの呼び出しは同じように見えるためです。

```fsharp
type NonTupledConstructor(x:int,y: int) = 
    do printfn "x=%i y=%i" x y    

type TupledConstructor(tuple:int * int) = 
    let x,y = tuple
    do printfn "x=%i y=%i" x y    
    
// 呼び出しは同じように見える
let myNTC = new NonTupledConstructor(1,2)    
let myTC = new TupledConstructor(1,2)    
```

### クラスメンバー

上記の例のクラスには、3つの読み取り専用のインスタンスプロパティがあります。F#では、プロパティとメソッドの両方に`member`キーワードを使います。

また、上記の例では各メンバー名の前に「this」という単語があります。これは「自己識別子」で、クラスの現在のインスタンスを参照するために使います。静的でないメンバーには必ず自己識別子が必要で、上記のプロパティのように使われていなくても必要です。特定の単語を使う必要はなく、一貫性があればかまいません。「this」や「self」、「me」など、自己参照を示す一般的な単語を使えます。

## クラスシグネチャの理解

クラスがコンパイルされると（またはエディタで定義にカーソルを合わせると）、クラスの「シグネチャ」が表示されます。たとえば、以下のクラス定義の場合：

```fsharp
type MyClass(intParam:int, strParam:string) = 
    member this.Two = 2
    member this.Square x = x * x
```

対応するシグネチャは次のようになります。

```fsharp
type MyClass =
  class
    new : intParam:int * strParam:string -> MyClass
    member Square : x:int -> int
    member Two : int
  end
```

クラスシグネチャには、クラス内のすべてのコンストラクタ、メソッド、プロパティのシグネチャが含まれます。これらのシグネチャの意味を理解することは重要です。関数と同様に、シグネチャを見ればクラスの動作を理解できるからです。
また、抽象メソッドやインターフェースを作成する際にこれらのシグネチャを書く必要があるため、理解しておくことが重要です。

### メソッドシグネチャ

メソッドシグネチャは、[スタンドアロン関数のシグネチャ](../posts/how-types-work-with-functions.md)とよく似ています。ただし、パラメータ名がシグネチャ自体に含まれる点が異なります。

この場合、メソッドシグネチャは次のようになります。

```fsharp
member Square : x:int -> int
```

比較のため、対応するスタンドアロン関数のシグネチャは次のようになります。

```fsharp
val Square : int -> int
```

### コンストラクタシグネチャ

コンストラクタシグネチャは常に`new`と呼ばれますが、それ以外はメソッドシグネチャと同じような見た目です。

コンストラクタシグネチャは、唯一のパラメータとしてタプル値を取ります。この場合、タプル型は予想通り`int * string`です。戻り値の型はクラス自体で、これも予想通りです。

ここでも、コンストラクタシグネチャと類似のスタンドアロン関数を比較できます。

```fsharp
// クラスコンストラクタシグネチャ
new : intParam:int * strParam:string -> MyClass

// スタンドアロン関数シグネチャ
val new : int * string -> MyClass
```

### プロパティシグネチャ

最後に、`member Two : int`のようなプロパティシグネチャは、スタンドアロンの単純な値のシグネチャとよく似ています。ただし、明示的な値は与えられません。

```fsharp
// メンバープロパティ
member Two : int

// スタンドアロン値
val Two : int = 2
```

## `let`バインディングを使用した非公開フィールドと関数

クラス宣言の後に、オプションで「let」バインディングのセットを置くことができます。これは通常、非公開フィールドや関数の定義に使います。

以下は、これを示すサンプルコードです。

```fsharp
type PrivateValueExample(seed) = 

    // 非公開の不変値
    let privateValue = seed + 1

    // 非公開の可変値
    let mutable mutableValue = 42

    // 非公開関数の定義
    let privateAddToSeed input = 
        seed + input

    // 非公開関数の公開ラッパー
    member this.AddToSeed x = 
        privateAddToSeed x

    // 可変値の公開ラッパー
    member this.SetMutableValue x = 
        mutableValue <- x 
    
// テスト
let instance = new PrivateValueExample(42)
printf "%i" (instance.AddToSeed 2)
instance.SetMutableValue 43
```

上記の例には3つの`let`バインディングがあります。

* `privateValue`は初期シードに1を加えた値に設定します
* `mutableValue`は42に設定します
* `privateAddToSeed`関数は、初期シードにパラメータを加えます

`let`バインディングなので、これらは自動的に非公開になります。外部からアクセスするには、公開メンバーをラッパーとして用意する必要があります。

コンストラクタに渡された`seed`値も、`let`バインドされた値と同様に非公開フィールドとして利用できることに注意してください。

### 可変コンストラクタパラメータ

コンストラクタに渡されたパラメータを可変（ミュータブル）にしたい場合があります。パラメータ自体で指定することはできないので、標準的な手法として、可変の`let`バインド値を作成し、パラメータから割り当てます。以下に例を示します。

```fsharp
type MutableConstructorParameter(seed) = 
    let mutable mutableSeed = seed 

    // 可変値の公開ラッパー
    member this.SetSeed x = 
        mutableSeed <- x 
```

このような場合、可変値にパラメータと同じ名前を付けるのが一般的です。次のようになります。

```fsharp
type MutableConstructorParameter2(seed) = 
    let mutable seed = seed // パラメータをシャドウイング
    
    // 可変値の公開ラッパー
    member this.SetSeed x = 
        seed <- x 
```

## `do`ブロックを使用した追加のコンストラクタ動作

先ほどの`CustomerName`の例では、コンストラクタは単に値を渡すだけで他の処理は行いませんでした。しかし、コンストラクタの一部として何らかのコードを実行する必要がある場合があります。これは`do`ブロックを使って行います。

以下に例を示します。

```fsharp
type DoExample(seed) = 
    let privateValue = seed + 1
    
    // コンストラクション時に実行される追加コード
    do printfn "privateValueは現在%iです" privateValue 
    
// テスト
new DoExample(42)
```

「do」コードは、その前に定義された`let`バインド関数も呼び出せます。以下に例を示します。

```fsharp
type DoPrivateFunctionExample(seed) =   
    let privateValue = seed + 1
    
    // コンストラクション時に実行されるコード
    do printfn "こんにちは、世界"

    // これを呼び出す「do」ブロックの前に置く必要がある
    let printPrivateValue() = 
        do printfn "privateValueは現在%iです" privateValue 

    // コンストラクション時に実行される追加コード
    do printPrivateValue()

// テスト
new DoPrivateFunctionExample(42)
```

### doブロックでのthisを使用したインスタンスへのアクセス

「do」バインディングと「let」バインディングの違いの1つは、「do」バインディングがインスタンスにアクセスできることです。「let」バインディングはアクセスできません。これは、「let」バインディングがコンストラクタ自体の前に評価される（C#のフィールド初期化子と同様）ため、ある意味でインスタンスがまだ存在しないからです。

「do」ブロックからインスタンスのメンバーを呼び出す必要がある場合、インスタンス自体を参照する方法が必要です。これも「自己識別子」を使用しますが、今回はクラス宣言自体に付けます。

```fsharp
type DoPublicFunctionExample(seed) as this =   
    // 宣言での「this」キーワードに注目

    let privateValue = seed + 1
    
    // コンストラクション時に実行される追加コード
    do this.PrintPrivateValue()

    // メンバー
    member this.PrintPrivateValue() = 
        do printfn "privateValueは現在%iです" privateValue 

// テスト
new DoPublicFunctionExample(42)
```

一般的に、特に必要がない限り、コンストラクタからメンバーを呼び出すのは良い習慣とは言えません（たとえば、仮想メソッドを呼び出す場合など）。代わりに、非公開の`let`バインド関数を呼び出し、必要に応じて公開メンバーから同じ非公開関数を呼び出すようにするのが良いでしょう。

## メソッド

メソッド定義は関数定義とよく似ていますが、`let`キーワードの代わりに`member`キーワードと自己識別子を使います。

以下に例を示します。

```fsharp
type MethodExample() = 
    
    // スタンドアロンメソッド
    member this.AddOne x = 
        x + 1

    // 別のメソッドを呼び出す
    member this.AddTwo x = 
        this.AddOne x |> this.AddOne

    // パラメータのないメソッド
    member this.Pi() = 
        3.14159

// テスト
let me = new MethodExample()
printfn "%i" <| me.AddOne 42
printfn "%i" <| me.AddTwo 42
printfn "%f" <| me.Pi()
```
    
通常の関数と同様に、メソッドにもパラメータを持たせたり、他のメソッドを呼び出したり、パラメータを持たない（正確には[unitパラメータを取る](../posts/how-types-work-with-functions.md#parameterless-functions)）ようにしたりできます。

### タプル形式とカリー化形式

通常の関数とは異なり、複数のパラメータを持つメソッドは2つの異なる方法で定義できます。

* カリー化形式：パラメータを空白で区切り、部分適用をサポートします。（なぜ「カリー化」と呼ぶのか？[カリー化の説明](../posts/currying.md)を参照してください。）
* タプル形式：すべてのパラメータを同時に渡し、カンマで区切って1つのタプルにします。

カリー化アプローチはより関数型的で、タプルアプローチはよりオブジェクト指向的です。以下は、それぞれのアプローチを用いたメソッドを持つクラスの例です。

```fsharp
type TupleAndCurriedMethodExample() = 
    
    // カリー化形式
    member this.CurriedAdd x y = 
        x + y

    // タプル形式
    member this.TupleAdd(x,y) = 
        x + y

// テスト
let tc = new TupleAndCurriedMethodExample()
printfn "%i" <| tc.CurriedAdd 1 2
printfn "%i" <| tc.TupleAdd(1,2)

// 部分適用を使用
let addOne = tc.CurriedAdd 1  
printfn "%i" <| addOne 99
```

では、どちらのアプローチを使うべきでしょうか？

タプル形式の利点は：

* 他の.NETコードと互換性がある
* 名前付きパラメータとオプションパラメータをサポートする
* メソッドのオーバーロード（関数シグネチャのみが異なる同名の複数のメソッド）をサポートする

一方、タプル形式の欠点は：

* 部分適用をサポートしない
* 高階関数とうまく連携しない
* 型推論とうまく連携しない

タプル形式とカリー化形式の詳細な議論については、[型拡張に関する投稿](../posts/type-extensions.md#tuple-form)を参照してください。


### クラスメソッドと組み合わせた`let`バインド関数

一般的なパターンとして、`let`バインド関数で主要な処理を行い、公開メソッドからこれらの内部関数を直接呼び出すというものがあります。これには、関数型スタイルのコードで型推論がメソッドより快適に動作するというメリットがあります。

以下に例を示します。

```fsharp
type LetBoundFunctions() = 

    let listReduce reducer list = 
        list |> List.reduce reducer 

    let reduceWithSum sum elem = 
        sum + elem

    let sum list = 
        list |> listReduce reduceWithSum 

    // 最後に公開ラッパー 
    member this.Sum = sum
    
// テスト
let lbf = new LetBoundFunctions()
printfn "合計は%iです" <| lbf.Sum [1..10]
```

これを行う方法の詳細については、[この議論](../posts/type-extensions.md#attaching-existing-functions)を参照してください。

### 再帰的メソッド

通常の`let`バインド関数とは異なり、再帰的なメソッドには特別な`rec`キーワードは必要ありません。以下は、お馴染みのフィボナッチ関数をメソッドとして実装した例です。

```fsharp
type MethodExample() = 
    
    // 「rec」キーワードなしの再帰的メソッド
    member this.Fib x = 
        match x with
        | 0 | 1 -> 1
        | _ -> this.Fib (x-1) + this.Fib (x-2)

// テスト
let me = new MethodExample()
printfn "%i" <| me.Fib 10
```

### メソッドの型注釈

通常、メソッドのパラメータと戻り値の型はコンパイラによって推論されますが、明示的に指定する必要がある場合は、標準的な関数と同じ方法で行います。

```fsharp
type MethodExample() = 
    // 明示的な型注釈
    member this.AddThree (x:int) :int = 
        x + 3
```


## プロパティ

プロパティは3つのグループに分けられます：

* 不変プロパティ：「get」はありますが「set」はありません。
* 可変プロパティ：「get」と（場合によっては非公開の）「set」があります。
* 書き込み専用プロパティ：「set」はありますが「get」はありません。これはとても珍しいので、ここでは説明しません。必要な場合はMicrosoft learnのドキュメントで構文を確認してください。

不変プロパティと可変プロパティの構文は少し異なります。

不変プロパティの構文は簡単です。標準の「let」値バインディングと似た「get」メンバーがあります。バインディングの右側の式は任意の標準式で、通常はコンストラクタパラメータ、非公開の`let`バインドフィールド、非公開関数の組み合わせです。

以下に例を示します：

```fsharp
type PropertyExample(seed) = 
    // 不変プロパティ 
    // コンストラクタパラメータを使用
    member this.Seed = seed
```

しかし、可変プロパティの構文はより複雑です。値を取得する関数と設定する関数の2つを提供する必要があります。これは以下の構文で行います：

```fsharp
with get() = ...
and set(value) = ...
```

以下に例を示します：

```fsharp
type PropertyExample(seed) = 
    // 非公開の可変値
    let mutable myProp = seed

    // 可変プロパティ
    // 非公開の可変値を変更
    member this.MyProp 
        with get() = myProp 
        and set(value) = myProp <- value
```

set関数を非公開にするには、`private set`キーワードを使用します。

### 自動プロパティ

VS2012以降、F#は自動プロパティをサポートしており、別のバッキングストアを作成する必要がなくなりました。

不変の自動プロパティを作成するには、以下の構文を使います：

```fsharp
member val MyProp = initialValue
```

可変の自動プロパティを作成するには、以下の構文を使います：

```fsharp
member val MyProp = initialValue with get,set
```

この構文では新しい`val`キーワードが使われ、自己識別子がなくなっていることに注意してください。

### プロパティの完全な例

以下に、すべてのプロパティタイプを示す完全な例を示します：

```fsharp
type PropertyExample(seed) = 
    // 非公開の可変値
    let mutable myProp = seed

    // 非公開関数
    let square x = x * x

    // 不変プロパティ 
    // コンストラクタパラメータを使用
    member this.Seed = seed

    // 不変プロパティ 
    // 非公開関数を使用
    member this.SeedSquared = square seed

    // 可変プロパティ
    // 非公開の可変値を変更
    member this.MyProp 
        with get() = myProp 
        and set(value) = myProp <- value

    // 非公開のsetを持つ可変プロパティ
    member this.MyProp2 
        with get() = myProp 
        and private set(value) = myProp <- value

    // 自動不変プロパティ（VS2012以降）
    member val ReadOnlyAuto = 1

    // 自動可変プロパティ（VS2012以降）
    member val ReadWriteAuto = 1 with get,set

// テスト 
let pe = new PropertyExample(42)
printfn "%i" <| pe.Seed
printfn "%i" <| pe.SeedSquared
printfn "%i" <| pe.MyProp
printfn "%i" <| pe.MyProp2

// setの呼び出しを試みる
pe.MyProp <- 43    // OK
printfn "%i" <| pe.MyProp

// 非公開のsetの呼び出しを試みる
pe.MyProp2 <- 43   // エラー
```

### プロパティとパラメータなしメソッドの違い

この時点で、プロパティとパラメータなしメソッドの違いが分かりにくいかもしれません。一見同じように見えますが、微妙な違いがあります。「パラメータなし」メソッドは実際にはパラメータがないわけではなく、常にunitパラメータを持ちます。

以下に、定義と使用の両方における違いの例を示します：

```fsharp
type ParameterlessMethodExample() = 
    member this.MyProp = 1    // かっこなし！
    member this.MyFunc() = 1  // かっこに注目

// 使用時
let x = new ParameterlessMethodExample()
printfn "%i" <| x.MyProp      // かっこなし！
printfn "%i" <| x.MyFunc()    // かっこに注目
```

クラス定義のシグネチャを見ることでも違いが分かります。

クラス定義は以下のようになります：

```fsharp
type ParameterlessMethodExample =
  class
    new : unit -> ParameterlessMethodExample
    member MyFunc : unit -> int
    member MyProp : int
  end
```

メソッドのシグネチャは`MyFunc : unit -> int`で、プロパティのシグネチャは`MyProp : int`です。

これは、関数とプロパティがクラス外で単独で宣言された場合のシグネチャとよく似ています：

```fsharp
let MyFunc2() = 1 
let MyProp2 = 1 
```

これらのシグネチャは以下のようになります：

```fsharp
val MyFunc2 : unit -> int
val MyProp2 : int = 1
```

これはほぼ同じです。

違いが分からない場合や、関数にunitパラメータが必要な理由が不明な場合は、[パラメータなしメソッドの議論](../posts/how-types-work-with-functions.md#parameterless-functions)を参照してください。


## 追加コンストラクタ

宣言に組み込まれたプライマリコンストラクタに加えて、クラスは追加のコンストラクタを持つことができます。これらは`new`キーワードで示され、最後の式としてプライマリコンストラクタを呼び出す必要があります。

```fsharp
type MultipleConstructors(param1, param2) =
    do printfn "Param1=%i Param2=%i" param1 param2

    // 追加コンストラクタ
    new(param1) = 
        MultipleConstructors(param1,-1) 

    // 追加コンストラクタ
    new() = 
        printfn "構築中..."
        MultipleConstructors(13,17) 

// テスト
let mc1 = new MultipleConstructors(1,2)
let mc2 = new MultipleConstructors(42)
let mc3 = new MultipleConstructors()
```

## 静的メンバー

C#と同様に、クラスは静的メンバーを持つことができ、これは`static`キーワードで示されます。`static`修飾子はmemberキーワードの前に来ます。

静的メンバーは、参照するインスタンスがないため、「this」などの自己識別子を持つことができません。

```fsharp
type StaticExample() = 
    member this.InstanceValue = 1
    static member StaticValue = 2  // "this"なし
    
// テスト
let instance = new StaticExample()
printf "%i" instance.InstanceValue
printf "%i" StaticExample.StaticValue
```

## 静的コンストラクタ

F#には静的コンストラクタの直接の同等物はありませんが、クラスが初めて使用されるときに実行される静的な`let`バインド値と静的な`do`ブロックを作成できます。

```fsharp
type StaticConstructor() =
    
    // 静的フィールド
    static let rand = new System.Random()

    // 静的なdo
    static do printfn "クラスの初期化！"

    // 静的フィールドにアクセスするインスタンスメンバー
    member this.GetRand() = rand.Next()
```

## メンバーのアクセシビリティ

メンバーのアクセシビリティは、標準的な.NETキーワードである`public`、`private`、`internal`で制御できます。アクセシビリティ修飾子は`member`キーワードの後、メンバー名の前に来ます。

C#とは異なり、F#ではすべてのクラスメンバーがデフォルトで公開されます。これはプロパティとメソッドの両方に当てはまります。ただし、メンバーでないもの（たとえば`let`宣言）は非公開で、公開することはできません。

以下に例を示します：

```fsharp
type AccessibilityExample() = 
    member this.PublicValue = 1
    member private this.PrivateValue = 2
    member internal this.InternalValue = 3
// テスト
let a = new AccessibilityExample();
printf "%i" a.PublicValue
printf "%i" a.PrivateValue  // アクセス不可
```

プロパティの場合、setとgetのアクセシビリティが異なる場合、各部分に別々のアクセシビリティ修飾子を付けることができます。

```fsharp
type AccessibilityExample2() = 
    let mutable privateValue = 42
    member this.PrivateSetProperty
        with get() = 
            privateValue 
        and private set(value) = 
            privateValue <- value

// テスト
let a2 = new AccessibilityExample2();
printf "%i" a2.PrivateSetProperty  // 読み取りOK
a2.PrivateSetProperty <- 43        // 書き込み不可
```

実際には、C#でよく見られる「公開get、非公開set」の組み合わせは、F#ではあまり必要ありません。不変プロパティをより簡潔に定義できるからです。

## ヒント：他の.NETコードで使用するクラスの定義

他の.NETコードと相互運用する必要があるクラスを定義する場合、モジュール内で定義しないでください！代わりに、モジュールの外部の名前空間内で定義してください。

この理由は、F#モジュールが静的クラスとして公開され、モジュール内で定義されたF#クラスが静的クラス内のネストされたクラスとして定義されるため、相互運用性に問題が生じる可能性があるからです。たとえば、一部の単体テストランナーは静的クラスを好みません。

モジュールの外部で定義されたF#クラスは、通常の最上位の.NETクラスとして生成されます。これはおそらくあなたが望むものでしょう。ただし、[以前の投稿](../posts/organizing-functions.md)で説明したように、名前空間を明示的に宣言しない場合、クラスは自動生成されたモジュールに配置され、気づかないうちにネストされることになります。

以下に、モジュールの外部と内部で定義された2つのF#クラスの例を示します：

```fsharp
// 注意：このコードは.FSXスクリプトでは動作せず、
// .FSソースファイルでのみ動作します。
namespace MyNamespace

type TopLevelClass() = 
    let nothing = 0

module MyModule = 
    
    type NestedClass() = 
        let nothing = 0
```
       
同じコードをC#で表現すると以下のようになります：

```csharp
namespace MyNamespace
{
  public class TopLevelClass
  {
  // コード
  }

  public static class MyModule
  {
    public class NestedClass
    {
    // コード
    }
  }
}
```

## クラスの構築と使用

クラスを定義したら、どのように使用すればよいでしょうか？

クラスのインスタンスを作成する一つの方法は、C#と同様に簡単です。`new`キーワードを使用し、コンストラクタに引数を渡します。

```fsharp
type MyClass(intParam:int, strParam:string) = 
    member this.Two = 2
    member this.Square x = x * x

let myInstance = new MyClass(1,"hello")
```

ただし、F#ではコンストラクタは単なる別の関数と見なされるため、通常は`new`を省略してコンストラクタ関数を直接呼び出すことができます：

```fsharp
let myInstance2 = MyClass(1,"hello")
let point = System.Drawing.Point(1,2)   // .NETクラスでも機能します！
```

`IDisposable`を実装するクラスを作成する場合、`new`を使用しないとコンパイラ警告が出ます。

```fsharp
let sr1 = System.IO.StringReader("")      // 警告
let sr2 = new System.IO.StringReader("")  // OK
```

これは、破棄可能オブジェクトに対して`let`キーワードの代わりに`use`キーワードを使用するよう注意を促す有用なリマインダーとなります。詳しくは[`use`に関する投稿](../posts/let-use-do.md#use)を参照してください。

### メソッドとプロパティの呼び出し

インスタンスを取得したら、そのインスタンスに「ドット」でアクセスし、標準的な方法でメソッドやプロパティを使用できます。

```fsharp
myInstance.Two
myInstance.Square 2
```

上記の説明で多くのメンバー使用例を見てきましたが、特に説明することはあまりありません。

先ほど説明したように、タプルスタイルのメソッドとカリー化スタイルのメソッドは異なる方法で呼び出せることを覚えておいてください：

```fsharp
type TupleAndCurriedMethodExample() = 
    member this.TupleAdd(x,y) = x + y
    member this.CurriedAdd x y = x + y

let tc = TupleAndCurriedMethodExample()
tc.TupleAdd(1,2)      // かっこ付きで呼び出し
tc.CurriedAdd 1 2     // かっこなしで呼び出し
2 |> tc.CurriedAdd 1  // 部分適用
```
