/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import { ConcatSource } from 'webpack-sources'

class SetVarMainTemplatePlugin {
    constructor(varExpression, copyObject) {
        this.varExpression = varExpression;
        this.copyObject = copyObject;
    }

    apply(compilation) {
        const mainTemplate = compilation.mainTemplate;
        compilation.templatesPlugin('render-with-entry', function (source, chunk, hash) {
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
        }.bind(this));
        mainTemplate.plugin('global-hash-paths', function (paths) {
            if (this.varExpression) {
                paths.push(this.varExpression);
            }
            return paths;
        });
        mainTemplate.plugin('hash', function (hash) {
            hash.update('set var');
            hash.update(`${this.varExpression}`);
            hash.update(`${this.copyObject}`);
        }.bind(this));
    }
}

export = SetVarMainTemplatePlugin;
