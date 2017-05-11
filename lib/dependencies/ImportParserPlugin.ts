/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import ImportContextDependency = require('./ImportContextDependency');
import ImportDependenciesBlock = require('./ImportDependenciesBlock');
import ContextDependencyHelpers = require('./ContextDependencyHelpers');
import Parser = require('../Parser')
import { CallExpression } from 'estree';
import { ModuleOptions } from '../../typings/webpack-types';
import UnsupportedFeatureWarning = require('../UnsupportedFeatureWarning');
import ImportEagerDependency = require('./ImportEagerDependency');
import ImportLazyContextDependency = require('./ImportLazyContextDependency');
import ImportEagerContextDependency = require('./ImportEagerContextDependency');
import ImportLazyOnceContextDependency = require('./ImportLazyOnceContextDependency');

class ImportParserPlugin {
    constructor(public options: ModuleOptions) {
    }

    apply(parser: Parser) {
        const options = this.options;
        parser.plugin(['call System.import', 'import-call'], function (this: Parser, expr: CallExpression) {
            if (expr.arguments.length !== 1) {
                throw new Error('Incorrect number of arguments provided to \'import(module: string) -> Promise\'.');
            }
            const param = this.evaluateExpression(expr.arguments[0]);

            let chunkName = null;
            let mode = 'lazy';

            const importOptions = this.getCommentOptions(expr.range);
            if (importOptions) {
                if (typeof importOptions.webpackChunkName !== 'undefined') {
                    if (typeof importOptions.webpackChunkName !== 'string') {
                        this.state.module.warnings.push(new UnsupportedFeatureWarning(this.state.module, `\`webpackChunkName\` expected a string, but received: ${importOptions.webpackChunkName}.`));
                    } else {
                        chunkName = importOptions.webpackChunkName;
                    }
                }
                if (typeof importOptions.webpackMode !== 'undefined') {
                    if (typeof importOptions.webpackMode !== 'string') {
                        this.state.module.warnings.push(new UnsupportedFeatureWarning(this.state.module, `\`webpackMode\` expected a string, but received: ${importOptions.webpackMode}.`));
                    } else {
                        mode = importOptions.webpackMode;
                    }
                }
            }

            if (param.isString()) {
                if (mode !== 'lazy' && mode !== 'eager') {
                    this.state.module.warnings.push(new UnsupportedFeatureWarning(this.state.module, `\`webpackMode\` expected 'lazy' or 'eager', but received: ${mode}.`));
                }

                if (mode === 'eager') {
                    const dep = new ImportEagerDependency(param.string, expr.range);
                    this.state.current.addDependency(dep);
                } else {
                    const depBlock = new ImportDependenciesBlock(param.string, expr.range, chunkName, this.state.module, expr.loc);
                    this.state.current.addBlock(depBlock);
                }
                return true;
            } else {
                if (mode !== 'lazy' && mode !== 'lazy-once' && mode !== 'eager') {
                    this.state.module.warnings.push(new UnsupportedFeatureWarning(this.state.module, `\`webpackMode\` expected 'lazy', 'lazy-once' or 'eager', but received: ${mode}.`));
                }

                let Dep = ImportLazyContextDependency;
                if (mode === 'eager') {
                    Dep = ImportEagerContextDependency;
                } else if (mode === 'lazy-once') {
                    Dep = ImportLazyOnceContextDependency;
                }
                const dep = ContextDependencyHelpers.create(Dep, expr.range, param, expr, options, chunkName);
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
