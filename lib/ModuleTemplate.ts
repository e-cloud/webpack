/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import Template = require('./Template');
import RequestShortener = require('./RequestShortener')
import Module = require('./Module')
import Chunk = require('./Chunk')
import { Hash } from 'crypto'
import { WebpackOutputOptions } from '../typings/webpack-types'

class ModuleTemplate extends Template {
    requestShortener: RequestShortener

    constructor(outputOptions: WebpackOutputOptions) {
        super(outputOptions);
    }

    render(module: Module, dependencyTemplates: Map<Function, any>, chunk: Chunk): string {
        const moduleSource = module.source(dependencyTemplates, this.outputOptions, this.requestShortener);
        const moduleSourcePostModule = this.applyPluginsWaterfall('module', moduleSource, module, chunk, dependencyTemplates);
        const moduleSourcePostRender = this.applyPluginsWaterfall('render', moduleSourcePostModule, module, chunk, dependencyTemplates);
        return this.applyPluginsWaterfall('package', moduleSourcePostRender, module, chunk, dependencyTemplates);
    }

    updateHash(hash: Hash) {
        hash.update('1');
        this.applyPlugins('hash', hash);
    }
}

export = ModuleTemplate;
