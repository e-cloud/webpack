/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import ConstDependency = require('./dependencies/ConstDependency');
import NullFactory = require('./NullFactory');
import Compiler = require('./Compiler')
import Compilation = require('./Compilation')
import Parser = require('./Parser')
import { CallExpression } from 'estree'
import { CompilationParams, ParserOptions } from '../typings/webpack-types'
import ContextDependency = require('./dependencies/ContextDependency')

class CompatibilityPlugin {
    apply(compiler: Compiler) {
        compiler.plugin('compilation', function (compilation: Compilation, params: CompilationParams) {
            compilation.dependencyFactories.set(ConstDependency, new NullFactory());
            compilation.dependencyTemplates.set(ConstDependency, new ConstDependency.Template());

            params.normalModuleFactory.plugin('parser', function (parser: Parser, parserOptions: ParserOptions) {

                // this is no documentation for this option
                if (typeof parserOptions.browserify !== 'undefined' && !parserOptions.browserify) {
                    return;
                }

                parser.plugin('call require', function (expr: CallExpression) {
                    // support for browserify style require delegator: "require(o, !0)"
                    if (expr.arguments.length !== 2) {
                        return;
                    }
                    const second = this.evaluateExpression(expr.arguments[1]);
                    if (!second.isBoolean()) {
                        return;
                    }
                    if (second.asBool() !== true) {
                        return;
                    }
                    const dep = new ConstDependency('require', expr.callee.range);
                    dep.loc = expr.loc;
                    if (this.state.current.dependencies.length > 1) {
                        const last = this.state.current.dependencies[this.state.current.dependencies.length - 1] as ContextDependency;
                        if (last.critical && last.request === '.' && last.userRequest === '.' && last.recursive) {
                            this.state.current.dependencies.pop();
                        }
                    }
                    this.state.current.addDependency(dep);
                    return true;
                });
            });
        });
    }
}

export = CompatibilityPlugin;
