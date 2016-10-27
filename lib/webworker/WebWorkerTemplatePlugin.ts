/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import WebWorkerMainTemplatePlugin = require('./WebWorkerMainTemplatePlugin');
import WebWorkerChunkTemplatePlugin = require('./WebWorkerChunkTemplatePlugin');
import WebWorkerHotUpdateChunkTemplatePlugin = require('./WebWorkerHotUpdateChunkTemplatePlugin');

class WebWorkerTemplatePlugin {
    apply(compiler) {
        compiler.plugin(
            'this-compilation', compilation => {
                compilation.mainTemplate.apply(new WebWorkerMainTemplatePlugin());
                compilation.chunkTemplate.apply(new WebWorkerChunkTemplatePlugin());
                compilation.hotUpdateChunkTemplate.apply(new WebWorkerHotUpdateChunkTemplatePlugin());
            }
        );
    }
}

export = WebWorkerTemplatePlugin;
