//// [tests/cases/compiler/assignToObjectTypeWithPrototypeProperty.ts] ////

//// [assignToObjectTypeWithPrototypeProperty.ts]
class XEvent {}
var p: XEvent = XEvent.prototype;
var x: {prototype: XEvent} = XEvent;

//// [assignToObjectTypeWithPrototypeProperty.js]
class XEvent {
}
var p = XEvent.prototype;
var x = XEvent;
