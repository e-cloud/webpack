/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import async = require('async');
import PrefetchDependency = require('./dependencies/PrefetchDependency');
import NormalModule = require('./NormalModule');

class AutomaticPrefetchPlugin {
    apply(compiler) {
        compiler.plugin('compilation', (compilation, params) => {
            const normalModuleFactory = params.normalModuleFactory;

            compilation.dependencyFactories.set(PrefetchDependency, normalModuleFactory);
        });
        let lastModules = null;
        compiler.plugin('after-compile', (compilation, callback) => {
            lastModules = compilation.modules.filter(m => m instanceof NormalModule).map(m => ({
                context: m.context,
                request: m.request
            }));
            callback();
        });
        compiler.plugin('make', (compilation, callback) => {
            if (!lastModules) {
                return callback();
            }
            async.forEach(lastModules, (m, callback) => {
                compilation.prefetch(m.context || compiler.context, new PrefetchDependency(m.request), callback);
            }, callback);
        })
    }
}

export = AutomaticPrefetchPlugin;
