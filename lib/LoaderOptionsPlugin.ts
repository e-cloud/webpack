/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import ModuleFilenameHelpers = require('./ModuleFilenameHelpers');
import Compiler = require('./Compiler')
import Compilation = require('./Compilation')
import NormalModule = require('./NormalModule')
import { LoaderContext } from '../typings/webpack-types'

class LoaderOptionsPlugin {
    options: LoaderOptionsPlugin.Option

    constructor(options: LoaderOptionsPlugin.Option) {
        if (typeof options !== 'object') {
            options = {};
        }
        if (!options.test) {
            // seems like act as a RegExp
            options.test = {
                test() {
                    return true;
                }
            } as any;
        }
        this.options = options;
    }

    apply(compiler: Compiler) {
        const options = this.options;
        const filterSet = new Set(['include', 'exclude', 'test']);

        compiler.plugin('compilation', function (compilation: Compilation) {
            compilation.plugin('normal-module-loader', function (context: LoaderContext, module: NormalModule) {
                const resource = module.resource;
                if (!resource) {
                    return;
                }
                const i = resource.indexOf('?');
                if (ModuleFilenameHelpers.matchObject(options, i < 0 ? resource : resource.substr(0, i))) {
                    Object.keys(options)
                        .filter((key) => !filterSet.has(key))
                        .forEach((key) => context[key] = options[key]);
                }
            });
        });
    }
}

declare namespace LoaderOptionsPlugin {
    interface Option {
        test?: RegExp
        [name: string]: any
    }
}

export = LoaderOptionsPlugin;
