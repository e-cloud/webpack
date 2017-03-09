/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import AMDRequireItemDependency = require('./AMDRequireItemDependency');
import AMDRequireContextDependency = require('./AMDRequireContextDependency');
import ConstDependency = require('./ConstDependency');
import AMDDefineDependency = require('./AMDDefineDependency');
import AMDRequireArrayDependency = require('./AMDRequireArrayDependency');
import LocalModuleDependency = require('./LocalModuleDependency');
import ContextDependencyHelpers = require('./ContextDependencyHelpers');
import LocalModulesHelpers = require('./LocalModulesHelpers');
import Parser = require('../Parser')
import {
    CallExpression,
    Expression,
    FunctionExpression,
    Identifier,
    Literal,
    MemberExpression,
    ObjectExpression,
    Pattern,
    SimpleCallExpression
} from 'estree'
import { ModuleOptions } from '../../typings/webpack-types'
import BasicEvaluatedExpression = require('../BasicEvaluatedExpression')
import ModuleDependency = require('./ModuleDependency')

function isBoundFunctionExpression(expr: Expression) {
    if (expr.type !== 'CallExpression') {
        return false;
    }
    if (expr.callee.type !== 'MemberExpression') {
        return false;
    }
    if (expr.callee.computed) {
        return false;
    }
    if (expr.callee.object.type !== 'FunctionExpression') {
        return false;
    }
    if (expr.callee.property.type !== 'Identifier') {
        return false;
    }
    if (expr.callee.property.name !== 'bind') {
        return false;
    }
    return true;
}

type BoundFunctionCallExpression = SimpleCallExpression & {
    callee: MemberExpression & {
        object: FunctionExpression
        property: Identifier
        name: 'bind'
    }
}

class AMDDefineDependencyParserPlugin {
    constructor(public options: ModuleOptions) {
    }

    apply(parser: Parser) {
        const options = this.options;
        parser.plugin('call define', function (expr: CallExpression) {
            let array;
            let fn: BoundFunctionCallExpression | FunctionExpression;
            let obj: ObjectExpression;
            let namedModule: string;
            switch (expr.arguments.length) {
                case 1:
                    if (expr.arguments[0].type === 'FunctionExpression' || isBoundFunctionExpression(expr.arguments[0] as FunctionExpression)) {
                        // define(f() {...})
                        fn = expr.arguments[0] as BoundFunctionCallExpression;
                    }
                    else if (expr.arguments[0].type === 'ObjectExpression') {
                        // define({...})
                        obj = expr.arguments[0] as ObjectExpression;
                    }
                    else {
                        // define(expr)
                        // unclear if function or object
                        obj = fn = expr.arguments[0] as any;
                    }
                    break;
                case 2:
                    if (expr.arguments[0].type === 'Literal') {
                        namedModule = (expr.arguments[0] as Literal).value as string;
                        // define("...", ...)
                        if (expr.arguments[1].type === 'FunctionExpression' || isBoundFunctionExpression((expr.arguments[1]) as FunctionExpression)) {
                            // define("...", f() {...})
                            fn = expr.arguments[1] as BoundFunctionCallExpression;
                        }
                        else if (expr.arguments[1].type === 'ObjectExpression') {
                            // define("...", {...})
                            obj = expr.arguments[1] as ObjectExpression;
                        }
                        else {
                            // define("...", expr)
                            // unclear if function or object
                            obj = fn = expr.arguments[1] as any;
                        }
                    }
                    else {
                        array = expr.arguments[0];
                        if (expr.arguments[1].type === 'FunctionExpression' || isBoundFunctionExpression((expr.arguments[1] as FunctionExpression))) {
                            // define([...], f() {})
                            fn = expr.arguments[1] as BoundFunctionCallExpression;
                        }
                        else if (expr.arguments[1].type === 'ObjectExpression') {
                            // define([...], {...})
                            obj = expr.arguments[1] as ObjectExpression;
                        }
                        else {
                            // define([...], expr)
                            // unclear if function or object
                            obj = fn = expr.arguments[1] as any;
                        }
                    }
                    break;
                case 3:
                    // define("...", [...], f() {...})
                    namedModule = (expr.arguments[0] as Literal).value as string;
                    array = expr.arguments[1];
                    if (expr.arguments[2].type === 'FunctionExpression' || isBoundFunctionExpression(expr.arguments[2] as FunctionExpression)) {
                        // define("...", [...], f() {})
                        fn = expr.arguments[2] as BoundFunctionCallExpression;
                    }
                    else if (expr.arguments[2].type === 'ObjectExpression') {
                        // define("...", [...], {...})
                        obj = expr.arguments[2] as ObjectExpression;
                    }
                    else {
                        // define("...", [...], expr)
                        // unclear if function or object
                        obj = fn = expr.arguments[2] as any;
                    }
                    break;
                default:
                    return;
            }
            let fnParams: Pattern[] = null;
            let fnParamsOffset = 0;
            if (fn) {
                if (fn.type === 'FunctionExpression') {
                    fnParams = fn.params;
                }
                else if (isBoundFunctionExpression(fn)) {
                    const lcFn = fn as BoundFunctionCallExpression
                    fnParams = lcFn.callee.object.params;
                    fnParamsOffset = lcFn.arguments.length - 1;
                    if (fnParamsOffset < 0) {
                        fnParamsOffset = 0;
                    }
                }
            }
            const fnRenames = Object.create(this.scope.renames);
            let identifiers: any;
            if (array) {
                identifiers = {};
                const param = this.evaluateExpression(array);
                const result = this.applyPluginsBailResult('call define:amd:array', expr, param, identifiers, namedModule);
                if (!result) {
                    return;
                }
                if (fnParams) {
                    fnParams = fnParams.slice(fnParamsOffset)
                        .filter((param: Identifier, idx) => {
                            if (identifiers[idx]) {
                                fnRenames[`$${param.name}`] = identifiers[idx];
                                return false;
                            }
                            return true;
                        });
                }
            }
            else {
                identifiers = ['require', 'exports', 'module'];
                if (fnParams) {
                    fnParams = fnParams.slice(fnParamsOffset)
                        .filter((param: Identifier, idx) => {
                            if (identifiers[idx]) {
                                fnRenames[`$${param.name}`] = identifiers[idx];
                                return false;
                            }
                            return true;
                        });
                }
            }
            let inTry: boolean;
            if (fn && fn.type === 'FunctionExpression') {
                inTry = this.scope.inTry;
                const lcFn = fn as FunctionExpression
                this.inScope(fnParams, () => {
                    this.scope.renames = fnRenames;
                    this.scope.inTry = inTry;
                    if (lcFn.body.type === 'BlockStatement') {
                        this.walkStatement(lcFn.body);
                    }
                    else {
                        this.walkExpression(lcFn.body);
                    }
                });
            }
            else if (fn && isBoundFunctionExpression(fn)) {
                inTry = this.scope.inTry;
                const lcFn = fn as BoundFunctionCallExpression
                this.inScope(
                    lcFn.callee.object.params.filter((i: Identifier) =>
                        !['require', 'module', 'exports'].includes(i.name)
                    ),
                    () => {
                        this.scope.renames = fnRenames;
                        this.scope.inTry = inTry;
                        if (lcFn.callee.object.body.type === 'BlockStatement') {
                            this.walkStatement(lcFn.callee.object.body);
                        }
                        else {
                            this.walkExpression(lcFn.callee.object.body);
                        }
                    }
                );
                if (lcFn.arguments) {
                    this.walkExpressions(lcFn.arguments);
                }
            }
            else if (fn || obj) {
                this.walkExpression(fn || obj);
            }
            const dep = new AMDDefineDependency(expr.range, array ? array.range : null, fn ? fn.range : null, obj
                ? obj.range
                : null);
            dep.loc = expr.loc;
            if (namedModule) {
                dep.localModule = LocalModulesHelpers.addLocalModule(this.state, namedModule);
            }
            this.state.current.addDependency(dep);
            return true;
        });
        parser.plugin('call define:amd:array', function (
            expr: CallExpression,
            param: BasicEvaluatedExpression,
            identifiers: {},
            namedModule: string
        ) {
            if (param.isArray()) {
                param.items.forEach((param, idx) => {
                    if (param.isString() && ['require', 'module', 'exports'].includes(param.string)) {
                        identifiers[idx] = param.string;
                    }
                    const result = this.applyPluginsBailResult('call define:amd:item', expr, param, namedModule);
                    if (result === undefined) {
                        this.applyPluginsBailResult('call define:amd:context', expr, param);
                    }
                });
                return true;
            }
            else if (param.isConstArray()) {
                const deps: (string | ModuleDependency)[] = [];
                param.array.forEach((request, idx) => {
                    let dep;
                    let localModule;
                    if (request === 'require') {
                        identifiers[idx] = request;
                        dep = '__webpack_require__';
                    }
                    else if (['exports', 'module'].includes(request)) {
                        identifiers[idx] = request;
                        dep = request;
                    }
                    else if (localModule = LocalModulesHelpers.getLocalModule(this.state, request)) {
                        // eslint-disable-line no-cond-assign
                        dep = new LocalModuleDependency(localModule);
                        dep.loc = expr.loc;
                        this.state.current.addDependency(dep);
                    }
                    else {
                        dep = new AMDRequireItemDependency(request);
                        dep.loc = expr.loc;
                        dep.optional = !!this.scope.inTry;
                        this.state.current.addDependency(dep);
                    }
                    deps.push(dep);
                });
                const dep = new AMDRequireArrayDependency(deps, param.range);
                dep.loc = expr.loc;
                dep.optional = !!this.scope.inTry;
                this.state.current.addDependency(dep);
                return true;
            }
        });
        parser.plugin('call define:amd:item', function (
            expr: CallExpression,
            param: BasicEvaluatedExpression,
            namedModule: string
        ) {
            if (param.isConditional()) {
                param.options.forEach((param) => {
                    const result = this.applyPluginsBailResult('call define:amd:item', expr, param);
                    if (result === undefined) {
                        this.applyPluginsBailResult('call define:amd:context', expr, param);
                    }
                });
                return true;
            }
            else if (param.isString()) {
                let dep;
                let localModule;
                if (param.string === 'require') {
                    dep = new ConstDependency('__webpack_require__', param.range);
                }
                else if (['require', 'exports', 'module'].includes(param.string)) {
                    dep = new ConstDependency(param.string, param.range);
                }
                else if (localModule = LocalModulesHelpers.getLocalModule(this.state, param.string, namedModule)) {
                    // eslint-disable-line no-cond-assign
                    dep = new LocalModuleDependency(localModule, param.range);
                }
                else {
                    dep = new AMDRequireItemDependency(param.string, param.range);
                }
                dep.loc = expr.loc;
                dep.optional = !!this.scope.inTry;
                this.state.current.addDependency(dep);
                return true;
            }
        });
        parser.plugin('call define:amd:context', function (expr: CallExpression, param: BasicEvaluatedExpression) {
            const dep = ContextDependencyHelpers.create(AMDRequireContextDependency, param.range, param, expr, options);
            if (!dep) {
                return;
            }
            dep.loc = expr.loc;
            dep.optional = !!this.scope.inTry;
            this.state.current.addDependency(dep);
            return true;
        });
    }
}

export = AMDDefineDependencyParserPlugin;
