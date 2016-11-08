/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import Compiler = require('./Compiler')
import Compilation = require('./Compilation')

class NoErrorsPlugin {
    apply(compiler: Compiler) {
        compiler.plugin('should-emit', function (compilation: Compilation) {
            if (compilation.errors.length > 0) {
                return false;
            }
        });
        compiler.plugin('compilation', function (compilation: Compilation) {
            compilation.plugin('should-record', () => {
                if (compilation.errors.length > 0) {
                    return false;
                }
            });
        });
    }
}

export = NoErrorsPlugin;
