/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import { ConcatSource } from 'webpack-sources'
import { Hash } from 'crypto'
import Compilation = require('./Compilation')
import Chunk = require('./Chunk')

class JsonpExportMainTemplatePlugin {
    constructor(public name: string) {
    }

    apply(compilation: Compilation) {
        const mainTemplate = compilation.mainTemplate;
        compilation.templatesPlugin('render-with-entry', (source: string, chunk: Chunk, hash: string) => {
            const name = mainTemplate.applyPluginsWaterfall('asset-path', this.name || '', {
                hash,
                chunk
            });
            return new ConcatSource(`${name}(`, source, ');');
        });
        mainTemplate.plugin('global-hash-paths', (paths: string[]) => {
            if (this.name) {
                paths.push(this.name);
            }
            return paths;
        });
        mainTemplate.plugin('hash', (hash: Hash) => {
            hash.update('jsonp export');
            hash.update(`${this.name}`);
        });
    }
}

export = JsonpExportMainTemplatePlugin;
