---
layout: post
title: "let、use、doでの束縛"
description: "使い方について"
nav: thinking-functionally
seriesId: "式と構文"
seriesOrder: 4
---


これまで見てきたように、F#には「変数」はありません。代わりに「値」があります。

また、 `let` 、 `use` 、 `do` といったキーワードは、識別子を値や関数式に関連付ける「*束縛*」として働くことも見てきました。

この記事では、これらの束縛について詳しく見ていきます。

## `let` 束縛

`let` 束縛は単純です。一般的な形は次のとおりです。

```fsharp
let aName = someExpression
```

ただし、 `let` には微妙に異なる2つの使い方があります。1つはモジュールのトップレベルで名前付き式を定義すること*で、もう1つは式の中で使うローカルな名前を定義することです。これは、C#の「トップレベル」メソッド名と「ローカル」変数名の違いに似ています。

<sub>* なお、後のシリーズでオブジェクト指向機能について説明するとき、クラスにもトップレベルの`let`束縛を持てることを説明します。</sub>

以下は、両方のタイプの例です。

```fsharp
module MyModule = 

    let topLevelName = 
        let nestedName1 = someExpression
        let nestedName2 = someOtherExpression
        finalExpression
```


トップレベルの名前は*定義*であり、モジュールの一部です。 `MyModule.topLevelName` のような完全修飾名でアクセスできます。ある意味、クラスメソッドに相当します。

しかし、ネストされた名前は外部から全くアクセスできません。それらはトップレベルの名前束縛のコンテキストでのみ有効です。

### `let` 束縛のパターン

束縛で直接パターンを使う例はすでに見てきました。

```fsharp
let a,b = 1,2

type Person = {First:string; Last:string}
let alice = {First="Alice"; Last="Doe"}
let {First=first} = alice
```

また、関数定義では、束縛にパラメータも含まれます。

```fsharp
// パラメータのパターンマッチング
let add (x,y) = x + y

// テスト    
let aTuple = (1,2)
add aTuple
```

さまざまなパターン束縛の詳細は、束縛される型によって異なります。後続のパターンマッチングに関する記事でさらに詳しく説明します。

### 式としてのネストされた `let` 束縛

式はより小さな式から構成されると強調してきました。しかし、ネストされた `let` はどうでしょうか？

```fsharp
let nestedName = someExpression
```

`let` はどのようにして式になるのでしょうか？何を返すのでしょうか？

答えは、ネストされた `let` は単独で使えず、常に大きなコードブロックの一部でなければならないということです。そのため、次のように解釈できます。

```fsharp
let nestedName = [何らかの式] in [nestedNameを含む他の式]
```

つまり、2番目の式（*本体式*）で "nestedName" シンボルが出現するたびに、それを1つ目の式で置き換えるのです。

たとえば、次の式は、

```fsharp
// 標準的な構文
let f () = 
  let x = 1  
  let y = 2
  x + y          // 結果
```

実際には次のような意味になります。

```fsharp
// "in"キーワードを使った構文
let f () = 
  let x = 1 in   // "in"キーワードはF#で使えます
    let y = 2 in 
      x + y      // 結果
```

置換が行われると、最後の行は次のようになります。

    (xの定義) + (yの定義) 
    // または
    (1) + (2) 

ある意味、ネストされた名前は単なる「マクロ」や「プレースホルダー」であり、式がコンパイルされると消えます。したがって、ネストされた `let` は式全体に影響を与えないことがわかるでしょう。たとえば、ネストされた `let` を含む式の型は、最終的な本体式の型と同じです。

ネストされた `let` 束縛の仕組みを理解していれば、特定のエラーが理解できるようになります。たとえば、ネストされた `let` に続くものがない場合、式全体が不完全になります。以下の例では、 `let` 行の後に何もないため、エラーになります。

```fsharp
let f () = 
  let x = 1  
// エラー FS0588: この'let'に続くブロックが未完成です。
//               式を期待しています。
```

また、複数の式の結果を持つことはできません。複数の本体式を持てないからです。最終的な本体式より前に評価されるものは、すべて `do` 式（後述）でなければならず、 `unit` を返す必要があります。

```fsharp
let f () = 
  2 + 2      // 警告 FS0020: この式は'unit'型である
             // べきです
  let x = 1  
  x + 1      // これが最終的な結果です
```

このような場合、結果は "ignore" にパイプする必要があります。

```fsharp
let f () = 
  2 + 2 |> ignore 
  let x = 1  
  x + 1      // これが最終的な結果です
```

<a name="use"></a>
## `use` 束縛

`use`キーワードは`let`と同じ目的を果たします。つまり、式の結果を名前付きの値に束縛します。

主な違いは、スコープ外に出たときに値を*自動的に破棄する*ことです。

明らかに、これはネストされた状況でのみ適用されます。トップレベルで `use` は使えず、試みるとコンパイラが警告を出します。

```fsharp
module A = 
    use f () =  // エラー
      let x = 1  
      x + 1      
```

適切な`use`束縛がどのように働くかを確認するために、まず、`IDisposable` をその場で作るヘルパー関数を作ってみましょう。

```fsharp
// IDisposableを実装する新しいオブジェクトを作る
let makeResource name = 
   { new System.IDisposable 
     with member this.Dispose() = printfn "%s disposed" name }
```

では、ネストされた `use` 束縛でテストしてみましょう。

```fsharp
let exampleUseBinding name =
    use myResource = makeResource name
    printfn "done"

//テスト
exampleUseBinding "hello"
```

"done" が出力され、その直後に `myResource` がスコープ外になり、 `Dispose` が呼ばれ、 "hello disposed" も出力されるのがわかります。

一方、通常の `let` 束縛を使ってテストすると、同じ効果は得られません。

```fsharp
let exampleLetBinding name =
    let myResource = makeResource name
    printfn "done"

//テスト
exampleLetBinding "hello"
```

この場合、 "done" は出力されますが、 `Dispose` は呼ばれません。

### `use` は `IDisposable` でのみ動作する

`use` 束縛は `IDisposable` を実装する型でのみ動作します。そうでない場合はコンパイラが警告を出します。

```fsharp
let exampleUseBinding2 name =
    use s = "hello"  // エラー: 型 'string' は
                     // 型 'IDisposable' と互換性がありません
    printfn "done"
```


### `use` された値を返さない

値が*宣言された式のスコープ*を出るとすぐに破棄されることに注意してください。
別の関数で使用するために値を返そうとすると、戻り値は無効になります。

次の例は、*やってはいけない*やり方です。

```fsharp
let returnInvalidResource name =
    use myResource = makeResource name
    myResource // これはダメ！

// テスト
let resource = returnInvalidResource  "hello"
```

破棄可能なものを関数の「外側」で操作する必要がある場合、おそらく最良の方法はコールバックを使うことです。

この場合、関数は次のように動きます。

* 破棄可能なオブジェクトを作成する。
* 破棄可能なオブジェクトを引数としてコールバックを評価する。
* 破棄可能なオブジェクトの `Dispose` を呼ぶ。

以下に例を示します。

```fsharp
let usingResource name callback =
    use myResource = makeResource name
    callback myResource
    printfn "done"

let callback aResource = printfn "Resource is %A" aResource
do usingResource "hello" callback 
```

このアプローチでは、破棄可能なオブジェクトを作成した関数が確実にそれを破棄することも保証され、リークの可能性がありません。

もう一つの可能な方法は、作成時に `use` 束縛を使わず、代わりに `let` 束縛を使い、呼び出し側に破棄の責任を持たせることです。

以下に例を示します。

```fsharp
let returnValidResource name =
    // ここでは"use"の代わりに"let"束縛を使う
    let myResource = makeResource name
    myResource // まだ有効

let testValidResource =
    // ここでは"let"の代わりに"use"束縛を使う
    use resource = returnValidResource  "hello"
    printfn "done"
```

個人的には、このアプローチは好みません。対称的でなく、作成と破棄が分離されているため、リソースリークにつながる可能性があるからです。

### `using` 関数

前述のように、破棄可能なオブジェクトを共有するための推奨アプローチは、コールバック関数を使うことです。

同じように動作する組み込みの `using` 関数があります。これは2つのパラメータを取ります。

* 1つ目はリソースを作る式です。
* 2つ目はリソースを使う関数です。リソースをパラメーターとして受け取ります。

先ほどの例を `using` 関数で書き直すと次のようになります。

```fsharp
let callback aResource = printfn "Resource is %A" aResource
using (makeResource "hello") callback 
```
 
実際には、 `using` 関数はあまり使われません。先ほど見たように、独自のカスタムバージョンを作るのがとても簡単だからです。

### `use` の誤用

F#のテクニックの1つとして、 `use` キーワードを流用して、あらゆる種類の「停止」や「元に戻す」機能を自動的に実行することがあります。

この方法は次のとおりです。

* ある型の[拡張メソッド](../posts/type-extensions)を作成する。
* そのメソッドで、目的の動作を開始し、その後、動作を停止する `IDisposable` を返す。

たとえば、タイマーを開始して停止する `IDisposable` を返す拡張メソッドを以下に示します。

```fsharp
module TimerExtensions = 

    type System.Timers.Timer with 
        static member StartWithDisposable interval handler = 
            // タイマーを作る
            let timer = new System.Timers.Timer(interval)
            
            // ハンドラを追加して開始
            do timer.Elapsed.Add handler 
            timer.Start()
            
            // "Stop"を呼ぶIDisposableを返す
            { new System.IDisposable with 
                member disp.Dispose() = 
                    do timer.Stop() 
                    do printfn "Timer stopped"
                }
```

呼び出しコードでは、タイマーを作成して `use` で束縛します。タイマーの値がスコープ外になると、自動的に停止します！

```fsharp
open TimerExtensions
let testTimerWithDisposable =     
    let handler = (fun _ -> printfn "elapsed")
    use timer = System.Timers.Timer.StartWithDisposable 100.0 handler  
    System.Threading.Thread.Sleep 500
```

この同じアプローチは、他の一般的な操作のペアにも使えます。

* リソースの開閉/接続と切断（これは本来 `IDisposable` が使われるべきものですが、対象のが実装していない可能性があります）
* イベントハンドラの登録と登録解除（ `WeakReference` の代わりに）
* UIで、コードブロックの開始時にスプラッシュ画面を表示し、ブロックの終了時に自動的に閉じる

一般的にはこのアプローチをお勧めしません。何が起こっているかを隠してしまうからです。しかし、場合によっては非常に便利です。

## `do` 束縛

関数や値の定義とは別にコードを実行したい場合もあります。これは、モジュールの初期化やクラスの初期化などで役立ちます。

つまり、 `let x = do something` ではなく、単に `do something` だけを使います。これは命令型言語の文（ステートメント）に似ています。

コードの先頭に `do` をつけることで、これを実現できます。

```fsharp
do printf "logging"
```

多くの場合、 `do` キーワードは省略できます。

```fsharp
printf "logging"
```

ただし、どちらの場合も、式は `unit` を返す必要があります。そうでない場合、コンパイラエラーが発生します。

```fsharp
do 1 + 1    // 警告: この式は関数です 
```

いつものように、 `unit` 以外の結果を強制的に破棄するには、結果を `ignore` にパイプします。

```fsharp
do ( 1+1 |> ignore )
```

また、ループでも同じように `do` キーワードが使われます。

省略できる場合もありますが、明示的な `do` を常に付けることが良い習慣とされています。これは、結果ではなく副作用のみを望んでいることを示す、ドキュメントの役割を果たすからです。


### モジュールの初期化のための `do`

`let` と同様に、 `do` はネストされたコンテキストでも、モジュールやクラスのトップレベルでも使えます。

モジュールレベルで使われる場合、`do` 式はモジュールが最初に読み込まれたときに一度だけ評価されます。

```fsharp
module A =

    module B =
        do printfn "Module B initialized"

    module C =
        do printfn "Module C initialized"

    do printfn "Module A initialized"
```

これは、C#の静的クラスコンストラクタに似ていますが、複数のモジュールがある場合、初期化の順序は固定されており、宣言順に初期化されます。

## `let!` と `use!` と `do!`

`let!` 、 `use!` 、 `do!` （つまり、感嘆符付き）が中かっこ `{...}` ブロックの一部である場合、それらは「コンピュテーション式」の一部として使われています。このコンテキストでの `let!` 、 `use!` 、 `do!` の正確な意味は、コンピュテーション式自体によって決まります。コンピュテーション式全般の理解は、今後のシリーズで待たなければなりません。

最も一般的なコンピュテーション式の種類は、 `async{..}` ブロックで示される*非同期ワークフロー*です。
このコンテキストでは、非同期操作が完了するのを待ってから、結果の値に束縛するために使います。

以下は、「[F#を使う理由](../posts/concurrency-async-and-parallel)」シリーズで見た例です。

```fsharp
//この簡単なワークフローは2秒間スリープするだけです。
open System
let sleepWorkflow  = async{
    printfn "Starting sleep workflow at %O" DateTime.Now.TimeOfDay
    
    // do! も待機を意味します
    do! Async.Sleep 2000
    printfn "Finished sleep workflow at %O" DateTime.Now.TimeOfDay
    }

//テスト
Async.RunSynchronously sleepWorkflow  


// 他の非同期ワークフローがネストされているワークフロー。
/// 中括弧内で、let! または use! 構文を使ってネストされたワークフローをブロックできます。
let nestedWorkflow  = async{

    printfn "Starting parent"
    
    // let! は待機してから childWorkflow の値に束縛することを意味します
    let! childWorkflow = Async.StartChild sleepWorkflow

    // 子に機会を与えてから作業を続ける
    do! Async.Sleep 100
    printfn "Doing something useful while waiting "

    // 子をブロック
    let! result = childWorkflow

    // 完了
    printfn "Finished parent" 
    }

// ワークフロー全体を実行
Async.RunSynchronously nestedWorkflow  
```

## `let` および `do` 束縛の属性

モジュールのトップレベルにある場合、 `let` および `do` 束縛には属性をつけることができます。F#の属性は `[<MyAttribute>]` という構文を使います。

以下は、C#での例と、同じコードをF#で書いたものです。

```csharp
class AttributeTest
{
    [Obsolete]
    public static int MyObsoleteFunction(int x, int y)
    {
        return x + y;
    }

    [CLSCompliant(false)]
    public static void NonCompliant()
    {
    }
}
```

```fsharp
module AttributeTest = 
    [<Obsolete>]
    let myObsoleteFunction x y = x + y

    [<CLSCompliant(false)>]
    let nonCompliant () = ()
```

3つの属性の例を簡単に見てみましょう。

* "main" 関数を示すために使用するEntryPoint属性。
* さまざまなAssemblyInfo属性。
* アンマネージドコードとやり取りするためのDllImport属性。

### EntryPoint属性

特別な `EntryPoint` 属性は、C#で `static void Main` メソッドが使われるのと同様に、スタンドアロンアプリのエントリポイントを示すために使います。

おなじみのC#バージョンは次のとおりです。

```csharp
class Program
{
    static int Main(string[] args)
    {
        foreach (var arg in args)
        {
            Console.WriteLine(arg);
        }
        
        //Environment.Exit(code)と同じ
        return 0;
    }
}
```

F#の同等のコードは次のようになります。

```fsharp
module Program

[<EntryPoint>]
let main args =
    args |> Array.iter printfn "%A" 
    
    0  // returnが必要です！
```

C#と同様に、args は文字列の配列です。しかし、C#では静的 `Main` メソッドは `void` にすることができますが、F#の関数は*必ず* `int` を返さなければなりません。

また、大きな落とし穴は、この属性を持つ関数はプロジェクトの最後のファイルの最後の関数でなければならないということです！そうでないと、次のエラーが発生します。

   error FS0191: 'EntryPointAttribute' 属性が付いた関数は、コンパイル順序の最後のファイルの最後の宣言でなければなりません

C#では、クラスはどこにでも置けるのに、なぜF#コンパイラはそこまでうるさいのでしょうか？

理解の助けになる類推としては、ある意味、アプリケーション全体が単一の巨大な式であり、 `main` に束縛されているということです。
ここで、 `main` はサブ式を含んでいて、それぞれのサブ式もまた別のサブ式を含んでいます。

    [<EntryPoint>]
    let main args =
        アプリケーション全体をサブ式の集合として表現

さて、F#プロジェクトでは、前方参照は許されません。つまり、他の式を参照する式は、後ろに宣言されなければなりません。
よって当然の結果として、最上位のトップレベル関数である `main` は、最後に来なければなりません。

### AssemblyInfo属性

C#プロジェクトでは、アセンブリレベルの属性をすべて含む `AssemblyInfo.cs` ファイルがあります。

F#では、これと同等の方法として、属性で注釈付けされた `do` 式を含むダミーモジュールを使います。

```fsharp
open System.Reflection

module AssemblyInfo = 
    [<assembly: AssemblyTitle("MyAssembly")>]
    [<assembly: AssemblyVersion("1.2.0.0")>]
    [<assembly: AssemblyFileVersion("1.2.3.4152")>]
    do ()   // 何もしない -- 属性のためのプレースホルダーです
```

### DllImport属性

属性をもう一つ説明します。時々便利な `DllImport` 属性です。C#の例を以下に示します。

```csharp
using System.Runtime.InteropServices;

[TestFixture]
public class TestDllImport
{
    [DllImport("shlwapi", CharSet = CharSet.Auto, EntryPoint = "PathCanonicalize", SetLastError = true)]
    private static extern bool PathCanonicalize(StringBuilder lpszDst, string lpszSrc);

    [Test]
    public void TestPathCanonicalize()
    {
        var input = @"A:\name_1\.\name_2\..\name_3";
        var expected = @"A:\name_1\name_3";

        var builder = new StringBuilder(260);
        PathCanonicalize(builder, input);
        var actual = builder.ToString();

        Assert.AreEqual(expected,actual);
    }
}
```

F#でもC#と同じように動きます。注意すべき点は、 `extern declaration ...` はパラメータの前に型を置くC言語スタイルであることです。

```fsharp
open System.Runtime.InteropServices
open System.Text

[<DllImport("shlwapi", CharSet = CharSet.Ansi, EntryPoint = "PathCanonicalize", SetLastError = true)>]
extern bool PathCanonicalize(StringBuilder lpszDst, string lpszSrc)

let TestPathCanonicalize() = 
    let input = @"A:\name_1\.\name_2\..\name_3"
    let expected = @"A:\name_1\name_3"

    let builder = new StringBuilder(260)
    let success = PathCanonicalize(builder, input)
    let actual = builder.ToString()

    printfn "actual=%s success=%b" actual (expected = actual)

// テスト
TestPathCanonicalize() 
```

アンマネージドコードとの相互運用は大きなトピックなので、独自のシリーズが必要になるでしょう。