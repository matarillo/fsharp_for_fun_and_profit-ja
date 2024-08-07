---
layout: post
title: "列挙型"
description: "共用体型とは異なります"
nav: fsharp-types
seriesId: "F#の型を理解する"
seriesOrder: 8
categories: [型]
---

F#の列挙型はC#の列挙型と同じです。その定義は表面上、共用体型の空のケースとまったく同じように見えますが、気をつけるべき違いがたくさんあります。

## 列挙型の定義

列挙型を定義するには、空のケースを持つ共用体型とまったく同じ構文を使います。ただし、各ケースに定数値を指定する必要があり、その定数はすべて同じ型でなければいけません。

```fsharp
type SizeUnion = Small | Medium | Large         // 共用体
type ColorEnum = Red=0 | Yellow=1 | Blue=2      // 列挙型 
```

文字列は使えず、intやbyteやcharなどの互換性のある型だけが使えます。

```fsharp
type MyEnum = Yes = "Y" | No ="N"  // エラー。文字列は使えません。
type MyEnum = Yes = 'Y' | No ='N'  // charを使っているのでOK。
```

共用体型では、ケースが大文字で始まる必要がありますが、列挙型ではその必要はありません。

```fsharp
type SizeUnion = Small | Medium | large      // エラー。"large"は無効です。
type ColorEnum = Red=0 | Yellow=1 | blue=2      // OK
```

C#と同じように、ビットフラグには `FlagsAttribute` を使えます。

```fsharp
[<System.FlagsAttribute>]
type PermissionFlags = Read = 1 | Write = 2 | Execute = 4 
let permission = PermissionFlags.Read ||| PermissionFlags.Write
```

## 列挙型の構築

共用体型と違って、列挙型を構築するときは*必ず*修飾名を使う必要があります。

```fsharp
let red = Red            // エラー。列挙型は修飾が必要です
let red = ColorEnum.Red  // OK 
let small = Small        // OK。共用体は修飾が不要です
```

また、基底となるint型とのキャストもできます。

```fsharp
let redInt = int ColorEnum.Red  
let redAgain:ColorEnum = enum redInt // 指定した列挙型にキャスト 
let yellowAgain = enum<ColorEnum>(1) // または直接作成
```

列挙されたリストにない値を作ることもできます。

```fsharp
let unknownColor = enum<ColorEnum>(99)   // 有効
```

また、共用体型と違って、C#と同じようにBCL（Base Class Library）のEnum関数を使って値を列挙したりパースしたりできます。

```fsharp
let values = System.Enum.GetValues(typeof<ColorEnum>)
let redFromString =  
    System.Enum.Parse(typeof<ColorEnum>,"Red") 
    :?> ColorEnum  // ダウンキャストが必要
```

## 列挙型のマッチング

列挙型にマッチングするときも、*必ず*修飾名を使う必要があります。

```fsharp
let unqualifiedMatch x = 
    match x with
    | Red -> printfn "赤"             // 警告 FS0049
    | _ -> printfn "その他" 

let qualifiedMatch x = 
    match x with
    | ColorEnum.Red -> printfn "赤"   //OK。修飾名を使っています。
    | _ -> printfn "その他"
```

共用体と列挙型の両方で、パターンマッチングのときに既知のすべてのケースをカバーしていないと、警告が出ます。

```fsharp
let matchUnionIncomplete x = 
    match x with
    | Small -> printfn "小"   
    | Medium -> printfn "中"   
    // 警告：不完全なパターンマッチ
    
let matchEnumIncomplete x = 
    match x with
    | ColorEnum.Red -> printfn "赤"   
    | ColorEnum.Yellow -> printfn "黄"   
    // 警告：不完全なパターンマッチ
```

共用体と列挙型の大きな違いの一つは、すべての共用体型をリストアップすれば、コンパイラに完全なパターンマッチングと認識させられる点です。

列挙型の場合はそうではありません。事前に宣言していない列挙型を作って、それとマッチングを試みると、ランタイム例外が起きる可能性があります。
そのため、既知のすべての列挙型を明示的にリストアップしていても、コンパイラは警告を出します。

```fsharp
// コンパイラはまだ満足していません
let matchEnumIncomplete2 x = 
    match x with
    | ColorEnum.Red -> printfn "赤"   
    | ColorEnum.Yellow -> printfn "黄"   
    | ColorEnum.Blue -> printfn "青"   
    // 値 '3' はパターンでカバーしていないケースを示している可能性があります。
```

これを解決する唯一の方法は、事前に宣言した範囲外の列挙型を処理するために、ケースの最後にワイルドカードを追加することです。

```fsharp
// コンパイラがようやく満足します
let matchEnumComplete x = 
    match x with
    | ColorEnum.Red -> printfn "赤"   
    | ColorEnum.Yellow -> printfn "黄"   
    | ColorEnum.Blue -> printfn "青"   
    | _ -> printfn "その他"   

// 未知のケースでテスト    
let unknownColor = enum<ColorEnum>(99)   // 有効
matchEnumComplete unknownColor
```

## まとめ

一般的には、 `int` 値を関連付ける必要がある場合や、他の.NET言語に公開する必要のある型を書いている場合を除き、
列挙型より判別共用体型を使うほうがいいでしょう。