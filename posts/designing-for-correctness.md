---
layout: post
title: "実例：正しさのための設計"
description: "不正な状態を表現不可能にする方法"
nav: why-use-fsharp
seriesId: "F# を使う理由"
seriesOrder: 22
categories: ["正確性", "型", "実践例"]
---

この投稿では、正しさのための設計方法（少なくとも、現在理解している要件に対する正しさ）を見ていきます。ここで言う正しさとは、適切に設計されたモデルのクライアントが、システムを不正な状態（要件を満たさない状態）にできないということです。コンパイラが許可しないため、文字通り不正なコードを作ることができないのです。

これを実現するには、事前に設計についてよく考える必要があります。そして、要件を型に落とし込む努力も必要です。
もし単に文字列やリストをすべてのデータ構造に当てはめるだけなら、型チェックの恩恵を受けることはできません。

簡単な例を使ってみましょう。eコマースサイトのショッピングカートを設計していて、以下の要件が与えられたとします。

* カートの支払いは1回しかできない。
* 支払いが完了したら、カート内のアイテムを変更できない。
* 空のカートは支払いできない。

## C#での悪い設計 ##

C#では、これは十分にシンプルだと考えて、すぐにコーディングに取り掛かるかもしれません。以下は、一見問題なさそうに見えるC#での素直な実装です。

```csharp
public class NaiveShoppingCart<TItem>
{
   private List<TItem> items;
   private decimal paidAmount;

   public NaiveShoppingCart()
   {
      this.items = new List<TItem>();
      this.paidAmount = 0;
   }

   /// カートの支払いが完了しているか？
   public bool IsPaidFor { get { return this.paidAmount > 0; } }

   /// アイテムの読み取り専用リスト
   public IEnumerable<TItem> Items { get {return this.items; } }

   /// 支払いが完了していない場合のみアイテムを追加
   public void AddItem(TItem item)
   {
      if (!this.IsPaidFor)
      {
         this.items.Add(item);
      }
   }

   /// 支払いが完了していない場合のみアイテムを削除
   public void RemoveItem(TItem item)
   {
      if (!this.IsPaidFor)
      {
         this.items.Remove(item);
      }
   }

   /// カートの支払い
   public void Pay(decimal amount)
   {
      if (!this.IsPaidFor)
      {
         this.paidAmount = amount;
      }
   }
}
```

残念ながら、これは実際にはかなり悪い設計です：

* 要件の1つが満たされていません。どれかわかりますか？
* 大きな設計上の欠陥と、いくつかの小さな欠陥があります。それらが何かわかりますか？

こんな短いコードにこんなにも多くの問題が！

もし要件がさらに複雑で、コードが何千行もあったらどうなるでしょうか？たとえば、このようなフラグメントが至る所に繰り返し現れています。

```csharp
if (!this.IsPaidFor) { 何かを実行 }
```

これは、一部のメソッドで要件が変更されても他のメソッドでは変更されない場合、かなり脆弱になりそうです。

次のセクションを読む前に、上記の要件をC#でどのようにより良く実装できるか、以下の追加要件も含めて1分ほど考えてみてください：

* 要件で許可されていないことを行おうとすると、実行時エラーではなく*コンパイル時エラー*が発生します。たとえば、空のカートから `RemoveItem` メソッドを呼び出すことさえできないような設計にする必要があります。
* どの状態でもカートの内容は不変でなければなりません。これの利点は、カートの支払い処理中に、他のプロセスがアイテムを追加または削除している場合でも、カートの内容が変更されないことです。

## F#での正しい設計 ##

一歩下がって、より良い設計ができないか考えてみましょう。これらの要件を見ると、3つの状態といくつかの状態遷移を持つシンプルな状態機械があることは明らかです：

* ショッピングカートは Empty（空）、Active（アクティブ）、PaidFor（支払い済み）の状態を持ちます
* 空のカートにアイテムを追加すると、アクティブになります
* アクティブなカートから最後のアイテムを削除すると、空になります
* アクティブなカートに対して支払いを行うと、支払い済みになります

そして、このモデルにビジネスルールを追加できます：

* アイテムの追加は、空またはアクティブな状態のカートに対してのみ可能です
* アイテムの削除は、アクティブな状態のカートに対してのみ可能です
* 支払いは、アクティブな状態のカートに対してのみ可能です

以下が状態遷移図です：

![Shopping Cart](../assets/img/ShoppingCart.png)
 
このような状態指向のモデルが、ビジネスシステムでは非常に一般的であることは注目に値します。製品開発、顧客関係管理、注文処理、その他のワークフローは、しばしばこのようにモデル化できます。

では、この設計をF#で実装してみましょう：

```fsharp
type CartItem = string    // より複雑な型のプレースホルダー

type EmptyState = NoItems // 空のリストを使わないでください！
                          // クライアントにこれを別のケースとして
                          // 扱うよう強制します。例：「カートに
                          // アイテムがありません」

type ActiveState = { UnpaidItems : CartItem list; }
type PaidForState = { PaidItems : CartItem list; 
                      Payment : decimal}

type Cart = 
    | Empty of EmptyState 
    | Active of ActiveState 
    | PaidFor of PaidForState 
```

各状態に対して型を作成し、任意の1つの状態を選択できる `Cart` 型を作成します。すべてに明確な名前（例：単なる `Items` ではなく `PaidItems` と `UnpaidItems` ）を付けています。これは推論エンジンに役立ち、コードをより自己文書化します。

<div class="alert alert-info">
<p>これは以前の例よりもかなり長い例です！今はF#の構文についてあまり気にしないでください。コードの概要を把握し、全体的な設計にどのように適合するかを理解できればと思います。</p>
<p>また、これらのスニペットをスクリプトファイルに貼り付けて、自分で評価してみてください。</p>
</div>

次に、各状態に対する操作を作成できます。主な点は、各操作が常に状態の1つを入力として受け取り、新しい `Cart` を返すことです。つまり、特定の既知の状態から始まりますが、3つの可能な状態のいずれかを選択するラッパーである `Cart` を返します。

```fsharp
// =============================
// 空の状態に対する操作
// =============================

let addToEmptyState item = 
   // 新しいアクティブなカートを返します
   Cart.Active {UnpaidItems=[item]}

// =============================
// アクティブな状態に対する操作
// =============================

let addToActiveState state itemToAdd = 
   let newList = itemToAdd :: state.UnpaidItems
   Cart.Active {state with UnpaidItems=newList }

let removeFromActiveState state itemToRemove = 
   let newList = state.UnpaidItems 
                 |> List.filter (fun i -> i<>itemToRemove)
                
   match newList with
   | [] -> Cart.Empty NoItems
   | _ -> Cart.Active {state with UnpaidItems=newList} 

let payForActiveState state amount = 
   // 新しい支払い済みカートを返します
   Cart.PaidFor {PaidItems=state.UnpaidItems; Payment=amount}
```

次に、これらの操作を状態にメソッドとして付加します

```fsharp
type EmptyState with
   member this.Add = addToEmptyState 

type ActiveState with
   member this.Add = addToActiveState this 
   member this.Remove = removeFromActiveState this 
   member this.Pay = payForActiveState this 
```

そして、カートレベルのヘルパーメソッドもいくつか作成できます。カートレベルでは、内部状態の各可能性を `match..with` 式で明示的に処理する必要があります。

```fsharp
let addItemToCart cart item =  
   match cart with
   | Empty state -> state.Add item
   | Active state -> state.Add item
   | PaidFor state ->  
       printfn "エラー：カートは支払い済みです"
       cart   

let removeItemFromCart cart item =  
   match cart with
   | Empty state -> 
      printfn "エラー：カートは空です"
      cart   // カートを返します 
   | Active state -> 
      state.Remove item
   | PaidFor state ->  
      printfn "エラー：カートは支払い済みです"
      cart   // カートを返します

let displayCart cart  =  
   match cart with
   | Empty state -> 
      printfn "カートは空です"   // state.Itemsは使えません
   | Active state -> 
      printfn "カートには %A の未払いアイテムが含まれています"
                                                state.UnpaidItems
   | PaidFor state ->  
      printfn "カートには %A の支払い済みアイテムが含まれています。支払額：%f"
                                    state.PaidItems state.Payment

type Cart with
   static member NewCart = Cart.Empty NoItems
   member this.Add = addItemToCart this 
   member this.Remove = removeItemFromCart this 
   member this.Display = displayCart this 
```

## 設計のテスト ##

では、このコードを実際に動かしてみましょう：

```fsharp
let emptyCart = Cart.NewCart
printf "emptyCart="; emptyCart.Display

let cartA = emptyCart.Add "A"
printf "cartA="; cartA.Display
```

これで、1つのアイテムを含むアクティブなカートができました。「cartA」は「emptyCart」とは完全に異なるオブジェクトで、異なる状態にあることに注目してください。

続けてみましょう：

```fsharp
let cartAB = cartA.Add "B"
printf "cartAB="; cartAB.Display

let cartB = cartAB.Remove "A"
printf "cartB="; cartB.Display

let emptyCart2 = cartB.Remove "B"
printf "emptyCart2="; emptyCart2.Display
```

ここまでは順調です。繰り返しになりますが、これらはすべて異なる状態の別々のオブジェクトです。

空のカートからアイテムを削除できないという要件をテストしてみましょう：

```fsharp
let emptyCart3 = emptyCart2.Remove "B"    //エラー
printf "emptyCart3="; emptyCart3.Display
```

エラーが発生しました。まさに私たちが望んでいたことです！

次に、カートの支払いを行いたいとします。このメソッドはカートレベルでは作成しませんでした。なぜなら、クライアントにすべてのケースの処理方法を指示したくなかったからです。このメソッドはアクティブな状態でのみ存在するため、クライアントは各ケースを明示的に処理し、アクティブな状態がマッチした場合にのみ `Pay` メソッドを呼び出す必要があります。

まず、cartAの支払いをしてみます。

```fsharp
//  cartAの支払いをしてみる
let cartAPaid = 
    match cartA with
    | Empty _ | PaidFor _ -> cartA 
    | Active state -> state.Pay 100m
printf "cartAPaid="; cartAPaid.Display
```

結果は支払い済みのカートになりました。

次に、emptyCartの支払いをしてみます。

```fsharp
//  emptyCartの支払いをしてみる
let emptyCartPaid = 
    match emptyCart with
    | Empty _ | PaidFor _ -> emptyCart
    | Active state -> state.Pay 100m
printf "emptyCartPaid="; emptyCartPaid.Display
```

何も起こりません。カートが空なので、アクティブなブランチは呼び出されません。他のブランチでエラーを発生させたりメッセージをログに記録したりすることもできますが、何をしても空のカートに対して誤って `Pay` メソッドを呼び出すことはできません。なぜなら、その状態にはそのメソッドがないからです！

すでに支払い済みのカートに対して誤って支払いをしようとした場合も同じことが起こります。

```fsharp
//  cartABの支払いをしてみる 
let cartABPaid = 
    match cartAB with
    | Empty _ | PaidFor _ -> cartAB // 同じカートを返す
    | Active state -> state.Pay 100m

//  cartABの支払いをもう一度してみる
let cartABPaidAgain = 
    match cartABPaid with
    | Empty _ | PaidFor _ -> cartABPaid  // 同じカートを返す
    | Active state -> state.Pay 100m
```

このクライアントコードについて、あなたは次のように指摘するかもしれません。「このコードはすでに要件を適切に扱っており、期待通りに動作しています。しかし、これは現実的なコードを正確に反映しているとは言えないでしょう。」

では、支払いを強制しようとする悪意のある、または不適切に書かれたクライアントコードの場合はどうなるでしょうか：

```fsharp
match cartABPaid with
| Empty state -> state.Pay 100m
| PaidFor state -> state.Pay 100m
| Active state -> state.Pay 100m
```

このように強制しようとすると、コンパイルエラーが発生します。クライアントが要件を満たさないコードを作成することは不可能なのです。

## まとめ ##

我々は、C#の設計よりも多くの利点を持つシンプルなショッピングカートモデルを設計しました。

* 要件が非常に明確に反映されています。このAPIのクライアントが要件を満たさないコードを呼び出すことは不可能です。
* 状態を使うことで、C#バージョンよりもはるかに少ない可能なコードパスになるため、書くべきユニットテストの数が大幅に減ります。
* 各関数は、C#バージョンとは異なり、どこにも条件分岐がないため、おそらく最初から正しく動作するでしょう。

<div class="well">
<h3>元のC#コードの分析</h3>

<p>
F#のコードを見たことで、元のC#コードを新鮮な目で再検討できるようになりました。もし気になっていたのであれば、C#のショッピングカートの例の設計に何が問題があるかについての私の考えを以下に示します。
</p>

<p>
<i>満たされていない要件</i>：空のカートでも支払いができてしまいます。
</p>

<p>
<i>主要な設計上の欠陥</i>：支払い金額をIsPaidForのシグナルとしてオーバーロードしているため、支払い金額が0の場合にカートをロックできません。無料のカートが支払い済みになることは絶対にないと確信できますか？要件が明確ではありませんが、後でこれが要件になったらどうしますか？どれだけのコードを変更する必要があるでしょうか？
</p>

<p>
<i>軽微な設計上の欠陥</i>：空のカートからアイテムを削除しようとした場合、どうなるべきでしょうか？また、すでに支払い済みのカートに対して支払いを試みた場合はどうでしょうか？これらのケースで例外をスローすべきでしょうか、それともただ静かに無視すべきでしょうか？そして、クライアントが空のカートのアイテムを列挙できることは意味があるでしょうか？また、この設計はスレッドセーフではありません。メインスレッドで支払いが行われている間に、別のスレッドがカートにアイテムを追加した場合、どうなるでしょうか？
</p>

<p>
これだけ多くの問題点があるとは驚きです。
</p>

<p>
F#の設計の良いところは、これらの問題が存在し得ないことです。今回のように設計することで、正しいコードを保証するだけでなく、そもそも設計が抜け穴のないものであることを確認する認知的な労力も大幅に減らすことができます。
</p>

<p>
<i>コンパイル時チェック：</i> C#における元の設計は、すべての状態と遷移を単一のクラスに混在させており、これは非常にエラーを起こしやすいものです。別々の状態クラス（たとえば共通の基底クラスを持つ）を作成するアプローチの方が複雑さを軽減できますが、それでも組み込みの「union」型がないため、コードが正しいことを静的に検証することはできません。C#で「union」型を実現する方法はありますが、これは一般的な書き方とはかけ離れています。一方、F#ではそれが一般的です。
</p>


</div>

## 付録：C#での正しい解決策のコード

C#でこういった要件に直面したときには、インターフェースを作ればいいだけだと、すぐ思いつくかもしれません。

しかし、それは思ったほど簡単ではありません。なぜそうなのかについては、フォローアップの投稿「[C#でのショッピングカートの例](https://fsharpforfunandprofit.com/csharp/union-types-in-csharp/)」で説明しています。

正しい解決策のC#コードがどのようなものか興味がある場合は、以下に示します。このコードは上記の要件を満たし、望み通り*コンパイル時*に正確性を保証します。

重要なポイントは、C#にはユニオン型がないため、実装には3つの関数パラメータ（各状態に1つずつ）を持つ「[fold関数](../posts/match-expression.md#folds)」を使用していることです。
カートを使用するには、呼び出し元が3つのラムダのセットを渡し、（隠された）状態が何が起こるかを決定します。

```csharp
var paidCart = cartA.Do(
    // Empty状態用のラムダ
    state => cartA,  
    // Active状態用のラムダ
    state => state.Pay(100),
    // Paid状態用のラムダ
    state => cartA);
```

このアプローチでは、呼び出し元が「間違った」関数（たとえば、Empty状態に対する "Pay" ）を呼び出すことは決してありません。なぜなら、ラムダのパラメータがそれをサポートしないからです。試してみてください！

```csharp
using System;
using System.Collections.Generic;
using System.Linq;

namespace WhyUseFsharp
{

    public class ShoppingCart<TItem>
    {

        #region ShoppingCart State classes

        /// <summary>
        /// Empty状態を表します
        /// </summary>
        public class EmptyState
        {
            public ShoppingCart<TItem> Add(TItem item)
            {
                var newItems = new[] { item };
                var newState = new ActiveState(newItems);
                return FromState(newState);
            }
        }

        /// <summary>
        /// Active状態を表します
        /// </summary>
        public class ActiveState
        {
            public ActiveState(IEnumerable<TItem> items)
            {
                Items = items;
            }

            public IEnumerable<TItem> Items { get; private set; }

            public ShoppingCart<TItem> Add(TItem item)
            {
                var newItems = new List<TItem>(Items) {item};
                var newState = new ActiveState(newItems);
                return FromState(newState);
            }

            public ShoppingCart<TItem> Remove(TItem item)
            {
                var newItems = new List<TItem>(Items);
                newItems.Remove(item);
                if (newItems.Count > 0)
                {
                    var newState = new ActiveState(newItems);
                    return FromState(newState);
                }
                else
                {
                    var newState = new EmptyState();
                    return FromState(newState);
                }
            }

            public ShoppingCart<TItem> Pay(decimal amount)
            {
                var newState = new PaidForState(Items, amount);
                return FromState(newState);
            }


        }

        /// <summary>
        /// Paid状態を表します
        /// </summary>
        public class PaidForState
        {
            public PaidForState(IEnumerable<TItem> items, decimal amount)
            {
                Items = items.ToList();
                Amount = amount;
            }

            public IEnumerable<TItem> Items { get; private set; }
            public decimal Amount { get; private set; }
        }

        #endregion ShoppingCart State classes

        //====================================
        // ショッピングカート本体の実行
        //====================================

        private enum Tag { Empty, Active, PaidFor }
        private readonly Tag _tag = Tag.Empty;
        private readonly object _state;       //ジェネリックなオブジェクトである必要があります

        /// <summary>
        /// プライベートコンストラクタ。代わりにFromStateを使用してください
        /// </summary>
        private ShoppingCart(Tag tagValue, object state)
        {
            _state = state;
            _tag = tagValue;
        }

        public static ShoppingCart<TItem> FromState(EmptyState state)
        {
            return new ShoppingCart<TItem>(Tag.Empty, state);
        }

        public static ShoppingCart<TItem> FromState(ActiveState state)
        {
            return new ShoppingCart<TItem>(Tag.Active, state);
        }

        public static ShoppingCart<TItem> FromState(PaidForState state)
        {
            return new ShoppingCart<TItem>(Tag.PaidFor, state);
        }

        /// <summary>
        /// 新しい空のカートを作成します
        /// </summary>
        public static ShoppingCart<TItem> NewCart()
        {
            var newState = new EmptyState();
            return FromState(newState);
        }

        /// <summary>
        /// 状態の各ケースに対して関数を呼び出します
        /// </summary>
        /// <remarks>
        /// 呼び出し元に各可能性に対する関数を渡すよう強制することで、常にすべてのケースが処理されることが保証されます。
        /// </remarks>
        public TResult Do<TResult>(
            Func<EmptyState, TResult> emptyFn,
            Func<ActiveState, TResult> activeFn,
            Func<PaidForState, TResult> paidForyFn
            )
        {
            switch (_tag)
            {
                case Tag.Empty:
                    return emptyFn(_state as EmptyState);
                case Tag.Active:
                    return activeFn(_state as ActiveState);
                case Tag.PaidFor:
                    return paidForyFn(_state as PaidForState);
                default:
                    throw new InvalidOperationException(string.Format("Tag {0} not recognized", _tag));
            }
        }

        /// <summary>
        /// 戻り値のないアクションを実行します
        /// </summary>
        public void Do(
            Action<EmptyState> emptyFn,
            Action<ActiveState> activeFn,
            Action<PaidForState> paidForyFn
            )
        {
            //ActionをFuncに変換してダミー値を返します
            Do(
                state => { emptyFn(state); return 0; },
                state => { activeFn(state); return 0; },
                state => { paidForyFn(state); return 0; }
                );
        }



    }

    /// <summary>
    /// 私個人のライブラリ用の拡張メソッド
    /// </summary>
    public static class ShoppingCartExtension
    {
        /// <summary>
        /// Addのヘルパーメソッド
        /// </summary>
        public static ShoppingCart<TItem> Add<TItem>(this ShoppingCart<TItem> cart, TItem item)
        {
            return cart.Do(
                state => state.Add(item), //empty case
                state => state.Add(item), //active case
                state => { Console.WriteLine("エラー：カートは支払い済みでアイテムを追加できません"); return cart; } //paid for case
            );
        }

        /// <summary>
        /// Removeのヘルパーメソッド
        /// </summary>
        public static ShoppingCart<TItem> Remove<TItem>(this ShoppingCart<TItem> cart, TItem item)
        {
            return cart.Do(
                state => { Console.WriteLine("エラー：カートは空でアイテムを削除できません"); return cart; }, //empty case
                state => state.Remove(item), //active case
                state => { Console.WriteLine("エラー：カートは支払い済みでアイテムを削除できません"); return cart; } //paid for case
            );
        }

        /// <summary>
        /// Displayのヘルパーメソッド
        /// </summary>
        public static void Display<TItem>(this ShoppingCart<TItem> cart)
        {
            cart.Do(
                state => Console.WriteLine("カートは空です"),
                state => Console.WriteLine("アクティブなカートには {0} 個のアイテムが含まれています", state.Items.Count()),
                state => Console.WriteLine("支払い済みのカートには {0} 個のアイテムが含まれています。支払額 {1}", state.Items.Count(), state.Amount)
            );
        }
    }

    [NUnit.Framework.TestFixture]
    public class CorrectShoppingCartTest
    {
        [NUnit.Framework.Test]
        public void TestCart()
        {
            var emptyCart = ShoppingCart<string>.NewCart();
            emptyCart.Display();

            var cartA = emptyCart.Add("A");  //1つのアイテム
            cartA.Display();

            var cartAb = cartA.Add("B");  //2つのアイテム
            cartAb.Display();

            var cartB = cartAb.Remove("A"); //1つのアイテム
            cartB.Display();

            var emptyCart2 = cartB.Remove("B"); //空
            emptyCart2.Display();

            Console.WriteLine("emptyCartから削除");
            emptyCart.Remove("B"); //エラー


            //  cartAの支払いを試みる
            Console.WriteLine("cartAの支払い");
            var paidCart = cartA.Do(
                state => cartA,
                state => state.Pay(100),
                state => cartA);
            paidCart.Display();

            Console.WriteLine("paidCartにアイテムを追加");
            paidCart.Add("C");

            //  emptyCartの支払いを試みる
            Console.WriteLine("emptyCartの支払い");
            var emptyCartPaid = emptyCart.Do(
                state => emptyCart,
                state => state.Pay(100),
                state => emptyCart);
            emptyCartPaid.Display();
        }
    }
}

```