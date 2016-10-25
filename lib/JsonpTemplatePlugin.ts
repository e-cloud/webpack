/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import JsonpMainTemplatePlugin = require('./JsonpMainTemplatePlugin');

import JsonpChunkTemplatePlugin = require('./JsonpChunkTemplatePlugin');
import JsonpHotUpdateChunkTemplatePlugin = require('./JsonpHotUpdateChunkTemplatePlugin');

class JsonpTemplatePlugin {
    apply(compiler) {
        compiler.plugin('this-compilation', function (compilation) {
            compilation.mainTemplate.apply(new JsonpMainTemplatePlugin());
            compilation.chunkTemplate.apply(new JsonpChunkTemplatePlugin());
            compilation.hotUpdateChunkTemplate.apply(new JsonpHotUpdateChunkTemplatePlugin());
        });
    }
}

export = JsonpTemplatePlugin;
