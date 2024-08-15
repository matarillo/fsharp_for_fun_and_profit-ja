---
layout: post
title: "関数の整理"
description: "入れ子関数とモジュール"
nav: thinking-functionally
seriesId: "関数型思考"
seriesOrder: 10
categories: [Functions, Modules]
---

関数の定義方法を学んだ今、それらをどう整理すればいいでしょうか？

F#では、3つの方法があります。

* 関数を他の関数の中に入れ子にする。
* アプリケーションレベルでは、トップレベルの関数を「モジュール」にまとめる。
* オブジェクト指向的なアプローチを使い、関数を型のメソッドとして結びつける。

この記事では最初の2つの方法を見ていき、3つ目は次の記事で扱います。

## 入れ子関数 ##

F#では、関数の中に他の関数を定義できます。これは、メイン関数に必要だけど外に出したくない「ヘルパー」関数をまとめるのに最適です。

以下の例では、 `add` が `addThreeNumbers` の中に入れ子になっています。

```fsharp
let addThreeNumbers x y z  = 

    // 入れ子のヘルパー関数を作る
    let add n = 
       fun x -> x + n
       
    // ヘルパー関数を使う       
    x |> add y |> add z

// テスト
addThreeNumbers 2 3 4
```

入れ子関数は、親関数のパラメータがスコープ内にあるので、直接触れます。
だから、以下の例では、入れ子関数 `printError` は自分のパラメータを持つ必要がありません - `n` と `max` の値に直接アクセスできます。

```fsharp
let validateSize max n  = 

    // パラメータのない入れ子ヘルパー関数を作る
    let printError() = 
        printfn "エラー: '%i'は最大値'%i'より大きいです" n max

    // ヘルパー関数を使う               
    if n > max then printError()

// テスト
validateSize 10 9
validateSize 10 11
```

よくあるパターンとして、メイン関数が入れ子の再帰的ヘルパー関数を定義し、適切な初期値でそれを呼び出すというものがあります。
以下のコードはその例です。

```fsharp
let sumNumbersUpTo max = 

    // アキュムレータを持つ再帰的ヘルパー関数    
    let rec recursiveSum n sumSoFar = 
        match n with
        | 0 -> sumSoFar
        | _ -> recursiveSum (n-1) (n+sumSoFar)

    // 初期値でヘルパー関数を呼ぶ
    recursiveSum max 0
            
// テスト
sumNumbersUpTo 10
```


関数を入れ子にするとき、非常に深い入れ子は避けましょう。特に、入れ子関数がパラメータとして渡されるのではなく、親のスコープにある変数に直接触る場合は注意が必要です。
うまく作られていない入れ子関数は、最悪の命令型分岐と同じくらい混乱を招く可能性があります。

以下は、やってはいけない例です。

```fsharp
// この関数は何をしているのでしょうか？
let f x = 
    let f2 y = 
        let f3 z = 
            x * z
        let f4 z = 
            let f5 z = 
                y * z
            let f6 () = 
                y * x
            f6()
        f4 y
    x * f2 x
```


## モジュール ##

モジュールは、関連する関数をまとめたものです。普通、同じデータ型や型のグループを扱う関数をまとめるのに使います。

モジュールの定義は関数の定義によく似ています。 `module` キーワードで始まり、その後に `=` 記号が続き、そしてモジュールの中身が並びます。
モジュールの中身は、関数定義内の式と同じように、必ずインデントしなければいけません。

以下は、2つの関数を含むモジュールの例です。

```fsharp
module MathStuff = 

    let add x y  = x + y
    let subtract x y  = x - y
```

Visual Studioでこれを試すと、 `add` 関数にカーソルを合わせたとき、 `add` 関数の完全な名前が実際には `MathStuff.add` だとわかります。まるで `MathStuff` がクラスで、 `add` がメソッドみたいです。

実際、まさにそうなっています。裏では、F#コンパイラが静的クラスと静的メソッドを作っています。C#で同じことを書くとすれば、こんな感じになります。

```csharp
static class MathStuff
{
    static public int add(int x, int y)
    {
        return x + y;
    }

    static public int subtract(int x, int y)
    {
        return x - y;
    }
}
```

モジュールが単なる静的クラスで、関数が静的メソッドだと理解すれば、F#のモジュールの仕組みをより早く理解できるでしょう。
静的クラスに当てはまるルールのほとんどが、モジュールにも当てはまるからです。

そして、C#ですべての独立した関数がクラスの一部でなければならないように、F#でもすべての独立した関数はモジュールの一部でなければいけません。

### モジュール間での関数へのアクセス

別のモジュールにある関数を使いたい場合は、修飾名を使って参照できます。

```fsharp
module MathStuff = 

    let add x y  = x + y
    let subtract x y  = x - y

module OtherStuff = 

    // MathStuffモジュールの関数を使う
    let add1 x = MathStuff.add x 1  
```

また、 `open` ディレクティブを使って別のモジュールのすべての関数を取り込むこともできます。
そうすると、修飾名を指定する代わりに短い名前を使えます。

```fsharp
module OtherStuff = 
    open MathStuff  // すべての関数を使えるようにする

    let add1 x = add x 1
```

修飾名を使うルールは、予想通りです。つまり、完全修飾名を使って関数にアクセスするのは常に可能で、
他のモジュールがスコープ内にある場合は、相対名や非修飾名を使えます。

### 入れ子モジュール

静的クラスと同じように、モジュールの中に子モジュールを入れ子にできます。以下にその例を示します。

```fsharp
module MathStuff = 

    let add x y  = x + y
    let subtract x y  = x - y

    // 入れ子モジュール    
    module FloatLib = 

        let add x y :float = x + y
        let subtract x y :float  = x - y
```
        
そして、他のモジュールは、状況に応じて完全名または相対名を使って、入れ子モジュール内の関数を参照できます。

```fsharp
module OtherStuff = 
    open MathStuff

    let add1 x = add x 1

    // 完全修飾名
    let add1Float x = MathStuff.FloatLib.add x 1.0
    
    // 相対パス
    let sub1Float x = FloatLib.subtract x 1.0
```

### トップレベルモジュール 

入れ子の子モジュールがあるということは、チェーンをさかのぼっていくと、常に何らかの*トップレベル*の親モジュールがあるはずです。実際にそうなっています。

トップレベルモジュールは、これまで見てきたモジュールとは少し違う方法で定義します。

* `module MyModuleName` の行は、ファイルの最初の宣言でなければいけません。
* `=` 記号はありません。
* モジュールの中身はインデントしなくていいです。

一般に、すべての `.FS` ソースファイルにトップレベルモジュール宣言が必要です。例外はありますが、いずれにしてもそうするのが良い習慣です。
モジュール名はファイル名と同じである必要はありませんが、2つのファイルが同じモジュール名を共有することはできません。

 `.FSX` スクリプトファイルの場合、モジュール宣言は必要ありません。その場合、モジュール名は自動的にスクリプトのファイル名になります。

以下は `MathStuff` をトップレベルモジュールとして宣言した例です。

```fsharp
// トップレベルモジュール
module MathStuff

let add x y  = x + y
let subtract x y  = x - y

// 入れ子モジュール    
module FloatLib = 

    let add x y :float = x + y
    let subtract x y :float  = x - y
```

トップレベルのコード（ `module MathStuff` の中身）にはインデントが要らないですが、 `FloatLib` のような入れ子モジュールの中身は依然としてインデントが必要なことに注意してください。

### その他のモジュールの中身

モジュールには関数の他にも、型宣言、単純な値、初期化コード（静的コンストラクタのようなもの）など、他の宣言も含められます。

```fsharp
module MathStuff = 

    // 関数
    let add x y  = x + y
    let subtract x y  = x - y

    // 型定義
    type Complex = {r:float; i:float}
    type IntegerFunction = int -> int -> int
    type DegreesOrRadians = Deg | Rad

    // "定数"
    let PI = 3.141

    // "変数"
    let mutable TrigType = Deg

    // 初期化 / 静的コンストラクタ
    do printfn "モジュールが初期化されました"

```

<div class="alert alert-info">ところで、対話型ウィンドウでこれらの例を試している場合は、右クリックして「セッションのリセット」をするといいでしょう。そうすると、コードが新鮮な状態に保たれ、以前の評価結果による影響を受けません。</div>

### シャドーイング

先ほどの例のモジュールをもう一度見てみましょう。 `MathStuff` に `add` 関数があり、 `FloatLib` にも `add` 関数があることに注目してください。

```fsharp
module MathStuff = 

    let add x y  = x + y
    let subtract x y  = x - y

    // 入れ子モジュール    
    module FloatLib = 

        let add x y :float = x + y
        let subtract x y :float  = x - y
```

ここで、*両方*のモジュールをスコープに入れ、 `add` を使うとどうなるでしょうか？

```fsharp
open  MathStuff
open  MathStuff.FloatLib

let result = add 1 2  // コンパイラエラー: この式はfloat型を持つと期待されていましたが、
                      // ここではint型を持っています    
```

何が起こったかというと、 `MathStuff.FloatLib` モジュールが元の `MathStuff` モジュールを覆い隠してしまったのです。 `FloatLib` によって「シャドーイング」されたわけです。

その結果、最初のパラメータ `1` がfloat型であることが期待されるため、[FS0001コンパイラエラー](../troubleshooting-fsharp/index.md#FS0001)が出ます。これを直すには、 `1` を `1.0` に変える必要があります。

残念ながら、これは目に見えにくく、見落としやすいです。時にはこれを使ってサブクラス化のようなクールな技を使えることもありますが、多くの場合、同じ名前の関数（例えば、非常によく使われる `map` など）があると面倒になる可能性があります。

これを防ぎたい場合は、 `RequireQualifiedAccess` 属性を使う方法があります。以下は、両方のモジュールにこの属性を付けた同じ例です。

```fsharp
[<RequireQualifiedAccess>]
module MathStuff = 

    let add x y  = x + y
    let subtract x y  = x - y

    // 入れ子モジュール    
    [<RequireQualifiedAccess>]    
    module FloatLib = 

        let add x y :float = x + y
        let subtract x y :float  = x - y
```

これで `open` は許されなくなります。
        
```fsharp
open  MathStuff   // エラー
open  MathStuff.FloatLib // エラー
```

しかし、修飾名を使って関数にアクセスするのは（曖昧さなく）依然として可能です。

```fsharp
let result = MathStuff.add 1 2  
let result = MathStuff.FloatLib.add 1.0 2.0
```


### アクセス制御

F#は、 `public` 、 `private` 、 `internal` などの標準的な.NETアクセス制御キーワードを使えます。
詳しくは、[Microsoft Learnのドキュメント](https://learn.microsoft.com/ja-jp/dotnet/fsharp/language-reference/access-control)を見てください。

* これらのアクセス指定子は、モジュール内のトップレベル（「let束縛」された）関数、値、型、その他の宣言に付けられます。また、モジュール自体にも指定できます（例えば、プライベートな入れ子モジュールが必要な場合など）。
* デフォルトではすべてpublicです（いくつかの例外を除く）ので、それらを守りたい場合は `private` や `internal` を使う必要があります。

これらのアクセス指定子は、F#でアクセス制御を行う方法の1つに過ぎません。もう1つの全く違う方法として、モジュールの「シグネチャ」ファイルを使う方法があります。これはCのヘッダファイルに少し似ています。シグネチャは抽象的な方法でモジュールの中身を記述します。シグネチャは本格的なカプセル化を行う上でとても便利ですが、その話は計画中のカプセル化と能力ベースのセキュリティに関するシリーズまで待つ必要があります。


## 名前空間

F#の名前空間はC#の名前空間と似ています。名前の衝突を避けるために、モジュールや型をまとめるのに使います。

名前空間は `namespace` キーワードを使って宣言します。以下にその例を示します。

```fsharp
namespace Utilities

module MathStuff = 

    // 関数
    let add x y  = x + y
    let subtract x y  = x - y
```

この名前空間により、 `MathStuff` モジュールの完全修飾名は `Utilities.MathStuff` になり、
 `add` 関数の完全修飾名は `Utilities.MathStuff.add` になります。

名前空間を使うとき、インデントルールが適用されるので、上記で定義したモジュールの中身は、入れ子モジュールのようにインデントする必要があります。

また、モジュール名にドットを追加することで、名前空間を暗黙的に宣言することもできます。つまり、上記のコードは以下のようにも書けます。

```fsharp
module Utilities.MathStuff  

// 関数
let add x y  = x + y
let subtract x y  = x - y
```

 `MathStuff` モジュールの完全修飾名は依然として `Utilities.MathStuff` ですが、
この場合、モジュールはトップレベルモジュールとなり、中身をインデントする必要はありません。

名前空間を使うときに注意すべきいくつかのこと：

* モジュールに名前空間は任意です。そして、C#とは違い、F#プロジェクトにはデフォルトの名前空間がないので、名前空間のないトップレベルモジュールはグローバルレベルになります。
再利用可能なライブラリを作る予定がある場合は、必ず何らかの名前空間を追加して、他のライブラリのコードとの名前の衝突を避けましょう。
* 名前空間には型宣言を直接含められますが、関数宣言は含められません。前に言ったように、すべての関数と値の宣言はモジュールの一部でなければいけません。
* 最後に、名前空間はスクリプトではうまく機能しないことに注意してください。例えば、 `namespace Utilities` のような名前空間宣言を対話型ウィンドウに送ろうとすると、エラーが出ます。


### 名前空間の階層

名前をピリオドで区切ることで、名前空間の階層を作れます。

```fsharp
namespace Core.Utilities

module MathStuff = 
    let add x y  = x + y
```

そして、*2つ*の名前空間を同じファイルに置くこともできます。すべての名前空間は完全修飾されている必要があることに注意してください - ネストはできません。

```fsharp
namespace Core.Utilities

module MathStuff = 
    let add x y  = x + y
    
namespace Core.Extra

module MoreMathStuff = 
    let add x y  = x + y
```

できないことの1つは、名前空間とモジュールの間で名前の衝突を起こすことです。


```fsharp
namespace Core.Utilities

module MathStuff = 
    let add x y  = x + y
    
namespace Core

// モジュールの完全修飾名は
// Core.Utilities  
// 上の名前空間と衝突！
module Utilities = 
    let add x y  = x + y
```


## モジュール内での型と関数の混在 ##

これまで見てきたように、モジュールは通常、データ型に対して働く関連する関数のセットで構成されています。

オブジェクト指向プログラムでは、データ構造とそれに対して働く関数はクラスにまとめられます。
しかし、関数型スタイルのF#では、データ構造とそれに対して働く関数は代わりにモジュールにまとめられます。

型と関数を一緒に混ぜる一般的なパターンには2つあります。

* 型を関数とは別に宣言する 
* 型を関数と同じモジュールで宣言する 

最初のアプローチでは、型はモジュールの*外*（ただし名前空間内）で宣言され、その型に対して働く関数は
同じような名前を持つモジュールに入れられます。

```fsharp
// トップレベルモジュール
namespace Example

// モジュールの外で型を宣言
type PersonType = {First:string; Last:string}

// 型に対して働く関数のモジュールを宣言
module Person = 

    // コンストラクタ
    let create first last = 
        {First=first; Last=last}

    // 型に対して働くメソッド
    let fullName {First=first; Last=last} = 
        first + " " + last

// テスト
let person = Person.create "john" "doe" 
Person.fullName person |> printfn "フルネーム=%s"
```

もう一つのアプローチでは、型はモジュールの*中*で宣言され、" `T` "やモジュールの名前などの単純な名前が与えられます。
したがって、関数は `MyModule.Func1` や `MyModule.Func2` のような名前でアクセスされ、型自体は
 `MyModule.T` のような名前でアクセスされます。以下に例を示します。

```fsharp
module Customer = 

    // Customer.Tはこのモジュールの主要な型です
    type T = {AccountId:int; Name:string}

    // コンストラクタ
    let create id name = 
        {T.AccountId=id; T.Name=name}

    // 型に対して働くメソッド
    let isValid {T.AccountId=id; } = 
        id > 0

// テスト
let customer = Customer.create 42 "bob" 
Customer.isValid customer |> printfn "有効ですか？=%b"
```

どちらの場合も、型の新しいインスタンスを作るコンストラクタ関数（いわばファクトリーメソッド）を用意すべきことに注意してください。
これにより、クライアントコードで型を明示的に名前指定する必要がほとんどなくなり、したがって、型がモジュール内にあるかどうかを気にする必要がなくなります！

では、どちらのアプローチを選ぶべきでしょうか？

* 前者のアプローチはより.NET的で、ライブラリを他の非F#コードと共有したい場合にずっと適しています。エクスポートされるクラス名が予想通りになるからです。
* 後者のアプローチは、他の関数型言語に慣れている人にとってはより一般的です。モジュール内の型はネストしたクラスにコンパイルされるので、相互運用性の観点からはあまり好ましくありません。

自分で使う分には、両方を試してみるのもいいでしょう。チームでプログラミングをする場合は、1つのスタイルを選んで一貫性を保つべきです。


### 型のみを含むモジュール

関連する関数なしで型のセットを宣言する必要がある場合は、モジュールを使う必要はありません。型を名前空間内に直接宣言し、ネストしたクラスを避けられます。

例えば、以下のように考えるかもしれません。

```fsharp
// トップレベルモジュール
module Example

// モジュール内で型を宣言
type PersonType = {First:string; Last:string}

// モジュールには関数はなく、型だけ...
```

そして、これを行う別の方法があります。 `module` キーワードが単に `namespace` に置き換えられています。

```fsharp
// 名前空間を使う 
namespace Example

// モジュールの外で型を宣言
type PersonType = {First:string; Last:string}
```

どちらの場合も、 `PersonType` は同じ完全修飾名を持つことになります。

これは型に対してのみ機能することに注意してください。関数は常にモジュール内にあらねばなりません。
