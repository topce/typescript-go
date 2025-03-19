//// [tests/cases/conformance/node/nodeModulesSynchronousCallErrors.ts] ////

//// [index.ts]
// cjs format file
import {h} from "../index.js";
import mod = require("../index.js");
import {f as _f} from "./index.js";
import mod2 = require("./index.js");
export async function f() {
    const mod3 = await import ("../index.js");
    const mod4 = await import ("./index.js");
    h();
}
//// [index.ts]
// esm format file
import {h as _h} from "./index.js";
import mod = require("./index.js");
import {f} from "./subfolder/index.js";
import mod2 = require("./subfolder/index.js");
export async function h() {
    const mod3 = await import ("./index.js");
    const mod4 = await import ("./subfolder/index.js");
    f();
}
//// [package.json]
{
    "name": "package",
    "private": true,
    "type": "module"
}
//// [package.json]
{
    "type": "commonjs"
}

//// [index.js]
import { f } from "./subfolder/index.js";
export async function h() {
    const mod3 = await import("./index.js");
    const mod4 = await import("./subfolder/index.js");
    f();
}
//// [index.js]
import { h } from "../index.js";
export async function f() {
    const mod3 = await import("../index.js");
    const mod4 = await import("./index.js");
    h();
}
