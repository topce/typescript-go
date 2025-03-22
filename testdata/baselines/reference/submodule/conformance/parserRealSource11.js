//// [tests/cases/conformance/parser/ecmascript5/parserRealSource11.ts] ////

//// [parserRealSource11.ts]
// Copyright (c) Microsoft. All rights reserved. Licensed under the Apache License, Version 2.0. 
// See LICENSE.txt in the project root for complete license information.

///<reference path='typescript.ts' />

module TypeScript {
    export class ASTSpan {
        public minChar: number = -1;  // -1 = "undefined" or "compiler generated"
        public limChar: number = -1;  // -1 = "undefined" or "compiler generated"   
    }

    export class AST extends ASTSpan {
        public type: Type = null;
        public flags = ASTFlags.Writeable;

        // REVIEW: for diagnostic purposes
        public passCreated: number = CompilerDiagnostics.analysisPass;

        public preComments: Comment[] = null;
        public postComments: Comment[] = null;

        public isParenthesized = false;

        constructor (public nodeType: NodeType) {
            super();
        }

        public isExpression() { return false; }

        public isStatementOrExpression() { return false; }

        public isCompoundStatement() { return false; }

        public isLeaf() { return this.isStatementOrExpression() && (!this.isCompoundStatement()); }

        public typeCheck(typeFlow: TypeFlow) {
            switch (this.nodeType) {
                case NodeType.Error:
                case NodeType.EmptyExpr:
                    this.type = typeFlow.anyType;
                    break;
                case NodeType.This:
                    return typeFlow.typeCheckThis(this);
                case NodeType.Null:
                    this.type = typeFlow.nullType;
                    break;
                case NodeType.False:
                case NodeType.True:
                    this.type = typeFlow.booleanType;
                    break;
                case NodeType.Super:
                    return typeFlow.typeCheckSuper(this);
                case NodeType.EndCode:
                case NodeType.Empty:
                case NodeType.Void:
                    this.type = typeFlow.voidType;
                    break;
                default:
                    throw new Error("please implement in derived class");
            }
            return this;
        }

        public emit(emitter: Emitter, tokenId: TokenID, startLine: boolean) {
            emitter.emitParensAndCommentsInPlace(this, true);
            switch (this.nodeType) {
                case NodeType.This:
                    emitter.recordSourceMappingStart(this);
                    if (emitter.thisFnc && (hasFlag(emitter.thisFnc.fncFlags, FncFlags.IsFatArrowFunction))) {
                        emitter.writeToOutput("_this");
                    }
                    else {
                        emitter.writeToOutput("this");
                    }
                    emitter.recordSourceMappingEnd(this);
                    break;
                case NodeType.Null:
                    emitter.recordSourceMappingStart(this);
                    emitter.writeToOutput("null");
                    emitter.recordSourceMappingEnd(this);
                    break;
                case NodeType.False:
                    emitter.recordSourceMappingStart(this);
                    emitter.writeToOutput("false");
                    emitter.recordSourceMappingEnd(this);
                    break;
                case NodeType.True:
                    emitter.recordSourceMappingStart(this);
                    emitter.writeToOutput("true");
                    emitter.recordSourceMappingEnd(this);
                    break;
                case NodeType.Super:
                    emitter.recordSourceMappingStart(this);
                    emitter.emitSuperReference();
                    emitter.recordSourceMappingEnd(this);
                    break;
                case NodeType.EndCode:
                    break;
                case NodeType.Error:
                case NodeType.EmptyExpr:
                    break;

                case NodeType.Empty:
                    emitter.recordSourceMappingStart(this);
                    emitter.writeToOutput("; ");
                    emitter.recordSourceMappingEnd(this);
                    break;
                case NodeType.Void:
                    emitter.recordSourceMappingStart(this);
                    emitter.writeToOutput("void ");
                    emitter.recordSourceMappingEnd(this);
                    break;
                default:
                    throw new Error("please implement in derived class");
            }
            emitter.emitParensAndCommentsInPlace(this, false);
        }

        public print(context: PrintContext) {
            context.startLine();
            var lineCol = { line: -1, col: -1 };
            var limLineCol = { line: -1, col: -1 };
            if (context.parser !== null) {
                context.parser.getSourceLineCol(lineCol, this.minChar);
                context.parser.getSourceLineCol(limLineCol, this.limChar);
                context.write("(" + lineCol.line + "," + lineCol.col + ")--" +
                              "(" + limLineCol.line + "," + limLineCol.col + "): ");
            }
            var lab = this.printLabel();
            if (hasFlag(this.flags, ASTFlags.Error)) {
                lab += " (Error)";
            }
            context.writeLine(lab);
        }

        public printLabel() {
            if (nodeTypeTable[this.nodeType] !== undefined) {
                return nodeTypeTable[this.nodeType];
            }
            else {
                return (<any>NodeType)._map[this.nodeType];
            }
        }

        public addToControlFlow(context: ControlFlowContext): void {
            // by default, AST adds itself to current basic block and does not check its children
            context.walker.options.goChildren = false;
            context.addContent(this);
        }

        public netFreeUses(container: Symbol, freeUses: StringHashTable) {
        }

        public treeViewLabel() {
            return (<any>NodeType)._map[this.nodeType];
        }

        public static getResolvedIdentifierName(name: string): string {
            if (!name) return "";

            var resolved = "";
            var start = 0;
            var i = 0;
            while(i <= name.length - 6) {
                // Look for escape sequence \uxxxx
                if (name.charAt(i) == '\\' && name.charAt(i+1) == 'u') {
                    var charCode = parseInt(name.substr(i + 2, 4), 16);
                    resolved += name.substr(start, i - start);
                    resolved += String.fromCharCode(charCode);
                    i += 6;
                    start = i;
                    continue;
                } 
                i++;
            }
            // Append remaining string
            resolved += name.substring(start);
            return resolved;
        }
    }

    export class IncompleteAST extends AST {
        constructor (min: number, lim: number) {
            super(NodeType.Error);

            this.minChar = min;
            this.limChar = lim;
        }
    }

    export class ASTList extends AST {
        public enclosingScope: SymbolScope = null;
        public members: AST[] = new AST[];

        constructor () {
            super(NodeType.List);
        }

        public addToControlFlow(context: ControlFlowContext) {
            var len = this.members.length;
            for (var i = 0; i < len; i++) {
                if (context.noContinuation) {
                    context.addUnreachable(this.members[i]);
                    break;
                }
                else {
                    this.members[i] = context.walk(this.members[i], this);
                }
            }
            context.walker.options.goChildren = false;
        }

        public append(ast: AST) {
            this.members[this.members.length] = ast;
            return this;
        }

        public appendAll(ast: AST) {
            if (ast.nodeType == NodeType.List) {
                var list = <ASTList>ast;
                for (var i = 0, len = list.members.length; i < len; i++) {
                    this.append(list.members[i]);
                }
            }
            else {
                this.append(ast);
            }
            return this;
        }

        public emit(emitter: Emitter, tokenId: TokenID, startLine: boolean) {
            emitter.recordSourceMappingStart(this);
            emitter.emitJavascriptList(this, null, TokenID.Semicolon, startLine, false, false);
            emitter.recordSourceMappingEnd(this);
        }

        public typeCheck(typeFlow: TypeFlow) {
            var len = this.members.length;
            typeFlow.nestingLevel++;
            for (var i = 0; i < len; i++) {
                if (this.members[i]) {
                    this.members[i] = this.members[i].typeCheck(typeFlow);
                }
            }
            typeFlow.nestingLevel--;
            return this;
        }
    }

    export class Identifier extends AST {
        public sym: Symbol = null;
        public cloId = -1;
        public text: string;

        // 'actualText' is the text that the user has entered for the identifier. the text might 
        // include any Unicode escape sequences (e.g.: \u0041 for 'A'). 'text', however, contains 
        // the resolved value of any escape sequences in the actual text; so in the previous 
        // example, actualText = '\u0041', text = 'A'.
        //
        // For purposes of finding a symbol, use text, as this will allow you to match all 
        // variations of the variable text. For full-fidelity translation of the user input, such
        // as emitting, use the actualText field.
        // 
        // Note: 
        //    To change text, and to avoid running into a situation where 'actualText' does not 
        //    match 'text', always use setText.
        constructor (public actualText: string, public hasEscapeSequence?: boolean) {
            super(NodeType.Name);
            this.setText(actualText, hasEscapeSequence);
        }

        public setText(actualText: string, hasEscapeSequence?: boolean) {
            this.actualText = actualText;
            if (hasEscapeSequence) {
                this.text = AST.getResolvedIdentifierName(actualText);
            }
            else {
                this.text = actualText;
            }
        }

        public isMissing() { return false; }
        public isLeaf() { return true; }

        public treeViewLabel() {
            return "id: " + this.actualText;
        }

        public printLabel() {
            if (this.actualText) {
                return "id: " + this.actualText;
            }
            else {
                return "name node";
            }
        }

        public typeCheck(typeFlow: TypeFlow) {
            return typeFlow.typeCheckName(this);
        }

        public emit(emitter: Emitter, tokenId: TokenID, startLine: boolean) {
            emitter.emitJavascriptName(this, true);
        }

        public static fromToken(token: Token): Identifier {
            return new Identifier(token.getText(), (<IdentifierToken>token).hasEscapeSequence);
        }
    }

    export class MissingIdentifier extends Identifier {
        constructor () {
            super("__missing");
        }

        public isMissing() {
            return true;
        }

        public emit(emitter: Emitter, tokenId: TokenID, startLine: boolean) {
            // Emit nothing for a missing ID
        }
    }

    export class Label extends AST {
        constructor (public id: Identifier) {
            super(NodeType.Label);
        }

        public printLabel() { return this.id.actualText + ":"; }

        public typeCheck(typeFlow: TypeFlow) {
            this.type = typeFlow.voidType;
            return this;
        }

        public emit(emitter: Emitter, tokenId: TokenID, startLine: boolean) {
            emitter.emitParensAndCommentsInPlace(this, true);
            emitter.recordSourceMappingStart(this);
            emitter.recordSourceMappingStart(this.id);
            emitter.writeToOutput(this.id.actualText);
            emitter.recordSourceMappingEnd(this.id);
            emitter.writeLineToOutput(":");
            emitter.recordSourceMappingEnd(this);
            emitter.emitParensAndCommentsInPlace(this, false);
        }
    }

    export class Expression extends AST {
        constructor (nodeType: NodeType) {
            super(nodeType);
        }

        public isExpression() { return true; }

        public isStatementOrExpression() { return true; }
    }

    export class UnaryExpression extends Expression {
        public targetType: Type = null; // Target type for an object literal (null if no target type)
        public castTerm: AST = null;

        constructor (nodeType: NodeType, public operand: AST) {
            super(nodeType);
        }

        public addToControlFlow(context: ControlFlowContext): void {
            super.addToControlFlow(context);
            // TODO: add successor as catch block/finally block if present
            if (this.nodeType == NodeType.Throw) {
                context.returnStmt();
            }
        }

        public typeCheck(typeFlow: TypeFlow) {
            switch (this.nodeType) {
                case NodeType.Not:
                    return typeFlow.typeCheckBitNot(this);

                case NodeType.LogNot:
                    return typeFlow.typeCheckLogNot(this);

                case NodeType.Pos:
                case NodeType.Neg:
                    return typeFlow.typeCheckUnaryNumberOperator(this);

                case NodeType.IncPost:
                case NodeType.IncPre:
                case NodeType.DecPost:
                case NodeType.DecPre:
                    return typeFlow.typeCheckIncOrDec(this);

                case NodeType.ArrayLit:
                    typeFlow.typeCheckArrayLit(this);
                    return this;

                case NodeType.ObjectLit:
                    typeFlow.typeCheckObjectLit(this);
                    return this;

                case NodeType.Throw:
                    this.operand = typeFlow.typeCheck(this.operand);
                    this.type = typeFlow.voidType;
                    return this;

                case NodeType.Typeof:
                    this.operand = typeFlow.typeCheck(this.operand);
                    this.type = typeFlow.stringType;
                    return this;

                case NodeType.Delete:
                    this.operand = typeFlow.typeCheck(this.operand);
                    this.type = typeFlow.booleanType;
                    break;

                case NodeType.TypeAssertion:
                    this.castTerm = typeFlow.typeCheck(this.castTerm);
                    var applyTargetType = !this.operand.isParenthesized;

                    var targetType = applyTargetType ? this.castTerm.type : null;

                    typeFlow.checker.typeCheckWithContextualType(targetType, typeFlow.checker.inProvisionalTypecheckMode(), true, this.operand);
                    typeFlow.castWithCoercion(this.operand, this.castTerm.type, false, true);
                    this.type = this.castTerm.type;
                    return this;

                case NodeType.Void:
                    // REVIEW - Although this is good to do for completeness's sake,
                    // this shouldn't be strictly necessary from the void operator's
                    // point of view
                    this.operand = typeFlow.typeCheck(this.operand);
                    this.type = typeFlow.checker.undefinedType;
                    break;

                default:
                    throw new Error("please implement in derived class");
            }
            return this;
        }

        public emit(emitter: Emitter, tokenId: TokenID, startLine: boolean) {
            emitter.emitParensAndCommentsInPlace(this, true);
            emitter.recordSourceMappingStart(this);
            switch (this.nodeType) {
                case NodeType.IncPost:
                    emitter.emitJavascript(this.operand, TokenID.PlusPlus, false);
                    emitter.writeToOutput("++");
                    break;
                case NodeType.LogNot:
                    emitter.writeToOutput("!");
                    emitter.emitJavascript(this.operand, TokenID.Exclamation, false);
                    break;
                case NodeType.DecPost:
                    emitter.emitJavascript(this.operand, TokenID.MinusMinus, false);
                    emitter.writeToOutput("--");
                    break;
                case NodeType.ObjectLit:
                    emitter.emitObjectLiteral(<ASTList>this.operand);
                    break;
                case NodeType.ArrayLit:
                    emitter.emitArrayLiteral(<ASTList>this.operand);
                    break;
                case NodeType.Not:
                    emitter.writeToOutput("~");
                    emitter.emitJavascript(this.operand, TokenID.Tilde, false);
                    break;
                case NodeType.Neg:
                    emitter.writeToOutput("-");
                    if (this.operand.nodeType == NodeType.Neg) {
                        this.operand.isParenthesized = true;
                    }
                    emitter.emitJavascript(this.operand, TokenID.Minus, false);
                    break;
                case NodeType.Pos:
                    emitter.writeToOutput("+");
                    if (this.operand.nodeType == NodeType.Pos) {
                        this.operand.isParenthesized = true;
                    }
                    emitter.emitJavascript(this.operand, TokenID.Plus, false);
                    break;
                case NodeType.IncPre:
                    emitter.writeToOutput("++");
                    emitter.emitJavascript(this.operand, TokenID.PlusPlus, false);
                    break;
                case NodeType.DecPre:
                    emitter.writeToOutput("--");
                    emitter.emitJavascript(this.operand, TokenID.MinusMinus, false);
                    break;
                case NodeType.Throw:
                    emitter.writeToOutput("throw ");
                    emitter.emitJavascript(this.operand, TokenID.Tilde, false);
                    emitter.writeToOutput(";");
                    break;
                case NodeType.Typeof:
                    emitter.writeToOutput("typeof ");
                    emitter.emitJavascript(this.operand, TokenID.Tilde, false);
                    break;
                case NodeType.Delete:
                    emitter.writeToOutput("delete ");
                    emitter.emitJavascript(this.operand, TokenID.Tilde, false);
                    break;
                case NodeType.Void:
                    emitter.writeToOutput("void ");
                    emitter.emitJavascript(this.operand, TokenID.Tilde, false);
                    break;
                case NodeType.TypeAssertion:
                    emitter.emitJavascript(this.operand, TokenID.Tilde, false);
                    break;
                default:
                    throw new Error("please implement in derived class");
            }
            emitter.recordSourceMappingEnd(this);
            emitter.emitParensAndCommentsInPlace(this, false);
        }
    }

    export class CallExpression extends Expression {
        constructor (nodeType: NodeType,
                     public target: AST,
                     public arguments: ASTList) {
            super(nodeType);
            this.minChar = this.target.minChar;
        }

        public signature: Signature = null;

        public typeCheck(typeFlow: TypeFlow) {
            if (this.nodeType == NodeType.New) {
                return typeFlow.typeCheckNew(this);
            }
            else {
                return typeFlow.typeCheckCall(this);
            }
        }

        public emit(emitter: Emitter, tokenId: TokenID, startLine: boolean) {
            emitter.emitParensAndCommentsInPlace(this, true);
            emitter.recordSourceMappingStart(this);

            if (this.nodeType == NodeType.New) {
                emitter.emitNew(this.target, this.arguments);
            }
            else {
                emitter.emitCall(this, this.target, this.arguments);
            }

            emitter.recordSourceMappingEnd(this);
            emitter.emitParensAndCommentsInPlace(this, false);
        }
    }

    export class BinaryExpression extends Expression {
        constructor (nodeType: NodeType, public operand1: AST, public operand2: AST) {
            super(nodeType);
        }

        public typeCheck(typeFlow: TypeFlow) {
            switch (this.nodeType) {
                case NodeType.Dot:
                    return typeFlow.typeCheckDotOperator(this);
                case NodeType.Asg:
                    return typeFlow.typeCheckAsgOperator(this);
                case NodeType.Add:
                case NodeType.Sub:
                case NodeType.Mul:
                case NodeType.Div:
                case NodeType.Mod:
                case NodeType.Or:
                case NodeType.And:
                    return typeFlow.typeCheckArithmeticOperator(this, false);
                case NodeType.Xor:
                    return typeFlow.typeCheckBitwiseOperator(this, false);
                case NodeType.Ne:
                case NodeType.Eq:
                    var text: string;
                    if (typeFlow.checker.styleSettings.eqeqeq) {
                        text = nodeTypeTable[this.nodeType];
                        typeFlow.checker.errorReporter.styleError(this, "use of " + text);
                    }
                    else if (typeFlow.checker.styleSettings.eqnull) {
                        text = nodeTypeTable[this.nodeType];
                        if ((this.operand2 !== null) && (this.operand2.nodeType == NodeType.Null)) {
                            typeFlow.checker.errorReporter.styleError(this, "use of " + text + " to compare with null");
                        }
                    }
                case NodeType.Eqv:
                case NodeType.NEqv:
                case NodeType.Lt:
                case NodeType.Le:
                case NodeType.Ge:
                case NodeType.Gt:
                    return typeFlow.typeCheckBooleanOperator(this);
                case NodeType.Index:
                    return typeFlow.typeCheckIndex(this);
                case NodeType.Member:
                    this.type = typeFlow.voidType;
                    return this;
                case NodeType.LogOr:
                    return typeFlow.typeCheckLogOr(this);
                case NodeType.LogAnd:
                    return typeFlow.typeCheckLogAnd(this);
                case NodeType.AsgAdd:
                case NodeType.AsgSub:
                case NodeType.AsgMul:
                case NodeType.AsgDiv:
                case NodeType.AsgMod:
                case NodeType.AsgOr:
                case NodeType.AsgAnd:
                    return typeFlow.typeCheckArithmeticOperator(this, true);
                case NodeType.AsgXor:
                    return typeFlow.typeCheckBitwiseOperator(this, true);
                case NodeType.Lsh:
                case NodeType.Rsh:
                case NodeType.Rs2:
                    return typeFlow.typeCheckShift(this, false);
                case NodeType.AsgLsh:
                case NodeType.AsgRsh:
                case NodeType.AsgRs2:
                    return typeFlow.typeCheckShift(this, true);
                case NodeType.Comma:
                    return typeFlow.typeCheckCommaOperator(this);
                case NodeType.InstOf:
                    return typeFlow.typeCheckInstOf(this);
                case NodeType.In:
                    return typeFlow.typeCheckInOperator(this);
                case NodeType.From:
                    typeFlow.checker.errorReporter.simpleError(this, "Illegal use of 'from' keyword in binary expression");
                    break;
                default:
                    throw new Error("please implement in derived class");
            }
            return this;
        }

        public emit(emitter: Emitter, tokenId: TokenID, startLine: boolean) {
            var binTokenId = nodeTypeToTokTable[this.nodeType];

            emitter.emitParensAndCommentsInPlace(this, true);
            emitter.recordSourceMappingStart(this);
            if (binTokenId != undefined) {

                emitter.emitJavascript(this.operand1, binTokenId, false);

                if (tokenTable[binTokenId].text == "instanceof") {
                    emitter.writeToOutput(" instanceof ");
                }
                else if (tokenTable[binTokenId].text == "in") {
                    emitter.writeToOutput(" in ");
                }
                else {
                    emitter.writeToOutputTrimmable(" " + tokenTable[binTokenId].text + " ");
                }

                emitter.emitJavascript(this.operand2, binTokenId, false);
            }
            else {
                switch (this.nodeType) {
                    case NodeType.Dot:
                        if (!emitter.tryEmitConstant(this)) {
                            emitter.emitJavascript(this.operand1, TokenID.Dot, false);
                            emitter.writeToOutput(".");
                            emitter.emitJavascriptName(<Identifier>this.operand2, false);
                        }
                        break;
                    case NodeType.Index:
                        emitter.emitIndex(this.operand1, this.operand2);
                        break;

                    case NodeType.Member:
                        if (this.operand2.nodeType == NodeType.FuncDecl && (<FuncDecl>this.operand2).isAccessor()) {
                            var funcDecl = <FuncDecl>this.operand2;
                            if (hasFlag(funcDecl.fncFlags, FncFlags.GetAccessor)) {
                                emitter.writeToOutput("get ");
                            }
                            else {
                                emitter.writeToOutput("set ");
                            }
                            emitter.emitJavascript(this.operand1, TokenID.Colon, false);
                        }
                        else {
                            emitter.emitJavascript(this.operand1, TokenID.Colon, false);
                            emitter.writeToOutputTrimmable(": ");
                        }
                        emitter.emitJavascript(this.operand2, TokenID.Comma, false);
                        break;
                    case NodeType.Comma:
                        emitter.emitJavascript(this.operand1, TokenID.Comma, false);
                        if (emitter.emitState.inObjectLiteral) {
                            emitter.writeLineToOutput(", ");
                        }
                        else {
                            emitter.writeToOutput(",");
                        }
                        emitter.emitJavascript(this.operand2, TokenID.Comma, false);
                        break;
                    case NodeType.Is:
                        throw new Error("should be de-sugared during type check");
                    default:
                        throw new Error("please implement in derived class");
                }
            }
            emitter.recordSourceMappingEnd(this);
            emitter.emitParensAndCommentsInPlace(this, false);
        }
    }

    export class ConditionalExpression extends Expression {
        constructor (public operand1: AST,
                     public operand2: AST,
                     public operand3: AST) {
            super(NodeType.ConditionalExpression);
        }

        public typeCheck(typeFlow: TypeFlow) {
            return typeFlow.typeCheckQMark(this);
        }

        public emit(emitter: Emitter, tokenId: TokenID, startLine: boolean) {
            emitter.emitParensAndCommentsInPlace(this, true);
            emitter.recordSourceMappingStart(this);
            emitter.emitJavascript(this.operand1, TokenID.Question, false);
            emitter.writeToOutput(" ? ");
            emitter.emitJavascript(this.operand2, TokenID.Question, false);
            emitter.writeToOutput(" : ");
            emitter.emitJavascript(this.operand3, TokenID.Question, false);
            emitter.recordSourceMappingEnd(this);
            emitter.emitParensAndCommentsInPlace(this, false);
        }
    }

    export class NumberLiteral extends Expression {
        constructor (public value: number, public hasEmptyFraction?: boolean) {
            super(NodeType.NumberLit);
        }

        public isNegativeZero = false;

        public typeCheck(typeFlow: TypeFlow) {
            this.type = typeFlow.doubleType;
            return this;
        }

        public treeViewLabel() {
            return "num: " + this.printLabel();
        }

        public emit(emitter: Emitter, tokenId: TokenID, startLine: boolean) {
            emitter.emitParensAndCommentsInPlace(this, true);
            emitter.recordSourceMappingStart(this);
            if (this.isNegativeZero) {
                emitter.writeToOutput("-");
            }

            emitter.writeToOutput(this.value.toString());

            if (this.hasEmptyFraction)
                emitter.writeToOutput(".0");

            emitter.recordSourceMappingEnd(this);
            emitter.emitParensAndCommentsInPlace(this, false);
        }

        public printLabel() {
            if (Math.floor(this.value) != this.value) {
                return this.value.toFixed(2).toString();
            }
            else if (this.hasEmptyFraction) {
                return this.value.toString() + ".0";
            }
            else {
                return this.value.toString();
            }
        }
    }

    export class RegexLiteral extends Expression {
        constructor (public regex) {
            super(NodeType.Regex);
        }
        
        public typeCheck(typeFlow: TypeFlow) {
            this.type = typeFlow.regexType;
            return this;
        }

        public emit(emitter: Emitter, tokenId: TokenID, startLine: boolean) {
            emitter.emitParensAndCommentsInPlace(this, true);
            emitter.recordSourceMappingStart(this);
            emitter.writeToOutput(this.regex.toString());
            emitter.recordSourceMappingEnd(this);
            emitter.emitParensAndCommentsInPlace(this, false);
        }
    }

    export class StringLiteral extends Expression {
        constructor (public text: string) {
            super(NodeType.QString);
        }

        public emit(emitter: Emitter, tokenId: TokenID, startLine: boolean) {
            emitter.emitParensAndCommentsInPlace(this, true);
            emitter.recordSourceMappingStart(this);
            emitter.emitStringLiteral(this.text);
            emitter.recordSourceMappingEnd(this);
            emitter.emitParensAndCommentsInPlace(this, false);
        }

        public typeCheck(typeFlow: TypeFlow) {
            this.type = typeFlow.stringType;
            return this;
        }

        public treeViewLabel() {
            return "st: " + this.text;
        }

        public printLabel() {
            return this.text;
        }
    }

    export class ModuleElement extends AST {
        constructor (nodeType: NodeType) {
            super(nodeType);
        }
    }

    export class ImportDeclaration extends ModuleElement {
        public isStatementOrExpression() { return true; }
        public varFlags = VarFlags.None;
        public isDynamicImport = false;

        constructor (public id: Identifier, public alias: AST) {
            super(NodeType.ImportDeclaration);
        }

        public emit(emitter: Emitter, tokenId: TokenID, startLine: boolean) {
            var mod = <ModuleType>this.alias.type;
            // REVIEW: Only modules may be aliased for now, though there's no real
            // restriction on what the type symbol may be
            if (!this.isDynamicImport || (this.id.sym && !(<TypeSymbol>this.id.sym).onlyReferencedAsTypeRef)) {
                var prevModAliasId = emitter.modAliasId;
                var prevFirstModAlias = emitter.firstModAlias;

                emitter.recordSourceMappingStart(this);
                emitter.emitParensAndCommentsInPlace(this, true);
                emitter.writeToOutput("var " + this.id.actualText + " = ");
                emitter.modAliasId = this.id.actualText;
                emitter.firstModAlias = this.firstAliasedModToString();
                emitter.emitJavascript(this.alias, TokenID.Tilde, false);
                // the dynamic import case will insert the semi-colon automatically
                if (!this.isDynamicImport) {
                    emitter.writeToOutput(";");
                }
                emitter.emitParensAndCommentsInPlace(this, false);
                emitter.recordSourceMappingEnd(this);

                emitter.modAliasId = prevModAliasId;
                emitter.firstModAlias = prevFirstModAlias;
            }
        }

        public typeCheck(typeFlow: TypeFlow) {
            return typeFlow.typeCheckImportDecl(this);
        }

        public getAliasName(aliasAST?: AST = this.alias) : string {
            if (aliasAST.nodeType == NodeType.Name) {
                return (<Identifier>aliasAST).actualText;
            } else {
                var dotExpr = <BinaryExpression>aliasAST;
                return this.getAliasName(dotExpr.operand1) + "." + this.getAliasName(dotExpr.operand2);
            }
        }

        public firstAliasedModToString() {
            if (this.alias.nodeType == NodeType.Name) {
                return (<Identifier>this.alias).actualText;
            }
            else {
                var dotExpr = <BinaryExpression>this.alias;
                var firstMod = <Identifier>dotExpr.operand1;
                return firstMod.actualText;
            }
        }
    }

    export class BoundDecl extends AST {
        public init: AST = null;
        public typeExpr: AST = null;
        public varFlags = VarFlags.None;
        public sym: Symbol = null;

        constructor (public id: Identifier, nodeType: NodeType, public nestingLevel: number) {
            super(nodeType);
        }

        public isStatementOrExpression() { return true; }

        public isPrivate() { return hasFlag(this.varFlags, VarFlags.Private); }
        public isPublic() { return hasFlag(this.varFlags, VarFlags.Public); }
        public isProperty() { return hasFlag(this.varFlags, VarFlags.Property); }

        public typeCheck(typeFlow: TypeFlow) {
            return typeFlow.typeCheckBoundDecl(this);
        }

        public printLabel() {
            return this.treeViewLabel();
        }
    }

    export class VarDecl extends BoundDecl {
        constructor (id: Identifier, nest: number) {
            super(id, NodeType.VarDecl, nest);
        }

        public isAmbient() { return hasFlag(this.varFlags, VarFlags.Ambient); }
        public isExported() { return hasFlag(this.varFlags, VarFlags.Exported); }
        public isStatic() { return hasFlag(this.varFlags, VarFlags.Static); }

        public emit(emitter: Emitter, tokenId: TokenID, startLine: boolean) {
            emitter.emitJavascriptVarDecl(this, tokenId);
        }

        public treeViewLabel() {
            return "var " + this.id.actualText;
        }
    }

    export class ArgDecl extends BoundDecl {
        constructor (id: Identifier) {
            super(id, NodeType.ArgDecl, 0);
        }

        public isOptional = false;

        public isOptionalArg() { return this.isOptional || this.init; }

        public treeViewLabel() {
            return "arg: " + this.id.actualText;
        }

        public parameterPropertySym: FieldSymbol = null;

        public emit(emitter: Emitter, tokenId: TokenID, startLine: boolean) {
            emitter.emitParensAndCommentsInPlace(this, true);
            emitter.recordSourceMappingStart(this);
            emitter.writeToOutput(this.id.actualText);
            emitter.recordSourceMappingEnd(this);
            emitter.emitParensAndCommentsInPlace(this, false);
        }
    }

    var internalId = 0;

    export class FuncDecl extends AST {
        public hint: string = null;
        public fncFlags = FncFlags.None;
        public returnTypeAnnotation: AST = null;
        public symbols: IHashTable;
        public variableArgList = false;
        public signature: Signature;
        public envids: Identifier[];
        public jumpRefs: Identifier[] = null;
        public internalNameCache: string = null;
        public tmp1Declared = false;
        public enclosingFnc: FuncDecl = null;
        public freeVariables: Symbol[] = [];
        public unitIndex = -1;
        public classDecl: NamedDeclaration = null;
        public boundToProperty: VarDecl = null;
        public isOverload = false;
        public innerStaticFuncs: FuncDecl[] = [];
        public isTargetTypedAsMethod = false;
        public isInlineCallLiteral = false;
        public accessorSymbol: Symbol = null;
        public leftCurlyCount = 0;
        public rightCurlyCount = 0;
        public returnStatementsWithExpressions: ReturnStatement[] = [];
        public scopeType: Type = null; // Type of the FuncDecl, before target typing
        public endingToken: ASTSpan = null;

        constructor (public name: Identifier, public bod: ASTList, public isConstructor: boolean,
                     public arguments: ASTList, public vars: ASTList, public scopes: ASTList, public statics: ASTList,
            nodeType: number) {

            super(nodeType);
        }

        public internalName(): string {
            if (this.internalNameCache == null) {
                var extName = this.getNameText();
                if (extName) {
                    this.internalNameCache = "_internal_" + extName;
                }
                else {
                    this.internalNameCache = "_internal_" + internalId++;
                }
            }
            return this.internalNameCache;
        }

        public hasSelfReference() { return hasFlag(this.fncFlags, FncFlags.HasSelfReference); }
        public setHasSelfReference() { this.fncFlags |= FncFlags.HasSelfReference; }

        public addCloRef(id: Identifier, sym: Symbol): number {
            if (this.envids == null) {
                this.envids = new Identifier[];
            }
            this.envids[this.envids.length] = id;
            var outerFnc = this.enclosingFnc;
            if (sym) {
                while (outerFnc && (outerFnc.type.symbol != sym.container)) {
                    outerFnc.addJumpRef(sym);
                    outerFnc = outerFnc.enclosingFnc;
                }
            }
            return this.envids.length - 1;
        }

        public addJumpRef(sym: Symbol): void {
            if (this.jumpRefs == null) {
                this.jumpRefs = new Identifier[];
            }
            var id = new Identifier(sym.name);
            this.jumpRefs[this.jumpRefs.length] = id;
            id.sym = sym;
            id.cloId = this.addCloRef(id, null);
        }

        public buildControlFlow(): ControlFlowContext {
            var entry = new BasicBlock();
            var exit = new BasicBlock();

            var context = new ControlFlowContext(entry, exit);

            var controlFlowPrefix = (ast: AST, parent: AST, walker: IAstWalker) => {
                ast.addToControlFlow(walker.state);
                return ast;
            }

            var walker = getAstWalkerFactory().getWalker(controlFlowPrefix, null, null, context);
            context.walker = walker;
            walker.walk(this.bod, this);

            return context;
        }

        public typeCheck(typeFlow: TypeFlow) {
            return typeFlow.typeCheckFunction(this);
        }

        public emit(emitter: Emitter, tokenId: TokenID, startLine: boolean) {
            emitter.emitJavascriptFunction(this);
        }

        public getNameText() {
            if (this.name) {
                return this.name.actualText;
            }
            else {
                return this.hint;
            }
        }

        public isMethod() {
            return (this.fncFlags & FncFlags.Method) != FncFlags.None;
        }

        public isCallMember() { return hasFlag(this.fncFlags, FncFlags.CallMember); }
        public isConstructMember() { return hasFlag(this.fncFlags, FncFlags.ConstructMember); }
        public isIndexerMember() { return hasFlag(this.fncFlags, FncFlags.IndexerMember); }
        public isSpecialFn() { return this.isCallMember() || this.isIndexerMember() || this.isConstructMember(); }
        public isAnonymousFn() { return this.name === null; }
        public isAccessor() { return hasFlag(this.fncFlags, FncFlags.GetAccessor) || hasFlag(this.fncFlags, FncFlags.SetAccessor); }
        public isGetAccessor() { return hasFlag(this.fncFlags, FncFlags.GetAccessor); }
        public isSetAccessor() { return hasFlag(this.fncFlags, FncFlags.SetAccessor); }
        public isAmbient() { return hasFlag(this.fncFlags, FncFlags.Ambient); }
        public isExported() { return hasFlag(this.fncFlags, FncFlags.Exported); }
        public isPrivate() { return hasFlag(this.fncFlags, FncFlags.Private); }
        public isPublic() { return hasFlag(this.fncFlags, FncFlags.Public); }
        public isStatic() { return hasFlag(this.fncFlags, FncFlags.Static); }

        public treeViewLabel() {
            if (this.name == null) {
                return "funcExpr";
            }
            else {
                return "func: " + this.name.actualText
            }
        }

        public ClearFlags(): void {
            this.fncFlags = FncFlags.None;
        }

        public isSignature() { return (this.fncFlags & FncFlags.Signature) != FncFlags.None; }

        public hasStaticDeclarations() { return (!this.isConstructor && (this.statics.members.length > 0 || this.innerStaticFuncs.length > 0)); }
    }

    export class LocationInfo {
        constructor (public filename: string, public lineMap: number[], public unitIndex) { }
    }

    export var unknownLocationInfo = new LocationInfo("unknown", null, -1);

    export class Script extends FuncDecl {
        public locationInfo: LocationInfo = null;
        public referencedFiles: IFileReference[] = [];
        public requiresGlobal = false;
        public requiresInherits = false;
        public isResident = false;
        public isDeclareFile = false;
        public hasBeenTypeChecked = false;
        public topLevelMod: ModuleDeclaration = null;
        public leftCurlyCount = 0;
        public rightCurlyCount = 0;
        public vars: ASTList;
        public scopes: ASTList;
        // Remember if the script contains Unicode chars, that is needed when generating code for this script object to decide the output file correct encoding.
        public containsUnicodeChar = false;
        public containsUnicodeCharInComment = false;

        constructor (vars: ASTList, scopes: ASTList) {
            super(new Identifier("script"), null, false, null, vars, scopes, null, NodeType.Script);
            this.vars = vars;
            this.scopes = scopes;
        }

        public typeCheck(typeFlow: TypeFlow) {
            return typeFlow.typeCheckScript(this);
        }

        public treeViewLabel() {
            return "Script";
        }

        public emitRequired() {
            if (!this.isDeclareFile && !this.isResident && this.bod) {
                for (var i = 0, len = this.bod.members.length; i < len; i++) {
                    var stmt = this.bod.members[i];
                    if (stmt.nodeType == NodeType.ModuleDeclaration) {
                        if (!hasFlag((<ModuleDeclaration>stmt).modFlags, ModuleFlags.ShouldEmitModuleDecl | ModuleFlags.Ambient)) {
                            return true;
                        }
                    }
                    else if (stmt.nodeType == NodeType.ClassDeclaration) {
                        if (!hasFlag((<InterfaceDeclaration>stmt).varFlags, VarFlags.Ambient)) {
                            return true;
                        }
                    }
                    else if (stmt.nodeType == NodeType.VarDecl) {
                        if (!hasFlag((<VarDecl>stmt).varFlags, VarFlags.Ambient)) {
                            return true;
                        }
                    }
                    else if (stmt.nodeType == NodeType.FuncDecl) {
                        if (!(<FuncDecl>stmt).isSignature()) {
                            return true;
                        }
                    }
                    else if (stmt.nodeType != NodeType.InterfaceDeclaration && stmt.nodeType != NodeType.Empty) {
                        return true;
                    }
                }
            }
            return false;
        }

        public emit(emitter: Emitter, tokenId: TokenID, startLine: boolean) {
            if (this.emitRequired()) {
                emitter.emitParensAndCommentsInPlace(this, true);
                emitter.recordSourceMappingStart(this);
                emitter.emitJavascriptList(this.bod, null, TokenID.Semicolon, true, false, false, true, this.requiresInherits);
                emitter.recordSourceMappingEnd(this);
                emitter.emitParensAndCommentsInPlace(this, false);
            }
        }
    }

    export class NamedDeclaration extends ModuleElement {
        public leftCurlyCount = 0;
        public rightCurlyCount = 0;

        constructor (nodeType: NodeType,
                     public name: Identifier,
                     public members: ASTList) {
            super(nodeType);
        }
    }

    export class ModuleDeclaration extends NamedDeclaration {
        public modFlags = ModuleFlags.ShouldEmitModuleDecl;
        public mod: ModuleType;
        public prettyName: string;
        public amdDependencies: string[] = [];
        public vars: ASTList;
        public scopes: ASTList;
        // Remember if the module contains Unicode chars, that is needed for dynamic module as we will generate a file for each.
        public containsUnicodeChar = false;
        public containsUnicodeCharInComment = false;

        constructor (name: Identifier, members: ASTList, vars: ASTList, scopes: ASTList, public endingToken: ASTSpan) {
            super(NodeType.ModuleDeclaration, name, members);

            this.vars = vars;
            this.scopes = scopes;
            this.prettyName = this.name.actualText;
        }

        public isExported() { return hasFlag(this.modFlags, ModuleFlags.Exported); }
        public isAmbient() { return hasFlag(this.modFlags, ModuleFlags.Ambient); }
        public isEnum() { return hasFlag(this.modFlags, ModuleFlags.IsEnum); }

        public recordNonInterface() {
            this.modFlags &= ~ModuleFlags.ShouldEmitModuleDecl;
        }

        public typeCheck(typeFlow: TypeFlow) {
            return typeFlow.typeCheckModule(this);
        }

        public emit(emitter: Emitter, tokenId: TokenID, startLine: boolean) {
            if (!hasFlag(this.modFlags, ModuleFlags.ShouldEmitModuleDecl)) {
                emitter.emitParensAndCommentsInPlace(this, true);
                emitter.recordSourceMappingStart(this);
                emitter.emitJavascriptModule(this);
                emitter.recordSourceMappingEnd(this);
                emitter.emitParensAndCommentsInPlace(this, false);
            }
        }
    }

    export class TypeDeclaration extends NamedDeclaration {
        public varFlags = VarFlags.None;

        constructor (nodeType: NodeType,
                     name: Identifier,
                     public extendsList: ASTList,
                     public implementsList: ASTList,
                     members: ASTList) {
            super(nodeType, name, members);
        }

        public isExported() { 
            return hasFlag(this.varFlags, VarFlags.Exported);
        }

        public isAmbient() {
            return hasFlag(this.varFlags, VarFlags.Ambient);
        }
    }

    export class ClassDeclaration extends TypeDeclaration {
        public knownMemberNames: any = {};
        public constructorDecl: FuncDecl = null;
        public constructorNestingLevel = 0;
        public endingToken: ASTSpan = null;

        constructor (name: Identifier,
                     members: ASTList,
                     extendsList: ASTList,
                     implementsList: ASTList) {
            super(NodeType.ClassDeclaration, name, extendsList, implementsList, members);
        }

        public typeCheck(typeFlow: TypeFlow) {
            return typeFlow.typeCheckClass(this);
        }

        public emit(emitter: Emitter, tokenId: TokenID, startLine: boolean) {
            emitter.emitJavascriptClass(this);
        }
    }

    export class InterfaceDeclaration extends TypeDeclaration {
        constructor (name: Identifier,
                     members: ASTList,
                     extendsList: ASTList,
                     implementsList: ASTList) {
            super(NodeType.InterfaceDeclaration, name, extendsList, implementsList, members);
        }

        public typeCheck(typeFlow: TypeFlow) {
            return typeFlow.typeCheckInterface(this);
        }

        public emit(emitter: Emitter, tokenId: TokenID, startLine: boolean) {
        }
    }

    export class Statement extends ModuleElement {
        constructor (nodeType: NodeType) {
            super(nodeType);
            this.flags |= ASTFlags.IsStatement;
        }

        public isLoop() { return false; }

        public isStatementOrExpression() { return true; }

        public isCompoundStatement() { return this.isLoop(); }

        public typeCheck(typeFlow: TypeFlow) {
            this.type = typeFlow.voidType;
            return this;
        }
    }

    export class LabeledStatement extends Statement {
        constructor (public labels: ASTList, public stmt: AST) {
            super(NodeType.LabeledStatement);
        }

        public emit(emitter: Emitter, tokenId: TokenID, startLine: boolean) {
            emitter.emitParensAndCommentsInPlace(this, true);
            emitter.recordSourceMappingStart(this);
            if (this.labels) {
                var labelsLen = this.labels.members.length;
                for (var i = 0; i < labelsLen; i++) {
                    this.labels.members[i].emit(emitter, tokenId, startLine);
                }
            }
            this.stmt.emit(emitter, tokenId, true);
            emitter.recordSourceMappingEnd(this);
            emitter.emitParensAndCommentsInPlace(this, false);
        }

        public typeCheck(typeFlow: TypeFlow) {
            typeFlow.typeCheck(this.labels);
            this.stmt = this.stmt.typeCheck(typeFlow);
            return this;
        }

        public addToControlFlow(context: ControlFlowContext): void {
            var beforeBB = context.current;
            var bb = new BasicBlock();
            context.current = bb;
            beforeBB.addSuccessor(bb);
        }
    }

    export class Block extends Statement {
        constructor (public statements: ASTList,
                     public isStatementBlock: boolean) {
            super(NodeType.Block);
        }

        public emit(emitter: Emitter, tokenId: TokenID, startLine: boolean) {
            emitter.emitParensAndCommentsInPlace(this, true);
            emitter.recordSourceMappingStart(this);
            if (this.isStatementBlock) {
                emitter.writeLineToOutput(" {");
                emitter.indenter.increaseIndent();
            } else {
                emitter.setInVarBlock(this.statements.members.length);
            }
            var temp = emitter.setInObjectLiteral(false);
            if (this.statements) {
                emitter.emitJavascriptList(this.statements, null, TokenID.Semicolon, true, false, false);
            }
            if (this.isStatementBlock) {
                emitter.indenter.decreaseIndent();
                emitter.emitIndent();
                emitter.writeToOutput("}");
            }
            emitter.setInObjectLiteral(temp);
            emitter.recordSourceMappingEnd(this);
            emitter.emitParensAndCommentsInPlace(this, false);
        }

        public addToControlFlow(context: ControlFlowContext) {
            var afterIfNeeded = new BasicBlock();
            context.pushStatement(this, context.current, afterIfNeeded);
            if (this.statements) {
                context.walk(this.statements, this);
            }
            context.walker.options.goChildren = false;
            context.popStatement();
            if (afterIfNeeded.predecessors.length > 0) {
                context.current.addSuccessor(afterIfNeeded);
                context.current = afterIfNeeded;
            }
        }

        public typeCheck(typeFlow: TypeFlow) {
            if (!typeFlow.checker.styleSettings.emptyBlocks) {
                if ((this.statements === null) || (this.statements.members.length == 0)) {
                    typeFlow.checker.errorReporter.styleError(this, "empty block");
                }
            }

            typeFlow.typeCheck(this.statements);
            return this;
        }
    }

    export class Jump extends Statement {
        public target: string = null;
        public hasExplicitTarget() { return (this.target); }
        public resolvedTarget: Statement = null;

        constructor (nodeType: NodeType) {
            super(nodeType);
        }

        public setResolvedTarget(parser: Parser, stmt: Statement): boolean {
            if (stmt.isLoop()) {
                this.resolvedTarget = stmt;
                return true;
            }
            if (this.nodeType === NodeType.Continue) {
                parser.reportParseError("continue statement applies only to loops");
                return false;
            }
            else {
                if ((stmt.nodeType == NodeType.Switch) || this.hasExplicitTarget()) {
                    this.resolvedTarget = stmt;
                    return true;
                }
                else {
                    parser.reportParseError("break statement with no label can apply only to a loop or switch statement");
                    return false;
                }
            }
        }

        public addToControlFlow(context: ControlFlowContext): void {
            super.addToControlFlow(context);
            context.unconditionalBranch(this.resolvedTarget, (this.nodeType == NodeType.Continue));
        }

        public emit(emitter: Emitter, tokenId: TokenID, startLine: boolean) {
            emitter.emitParensAndCommentsInPlace(this, true);
            emitter.recordSourceMappingStart(this);
            if (this.nodeType == NodeType.Break) {
                emitter.writeToOutput("break");
            }
            else {
                emitter.writeToOutput("continue");
            }
            if (this.hasExplicitTarget()) {
                emitter.writeToOutput(" " + this.target);
            }
            emitter.recordSourceMappingEnd(this);
            emitter.writeToOutput(";");
            emitter.emitParensAndCommentsInPlace(this, false);
        }
    }

    export class WhileStatement extends Statement {
        public body: AST = null;

        constructor (public cond: AST) {
            super(NodeType.While);
        }

        public isLoop() { return true; }

        public emit(emitter: Emitter, tokenId: TokenID, startLine: boolean) {
            emitter.emitParensAndCommentsInPlace(this, true);
            emitter.recordSourceMappingStart(this);
            var temp = emitter.setInObjectLiteral(false);
            emitter.writeToOutput("while(");
            emitter.emitJavascript(this.cond, TokenID.While, false);
            emitter.writeToOutput(")");
            emitter.emitJavascriptStatements(this.body, false, false);
            emitter.setInObjectLiteral(temp);
            emitter.recordSourceMappingEnd(this);
            emitter.emitParensAndCommentsInPlace(this, false);
        }

        public typeCheck(typeFlow: TypeFlow) {
            return typeFlow.typeCheckWhile(this);
        }

        public addToControlFlow(context: ControlFlowContext): void {
            var loopHeader = context.current;
            var loopStart = new BasicBlock();
            var afterLoop = new BasicBlock();

            loopHeader.addSuccessor(loopStart);
            context.current = loopStart;
            context.addContent(this.cond);
            var condBlock = context.current;
            var targetInfo: ITargetInfo = null;
            if (this.body) {
                context.current = new BasicBlock();
                condBlock.addSuccessor(context.current);
                context.pushStatement(this, loopStart, afterLoop);
                context.walk(this.body, this);
                targetInfo = context.popStatement();
            }
            if (!(context.noContinuation)) {
                var loopEnd = context.current;
                loopEnd.addSuccessor(loopStart);
            }
            context.current = afterLoop;
            condBlock.addSuccessor(afterLoop);
            // TODO: check for while (true) and then only continue if afterLoop has predecessors
            context.noContinuation = false;
            context.walker.options.goChildren = false;
        }
    }

    export class DoWhileStatement extends Statement {
        public body: AST = null;
        public whileAST: AST = null;
        public cond: AST = null;
        public isLoop() { return true; }

        constructor () {
            super(NodeType.DoWhile);
        }

        public emit(emitter: Emitter, tokenId: TokenID, startLine: boolean) {
            emitter.emitParensAndCommentsInPlace(this, true);
            emitter.recordSourceMappingStart(this);
            var temp = emitter.setInObjectLiteral(false);
            emitter.writeToOutput("do");
            emitter.emitJavascriptStatements(this.body, true, false);
            emitter.recordSourceMappingStart(this.whileAST);
            emitter.writeToOutput("while");
            emitter.recordSourceMappingEnd(this.whileAST);
            emitter.writeToOutput('(');
            emitter.emitJavascript(this.cond, TokenID.CloseParen, false);
            emitter.writeToOutput(")");
            emitter.setInObjectLiteral(temp);
            emitter.recordSourceMappingEnd(this);
            emitter.emitParensAndCommentsInPlace(this, false);
        }

        public typeCheck(typeFlow: TypeFlow) {
            return typeFlow.typeCheckDoWhile(this);
        }

        public addToControlFlow(context: ControlFlowContext): void {
            var loopHeader = context.current;
            var loopStart = new BasicBlock();
            var afterLoop = new BasicBlock();
            loopHeader.addSuccessor(loopStart);
            context.current = loopStart;
            var targetInfo: ITargetInfo = null;
            if (this.body) {
                context.pushStatement(this, loopStart, afterLoop);
                context.walk(this.body, this);
                targetInfo = context.popStatement();
            }
            if (!(context.noContinuation)) {
                var loopEnd = context.current;
                loopEnd.addSuccessor(loopStart);
                context.addContent(this.cond);
                // TODO: check for while (true) 
                context.current = afterLoop;
                loopEnd.addSuccessor(afterLoop);
            }
            else {
                context.addUnreachable(this.cond);
            }
            context.walker.options.goChildren = false;
        }
    }

    export class IfStatement extends Statement {
        public thenBod: AST;
        public elseBod: AST = null;
        public statement: ASTSpan = new ASTSpan();

        constructor (public cond: AST) {
            super(NodeType.If);
        }

        public isCompoundStatement() { return true; }

        public emit(emitter: Emitter, tokenId: TokenID, startLine: boolean) {
            emitter.emitParensAndCommentsInPlace(this, true);
            emitter.recordSourceMappingStart(this);
            var temp = emitter.setInObjectLiteral(false);
            emitter.recordSourceMappingStart(this.statement);
            emitter.writeToOutput("if(");
            emitter.emitJavascript(this.cond, TokenID.If, false);
            emitter.writeToOutput(")");
            emitter.recordSourceMappingEnd(this.statement);
            emitter.emitJavascriptStatements(this.thenBod, true, false);
            if (this.elseBod) {
                emitter.writeToOutput(" else");
                emitter.emitJavascriptStatements(this.elseBod, true, true);
            }
            emitter.setInObjectLiteral(temp);
            emitter.recordSourceMappingEnd(this);
            emitter.emitParensAndCommentsInPlace(this, false);
        }

        public typeCheck(typeFlow: TypeFlow) {
            return typeFlow.typeCheckIf(this);
        }

        public addToControlFlow(context: ControlFlowContext): void {
            this.cond.addToControlFlow(context);
            var afterIf = new BasicBlock();
            var beforeIf = context.current;
            context.pushStatement(this, beforeIf, afterIf);
            var hasContinuation = false;
            context.current = new BasicBlock();
            beforeIf.addSuccessor(context.current);
            context.walk(this.thenBod, this);
            if (!context.noContinuation) {
                hasContinuation = true;
                context.current.addSuccessor(afterIf);
            }
            if (this.elseBod) {
                // current block will be thenBod
                context.current = new BasicBlock();
                context.noContinuation = false;
                beforeIf.addSuccessor(context.current);
                context.walk(this.elseBod, this);
                if (!context.noContinuation) {
                    hasContinuation = true;
                    context.current.addSuccessor(afterIf);
                }
                else {
                    // thenBod created continuation for if statement
                    if (hasContinuation) {
                        context.noContinuation = false;
                    }
                }
            }
            else {
                beforeIf.addSuccessor(afterIf);
                context.noContinuation = false;
                hasContinuation = true;
            }
            var targetInfo = context.popStatement();
            if (afterIf.predecessors.length > 0) {
                context.noContinuation = false;
                hasContinuation = true;
            }
            if (hasContinuation) {
                context.current = afterIf;
            }
            context.walker.options.goChildren = false;
        }
    }

    export class ReturnStatement extends Statement {
        public returnExpression: AST = null;

        constructor () {
            super(NodeType.Return);
        }

        public emit(emitter: Emitter, tokenId: TokenID, startLine: boolean) {
            emitter.emitParensAndCommentsInPlace(this, true);
            emitter.recordSourceMappingStart(this);
            var temp = emitter.setInObjectLiteral(false);
            if (this.returnExpression) {
                emitter.writeToOutput("return ");
                emitter.emitJavascript(this.returnExpression, TokenID.Semicolon, false);
            }
            else {
                emitter.writeToOutput("return;");
            }
            emitter.setInObjectLiteral(temp);
            emitter.recordSourceMappingEnd(this);
            emitter.emitParensAndCommentsInPlace(this, false);
        }

        public addToControlFlow(context: ControlFlowContext): void {
            super.addToControlFlow(context);
            context.returnStmt();
        }

        public typeCheck(typeFlow: TypeFlow) {
            return typeFlow.typeCheckReturn(this);
        }
    }

    export class EndCode extends AST {
        constructor () {
            super(NodeType.EndCode);
        }
    }

    export class ForInStatement extends Statement {
        constructor (public lval: AST, public obj: AST) {
            super(NodeType.ForIn);
            if (this.lval && (this.lval.nodeType == NodeType.VarDecl)) {
                (<BoundDecl>this.lval).varFlags |= VarFlags.AutoInit;
            }
        }
        public statement: ASTSpan = new ASTSpan();
        public body: AST;

        public isLoop() { return true; }

        public isFiltered() {
            if (this.body) {
                var singleItem: AST = null;
                if (this.body.nodeType == NodeType.List) {
                    var stmts = <ASTList>this.body;
                    if (stmts.members.length == 1) {
                        singleItem = stmts.members[0];
                    }
                }
                else {
                    singleItem = this.body;
                }
                // match template for filtering 'own' properties from obj
                if (singleItem !== null) {
                    if (singleItem.nodeType == NodeType.Block) {
                        var block = <Block>singleItem;
                        if ((block.statements !== null) && (block.statements.members.length == 1)) {
                            singleItem = block.statements.members[0];
                        }
                    }
                    if (singleItem.nodeType == NodeType.If) {
                        var cond = (<IfStatement>singleItem).cond;
                        if (cond.nodeType == NodeType.Call) {
                            var target = (<CallExpression>cond).target;
                            if (target.nodeType == NodeType.Dot) {
                                var binex = <BinaryExpression>target;
                                if ((binex.operand1.nodeType == NodeType.Name) &&
                                    (this.obj.nodeType == NodeType.Name) &&
                                    ((<Identifier>binex.operand1).actualText == (<Identifier>this.obj).actualText)) {
                                    var prop = <Identifier>binex.operand2;
                                    if (prop.actualText == "hasOwnProperty") {
                                        var args = (<CallExpression>cond).arguments;
                                        if ((args !== null) && (args.members.length == 1)) {
                                            var arg = args.members[0];
                                            if ((arg.nodeType == NodeType.Name) &&
                                                 (this.lval.nodeType == NodeType.Name)) {
                                                if (((<Identifier>this.lval).actualText) == (<Identifier>arg).actualText) {
                                                    return true;
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
            return false;
        }

        public emit(emitter: Emitter, tokenId: TokenID, startLine: boolean) {
            emitter.emitParensAndCommentsInPlace(this, true);
            emitter.recordSourceMappingStart(this);
            var temp = emitter.setInObjectLiteral(false);
            emitter.recordSourceMappingStart(this.statement);
            emitter.writeToOutput("for(");
            emitter.emitJavascript(this.lval, TokenID.For, false);
            emitter.writeToOutput(" in ");
            emitter.emitJavascript(this.obj, TokenID.For, false);
            emitter.writeToOutput(")");
            emitter.recordSourceMappingEnd(this.statement);
            emitter.emitJavascriptStatements(this.body, true, false);
            emitter.setInObjectLiteral(temp);
            emitter.recordSourceMappingEnd(this);
            emitter.emitParensAndCommentsInPlace(this, false);
        }

        public typeCheck(typeFlow: TypeFlow) {
            if (typeFlow.checker.styleSettings.forin) {
                if (!this.isFiltered()) {
                    typeFlow.checker.errorReporter.styleError(this, "no hasOwnProperty filter");
                }
            }
            return typeFlow.typeCheckForIn(this);
        }

        public addToControlFlow(context: ControlFlowContext): void {
            if (this.lval) {
                context.addContent(this.lval);
            }
            if (this.obj) {
                context.addContent(this.obj);
            }

            var loopHeader = context.current;
            var loopStart = new BasicBlock();
            var afterLoop = new BasicBlock();

            loopHeader.addSuccessor(loopStart);
            context.current = loopStart;
            if (this.body) {
                context.pushStatement(this, loopStart, afterLoop);
                context.walk(this.body, this);
                context.popStatement();
            }
            if (!(context.noContinuation)) {
                var loopEnd = context.current;
                loopEnd.addSuccessor(loopStart);
            }
            context.current = afterLoop;
            context.noContinuation = false;
            loopHeader.addSuccessor(afterLoop);
            context.walker.options.goChildren = false;
        }
    }

    export class ForStatement extends Statement {
        public cond: AST;
        public body: AST;
        public incr: AST;

        constructor (public init: AST) {
            super(NodeType.For);
        }

        public isLoop() { return true; }

        public emit(emitter: Emitter, tokenId: TokenID, startLine: boolean) {
            emitter.emitParensAndCommentsInPlace(this, true);
            emitter.recordSourceMappingStart(this);
            var temp = emitter.setInObjectLiteral(false);
            emitter.writeToOutput("for(");
            if (this.init) {
                if (this.init.nodeType != NodeType.List) {
                    emitter.emitJavascript(this.init, TokenID.For, false);
                }
                else {
                    emitter.setInVarBlock((<ASTList>this.init).members.length); 
                    emitter.emitJavascriptList(this.init, null, TokenID.For, false, false, false);
                }
            }
            emitter.writeToOutput("; ");
            emitter.emitJavascript(this.cond, TokenID.For, false);
            emitter.writeToOutput("; ");
            emitter.emitJavascript(this.incr, TokenID.For, false);
            emitter.writeToOutput(")");
            emitter.emitJavascriptStatements(this.body, true, false);
            emitter.setInObjectLiteral(temp);
            emitter.recordSourceMappingEnd(this);
            emitter.emitParensAndCommentsInPlace(this, false);
        }

        public typeCheck(typeFlow: TypeFlow) {
            return typeFlow.typeCheckFor(this);
        }

        public addToControlFlow(context: ControlFlowContext): void {
            if (this.init) {
                context.addContent(this.init);
            }
            var loopHeader = context.current;
            var loopStart = new BasicBlock();
            var afterLoop = new BasicBlock();

            loopHeader.addSuccessor(loopStart);
            context.current = loopStart;
            var condBlock: BasicBlock = null;
            var continueTarget = loopStart;
            var incrBB: BasicBlock = null;
            if (this.incr) {
                incrBB = new BasicBlock();
                continueTarget = incrBB;
            }
            if (this.cond) {
                condBlock = context.current;
                context.addContent(this.cond);
                context.current = new BasicBlock();
                condBlock.addSuccessor(context.current);
            }
            var targetInfo: ITargetInfo = null;
            if (this.body) {
                context.pushStatement(this, continueTarget, afterLoop);
                context.walk(this.body, this);
                targetInfo = context.popStatement();
            }
            if (this.incr) {
                if (context.noContinuation) {
                    if (incrBB.predecessors.length == 0) {
                        context.addUnreachable(this.incr);
                    }
                }
                else {
                    context.current.addSuccessor(incrBB);
                    context.current = incrBB;
                    context.addContent(this.incr);
                }
            }
            var loopEnd = context.current;
            if (!(context.noContinuation)) {
                loopEnd.addSuccessor(loopStart);

            }
            if (condBlock) {
                condBlock.addSuccessor(afterLoop);
                context.noContinuation = false;
            }
            if (afterLoop.predecessors.length > 0) {
                context.noContinuation = false;
                context.current = afterLoop;
            }
            context.walker.options.goChildren = false;
        }
    }

    export class WithStatement extends Statement {
        public body: AST;

        public isCompoundStatement() { return true; }

        public withSym: WithSymbol = null;

        constructor (public expr: AST) {
            super(NodeType.With);
        }

        public emit(emitter: Emitter, tokenId: TokenID, startLine: boolean) {
            emitter.emitParensAndCommentsInPlace(this, true);
            emitter.recordSourceMappingStart(this);
            emitter.writeToOutput("with (");
            if (this.expr) {
                emitter.emitJavascript(this.expr, TokenID.With, false);
            }

            emitter.writeToOutput(")");
            emitter.emitJavascriptStatements(this.body, true, false);
            emitter.recordSourceMappingEnd(this);
            emitter.emitParensAndCommentsInPlace(this, false);
        }

        public typeCheck(typeFlow: TypeFlow) {
            return typeFlow.typeCheckWith(this);
        }
    }

    export class SwitchStatement extends Statement {
        public caseList: ASTList;
        public defaultCase: CaseStatement = null;
        public statement: ASTSpan = new ASTSpan();

        constructor (public val: AST) {
            super(NodeType.Switch);
        }

        public isCompoundStatement() { return true; }

        public emit(emitter: Emitter, tokenId: TokenID, startLine: boolean) {
            emitter.emitParensAndCommentsInPlace(this, true);
            emitter.recordSourceMappingStart(this);
            var temp = emitter.setInObjectLiteral(false);
            emitter.recordSourceMappingStart(this.statement);
            emitter.writeToOutput("switch(");
            emitter.emitJavascript(this.val, TokenID.Identifier, false);
            emitter.writeToOutput(")"); 
            emitter.recordSourceMappingEnd(this.statement);
            emitter.writeLineToOutput(" {");
            emitter.indenter.increaseIndent();
            var casesLen = this.caseList.members.length;
            for (var i = 0; i < casesLen; i++) {
                var caseExpr = this.caseList.members[i];
                emitter.emitJavascript(caseExpr, TokenID.Case, true);
                emitter.writeLineToOutput("");
            }
            emitter.indenter.decreaseIndent();
            emitter.emitIndent();
            emitter.writeToOutput("}");
            emitter.setInObjectLiteral(temp);
            emitter.recordSourceMappingEnd(this);
            emitter.emitParensAndCommentsInPlace(this, false);
        }

        public typeCheck(typeFlow: TypeFlow) {
            var len = this.caseList.members.length;
            this.val = typeFlow.typeCheck(this.val);
            for (var i = 0; i < len; i++) {
                this.caseList.members[i] = typeFlow.typeCheck(this.caseList.members[i]);
            }
            this.defaultCase = <CaseStatement>typeFlow.typeCheck(this.defaultCase);
            this.type = typeFlow.voidType;
            return this;
        }

        // if there are break statements that match this switch, then just link cond block with block after switch
        public addToControlFlow(context: ControlFlowContext) {
            var condBlock = context.current;
            context.addContent(this.val);
            var execBlock = new BasicBlock();
            var afterSwitch = new BasicBlock();

            condBlock.addSuccessor(execBlock);
            context.pushSwitch(execBlock);
            context.current = execBlock;
            context.pushStatement(this, execBlock, afterSwitch);
            context.walk(this.caseList, this);
            context.popSwitch();
            var targetInfo = context.popStatement();
            var hasCondContinuation = (this.defaultCase == null);
            if (this.defaultCase == null) {
                condBlock.addSuccessor(afterSwitch);
            }
            if (afterSwitch.predecessors.length > 0) {
                context.noContinuation = false;
                context.current = afterSwitch;
            }
            else {
                context.noContinuation = true;
            }
            context.walker.options.goChildren = false;
        }
    }

    export class CaseStatement extends Statement {
        public expr: AST = null;
        public body: ASTList;

        constructor () {
            super(NodeType.Case);
        }

        public emit(emitter: Emitter, tokenId: TokenID, startLine: boolean) {
            emitter.emitParensAndCommentsInPlace(this, true);
            emitter.recordSourceMappingStart(this);
            if (this.expr) {
                emitter.writeToOutput("case ");
                emitter.emitJavascript(this.expr, TokenID.Identifier, false);
            }
            else {
                emitter.writeToOutput("default");
            }
            emitter.writeToOutput(":");
            emitter.emitJavascriptStatements(this.body, false, false);
            emitter.recordSourceMappingEnd(this);
            emitter.emitParensAndCommentsInPlace(this, false);
        }

        public typeCheck(typeFlow: TypeFlow) {
            this.expr = typeFlow.typeCheck(this.expr);
            typeFlow.typeCheck(this.body);
            this.type = typeFlow.voidType;
            return this;
        }

        // TODO: more reasoning about unreachable cases (such as duplicate literals as case expressions)
        // for now, assume all cases are reachable, regardless of whether some cases fall through
        public addToControlFlow(context: ControlFlowContext) {
            var execBlock = new BasicBlock();
            var sw = context.currentSwitch[context.currentSwitch.length - 1];
            // TODO: fall-through from previous (+ to end of switch)
            if (this.expr) {
                var exprBlock = new BasicBlock();
                context.current = exprBlock;
                sw.addSuccessor(exprBlock);
                context.addContent(this.expr);
                exprBlock.addSuccessor(execBlock);
            }
            else {
                sw.addSuccessor(execBlock);
            }
            context.current = execBlock;
            if (this.body) {
                context.walk(this.body, this);
            }
            context.noContinuation = false;
            context.walker.options.goChildren = false;
        }
    }

    export class TypeReference extends AST {
        constructor (public term: AST, public arrayCount: number) {
            super(NodeType.TypeRef);
        }

        public emit(emitter: Emitter, tokenId: TokenID, startLine: boolean) {
            throw new Error("should not emit a type ref");
        }

        public typeCheck(typeFlow: TypeFlow) {
            var prevInTCTR = typeFlow.inTypeRefTypeCheck;
            typeFlow.inTypeRefTypeCheck = true;
            var typeLink = getTypeLink(this, typeFlow.checker, true);
            typeFlow.checker.resolveTypeLink(typeFlow.scope, typeLink, false);

            if (this.term) {
                typeFlow.typeCheck(this.term);
            }

            typeFlow.checkForVoidConstructor(typeLink.type, this);

            this.type = typeLink.type;

            // in error recovery cases, there may not be a term
            if (this.term) {
                this.term.type = this.type;
            }

            typeFlow.inTypeRefTypeCheck = prevInTCTR;
            return this;
        }
    }

    export class TryFinally extends Statement {
        constructor (public tryNode: AST, public finallyNode: Finally) {
            super(NodeType.TryFinally);
        }

        public isCompoundStatement() { return true; }

        public emit(emitter: Emitter, tokenId: TokenID, startLine: boolean) {
            emitter.recordSourceMappingStart(this);
            emitter.emitJavascript(this.tryNode, TokenID.Try, false);
            emitter.emitJavascript(this.finallyNode, TokenID.Finally, false);
            emitter.recordSourceMappingEnd(this);
        }

        public typeCheck(typeFlow: TypeFlow) {
            this.tryNode = typeFlow.typeCheck(this.tryNode);
            this.finallyNode = <Finally>typeFlow.typeCheck(this.finallyNode);
            this.type = typeFlow.voidType;
            return this;
        }

        public addToControlFlow(context: ControlFlowContext) {
            var afterFinally = new BasicBlock();
            context.walk(this.tryNode, this);
            var finBlock = new BasicBlock();
            if (context.current) {
                context.current.addSuccessor(finBlock);
            }
            context.current = finBlock;
            context.pushStatement(this, null, afterFinally);
            context.walk(this.finallyNode, this);
            if (!context.noContinuation && context.current) {
                context.current.addSuccessor(afterFinally);
            }
            if (afterFinally.predecessors.length > 0) {
                context.current = afterFinally;
            }
            else {
                context.noContinuation = true;
            }
            context.popStatement();
            context.walker.options.goChildren = false;
        }
    }

    export class TryCatch extends Statement {
        constructor (public tryNode: Try, public catchNode: Catch) {
            super(NodeType.TryCatch);
        }

        public isCompoundStatement() { return true; }

        public emit(emitter: Emitter, tokenId: TokenID, startLine: boolean) {
            emitter.emitParensAndCommentsInPlace(this, true);
            emitter.recordSourceMappingStart(this);
            emitter.emitJavascript(this.tryNode, TokenID.Try, false);
            emitter.emitJavascript(this.catchNode, TokenID.Catch, false);
            emitter.recordSourceMappingEnd(this);
            emitter.emitParensAndCommentsInPlace(this, false);
        }

        public addToControlFlow(context: ControlFlowContext) {
            var beforeTry = context.current;
            var tryBlock = new BasicBlock();
            beforeTry.addSuccessor(tryBlock);
            context.current = tryBlock;
            var afterTryCatch = new BasicBlock();
            context.pushStatement(this, null, afterTryCatch);
            context.walk(this.tryNode, this);
            if (!context.noContinuation) {
                if (context.current) {
                    context.current.addSuccessor(afterTryCatch);
                }
            }
            context.current = new BasicBlock();
            beforeTry.addSuccessor(context.current);
            context.walk(this.catchNode, this);
            context.popStatement();
            if (!context.noContinuation) {
                if (context.current) {
                    context.current.addSuccessor(afterTryCatch);
                }
            }
            context.current = afterTryCatch;
            context.walker.options.goChildren = false;
        }

        public typeCheck(typeFlow: TypeFlow) {
            this.tryNode = <Try>typeFlow.typeCheck(this.tryNode);
            this.catchNode = <Catch>typeFlow.typeCheck(this.catchNode);
            this.type = typeFlow.voidType;
            return this;
        }
    }

    export class Try extends Statement {
        constructor (public body: AST) {
            super(NodeType.Try);
        }

        public emit(emitter: Emitter, tokenId: TokenID, startLine: boolean) {
            emitter.emitParensAndCommentsInPlace(this, true);
            emitter.recordSourceMappingStart(this);
            emitter.writeToOutput("try ");
            emitter.emitJavascript(this.body, TokenID.Try, false);
            emitter.recordSourceMappingEnd(this);
            emitter.emitParensAndCommentsInPlace(this, false);
        }

        public typeCheck(typeFlow: TypeFlow) {
            this.body = typeFlow.typeCheck(this.body);
            return this;
        }

        public addToControlFlow(context: ControlFlowContext) {
            if (this.body) {
                context.walk(this.body, this);
            }
            context.walker.options.goChildren = false;
            context.noContinuation = false;
        }
    }

    export class Catch extends Statement {
        constructor (public param: VarDecl, public body: AST) {
            super(NodeType.Catch);
            if (this.param) {
                this.param.varFlags |= VarFlags.AutoInit;
            }
        }
        public statement: ASTSpan = new ASTSpan();
        public containedScope: SymbolScope = null;

        public emit(emitter: Emitter, tokenId: TokenID, startLine: boolean) {
            emitter.emitParensAndCommentsInPlace(this, true);
            emitter.recordSourceMappingStart(this);
            emitter.writeToOutput(" ");
            emitter.recordSourceMappingStart(this.statement);
            emitter.writeToOutput("catch (");
            emitter.emitJavascript(this.param, TokenID.OpenParen, false);
            emitter.writeToOutput(")");
            emitter.recordSourceMappingEnd(this.statement);
            emitter.emitJavascript(this.body, TokenID.Catch, false);
            emitter.recordSourceMappingEnd(this);
            emitter.emitParensAndCommentsInPlace(this, false);
        }

        public addToControlFlow(context: ControlFlowContext) {
            if (this.param) {
                context.addContent(this.param);
                var bodBlock = new BasicBlock();
                context.current.addSuccessor(bodBlock);
                context.current = bodBlock;
            }
            if (this.body) {
                context.walk(this.body, this);
            }
            context.noContinuation = false;
            context.walker.options.goChildren = false;
        }

        public typeCheck(typeFlow: TypeFlow) {
            var prevScope = typeFlow.scope;
            typeFlow.scope = this.containedScope;
            this.param = <VarDecl>typeFlow.typeCheck(this.param);
            var exceptVar = new ValueLocation();
            var varSym = new VariableSymbol((<VarDecl>this.param).id.text,
                                          this.param.minChar,
                                          typeFlow.checker.locationInfo.unitIndex,
                                          exceptVar);
            exceptVar.symbol = varSym;
            exceptVar.typeLink = new TypeLink();
            // var type for now (add syntax for type annotation)
            exceptVar.typeLink.type = typeFlow.anyType;
            var thisFnc = typeFlow.thisFnc;
            if (thisFnc && thisFnc.type) {
                exceptVar.symbol.container = thisFnc.type.symbol;
            }
            else {
                exceptVar.symbol.container = null;
            }
            this.param.sym = exceptVar.symbol;
            typeFlow.scope.enter(exceptVar.symbol.container, this.param, exceptVar.symbol,
                                 typeFlow.checker.errorReporter, false, false, false);
            this.body = typeFlow.typeCheck(this.body);

            // if we're in provisional typecheck mode, clean up the symbol entry
            // REVIEW: This is obviously bad form, since we're counting on the internal
            // layout of the symbol table, but this is also the only place where we insert
            // symbols during typecheck
            if (typeFlow.checker.inProvisionalTypecheckMode()) {
                var table = typeFlow.scope.getTable();
                (<any>table).secondaryTable.table[exceptVar.symbol.name] = undefined;
            }
            this.type = typeFlow.voidType;
            typeFlow.scope = prevScope;
            return this;
        }
    }

    export class Finally extends Statement {
        constructor (public body: AST) {
            super(NodeType.Finally);
        }

        public emit(emitter: Emitter, tokenId: TokenID, startLine: boolean) {
            emitter.emitParensAndCommentsInPlace(this, true);
            emitter.recordSourceMappingStart(this);
            emitter.writeToOutput("finally");
            emitter.emitJavascript(this.body, TokenID.Finally, false);
            emitter.recordSourceMappingEnd(this);
            emitter.emitParensAndCommentsInPlace(this, false);
        }

        public addToControlFlow(context: ControlFlowContext) {
            if (this.body) {
                context.walk(this.body, this);
            }
            context.walker.options.goChildren = false;
            context.noContinuation = false;
        }

        public typeCheck(typeFlow: TypeFlow) {
            this.body = typeFlow.typeCheck(this.body);
            return this;
        }
    }

    export class Comment extends AST {

        public text: string[] = null;

        constructor (public content: string, public isBlockComment: boolean, public endsLine) {
            super(NodeType.Comment);
        }

        public getText(): string[] {
            if (this.text == null) {
                if (this.isBlockComment) {
                    this.text = this.content.split("\n");
                    for (var i = 0; i < this.text.length; i++) {
                        this.text[i] = this.text[i].replace(/^\s+|\s+$/g, '');
                    }
                }
                else {
                    this.text = [(this.content.replace(/^\s+|\s+$/g, ''))];
                }
            }

            return this.text;
        }
    }

    export class DebuggerStatement extends Statement {
        constructor () {
            super(NodeType.Debugger);
        }

        public emit(emitter: Emitter, tokenId: TokenID, startLine: boolean) {
            emitter.emitParensAndCommentsInPlace(this, true);
            emitter.recordSourceMappingStart(this);
            emitter.writeLineToOutput("debugger;");
            emitter.recordSourceMappingEnd(this);
            emitter.emitParensAndCommentsInPlace(this, false);
        }
    }
}

//// [typescript.js]
//// [parserRealSource11.js]
// Copyright (c) Microsoft. All rights reserved. Licensed under the Apache License, Version 2.0. 
// See LICENSE.txt in the project root for complete license information.
///<reference path='typescript.ts' />
var TypeScript;
(function (TypeScript) {
    class ASTSpan {
        minChar = -1; // -1 = "undefined" or "compiler generated"
        limChar = -1; // -1 = "undefined" or "compiler generated"   
    }
    TypeScript.ASTSpan = ASTSpan;
    class AST extends ASTSpan {
        nodeType;
        type = null;
        flags = ASTFlags.Writeable;
        // REVIEW: for diagnostic purposes
        passCreated = CompilerDiagnostics.analysisPass;
        preComments = null;
        postComments = null;
        isParenthesized = false;
        constructor(nodeType) {
            super();
            this.nodeType = nodeType;
        }
        isExpression() { return false; }
        isStatementOrExpression() { return false; }
        isCompoundStatement() { return false; }
        isLeaf() { return this.isStatementOrExpression() && (!this.isCompoundStatement()); }
        typeCheck(typeFlow) {
            switch (this.nodeType) {
                case NodeType.Error:
                case NodeType.EmptyExpr:
                    this.type = typeFlow.anyType;
                    break;
                case NodeType.This:
                    return typeFlow.typeCheckThis(this);
                case NodeType.Null:
                    this.type = typeFlow.nullType;
                    break;
                case NodeType.False:
                case NodeType.True:
                    this.type = typeFlow.booleanType;
                    break;
                case NodeType.Super:
                    return typeFlow.typeCheckSuper(this);
                case NodeType.EndCode:
                case NodeType.Empty:
                case NodeType.Void:
                    this.type = typeFlow.voidType;
                    break;
                default:
                    throw new Error("please implement in derived class");
            }
            return this;
        }
        emit(emitter, tokenId, startLine) {
            emitter.emitParensAndCommentsInPlace(this, true);
            switch (this.nodeType) {
                case NodeType.This:
                    emitter.recordSourceMappingStart(this);
                    if (emitter.thisFnc && (hasFlag(emitter.thisFnc.fncFlags, FncFlags.IsFatArrowFunction))) {
                        emitter.writeToOutput("_this");
                    }
                    else {
                        emitter.writeToOutput("this");
                    }
                    emitter.recordSourceMappingEnd(this);
                    break;
                case NodeType.Null:
                    emitter.recordSourceMappingStart(this);
                    emitter.writeToOutput("null");
                    emitter.recordSourceMappingEnd(this);
                    break;
                case NodeType.False:
                    emitter.recordSourceMappingStart(this);
                    emitter.writeToOutput("false");
                    emitter.recordSourceMappingEnd(this);
                    break;
                case NodeType.True:
                    emitter.recordSourceMappingStart(this);
                    emitter.writeToOutput("true");
                    emitter.recordSourceMappingEnd(this);
                    break;
                case NodeType.Super:
                    emitter.recordSourceMappingStart(this);
                    emitter.emitSuperReference();
                    emitter.recordSourceMappingEnd(this);
                    break;
                case NodeType.EndCode:
                    break;
                case NodeType.Error:
                case NodeType.EmptyExpr:
                    break;
                case NodeType.Empty:
                    emitter.recordSourceMappingStart(this);
                    emitter.writeToOutput("; ");
                    emitter.recordSourceMappingEnd(this);
                    break;
                case NodeType.Void:
                    emitter.recordSourceMappingStart(this);
                    emitter.writeToOutput("void ");
                    emitter.recordSourceMappingEnd(this);
                    break;
                default:
                    throw new Error("please implement in derived class");
            }
            emitter.emitParensAndCommentsInPlace(this, false);
        }
        print(context) {
            context.startLine();
            var lineCol = { line: -1, col: -1 };
            var limLineCol = { line: -1, col: -1 };
            if (context.parser !== null) {
                context.parser.getSourceLineCol(lineCol, this.minChar);
                context.parser.getSourceLineCol(limLineCol, this.limChar);
                context.write("(" + lineCol.line + "," + lineCol.col + ")--" +
                    "(" + limLineCol.line + "," + limLineCol.col + "): ");
            }
            var lab = this.printLabel();
            if (hasFlag(this.flags, ASTFlags.Error)) {
                lab += " (Error)";
            }
            context.writeLine(lab);
        }
        printLabel() {
            if (nodeTypeTable[this.nodeType] !== undefined) {
                return nodeTypeTable[this.nodeType];
            }
            else {
                return NodeType._map[this.nodeType];
            }
        }
        addToControlFlow(context) {
            // by default, AST adds itself to current basic block and does not check its children
            context.walker.options.goChildren = false;
            context.addContent(this);
        }
        netFreeUses(container, freeUses) {
        }
        treeViewLabel() {
            return NodeType._map[this.nodeType];
        }
        static getResolvedIdentifierName(name) {
            if (!name)
                return "";
            var resolved = "";
            var start = 0;
            var i = 0;
            while (i <= name.length - 6) {
                // Look for escape sequence \uxxxx
                if (name.charAt(i) == '\\' && name.charAt(i + 1) == 'u') {
                    var charCode = parseInt(name.substr(i + 2, 4), 16);
                    resolved += name.substr(start, i - start);
                    resolved += String.fromCharCode(charCode);
                    i += 6;
                    start = i;
                    continue;
                }
                i++;
            }
            // Append remaining string
            resolved += name.substring(start);
            return resolved;
        }
    }
    TypeScript.AST = AST;
    class IncompleteAST extends AST {
        constructor(min, lim) {
            super(NodeType.Error);
            this.minChar = min;
            this.limChar = lim;
        }
    }
    TypeScript.IncompleteAST = IncompleteAST;
    class ASTList extends AST {
        enclosingScope = null;
        members = new AST[];
        constructor() {
            super(NodeType.List);
        }
        addToControlFlow(context) {
            var len = this.members.length;
            for (var i = 0; i < len; i++) {
                if (context.noContinuation) {
                    context.addUnreachable(this.members[i]);
                    break;
                }
                else {
                    this.members[i] = context.walk(this.members[i], this);
                }
            }
            context.walker.options.goChildren = false;
        }
        append(ast) {
            this.members[this.members.length] = ast;
            return this;
        }
        appendAll(ast) {
            if (ast.nodeType == NodeType.List) {
                var list = ast;
                for (var i = 0, len = list.members.length; i < len; i++) {
                    this.append(list.members[i]);
                }
            }
            else {
                this.append(ast);
            }
            return this;
        }
        emit(emitter, tokenId, startLine) {
            emitter.recordSourceMappingStart(this);
            emitter.emitJavascriptList(this, null, TokenID.Semicolon, startLine, false, false);
            emitter.recordSourceMappingEnd(this);
        }
        typeCheck(typeFlow) {
            var len = this.members.length;
            typeFlow.nestingLevel++;
            for (var i = 0; i < len; i++) {
                if (this.members[i]) {
                    this.members[i] = this.members[i].typeCheck(typeFlow);
                }
            }
            typeFlow.nestingLevel--;
            return this;
        }
    }
    TypeScript.ASTList = ASTList;
    class Identifier extends AST {
        actualText;
        hasEscapeSequence;
        sym = null;
        cloId = -1;
        text;
        // 'actualText' is the text that the user has entered for the identifier. the text might 
        // include any Unicode escape sequences (e.g.: \u0041 for 'A'). 'text', however, contains 
        // the resolved value of any escape sequences in the actual text; so in the previous 
        // example, actualText = '\u0041', text = 'A'.
        //
        // For purposes of finding a symbol, use text, as this will allow you to match all 
        // variations of the variable text. For full-fidelity translation of the user input, such
        // as emitting, use the actualText field.
        // 
        // Note: 
        //    To change text, and to avoid running into a situation where 'actualText' does not 
        //    match 'text', always use setText.
        constructor(actualText, hasEscapeSequence) {
            super(NodeType.Name);
            this.actualText = actualText;
            this.hasEscapeSequence = hasEscapeSequence;
            this.setText(actualText, hasEscapeSequence);
        }
        setText(actualText, hasEscapeSequence) {
            this.actualText = actualText;
            if (hasEscapeSequence) {
                this.text = AST.getResolvedIdentifierName(actualText);
            }
            else {
                this.text = actualText;
            }
        }
        isMissing() { return false; }
        isLeaf() { return true; }
        treeViewLabel() {
            return "id: " + this.actualText;
        }
        printLabel() {
            if (this.actualText) {
                return "id: " + this.actualText;
            }
            else {
                return "name node";
            }
        }
        typeCheck(typeFlow) {
            return typeFlow.typeCheckName(this);
        }
        emit(emitter, tokenId, startLine) {
            emitter.emitJavascriptName(this, true);
        }
        static fromToken(token) {
            return new Identifier(token.getText(), token.hasEscapeSequence);
        }
    }
    TypeScript.Identifier = Identifier;
    class MissingIdentifier extends Identifier {
        constructor() {
            super("__missing");
        }
        isMissing() {
            return true;
        }
        emit(emitter, tokenId, startLine) {
            // Emit nothing for a missing ID
        }
    }
    TypeScript.MissingIdentifier = MissingIdentifier;
    class Label extends AST {
        id;
        constructor(id) {
            super(NodeType.Label);
            this.id = id;
        }
        printLabel() { return this.id.actualText + ":"; }
        typeCheck(typeFlow) {
            this.type = typeFlow.voidType;
            return this;
        }
        emit(emitter, tokenId, startLine) {
            emitter.emitParensAndCommentsInPlace(this, true);
            emitter.recordSourceMappingStart(this);
            emitter.recordSourceMappingStart(this.id);
            emitter.writeToOutput(this.id.actualText);
            emitter.recordSourceMappingEnd(this.id);
            emitter.writeLineToOutput(":");
            emitter.recordSourceMappingEnd(this);
            emitter.emitParensAndCommentsInPlace(this, false);
        }
    }
    TypeScript.Label = Label;
    class Expression extends AST {
        constructor(nodeType) {
            super(nodeType);
        }
        isExpression() { return true; }
        isStatementOrExpression() { return true; }
    }
    TypeScript.Expression = Expression;
    class UnaryExpression extends Expression {
        operand;
        targetType = null; // Target type for an object literal (null if no target type)
        castTerm = null;
        constructor(nodeType, operand) {
            super(nodeType);
            this.operand = operand;
        }
        addToControlFlow(context) {
            super.addToControlFlow(context);
            // TODO: add successor as catch block/finally block if present
            if (this.nodeType == NodeType.Throw) {
                context.returnStmt();
            }
        }
        typeCheck(typeFlow) {
            switch (this.nodeType) {
                case NodeType.Not:
                    return typeFlow.typeCheckBitNot(this);
                case NodeType.LogNot:
                    return typeFlow.typeCheckLogNot(this);
                case NodeType.Pos:
                case NodeType.Neg:
                    return typeFlow.typeCheckUnaryNumberOperator(this);
                case NodeType.IncPost:
                case NodeType.IncPre:
                case NodeType.DecPost:
                case NodeType.DecPre:
                    return typeFlow.typeCheckIncOrDec(this);
                case NodeType.ArrayLit:
                    typeFlow.typeCheckArrayLit(this);
                    return this;
                case NodeType.ObjectLit:
                    typeFlow.typeCheckObjectLit(this);
                    return this;
                case NodeType.Throw:
                    this.operand = typeFlow.typeCheck(this.operand);
                    this.type = typeFlow.voidType;
                    return this;
                case NodeType.Typeof:
                    this.operand = typeFlow.typeCheck(this.operand);
                    this.type = typeFlow.stringType;
                    return this;
                case NodeType.Delete:
                    this.operand = typeFlow.typeCheck(this.operand);
                    this.type = typeFlow.booleanType;
                    break;
                case NodeType.TypeAssertion:
                    this.castTerm = typeFlow.typeCheck(this.castTerm);
                    var applyTargetType = !this.operand.isParenthesized;
                    var targetType = applyTargetType ? this.castTerm.type : null;
                    typeFlow.checker.typeCheckWithContextualType(targetType, typeFlow.checker.inProvisionalTypecheckMode(), true, this.operand);
                    typeFlow.castWithCoercion(this.operand, this.castTerm.type, false, true);
                    this.type = this.castTerm.type;
                    return this;
                case NodeType.Void:
                    // REVIEW - Although this is good to do for completeness's sake,
                    // this shouldn't be strictly necessary from the void operator's
                    // point of view
                    this.operand = typeFlow.typeCheck(this.operand);
                    this.type = typeFlow.checker.undefinedType;
                    break;
                default:
                    throw new Error("please implement in derived class");
            }
            return this;
        }
        emit(emitter, tokenId, startLine) {
            emitter.emitParensAndCommentsInPlace(this, true);
            emitter.recordSourceMappingStart(this);
            switch (this.nodeType) {
                case NodeType.IncPost:
                    emitter.emitJavascript(this.operand, TokenID.PlusPlus, false);
                    emitter.writeToOutput("++");
                    break;
                case NodeType.LogNot:
                    emitter.writeToOutput("!");
                    emitter.emitJavascript(this.operand, TokenID.Exclamation, false);
                    break;
                case NodeType.DecPost:
                    emitter.emitJavascript(this.operand, TokenID.MinusMinus, false);
                    emitter.writeToOutput("--");
                    break;
                case NodeType.ObjectLit:
                    emitter.emitObjectLiteral(this.operand);
                    break;
                case NodeType.ArrayLit:
                    emitter.emitArrayLiteral(this.operand);
                    break;
                case NodeType.Not:
                    emitter.writeToOutput("~");
                    emitter.emitJavascript(this.operand, TokenID.Tilde, false);
                    break;
                case NodeType.Neg:
                    emitter.writeToOutput("-");
                    if (this.operand.nodeType == NodeType.Neg) {
                        this.operand.isParenthesized = true;
                    }
                    emitter.emitJavascript(this.operand, TokenID.Minus, false);
                    break;
                case NodeType.Pos:
                    emitter.writeToOutput("+");
                    if (this.operand.nodeType == NodeType.Pos) {
                        this.operand.isParenthesized = true;
                    }
                    emitter.emitJavascript(this.operand, TokenID.Plus, false);
                    break;
                case NodeType.IncPre:
                    emitter.writeToOutput("++");
                    emitter.emitJavascript(this.operand, TokenID.PlusPlus, false);
                    break;
                case NodeType.DecPre:
                    emitter.writeToOutput("--");
                    emitter.emitJavascript(this.operand, TokenID.MinusMinus, false);
                    break;
                case NodeType.Throw:
                    emitter.writeToOutput("throw ");
                    emitter.emitJavascript(this.operand, TokenID.Tilde, false);
                    emitter.writeToOutput(";");
                    break;
                case NodeType.Typeof:
                    emitter.writeToOutput("typeof ");
                    emitter.emitJavascript(this.operand, TokenID.Tilde, false);
                    break;
                case NodeType.Delete:
                    emitter.writeToOutput("delete ");
                    emitter.emitJavascript(this.operand, TokenID.Tilde, false);
                    break;
                case NodeType.Void:
                    emitter.writeToOutput("void ");
                    emitter.emitJavascript(this.operand, TokenID.Tilde, false);
                    break;
                case NodeType.TypeAssertion:
                    emitter.emitJavascript(this.operand, TokenID.Tilde, false);
                    break;
                default:
                    throw new Error("please implement in derived class");
            }
            emitter.recordSourceMappingEnd(this);
            emitter.emitParensAndCommentsInPlace(this, false);
        }
    }
    TypeScript.UnaryExpression = UnaryExpression;
    class CallExpression extends Expression {
        target;
        arguments;
        constructor(nodeType, target, arguments) {
            super(nodeType);
            this.target = target;
            this.arguments = arguments;
            this.minChar = this.target.minChar;
        }
        signature = null;
        typeCheck(typeFlow) {
            if (this.nodeType == NodeType.New) {
                return typeFlow.typeCheckNew(this);
            }
            else {
                return typeFlow.typeCheckCall(this);
            }
        }
        emit(emitter, tokenId, startLine) {
            emitter.emitParensAndCommentsInPlace(this, true);
            emitter.recordSourceMappingStart(this);
            if (this.nodeType == NodeType.New) {
                emitter.emitNew(this.target, this.arguments);
            }
            else {
                emitter.emitCall(this, this.target, this.arguments);
            }
            emitter.recordSourceMappingEnd(this);
            emitter.emitParensAndCommentsInPlace(this, false);
        }
    }
    TypeScript.CallExpression = CallExpression;
    class BinaryExpression extends Expression {
        operand1;
        operand2;
        constructor(nodeType, operand1, operand2) {
            super(nodeType);
            this.operand1 = operand1;
            this.operand2 = operand2;
        }
        typeCheck(typeFlow) {
            switch (this.nodeType) {
                case NodeType.Dot:
                    return typeFlow.typeCheckDotOperator(this);
                case NodeType.Asg:
                    return typeFlow.typeCheckAsgOperator(this);
                case NodeType.Add:
                case NodeType.Sub:
                case NodeType.Mul:
                case NodeType.Div:
                case NodeType.Mod:
                case NodeType.Or:
                case NodeType.And:
                    return typeFlow.typeCheckArithmeticOperator(this, false);
                case NodeType.Xor:
                    return typeFlow.typeCheckBitwiseOperator(this, false);
                case NodeType.Ne:
                case NodeType.Eq:
                    var text;
                    if (typeFlow.checker.styleSettings.eqeqeq) {
                        text = nodeTypeTable[this.nodeType];
                        typeFlow.checker.errorReporter.styleError(this, "use of " + text);
                    }
                    else if (typeFlow.checker.styleSettings.eqnull) {
                        text = nodeTypeTable[this.nodeType];
                        if ((this.operand2 !== null) && (this.operand2.nodeType == NodeType.Null)) {
                            typeFlow.checker.errorReporter.styleError(this, "use of " + text + " to compare with null");
                        }
                    }
                case NodeType.Eqv:
                case NodeType.NEqv:
                case NodeType.Lt:
                case NodeType.Le:
                case NodeType.Ge:
                case NodeType.Gt:
                    return typeFlow.typeCheckBooleanOperator(this);
                case NodeType.Index:
                    return typeFlow.typeCheckIndex(this);
                case NodeType.Member:
                    this.type = typeFlow.voidType;
                    return this;
                case NodeType.LogOr:
                    return typeFlow.typeCheckLogOr(this);
                case NodeType.LogAnd:
                    return typeFlow.typeCheckLogAnd(this);
                case NodeType.AsgAdd:
                case NodeType.AsgSub:
                case NodeType.AsgMul:
                case NodeType.AsgDiv:
                case NodeType.AsgMod:
                case NodeType.AsgOr:
                case NodeType.AsgAnd:
                    return typeFlow.typeCheckArithmeticOperator(this, true);
                case NodeType.AsgXor:
                    return typeFlow.typeCheckBitwiseOperator(this, true);
                case NodeType.Lsh:
                case NodeType.Rsh:
                case NodeType.Rs2:
                    return typeFlow.typeCheckShift(this, false);
                case NodeType.AsgLsh:
                case NodeType.AsgRsh:
                case NodeType.AsgRs2:
                    return typeFlow.typeCheckShift(this, true);
                case NodeType.Comma:
                    return typeFlow.typeCheckCommaOperator(this);
                case NodeType.InstOf:
                    return typeFlow.typeCheckInstOf(this);
                case NodeType.In:
                    return typeFlow.typeCheckInOperator(this);
                case NodeType.From:
                    typeFlow.checker.errorReporter.simpleError(this, "Illegal use of 'from' keyword in binary expression");
                    break;
                default:
                    throw new Error("please implement in derived class");
            }
            return this;
        }
        emit(emitter, tokenId, startLine) {
            var binTokenId = nodeTypeToTokTable[this.nodeType];
            emitter.emitParensAndCommentsInPlace(this, true);
            emitter.recordSourceMappingStart(this);
            if (binTokenId != undefined) {
                emitter.emitJavascript(this.operand1, binTokenId, false);
                if (tokenTable[binTokenId].text == "instanceof") {
                    emitter.writeToOutput(" instanceof ");
                }
                else if (tokenTable[binTokenId].text == "in") {
                    emitter.writeToOutput(" in ");
                }
                else {
                    emitter.writeToOutputTrimmable(" " + tokenTable[binTokenId].text + " ");
                }
                emitter.emitJavascript(this.operand2, binTokenId, false);
            }
            else {
                switch (this.nodeType) {
                    case NodeType.Dot:
                        if (!emitter.tryEmitConstant(this)) {
                            emitter.emitJavascript(this.operand1, TokenID.Dot, false);
                            emitter.writeToOutput(".");
                            emitter.emitJavascriptName(this.operand2, false);
                        }
                        break;
                    case NodeType.Index:
                        emitter.emitIndex(this.operand1, this.operand2);
                        break;
                    case NodeType.Member:
                        if (this.operand2.nodeType == NodeType.FuncDecl && this.operand2.isAccessor()) {
                            var funcDecl = this.operand2;
                            if (hasFlag(funcDecl.fncFlags, FncFlags.GetAccessor)) {
                                emitter.writeToOutput("get ");
                            }
                            else {
                                emitter.writeToOutput("set ");
                            }
                            emitter.emitJavascript(this.operand1, TokenID.Colon, false);
                        }
                        else {
                            emitter.emitJavascript(this.operand1, TokenID.Colon, false);
                            emitter.writeToOutputTrimmable(": ");
                        }
                        emitter.emitJavascript(this.operand2, TokenID.Comma, false);
                        break;
                    case NodeType.Comma:
                        emitter.emitJavascript(this.operand1, TokenID.Comma, false);
                        if (emitter.emitState.inObjectLiteral) {
                            emitter.writeLineToOutput(", ");
                        }
                        else {
                            emitter.writeToOutput(",");
                        }
                        emitter.emitJavascript(this.operand2, TokenID.Comma, false);
                        break;
                    case NodeType.Is:
                        throw new Error("should be de-sugared during type check");
                    default:
                        throw new Error("please implement in derived class");
                }
            }
            emitter.recordSourceMappingEnd(this);
            emitter.emitParensAndCommentsInPlace(this, false);
        }
    }
    TypeScript.BinaryExpression = BinaryExpression;
    class ConditionalExpression extends Expression {
        operand1;
        operand2;
        operand3;
        constructor(operand1, operand2, operand3) {
            super(NodeType.ConditionalExpression);
            this.operand1 = operand1;
            this.operand2 = operand2;
            this.operand3 = operand3;
        }
        typeCheck(typeFlow) {
            return typeFlow.typeCheckQMark(this);
        }
        emit(emitter, tokenId, startLine) {
            emitter.emitParensAndCommentsInPlace(this, true);
            emitter.recordSourceMappingStart(this);
            emitter.emitJavascript(this.operand1, TokenID.Question, false);
            emitter.writeToOutput(" ? ");
            emitter.emitJavascript(this.operand2, TokenID.Question, false);
            emitter.writeToOutput(" : ");
            emitter.emitJavascript(this.operand3, TokenID.Question, false);
            emitter.recordSourceMappingEnd(this);
            emitter.emitParensAndCommentsInPlace(this, false);
        }
    }
    TypeScript.ConditionalExpression = ConditionalExpression;
    class NumberLiteral extends Expression {
        value;
        hasEmptyFraction;
        constructor(value, hasEmptyFraction) {
            super(NodeType.NumberLit);
            this.value = value;
            this.hasEmptyFraction = hasEmptyFraction;
        }
        isNegativeZero = false;
        typeCheck(typeFlow) {
            this.type = typeFlow.doubleType;
            return this;
        }
        treeViewLabel() {
            return "num: " + this.printLabel();
        }
        emit(emitter, tokenId, startLine) {
            emitter.emitParensAndCommentsInPlace(this, true);
            emitter.recordSourceMappingStart(this);
            if (this.isNegativeZero) {
                emitter.writeToOutput("-");
            }
            emitter.writeToOutput(this.value.toString());
            if (this.hasEmptyFraction)
                emitter.writeToOutput(".0");
            emitter.recordSourceMappingEnd(this);
            emitter.emitParensAndCommentsInPlace(this, false);
        }
        printLabel() {
            if (Math.floor(this.value) != this.value) {
                return this.value.toFixed(2).toString();
            }
            else if (this.hasEmptyFraction) {
                return this.value.toString() + ".0";
            }
            else {
                return this.value.toString();
            }
        }
    }
    TypeScript.NumberLiteral = NumberLiteral;
    class RegexLiteral extends Expression {
        regex;
        constructor(regex) {
            super(NodeType.Regex);
            this.regex = regex;
        }
        typeCheck(typeFlow) {
            this.type = typeFlow.regexType;
            return this;
        }
        emit(emitter, tokenId, startLine) {
            emitter.emitParensAndCommentsInPlace(this, true);
            emitter.recordSourceMappingStart(this);
            emitter.writeToOutput(this.regex.toString());
            emitter.recordSourceMappingEnd(this);
            emitter.emitParensAndCommentsInPlace(this, false);
        }
    }
    TypeScript.RegexLiteral = RegexLiteral;
    class StringLiteral extends Expression {
        text;
        constructor(text) {
            super(NodeType.QString);
            this.text = text;
        }
        emit(emitter, tokenId, startLine) {
            emitter.emitParensAndCommentsInPlace(this, true);
            emitter.recordSourceMappingStart(this);
            emitter.emitStringLiteral(this.text);
            emitter.recordSourceMappingEnd(this);
            emitter.emitParensAndCommentsInPlace(this, false);
        }
        typeCheck(typeFlow) {
            this.type = typeFlow.stringType;
            return this;
        }
        treeViewLabel() {
            return "st: " + this.text;
        }
        printLabel() {
            return this.text;
        }
    }
    TypeScript.StringLiteral = StringLiteral;
    class ModuleElement extends AST {
        constructor(nodeType) {
            super(nodeType);
        }
    }
    TypeScript.ModuleElement = ModuleElement;
    class ImportDeclaration extends ModuleElement {
        id;
        alias;
        isStatementOrExpression() { return true; }
        varFlags = VarFlags.None;
        isDynamicImport = false;
        constructor(id, alias) {
            super(NodeType.ImportDeclaration);
            this.id = id;
            this.alias = alias;
        }
        emit(emitter, tokenId, startLine) {
            var mod = this.alias.type;
            // REVIEW: Only modules may be aliased for now, though there's no real
            // restriction on what the type symbol may be
            if (!this.isDynamicImport || (this.id.sym && !this.id.sym.onlyReferencedAsTypeRef)) {
                var prevModAliasId = emitter.modAliasId;
                var prevFirstModAlias = emitter.firstModAlias;
                emitter.recordSourceMappingStart(this);
                emitter.emitParensAndCommentsInPlace(this, true);
                emitter.writeToOutput("var " + this.id.actualText + " = ");
                emitter.modAliasId = this.id.actualText;
                emitter.firstModAlias = this.firstAliasedModToString();
                emitter.emitJavascript(this.alias, TokenID.Tilde, false);
                // the dynamic import case will insert the semi-colon automatically
                if (!this.isDynamicImport) {
                    emitter.writeToOutput(";");
                }
                emitter.emitParensAndCommentsInPlace(this, false);
                emitter.recordSourceMappingEnd(this);
                emitter.modAliasId = prevModAliasId;
                emitter.firstModAlias = prevFirstModAlias;
            }
        }
        typeCheck(typeFlow) {
            return typeFlow.typeCheckImportDecl(this);
        }
        getAliasName(aliasAST = this.alias) {
            if (aliasAST.nodeType == NodeType.Name) {
                return aliasAST.actualText;
            }
            else {
                var dotExpr = aliasAST;
                return this.getAliasName(dotExpr.operand1) + "." + this.getAliasName(dotExpr.operand2);
            }
        }
        firstAliasedModToString() {
            if (this.alias.nodeType == NodeType.Name) {
                return this.alias.actualText;
            }
            else {
                var dotExpr = this.alias;
                var firstMod = dotExpr.operand1;
                return firstMod.actualText;
            }
        }
    }
    TypeScript.ImportDeclaration = ImportDeclaration;
    class BoundDecl extends AST {
        id;
        nestingLevel;
        init = null;
        typeExpr = null;
        varFlags = VarFlags.None;
        sym = null;
        constructor(id, nodeType, nestingLevel) {
            super(nodeType);
            this.id = id;
            this.nestingLevel = nestingLevel;
        }
        isStatementOrExpression() { return true; }
        isPrivate() { return hasFlag(this.varFlags, VarFlags.Private); }
        isPublic() { return hasFlag(this.varFlags, VarFlags.Public); }
        isProperty() { return hasFlag(this.varFlags, VarFlags.Property); }
        typeCheck(typeFlow) {
            return typeFlow.typeCheckBoundDecl(this);
        }
        printLabel() {
            return this.treeViewLabel();
        }
    }
    TypeScript.BoundDecl = BoundDecl;
    class VarDecl extends BoundDecl {
        constructor(id, nest) {
            super(id, NodeType.VarDecl, nest);
        }
        isAmbient() { return hasFlag(this.varFlags, VarFlags.Ambient); }
        isExported() { return hasFlag(this.varFlags, VarFlags.Exported); }
        isStatic() { return hasFlag(this.varFlags, VarFlags.Static); }
        emit(emitter, tokenId, startLine) {
            emitter.emitJavascriptVarDecl(this, tokenId);
        }
        treeViewLabel() {
            return "var " + this.id.actualText;
        }
    }
    TypeScript.VarDecl = VarDecl;
    class ArgDecl extends BoundDecl {
        constructor(id) {
            super(id, NodeType.ArgDecl, 0);
        }
        isOptional = false;
        isOptionalArg() { return this.isOptional || this.init; }
        treeViewLabel() {
            return "arg: " + this.id.actualText;
        }
        parameterPropertySym = null;
        emit(emitter, tokenId, startLine) {
            emitter.emitParensAndCommentsInPlace(this, true);
            emitter.recordSourceMappingStart(this);
            emitter.writeToOutput(this.id.actualText);
            emitter.recordSourceMappingEnd(this);
            emitter.emitParensAndCommentsInPlace(this, false);
        }
    }
    TypeScript.ArgDecl = ArgDecl;
    var internalId = 0;
    class FuncDecl extends AST {
        name;
        bod;
        isConstructor;
        arguments;
        vars;
        scopes;
        statics;
        hint = null;
        fncFlags = FncFlags.None;
        returnTypeAnnotation = null;
        symbols;
        variableArgList = false;
        signature;
        envids;
        jumpRefs = null;
        internalNameCache = null;
        tmp1Declared = false;
        enclosingFnc = null;
        freeVariables = [];
        unitIndex = -1;
        classDecl = null;
        boundToProperty = null;
        isOverload = false;
        innerStaticFuncs = [];
        isTargetTypedAsMethod = false;
        isInlineCallLiteral = false;
        accessorSymbol = null;
        leftCurlyCount = 0;
        rightCurlyCount = 0;
        returnStatementsWithExpressions = [];
        scopeType = null; // Type of the FuncDecl, before target typing
        endingToken = null;
        constructor(name, bod, isConstructor, arguments, vars, scopes, statics, nodeType) {
            super(nodeType);
            this.name = name;
            this.bod = bod;
            this.isConstructor = isConstructor;
            this.arguments = arguments;
            this.vars = vars;
            this.scopes = scopes;
            this.statics = statics;
        }
        internalName() {
            if (this.internalNameCache == null) {
                var extName = this.getNameText();
                if (extName) {
                    this.internalNameCache = "_internal_" + extName;
                }
                else {
                    this.internalNameCache = "_internal_" + internalId++;
                }
            }
            return this.internalNameCache;
        }
        hasSelfReference() { return hasFlag(this.fncFlags, FncFlags.HasSelfReference); }
        setHasSelfReference() { this.fncFlags |= FncFlags.HasSelfReference; }
        addCloRef(id, sym) {
            if (this.envids == null) {
                this.envids = new Identifier[];
            }
            this.envids[this.envids.length] = id;
            var outerFnc = this.enclosingFnc;
            if (sym) {
                while (outerFnc && (outerFnc.type.symbol != sym.container)) {
                    outerFnc.addJumpRef(sym);
                    outerFnc = outerFnc.enclosingFnc;
                }
            }
            return this.envids.length - 1;
        }
        addJumpRef(sym) {
            if (this.jumpRefs == null) {
                this.jumpRefs = new Identifier[];
            }
            var id = new Identifier(sym.name);
            this.jumpRefs[this.jumpRefs.length] = id;
            id.sym = sym;
            id.cloId = this.addCloRef(id, null);
        }
        buildControlFlow() {
            var entry = new BasicBlock();
            var exit = new BasicBlock();
            var context = new ControlFlowContext(entry, exit);
            var controlFlowPrefix = (ast, parent, walker) => {
                ast.addToControlFlow(walker.state);
                return ast;
            };
            var walker = getAstWalkerFactory().getWalker(controlFlowPrefix, null, null, context);
            context.walker = walker;
            walker.walk(this.bod, this);
            return context;
        }
        typeCheck(typeFlow) {
            return typeFlow.typeCheckFunction(this);
        }
        emit(emitter, tokenId, startLine) {
            emitter.emitJavascriptFunction(this);
        }
        getNameText() {
            if (this.name) {
                return this.name.actualText;
            }
            else {
                return this.hint;
            }
        }
        isMethod() {
            return (this.fncFlags & FncFlags.Method) != FncFlags.None;
        }
        isCallMember() { return hasFlag(this.fncFlags, FncFlags.CallMember); }
        isConstructMember() { return hasFlag(this.fncFlags, FncFlags.ConstructMember); }
        isIndexerMember() { return hasFlag(this.fncFlags, FncFlags.IndexerMember); }
        isSpecialFn() { return this.isCallMember() || this.isIndexerMember() || this.isConstructMember(); }
        isAnonymousFn() { return this.name === null; }
        isAccessor() { return hasFlag(this.fncFlags, FncFlags.GetAccessor) || hasFlag(this.fncFlags, FncFlags.SetAccessor); }
        isGetAccessor() { return hasFlag(this.fncFlags, FncFlags.GetAccessor); }
        isSetAccessor() { return hasFlag(this.fncFlags, FncFlags.SetAccessor); }
        isAmbient() { return hasFlag(this.fncFlags, FncFlags.Ambient); }
        isExported() { return hasFlag(this.fncFlags, FncFlags.Exported); }
        isPrivate() { return hasFlag(this.fncFlags, FncFlags.Private); }
        isPublic() { return hasFlag(this.fncFlags, FncFlags.Public); }
        isStatic() { return hasFlag(this.fncFlags, FncFlags.Static); }
        treeViewLabel() {
            if (this.name == null) {
                return "funcExpr";
            }
            else {
                return "func: " + this.name.actualText;
            }
        }
        ClearFlags() {
            this.fncFlags = FncFlags.None;
        }
        isSignature() { return (this.fncFlags & FncFlags.Signature) != FncFlags.None; }
        hasStaticDeclarations() { return (!this.isConstructor && (this.statics.members.length > 0 || this.innerStaticFuncs.length > 0)); }
    }
    TypeScript.FuncDecl = FuncDecl;
    class LocationInfo {
        filename;
        lineMap;
        unitIndex;
        constructor(filename, lineMap, unitIndex) {
            this.filename = filename;
            this.lineMap = lineMap;
            this.unitIndex = unitIndex;
        }
    }
    TypeScript.LocationInfo = LocationInfo;
    TypeScript.unknownLocationInfo = new LocationInfo("unknown", null, -1);
    class Script extends FuncDecl {
        locationInfo = null;
        referencedFiles = [];
        requiresGlobal = false;
        requiresInherits = false;
        isResident = false;
        isDeclareFile = false;
        hasBeenTypeChecked = false;
        topLevelMod = null;
        leftCurlyCount = 0;
        rightCurlyCount = 0;
        vars;
        scopes;
        // Remember if the script contains Unicode chars, that is needed when generating code for this script object to decide the output file correct encoding.
        containsUnicodeChar = false;
        containsUnicodeCharInComment = false;
        constructor(vars, scopes) {
            super(new Identifier("script"), null, false, null, vars, scopes, null, NodeType.Script);
            this.vars = vars;
            this.scopes = scopes;
        }
        typeCheck(typeFlow) {
            return typeFlow.typeCheckScript(this);
        }
        treeViewLabel() {
            return "Script";
        }
        emitRequired() {
            if (!this.isDeclareFile && !this.isResident && this.bod) {
                for (var i = 0, len = this.bod.members.length; i < len; i++) {
                    var stmt = this.bod.members[i];
                    if (stmt.nodeType == NodeType.ModuleDeclaration) {
                        if (!hasFlag(stmt.modFlags, ModuleFlags.ShouldEmitModuleDecl | ModuleFlags.Ambient)) {
                            return true;
                        }
                    }
                    else if (stmt.nodeType == NodeType.ClassDeclaration) {
                        if (!hasFlag(stmt.varFlags, VarFlags.Ambient)) {
                            return true;
                        }
                    }
                    else if (stmt.nodeType == NodeType.VarDecl) {
                        if (!hasFlag(stmt.varFlags, VarFlags.Ambient)) {
                            return true;
                        }
                    }
                    else if (stmt.nodeType == NodeType.FuncDecl) {
                        if (!stmt.isSignature()) {
                            return true;
                        }
                    }
                    else if (stmt.nodeType != NodeType.InterfaceDeclaration && stmt.nodeType != NodeType.Empty) {
                        return true;
                    }
                }
            }
            return false;
        }
        emit(emitter, tokenId, startLine) {
            if (this.emitRequired()) {
                emitter.emitParensAndCommentsInPlace(this, true);
                emitter.recordSourceMappingStart(this);
                emitter.emitJavascriptList(this.bod, null, TokenID.Semicolon, true, false, false, true, this.requiresInherits);
                emitter.recordSourceMappingEnd(this);
                emitter.emitParensAndCommentsInPlace(this, false);
            }
        }
    }
    TypeScript.Script = Script;
    class NamedDeclaration extends ModuleElement {
        name;
        members;
        leftCurlyCount = 0;
        rightCurlyCount = 0;
        constructor(nodeType, name, members) {
            super(nodeType);
            this.name = name;
            this.members = members;
        }
    }
    TypeScript.NamedDeclaration = NamedDeclaration;
    class ModuleDeclaration extends NamedDeclaration {
        endingToken;
        modFlags = ModuleFlags.ShouldEmitModuleDecl;
        mod;
        prettyName;
        amdDependencies = [];
        vars;
        scopes;
        // Remember if the module contains Unicode chars, that is needed for dynamic module as we will generate a file for each.
        containsUnicodeChar = false;
        containsUnicodeCharInComment = false;
        constructor(name, members, vars, scopes, endingToken) {
            super(NodeType.ModuleDeclaration, name, members);
            this.endingToken = endingToken;
            this.vars = vars;
            this.scopes = scopes;
            this.prettyName = this.name.actualText;
        }
        isExported() { return hasFlag(this.modFlags, ModuleFlags.Exported); }
        isAmbient() { return hasFlag(this.modFlags, ModuleFlags.Ambient); }
        isEnum() { return hasFlag(this.modFlags, ModuleFlags.IsEnum); }
        recordNonInterface() {
            this.modFlags &= ~ModuleFlags.ShouldEmitModuleDecl;
        }
        typeCheck(typeFlow) {
            return typeFlow.typeCheckModule(this);
        }
        emit(emitter, tokenId, startLine) {
            if (!hasFlag(this.modFlags, ModuleFlags.ShouldEmitModuleDecl)) {
                emitter.emitParensAndCommentsInPlace(this, true);
                emitter.recordSourceMappingStart(this);
                emitter.emitJavascriptModule(this);
                emitter.recordSourceMappingEnd(this);
                emitter.emitParensAndCommentsInPlace(this, false);
            }
        }
    }
    TypeScript.ModuleDeclaration = ModuleDeclaration;
    class TypeDeclaration extends NamedDeclaration {
        extendsList;
        implementsList;
        varFlags = VarFlags.None;
        constructor(nodeType, name, extendsList, implementsList, members) {
            super(nodeType, name, members);
            this.extendsList = extendsList;
            this.implementsList = implementsList;
        }
        isExported() {
            return hasFlag(this.varFlags, VarFlags.Exported);
        }
        isAmbient() {
            return hasFlag(this.varFlags, VarFlags.Ambient);
        }
    }
    TypeScript.TypeDeclaration = TypeDeclaration;
    class ClassDeclaration extends TypeDeclaration {
        knownMemberNames = {};
        constructorDecl = null;
        constructorNestingLevel = 0;
        endingToken = null;
        constructor(name, members, extendsList, implementsList) {
            super(NodeType.ClassDeclaration, name, extendsList, implementsList, members);
        }
        typeCheck(typeFlow) {
            return typeFlow.typeCheckClass(this);
        }
        emit(emitter, tokenId, startLine) {
            emitter.emitJavascriptClass(this);
        }
    }
    TypeScript.ClassDeclaration = ClassDeclaration;
    class InterfaceDeclaration extends TypeDeclaration {
        constructor(name, members, extendsList, implementsList) {
            super(NodeType.InterfaceDeclaration, name, extendsList, implementsList, members);
        }
        typeCheck(typeFlow) {
            return typeFlow.typeCheckInterface(this);
        }
        emit(emitter, tokenId, startLine) {
        }
    }
    TypeScript.InterfaceDeclaration = InterfaceDeclaration;
    class Statement extends ModuleElement {
        constructor(nodeType) {
            super(nodeType);
            this.flags |= ASTFlags.IsStatement;
        }
        isLoop() { return false; }
        isStatementOrExpression() { return true; }
        isCompoundStatement() { return this.isLoop(); }
        typeCheck(typeFlow) {
            this.type = typeFlow.voidType;
            return this;
        }
    }
    TypeScript.Statement = Statement;
    class LabeledStatement extends Statement {
        labels;
        stmt;
        constructor(labels, stmt) {
            super(NodeType.LabeledStatement);
            this.labels = labels;
            this.stmt = stmt;
        }
        emit(emitter, tokenId, startLine) {
            emitter.emitParensAndCommentsInPlace(this, true);
            emitter.recordSourceMappingStart(this);
            if (this.labels) {
                var labelsLen = this.labels.members.length;
                for (var i = 0; i < labelsLen; i++) {
                    this.labels.members[i].emit(emitter, tokenId, startLine);
                }
            }
            this.stmt.emit(emitter, tokenId, true);
            emitter.recordSourceMappingEnd(this);
            emitter.emitParensAndCommentsInPlace(this, false);
        }
        typeCheck(typeFlow) {
            typeFlow.typeCheck(this.labels);
            this.stmt = this.stmt.typeCheck(typeFlow);
            return this;
        }
        addToControlFlow(context) {
            var beforeBB = context.current;
            var bb = new BasicBlock();
            context.current = bb;
            beforeBB.addSuccessor(bb);
        }
    }
    TypeScript.LabeledStatement = LabeledStatement;
    class Block extends Statement {
        statements;
        isStatementBlock;
        constructor(statements, isStatementBlock) {
            super(NodeType.Block);
            this.statements = statements;
            this.isStatementBlock = isStatementBlock;
        }
        emit(emitter, tokenId, startLine) {
            emitter.emitParensAndCommentsInPlace(this, true);
            emitter.recordSourceMappingStart(this);
            if (this.isStatementBlock) {
                emitter.writeLineToOutput(" {");
                emitter.indenter.increaseIndent();
            }
            else {
                emitter.setInVarBlock(this.statements.members.length);
            }
            var temp = emitter.setInObjectLiteral(false);
            if (this.statements) {
                emitter.emitJavascriptList(this.statements, null, TokenID.Semicolon, true, false, false);
            }
            if (this.isStatementBlock) {
                emitter.indenter.decreaseIndent();
                emitter.emitIndent();
                emitter.writeToOutput("}");
            }
            emitter.setInObjectLiteral(temp);
            emitter.recordSourceMappingEnd(this);
            emitter.emitParensAndCommentsInPlace(this, false);
        }
        addToControlFlow(context) {
            var afterIfNeeded = new BasicBlock();
            context.pushStatement(this, context.current, afterIfNeeded);
            if (this.statements) {
                context.walk(this.statements, this);
            }
            context.walker.options.goChildren = false;
            context.popStatement();
            if (afterIfNeeded.predecessors.length > 0) {
                context.current.addSuccessor(afterIfNeeded);
                context.current = afterIfNeeded;
            }
        }
        typeCheck(typeFlow) {
            if (!typeFlow.checker.styleSettings.emptyBlocks) {
                if ((this.statements === null) || (this.statements.members.length == 0)) {
                    typeFlow.checker.errorReporter.styleError(this, "empty block");
                }
            }
            typeFlow.typeCheck(this.statements);
            return this;
        }
    }
    TypeScript.Block = Block;
    class Jump extends Statement {
        target = null;
        hasExplicitTarget() { return (this.target); }
        resolvedTarget = null;
        constructor(nodeType) {
            super(nodeType);
        }
        setResolvedTarget(parser, stmt) {
            if (stmt.isLoop()) {
                this.resolvedTarget = stmt;
                return true;
            }
            if (this.nodeType === NodeType.Continue) {
                parser.reportParseError("continue statement applies only to loops");
                return false;
            }
            else {
                if ((stmt.nodeType == NodeType.Switch) || this.hasExplicitTarget()) {
                    this.resolvedTarget = stmt;
                    return true;
                }
                else {
                    parser.reportParseError("break statement with no label can apply only to a loop or switch statement");
                    return false;
                }
            }
        }
        addToControlFlow(context) {
            super.addToControlFlow(context);
            context.unconditionalBranch(this.resolvedTarget, (this.nodeType == NodeType.Continue));
        }
        emit(emitter, tokenId, startLine) {
            emitter.emitParensAndCommentsInPlace(this, true);
            emitter.recordSourceMappingStart(this);
            if (this.nodeType == NodeType.Break) {
                emitter.writeToOutput("break");
            }
            else {
                emitter.writeToOutput("continue");
            }
            if (this.hasExplicitTarget()) {
                emitter.writeToOutput(" " + this.target);
            }
            emitter.recordSourceMappingEnd(this);
            emitter.writeToOutput(";");
            emitter.emitParensAndCommentsInPlace(this, false);
        }
    }
    TypeScript.Jump = Jump;
    class WhileStatement extends Statement {
        cond;
        body = null;
        constructor(cond) {
            super(NodeType.While);
            this.cond = cond;
        }
        isLoop() { return true; }
        emit(emitter, tokenId, startLine) {
            emitter.emitParensAndCommentsInPlace(this, true);
            emitter.recordSourceMappingStart(this);
            var temp = emitter.setInObjectLiteral(false);
            emitter.writeToOutput("while(");
            emitter.emitJavascript(this.cond, TokenID.While, false);
            emitter.writeToOutput(")");
            emitter.emitJavascriptStatements(this.body, false, false);
            emitter.setInObjectLiteral(temp);
            emitter.recordSourceMappingEnd(this);
            emitter.emitParensAndCommentsInPlace(this, false);
        }
        typeCheck(typeFlow) {
            return typeFlow.typeCheckWhile(this);
        }
        addToControlFlow(context) {
            var loopHeader = context.current;
            var loopStart = new BasicBlock();
            var afterLoop = new BasicBlock();
            loopHeader.addSuccessor(loopStart);
            context.current = loopStart;
            context.addContent(this.cond);
            var condBlock = context.current;
            var targetInfo = null;
            if (this.body) {
                context.current = new BasicBlock();
                condBlock.addSuccessor(context.current);
                context.pushStatement(this, loopStart, afterLoop);
                context.walk(this.body, this);
                targetInfo = context.popStatement();
            }
            if (!(context.noContinuation)) {
                var loopEnd = context.current;
                loopEnd.addSuccessor(loopStart);
            }
            context.current = afterLoop;
            condBlock.addSuccessor(afterLoop);
            // TODO: check for while (true) and then only continue if afterLoop has predecessors
            context.noContinuation = false;
            context.walker.options.goChildren = false;
        }
    }
    TypeScript.WhileStatement = WhileStatement;
    class DoWhileStatement extends Statement {
        body = null;
        whileAST = null;
        cond = null;
        isLoop() { return true; }
        constructor() {
            super(NodeType.DoWhile);
        }
        emit(emitter, tokenId, startLine) {
            emitter.emitParensAndCommentsInPlace(this, true);
            emitter.recordSourceMappingStart(this);
            var temp = emitter.setInObjectLiteral(false);
            emitter.writeToOutput("do");
            emitter.emitJavascriptStatements(this.body, true, false);
            emitter.recordSourceMappingStart(this.whileAST);
            emitter.writeToOutput("while");
            emitter.recordSourceMappingEnd(this.whileAST);
            emitter.writeToOutput('(');
            emitter.emitJavascript(this.cond, TokenID.CloseParen, false);
            emitter.writeToOutput(")");
            emitter.setInObjectLiteral(temp);
            emitter.recordSourceMappingEnd(this);
            emitter.emitParensAndCommentsInPlace(this, false);
        }
        typeCheck(typeFlow) {
            return typeFlow.typeCheckDoWhile(this);
        }
        addToControlFlow(context) {
            var loopHeader = context.current;
            var loopStart = new BasicBlock();
            var afterLoop = new BasicBlock();
            loopHeader.addSuccessor(loopStart);
            context.current = loopStart;
            var targetInfo = null;
            if (this.body) {
                context.pushStatement(this, loopStart, afterLoop);
                context.walk(this.body, this);
                targetInfo = context.popStatement();
            }
            if (!(context.noContinuation)) {
                var loopEnd = context.current;
                loopEnd.addSuccessor(loopStart);
                context.addContent(this.cond);
                // TODO: check for while (true) 
                context.current = afterLoop;
                loopEnd.addSuccessor(afterLoop);
            }
            else {
                context.addUnreachable(this.cond);
            }
            context.walker.options.goChildren = false;
        }
    }
    TypeScript.DoWhileStatement = DoWhileStatement;
    class IfStatement extends Statement {
        cond;
        thenBod;
        elseBod = null;
        statement = new ASTSpan();
        constructor(cond) {
            super(NodeType.If);
            this.cond = cond;
        }
        isCompoundStatement() { return true; }
        emit(emitter, tokenId, startLine) {
            emitter.emitParensAndCommentsInPlace(this, true);
            emitter.recordSourceMappingStart(this);
            var temp = emitter.setInObjectLiteral(false);
            emitter.recordSourceMappingStart(this.statement);
            emitter.writeToOutput("if(");
            emitter.emitJavascript(this.cond, TokenID.If, false);
            emitter.writeToOutput(")");
            emitter.recordSourceMappingEnd(this.statement);
            emitter.emitJavascriptStatements(this.thenBod, true, false);
            if (this.elseBod) {
                emitter.writeToOutput(" else");
                emitter.emitJavascriptStatements(this.elseBod, true, true);
            }
            emitter.setInObjectLiteral(temp);
            emitter.recordSourceMappingEnd(this);
            emitter.emitParensAndCommentsInPlace(this, false);
        }
        typeCheck(typeFlow) {
            return typeFlow.typeCheckIf(this);
        }
        addToControlFlow(context) {
            this.cond.addToControlFlow(context);
            var afterIf = new BasicBlock();
            var beforeIf = context.current;
            context.pushStatement(this, beforeIf, afterIf);
            var hasContinuation = false;
            context.current = new BasicBlock();
            beforeIf.addSuccessor(context.current);
            context.walk(this.thenBod, this);
            if (!context.noContinuation) {
                hasContinuation = true;
                context.current.addSuccessor(afterIf);
            }
            if (this.elseBod) {
                // current block will be thenBod
                context.current = new BasicBlock();
                context.noContinuation = false;
                beforeIf.addSuccessor(context.current);
                context.walk(this.elseBod, this);
                if (!context.noContinuation) {
                    hasContinuation = true;
                    context.current.addSuccessor(afterIf);
                }
                else {
                    // thenBod created continuation for if statement
                    if (hasContinuation) {
                        context.noContinuation = false;
                    }
                }
            }
            else {
                beforeIf.addSuccessor(afterIf);
                context.noContinuation = false;
                hasContinuation = true;
            }
            var targetInfo = context.popStatement();
            if (afterIf.predecessors.length > 0) {
                context.noContinuation = false;
                hasContinuation = true;
            }
            if (hasContinuation) {
                context.current = afterIf;
            }
            context.walker.options.goChildren = false;
        }
    }
    TypeScript.IfStatement = IfStatement;
    class ReturnStatement extends Statement {
        returnExpression = null;
        constructor() {
            super(NodeType.Return);
        }
        emit(emitter, tokenId, startLine) {
            emitter.emitParensAndCommentsInPlace(this, true);
            emitter.recordSourceMappingStart(this);
            var temp = emitter.setInObjectLiteral(false);
            if (this.returnExpression) {
                emitter.writeToOutput("return ");
                emitter.emitJavascript(this.returnExpression, TokenID.Semicolon, false);
            }
            else {
                emitter.writeToOutput("return;");
            }
            emitter.setInObjectLiteral(temp);
            emitter.recordSourceMappingEnd(this);
            emitter.emitParensAndCommentsInPlace(this, false);
        }
        addToControlFlow(context) {
            super.addToControlFlow(context);
            context.returnStmt();
        }
        typeCheck(typeFlow) {
            return typeFlow.typeCheckReturn(this);
        }
    }
    TypeScript.ReturnStatement = ReturnStatement;
    class EndCode extends AST {
        constructor() {
            super(NodeType.EndCode);
        }
    }
    TypeScript.EndCode = EndCode;
    class ForInStatement extends Statement {
        lval;
        obj;
        constructor(lval, obj) {
            super(NodeType.ForIn);
            this.lval = lval;
            this.obj = obj;
            if (this.lval && (this.lval.nodeType == NodeType.VarDecl)) {
                this.lval.varFlags |= VarFlags.AutoInit;
            }
        }
        statement = new ASTSpan();
        body;
        isLoop() { return true; }
        isFiltered() {
            if (this.body) {
                var singleItem = null;
                if (this.body.nodeType == NodeType.List) {
                    var stmts = this.body;
                    if (stmts.members.length == 1) {
                        singleItem = stmts.members[0];
                    }
                }
                else {
                    singleItem = this.body;
                }
                // match template for filtering 'own' properties from obj
                if (singleItem !== null) {
                    if (singleItem.nodeType == NodeType.Block) {
                        var block = singleItem;
                        if ((block.statements !== null) && (block.statements.members.length == 1)) {
                            singleItem = block.statements.members[0];
                        }
                    }
                    if (singleItem.nodeType == NodeType.If) {
                        var cond = singleItem.cond;
                        if (cond.nodeType == NodeType.Call) {
                            var target = cond.target;
                            if (target.nodeType == NodeType.Dot) {
                                var binex = target;
                                if ((binex.operand1.nodeType == NodeType.Name) &&
                                    (this.obj.nodeType == NodeType.Name) &&
                                    (binex.operand1.actualText == this.obj.actualText)) {
                                    var prop = binex.operand2;
                                    if (prop.actualText == "hasOwnProperty") {
                                        var args = cond.arguments;
                                        if ((args !== null) && (args.members.length == 1)) {
                                            var arg = args.members[0];
                                            if ((arg.nodeType == NodeType.Name) &&
                                                (this.lval.nodeType == NodeType.Name)) {
                                                if ((this.lval.actualText) == arg.actualText) {
                                                    return true;
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
            return false;
        }
        emit(emitter, tokenId, startLine) {
            emitter.emitParensAndCommentsInPlace(this, true);
            emitter.recordSourceMappingStart(this);
            var temp = emitter.setInObjectLiteral(false);
            emitter.recordSourceMappingStart(this.statement);
            emitter.writeToOutput("for(");
            emitter.emitJavascript(this.lval, TokenID.For, false);
            emitter.writeToOutput(" in ");
            emitter.emitJavascript(this.obj, TokenID.For, false);
            emitter.writeToOutput(")");
            emitter.recordSourceMappingEnd(this.statement);
            emitter.emitJavascriptStatements(this.body, true, false);
            emitter.setInObjectLiteral(temp);
            emitter.recordSourceMappingEnd(this);
            emitter.emitParensAndCommentsInPlace(this, false);
        }
        typeCheck(typeFlow) {
            if (typeFlow.checker.styleSettings.forin) {
                if (!this.isFiltered()) {
                    typeFlow.checker.errorReporter.styleError(this, "no hasOwnProperty filter");
                }
            }
            return typeFlow.typeCheckForIn(this);
        }
        addToControlFlow(context) {
            if (this.lval) {
                context.addContent(this.lval);
            }
            if (this.obj) {
                context.addContent(this.obj);
            }
            var loopHeader = context.current;
            var loopStart = new BasicBlock();
            var afterLoop = new BasicBlock();
            loopHeader.addSuccessor(loopStart);
            context.current = loopStart;
            if (this.body) {
                context.pushStatement(this, loopStart, afterLoop);
                context.walk(this.body, this);
                context.popStatement();
            }
            if (!(context.noContinuation)) {
                var loopEnd = context.current;
                loopEnd.addSuccessor(loopStart);
            }
            context.current = afterLoop;
            context.noContinuation = false;
            loopHeader.addSuccessor(afterLoop);
            context.walker.options.goChildren = false;
        }
    }
    TypeScript.ForInStatement = ForInStatement;
    class ForStatement extends Statement {
        init;
        cond;
        body;
        incr;
        constructor(init) {
            super(NodeType.For);
            this.init = init;
        }
        isLoop() { return true; }
        emit(emitter, tokenId, startLine) {
            emitter.emitParensAndCommentsInPlace(this, true);
            emitter.recordSourceMappingStart(this);
            var temp = emitter.setInObjectLiteral(false);
            emitter.writeToOutput("for(");
            if (this.init) {
                if (this.init.nodeType != NodeType.List) {
                    emitter.emitJavascript(this.init, TokenID.For, false);
                }
                else {
                    emitter.setInVarBlock(this.init.members.length);
                    emitter.emitJavascriptList(this.init, null, TokenID.For, false, false, false);
                }
            }
            emitter.writeToOutput("; ");
            emitter.emitJavascript(this.cond, TokenID.For, false);
            emitter.writeToOutput("; ");
            emitter.emitJavascript(this.incr, TokenID.For, false);
            emitter.writeToOutput(")");
            emitter.emitJavascriptStatements(this.body, true, false);
            emitter.setInObjectLiteral(temp);
            emitter.recordSourceMappingEnd(this);
            emitter.emitParensAndCommentsInPlace(this, false);
        }
        typeCheck(typeFlow) {
            return typeFlow.typeCheckFor(this);
        }
        addToControlFlow(context) {
            if (this.init) {
                context.addContent(this.init);
            }
            var loopHeader = context.current;
            var loopStart = new BasicBlock();
            var afterLoop = new BasicBlock();
            loopHeader.addSuccessor(loopStart);
            context.current = loopStart;
            var condBlock = null;
            var continueTarget = loopStart;
            var incrBB = null;
            if (this.incr) {
                incrBB = new BasicBlock();
                continueTarget = incrBB;
            }
            if (this.cond) {
                condBlock = context.current;
                context.addContent(this.cond);
                context.current = new BasicBlock();
                condBlock.addSuccessor(context.current);
            }
            var targetInfo = null;
            if (this.body) {
                context.pushStatement(this, continueTarget, afterLoop);
                context.walk(this.body, this);
                targetInfo = context.popStatement();
            }
            if (this.incr) {
                if (context.noContinuation) {
                    if (incrBB.predecessors.length == 0) {
                        context.addUnreachable(this.incr);
                    }
                }
                else {
                    context.current.addSuccessor(incrBB);
                    context.current = incrBB;
                    context.addContent(this.incr);
                }
            }
            var loopEnd = context.current;
            if (!(context.noContinuation)) {
                loopEnd.addSuccessor(loopStart);
            }
            if (condBlock) {
                condBlock.addSuccessor(afterLoop);
                context.noContinuation = false;
            }
            if (afterLoop.predecessors.length > 0) {
                context.noContinuation = false;
                context.current = afterLoop;
            }
            context.walker.options.goChildren = false;
        }
    }
    TypeScript.ForStatement = ForStatement;
    class WithStatement extends Statement {
        expr;
        body;
        isCompoundStatement() { return true; }
        withSym = null;
        constructor(expr) {
            super(NodeType.With);
            this.expr = expr;
        }
        emit(emitter, tokenId, startLine) {
            emitter.emitParensAndCommentsInPlace(this, true);
            emitter.recordSourceMappingStart(this);
            emitter.writeToOutput("with (");
            if (this.expr) {
                emitter.emitJavascript(this.expr, TokenID.With, false);
            }
            emitter.writeToOutput(")");
            emitter.emitJavascriptStatements(this.body, true, false);
            emitter.recordSourceMappingEnd(this);
            emitter.emitParensAndCommentsInPlace(this, false);
        }
        typeCheck(typeFlow) {
            return typeFlow.typeCheckWith(this);
        }
    }
    TypeScript.WithStatement = WithStatement;
    class SwitchStatement extends Statement {
        val;
        caseList;
        defaultCase = null;
        statement = new ASTSpan();
        constructor(val) {
            super(NodeType.Switch);
            this.val = val;
        }
        isCompoundStatement() { return true; }
        emit(emitter, tokenId, startLine) {
            emitter.emitParensAndCommentsInPlace(this, true);
            emitter.recordSourceMappingStart(this);
            var temp = emitter.setInObjectLiteral(false);
            emitter.recordSourceMappingStart(this.statement);
            emitter.writeToOutput("switch(");
            emitter.emitJavascript(this.val, TokenID.Identifier, false);
            emitter.writeToOutput(")");
            emitter.recordSourceMappingEnd(this.statement);
            emitter.writeLineToOutput(" {");
            emitter.indenter.increaseIndent();
            var casesLen = this.caseList.members.length;
            for (var i = 0; i < casesLen; i++) {
                var caseExpr = this.caseList.members[i];
                emitter.emitJavascript(caseExpr, TokenID.Case, true);
                emitter.writeLineToOutput("");
            }
            emitter.indenter.decreaseIndent();
            emitter.emitIndent();
            emitter.writeToOutput("}");
            emitter.setInObjectLiteral(temp);
            emitter.recordSourceMappingEnd(this);
            emitter.emitParensAndCommentsInPlace(this, false);
        }
        typeCheck(typeFlow) {
            var len = this.caseList.members.length;
            this.val = typeFlow.typeCheck(this.val);
            for (var i = 0; i < len; i++) {
                this.caseList.members[i] = typeFlow.typeCheck(this.caseList.members[i]);
            }
            this.defaultCase = typeFlow.typeCheck(this.defaultCase);
            this.type = typeFlow.voidType;
            return this;
        }
        // if there are break statements that match this switch, then just link cond block with block after switch
        addToControlFlow(context) {
            var condBlock = context.current;
            context.addContent(this.val);
            var execBlock = new BasicBlock();
            var afterSwitch = new BasicBlock();
            condBlock.addSuccessor(execBlock);
            context.pushSwitch(execBlock);
            context.current = execBlock;
            context.pushStatement(this, execBlock, afterSwitch);
            context.walk(this.caseList, this);
            context.popSwitch();
            var targetInfo = context.popStatement();
            var hasCondContinuation = (this.defaultCase == null);
            if (this.defaultCase == null) {
                condBlock.addSuccessor(afterSwitch);
            }
            if (afterSwitch.predecessors.length > 0) {
                context.noContinuation = false;
                context.current = afterSwitch;
            }
            else {
                context.noContinuation = true;
            }
            context.walker.options.goChildren = false;
        }
    }
    TypeScript.SwitchStatement = SwitchStatement;
    class CaseStatement extends Statement {
        expr = null;
        body;
        constructor() {
            super(NodeType.Case);
        }
        emit(emitter, tokenId, startLine) {
            emitter.emitParensAndCommentsInPlace(this, true);
            emitter.recordSourceMappingStart(this);
            if (this.expr) {
                emitter.writeToOutput("case ");
                emitter.emitJavascript(this.expr, TokenID.Identifier, false);
            }
            else {
                emitter.writeToOutput("default");
            }
            emitter.writeToOutput(":");
            emitter.emitJavascriptStatements(this.body, false, false);
            emitter.recordSourceMappingEnd(this);
            emitter.emitParensAndCommentsInPlace(this, false);
        }
        typeCheck(typeFlow) {
            this.expr = typeFlow.typeCheck(this.expr);
            typeFlow.typeCheck(this.body);
            this.type = typeFlow.voidType;
            return this;
        }
        // TODO: more reasoning about unreachable cases (such as duplicate literals as case expressions)
        // for now, assume all cases are reachable, regardless of whether some cases fall through
        addToControlFlow(context) {
            var execBlock = new BasicBlock();
            var sw = context.currentSwitch[context.currentSwitch.length - 1];
            // TODO: fall-through from previous (+ to end of switch)
            if (this.expr) {
                var exprBlock = new BasicBlock();
                context.current = exprBlock;
                sw.addSuccessor(exprBlock);
                context.addContent(this.expr);
                exprBlock.addSuccessor(execBlock);
            }
            else {
                sw.addSuccessor(execBlock);
            }
            context.current = execBlock;
            if (this.body) {
                context.walk(this.body, this);
            }
            context.noContinuation = false;
            context.walker.options.goChildren = false;
        }
    }
    TypeScript.CaseStatement = CaseStatement;
    class TypeReference extends AST {
        term;
        arrayCount;
        constructor(term, arrayCount) {
            super(NodeType.TypeRef);
            this.term = term;
            this.arrayCount = arrayCount;
        }
        emit(emitter, tokenId, startLine) {
            throw new Error("should not emit a type ref");
        }
        typeCheck(typeFlow) {
            var prevInTCTR = typeFlow.inTypeRefTypeCheck;
            typeFlow.inTypeRefTypeCheck = true;
            var typeLink = getTypeLink(this, typeFlow.checker, true);
            typeFlow.checker.resolveTypeLink(typeFlow.scope, typeLink, false);
            if (this.term) {
                typeFlow.typeCheck(this.term);
            }
            typeFlow.checkForVoidConstructor(typeLink.type, this);
            this.type = typeLink.type;
            // in error recovery cases, there may not be a term
            if (this.term) {
                this.term.type = this.type;
            }
            typeFlow.inTypeRefTypeCheck = prevInTCTR;
            return this;
        }
    }
    TypeScript.TypeReference = TypeReference;
    class TryFinally extends Statement {
        tryNode;
        finallyNode;
        constructor(tryNode, finallyNode) {
            super(NodeType.TryFinally);
            this.tryNode = tryNode;
            this.finallyNode = finallyNode;
        }
        isCompoundStatement() { return true; }
        emit(emitter, tokenId, startLine) {
            emitter.recordSourceMappingStart(this);
            emitter.emitJavascript(this.tryNode, TokenID.Try, false);
            emitter.emitJavascript(this.finallyNode, TokenID.Finally, false);
            emitter.recordSourceMappingEnd(this);
        }
        typeCheck(typeFlow) {
            this.tryNode = typeFlow.typeCheck(this.tryNode);
            this.finallyNode = typeFlow.typeCheck(this.finallyNode);
            this.type = typeFlow.voidType;
            return this;
        }
        addToControlFlow(context) {
            var afterFinally = new BasicBlock();
            context.walk(this.tryNode, this);
            var finBlock = new BasicBlock();
            if (context.current) {
                context.current.addSuccessor(finBlock);
            }
            context.current = finBlock;
            context.pushStatement(this, null, afterFinally);
            context.walk(this.finallyNode, this);
            if (!context.noContinuation && context.current) {
                context.current.addSuccessor(afterFinally);
            }
            if (afterFinally.predecessors.length > 0) {
                context.current = afterFinally;
            }
            else {
                context.noContinuation = true;
            }
            context.popStatement();
            context.walker.options.goChildren = false;
        }
    }
    TypeScript.TryFinally = TryFinally;
    class TryCatch extends Statement {
        tryNode;
        catchNode;
        constructor(tryNode, catchNode) {
            super(NodeType.TryCatch);
            this.tryNode = tryNode;
            this.catchNode = catchNode;
        }
        isCompoundStatement() { return true; }
        emit(emitter, tokenId, startLine) {
            emitter.emitParensAndCommentsInPlace(this, true);
            emitter.recordSourceMappingStart(this);
            emitter.emitJavascript(this.tryNode, TokenID.Try, false);
            emitter.emitJavascript(this.catchNode, TokenID.Catch, false);
            emitter.recordSourceMappingEnd(this);
            emitter.emitParensAndCommentsInPlace(this, false);
        }
        addToControlFlow(context) {
            var beforeTry = context.current;
            var tryBlock = new BasicBlock();
            beforeTry.addSuccessor(tryBlock);
            context.current = tryBlock;
            var afterTryCatch = new BasicBlock();
            context.pushStatement(this, null, afterTryCatch);
            context.walk(this.tryNode, this);
            if (!context.noContinuation) {
                if (context.current) {
                    context.current.addSuccessor(afterTryCatch);
                }
            }
            context.current = new BasicBlock();
            beforeTry.addSuccessor(context.current);
            context.walk(this.catchNode, this);
            context.popStatement();
            if (!context.noContinuation) {
                if (context.current) {
                    context.current.addSuccessor(afterTryCatch);
                }
            }
            context.current = afterTryCatch;
            context.walker.options.goChildren = false;
        }
        typeCheck(typeFlow) {
            this.tryNode = typeFlow.typeCheck(this.tryNode);
            this.catchNode = typeFlow.typeCheck(this.catchNode);
            this.type = typeFlow.voidType;
            return this;
        }
    }
    TypeScript.TryCatch = TryCatch;
    class Try extends Statement {
        body;
        constructor(body) {
            super(NodeType.Try);
            this.body = body;
        }
        emit(emitter, tokenId, startLine) {
            emitter.emitParensAndCommentsInPlace(this, true);
            emitter.recordSourceMappingStart(this);
            emitter.writeToOutput("try ");
            emitter.emitJavascript(this.body, TokenID.Try, false);
            emitter.recordSourceMappingEnd(this);
            emitter.emitParensAndCommentsInPlace(this, false);
        }
        typeCheck(typeFlow) {
            this.body = typeFlow.typeCheck(this.body);
            return this;
        }
        addToControlFlow(context) {
            if (this.body) {
                context.walk(this.body, this);
            }
            context.walker.options.goChildren = false;
            context.noContinuation = false;
        }
    }
    TypeScript.Try = Try;
    class Catch extends Statement {
        param;
        body;
        constructor(param, body) {
            super(NodeType.Catch);
            this.param = param;
            this.body = body;
            if (this.param) {
                this.param.varFlags |= VarFlags.AutoInit;
            }
        }
        statement = new ASTSpan();
        containedScope = null;
        emit(emitter, tokenId, startLine) {
            emitter.emitParensAndCommentsInPlace(this, true);
            emitter.recordSourceMappingStart(this);
            emitter.writeToOutput(" ");
            emitter.recordSourceMappingStart(this.statement);
            emitter.writeToOutput("catch (");
            emitter.emitJavascript(this.param, TokenID.OpenParen, false);
            emitter.writeToOutput(")");
            emitter.recordSourceMappingEnd(this.statement);
            emitter.emitJavascript(this.body, TokenID.Catch, false);
            emitter.recordSourceMappingEnd(this);
            emitter.emitParensAndCommentsInPlace(this, false);
        }
        addToControlFlow(context) {
            if (this.param) {
                context.addContent(this.param);
                var bodBlock = new BasicBlock();
                context.current.addSuccessor(bodBlock);
                context.current = bodBlock;
            }
            if (this.body) {
                context.walk(this.body, this);
            }
            context.noContinuation = false;
            context.walker.options.goChildren = false;
        }
        typeCheck(typeFlow) {
            var prevScope = typeFlow.scope;
            typeFlow.scope = this.containedScope;
            this.param = typeFlow.typeCheck(this.param);
            var exceptVar = new ValueLocation();
            var varSym = new VariableSymbol(this.param.id.text, this.param.minChar, typeFlow.checker.locationInfo.unitIndex, exceptVar);
            exceptVar.symbol = varSym;
            exceptVar.typeLink = new TypeLink();
            // var type for now (add syntax for type annotation)
            exceptVar.typeLink.type = typeFlow.anyType;
            var thisFnc = typeFlow.thisFnc;
            if (thisFnc && thisFnc.type) {
                exceptVar.symbol.container = thisFnc.type.symbol;
            }
            else {
                exceptVar.symbol.container = null;
            }
            this.param.sym = exceptVar.symbol;
            typeFlow.scope.enter(exceptVar.symbol.container, this.param, exceptVar.symbol, typeFlow.checker.errorReporter, false, false, false);
            this.body = typeFlow.typeCheck(this.body);
            // if we're in provisional typecheck mode, clean up the symbol entry
            // REVIEW: This is obviously bad form, since we're counting on the internal
            // layout of the symbol table, but this is also the only place where we insert
            // symbols during typecheck
            if (typeFlow.checker.inProvisionalTypecheckMode()) {
                var table = typeFlow.scope.getTable();
                table.secondaryTable.table[exceptVar.symbol.name] = undefined;
            }
            this.type = typeFlow.voidType;
            typeFlow.scope = prevScope;
            return this;
        }
    }
    TypeScript.Catch = Catch;
    class Finally extends Statement {
        body;
        constructor(body) {
            super(NodeType.Finally);
            this.body = body;
        }
        emit(emitter, tokenId, startLine) {
            emitter.emitParensAndCommentsInPlace(this, true);
            emitter.recordSourceMappingStart(this);
            emitter.writeToOutput("finally");
            emitter.emitJavascript(this.body, TokenID.Finally, false);
            emitter.recordSourceMappingEnd(this);
            emitter.emitParensAndCommentsInPlace(this, false);
        }
        addToControlFlow(context) {
            if (this.body) {
                context.walk(this.body, this);
            }
            context.walker.options.goChildren = false;
            context.noContinuation = false;
        }
        typeCheck(typeFlow) {
            this.body = typeFlow.typeCheck(this.body);
            return this;
        }
    }
    TypeScript.Finally = Finally;
    class Comment extends AST {
        content;
        isBlockComment;
        endsLine;
        text = null;
        constructor(content, isBlockComment, endsLine) {
            super(NodeType.Comment);
            this.content = content;
            this.isBlockComment = isBlockComment;
            this.endsLine = endsLine;
        }
        getText() {
            if (this.text == null) {
                if (this.isBlockComment) {
                    this.text = this.content.split("\n");
                    for (var i = 0; i < this.text.length; i++) {
                        this.text[i] = this.text[i].replace(/^\s+|\s+$/g, '');
                    }
                }
                else {
                    this.text = [(this.content.replace(/^\s+|\s+$/g, ''))];
                }
            }
            return this.text;
        }
    }
    TypeScript.Comment = Comment;
    class DebuggerStatement extends Statement {
        constructor() {
            super(NodeType.Debugger);
        }
        emit(emitter, tokenId, startLine) {
            emitter.emitParensAndCommentsInPlace(this, true);
            emitter.recordSourceMappingStart(this);
            emitter.writeLineToOutput("debugger;");
            emitter.recordSourceMappingEnd(this);
            emitter.emitParensAndCommentsInPlace(this, false);
        }
    }
    TypeScript.DebuggerStatement = DebuggerStatement;
})(TypeScript || (TypeScript = {}));
