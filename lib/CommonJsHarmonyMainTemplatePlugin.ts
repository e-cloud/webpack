/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import { ConcatSource } from 'webpack-sources'
import Compilation = require('./Compilation')

class CommonJsHarmonyMainTemplatePlugin {
    apply(compilation: Compilation) {
        const mainTemplate = compilation.mainTemplate;
        compilation.templatesPlugin('render-with-entry', (source, chunk, hash) => {
            const prefix = 'module.exports =\n';
            const postfix = '\nObject.defineProperty(module.exports, "__esModule", { value: true });';
            return new ConcatSource(prefix, source, postfix);
        });
        mainTemplate.plugin('hash', function (hash) {
            hash.update('commonjs harmony');
        });
    }
}

export = CommonJsHarmonyMainTemplatePlugin;
