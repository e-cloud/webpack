/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import NodeMainTemplatePlugin = require('./NodeMainTemplatePlugin');
import NodeChunkTemplatePlugin = require('./NodeChunkTemplatePlugin');
import NodeHotUpdateChunkTemplatePlugin = require('./NodeHotUpdateChunkTemplatePlugin');

class NodeTemplatePlugin {
    constructor(options = {}) {
        this.asyncChunkLoading = options.asyncChunkLoading;
    }

    apply(compiler) {
        compiler.plugin('this-compilation', compilation => {
            compilation.mainTemplate.apply(new NodeMainTemplatePlugin(this.asyncChunkLoading));
            compilation.chunkTemplate.apply(new NodeChunkTemplatePlugin());
            compilation.hotUpdateChunkTemplate.apply(new NodeHotUpdateChunkTemplatePlugin());
        });
    }
}

export = NodeTemplatePlugin;
