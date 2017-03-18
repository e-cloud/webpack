/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import acorn from 'acorn-dynamic-import'
import * as ESTree from 'estree'
import { ParserState, PlainObject, SourceRange } from '../typings/webpack-types'
import acornNS = require('acorn')
import Tapable = require('tapable');
import BasicEvaluatedExpression = require('./BasicEvaluatedExpression');

interface IdentCallback {
    (name: string, decl: ESTree.Pattern): void
}

const POSSIBLE_AST_OPTIONS = [
    {
        ranges: true,
        locations: true,
        ecmaVersion: 2017,
        sourceType: 'module',
        plugins: {
            dynamicImport: true
        }
    }, {
        ranges: true,
        locations: true,
        ecmaVersion: 2017,
        sourceType: 'script',
        plugins: {
            dynamicImport: true
        }
    }
] as acornNS.Options[];

interface ParserScope {
    definitions: string[]
    inShorthand?: boolean
    inTry: boolean
    renames: Dictionary<string>
}

//noinspection JSUnusedGlobalSymbols,JSMethodCanBeStatic
class Parser extends Tapable {
    options: PlainObject
    scope: ParserScope
    state: ParserState

    // there is no usage of options
    constructor(options: any) {
        super();
        this.options = options;
        this.initializeEvaluating();
    }

    initializeEvaluating() {
        function joinRanges(startRange: SourceRange, endRange: SourceRange): SourceRange {
            if (!endRange) {
                return startRange;
            }
            if (!startRange) {
                return endRange;
            }
            return [startRange[0], endRange[1]];
        }

        this.plugin('evaluate Literal', function (expr: ESTree.Literal) {
            const exprValue = expr.value
            switch (typeof exprValue) {
                case 'number':
                    return new BasicEvaluatedExpression().setNumber(<number>exprValue).setRange(expr.range);
                case 'string':
                    return new BasicEvaluatedExpression().setString(<string>exprValue).setRange(expr.range);
                case 'boolean':
                    return new BasicEvaluatedExpression().setBoolean(<boolean>exprValue).setRange(expr.range);
            }
            if (expr.value === null) {
                return new BasicEvaluatedExpression().setNull().setRange(expr.range);
            }
            if (expr.value instanceof RegExp) {
                return new BasicEvaluatedExpression().setRegExp(expr.value).setRange(expr.range);
            }
        });
        this.plugin('evaluate LogicalExpression', function (expr: ESTree.LogicalExpression) {
            let left;
            let leftAsBool;
            let right;
            if (expr.operator === '&&') {
                left = this.evaluateExpression(expr.left);
                leftAsBool = left && left.asBool();
                if (leftAsBool === false) {
                    return left.setRange(expr.range);
                }
                if (leftAsBool !== true) {
                    return;
                }
                right = this.evaluateExpression(expr.right);
                return right.setRange(expr.range);
            }
            else if (expr.operator === '||') {
                left = this.evaluateExpression(expr.left);
                leftAsBool = left && left.asBool();
                if (leftAsBool === true) {
                    return left.setRange(expr.range);
                }
                if (leftAsBool !== false) {
                    return;
                }
                right = this.evaluateExpression(expr.right);
                return right.setRange(expr.range);
            }
        });
        this.plugin('evaluate BinaryExpression', function (expr: ESTree.BinaryExpression) {
            let left: BasicEvaluatedExpression;
            let right: BasicEvaluatedExpression;
            let res;
            if (expr.operator === '+') {
                left = this.evaluateExpression(expr.left);
                right = this.evaluateExpression(expr.right);
                if (!left || !right) {
                    return;
                }
                res = new BasicEvaluatedExpression();
                if (left.isString()) {
                    if (right.isString()) {
                        res.setString(left.string + right.string);
                    }
                    else if (right.isNumber()) {
                        res.setString(left.string + right.number);
                    }
                    else if (right.isWrapped() && right.prefix && right.prefix.isString()) {
                        res.setWrapped(new BasicEvaluatedExpression().setString(left.string + right.prefix.string)
                            .setRange(joinRanges(left.range, right.prefix.range)), right.postfix);
                    }
                    else {
                        res.setWrapped(left, null);
                    }
                }
                else if (left.isNumber()) {
                    if (right.isString()) {
                        res.setString(left.number + right.string);
                    }
                    else if (right.isNumber()) {
                        res.setNumber(left.number + right.number);
                    }
                }
                else if (left.isWrapped()) {
                    if (left.postfix && left.postfix.isString() && right.isString()) {
                        res.setWrapped(left.prefix, new BasicEvaluatedExpression().setString(left.postfix.string + right.string)
                            .setRange(joinRanges(left.postfix.range, right.range)));
                    }
                    else if (left.postfix && left.postfix.isString() && right.isNumber()) {
                        res.setWrapped(left.prefix, new BasicEvaluatedExpression().setString(left.postfix.string + right.number)
                            .setRange(joinRanges(left.postfix.range, right.range)));
                    }
                    else if (right.isString()) {
                        res.setWrapped(left.prefix, right);
                    }
                    else if (right.isNumber()) {
                        res.setWrapped(left.prefix, new BasicEvaluatedExpression().setString(`${right.number}`)
                            .setRange(right.range));
                    }
                    else {
                        res.setWrapped(left.prefix, new BasicEvaluatedExpression());
                    }
                }
                else {
                    if (right.isString()) {
                        res.setWrapped(null, right);
                    }
                }
                res.setRange(expr.range);
                return res;
            }
            else if (expr.operator === '-') {
                left = this.evaluateExpression(expr.left);
                right = this.evaluateExpression(expr.right);
                if (!left || !right) {
                    return;
                }
                if (!left.isNumber() || !right.isNumber()) {
                    return;
                }
                res = new BasicEvaluatedExpression();
                res.setNumber(left.number - right.number);
                res.setRange(expr.range);
                return res;
            }
            else if (expr.operator === '*') {
                left = this.evaluateExpression(expr.left);
                right = this.evaluateExpression(expr.right);
                if (!left || !right) {
                    return;
                }
                if (!left.isNumber() || !right.isNumber()) {
                    return;
                }
                res = new BasicEvaluatedExpression();
                res.setNumber(left.number * right.number);
                res.setRange(expr.range);
                return res;
            }
            else if (expr.operator === '/') {
                left = this.evaluateExpression(expr.left);
                right = this.evaluateExpression(expr.right);
                if (!left || !right) {
                    return;
                }
                if (!left.isNumber() || !right.isNumber()) {
                    return;
                }
                res = new BasicEvaluatedExpression();
                res.setNumber(left.number / right.number);
                res.setRange(expr.range);
                return res;
            }
            else if (expr.operator === '==' || expr.operator === '===') {
                left = this.evaluateExpression(expr.left);
                right = this.evaluateExpression(expr.right);
                if (!left || !right) {
                    return;
                }
                res = new BasicEvaluatedExpression();
                res.setRange(expr.range);
                if (left.isString() && right.isString()) {
                    return res.setBoolean(left.string === right.string);
                }
                else if (left.isNumber() && right.isNumber()) {
                    return res.setBoolean(left.number === right.number);
                }
                else if (left.isBoolean() && right.isBoolean()) {
                    return res.setBoolean(left.bool === right.bool);
                }
            }
            else if (expr.operator === '!=' || expr.operator === '!==') {
                left = this.evaluateExpression(expr.left);
                right = this.evaluateExpression(expr.right);
                if (!left || !right) {
                    return;
                }
                res = new BasicEvaluatedExpression();
                res.setRange(expr.range);
                if (left.isString() && right.isString()) {
                    return res.setBoolean(left.string !== right.string);
                }
                else if (left.isNumber() && right.isNumber()) {
                    return res.setBoolean(left.number !== right.number);
                }
                else if (left.isBoolean() && right.isBoolean()) {
                    return res.setBoolean(left.bool !== right.bool);
                }
            }
        });
        this.plugin('evaluate UnaryExpression', function (expr: ESTree.UnaryExpression) {
            if (expr.operator === 'typeof') {
                let res: BasicEvaluatedExpression
                let name: string
                if (expr.argument.type === 'Identifier') {
                    name = this.scope.renames[`$${expr.argument.name}`] || expr.argument.name;
                    if (!this.scope.definitions.includes(name)) {
                        res = this.applyPluginsBailResult1(`evaluate typeof ${name}`, expr);
                        if (res !== undefined) {
                            return res;
                        }
                    }
                }
                if (expr.argument.type === 'MemberExpression') {
                    let expression: ESTree.Expression = expr.argument;
                    const exprName: string[] = [];
                    while (expression.type === 'MemberExpression' && !expression.computed) {
                        exprName.unshift(this.scope.renames[`$${(<ESTree.Identifier>expression.property).name}`] || (<ESTree.Identifier>expression.property).name);
                        expression = expression.object as ESTree.Expression;
                    }
                    if (expression.type === 'Identifier') {
                        exprName.unshift(this.scope.renames[`$${expression.name}`] || expression.name);
                        // todo: what's the name? it hasn't been initialized
                        if (!this.scope.definitions.includes(name)) {
                            const exprNameStr = exprName.join('.');
                            res = this.applyPluginsBailResult1(`evaluate typeof ${exprNameStr}`, expr);
                            if (res !== undefined) {
                                return res;
                            }
                        }
                    }
                }
                if (expr.argument.type === 'FunctionExpression') {
                    return new BasicEvaluatedExpression().setString('function').setRange(expr.range);
                }
                const arg = this.evaluateExpression(expr.argument);
                if (arg.isString() || arg.isWrapped()) {
                    return new BasicEvaluatedExpression().setString('string').setRange(expr.range);
                }
                else if (arg.isNumber()) {
                    return new BasicEvaluatedExpression().setString('number').setRange(expr.range);
                }
                else if (arg.isBoolean()) {
                    return new BasicEvaluatedExpression().setString('boolean').setRange(expr.range);
                }
                else if (arg.isArray() || arg.isConstArray() || arg.isRegExp()) {
                    return new BasicEvaluatedExpression().setString('object').setRange(expr.range);
                }
            }
            else if (expr.operator === '!') {
                const argument = this.evaluateExpression(expr.argument);
                if (!argument) {
                    return;
                }
                if (argument.isBoolean()) {
                    return new BasicEvaluatedExpression().setBoolean(!argument.bool).setRange(expr.range);
                }
                else if (argument.isString()) {
                    return new BasicEvaluatedExpression().setBoolean(!argument.string).setRange(expr.range);
                }
                else if (argument.isNumber()) {
                    return new BasicEvaluatedExpression().setBoolean(!argument.number).setRange(expr.range);
                }
            }
        });
        this.plugin('evaluate typeof undefined', function (expr: ESTree.UnaryExpression) {
            return new BasicEvaluatedExpression().setString('undefined')
                .setRange(expr.range)
        });
        this.plugin('evaluate Identifier', function (expr: ESTree.Identifier) {
            const name = this.scope.renames[`$${expr.name}`] || expr.name;
            if (!this.scope.definitions.includes(expr.name)) {
                const result = this.applyPluginsBailResult1(`evaluate Identifier ${name}`, expr);
                if (result) {
                    return result;
                }
                return new BasicEvaluatedExpression().setIdentifier(name).setRange(expr.range);
            }
            else {
                return this.applyPluginsBailResult1(`evaluate defined Identifier ${name}`, expr);
            }
        });
        this.plugin('evaluate MemberExpression', function (expression: ESTree.MemberExpression) {
            let expr: ESTree.Expression = expression;
            const exprName = [];
            while (expr.type === 'MemberExpression' && expr.property.type === (expr.computed
                ? 'Literal'
                : 'Identifier')) {
                exprName.unshift((<ESTree.Identifier>expr.property).name || (<ESTree.Literal>expr.property).value);
                expr = expr.object as ESTree.Expression;
            }
            if (expr.type === 'Identifier') {
                const name = this.scope.renames[`$${expr.name}`] || expr.name;
                if (!this.scope.definitions.includes(name)) {
                    exprName.unshift(name);
                    const exprNameStr = exprName.join('.');
                    if (!this.scope.definitions.includes(expr.name)) {
                        const result = this.applyPluginsBailResult1(`evaluate Identifier ${exprNameStr}`, expression);
                        if (result) {
                            return result;
                        }
                        return new BasicEvaluatedExpression().setIdentifier(exprNameStr).setRange(expression.range);
                    }
                    else {
                        return this.applyPluginsBailResult1(`evaluate defined Identifier ${exprNameStr}`, expression);
                    }
                }
            }
        });
        this.plugin('evaluate CallExpression', function (expr: ESTree.CallExpression) {
            if (expr.callee.type !== 'MemberExpression') {
                return;
            }
            if (expr.callee.property.type !== (expr.callee.computed ? 'Literal' : 'Identifier')) {
                return;
            }
            const param = this.evaluateExpression(expr.callee.object);
            if (!param) {
                return;
            }
            const property = (<ESTree.Identifier>expr.callee.property).name || (<ESTree.Literal>expr.callee.property).value as string;
            return this.applyPluginsBailResult(`evaluate CallExpression .${property}`, expr, param);
        });
        this.plugin('evaluate CallExpression .replace', function (expr: ESTree.CallExpression, param) {
            if (!param.isString()) {
                return;
            }
            if (expr.arguments.length !== 2) {
                return;
            }
            const arg1 = this.evaluateExpression(expr.arguments[0]);
            const arg2 = this.evaluateExpression(expr.arguments[1]);
            if (!arg1.isString() && !arg1.isRegExp()) {
                return;
            }
            const arg1pattern = arg1.regExp || arg1.string;
            if (!arg2.isString()) {
                return;
            }
            const arg2string = arg2.string;
            return new BasicEvaluatedExpression().setString(param.string.replace(arg1pattern, arg2string))
                .setRange(expr.range);
        });
        ['substr', 'substring'].forEach(function (fn) {
            this.plugin(`evaluate CallExpression .${fn}`, function (
                expr: ESTree.CallExpression,
                param: BasicEvaluatedExpression
            ) {
                if (!param.isString()) {
                    return;
                }
                let arg1: BasicEvaluatedExpression;
                let result: string;
                const str = param.string;
                switch (expr.arguments.length) {
                    case 1:
                        arg1 = this.evaluateExpression(expr.arguments[0]);
                        if (!arg1.isNumber()) {
                            return;
                        }
                        result = str[fn](arg1.number);
                        break;
                    case 2:
                        arg1 = this.evaluateExpression(expr.arguments[0]);
                        const arg2 = this.evaluateExpression(expr.arguments[1]);
                        if (!arg1.isNumber()) {
                            return;
                        }
                        if (!arg2.isNumber()) {
                            return;
                        }
                        result = str[fn](arg1.number, arg2.number);
                        break;
                    default:
                        return;
                }
                return new BasicEvaluatedExpression().setString(result).setRange(expr.range);
            });

            /**
             * @param {string} kind "cooked" | "raw"
             * @param {any[]} quasis quasis
             * @param {any[]} expressions expressions
             * @return {BasicEvaluatedExpression[]} Simplified template
             */
            function getSimplifiedTemplateResult(kind: string, quasis: ESTree.TemplateElement[],
                                                 expressions: ESTree.Expression[]
            ) {
                const parts = [];

                for (let i = 0; i < quasis.length; i++) {
                    parts.push(
                        new BasicEvaluatedExpression()
                            .setString(quasis[i].value[kind])
                            .setRange(quasis[i].range)
                    );

                    if (i > 0) {
                        const prevExpr = parts[parts.length - 2], lastExpr = parts[parts.length - 1];
                        const expr = this.evaluateExpression(expressions[i - 1]);
                        if (!(expr.isString() || expr.isNumber())) {
                            continue;
                        }

                        prevExpr.setString(prevExpr.string + (expr.isString()
                                ? expr.string
                                : expr.number) + lastExpr.string)
                        prevExpr.setRange([prevExpr.range[0], lastExpr.range[1]]);
                        parts.pop();
                    }
                }
                return parts;
            }

            this.plugin('evaluate TemplateLiteral', function (node: ESTree.TemplateLiteral) {
                const parts = getSimplifiedTemplateResult.call(this, 'cooked', node.quasis, node.expressions);
                if (parts.length === 1) {
                    return parts[0].setRange(node.range);
                }
                return new BasicEvaluatedExpression().setTemplateString(parts).setRange(node.range);
            });
            this.plugin('evaluate TaggedTemplateExpression', function (node: ESTree.TaggedTemplateExpression) {
                if (this.evaluateExpression(node.tag).identifier !== 'String.raw') {
                    return;
                }
                const parts = getSimplifiedTemplateResult.call(this, 'raw', node.quasi.quasis, node.quasi.expressions);
                return new BasicEvaluatedExpression().setTemplateString(parts).setRange(node.range);
            });
        }, this);
        this.plugin('evaluate CallExpression .split', function (
            expr: ESTree.CallExpression,
            param: BasicEvaluatedExpression
        ) {
            if (!param.isString()) {
                return;
            }
            if (expr.arguments.length !== 1) {
                return;
            }
            let result;
            const arg = this.evaluateExpression(expr.arguments[0]);
            if (arg.isString()) {
                result = param.string.split(arg.string);
            }
            else if (arg.isRegExp()) {
                result = param.string.split(arg.regExp);
            }
            else {
                return;
            }
            return new BasicEvaluatedExpression().setArray(result).setRange(expr.range);
        });
        this.plugin('evaluate ConditionalExpression', function (expr: ESTree.ConditionalExpression) {
            const condition = this.evaluateExpression(expr.test);
            const conditionValue = condition.asBool();
            let res;
            if (conditionValue === undefined) {
                const consequent = this.evaluateExpression(expr.consequent);
                const alternate = this.evaluateExpression(expr.alternate);
                if (!consequent || !alternate) {
                    return;
                }
                res = new BasicEvaluatedExpression();
                if (consequent.isConditional()) {
                    res.setOptions(consequent.options);
                }
                else {
                    res.setOptions([consequent]);
                }
                if (alternate.isConditional()) {
                    res.addOptions(alternate.options);
                }
                else {
                    res.addOptions([alternate]);
                }
            }
            else {
                res = this.evaluateExpression(conditionValue ? expr.consequent : expr.alternate);
            }
            res.setRange(expr.range);
            return res;
        });
        this.plugin('evaluate ArrayExpression', function (expr: ESTree.ArrayExpression) {
            const items = expr.elements.map((element) => element !== null && this.evaluateExpression(element));
            if (!items.every(Boolean)) {
                return;
            }
            return new BasicEvaluatedExpression().setItems(items).setRange(expr.range);
        });
    }

    getRenameIdentifier(expr: ESTree.Expression) {
        const result = this.evaluateExpression(expr);
        if (!result) {
            return;
        }
        if (result.isIdentifier()) {
            return result.identifier;
        }
        return;
    }

    walkClass(classy: ESTree.BaseClass) {
        if (classy.superClass) {
            this.walkExpression(classy.superClass);
        }
        if (classy.body && classy.body.type === 'ClassBody') {
            classy.body.body.forEach((methodDefinition) => {
                if (methodDefinition.type === 'MethodDefinition') {
                    this.walkMethodDefinition(methodDefinition);
                }
            });
        }
    }

    walkMethodDefinition(methodDefinition: ESTree.MethodDefinition) {
        if (methodDefinition.computed && methodDefinition.key) {
            this.walkExpression(methodDefinition.key);
        }
        if (methodDefinition.value) {
            this.walkExpression(methodDefinition.value);
        }
    }

    walkStatements(statements: ESTree.Node[]) {
        const lenA = statements.length;
        for (let indexA = 0; indexA < lenA; indexA++) {
            const statementA = statements[indexA];
            if (this.isHoistedStatement(statementA)) {
                this.walkStatement(statementA);
            }
        }
        const lenB = statements.length;
        for (let indexB = 0; indexB < lenB; indexB++) {
            const statementB = statements[indexB];
            if (!this.isHoistedStatement(statementB)) {
                this.walkStatement(statementB);
            }
        }
    }

    isHoistedStatement(statement: ESTree.Node) {
        switch (statement.type) {
            case 'ImportDeclaration':
            case 'ExportAllDeclaration':
            case 'ExportNamedDeclaration':
                return true;
        }
        return false;
    }

    walkStatement(statement: ESTree.Node) {
        if (this.applyPluginsBailResult1('statement', statement) !== undefined) {
            return;
        }
        if (this[`walk${statement.type}`]) {
            this[`walk${statement.type}`](statement);
        }
    }

    // Real Statements
    walkBlockStatement(statement: ESTree.BlockStatement) {
        this.walkStatements(statement.body);
    }

    walkExpressionStatement(statement: ESTree.ExpressionStatement) {
        this.walkExpression(statement.expression);
    }

    walkIfStatement(statement: ESTree.IfStatement) {
        const result = this.applyPluginsBailResult1('statement if', statement);
        if (result === undefined) {
            this.walkExpression(statement.test);
            this.walkStatement(statement.consequent);
            if (statement.alternate) {
                this.walkStatement(statement.alternate);
            }
        }
        else {
            if (result) {
                this.walkStatement(statement.consequent);
            }
            else if (statement.alternate) {
                this.walkStatement(statement.alternate);
            }
        }
    }

    walkLabeledStatement(statement: ESTree.LabeledStatement) {
        const result = this.applyPluginsBailResult1(`label ${statement.label.name}`, statement);
        if (result !== true) {
            this.walkStatement(statement.body);
        }
    }

    walkWithStatement(statement: ESTree.WithStatement) {
        this.walkExpression(statement.object);
        this.walkStatement(statement.body);
    }

    walkSwitchStatement(statement: ESTree.SwitchStatement) {
        this.walkExpression(statement.discriminant);
        this.walkSwitchCases(statement.cases);
    }

    walkTryStatement(statement: ESTree.TryStatement) {
        if (this.scope.inTry) {
            this.walkStatement(statement.block);
        }
        else {
            this.scope.inTry = true;
            this.walkStatement(statement.block);
            this.scope.inTry = false;
        }
        if (statement.handler) {
            this.walkCatchClause(statement.handler);
        }
        if (statement.finalizer) {
            this.walkStatement(statement.finalizer);
        }
    }

    walkForStatement(statement: ESTree.ForStatement) {
        if (statement.init) {
            if (statement.init.type === 'VariableDeclaration') {
                this.walkStatement(statement.init);
            }
            else {
                this.walkExpression(statement.init);
            }
        }
        if (statement.test) {
            this.walkExpression(statement.test);
        }
        if (statement.update) {
            this.walkExpression(statement.update);
        }
        this.walkStatement(statement.body);
    }

    walkForInStatement(statement: ESTree.ForInStatement) {
        if (statement.left.type === 'VariableDeclaration') {
            this.walkStatement(statement.left);
        }
        else {
            this.walkExpression(statement.left);
        }
        this.walkExpression(statement.right);
        this.walkStatement(statement.body);
    }

    walkForOfStatement(statement: ESTree.ForOfStatement) {
        if (statement.left.type === 'VariableDeclaration') {
            this.walkStatement(statement.left);
        }
        else {
            this.walkExpression(statement.left);
        }
        this.walkExpression(statement.right);
        this.walkStatement(statement.body);
    }

    // Declarations
    walkFunctionDeclaration(statement: ESTree.FunctionDeclaration) {
        this.scope.renames[`$${statement.id.name}`] = undefined;
        this.scope.definitions.push(statement.id.name);
        this.inScope(statement.params, () => {
            if (statement.body.type === 'BlockStatement') {
                this.walkStatement(statement.body);
            }
            else {
                this.walkExpression(statement.body);
            }
        });
    }

    walkImportDeclaration(statement: ESTree.ImportDeclaration) {
        const source = statement.source.value;
        this.applyPluginsBailResult('import', statement, source);
        statement.specifiers.forEach((specifier) => {
            const name = specifier.local.name;
            this.scope.renames[`$${name}`] = undefined;
            this.scope.definitions.push(name);
            switch (specifier.type) {
                case 'ImportDefaultSpecifier':
                    this.applyPluginsBailResult('import specifier', statement, source, 'default', name);
                    break;
                case 'ImportSpecifier':
                    this.applyPluginsBailResult('import specifier', statement, source, specifier.imported.name, name);
                    break;
                case 'ImportNamespaceSpecifier':
                    this.applyPluginsBailResult('import specifier', statement, source, null, name);
                    break;
            }
        });
    }

    walkExportNamedDeclaration(statement: ESTree.ExportNamedDeclaration) {
        let source: string | boolean | number | null | RegExp

        if (statement.source) {
            source = statement.source.value;
            this.applyPluginsBailResult('export import', statement, source);
        } else {
            this.applyPluginsBailResult1('export', statement);
        }

        if (statement.declaration) {
            if (/Expression$/.test(statement.declaration.type)) {
                throw new Error('Doesn\'t occur?');
            }
            else {
                if (!this.applyPluginsBailResult('export declaration', statement, statement.declaration)) {
                    const pos = this.scope.definitions.length;
                    this.walkStatement(statement.declaration);
                    const newDefs = this.scope.definitions.slice(pos);
                    for (let index = newDefs.length - 1; index >= 0; index--) {
                        const def = newDefs[index];
                        this.applyPluginsBailResult('export specifier', statement, def, def, index);
                    }
                }
            }
        }

        if (statement.specifiers) {
            for (let specifierIndex = 0; specifierIndex < statement.specifiers.length; specifierIndex++) {
                const specifier = statement.specifiers[specifierIndex];
                switch (specifier.type) {
                    case 'ExportSpecifier':
                        const name = specifier.exported.name;
                        if (source) {
                            this.applyPluginsBailResult('export import specifier', statement, source, specifier.local.name, name, specifierIndex);
                        } else {
                            this.applyPluginsBailResult('export specifier', statement, specifier.local.name, name, specifierIndex);
                        }
                        break;
                }
            }
        }
    }

    walkExportDefaultDeclaration(statement: ESTree.ExportDefaultDeclaration) {
        this.applyPluginsBailResult1('export', statement);
        if (/Declaration$/.test(statement.declaration.type)) {
            if (!this.applyPluginsBailResult('export declaration', statement, statement.declaration)) {
                const pos = this.scope.definitions.length;
                this.walkStatement(statement.declaration);
                const newDefs = this.scope.definitions.slice(pos);
                const len = newDefs.length;
                for (let index = 0; index < len; index++) {
                    const def = newDefs[index];
                    this.applyPluginsBailResult('export specifier', statement, def, 'default');
                }
            }
        }
        else {
            this.walkExpression(statement.declaration);
            if (!this.applyPluginsBailResult('export expression', statement, statement.declaration)) {
                this.applyPluginsBailResult('export specifier', statement, statement.declaration, 'default');
            }
        }
    }

    walkExportAllDeclaration(statement: ESTree.ExportAllDeclaration) {
        const source = statement.source.value;
        this.applyPluginsBailResult('export import', statement, source);
        this.applyPluginsBailResult('export import specifier', statement, source, null, null, 0);
    }

    walkVariableDeclaration(statement: ESTree.VariableDeclaration) {
        if (statement.declarations) {
            this.walkVariableDeclarators(statement.declarations);
        }
    }

    walkClassDeclaration(statement: ESTree.ClassDeclaration) {
        this.scope.renames[`$${statement.id.name}`] = undefined;
        this.scope.definitions.push(statement.id.name);
        this.walkClass(statement);
    }

    walkSwitchCases(switchCases: ESTree.SwitchCase[]) {
        const len = switchCases.length;
        for (let index = 0; index < len; index++) {
            const switchCase = switchCases[index];

            if (switchCase.test) {
                this.walkExpression(switchCase.test);
            }
            this.walkStatements(switchCase.consequent);
        }
    }

    walkCatchClause(catchClause: ESTree.CatchClause & { guard?: ESTree.Expression }) {
        if (catchClause.guard) {
            this.walkExpression(catchClause.guard);
        }
        this.inScope([catchClause.param], () => {
            this.walkStatement(catchClause.body);
        });
    }

    walkVariableDeclarators(declarators: ESTree.VariableDeclarator[]) {
        declarators.forEach((declarator) => {
            switch (declarator.type) {
                case 'VariableDeclarator':
                    const renameIdentifier = declarator.init && this.getRenameIdentifier(declarator.init);
                    if (renameIdentifier && declarator.id.type === 'Identifier' && this.applyPluginsBailResult1(`can-rename ${renameIdentifier}`, declarator.init)) {
                        // renaming with "var a = b;"
                        if (!this.applyPluginsBailResult1(`rename ${renameIdentifier}`, declarator.init)) {
                            this.scope.renames[`$${declarator.id.name}`] = this.scope.renames[`$${renameIdentifier}`] || renameIdentifier;
                            const idx = this.scope.definitions.indexOf(declarator.id.name);
                            if (idx >= 0) {
                                this.scope.definitions.splice(idx, 1);
                            }
                        }
                    }
                    else {
                        this.walkPattern(declarator.id);
                        this.enterPattern(declarator.id, (name: string, decl: ESTree.Pattern) => {
                            if (!this.applyPluginsBailResult1(`var ${name}`, decl)) {
                                this.scope.renames[`$${name}`] = undefined;
                                this.scope.definitions.push(name);
                            }
                        });
                        if (declarator.init) {
                            this.walkExpression(declarator.init);
                        }
                    }
                    break;
            }
        });
    }

    walkPattern(pattern: ESTree.Pattern) {
        if (pattern.type === 'Identifier') {
            return;
        }
        if (this[`walk${pattern.type}`]) {
            this[`walk${pattern.type}`](pattern);
        }
    }

    walkObjectPattern(pattern: ESTree.ObjectPattern) {
        const len = pattern.properties.length;
        for (let i = 0; i < len; i++) {
            const prop = pattern.properties[i];
            if (prop) {
                if (prop.computed) {
                    this.walkExpression(prop.key);
                }
                if (prop.value) {
                    this.walkPattern(prop.value);
                }
            }
        }
    }

    walkArrayPattern(pattern: ESTree.ArrayPattern) {
        const len = pattern.elements.length;
        for (let i = 0; i < len; i++) {
            const element = pattern.elements[i];
            if (element) {
                this.walkPattern(element);
            }
        }
    }

    walkRestElement(pattern: ESTree.RestElement) {
        this.walkPattern(pattern.argument);
    }

    walkExpressions(expressions: ESTree.Node[]) {
        const len = expressions.length;
        for (let expressionsIndex = 0; expressionsIndex < len; expressionsIndex++) {
            const expression = expressions[expressionsIndex];
            if (expression) {
                this.walkExpression(expression);
            }
        }
    }

    walkExpression(expression: ESTree.Node) {
        if (this[`walk${expression.type}`]) {
            return this[`walk${expression.type}`](expression);
        }
    }

    walkAwaitExpression(expression: ESTree.AwaitExpression) {
        const argument = expression.argument
        if (this['walk' + argument.type]) {
            return this['walk' + argument.type](argument);
        }
    }

    walkArrayExpression(expression: ESTree.ArrayExpression) {
        if (expression.elements) {
            this.walkExpressions(expression.elements);
        }
    }

    walkSpreadElement(expression: ESTree.SpreadElement) {
        if (expression.argument) {
            this.walkExpression(expression.argument);
        }
    }

    walkObjectExpression(expression: ESTree.ObjectExpression) {
        const len = expression.properties.length;
        for (let propIndex = 0; propIndex < len; propIndex++) {
            const prop = expression.properties[propIndex];
            if (prop.computed) {
                this.walkExpression(prop.key);
            }
            if (prop.shorthand) {
                this.scope.inShorthand = true;
            }
            this.walkExpression(prop.value);
            if (prop.shorthand) {
                this.scope.inShorthand = false;
            }
        }
    }

    walkFunctionExpression(expression: ESTree.FunctionExpression) {
        this.inScope(expression.params, () => {
            if (expression.body.type === 'BlockStatement') {
                this.walkStatement(expression.body);
            }
            else {
                this.walkExpression(expression.body);
            }
        });
    }

    walkArrowFunctionExpression(expression: ESTree.ArrowFunctionExpression) {
        this.inScope(expression.params, () => {
            if (expression.body.type === 'BlockStatement') {
                this.walkStatement(expression.body);
            }
            else {
                this.walkExpression(expression.body);
            }
        });
    }

    walkSequenceExpression(expression: ESTree.SequenceExpression) {
        if (expression.expressions) {
            this.walkExpressions(expression.expressions);
        }
    }

    walkUpdateExpression(expression: ESTree.UpdateExpression) {
        this.walkExpression(expression.argument);
    }

    walkUnaryExpression(expression: ESTree.UnaryExpression) {
        if (expression.operator === 'typeof') {
            let expr: ESTree.Expression = expression.argument;
            const exprName = [];
            while (expr.type === 'MemberExpression'
            && expr.property.type === (expr.computed ? 'Literal' : 'Identifier')) {
                exprName.unshift((<ESTree.Identifier>expr.property).name || (<ESTree.Literal>expr.property).value);
                expr = expr.object as ESTree.Expression;
            }
            if (expr.type === 'Identifier' && !this.scope.definitions.includes(expr.name)) {
                exprName.unshift(this.scope.renames[`$${expr.name}`] || expr.name);
                const exprNameStr = exprName.join('.');
                const result = this.applyPluginsBailResult1(`typeof ${exprNameStr}`, expression);
                if (result === true) {
                    return;
                }
            }
        }
        this.walkExpression(expression.argument);
    }

    walkAssignmentExpression(expression: ESTree.AssignmentExpression) {
        const renameIdentifier = this.getRenameIdentifier(expression.right);
        if (expression.left.type === 'Identifier' && renameIdentifier && this.applyPluginsBailResult1(`can-rename ${renameIdentifier}`, expression.right)) {
            // renaming "a = b;"
            if (!this.applyPluginsBailResult1(`rename ${renameIdentifier}`, expression.right)) {
                this.scope.renames[`$${expression.left.name}`] = renameIdentifier;
                const idx = this.scope.definitions.indexOf(expression.left.name);
                if (idx >= 0) {
                    this.scope.definitions.splice(idx, 1);
                }
            }
        }
        else if (expression.left.type === 'Identifier') {
            if (!this.applyPluginsBailResult1(`assigned ${expression.left.name}`, expression)) {
                this.walkExpression(expression.right);
            }
            this.scope.renames[`$${expression.left.name}`] = undefined;
            if (!this.applyPluginsBailResult1(`assign ${expression.left.name}`, expression)) {
                this.walkExpression(expression.left);
            }
        }
        else {
            this.walkExpression(expression.right);
            // todo: as above expression.left.type is Identifier, expression.left is not Identifier now
            // only Identifier has name property
            this.scope.renames[`$${expression.left.name}`] = undefined;
            this.walkExpression(expression.left);
        }
    }

    walkConditionalExpression(expression: ESTree.ConditionalExpression) {
        const result = this.applyPluginsBailResult1('expression ?:', expression);
        if (result === undefined) {
            this.walkExpression(expression.test);
            this.walkExpression(expression.consequent);
            if (expression.alternate) {
                this.walkExpression(expression.alternate);
            }
        }
        else {
            if (result) {
                this.walkExpression(expression.consequent);
            }
            else if (expression.alternate) {
                this.walkExpression(expression.alternate);
            }
        }
    }

    walkNewExpression(expression: ESTree.NewExpression) {
        this.walkExpression(expression.callee);
        if (expression.arguments) {
            this.walkExpressions(expression.arguments);
        }
    }

    walkYieldExpression(expression: ESTree.YieldExpression) {
        if (expression.argument) {
            this.walkExpression(expression.argument);
        }
    }

    walkTemplateLiteral(expression: ESTree.TemplateLiteral) {
        if (expression.expressions) {
            this.walkExpressions(expression.expressions);
        }
    }

    walkTaggedTemplateExpression(expression: ESTree.TaggedTemplateExpression) {
        if (expression.tag) {
            this.walkExpression(expression.tag);
        }
        if (expression.quasi && expression.quasi.expressions) {
            this.walkExpressions(expression.quasi.expressions);
        }
    }

    walkClassExpression(expression: ESTree.ClassExpression) {
        this.walkClass(expression);
    }

    walkCallExpression(expression: ESTree.CallExpression) {
        function walkIIFE(
            functionExpression: ESTree.FunctionExpression,
            options: (ESTree.Expression | ESTree.SpreadElement)[]
        ) {
            const params = functionExpression.params;
            const args: string[] = options.map((arg) => {
                const renameIdentifier = this.getRenameIdentifier(arg);
                if (renameIdentifier && this.applyPluginsBailResult1(`can-rename ${renameIdentifier}`, arg)) {
                    if (!this.applyPluginsBailResult1(`rename ${renameIdentifier}`, arg)) {
                        return renameIdentifier;
                    }
                }
                this.walkExpression(arg);
            });
            this.inScope(params.filter((identifier, idx) => !args[idx]), () => {
                for (let i = 0; i < args.length; i++) {
                    const param = args[i];
                    if (!param) {
                        continue;
                    }
                    if (!params[i] || params[i].type !== 'Identifier') {
                        continue;
                    }
                    this.scope.renames[`$${params[i].name}`] = param;
                }
                if (functionExpression.body.type === 'BlockStatement') {
                    this.walkStatement(functionExpression.body);
                }
                else {
                    this.walkExpression(functionExpression.body);
                }
            });
        }

        if (expression.callee.type === 'MemberExpression'
            && expression.callee.object.type === 'FunctionExpression'
            && !expression.callee.computed
            && ['call', 'bind'].includes((<ESTree.Identifier>expression.callee.property).name)
            && expression.arguments
            && expression.arguments.length > 1) {
            // (function(...) { }.call/bind(?, ...))
            walkIIFE.call(this, expression.callee.object, expression.arguments.slice(1));
            this.walkExpression(expression.arguments[0]);
        }
        else if (expression.callee.type === 'FunctionExpression' && expression.arguments) {
            // (function(...) { }(...))
            walkIIFE.call(this, expression.callee, expression.arguments);
        }
        else if (expression.callee.type === 'Import') {
            const result = this.applyPluginsBailResult1('import-call', expression);
            if (result === true) {
                return;
            }

            if (expression.arguments) {
                this.walkExpressions(expression.arguments);
            }
        }
        else {

            const callee = this.evaluateExpression(expression.callee);
            if (callee.isIdentifier()) {
                const result = this.applyPluginsBailResult1(`call ${callee.identifier}`, expression);
                if (result === true) {
                    return;
                }
            }

            if (expression.callee) {
                this.walkExpression(expression.callee);
            }
            if (expression.arguments) {
                this.walkExpressions(expression.arguments);
            }
        }
    }

    walkMemberExpression(expression: ESTree.MemberExpression) {
        let expr: ESTree.Expression = expression;
        const exprName = [];
        while (expr.type === 'MemberExpression' && expr.property.type === (expr.computed ? 'Literal' : 'Identifier')) {
            exprName.unshift((<ESTree.Identifier>expr.property).name || (<ESTree.Literal>expr.property).value);
            expr = expr.object as ESTree.Expression;
        }
        if (expr.type === 'Identifier' && !this.scope.definitions.includes(expr.name)) {
            exprName.unshift(this.scope.renames[`$${expr.name}`] || expr.name);
            let result = this.applyPluginsBailResult1(`expression ${exprName.join('.')}`, expression);
            if (result === true) {
                return;
            }
            exprName[exprName.length - 1] = '*';
            result = this.applyPluginsBailResult1(`expression ${exprName.join('.')}`, expression);
            if (result === true) {
                return;
            }
        }
        this.walkExpression(expression.object);
        if (expression.computed === true) {
            this.walkExpression(expression.property);
        }
    }

    walkIdentifier(expression: ESTree.Identifier) {
        if (!this.scope.definitions.includes(expression.name)) {
            const result = this.applyPluginsBailResult1(`expression ${this.scope.renames['$' + expression.name] || expression.name}`, expression);
            if (result === true) {
                return;
            }
        }
    }

    inScope(params: ESTree.Pattern[], fn: Function) {
        const oldScope = this.scope;
        this.scope = {
            inTry: false,
            inShorthand: false,
            definitions: oldScope.definitions.slice(),
            renames: Object.create(oldScope.renames)
        };

        const len = params.length;
        for (let paramIndex = 0; paramIndex < len; paramIndex++) {
            const param = params[paramIndex];

            if (typeof param !== 'string') {
                this.enterPattern(param, (param) => {
                    this.scope.renames[`$${param}`] = undefined;
                    this.scope.definitions.push(param);
                });
            } else {
                this.scope.renames[`$${param}`] = undefined;
                this.scope.definitions.push(param);
            }
        }

        fn();
        this.scope = oldScope;
    }

    enterPattern(pattern: ESTree.Pattern, onIdent: IdentCallback) {
        if (pattern != null && this[`enter${pattern.type}`]) {
            this[`enter${pattern.type}`](pattern, onIdent);
        }
    }

    enterIdentifier(pattern: ESTree.Identifier, onIdent: IdentCallback) {
        onIdent(pattern.name, pattern);
    }

    enterObjectPattern(pattern: ESTree.ObjectPattern, onIdent: IdentCallback) {
        const len = pattern.properties.length;
        for (let propIndex = 0; propIndex < len; propIndex++) {
            const prop = pattern.properties[propIndex];
            this.enterPattern(prop.value, onIdent);
        }
    }

    enterArrayPattern(pattern: ESTree.ArrayPattern, onIdent: IdentCallback) {
        const len = pattern.elements.length;
        for (let elementIndex = 0; elementIndex < len; elementIndex++) {
            const element = pattern.elements[elementIndex];
            this.enterPattern(element, onIdent);
        }
    }

    enterRestElement(pattern: ESTree.RestElement, onIdent: IdentCallback) {
        this.enterPattern(pattern.argument, onIdent);
    }

    enterAssignmentPattern(pattern: ESTree.AssignmentPattern, onIdent: IdentCallback) {
        this.enterPattern(pattern.left, onIdent);
        this.walkExpression(pattern.right);
    }

    evaluateExpression(expression: ESTree.Node): BasicEvaluatedExpression {
        try {
            const result = this.applyPluginsBailResult1(`evaluate ${expression.type}`, expression);
            if (result !== undefined) {
                return result;
            }
        } catch (e) {
            console.warn(e);
            // ignore error
        }
        return new BasicEvaluatedExpression().setRange(expression.range);
    }

    parseString(expression: ESTree.Expression): string {
        switch (expression.type) {
            case 'BinaryExpression':
                if (expression.operator === '+') {
                    return this.parseString(expression.left) + this.parseString(expression.right);
                }
                break;
            case 'Literal':
                return `${expression.value}`;
        }
        throw new Error(`${expression.type} is not supported as parameter for require`);
    }

    parseCalculatedString(expression: ESTree.Expression): CalculatedStringArrayParseResult {
        switch (expression.type) {
            case 'BinaryExpression':
                if (expression.operator === '+') {
                    const left = this.parseCalculatedString(expression.left);
                    const right = this.parseCalculatedString(expression.right);
                    if (left.code) {
                        return {
                            range: left.range,
                            value: left.value,
                            code: true
                        };
                    }
                    else if (right.code) {
                        return {
                            range: [left.range[0], right.range ? right.range[1] : left.range[1]],
                            value: left.value + right.value,
                            code: true
                        };
                    }
                    else {
                        return {
                            range: [left.range[0], right.range[1]],
                            value: left.value + right.value
                        };
                    }
                }
                break;
            case 'ConditionalExpression':
                const consequent = this.parseCalculatedString(expression.consequent);
                const alternate = this.parseCalculatedString(expression.alternate);
                const items: CalculatedStringArrayParseResult[] = [];
                if (consequent.conditional) {
                    Array.prototype.push.apply(items, consequent.conditional);
                }
                else if (!consequent.code) {
                    items.push(consequent);
                }
                else {
                    break;
                }
                if (alternate.conditional) {
                    Array.prototype.push.apply(items, alternate.conditional);
                }
                else if (!alternate.code) {
                    items.push(alternate);
                }
                else {
                    break;
                }
                return {
                    value: '',
                    code: true,
                    conditional: items
                };
            case 'Literal':
                return {
                    range: expression.range,
                    value: `${expression.value}`
                };
        }
        return {
            value: '',
            code: true
        };
    }

    parse(source: string, initialState: ParserState) {
        let ast: ESTree.Program;
        const comments: any[] = [];
        const len = POSSIBLE_AST_OPTIONS.length;
        for (let i = 0; i < len; i++) {
            if (!ast) {
                try {
                    comments.length = 0;
                    POSSIBLE_AST_OPTIONS[i].onComment = comments;
                    ast = acorn.parse(source, POSSIBLE_AST_OPTIONS[i]);
                } catch (e) {
                    // ignore the error
                }
            }
        }
        if (!ast) {
            // for the error
            ast = acorn.parse(source, {
                ranges: true,
                locations: true,
                ecmaVersion: 2017,
                sourceType: 'module',
                plugins: {
                    dynamicImport: true
                },
                onComment: comments
            });
        }
        if (!ast || typeof ast !== 'object') {
            throw new Error('Source couldn\'t be parsed');
        }
        const oldScope = this.scope;
        const oldState = this.state;
        this.scope = <ParserScope>{
            inTry: false,
            definitions: [],
            renames: {}
        };
        const state = this.state = initialState || {} as any;
        if (this.applyPluginsBailResult('program', ast, comments) === undefined) {
            this.walkStatements(ast.body);
        }
        this.scope = oldScope;
        this.state = oldState;
        return state;
    }

    evaluate(source: string) {
        const ast = acorn.parse(`(${source})`, {
            ranges: true,
            locations: true,
            ecmaVersion: 2017,
            sourceType: 'module',
            plugins: {
                dynamicImport: true
            }
        });
        if (!ast || typeof ast !== 'object' || ast.type !== 'Program') {
            throw new Error('evaluate: Source couldn\'t be parsed');
        }
        if (ast.body.length !== 1 || ast.body[0].type !== 'ExpressionStatement') {
            throw new Error('evaluate: Source is not a expression');
        }
        return this.evaluateExpression((ast.body[0] as ESTree.ExpressionStatement).expression);
    }
}

Parser.prototype.walkReturnStatement = Parser.prototype.walkThrowStatement = function walkArgumentStatement(
    this: Parser,
    statement: ESTree.ReturnStatement | ESTree.ThrowStatement
) {
    if (statement.argument) {
        this.walkExpression(statement.argument);
    }
};

Parser.prototype.walkWhileStatement = Parser.prototype.walkDoWhileStatement = function walkLoopStatement(
    this: Parser,
    statement: ESTree.WhileStatement | ESTree.DoWhileStatement
) {
    this.walkExpression(statement.test);
    this.walkStatement(statement.body);
};

Parser.prototype.walkBinaryExpression = Parser.prototype.walkLogicalExpression = function walkLeftRightExpression(
    this: Parser,
    expression: ESTree.BinaryExpression | ESTree.LogicalExpression
) {
    this.walkExpression(expression.left);
    this.walkExpression(expression.right);
};

['parseString', 'parseCalculatedString'].forEach(fn => {
    Parser.prototype[`${fn}Array`] = function parseXXXArray(this: Parser, expression: ESTree.Expression) {
        switch (expression.type) {
            case 'ArrayExpression':
                const arr: CalculatedStringArrayParseResult[] = [];
                if (expression.elements) {
                    expression.elements.forEach((expr) => {
                        arr.push(this[fn](expr));
                    });
                }
                return arr;
        }
        return [this[fn](expression)];
    };
});

interface CalculatedStringArrayParseResult {
    value: string
    code?: boolean
    range?: SourceRange
    conditional?: CalculatedStringArrayParseResult[]
}

declare interface Parser {
    walkReturnStatement(statement: ESTree.ReturnStatement): void
    walkThrowStatement(statement: ESTree.ThrowStatement): void
    walkWhileStatement(statement: ESTree.WhileStatement): void
    walkDoWhileStatement(statement: ESTree.DoWhileStatement): void
    walkBinaryExpression(expression: ESTree.BinaryExpression): void
    walkLogicalExpression(expression: ESTree.LogicalExpression): void
    parseStringArray(expression: ESTree.Expression): string
    parseCalculatedStringArray(expression: ESTree.Expression): CalculatedStringArrayParseResult
}

export = Parser;
