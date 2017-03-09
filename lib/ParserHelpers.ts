/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
'use strict';

import Parser = require('./Parser')
import DependenciesBlock = require('./DependenciesBlock')
import Dependency = require('./Dependency')
import BasicEvaluatedExpression = require('./BasicEvaluatedExpression');
import ConstDependency = require('./dependencies/ConstDependency');
import UnsupportedFeatureWarning = require('./UnsupportedFeatureWarning');
import { Expression, VariableDeclaration } from 'estree'
import path = require('path')

export function addParsedVariableToModule(parser: Parser, name: string, expression: string) {
    if (!parser.state.current.addVariable) {
        return false;
    }
    const deps: Dependency[] = [];
    parser.parse(expression, {
        current: {
            addDependency(dep) {
                dep.userRequest = name;
                deps.push(dep);
            }
        } as DependenciesBlock,
        module: parser.state.module
    });
    parser.state.current.addVariable(name, expression, deps);
    return true;
}

export function requireFileAsExpression(context: string, pathToModule: string) {
    let moduleJsPath = path.relative(context, pathToModule);
    if (!/^[A-Z]:/i.test(moduleJsPath)) {
        moduleJsPath = `./${moduleJsPath.replace(/\\/g, '/')}`;
    }
    return `require(${JSON.stringify(moduleJsPath)})`;
}

export function toConstantDependency(value: string) {
    return function constantDependency(expr: VariableDeclaration) {
        const dep = new ConstDependency(value, expr.range);
        dep.loc = expr.loc;
        this.state.current.addDependency(dep);
        return true;
    };
}

export function evaluateToString(value: string) {
    return function stringExpression(expr: Expression) {
        return new BasicEvaluatedExpression().setString(value).setRange(expr.range);
    };
}

export function evaluateToBoolean(value: boolean) {
    return function booleanExpression(expr: Expression) {
        return new BasicEvaluatedExpression().setBoolean(value).setRange(expr.range);
    };
}

export function expressionIsUnsupported(message: string) {
    return function unsupportedExpression(expr: Expression) {
        const dep = new ConstDependency('(void 0)', expr.range);
        dep.loc = expr.loc;
        this.state.current.addDependency(dep);
        if (!this.state.module) {
            return;
        }
        this.state.module.warnings.push(new UnsupportedFeatureWarning(this.state.module, message));
        return true;
    };
}

export function skipTraversal() {
    return true;
}

export function approve() {
    return true;
}
