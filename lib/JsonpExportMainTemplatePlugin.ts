/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import { ConcatSource } from 'webpack-sources'
import Compilation = require('./Compilation')

class JsonpExportMainTemplatePlugin {
    constructor(public name: string) {
    }

    apply(compilation: Compilation) {
        const mainTemplate = compilation.mainTemplate;
        compilation.templatesPlugin('render-with-entry', (source, chunk, hash) => {
            const name = mainTemplate.applyPluginsWaterfall('asset-path', this.name || '', {
                hash,
                chunk
            });
            return new ConcatSource(`${name}(`, source, ');');
        });
        mainTemplate.plugin('global-hash-paths', paths => {
            if (this.name) {
                paths.push(this.name);
            }
            return paths;
        });
        mainTemplate.plugin('hash', hash => {
            hash.update('jsonp export');
            hash.update(`${this.name}`);
        });
    }
}

export = JsonpExportMainTemplatePlugin;
