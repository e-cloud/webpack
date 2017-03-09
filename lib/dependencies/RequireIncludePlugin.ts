/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import RequireIncludeDependency = require('./RequireIncludeDependency');
import RequireIncludeDependencyParserPlugin = require('./RequireIncludeDependencyParserPlugin');
import Compiler = require('../Compiler')
import Compilation = require('../Compilation')
import Parser = require('../Parser')
import { CompilationParams, ParserOptions } from '../../typings/webpack-types'
import ParserHelpers = require('../ParserHelpers');

class RequireIncludePlugin {
    apply(compiler: Compiler) {
        compiler.plugin('compilation', function (compilation: Compilation, params: CompilationParams) {
            const normalModuleFactory = params.normalModuleFactory;

            compilation.dependencyFactories.set(RequireIncludeDependency, normalModuleFactory);
            compilation.dependencyTemplates.set(RequireIncludeDependency, new RequireIncludeDependency.Template());

            params.normalModuleFactory.plugin('parser', function (parser: Parser, parserOptions: ParserOptions) {

                if (typeof parserOptions.requireInclude !== 'undefined' && !parserOptions.requireInclude) {
                    return;
                }

                parser.apply(new RequireIncludeDependencyParserPlugin());
                parser.plugin('evaluate typeof require.include', ParserHelpers.evaluateToString('function'));
                parser.plugin('typeof require.include', ParserHelpers.toConstantDependency(JSON.stringify('function')));
            });
        });
    }
}

export = RequireIncludePlugin;
