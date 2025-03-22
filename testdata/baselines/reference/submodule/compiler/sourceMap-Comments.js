//// [tests/cases/compiler/sourceMap-Comments.ts] ////

//// [sourceMap-Comments.ts]
module sas.tools {
    export class Test {
        public doX(): void {
            let f: number = 2;
            switch (f) {
                case 1:
                    break;
                case 2:
                    //line comment 1
                    //line comment 2
                    break;
                case 3:
                    //a comment
                    break;
            }
        }
    }

}


//// [sourceMap-Comments.js]
var sas;
(function (sas) {
    let tools;
    (function (tools) {
        class Test {
            doX() {
                let f = 2;
                switch (f) {
                    case 1:
                        break;
                    case 2:
                        //line comment 1
                        //line comment 2
                        break;
                    case 3:
                        //a comment
                        break;
                }
            }
        }
        tools.Test = Test;
    })(tools = sas.tools || (sas.tools = {}));
})(sas || (sas = {}));
