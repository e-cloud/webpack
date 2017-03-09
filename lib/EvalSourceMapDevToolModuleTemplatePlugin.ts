/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import { Hash } from 'crypto'
import { RawSourceMap } from 'source-map'
import { RawSource, Source } from 'webpack-sources'
import { FilenameTemplate } from '../typings/webpack-types'
import ModuleFilenameHelpers = require('./ModuleFilenameHelpers');
import Compilation = require('./Compilation');
import ModuleTemplate = require('./ModuleTemplate')
import Module = require('./Module')

class EvalSourceMapDevToolModuleTemplatePlugin {
    sourceMapComment: string
    moduleFilenameTemplate: FilenameTemplate

    constructor(public compilation: Compilation, public options: {
                    append: string | false
                    moduleFilenameTemplate: FilenameTemplate
                    sourceRoot?: string
                }) {
        this.sourceMapComment = options.append || '//# sourceMappingURL=[url]';
        this.moduleFilenameTemplate = options.moduleFilenameTemplate || 'webpack:///[resource-path]?[hash]';
    }

    apply(moduleTemplate: ModuleTemplate) {
        const self = this;
        const options = this.options;
        moduleTemplate.plugin('module', function (source: Source, module: Module) {
            if (source.__EvalSourceMapDevToolData) {
                return source.__EvalSourceMapDevToolData;
            }
            let sourceMap: RawSourceMap;
            let content;
            if (source.sourceAndMap) {
                const sourceAndMap = source.sourceAndMap(options);
                sourceMap = sourceAndMap.map;
                content = sourceAndMap.source;
            }
            else {
                sourceMap = source.map(options);
                content = source.source();
            }
            if (!sourceMap) {
                return source;
            }

            // Clone (flat) the sourcemap to ensure that the mutations below do not persist.
            sourceMap = Object.keys(sourceMap)
                .reduce((obj, key) => {
                    obj[key] = sourceMap[key];
                    return obj;
                }, {}) as RawSourceMap;
            const modules = sourceMap.sources.map(source => {
                const module = self.compilation.findModule(source);
                return module || source;
            });
            let moduleFilenames = modules.map((module) => {
                return ModuleFilenameHelpers.createFilename(module, self.moduleFilenameTemplate, this.requestShortener);
            });
            moduleFilenames = ModuleFilenameHelpers.replaceDuplicates(moduleFilenames, (filename, i, n) => {
                for (let j = 0; j < n; j++) {
                    filename += '*'
                }
                return filename;
            });
            sourceMap.sources = moduleFilenames;
            if (sourceMap.sourcesContent) {
                sourceMap.sourcesContent = sourceMap.sourcesContent.map((content, i) => {
                    return `${content}\n\n\n${ModuleFilenameHelpers.createFooter(modules[i], this.requestShortener)}`;
                });
            }
            sourceMap.sourceRoot = options.sourceRoot || '';
            sourceMap.file = `${module.id}.js`;
            const footer = self.sourceMapComment.replace(/\[url\]/g, `data:application/json;charset=utf-8;base64,${new Buffer(JSON.stringify(sourceMap), 'utf8').toString('base64')}`);
            source.__EvalSourceMapDevToolData = new RawSource(`eval(${JSON.stringify(content + footer)});`);
            return source.__EvalSourceMapDevToolData;
        });
        moduleTemplate.plugin('hash', function (hash: Hash) {
            hash.update('eval-source-map');
            hash.update('1');
        });
    }
}

export = EvalSourceMapDevToolModuleTemplatePlugin;
