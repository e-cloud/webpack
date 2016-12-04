/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import PrefetchDependency = require('./dependencies/PrefetchDependency');
import Compiler = require('./Compiler')
import Compilation = require('./Compilation')
import { CompilationParams } from '../typings/webpack-types'

class PrefetchPlugin {
    request: string
    context: string

    constructor(context: string, request: string) {
        if (!request) {
            this.request = context;
        }
        else {
            this.context = context;
            this.request = request;
        }
    }

    apply(compiler: Compiler) {
        compiler.plugin('compilation', function (compilation: Compilation, params: CompilationParams) {
            const normalModuleFactory = params.normalModuleFactory;

            compilation.dependencyFactories.set(PrefetchDependency, normalModuleFactory);
        });
        compiler.plugin('make', (compilation: Compilation, callback) => {
            compilation.prefetch(this.context || compiler.context, new PrefetchDependency(this.request), callback);
        });
    }
}

export = PrefetchPlugin;
