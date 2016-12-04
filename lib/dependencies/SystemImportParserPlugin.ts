/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import SystemImportContextDependency = require('./SystemImportContextDependency');
import SystemImportDependenciesBlock = require('./SystemImportDependenciesBlock');
import ContextDependencyHelpers = require('./ContextDependencyHelpers');
import Parser = require('../Parser')
import { CallExpression } from 'estree'
import { ModuleOptions } from '../../typings/webpack-types'

class SystemImportParserPlugin {
    constructor(public options: ModuleOptions) {
    }

    apply(parser: Parser) {
        const options = this.options;
        parser.plugin('call System.import', function (expr: CallExpression) {
            if (expr.arguments.length !== 1) {
                throw new Error('Incorrect number of arguments provided to \'System.import(module: string) -> Promise\'.');
            }
            let dep;
            const param = this.evaluateExpression(expr.arguments[0]);
            if (param.isString()) {
                const depBlock = new SystemImportDependenciesBlock(param.string, expr.range, this.state.module, expr.loc);
                this.state.current.addBlock(depBlock);
                return true;
            }
            else {
                dep = ContextDependencyHelpers.create(SystemImportContextDependency, expr.range, param, expr, options);
                if (!dep) {
                    return;
                }
                dep.loc = expr.loc;
                dep.optional = !!this.scope.inTry;
                this.state.current.addDependency(dep);
                return true;
            }
        });
    }
}

export = SystemImportParserPlugin;
