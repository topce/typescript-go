//// [tests/cases/conformance/types/intersection/intersectionOfUnionOfUnitTypes.ts] ////

//// [intersectionOfUnionOfUnitTypes.ts]
// @strict

const enum E { A, B, C, D, E, F }

let x0: ('a' | 'b' | 'c') & ('a' | 'b' | 'c');  // 'a' | 'b' | 'c'
let x1: ('a' | 'b' | 'c') & ('b' | 'c' | 'd');  // 'b' | 'c'
let x2: ('a' | 'b' | 'c') & ('c' | 'd' | 'e');  // 'c'
let x3: ('a' | 'b' | 'c') & ('d' | 'e' | 'f');  // never
let x4: ('a' | 'b' | 'c') & ('b' | 'c' | 'd') & ('c' | 'd' | 'e');  // 'c'
let x5: ('a' | 'b' | 'c') & ('b' | 'c' | 'd') & ('c' | 'd' | 'e') & ('d' | 'e' | 'f');  // never

let y0: (0 | 1 | 2) & (0 | 1 | 2);  // 0 | 1 | 2
let y1: (0 | 1 | 2) & (1 | 2 | 3);  // 1 | 2
let y2: (0 | 1 | 2) & (2 | 3 | 4);  // 2
let y3: (0 | 1 | 2) & (3 | 4 | 5);  // never
let y4: (0 | 1 | 2) & (1 | 2 | 3) & (2 | 3 | 4);  // 2
let y5: (0 | 1 | 2) & (1 | 2 | 3) & (2 | 3 | 4) & (3 | 4 | 5);  // never

let z0: (E.A | E.B | E.C) & (E.A | E.B | E.C);  // E.A | E.B | E.C
let z1: (E.A | E.B | E.C) & (E.B | E.C | E.D);  // E.B | E.C
let z2: (E.A | E.B | E.C) & (E.C | E.D | E.E);  // E.C
let z3: (E.A | E.B | E.C) & (E.D | E.E | E.F);  // never
let z4: (E.A | E.B | E.C) & (E.B | E.C | E.D) & (E.C | E.D | E.E);  // E.C
let z5: (E.A | E.B | E.C) & (E.B | E.C | E.D) & (E.C | E.D | E.E) & (E.D | E.E | E.F);  // never


//// [intersectionOfUnionOfUnitTypes.js]
// @strict
var E;
(function (E) {
    E[E["A"] = 0] = "A";
    E[E["B"] = 1] = "B";
    E[E["C"] = 2] = "C";
    E[E["D"] = 3] = "D";
    E[E["E"] = 4] = "E";
    E[E["F"] = 5] = "F";
})(E || (E = {}));
let x0; // 'a' | 'b' | 'c'
let x1; // 'b' | 'c'
let x2; // 'c'
let x3; // never
let x4; // 'c'
let x5; // never
let y0; // 0 | 1 | 2
let y1; // 1 | 2
let y2; // 2
let y3; // never
let y4; // 2
let y5; // never
let z0; // E.A | E.B | E.C
let z1; // E.B | E.C
let z2; // E.C
let z3; // never
let z4; // E.C
let z5; // never
