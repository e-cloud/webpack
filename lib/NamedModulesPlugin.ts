/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import Compiler = require('./Compiler')
import Compilation = require('./Compilation')
import NormalModule = require('./NormalModule')

class NamedModulesPlugin {
    constructor(
        public options: {
            context: string
        } = {} as any
    ) {
    }

    apply(compiler: Compiler) {
        compiler.plugin('compilation', (compilation: Compilation) => {
            compilation.plugin('before-module-ids', modules => {
                modules.forEach((module: NormalModule) => {
                    if (module.id === null && module.libIdent) {
                        module.id = module.libIdent({
                            context: this.options.context || compiler.options.context
                        });
                    }
                });
            });
        });
    }
}

export = NamedModulesPlugin;
