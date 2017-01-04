/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import Template = require('./Template');
import { Hash } from 'crypto'
import { WebpackOutputOptions } from '../typings/webpack-types'
import Module = require('./Module')
import ModuleTemplate = require('./ModuleTemplate')
import Chunk = require('./Chunk')

class HotUpdateChunkTemplate extends Template {
    constructor(outputOptions: WebpackOutputOptions) {
        super(outputOptions);
    }

    render(
        id: number,
        modules: Module[],
        removedModules: number[],
        hash: string,
        moduleTemplate: ModuleTemplate,
        dependencyTemplates: Map<Function, any>
    ) {
        const modulesSource = this.renderChunkModules({
            id,
            modules,
            removedModules
        } as Chunk, moduleTemplate, dependencyTemplates);
        const core = this.applyPluginsWaterfall('modules', modulesSource, modules, removedModules, moduleTemplate, dependencyTemplates);
        const source = this.applyPluginsWaterfall('render', core, modules, removedModules, hash, id, moduleTemplate, dependencyTemplates);
        return source;
    }

    updateHash(hash: Hash) {
        hash.update('HotUpdateChunkTemplate');
        hash.update('1');
        this.applyPlugins('hash', hash);
    }
}

export = HotUpdateChunkTemplate;
