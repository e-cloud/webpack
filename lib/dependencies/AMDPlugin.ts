/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import path = require('path');

import AMDRequireDependency = require('./AMDRequireDependency');
import AMDRequireItemDependency = require('./AMDRequireItemDependency');
import AMDRequireArrayDependency = require('./AMDRequireArrayDependency');
import AMDRequireContextDependency = require('./AMDRequireContextDependency');
import AMDDefineDependency = require('./AMDDefineDependency');
import UnsupportedDependency = require('./UnsupportedDependency');
import LocalModuleDependency = require('./LocalModuleDependency');
import ConstDependency = require('./ConstDependency');
import NullFactory = require('../NullFactory');
import AMDRequireDependenciesBlockParserPlugin = require('./AMDRequireDependenciesBlockParserPlugin');
import AMDDefineDependencyParserPlugin = require('./AMDDefineDependencyParserPlugin');
import AliasPlugin = require('enhanced-resolve/lib/AliasPlugin');
import BasicEvaluatedExpression = require('../BasicEvaluatedExpression');
import Compiler = require('../Compiler')
import Compilation = require('../Compilation')
import Parser = require('../Parser')
import { Expression, Identifier, UnaryExpression } from 'estree'
import { CompilationParams, ModuleOptions, ParserOptions } from '../../typings/webpack-types'

class AMDPlugin {
    constructor(public options: ModuleOptions, public amdOptions: any) {
    }

    apply(compiler: Compiler) {
        const options = this.options;
        const amdOptions = this.amdOptions;
        compiler.plugin('compilation', function (compilation: Compilation, params: CompilationParams) {
            const normalModuleFactory = params.normalModuleFactory;
            const contextModuleFactory = params.contextModuleFactory;

            compilation.dependencyFactories.set(AMDRequireDependency, new NullFactory());
            compilation.dependencyTemplates.set(AMDRequireDependency, new AMDRequireDependency.Template());

            compilation.dependencyFactories.set(AMDRequireItemDependency, normalModuleFactory);
            compilation.dependencyTemplates.set(AMDRequireItemDependency, new AMDRequireItemDependency.Template());

            compilation.dependencyFactories.set(AMDRequireArrayDependency, new NullFactory());
            compilation.dependencyTemplates.set(AMDRequireArrayDependency, new AMDRequireArrayDependency.Template());

            compilation.dependencyFactories.set(AMDRequireContextDependency, contextModuleFactory);
            compilation.dependencyTemplates.set(AMDRequireContextDependency, new AMDRequireContextDependency.Template());

            compilation.dependencyFactories.set(AMDDefineDependency, new NullFactory());
            compilation.dependencyTemplates.set(AMDDefineDependency, new AMDDefineDependency.Template());

            compilation.dependencyFactories.set(UnsupportedDependency, new NullFactory());
            compilation.dependencyTemplates.set(UnsupportedDependency, new UnsupportedDependency.Template());

            compilation.dependencyFactories.set(LocalModuleDependency, new NullFactory());
            compilation.dependencyTemplates.set(LocalModuleDependency, new LocalModuleDependency.Template());

            params.normalModuleFactory.plugin('parser', function (parser: Parser, parserOptions: ParserOptions) {
                if (typeof parserOptions.amd !== 'undefined' && !parserOptions.amd) {
                    return;
                }

                function setTypeof(expr: string, value: string) {
                    parser.plugin(`evaluate typeof ${expr}`, (expr: UnaryExpression) =>
                        new BasicEvaluatedExpression().setString(value).setRange(expr.range)
                    );
                    parser.plugin(`typeof ${expr}`, function (expr: UnaryExpression) {
                        const dep = new ConstDependency(JSON.stringify(value), expr.range);
                        dep.loc = expr.loc;
                        this.state.current.addDependency(dep);
                        return true;
                    });
                }

                function setExpressionToModule(expr: string, module: string) {
                    parser.plugin(`expression ${expr}`, function (expr: Expression) {
                        const dep = new AMDRequireItemDependency(module, expr.range);
                        // todo: the expr below is refer to expr of setExpressionToModule
                        dep.userRequest = expr;
                        dep.loc = expr.loc;
                        this.state.current.addDependency(dep);
                        return true;
                    });
                }

                parser.apply(new AMDRequireDependenciesBlockParserPlugin(options), new AMDDefineDependencyParserPlugin(options));
                setExpressionToModule('require.amd', '!!webpack amd options');
                setExpressionToModule('define.amd', '!!webpack amd options');
                setExpressionToModule('define', '!!webpack amd define');
                parser.plugin('expression __webpack_amd_options__', function () {
                    return this.state.current.addVariable('__webpack_amd_options__', JSON.stringify(amdOptions));
                });
                parser.plugin('evaluate typeof define.amd', (expr: UnaryExpression) =>
                    new BasicEvaluatedExpression().setString(typeof amdOptions).setRange(expr.range)
                );
                parser.plugin('evaluate typeof require.amd', (expr: UnaryExpression) =>
                    new BasicEvaluatedExpression().setString(typeof amdOptions).setRange(expr.range)
                );
                parser.plugin('evaluate Identifier define.amd', (expr: Identifier) =>
                    new BasicEvaluatedExpression().setBoolean(true).setRange(expr.range)
                );
                parser.plugin('evaluate Identifier require.amd', (expr: Identifier) =>
                    new BasicEvaluatedExpression().setBoolean(true).setRange(expr.range)
                );
                setTypeof('define', 'function');
                parser.plugin('can-rename define', () => true);
                parser.plugin('rename define', function (expr: Expression) {
                    const dep = new AMDRequireItemDependency('!!webpack amd define', expr.range);
                    dep.userRequest = 'define';
                    dep.loc = expr.loc;
                    this.state.current.addDependency(dep);
                    return false;
                });
                setTypeof('require', 'function');
            });
        });
        compiler.resolvers.normal.apply(
            new AliasPlugin('described-resolve', {
                name: 'amdefine',
                alias: path.join(__dirname, '..', '..', 'buildin', 'amd-define.js')
            }, 'resolve'),
            new AliasPlugin('described-resolve', {
                name: 'webpack amd options',
                alias: path.join(__dirname, '..', '..', 'buildin', 'amd-options.js')
            }, 'resolve'),
            new AliasPlugin('described-resolve', {
                name: 'webpack amd define',
                alias: path.join(__dirname, '..', '..', 'buildin', 'amd-define.js')
            }, 'resolve')
        );
    }
}

export = AMDPlugin;
