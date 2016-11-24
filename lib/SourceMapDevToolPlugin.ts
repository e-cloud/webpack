/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import { ConcatSource, RawSource } from 'webpack-sources'
import path = require('path');
import RequestShortener = require('./RequestShortener');
import ModuleFilenameHelpers = require('./ModuleFilenameHelpers');
import SourceMapDevToolModuleOptionsPlugin = require('./SourceMapDevToolModuleOptionsPlugin');
import Compiler = require('./Compiler')
import Compilation = require('./Compilation')

class SourceMapDevToolPlugin {
    sourceMapFilename: string
    sourceMappingURLComment: string | boolean
    moduleFilenameTemplate: string
    fallbackModuleFilenameTemplate: string
    options: {
        module: boolean
        lineToLine: boolean
        filename: string
        append: string | boolean
        moduleFilenameTemplate: string
        fallbackModuleFilenameTemplate: string
        test: string | RegExp
        noSources: boolean
        sourceRoot: string
    }

    constructor(options) {
        if (arguments.length > 1) {
            throw new Error('SourceMapDevToolPlugin only takes one argument (pass an options object)');
        }
        if (typeof options === 'string') {
            options = {
                sourceMapFilename: options
            };
        }
        if (!options) {
            options = {};
        }
        this.sourceMapFilename = options.filename;
        this.sourceMappingURLComment = options.append === false
            ? false
            : options.append || '\n//# sourceMappingURL=[url]';
        this.moduleFilenameTemplate = options.moduleFilenameTemplate || 'webpack:///[resourcePath]';
        this.fallbackModuleFilenameTemplate = options.fallbackModuleFilenameTemplate || 'webpack:///[resourcePath]?[hash]';
        this.options = options;
    }

    apply(compiler: Compiler) {
        const sourceMapFilename = this.sourceMapFilename;
        const sourceMappingURLComment = this.sourceMappingURLComment;
        const moduleFilenameTemplate = this.moduleFilenameTemplate;
        const fallbackModuleFilenameTemplate = this.fallbackModuleFilenameTemplate;
        const requestShortener = new RequestShortener(compiler.context);
        const options = this.options;
        options.test = options.test || /\.(js|css)($|\?)/i;
        compiler.plugin('compilation', function (compilation: Compilation) {
            new SourceMapDevToolModuleOptionsPlugin(options).apply(compilation);
            compilation.plugin('after-optimize-chunk-assets', function (chunks) {
                let allModules = [];
                let allModuleFilenames = [];
                const tasks = [];
                chunks.forEach(function (chunk) {
                    chunk.files.filter(ModuleFilenameHelpers.matchObject.bind(undefined, options)).map(function (file) {
                        const asset = this.assets[file];
                        if (asset.__SourceMapDevToolData) {
                            const data = asset.__SourceMapDevToolData;
                            for (const cachedFile in data) {
                                this.assets[cachedFile] = data[cachedFile];
                                if (cachedFile !== file) {
                                    chunk.files.push(cachedFile);
                                }
                            }
                            return;
                        }
                        let source;
                        let sourceMap;
                        if (asset.sourceAndMap) {
                            const sourceAndMap = asset.sourceAndMap(options);
                            sourceMap = sourceAndMap.map;
                            source = sourceAndMap.source;
                        }
                        else {
                            sourceMap = asset.map(options);
                            source = asset.source();
                        }
                        if (sourceMap) {
                            return {
                                chunk,
                                file,
                                asset,
                                source,
                                sourceMap
                            };
                        }
                    }, this).filter(Boolean).map(task => {
                        const modules = task.sourceMap.sources.map(source => {
                            const module = compilation.findModule(source);
                            return module || source;
                        });
                        const moduleFilenames = modules.map(
                            module => ModuleFilenameHelpers.createFilename(module, moduleFilenameTemplate, requestShortener));
                        task.modules = modules;
                        task.moduleFilenames = moduleFilenames;
                        return task;
                    }, this).forEach(task => {
                        allModules = allModules.concat(task.modules);
                        allModuleFilenames = allModuleFilenames.concat(task.moduleFilenames);
                        tasks.push(task);
                    }, this);
                }, this);
                allModuleFilenames = ModuleFilenameHelpers.replaceDuplicates(
                    allModuleFilenames,
                    (filename, i) =>
                        ModuleFilenameHelpers.createFilename(allModules[i], fallbackModuleFilenameTemplate, requestShortener),
                    (ai, bi) => {
                        let a = allModules[ai];
                        let b = allModules[bi];
                        a = !a ? '' : typeof a === 'string' ? a : a.identifier();
                        b = !b ? '' : typeof b === 'string' ? b : b.identifier();
                        return a.length - b.length;
                    });
                allModuleFilenames = ModuleFilenameHelpers.replaceDuplicates(allModuleFilenames, (filename, i, n) => {
                    for (let j = 0; j < n; j++) {
                        filename += '*'
                    }
                    return filename;
                });
                tasks.forEach(task => {
                    task.moduleFilenames = allModuleFilenames.slice(0, task.moduleFilenames.length);
                    allModuleFilenames = allModuleFilenames.slice(task.moduleFilenames.length);
                }, this);
                tasks.forEach(function (task) {
                    const chunk = task.chunk;
                    const file = task.file;
                    const asset = task.asset;
                    const sourceMap = task.sourceMap;
                    const source = task.source;
                    const moduleFilenames = task.moduleFilenames;
                    const modules = task.modules;
                    sourceMap.sources = moduleFilenames;
                    if (sourceMap.sourcesContent && !options.noSources) {
                        sourceMap.sourcesContent = sourceMap.sourcesContent.map((
                            content,
                            i
                        ) => `${content}\n\n\n${ModuleFilenameHelpers.createFooter(modules[i], requestShortener)}`);
                    }
                    else {
                        sourceMap.sourcesContent = undefined;
                    }
                    sourceMap.sourceRoot = options.sourceRoot || '';
                    sourceMap.file = file;
                    asset.__SourceMapDevToolData = {};
                    let currentSourceMappingURLComment = sourceMappingURLComment;
                    if (currentSourceMappingURLComment !== false && /\.css($|\?)/i.test(file)) {
                        currentSourceMappingURLComment = (currentSourceMappingURLComment as string).replace(/^\n\/\/(.*)$/, '\n/*$1*/');
                    }
                    if (sourceMapFilename) {
                        let filename = file;
                        let query = '';
                        const idx = filename.indexOf('?');
                        if (idx >= 0) {
                            query = filename.substr(idx);
                            filename = filename.substr(0, idx);
                        }
                        const sourceMapFile = this.getPath(sourceMapFilename, {
                            chunk,
                            filename,
                            query,
                            basename: basename(filename)
                        });
                        const sourceMapUrl = path.relative(path.dirname(file), sourceMapFile).replace(/\\/g, '/');
                        if (currentSourceMappingURLComment !== false) {
                            asset.__SourceMapDevToolData[file] = this.assets[file] = new ConcatSource(new RawSource(source), (currentSourceMappingURLComment as string).replace(/\[url\]/g, sourceMapUrl));
                        }
                        asset.__SourceMapDevToolData[sourceMapFile] = this.assets[sourceMapFile] = new RawSource(JSON.stringify(sourceMap));
                        chunk.files.push(sourceMapFile);
                    }
                    else {
                        asset.__SourceMapDevToolData[file] = this.assets[file] = new ConcatSource(new RawSource(source), (currentSourceMappingURLComment as string).replace(/\[map\]/g, () => JSON.stringify(sourceMap))
                            .replace(/\[url\]/g, () => `data:application/json;charset=utf-8;base64,${new Buffer(JSON.stringify(sourceMap)).toString('base64')}`));
                    }
                }, this);
            });
        });
    }
}

export = SourceMapDevToolPlugin;

function basename(name) {
    if (!name.includes('/')) {
        return name;
    }
    return name.substr(name.lastIndexOf('/') + 1);
}
