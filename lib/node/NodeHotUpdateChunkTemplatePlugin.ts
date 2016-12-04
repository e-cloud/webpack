/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import { ConcatSource, Source } from 'webpack-sources'
import { Hash } from 'crypto'
import Module = require('../Module')
import HotUpdateChunkTemplate = require('../HotUpdateChunkTemplate')

class NodeHotUpdateChunkTemplatePlugin {
    apply(hotUpdateChunkTemplate: HotUpdateChunkTemplate) {
        hotUpdateChunkTemplate.plugin('render', function (
            modulesSource: Source,
            modules: Module[],
            removedModules: number[],
            hash: string,
            id: number
        ) {
            const source = new ConcatSource();
            source.add(`exports.id = ${JSON.stringify(id)};\nexports.modules = `);
            source.add(modulesSource);
            source.add(';');
            return source;
        });
        hotUpdateChunkTemplate.plugin('hash', function (hash: Hash) {
            hash.update('NodeHotUpdateChunkTemplatePlugin');
            hash.update('3');
            hash.update(`${this.outputOptions.hotUpdateFunction}`);
            hash.update(`${this.outputOptions.library}`);
        });
    }
}

export = NodeHotUpdateChunkTemplatePlugin;
