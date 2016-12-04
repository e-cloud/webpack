/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import EvalDevToolModuleTemplatePlugin = require('./EvalDevToolModuleTemplatePlugin');
import Compiler = require('./Compiler')
import Compilation = require('./Compilation')
import { FilenameTemplate } from '../typings/webpack-types'

class EvalDevToolModulePlugin {
    constructor(public sourceUrlComment: string, public moduleFilenameTemplate: FilenameTemplate) {
    }

    apply(compiler: Compiler) {
        compiler.plugin('compilation', (compilation: Compilation) => {
            compilation.moduleTemplate.apply(new EvalDevToolModuleTemplatePlugin(this.sourceUrlComment, this.moduleFilenameTemplate));
        });
    }
}

export = EvalDevToolModulePlugin;
