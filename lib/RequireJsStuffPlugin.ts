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
import ParserHelpers = require('./ParserHelpers')

class RequireJsStuffPlugin {
    apply(compiler: Compiler) {
        compiler.plugin('compilation', function (compilation: Compilation, params: CompilationParams) {
            compilation.dependencyFactories.set(ConstDependency, new NullFactory());
            compilation.dependencyTemplates.set(ConstDependency, new ConstDependency.Template());

            params.normalModuleFactory.plugin('parser', function (parser: Parser, parserOptions: ParserOptions) {
                if (typeof parserOptions.requireJs !== 'undefined' && !parserOptions.requireJs) {
                    return;
                }

                parser.plugin('call require.config', ParserHelpers.toConstantDependency('undefined'));
                parser.plugin('call requirejs.config', ParserHelpers.toConstantDependency('undefined'));

                parser.plugin('expression require.version', ParserHelpers.toConstantDependency(JSON.stringify('0.0.0')));
                parser.plugin('expression requirejs.onError', ParserHelpers.toConstantDependency(JSON.stringify('__webpack_require__.oe')));

            });
        });
    }
}

export = RequireJsStuffPlugin;
