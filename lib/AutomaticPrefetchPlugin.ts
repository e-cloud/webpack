/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import async = require('async');

import PrefetchDependency = require('./dependencies/PrefetchDependency');
import NormalModule = require('./NormalModule');

class AutomaticPrefetchPlugin {
    apply(compiler) {
        compiler.plugin('compilation', function (compilation, params) {
            const normalModuleFactory = params.normalModuleFactory;

            compilation.dependencyFactories.set(PrefetchDependency, normalModuleFactory);
        });
        let lastModules = null;
        compiler.plugin('after-compile', function (compilation, callback) {
            lastModules = compilation.modules.filter(function (m) {
                return m instanceof NormalModule;
            }).map(function (m) {
                return {
                    context: m.context,
                    request: m.request
                };
            });
            callback();
        });
        compiler.plugin('make', function (compilation, callback) {
            if (!lastModules) {
                return callback();
            }
            async.forEach(lastModules, function (m, callback) {
                compilation.prefetch(m.context || compiler.context, new PrefetchDependency(m.request), callback);
            }, callback);
        });
    }
}

export = AutomaticPrefetchPlugin;
