/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import ImportDependency = require('./ImportDependency');
import ImportContextDependency = require('./ImportContextDependency');
import ImportParserPlugin = require('./ImportParserPlugin');
import Compiler = require('../Compiler')
import Compilation = require('../Compilation')
import { CompilationParams, ParserOptions, ModuleOptions } from '../../typings/webpack-types'
import Parser = require('../Parser')

class ImportPlugin {
    constructor(public options: ModuleOptions) {
    }

    apply(compiler: Compiler) {
        const options = this.options;
        compiler.plugin('compilation', (compilation: Compilation, params: CompilationParams) => {
            const normalModuleFactory = params.normalModuleFactory;
            const contextModuleFactory = params.contextModuleFactory;

            compilation.dependencyFactories.set(ImportDependency, normalModuleFactory);
            compilation.dependencyTemplates.set(ImportDependency, new ImportDependency.Template());

            compilation.dependencyFactories.set(ImportContextDependency, contextModuleFactory);
            compilation.dependencyTemplates.set(ImportContextDependency, new ImportContextDependency.Template());

            params.normalModuleFactory.plugin('parser', (parser: Parser, parserOptions: ParserOptions) => {

                if (typeof parserOptions.import !== 'undefined' && !parserOptions.import) {
                    return;
                }

                parser.apply(new ImportParserPlugin(options));
            });
        });
    }
}

export = ImportPlugin;
