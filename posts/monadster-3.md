---
layout: post
title: "モナド怪物のリファクタリング"
description: "フランケンファンクター博士とモナド怪物、パート3"
categories: [部分適用、カリー化、コンビネータ]
seriesId: "状態の扱い"
seriesOrder: 3
---

*更新 [この話題に関する私の講演のスライドと動画](https://fsharpforfunandprofit.com/monadster/)*

*警告：この記事には、ぞっとするような話題、無理のある例え、モナドに関する議論が含まれています。*

フランケンファンクター博士とモナド怪物の物語、第3回にようこそ！

[第1回](../posts/monadster.md)では、フランケンファンクター博士が死体のパーツから生命を作り出す過程を紹介しました。
博士は「モナド怪物パーツ生成器」（略して「M」）を使い、生命力を供給すると生きた体のパーツを返すようにしました。

また、生き物の脚と腕の作成方法、そしてこれらのM値が`mapM`と`map2M`を使ってどのように処理され組み合わされたかについて説明しました。

[第2回](../posts/monadster-2.md)では、頭、心臓、胴体が`returnM`、`bindM`、`applyM`などの強力な技術を使ってどのように作られたかを解説しました。

この最終回では、使用したすべての技術を振り返り、コードをリファクタリングし、フランケンファンクター博士の技術を現代のステートモナドと比較します。

シリーズの完全なリンク

* [パート1 - フランケンファンクター博士とモナド怪物](../posts/monadster.md) 
* [パート2 - 体の完成](../posts/monadster-2.md) 
* [パート3 - 振り返りとリファクタリング](../posts/monadster-3.md) (*この記事*)

## 使用した技術の振り返り

リファクタリングの前に、使用したすべての技術を振り返ってみましょう。

### M<BodyPart>型

生命力が手に入るまで生きた体のパーツは作れませんでしたが、
雷が落ちる前にパーツを操作したり組み合わせたりする方法が必要でした。
そこで、各パーツの「生き返す」関数をラップする`M`型を作りました。
これにより、`M<BodyPart>`のことは、時が来たら`BodyPart`を作るための*レシピ*、または*指示書*として考えることができました。

`M`の定義は次のとおりです。

```fsharp
type M<'a> = M of (VitalForce -> 'a * VitalForce)
```

### mapM

次に、生命力を使わずにMの内容を変換したいと思いました。具体的には、折れた腕のレシピ（`M<BrokenLeftArm>`）を折れていない腕のレシピ（`M<LeftArm>`）に変えたいと思いました。
解決策は、通常の関数`'a -> 'b`を`M<'a> -> M<'b>`関数に変換する`mapM`関数を実装することでした。

`mapM`は次のようなシグネチャです。

```fsharp
val mapM : f:('a -> 'b) -> M<'a> -> M<'b>
```

### map2M

また、2つのMレシピを組み合わせて新しいレシピを作りたいと思いました。
この場合、上腕（`M<UpperRightArm>`）と前腕（`M<LowerRightArm>`）を組み合わせて腕全体（`M<RightArm>`）を作ることでした。解決策は`map2M`でした。

`map2M`は次のようなシグネチャです。

```fsharp
val map2M : f:('a -> 'b -> 'c) -> M<'a> -> M<'b> -> M<'c>
```

### returnM

もう1つの課題は、通常の値を生命力なしでMレシピの世界に直接持ち上げることでした。
この場合、`Skull`を`M<Skull>`に変換して、`map2M`で頭全体を作るのに使えるようにすることでした。

`returnM`は次のようなシグネチャです。

```fsharp
val returnM : 'a -> M<'a>
```

### モナディック関数

似たような形の関数をたくさん作りました。これらはすべて何かを入力として受け取り、Mレシピを出力として返します。
つまり、これらの関数は次のようなシグネチャです。

```fsharp
val monadicFunction : 'a -> M<'b>
```

実際に使用したモナディック関数の例をいくつか示します。

```fsharp
val makeLiveLeftLeg : DeadLeftLeg -> M<LiveLeftLeg>
val makeLiveRightLowerArm : DeadRightLowerArm -> M<LiveRightLowerArm>
val makeLiveHeart : DeadHeart -> M<LiveHeart>
val makeBeatingHeart : LiveHeart -> M<BeatingHeart>
// そして
val returnM : 'a -> M<'a>
```

### bindM

これまでの関数は生命力へのアクセスを必要としませんでしたが、次に2つのモナディック関数を連鎖させる必要が出てきました。
具体的には、`makeLiveHeart`（シグネチャ：`DeadHeart -> M<LiveHeart>`）の出力を`makeBeatingHeart`（シグネチャ：`LiveHeart -> M<BeatingHeart>`）の入力につなげる必要がありました。
解決策は`bindM`でした。これは`'a -> M<'b>`形式のモナディック関数をM世界の関数（`M<'a> -> M<'b>`）に変換し、それらを組み合わせることができるようにします。

`bindM`のシグネチャは次のとおりです。

```fsharp
val bindM : f:('a -> M<'b>) -> M<'a> -> M<'b>
```

### applyM

最後に、多くのMパラメータを組み合わせて生きた体を作る方法が求められました。
mapの特別なバージョン（`map4M`、`map5M`、`map6M`など）を作る代わりに、M関数をMパラメータに適用する汎用的な`applyM`関数を実装しました。
これにより、部分適用を使って1つずつMパラメータを適用し、任意の大きさの関数を扱えるようになりました。

`applyM`のシグネチャは次のとおりです。

```fsharp
val applyM : M<('a -> 'b)> -> M<'a> -> M<'b>
```

### bindとreturnを使って他の関数を定義する

これらの関数のうち、`bindM`だけが生命力へのアクセスを必要としたことに注目してください。

実際、以下で見るように、`mapM`、`map2M`、`applyM`は`bindM`と`returnM`を使って定義できます！


## コンピュテーション式へのリファクタリング

作成した関数の多くが非常に似た形をしており、結果として重複が多く生じています。以下は一例です。

```fsharp
let makeLiveLeftLegM deadLeftLeg  = 
    let becomeAlive vitalForce = 
        let (DeadLeftLeg label) = deadLeftLeg
        let oneUnit, remainingVitalForce = getVitalForce vitalForce 
        let liveLeftLeg = LiveLeftLeg (label,oneUnit)
        liveLeftLeg, remainingVitalForce    
    M becomeAlive  // 関数を単一ケースユニオンでラップ
```

特に、生命力を明示的に処理する箇所が多く含まれています。

ほとんどの関数型言語には、これを隠蔽してコードをより簡潔にする方法があります。

Haskellでは開発者が「do記法」を使用し、Scalaでは「for-yield」（for内包表記）を使用します。そしてF#では、コンピュテーション式を使用します。

F#でコンピュテーション式を作成するには、まず「bind」と「return」の2つが必要です。これらは既に持っています。

次に、特別な名前のメソッド`Bind`と`Return`を持つクラスを定義します。

```fsharp
type MonsterBuilder()=
    member this.Return(x) = returnM x
    member this.Bind(xM,f) = bindM f xM
```

最後に、このクラスのインスタンスを作成します。

```fsharp
let monster = new MonsterBuilder()
```

これが完了すると、`async{...}`や`seq{...}`などと同様に、特別な構文`monster {...}`が使用できるようになります。

* `let! x = xM`構文では、右辺がM型、たとえば`M<X>`である必要があります。<br>
  `let!`は`M<X>`を`X`にアンラップし、左辺の「x」にバインドします。
* `return y`構文では、戻り値が「通常の」型、たとえば`Y`である必要があります。<br>
  `return`はそれを`M<Y>`にラップし（`returnM`を使用）、`monster`式の全体の値として返します。

したがって、例のコードは次のようになります。

```fsharp
monster {
    let! x = xM  // M<X>をXにアンラップし、「x」にバインド
    return y     // YをラップしてM<Y>を返す
    }
```

*コンピュテーション式についてもっと詳しく知りたい場合は、[私の詳細な連載](../series/computation-expressions.md)をご覧ください。*

### mapMと仲間の再定義

`monster`式が使用可能になったので、`mapM`やその他の関数を書き直してみましょう。

**mapM**

`mapM`は関数とラップされたM値を受け取り、内部の値に関数を適用して返します。

`monster`を使用した実装は次のとおりです。

```fsharp
let mapM f xM = 
    monster {
        let! x = xM  // M<X>をアンラップ
        return f x   // (f x)のMを返す
        }
```

この実装をコンパイルすると、以前の実装と同じシグネチャが得られます。

```fsharp
val mapM : f:('a -> 'b) -> M<'a> -> M<'b>
```

**map2M**

`map2M`は関数と2つのラップされたM値を受け取り、両方の値に関数を適用して返します。

これも`monster`式を使って簡単に書くことができます。

```fsharp
let map2M f xM yM = 
    monster {
        let! x = xM  // M<X>をアンラップ
        let! y = yM  // M<Y>をアンラップ
        return f x y // (f x y)のMを返す
        }
```

この実装をコンパイルすると、再び以前の実装と同じシグネチャが得られます。

```fsharp
val map2M : f:('a -> 'b -> 'c) -> M<'a> -> M<'b> -> M<'c>
```

**applyM**

`applyM`はラップされた関数とラップされた値を受け取り、値に関数を適用して返します。

これも`monster`式を使って簡単に書くことができます。

```fsharp
let applyM fM xM = 
    monster {
        let! f = fM  // M<F>をアンラップ
        let! x = xM  // M<X>をアンラップ
        return f x   // (f x)のMを返す
        }
```

シグネチャは期待通りです。

```fsharp
val applyM : M<('a -> 'b)> -> M<'a> -> M<'b>
```

## monsterコンテキスト内での生命力の操作

他のすべての関数も`monster`式を使って書き直したいのですが、そこには課題があります。

多くの関数の本体は次のような形をしています。

```fsharp
// コンテキストから生命力の単位を抽出
let oneUnit, remainingVitalForce = getVitalForce vitalForce 

// 何かを行う

// 値と残りの生命力を返す
liveBodyPart, remainingVitalForce    
```

つまり、生命力の一部を*取得*し、次のステップで使用する新しい生命力を*設定*しています。

オブジェクト指向プログラミングでは「ゲッター」と「セッター」に慣れているので、`monster`コンテキストで動作する同様のものを書いてみましょう。

### getMの導入

まずゲッターから始めましょう。どのように実装すべきでしょうか？

生命力は生きている状態のコンテキストでのみ利用可能なので、関数は一般的な形式に従う必要があります。

```fsharp
let getM = 
    let doSomethingWhileLive vitalForce = 
        // ここで何をする？？
        何を返す？？, vitalForce 
    M doSomethingWhileLive 
```

`vitalForce`は取得しても使わないので、元の量をそのまま返します。

では、中間部分で何をすべきでしょうか？そしてタプルの最初の要素として何を返すべきでしょうか？

答えは簡単です。生命力自体を返すのです！
    
```fsharp
let getM = 
    let doSomethingWhileLive vitalForce = 
        // タプルの最初の要素として現在の生命力を返す
        vitalForce, vitalForce 
    M doSomethingWhileLive 
```

`getM`は`M<VitalForce>`値なので、monster式の中で次のようにアンラップできます。

```fsharp
monster {
    let! vitalForce = getM
    // 生命力で何かをする
    }
```

### putMの導入

セッターについては、新しい生命力をパラメータとする関数として実装します。

```fsharp
let putM newVitalForce  = 
    let doSomethingWhileLive vitalForce = 
        ここで何をする？？
    M doSomethingWhileLive 
```

ここでも、中間部分で何をすべきでしょうか？

最も重要なのは、`newVitalForce`が次のステップに渡される値になることです。元の生命力は捨てなければなりません！

つまり、`newVitalForce`は返されるタプルの2番目の部分として使用*しなければなりません*。

そして、返されるタプルの1番目の部分には何を入れるべきでしょうか？適切な値がないので、単に`unit`を使用します。

最終的な実装は以下のようになります。

```fsharp
let putM newVitalForce  = 
    let doSomethingWhileLive vitalForce = 
        // タプルの1番目の要素には何も返さない
        // タプルの2番目の要素にnewVitalForceを返す
        (), newVitalForce
    M doSomethingWhileLive 
```

`getM`と`putM`が用意できたので、次のような関数を作成できます。

* コンテキストから現在の生命力を取得する
* そこから1単位を抽出する
* 現在の生命力を残りの生命力で置き換える
* 1単位の生命力を呼び出し元に返す

以下がそのコードです。

```fsharp
let useUpOneUnitM = 
    monster {
        let! vitalForce = getM
        let oneUnit, remainingVitalForce = getVitalForce vitalForce 
        do! putM remainingVitalForce 
        return oneUnit
        }
```


## monster式を使って他のすべての関数を書き直す

`useUpOneUnitM`を使って、他のすべての関数の書き直しを始めることができます。

たとえば、元の`makeLiveLeftLegM`関数は次のようになっており、生命力の明示的な処理がたくさん含まれています。

```fsharp
let makeLiveLeftLegM deadLeftLeg  = 
    let becomeAlive vitalForce = 
        let (DeadLeftLeg label) = deadLeftLeg
        let oneUnit, remainingVitalForce = getVitalForce vitalForce 
        let liveLeftLeg = LiveLeftLeg (label,oneUnit)
        liveLeftLeg, remainingVitalForce    
    M becomeAlive  // 関数を単一ケースユニオンでラップ
```

monster式を使用した新しいバージョンでは、生命力の処理が暗黙的になり、結果としてずっとクリーンになります。

```fsharp
let makeLiveLeftLegM deadLeftLeg = 
    monster {
        let (DeadLeftLeg label) = deadLeftLeg
        let! oneUnit = useUpOneUnitM
        return LiveLeftLeg (label,oneUnit)
        }
```

同様に、すべての腕の手術コードを次のように書き直すことができます。

```fsharp
let makeLiveRightLowerArm (DeadRightLowerArm label) = 
    monster {
        let! oneUnit = useUpOneUnitM
        return LiveRightLowerArm (label,oneUnit)
        }

let makeLiveRightUpperArm (DeadRightUpperArm label) = 
    monster {
        let! oneUnit = useUpOneUnitM
        return LiveRightUpperArm (label,oneUnit)
        }
        
// M-パーツを作成
let lowerRightArmM = DeadRightLowerArm "Tom" |> makeLiveRightLowerArm 
let upperRightArmM = DeadRightUpperArm "Jerry" |> makeLiveRightUpperArm 

// armSurgeryをM-関数に変換 
let armSurgeryM  = map2M armSurgery 

// 手術を行って2つのM-パーツを新しいM-パーツに組み合わせる
let rightArmM = armSurgeryM lowerRightArmM upperRightArmM 
```

このように続けていきます。この新しいコードはずっとクリーンになりました。

実は、コードをもっと整理することができます。
`armSurgery`や`armSurgeryM`のような中間的な値を排除し、すべてを1つのmonster式にまとめることができます。

```fsharp
let rightArmM = monster {
    let! lowerArm = DeadRightLowerArm "Tom" |> makeLiveRightLowerArm 
    let! upperArm = DeadRightUpperArm "Jerry" |> makeLiveRightUpperArm 
    return {lowerArm=lowerArm; upperArm=upperArm}
    }
```

頭の場合も同様のアプローチを使用できます。`headSurgery`や`returnM`はもう必要ありません。

```fsharp
let headM = monster {
    let! brain = makeLiveBrain deadBrain
    return {brain=brain; skull=skull}
    }
```

最後に、monster式を使って体全体を作ることもできます。

```fsharp
// M-パーツからM-体を作成する関数
let createBodyM leftLegM rightLegM leftArmM rightArmM headM beatingHeartM = 
    monster {
        let! leftLeg = leftLegM
        let! rightLeg = rightLegM
        let! leftArm = leftArmM
        let! rightArm = rightArmM
        let! head = headM 
        let! beatingHeart = beatingHeartM

        // レコードを作成
        return {
            leftLeg = leftLeg
            rightLeg = rightLeg
            leftArm = leftArm
            rightArm = rightArm
            head = head
            heart = beatingHeart 
            }
        }

// M-体を作成 
let bodyM = createBodyM leftLegM rightLegM leftArmM rightArmM headM beatingHeartM
```

注意：monster式を使用した完全なコードは[GitHubで利用可能](https://gist.github.com/swlaschin/54489d9586402e5b1e8a#file-monadster2-fsx)です。

### monster式 vs applyM

以前、`applyM`を使用して体を作成する別の方法を紹介しました。

参考までに、`applyM`を使用した方法を以下に示します。

```fsharp
let createBody leftLeg rightLeg leftArm rightArm head beatingHeart =
    {
    leftLeg = leftLeg
    rightLeg = rightLeg
    leftArm = leftArm
    rightArm = rightArm
    head = head
    heart = beatingHeart 
    }

let bodyM = 
    createBody 
    <!> leftLegM
    <*> rightLegM
    <*> leftArmM
    <*> rightArmM
    <*> headM 
    <*> beatingHeartM
```

では、どこが違うのでしょうか？

見た目には少し違いがありますが、どちらの方法も、好みに応じて選択できる正当な手法です。

しかし、`applyM`アプローチとmonster式アプローチの間には、もっと重要な違いがあります。

`applyM`アプローチでは、パラメータを*独立して*または*並行して*実行できるのに対し、
monster式アプローチでは、パラメータを*順序通りに*実行する必要があり、一つの出力が次の入力に渡されます。

この違いは今回のシナリオでは重要ではありませんが、バリデーションや非同期処理など、他の場面では大きな意味を持つことがあります。
バリデーションを例に挙げると、最初に見つかったエラーだけを報告するのではなく、すべてのエラーを一度に集めて報告したい場合があります。


<a name="statemonad"></a>

## Stateモナドとの関係

フランケンファンクター博士は当時の先駆者でしたが、自身の発見を他の領域に一般化することはありませんでした。

現在では、一連の関数を通じて何らかの情報を受け渡すこのパターンは非常に一般的で、「Stateモナド」という標準的な名前が付けられています。

真のモナドであるためには、様々な性質（いわゆるモナド則）を満たす必要がありますが、
この記事はモナドのチュートリアルを意図したものではないので、ここでは議論しません。

代わりに、Stateモナドが実際にどのように定義され、使用されるかに焦点を当てます。

まず、真に再利用可能にするためには、`VitalForce`型を他の型に置き換える必要があります。そのため、関数をラップする型（ここでは`S`と呼びます）には*2つ*の型パラメータが必要です。
1つは状態の型用、もう1つは値の型用です。

```fsharp
type S<'State,'Value> = 
    S of ('State -> 'Value * 'State)
```
 
これを定義したら、通常の`runS`、`returnS`、`bindS`を作成できます。

```fsharp
// 状態を「実行する」関数呼び出しをカプセル化
let runS (S f) state = f state

// 値をS世界に持ち上げる 
let returnS x = 
    let run state = 
        x, state
    S run

// モナディック関数をS世界に持ち上げる 
let bindS f xS = 
    let run state = 
        let x, newState = runS xS state
        runS (f x) newState 
    S run
```

個人的には、`M`コンテキストでのしくみをを理解した後で、完全に一般化したものを説明するという順序でよかったと思います。以下のようなシグネチャは、

```fsharp
val runS : S<'a,'b> -> 'a -> 'b * 'a
val bindS : f:('a -> S<'b,'c>) -> S<'b,'a> -> S<'b,'c>
```

前提知識なしでは非常に理解しづらいものです。

さて、これらの基本が整ったら、`state`式を作成できます。
 
```fsharp
type StateBuilder()=
    member this.Return(x) = returnS x
    member this.Bind(xS,f) = bindS f xS

let state = new StateBuilder()
```

`getS`と`putS`は、`monster`の`getM`と`putM`と同様の方法で定義されます。

```fsharp
let getS = 
    let run state = 
        // タプルの最初の要素に現在の状態を返す
        state, state
    S run
// val getS : S<State> 

let putS newState = 
    let run _ = 
        // タプルの最初の要素には何も返さない
        // タプルの2番目の要素に新しい状態を返す
        (), newState
    S run
// val putS : 'State -> S<unit>
```

### state式のプロパティベースのテスト 

先に進む前に、`state`の実装が正しいことをどのように確認できるでしょうか？そもそも「正しい」とは何を意味するのでしょうか？

これは、実例ベースのテストをたくさん書くよりも、[プロパティベースのテスト](https://fsharpforfunandprofit.com/pbt/)のアプローチが適している場合の候補です。

満たすべきプロパティには以下のようなものがあります。

* [**モナド則**](https://stackoverflow.com/questions/18569656/explanation-of-monad-laws-in-f)
* **最後のputだけが有効**。つまり、XをputしてからYをputするのは、単にYをputするのと同じであるべきです。 
* **getは最後のputを返す**。つまり、Xをputしてからgetを行うと、同じXが返されるべきです。 

などです。 

ここではこれ以上詳しく説明しません。より詳細な議論については、[講演](https://fsharpforfunandprofit.com/pbt/)をご覧ください。

### state式をmonster式の代わりに使用する

これで、`state`式を`monster`式と全く同じように使用できます。以下に例を示します。

```fsharp
// getとputを組み合わせて1単位を抽出する
let useUpOneUnitS = state {
    let! vitalForce = getS
    let oneUnit, remainingVitalForce = getVitalForce vitalForce 
    do! putS remainingVitalForce 
    return oneUnit
    }
    
type DeadLeftLeg = DeadLeftLeg of Label 
type LiveLeftLeg = LiveLeftLeg of Label * VitalForce

// 生命力の暗黙的な処理を行う新バージョン
let makeLiveLeftLeg (DeadLeftLeg label) = state {
    let! oneUnit = useUpOneUnitS
    return LiveLeftLeg (label,oneUnit)
    }
```

もう一つの例として、`BeatingHeart`の作り方を示します。

```fsharp
type DeadHeart = DeadHeart of Label 
type LiveHeart = LiveHeart of Label * VitalForce
type BeatingHeart = BeatingHeart of LiveHeart * VitalForce

let makeLiveHeart (DeadHeart label) = state {
    let! oneUnit = useUpOneUnitS
    return LiveHeart (label,oneUnit)
    }

let makeBeatingHeart liveHeart = state {
    let! oneUnit = useUpOneUnitS
    return BeatingHeart (liveHeart,oneUnit)
    }

let beatingHeartS = state {
    let! liveHeart = DeadHeart "Anne" |> makeLiveHeart 
    return! makeBeatingHeart liveHeart
    }

let beatingHeart, remainingFromHeart = runS beatingHeartS vf
```

ご覧のように、`state`式は自動的に`VitalForce`が状態として使用されていることを認識しました。明示的に指定する必要はありませんでした。

したがって、`state`式の型が利用可能な場合、`monster`のような独自の式を作成する必要はまったくありません！

F#でのStateモナドのより詳細で複雑な例については、[FSharpxライブラリ](https://github.com/fsprojects/FSharpx.Extras/blob/master/src/FSharpx.Extras/ComputationExpressions/Monad.fs#L409)をチェックしてください。

*注：`state`式を使用した完全なコードは[GitHubで利用可能](https://gist.github.com/swlaschin/54489d9586402e5b1e8a#file-monadster3-fsx)です。*

## その他のstate式の使用例

stateコンピュテーション式は、一度定義すれば様々な用途に使用できます。たとえば、stateを使ってスタックをモデル化することができます。

まず、`Stack`型と関連する関数を定義してみましょう。

```fsharp
// 状態として使用する型を定義
type Stack<'a> = Stack of 'a list

// state式の外でpopを定義
let popStack (Stack contents) = 
    match contents with
    | [] -> failwith "Stack underflow"
    | head::tail ->     
        head, (Stack tail)

// state式の外でpushを定義
let pushStack newTop (Stack contents) = 
    Stack (newTop::contents)

// 空のスタックを定義
let emptyStack = Stack []

// 空のスタックから開始して
// 実行した時のスタックの値を取得
let getValue stackM = 
    runS stackM emptyStack |> fst
```

これらのコードは、stateのコンピュテーション式について何も知らず、使用もしていないことに注意してください。

stateで動作させるには、state式のコンテキストで使用するためのカスタマイズされたゲッターとセッターを定義する必要があります。

```fsharp
let pop() = state {
    let! stack = getS
    let top, remainingStack = popStack stack
    do! putS remainingStack 
    return top
    }

let push newTop = state {
    let! stack = getS
    let newStack = pushStack newTop stack
    do! putS newStack 
    return ()
    }
```

これらが用意できたら、ドメインのコーディングを始めることができます！

### スタックベースのHello World

簡単な例を見てみましょう。「world」をプッシュし、次に「hello」をプッシュし、その後スタックをポップして結果を組み合わせます。

```fsharp
let helloWorldS = state {
    do! push "world"
    do! push "hello" 
    let! top1 = pop()
    let! top2 = pop()
    let combined = top1 + " " + top2 
    return combined 
    }

let helloWorld = getValue helloWorldS // "hello world"
```

### スタックベースの計算機

こちらは簡単なスタックベースの計算機です。

```fsharp
let one = state {do! push 1}
let two = state {do! push 2}

let add = state {
    let! top1 = pop()
    let! top2 = pop()
    do! push (top1 + top2)
    }
```

そして、これらの基本的なstate値を組み合わせて、より複雑なものを構築できます。

```fsharp
let three = state {
    do! one
    do! two
    do! add
    }

let five = state {
    do! two
    do! three
    do! add
    }
```

生命力の場合と同様に、今のところスタックを構築する*レシピ*があるだけです。レシピを*実行*して結果を得るには、まだ実行する必要があります。

すべての操作を実行してスタックのトップを返すヘルパーを追加しましょう。

```fsharp
let calculate stackOperations = state {
    do! stackOperations
    let! top = pop()
    return top 
    }
```

これで、次のように演算を評価できます。

```fsharp
let threeN = calculate three |> getValue // 3

let fiveN = calculate five |> getValue   // 5
```

## はいはい、モナドの話ですね。少しだけ触れておきましょう

モナドについて知りたがる人はいつもいますが、[これ以上モナドのチュートリアルを書くつもりはありません](../posts/why-i-wont-be-writing-a-monad-tutorial.md)。

ですので、これまでの内容とモナドの関係を簡単に説明します。

**ファンクター**は、（プログラミングの意味では）それに関連付けられた`map`関数を持つデータ構造（OptionやList、Stateなど）です。
そして、`map`関数は満たすべきいくつかの性質（[ファンクター則](https://en.wikibooks.org/wiki/Haskell/The_Functor_class#The_functor_laws)）があります。

**アプリカティブファンクター**は、（プログラミングの意味では）それに関連付けられた2つの関数
`apply`と`pure`（これは`return`と同じです）を持つデータ構造（OptionやList、Stateなど）です。
そして、これらの関数には満たすべきいくつかの性質（[アプリカティブファンクター則](https://en.wikibooks.org/wiki/Haskell/Applicative_functors#Applicative_functor_laws)）があります。

最後に、**モナド**は、（プログラミングの意味では）それに関連付けられた2つの関数
`bind`（しばしば`>>=`と書かれます）と`return` を持つデータ構造（OptionやList、Stateなど）です。
そして再び、これらの関数には満たすべきいくつかの性質（[モナド則](https://en.wikibooks.org/wiki/Haskell/Understanding_monads#Monad_Laws)）があります。

これら3つのうち、モナドが最も強力です。なぜなら、`bind`関数によってMを生成する関数を連鎖させることができ、
見てきたように、`map`と`apply`は`bind`と`return`を使って書くことができるからです。

したがって、元の`M`型も、より一般的な`State`型のどちらも、サポート関数との組み合わせで、モナドになっていることがわかるでしょう
（`bind`と`return`の実装がモナド則を満たしていると仮定します）。

これらの定義の視覚的なバージョンについては、[Functors, Applicatives, And Monads In Pictures](https://www.adit.io/posts/2013-04-17-functors,_applicatives,_and_monads_in_pictures.html)という素晴らしい投稿があります。

## 補足文献

Web上にはStateモナドに関する多くの投稿がありますが、そのほとんどはHaskellに基づいています。しかし、この連載を読んだ後では、それらの説明がより理解しやすくなると思います。
そのため、ここではフォローアップリンクをいくつか紹介するだけにとどめます。

* [State monad in pictures](https://adit.io/posts/2013-06-10-three-useful-monads.html#the-state-monad)
* ["A few monads more", from "Learn You A Haskell"](https://learnyouahaskell.com/for-a-few-monads-more)
* [Much Ado About Monads](https://web.archive.org/web/20211016092319/http://codebetter.com/matthewpodwysocki/2009/12/31/much-ado-about-monads-state-edition/). F#でのStateモナドについての議論。

そして、「bind」のもう一つの重要な使用例については、[関数型エラー処理に関する私の講演](https://fsharpforfunandprofit.com/rop/)が役立つかもしれません。

F#での他のモナドの実装を見たい場合は、[FSharpxプロジェクト](https://github.com/fsprojects/FSharpx.Extras/blob/master/src/FSharpx.Extras/ComputationExpressions/Monad.fs)を見てください。

## まとめ 

フランケンファンクター博士は画期的な実験者でした。彼女の仕事の方法について洞察を共有できて嬉しく思います。

彼女が原始的なモナドといえる型 M<BodyPart> を発見したこと、
そして `mapM`、`map2M`、`returnM`、`bindM`、`applyM` がいずれも特定の問題を解決するために開発された経緯を学びました。

また、同じ問題を解決する必要性が、現代のStateモナドとコンピュテーション式にどのようにつながったかも見てきました。

この連載が啓発的だったことを望んでいます。
そして密かに願っているのですが、モナドとそれに関連するコンビネータが、もはやあなたを怖がらせるようなものではなくなっていることを期待しています...

![shocking](../assets/img/monadster_shocking300.gif)

...また、それらをあなた自身のプロジェクトで上手く活用できるようになることも願っています。頑張ってください！

*注：この投稿で使用されたコードサンプルは[GitHubで利用可能](https://gist.github.com/swlaschin/54489d9586402e5b1e8a)です。*

