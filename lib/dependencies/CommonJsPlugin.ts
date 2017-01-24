/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import ConstDependency = require('./ConstDependency');
import CommonJsRequireDependency = require('./CommonJsRequireDependency');
import CommonJsRequireContextDependency = require('./CommonJsRequireContextDependency');
import RequireResolveDependency = require('./RequireResolveDependency');
import RequireResolveContextDependency = require('./RequireResolveContextDependency');
import RequireResolveHeaderDependency = require('./RequireResolveHeaderDependency');
import RequireHeaderDependency = require('./RequireHeaderDependency');
import NullFactory = require('../NullFactory');
import RequireResolveDependencyParserPlugin = require('./RequireResolveDependencyParserPlugin');
import CommonJsRequireDependencyParserPlugin = require('./CommonJsRequireDependencyParserPlugin');
import Compiler = require('../Compiler')
import Compilation = require('../Compilation')
import Parser = require('../Parser')
import { ModuleOptions, CompilationParams, ParserOptions } from '../../typings/webpack-types'
import ParserHelpers = require("../ParserHelpers");

class CommonJsPlugin {
    constructor(public options: ModuleOptions) {
    }

    apply(compiler: Compiler) {
        const options = this.options;
        compiler.plugin('compilation', function (compilation: Compilation, params: CompilationParams) {
            const normalModuleFactory = params.normalModuleFactory;
            const contextModuleFactory = params.contextModuleFactory;

            compilation.dependencyFactories.set(CommonJsRequireDependency, normalModuleFactory);
            compilation.dependencyTemplates.set(CommonJsRequireDependency, new CommonJsRequireDependency.Template());

            compilation.dependencyFactories.set(CommonJsRequireContextDependency, contextModuleFactory);
            compilation.dependencyTemplates.set(CommonJsRequireContextDependency, new CommonJsRequireContextDependency.Template());

            compilation.dependencyFactories.set(RequireResolveDependency, normalModuleFactory);
            compilation.dependencyTemplates.set(RequireResolveDependency, new RequireResolveDependency.Template());

            compilation.dependencyFactories.set(RequireResolveContextDependency, contextModuleFactory);
            compilation.dependencyTemplates.set(RequireResolveContextDependency, new RequireResolveContextDependency.Template());

            compilation.dependencyFactories.set(RequireResolveHeaderDependency, new NullFactory());
            compilation.dependencyTemplates.set(RequireResolveHeaderDependency, new RequireResolveHeaderDependency.Template());

            compilation.dependencyFactories.set(RequireHeaderDependency, new NullFactory());
            compilation.dependencyTemplates.set(RequireHeaderDependency, new RequireHeaderDependency.Template());

            params.normalModuleFactory.plugin('parser', function (parser: Parser, parserOptions: ParserOptions) {
                if (typeof parserOptions.commonjs !== 'undefined' && !parserOptions.commonjs) {
                    return;
                }

                const requireExpressions = ['require', 'require.resolve', 'require.resolveWeak'];
                for (const expression of requireExpressions) {
                    parser.plugin(`typeof ${expression}`, ParserHelpers.toConstantDependency('function'));
                    parser.plugin(`evaluate typeof ${expression}`, ParserHelpers.evaluateToString('function'));
                }

                parser.plugin('evaluate typeof module', ParserHelpers.evaluateToString('object'));
                parser.plugin('assign require', function (expr) {
                    // to not leak to global "require", we need to define a local require here.
                    const dep = new ConstDependency('var require;', 0);
                    dep.loc = expr.loc;
                    this.state.current.addDependency(dep);
                    this.scope.definitions.push('require');
                    return true;
                });
                parser.plugin('can-rename require', () => true);
                parser.plugin('rename require', function (expr) {
                    // define the require variable. It's still undefined, but not "not defined".
                    const dep = new ConstDependency('var require;', 0);
                    dep.loc = expr.loc;
                    this.state.current.addDependency(dep);
                    return false;
                });
                parser.plugin('typeof module', () => true);
                parser.plugin('evaluate typeof exports', ParserHelpers.evaluateToString('object'));
                parser.apply(new CommonJsRequireDependencyParserPlugin(options), new RequireResolveDependencyParserPlugin(options));
            });
        });
    }
}

export = CommonJsPlugin;
