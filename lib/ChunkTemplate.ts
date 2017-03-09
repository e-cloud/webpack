/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import { Hash } from 'crypto'
import { ConcatSource } from 'webpack-sources'
import { WebpackOutputOptions } from '../typings/webpack-types'
import Template = require('./Template');
import Chunk = require('./Chunk')
import ModuleTemplate = require('./ModuleTemplate')

class ChunkTemplate extends Template {
    constructor(outputOptions: WebpackOutputOptions) {
        super(outputOptions);
    }

    render(chunk: Chunk, moduleTemplate: ModuleTemplate, dependencyTemplates: Map<Function, any>) {
        // todo: modules should be rename, coz it isn't modules but ConcatSource
        const modules = this.renderChunkModules(chunk, moduleTemplate, dependencyTemplates);
        const core = this.applyPluginsWaterfall('modules', modules, chunk, moduleTemplate, dependencyTemplates);
        let source = this.applyPluginsWaterfall('render', core, chunk, moduleTemplate, dependencyTemplates);
        if (chunk.hasEntryModule()) {
            source = this.applyPluginsWaterfall('render-with-entry', source, chunk);
        }
        chunk.rendered = true;
        return new ConcatSource(source, ';');
    }

    updateHash(hash: Hash) {
        hash.update('ChunkTemplate');
        hash.update('2');
        this.applyPlugins('hash', hash);
    }

    updateHashForChunk(hash: Hash, chunk?: Chunk) {
        this.updateHash(hash);
        this.applyPlugins('hash-for-chunk', hash, chunk);
    }
}

export = ChunkTemplate;
