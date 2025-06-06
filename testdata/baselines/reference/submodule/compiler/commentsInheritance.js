//// [tests/cases/compiler/commentsInheritance.ts] ////

//// [commentsInheritance.ts]
/** i1 is interface with properties*/
interface i1 {
    /** i1_p1*/
    i1_p1: number;
    /** i1_f1*/
    i1_f1(): void;
    /** i1_l1*/
    i1_l1: () => void;
    // il_nc_p1
    i1_nc_p1: number;
    i1_nc_f1(): void;
    i1_nc_l1: () => void;
    p1: number;
    f1(): void;
    l1: () => void;
    nc_p1: number;
    nc_f1(): void;
    nc_l1: () => void;
}
class c1 implements i1 {
    public i1_p1: number;
    // i1_f1
    public i1_f1() {
    }
    public i1_l1: () => void;
    public i1_nc_p1: number;
    public i1_nc_f1() {
    }
    public i1_nc_l1: () => void;
    /** c1_p1*/
    public p1: number;
    /** c1_f1*/
    public f1() {
    }
    /** c1_l1*/
    public l1: () => void;
    /** c1_nc_p1*/
    public nc_p1: number;
    /** c1_nc_f1*/
    public nc_f1() {
    }
    /** c1_nc_l1*/
    public nc_l1: () => void;
}
var i1_i: i1;
var c1_i = new c1();
// assign to interface
i1_i = c1_i;
class c2 {
    /** c2 c2_p1*/
    public c2_p1: number;
    /** c2 c2_f1*/
    public c2_f1() {
    }
    /** c2 c2_prop*/
    public get c2_prop() {
        return 10;
    }
    public c2_nc_p1: number;
    public c2_nc_f1() {
    }
    public get c2_nc_prop() {
        return 10;
    }
    /** c2 p1*/
    public p1: number;
    /** c2 f1*/
    public f1() {
    }
    /** c2 prop*/
    public get prop() {
        return 10;
    }
    public nc_p1: number;
    public nc_f1() {
    }
    public get nc_prop() {
        return 10;
    }
    /** c2 constructor*/
    constructor(a: number) {
        this.c2_p1 = a;
    }
}
class c3 extends c2 {
    constructor() {
        super(10);
    }
    /** c3 p1*/
    public p1: number;
    /** c3 f1*/
    public f1() {
    }
    /** c3 prop*/
    public get prop() {
        return 10;
    }
    public nc_p1: number;
    public nc_f1() {
    }
    public get nc_prop() {
        return 10;
    }
}
var c2_i = new c2(10);
var c3_i = new c3();
// assign
c2_i = c3_i;
class c4 extends c2 {
}
var c4_i = new c4(10);
interface i2 {
    /** i2_p1*/
    i2_p1: number;
    /** i2_f1*/
    i2_f1(): void;
    /** i2_l1*/
    i2_l1: () => void;
    // i2_nc_p1
    i2_nc_p1: number;
    i2_nc_f1(): void;
    i2_nc_l1: () => void;
    /** i2 p1*/
    p1: number;
    /** i2 f1*/
    f1(): void;
    /** i2 l1*/
    l1: () => void;
    nc_p1: number;
    nc_f1(): void;
    nc_l1: () => void;
}
interface i3 extends i2 {
    /** i3 p1 */
    p1: number;
    /**
    * i3 f1
    */
    f1(): void;
    /** i3 l1*/
    l1: () => void;
    nc_p1: number;
    nc_f1(): void;
    nc_l1: () => void;
}
var i2_i: i2;
var i3_i: i3;
// assign to interface
i2_i = i3_i;


//// [commentsInheritance.js]
class c1 {
    i1_p1;
    // i1_f1
    i1_f1() {
    }
    i1_l1;
    i1_nc_p1;
    i1_nc_f1() {
    }
    i1_nc_l1;
    /** c1_p1*/
    p1;
    /** c1_f1*/
    f1() {
    }
    /** c1_l1*/
    l1;
    /** c1_nc_p1*/
    nc_p1;
    /** c1_nc_f1*/
    nc_f1() {
    }
    /** c1_nc_l1*/
    nc_l1;
}
var i1_i;
var c1_i = new c1();
// assign to interface
i1_i = c1_i;
class c2 {
    /** c2 c2_p1*/
    c2_p1;
    /** c2 c2_f1*/
    c2_f1() {
    }
    /** c2 c2_prop*/
    get c2_prop() {
        return 10;
    }
    c2_nc_p1;
    c2_nc_f1() {
    }
    get c2_nc_prop() {
        return 10;
    }
    /** c2 p1*/
    p1;
    /** c2 f1*/
    f1() {
    }
    /** c2 prop*/
    get prop() {
        return 10;
    }
    nc_p1;
    nc_f1() {
    }
    get nc_prop() {
        return 10;
    }
    /** c2 constructor*/
    constructor(a) {
        this.c2_p1 = a;
    }
}
class c3 extends c2 {
    constructor() {
        super(10);
    }
    /** c3 p1*/
    p1;
    /** c3 f1*/
    f1() {
    }
    /** c3 prop*/
    get prop() {
        return 10;
    }
    nc_p1;
    nc_f1() {
    }
    get nc_prop() {
        return 10;
    }
}
var c2_i = new c2(10);
var c3_i = new c3();
// assign
c2_i = c3_i;
class c4 extends c2 {
}
var c4_i = new c4(10);
var i2_i;
var i3_i;
// assign to interface
i2_i = i3_i;


//// [commentsInheritance.d.ts]
/** i1 is interface with properties*/
interface i1 {
    /** i1_p1*/
    i1_p1: number;
    /** i1_f1*/
    i1_f1(): void;
    /** i1_l1*/
    i1_l1: () => void;
    // il_nc_p1
    i1_nc_p1: number;
    i1_nc_f1(): void;
    i1_nc_l1: () => void;
    p1: number;
    f1(): void;
    l1: () => void;
    nc_p1: number;
    nc_f1(): void;
    nc_l1: () => void;
}
declare class c1 implements i1 {
    i1_p1: number;
    // i1_f1
    i1_f1(): void;
    i1_l1: () => void;
    i1_nc_p1: number;
    i1_nc_f1(): void;
    i1_nc_l1: () => void;
    /** c1_p1*/
    p1: number;
    /** c1_f1*/
    f1(): void;
    /** c1_l1*/
    l1: () => void;
    /** c1_nc_p1*/
    nc_p1: number;
    /** c1_nc_f1*/
    nc_f1(): void;
    /** c1_nc_l1*/
    nc_l1: () => void;
}
declare var i1_i: i1;
declare var c1_i: c1;
declare class c2 {
    /** c2 c2_p1*/
    c2_p1: number;
    /** c2 c2_f1*/
    c2_f1(): void;
    /** c2 c2_prop*/
    get c2_prop(): number;
    c2_nc_p1: number;
    c2_nc_f1(): void;
    get c2_nc_prop(): number;
    /** c2 p1*/
    p1: number;
    /** c2 f1*/
    f1(): void;
    /** c2 prop*/
    get prop(): number;
    nc_p1: number;
    nc_f1(): void;
    get nc_prop(): number;
    /** c2 constructor*/
    constructor(a: number);
}
declare class c3 extends c2 {
    constructor();
    /** c3 p1*/
    p1: number;
    /** c3 f1*/
    f1(): void;
    /** c3 prop*/
    get prop(): number;
    nc_p1: number;
    nc_f1(): void;
    get nc_prop(): number;
}
declare var c2_i: c2;
declare var c3_i: c3;
declare class c4 extends c2 {
}
declare var c4_i: c4;
interface i2 {
    /** i2_p1*/
    i2_p1: number;
    /** i2_f1*/
    i2_f1(): void;
    /** i2_l1*/
    i2_l1: () => void;
    // i2_nc_p1
    i2_nc_p1: number;
    i2_nc_f1(): void;
    i2_nc_l1: () => void;
    /** i2 p1*/
    p1: number;
    /** i2 f1*/
    f1(): void;
    /** i2 l1*/
    l1: () => void;
    nc_p1: number;
    nc_f1(): void;
    nc_l1: () => void;
}
interface i3 extends i2 {
    /** i3 p1 */
    p1: number;
    /**
    * i3 f1
    */
    f1(): void;
    /** i3 l1*/
    l1: () => void;
    nc_p1: number;
    nc_f1(): void;
    nc_l1: () => void;
}
declare var i2_i: i2;
declare var i3_i: i3;
