/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import { ConcatSource, Source } from 'webpack-sources'
import { Hash } from 'crypto'
import Template = require('../Template');
import ChunkTemplate = require('../ChunkTemplate')
import Chunk = require('../Chunk')

class WebWorkerChunkTemplatePlugin {
    apply(chunkTemplate: ChunkTemplate) {
        // todo: rename Source
        chunkTemplate.plugin('render', function (modules: Source, chunk: Chunk) {
            const chunkCallbackName = this.outputOptions.chunkCallbackName || Template.toIdentifier(`webpackChunk${this.outputOptions.library || ''}`);
            const source = new ConcatSource();
            source.add(`${chunkCallbackName}(${JSON.stringify(chunk.ids)},`);
            source.add(modules);
            source.add(')');
            return source;
        });
        chunkTemplate.plugin('hash', function (hash: Hash) {
            hash.update('webworker');
            hash.update('3');
            hash.update(`${this.outputOptions.chunkCallbackName}`);
            hash.update(`${this.outputOptions.library}`);
        });
    }
}
export = WebWorkerChunkTemplatePlugin;
