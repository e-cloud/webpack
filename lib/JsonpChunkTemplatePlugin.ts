/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import { Hash } from 'crypto'
import { ConcatSource, Source } from 'webpack-sources'
import ChunkTemplate = require('./ChunkTemplate')
import Chunk = require('./Chunk')

class JsonpChunkTemplatePlugin {
    apply(chunkTemplate: ChunkTemplate) {
        chunkTemplate.plugin('render', function (moduleSource: Source, chunk: Chunk) {
            const jsonpFunction = this.outputOptions.jsonpFunction;
            const source = new ConcatSource();
            source.add(`${jsonpFunction}(${JSON.stringify(chunk.ids)},`);
            source.add(moduleSource);
            const entries = [chunk.entryModule].filter(Boolean).map(m => m.id);
            if (entries.length > 0) {
                source.add(`,${JSON.stringify(entries)}`);
            }
            source.add(')');
            return source;
        });
        chunkTemplate.plugin('hash', function (hash: Hash) {
            hash.update('JsonpChunkTemplatePlugin');
            hash.update('3');
            hash.update(`${this.outputOptions.jsonpFunction}`);
            hash.update(`${this.outputOptions.library}`);
        });
    }
}

export = JsonpChunkTemplatePlugin;
