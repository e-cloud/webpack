/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import HarmonyImportDependency = require('./HarmonyImportDependency');
import HarmonyImportSpecifierDependency = require('./HarmonyImportSpecifierDependency');
import HarmonyExportHeaderDependency = require('./HarmonyExportHeaderDependency');
import HarmonyExportExpressionDependency = require('./HarmonyExportExpressionDependency');
import HarmonyExportSpecifierDependency = require('./HarmonyExportSpecifierDependency');
import HarmonyExportImportedSpecifierDependency = require('./HarmonyExportImportedSpecifierDependency');
import HarmonyAcceptDependency = require('./HarmonyAcceptDependency');
import HarmonyAcceptImportDependency = require('./HarmonyAcceptImportDependency');
import NullFactory = require('../NullFactory');
import HarmonyImportDependencyParserPlugin = require('./HarmonyImportDependencyParserPlugin');
import HarmonyExportDependencyParserPlugin = require('./HarmonyExportDependencyParserPlugin');
import Compiler = require('../Compiler')
import Compilation = require('../Compilation')
import Parser = require('../Parser')
import { CompilationParams, ParserOptions } from '../../typings/webpack-types'

class HarmonyModulesPlugin {
    apply(compiler: Compiler) {
        compiler.plugin('compilation', function (compilation: Compilation, params: CompilationParams) {
            const normalModuleFactory = params.normalModuleFactory;

            compilation.dependencyFactories.set(HarmonyImportDependency, normalModuleFactory);
            compilation.dependencyTemplates.set(HarmonyImportDependency, new HarmonyImportDependency.Template());

            compilation.dependencyFactories.set(HarmonyImportSpecifierDependency, new NullFactory());
            compilation.dependencyTemplates.set(HarmonyImportSpecifierDependency, new HarmonyImportSpecifierDependency.Template());

            compilation.dependencyFactories.set(HarmonyExportHeaderDependency, new NullFactory());
            compilation.dependencyTemplates.set(HarmonyExportHeaderDependency, new HarmonyExportHeaderDependency.Template());

            compilation.dependencyFactories.set(HarmonyExportExpressionDependency, new NullFactory());
            compilation.dependencyTemplates.set(HarmonyExportExpressionDependency, new HarmonyExportExpressionDependency.Template());

            compilation.dependencyFactories.set(HarmonyExportSpecifierDependency, new NullFactory());
            compilation.dependencyTemplates.set(HarmonyExportSpecifierDependency, new HarmonyExportSpecifierDependency.Template());

            compilation.dependencyFactories.set(HarmonyExportImportedSpecifierDependency, new NullFactory());
            compilation.dependencyTemplates.set(HarmonyExportImportedSpecifierDependency, new HarmonyExportImportedSpecifierDependency.Template());

            compilation.dependencyFactories.set(HarmonyAcceptDependency, new NullFactory());
            compilation.dependencyTemplates.set(HarmonyAcceptDependency, new HarmonyAcceptDependency.Template());

            compilation.dependencyFactories.set(HarmonyAcceptImportDependency, normalModuleFactory);
            compilation.dependencyTemplates.set(HarmonyAcceptImportDependency, new HarmonyAcceptImportDependency.Template());

            params.normalModuleFactory.plugin('parser', function (parser: Parser, parserOptions: ParserOptions) {

                if (typeof parserOptions.harmony !== 'undefined' && !parserOptions.harmony) {
                    return;
                }

                parser.apply(new HarmonyImportDependencyParserPlugin(), new HarmonyExportDependencyParserPlugin());
            });
        });
    }
}

export = HarmonyModulesPlugin;
