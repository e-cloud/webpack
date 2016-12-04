/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import ExternalModuleFactoryPlugin = require('./ExternalModuleFactoryPlugin');
import Compiler = require('./Compiler')
import { CompilationParams, ExternalsElement } from '../typings/webpack-types'

class ExternalsPlugin {
    constructor(public type: string, public externals: ExternalsElement) {
    }

    apply(compiler: Compiler) {
        compiler.plugin('compile', (params: CompilationParams) => {
            params.normalModuleFactory.apply(new ExternalModuleFactoryPlugin(this.type, this.externals));
        });
    }
}

export = ExternalsPlugin;
