---
layout: post  
title: "織物用ソフトウェアの設計: パート2"  
description: "ジェネリクスを使用して重複を減らす"  
date: 2025-12-28
categories: []  
seriesId: "Designing Weaving Software"  
seriesOrder: 2
---
<div style="font-size: 1.2em; color: #999999; margin: 0 0 4px 0; line-height: 1.3em;">ジェネリクスを使用して重複を減らす</div>

これは、織り手のためのソフトウェア設計に関するシリーズの2番目の記事です。 これらの記事は、私が実際のプロジェクトを構築する際に出会った設計上の課題に基づいた、ランダムな思考や考察をまとめたものです。 [最初の記事](./designing-weaving-software.html)では、このプロジェクトの背景を説明し、初期のドメイン駆動設計のコードを提示しました。 本記事と次の記事では、次の段階である「テキスト表現とドメインモデルの間の変換」へと進みます。

しかしその前に、ジェネリクスの使用について再検討してみましょう。

## ジェネリクスの再登場

前回の記事で、ドメイン型をジェネリックにすると（型パラメータを追加すると）、ドメイン型がより混乱しやすく、理解しにくくなると述べました。 以下は、非ジェネリックな3つのドメイン型ですが、見ての通り、構造が非常によく似ています。

```fsharp
type ThreadingBlock =
  /// 単一の糸
  | Single of ThreadingEnd
  /// 糸またはサブグループのコレクション
  | InlineGroup of ThreadingBlock list
  /// 文字ラベルを使用して別に定義された定義を参照する
  | LabeledGroup of GroupLabel
  /// ブロックをN回繰り返す
  | Repeat of ThreadingBlock * RepeatCount

type LiftplanBlock =
  | Single of LiftplanPick
  | InlineGroup of LiftplanBlock list
  | LabeledGroup of GroupLabel
  | Repeat of LiftplanBlock * RepeatCount

type ColorPatternUnit =
  | Single of ColorIndex
  | InlineGroup of ColorPatternUnit list
  | LabeledGroup of GroupLabel
  | Repeat of ColorPatternUnit * RepeatCount
  | Mirrored of ColorPatternUnit 
```

そして、こちらがジェネリック版です。 シンプルですが、ドメイン中心の用語が失われています。

```fsharp
type Block<'single,'transform> =
  | Single of 'single
  | InlineGroup of Block<'single,'transform> list
  | LabeledGroup of GroupLabel
  | Transform of Block<'single,'transform> * 'transform
```

ジェネリックな `List<>` 型のように、ジェネリクスが理にかなう高い抽象レベルが存在する場合もあります。 しかし、この特定のドメインにおいては、関連性のある「より高い意味レベル」は存在しません。 そのため、私は型をパラメータ化してジェネリックにすることを望みませんでした。

しかし……。

（ドメインモデルではなく）**実装**に関しては、コードが少し複雑になるのと引き換えに、重複を避けることに抵抗はありません。

例えば、これらの構造に対して行いたい操作がいくつかあります。

* 再帰的なブロックを、`ThreadingEnd`、`LiftplanPick`、`ColorIndex` などの単一の値のリストに「フラット化」する。
    * `ThreadingBlock -> ThreadingEnd list`
    * `LiftplanBlock -> LiftplanPick list`
    * `ColorPatternUnit -> ColorIndex list`

* これらをテキスト表現に変換する。
    * `ThreadingBlock -> string`
    * `LiftplanBlock -> string`
    * `ColorPatternUnit -> string`

* （パーサーを使用して）文字列からこれらを構築する。
    * `string -> ThreadingBlock`
    * `string -> LiftplanBlock`
    * `string -> ColorPatternUnit`

これらの関数は、ドメイン型ごとに個別に記述する必要がありますが、それは多大な重複となります。

以下は `ThreadingBlock` に対する `flattenToSingles` の実装です。 `LiftplanBlock` や `ColorPatternUnit` の実装も非常によく似ています。

```fsharp
/// 便宜上、マップにエイリアスを付ける
type LabeledThreadingGroups = Map<GroupLabel,ThreadingBlock list>

let flattenToSingles 
  (labeledGroups:LabeledThreadingGroups)
  (threadingBlock:ThreadingBlock) 
  :ThreadingEnd list =

  // 再帰に使用する関数を定義する
  let rec recurse block =
    match block with
    | ThreadingBlock.Single threadingEnd ->
        [threadingEnd]
    | ThreadingBlock.InlineGroup blocks ->
        // 各サブブロックを再帰的にフラット化する
        blocks 
        |> List.collect recurse
    | ThreadingBlock.LabeledGroup label ->
        // 参照の場合、`labeledGroups` パラメータから参照されたグループを見つけ、
        // それを再帰的にフラット化する
        labeledGroups 
        |> Map.tryFind label
        // 見つからない場合は空のリストを返す
        |> Option.defaultValue []
        |> List.collect recurse
    | ThreadingBlock.Repeat (block,RepeatCount repeatCount) ->
        let ends = recurse block
        List.replicate repeatCount ends |> List.collect id

  // トップレベルのブロックで呼び出す
  recurse threadingBlock
```

[3つ以上の似たような実装](https://en.wikipedia.org/wiki/Rule_of_three_%28computer_programming%29)がある場合、重複を避けることは理にかなっています。 ジェネリクスへのリファクタリングが今回問題になるとは思いません。なぜなら、これはドメインモデルとは異なるコンテキストだからです。

* 実装コードはドメインを理解する上で不可欠なものではありません。
* ドメインモデル自体が理解可能である限り、実装はより複雑になっても構いません。
* Sandi Metz氏が言う[「間違った抽象化」](https://sandimetz.com/blog/2016/1/20/the-wrong-abstraction)（非常におすすめの講演です）の罠に陥る可能性も低いです。なぜなら、ドメインモデルの一つが十分に変化したとしても、ジェネリックな実装を拒否して、よりカスタムな実装をコードし直すことが容易だからです。

実際、ジェネリックな実装を使用することにはメリットもあります。

* 機能の追加が容易になる（進化させるべき実装が1つだけで済む）。
* バグが減少する（修正すべき実装が1つだけで済む）。
* テストを削減できる（テストすべき実装が1つだけで済む）。

## ジェネリック型の実装

では、どのように進めればよいでしょうか？ まず、上記で定義したのと同じジェネリックな `Block` 構造から始めます。

```fsharp
type Block<'single,'transform> =
  | Single of 'single
  | InlineGroup of Block<'single,'transform> list
  | LabeledGroup of GroupLabel
  | Transform of Block<'single,'transform> * 'transform
```

後で使用するために、ジェネリックな「ラベル付きグループ」と、私が「プラン」と呼ぶ全体構造も必要になります。

```fsharp
type LabeledGroup<'single,'transform> = {
  Label: GroupLabel
  Blocks: Block<'single,'transform> list
  }

type Plan<'single,'transform> = {
  Blocks: Block<'single,'transform> list
  LabeledGroups: LabeledGroup<'single,'transform> list
  }
```

そして、ドメイン型とジェネリック型の間のマッピング関数を作成します。 これらを書くのは骨が折れますが、一度だけ行えば済みます。 以下は `ThreadingBlock` 用の関数です。 `LiftplanBlock` と `ColorPatternUnit` についても同様の関数を作成します。

```fsharp
type WeaveTransform =
  | Repeat of RepeatCount

module ThreadingBlock =
  open GenericStructure

  let rec toGeneric block :Block<_,_> =
    match block with
    | ThreadingBlock.Single s ->
        GenericStructure.Block.Single s
    | ThreadingBlock.LabeledGroup g ->
        GenericStructure.Block.LabeledGroup g
    | ThreadingBlock.InlineGroup gs ->
        gs 
        |> List.map toGeneric
        |> GenericStructure.Block.InlineGroup 
    | ThreadingBlock.Repeat(b, rc) ->
        let transform = WeaveTransform.Repeat rc
        GenericStructure.Block.Transform (toGeneric b, transform)

  let rec fromGeneric block :ThreadingBlock =
    match block with
    | GenericStructure.Single s ->
        ThreadingBlock.Single s
    | GenericStructure.LabeledGroup g ->
        ThreadingBlock.LabeledGroup g
    | GenericStructure.InlineGroup gs ->
        ThreadingBlock.InlineGroup (gs |> List.map fromGeneric)
    | GenericStructure.Transform(b, t) ->
        match t with
       | WeaveTransform.Repeat rc -> 
           ThreadingBlock.Repeat (fromGeneric b, rc)
```

## ‘flattenToSingles’ の実装

次に、`flattenToSingles` のジェネリック版を書く必要があります。 これを行うには、単一の値のリストをどのように変換するか（例：複製による変換）を指示する追加のパラメータ `applyTransform` が必要になります。

```fsharp
let flattenToSingles 
  (labeledGroups:Map<GroupLabel,Block<_,_> list>)
  (applyTransform: 'transform -> 'single list -> 'single list)
  (block:Block<'single,'transform>)
  :'single list =
  
  // 再帰に使用する関数を定義する
  let rec recurse block =
    match block with
    | Single single ->
        [single]
    | InlineGroup blocks ->
        blocks 
        |> List.collect recurse
    | LabeledGroup label ->
        // 参照の場合、`labeledGroups` パラメータから参照されたグループを見つけ、
        // それを再帰的にフラット化する
        labeledGroups 
        |> Map.tryFind label
        // 見つからない場合は空のリストを返す
        |> Option.defaultValue []
        |> List.collect recurse
    | Transform (block,transform) ->
        block
        |> recurse 
        |> applyTransform transform 
		
  // トップレベルのブロックで呼び出す
  recurse block
```

ジェネリクスを使用することで、パラメータの型注釈がかなり複雑になっていることに注意してください。 ありがたいことに、F# の型推論があれば、型を指定する必要はなく、型のないパラメータリストでも同様に機能します。

```fsharp
let flattenToSingles labeledGroups applyTransform block =
  
  // 再帰に使用する関数を定義する
  let rec recurse block =
    ... etc ...
```

ジェネリックな実装は決して複雑ではありません。 むしろ、変換ロジックをインラインでハードコーディングするのではなくパラメータにすることで、ジェネリックな実装の方がシンプルであるとさえ言えるでしょう。

ここで、その `transform` 関数を実装する必要があります。

```fsharp
module WeaveTransform =

  let applyTransform transform singles =
    match transform with
    | Repeat (RepeatCount rc) ->
        singles  
        |> List.replicate rc 
        |> List.collect id
```

そして最後に、すべてをまとめます。 非ジェネリックなドメイン型から始め、それをジェネリック型に変換し、ジェネリックな `flattenToSingles` 関数を次のように使用します。

```fsharp
module ThreadingBlock =

  let toGeneric =  ...

  let flattenToSingles labeledGroups block =
    let transform = WeaveTransform.applyTransform
    block
    |> toGeneric
    |> GenericImplementation.flattenToSingles labeledGroups transform
```

呼び出し側の視点からは、ジェネリックなコードについての知識は一切ありません。 つまり、結合もジェネリックな設計への依存もなく、実装が使いにくくなった場合にはいつでも自由に変更できます。

たった1つの関数のためにかなりの手間がかかりましたが、これで `LiftplanBlock` や `ColorPatternUnit` の他の実装も素早く書けるようになりました。

さらに、ドメイン型のテキスト表現を作成する関数を実装する際にも、これとまったく同じアプローチを再利用できます。

## さらに汎用的な fold の使用

[再帰型と fold に関する記事](https://fsharpforfunandprofit.com/posts/recursive-types-and-folds)で、共用体（Union）の各ケースに対応し、そのケースに作用する関数パラメータを持つ完全なジェネリック `fold` の作成について触れました。 今回のジェネリックなブロックに対して、そのアプローチは次のようになります。

```fsharp
let rec fold
  (foldSingle: 'single -> 'r)
  (foldInlineGroup: 'r list -> 'r)
  (foldLabeledGroup: GroupLabel -> 'r)
  (foldTransform: 'r * 'transform -> 'r)
  (block: Block<'single,'transform>) =
  
  let recurse = 
    fold foldSingle foldInlineGroup foldLabeledGroup foldTransform
  match block with
  | Single single -> 
      foldSingle single
  | InlineGroup blocks ->  
      foldInlineGroup (List.map recurse blocks)
  | LabeledGroup label -> 
      foldLabeledGroup label
  | Transform (block,transform) -> 
      foldTransform (recurse block, transform)
```

この `fold` 関数を使えば、ジェネリックな `flattenToSingles` を次のように書き直すことができます。

```fsharp
let flattenToSingles labeledGroups applyTransform block =

  // 関数が互いに参照できるように "rec" を使用する
  let rec fSingle single = 
    [single]
  and fInlineGroup blocks = 
    blocks |> List.collect id
  and fLabeledGroup label =
    labeledGroups
    |> Map.tryFind label
    |> Option.defaultValue List.Empty
    |> List.collect recurse
  and fTransform (singles,transform) =
    applyTransform transform singles
  and recurse = 
    fold fSingle fInlineGroup fLabeledGroup fTransform
  
  recurse block
```

どちらが良いでしょうか？ `flattenToSingles` は、最初の実装のように共用体のケースに対して明示的なパターンマッチングを行うべきでしょうか、それとも上記の実装のようにジェネリックな `fold` を呼び出すべきでしょうか？ 私個人としては、明示的なパターンマッチングのバージョンの方が理解しやすいため、そちらを好みます。これなら、メンテナンスをする人がカタモルフィズム（catamorphisms）について知る必要がありません。

## テキスト表現への変換

最初の記事で、これらのドメイン型のテキスト表現が欲しいと述べました。 ユーザーがテキストを入力すると、それがドメイン型にパースされ、さらにそれが織物の設計図として視覚的にレンダリングされるというアイデアです。 いずれは [Scratch](https://en.wikipedia.org/wiki/Scratch_%28programming_language%29) のような、よりインタラクティブなバージョンも作成するかもしれませんが、プロトタイプとして最も簡単なテキストベースのアプローチから始めたいと考えました。

ブロック内の各ケースは、次のように表現されます。
```
1                    // 単体 (single)
A                    // ラベル付きグループの参照
[1 2 3]              // グループ
1x2  Ax2  [1 2 3]x3  // 変換 (transform)
```

そして、ラベル付きグループを含むプラン全体は、次のように表現されます。
```
A = 1 3 2 3    // ラベル付きグループ
B = 1 4 2 4    // ラベル付きグループ
C = 1 5 2 5    // ラベル付きグループ
D = 1 6 2 6    // ラベル付きグループ
Ax2 B Cx2 D    // 全体の通し図 (threading)
```

このテキストのパースは複雑になる可能性があるため、次回の記事に譲ります。 しかし、テキスト表現への変換（to text representation）は簡単です。 コードは `flattenToSingles` のコードと非常によく似ています。 2つの関数パラメータを渡す必要があります。

* `singleToRepr`: `'single` 値をテキスト表現に変換する方法。
* `transformToRepr`: `'transform` をテキスト表現に変換する方法。

そうすれば、残りの部分は上述の `fold` 関数を使って実装できます。

```fsharp
module Block =

  let rec toRepr singleToRepr transformToRepr block =
    let recurse =
      toRepr singleToRepr transformToRepr
    let fSingle =
      singleToRepr
    let fInlineGroup blockTexts =
      blockTexts
      |> String.concat " "
      |> sprintf "[ %s ]"
    let fLabeledGroup label =
      GroupLabel.toRepr label
    let fTransform (blockText,transform) =
      sprintf "%s%s" blockText (transformToRepr transform)
    fold fSingle fInlineGroup fLabeledGroup fTransform block
```

`ThreadingBlock` をテキストとして表現する具体的なケースでは、次のように記述できます。

```fsharp
module ThreadingBlock =

  let rec toRepr block =
    let singleToRepr = ThreadingEnd.toRepr
    let transformToRepr = WeaveTransform.toRepr
    block
    |> ThreadingBlock.toGeneric
    |> GenericStructure.Block.toRepr singleToRepr transformToRepr
```

`LiftplanBlock` のような別の型の場合は、`ThreadingEnd` を `LiftplanPick` に置き換えるだけです。

```fsharp
module LiftplanBlock =

  let rec toRepr block =
    let singleToRepr = LiftplanPick.toRepr
    let transformToRepr = WeaveTransform.toRepr
    ...
```

`ColorPatternUnit` などについても同様です。

また、ジェネリックな `LabeledGroup` 型と `Plan` 型に対しても `toRepr` を実装すべきです。

```fsharp
module LabeledGroup =

  let toRepr singleToRepr transformToRepr (group:LabeledGroup<_,_>) =
    let lhs =
      GroupLabel.toRepr group.Label
    let rhs =
      group.Blocks
      |> List.map (Block.toRepr singleToRepr transformToRepr)
      |> String.concat " "
    $"{lhs}={rhs}"

module Plan  =

  let toRepr singleToRepr transformToRepr (plan:Plan<_,_>) =
    // ヘルパー関数
    let labeledGroupToRepr = 
      LabeledGroup.toRepr singleToRepr transformToRepr
    let blockToRepr = 
      Block.toRepr singleToRepr transformToRepr

    // 各ラベル付きグループのテキストを生成し、最後に最終行を生成する
    seq {
      // ラベル付きグループ
      yield! plan.LabeledGroups 
        |> List.map labeledGroupToRepr
      // 最終行
      yield plan.Blocks 
        |> List.map blockToRepr 
        |> String.concat " "
    }
    |> String.concat "\n"
```

そして、これらを使用して具体的な `ThreadingGroup` 型と `Threading` 型のテキスト表現を実装します。

```fsharp
module ThreadingGroup =

  let toRepr group =
    let singleToRepr = ThreadingEnd.toRepr
    let transformToRepr = WeaveTransform.toRepr
    group
      |> ThreadingGroup.toGeneric
      |> GenericStructure.LabeledGroup.toRepr singleToRepr transformToRepr

module ThreadingPlan =

  let toRepr group =
    let singleToRepr = ThreadingEnd.toRepr
    let transformToRepr = WeaveTransform.toRepr
    group
    |> ThreadingPlan.toGeneric
    |> GenericStructure.Plan.toRepr singleToRepr transformToRepr
```

このように、一度これらの関数のジェネリック版をコーディングしてしまえば、それぞれの具体的な型に対する関数を素早く簡単に作成できることがわかります。

## 結論

この段階から何を学べるでしょうか？

* ドメイン自体がジェネリックでなくても、実装においてジェネリクスを使用することは問題ありません。
* `toGeneric`、`fromGeneric`、`fold` などの主要なヘルパー関数を作成するには多少の余分な労力が必要ですが、一度作成してしまえば、残りのコードの大部分を素早く構築できます。
* ただし、デメリットもあります。このアプローチは (a) 余分な作業を伴い、(b) 物事をより複雑にします。再利用のメリットがデメリットを上回る場合にのみ、それだけの価値があります。今回のケースでは、その価値があると考えています。

## 次回

次回は、逆方向のプロセス、つまりテキストをパースしてドメイン型にする方法を見ていきます。
