/**
 * test.ts — strictArity end-to-end test
 *
 * Each case assigns a function with FEWER params to a target
 * expecting MORE. Without --strictArity all pass (callback compat).
 * With the matching --strictArity flag, the case fails.
 *
 * Usage:
 *   tsgo --noEmit test-arity/test.ts                  # all PASS
 *   tsgo --noEmit --strictArity all test-arity/test.ts # all FAIL
 *   tsgo --noEmit --strictArity <kind> test-arity/test.ts
 */

// ── 1. CallSignature ────────────────────────────────────────
interface Callable { (name: string, count: number): boolean; }
const _s1: Callable = (name: string) => true;                /* callsignature */

// ── 2. ConstructSignature ───────────────────────────────────
interface Ctor { new (x: number, y: number): { x: number; y: number }; }
class CtorImpl { x = 0; y = 0; constructor() {} }
const _s2: Ctor = CtorImpl;                                   /* constructsignature */

// ── 3. MethodSignature ──────────────────────────────────────
interface IMethods { greet(name: string, times: number): string; }
const _s3: IMethods = {
  greet(name: string) { return `Hi ${name}`; },             /* methodsignature */
};

// ── 4. MethodDeclaration ────────────────────────────────────
class BaseCalc { add(a: number, b: number): number { return a + b; } }
class OverridingCalc extends BaseCalc {
  override add(a: number): number { return a + 1; }          /* methoddeclaration */
}

// ── 5. Constructor ──────────────────────────────────────────
class BaseCtor { constructor(x: number, y: number) {} }
const _s5: typeof BaseCtor = class { constructor() {} };      /* constructor */

// ── 6. FunctionDeclaration ──────────────────────────────────
function handler(a: number, b: number): void {}
const _s6: typeof handler = (a: number) => {};              /* functiondeclaration */

// ── 7. FunctionExpression ───────────────────────────────────
const exprTarget = function (a: number, b: number): void {};
const _s7: typeof exprTarget = function (a: number) {};     /* functionexpression */

// ── 8. ArrowFunction ────────────────────────────────────────
const arrowTarget = (a: number, b: number): void => {};
const _s8: typeof arrowTarget = (a: number) => {};           /* arrowfunction */

// ── 9. IndexSignature ───────────────────────────────────────
type StringMapper = { [K: string]: string };
const _s9: StringMapper = {};                                /* indexsignature */

// ── 10. FunctionType ────────────────────────────────────────
type BinaryOp = (a: number, b: number) => number;
const _s10: BinaryOp = (a: number) => a;                     /* functiontype */

// ── 11. ConstructorType ─────────────────────────────────────
type WidgetCtor = new (w: number, h: number) => { w: number; h: number };
class SimpleWidget { w = 0; h = 0; constructor() {} }
const _s11: WidgetCtor = SimpleWidget;                        /* constructortype */

// ── 12. JSDocFunctionType ───────────────────────────────────
/** @callback Processor @param {string} input @param {number} times @returns {string} */
/** @type {Processor} */
const _s12 = (input: string) => input;                      /* jsdocfunctiontype */

// ── 13. JSDocSignature ──────────────────────────────────────
/** @callback AsyncOp @param {string} url @param {object} options @returns {void} */
function fetchData(url: string, cb: (u: string, o: object) => void) { cb(url, {}); }
fetchData("/api", (url: string) => {});                      /* jsdocsignature */
