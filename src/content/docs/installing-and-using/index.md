---
layout: page
title: "Installing and using F#"
description: "Instructions for downloading, installing and using F# with Visual Studio, SharpDevelop and MonoDevelop"
nav: 
hasComments: 1
image: "@assets/img/fsharp_eval2.png"

---

F# コンパイラは無料でオープンソースのツールで、Windows、Mac、Linux (Mono 経由) で利用できます。
F# の詳細とインストール方法については、[F# Foundation](https://fsharp.org/) をご覧ください。

IDE (Visual Studio、MonoDevelop) や好きなエディタ (特に Visual Studio Code と Atom は、[Ionide](https://ionide.io/) を使用することで F# を強力にサポートしています) で利用したり、スタンドアロンのコマンドラインコンパイラとしても使用できます。

何もインストールしたくない場合は、Webブラウザ上で F# を試せるインタラクティブな環境である [.NET Fiddle](https://dotnetfiddle.net/) サイトを利用できます。このサイトの大部分のコードを実行できるはずです。

## コードサンプルの使用方法

F# をインストールして実行したら、コードサンプルを利用できます。

コードサンプルを実行する最良の方法は、コードを `.FSX` スクリプトファイルに入力し、F# 対話型ウィンドウに送信して評価することです。
あるいは、コードを直接 F# 対話型コンソールウィンドウに入力することもできます。1、2行以外のコードの場合は、スクリプトファイル方式をお勧めします。

長いコードサンプルについては、このWebサイトからダウンロードできます (リンクは記事内にあります)。

最後に、コードサンプルを自由に試したり変更したりすることをお勧めします。コンパイラエラーが発生した場合は、よくある問題とその解決方法を説明している「[F# のトラブルシューティング](../troubleshooting-fsharp/index.md)」ページを参照してください。

<a id="projects-solutions" ></a>   
## プロジェクトとソリューション

F# は C# とまったく同じ「プロジェクト」と「ソリューション」のモデルを使用しているため、C# に慣れ親しんでいるのであれば、F# の実行ファイルを簡単に作成できるはずです。

プロジェクトの一部としてコンパイルされるファイルを作成するには、 `.fs` 拡張子を使用します。 `.fsx` ファイルはコンパイルされません。

ただし、F# プロジェクトには C# と大きく違うところがいくつかあります。

* F# ファイルは、フォルダとサブフォルダの階層ではなく、*直線的に* 整理されます。 
  実際、F# プロジェクトには「新しいフォルダーを追加」オプションがありません。これは一般的には問題になりません。
  C# とは異なり、 1 つの F# ファイルには複数のクラスが格納されるためです。
  C# でクラスが格納される可能性のあるフォルダー全体が、F# では 1 つのファイルになる可能性があります。
* プロジェクト内のファイルの順序は非常に重要です。
  後の F# ファイルは、前の F# ファイルで定義された公開型を使用できますが、逆はできません。
  そのため、ファイル間に循環した依存関係を持たせることはできません。
* ファイルの順序は、右クリックして「上に移動」または「下に移動」を行うことで変更できます。
  同様に、新しいファイルを作成するときに、既存のファイルの「上に追加する」か「下に追加する」ことを選択できます。

<a id="shell-scripts" ></a>   
## F# でのシェルスクリプト

F# は、コードを EXE にコンパイルするだけでなく、スクリプト言語としても使用できます。 
これは FSI プログラムを使用して行います。FSI プログラムはコンソールだけでなく、Python や PowerShell を使用するのと同様の方法でスクリプトを実行することもできます。

これは、コードを単体で実行できるアプリケーションにコンパイルせずに、すぐにコードを作成したい場合に非常に便利です。
F# ビルド自動化システムである「[FAKE](https://github.com/fsharp/FAKE)」はこのようなことがいかに便利かを示す例です。

自分で試してみる方法として、次の例では、Webページをローカルファイルにダウンロードする小さなスクリプトを紹介します。
まず、FSX スクリプト ファイルを作成し、`ShellScriptExample.fsx` という名前を付け、次のコードを貼り付けてください。

```
// ================================
// 説明:
//   指定された URL をダウンロードし、タイムスタンプ付きのファイルとして保存します
//
// コマンドラインの例: 
//    fsi ShellScriptExample.fsx https://www.google.com/ google
// ================================

// "open" は .NET 名前空間を可視状態にします
open System.Net
open System

// Webページの内容をダウンロードします
let downloadUriToFile url targetfile =        
    let req = WebRequest.Create(Uri(url)) 
    use resp = req.GetResponse() 
    use stream = resp.GetResponseStream() 
    use reader = new IO.StreamReader(stream) 
    let timestamp = DateTime.UtcNow.ToString("yyyy-MM-ddTHH-mm")
    let path = sprintf "%s.%s.html" targetfile timestamp 
    use writer = new IO.StreamWriter(path) 
    writer.Write(reader.ReadToEnd())
    printfn "finished downloading %s to %s" url path

// FSI で実行するときは、スクリプト名が最初に来て、その後ろに他の引数が続きます
match fsi.CommandLineArgs with
    | [| scriptName; url; targetfile |] ->
        printfn "running script: %s" scriptName
        downloadUriToFile url targetfile
    | _ ->
        printfn "USAGE: [url] [targetfile]"
```

今はコードの仕組みを気にする必要はありません。これは簡単な例なので、より完全な例では、エラー処理などが追加されているでしょう。

このスクリプトを実行するには、同じディレクトリでコマンド プロンプトを開き、次のように入力します。

```
fsi ShellScriptExample.fsx https://www.google.com/ google_homepage
```

このサイトのコードを触ってみて、そのついでに簡単なスクリプトをいくつか作成してみるのも面白いでしょう。

