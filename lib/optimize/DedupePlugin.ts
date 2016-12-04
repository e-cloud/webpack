/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import Compiler = require('../Compiler')
import Compilation = require('../Compilation')

class DedupePlugin {
    apply(compiler: Compiler) {
        compiler.plugin('compilation', function (compilation: Compilation) {
            compilation.warnings.push(new Error('DedupePlugin: This plugin was removed from webpack. remove it from configuration.'));
        });
    }
}

export = DedupePlugin;
