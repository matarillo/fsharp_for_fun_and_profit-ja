---
layout: post
title: "F#とC#の比較：ソート"
description: "F#がC#よりも宣言的であることがわかり、パターンマッチングが紹介されます。"
nav: why-use-fsharp
seriesId: "F#を使う理由"
seriesOrder: 4
categories: [F# vs C#]
---

次の例では、リストをソートするためのクイックソート風のアルゴリズムを実装し、F#の実装とC#の実装を比較します。

簡略化されたクイックソート風アルゴリズムのロジックは以下の通りです：

<pre>
リストが空の場合、何もする必要はありません。
そうでない場合：
  1. リストの最初の要素を取り出す
  2. リストの残りの要素から、最初の要素より小さい
     要素をすべて見つけ、ソートする
  3. リストの残りの要素から、最初の要素以上の
     要素をすべてｓ見つけ、ソートする
  4. 3つの部分を組み合わせて最終結果を得る：
     (ソートされた小さい要素 + 最初の要素 + 
      ソートされた大きい要素)
</pre>	   

これは簡略化されたアルゴリズムであり、最適化されていないことに注意してください（また、真のクイックソートのようにその場でソートしません）。今は明確さに焦点を当てたいと思います。

F#でのコードは以下の通りです：

```fsharp
let rec quicksort list =
   match list with
   | [] ->                            // リストが空の場合
        []                            // 空のリストを返す
   | firstElem::otherElements ->      // リストが空でない場合     
        let smallerElements =         // 小さい要素を抽出    
            otherElements             
            |> List.filter (fun e -> e < firstElem) 
            |> quicksort              // そしてソート
        let largerElements =          // 大きい要素を抽出
            otherElements 
            |> List.filter (fun e -> e >= firstElem)
            |> quicksort              // そしてソート
        // 3つの部分を新しいリストに結合して返す
        List.concat [smallerElements; [firstElem]; largerElements]

//テスト
printfn "%A" (quicksort [1;5;23;18;9;1;3])
```

繰り返しになりますが、これは最適化された実装ではなく、アルゴリズムに忠実に設計されています。

このコードを詳しく見ていきましょう：

* どこにも型宣言がありません。この関数は比較可能な項目を持つあらゆるリストで動作します（ほとんどすべてのF#の型がデフォルトの比較関数を自動的に持っているため、これはほとんどすべてのF#の型に当てはまります）。
* 関数全体が再帰的です - これは"`let rec quicksort list =`"の`rec`キーワードを使ってコンパイラに伝えられています。
* `match..with`は一種のswitch/case文のようなものです。テストする各分岐は縦棒で示されます。たとえば：

```fsharp
match x with
| caseA -> something
| caseB -> somethingElse
```
* `[]`との"`match`"は空のリストにマッチし、空のリストを返します。
* `firstElem::otherElements`との"`match`"は2つのことを行います。
  * まず、空でないリストにのみマッチします。
  * 次に、自動的に2つの新しい値を作成します。1つは最初の要素用の"`firstElem`"、もう1つはリストの残りの部分用の"`otherElements`"です。
    C#の用語で言えば、これは分岐するだけでなく、*同時に*変数宣言と割り当ても行う"switch"文のようなものです。
* `->`はC#のラムダ（`=>`）のようなものです。同等のC#のラムダは`(firstElem, otherElements) => do something`のようになります。
* "`smallerElements`"セクションは、リストの残りの部分を取り、"`<`"演算子を使ったインラインのラムダ式で最初の要素に対してフィルタリングし、その結果を再帰的にquicksort関数にパイプします。
* "`largerElements`"行も同じことを行いますが、"`>=`"演算子を使用します。
* 最後に、結果のリストはリスト連結関数"`List.concat`"を使って構築されます。これを機能させるには、最初の要素をリストに入れる必要があり、それが角かっこの役割です。
* 繰り返しになりますが、"return"キーワードはありません。最後の値が返されます。"`[]`"分岐では戻り値は空のリストで、メイン分岐では新しく構築されたリストです。

比較のため、以下は古いスタイルのC#実装です（LINQを使用していません）。

```csharp
public class QuickSortHelper
{
   public static List<T> QuickSort<T>(List<T> values) 
      where T : IComparable
   {
      if (values.Count == 0)
      {
         return new List<T>();
      }

      //最初の要素を取得
      T firstElement = values[0];

      //小さい要素と大きい要素を取得
      var smallerElements = new List<T>();
      var largerElements = new List<T>();
      for (int i = 1; i < values.Count; i++)  // iは1から
      {                                       // 0ではない！
         var elem = values[i];
         if (elem.CompareTo(firstElement) < 0)
         {
            smallerElements.Add(elem);
         }
         else
         {
            largerElements.Add(elem);
         }
      }

      //結果を返す
      var result = new List<T>();
      result.AddRange(QuickSort(smallerElements.ToList()));
      result.Add(firstElement);
      result.AddRange(QuickSort(largerElements.ToList()));
      return result;
   }
}
```

2つのコードセットを比較すると、F#のコードがはるかにコンパクトで、ノイズが少なく、型宣言が不要であることがわかります。

さらに、F#のコードはC#のコードとは異なり、実際のアルゴリズムとほぼ同じように読めます。これはF#のもう一つの重要な利点です - F#のコードは一般的にC#よりも宣言的（「何をするか」）で命令的（「どのようにするか」）ではないため、より自己文書化されています。

 
## C#での関数型実装 ##

以下は、LINQと拡張メソッドを使用したより現代的な「関数型スタイル」の実装です：

```csharp
public static class QuickSortExtension
{
    /// <summary>
    /// IEnumerableの拡張メソッドとして実装
    /// </summary>
    public static IEnumerable<T> QuickSort<T>(
        this IEnumerable<T> values) where T : IComparable
    {
        if (values == null || !values.Any())
        {
            return new List<T>();
        }

        //リストを最初の要素と残りに分割
        var firstElement = values.First();
        var rest = values.Skip(1);

        //小さい要素と大きい要素を取得
        var smallerElements = rest
                .Where(i => i.CompareTo(firstElement) < 0)
                .QuickSort();

        var largerElements = rest
                .Where(i => i.CompareTo(firstElement) >= 0)
                .QuickSort();

        //結果を返す
        return smallerElements
            .Concat(new List<T>{firstElement})
            .Concat(largerElements);
    }
}
```

これははるかに清潔で、F#バージョンとほぼ同じように読めます。しかし残念ながら、関数シグネチャの余分なノイズを避ける方法はありません。

## 正確性

最後に、このコンパクトさの有益な副作用として、F#のコードは多くの場合最初から正しく動作しますが、C#のコードはより多くのデバッグが必要かもしれません。

実際、これらのサンプルをコーディングする際、古いスタイルのC#コードは最初は不正確で、正しくするためにいくつかのデバッグが必要でした。特に厄介な部分は`for`ループ（0ではなく1から始まる）と`CompareTo`比較（私は逆にしてしまいました）でした。また、誤って入力リストを変更してしまう可能性も非常に高いです。2番目のC#例の関数型スタイルは、より清潔であるだけでなく、正しくコーディングするのも容易でした。

しかし、関数型のC#バージョンでさえ、F#バージョンと比べると欠点があります。たとえば、F#はパターンマッチングを使用するため、空のリストで「空でないリスト」のケースに分岐することは不可能です。一方、C#のコードでは、以下のテストを忘れた場合：

```csharp
if (values == null || !values.Any()) ...
```

最初の要素の抽出：

```csharp
var firstElement = values.First();
```

は例外で失敗します。コンパイラはこれを強制できません。自分のコードで、「防御的な」コードを書いているために`First`ではなく`FirstOrDefault`を使用したことはどれくらいありますか？以下は、C#では非常に一般的だがF#ではまれなコードパターンの例です：

```csharp
var item = values.FirstOrDefault();  // .First()の代わり
if (item != null) 
{ 
   // itemが有効な場合に何かを行う 
}
```

F#の1ステップの「パターンマッチと分岐」により、多くの場合これを避けることができます。

## 追記

上記のF#の実装例は、F#の基準からすると実際にはかなり冗長です！

楽しみのために、より典型的な簡潔なバージョンがどのように見えるか示します：

```fsharp
let rec quicksort2 = function
   | [] -> []                         
   | first::rest -> 
        let smaller,larger = List.partition ((>=) first) rest 
        List.concat [quicksort2 smaller; [first]; quicksort2 larger]
        
// テストコード        
printfn "%A" (quicksort2 [1;5;23;18;9;1;3])
```

たった4行のコードでこれだけのことができるのは悪くありませんね。構文に慣れれば、十分に理解しやすいコードです。
