//// [tests/cases/compiler/parseErrorInHeritageClause1.ts] ////

//// [parseErrorInHeritageClause1.ts]
class C extends A ¬ {
}

//// [parseErrorInHeritageClause1.js]
class C extends A {
}
