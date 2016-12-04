/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import { ConcatSource, Source } from 'webpack-sources'
import { Hash } from 'crypto'
import HotUpdateChunkTemplate = require('./HotUpdateChunkTemplate')
import Module = require('./Module')

class JsonpHotUpdateChunkTemplatePlugin {
    apply(hotUpdateChunkTemplate: HotUpdateChunkTemplate) {
        hotUpdateChunkTemplate.plugin('render', function (
            modulesSource: Source, modules: Module[],
            removedModules: number[], hash: string, id: number
        ) {
            const jsonpFunction = this.outputOptions.hotUpdateFunction;
            const source = new ConcatSource();
            source.add(`${jsonpFunction}(${JSON.stringify(id)},`);
            source.add(modulesSource);
            source.add(')');
            return source;
        });
        hotUpdateChunkTemplate.plugin('hash', function (hash: Hash) {
            hash.update('JsonpHotUpdateChunkTemplatePlugin');
            hash.update('3');
            hash.update(`${this.outputOptions.hotUpdateFunction}`);
            hash.update(`${this.outputOptions.library}`);
        });
    }
}

export = JsonpHotUpdateChunkTemplatePlugin;
