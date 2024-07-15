---
layout: post
title: "Formatted text using printf"
description: "Tips and techniques for printing and logging"
nav: thinking-functionally
seriesId: "式と構文"
seriesOrder: 10
---

In this post, we'll take a small detour and look at how to create formatted text.  The printing and formatting functions are technically library functions,
but in practice they as used as if they were part of the core language.

F# supports two distinct styles of formatting text:

* The standard .NET technique of ["composite formatting"](http://msdn.microsoft.com/en-us/library/txafckwd.aspx) as seen in `String.Format`, `Console.WriteLine` and other places.
* The C-style technique of using `printf` and the [associated family of functions](http://msdn.microsoft.com/en-us/library/ee370560) such as `printfn`, `sprintf` and so on.

## String.Format vs printf

The composite formatting technique is available in all .NET languages, and you are probably familiar with it from C#.

```fsharp
Console.WriteLine("A string: {0}. An int: {1}. A float: {2}. A bool: {3}","hello",42,3.14,true)
```

The `printf` technique, on the other hand, is based on the C-style format strings:

```fsharp
printfn "A string: %s. An int: %i. A float: %f. A bool: %b" "hello" 42 3.14 true
```

As you have seen, the `printf` technique is very common in F#, while `String.Format`, `Console.Write` and so on, are rarely used.

Why is `printf` preferred and considered idiomatic for F#? The reasons are:

* It is statically type checked.
* It is a well-behaved F# function and so supports partial application, etc.
* It supports native F# types.

### printf is statically type checked

Unlike `String.Format`, `printf` is *statically type checked*, both for the types of the parameters, and the number.

For example, here are two snippets using `printf` that will fail to compile:

```fsharp
// wrong parameter type
printfn "A string: %s" 42 

// wrong number of parameters
printfn "A string: %s" "Hello" 42 
```

The equivalent code using composite formatting will compile fine but either work incorrectly but silently, or give a runtime error:

```fsharp
// wrong parameter type
Console.WriteLine("A string: {0}", 42)   //works!

// wrong number of parameters
Console.WriteLine("A string: {0}","Hello",42)  //works!
Console.WriteLine("A string: {0}. An int: {1}","Hello") //FormatException
```

### printf supports partial application

The .NET formatting functions require all parameters to be passed in *at the same time*.

But `printf` is a standard, well-behaved F# function, and so supports [partial application](../posts/partial-application).

Here are some examples:

```fsharp
// partial application - explicit parameters
let printStringAndInt s i =  printfn "A string: %s. An int: %i" s i
let printHelloAndInt i = printStringAndInt "Hello" i
do printHelloAndInt 42

// partial application - point free style
let printInt =  printfn "An int: %i"
do printInt 42
```

And of course, `printf` can be used for function parameters anywhere a standard function can be used.

```fsharp
let doSomething printerFn x y = 
    let result = x + y
    printerFn "result is" result 

let callback = printfn "%s %i"
do doSomething callback 3 4
```

This also includes the higher order functions for lists, etc:

```fsharp
[1..5] |> List.map (sprintf "i=%i")
```

### printf supports native F# types

For non-primitive types, the .NET formatting functions only support using `ToString()`, but `printf` supports native F# types using the `%A` specifier:

```fsharp
// tuple printing
let t = (1,2)
Console.WriteLine("A tuple: {0}", t)
printfn "A tuple: %A" t

// record printing
type Person = {First:string; Last:string}
let johnDoe = {First="John"; Last="Doe"}
Console.WriteLine("A record: {0}", johnDoe )
printfn "A record: %A" johnDoe 

// union types printing
type Temperature = F of int | C of int
let freezing = F 32
Console.WriteLine("A union: {0}", freezing )
printfn "A union: %A" freezing 
```

As you can see, tuple types have a nice `ToString()` but other user defined types don't,
so if you want to use them with the .NET formatting functions, you will have to override the `ToString()` method explicitly.

## printf gotchas

There are a couple of "gotchas" to be aware of when using `printf`.

First, if there are *too few* parameters, rather than too many, the compiler will *not* complain immediately, but might give cryptic errors later.

```fsharp
// too few parameters
printfn "A string: %s An int: %i" "Hello" 
```

The reason, of course, is that this is not an error at all; `printf` is just being partially applied!
See the [discussion of partial application](../posts/partial-application) if you are not clear of why this happens.

Another issue is that the "format strings" are not actually strings.

In the .NET formatting model, the formatting strings are normal strings, so you can pass them around, store them in  resource files, and so on.
Which means that the following code works fine:

```fsharp
let netFormatString = "A string: {0}"
Console.WriteLine(netFormatString, "hello")
```

On the other hand, the "format strings" that are the first argument to `printf` are not really strings at all, but something called a `TextWriterFormat`. 
Which means that the following code does **not** work:

```fsharp
let fsharpFormatString = "A string: %s"
printfn fsharpFormatString  "Hello" 
```

The compiler does some magic behind the scenes to convert the string constant `"A string: %s"` into the appropriate TextWriterFormat.
The TextWriterFormat is the key component that "knows" the type of the format string, such as `string->unit` or `string->int->unit`, which in turn allows
`printf` to be typesafe.

If you want to emulate the compiler, you can create your own TextWriterFormat value from a string using the `Printf.TextWriterFormat` type in the `Microsoft.FSharp.Core.Printf` module.

If the format string is "inline", the compiler can deduce the type for you during binding:

```fsharp
let format:Printf.TextWriterFormat<_> = "A string: %s"
printfn format "Hello" 
```

But if the format string is truly dynamic (e.g. stored in a resource or created on the fly), the compiler cannot deduce the type for you,
and you must explicitly provide it with the constructor.

In the example below, my first format string has a single string parameter and returns a unit, so I have to specify `string->unit` as the format type.
And in the second case, I have to specify `string->int->unit` as the format type.

```fsharp
let formatAString = "A string: %s"
let formatAStringAndInt = "A string: %s. An int: %i"

//convert to TextWriterFormat
let twFormat1  = Printf.TextWriterFormat<string->unit>(formatAString)
printfn twFormat1 "Hello" 
let twFormat2  = Printf.TextWriterFormat<string->int->unit>(formatAStringAndInt)
printfn twFormat2  "Hello" 42
```

I won't go into detail on exactly how `printf and `TextWriterFormat` work together right now -- just be aware that is not just a matter of simple format strings being passed around.

Finally, it's worth noting that `printf` and family are *not* thread-safe, while `Console.Write` and family *are*.

## How to specify a format 

The "%" format specifications are quite similar to those used in C, but with some special customizations for F#.

As with C, the characters immediately following the `%` have a specific meaning, as shown below.

    %[flags][width][.precision]specifier 

We'll discuss each of these attributes in more detail below.    

### Formatting for dummies

The most commonly used format specifiers are: 

* `%s` for strings
* `%b` for bools
* `%i` for ints
* `%f` for floats
* `%A` for pretty-printing tuples, records and union types
* `%O` for other objects, using `ToString()`

These six will probably meet most of your basic needs.

### Escaping %

The `%` character on its own will cause an error. To escape it, just double it up:

```fsharp
printfn "unescaped: %" // error
printfn "escape: %%" 
```

### Controlling width and alignment

When formatting fixed width columns and tables, you need to have control of the alignment and width.

You can do that with the "width" and "flags" options.

* `%5s`, `%5i`. A number sets the width of the value
* `%*s`, `%*i`. A star sets the width of the value dynamically (from an extra parameter just before the param to format)
* `%-s`, `%-i`. A hyphen left justifies the value.

Here are some examples of these in use:

```fsharp
let rows = [ (1,"a"); (-22,"bb"); (333,"ccc"); (-4444,"dddd") ] 

// no alignment
for (i,s) in rows do
    printfn "|%i|%s|" i s

// with alignment
for (i,s) in rows do
    printfn "|%5i|%5s|" i s

// with left alignment for column 2
for (i,s) in rows do
    printfn "|%5i|%-5s|" i s

// with dynamic column width=20 for column 1
for (i,s) in rows do
    printfn "|%*i|%-5s|" 20 i s 

// with dynamic column width for column 1 and column 2
for (i,s) in rows do
    printfn "|%*i|%-*s|" 20 i 10 s 
```

### Formatting integers

There are some special options for basic integer types:

* `%i` or `%d` for signed ints 
* `%u` for unsigned ints 
* `%x` and `%X` for lowercase and uppercase hex
* `%o` for octal

Here are some examples: 

```fsharp
printfn "signed8: %i unsigned8: %u" -1y -1y
printfn "signed16: %i unsigned16: %u" -1s -1s
printfn "signed32: %i unsigned32: %u" -1 -1
printfn "signed64: %i unsigned64: %u" -1L -1L
printfn "uppercase hex: %X lowercase hex: %x octal: %o" 255 255 255
printfn "byte: %i " 'A'B
```

The specifiers do not enforce any type safety within the integer types. As you can see from the examples above, you can pass a signed int to an unsigned specifier without problems.
What is different is how it is formatted. The unsigned specifiers treat the int as unsigned no matter how it is actually typed.

Note that `BigInteger` is *not* a basic integer type, so you must format it with `%A` or `%O`.

```fsharp
printfn "bigInt: %i " 123456789I  // Error
printfn "bigInt: %A " 123456789I  // OK
```

You can control the formatting of signs and zero padding using the flags:

* `%0i` pads with zeros
* `%+i` shows a plus sign
* `% i` shows a blank in place of a plus sign

Here are some examples:

```fsharp
let rows = [ (1,"a"); (-22,"bb"); (333,"ccc"); (-4444,"dddd") ] 

// with alignment
for (i,s) in rows do
    printfn "|%5i|%5s|" i s

// with plus signs
for (i,s) in rows do
    printfn "|%+5i|%5s|" i s

// with zero pad
for (i,s) in rows do
    printfn "|%0+5i|%5s|" i s 

// with left align
for (i,s) in rows do
    printfn "|%-5i|%5s|" i s 

// with left align and plus
for (i,s) in rows do
    printfn "|%+-5i|%5s|" i s 

// with left align and space instead of plus
for (i,s) in rows do
    printfn "|% -5i|%5s|" i s 
```

### Formatting floats and decimals

For floating point types, there are also some special options:

* `%f` for standard format
* `%e` or `%E` for exponential format
* `%g` or `%G` for the more compact of `f` and `e`.
* `%M` for decimals

Here are some examples: 

```fsharp
let pi = 3.14
printfn "float: %f exponent: %e compact: %g" pi pi pi 

let petabyte = pown 2.0 50
printfn "float: %f exponent: %e compact: %g" petabyte petabyte petabyte 
```

The decimal type can be used with the floating point specifiers, but you might lose some precision.
The `%M` specifier can be used to ensure that no precision is lost.  You can see the difference with this example: 

```fsharp
let largeM = 123456789.123456789M  // a decimal
printfn "float: %f decimal: %M" largeM largeM 
```

You can control the precision of floats using a precision specification, such as `%.2f` and `%.4f`.
For the `%f` and `%e` specifiers, the precision affects the number of digits after the decimal point, while for `%g` it is the number of digits in total.
Here's an example:

```fsharp
printfn "2 digits precision: %.2f. 4 digits precision: %.4f." 123.456789 123.456789
// output => 2 digits precision: 123.46. 4 digits precision: 123.4568.
printfn "2 digits precision: %.2e. 4 digits precision: %.4e." 123.456789 123.456789
// output => 2 digits precision: 1.23e+002. 4 digits precision: 1.2346e+002.
printfn "2 digits precision: %.2g. 4 digits precision: %.4g." 123.456789 123.456789
// output => 2 digits precision: 1.2e+02. 4 digits precision: 123.5.
```

The alignment and width flags work for floats and decimals as well.

```fsharp
printfn "|%f|" pi     // normal   
printfn "|%10f|" pi   // width
printfn "|%010f|" pi  // zero-pad
printfn "|%-10f|" pi  // left aligned
printfn "|%0-10f|" pi // left zero-pad
```

### Custom formatting functions

There are two special format specifiers that allow to you pass in a function rather than just a simple value.

* `%t` expects a function that outputs some text with no input
* `%a` expects a function that outputs some text from a given input

Here's an example of using `%t`:

```fsharp
open System.IO

//define the function
let printHello (tw:TextWriter) = tw.Write("hello")

//test it
printfn "custom function: %t" printHello 
```

Obviously, since the callback function takes no parameters, it will probably be a closure that does reference some other value.
Here's an example that prints random numbers:

```fsharp
open System
open System.IO

//define the function using a closure
let printRand = 
    let rand = new Random()
    // return the actual printing function
    fun (tw:TextWriter) -> tw.Write(rand.Next(1,100))

//test it
for i in [1..5] do
    printfn "rand = %t" printRand 
```

For the `%a` specifier, the callback function takes an extra parameter. That is, when using the `%a` specifier, you must pass in both a function and a value to format.

Here's an example of custom formatting a tuple:

```fsharp
open System
open System.IO

//define the callback function
//note that the data parameter comes after the TextWriter
let printLatLong (tw:TextWriter) (lat,long) = 
    tw.Write("lat:{0} long:{1}", lat, long)

// test it
let latLongs = [ (1,2); (3,4); (5,6)]
for latLong  in latLongs  do
    // function and value both passed in to printfn
    printfn "latLong = %a" printLatLong latLong  
```


### Date formatting

There are no special format specifiers for dates in F#.

If you want to format dates, you have a couple of options:

* Use `ToString` to convert the date into a string, and then use the `%s` specifier
* Use a custom callback function with the `%a` specifier as described above

Here are the two approaches in use:

```fsharp
// function to format a date
let yymmdd1 (date:DateTime) = date.ToString("yy.MM.dd")

// function to format a date onto a TextWriter
let yymmdd2 (tw:TextWriter) (date:DateTime) = tw.Write("{0:yy.MM.dd}", date)

// test it
for i in [1..5] do
    let date = DateTime.Now.AddDays(float i)

    // using %s
    printfn "using ToString = %s" (yymmdd1 date)
    
    // using %a
    printfn "using a callback = %a" yymmdd2 date
```

Which approach is better?

The `ToString` with `%s` is easier to test and use, but it will be less efficient than writing directly to a TextWriter.


## The printf family of functions

There are a number of variants of `printf` functions. Here is a quick guide:

F# function  | C# equivalent | Comment
-------------|---------|----
`printf` and `printfn`  | `Console.Write` and `Console.WriteLine` | Functions starting with "print" write to standard out.
`eprintf` and `eprintfn`  | `Console.Error.Write` and `Console.Error.WriteLine` | Functions starting with "eprint" write to standard error.
`fprintf` and `fprintfn`  | `TextWriter.Write` and `TextWriter.WriteLine` | Functions starting with "fprint" write to a TextWriter.
`sprintf`  | `String.Format` | Functions starting with "sprint" return a string.
`bprintf`  | `StringBuilder.AppendFormat` | Functions starting with "bprint" write to a StringBuilder.
`kprintf`, `kfprintf`, `ksprintf` and `kbprintf` | No equivalent | Functions that accept a continuation. See next section for a discussion.

*All of these except `bprintf` and the `kXXX` family are automatically available (via [Microsoft.FSharp.Core.ExtraTopLevelOperators](http://msdn.microsoft.com/en-us/library/ee370230)).
But if you need to access them using a module, they are in the [`Printf` module](http://msdn.microsoft.com/en-us/library/ee370560).*

The usage of these should be obvious (except for the `kXXX` family, of which more below).

A particularly useful technique is to use partial application to "bake in" a TextWriter or StringBuilder. 

Here is an example using a StringBuilder:

```fsharp
let printToSb s i = 
    let sb = new System.Text.StringBuilder()

    // use partial application to fix the StringBuilder
    let myPrint format = Printf.bprintf sb format    

    do myPrint "A string: %s. " s
    do myPrint "An int: %i" i

    //get the result
    sb.ToString()

// test
printToSb "hello" 42
```

And here is an example using a TextWriter:

```fsharp
open System
open System.IO

let printToFile filename s i =
    let myDocsPath = Environment.GetFolderPath(Environment.SpecialFolder.MyDocuments) 
    let fullPath = Path.Combine(myDocsPath, filename)
    use sw = new StreamWriter(path=fullPath)

    // use partial application to fix the TextWriter
    let myPrint format = fprintf sw format

    do myPrint "A string: %s. " s
    do myPrint "An int: %i" i

    //get the result
    sw.Close()

// test
printToFile "myfile.txt" "hello" 42
```

### More on partially applying printf

Note that in both cases above, we had to pass a format parameter when creating the partial application.

That is, we had to do:

```fsharp
let myPrint format = fprintf sw format
```

rather than the point-free version:

```fsharp
let myPrint  = fprintf sw 
```

This stops the compiler complaining about an incorrect type. The reason why is non-obvious. We briefly mentioned the `TextWriterFormat` above as the first parameter to `printf`.  It turns out that `printf` is not actually a particular function, like `String.Format`,
but rather a generic function that has to be parameterized with a TextWriterFormat (or the similar StringFormat) in order to become "real".

So, to be safe, it is best to always pair a `printf` with a format parameter, rather than being overly aggressive with the partial application.

## The kprintf functions 

The four `kXXX` functions are similar to their cousins, except that they take an extra parameter -- a continuation. That is, a function to be called immediately after the formatting has been done.

Here's a simple snippet:

```fsharp
let doAfter s = 
    printfn "Done"
    // return the result
    s

let result = Printf.ksprintf doAfter "%s" "Hello"
```

Why would you want this?  A number of reasons:

* You can pass the result to another function that does something useful, such as a logging framework 
* You can do things such as flushing the TextWriter
* You can raise an event 

Let's look at a sample that uses a external logging framework plus custom events.

First, let's create a simple logging class along the lines of log4net or System.Diagnostics.Trace.
In practice, this would be replaced by a real third-party library.

```fsharp
open System
open System.IO

// a logging library such as log4net 
// or System.Diagnostics.Trace
type Logger(name) = 
    
    let currentTime (tw:TextWriter) = 
        tw.Write("{0:s}",DateTime.Now)

    let logEvent level msg = 
        printfn "%t %s [%s] %s" currentTime level name msg

    member this.LogInfo msg = 
        logEvent "INFO" msg

    member this.LogError msg = 
        logEvent "ERROR" msg

    static member CreateLogger name = 
        new Logger(name)
```

Next in my application code, I do the following:

* Create an instance of the logging framework. I've hard-coded the factory method here, but you could also use an IoC container.
* Create helper functions called `logInfo` and `logError` that call the logging framework, and in the case of `logError`, show a popup message as well.

```fsharp
// my application code
module MyApplication = 

    let logger = Logger.CreateLogger("MyApp")

    // create a logInfo using the Logger class
    let logInfo format = 
        let doAfter s = 
            logger.LogInfo(s)
        Printf.ksprintf doAfter format 

    // create a logError using the Logger class
    let logError format = 
        let doAfter s = 
            logger.LogError(s)
            System.Windows.Forms.MessageBox.Show(s) |> ignore
        Printf.ksprintf doAfter format 
    
    // function to exercise the logging
    let test() = 
        do logInfo "Message #%i" 1
        do logInfo "Message #%i" 2
        do logError "Oops! an error occurred in my app"
```


Finally, when we run the `test` function, we should get the message written to the console, and also see the popup message:

```fsharp
MyApplication.test()
```

You could also create an object-oriented version of the helper methods by creating a "FormattingLogger" wrapper class around the logging library, as shown below.

```fsharp
type FormattingLogger(name) = 

    let logger = Logger.CreateLogger(name)

    // create a logInfo using the Logger class
    member this.logInfo format = 
        let doAfter s = 
            logger.LogInfo(s)
        Printf.ksprintf doAfter format 

    // create a logError using the Logger class
    member this.logError format = 
        let doAfter s = 
            logger.LogError(s)
            System.Windows.Forms.MessageBox.Show(s) |> ignore
        Printf.ksprintf doAfter format 

    static member createLogger name = 
        new FormattingLogger(name)

// my application code
module MyApplication2 = 

    let logger = FormattingLogger.createLogger("MyApp2")

    let test() = 
        do logger.logInfo "Message #%i" 1
        do logger.logInfo "Message #%i" 2
        do logger.logError "Oops! an error occurred in app 2"

// test
MyApplication2.test()

```

The object-oriented approach, although more familiar, is not automatically better! The pros and cons of OO methods vs. pure functions are discussed [here](../posts/type-extensions.md#downsides-of-methods).


