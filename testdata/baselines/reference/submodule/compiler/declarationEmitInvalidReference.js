//// [tests/cases/compiler/declarationEmitInvalidReference.ts] ////

//// [declarationEmitInvalidReference.ts]
/// <reference path="invalid.ts" />
var x = 0;

//// [invalid.js]
//// [declarationEmitInvalidReference.js]
/// <reference path="invalid.ts" />
var x = 0;


//// [invalid.d.ts]
//// [declarationEmitInvalidReference.d.ts]
declare var x: number;
