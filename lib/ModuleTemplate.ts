/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import Template = require('./Template');
import RequestShortener = require('./RequestShortener')
import Module = require('./Module')
import Chunk = require('./Chunk')
import ArrayMap = require('./ArrayMap')
import { WebpackOutputOptions } from '../typings/webpack-types'
import { Hash } from 'crypto'

class ModuleTemplate extends Template {
    requestShortener: RequestShortener

    constructor(outputOptions: WebpackOutputOptions) {
        super(outputOptions);
    }

    render(module: Module, dependencyTemplates: ArrayMap, chunk: Chunk): string {
        let moduleSource = module.source(dependencyTemplates, this.outputOptions, this.requestShortener);
        moduleSource = this.applyPluginsWaterfall('module', moduleSource, module, chunk, dependencyTemplates);
        moduleSource = this.applyPluginsWaterfall('render', moduleSource, module, chunk, dependencyTemplates);
        return this.applyPluginsWaterfall('package', moduleSource, module, chunk, dependencyTemplates);
    }

    updateHash(hash: Hash) {
        hash.update('1');
        this.applyPlugins('hash', hash);
    }
}

export = ModuleTemplate;
