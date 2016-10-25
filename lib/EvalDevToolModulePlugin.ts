/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import EvalDevToolModuleTemplatePlugin = require('./EvalDevToolModuleTemplatePlugin');

class EvalDevToolModulePlugin {
    constructor(sourceUrlComment, moduleFilenameTemplate) {
        this.sourceUrlComment = sourceUrlComment;
        this.moduleFilenameTemplate = moduleFilenameTemplate;
    }

    apply(compiler) {
        const self = this;
        compiler.plugin('compilation', function (compilation) {
            compilation.moduleTemplate.apply(new EvalDevToolModuleTemplatePlugin(self.sourceUrlComment, self.moduleFilenameTemplate));
        });
    }
}

export = EvalDevToolModulePlugin;
