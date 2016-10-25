/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
class NewWatchingPlugin {
    apply(compiler) {
        compiler.plugin('compilation', function (compilation) {
            compilation.warnings.push(new Error('The \'NewWatchingPlugin\' is no longer necessary (now default)'));
        });
    }
}

export = NewWatchingPlugin;
