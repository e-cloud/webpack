/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import { Hash } from 'crypto'
import { ConcatSource, Source } from 'webpack-sources'
import Chunk = require('../Chunk')
import ChunkTemplate = require('../ChunkTemplate')

class NodeChunkTemplatePlugin {
    apply(chunkTemplate: ChunkTemplate) {
        chunkTemplate.plugin('render', function (modules: Source, chunk: Chunk) {
            const source = new ConcatSource();
            source.add(`exports.ids = ${JSON.stringify(chunk.ids)};\nexports.modules = `);
            source.add(modules);
            source.add(';');
            return source;
        });
        chunkTemplate.plugin('hash', function (hash: Hash) {
            hash.update('node');
            hash.update('3');
        });
    }
}

export = NodeChunkTemplatePlugin;
