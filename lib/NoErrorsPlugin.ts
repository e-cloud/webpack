/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import Compiler = require('./Compiler')
import Compilation = require('./Compilation')

let deprecationReported = false;

class NoErrorsPlugin {
    apply(compiler: Compiler) {
        compiler.plugin('should-emit', function (compilation: Compilation) {
            if (!deprecationReported) {
                compilation.warnings.push(new Error('webpack: Using NoErrorsPlugin is deprecated.\nUse NoEmitOnErrorsPlugin instead.\n'));
                deprecationReported = true;
            }
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
