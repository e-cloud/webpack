/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import path = require('path');

import async = require('async');

class FlagInitialModulesAsUsedPlugin {
    apply(compiler) {
        compiler.plugin('compilation', function (compilation) {
            compilation.plugin('after-optimize-chunks', function (chunks) {
                chunks.forEach(function (chunk) {
                    if (!chunk.isInitial()) {
                        return;
                    }
                    chunk.modules.forEach(function (module) {
                        module.usedExports = true;
                    });
                });
            });
        });
    }
}

export = FlagInitialModulesAsUsedPlugin;
