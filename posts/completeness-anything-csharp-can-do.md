---
layout: post
title: "C#でできることは何でも..."
description: "F#でのオブジェクト指向コードの駆け足ツアー"
nav: why-use-fsharp
seriesId: "F# を使う理由"
seriesOrder: 29
categories: [Completeness]
---

F#では、関数型コードをオブジェクト指向コードよりも一般的に優先すべきなのは明白ですが、状況によっては、クラス、継承、仮想メソッドなどの完全なオブジェクト指向言語の機能がすべて必要になる場合もあります。

そこで、このセクションの締めくくりとして、これらの機能のF#版を駆け足で見ていきましょう。

これらの一部については、後の.NET統合に関するシリーズでもっと詳しく扱います。ただし、あまり使われない機能については触れません。必要になった場合はMicrosoft Learnのドキュメントを参照してください。

## クラスとインターフェース

まず、インターフェース、抽象クラス、そして抽象クラスを継承した具象クラスの例を見てみましょう。

```fsharp
// インターフェース
type IEnumerator<'a> = 
    abstract member Current : 'a
    abstract MoveNext : unit -> bool 

// 仮想メソッドを持つ抽象基底クラス
[<AbstractClass>]
type Shape() = 
    // 読み取り専用プロパティ
    abstract member Width : int with get
    abstract member Height : int with get
    // 非仮想メソッド
    member this.BoundingArea = this.Height * this.Width
    // 基本実装を持つ仮想メソッド
    abstract member Print : unit -> unit 
    default this.Print () = printfn "私は図形です"

// 基底クラスを継承してオーバーライドする具象クラス
type Rectangle(x:int, y:int) = 
    inherit Shape()
    override this.Width = x
    override this.Height = y
    override this.Print ()  = printfn "私は長方形です"

// テスト
let r = Rectangle(2,3)
printfn "幅は %i です" r.Width
printfn "面積は %i です" r.BoundingArea
r.Print()
```

クラスは複数のコンストラクタ、可変プロパティなどを持つことができます。

```fsharp
type Circle(rad:int) = 
    inherit Shape()

    // 可変フィールド
    let mutable radius = rad
    
    // プロパティのオーバーライド
    override this.Width = radius * 2
    override this.Height = radius * 2
    
    // デフォルトの半径を持つ別のコンストラクタ
    new() = Circle(10)      

    // getとsetを持つプロパティ
    member this.Radius
         with get() = radius
         and set(value) = radius <- value

// コンストラクタのテスト
let c1 = Circle()   // パラメータなしのコンストラクタ
printfn "幅は %i です" c1.Width
let c2 = Circle(2)  // メインのコンストラクタ
printfn "幅は %i です" c2.Width

// 可変プロパティのテスト
c2.Radius <- 3
printfn "幅は %i です" c2.Width
```

## ジェネリクス

F#はジェネリクスと関連するすべての制約をサポートしています。

```fsharp
// 標準的なジェネリクス
type KeyValuePair<'a,'b>(key:'a, value: 'b) = 
    member this.Key = key
    member this.Value = value
    
// 制約付きジェネリクス
type Container<'a,'b 
    when 'a : equality 
    and 'b :> System.Collections.ICollection>
    (name:'a, values:'b) = 
    member this.Name = name
    member this.Values = values
```

## 構造体

F#はクラスだけでなく、.NETの構造体型もサポートしており、特定のケースでパフォーマンスを向上させるのに役立ちます。

```fsharp

type Point2D =
   struct
      val X: float
      val Y: float
      new(x: float, y: float) = { X = x; Y = y }
   end

// テスト
let p = Point2D()  // ゼロで初期化
let p2 = Point2D(2.0,3.0)  // 明示的に初期化
```

## 例外

F#では例外クラスを作成し、それらを投げたり捕捉したりできます。

```fsharp
// 新しい例外クラスを作成
exception MyError of string

try
    let e = MyError("おっと！")
    raise e
with 
    | MyError msg -> 
        printfn "例外のエラーは %s でした" msg
    | _ -> 
        printfn "その他の例外です" 
```

## 拡張メソッド

C#と同様に、F#でも既存のクラスを拡張メソッドで拡張できます。

```fsharp
type System.String with
    member this.StartsWithA = this.StartsWith "A"

// テスト
let s = "Alice"
printfn "'%s' はAで始まる = %A" s s.StartsWithA

type System.Int32 with
    member this.IsEven = this % 2 = 0

// テスト
let i = 20
if i.IsEven then printfn "'%i' は偶数です" i
```

## パラメータ配列

C#の可変長引数キーワード `params` と同様に、この機能は可変長の引数リストを単一の配列パラメーターに変換できます。

```fsharp
open System
type MyConsole() =
    member this.WriteLine([<ParamArray>] args: Object[]) =
        for arg in args do
            printfn "%A" arg

let cons = new MyConsole()
cons.WriteLine("abc", 42, 3.14, true)
```

## イベント

F#のクラスはイベントを持つことができ、イベントをトリガーしたり応答したりできます。

```fsharp
type MyButton() =
    let clickEvent = new Event<_>()

    [<CLIEvent>]
    member this.OnClick = clickEvent.Publish

    member this.TestEvent(arg) =
        clickEvent.Trigger(this, arg)

// テスト
let myButton = new MyButton()
myButton.OnClick.Add(fun (sender, arg) -> 
        printfn "引数 %O でクリックイベントが発生" arg)

myButton.TestEvent("こんにちは、世界！")
```

## デリゲート

F#はデリゲートを扱えます。

```fsharp
// デリゲート
type MyDelegate = delegate of int -> int
let f = MyDelegate (fun x -> x * x)
let result = f.Invoke(5)
```

## 列挙型

F#はCLIの列挙型をサポートしています。これは「判別共用体」型に似ていますが、内部的には異なります。

```fsharp
// 列挙型
type Color = | Red=1 | Green=2 | Blue=3

let color1  = Color.Red    // 単純な代入
let color2:Color = enum 2  // intからのキャスト
// 文字列の解析から作成
let color3 = System.Enum.Parse(typeof<Color>,"Green") :?> Color // :?> はダウンキャスト

[<System.FlagsAttribute>]
type FileAccess = | Read=1 | Write=2 | Execute=4 
let fileaccess = FileAccess.Read ||| FileAccess.Write
```

## 標準ユーザーインターフェースの操作

最後に、F#はC#と同様に、WinFormsやWPFのユーザーインターフェースライブラリを操作できます。

以下は、フォームを開いてクリックイベントを処理する簡単な例です。

```fsharp
open System.Windows.Forms 

let form = new Form(Width= 400, Height = 300, Visible = true, Text = "こんにちは、世界") 
form.TopMost <- true
form.Click.Add (fun args-> printfn "フォームがクリックされました")
form.Show()
```

