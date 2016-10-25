/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import { ConcatSource } from 'webpack-sources'

import Template = require('./Template');

class JsonpChunkTemplatePlugin {
    apply(chunkTemplate) {
        chunkTemplate.plugin('render', function (modules, chunk) {
            const jsonpFunction = this.outputOptions.jsonpFunction;
            const source = new ConcatSource();
            source.add(`${jsonpFunction}(${JSON.stringify(chunk.ids)},`);
            source.add(modules);
            const entries = [chunk.entryModule].filter(Boolean).map(function (m) {
                return m.id;
            });
            if (entries.length > 0) {
                source.add(`,${JSON.stringify(entries)}`);
            }
            source.add(')');
            return source;
        });
        chunkTemplate.plugin('hash', function (hash) {
            hash.update('JsonpChunkTemplatePlugin');
            hash.update('3');
            hash.update(`${this.outputOptions.jsonpFunction}`);
            hash.update(`${this.outputOptions.library}`);
        });
    }
}

export = JsonpChunkTemplatePlugin;
