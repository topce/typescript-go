//// [tests/cases/conformance/async/es6/awaitBinaryExpression/awaitBinaryExpression2_es6.ts] ////

//// [awaitBinaryExpression2_es6.ts]
declare var a: boolean;
declare var p: Promise<boolean>;
declare function before(): void;
declare function after(): void;
async function func(): Promise<void> {
    before();
    var b = await p && a;
    after();
}

//// [awaitBinaryExpression2_es6.js]
async function func() {
    before();
    var b = await p && a;
    after();
}
