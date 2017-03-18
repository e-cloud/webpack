/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import { Hash } from 'crypto'
import { ConcatSource } from 'webpack-sources'
import Compilation = require('./Compilation')
import Chunk = require('./Chunk')

class SetVarMainTemplatePlugin {
    constructor(public varExpression: string, public copyObject?: boolean) {
    }

    apply(compilation: Compilation) {
        const mainTemplate = compilation.mainTemplate;
        compilation.templatesPlugin('render-with-entry', (source: string, chunk: Chunk, hash: string) => {
            const varExpression = mainTemplate.applyPluginsWaterfall('asset-path', this.varExpression, {
                hash,
                chunk
            });
            if (this.copyObject) {
                return new ConcatSource(`(function(e, a) { for(var i in a) e[i] = a[i]; }(${varExpression}, `, source, '))');
            }
            else {
                const prefix = `${varExpression} =\n`;
                return new ConcatSource(prefix, source);
            }
        });
        mainTemplate.plugin('global-hash-paths', (paths: string[]) => {
            if (this.varExpression) {
                paths.push(this.varExpression);
            }
            return paths;
        });
        mainTemplate.plugin('hash', (hash: Hash) => {
            hash.update('set var');
            hash.update(`${this.varExpression}`);
            hash.update(`${this.copyObject}`);
        });
    }
}

export = SetVarMainTemplatePlugin;
