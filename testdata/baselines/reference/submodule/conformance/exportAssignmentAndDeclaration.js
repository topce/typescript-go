//// [tests/cases/conformance/externalModules/exportAssignmentAndDeclaration.ts] ////

//// [foo_0.ts]
export enum E1 {
	A,B,C
}

class C1 {

}

// Invalid, as there is already an exported member.
export = C1;

//// [foo_0.js]
"use strict";
exports.E1 = void 0;
var E1;
(function (E1) {
    E1[E1["A"] = 0] = "A";
    E1[E1["B"] = 1] = "B";
    E1[E1["C"] = 2] = "C";
})(E1 || (exports.E1 = E1 = {}));
class C1 {
}
module.exports = C1;
