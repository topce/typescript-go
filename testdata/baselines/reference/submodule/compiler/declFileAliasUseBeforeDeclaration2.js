//// [tests/cases/compiler/declFileAliasUseBeforeDeclaration2.ts] ////

//// [declFileAliasUseBeforeDeclaration2.ts]
declare module "test" {
    module A {
        class C {
        }
    }
    class B extends E {
    }
    import E = A.C;
}

//// [declFileAliasUseBeforeDeclaration2.js]
