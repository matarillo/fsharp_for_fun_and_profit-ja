---
layout: post
title: "フランケンファンクター博士とモナド怪物"
description: "または、19世紀の科学者がStateモナドをほぼ発明した話"
categories: [部分適用, カリー化, コンビネーター]
image: "/assets/img/monadster_horror.jpg"
seriesId: "状態の取り扱い"
seriesOrder: 1
---

*注：このトピックに関する私の講演のスライドとビデオが[こちら](https://fsharpforfunandprofit.com/monadster/)にあります。*

*警告：この記事には、ぞっとするような話題、無理のある例え、モナドに関する議論が含まれています。*

何世代にもわたって、私たちはフランケンファンクター博士の悲劇的な物語に魅了されてきました。
生命力の探求、電気と電気生理学の初期実験、
そして最終的に死体のパーツを集めて命を吹き込むという画期的な成果。
モナド怪物の誕生です。

しかし、その後、私たち全員が知っているように、怪物は逃亡し、
自由になったモナド怪物はコンピュータサイエンスの会議を荒らし回り、ベテランのプログラマーたちでさえ恐怖に陥れました。

![恐怖、恐怖](../assets/img/monadster_horror.jpg)

*キャプション：1990年のACM LISPと関数型プログラミングに関する会議での恐ろしい出来事。*

ここでは詳細を繰り返すつもりはありません。その物語はまだあまりにも恐ろしいのです。

しかし、この悲劇に捧げられた何百万もの言葉の中で、一つのトピックが十分に扱われていません。

*怪物はどのように組み立てられ、命を吹き込まれたのか？*

フランケンファンクター博士が死体のパーツから怪物を作り、雷の閃光で生命力を与えて一瞬で命を吹き込んだことはよく知られています。

しかし、バラバラになった身体のパーツを一つに組み上げ、生命力を適切に全身に伝達しなければなりません。
そして、これらすべてを雷が落ちる瞬間、一瞬のうちに成し遂げなければなりません。

私は長年にわたりこの問題を研究し、最近、多額の費用をかけてフランケンファンクター博士の個人研究ノートを入手することができました。

そして今回、フランケンファンクター博士の手法を公表します。お好きなように使ってください。私はその道徳性について判断を下すつもりはありません。
結局のところ、私たちが作り出したものが現実世界にどのような影響を与えるかを、ただの開発者が疑問視することなどできないのです。

## 背景

まず、基本的なプロセスを理解する必要があります。

フランケンファンクター博士は、全身の死体を入手できなかったことを知っておく必要があります。代わりに、怪物は、腕、足、脳、心臓など、死体のパーツを集めて作られました。
その出所は不明で、語らない方が賢明でしょう。

フランケンファンクター博士は、死体のパーツから始め、それに一定量の生命力を注入しました。その結果、2つのことが起こりました。
死体のパーツは生き返り、残った生命力は減少したのです。生命力の一部は生き返ったパーツに移されたからです。

ここに原理を示す図があります。

![原理](../assets/img/monadster1.png)

しかし、これでは体のパーツを*一つ*作るだけです。どうすれば複数のパーツを作れるでしょうか？これがフランケンファンクター博士が直面した課題でした。

最初の問題は、生命力の量が限られていることです。
つまり、2つ目の体のパーツに命を吹き込む必要があるとき、前の段階で残った生命力しか使えません。

どうすれば2つのステップをつなげて、最初のステップの生命力を2つ目のステップの入力に供給できるでしょうか？

![ステップの接続](../assets/img/monadster_connect.png)

ステップを正しくつなげたとしても、生き返った様々なパーツを何らかの方法で組み合わせる必要があります。しかし、生き返ったパーツにアクセスできるのは創造の瞬間だけです。
どうすればその一瞬のうちにそれらを組み合わせられるでしょうか？

![各ステップの出力の組み合わせ](../assets/img/monadster_combine.png)

フランケンファンクター博士の天才的な発想により、これらの問題を解決する優雅なアプローチが生まれました。これから私がご紹介するそのアプローチです。

## 共通のコンテキスト

体のパーツの組み立てについて具体的に議論する前に、手順の残りの部分に必要な共通の機能について少し時間を割きましょう。

まず、ラベル型が必要です。フランケンファンクター博士は使用されるパーツの出所を厳密にラベル付けする規律を持っていました。

```fsharp
type Label = string
```

生命力は単純なレコード型でモデル化します。

```fsharp
type VitalForce = {units:int}
```

生命力を頻繁に使用するので、1単位を取り出し、その単位と残りの力のタプルを返す関数を作ります。

```fsharp
let getVitalForce vitalForce = 
   let oneUnit = {units = 1}
   let remaining = {units = vitalForce.units-1}  // 減算
   oneUnit, remaining  // 両方を返す
```

## 左脚

共通コードの準備ができたので、本題に戻りましょう。

フランケンファンクター博士のノートによると、まず下肢が作られました。研究室に転がっていた左脚が出発点でした。

```fsharp
type DeadLeftLeg = DeadLeftLeg of Label 
```

この脚から、同じラベルと1単位の生命力を持つ生きた脚を作ることができました。

```fsharp
type LiveLeftLeg = LiveLeftLeg of Label * VitalForce
```

作成関数の型シグネチャは次のようになります。

```fsharp
type MakeLiveLeftLeg = 
    DeadLeftLeg * VitalForce -> LiveLeftLeg * VitalForce 
```

実際の実装は次のとおりです。

```fsharp
let makeLiveLeftLeg (deadLeftLeg,vitalForce) = 
    // パターンマッチングを使って死んだ脚からラベルを取得
    let (DeadLeftLeg label) = deadLeftLeg
    // 生命力を1単位取得
    let oneUnit, remainingVitalForce = getVitalForce vitalForce 
    // ラベルと生命力から生きた脚を作成
    let liveLeftLeg = LiveLeftLeg (label,oneUnit)
    // 脚と残りの生命力を返す
    liveLeftLeg, remainingVitalForce    
```

ご覧のとおり、この実装は先ほどの図と完全に一致します。

![バージョン1](../assets/img/monadster1.png)

この時点で、フランケンファンクター博士は2つの重要な洞察を得ました。

最初の洞察は、[カリー化](../posts/currying.md)のおかげで、関数をタプルを受け取る関数から、各パラメータを順番に渡す2つのパラメータを持つ関数に変換できることでした。

![バージョン2](../assets/img/monadster2.png)

コードは次のようになりました。

```fsharp
type MakeLiveLeftLeg = 
    DeadLeftLeg -> VitalForce -> LiveLeftLeg * VitalForce 

let makeLiveLeftLeg deadLeftLeg vitalForce = 
    let (DeadLeftLeg label) = deadLeftLeg
    let oneUnit, remainingVitalForce = getVitalForce vitalForce 
    let liveLeftLeg = LiveLeftLeg (label,oneUnit)
    liveLeftLeg, remainingVitalForce    
```

2つ目の洞察は、この*同じ*コードが、「生き返る」関数を返す関数として解釈できることでした。

つまり、死んだ部分は手元にありますが、雷が落ちる最後の瞬間まで生命力はありません。
そこで、死んだ部分を今すぐ処理し、生命力が利用可能になったときに使える関数を返すのはどうでしょうか。

言い換えると、死んだ部分を渡すと、生命力が与えられたときに生きた部分を作る関数が返ってくるのです。

![バージョン3](../assets/img/monadster3.png)

これらの「生き返る」関数は、組み合わせる方法さえ見つかれば、「レシピの手順」として扱うことができます。

コードは次のようになります。

```fsharp
type MakeLiveLeftLeg = 
    DeadLeftLeg -> (VitalForce -> LiveLeftLeg * VitalForce)

let makeLiveLeftLeg deadLeftLeg = 
    // 内部の中間関数を作成
    let becomeAlive vitalForce = 
        let (DeadLeftLeg label) = deadLeftLeg
        let oneUnit, remainingVitalForce = getVitalForce vitalForce 
        let liveLeftLeg = LiveLeftLeg (label,oneUnit)
        liveLeftLeg, remainingVitalForce    
    // それを返す
    becomeAlive 
```

一見分かりにくいかもしれませんが、これは前のバージョンと*まったく同じコード*で、少し違う書き方をしているだけです。

このカリー化された関数（2つのパラメータを持つ）は、通常の2つのパラメータを持つ関数として解釈することも、
*別の*1つのパラメータを持つ関数を返す*1つのパラメータ*を持つ関数として解釈することもできます。

これが分かりにくい場合は、もっと単純な2つのパラメータを持つ`add`関数の例を考えてみましょう。

```fsharp
let add x y = 
    x + y
```

F#はデフォルトで関数をカリー化するので、この実装は次のものとまったく同じです。
 
```fsharp
let add x = 
    fun y -> x + y
```

中間関数を定義すれば、これも次のものとまったく同じです。

```fsharp
let add x = 
    let addX y = x + y
    addX // 関数を返す
```

### モナド怪物型の作成

先を見据えると、生きた体のパーツを作成するすべての関数に同じアプローチを使えることがわかります。

それらの関数はすべて、`VitalForce -> LiveBodyPart * VitalForce`のようなシグネチャを持つ関数を返します。

私たちの作業を簡単にするために、その関数シグネチャに「M」という名前をつけましょう。これは「モナド怪物パーツ生成器」を表します。
また、多くの異なる体のパーツで使えるように、`'LiveBodyPart`というジェネリック型パラメータを与えます。

```fsharp
type M<'LiveBodyPart> = 
    VitalForce -> 'LiveBodyPart * VitalForce
```

これで、`makeLiveLeftLeg`関数の戻り値の型を`:M<LiveLeftLeg>`と明示的に注釈できます。

```fsharp
let makeLiveLeftLeg deadLeftLeg :M<LiveLeftLeg> = 
    let becomeAlive vitalForce = 
        let (DeadLeftLeg label) = deadLeftLeg
        let oneUnit, remainingVitalForce = getVitalForce vitalForce 
        let liveLeftLeg = LiveLeftLeg (label,oneUnit)
        liveLeftLeg, remainingVitalForce    
    becomeAlive
```

関数の残りの部分は変更されていません。`becomeAlive`の戻り値がすでに`M<LiveLeftLeg>`と互換性があるからです。

しかし、毎回明示的に注釈を付けるのは好きではありません。関数を単一ケースの共用体（「M」 としましょう）でラップして、独自の明確な型を与えるのはどうでしょうか。次のようになります。

```fsharp
type M<'LiveBodyPart> = 
    M of (VitalForce -> 'LiveBodyPart * VitalForce)
```

こうすれば、[「モナド怪物パーツ生成器」と通常のタプルを返す関数を区別](https://stackoverflow.com/questions/2595673/state-monad-why-not-a-tuple)できます。

この新しい定義を使うには、中間関数を返すときに単一ケースの共用体`M`でラップするようにコードを少し調整する必要があります。次のようにします。

```fsharp
let makeLiveLeftLegM deadLeftLeg  = 
    let becomeAlive vitalForce = 
        let (DeadLeftLeg label) = deadLeftLeg
        let oneUnit, remainingVitalForce = getVitalForce vitalForce 
        let liveLeftLeg = LiveLeftLeg (label,oneUnit)
        liveLeftLeg, remainingVitalForce    
    // 変更点！        
    M becomeAlive // 関数を単一ケースの共用体でラップ
```

この最後のバージョンでは、型シグネチャを明示的に指定しなくても正しく推論されます。死んだ左脚を受け取り、生きた脚の「M」を返す関数です。

```fsharp
val makeLiveLeftLegM : DeadLeftLeg -> M<LiveLeftLeg>
```

関数名を`makeLiveLeftLegM`に変更したことに注意してください。`LiveLeftLeg`の`M`を返すことを明確にするためです。

### Mの意味

では、この「M」型は正確には何を意味するのでしょうか？どう理解すればいいのでしょうか？

一つの有効な考え方は、`M<T>`を`T`を作成するための*レシピ*と捉えることです。生命力をくれれば、`T`を返すというわけです。

しかし、`M<T>`はどうやって無から`T`を作り出せるのでしょうか？

ここで`makeLiveLeftLegM`のような関数が非常に重要になります。これらはパラメータを受け取り、結果に「焼き込む」（つまり、パラメータの値を結果の一部として組み込む）のです。
結果として、似たようなシグネチャを持つ多くの「M作成」関数が見られるでしょう。すべて次のような感じです。

![](../assets/img/monadster5.png)

コードで表すと次のようになります。

```fsharp
DeadPart -> M<LivePart>
```

これからの課題は、これらをエレガントに組み合わせる方法を見つけることです。

### 左脚のテスト

さて、これまでの内容をテストしてみましょう。

まず、死んだ脚を作成し、`makeLiveLeftLegM`を使ってそれを`M<LiveLeftLeg>`に変換します。

```fsharp
let deadLeftLeg = DeadLeftLeg "Boris"
let leftLegM = makeLiveLeftLegM deadLeftLeg
```

`leftLegM`は何でしょうか？生命力が与えられたときに生きた左脚を作るためのレシピです。

便利なのは、このレシピを*前もって*、つまり雷が落ちる*前に*作成できることです。

さて、嵐が来て、雷が落ち、10単位の生命力が利用可能になったと想像してみましょう。

```fsharp
let vf = {units = 10}
```

`leftLegM`の中には生命力に適用できる関数があります。
しかし、まずパターンマッチングを使ってラッパーから関数を取り出す必要があります。

```fsharp
let (M innerFn) = leftLegM 
```

そして、内部関数を実行して生きた左脚と残りの生命力を得ることができます。

```fsharp
let liveLeftLeg, remainingAfterLeftLeg = innerFn vf
```

結果は次のようになります。

```text
val liveLeftLeg : LiveLeftLeg = 
   LiveLeftLeg ("Boris",{units = 1;})
val remainingAfterLeftLeg : VitalForce = 
   {units = 9;}
```

`LiveLeftLeg`が正常に作成され、残りの生命力が9単位に減少したことがわかります。

このパターンマッチングは面倒なので、内部関数をラップ解除して呼び出す処理を一度に行うヘルパー関数を作りましょう。

`runM`と呼ぶことにし、次のようになります。

```fsharp
let runM (M f) vitalForce = f vitalForce 
```

これで、上のテストコードは次のように簡略化されます。

```fsharp
let liveLeftLeg, remainingAfterLeftLeg = runM leftLegM vf  
```

これで、生きた左脚を作成できる関数ができました。

実現するのに時間がかかりましたが、今後の作業に使える便利なツールと概念も構築できました。

## 右脚

これで何をすべきかわかったので、他の体のパーツにも同じ技術を使えるはずです。

では、右脚はどうでしょうか？

残念ながら、ノートによると、フランケンファンクター博士は研究室で右脚を見つけられませんでした。この問題はちょっとしたハックで解決されました...しかし、それについてはまた後で説明します。

## 左腕

次に、腕が作られました。左腕から始めます。

しかし、問題がありました。研究室には*折れた*左腕しかありませんでした。最終的な体に使う前に、腕を治す必要がありました。

フランケンファンクター博士は医者なので、折れた腕の治し方は知っていました。ただし、生きている腕に限ります。死んだ折れた腕を治そうとするのは不可能でしょう。

コード的には、次のようになります。

```fsharp
type DeadLeftBrokenArm = DeadLeftBrokenArm of Label 

// 折れた腕の生きたバージョン
type LiveLeftBrokenArm = LiveLeftBrokenArm of Label * VitalForce

// 健康な腕の生きたバージョン（死んだバージョンは利用不可）
type LiveLeftArm = LiveLeftArm of Label * VitalForce

// 折れた左腕を健康な左腕に変える操作
type HealBrokenArm = LiveLeftBrokenArm -> LiveLeftArm 
```

課題は、手元にある材料から生きた左腕をどうやって作るか、でした。

まず、`DeadLeftUnbrokenArm`から`LiveLeftArm`を作ることは除外しなければなりません。そのようなものは存在しないからです。また、`DeadLeftBrokenArm`を直接健康な`LiveLeftArm`に変換することもできません。

![死から死への変換](../assets/img/monadster_map1.png)

しかし、`DeadLeftBrokenArm`を*生きた*折れた腕に変え、そして生きた折れた腕を治すことはできるのではないでしょうか。

![生きた折れた腕を直接作ることはできない](../assets/img/monadster_map2.png)

いいえ、残念ながらそれはうまくいきません。生きた部分を直接作ることはできず、`M`レシピのコンテキスト内でのみ生きた部分を作ることができます。

必要なのは、`healBrokenArm`の特別なバージョン（`healBrokenArmM`と呼びましょう）を作ることです。これは`M<LiveBrokenArm>`を`M<LiveArm>`に変換します。

![生きた折れた腕を直接作ることはできない](../assets/img/monadster_map3.png)

しかし、そのような関数をどのように作ればよいでしょうか？そして、その中で`healBrokenArm`をどのように再利用できるでしょうか？

最も直接的な実装から始めましょう。

まず、関数は何かの `M` を返すので、以前に見た`makeLiveLeftLegM`関数と同じ形になります。
vitalForceパラメータを持つ内部関数を作成し、それを`M`でラップして返す必要があります。

しかし、以前見た関数とは異なり、この関数はパラメータとしても`M`（`M<LiveBrokenArm>`）を持ちます。この入力から必要なデータをどのように抽出すればよいでしょうか？

簡単です。vitalForceで実行するだけです。そしてvitalForceはどこから得るのでしょうか？内部関数のパラメータからです！

完成版は次のようになります。

```fsharp
// HealBrokenArmの実装
let healBrokenArm (LiveLeftBrokenArm (label,vf)) = LiveLeftArm (label,vf)

/// M<LiveLeftBrokenArm>をM<LiveLeftArm>に変換する
let makeHealedLeftArm brokenArmM = 

    // vitalForceパラメータを取る新しい内部関数を作成
    let healWhileAlive vitalForce = 
        // 入力のbrokenArmMをvitalForceで実行して
        // 折れた腕を得る
        let brokenArm,remainingVitalForce = runM brokenArmM vitalForce 
        
        // 折れた腕を治す
        let healedArm = healBrokenArm brokenArm

        // 治った腕と残りのVitalForceを返す
        healedArm, remainingVitalForce

    // 内部関数をラップして返す
    M healWhileAlive  
```

このコードを評価すると、次のようなシグネチャが得られます。

```fsharp
val makeHealedLeftArm : M<LiveLeftBrokenArm> -> M<LiveLeftArm>
```

これはまさに私たちが求めていたものです！

しかし、まだ改善の余地があります。

`healBrokenArm`変換をハードコードしてしまいました。他の変換を行いたい場合や、他の体の部分に対して行いたい場合はどうすればよいでしょうか？
この関数をもう少し汎用的にできないでしょうか？

はい、簡単です。体の部分を変換する関数（例えば「f」）を渡すだけです。次のようにします。

```fsharp
let makeGenericTransform f brokenArmM = 

    // vitalForceパラメータを取る新しい内部関数を作成
    let healWhileAlive vitalForce = 
        let brokenArm,remainingVitalForce = runM brokenArmM vitalForce 
        
        // 渡されたfを使って折れた腕を治す
        let healedArm = f brokenArm
        healedArm, remainingVitalForce

    M healWhileAlive  
```

驚くべきことに、`f`パラメータでその一つの変換をパラメータ化することで、*関数全体*が汎用的になりました！

他の変更は加えていませんが、`makeGenericTransform`のシグネチャはもはや腕を参照していません。何にでも使えるのです！
 
```fsharp
val makeGenericTransform : f:('a -> 'b) -> M<'a> -> M<'b>
```

### mapMの導入

現在の名前では紛らわしいので、改名しましょう。
`mapM`と呼ぶことにします。これはどんな体の部分にも、どんな変換にも使えます。

以下は実装例です。内部の名前も修正しています。
 
```fsharp
let mapM f bodyPartM = 
    let transformWhileAlive vitalForce = 
        let bodyPart,remainingVitalForce = runM bodyPartM vitalForce 
        let updatedBodyPart = f bodyPart
        updatedBodyPart, remainingVitalForce
    M transformWhileAlive 
```

特に、これは`healBrokenArm`関数でも機能するので、`M`で動作するように昇格された「heal」のバージョンを作るには、次のように書くだけです。

```fsharp
let healBrokenArmM = mapM healBrokenArm
```

![healを使ったmapM](../assets/img/monadster_map4.png)

### mapMの重要性

`mapM`を考える一つの方法は、「関数変換器」だと捉えることです。任意の「通常の」関数を受け取り、入力と出力が`M`である関数に変換します。

![mapM](../assets/img/monadster_mapm.png)

`mapM`に似た関数は多くの状況で登場します。例えば、`Option.map`は「通常の」関数を入力と出力がオプションである関数に変換します。
同様に、`List.map`は「通常の」関数を入力と出力がリストである関数に変換します。他にも多くの例があります。

```fsharp
// mapはオプションで動作する
let healBrokenArmO = Option.map healBrokenArm
// LiveLeftBrokenArm option -> LiveLeftArm option

// mapはリストで動作する
let healBrokenArmL = List.map healBrokenArm
// LiveLeftBrokenArm list -> LiveLeftArm list
```

新しく感じるかもしれないのは、「ラッパー」型`M`がOptionやListのような単純なデータ構造ではなく、*関数*を含んでいることです。これは頭を悩ませるかもしれません！

さらに、上の図は`M`が*任意の*通常の型をラップでき、`mapM`が*任意の*通常の関数をマップできることを示唆しています。

試してみましょう！

```fsharp
let isEven x = (x%2 = 0)   // int -> bool
// マップする
let isEvenM = mapM isEven  // M<int> -> M<bool>

let isEmpty x = (String.length x)=0  // string -> bool
// マップする
let isEmptyM = mapM isEmpty          // M<string> -> M<bool>
```

はい、機能しています！

### 左腕のテスト

再び、これまでの内容をテストしてみましょう。

まず、死んだ折れた腕を作成し、`makeLiveLeftBrokenArm`を使ってそれを`M<BrokenLeftArm>`に変換します。

```fsharp
let makeLiveLeftBrokenArm deadLeftBrokenArm = 
    let (DeadLeftBrokenArm label) = deadLeftBrokenArm
    let becomeAlive vitalForce = 
        let oneUnit, remainingVitalForce = getVitalForce vitalForce 
        let liveLeftBrokenArm = LiveLeftBrokenArm (label,oneUnit)
        liveLeftBrokenArm, remainingVitalForce    
    M becomeAlive

/// 死んだ左折れ腕を作成
let deadLeftBrokenArm = DeadLeftBrokenArm "Victor"

/// 死んだ腕からM<BrokenLeftArm>を作成
let leftBrokenArmM = makeLiveLeftBrokenArm deadLeftBrokenArm 
```

これで`mapM`と`healBrokenArm`を使って`M<BrokenLeftArm>`を`M<LeftArm>`に変換できます。

```fsharp
let leftArmM = leftBrokenArmM |> mapM healBrokenArm 
```

`leftArmM`に入っているのは、折れていない生きた左腕を作るためのレシピです。あとは生命力を加えるだけです。

以前と同様に、これらすべてを雷が落ちる前に前もって行うことができます。

さて、嵐が来て、雷が落ち、生命力が利用可能になったとき、
`leftArmM`を生命力で実行できます。

```fsharp
let vf = {units = 10}

let liveLeftArm, remainingAfterLeftArm = runM leftArmM vf
```

結果は次のようになります。

```text
val liveLeftArm : LiveLeftArm = 
    LiveLeftArm ("Victor",{units = 1;})
val remainingAfterLeftArm : 
    VitalForce = {units = 9;}
```

望んでいた通りの生きた左腕ができました。

## 右腕

次は右腕です。

ここでもまた問題がありました。フランケンファンクター博士のノートによると、完全な腕は入手できませんでした。
しかし、*下腕*と*上腕*はありました。

```fsharp
type DeadRightLowerArm = DeadRightLowerArm of Label 
type DeadRightUpperArm = DeadRightUpperArm of Label 
```

これらは対応する生きた部分に変換できます。

```fsharp
type LiveRightLowerArm = LiveRightLowerArm of Label * VitalForce
type LiveRightUpperArm = LiveRightUpperArm of Label * VitalForce
```

フランケンファンクター博士は2つの腕の部分を結合して全体の腕にする手術を行うことにしました。

```fsharp
// 全体の腕を定義
type LiveRightArm = {
    lowerArm : LiveRightLowerArm
    upperArm : LiveRightUpperArm
    }

// 2つの腕の部分を結合する手術
let armSurgery lowerArm upperArm =
    {lowerArm=lowerArm; upperArm=upperArm}
```

折れた腕の手術と同様に、この手術も*生きている*部分でしか行えません。死んだ部分を使うなんて、気持ち悪くてゾッとします。

しかし、折れた腕の場合と同様に、生きた部分に直接アクセスすることはできず、`M`ラッパーのコンテキスト内でのみアクセスできます。

言い換えると、通常の生きた部分で動作する`armSurgery`関数を、`M`で動作する`armSurgeryM`関数に変換する必要があります。

![armsurgeryM](../assets/img/monadster_armsurgeryM.png)

以前と同じアプローチを使えます。

* vitalForceパラメータを取る内部関数を作成する
* 入力パラメータをvitalForceで実行してデータを抽出する
* 内部関数から手術後の新しいデータを返す
* 内部関数を「M」でラップして返す

以下がコードです。

```fsharp
/// M<LiveRightLowerArm>とM<LiveRightUpperArm>をM<LiveRightArm>に変換する
let makeArmSurgeryM_v1 lowerArmM upperArmM =

    // vitalForceパラメータを取る新しい内部関数を作成
    let becomeAlive vitalForce = 
        // 入力のlowerArmMをvitalForceで実行して
        // 下腕を取得
        let liveLowerArm,remainingVitalForce = runM lowerArmM vitalForce 
        
        // 入力のupperArmMをremainingVitalForceで実行して
        // 上腕を取得
        let liveUpperArm,remainingVitalForce2 = runM upperArmM remainingVitalForce 

        // 手術を行って全体の右腕を作成
        let liveRightArm = armSurgery liveLowerArm liveUpperArm

        // 全体の腕と2回目の残りのVitalForceを返す
        liveRightArm, remainingVitalForce2  
          
    // 内部関数をラップして返す
    M becomeAlive  
```

折れた腕の例との大きな違いは、もちろん*2つ*のパラメータがあることです。
2番目のパラメータを実行するとき（`liveUpperArm`を取得するため）、元のものではなく、最初のステップの*残りの生命力*を渡す必要があります。

そして、内部関数から戻るとき、他のどの生命力でもなく、`remainingVitalForce2`（2番目のステップ後の残り）を返す必要があります。

このコードをコンパイルすると、次のような結果が得られます。

```fsharp
M<LiveRightLowerArm> -> M<LiveRightUpperArm> -> M<LiveRightArm>
```

これはまさに私たちが求めていたシグネチャです。

### map2Mの導入

しかし、以前と同様に、これをさらに汎用的にできないでしょうか？`armSurgery`をハードコーディングする必要はありません。パラメータとして渡すことができます。

より汎用的な関数を`map2M`と呼びましょう。`mapM`と同じですが、2つのパラメータを持ちます。

以下が実装です。

```fsharp
let map2M f m1 m2 =
    let becomeAlive vitalForce = 
        let v1,remainingVitalForce = runM m1 vitalForce 
        let v2,remainingVitalForce2 = runM m2 remainingVitalForce  
        let v3 = f v1 v2
        v3, remainingVitalForce2    
    M becomeAlive  
```

そしてそのシグネチャは次のようになります。

```fsharp
f:('a -> 'b -> 'c) -> M<'a> -> M<'b> -> M<'c>
```

`mapM`と同様に、この関数を「関数変換器」として解釈できます。これは「通常の」2パラメータ関数を`M`の世界の関数に変換します。

![map2M](../assets/img/monadster_map2m.png)


### 右腕のテスト

再び、これまでの内容をテストしてみましょう。

いつものように、死んだ部分を生きた部分に変換する関数が必要です。

```fsharp
let makeLiveRightLowerArm (DeadRightLowerArm label) = 
    let becomeAlive vitalForce = 
        let oneUnit, remainingVitalForce = getVitalForce vitalForce 
        let liveRightLowerArm = LiveRightLowerArm (label,oneUnit)
        liveRightLowerArm, remainingVitalForce    
    M becomeAlive

let makeLiveRightUpperArm (DeadRightUpperArm label) = 
    let becomeAlive vitalForce = 
        let oneUnit, remainingVitalForce = getVitalForce vitalForce 
        let liveRightUpperArm = LiveRightUpperArm (label,oneUnit)
        liveRightUpperArm, remainingVitalForce    
    M becomeAlive
```
    
*ところで、これらの関数に多くの重複があることに気づいていますか？私も気づきました！後でそれを修正しようと思います。*
    
次に、パーツを作成します。

```fsharp
let deadRightLowerArm = DeadRightLowerArm "Tom"
let lowerRightArmM = makeLiveRightLowerArm deadRightLowerArm 

let deadRightUpperArm = DeadRightUpperArm "Jerry"
let upperRightArmM = makeLiveRightUpperArm deadRightUpperArm
```

そして、全体の腕を作る関数を作成します。

```fsharp
let armSurgeryM  = map2M armSurgery 
let rightArmM = armSurgeryM lowerRightArmM upperRightArmM 
```
  
いつものように、これらすべてを雷が落ちる前に前もって行うことができます。必要なときにすべてを実行するレシピ（または*計算*と呼んでもよいでしょう）を構築しているのです。

生命力が利用可能になったら、`rightArmM`を生命力で実行できます。

```fsharp
let vf = {units = 10}

let liveRightArm, remainingFromRightArm = runM rightArmM vf  
```

結果は次のようになります。

```text
val liveRightArm : LiveRightArm =
    {lowerArm = LiveRightLowerArm ("Tom",{units = 1;});
     upperArm = LiveRightUpperArm ("Jerry",{units = 1;});}

val remainingFromRightArm : VitalForce = 
    {units = 8;}
```

要求通りの、2つの副構成要素で構成される生きた右腕ができました。

また、残りの生命力が*8*に減少していることにも注目してください。2単位の生命力を正しく使用しました。

## まとめ

この記事では、雷が落ちたときにのみ活性化できる「生き返る」関数をラップした`M`型を作成する方法を見ました。

また、様々なM値を`mapM`（折れた腕の場合）と`map2M`（2つの部分からなる腕の場合）を使って処理し、組み合わせる方法も見ました。

*この記事で使用したコードサンプルは[GitHubで入手可能](https://gist.github.com/swlaschin/54489d9586402e5b1e8a)です。*

## 次回予告

この刺激的な物語にはさらなるショッキングな展開が待っています！[次回](../posts/monadster-2.md)をお楽しみに。頭と体がどのように作られたかを明かします。

