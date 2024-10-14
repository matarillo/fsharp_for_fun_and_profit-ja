---
layout: post
title: "型安全と高パフォーマンスをコンパイラディレクティブで切り替える"
description: "ケーキを手に入れて、しかもそれを食べる方法の実験"
categories: []
---

*TL;DR; **実験:** 開発時にはドメインモデリングに多くの型を導入し、その後、コンパイラディレクティブを用いて、効率的な実装に置き換えることで、パフォーマンスを向上できます。*

## ドメインモデリング vs パフォーマンス

私は[ドメインモデリングに型を多用](https://fsharpforfunandprofit.com/ddd/)することの、熱烈な支持者です。本当に*たくさんの*型を使います！

型はドキュメントとしての役割と、コンパイル時に制約を設ける役割の両方を担い、有効なデータのみが使われることを保証します。

たとえば、`CustomerId` と `OrderId` という2つの型を使う必要があるとします。それぞれを別の型として表現することで、

```fsharp
type CustomerId = CustomerId of int
type OrderId = OrderId of int
```

`CustomerId` が必要な場所で、誤って `OrderId` を使うのを防げます。

しかし、このように間接的な層を追加すると、パフォーマンスに影響が出る可能性があります。

* 間接参照によってデータアクセスが大幅に遅くなる可能性があります。
* ラッパークラスは追加のメモリを必要とし、メモリ不足を引き起こします。
* その結果、ガベージコレクターがより頻繁に起動し、マネージドコードにおけるパフォーマンス低下の原因となる可能性があります。

一般的に、設計段階ではこのような細かなパフォーマンスの違いについて、あまり気にしません。
入出力やアルゴリズムの選択など、パフォーマンスに *はるかに* 大きな影響を与える要素は他にたくさんあります。
そのため、実際の状況から切り離されたマイクロベンチマークを行うことは *全く* 推奨しません。

些細な問題を過度に心配するのではなく、常に現実のアプリケーションを、実際の使用状況でプロファイリングするべきです。

とは言うものの、これからマイクロベンチマークをいくつか実行してみます！

### ラッパー型のマイクロベンチマーク

大量のラッパー型を使った場合、パフォーマンスにどのような影響があるのか見てみましょう。今回は、以下の処理を行うことにします。

* 顧客IDを1,000万個作成する
* それらに対して2回マップ操作を行う
* それらをフィルタリングする

顧客IDに1を加算するという処理は、確かに少し馬鹿げています。後ほど、より現実的な例を見てみましょう。

ともかく、コードは次のとおりです。

```fsharp
// 型はプリミティブ型のラッパーです
type CustomerId = CustomerId of int

// マッピングとフィルタリングのための、2つの単純な関数を作成します
let add1ToCustomerId (CustomerId i) = 
    CustomerId (i+1)

let isCustomerIdSmall (CustomerId i) = 
    i < 100000

// ---------------------------------
// 100万要素の配列で時間を計測
// ---------------------------------
#time
Array.init 1000000 CustomerId
// マップ操作
|> Array.map add1ToCustomerId 
// 再度マップ操作
|> Array.map add1ToCustomerId 
// フィルタリング
|> Array.filter isCustomerIdSmall 
|> ignore
#time
```

*上記のコードサンプルは [GitHubで入手可能](https://gist.github.com/swlaschin/348b6b9e64d4b150cf86#file-typesafe-performance-with-compiler-directives-1-fsx) です。*

*(重ねてになりますが、これはコードのプロファイリングとしては非常に不適切な方法です！)*

典型的な実行結果は以下のようになります。

```text
Real: 00:00:00.296, CPU: 00:00:00.296, GC gen0: 6, gen1: 4, gen2: 0
```

つまり、これらの処理を実行するには約0.3秒かかり、かなりの量のガベージが生成され、4回のgen1 GCがトリガーされます。
「gen0」、「gen1」、「gen2」が何なのか分からない場合は、[こちらをご覧ください](https://msdn.microsoft.com/en-us/library/ms973837.aspx)。

* **免責事項:** すべてのベンチマークはF#インタラクティブで実行しています。最適化されたコンパイル済みコードは、全く異なるパフォーマンスプロファイルを持つ可能性があります。
過去のパフォーマンスは将来の結果を保証するものではありません。結論を導き出す際は、ご自身の責任において行ってください。などなど。*

配列のサイズを1,000万に増やすと、実行時間は10倍以上遅くなります。

```text
Real: 00:00:03.489, CPU: 00:00:03.541, GC gen0: 68, gen1: 46, gen2: 2
```

つまり、これらの処理を実行するには約3.5秒かかり、非常に大量のガベージが生成され、深刻な問題を引き起こすgen2 GCも何回か発生しています。
場合によっては、「メモリ不足」例外が発生し、F#インタラクティブを再起動しなければならないこともあります！

では、ラッパー型を使う以外にどのような方法があるのでしょうか？ 一般的なアプローチとしては、以下の2つがあります。

* 型エイリアスを使う
* 測定単位を使う

まずは、型エイリアスから見ていきましょう。

## 型エイリアスを使う

型エイリアスのアプローチでは、ラッパー型を使わずに、型をドキュメントとしてのみ使います。

```fsharp
type CustomerId = int
type OrderId = int
```

型をドキュメントとして使う場合、関数に適切な注釈を付ける必要があります。

たとえば、以下の `add1ToCustomerId` では、パラメータと戻り値の両方に注釈を付けて、
型が `int -> int` ではなく `CustomerId -> CustomerId` になるようにしています。

```fsharp
let add1ToCustomerId (id:CustomerId) :CustomerId = 
    id+1
```

### 型エイリアスのマイクロベンチマーク

別のマイクロベンチマークを作成してみましょう。

```fsharp
type CustomerId = int

// マッピングとフィルタリングのための、2つの単純な関数を作成します
let add1ToCustomerId (id:CustomerId) :CustomerId = 
    id+1
// val add1ToCustomerId : id:CustomerId -> CustomerId

let isCustomerIdSmall (id:CustomerId) = 
    id < 100000
// val isCustomerIdSmall : id:CustomerId -> bool

// ---------------------------------
// 100万要素の配列で時間を計測
// ---------------------------------
#time
Array.init 1000000 (fun i -> i)
// マップ操作
|> Array.map add1ToCustomerId 
// 再度マップ操作
|> Array.map add1ToCustomerId 
// フィルタリング
|> Array.filter isCustomerIdSmall 
|> Array.length
#time
```

*上記のコードサンプルは [GitHubで入手可能](https://gist.github.com/swlaschin/348b6b9e64d4b150cf86#file-typesafe-performance-with-compiler-directives-2-fsx) です。*

結果は驚くほど向上しました！

```text
Real: 00:00:00.017, CPU: 00:00:00.015, GC gen0: 0, gen1: 0, gen2: 0
```

これらの処理を実行するのにかかる時間は約17ミリ秒で、さらに重要なのは、生成されるガベージがほとんどないことです。

配列サイズを1,000万に増やしても、実行時間は10倍遅くなるだけで、ガベージは生成されません。

```text
Real: 00:00:00.166, CPU: 00:00:00.156, GC gen0: 0, gen1: 0, gen2: 0
```

3秒以上かかっていた以前のバージョンと比べると、これは素晴らしいことです。

### 型エイリアスの問題点

残念なことに、型エイリアスを使うと、型安全性が完全に失われてしまいます。

これを示すために、`CustomerId` と `OrderId` を作成するコードを以下に示します。

```fsharp
type CustomerId = int
type OrderId = int

// 2つ作成します
let cid : CustomerId = 12
let oid : OrderId = 12
```

悲しいことに、2つのIDは等しいと判定され、コンパイラからエラーが出ることなく、`CustomerId` を期待する関数に `OrderId` を渡すことができます。

```fsharp
cid = oid              // true

// CustomerId を期待する関数に OrderId を渡します
add1ToCustomerId oid   // CustomerId = 13
```

これは、あまり良い状況ではありませんね。次はどうすればいいのでしょうか？

## 測定単位を使う

もう1つの一般的な方法は、測定単位を使って2つの型を区別することです。

```fsharp
type [<Measure>] CustomerIdUOM 
type [<Measure>] OrderIdUOM 

type CustomerId = int<CustomerIdUOM>
type OrderId = int<OrderIdUOM>
```

`CustomerId` と `OrderId` は、それぞれ異なる型として定義されています。しかし、測定単位の情報は実行時には消去されるため、JITコンパイラからはプリミティブな `int` 型として認識されます。

実際に時間を計測してみると、このことが分かります。

```fsharp
// マッピングとフィルタリングを行う単純な関数を2つ定義する
let add1ToCustomerId id  = 
    id+1<CustomerIdUOM>

let isCustomerIdSmall i = 
    i < 100000<CustomerIdUOM>

// ---------------------------------
// 100万要素の配列で時間を計測する
// ---------------------------------
#time
Array.init 1000000 (fun i -> LanguagePrimitives.Int32WithMeasure<CustomerIdUOM> i)
// マッピングする
|> Array.map add1ToCustomerId 
// 再度マッピングする
|> Array.map add1ToCustomerId 
// フィルタリングする
|> Array.filter isCustomerIdSmall 
|> ignore
#time
```

*上記のコードサンプルは [GitHubで入手可能](https://gist.github.com/swlaschin/348b6b9e64d4b150cf86#file-typesafe-performance-with-compiler-directives-3-fsx) です。*

典型的な計測結果は以下のようになります。

```text
Real: 00:00:00.022, CPU: 00:00:00.031, GC gen0: 0, gen1: 0, gen2: 0
```

この結果から、コードの実行速度が非常に高速 (22ミリ秒) であること、そして重要な点として、ガベージがほとんど生成されていないことが分かります。

配列サイズを1,000万に増やした場合でも、(型エイリアスのアプローチと同様に) 高いパフォーマンスを維持し、ガベージは発生しません。

```text
Real: 00:00:00.157, CPU: 00:00:00.156, GC gen0: 0, gen1: 0, gen2: 0
```

### 測定単位を使う上での問題点

測定単位を使うことの利点は、`CustomerId` 型と `OrderId` 型に互換性がないため、型安全性を確保できることです。

しかし、美的観点からは、私は満足できません。ラッパー型の方が好みです。

また、測定単位は本来、数値と組み合わせて使うことを意図しています。たとえば、顧客IDと注文IDを作成してみましょう。

```fsharp
let cid = 12<CustomerIdUOM>
let oid = 4<OrderIdUOM>
```

ここで、CustomerId(12) を OrderId(4) で割ると 3 になります。

```fsharp
let ratio = cid / oid
// val ratio : int<CustomerIdUOM/OrderIdUOM> = 3
```

しかし、この 3 という値は何を表しているのでしょうか？ 顧客ID 3 つにつき注文ID 1 つ？ 意味が分かりません。

もちろん、実際にはこのような状況は起こり得ないでしょう。しかし、それでも私は気になってしまうのです。

## コンパイラディレクティブを使って両方の長所を活かす

ラッパー型への強い思い入れは、先ほどもお伝えしたとおりです。しかし、運用システムで大量のGCが発生し、パフォーマンスが低下していると報告を受けたことで、その思いは揺らいでしまいました。

では、型安全なラッパー型と高速なパフォーマンス、両方の長所を活かすことはできないのでしょうか？

開発中やビルド中に追加の作業を許容できるのであれば、可能です。

「ラッパー型」の実装と「型エイリアス」の実装の両方を用意し、コンパイラディレクティブに基づいて切り替えるという方法があります。

これを実現するには、以下の2点が必要です。

* 型に直接アクセスするのではなく、関数とパターンマッチングのみを介してアクセスするようにコードを修正する。
* 「コンストラクタ」、複数の「ゲッター」、そしてパターンマッチングのためにアクティブパターンを実装した「型エイリアス」実装を作成する。

`COMPILED` ディレクティブと `INTERACTIVE` ディレクティブを使って、対話的に操作できる例を以下に示します。
実際のコードでは、`FASTTYPES` などの独自のディレクティブを使うことになるでしょう。

```fsharp
#if COMPILED  // エイリアス版を使う場合はコメントを外す   
//#if INTERACTIVE // ラッパー版を使う場合はコメントを外す

// プリミティブ型のラッパーとして型を定義する
type CustomerId = CustomerId of int

// コンストラクタ
let createCustomerId i = CustomerId i

// データを取得するための関数
let customerIdValue (CustomerId i) = i

// パターンマッチング
// 不要

#else
// プリミティブ型のエイリアスとして型を定義する
type CustomerId = int

// コンストラクタ
let inline createCustomerId i :CustomerId = i

// データを取得するための関数
let inline customerIdValue (id:CustomerId) = id

// パターンマッチング
let inline (|CustomerId|) (id:CustomerId) :int = id

#endif
```

どちらのバージョンでも、コンストラクタ `createCustomerId` とゲッター `customerIdValue` を作成しています。また、型エイリアスバージョンには、`CustomerId` と同様に動作するアクティブパターンを作成しています。

このコードにより、実装を意識することなく `CustomerId` を使えます。

```fsharp
// ゲッターのテスト
let testGetter c1 c2 =
    let i1 = customerIdValue c1
    let i2 = customerIdValue c2
    printfn "Get inner value from customers %i %i" i1 i2
// シグネチャは期待どおりです。
// c1:CustomerId -> c2:CustomerId -> unit

// パターンマッチングのテスト
let testPatternMatching c1 =
    let (CustomerId i) = c1
    printfn "Get inner value from Customers via pattern match: %i" i

    match c1 with
    | CustomerId i2 -> printfn "match/with %i" i
// シグネチャは期待どおりです
// c1:CustomerId -> unit

let test() = 
    // 2つのIDを作成する
    let c1 = createCustomerId 1
    let c2 = createCustomerId 2
    let custArray : CustomerId [] = [| c1; c2 |]
    
    // テストする
    testGetter c1 c2 
    testPatternMatching c1 
```

これで、*同じ*マイクロベンチマークを両方の実装で実行できます。

```fsharp
// マッピングとフィルタリングを行う単純な関数を2つ定義する
let add1ToCustomerId (CustomerId i) = 
    createCustomerId (i+1)

let isCustomerIdSmall (CustomerId i) = 
    i < 100000

// ---------------------------------
// 100万要素の配列で時間を計測する
// ---------------------------------
#time
Array.init 1000000 createCustomerId
// マッピングする
|> Array.map add1ToCustomerId 
// 再度マッピングする
|> Array.map add1ToCustomerId 
// フィルタリングする
|> Array.filter isCustomerIdSmall 
|> Array.length
#time
```

*上記のコードサンプルは [GitHubで入手可能](https://gist.github.com/swlaschin/348b6b9e64d4b150cf86#file-typesafe-performance-with-compiler-directives-4-fsx) です。*

結果は、前の例と同様です。エイリアス版の方がはるかに高速で、GCへの負荷もありません。

```text
// ラッパー版を使った結果
Real: 00:00:00.408, CPU: 00:00:00.405, GC gen0: 7, gen1: 4, gen2: 1

// エイリアス版を使った結果
Real: 00:00:00.022, CPU: 00:00:00.031, GC gen0: 0, gen1: 0, gen2: 0
```

1,000万要素版の結果は以下のとおりです。

```text
// ラッパー版を使った結果
Real: 00:00:03.199, CPU: 00:00:03.354, GC gen0: 67, gen1: 45, gen2: 2

// エイリアス版を使った結果
Real: 00:00:00.239, CPU: 00:00:00.202, GC gen0: 0, gen1: 0, gen2: 0
```

### より複雑な例

単純なラッパー型よりも複雑な型が必要になる場面は少なくありません。

たとえば、空文字を許容せず "@" を含むように制限された `EmailAddress` 型や、
メールアドレスと訪問回数を保持する `Activity` レコードのような型を定義したい場合があります。

```fsharp
module EmailAddress =
    // private コンストラクタを持つ型
    type EmailAddress = private EmailAddress of string

    // 安全なコンストラクタ
    let create s = 
        if System.String.IsNullOrWhiteSpace(s) then 
            None
        else if s.Contains("@") then
            Some (EmailAddress s)
        else
            None

    // データを取得する
    let value (EmailAddress s) = s

module ActivityHistory =
    open EmailAddress
    
    // private コンストラクタを持つ型
    type ActivityHistory = private {
        emailAddress : EmailAddress
        visits : int
        }

    // 安全なコンストラクタ
    let create email visits = 
        {emailAddress = email; visits = visits }

    // データを取得する
    let email {emailAddress=e} = e
    let visits {visits=a} = a
```

上記のように、各型にコンストラクタとフィールド値を取得するためのゲッターを定義します。

*注記: 通常、型はモジュールの外で定義しますが、ここではコンストラクタを private にする必要があるため、
型をモジュール内に配置し、モジュールと型に同じ名前を付けています。
もし違和感があるなら、モジュール名と型名を別にするか、OCaml の慣例に従ってモジュール内の主要な型を "T" とすることで、`EmailAddress.T` のように型名にアクセスしてもいいでしょう。*

パフォーマンスを向上させるために、`EmailAddress` を型エイリアスに、`Activity` を構造体に置き換えてみましょう。

```fsharp
module EmailAddress =

    // エイリアス型
    type EmailAddress = string

    // 安全なコンストラクタ
    let inline create s :EmailAddress option = 
        if System.String.IsNullOrWhiteSpace(s) then 
            None
        else if s.Contains("@") then
            Some s
        else
            None

    // データを取得する
    let inline value (e:EmailAddress) :string = e

module ActivityHistory =
    open EmailAddress
    
    [<Struct>]
    type ActivityHistory(emailAddress : EmailAddress, visits : int) = 
        member this.EmailAddress = emailAddress 
        member this.Visits = visits 

    // 安全なコンストラクタ
    let create email visits = 
        ActivityHistory(email,visits)

    // データを取得する
    let email (act:ActivityHistory) = act.EmailAddress
    let visits (act:ActivityHistory) = act.Visits

```

このバージョンでは、コンストラクタと各フィールドのゲッターを再実装しています。
`ActivityHistory` のフィールド名を構造体版でもレコード版と同じにすることもできましたが、構造体の場合は型推論が機能しなくなります。
フィールド名を異なるものにすることで、ユーザーはドット演算子ではなくゲッター関数を使うように強制されます。

どちらの実装も "API" は同じなので、両方で動作するコードを作成できます。

```fsharp
let rand = new System.Random()

let createCustomerWithRandomActivityHistory() = 
    let emailOpt = EmailAddress.create "abc@example.com"
    match emailOpt with
    | Some email  -> 
        let visits = rand.Next(0,100) 
        ActivityHistory.create email visits 
    | None -> 
        failwith "should not happen"

let add1ToVisits activity = 
    let email = ActivityHistory.email activity
    let visits = ActivityHistory.visits activity 
    ActivityHistory.create email (visits+1)

let isCustomerInactive activity = 
    let visits = ActivityHistory.visits activity 
    visits < 3

    
// 大量のレコードに対して作成と反復を実行する
let mapAndFilter noOfRecords = 
    Array.init noOfRecords (fun _ -> createCustomerWithRandomActivity() )
    // マップする
    |> Array.map add1ToVisits 
    // 再度マップする
    |> Array.map add1ToVisits 
    // フィルターする
    |> Array.filter isCustomerInactive 
    |> ignore  // 実際には気にしません!
```

### このアプローチの長所と短所

このアプローチの利点は、自己修正型であるということです。API の正しい使い方を強制できます。

たとえば、`ActivityHistory` レコードにドット演算子で直接アクセスしていたる場合、
コンパイラディレクティブが有効になって構造体の実装が使われると、そのコードは動作しなくなります。

もちろん、API を強制するためにシグネチャファイルを作成することもできます。

欠点としては、`{rec with ...}` などの便利な構文の一部が使えなくなることが挙げられます。
しかし、この手法は小さなレコード（2～3フィールド）にのみ使うべきなので、`with` が使えないことは大きな問題ではありません。

### 2つの実装のタイミング

今回は `#time` を使う代わりに、関数を10回実行し、各実行で使われた GC とメモリを出力するカスタムタイマーを作成しました。

```fsharp
/// 関数 f を countN 回繰り返し実行し、
/// 経過時間、GC の回数、合計メモリの変化を出力します
let time countN label f  = 

    let stopwatch = System.Diagnostics.Stopwatch()
    
    // 開始時に完全な GC を実行しますが、その後は実行しません
    // 各反復でガベージを収集できるようにします
    System.GC.Collect()  
    printfn "Started"         

    let getGcStats() = 
        let gen0 = System.GC.CollectionCount(0)
        let gen1 = System.GC.CollectionCount(1)
        let gen2 = System.GC.CollectionCount(2)
        let mem = System.GC.GetTotalMemory(false)
        gen0,gen1,gen2,mem


    printfn "======================="         
    printfn "%s (%s)" label WrappedOrAliased
    printfn "======================="         
    for iteration in [1..countN] do
        let gen0,gen1,gen2,mem = getGcStats()
        stopwatch.Restart() 
        f()
        stopwatch.Stop() 
        let gen0',gen1',gen2',mem' = getGcStats()
        // 使われたメモリを K に変換します
        let changeInMem = (mem'-mem) / 1000L
        printfn "#%2i elapsed:%6ims gen0:%3i gen1:%3i gen2:%3i mem:%6iK" iteration stopwatch.ElapsedMilliseconds (gen0'-gen0) (gen1'-gen1) (gen2'-gen2) changeInMem 
```

*上記のコードサンプルは [GitHubで入手可能](https://gist.github.com/swlaschin/348b6b9e64d4b150cf86#file-typesafe-performance-with-compiler-directives-5-fsx) です。*

配列に100万レコードを持つ `mapAndFilter` を実行してみましょう。

```fsharp
let size = 1000000
let label = sprintf "mapAndFilter: %i records" size 
time 10 label (fun () -> mapAndFilter size)
```
 
実行結果は次のとおりです。
 
```text
=======================
mapAndFilter: 1000000 records (Wrapped)
=======================
# 1 elapsed:   820ms gen0: 13 gen1:  8 gen2:  1 mem: 72159K
# 2 elapsed:   878ms gen0: 12 gen1:  7 gen2:  0 mem: 71997K
# 3 elapsed:   850ms gen0: 12 gen1:  6 gen2:  0 mem: 72005K
# 4 elapsed:   885ms gen0: 12 gen1:  7 gen2:  0 mem: 72000K
# 5 elapsed:  6690ms gen0: 16 gen1: 10 gen2:  1 mem:-216005K
# 6 elapsed:   714ms gen0: 12 gen1:  7 gen2:  0 mem: 72003K
# 7 elapsed:   668ms gen0: 12 gen1:  7 gen2:  0 mem: 71995K
# 8 elapsed:   670ms gen0: 12 gen1:  7 gen2:  0 mem: 72001K
# 9 elapsed:  6676ms gen0: 16 gen1: 11 gen2:  2 mem:-215998K
#10 elapsed:   712ms gen0: 13 gen1:  7 gen2:  0 mem: 71998K

=======================
mapAndFilter: 1000000 records (Aliased)
=======================
# 1 elapsed:   193ms gen0:  7 gen1:  0 gen2:  0 mem: 25325K
# 2 elapsed:   142ms gen0:  8 gen1:  0 gen2:  0 mem: 23779K
# 3 elapsed:   143ms gen0:  8 gen1:  0 gen2:  0 mem: 23761K
# 4 elapsed:   138ms gen0:  8 gen1:  0 gen2:  0 mem: 23745K
# 5 elapsed:   135ms gen0:  7 gen1:  0 gen2:  0 mem: 25327K
# 6 elapsed:   135ms gen0:  8 gen1:  0 gen2:  0 mem: 23762K
# 7 elapsed:   137ms gen0:  8 gen1:  0 gen2:  0 mem: 23755K
# 8 elapsed:   140ms gen0:  8 gen1:  0 gen2:  0 mem: 23777K
# 9 elapsed:   174ms gen0:  7 gen1:  0 gen2:  0 mem: 25327K
#10 elapsed:   180ms gen0:  8 gen1:  0 gen2:  0 mem: 23762K
```

このコードはもはや値型のみで構成されてはいないため、プロファイリングの結果は複雑になります。
`mapAndFilter` 関数は `createCustomerWithRandomActivity` 関数を使い、この関数は参照型である `Option` 型を使うため、多数の参照型が割り当てられることになります。
現実世界と同じように、プログラムにおいても物事を完全に純粋に保つことは困難です。

そうは言っても、ラッパー型のバージョンはエイリアス型バージョンよりも実行速度が遅く（約 800ms 対 150ms）、各反復でより多くのガベージを生成し（約 72MB 対 24MB）、さらに重要な点として、2 回の大きな GC 一時停止（5 回目と 9 回目の反復）が発生します。
一方、エイリアス型のバージョンでは Gen1 GC さえ発生せず、Gen2 GC は言うまでもありません。

*注記: エイリアス型バージョンがメモリを消費しているにもかかわらず、Gen1 GC が発生しないという事実は、これらの数値の信頼性を疑わせるものです。
F# インタラクティブ環境以外で実行した場合、異なる結果になる可能性があります。*

### レコード型以外の場合

最適化したい型が、レコードではなく判別共用体 (DU) である場合はどうすれば良いでしょうか？

ここでは、判別共用体を、各ケースに対応するタグと、すべてのデータに対応するフィールドを持つ構造体に変換することを提案します。

例として、ある `Activity` を `Active` と `Inactive` に分類する判別共用体があるとします。
`Active` の場合はメールアドレスと訪問回数を保存し、`Inactive` の場合はメールアドレスのみを保存します。
 
```fsharp
module Classification =
    open EmailAddress
    open ActivityHistory

    type Classification = 
        | Active of EmailAddress * int
        | Inactive of EmailAddress 

    // コンストラクタ
    let createActive email visits = 
        Active (email,visits)
    let createInactive email = 
        Inactive email

    // パターンマッチング
    // 不要
```

これを構造体に変換すると、次のようになります。

```fsharp
module Classification =
    open EmailAddress
    open ActivityHistory
    open System

    [<Struct>]
    type Classification(isActive : bool, email: EmailAddress, visits: int) = 
        member this.IsActive = isActive 
        member this.Email = email
        member this.Visits = visits

    // コンストラクタ
    let inline createActive email visits = 
        Classification(true,email,visits)
    let inline createInactive email = 
        Classification(false,email,0)

    // パターンマッチング
    let inline (|Active|Inactive|) (c:Classification) = 
        if c.IsActive then 
            Active (c.Email,c.Visits)
        else
            Inactive (c.Email)
```

`Inactive` の場合は `Visits` が使われないため、デフォルト値に設定されていることに注意してください。

次に、アクティビティ履歴を分類し、`Classification` を作成して、アクティブな顧客のメールアドレスのみをフィルタリングして抽出する関数を示します。

```fsharp
open Classification

let createClassifiedCustomer activity = 
    let email = ActivityHistory.email activity
    let visits = ActivityHistory.visits activity 

    if isCustomerInactive activity then 
        Classification.createInactive email 
    else
        Classification.createActive email visits 

// 大量のレコードに対して作成と反復処理を実行する
let extractActiveEmails noOfRecords =
    Array.init noOfRecords (fun _ -> createCustomerWithRandomActivityHistory() )
    // 分類にマッピングする
    |> Array.map createClassifiedCustomer
    // アクティブな顧客のメールアドレスを抽出する
    |> Array.choose (function
        | Active (email,visits) -> email |> Some
        | Inactive _ -> None )
    |> ignore
```

*上記のコードサンプルは [GitHubで入手可能](https://gist.github.com/swlaschin/348b6b9e64d4b150cf86#file-typesafe-performance-with-compiler-directives-5-fsx) です。*

2つの実装でこの関数をプロファイリングした結果は次のとおりです。
 
```text
=======================
extractActiveEmails: 1000000 records (Wrapped)
=======================
# 1 elapsed:   664ms gen0: 12 gen1:  6 gen2:  0 mem: 64542K
# 2 elapsed:   584ms gen0: 14 gen1:  7 gen2:  0 mem: 64590K
# 3 elapsed:   589ms gen0: 13 gen1:  7 gen2:  0 mem: 63616K
# 4 elapsed:   573ms gen0: 11 gen1:  5 gen2:  0 mem: 69438K
# 5 elapsed:   640ms gen0: 15 gen1:  7 gen2:  0 mem: 58464K
# 6 elapsed:  4297ms gen0: 13 gen1:  7 gen2:  1 mem:-256192K
# 7 elapsed:   593ms gen0: 14 gen1:  7 gen2:  0 mem: 64623K
# 8 elapsed:   621ms gen0: 13 gen1:  7 gen2:  0 mem: 63689K
# 9 elapsed:   577ms gen0: 11 gen1:  5 gen2:  0 mem: 69415K
#10 elapsed:   609ms gen0: 15 gen1:  7 gen2:  0 mem: 58480K

=======================
extractActiveEmails: 1000000 records (Aliased)
=======================
# 1 elapsed:   254ms gen0: 32 gen1:  1 gen2:  0 mem: 33162K
# 2 elapsed:   221ms gen0: 33 gen1:  0 gen2:  0 mem: 31532K
# 3 elapsed:   196ms gen0: 32 gen1:  0 gen2:  0 mem: 33113K
# 4 elapsed:   185ms gen0: 33 gen1:  0 gen2:  0 mem: 31523K
# 5 elapsed:   187ms gen0: 33 gen1:  0 gen2:  0 mem: 31532K
# 6 elapsed:   186ms gen0: 32 gen1:  0 gen2:  0 mem: 33095K
# 7 elapsed:   191ms gen0: 33 gen1:  0 gen2:  0 mem: 31514K
# 8 elapsed:   200ms gen0: 32 gen1:  0 gen2:  0 mem: 33096K
# 9 elapsed:   189ms gen0: 33 gen1:  0 gen2:  0 mem: 31531K
#10 elapsed:  3732ms gen0: 33 gen1:  1 gen2:  1 mem:-256432K
```

エイリアス/構造体バージョンの方が高速で、生成されるガベージも少ないことがわかります。そのため、パフォーマンスの点で優れています。（ただし、最後にガベージコレクションによる一時停止が発生しました。）

## 質問

### 2つの実装を作成するのは大変な作業ではありませんか？

はい、その通りです。*一般的に、この方法を採用すべきではない* と考えています。これは、私自身が行った実験にすぎません。

レコードと判別共用体を構造体に変換することは、他のすべてのボトルネックを排除した後の最後の手段としてのみ行うことをお勧めします。

ただし、速度とメモリ消費量が非常に重要な特殊なケースも存在するかもしれません。そのような場合は、このような方法を試す価値があるかもしれません。

### デメリットは何ですか？

追加の作業やメンテナンスに加えて、何かデメリットはあるのでしょうか？

型は本質的にプライベートになるため、 `{rec with ...}` など、型の内部にアクセスできる場合に利用できる便利な構文の一部が失われてしまいます。
しかし、前述のように、この手法は小さなレコードにのみ使うべきです。

さらに重要なのは、構造体のような値型は万能薬ではないということです。値型には、それ自体に問題があります。

たとえば、値渡しのため、引数として渡されるときに速度が低下する可能性があります。また、[暗黙的にボックス化](https://theburningmonk.com/2015/07/beware-of-implicit-boxing-of-value-types/) しないように注意する必要があります。
ボックス化してしまうと、メモリ割り当てが発生し、ガベージが作成されてしまいます。Microsoft は [クラスと構造体の使用に関するガイドライン](https://msdn.microsoft.com/en-us/library/ms229017.aspx) を提供していますが、
[これらのガイドラインに反する解説](https://stackoverflow.com/a/6973171/1136133) や [これらのルール](https://stackoverflow.com/a/598268/1136133) も参考になるでしょう。


### シャドウイングを使うのはどうでしょうか？

シャドウイングは、クライアントが別の実装を使いたい場合に利用されます。
たとえば、[Checked モジュール](https://msdn.microsoft.com/en-us/library/ee340296.aspx) をオープンすれば、チェックされていない算術演算からチェックされた算術演算に切り替えることができます。
[詳細はこちら](https://theburningmonk.com/2012/01/checked-context-in-c-and-f/)。

しかし、今回のケースではシャドウイングは有効ではありません。各クライアントが、どのバージョンの型を使うかを決定するのは望ましくありません。
さまざまな非互換性の問題が発生する可能性があります。また、これはモジュールごとの決定ではなく、デプロイメントコンテキストに基づいた決定です。

### より高性能なコレクション型はどうでしょうか？

コレクション型として、すべての箇所で `array` を使っています。
他の高性能なコレクションを使いたい場合は、[FSharpx.Collections](https://fsprojects.github.io/FSharpx.Collections/) または [Funq collections](https://github.com/GregRos/Funq) を調べてみてください。

### メモリ割り当て、マッピング、フィルタリングが混在しています。より詳細な分析をしてみては？

マイクロベンチマークは良くないと述べた手前、体裁を保とうとしています。

そのため、意図的にさまざまな処理を組み合わせたケースを作成し、各部分を個別にベンチマークするのではなく、全体として測定しました。
実際の使用シナリオは明らかに異なるため、さらに深く掘り下げる必要はないと考えます。

また、すべてのベンチマークを F# インタラクティブで行っています。最適化されたコンパイル済みコードは、まったく異なるパフォーマンスプロファイルを持つ可能性があります。

### 他にパフォーマンスを向上させる方法はありますか？

F# は .NET 言語なので、C# のパフォーマンスに関するヒントは F# にも有効です。標準的なものとしては、次のようなものがあります。

* **すべての I/O 処理を非同期にする。** 可能な場合は、ランダムアクセス I/O よりもストリーミング I/O を使うようにしましょう。リクエストはバッチ処理するのが効果的です。
* **アルゴリズムを見直す。** 計算量が *O(n log(n))* よりも悪い場合は、改善の余地があると考えられます。
* **同じ処理を繰り返さない。** 必要に応じてキャッシュを活用しましょう。
* **CPU キャッシュを効率的に利用する。** オブジェクトは連続したメモリ領域に配置し、参照（ポインタ）チェーンが深くなりすぎないようにすることで、CPU キャッシュに効率よくデータを保持できます。具体的には、リストの代わりに配列を使ったり、参照型の代わりに値型を使ったりすることが有効です。
* **メモリ割り当てを最小限に抑える。** メモリ割り当てを減らすことで、GCの負荷を軽減できます。具体的には、gen0 GCで回収されず、長期間存続するようなオブジェクトの生成を避けることが重要です。

念のため、私は .NET のパフォーマンスとガベージコレクションの専門家ではないことを明記しておきます。もし、この分析に何か問題があれば、ぜひご指摘ください！

参考になった資料を以下に示します。

* Ben Watson著 [Writing High-Performance .NET Code](https://www.writinghighperf.net/)
* Martin Thompsonによるパフォーマンスに関する素晴らしい[ブログ](https://mechanical-sympathy.blogspot.jp/2012/08/memory-access-patterns-are-important.html)
  [Top 10 Performance Folklore](https://www.infoq.com/presentations/top-10-performance-myths) などの優れたビデオもあります。
  ([ここでの要約](https://weronikalabaj.com/performance-myths-and-facts/)が良いです。)
* Gil Teneによるビデオ、[Understanding Latency](https://www.youtube.com/watch?v=9MKY4KypBzg)。
* MicrosoftのDustin Cambellによるビデオ、[Essential Truths Everyone Should Know about Performance in a Large Managed Codebase](https://channel9.msdn.com/Events/TechEd/NorthAmerica/2013/DEV-B333)。
* 特にF#については、以下を参照してください。
  * Yan Cuiによる [レコードと構造体](https://theburningmonk.com/2011/10/fsharp-performance-test-structs-vs-records/) および [メモリレイアウト](https://theburningmonk.com/2015/07/smallest-net-ref-type-is-12-bytes-or-why-you-should-consider-using-value-types) に関するブログ記事。
  * Jon Harropによる [この記事](https://flyingfrogblog.blogspot.co.uk/2012/06/are-functional-languages-inherently.html) などの優れた記事が多数ありますが、一部は有料です。
  * ビデオ: Jack Pappasによる [High Performance F# in .NET and on the GPU](https://vimeo.com/33699102)。音質は悪いですが、スライドと議論は良いです！
  * fsharp.orgの [数学と統計のリソース](https://fsharp.org/guides/math-and-statistics/)

## まとめ

> 「クリーンに保ち、シンプルに保ち、エレガントであることを目指す。」
> -- *Martin Thompson*

これは、ケーキを手に入れて、それを食べることができるかどうかを確認するためのちょっとした実験でした。多くの型を使ったドメインモデリングですが、必要に応じてエレガントな方法でパフォーマンスを得ることができます。

これは非常に優れたソリューションだと思いますが、前述のように、この最適化（および醜くすること）は、
何百万回も割り当てられる、使用頻度の高い少数の型にのみ必要です。

最後に、このアプローチを大規模な本番システムで自分で使ったことはありません（必要がなかったため）。
現場の人々が何をしているのか、フィードバックをいただければ幸いです。

*この記事で使われているコードサンプルは [GitHubで入手可能](https://gist.github.com/swlaschin/348b6b9e64d4b150cf86) です。*