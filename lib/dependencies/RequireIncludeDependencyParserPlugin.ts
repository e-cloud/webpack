/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import AbstractPlugin = require('../AbstractPlugin');
import RequireIncludeDependency = require('./RequireIncludeDependency');
import { CallExpression } from 'estree'
import Parser = require('../Parser')

export = AbstractPlugin.create({
    'call require.include'(this: Parser, expr: CallExpression) {
        if (expr.arguments.length !== 1) {
            return;
        }
        const param = this.evaluateExpression(expr.arguments[0]);
        if (!param.isString()) {
            return;
        }
        const dep = new RequireIncludeDependency(param.string, expr.range);
        dep.loc = expr.loc;
        this.state.current.addDependency(dep);
        return true;
    }
});
