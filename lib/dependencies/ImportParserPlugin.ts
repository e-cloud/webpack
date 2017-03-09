/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import ImportContextDependency = require('./ImportContextDependency');
import ImportDependenciesBlock = require('./ImportDependenciesBlock');
import ContextDependencyHelpers = require('./ContextDependencyHelpers');
import Parser = require('../Parser')
import { CallExpression } from 'estree'
import { ModuleOptions } from '../../typings/webpack-types'

class ImportParserPlugin {
    constructor(public options: ModuleOptions) {
    }

    apply(parser: Parser) {
        const options = this.options;
        parser.plugin(['call System.import', 'import-call'], function (expr: CallExpression) {
            if (expr.arguments.length !== 1) {
                throw new Error('Incorrect number of arguments provided to \'import(module: string) -> Promise\'.');
            }
            const param = this.evaluateExpression(expr.arguments[0]);
            if (param.isString()) {
                const depBlock = new ImportDependenciesBlock(param.string, expr.range, this.state.module, expr.loc);
                this.state.current.addBlock(depBlock);
                return true;
            }
            else {
                const dep = ContextDependencyHelpers.create(ImportContextDependency, expr.range, param, expr, options);
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

export = ImportParserPlugin;
