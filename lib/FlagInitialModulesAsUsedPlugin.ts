/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import path = require('path');
import async = require('async');

class FlagInitialModulesAsUsedPlugin {
    apply(compiler) {
        compiler.plugin('compilation', compilation => {
            compilation.plugin('after-optimize-chunks', chunks => {
                chunks.forEach(chunk => {
                    if (!chunk.isInitial()) {
                        return;
                    }
                    chunk.modules.forEach(module => {
                        module.usedExports = true;
                    });
                });
            });
        });
    }
}

export = FlagInitialModulesAsUsedPlugin;
