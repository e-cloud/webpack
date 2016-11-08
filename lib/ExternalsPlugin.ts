/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import ExternalModuleFactoryPlugin = require('./ExternalModuleFactoryPlugin');
import Compiler = require('./Compiler')

class ExternalsPlugin {
    constructor(public type: string, public externals: string[]) {
    }

    apply(compiler: Compiler) {
        compiler.plugin('compile', params => {
            params.normalModuleFactory.apply(new ExternalModuleFactoryPlugin(this.type, this.externals));
        });
    }
}

export = ExternalsPlugin;
