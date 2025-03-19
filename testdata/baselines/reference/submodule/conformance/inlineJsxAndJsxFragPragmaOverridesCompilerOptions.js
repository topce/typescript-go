//// [tests/cases/conformance/jsx/inline/inlineJsxAndJsxFragPragmaOverridesCompilerOptions.tsx] ////

//// [react.d.ts]
declare global {
    namespace JSX {
        interface IntrinsicElements {
            [e: string]: any;
        }
    }
}
export function createElement(): void;
export function Fragment(): void;

//// [preact.d.ts]
export function h(): void;
export function Frag(): void;

//// [snabbdom.d.ts]
export function h(): void;

//// [reacty.tsx]
import {createElement, Fragment} from "./react";
<><span></span></>

//// [preacty.tsx]
/**
 * @jsx h
 * @jsxFrag Frag
 */
import {h, Frag} from "./preact";
<><div></div></>

//// [snabbdomy.tsx]
/**
 * @jsx h
 * @jsxfrag null
 */
import {h} from "./snabbdom";
<><div></div></>

//// [mix-n-match.tsx]
/* @jsx h */
/* @jsxFrag Fragment */
import {h} from "./preact";
import {Fragment} from "./react";
<><span></span></>

//// [reacty.js]
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
<><span></span></>;
//// [preacty.js]
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
<><div></div></>;
//// [snabbdomy.js]
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
<><div></div></>;
//// [mix-n-match.js]
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
<><span></span></>;
