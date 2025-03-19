//// [tests/cases/compiler/tsxStatelessComponentDefaultProps.tsx] ////

//// [tsxStatelessComponentDefaultProps.tsx]
/// <reference path="/.lib/react16.d.ts" />

import React from 'react';
interface Props {
    text: string;
}

function BackButton(_props: Props) {
    return <div />
}
BackButton.defaultProps = {
    text: 'Go Back',
};
let a = <BackButton />


//// [tsxStatelessComponentDefaultProps.js]
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function BackButton(_props) {
    return <div />;
}
BackButton.defaultProps = {
    text: 'Go Back',
};
let a = <BackButton />;
