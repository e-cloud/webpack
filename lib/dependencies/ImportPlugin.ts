/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import ImportDependency = require('./ImportDependency');
import ImportParserPlugin = require('./ImportParserPlugin');
import Compiler = require('../Compiler')
import Compilation = require('../Compilation')
import { CompilationParams, ModuleOptions, ParserOptions } from '../../typings/webpack-types';
import Parser = require('../Parser')
import ImportEagerDependency = require('./ImportEagerDependency');
import ImportEagerContextDependency = require('./ImportEagerContextDependency');
import ImportLazyOnceContextDependency = require('./ImportLazyOnceContextDependency');
import ImportLazyContextDependency = require('./ImportLazyContextDependency');

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

            compilation.dependencyFactories.set(ImportEagerDependency, normalModuleFactory);
            compilation.dependencyTemplates.set(ImportEagerDependency, new ImportEagerDependency.Template());

            compilation.dependencyFactories.set(ImportEagerContextDependency, contextModuleFactory);
            compilation.dependencyTemplates.set(ImportEagerContextDependency, new ImportEagerContextDependency.Template());

            compilation.dependencyFactories.set(ImportLazyOnceContextDependency, contextModuleFactory);
            compilation.dependencyTemplates.set(ImportLazyOnceContextDependency, new ImportLazyOnceContextDependency.Template());

            compilation.dependencyFactories.set(ImportLazyContextDependency, contextModuleFactory);
            compilation.dependencyTemplates.set(ImportLazyContextDependency, new ImportLazyContextDependency.Template());

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
