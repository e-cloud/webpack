/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import Compiler = require('./Compiler')
import Compilation = require('./Compilation')

class NewWatchingPlugin {
    apply(compiler: Compiler) {
        compiler.plugin('compilation', function (compilation: Compilation) {
            compilation.warnings.push(new Error('The \'NewWatchingPlugin\' is no longer necessary (now default)'));
        });
    }
}

export = NewWatchingPlugin;
