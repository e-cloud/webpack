/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import Template = require('./Template');
import RequestShortener = require('./RequestShortener')
import Module = require('./Module')
import Chunk = require('./Chunk')

class ModuleTemplate extends Template {
    requestShortener: RequestShortener

    constructor(outputOptions) {
        super(outputOptions);
    }

    render(module: Module, dependencyTemplates, chunk: Chunk) {
        let moduleSource = module.source(dependencyTemplates, this.outputOptions, this.requestShortener);
        moduleSource = this.applyPluginsWaterfall('module', moduleSource, module, chunk, dependencyTemplates);
        moduleSource = this.applyPluginsWaterfall('render', moduleSource, module, chunk, dependencyTemplates);
        return this.applyPluginsWaterfall('package', moduleSource, module, chunk, dependencyTemplates);
    }

    updateHash(hash) {
        hash.update('1');
        this.applyPlugins('hash', hash);
    }
}

export = ModuleTemplate;
