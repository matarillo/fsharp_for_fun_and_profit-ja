---
layout: post
title: "循環依存を取り除くリファクタリング"
description: "循環依存：パート2"
categories: ["設計"]
seriesId: "循環依存"
seriesOrder: 2

---

前回の記事では、循環依存の概念とその問題点について説明しました。

今回は、コードから循環依存を取り除くためのテクニックを紹介します。最初は面倒に感じるかもしれませんが、長期的に見れば「バグではなく機能だ！」と評価するようになるでしょう。

## 一般的な循環依存の分類

よく遭遇する依存関係のパターンを分類してみましょう。3つの一般的な状況を取り上げ、それぞれの対処法を示します。

まず、「メソッド依存」と呼ぶものがあります。

* 型Aはプロパティに型Bの値を保存する
* 型Bはメソッドのシグネチャで型Aを参照するが、型Aの値は保存しない

次に、「構造的依存」と呼ぶものがあります。

* 型Aはプロパティに型Bの値を保存する
* 型Bはプロパティに型Aの値を保存する

最後に、「継承依存」と呼ぶものがあります。

* 型Aはプロパティに型Bの値を保存する
* 型Bは型Aを継承する

もちろん他のバリエーションもありますが、これらの対処法を知っていれば、他のケースにも応用できるでしょう。

## F#での依存関係への対処に関する3つのヒント

依存関係の解消に取り組む前に、一般的に適用できる3つの有用なヒントを紹介します。

**ヒント1：F#らしく扱う**

F#はC#ではありません。F#固有の表現方法を使う心構えがあれば、[コード構成](../posts/recipe-part3.html)の工夫により、循環依存を避けるのは通常とても簡単です。

**ヒント2：型と振る舞いを分離する**

F#の型はほとんどが不変なので、「露出」していて「[貧血](https://bliki-ja.github.io/AnemicDomainModel)」であっても問題ありません。そのため、関数型設計では型自体と、それらに作用する関数を分離するのが一般的です。この手法は後述するように、依存関係の整理に役立ちます。

**ヒント3：パラメータ化、パラメータ化、パラメータ化**

依存関係は特定の型が参照されたときにのみ発生します。ジェネリック型を使えば、依存関係は生じません！

また、型に固有の振る舞いをハードコードする代わりに、関数を渡すことでパラメータ化できないでしょうか？`List`モジュールはこのアプローチの良い例で、以下でも例を示します。

## 「メソッド依存」への対処

最も単純な種類の依存関係から始めましょう。これを「メソッド依存」と呼びます。

以下に例を示します。

```fsharp
module MethodDependencyExample = 

    type Customer(name, observer:CustomerObserver) = 
        let mutable name = name
        member this.Name 
            with get() = name
            and set(value) = 
                name <- value
                observer.OnNameChanged(this)

    and CustomerObserver() = 
        member this.OnNameChanged(c:Customer) =     
            printfn "Customer name changed to '%s' " c.Name

    // テスト
    let observer = new CustomerObserver()
    let customer = Customer("Alice",observer)
    customer.Name <- "Bob"
```

`Customer`クラスは`CustomerObserver`型のプロパティ/フィールドを持ち、`CustomerObserver`クラスはパラメータとして`Customer`を取るメソッドを持っています。これにより相互依存が生じています。

### "and"キーワードの使用

コンパイルを可能にする直接的な方法の1つは、上記のように`and`キーワードを使うことです。

`and`キーワードはまさにこのような状況のために設計されており、互いに参照し合う2つ以上の型を定義できます。

使用するには、2番目の`type`キーワードを`and`に置き換えます。以下のように`and type`を使うのは間違いです。単に`and`だけで十分です。

```fsharp
type Something 
and type SomethingElse  // 間違い

type Something 
and SomethingElse       // 正しい
```

しかし、`and`には多くの問題があり、最後の手段としてのみ使用することが一般的に推奨されます。

まず、同じモジュール内で宣言された型にしか使えません。モジュールをまたいで使うことはできません。

次に、本当に小さな型にのみ使うべきです。`type`と`and`の間に500行のコードがあるなら、何か非常に間違ったことをしています。

```fsharp
type Something
   // 500行のコード
and SomethingElse
   // さらに500行のコード
```

上記のコードスニペットは、やってはいけない例です。

つまり、`and`を万能薬として扱わないでください。過度に使用することは、コードを適切にリファクタリングしていない兆候です。

### パラメータ化の導入

では、先ほど言及した3つ目のヒントであるパラメータ化を使って、`and`を使わずに何ができるか見てみましょう。

サンプルコードを考えてみると、本当に特別な`CustomerObserver`クラスが必要でしょうか？なぜ`Customer`だけに限定しているのでしょう？もっとジェネリックなオブザーバークラスを作れないでしょうか？

そこで、同じ`OnNameChanged`メソッドを持つ`INameObserver<'T>`インターフェイスを作成しませんか？ただし、メソッド（とインターフェイス）はどんなクラスでも受け入れるようにパラメータ化します。

以下がその例です：

```fsharp
module MethodDependency_ParameterizedInterface = 

    type INameObserver<'T> = 
        abstract OnNameChanged : 'T -> unit

    type Customer(name, observer:INameObserver<Customer>) = 
        let mutable name = name
        member this.Name 
            with get() = name
            and set(value) = 
                name <- value
                observer.OnNameChanged(this)

    type CustomerObserver() = 
        interface INameObserver<Customer> with 
            member this.OnNameChanged c =     
                printfn "Customer name changed to '%s' " c.Name

    // テスト
    let observer = new CustomerObserver()
    let customer = Customer("Alice", observer)
    customer.Name <- "Bob"
```

この改訂版では、依存関係が解消されました！`and`はまったく必要ありません。実際、これらの型を別のプロジェクトやアセンブリに置くこともできるようになりました！

コードは最初のバージョンとほとんど同じですが、`Customer`コンストラクタがインターフェイスを受け取り、`CustomerObserver`が同じインターフェイスを実装するようになっています。実際、インターフェイスの導入により、コードは以前よりも良くなったと言えるでしょう。

しかし、ここで止まる必要はありません。インターフェイスができたので、本当にそれを実装するためだけのクラス全体を作る必要があるでしょうか？F#には[オブジェクト式](https://learn.microsoft.com/ja-jp/dotnet/fsharp/language-reference/object-expressions)という素晴らしい機能があり、インターフェイスを直接インスタンス化できます。

以下は同じコードですが、今回は`CustomerObserver`クラスが完全に削除され、`INameObserver`が直接作成されています。

```fsharp
module MethodDependency_ParameterizedInterface = 

    // 上記と同じコード
    
    // テスト
    let observer2 = {
        new INameObserver<Customer> with 
            member this.OnNameChanged c =     
                printfn "Customer name changed to '%s' " c.Name
        }
    let customer2 = Customer("Alice", observer2)
    customer2.Name <- "Bob"
```

このテクニックは、以下のように2つのメソッドがある、より複雑なインターフェイスでも明らかに機能します：

```fsharp
module MethodDependency_ParameterizedInterface2 = 

    type ICustomerObserver<'T> = 
        abstract OnNameChanged : 'T -> unit
        abstract OnEmailChanged : 'T -> unit

    type Customer(name, email, observer:ICustomerObserver<Customer>) = 
        
        let mutable name = name
        let mutable email = email

        member this.Name 
            with get() = name
            and set(value) = 
                name <- value
                observer.OnNameChanged(this)

        member this.Email
            with get() = email
            and set(value) = 
                email <- value
                observer.OnEmailChanged(this)

    // テスト
    let observer2 = {
        new ICustomerObserver<Customer> with 
            member this.OnNameChanged c =     
                printfn "Customer name changed to '%s' " c.Name
            member this.OnEmailChanged c =     
                printfn "Customer email changed to '%s' " c.Email
        }
    let customer2 = Customer("Alice", "x@example.com",observer2)
    customer2.Name <- "Bob"
    customer2.Email <- "y@example.com"
```

### パラメータ化の代わりに関数を使う

多くの場合、インターフェイスクラスも完全に排除できます。名前が変更されたときに呼び出される単純な関数を渡すだけでよいのではないでしょうか？以下のようにします：

```fsharp
module MethodDependency_ParameterizedClasses_HOF  = 

    type Customer(name, observer) = 
        
        let mutable name = name

        member this.Name 
            with get() = name
            and set(value) = 
                name <- value
                observer this

    // テスト
    let observer(c:Customer) = 
        printfn "Customer name changed to '%s' " c.Name
    let customer = Customer("Alice", observer)
    customer.Name <- "Bob"
```

この方法は、以前のバージョンよりも「儀式的」でないと同意いただけるでしょう。オブザーバーは必要に応じて非常に簡単にインラインで定義されています：

```fsharp
let observer(c:Customer) = 
    printfn "Customer name changed to '%s' " c.Name
```

確かに、置き換えられるインターフェイスが単純な場合にのみ機能しますが、それでも思っているよりも頻繁に使用できるアプローチです。


## より関数型のアプローチ：型と関数の分離

先ほど述べたように、より「関数型の設計」では、型自体をそれらに作用する関数から分離します。この場合、どのように行うか見てみましょう。

以下は最初の試みです：

```fsharp
module MethodDependencyExample_SeparateTypes = 

    module DomainTypes = 
        type Customer = { name:string; observer:NameChangedObserver }
        and  NameChangedObserver = Customer -> unit


    module Customer = 
        open DomainTypes

        let changeName customer newName = 
            let newCustomer = {customer with name=newName}
            customer.observer newCustomer
            newCustomer     // 新しいcustomerを返す

    module Observer = 
        open DomainTypes

        let printNameChanged customer = 
            printfn "Customer name changed to '%s' " customer.name

    // テスト
    module Test = 
        open DomainTypes

        let observer = Observer.printNameChanged 
        let customer = {name="Alice"; observer=observer}
        Customer.changeName customer "Bob"
```

上の例では、3つのモジュールがあります：型用のモジュール、および関数用のモジュールが2つです。実際のアプリケーションでは、`Customer`モジュールにはこの1つだけでなく、もっと多くのCustomer関連の関数があるでしょう！

しかし、このコードでも`Customer`と`CustomerObserver`の間に相互依存が残っています。型定義がより簡潔になったので大きな問題ではありませんが、それでも`and`を排除できるでしょうか？

はい、もちろんです。前のアプローチと同じトリックを使って、オブザーバー型を排除し、`Customer`データ構造に関数を直接埋め込むことができます：

```fsharp
module MethodDependency_SeparateTypes2 = 

    module DomainTypes = 
        type Customer = { name:string; observer:Customer -> unit}

    module Customer = 
        open DomainTypes

        let changeName customer newName = 
            let newCustomer = {customer with name=newName}
            customer.observer newCustomer
            newCustomer     // 新しいcustomerを返す

    module Observer = 
        open DomainTypes

        let printNameChanged customer = 
            printfn "Customer name changed to '%s' " customer.name

    module Test = 
        open DomainTypes

        let observer = Observer.printNameChanged 
        let customer = {name="Alice"; observer=observer}
        Customer.changeName customer "Bob"
```

### 型をよりシンプルに

`Customer`型にはまだ一部の振る舞いが埋め込まれています。多くの場合、これは不要です。より関数型のアプローチでは、必要なときにのみ関数を渡します。

そこで、`observer`を顧客型から取り除き、`changeName`関数に追加のパラメータとして渡してみましょう：

```fsharp
let changeName observer customer newName = 
    let newCustomer = {customer with name=newName}
    observer newCustomer    // 新しい顧客でオブザーバーを呼び出す
    newCustomer             // 新しい顧客を返す
```

以下が完全なコードです：

```fsharp
module MethodDependency_SeparateTypes3 = 

    module DomainTypes = 
        type Customer = {name:string}

    module Customer = 
        open DomainTypes

        let changeName observer customer newName = 
            let newCustomer = {customer with name=newName}
            observer newCustomer    // 新しい顧客でオブザーバーを呼び出す
            newCustomer             // 新しい顧客を返す

    module Observer = 
        open DomainTypes

        let printNameChanged customer = 
            printfn "Customer name changed to '%s' " customer.name

    module Test = 
        open DomainTypes

        let observer = Observer.printNameChanged 
        let customer = {name="Alice"}
        Customer.changeName observer customer "Bob"
```

これで事態をより複雑にしてしまったと思われるかもしれません。コードのあちこちで`changeName`を呼び出すたびに`observer`関数を指定しなければならなくなりました。確かに、以前のオブジェクト指向バージョンの方が良かったのではないでしょうか？少なくともそこでは、オブザーバーが顧客オブジェクトの一部だったので、毎回渡す必要がありませんでした。

しかし、[部分適用](../posts/partial-application.html)の魔法を忘れていますね！オブザーバーを「焼き付けた」関数を設定し、それを使用できます。そうすれば、使用するたびにオブザーバーを渡す必要はありません。賢いですね！

```fsharp
module MethodDependency_SeparateTypes3 = 

    // 上記と同じコード
    
    module TestWithPartialApplication = 
        open DomainTypes

        let observer = Observer.printNameChanged 

        // この部分適用を一度だけ設定します（たとえば、モジュールの先頭で）
        let changeName = Customer.changeName observer 

        // そして、オブザーバーを必要とせずにchangeNameを呼び出します
        let customer = {name="Alice"}
        changeName customer "Bob"
```

### でも、まだあります！

`changeName`関数をもう一度見てみましょう：

```fsharp
let changeName observer customer newName = 
    let newCustomer = {customer with name=newName}
    observer newCustomer    // 新しい顧客でオブザーバーを呼び出す
    newCustomer             // 新しい顧客を返す
```

これには以下のステップがあります：

1. 何かを行って結果の値を作成する
2. オブザーバーを結果の値で呼び出す
3. 結果の値を返す

これは完全にジェネリックなロジックで、顧客とは何の関係もありません。そこで、これを完全にジェネリックなライブラリ関数として書き直すことができます。この新しい関数は、*どんな*オブザーバー関数でも*どんな*他の関数の結果に「フック」できるようにするので、とりあえず`hook`と呼びましょう。

```fsharp
let hook2 observer f param1 param2 = 
    let y = f param1 param2 // 何かを行って結果の値を作成する
    observer y              // オブザーバーを結果の値で呼び出す
    y                       // 結果の値を返す
```

実際、「フック」される関数`f`が2つのパラメータを持つため、これを`hook2`と呼びました。1つのパラメータを持つ関数用の別のバージョンを作ることもできます：

```fsharp
let hook observer f param1 = 
    let y = f param1 // 何かを行って結果の値を作成する
    observer y       // オブザーバーを結果の値で呼び出す
    y                // 結果の値を返す
```

[鉄道指向プログラミングの記事](../posts/recipe-part2.html)を読んだことがある方は、これが「デッドエンド」関数と呼んだものと非常に似ていることに気づくかもしれません。ここではより詳しく説明しませんが、これは実際によくあるパターンです。

さて、コードに戻りましょう - このジェネリックな`hook`関数をどのように使用するのでしょうか？

* `Customer.changeName`はフックされる関数で、2つのパラメータを持つので`hook2`を使用します。
* オブザーバー関数は以前と同じです

そこで、また部分適用された`changeName`関数を作成しますが、今回はオブザーバーとフックされる関数を`hook2`に渡して作成します：

```fsharp
let observer = Observer.printNameChanged 
let changeName = hook2 observer Customer.changeName 
```

注目すべきは、結果として得られる`changeName`が元の`Customer.changeName`関数と*まったく同じシグネチャ*を持つことです。そのため、どこでも互換的に使用できます。

```fsharp
let customer = {name="Alice"}
changeName customer "Bob"
```

以下が完全なコードです：

```fsharp
module MethodDependency_SeparateTypes_WithHookFunction = 

    [<AutoOpen>]
    module MyFunctionLibrary = 

        let hook observer f param1 = 
            let y = f param1 // 何かを行って結果の値を作成する
            observer y       // オブザーバーを結果の値で呼び出す
            y                // 結果の値を返す

        let hook2 observer f param1 param2 = 
            let y = f param1 param2 // 何かを行って結果の値を作成する
            observer y              // オブザーバーを結果の値で呼び出す
            y                       // 結果の値を返す

    module DomainTypes = 
        type Customer = { name:string}

    module Customer = 
        open DomainTypes

        let changeName customer newName = 
            {customer with name=newName}

    module Observer = 
        open DomainTypes

        let printNameChanged customer = 
            printfn "Customer name changed to '%s' " customer.name

    module TestWithPartialApplication = 
        open DomainTypes

        // この部分適用を一度だけ設定します（たとえば、モジュールの先頭で）
        let observer = Observer.printNameChanged 
        let changeName = hook2 observer Customer.changeName 

        // そして、オブザーバーを必要とせずにchangeNameを呼び出します
        let customer = {name="Alice"}
        changeName customer "Bob"
```

このような`hook`関数を作成すると、最初は余分な複雑さを追加するように見えるかもしれませんが、メインアプリケーションからさらにコードを削除し、このような関数のライブラリを構築すれば、あらゆる場所で使用することができます。

ちなみに、オブジェクト指向設計の用語を使うのに役立つなら、このアプローチを「デコレータ」または「プロキシ」パターンと考えることができます。


## 「構造的依存」への対処

2つ目の分類は「構造的依存」と呼ぶもので、各型が他の型の値を保存します。

* 型Aはプロパティに型Bの値を保存する
* 型Bはプロパティに型Aの値を保存する

この一連の例では、`Location`で働く`Employee`を考えてみましょう。`Employee`は働く`Location`を含み、`Location`はそこで働く`Employee`のリストを保存します。

これで相互依存が生まれました！

以下がコードでの例です：

```fsharp
module StructuralDependencyExample = 

    type Employee(name, location:Location) = 
        member this.Name = name
        member this.Location = location

    and Location(name, employees: Employee list) = 
        member this.Name = name
        member this.Employees  = employees 
```

リファクタリングに進む前に、この設計がどれほど扱いにくいかを考えてみましょう。`Location`値なしで`Employee`値を、また逆に`Employee`値なしで`Location`値を初期化するのは、どのようにすればよいでしょうか。

ここに1つの試みがあります。空の従業員リストを持つロケーションを作成し、そのロケーションを使用して他の従業員を作成します：

```fsharp
module StructuralDependencyExample = 

    // 上記と同じコード
    
    module Test = 
        let location = new Location("CA",[])       
        let alice = new Employee("Alice",location)       
        let bob = new Employee("Bob",location)      

        location.Employees  // 空！
        |> List.iter (fun employee -> 
            printfn "employee %s works at %s" employee.Name employee.Location.Name) 
```

しかし、このコードは望むように機能しません。`alice`と`bob`の値を前方参照できないため、`location`の従業員リストを空に設定する必要があります。

F#では、再帰的な「let」に対しても`and`キーワードを使用できる場合があります。「type」と同様に、「and」キーワードは「let」キーワードに置き換わります。「type」とは異なり、最初の「let」は`let rec`で再帰的とマークする必要があります。

試してみましょう。`location`に`alice`と`bob`のリストを与えますが、これらはまだ宣言されていません。

```fsharp
module UncompilableTest = 
    let rec location = new Location("NY",[alice;bob])       
    and alice = new Employee("Alice",location  )       
    and bob = new Employee("Bob",location )      
```

しかし、コンパイラは作成した無限再帰に対して不満を示します。場合によっては`and`が`let`定義で機能することもありますが、これはそのケースではありません！
そして、やはり「let」定義に`and`を使用しなければならないということは、リファクタリングが必要かもしれないという兆候です。

したがって、本当に賢明な解決策は可変構造を使用し、個々の従業員が作成された*後に*ロケーションオブジェクトを修正することです：

```fsharp
module StructuralDependencyExample_Mutable = 

    type Employee(name, location:Location) = 
        member this.Name = name
        member this.Location = location

    and Location(name, employees: Employee list) = 
        let mutable employees = employees

        member this.Name = name
        member this.Employees  = employees 
        member this.SetEmployees es = 
            employees <- es

    module TestWithMutableData = 
        let location = new Location("CA",[])       
        let alice = new Employee("Alice",location)       
        let bob = new Employee("Bob",location)      
        // 作成後に修正
        location.SetEmployees [alice;bob]  

        location.Employees  
        |> List.iter (fun employee -> 
            printfn "employee %s works at %s" employee.Name employee.Location.Name) 
```

値を作成するだけでこんなに手間がかかるのです。これは相互依存が悪いアイデアであるもう1つの理由です！

### 再びパラメータ化

依存関係を断ち切るために、再びパラメータ化のトリックを使用できます。`Employee`のパラメータ化バージョンを作成するだけです。

```fsharp
module StructuralDependencyExample_ParameterizedClasses = 

    type ParameterizedEmployee<'Location>(name, location:'Location) = 
        member this.Name = name
        member this.Location = location

    type Location(name, employees: ParameterizedEmployee<Location> list) = 
        let mutable employees = employees
        member this.Name = name
        member this.Employees  = employees 
        member this.SetEmployees es = 
            employees <- es

    type Employee = ParameterizedEmployee<Location> 

    module Test = 
        let location = new Location("CA",[])       
        let alice = new Employee("Alice",location)       
        let bob = new Employee("Bob",location)      
        location.SetEmployees [alice;bob]

        location.Employees  // 空ではない！
        |> List.iter (fun employee -> 
            printfn "employee %s works at %s" employee.Name employee.Location.Name) 
```

次のように`Employee`の型エイリアスを作成していることに注目してください：

```fsharp
type Employee = ParameterizedEmployee<Location> 
```

このようなエイリアスを作成する利点の1つは、従業員を作成する元のコードが変更されずに引き続き機能することです。

```fsharp
let alice = new Employee("Alice",location)       
```

### 振る舞いの依存をパラメータ化する

上記のコードは、パラメータ化される特定のクラスが重要ではないことを前提としています。しかし、型の特定のプロパティに依存関係がある場合はどうでしょうか？

たとえば、`Employee`クラスが`Name`プロパティを期待し、`Location`クラスが`Age`プロパティを期待する場合を考えてみましょう：

```fsharp
module StructuralDependency_WithAge = 

    type Employee(name, age:float, location:Location) = 
        member this.Name = name
        member this.Age = age
        member this.Location = location
        
        // Nameプロパティを期待
        member this.LocationName = location.Name  

    and Location(name, employees: Employee list) = 
        let mutable employees = employees
        member this.Name = name
        member this.Employees  = employees 
        member this.SetEmployees es = 
            employees <- es
        
        // Ageプロパティを期待            
        member this.AverageAge = 
            employees |> List.averageBy (fun e -> e.Age)

    module Test = 
        let location = new Location("CA",[])       
        let alice = new Employee("Alice",20.0,location)       
        let bob = new Employee("Bob",30.0,location)      
        location.SetEmployees [alice;bob]
        printfn "Average age is %g" location.AverageAge 
```

これをどのようにパラメータ化できるでしょうか？

まず、前と同じアプローチを試してみましょう：

```fsharp
module StructuralDependencyWithAge_ParameterizedError = 

    type ParameterizedEmployee<'Location>(name, age:float, location:'Location) = 
        member this.Name = name
        member this.Age = age
        member this.Location = location
        member this.LocationName = location.Name  // エラー

    type Location(name, employees: ParameterizedEmployee<Location> list) = 
        let mutable employees = employees
        member this.Name = name
        member this.Employees  = employees 
        member this.SetEmployees es = 
            employees <- es
        member this.AverageAge = 
            employees |> List.averageBy (fun e -> e.Age)
```

`Location`は`ParameterizedEmployee.Age`に満足していますが、`location.Name`はコンパイルに失敗します。明らかに、型パラメータが一般的すぎるためです。

1つの方法は、`ILocation`や`IEmployee`のようなインターフェースを作成することです。多くの場合、これが最も賢明なアプローチかもしれません。

しかし、もう1つの方法は、Locationパラメータをジェネリックにしておき、それを処理する*追加の関数*を渡すことです。この場合、`getLocationName`関数を使用します。

```fsharp
module StructuralDependencyWithAge_ParameterizedCorrect = 

    type ParameterizedEmployee<'Location>(name, age:float, location:'Location, getLocationName) = 
        member this.Name = name
        member this.Age = age
        member this.Location = location
        member this.LocationName = getLocationName location  // OK

    type Location(name, employees: ParameterizedEmployee<Location> list) = 
        let mutable employees = employees
        member this.Name = name
        member this.Employees  = employees 
        member this.SetEmployees es = 
            employees <- es
        member this.AverageAge = 
            employees |> List.averageBy (fun e -> e.Age)


```

これについて考える1つの方法は、振る舞いを型の一部としてではなく、外部から提供していると考えることです。

これを使用するには、型パラメータと一緒に関数を渡す必要があります。これを毎回行うのは面倒なので、当然ながら関数でラップします：

```fsharp
module StructuralDependencyWithAge_ParameterizedCorrect = 

    // 上記と同じコード

    // Employeeを構築するためのヘルパー関数を作成
    let Employee(name, age, location) = 
        let getLocationName (l:Location) = l.Name
        new ParameterizedEmployee<Location>(name, age, location, getLocationName)
```

これを使用すると、元のテストコードはほとんど変更なしで引き続き機能します（`new Employee`を単に`Employee`に変更するだけです）。

```fsharp
module StructuralDependencyWithAge_ParameterizedCorrect = 

    // 上記と同じコード

    module Test = 
        let location = new Location("CA",[])       
        let alice = Employee("Alice",20.0,location)       
        let bob = Employee("Bob",30.0,location)      
        location.SetEmployees [alice;bob]

        location.Employees  // 空ではない！
        |> List.iter (fun employee -> 
            printfn "employee %s works at %s" employee.Name employee.LocationName) 
```

## 関数型アプローチ：再び型と関数を分離

では、この問題に関数型設計アプローチを適用してみましょう。前回と同様に行います。

再び、型自体をそれらに作用する関数から分離します。

```fsharp
module StructuralDependencyExample_SeparateTypes = 

    module DomainTypes = 
        type Employee = {name:string; age:float; location:Location}
        and Location = {name:string; mutable employees: Employee list}

    module Employee = 
        open DomainTypes 

        let Name (employee:Employee) = employee.name
        let Age (employee:Employee) = employee.age
        let Location (employee:Employee) = employee.location
        let LocationName (employee:Employee) = employee.location.name

    module Location = 
        open DomainTypes 

        let Name (location:Location) = location.name
        let Employees (location:Location) = location.employees
        let AverageAge (location:Location) =
            location.employees |> List.averageBy (fun e -> e.age)
    
    module Test = 
        open DomainTypes 

        let location = { name="NY"; employees= [] }
        let alice = {name="Alice"; age=20.0; location=location  }
        let bob = {name="Bob"; age=30.0; location=location }
        location.employees <- [alice;bob]
         
        Location.Employees location
        |> List.iter (fun e -> 
            printfn "employee %s works at %s" (Employee.Name e) (Employee.LocationName e) ) 
```

さらに進む前に、不要なコードを削除しましょう。レコード型を使用する利点の1つは、「ゲッター」を定義する必要がないことです。
そのため、モジュールに必要な関数は`AverageAge`のようにデータを操作する関数だけです。

```fsharp
module StructuralDependencyExample_SeparateTypes2 = 

    module DomainTypes = 
        type Employee = {name:string; age:float; location:Location}
        and Location = {name:string; mutable employees: Employee list}

    module Employee = 
        open DomainTypes 

        let LocationName employee = employee.location.name

    module Location = 
        open DomainTypes 

        let AverageAge location =
            location.employees |> List.averageBy (fun e -> e.age)
```

### 再びパラメータ化

再び、型のパラメータ化バージョンを作成することで依存関係を取り除くことができます。

一歩下がって「location」の概念について考えてみましょう。なぜロケーションは従業員だけを含む必要があるのでしょうか？
もう少し一般的にすれば、ロケーションを「場所」と「その場所にある物のリスト」と考えることができます。

たとえば、物が製品であれば、製品がある場所は倉庫かもしれません。物が本であれば、本がある場所は図書館かもしれません。

以下は、これらの概念をコードで表現したものです：

```fsharp
module LocationOfThings =

    type Location<'Thing> = {name:string; mutable things: 'Thing list}

    type Employee = {name:string; age:float; location:Location<Employee> }
    type WorkLocation = Location<Employee>

    type Product = {SKU:string; price:float }
    type Warehouse = Location<Product>

    type Book = {title:string; author:string}
    type Library = Location<Book>
```

もちろん、これらのロケーションは完全に同じではありませんが、含まれる物に関する振る舞いの要件がない場合、
特にジェネリックな設計に抽出できる共通点があるかもしれません。

そこで、「物のロケーション」に関する設計をもとに、依存がパラメータ化された型を使って書き直してみましょう。

```fsharp
module StructuralDependencyExample_SeparateTypes_Parameterized = 

    module DomainTypes = 
        type Location<'Thing> = {name:string; mutable things: 'Thing list}
        type Employee = {name:string; age:float; location:Location<Employee> }

    module Employee = 
        open DomainTypes 

        let LocationName employee = employee.location.name

    module Test = 
        open DomainTypes 

        let location = { name="NY"; things = [] }
        let alice = {name="Alice"; age=20.0; location=location  }
        let bob = {name="Bob"; age=30.0; location=location }
        location.things <- [alice;bob]

        let employees = location.things
        employees 
        |> List.iter (fun e -> 
            printfn "employee %s works at %s" (e.name) (Employee.LocationName e) ) 

        let averageAge = 
            employees 
            |> List.averageBy (fun e -> e.age) 
```

この改訂された設計では、`AverageAge`関数が`Location`モジュールから完全に削除されていることがわかります。実際、必要ではなかったのです。
この種の計算は、特別な関数のオーバーヘッドなしで「インライン」で十分にできるからです。

そして、よく考えてみると、そのような関数を事前に定義する必要が本当にあったとしても、それを`Location`モジュールではなく`Employee`モジュールに置く方が適切だったでしょう。
結局のところ、この機能はロケーションの働き方よりも従業員の働き方に関連しているからです。

以下がその例です：

```fsharp
module Employee = 

    let AverageAgeAtLocation location = 
        location.things |> List.averageBy (fun e -> e.age) 
```

これはクラスよりもモジュールの利点の1つです。基礎となるユースケースに関連している限り、異なる型の関数を組み合わせることができます。

### 関係を別の型に移動する

これまでの例では、ロケーションの「物のリスト」フィールドは可変である必要がありました。不変の型で作業しながら関係性をサポートするには、どうすればよいでしょうか？

一つの方法は、これまで見てきたような相互依存を持たないことです。その設計では、同期（または同期の欠如）が大きな問題となります。

たとえば、Aliceのロケーションを変更しても、参照しているロケーションに知らせなければ、不整合が生じる可能性があります。しかし、ロケーションの内容も変更しようとすると、Bobの値も更新する必要があるため、無限に続く作業になってしまいます。基本的に、悪夢のようなシナリオです。

不変データでこれを正しく行う方法は、データベース設計から学び、関係を別の「テーブル」、つまり我々の場合は型に抽出することです。
現在の関係は単一のマスターリストに保持され、変更が行われても同期は必要ありません。

以下は、単純な`Relationship`のリストを使用した非常に基本的な例です。

```fsharp
module StructuralDependencyExample_Normalized = 

    module DomainTypes = 
        type Relationship<'Left,'Right> = 'Left * 'Right

        type Location= {name:string}
        type Employee = {name:string; age:float }

    module Employee = 
        open DomainTypes 

        let EmployeesAtLocation location relations = 
            relations
            |> List.filter (fun (loc,empl) -> loc = location) 
            |> List.map (fun (loc,empl) -> empl) 

        let AverageAgeAtLocation location relations = 
            EmployeesAtLocation location relations 
            |> List.averageBy (fun e -> e.age) 

    module Test = 
        open DomainTypes 

        let location = { Location.name="NY"}
        let alice = {name="Alice"; age=20.0; }
        let bob = {name="Bob"; age=30.0; }
        let relations = [ 
            (location,alice)
            (location,bob) 
            ]

        relations 
        |> List.iter (fun (loc,empl) -> 
            printfn "employee %s works at %s" (empl.name) (loc.name) ) 
```

もちろん、より効率的な設計では辞書/マップを使用したり、この種の操作用に設計された特別なインメモリ構造を使用したりするでしょう。

## 継承依存

最後に、「継承依存」を見てみましょう。

* 型Aはプロパティに型Bの値を保存する
* 型Bは型Aを継承する

UIコントロールの階層を考えてみましょう。すべてのコントロールはトップレベルの「Form」に属し、Formそのものもコントロールです。

以下は最初の実装の試みです：

```fsharp
module InheritanceDependencyExample = 

    type Control(name, form:Form) = 
        member this.Name = name

        abstract Form : Form
        default this.Form = form

    and Form(name) as self = 
        inherit Control(name, self)

    // テスト
    let form = new Form("form")       // NullReferenceException!
    let button = new Control("button",form)
```

ここで注目すべきは、Formが自身をControl コンストラクタの`form`値として渡していることです。

このコードはコンパイルに成功しますが、実行時に`NullReferenceException`エラーを引き起こします。この種のテクニックはC#では機能しますが、F#では機能しません。クラスの初期化ロジックが異なるためです。

いずれにしても、これは酷い設計です。フォームがコンストラクタに自身を渡す必要はありません。

より良い設計は、コンストラクタのエラーも修正する方法として、`Control`を抽象クラスにし、
コンストラクタでフォームを受け取る非フォームの子クラスと、フォームを受け取らない`Form`クラス自体を区別することです。

以下にサンプルコードを示します：

```fsharp
module InheritanceDependencyExample2 = 

    [<AbstractClass>]
    type Control(name) = 
        member this.Name = name

        abstract Form : Form

    and Form(name) = 
        inherit Control(name)

        override this.Form = this

    and Button(name,form) = 
        inherit Control(name)

        override this.Form = form

    // テスト
    let form = new Form("form")       
    let button = new Button("button",form)
```

### またもやパラメータ化の出番です

循環依存を取り除くために、いつもの方法でクラスをパラメータ化できます。以下に示します。

```fsharp
module InheritanceDependencyExample_ParameterizedClasses = 

    [<AbstractClass>]
    type Control<'Form>(name) = 
        member this.Name = name

        abstract Form : 'Form

    type Form(name) = 
        inherit Control<Form>(name)

        override this.Form = this

    type Button(name,form) = 
        inherit Control<Form>(name)

        override this.Form = form


    // テスト
    let form = new Form("form")       
    let button = new Button("button",form)
```

### 関数型バージョン

関数型設計については、自分で行う演習として残しておきます。

本当の関数型設計を目指すなら、おそらく継承を全く使用しないでしょう。代わりに、パラメータ化と組み合わせて関数合成を使用するでしょう。

しかし、これは大きなトピックなので、別の機会に取り上げることにします。

## まとめ

この記事が循環依存を取り除くための有用なヒントを提供できたことを願っています。これらの様々なアプローチを手に入れたことで、[モジュール構成](../posts/recipe-part3.html)の問題は簡単に解決できるはずです。

このシリーズの次の記事では、「野生の」循環依存を見ていきます。実際のC#とF#のプロジェクトを比較してみましょう。

これまで見てきたように、F#は非常に独自の考えを持つ言語です！クラスの代わりにモジュールを使用することを求め、循環依存を禁止します。これらは単なる煩わしさなのか、それともコードの構成方法に本当に違いをもたらすのでしょうか？
[続きを読んで確かめてください！](../posts/cycles-and-modularity-in-the-wild.html)



