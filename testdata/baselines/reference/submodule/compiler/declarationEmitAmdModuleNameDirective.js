//// [tests/cases/compiler/declarationEmitAmdModuleNameDirective.ts] ////

//// [foo.ts]
/// <amd-module name="name_of_foo"/>
export const foo = 1;
//// [bar.ts]
/// <amd-dependency name="name_of_foo" path="./foo" />
import {foo} from './foo';
void foo;

//// [foo.js]
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.foo = void 0;
/// <amd-module name="name_of_foo"/>
exports.foo = 1;
//// [bar.js]
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/// <amd-dependency name="name_of_foo" path="./foo" />
const foo_1 = require("./foo");
void foo_1.foo;


//// [foo.d.ts]
export declare const foo = 1;
//// [bar.d.ts]
export {};
