//// [tests/cases/conformance/jsx/tsxReactEmit8.tsx] ////

//// [tsxReactEmit8.tsx]
/// <reference path="/.lib/react16.d.ts" />

<div>1</div>;
<div key={"key-attr"}>2</div>;


//// [tsxReactEmit8.js]
/// <reference path="react16.d.ts" />
<div>1</div>;
<div key={"key-attr"}>2</div>;
