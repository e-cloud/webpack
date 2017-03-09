/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import RequireContextDependency = require('./RequireContextDependency');
import ContextElementDependency = require('./ContextElementDependency');
import RequireContextDependencyParserPlugin = require('./RequireContextDependencyParserPlugin');
import Compiler = require('../Compiler')
import Compilation = require('../Compilation')
import Parser = require('../Parser')
import { AlternativeModule, CompilationParams, ParserOptions } from '../../typings/webpack-types'

class RequireContextPlugin {
    constructor(public modulesDirectories: string[], public extensions: string[]) {
        if (!Array.isArray(modulesDirectories)) {
            throw new Error('modulesDirectories must be an array');
        }
        if (!Array.isArray(extensions)) {
            throw new Error('extensions must be an array');
        }
    }

    apply(compiler: Compiler) {
        const modulesDirectories = this.modulesDirectories;
        const extensions = this.extensions;
        compiler.plugin('compilation', function (compilation: Compilation, params: CompilationParams) {
            const contextModuleFactory = params.contextModuleFactory;
            const normalModuleFactory = params.normalModuleFactory;

            compilation.dependencyFactories.set(RequireContextDependency, contextModuleFactory);
            compilation.dependencyTemplates.set(RequireContextDependency, new RequireContextDependency.Template());

            compilation.dependencyFactories.set(ContextElementDependency, normalModuleFactory);

            params.normalModuleFactory.plugin('parser', function (parser: Parser, parserOptions: ParserOptions) {

                if (typeof parserOptions.requireContext !== 'undefined' && !parserOptions.requireContext) {
                    return;
                }

                parser.apply(new RequireContextDependencyParserPlugin());
            });

            params.contextModuleFactory.plugin('alternatives', function (items: AlternativeModule[], callback) {
                if (items.length === 0) {
                    return callback(null, items);
                }

                callback(null,
                    items.map(obj =>
                            extensions.filter(ext => {
                                    const l = obj.request.length;
                                    return l > ext.length && obj.request.substr(l - ext.length, l) === ext;
                                })
                                .map(ext => {
                                    const l = obj.request.length;
                                    return {
                                        context: obj.context,
                                        request: obj.request.substr(0, l - ext.length)
                                    };
                                })
                                .concat(obj))
                        .reduce((a, b) => a.concat(b), [])
                );
            });

            params.contextModuleFactory.plugin('alternatives', function (items: AlternativeModule[], callback) {
                if (items.length === 0) {
                    return callback(null, items);
                }

                callback(null, items.map(function (obj) {
                    for (let i = 0; i < modulesDirectories.length; i++) {
                        const dir = modulesDirectories[i];
                        const idx = obj.request.indexOf(`./${dir}/`);
                        if (idx === 0) {
                            obj.request = obj.request.slice(dir.length + 3);
                            break;
                        }
                    }
                    return obj;
                }));
            });
        });
    }
}

export = RequireContextPlugin;
