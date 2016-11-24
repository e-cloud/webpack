/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */

import Compiler = require('./Compiler')
import Compilation = require('./Compilation')

class FlagInitialModulesAsUsedPlugin {
    apply(compiler: Compiler) {
        compiler.plugin('compilation', function (compilation: Compilation) {
            compilation.plugin('after-optimize-chunks', function (chunks) {
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
