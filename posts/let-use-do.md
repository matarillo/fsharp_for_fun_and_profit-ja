---
layout: post
title: "Binding with let, use, and do"
description: "How to use them"
nav: thinking-functionally
seriesId: "Expressions and syntax"
seriesOrder: 4
---


As we've have already seen, there are no "variables" in  F#. Instead there are values.

And we have also seen that keywords such as `let`, `use`, and `do` act as *bindings* -- associating an identifier with a value or function expression. 

In this post we'll look at these bindings in more detail.

## "let" bindings ##

The `let` binding is straightforward, it has the general form:

```fsharp
let aName = someExpression
```

But there are two uses of `let` that are subtly different.  One is to define a named expression at a the top level of a module*, and the other is to define a local name used in the context of some expression.  This is somewhat analogous to the difference between "top level" method names and "local" variable names in C#.

<sub>* and in a later series, when we talk about OO features, classes can have top level let bindings too.</sub>

Here's an example of both types:

```fsharp
module MyModule = 

    let topLevelName = 
        let nestedName1 = someExpression
        let nestedName2 = someOtherExpression
        finalExpression
```


The top level name is a *definition*, which is part of the module, and you can access it with a fully qualified name such as `MyModule.topLevelName`. It's the equivalent of a class method, in a sense.

But the nested names are completely inaccessible to anyone -- they are only valid within the context of the top level name binding.

### Patterns in "let" bindings 

We have already seen examples of how bindings can use patterns directly

```fsharp
let a,b = 1,2

type Person = {First:string; Last:string}
let alice = {First="Alice"; Last="Doe"}
let {First=first} = alice
```

And in function definitions the binding includes parameters as well:

```fsharp
// pattern match the parameters
let add (x,y) = x + y

// test    
let aTuple = (1,2)
add aTuple
```

The details of the various pattern bindings depends on the type being bound, and will be discussed further in later posts on pattern matching.

### Nested "let" bindings as expressions 

We have emphasized that an expression is composed from smaller expressions.  But what about a nested `let`? 

```fsharp
let nestedName = someExpression
```

How can "`let`" be an expression? What does it return?

The answer that a nested "let" can never be used in isolation -- it must always be part of a larger code block, so that it can be interpreted as:

```fsharp
let nestedName = [some expression] in [some other expression involving nestedName]
```

That is, every time you see the symbol "nestedName" in the second expression (called the *body expression*), substitute it with the first expression.  

So for example, the expression:

```fsharp
// standard syntax
let f () = 
  let x = 1  
  let y = 2
  x + y          // the result
```

really means: 

```fsharp
// syntax using "in" keyword
let f () = 
  let x = 1 in   // the "in" keyword is available in F#
    let y = 2 in 
      x + y      // the result
```

When the substitutions are performed, the last line becomes:

    (definition of x) + (definition of y) 
    // or
    (1) + (2) 

In a sense, the nested names are just "macros" or "placeholders" that disappear when the expression is compiled.  And therefore you should be able to see that the nested `let`s have no effect on the expression as whole. So, for example, the type of an expression containing nested `let`s is just the type of the final body expression.
   
If you understand how nested `let` bindings work, then certain errors become understandable. For example, if there is nothing for a nested "let" to be "in", the entire expression is not complete. In the example below, there is nothing following the let line, which is an error:

```fsharp
let f () = 
  let x = 1  
// error FS0588: Block following this 'let' is unfinished. 
//               Expect an expression.
```

And you cannot have multiple expression results, because you cannot have multiple body expressions. Anything evaluated before the final body expression must be a "`do`" expression (see below), and return `unit`.

```fsharp
let f () = 
  2 + 2      // warning FS0020: This expression should 
             // have type 'unit'
  let x = 1  
  x + 1      // this is the final result
```

In a case like this, you must pipe the results into "ignore".

```fsharp
let f () = 
  2 + 2 |> ignore 
  let x = 1  
  x + 1      // this is the final result
```

<a name="use"></a>
## "use" bindings ##

The `use` keyword serves the same purpose as `let` -- it binds the result of an expression to a named value.

The key difference is that is also *automatically disposes* the value when it goes out of scope. 

Obviously, this means that `use` only applies in nested situations. You cannot have a top level `use` and the compiler will warn you if you try.

```fsharp
module A = 
    use f () =  // Error
      let x = 1  
      x + 1      
```

To see how a proper `use` binding works, first let's create a helper function that creates an `IDisposable` on the fly.

```fsharp
// create a new object that implements IDisposable
let makeResource name = 
   { new System.IDisposable 
     with member this.Dispose() = printfn "%s disposed" name }
```

Now let's test it with a nested `use` binding:

```fsharp
let exampleUseBinding name =
    use myResource = makeResource name
    printfn "done"

//test
exampleUseBinding "hello"
```

We can see that "done" is printed, and then immediately after that, `myResource` goes out of scope, its `Dispose` is called, and "hello disposed" is also printed.

On the other hand, if we test it using the regular `let` binding, we don't get the same effect.

```fsharp
let exampleLetBinding name =
    let myResource = makeResource name
    printfn "done"

//test
exampleLetBinding "hello"
```

In this case, we see that "done" is printed, but `Dispose` is never called.

### "Use" only works with IDisposables

Note that "use" bindings only work with types that implement `IDisposable`, and the compiler will complain otherwise:

```fsharp
let exampleUseBinding2 name =
    use s = "hello"  // Error: The type 'string' is 
                     // not compatible with the type 'IDisposable'
    printfn "done"
```


### Don't return "use'd" values

It is important to realize that the value is disposed as soon as it goes out of scope *in the expression where it was declared*.
If you attempt to return the value for use by another function, the return value will be invalid.

The following example shows how *not* to do it:

```fsharp
let returnInvalidResource name =
    use myResource = makeResource name
    myResource // don't do this!

// test
let resource = returnInvalidResource  "hello"
```

If you need to work with a disposable "outside" the function that created it, probably the best way is to use a callback.

The function then would work as follows:

* create the disposable.
* evaluate the callback with the disposable
* call `Dispose` on the disposable

Here's an example:

```fsharp
let usingResource name callback =
    use myResource = makeResource name
    callback myResource
    printfn "done"

let callback aResource = printfn "Resource is %A" aResource
do usingResource "hello" callback 
```

This approach guarantees that the same function that creates the disposable also disposes of it and there is no chance of a leak.

Another possible way is to *not* use a `use` binding on creation, but use a `let` binding instead, and make the caller responsible for disposing.

Here's an example:

```fsharp
let returnValidResource name =
    // "let" binding here instead of "use"
    let myResource = makeResource name
    myResource // still valid

let testValidResource =
    // "use" binding here instead of "let"
    use resource = returnValidResource  "hello"
    printfn "done"
```

Personally, I don't like this approach, because it is not symmetrical and separates the create from the dispose, which could lead to resource leaks.

### The "using" function

The preferred approach to sharing a disposable, shown above, used a callback function.

There is a built-in `using` function that works in the same way. It takes two parameters:

* the first is an expression that creates the resource
* the second is a function that uses the resource, taking it as a parameter

Here's our earlier example rewritten with the `using` function:

```fsharp
let callback aResource = printfn "Resource is %A" aResource
using (makeResource "hello") callback 
```
 
In practice, the `using` function is not used that often, because it is so easy to make your own custom version of it, as we saw earlier. 

### Misusing "use"

One trick in F# is to appropriate the `use` keyword to do any kind of "stop" or "revert" functionality automatically.

The way to do this is:

* Create an [extension method](../posts/type-extensions) for some type 
* In that method, start the behavior you want but then return an `IDisposable` that stops the behavior.

For example, here is an extension method that starts a timer and then returns an `IDisposable` that stops it.

```fsharp
module TimerExtensions = 

    type System.Timers.Timer with 
        static member StartWithDisposable interval handler = 
            // create the timer
            let timer = new System.Timers.Timer(interval)
            
            // add the handler and start it
            do timer.Elapsed.Add handler 
            timer.Start()
            
            // return an IDisposable that calls "Stop"
            { new System.IDisposable with 
                member disp.Dispose() = 
                    do timer.Stop() 
                    do printfn "Timer stopped"
                }
```

So now in the calling code, we create the timer and bind it with `use`. When the timer value goes out of scope, it will stop automatically!

```fsharp
open TimerExtensions
let testTimerWithDisposable =     
    let handler = (fun _ -> printfn "elapsed")
    use timer = System.Timers.Timer.StartWithDisposable 100.0 handler  
    System.Threading.Thread.Sleep 500
```

This same approach can be used for other common pairs of operations, such as:

* opening/connecting and then closing/disconnecting a resource (which is what `IDisposable` is supposed to be used for anyway, but your target type might not have implemented it)
* registering and then deregistering an event handler (instead of using `WeakReference`)
* in a UI, showing a splash screen at the start of a block of code, and then automatically closing it at the end of the block

I wouldn't recommend this approach generally, because it does hide what is going on, but on occasion it can be quite useful.

## "do" bindings ##

Sometimes we might want to execute code independently of a function or value definition. This can be useful in module initialization, class initialization and so on. 

That is, rather than having "`let x = do something`" we just the "`do something`" on its own. This is analogous to a statement in an imperative language.

You can do this by prefixing the code with "`do`":

```fsharp
do printf "logging"
```

In many situations, the `do` keyword can be omitted:

```fsharp
printf "logging"
```

But in both cases, the expression must return unit. If it does not, you will get a compiler error.

```fsharp
do 1 + 1    // warning: This expression is a function 
```

As always, you can force a non-unit result to be discarded by piping the results into "`ignore`".

```fsharp
do ( 1+1 |> ignore )
```

You will also see the "`do`" keyword used in loops in the same way.

Note that although you can sometimes omit it, it is considered good practice to always have an explicit "`do`", as it acts as documentation that you do not want a result, only the side-effects.


### "do" for module initialization

Just like `let`, `do` can be used both in a nested context, and at the top level in a module or class.

When used at the module level, the `do` expression is evaluated once only, when the module is first loaded.  

```fsharp
module A =

    module B =
        do printfn "Module B initialized"

    module C =
        do printfn "Module C initialized"

    do printfn "Module A initialized"
```

This is somewhat analogous to a static class constructor in C#, except that if there are multiple modules, the order of initialization is fixed and they are initialized in order of declaration.

## let! and use! and do!

When you see `let!`, `use!` and `do!` (that is, with exclamation marks) and they are part of a curly brace `{..}` block, then they are being used as part of a "computation expression". The exact meaning of `let!`, `use!` and `do!` in this context depends on the computation expression itself.  Understanding computation expressions in general will have to wait for a later series.

The most common type of computation expression you will run into are *asynchronous workflows*, indicated by a `async{..}` block.
In this context, it means they are being used to wait for an async operation to finish, and only then bind to the result value.

Here are some examples we saw earlier in [a post from the "F# を使う理由" series](../posts/concurrency-async-and-parallel):

```fsharp
//This simple workflow just sleeps for 2 seconds.
open System
let sleepWorkflow  = async{
    printfn "Starting sleep workflow at %O" DateTime.Now.TimeOfDay
    
    // do! means to wait as well
    do! Async.Sleep 2000
    printfn "Finished sleep workflow at %O" DateTime.Now.TimeOfDay
    }

//test
Async.RunSynchronously sleepWorkflow  


// Workflows with other async workflows nested inside them. 
/// Within the braces, the nested workflows can be blocked on by using the let! or use! syntax.
let nestedWorkflow  = async{

    printfn "Starting parent"
    
    // let! means wait and then bind to the childWorkflow value
    let! childWorkflow = Async.StartChild sleepWorkflow

    // give the child a chance and then keep working
    do! Async.Sleep 100
    printfn "Doing something useful while waiting "

    // block on the child
    let! result = childWorkflow

    // done
    printfn "Finished parent" 
    }

// run the whole workflow
Async.RunSynchronously nestedWorkflow  
```

## Attributes on let and do bindings

If they are at the top-level in a module, `let` and `do` bindings can have attributes. F# attributes use the syntax `[<MyAttribute>]`.

Here are some examples in C# and then the same code in F#:

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

Let's have a brief look at three attribute examples:

* The EntryPoint attribute used to indicate the "main" function.
* The various AssemblyInfo attributes.
* The DllImport attribute for interacting with unmanaged code.

### The EntryPoint attribute 

The special `EntryPoint` attribute is used to mark the entry point of a standalone app, just as in C#, the `static void Main` method is.

Here's the familiar C# version:

```csharp
class Program
{
    static int Main(string[] args)
    {
        foreach (var arg in args)
        {
            Console.WriteLine(arg);
        }
        
        //same as Environment.Exit(code)
        return 0;
    }
}
```

And here's the F# equivalent:

```fsharp
module Program

[<EntryPoint>]
let main args =
    args |> Array.iter printfn "%A" 
    
    0  // return is required!
```

Just as in C#, the args are an array of strings. But unlike C#, where the static `Main` method can be `void`, the F# function *must* return an int.

Also, a big gotcha is that the function that has this attribute must be the very last function in the last file in the project! Otherwise you get this error:

    error FS0191: A function labelled with the 'EntryPointAttribute' atribute must be the last declaration in the last file in the compilation sequence

Why is the F# compiler so fussy? In C#, the class can go anywhere.  

One analogy that might help is this: in some sense, the whole application is a single huge expression bound to `main`,
where `main` is an expression that contains subexpressions that contain other subexpressions.

    [<EntryPoint>]
    let main args =
        the entire application as a set of subexpressions
    
Now in F# projects, there are no forward references allowed. That is, expressions that refer to other expressions must be declared after them.
And so logically, the highest, most top-level function of them all, `main`, must come last of all.

### The AssemblyInfo attributes

In a C# project, there is an `AssemblyInfo.cs` file that contains all the assembly level attributes.

In F#, the equivalent way to do this is with a dummy module which contains a `do` expression annotated with these attributes.

```fsharp
open System.Reflection

module AssemblyInfo = 
    [<assembly: AssemblyTitle("MyAssembly")>]
    [<assembly: AssemblyVersion("1.2.0.0")>]
    [<assembly: AssemblyFileVersion("1.2.3.4152")>]
    do ()   // do nothing -- just a placeholder for the attribute
```
    
### The DllImport attribute 

Another occasionally useful attribute is the `DllImport` attribute. Here's a C# example.

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

It works the same way in F# as in C#. One thing to note is that the `extern declaration ...` puts the types before the parameters, C-style.

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

// test
TestPathCanonicalize() 
```

Interop with unmanaged code is a big topic which will need its own series.