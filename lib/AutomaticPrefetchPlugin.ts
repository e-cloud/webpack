/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import async = require('async');
import PrefetchDependency = require('./dependencies/PrefetchDependency');
import NormalModule = require('./NormalModule');
import Compiler = require('./Compiler')
import Compilation = require('./Compilation')
import { CompilationParams } from '../typings/webpack-types'

class AutomaticPrefetchPlugin {
    apply(compiler: Compiler) {
        compiler.plugin('compilation', function (compilation: Compilation, params: CompilationParams) {
            const normalModuleFactory = params.normalModuleFactory;

            compilation.dependencyFactories.set(PrefetchDependency, normalModuleFactory);
        });

        type LastModule = {
            context: string
            request: string
        }

        let lastModules: LastModule[] = null;
        compiler.plugin('after-compile', function (compilation: Compilation, callback) {
            lastModules = compilation.modules
                .filter(m => m instanceof NormalModule)
                .map((m: NormalModule) => ({
                    context: m.context,
                    request: m.request
                }));
            callback();
        });
        compiler.plugin('make', function (compilation: Compilation, callback) {
            if (!lastModules) {
                return callback();
            }
            async.each(lastModules, (m, callback) => {
                compilation.prefetch(m.context || compiler.context, new PrefetchDependency(m.request), callback);
            }, callback);
        })
    }
}

export = AutomaticPrefetchPlugin;
