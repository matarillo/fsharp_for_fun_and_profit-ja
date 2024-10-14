---
layout: post
title: "関数型アプローチによる認可"
description: "ケイパビリティベースのセキュリティなど"
seriesId: "関数型アプローチによる認可"
seriesOrder: 1
categories: []
---

*更新: [このトピックに関する講演のスライドとビデオ](https://fsharpforfunandprofit.com/cap/)*

この一連の記事では、認可という一般的なセキュリティ課題への対処方法について考察します。
つまり、コードのクライアントが、許可された操作のみを実行できるようにするにはどうすればよいでしょうか?

このシリーズでは、2つの異なるアプローチの概要を説明します。最初は*ケイパビリティベースのセキュリティ*と呼ばれるアプローチを使用し、2つ目は静的にチェックされた型を使用してアクセストークンをエミュレートします。

興味深いことに、どちらのアプローチでも、副作用として、よりクリーンでモジュール化された設計が生成される傾向があります。これが私が気に入っている理由です!

始める前に、大きな注意点について言及しなければなりません。
.NET環境では、一般的にリフレクションを使用してコンパイル時のチェックをバイパスできます。
そのため、ここで示すアプローチは、真に悪意のある攻撃を防ぐというよりも、*意図しない*セキュリティの脆弱性を減らす設計を作成するのに役立ちます。

最後に、私はセキュリティの専門家ではありません。自分の考えや提案をいくつか書き留めているだけです。
この記事は、本格的なセキュリティ設計の代わりになることを意図したものでも、セキュリティ対策の真剣な研究でもありません。
詳細を知りたい場合は、記事の下部に参考文献へのリンクがあります。

## パート1: 設定例

まず、簡単なシナリオから始めましょう:

* コードの一部で設定できる設定オプションがあります。 `DontShowThisMessageAgain`というブール値だとしましょう。
* アプリケーションのコンポーネント(UIなど)がこのオプションを設定したいと考えています。
* さらに、コンポーネントが悪意のある開発者によって書かれており、可能であれば問題を起こそうとしていると仮定します。

では、この設定を潜在的に悪意のある呼び出し元にどのように公開すればよいでしょうか?

**試行1: 呼び出し元に設定ファイルの名前を渡す**

本当に悪いアイデアから始めましょう。呼び出し元に設定ファイルの名前を提供し、ファイル自体を変更させます。

C#の疑似コードでは、これは次のように記述できます。

```csharp
interface IConfiguration
{   
    string GetConfigFilename();
}
```

呼び出し元のコードは次のようになります。

```csharp
var filename = config.GetConfigFilename();
// ファイルを開く
// 新しい設定を書き込む
// ファイルを閉じる
```

明らかに、これは良くありません! これを機能させるには、呼び出し元にファイルシステム上の任意のファイルに書き込む権限を与える必要があります。
悪意のある呼び出し元はあらゆる種類のものを削除したり破損したりする可能性があります。

ファイルシステムに対する厳密な権限を設定することでこれをある程度回避できますが、それでも呼び出し元に過剰な制御を与えています。

**試行2: 呼び出し元にTextWriterを渡す**

さて、ファイル自体を開いて、開いたファイルストリームを`TextWriter`として呼び出し元に渡してみましょう。そうすれば、呼び出し元はファイルシステムにアクセスするための権限をまったく必要としません。

しかしもちろん、悪意のある呼び出し元はファイルにゴミを書き込むことで設定ファイルを破損する可能性があります。繰り返しますが、呼び出し元に過剰な制御を与えています。

**試行3: 呼び出し元にキー/値インターフェースを渡す**

次のように、呼び出し元に設定ファイルをキー/値ストアとして扱うことを強制するインターフェースを提供することで、これをロックダウンしましょう。

```csharp
interface IConfiguration
{   
    void SetConfig(string key, string value);
}
```

呼び出し元のコードは次のようになります。

```csharp
config.SetConfig("DontShowThisMessageAgain", "True");
```

これははるかに優れていますが、文字列型のインターフェースであるため、悪意のある呼び出し元は、解析されないブール値以外の値を設定することで設定を破損する可能性があります。
また、必要に応じて他のすべての設定キーを破損する可能性もあります。

**試行4: 呼び出し元にドメイン中心のインターフェースを渡す**

さて、汎用設定インターフェースを使用するのではなく、各設定に固有のメソッドを提供するインターフェースを提供しましょう。

```csharp
enum MessageFlag {
   ShowThisMessageAgain,
   DontShowThisMessageAgain
   }

interface IConfiguration
{   
    void SetMessageFlag(MessageFlag value);
    void SetConnectionString(ConnectionString value);
    void SetBackgroundColor(Color value);
}
```

これで、呼び出し元は設定を破損することはできません。各オプションは静的に型付けされているためです。

しかし、まだ問題があります! メッセージフラグを変更することだけを許可されていた悪意のある呼び出し元が、接続文字列を変更することを止めるものは何でしょうか?

**試行5: 呼び出し元に必要なインターフェースのみを渡す**

さて、呼び出し元がアクセスする必要があるメソッド*のみ*を含む新しいインターフェースを定義し、他のすべてのメソッドを非表示にしましょう。

```csharp
interface IWarningMessageConfiguration
{   
    void SetMessageFlag(MessageFlag value);
}
```

これで可能な限りロックダウンできました! 呼び出し元は、許可されたこと*のみ*を実行できます。

言い換えれば、通常は「POLA」と略される[最小権限の原則](https://en.wikipedia.org/wiki/Principle_of_least_privilege)を使用して設計を作成しました。

## 良好な設計としてのセキュリティ

このアプローチで興味深いのは、悪意のある呼び出し元に関係なく、*とにかく*良好な設計を行うために実行することとまったく同じであるということです。

情報隠蔽や分離などの設計原則のみに基づいて、どのように設計を検討するかの例を次に示します。

* 呼び出し元にファイル名を渡すと、ファイルベースの設定ファイルに制限されてしまいます。
  呼び出し元にTextWriterを渡すことで、設計のモック性を高めることができます。
* しかし、呼び出し元にTextWriterを渡すと、特定のストレージ形式(XML、JSONなど)を公開することになり、テキストベースのストレージにも制限されてしまいます。
  呼び出し元に汎用KeyValueストアを渡すことで、形式を隠し、実装の選択肢をより柔軟にします。
* しかし、文字列を使用して呼び出し元に汎用KeyValueストアを渡すと、値がブール値ではないバグが発生する可能性があり、そのための検証とテストを作成する必要があります。
  静的に型付けされたインターフェースを使用すると、破損チェックコードを記述する必要はありません。
* しかし、呼び出し元にメソッドが多すぎるインターフェースを渡すと、*[インターフェース分離の原則](https://en.wikipedia.org/wiki/Interface_segregation_principle)*に従っていないことになります。
  したがって、使用可能なメソッドの数を呼び出し元が必要とする絶対的な最小限に減らす必要があります。

このような思考プロセスを経て、優れた設計プラクティスのみを使用すると、セキュリティについて心配していた場合とまったく同じ結果になります!

つまり、呼び出し元が必要とする最小限のインターフェースを設計すると、偶発的な複雑さを回避し(優れた設計)、セキュリティを向上させることができます(POLA)。

もちろん、通常は悪意のある呼び出し元に対処する必要はありませんが、開発者として、自分自身を意図せずに悪意があるとみなすべきです。
たとえば、インターフェースに余分なメソッドがあると、別のコンテキストで使用される可能性があります。
すると、2つのコンテキスト間の結合度が高くなり、リファクタリングが難しくなります。

ヒント:**悪意のある呼び出し元を想定して設計すると、おそらくよりモジュール化されたコードになります!**

## ケイパビリティベースのセキュリティの紹介

上記で行ったのは、呼び出し元へのサーフェス領域を徐々に減らしていき、最終的な設計では呼び出し元が1つのことだけを実行できるようにすることです。

その「1つのこと」が「ケイパビリティ」です。呼び出し元はメッセージフラグを設定するケイパビリティを持っており、それだけです。

[「ケイパビリティベース」のセキュリティ](https://en.wikipedia.org/wiki/Capability-based_security)は、このアイデアに基づくセキュリティモデルです。

* システムはクライアントに「ケイパビリティ」を提供します(この場合は、インターフェースの実装を介して)。
* これらのケイパビリティは、必要なすべてのアクセス権をカプセル化します。たとえば、インターフェースの実装にアクセスできるという事実そのものが、そのフラグを設定できることを意味します。
  そのフラグを設定する権限がない場合は、そもそもケイパビリティ(インターフェース)が与えられていません。(認可については次の記事で詳しく説明します)。
* 最後に、ケイパビリティは受け渡すことができます。
  たとえば、起動時にケイパビリティを取得し、後でUIレイヤーに渡して必要に応じて使用することができます。

言い換えれば、「念のため」ではなく「ジャストインタイム」のモデルです。
過剰な「アンビエント」権限を全員がグローバルに利用できるようにするのではなく、必要に応じて最小限の権限を渡します。

ケイパビリティベースのモデルは、多くの場合、オペレーティングシステムに焦点を当てていますが、プログラミング言語にも非常によく適合します。
そこでは、[オブジェクトケイパビリティモデル](https://en.wikipedia.org/wiki/Object-capability_model)と呼ばれます。

この記事では、コードでケイパビリティベースのアプローチを使用することで、より優れた設計でより堅牢なコードを作成できることを示したいと思います。
さらに、潜在的なセキュリティエラーは、実行時ではなく*コンパイル時*に検出できます。

上記で述べたように、アプリが信頼されている場合は、.NETリフレクションを使用して、資格のないケイパビリティを常に「偽造」できます。
繰り返しますが、ここで示すアプローチは、真に悪意のある攻撃を防ぐというよりも、
*意図しない*セキュリティの脆弱性を減らす、より堅牢な設計を作成することです。

<a id="authority"></a>

## 権限と許可

ケイパビリティベースのセキュリティモデルでは、「許可」ではなく「権限」という用語を使用する傾向があります。この2つには違いがあります。

* *権限*ベースのシステムでは、何かを実行する権限が付与されると、その権限の一部またはすべてを他者に渡したり、独自の追加の制約を追加したりできます。
* *許可*ベースのシステムでは、何かを実行するための許可を要求できますが、その許可を他者に渡すことはできません。

権限ベースのシステムは、許可ベースのシステムよりもオープンで「危険」であるように思えるかもしれません。しかし、許可ベースのシステムでは、他の人が私にアクセスでき、私が彼らと協力する場合、私は彼らがやりたいことの何でも代理人として行動できます。
サードパーティは*それでも*間接的に権限を取得できます。
許可は実際には物事をより安全にするわけではありません。攻撃者はより複雑なアプローチを使用する必要があるだけです。

具体的な例を挙げましょう。アリスは私が彼女の車を運転することを信頼しており、彼女は私に車を貸してくれることをいとわないが、ボブを信頼していません。
私がボブと友達なら、アリスが見ていないときにボブに車を運転させることができます。つまり、アリスが私を信頼している場合、彼女は私が信頼している人なら誰でも暗黙的に信頼しています。
権限ベースのシステムは、これを明示的にするだけです。アリスが私に彼女の車の鍵を渡すことは、私が他の人に車の鍵を渡すかもしれないことを完全に承知の上で、彼女の車を運転する「ケイパビリティ」を私に与えているのです。

もちろん、許可ベースのシステムで私が代理人として行動する場合、私が望むなら、サードパーティとの協力を停止することができます。
その時点で、サードパーティはアクセス権を失います。

権限ベースのシステムにおけるそれと同等のものは、「失効可能な権限」であり、後で例を示します。
車のキーの例えでは、これはオンデマンドで自己破壊する車のキーのようなものです!

## ケイパビリティを関数としてモデル化する

1つのメソッドを持つインターフェースは、関数としてより適切に実現できます。したがって、このインターフェース:

```csharp
interface IWarningMessageConfiguration
{   
    void SetMessageFlag(MessageFlag value);
}
```

は、単にこの関数になります。

```csharp
Action<MessageFlag> messageFlagCapability = // 関数を取得する
```

またはF#では:

```fsharp
let messageFlagCapability = // 関数を取得する
```

ケイパビリティベースのセキュリティへの関数型アプローチでは、各ケイパビリティはインターフェースではなく関数によって表されます。

ケイパビリティを表すために関数を使用することの利点は、標準的な関数型プログラミング手法をすべて使用できることです。それらを構成したり、コンビネータと組み合わせたりできます。

## オブジェクトケイパビリティモデルと関数型プログラミングモデル

オブジェクトケイパビリティモデルの他の多くの要件は、関数型プログラミングフレームワークによく適合します。比較表を次に示します。

<table class="table table-bordered table-striped">
<tr>
<th>オブジェクトケイパビリティモデル
</th>
<th>関数型プログラミング
</th>
</tr>
<tr>
<td>グローバルな可変状態は許可されません
</td>
<td>グローバルな可変状態は許可されません 
</td>
</tr>
<tr>
<td>ケイパビリティは、常に親から子へ、または送信者から受信者へと明示的に渡されます。
</td>
<td>関数は、パラメーターとして渡せる値です。
</td>
</tr>
<tr>
<td>ケイパビリティは、環境から抽出されることはありません(「アンビエント権限」)。
</td>
<td>純粋関数は、すべての「依存関係」を明示的に渡します。
</td>
</tr>
<tr>
<td>ケイパビリティは改ざんできません。
</td>
<td>データは不変です。
</td>
</tr>
<tr>
<td>ケイパビリティを偽造したり、他のケイパビリティにキャストしたりできません。
</td>
<td>妥協のない関数型言語では、リフレクションやキャストは使えません(もちろん、F#はこのように厳密ではありません)。
</td>
</tr>
<tr>
<td>ケイパビリティは「フェールセーフ」である必要があります。
ケイパビリティを取得できない場合、または機能しない場合は、成功したと想定したパスで進行を許可してはいけません。
</td>
<td>F#などの静的に型付けされた言語では、これらの種類の制御フロー規則を型システムに埋め込むことができます。<code>Option</code>の使用は、この例です。
</td>
</tr>
</table>

ご覧のとおり、かなりの重複があります。

オブジェクトケイパビリティモデルの*非公式*の目標の1つは、**セキュリティを目に見えないようにすることで、セキュリティをユーザーフレンドリーにする**ことです。これは素晴らしいアイデアだと思います。
ケイパビリティを関数として渡すことで、非常に簡単に実現できます。

ケイパビリティベースのモデルが真の関数型モデルと*重複しない*重要な側面が1つあることに注意することが重要です。

ケイパビリティは、ほとんどすべてがエフェクト(副作用)に関するものです。ファイルシステム、ネットワークなどを読み書きします。
真の関数型モデルは、(モナドなどで)それらを何らかの形でラップしようとします。
個人的には、F#を使用する場合、[より複雑なフレームワーク](https://hackage.haskell.org/package/Capabilities)を構築するのではなく、副作用を許可するだけです。

しかし、繰り返しになりますが、上記で述べたように、この記事の目的は、100%厳密なオブジェクトケイパビリティモデルに強制することではなく、同じアイデアの一部を借用してより良い設計を作成することです。

## ケイパビリティの取得

この時点で自然な疑問は、これらのケイパビリティ関数はどこから来るのかということです?

答えは、そのケイパビリティを持つことを認可できる何らかのサービスです。
設定の例では、通常、厳密な認可は行わないため、設定サービス自体が通常、ID、ロール、またはその他のクレームを確認せずにケイパビリティを提供します。

しかし、設定サービスにアクセスするにはケイパビリティが必要です。それはどこから来るのでしょうか? 責任の所在をどこかで明らかにする必要があります!

OO設計では、通常、すべての依存関係が構築され、IoCコンテナーが構成されるブートストラップ/起動ステージがあります。
ケイパビリティベースのシステムでは、[いわゆるパワーボックス](https://c2.com/cgi/wiki?PowerBox)が、すべての権限の開始点となる同様の役割を果たします。

設定ケイパビリティを提供するサービスのコードを次に示します。

```csharp
interface IConfigurationCapabilities
{   
    Action<MessageFlag> SetMessageFlag();
    Action<ConnectionString> SetConnectionString();
    Action<Color> SetBackgroundColor();
}
```

このコードは、前に定義したインターフェースと非常によく似ているように見えるかもしれませんが、違いは、これが起動時に初期化されて、渡されるケイパビリティを返すことです。

ケイパビリティの実際のユーザーは、設定システム自体にはまったくアクセスできず、与えられたケイパビリティのみにアクセスできます。
つまり、OOモデルで1つのメソッドインターフェースが挿入されるのと同じ方法で、ケイパビリティがクライアントに挿入されます。

C#の疑似コードの例を次に示します。

* ケイパビリティは起動時に取得されます。
* ケイパビリティは、コンストラクターを介してメインウィンドウ(`ApplicationWindow`)に挿入されます。
* `ApplicationWindow`はチェックボックスを作成します。
* チェックボックスのイベントハンドラーはケイパビリティを呼び出します。

```csharp
// 起動時
var messageFlagCapability = 
    configurationCapabilities.SetMessageFlag()
var appWindow = new ApplicationWindow(messageflagCapability)

// UIクラス内
class ApplicationWindow
{
    // コンストラクターでケイパビリティを渡す
    // インターフェースを渡すのと同じように
    ApplicationWindow(Action<MessageFlag> messageFlagCapability)
    {  
        // フィールドを設定する
    }
    
    // チェックボックスをセットアップし、「OnCheckboxChecked」ハンドラーを登録する
    
    // イベントが発生したらケイパビリティを使用する
    void OnCheckboxChecked(CheckBox sender)
    {
        messageFlagCapability(sender.IsChecked)
    }
}
```

## 完全なF#の例 ##

F#の完全な例のコードを次に示します([gistはこちら](https://gist.github.com/swlaschin/909c5b24bf921e5baa8c#file-capabilitybasedsecurity_configexample-fsx))。

この例は、メイン領域といくつかの追加ボタンを備えたシンプルなウィンドウで構成されています。

* メイン領域をクリックすると、「このメッセージを再度表示しない」オプションが付いた迷惑なダイアログがポップアップ表示されます。
* ボタンの1つを使用すると、システムのカラーピッカーを使用して背景色を変更し、設定に保存できます。
* もう1つのボタンを使用すると、「このメッセージを再度表示しない」オプションをfalseにリセットできます。

これは非常に荒削りで、見た目はかなりひどいものです（UIデザイナーは制作に関わっていないのでご安心を）。ただ、ここまでの要点を示すには十分でしょう。

![アプリケーション例](../assets/img/auth_annoying_popup.png)

### 設定システム

設定システムから始めます。概要は次のとおりです。

* カスタム型`MessageFlag`、`ConnectionString`、`Color`が定義されています。
* すべてのケイパビリティを保持するために、レコード型`ConfigurationCapabilities`が定義されています。
* デモの目的で、メモリ内ストア(`ConfigStore`)が作成されます
* 最後に、`ConfigStore`を読み書きする関数を使用して、`configurationCapabilities`が作成されます

```fsharp
module Config =

    type MessageFlag  = ShowThisMessageAgain | DontShowThisMessageAgain
    type ConnectionString = ConnectionString of string
    type Color = System.Drawing.Color

    type ConfigurationCapabilities = {
        GetMessageFlag : unit -> MessageFlag 
        SetMessageFlag : MessageFlag -> unit
        GetBackgroundColor : unit -> Color 
        SetBackgroundColor : Color -> unit
        GetConnectionString  : unit -> ConnectionString 
        SetConnectionString : ConnectionString -> unit
        }

    // デモ目的のプライベートストア
    module private ConfigStore =
        let mutable MessageFlag = ShowThisMessageAgain 
        let mutable BackgroundColor = Color.White
        let mutable ConnectionString = ConnectionString ""

    // パブリックケイパビリティ
    let configurationCapabilities = {
        GetMessageFlag = fun () -> ConfigStore.MessageFlag 
        SetMessageFlag = fun flag -> ConfigStore.MessageFlag <- flag
        GetBackgroundColor = fun () -> ConfigStore.BackgroundColor
        SetBackgroundColor = fun color -> ConfigStore.BackgroundColor <- color
        SetConnectionString = fun _ -> () // 無視する
        GetConnectionString = fun () -> ConfigStore.ConnectionString 
        SetConnectionString = fun connStr -> ConfigStore.ConnectionString <- connStr
        }
```

### 迷惑なポップアップダイアログ

次に、迷惑なポップアップダイアログを作成します。これは、メインウィンドウをクリックするたびにトリガーされます。
「このメッセージを再度表示しない」オプションがオンになっている場合*は除きます*。

ダイアログは、ラベルコントロール、メッセージフラグチェックボックス、およびOKボタンで構成されています。

チェックボックスコントロールを作成する`createMessageFlagCheckBox`関数には、フラグを取得および設定するために必要な2つのケイパビリティのみが渡されることに注意してください。

これには、メインフォーム作成関数(`createForm`)にもケイパビリティが渡される必要があります。
これらのケイパビリティ、そしてこれらのケイパビリティ*のみ*がフォームに渡されます。
背景色または接続文字列を設定するためのケイパビリティは渡され*ない*ため、(誤って)使用することはできません。

```fsharp
module AnnoyingPopupMessage = 
    open System.Windows.Forms
   
    let createLabel() = 
        new Label(Text="メインウィンドウをクリックしました", Dock=DockStyle.Top)

    let createMessageFlagCheckBox capabilities  = 
        let getFlag,setFlag = capabilities 
        let ctrl= new CheckBox(Text="この迷惑なメッセージを再度表示しない", Dock=DockStyle.Bottom)
        ctrl.Checked <- getFlag()
        ctrl.CheckedChanged.Add (fun _ -> ctrl.Checked |> setFlag)
        ctrl   // 新しいコントロールを返す

    let createOkButton (dialog:Form) = 
        let ctrl= new Button(Text="OK",Dock=DockStyle.Bottom)
        ctrl.Click.Add (fun _ -> dialog.Close())
        ctrl

    let createForm capabilities = 
        let form = new Form(Text="迷惑なポップアップメッセージ", Width=300, Height=150)
        form.FormBorderStyle <- FormBorderStyle.FixedDialog
        form.StartPosition <- FormStartPosition.CenterParent

        let label = createLabel()
        let messageFlag = createMessageFlagCheckBox capabilities
        let okButton = createOkButton form
        form.Controls.Add label 
        form.Controls.Add messageFlag 
        form.Controls.Add okButton 
        form
```

### メインアプリケーションウィンドウ

これで、かなりばかげた「アプリケーション」のメインウィンドウを作成できます。以下の要素からできています。

* クリックすると迷惑なポップアップ(`createClickMeLabel`)が表示されるラベルコントロール
* 背景色を変更するためのカラーピッカーダイアログを表示するボタン(`createChangeBackColorButton`)
* メッセージフラグを「表示」にリセットするボタン(`createResetMessageFlagButton`)

これらのコンストラクター関数の3つすべてにケイパビリティが渡されますが、ケイパビリティはそれぞれの場合で異なります。

* ラベルコントロールには、`getFlag`および`setFlag`ケイパビリティのみが渡されます
* カラーピッカーダイアログには、`getColor`および`setColor`ケイパビリティのみが渡されます
* メッセージフラグをリセットするボタンには、`setFlag`ケイパビリティのみが渡されます

メインフォーム(`createMainForm`)では、ケイパビリティの完全なセットが渡され、
子コントロール(`popupMessageCapabilities`、`colorDialogCapabilities`)に必要なさまざまな方法で再結合されます。

さらに、ケイパビリティ関数が変更されています。

* フォームの背景も変更することに加えて、既存のケイパビリティから新しい「SetColor」ケイパビリティが作成されます。
* フラグケイパビリティは、ドメイン型(`MessageFlag`)からチェックボックスで直接使用できるブール値に変換されます。

コードは次のとおりです。

```fsharp
module UserInterface = 
    open System.Windows.Forms
    open System.Drawing

    let showPopupMessage capabilities owner = 
        let getFlag,setFlag = capabilities 
        let popupMessage = AnnoyingPopupMessage.createForm (getFlag,setFlag) 
        popupMessage.Owner <- owner 
        popupMessage.ShowDialog() |> ignore // 結果を気にしない

    let showColorDialog capabilities owner = 
        let getColor,setColor = capabilities 
        let dlg = new ColorDialog(Color=getColor())
        let result = dlg.ShowDialog(owner)
        if result = DialogResult.OK then
            dlg.Color |> setColor

    let createClickMeLabel capabilities owner = 
        let getFlag,_ = capabilities 
        let ctrl= new Label(Text="クリックしてください", Dock=DockStyle.Fill, TextAlign=ContentAlignment.MiddleCenter)
        ctrl.Click.Add (fun _ -> 
            if getFlag() then showPopupMessage capabilities owner)
        ctrl  // 新しいコントロールを返す

    let createChangeBackColorButton capabilities owner = 
        let ctrl= new Button(Text="背景色を変更", Dock=DockStyle.Bottom)
        ctrl.Click.Add (fun _ -> showColorDialog capabilities owner)
        ctrl

    let createResetMessageFlagButton capabilities = 
        let setFlag = capabilities 
        let ctrl= new Button(Text="ポップアップメッセージを再度表示", Dock=DockStyle.Bottom)
        ctrl.Click.Add (fun _ -> setFlag Config.ShowThisMessageAgain)
        ctrl

    let createMainForm capabilities = 
        // パラメーターから個々のコンポーネントケイパビリティを取得する
let getFlag,setFlag,getColor,setColor = capabilities

    let form = new Form(Text="ケイパビリティの例", Width=500, Height=300)
    form.BackColor <- getColor() // 設定からフォームを更新する

    // フォームも変更するようにカラーケイパビリティを変換する
    let newSetColor color = 
        setColor color           // 設定を変更する
        form.BackColor <- color  // フォームも変更する

    // フラグケイパビリティをドメイン型からブール値に変換する
    let getBoolFlag() = 
        getFlag() = Config.ShowThisMessageAgain 
    let setBoolFlag bool = 
        if bool 
        then setFlag Config.ShowThisMessageAgain 
        else setFlag Config.DontShowThisMessageAgain 

    // 子オブジェクトのケイパビリティをセットアップする
    let colorDialogCapabilities = getColor,newSetColor 
    let popupMessageCapabilities = getBoolFlag,setBoolFlag

    // さまざまなケイパビリティを持つコントロールをセットアップする
    let clickMeLabel = createClickMeLabel popupMessageCapabilities form
    let changeColorButton = createChangeBackColorButton colorDialogCapabilities form
    let resetFlagButton = createResetMessageFlagButton setFlag 

    // コントロールを追加する
    form.Controls.Add clickMeLabel 
    form.Controls.Add changeColorButton
    form.Controls.Add resetFlagButton 

    form  // フォームを返す
```

### 起動コード

最後に、`Startup`と呼ばれるトップレベルモジュールは、構成サブシステムからいくつかのケイパビリティを取得し、メインフォームに渡すことができるタプルに結合します。
ただし、`ConnectionString`ケイパビリティは渡され*ない*ため、フォームが誤ってユーザーに表示したり、更新したりする方法はありません。

```fsharp
module Startup = 

    // ケイパビリティをセットアップする
    let configCapabilities = Config.configurationCapabilities
    let formCapabilities = 
        configCapabilities.GetMessageFlag, 
        configCapabilities.SetMessageFlag,
        configCapabilities.GetBackgroundColor,
        configCapabilities.SetBackgroundColor

    // 開始
    let form = UserInterface.createMainForm formCapabilities 
    form.ShowDialog() |> ignore
````

<a id="summary"></a>

## パート1のまとめ

ご覧のとおり、このコードは依存性注入で設計されたOOシステムと非常によく似ています。ケイパビリティへのグローバルアクセスはなく、親から渡されたものだけです。

![例1](../assets/img/auth_1.png)

もちろん、このように関数をパラメーター化して動作を定義することは特別なものではありません。これは最も基本的な関数型プログラミング手法の1つです。
したがって、このコードは実際には新しいアイデアを示しているのではなく、標準的な関数型プログラミングアプローチを適用してアクセスパスを強制する方法を示しているだけです。

この時点でよくある質問:

**質問: これって余計な手間のように思えます。なぜこんなことをする必要があるのでしょうか？**

シンプルなシステムをお持ちの場合は、確かにこれを行う必要はありません。しかし、これが役立つ場合があります。

  * きめ細かい認可をすでに使用しているシステムがあり、これをより明示的にして、実際に使いやすくしたいと考えています。
  * 高い権限で実行されているが、データの漏洩や不正なコンテキストでのアクションの実行に関して厳格な要件があるシステムがあります。

このような状況では、UIレイヤーだけでなく、コードベースの*すべてのポイント*でケイパビリティが何であるかを*明示的に*することが非常に重要であると信じています。
これは、コンプライアンスと監査のニーズに役立つだけでなく、コードのモジュール化と保守の容易さを向上させるという実際的な利点もあります。

**質問: このアプローチと依存性注入の違いは何ですか?**

依存性注入とケイパビリティベースのモデルの目標は異なります。依存性注入は分離に関するすべてですが、ケイパビリティはアクセスの制御に関するすべてです。
見てきたように、どちらのアプローチも最終的には同様の設計を促進します。

**質問: 渡す必要のあるケイパビリティが何百もある場合はどうなりますか?**

これは問題になるはずのように思えますが、実際にはそうならない傾向があります。
1つには、部分適用を適切に使用すると、ケイパビリティを関数に組み込んでから渡すことができるため、子オブジェクトはそれらを認識することさえありません。

次に、必要に応じて、ケイパビリティのグループを含む単純なレコード型を作成して渡すことは非常に簡単です。
`ConfigurationCapabilities`型で行ったように、わずか数行です。

**質問: このアプローチに従わずに、グローバルなケイパビリティにアクセスすることを、どうやって防ぐのでしょうか？**

C\#またはF\#では、グローバルなパブリック関数へのアクセスを停止することはできません。
グローバル変数の回避などの他のベストプラクティスと同様に、正しい道を歩むためには、自己規律(およびおそらくコードレビュー)に頼る必要があります\!

しかし、このシリーズの[第3部](../posts/capability-based-security-3.md)では、アクセストークンを使用してグローバル関数へのアクセスを防ぐ方法について説明します。

**質問: これらは単なる標準的な関数型プログラミング手法ではありませんか?**

はい。ここで何か巧妙なことをしているとは主張していません\!

**質問: これらのケイパビリティ関数は副作用があります。それはどういうことですか?**

はい、これらのケイパビリティ関数は純粋ではありません。ここでの目標は、純粋であることではなく、ケイパビリティのプロビジョニングについて明示的にすることです。

純粋な`IO`コンテキスト(Haskellなど)を使用したとしても、ケイパビリティへのアクセスの制御には役立ちません。
つまり、セキュリティのコンテキストでは、パスワードやクレジットカードを変更するケイパビリティと、背景色の設定を変更するケイパビリティの間には大きな違いがあります。
どちらも計算の観点からは単なる「IO」ですが。

純粋なケイパビリティを作成することは可能ですが、F\#では簡単ではないため、この記事では範囲外とします。

**質問: (ある人)が書いたことへのあなたの反応は何ですか? そして、なぜ(ある論文)を引用しなかったのですか?**

これはブログ投稿であり、学術論文ではありません。私はこの分野の専門家ではなく、自分自身でいくつかの実験をしているだけです。

さらに重要なことに、前にも言ったように、ここでの私の目標はセキュリティの専門家とは大きく異なります。
私は理想的なセキュリティモデルを開発しようとしているのではありません。
むしろ、私は、実際的な開発者がコードに意図しない脆弱性がないようにするための*優れた設計*プラクティスを奨励しようとしているだけです。

**質問がもっとあります...**

[パート2の最後](../posts/capability-based-security-2.md#summary)でいくつかの追加の質問に回答しているので、最初にそれらの回答を読んでください。
それ以外の場合は、以下のコメントに質問を追加してください。対応させていただきます。

## 参考文献

ここで紹介したケイパビリティベースのセキュリティのアイデアは、主にMark MillerとMarc Stieglerの研究、そして[erights.org](http://www.erights.org/)のウェブサイトから得たものです。
ただし、私のバージョンはより粗雑で単純化されています。

より深く理解するために、以下のリンクを参考にしてください。

* [ケイパビリティベースのセキュリティ](https://en.wikipedia.org/wiki/Capability-based_security)と[オブジェクトケイパビリティモデル](https://en.wikipedia.org/wiki/Object-capability_model)に関するWikipediaの記事は、良い出発点となります。
* EROSプロジェクトのJonathan Shapiroによる[「ケイパビリティとは何か？」](https://webcache.googleusercontent.com/search?q=cache:www.eros-os.org/essays/capintro.html)。彼はまた、ACLベースのセキュリティとケイパビリティベースのモデルについても論じています。
* Marc Stieglerによるケイパビリティベースのセキュリティに関する素晴らしいビデオ、[「怠惰なプログラマーのための安全なコンピューティングガイド」](https://www.youtube.com/watch?v=eL5o4PFuxTY)。最後の5分間（1時間2分10秒頃～）をお見逃しなく！
* David Wagnerによる優れた講演、[「セキュリティのためのオブジェクトケイパビリティ」](https://en.wikipedia.org/wiki/caja)。

セキュリティと安全のために言語を強化することに関しては、多くの研究が行われてきました。
たとえば、[E言語](http://www.erights.org/elang/index.html)と[E言語に関するMark Millerの論文](http://www.erights.org/talks/thesis/markm-thesis.pdf)(PDF)、
Java上に構築された[Joe-E言語](https://en.wikipedia.org/wiki/Joe-E)、
JavaScript上に構築されたGoogleの[Caja](https://en.wikipedia.org/wiki/caja)、
OCamlから派生したケイパビリティベースの言語である[Emily](https://shiftleft.com/mirrors/www.hpl.hp.com/techreports/2006/HPL-2006-116.html)、
そして[Safe Haskell](https://simonmar.github.io/bib/papers/safe-haskell.pdf)(PDF)などです。

私のアプローチは、厳密な安全性というよりは、意図しない違反を避けるための事前設計に関するものであり、上記の参考文献は設計に特化して焦点を当てているわけではありません。
私が最も役立つと思ったのは、[Eにおけるケイパビリティパターンのセクション](http://www.skyhunter.com/marcs/ewalnut.html#SEC45)です。

また、このような話題に興味がある方は、LtUにアクセスしてみてください。
[こちら](http://lambda-the-ultimate.org/node/1635)や[こちら](http://lambda-the-ultimate.org/node/3930)、そして[こちらの論文](http://lambda-the-ultimate.org/node/2253)など、多くの議論があります。

## 次回予告

[次の投稿](../posts/capability-based-security-2.md)では、現在のユーザーのIDやロールなどのクレームに基づいてケイパビリティを制限する方法について見ていきます。

*注記：この投稿のすべてのコードは、[gist](https://gist.github.com/swlaschin/909c5b24bf921e5baa8c#file-capabilitybasedsecurity_configexample-fsx)として入手できます。*

