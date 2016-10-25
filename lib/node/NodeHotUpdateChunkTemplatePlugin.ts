/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import { ConcatSource } from 'webpack-sources'

class NodeHotUpdateChunkTemplatePlugin {
    apply(hotUpdateChunkTemplate) {
        hotUpdateChunkTemplate.plugin('render', function (modulesSource, modules, removedModules, hash, id) {
            const source = new ConcatSource();
            source.add(`exports.id = ${JSON.stringify(id)};\nexports.modules = `);
            source.add(modulesSource);
            source.add(';');
            return source;
        });
        hotUpdateChunkTemplate.plugin('hash', function (hash) {
            hash.update('NodeHotUpdateChunkTemplatePlugin');
            hash.update('3');
            hash.update(`${this.outputOptions.hotUpdateFunction}`);
            hash.update(`${this.outputOptions.library}`);
        });
    }
}

export = NodeHotUpdateChunkTemplatePlugin;
