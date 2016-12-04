/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import ConstDependency = require('./dependencies/ConstDependency');
import NullFactory = require('./NullFactory');
import Compiler = require('./Compiler')
import Compilation = require('./Compilation')
import Parser = require('./Parser')
import { CompilationParams, ParserOptions } from '../typings/webpack-types'
import { Expression, CallExpression } from 'estree'

class RequireJsStuffPlugin {
    apply(compiler: Compiler) {
        compiler.plugin('compilation', function (compilation: Compilation, params: CompilationParams) {
            compilation.dependencyFactories.set(ConstDependency, new NullFactory());
            compilation.dependencyTemplates.set(ConstDependency, new ConstDependency.Template());

            params.normalModuleFactory.plugin('parser', function (parser: Parser, parserOptions: ParserOptions) {
                if (typeof parserOptions.requireJs !== 'undefined' && !parserOptions.requireJs) {
                    return;
                }

                function remove(this: Parser, expr: CallExpression) {
                    const dep = new ConstDependency(';', expr.range);
                    dep.loc = expr.loc;
                    this.state.current.addDependency(dep);
                    return true;
                }

                parser.plugin('call require.config', remove);
                parser.plugin('call requirejs.config', remove);

                parser.plugin('expression require.version', function (expr: Expression) {
                    const dep = new ConstDependency(JSON.stringify('0.0.0'), expr.range);
                    dep.loc = expr.loc;
                    this.state.current.addDependency(dep);
                    return true;
                });
                parser.plugin('expression requirejs.onError', function (expr: Expression) {
                    const dep = new ConstDependency(JSON.stringify('__webpack_require__.oe'), expr.range);
                    dep.loc = expr.loc;
                    this.state.current.addDependency(dep);
                    return true;
                });
            });
        });
    }
}

export = RequireJsStuffPlugin;
