/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import Compiler = require('./Compiler')
import Compilation = require('./Compilation')

class MovedToPluginWarningPlugin {
    constructor(public optionName, public pluginName) {
    }

    apply(compiler: Compiler) {
        const optionName = this.optionName;
        const pluginName = this.pluginName;
        compiler.plugin('compilation', function (compilation: Compilation) {
            compilation.warnings.push(new Error(`webpack options:
DEPRECATED option '${optionName}' will be moved to the ${pluginName}. Use this instead.
For more info about the usage of the ${pluginName} see https://webpack.github.io/docs/list-of-plugins.html`));
        });
    }
}

export = MovedToPluginWarningPlugin;
