/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import WebWorkerMainTemplatePlugin = require('./WebWorkerMainTemplatePlugin');
import WebWorkerChunkTemplatePlugin = require('./WebWorkerChunkTemplatePlugin');
import WebWorkerHotUpdateChunkTemplatePlugin = require('./WebWorkerHotUpdateChunkTemplatePlugin');
import Compiler = require('../Compiler')
import Compilation = require('../Compilation')

class WebWorkerTemplatePlugin {
    apply(compiler: Compiler) {
        compiler.plugin(
            'this-compilation', (compilation: Compilation) => {
                compilation.mainTemplate.apply(new WebWorkerMainTemplatePlugin());
                compilation.chunkTemplate.apply(new WebWorkerChunkTemplatePlugin());
                compilation.hotUpdateChunkTemplate.apply(new WebWorkerHotUpdateChunkTemplatePlugin());
            }
        );
    }
}

export = WebWorkerTemplatePlugin;
