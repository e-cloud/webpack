/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import FunctionModuleTemplatePlugin = require('./FunctionModuleTemplatePlugin');
import RequestShortener = require('./RequestShortener');
import Compiler = require('./Compiler')
import Compilation = require('./Compilation')

class FunctionModulePlugin {
    constructor(public options, public requestShortener?: RequestShortener) {
    }

    apply(compiler: Compiler) {
        compiler.plugin('compilation', (compilation: Compilation) => {
            compilation.moduleTemplate.requestShortener = this.requestShortener || new RequestShortener(compiler.context);
            compilation.moduleTemplate.apply(new FunctionModuleTemplatePlugin());
        });
    }
}

export = FunctionModulePlugin;
