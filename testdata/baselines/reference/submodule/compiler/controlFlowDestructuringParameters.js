//// [tests/cases/compiler/controlFlowDestructuringParameters.ts] ////

//// [controlFlowDestructuringParameters.ts]
// Repro for #8376


[{ x: 1 }].map(
  ({ x }) => x
);


//// [controlFlowDestructuringParameters.js]
// Repro for #8376
[{ x: 1 }].map(({ x }) => x);
