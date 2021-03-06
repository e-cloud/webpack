/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import EvalSourceMapDevToolModuleTemplatePlugin = require('./EvalSourceMapDevToolModuleTemplatePlugin');
import SourceMapDevToolModuleOptionsPlugin = require('./SourceMapDevToolModuleOptionsPlugin');
import Compiler = require('./Compiler')
import Compilation = require('./Compilation')
import SourceMapDevToolPlugin = require('./SourceMapDevToolPlugin')

class EvalSourceMapDevToolPlugin {
    options: SourceMapDevToolPlugin.Option

    constructor(options: string | SourceMapDevToolPlugin.Option) {
        if (arguments.length > 1) {
            throw new Error('EvalSourceMapDevToolPlugin only takes one argument (pass an options object)');
        }
        if (typeof options === 'string') {
            options = {
                append: options
            } as any;
        }
        if (!options) {
            options = {} as any;
        }
        this.options = options as any;
    }

    apply(compiler: Compiler) {
        const options = this.options;
        compiler.plugin('compilation', function (compilation: Compilation) {
            new SourceMapDevToolModuleOptionsPlugin(options).apply(compilation);
            compilation.moduleTemplate.apply(new EvalSourceMapDevToolModuleTemplatePlugin(compilation, options));
        });
    }
}

export = EvalSourceMapDevToolPlugin;
