/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import { ConcatSource, Source } from 'webpack-sources'
import { Hash } from 'crypto'
import Template = require('../Template');
import HotUpdateChunkTemplate = require('../HotUpdateChunkTemplate')
import Module = require('../Module')

class WebWorkerHotUpdateChunkTemplatePlugin {
    apply(hotUpdateChunkTemplate: HotUpdateChunkTemplate) {
        hotUpdateChunkTemplate.plugin('render', function (
            modulesSource: Source,
            modules: Module[],
            removedModules: number[],
            hash: string,
            id: string
        ) {
            const chunkCallbackName = this.outputOptions.hotUpdateFunction || Template.toIdentifier(`webpackHotUpdate${this.outputOptions.library || ''}`);
            const source = new ConcatSource();
            source.add(`${chunkCallbackName}(${JSON.stringify(id)},`);
            source.add(modulesSource);
            source.add(')');
            return source;
        });
        hotUpdateChunkTemplate.plugin('hash', function (hash: Hash) {
            hash.update('WebWorkerHotUpdateChunkTemplatePlugin');
            hash.update('3');
            hash.update(`${this.outputOptions.hotUpdateFunction}`);
            hash.update(`${this.outputOptions.library}`);
        });
    }
}

export = WebWorkerHotUpdateChunkTemplatePlugin;
