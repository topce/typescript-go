//// [tests/cases/compiler/augmentedTypesClass3.ts] ////

//// [augmentedTypesClass3.ts]
// class then module
class c5 { public foo() { } }
module c5 { } // should be ok

class c5a { public foo() { } }
module c5a { var y = 2; } // should be ok

class c5b { public foo() { } }
module c5b { export var y = 2; } // should be ok

//// class then import
class c5c { public foo() { } }
//import c5c = require('');

//// [augmentedTypesClass3.js]
// class then module
class c5 {
    foo() { }
}
class c5a {
    foo() { }
}
(function (c5a) {
    var y = 2;
})(c5a || (c5a = {})); // should be ok
class c5b {
    foo() { }
}
(function (c5b) {
    c5b.y = 2;
})(c5b || (c5b = {})); // should be ok
//// class then import
class c5c {
    foo() { }
}
//import c5c = require('');
