//// [tests/cases/conformance/enums/enumConstantMemberWithTemplateLiteralsEmitDeclaration.ts] ////

//// [enumConstantMemberWithTemplateLiteralsEmitDeclaration.ts]
enum T1 {
    a = `1`
}

enum T2 {
    a = `1`,
    b = "2",
    c = 3
}

enum T3 {
    a = `1` + `1`
}

enum T4 {
    a = `1`,
    b = `1` + `1`,
    c = `1` + "2",
    d = "2" + `1`,
    e = "2" + `1` + `1`
}

enum T5 {
    a = `1`,
    b = `1` + `2`,
    c = `1` + `2` + `3`,
    d = 1
}

enum T6 {
    a = 1,
    b = `12`.length
}

declare enum T7 {
    a = `1`,
    b = `1` + `1`,
    c = "2" + `1`
}


//// [enumConstantMemberWithTemplateLiteralsEmitDeclaration.js]
var T1;
(function (T1) {
    T1["a"] = "1";
})(T1 || (T1 = {}));
var T2;
(function (T2) {
    T2["a"] = "1";
    T2["b"] = "2";
    T2[T2["c"] = 3] = "c";
})(T2 || (T2 = {}));
var T3;
(function (T3) {
    T3["a"] = "11";
})(T3 || (T3 = {}));
var T4;
(function (T4) {
    T4["a"] = "1";
    T4["b"] = "11";
    T4["c"] = "12";
    T4["d"] = "21";
    T4["e"] = "211";
})(T4 || (T4 = {}));
var T5;
(function (T5) {
    T5["a"] = "1";
    T5["b"] = "12";
    T5["c"] = "123";
    T5[T5["d"] = 1] = "d";
})(T5 || (T5 = {}));
var T6;
(function (T6) {
    T6[T6["a"] = 1] = "a";
    T6["b"] = `12`.length;
    if (typeof T6.b !== "string") T6[T6.b] = "b";
})(T6 || (T6 = {}));


//// [enumConstantMemberWithTemplateLiteralsEmitDeclaration.d.ts]
declare enum T1 {
    a = "1"
}
declare enum T2 {
    a = "1",
    b = "2",
    c = 3
}
declare enum T3 {
    a = "11"
}
declare enum T4 {
    a = "1",
    b = "11",
    c = "12",
    d = "21",
    e = "211"
}
declare enum T5 {
    a = "1",
    b = "12",
    c = "123",
    d = 1
}
declare enum T6 {
    a = 1,
    b
}
declare enum T7 {
    a = "1",
    b = "11",
    c = "21"
}
