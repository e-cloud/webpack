/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import { RawSource } from 'webpack-sources'
import ModuleFilenameHelpers = require('./ModuleFilenameHelpers');
import ModuleTemplate = require('./ModuleTemplate')

class EvalDevToolModuleTemplatePlugin {
    constructor(
        public sourceUrlComment = '\n//# sourceURL=[url]',
        public moduleFilenameTemplate = 'webpack:///[resourcePath]?[loaders]'
    ) {
    }

    apply(moduleTemplate: ModuleTemplate) {
        const self = this;
        moduleTemplate.plugin('module', function (source, module) {
            const content = source.source();
            const str = ModuleFilenameHelpers.createFilename(module, self.moduleFilenameTemplate, this.requestShortener);
            const footer = [
                '\n', ModuleFilenameHelpers.createFooter(module, this.requestShortener),
                self.sourceUrlComment.replace(
                    /\[url\]/g,
                    encodeURI(str)
                        .replace(/%2F/g, '/')
                        .replace(/%20/g, '_')
                        .replace(/%5E/g, '^')
                        .replace(/%5C/g, '\\')
                        .replace(/^\//, '')
                )
            ].join('\n');
            return new RawSource(`eval(${JSON.stringify(content + footer)});`);
        });
        moduleTemplate.plugin('hash', function (hash) {
            hash.update('EvalDevToolModuleTemplatePlugin');
            hash.update('2');
        });
    }
}

export = EvalDevToolModuleTemplatePlugin;
