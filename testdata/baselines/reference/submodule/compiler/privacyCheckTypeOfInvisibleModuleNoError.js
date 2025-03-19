//// [tests/cases/compiler/privacyCheckTypeOfInvisibleModuleNoError.ts] ////

//// [privacyCheckTypeOfInvisibleModuleNoError.ts]
module Outer {
    module Inner {
        export var m: number;
    }

    export var f: typeof Inner; // Since we dont unwind inner any more, it is error here
}


//// [privacyCheckTypeOfInvisibleModuleNoError.js]
var Outer;
(function (Outer) {
    let Inner;
    (function (Inner) {
    })(Inner || (Inner = {}));
})(Outer || (Outer = {}));
