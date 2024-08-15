---
layout: post
title: "F#とC#の比較：Webページのダウンロード"
description: "F#がコールバックに優れていることと、'use'キーワードの紹介"
nav: why-use-fsharp
seriesId: "F#を使う理由"
seriesOrder: 5
categories: [F# vs C#]
---

この例では、テキストストリームを処理するコールバック付きでWebページをダウンロードするF#とC#のコードを比較します。

まずは、シンプルなF#の実装から見てみましょう。

```fsharp
// "open"で.NET名前空間を可視化
open System.Net
open System
open System.IO

// Webページの内容を取得
let fetchUrl callback url =        
    let req = WebRequest.Create(Uri(url)) 
    use resp = req.GetResponse() 
    use stream = resp.GetResponseStream() 
    use reader = new IO.StreamReader(stream) 
    callback reader url
```

このコードを詳しく見ていきましょう：

* 冒頭の "open" を使うことで、"System.Net.WebRequest" ではなく "WebRequest" と書けます。これはC#の `using System.Net` に似ています。
* 次に、`fetchUrl`関数を定義します。これは2つの引数を取ります。ストリームを処理するコールバックと、取得するURLです。
* URLの文字列をUriでラップしています。F#は厳密な型チェックを行うので、もし単に以下のように書いていたら：
`let req = WebRequest.Create(url)`
コンパイラは`WebRequest.Create`のどのバージョンを使うべきか分からないと文句を言うでしょう。
* `response`、`stream`、`reader`の値を宣言する際、 `let` の代わりに `use` キーワードを使っています。これは`IDisposable`を実装するクラスとの組み合わせでのみ使えます。
  これはスコープ外になったときにリソースを自動的に破棄するようコンパイラに指示します。C#の `using` キーワードと同じ役割です。
* 最後の行は、StreamReaderとURLをパラメータとしてコールバック関数を呼び出します。コールバックの型をどこかで指定する必要がないのがポイントです。

次に、同等のC#の実装を見てみましょう。

```csharp
class WebPageDownloader
{
    public TResult FetchUrl<TResult>(
        string url,
        Func<string, StreamReader, TResult> callback)
    {
        var req = WebRequest.Create(url);
        using (var resp = req.GetResponse())
        {
            using (var stream = resp.GetResponseStream())
            {
                using (var reader = new StreamReader(stream))
                {
                    return callback(url, reader);
                }
            }
        }
    }
}
```

いつものように、C#バージョンには余計な「ノイズ」があります。

- かっこだけで10行あり、5段階のネストで見た目も複雑になっています。 *
- すべてのパラメータ型を明示的に宣言する必要があり、ジェネリックの`TResult`型を3回も繰り返さなければなりません。

<sub>* 確かに、この特定の例では、すべての `using` 文が隣接している場合、[余分なかっことインデントを省略できます](https://stackoverflow.com/questions/1329739/nested-using-statements-in-c-sharp)が、
より一般的なケースでは必要になります。</sub>

## コードのテスト

F#に戻って、対話的にコードをテストできます：

```fsharp
let myCallback (reader:IO.StreamReader) url = 
    let html = reader.ReadToEnd()
    let html1000 = html.Substring(0,1000)
    printfn "Downloaded %s. First 1000 is %s" url html1000
    html      // すべてのhtmlを返す

//テスト
let google = fetchUrl myCallback "https://google.com"
```

最後に、readerパラメータの型宣言（`reader:IO.StreamReader`）が必要になります。これはF#コンパイラが "reader" パラメータの型を自動的に判断できないためです。

F#の非常に便利な機能の1つは、関数のパラメータを「焼き付ける」ことができ、毎回渡す必要がないことです。これが、C#バージョンとは違って `url` パラメータが*最後*に配置された理由です。
コールバックを一度設定し、URLは呼び出しごとに変更できるのです。

```fsharp
// コールバックを「焼き付けた」関数を構築
let fetchUrl2 = fetchUrl myCallback 

// テスト
let google = fetchUrl2 "https://www.google.com"
let bbc    = fetchUrl2 "https://news.bbc.co.uk"

// サイトのリストでテスト
let sites = ["https://www.bing.com";
             "https://www.google.com";
             "https://www.yahoo.com"]

// リスト内の各サイトを処理
sites |> List.map fetchUrl2 
```

最後の行（`List.map`を使用）は、新しい関数をリスト処理関数と簡単に組み合わせて、一度にリスト全体をダウンロードできることを示しています。

以下は同等のC#テストコードです：

```csharp
[Test]
public void TestFetchUrlWithCallback()
{
    Func<string, StreamReader, string> myCallback = (url, reader) =>
    {
        var html = reader.ReadToEnd();
        var html1000 = html.Substring(0, 1000);
        Console.WriteLine(
            "Downloaded {0}. First 1000 is {1}", url,
            html1000);
        return html;
    };

    var downloader = new WebPageDownloader();
    var google = downloader.FetchUrl("https://www.google.com",
                                      myCallback);
            
    // サイトのリストでテスト
    var sites = new List<string> {
        "https://www.bing.com",
        "https://www.google.com",
        "https://www.yahoo.com"};

    // リスト内の各サイトを処理
    sites.ForEach(site => downloader.FetchUrl(site, myCallback));
}
```

ここでも、コードはF#コードよりも少しノイジーで、明示的な型参照が多くなっています。さらに重要なのは、C#コードでは関数のパラメータを簡単に焼き付けることができないため、コールバックを毎回明示的に参照しなければならないことです。
