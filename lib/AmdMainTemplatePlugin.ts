/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import { ConcatSource } from 'webpack-sources'
import { Hash } from 'crypto'
import Compilation = require('./Compilation')
import Chunk = require('./Chunk')
import ExternalModule = require('./ExternalModule')

class AmdMainTemplatePlugin {
    constructor(public name: string) {
    }

    apply(compilation: Compilation) {
        const mainTemplate = compilation.mainTemplate;
        compilation.templatesPlugin('render-with-entry', (source: string, chunk: Chunk, hash: Hash) => {
            const externals = chunk.modules.filter((m: ExternalModule) => m.external);
            const externalsDepsArray = JSON.stringify(externals.map(
                // todo: typeof array is also object, may be error here
                (m: ExternalModule) => typeof m.request === 'object' ? m.request.amd : m.request)
            );
            const externalsArguments = externals
                .map(m => `__WEBPACK_EXTERNAL_MODULE_${m.id}__`)
                .join(', ');
            if (this.name) {
                const name = mainTemplate.applyPluginsWaterfall('asset-path', this.name, {
                    hash,
                    chunk
                });
                return new ConcatSource(`define(${JSON.stringify(name)}, ${externalsDepsArray}, function(${externalsArguments}) { return `, source, '});');
            }
            else if (externalsArguments) {
                return new ConcatSource(`define(${externalsDepsArray}, function(${externalsArguments}) { return `, source, '});');
            }
            else {
                return new ConcatSource('define(function() { return ', source, '});');
            }
        });
        mainTemplate.plugin('global-hash-paths', (paths: string[]) => {
            if (this.name) {
                paths.push(this.name);
            }
            return paths;
        });
        mainTemplate.plugin('hash', (hash: Hash) => {
            hash.update('exports amd');
            hash.update(`${this.name}`);
        });
    }
}

export = AmdMainTemplatePlugin;
