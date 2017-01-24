/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import path = require('path');
import ConstDependency = require('./dependencies/ConstDependency');
import BasicEvaluatedExpression = require('./BasicEvaluatedExpression');
import NullFactory = require('./NullFactory');
import Compiler = require('./Compiler')
import Compilation = require('./Compilation')
import Parser = require('./Parser')
import { CompilationParams, NodeOption, ParserOptions } from '../typings/webpack-types'
import { Identifier, Expression } from 'estree'
import Module = require('./Module')
import ParserHelpers = require('./ParserHelpers');

class NodeStuffPlugin {
    constructor(public options: NodeOption) {
    }

    apply(compiler: Compiler) {
        const options = this.options;
        compiler.plugin('compilation', function (compilation: Compilation, params: CompilationParams) {
            compilation.dependencyFactories.set(ConstDependency, new NullFactory());
            compilation.dependencyTemplates.set(ConstDependency, new ConstDependency.Template());

            params.normalModuleFactory.plugin('parser', function (parser: Parser, parserOptions: ParserOptions) {

                if (parserOptions.node === false) {
                    return;
                }

                let localOptions = options;
                if (parserOptions.node) {
                    localOptions = Object.assign({}, localOptions, parserOptions.node);
                }

                function setConstant(expressionName: string, value: string) {
                    parser.plugin(`expression ${expressionName}`, function () {
                        this.state.current.addVariable(expressionName, JSON.stringify(value));
                        return true;
                    });
                }

                function setModuleConstant(expressionName: string, fn: (module: Module) => any) {
                    parser.plugin(`expression ${expressionName}`, function () {
                        this.state.current.addVariable(expressionName, JSON.stringify(fn(this.state.module)));
                        return true;
                    });
                }

                const context = compiler.context;
                if (localOptions.__filename === 'mock') {
                    setConstant('__filename', '/index.js');
                }
                else if (localOptions.__filename) {
                    setModuleConstant('__filename', module => path.relative(context, module.resource));
                }
                parser.plugin('evaluate Identifier __filename', function (expr: Identifier) {
                    if (!this.state.module) {
                        return;
                    }
                    const res = new BasicEvaluatedExpression();
                    const resource = this.state.module.resource;
                    const i = resource.indexOf('?');
                    res.setString(i < 0 ? resource : resource.substr(0, i));
                    res.setRange(expr.range);
                    return res;
                });
                if (localOptions.__dirname === 'mock') {
                    setConstant('__dirname', '/');
                }
                else if (localOptions.__dirname) {
                    setModuleConstant('__dirname', module => path.relative(context, module.context));
                }
                parser.plugin('evaluate Identifier __dirname', function (expr: Identifier) {
                    if (!this.state.module) {
                        return;
                    }
                    const res = new BasicEvaluatedExpression();
                    res.setString(this.state.module.context);
                    res.setRange(expr.range);
                    return res;
                });
                parser.plugin('expression require.main', function (expr: Expression) {
                    const dep = new ConstDependency('__webpack_require__.c[__webpack_require__.s]', expr.range);
                    dep.loc = expr.loc;
                    this.state.current.addDependency(dep);
                    return true;
                });
                parser.plugin('expression require.extensions', ParserHelpers.expressionIsUnsupported('require.extensions is not supported by webpack. Use a loader instead.'));
                parser.plugin('expression module.loaded', function (expr: Expression) {
                    const dep = new ConstDependency('module.l', expr.range);
                    dep.loc = expr.loc;
                    this.state.current.addDependency(dep);
                    return true;
                });
                parser.plugin('expression module.id', function (expr: Expression) {
                    const dep = new ConstDependency('module.i', expr.range);
                    dep.loc = expr.loc;
                    this.state.current.addDependency(dep);
                    return true;
                });
                parser.plugin('expression module.exports', function() {
                    const module = this.state.module;
                    const isHarmony = module.meta && module.meta.harmonyModule;
                    if(!isHarmony)
                        return true;
                });
                parser.plugin('evaluate Identifier module.hot', function (expr: Identifier) {
                    return new BasicEvaluatedExpression().setBoolean(false)
                        .setRange(expr.range)
                });
                parser.plugin('expression module', function () {
                    const module = this.state.module;
                    const isHarmony = module.meta && module.meta.harmonyModule;
                    let moduleJsPath = path.join(__dirname, '..', 'buildin', isHarmony ? 'harmony-module.js' : 'module.js');
                    if(module.context) {
                        moduleJsPath = path.relative(this.state.module.context, moduleJsPath);
                        if (!/^[A-Z]:/i.test(moduleJsPath)) {
                            moduleJsPath = `./${moduleJsPath.replace(/\\/g, '/')}`;
                        }
                    }
                    return ParserHelpers.addParsedVariableToModule(this, 'module', `require(${JSON.stringify(moduleJsPath)})(module)`);
                });
            });
        });
    }
}

export = NodeStuffPlugin;
