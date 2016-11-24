/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import { ConcatSource } from 'webpack-sources'
import HotUpdateChunkTemplate = require('./HotUpdateChunkTemplate')

class JsonpHotUpdateChunkTemplatePlugin {
    apply(hotUpdateChunkTemplate: HotUpdateChunkTemplate) {
        hotUpdateChunkTemplate.plugin('render', function (modulesSource, modules, removedModules, hash, id) {
            const jsonpFunction = this.outputOptions.hotUpdateFunction;
            const source = new ConcatSource();
            source.add(`${jsonpFunction}(${JSON.stringify(id)},`);
            source.add(modulesSource);
            source.add(')');
            return source;
        });
        hotUpdateChunkTemplate.plugin('hash', function (hash) {
            hash.update('JsonpHotUpdateChunkTemplatePlugin');
            hash.update('3');
            hash.update(`${this.outputOptions.hotUpdateFunction}`);
            hash.update(`${this.outputOptions.library}`);
        });
    }
}

export = JsonpHotUpdateChunkTemplatePlugin;
