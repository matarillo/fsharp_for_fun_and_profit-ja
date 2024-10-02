---
layout: post
title: "モナド怪物の体を完成させる"
description: "フランケンファンクター博士とモナド怪物、パート2"
categories: [部分適用、カリー化、コンビネーター]
image: "/assets/img/monadster_brain.jpg"
seriesId: "状態の取り扱い"
seriesOrder: 2
---

*更新：[このトピックに関する私の講演のスライドとビデオ](https://fsharpforfunandprofit.com/monadster/)*

*警告：この記事には、ぞっとするような話題、無理のある例え、モナドに関する議論が含まれています。*

フランケンファンクター博士とモナド怪物の興味深い物語へようこそ。

[前回の記事](../posts/monadster.md)で、フランケンファンクター博士による「モナド怪物パーツ生成器」（略して「M」）の使用法を紹介しました。
これらの生成器は、死体の部品から生命を作り出すもので、生命力を供給すると生きた体の部位を返します。

また、怪物の脚と腕の作成方法や、
`mapM`（折れた腕用）と`map2M`（2つの部分からなる腕用）を使ったM値の処理と組み合わせについても説明しました。

この第2回では、フランケンファンクター博士が頭、心臓、そして完全な体を作るために使用した他のテクニックを紹介します。

## 頭

最初に頭の作成について説明します。

右腕と同じく、頭も脳と頭蓋骨の2つの部分で構成されています。

フランケンファンクター博士はまず、死んだ脳と頭蓋骨を次のように定義しました。

```fsharp
type DeadBrain = DeadBrain of Label 
type Skull = Skull of Label 
```

二つの部分からなる右腕とは異なり、生きている必要があるのは脳だけです。
頭蓋骨はそのまま使用でき、生きた頭に使用される前に変換する必要はありません。

```fsharp
type LiveBrain = LiveBrain of Label * VitalForce

type LiveHead = {
    brain : LiveBrain
    skull : Skull // 生きていない
    }
```

生きた脳は頭蓋骨と組み合わされて生きた頭になります。これには`headSurgery`関数を使用します。これは以前の`armSurgery`と似ています。

```fsharp
let headSurgery brain skull =
    {brain=brain; skull=skull}
```

これで生きた頭を作る準備が整いました。では、どのように進めればよいでしょうか。

`map2M`を再利用できれば理想的ですが、問題があります。`map2M`が機能するためには、頭蓋骨が`M`でラップされている必要があります。

![head](../assets/img/monadster_head1.png)

しかし、頭蓋骨は生きる必要がなく、生命力も使用しないので、`Skull`を`M<Skull>`に変換する特別な関数を作る必要があります。

以前と同じアプローチを使用できます。

* vitalForceパラメーターを取る内部関数を作成する
* この場合、vitalForceはそのまま残す
* 内部関数から元の頭蓋骨と変更されていないvitalForceを返す
* 内部関数を「M」でラップしてそれを返す

コードは次のようになります。

```fsharp
let wrapSkullInM skull = 
    let becomeAlive vitalForce = 
        skull, vitalForce 
    M becomeAlive
```

しかし、`wrapSkullInM`のシグネチャは非常に興味深いものです。

```fsharp
val wrapSkullInM : 'a -> M<'a>
```

頭蓋骨への言及はどこにもありません！

### returnMの導入

完全に汎用的な関数を作成しました。これは何でも`M`に変換します。そこで、これの名前を変更しましょう。
`returnM`と呼ぶことにしますが、他の文脈では`pure`や`unit`と呼ばれることもあります。

```fsharp
let returnM x = 
    let becomeAlive vitalForce = 
        x, vitalForce 
    M becomeAlive
```

### 頭のテスト

それでは、実際に試してみましょう。

まず、生きた脳を作成する方法を定義する必要があります。

```fsharp
let makeLiveBrain (DeadBrain label) = 
    let becomeAlive vitalForce = 
        let oneUnit, remainingVitalForce = getVitalForce vitalForce 
        let liveBrain = LiveBrain (label,oneUnit)
        liveBrain, remainingVitalForce    
    M becomeAlive
```

次に、死んだ脳と頭蓋骨を用意します。

```fsharp
let deadBrain = DeadBrain "Abby Normal"
let skull = Skull "Yorick"
```

*ちなみに、この変わった名前の脳の由来には、[面白い話](https://ja.wikipedia.org/wiki/%E3%83%A4%E3%83%B3%E3%82%B0%E3%83%BB%E3%83%95%E3%83%A9%E3%83%B3%E3%82%B1%E3%83%B3%E3%82%B7%E3%83%A5%E3%82%BF%E3%82%A4%E3%83%B3)があるのですが、今はその詳細に立ち入る時間がありません。*

![異常な脳](../assets/img/monadster_brain.jpg)

次に、死んだ部品から「M」バージョンを構築します。

```fsharp
let liveBrainM = makeLiveBrain deadBrain
let skullM = returnM skull
```

そして、`map2M`を使用して部品を組み合わせます。

```fsharp
let headSurgeryM = map2M headSurgery
let headM = headSurgeryM liveBrainM skullM
```

今回も、雷が落ちる前にこれらの準備をすべて整えておきます。

生命力が利用可能になったら、生命力を使って`headM`を呼び出せます。

```fsharp
let vf = {units = 10}

let liveHead, remainingFromHead = runM headM vf
```

そして、次のような結果が得られます。

```text
val liveHead : LiveHead = 
    {brain = LiveBrain ("Abby normal",{units = 1;});
    skull = Skull "Yorick";}
    
val remainingFromHead : VitalForce = 
    {units = 9;}
```

要求通りの、2つのサブコンポーネントで構成された生きた頭が完成しました。

また、頭蓋骨が生命力を使わなかったため、残りの生命力はちょうど9単位になっていることにも注目してください。

## 鼓動する心臓

もう1つ必要なコンポーネントがあります。それは心臓です。

まず、死んだ心臓と生きた心臓を通常の方法で定義します。

```fsharp
type DeadHeart = DeadHeart of Label 
type LiveHeart = LiveHeart of Label * VitalForce
```

しかし、怪物に必要なのは生きた心臓以上のもの ― 鼓動する心臓です。
鼓動する心臓は、生きた心臓ともう少しの生命力から構築されます。以下のようになります。

```fsharp
type BeatingHeart = BeatingHeart of LiveHeart * VitalForce
```

生きた心臓を作成するコードは、前の例と非常によく似ています。

```fsharp
let makeLiveHeart (DeadHeart label) = 
    let becomeAlive vitalForce = 
        let oneUnit, remainingVitalForce = getVitalForce vitalForce 
        let liveHeart = LiveHeart (label,oneUnit)
        liveHeart, remainingVitalForce    
    M becomeAlive
```

鼓動する心臓を作成するコードも非常によく似ています。生きた心臓をパラメータとして受け取り、さらに1単位の生命力を使用し、
鼓動する心臓と残りの生命力を返します。

```fsharp
let makeBeatingHeart liveHeart = 

    let becomeAlive vitalForce = 
        let oneUnit, remainingVitalForce = getVitalForce vitalForce 
        let beatingHeart = BeatingHeart (liveHeart, oneUnit)
        beatingHeart, remainingVitalForce    
    M becomeAlive
```

これらの関数のシグネチャを見ると、非常に似ていることがわかります。どちらも`Something -> M<SomethingElse>`の形式です。

```fsharp
val makeLiveHeart : DeadHeart -> M<LiveHeart>
val makeBeatingHeart : LiveHeart -> M<BeatingHeart>
```

### Mを返す関数を連鎖させる

死んだ心臓を出発点とし、鼓動する心臓を得る必要があります。

![heart1](../assets/img/monadster_heart1.png)

しかし、これを直接行うためのツールがありません。

`DeadHeart`を`M<LiveHeart>`に変換する関数と、`LiveHeart`を`M<BeatingHeart>`に変換する関数はあります。

ところが、最初の出力が2番目の入力と互換性がないため、それらを直接つなげることができません。

![heart2](../assets/img/monadster_heart2.png)

そこで、`M<LiveHeart>`を入力として受け取り、それを`M<BeatingHeart>`に変換する関数が必要になります。

さらに、この関数を既に持っている`makeBeatingHeart`関数から構築したいと考えています。

![heart2](../assets/img/monadster_heart3.png)

以下は、これまで何度も使ってきたパターンを応用した第一案です。

```fsharp
let makeBeatingHeartFromLiveHeartM liveHeartM = 

    let becomeAlive vitalForce = 
        // liveHeartMからliveHeartを抽出
        let liveHeart, remainingVitalForce = runM liveHeartM vitalForce 

        // liveHeartを使ってbeatingHeartMを作成
        let beatingHeartM = makeBeatingHeart liveHeart

        // ここに何が入るでしょうか？

        // beatingHeartと残りの生命力を返す
        beatingHeart, remainingVitalForce    

    M becomeAlive 
```

しかし、真ん中には何が入るのでしょうか？`beatingHeartM`から鼓動する心臓を得るにはどうすればよいでしょうか？答えは、生命力を使ってbeatingHeartMを呼び出すことです
（たまたま`becomeAlive`関数の中にいるので、手元に生命力があります）。

どの生命力を使えばよいでしょうか？`liveHeart`を得た後に残った生命力を使用すべきです。

そこで、最終版は次のようになります。

```fsharp
let makeBeatingHeartFromLiveHeartM liveHeartM = 

    let becomeAlive vitalForce = 
        // liveHeartMからliveHeartを抽出
        let liveHeart, remainingVitalForce = runM liveHeartM vitalForce 

        // liveHeartを使ってbeatingHeartMを作成
        let beatingHeartM = makeBeatingHeart liveHeart

        // beatingHeartMを実行してbeatingHeartを取得
        let beatingHeart, remainingVitalForce2 = runM beatingHeartM remainingVitalForce 

        // beatingHeartと残りの生命力を返す
        beatingHeart, remainingVitalForce2    

    // 内部関数をラップして返す
    M becomeAlive
```

最後に`remainingVitalForce2`を返していることに注目してください。これは両方のステップを実行した後の残りです。

この関数のシグネチャを見ると、次のようになっています。

```fsharp
M<LiveHeart> -> M<BeatingHeart>
```

これこそ私たちが求めていたものです！

### bindMの導入

ここでも、`makeBeatingHeart`をハードコーディングする代わりに関数パラメーターを渡すことで、この関数を汎用化できます。

これを`bindM`と呼びましょう。以下がそのコードです。

```fsharp
let bindM f bodyPartM = 
    let becomeAlive vitalForce = 
        let bodyPart, remainingVitalForce = runM bodyPartM vitalForce 
        let newBodyPartM = f bodyPart 
        let newBodyPart, remainingVitalForce2 = runM newBodyPartM remainingVitalForce 
        newBodyPart, remainingVitalForce2    
    M becomeAlive
```

そして、このシグネチャは次のようになります。

```fsharp
f:('a -> M<'b>) -> M<'a> -> M<'b>
```

つまり、`Something -> M<SomethingElse>`型の関数があれば、それを入力と出力の両方が`M`である`M<Something> -> M<SomethingElse>`型の関数に変換できるということです。

ちなみに、`Something -> M<SomethingElse>`のようなシグネチャを持つ関数は、しばしば*モナディック*関数と呼ばれます。

`bindM`の仕組みを理解すれば、次のようなより簡潔な実装も可能です。

```fsharp
let bindM f bodyPartM = 
    let becomeAlive vitalForce = 
        let bodyPart, remainingVitalForce = runM bodyPartM vitalForce 
        runM (f bodyPart) remainingVitalForce 
    M becomeAlive
```

これで、`DeadHeart`を受け取り、`M<BeatingHeart>`を生成する関数を作成する方法がわかりました。

![heart3](../assets/img/monadster_heart4.png)

以下がそのコードです。

```fsharp
// 死んだ心臓を作成
let deadHeart = DeadHeart "Anne"

// 生きた心臓生成器（M<LiveHeart>）を作成
let liveHeartM = makeLiveHeart deadHeart

// liveHeartMとmakeBeatingHeart関数から
// 鼓動する心臓生成器（M<BeatingHeart>）を作成
let beatingHeartM = bindM makeBeatingHeart liveHeartM 
```

このコードには複数の中間ステップがありますが、パイピングを使うとより簡潔になります。

```fsharp
let beatingHeartM = 
   DeadHeart "Anne"
   |> makeLiveHeart 
   |> bindM makeBeatingHeart 
```

### bindの重要性

`bindM`の捉え方の一つは、`mapM`と同様に「関数変換器」だということです。
つまり、任意の「Mを返す」関数を、入力と出力の両方が`M`である関数に変換するのです。

![bindM](../assets/img/monadster_bindm.png)

`map`と同様に、`bind`も他の多くの文脈で登場します。

たとえば、`Option.bind`はオプションを生成する関数（`'a -> 'b option`）を、入力と出力の両方がオプションである関数に変換します。
同様に、`List.bind`はリストを生成する関数（`'a -> 'b list`）を、入力と出力の両方がリストである関数に変換します。

また、[関数型エラーハンドリングに関する私の講演](https://fsharpforfunandprofit.com/rop/)でも、bindの別のバージョンについて詳しく説明しています。

bindが重要な理由は、「Mを返す」関数がよく登場するからです。
これらの関数は、一つのステップの出力が次のステップの入力と一致しないため、簡単に連鎖させることができません。

`bindM`を使うことで、各ステップを入力と出力の両方が`M`である関数に変換できます。これにより、これらの関数を連結できるようになります。

![bindM](../assets/img/monadster_bindm2.png)

### 鼓動する心臓のテスト

いつものように、生命力が到着する前に手順を構築します。今回は、`BeatingHeart`を作る手順です。

```fsharp
let beatingHeartM =
    DeadHeart "Anne" 
    |> makeLiveHeart 
    |> bindM makeBeatingHeart 
```

生命力が利用可能になったら、`beatingHeartM`に生命力を与えて実行します...

```fsharp
let vf = {units = 10}

let beatingHeart, remainingFromHeart = runM beatingHeartM vf
```

...そして、次のような結果が得られます。

```text
val beatingHeart : BeatingHeart = 
    BeatingHeart (LiveHeart ("Anne",{units = 1;}),{units = 1;})

val remainingFromHeart : VitalForce = 
    {units = 8;}
```

残りの生命力が8単位になっていることに注目してください。2つのステップを実行するのに2単位を使用したからです。

## 全身

ついに、完全な体を組み立てるために必要な部品がすべて揃いました。

以下がフランケンファンクター博士による生きた体の定義です。

```fsharp
type LiveBody = {
    leftLeg: LiveLeftLeg
    rightLeg : LiveLeftLeg
    leftArm : LiveLeftArm
    rightArm : LiveRightArm
    head : LiveHead
    heart : BeatingHeart
    }
```

ご覧の通り、これまでに開発したすべてのサブコンポーネントが使われています。

### 二つの左足

フランケンファンクター博士は右足を入手できませんでした。そこで近道を選び、体に*二つの*左足を使うことにしました。誰も気づかないことを願いながらです。

その結果、怪物は二つの左足を持つことになりました。[これは必ずしも障害にはなりません](https://www.youtube.com/watch?v=DC_PACr5cT8&t=55)。実際、
怪物はこの不利な条件を克服しただけでなく、かなりの腕前のダンサーになりました。以下の貴重な映像でそれを確認できます。

[Gene Wilder - Young Frankenstein (1974) - Puttin' on the Ritz](http://web.archive.org/web/20170730132220/https://www.youtube.com/watch?v=w1FLZPFI3jc)

### サブコンポーネントの組み立て

`LiveBody`型には6つのフィールドがあります。これらの様々な`M<BodyPart>`からどのようにして構築できるでしょうか。

一つの方法は、`mapM`と`map2M`で使用した技術を繰り返すことです。`map3M`、`map4M`などを作成できます。

たとえば、`map3M`は次のように定義できます。

```fsharp
let map3M f m1 m2 m3 =
    let becomeAlive vitalForce = 
        let v1,remainingVitalForce = runM m1 vitalForce 
        let v2,remainingVitalForce2 = runM m2 remainingVitalForce  
        let v3,remainingVitalForce3 = runM m3 remainingVitalForce2  
        let v4 = f v1 v2 v3
        v4, remainingVitalForce3    
    M becomeAlive  
```

しかし、こんな繰り返しはすぐに面倒になります。もっと良い方法はないでしょうか。

実は、あります！

ここで、重要なポイントを思い出してください。
`LiveBody`のようなレコード型は、一度にすべてを構築する必要があります。一方、*関数*は違います。カリー化と部分適用という魔法のおかげで、関数は段階的に組み立てることができるのです。

この考え方を使って、`LiveBody`を作成する6パラメータの関数を見てみましょう。

```fsharp
val createBody : 
    leftLeg:LiveLeftLeg ->
    rightLeg:LiveLeftLeg ->
    leftArm:LiveLeftArm ->
    rightArm:LiveRightArm ->
    head:LiveHead -> 
    beatingHeart:BeatingHeart -> 
    LiveBody
```

これを実際には5パラメータの関数を返す*1*パラメータの関数として考えることができます。

```fsharp
val createBody : 
    leftLeg:LiveLeftLeg -> (5パラメータの関数) 
```

そして、最初のパラメータ（"leftLeg"）に関数を適用すると、5パラメータの関数が返ってきます。

```fsharp
(6パラメータの関数) apply (最初のパラメータ) returns (5パラメータの関数)
```

この5パラメータの関数は、次のようなシグネチャになります。

```fsharp
    rightLeg:LiveLeftLeg ->
    leftArm:LiveLeftArm ->
    rightArm:LiveRightArm ->
    head:LiveHead -> 
    beatingHeart:BeatingHeart -> 
    LiveBody
```

この5パラメータの関数も、4パラメータの関数を返す1パラメータの関数として考えることができます。

```fsharp
    rightLeg:LiveLeftLeg -> (4パラメータの関数)
```

再び、最初のパラメータ（"rightLeg"）を適用すると、4パラメータの関数が返ってきます。

```fsharp
(5パラメータの関数) apply (最初のパラメータ) returns (4パラメータの関数)
```

4パラメータの関数は次のようなシグネチャになります。

```fsharp
    leftArm:LiveLeftArm ->
    rightArm:LiveRightArm ->
    head:LiveHead -> 
    beatingHeart:BeatingHeart -> 
    LiveBody
```

このプロセスは続き、最終的に1パラメータの関数になります。この関数のシグネチャは`BeatingHeart -> LiveBody`となります。

最後のパラメータ（"beatingHeart"）を適用すると、完成した`LiveBody`が返ってきます。

この巧妙な手法をM-関連のものにも使えます！

まず、Mでラップされた6パラメータの関数と、M<LiveLeftLeg>パラメータから始めます。

M-関数をM-パラメータに「適用」する方法があると仮定しましょう。すると、Mでラップされた5パラメータの関数が返ってくるはずです。

```fsharp
// 通常バージョン
(6パラメータの関数) apply (最初のパラメータ) returns (5パラメータの関数)

// Mの世界バージョン
M<6パラメータの関数> applyM M<最初のパラメータ> 返す M<5パラメータの関数>
```

そして、これを繰り返すと、次のM-パラメータを適用できます。

```fsharp
// 通常バージョン
(5パラメータの関数) apply (最初のパラメータ) returns (4パラメータの関数)

// Mの世界バージョン
M<5パラメータの関数> applyM M<最初のパラメータ> 返す M<4パラメータの関数>
```

このように、パラメータを一つずつ適用していき、最終結果を得ます。

### applyMの導入

この`applyM`関数は、Mでラップされた関数とMでラップされたパラメータの2つのパラメータを持つことになります。
出力は、関数の結果をMでラップしたものになります。

以下が実装です。

```fsharp
let applyM mf mx =
    let becomeAlive vitalForce = 
        let f,remainingVitalForce = runM mf vitalForce 
        let x,remainingVitalForce2 = runM mx remainingVitalForce  
        let y = f x
        y, remainingVitalForce2    
    M becomeAlive  
```

ご覧の通り、これは`map2M`とよく似ていますが、「f」は最初のパラメータ自体をアンラップすることで得られる点が異なります。

では、試してみましょう！

まず、6パラメータの関数が必要です。

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
```

そして、左足をクローンして右足として使用する必要があります。

```fsharp
let rightLegM = leftLegM
```

次に、この`createBody`関数をMでラップする必要があります。どのようにすればいいでしょうか。

もちろん、先ほど頭蓋骨用に定義した`returnM`関数を使えばいいのです！

これらを組み合わせると、次のようなコードになります。

```fsharp
// createBodyをM-世界に移動 -- Mでラップされた6パラメータの関数
let fSixParamM = returnM createBody           

// 最初のM-パラメータを適用して、Mでラップされた5パラメータの関数を得る
let fFiveParamM = applyM fSixParamM leftLegM   

// 2番目のM-パラメータを適用して、Mでラップされた4パラメータの関数を得る
let fFourParamM = applyM fFiveParamM rightLegM 

// 以下同様
let fThreeParamM = applyM fFourParamM leftArmM
let fTwoParamM = applyM fThreeParamM rightArmM
let fOneParamM = applyM fTwoParamM headM 

// 最後の適用後、結果はM<LiveBody>になる
let bodyM = applyM fOneParamM beatingHeartM   
```

うまくいきました！結果は望み通りの`M<LiveBody>`になりました。

しかし、このコードは見栄えがよくありません。どうすれば良いのでしょうか。

一つの方法は、`applyM`を通常の関数適用のような中置演算子にすることです。この演算子は一般的に`<*>`と書かれます。

```fsharp
let (<*>) = applyM
```

これを使用すると、上記のコードを次のように書き直すことができます。

```fsharp
let bodyM = 
    returnM createBody 
    <*> leftLegM
    <*> rightLegM
    <*> leftArmM
    <*> rightArmM
    <*> headM 
    <*> beatingHeartM
```

これでずっと見やすくなりました！

もう一つの工夫として、`returnM`に`applyM`を続けるのは`mapM`と同じであることに気づくことです。そこで、`mapM`用の中置演算子も作成すると...

```fsharp
let (<!>) = mapM
```

...`returnM`も取り除くことができ、次のようにコードを書けます。

```fsharp
let bodyM = 
    createBody 
    <!> leftLegM
    <*> rightLegM
    <*> leftArmM
    <*> rightArmM
    <*> headM 
    <*> beatingHeartM
```

この書き方には大きな利点があります。記号に慣れてしまえば、まるで元の関数をそのまま呼び出しているかのように読めるのです。

### 全身のテスト

いつものように、生命力が到着する前に事前に手順を構築しておきたいと思います。この場合、生命力が到着したときに完全な`LiveBody`を提供する`bodyM`をすでに作成しました。

あとは稲妻が落ちて、生命力を生成する機械に電力が送られるのを待つだけです！

![研究室の電気](../assets/img/monadster-lab-electricity.gif)<br><sub><a href="https://misfitdaydream.blogspot.co.uk/2012/10/frankenstein-1931.html">出典：Misfit Robot Daydream</a></sub>

来ました ― 生命力が利用可能になりました！急いで通常の方法で`bodyM`を実行します...

```fsharp
let vf = {units = 10}

let liveBody, remainingFromBody = runM bodyM vf
```

...すると、次のような結果が得られます。

```text
val liveBody : LiveBody =
  {leftLeg = LiveLeftLeg ("Boris",{units = 1;});
   rightLeg = LiveLeftLeg ("Boris",{units = 1;});
   leftArm = LiveLeftArm ("Victor",{units = 1;});
   rightArm = {lowerArm = LiveRightLowerArm ("Tom",{units = 1;});
               upperArm = LiveRightUpperArm ("Jerry",{units = 1;});};
   head = {brain = LiveBrain ("Abby Normal",{units = 1;});
           skull = Skull "Yorick";};
   heart = BeatingHeart (LiveHeart ("Anne",{units = 1;}),{units = 1;});}

val remainingFromBody : VitalForce = {units = 2;}
```

生きています！フランケンファンクター博士の成果を見事に再現できました！

注目すべき点が2つあります。まず、体に正しいサブコンポーネントがすべて含まれていることです。
そして、残りの生命力が正しく2単位に減少していることです。これは体を作るのに8単位使用したからです。

## まとめ

この投稿では、以下の操作テクニックを追加で紹介しました。

* 頭蓋骨用の`returnM`
* 鼓動する心臓用の`bindM`
* 全身を組み立てるための`applyM`

*この投稿で使用したコードサンプルは[GitHubで入手可能](https://gist.github.com/swlaschin/54489d9586402e5b1e8a)です。*

## 次回

[最終回](../posts/monadster-3.md)では、コードをリファクタリングし、使用したすべてのテクニックを振り返ります。

