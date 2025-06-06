//// [tests/cases/compiler/moduleElementsInWrongContext3.ts] ////

//// [moduleElementsInWrongContext3.ts]
module P {
    {
        module M { }
        export namespace N {
            export interface I { }
        }

        namespace Q.K { }

        declare module "ambient" {

        }

        export = M;

        var v;
        function foo() { }
        export * from "ambient";
        export { foo };
        export { baz as b } from "ambient";
        export default v;
        export default class C { }
        export function bee() { }
        import I = M;
        import I2 = require("foo");
        import * as Foo from "ambient";
        import bar from "ambient";
        import { baz } from "ambient";
        import "ambient";
    }
}

//// [moduleElementsInWrongContext3.js]
var P;
(function (P) {
    {
        export = M;
        var v;
        function foo() { }
        export * from "ambient";
        export { foo };
        export { baz as b } from "ambient";
        export default v;
        class C {
        }
        P.C = C;
        function bee() { }
        P.bee = bee;
        var I = M;
        import I2 = require("foo");
        import * as Foo from "ambient";
        import bar from "ambient";
        import { baz } from "ambient";
        import "ambient";
    }
})(P || (P = {}));
