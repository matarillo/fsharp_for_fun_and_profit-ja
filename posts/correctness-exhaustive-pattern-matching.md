---
layout: post
title: "網羅的なパターンマッチング"
description: "正確性を確保するための強力な技法"
nav: why-use-fsharp
seriesId: "F# を使う理由"
seriesOrder: 20
categories: [Correctness, Patterns]
---

先ほど簡単に触れましたが、パターンマッチングを行う際には、すべての可能なケースにマッチさせる必要があります。これは正確性を確保するための非常に強力な技法であることがわかります。

C#とF#を再び比較してみましょう。以下は、switch文を使って異なる種類の状態を扱うC#のコードです。

```csharp
enum State { New, Draft, Published, Inactive, Discontinued }
void HandleState(State state)
{
    switch (state)
    {
        case State.Inactive: // Inactiveの場合のコード
            break;
        case State.Draft: // Draftの場合のコード
            break;
        case State.New: // Newの場合のコード
            break;
        case State.Discontinued: // Discontinuedの場合のコード
            break;
    }
}
```

このコードはコンパイルされますが、明らかなバグがあります！コンパイラはそれを見つけられませんでしたが、あなたには見つけられますか？もし見つけて修正したとしても、 `State` のリストに新しい項目を追加したら、それは修正されたままでしょうか？

以下がF#での同等のコードです：

```fsharp
type State = New | Draft | Published | Inactive | Discontinued
let handleState state = 
   match state with
   | Inactive -> () // Inactiveの場合のコード
   | Draft -> () // Draftの場合のコード
   | New -> () // Newの場合のコード
   | Discontinued -> () // Discontinuedの場合のコード
```
   
このコードを実行してみてください。コンパイラは何を教えてくれるでしょうか？

網羅的なマッチングが常に行われるという事実は、特定の一般的なエラーがコンパイラによってすぐに検出されることを意味します：

* 欠落しているケース（多くの場合、要件の変更やリファクタリングによって新しい選択肢が追加されたときに発生します）。
* 不可能なケース（既存の選択肢が削除されたとき）。
* 到達できない冗長なケース（そのケースが前のケースに包含されている場合 -- これが明白でない場合もあります）。

では、網羅的なマッチングが正確なコードを書く上でどのように役立つか、実際の例を見てみましょう。

## Option型を使ってnullを回避する

まず、呼び出し元が常に無効なケースをチェックすべき、非常によくあるシナリオから始めましょう。つまり、nullのテストです。典型的なC#プログラムには、このようなコードがあちこちに散らばっています：

```csharp
if (myObject != null)
{
  // 何かを実行
}
```

残念ながら、このテストはコンパイラによって要求されるわけではありません。一つのコードがこれを忘れただけで、プログラムがクラッシュする可能性があります。
長年にわたり、nullを扱うために膨大なプログラミングの労力が費やされてきました。nullの発明は[10億ドルの過ち](http://www.infoq.com/presentations/Null-References-The-Billion-Dollar-Mistake-Tony-Hoare)とさえ呼ばれています！

純粋なF#では、nullが偶発的に存在することはありません。文字列やオブジェクトは、作成時に必ず何かに割り当てられ、その後は不変です。

しかし、有効な値と無効な値を区別することが*設計上の意図*である状況が多くあり、
呼び出し元に両方のケースを扱うことを要求します。

C#では、特定の状況で、nullable値型（ `Nullable<int>` など）を使って設計上の決定を明確にすることができます。
nullableに遭遇したとき、コンパイラはそれを認識するよう強制します。そして、値を使用する前にその有効性をテストできます。
ただし、nullableは標準のクラス（つまり参照型）では機能せず、テストを偶発的にバイパスして直接 `Value` を呼び出すのも簡単です。

F#には、設計上の意図を伝えるための、同様だがより強力な概念があります。 `Some` または `None` という2つの選択肢を持つ、 `Option` と呼ばれるジェネリックなラッパー型です。
`Some` の選択肢は有効な値をラップし、 `None` は欠落した値を表します。

以下は、ファイルが存在する場合に `Some` を返し、存在しないファイルの場合に `None` を返す例です。

```fsharp
let getFileInfo filePath =
   let fi = new System.IO.FileInfo(filePath)
   if fi.Exists then Some(fi) else None

let goodFileName = "good.txt"
let badFileName = "bad.txt"

let goodFileInfo = getFileInfo goodFileName // Some(fileinfo)
let badFileInfo = getFileInfo badFileName   // None
```

これらの値で何かをしたい場合、常に両方の可能性を扱う必要があります。

```fsharp
match goodFileInfo with
  | Some fileInfo -> 
      printfn "ファイル %s は存在します" fileInfo.FullName
  | None -> 
      printfn "ファイルは存在しません" 

match badFileInfo with
  | Some fileInfo -> 
      printfn "ファイル %s は存在します" fileInfo.FullName
  | None -> 
      printfn "ファイルは存在しません" 
```
	  
これについて選択の余地はありません。ケースを扱わないのは、実行時エラーではなく、コンパイル時エラーです。
このようにnullを避け、 `Option` 型を使うことで、F#は大きなクラスのnull参照例外を完全に排除します。
 
<sub>注意：F#でも、C#と同様にテストなしで値にアクセスすることは可能ですが、これは非常に悪い習慣とされています。</sub>


## エッジケースに対する網羅的なパターンマッチング

以下は、入力リストから数値のペアの平均を取って新しいリストを作成するC#のコードです：

```csharp
public IList<float> MovingAverages(IList<int> list)
{
    var averages = new List<float>();
    for (int i = 0; i < list.Count; i++)
    {
        var avg = (list[i] + list[i+1]) / 2;
        averages.Add(avg);
    }
    return averages;
}
```

このコードは正しくコンパイルされますが、実際にはいくつかの問題があります。すぐに見つけられますか？運が良ければ、あなたのユニットテストがそれらを見つけてくれるでしょう。もちろん、すべてのエッジケースを考慮したテストを書いていればの話ですが。

では、F#で同じことをやってみましょう：

```fsharp
let rec movingAverages list = 
    match list with
    // 入力が空の場合、空のリストを返す
    | [] -> []
    // それ以外の場合、入力からアイテムのペアを処理する
    | x::y::rest -> 
        let avg = (x+y)/2.0 
        // リストの残りを再帰的に処理して結果を構築
        avg :: movingAverages (y::rest)
```

このコードにもバグがあります。しかし、C#とは違い、このコードは修正するまでコンパイルすらされません。コンパイラは、リストに1つのアイテムしかない場合を扱っていないと教えてくれます。
バグを見つけただけでなく、要件のギャップも明らかにしました：1つのアイテムしかない場合、何が起こるべきでしょうか？

以下が修正後のバージョンです：

```fsharp
let rec movingAverages list = 
    match list with
    // 入力が空の場合、空のリストを返す
    | [] -> []
    // それ以外の場合、入力からアイテムのペアを処理する
    | x::y::rest -> 
        let avg = (x+y)/2.0 
        // リストの残りを再帰的に処理して結果を構築
        avg :: movingAverages (y::rest)
    // 1つのアイテムの場合、空のリストを返す
    | [_] -> []

// テスト
movingAverages [1.0]
movingAverages [1.0; 2.0]
movingAverages [1.0; 2.0; 3.0]
```

追加の利点として、F#のコードはより自己文書化されています。各ケースの結果を明示的に記述しています。
C#のコードでは、リストが空の場合や1つのアイテムしかない場合に何が起こるのかが全く明確ではありません。それを知るには、コードを注意深く読む必要があります。

## エラー処理技術としての網羅的なパターンマッチング

すべての選択肢をマッチさせる必要があるという特性は、例外を投げる代わりに使える便利な方法でもあります。例えば、次のような一般的なシナリオを考えてみましょう：

* アプリケーションの最下層にあるユーティリティ関数が、ファイルを開いて任意の操作（コールバック関数として渡される）を実行します。
* その結果は、複数の層を通して最上層まで渡されます。
* クライアントが最上層のコードを呼び出し、結果が処理され、エラー処理が行われます。

手続き型やオブジェクト指向の言語では、コードの層をまたいで例外を伝播させ、適切に処理することがよく問題になります。最上層の関数は、回復すべき例外（例えば `FileNotFound` ）と処理する必要のない例外（例えば `OutOfMemory` ）を簡単に区別できません。Javaでは、チェック例外を使ってこの問題に対処しようとしましたが、結果は芳しくありませんでした。

関数型の世界では、ファイルが見つからない場合に例外を投げるのではなく、良い結果と悪い結果の両方を保持する新しい構造を作成するのが一般的な手法です。

```fsharp
// 2つの異なる選択肢を持つ「union」を定義
type Result<'a, 'b> = 
    | Success of 'a  // 'aはジェネリック型を意味します。実際の型は
                     // 使用時に決定されます。
    | Failure of 'b  // 失敗の型もジェネリックです

// すべての可能なエラーを定義
type FileErrorReason = 
    | FileNotFound of string
    | UnauthorizedAccess of string * System.Exception

// 最下層の関数を定義
let performActionOnFile action filePath =
   try
      // ファイルを開き、アクションを実行して結果を返す
      use sr = new System.IO.StreamReader(filePath:string)
      let result = action sr  // リーダーに対してアクションを実行
      sr.Close()
      Success (result)        // Successを返す
   with      // いくつかの例外をキャッチしてエラーに変換
      | :? System.IO.FileNotFoundException as ex 
          -> Failure (FileNotFound filePath)      
      | :? System.Security.SecurityException as ex 
          -> Failure (UnauthorizedAccess (filePath,ex))  
      // その他の例外は処理されません
```
      
このコードは、 `performActionOnFile` が `Success` と `Failure` という2つの選択肢を持つ `Result` オブジェクトを返すことを示しています。 `Failure` の選択肢はさらに、 `FileNotFound` と `UnauthorizedAccess` という2つの選択肢を持っています。

ここで、中間層は結果の構造を気にせずに、それにアクセスしない限り、お互いを呼び出して結果の型を渡すことができます：

```fsharp
// 中間層の関数
let middleLayerDo action filePath = 
    let fileResult = performActionOnFile action filePath
    // 何か処理をする
    fileResult // 返す

// 最上層の関数
let topLayerDo action filePath = 
    let fileResult = middleLayerDo action filePath
    // 何か処理をする
    fileResult // 返す
```
	
型推論のおかげで、中間層と最上層は返される正確な型を指定する必要がありません。下層が型定義を変更しても、中間層には影響しません。

もちろん、ある時点で最上層のクライアントが結果にアクセスしたいと思うでしょう。ここで、すべてのパターンをマッチさせる要件が活きてきます。クライアントは `Failure` のケースを処理しなければなりません。さもなければコンパイラが警告を出します。さらに、 `Failure` のブランチを処理する際には、可能な理由も処理しなければなりません。つまり、このような特別なケース処理は、実行時ではなくコンパイル時に強制できるのです！さらに、可能な理由は理由型を調べることで明示的に文書化されます。

以下は、最上層にアクセスするクライアント関数の例です：

```fsharp
/// ファイルの最初の行を取得
let printFirstLineOfFile filePath = 
    let fileResult = topLayerDo (fun fs->fs.ReadLine()) filePath

    match fileResult with
    | Success result -> 
        // 型安全な文字列出力に%sを使用
        printfn "最初の行は: '%s'" result   
    | Failure reason -> 
       match reason with  // すべての理由にマッチしなければならない
       | FileNotFound file -> 
           printfn "ファイルが見つかりません: %s" file
       | UnauthorizedAccess (file,_) -> 
           printfn "ファイルにアクセスする権限がありません: %s" file
```


このコードは `Success` と `Failure` のケースを明示的に処理し、さらに失敗のケースでは、異なる理由を明示的に処理していることがわかります。ケースの1つを処理しない場合に何が起こるかを見たい場合は、 `UnauthorizedAccess` を処理する行をコメントアウトして、コンパイラが何を言うか見てみてください。

常にすべての選択肢をマッチさせる必要がないケースもあります。以下の例では、関数はアンダースコアのワイルドカードを使ってすべての失敗の理由を一つとして扱っています。これは厳密さの利点を得たい場合には良くない習慣と考えられますが、少なくとも明確に行われています。

```fsharp
/// ファイル内のテキストの長さを取得
let printLengthOfFile filePath = 
   let fileResult = 
     topLayerDo (fun fs->fs.ReadToEnd().Length) filePath

   match fileResult with
   | Success result -> 
      // 型安全な整数出力に%iを使用
      printfn "長さは: %i" result       
   | Failure _ -> 
      printfn "エラーが発生しましたが、具体的には言いたくありません"
```

では、このコードが実際にどのように動作するか、いくつかのインタラクティブなテストで見てみましょう。

まず、正常なファイルと不正なファイルを設定します。

```fsharp
/// ファイルにテキストを書き込む
let writeSomeText filePath someText = 
    use writer = new System.IO.StreamWriter(filePath:string)
    writer.WriteLine(someText:string)
    writer.Close()

let goodFileName = "good.txt"
let badFileName = "bad.txt"

writeSomeText goodFileName "hello"
```

そして、インタラクティブにテストします：

```fsharp
printFirstLineOfFile goodFileName 
printLengthOfFile goodFileName 

printFirstLineOfFile badFileName 
printLengthOfFile badFileName 
```

このアプローチが非常に魅力的であることがわかると思います：

* 関数は予想される各ケース（ `FileNotFound` など）に対してエラー型を返しますが、これらの型の処理が呼び出しコードを醜くすることはありません。
* 関数は予期しないケース（ `OutOfMemory` など）に対しては例外を投げ続けます。これらは一般的にプログラムの最上位でキャッチされ、ログに記録されます。

この技法は単純で便利です。同様の（そしてより汎用的な）アプローチが関数型プログラミングでは標準的です。

C#でもこのアプローチを使うことは可能ですが、通常は非現実的です。ユニオン型がないことと、型推論がないこと（ジェネリック型をどこでも指定しなければならない）が原因です。

## 変更管理ツールとしての網羅的なパターンマッチング

最後に、網羅的なパターンマッチングは、要件が変更されたとき、またはリファクタリング中にコードが正しいままであることを保証するための貴重なツールです。

例えば、要件が変更され、3番目のエラー型「Indeterminate（不確定）」を扱う必要が出てきたとします。この新しい要件を実装するには、最初の `Result` 型を以下のように変更し、すべてのコードを再評価します。何が起こるでしょうか？

```fsharp
type Result<'a, 'b> = 
    | Success of 'a 
    | Failure of 'b
    | Indeterminate
```

また、時には要件の変更によって可能な選択肢が削除されることもあります。これをシミュレートするには、最初の `Result` 型を変更して、1つの選択肢以外をすべて削除します。

```fsharp
type Result<'a> = 
    | Success of 'a 
```

ここで、残りのコードを再評価してみてください。今度は何が起こるでしょうか？

これは非常に強力です！選択肢を調整すると、変更に対応するために修正が必要なすべての場所をすぐに知ることができます。これは、静的にチェックされた型エラーの力の別の例です。F#のような関数型言語について「コンパイルが通れば、正しいはずだ」とよく言われるのはこのためです。



