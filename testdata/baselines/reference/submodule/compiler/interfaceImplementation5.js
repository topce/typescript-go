//// [tests/cases/compiler/interfaceImplementation5.ts] ////

//// [interfaceImplementation5.ts]
interface I1 {
    getset1:number;
}

class C1 implements I1 {
    public get getset1(){return 1;}
}

class C2 implements I1 {
    public set getset1(baz:number){}
}

class C3 implements I1 {
    public get getset1(){return 1;}
    public set getset1(baz:number){}
}

class C4 implements I1 {
    public get getset1(){var x:any; return x;}
}

class C5 implements I1 {
    public set getset1(baz:any){}
}

class C6 implements I1 {
    public set getset1(baz:any){}
    public get getset1(){var x:any; return x;}
}



//// [interfaceImplementation5.js]
class C1 {
    get getset1() { return 1; }
}
class C2 {
    set getset1(baz) { }
}
class C3 {
    get getset1() { return 1; }
    set getset1(baz) { }
}
class C4 {
    get getset1() { var x; return x; }
}
class C5 {
    set getset1(baz) { }
}
class C6 {
    set getset1(baz) { }
    get getset1() { var x; return x; }
}
