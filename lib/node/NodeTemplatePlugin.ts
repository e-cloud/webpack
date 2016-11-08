/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import NodeMainTemplatePlugin = require('./NodeMainTemplatePlugin');
import NodeChunkTemplatePlugin = require('./NodeChunkTemplatePlugin');
import NodeHotUpdateChunkTemplatePlugin = require('./NodeHotUpdateChunkTemplatePlugin');
import Compilation = require('../Compilation')
import Compiler = require('../Compiler')

class NodeTemplatePlugin {
    asyncChunkLoading: boolean

    constructor(
        options: {
            asyncChunkLoading: boolean
        } = {}
    ) {
        this.asyncChunkLoading = options.asyncChunkLoading;
    }

    apply(compiler: Compiler) {
        compiler.plugin('this-compilation', (compilation: Compilation) => {
            compilation.mainTemplate.apply(new NodeMainTemplatePlugin(this.asyncChunkLoading));
            compilation.chunkTemplate.apply(new NodeChunkTemplatePlugin());
            compilation.hotUpdateChunkTemplate.apply(new NodeHotUpdateChunkTemplatePlugin());
        });
    }
}

export = NodeTemplatePlugin;
