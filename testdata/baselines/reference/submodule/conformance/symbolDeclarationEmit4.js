//// [tests/cases/conformance/es6/Symbols/symbolDeclarationEmit4.ts] ////

//// [symbolDeclarationEmit4.ts]
class C {
    get [Symbol.toPrimitive]() { return ""; }
    set [Symbol.toPrimitive](x) { }
}

//// [symbolDeclarationEmit4.js]
class C {
    get [Symbol.toPrimitive]() { return ""; }
    set [Symbol.toPrimitive](x) { }
}
