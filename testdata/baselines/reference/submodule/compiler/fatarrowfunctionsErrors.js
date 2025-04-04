//// [tests/cases/compiler/fatarrowfunctionsErrors.ts] ////

//// [fatarrowfunctionsErrors.ts]
foo((...Far:any[])=>{return 0;})
foo((1)=>{return 0;}); 
foo((x?)=>{return x;})
foo((x=0)=>{return x;})
var y = x:number => x*x;
false? (() => null): null;

// missing fatarrow
var x1 = () :void {};
var x2 = (a:number) :void {};
var x3 = (a:number) {};
var x4= (...a: any[]) { };

//// [fatarrowfunctionsErrors.js]
foo((...Far) => { return 0; });
foo((1), { return: 0, });
foo((x) => { return x; });
foo((x = 0) => { return x; });
var y = x, number;
x * x;
false ? (() => null) : null;
// missing fatarrow
var x1 = () => { };
var x2 = (a) => { };
var x3 = (a) => { };
var x4 = (...a) => { };
