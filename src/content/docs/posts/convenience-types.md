---
layout: post
title: '型に関する既定のふるまい'
description: "不変性とコーディング不要の組み込み等価性"
nav: why-use-fsharp
seriesId: "F# を使う理由"
seriesOrder: 14
categories: ["利便性", "型"]
---

F#の素晴らしい点の1つは、ほとんどの型が「すぐに使える」便利な動作を最初から持っていることです。たとえば、不変性や組み込みの等価性機能などがあり、これらはC#では明示的にコーディングする必要があることが多いです。

ここで言う「ほとんどの」F#の型とは、タプル、レコード、ユニオン、オプション、リストなどの主要な「構造的」な型のことです。クラスやその他の型は.NETとの統合を助けるために追加されていますが、構造的な型の力の一部を失っています。

これらの主要な型に対する組み込み機能には以下のものがあります：

* 不変性
* デバッグ時の見やすい表示
* 等価性
* 比較

これらについて以下で詳しく説明します。

## F#の型には組み込みの不変性がある

C#やJavaでは、可能な限り不変クラスを作成することが良い習慣となっています。F#では、これが自動的に手に入ります。

F#での不変型の例：
```fsharp
type PersonalName = {FirstName:string; LastName:string}
```

同じ型をC#で通常コーディングする方法：

```csharp
class ImmutablePersonalName
{
    public ImmutablePersonalName(string firstName, string lastName)
    {
        this.FirstName = firstName;
        this.LastName = lastName;
    }

    public string FirstName { get; private set; }
    public string LastName { get; private set; }
}
```

F#の1行で済むことを、C#では10行もかけて行っています。

## ほとんどのF#の型には組み込みの見やすい表示がある

F#では、ほとんどの型で `ToString()` をオーバーライドする必要がありません。見やすい表示が自動的に手に入ります！

これは、おそらく以前の例を実行したときにすでに見たことがあるでしょう。ここでもう一つ簡単な例を示します：

```fsharp
type USAddress = 
   {Street:string; City:string; State:string; Zip:string}
type UKAddress = 
   {Street:string; Town:string; PostCode:string}
type Address = US of USAddress | UK of UKAddress
type Person = 
   {Name:string; Address:Address}

let alice = {
   Name="Alice"; 
   Address=US {Street="123 Main";City="LA";State="CA";Zip="91201"}}
let bob = {
   Name="Bob"; 
   Address=UK {Street="221b Baker St";Town="London";PostCode="NW1 6XE"}} 

printfn "Alice is %A" alice
printfn "Bob is %A" bob
```

出力は以下のようになります：

```fsharp
Alice is {Name = "Alice";
 Address = US {Street = "123 Main";
               City = "LA";
               State = "CA";
               Zip = "91201";};}
```

## ほとんどのF#の型には組み込みの構造的等価性がある

C#では、オブジェクト間の等価性をテストするために `IEquatable` インターフェースを実装することがよく必要となります。これはたとえば、オブジェクトをDictionaryのキーとして使用する場合に必要です。

F#では、ほとんどのF#の型でこれが自動的に手に入ります。たとえば、上記の `PersonalName` 型を使用して、すぐに2つの名前を比較できます。

```fsharp
type PersonalName = {FirstName:string; LastName:string}
let alice1 = {FirstName="Alice"; LastName="Adams"}
let alice2 = {FirstName="Alice"; LastName="Adams"}
let bob1 = {FirstName="Bob"; LastName="Bishop"}

//テスト
printfn "alice1=alice2 is %A" (alice1=alice2)
printfn "alice1=bob1 is %A" (alice1=bob1)
```


## ほとんどのF#の型は自動的に比較可能

C#では、オブジェクトをソートするために `IComparable` インターフェースを実装することがよく必要となります。。

ここでもF#では、ほとんどのF#の型でこれが自動的に手に入ります。たとえば、以下はトランプのデッキの簡単な定義です。

```fsharp

type Suit = Club | Diamond | Spade | Heart
type Rank = Two | Three | Four | Five | Six | Seven | Eight 
            | Nine | Ten | Jack | Queen | King | Ace
```


比較ロジックをテストする関数を書くことができます：

```fsharp
let compareCard card1 card2 = 
    if card1 < card2 
    then printfn "%A is greater than %A" card2 card1 
    else printfn "%A is greater than %A" card1 card2 
```

そして、それがどのように機能するか見てみましょう：

```fsharp
let aceHearts = Heart, Ace
let twoHearts = Heart, Two
let aceSpades = Spade, Ace

compareCard aceHearts twoHearts 
compareCard twoHearts aceSpades
```

ハートのエースは自動的にハートの2より大きくなることに注目してください。これは、「Ace」のランク値が「Two」のランク値の後に来るためです。

しかし、ハートの2はスペードのエースより自動的に大きくなることにも注目してください。これは、スート（マーク）部分が最初に比較され、「Heart」のスート値が「Spade」の値の後に来るためです。

以下は手札の例です：

```fsharp
let hand = [ Club,Ace; Heart,Three; Heart,Ace; 
             Spade,Jack; Diamond,Two; Diamond,Ace ]

//即座にソート！
List.sort hand |> printfn "sorted hand is (low to high) %A"
```

そして、おまけとして、最小値と最大値も自動的に手に入ります！

```fsharp
List.max hand |> printfn "high card is %A"
List.min hand |> printfn "low card is %A"
```

