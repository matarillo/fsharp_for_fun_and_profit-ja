---
layout: post
title: "UML図？必要ねぇ！"
description: "コードとUMLの比較"
categories: ["DDD"]
---

私が[関数型DDD](https://fsharpforfunandprofit.com/ddd/)について講演するとき、よくこのスライドを使います（*[スライドの前後関係も参照してください](https://www.slideshare.net/ScottWlaschin/ddd-with-fsharptypesystemlondonndc2013/45)*）。

![UML図？必要ねぇ！](@assets/img/no-uml-diagrams.jpg)

これはもちろん、[あの有名なシーン](https://www.youtube.com/watch?v=gx6TBrfCW54)をもじったものです。あ、[こっちのシーン](https://www.youtube.com/watch?v=VqomZQMZQCQ)の間違いでした。

少し大げさだったかもしれません。UML図の中にも役立つものはあります（私はシーケンス図が好きです）。それに、良い図は千の言葉に匹敵する力があると思います。

しかし、多くの場合、クラス図にUMLを使う必要はないと考えています。

F#（OCamlやHaskellでも良いのですが）のような簡潔な言語なら、UMLと同じ意味を、より分かりやすく表現できます。
読み書きしやすく、そして何より、*実際に動くコード*に落とし込みやすいのです。

UML図では、コードに変換する必要があり、その過程で情報が失われてしまう可能性があります。
しかし、設計自体がプログラミング言語で記述されていれば、変換という手順は必要なくなり、設計は常に実装と同期することになります。

これを実際に示すために、インターネットで良いUMLクラス図と、あまり良くないUMLクラス図を探し、F#のコードに変換してみました。両者を比較してみてください。

## 正規表現

まずは、典型的な例として正規表現を取り上げます（*[引用元](https://wiki-dev.cdot.senecacollege.ca/wiki/Interpreter)*）。

UML図はこちらです。

![](@assets/img/uml-regex.png)

F#のコードはこちらです。

```fsharp
type RegularExpression =
    | Literal of string
    | Sequence of RegularExpression list
    | Alternation of RegularExpression * RegularExpression
    | Repetition of RegularExpression 

// インタプリタは文字列と正規表現を受け取り、
// 何らかの値を返します。
type Interpret<'a> =  string -> RegularExpression -> 'a
```

とても簡単ですね。

## 学生の登録

もう1つの典型的な例として、登録を取り上げます（*[引用元](https://www.agilemodeling.com/artifacts/classDiagram.htm)*）。

UML図はこちらです。

![](@assets/img/uml-enrollment.png)

F#のコードはこちらです。

```fsharp
type Student = {
    Name: string
    Address: string
    PhoneNumber: string
    EmailAddress: string
    AverageMark: float
    }

type Professor= {
    Name: string
    Address: string
    PhoneNumber: string
    EmailAddress: string
    Salary: int
    }

type Seminar = {
    Name: string
    Number: string
    Fees: float
    TaughtBy: Professor option
    WaitingList: Student list
    }

type Enrollment = {
    Student : Student 
    Seminar : Seminar 
    Marks: float list
    }

type EnrollmentRepository = Enrollment list

// ==================================
// 処理 / ユースケース / シナリオ
// ==================================

type IsElegibleToEnroll = Student -> Seminar -> bool
type GetSeminarsTaken = Student -> EnrollmentRepository -> Seminar list
type AddStudentToWaitingList = Student -> Seminar -> Seminar 
```

F#はUML図と同じ内容を表現していますが、図を描くよりも、すべての処理を関数として書き出すことで、元の要件の穴が明らかになると感じています。

たとえば、UML図の`GetSeminarsTaken`メソッドでは、セミナーのリストはどこに保存されているのでしょうか？
もしそれが`Student`クラスにあるとしたら（図から暗示されるように）、`Student`と`Seminar`の間で相互参照が発生し、[特別な処理をしない限り](https://stackoverflow.com/questions/19371214/entity-framework-code-first-circular-dependencies)、
すべての学生とセミナーの情報がつながってしまい、全体を一度に読み込まないといけなくなります。

そこで、関数型バージョンでは、2つのクラスを分離するために`EnrollmentRepository`を作成しました。

同様に、登録がどのように動作するのか明確ではないので、必要な入力を明確にするために`EnrollStudent`関数を作成しました。

```fsharp
type EnrollStudent = Student -> Seminar -> Enrollment option
```

関数が`option`を返すので、登録が失敗する可能性がある（たとえば、学生が登録資格を持っていない、または誤って2回登録しようとしている）ことがすぐに分かります。


## 注文と顧客

また別の例を見てみましょう（*[引用元](https://www.tutorialspoint.com/uml/uml_class_diagram.htm)*）。

![](@assets/img/uml-order.png)

これをF#で書くと、以下のようになります。

```fsharp
type Customer = {name:string; location:string}

type NormalOrder = {date: DateTime; number: string; customer: Customer}
type SpecialOrder = {date: DateTime; number: string; customer: Customer}
type Order = 
    | Normal of NormalOrder
    | Special of SpecialOrder 

// これらの3つの操作は、どの注文にも共通です。
type Confirm =  Order -> Order 
type Close =  Order -> Order 
type Dispatch =  Order -> Order 

// この操作は、SpecialOrderにのみ適用できます
type Receive =  SpecialOrder -> SpecialOrder
```

UML図をそのままコードにしていますが、正直、この設計はあまり好きではありません。状態をもっと細かく分けた方が良いでしょう。

特に、`Confirm`関数と`Dispatch`関数は、何を入力として受け取り、何を出力するのか、全く分かりません。
実際のコードを書くことで、要件についてより深く考えることができるようになるのです。

## 注文と顧客 バージョン2

注文と顧客の、より良いバージョンを見てみましょう（*[引用元](https://web.archive.org/web/20190801150337/http://edn.embarcadero.com/article/31863)*）。

![](@assets/img/uml-order2.png)

これをF#で書くと、以下のようになります。

```fsharp
type Date = System.DateTime

// == 顧客関連 ==

type Customer = {
    name:string
    address:string
    }

// == 商品関連 ==

type [<Measure>] grams

type Item = {
    shippingWeight: int<grams>
    description: string
    }

type Qty = int
type Price = decimal


// == 支払い関連 ==

type PaymentMethod = 
    | Cash
    | Credit of number:string * cardType:string * expDate:Date
    | Check of name:string * bankID: string

type Payment = {
    amount: decimal
    paymentMethod : PaymentMethod 
    }

// == 注文関連 ==

type TaxStatus = Taxable | NonTaxable
type Tax = decimal

type OrderDetail = {
    item: Item
    qty: int
    taxStatus : TaxStatus
    }
    
type OrderStatus = Open | Completed

type Order = {
    date: DateTime; 
    customer: Customer
    status: OrderStatus
    lines: OrderDetail list
    payments: Payment list
    }

// ==================================
// 処理 / ユースケース / シナリオ
// ==================================
type GetPriceForQuantity = Item -> Qty -> Price

type CalcTax = Order -> Tax
type CalcTotal = Order -> Price
type CalcTotalWeight = Order -> int<grams>
```

ここでは、重さの単位を追加したり、`Qty`と`Price`を表す型を作成したりするなど、少しだけ変更を加えています。

この設計も、`AuthorizedPayment`型（注文の支払いは、承認された支払いのみ受け付けるようにするため）や
`PaidOrder`型（同じ注文に2回支払うことを防ぐため）など、
状態をより細かく分けることで、さらに改善できる可能性があります。

たとえば、以下のような感じです。

```fsharp
// 支払いの承認を試みます。失敗する可能性があることに注意してください。
type Authorize =  UnauthorizedPayment -> AuthorizedPayment option

// 未払いの注文に対し、承認された支払いを適用します。
type PayOrder = UnpaidOrder -> AuthorizedPayment -> PaidOrder
```


## ホテルの予約

JetBrains IntelliJのドキュメントにあった例を紹介します（*[引用元](https://web.archive.org/web/20150915005415/http://www.jetbrains.com/idea/help/viewing-diagram.html)*）。

![](@assets/img/uml-hotel.png)

F#で書くと、こうなります。

```fsharp
type Date = System.DateTime

type User = {
    username: string
    password: string
    name: string
    }

type Hotel = {
    id: int
    name: string
    address: string
    city: string
    state: string
    zip: string
    country: string
    price: decimal
    }

type CreditCardInfo = {
    card: string
    name: string
    expiryMonth: int
    expiryYear: int
    }

type Booking = {
    id: int
    user: User
    hotel: Hotel
    checkinDate: Date
    checkoutDate: Date
    creditCardInfo: CreditCardInfo
    smoking: bool
    beds: int
    }

// これらは一体何でしょう？ なぜドメインオブジェクトに含まれているのでしょう？
type EntityManager = unit
type FacesMessages = unit
type Events = unit
type Log = unit

type BookingAction = {
    em: EntityManager
    user: User
    hotel: Booking
    booking: Booking
    facesMessages : FacesMessages
    events: Events 
    log: Log
    bookingValid: bool
    }

type ChangePasswordAction = {
    user: User
    em: EntityManager
    verify: string
    booking: Booking
    changed: bool
    facesMessages : FacesMessages
    }

type RegisterAction = {
    user: User
    em: EntityManager
    facesMessages : FacesMessages
    verify: string
    registered: bool
    }
```

もう我慢できません。ここで終わりにします。

`EntityManager`や`FacesMessages`フィールドは何のためにあるのでしょう？ ログは確かに重要ですが、なぜドメインオブジェクトに`Log`フィールドがあるのでしょう？

誤解しないでください。私がわざとUML設計の悪い例を選んでいるのではありません。これらの図はすべて、["uml class diagram"](https://www.google.com/search?q=uml+class+diagram&tbm=isch)で画像検索した上位の結果から引用したものです。

## 図書館

今度は、図書館のドメインです。少し良くなってきましたね（*[引用元](https://www.uml-diagrams.org/library-domain-uml-class-diagram-example.html)*）。

![](@assets/img/uml-library.png)

F# で書くと、こうなります。コードなので、UMLでは難しい、特定の型やフィールドにコメントを追加できます。

また、`ISBN: string option`のように書くことで、ISBNが省略可能であることを表現できます。UMLの `[0..1]`のような書き方は、少し分かりにくいですね。

```fsharp
type Author = {
    name: string
    biography: string
    }

type Book = {
    ISBN: string option
    title: string
    author: Author
    summary: string
    publisher: string
    publicationDate: Date
    numberOfPages: int
    language: string
    }

type Library = {
    name: string
    address: string
    }

// 図書館にある個々の資料 - 書籍、カセットテープ、CD、DVDなどは、それぞれ独自のアイテム番号を持つことができます。
// これをサポートするために、資料にバーコードを付けることがあります。バーコードの目的は、
// バーコード化された物理的な資料と、目録内の電子記録を結びつける、
// 一意でスキャン可能な識別子を提供することです。
// バーコードは資料に物理的に添付する必要があり、
// バーコード番号は電子資料レコードの対応するフィールドに入力されます。
// 図書館資料のバーコードは、RFIDタグに置き換えることができます。
// RFIDタグには、資料の識別子、タイトル、資料の種類などを含めることができます。
// RFIDタグはRFIDリーダーで読み取ることができ、
// バーコードリーダーでスキャンするために書籍の表紙やCD/DVDケースを開ける必要はありません。
type BookItem = {
    barcode: string option
    RFID: string option
    book: Book
    /// 図書館には、貸出可能な資料と閲覧のみの資料に関するルールがあります。
    isReferenceOnly: bool
    belongsTo: Library
    }

type Catalogue = {
    belongsTo: Library
    records : BookItem list
    }

type Patron = {
    name: string
    address: string
    }

type AccountState = Active | Frozen | Closed

type Account = {
    patron: Patron
    library: Library
    number: int
    opened: Date
    
    /// 利用者が何冊の本を借りることができ、
    /// 何冊の本を予約できるかについてのルールも定義されています。
    history: History list
    
    state: AccountState
    }

and History = {
    book : BookItem
    account: Account
    borrowedOn: Date
    returnedOn: Date option
    }
```

検索インターフェースと管理インターフェースは定義されていないので、入力と出力にはプレースホルダー（`unit`）を使います。

```fsharp
type Librarian = {
    name: string
    address: string
    position: string
    }

/// 利用者と司書の両方が検索できます。
type SearchInterfaceOperator =
    | Patron of Patron
    | Librarian of Librarian

type SearchRequest = unit // to do
type SearchResult = unit // to do
type SearchInterface = SearchInterfaceOperator -> Catalogue -> SearchRequest -> SearchResult

type ManageRequest = unit // to do
type ManageResult = unit // to do

/// 司書のみが管理できます。
type ManageInterface = Librarian -> Catalogue -> ManageRequest -> ManageResult   
```

これも完璧な設計とは言えませんね。たとえば、`Active`アカウントだけが本を借りられるということが、はっきりとは分かりません。F#では、以下のように表現できます。

```fsharp
type Account = 
    | Active of ActiveAccount
    | Closed of ClosedAccount
    
/// ActiveAccountだけが本を借りられます。
type Borrow = ActiveAccount -> BookItem -> History
```

CQRSとイベントソーシングを使った、このドメインのより現代的なモデリング方法を見たい場合は、[この記事](https://thinkbeforecoding.com/post/2009/11/02/Event-Sourcing-and-CQRS-Lets-use-it)を参照してください。


## ソフトウェアライセンス

最後の例は、ソフトウェアのライセンスに関するものです（*[引用元](https://www.uml-diagrams.org/software-licensing-domain-diagram-example.html?context=cls-examples)*）。

![](@assets/img/uml-hasp.png)

F#で書くと、以下のようになります。

```fsharp
open System
type Date = System.DateTime
type String50 = string
type String5 = string

// ==========================
// 顧客関連
// ==========================

type AddressDetails = {
    street : string option
    city : string option
    postalCode : string option
    state : string option
    country : string option
    }

type CustomerIdDescription = {
    CRM_ID : string
    description : string
    }

type IndividualCustomer = {
    idAndDescription : CustomerIdDescription
    firstName : string
    lastName : string
    middleName : string option
    email : string
    phone : string option
    locale : string option // デフォルトは英語
    billing : AddressDetails
    shipping : AddressDetails
    }

type Contact = {
    firstName : string
    lastName : string
    middleName : string option
    email : string
    locale : string option // デフォルトは英語
    }

type Company = {
    idAndDescription : CustomerIdDescription
    name : string
    phone : string option
    fax : string option
    contact: Contact
    billing : AddressDetails
    shipping : AddressDetails
    }

type Customer = 
    | Individual of IndividualCustomer
    | Company of Company 

// ==========================
// 製品関連
// ==========================

/// フラグはORで組み合わせることができます
[<Flags>] 
type LockingType =
    | HL 
    | SL_AdminMode 
    | SL_UserMode

type Rehost =
    | Enable
    | Disable
    | LeaveAsIs
    | SpecifyAtEntitlementTime

type BatchCode = {
    id : String5
    }
    
type Feature = {
    id : int
    name : String50
    description : string option
    }

type ProductInfo = {
    id : int
    name : String50
    lockingType : LockingType
    rehost : Rehost
    description : string option
    features: Feature list
    bactchCode: BatchCode
    }

type Product = 
    | BaseProduct of ProductInfo
    | ProvisionalProduct of ProductInfo * baseProduct:Product 

// ==========================
// 資格関連
// ==========================

type EntitlementType = 
    | HardwareKey
    | ProductKey
    | ProtectionKeyUpdate

type Entitlement = {
    EID : string
    entitlementType : EntitlementType 
    startDate : Date
    endDate : Date option
    neverExpires: bool
    comments: string option
    customer: Customer
    products: Product list
    }
```

この図はデータだけで、メソッドがないので、関数の型はありません。何か重要なビジネスルールが表現できていないような気がします。

たとえば、元の資料のコメントを読むと、`EntitlementType`と`LockingType`に、ある興味深い制約があることが分かります。
特定のロックタイプは、特定の資格タイプでのみ使用できるのです。

これは型システムでモデル化できるかもしれませんが、今回はUMLをそのまま再現することにしました。

## まとめ

もうお分かりいただけたでしょうか？

UMLクラス図は、スケッチとしては良いと思います。ただし、数行のコードと比べると、少し複雑すぎる気もします。

しかし、詳細な設計を描くには、UMLクラス図は情報が足りません。コンテキストや依存関係のような重要なものが、全く表現されていないのです。
私の意見では、ここに示したUML図はどれも、コードを書くための設計としては不十分です。

さらに、UML図は、開発者以外の人を誤解させてしまう可能性があります。
UML図は「公式」に見え、実際には設計が浅く、実用できないにもかかわらず、深く考えられた設計だという印象を与えてしまうことがあるのです。

ご意見はありますか？ コメントで教えてください！


