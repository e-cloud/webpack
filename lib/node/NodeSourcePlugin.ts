/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import nodeLibsBrowser = require('node-libs-browser');
import AliasPlugin = require('enhanced-resolve/lib/AliasPlugin');
import Compiler = require('../Compiler')
import Compilation = require('../Compilation')
import Parser = require('../Parser')
import { CompilationParams, NodeOption, ParserOptions } from '../../typings/webpack-types'
import ParserHelpers = require('../ParserHelpers');

class NodeSourcePlugin {
    constructor(public options: NodeOption) {
    }

    apply(compiler: Compiler) {
        const options = this.options;

        function getPathToModule(module: string, type: boolean | string) {
            if (type === true || type === undefined && nodeLibsBrowser[module]) {
                if (!nodeLibsBrowser[module]) {
                    throw new Error(`No browser version for node.js core module '${module}' available`);
                }
                return nodeLibsBrowser[module];
            }
            else if (type === 'mock') {
                return require.resolve(`node-libs-browser/mock/${module}`);
            }
            else if (type === 'empty') {
                return require.resolve('node-libs-browser/mock/empty');
            }
            else {
                return module;
            }
        }

        function addExpression(parser: Parser, name: string, module: string, type: string | boolean, suffix = '') {
            parser.plugin(`expression ${name}`, function () {
                if (this.state.module && this.state.module.resource === getPathToModule(module, type)) {
                    return;
                }
                const mockModule = ParserHelpers.requireFileAsExpression(this.state.module.context, getPathToModule(module, type));
                return ParserHelpers.addParsedVariableToModule(this, name, mockModule + suffix);
            });
        }

        compiler.plugin('compilation', function (compilation: Compilation, params: CompilationParams) {
            params.normalModuleFactory.plugin('parser', function (parser: Parser, parserOptions: ParserOptions) {
                if (parserOptions.node === false) {
                    return;
                }

                let localOptions = options;
                if (parserOptions.node) {
                    localOptions = Object.assign({}, localOptions, parserOptions.node);
                }

                if (localOptions.global) {
                    parser.plugin('expression global', function () {
                        const retrieveGlobalModule = ParserHelpers.requireFileAsExpression(this.state.module.context, require.resolve('../../buildin/global.js'));
                        return ParserHelpers.addParsedVariableToModule(this, 'global', retrieveGlobalModule);
                    });
                }

                if (localOptions.process) {
                    const processType = localOptions.process;
                    addExpression(parser, 'process', 'process', processType);
                }
                if (localOptions.console) {
                    const consoleType = localOptions.console;
                    addExpression(parser, 'console', 'console', consoleType);
                }
                const bufferType = localOptions.Buffer;
                if (bufferType) {
                    addExpression(parser, 'Buffer', 'buffer', bufferType, '.Buffer');
                }
                if (localOptions.setImmediate) {
                    const setImmediateType = localOptions.setImmediate;
                    addExpression(parser, 'setImmediate', 'timers', setImmediateType, '.setImmediate');
                    addExpression(parser, 'clearImmediate', 'timers', setImmediateType, '.clearImmediate');
                }
            });
        });
        compiler.plugin('after-resolvers', function (compiler: Compiler) {
            Object.keys(nodeLibsBrowser).forEach(lib => {
                if (options[lib] !== false) {
                    compiler.resolvers.normal.apply(new AliasPlugin('described-resolve', {
                        name: lib,
                        onlyModule: true,
                        alias: getPathToModule(lib, options[lib])
                    }, 'resolve'));
                }
            });
        });
    }
}

export = NodeSourcePlugin;
