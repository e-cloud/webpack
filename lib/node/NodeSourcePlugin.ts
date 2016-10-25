/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import AliasPlugin = require('enhanced-resolve/lib/AliasPlugin');

import objectAssign = require('object-assign');
import ModuleParserHelpers = require('../ModuleParserHelpers');
import nodeLibsBrowser = require('node-libs-browser');

class NodeSourcePlugin {
    constructor(options) {
        this.options = options;
    }

    apply(compiler) {
        const options = this.options;

        function getPathToModule(module, type) {
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

        compiler.plugin('compilation', function (compilation, params) {
            params.normalModuleFactory.plugin('parser', function (parser, parserOptions) {

                if (parserOptions.node === false) {
                    return;
                }

                let localOptions = options;
                if (parserOptions.node) {
                    localOptions = objectAssign({}, localOptions, parserOptions.node);
                }

                if (localOptions.process) {
                    const processType = localOptions.process;
                    parser.plugin('expression process', function () {
                        return ModuleParserHelpers.addParsedVariable(this, 'process', `require(${JSON.stringify(getPathToModule('process', processType))})`);
                    });
                }
                if (localOptions.global) {
                    parser.plugin('expression global', function () {
                        return ModuleParserHelpers.addParsedVariable(this, 'global', `require(${JSON.stringify(require.resolve('../../buildin/global.js'))})`);
                    });
                }
                if (localOptions.console) {
                    const consoleType = localOptions.console;
                    parser.plugin('expression console', function () {
                        return ModuleParserHelpers.addParsedVariable(this, 'console', `require(${JSON.stringify(getPathToModule('console', consoleType))})`);
                    });
                }
                const bufferType = localOptions.Buffer;
                if (bufferType) {
                    parser.plugin('expression Buffer', function () {
                        return ModuleParserHelpers.addParsedVariable(this, 'Buffer', `require(${JSON.stringify(getPathToModule('buffer', bufferType))}).Buffer`);
                    });
                }
                if (localOptions.setImmediate) {
                    const setImmediateType = localOptions.setImmediate;
                    parser.plugin('expression setImmediate', function () {
                        return ModuleParserHelpers.addParsedVariable(this, 'setImmediate', `require(${JSON.stringify(getPathToModule('timers', setImmediateType))}).setImmediate`);
                    });
                    parser.plugin('expression clearImmediate', function () {
                        return ModuleParserHelpers.addParsedVariable(this, 'clearImmediate', `require(${JSON.stringify(getPathToModule('timers', setImmediateType))}).clearImmediate`);
                    });
                }
            });
        });
        compiler.plugin('after-resolvers', function (compiler) {
            const alias = {};
            Object.keys(nodeLibsBrowser).forEach(function (lib) {
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
