//// [tests/cases/compiler/forLoopEndingMultilineComments.ts] ////

//// [forLoopEndingMultilineComments.ts]
declare var a: any;

export function consoleTestResultHandler(testResult: any): boolean {
    // needed to get colors to show up when passing through Grunt
    void a;

    for (const q of a) {
        void a;

        /* eslint-disable no-console */
        if (a) {
        } else {
        }
        /* eslint-enable no-console */
    }

    return true;
}

//// [forLoopEndingMultilineComments.js]
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.consoleTestResultHandler = consoleTestResultHandler;
function consoleTestResultHandler(testResult) {
    // needed to get colors to show up when passing through Grunt
    void a;
    for (const q of a) {
        void a;
        /* eslint-disable no-console */
        if (a) {
        }
        else {
        }
        /* eslint-enable no-console */
    }
    return true;
}
