/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import path = require('path');
import Resolver = require('enhanced-resolve/lib/Resolver');
import Tapable = require('tapable');
import Compilation = require('./Compilation');
import NormalModuleFactory = require('./NormalModuleFactory');
import ContextModuleFactory = require('./ContextModuleFactory');
import { AbstractInputFileSystem } from 'enhanced-resolve/lib/common-types'
import {
    AbstractStats,
    CompilationParams,
    ErrCallback,
    Record,
    TimeStampMap,
    WatchCallback,
    Watcher,
    WatchFileSystem,
    WatchOptions,
    WebpackOptions,
    WebpackOutputOptions
} from '../typings/webpack-types'
import Stats = require('./Stats')
import NodeOutputFileSystem = require('./node/NodeOutputFileSystem')

class Watching {
    closed: boolean
    error: Error
    handler: WatchCallback<Stats>
    invalid: boolean
    pausedWatcher: Watcher
    running: boolean
    startTime: number
    stats: Stats
    watcher: Watcher
    watchOptions: WatchOptions

    constructor(public compiler: Compiler, watchOptions: WatchOptions, handler: WatchCallback<Stats>) {
        this.startTime = null;
        this.invalid = false;
        this.error = null;
        this.stats = null;
        this.handler = handler;
        this.closed = false;
        if (typeof watchOptions === 'number') {
            this.watchOptions = {
                aggregateTimeout: watchOptions
            } as any;
        }
        else if (watchOptions && typeof watchOptions === 'object') {
            this.watchOptions = Object.assign({}, watchOptions);
        }
        else {
            this.watchOptions = {} as WatchOptions;
        }
        this.watchOptions.aggregateTimeout = this.watchOptions.aggregateTimeout || 200;
        this.running = true;
        this.compiler.readRecords((err: Error) => {
            if (err) {
                return this._done(err);
            }

            this._go();
        });
    }

    _go() {
        this.startTime = new Date().getTime();
        this.running = true;
        this.invalid = false;
        this.compiler.applyPluginsAsync('watch-run', this, (err: Error) => {
            if (err) {
                return this._done(err);
            }

            const onCompiled = (err: Error, compilation: Compilation) => {
                if (err) {
                    return this._done(err);
                }
                if (this.invalid) {
                    return this._done();
                }

                if (this.compiler.applyPluginsBailResult('should-emit', compilation) === false) {
                    return this._done(null, compilation);
                }

                this.compiler.emitAssets(compilation, err => {
                    if (err) {
                        return this._done(err);
                    }
                    if (this.invalid) {
                        return this._done();
                    }

                    this.compiler.emitRecords(err => {
                        if (err) {
                            return this._done(err);
                        }

                        if (compilation.applyPluginsBailResult('need-additional-pass')) {
                            compilation.needAdditionalPass = true;

                            const stats = compilation.getStats();
                            stats.startTime = this.startTime;
                            stats.endTime = new Date().getTime();
                            this.compiler.applyPlugins('done', stats);

                            this.compiler.applyPluginsAsync('additional-pass', (err: Error) => {
                                if (err) {
                                    return this._done(err);
                                }
                                this.compiler.compile(onCompiled);
                            });
                            return;
                        }
                        return this._done(null, compilation);
                    });
                });
            }

            this.compiler.compile(onCompiled);
        });
    }

    _done(err: Error = null, compilation?: Compilation) {
        this.running = false;
        if (this.invalid) {
            return this._go();
        }
        this.error = err;
        this.stats = compilation ? compilation.getStats() : null;
        if (this.stats) {
            this.stats.startTime = this.startTime;
            this.stats.endTime = new Date().getTime();
        }
        if (this.stats) {
            this.compiler.applyPlugins('done', this.stats);
        }
        else {
            this.compiler.applyPlugins('failed', this.error);
        }
        this.handler(this.error, this.stats);
        if (!this.error && !this.closed) {
            this.watch(compilation.fileDependencies, compilation.contextDependencies, compilation.missingDependencies);
        }
    }

    watch(files: string[], dirs: string[], missing: string[]) {
        this.pausedWatcher = null;
        this.watcher = this.compiler.watchFileSystem.watch(
            files,
            dirs,
            missing,
            this.startTime,
            this.watchOptions,
            (err: Error, filesModified: string[], contextModified: string[], missingModified: string[],
             fileTimestamps: TimeStampMap, contextTimestamps: TimeStampMap
            ) => {
                this.pausedWatcher = this.watcher;
                this.watcher = null;
                if (err) {
                    return this.handler(err);
                }

                this.compiler.fileTimestamps = fileTimestamps;
                this.compiler.contextTimestamps = contextTimestamps;
                this.invalidate();
            },
            (fileName: string, changeTime: number) => {
                this.compiler.applyPlugins('invalid', fileName, changeTime);
            }
        );
    }

    invalidate() {
        if (this.watcher) {
            this.pausedWatcher = this.watcher;
            this.watcher.pause();
            this.watcher = null;
        }
        if (this.running) {
            this.invalid = true;
            return false;
        }
        else {
            this._go();
        }
    }

    close(callback: ErrCallback) {
        if (callback === undefined) {
            callback = () => {
            };
        }

        this.closed = true;
        if (this.watcher) {
            this.watcher.close();
            this.watcher = null;
        }
        if (this.pausedWatcher) {
            this.pausedWatcher.close();
            this.pausedWatcher = null;
        }
        if (this.running) {
            this.invalid = true;
            this._done = () => {
                this.compiler.applyPlugins('watch-close');
                callback();
            };
        } else {
            this.compiler.applyPlugins('watch-close');
            callback();
        }
    }
}

class Compiler extends Tapable {
    _lastCompilationContextDependencies: string[]
    _lastCompilationFileDependencies: string[]
    compilers?: Compiler[]
    context: string
    contextTimestamps: TimeStampMap
    dependencies: string[]
    fileTimestamps: TimeStampMap
    inputFileSystem: AbstractInputFileSystem
    name: string
    options: WebpackOptions
    outputFileSystem: NodeOutputFileSystem
    outputPath: string
    parentCompilation: Compilation
    parser: any
    records: Record
    recordsInputPath: string
    recordsOutputPath: string
    watchFileSystem: WatchFileSystem
    resolvers: Compiler.Resolvers

    constructor() {
        super();

        this.outputPath = '';
        this.outputFileSystem = null;
        this.inputFileSystem = null;

        this.recordsInputPath = null;
        this.recordsOutputPath = null;
        this.records = {} as Record;

        this.fileTimestamps = {};
        this.contextTimestamps = {};

        this.resolvers = {
            normal: null,
            loader: null,
            context: null
        };
        let deprecationReported = false;
        this.parser = {
            plugin: (hook: any, fn: any) => {
                if (!deprecationReported) {
                    console.warn(`webpack: Using compiler.parser is deprecated.\nUse compiler.plugin("compilation", function(compilation, data) {\n  data.normalModuleFactory.plugin("parser", function(parser, options) { parser.plugin(/* ... */); });\n}); instead. It was called ${new Error().stack.split('\n')[2].trim()}.`);
                    deprecationReported = true;
                }
                this.plugin('compilation', function (compilation: Compilation, params: CompilationParams) {
                    params.normalModuleFactory.plugin('parser', function (parser) {
                        parser.plugin(hook, fn);
                    });
                });
            },
            apply: (...args: any[]) => {
                if (!deprecationReported) {
                    console.warn(`webpack: Using compiler.parser is deprecated.\nUse compiler.plugin("compilation", function(compilation, data) {\n  data.normalModuleFactory.plugin("parser", function(parser, options) { parser.apply(/* ... */); });\n}); instead. It was called ${new Error().stack.split('\n')[2].trim()}.`);
                    deprecationReported = true;
                }
                this.plugin('compilation', function (compilation: Compilation, params: CompilationParams) {
                    params.normalModuleFactory.plugin('parser', function (parser) {
                        parser.apply(args);
                    });
                });
            }
        };

        this.options = {} as any;
    }

    static Watching = Watching

    watch(watchOptions: WatchOptions, handler: WatchCallback<AbstractStats>) {
        this.fileTimestamps = {};
        this.contextTimestamps = {};
        return new Watching(this, watchOptions, handler);
    }

    run(callback: WatchCallback<AbstractStats>) {
        const self = this;
        const startTime = new Date().getTime();

        self.applyPluginsAsync('before-run', self, (err: Error) => {
            if (err) {
                return callback(err);
            }

            self.applyPluginsAsync('run', self, (err: Error) => {
                if (err) {
                    return callback(err);
                }

                self.readRecords(err => {
                    if (err) {
                        return callback(err);
                    }

                    self.compile(function onCompiled(err, compilation) {
                        if (err) {
                            return callback(err);
                        }

                        if (self.applyPluginsBailResult('should-emit', compilation) === false) {
                            const stats = compilation.getStats();
                            stats.startTime = startTime;
                            stats.endTime = new Date().getTime();
                            self.applyPlugins('done', stats);
                            return callback(null, stats);
                        }

                        self.emitAssets(compilation, err => {
                            if (err) {
                                return callback(err);
                            }

                            if (compilation.applyPluginsBailResult('need-additional-pass')) {
                                compilation.needAdditionalPass = true;

                                const stats = compilation.getStats();
                                stats.startTime = startTime;
                                stats.endTime = new Date().getTime();
                                self.applyPlugins('done', stats);

                                self.applyPluginsAsync('additional-pass', (err: Error) => {
                                    if (err) {
                                        return callback(err);
                                    }
                                    self.compile(onCompiled);
                                });
                                return;
                            }

                            self.emitRecords(err => {
                                if (err) {
                                    return callback(err);
                                }

                                const stats = compilation.getStats();
                                stats.startTime = startTime;
                                stats.endTime = new Date().getTime();
                                self.applyPlugins('done', stats);
                                return callback(null, stats);
                            });
                        });
                    });
                });
            });
        });
    }

    runAsChild(callback: ErrCallback) {
        this.compile((err, compilation) => {
            if (err) {
                return callback(err);
            }

            this.parentCompilation.children.push(compilation);
            Object.keys(compilation.assets).forEach(name => {
                this.parentCompilation.assets[name] = compilation.assets[name];
            });

            const entries = Object.keys(compilation.entrypoints)
                .map(name => compilation.entrypoints[name].chunks)
                .reduce((array, chunks) => array.concat(chunks), []);

            return callback(null, entries, compilation);
        });
    }

    purgeInputFileSystem() {
        if (this.inputFileSystem && this.inputFileSystem.purge) {
            this.inputFileSystem.purge();
        }
    }

    emitAssets(compilation: Compilation, callback: (err?: Error) => any) {
        let outputPath: string;

        this.applyPluginsAsync('emit', compilation, (err: Error) => {
            if (err) {
                return callback(err);
            }
            outputPath = compilation.getPath(this.outputPath);
            this.outputFileSystem.mkdirp(outputPath, emitFiles.bind(this));
        });

        function emitFiles(this: Compiler, err: Error) {
            if (err) {
                return callback(err);
            }

            require('async').forEach(Object.keys(compilation.assets), (file: string, callback: ErrCallback) => {

                let targetFile = file;
                const queryStringIdx = targetFile.indexOf('?');
                if (queryStringIdx >= 0) {
                    targetFile = targetFile.substr(0, queryStringIdx);
                }

                if (targetFile.match(/\/|\\/)) {
                    const dir = path.dirname(targetFile);
                    this.outputFileSystem.mkdirp(this.outputFileSystem.join(outputPath, dir), writeOut.bind(this));
                }
                else {
                    writeOut.call(this);
                }

                function writeOut(this: Compiler, err: Error) {
                    if (err) {
                        return callback(err);
                    }
                    const targetPath = this.outputFileSystem.join(outputPath, targetFile);
                    const source = compilation.assets[file];
                    if (source.existsAt === targetPath) {
                        source.emitted = false;
                        return callback();
                    }
                    let content: string | Buffer = source.source();
                    if (!Buffer.isBuffer(content)) {
                        content = new Buffer(content as string, 'utf8');
                    }
                    source.existsAt = targetPath;
                    source.emitted = true;
                    this.outputFileSystem.writeFile(targetPath, content, callback);
                }
            }, (err: Error) => {
                if (err) {
                    return callback(err);
                }

                afterEmit.call(this);
            });
        }

        function afterEmit(this: Compiler) {
            this.applyPluginsAsyncSeries1('after-emit', compilation, (err: Error) => {
                if (err) {
                    return callback(err);
                }

                return callback();
            });
        }
    }

    emitRecords(callback: ErrCallback) {
        if (!this.recordsOutputPath) {
            return callback();
        }
        const idx1 = this.recordsOutputPath.lastIndexOf('/');
        const idx2 = this.recordsOutputPath.lastIndexOf('\\');
        let recordsOutputPathDirectory = null;
        if (idx1 > idx2) {
            recordsOutputPathDirectory = this.recordsOutputPath.substr(0, idx1);
        }
        if (idx1 < idx2) {
            recordsOutputPathDirectory = this.recordsOutputPath.substr(0, idx2);
        }
        if (!recordsOutputPathDirectory) {
            return writeFile.call(this);
        }
        this.outputFileSystem.mkdirp(recordsOutputPathDirectory, (err: Error) => {
            if (err) {
                return callback(err);
            }
            writeFile.call(this);
        });

        function writeFile(this: Compiler) {
            this.outputFileSystem.writeFile(this.recordsOutputPath, JSON.stringify(this.records, undefined, 2), callback);
        }
    }

    readRecords(callback: ErrCallback) {
        const self = this;
        if (!self.recordsInputPath) {
            self.records = {} as Record;
            return callback();
        }
        self.inputFileSystem.stat(self.recordsInputPath, (err: Error) => {
            // It doesn't exist
            // We can ignore self.
            if (err) {
                return callback();
            }

            self.inputFileSystem.readFile(self.recordsInputPath, (err: Error, content: Buffer) => {
                if (err) {
                    return callback(err);
                }

                try {
                    self.records = JSON.parse(content.toString('utf8'));
                } catch (e) {
                    e.message = `Cannot parse records: ${e.message}`;
                    return callback(e);
                }

                return callback();
            });
        });
    }

    createChildCompiler(
        compilation: Compilation,
        compilerName: string,
        outputOptions: WebpackOutputOptions,
        plugins?: Tapable.Plugin[]
    ) {
        const childCompiler = new Compiler();

        if (Array.isArray(plugins)) {
            plugins.forEach(plugin => childCompiler.apply(plugin));
        }

        for (const pluginName in this._plugins) {
            if (![
                    'make', 'compile', 'emit', 'after-emit', 'invalid', 'done', 'this-compilation'
                ].includes(pluginName)) {
                childCompiler._plugins[pluginName] = this._plugins[pluginName].slice();
            }
        }

        childCompiler.name = compilerName;
        childCompiler.outputPath = this.outputPath;
        childCompiler.inputFileSystem = this.inputFileSystem;
        childCompiler.outputFileSystem = null;
        childCompiler.resolvers = this.resolvers;
        childCompiler.fileTimestamps = this.fileTimestamps;
        childCompiler.contextTimestamps = this.contextTimestamps;

        if (!this.records[compilerName]) {
            this.records[compilerName] = [];
        }

        this.records[compilerName].push(childCompiler.records = {} as Record);
        childCompiler.options = Object.create(this.options);
        childCompiler.options.output = Object.create(childCompiler.options.output);

        for (const optionName in outputOptions) {
            childCompiler.options.output[optionName] = outputOptions[optionName];
        }

        childCompiler.parentCompilation = compilation;

        return childCompiler;
    }

    isChild() {
        return !!this.parentCompilation;
    }

    createCompilation() {
        return new Compilation(this);
    }

    newCompilation(params: CompilationParams) {
        const compilation = this.createCompilation();
        compilation.fileTimestamps = this.fileTimestamps;
        compilation.contextTimestamps = this.contextTimestamps;
        compilation.name = this.name;
        compilation.records = this.records;
        compilation.compilationDependencies = params.compilationDependencies;
        this.applyPlugins('this-compilation', compilation, params);
        this.applyPlugins('compilation', compilation, params);
        return compilation;
    }

    createNormalModuleFactory() {
        const normalModuleFactory = new NormalModuleFactory(this.options.context, this.resolvers, this.options.module || {} as any);
        this.applyPlugins('normal-module-factory', normalModuleFactory);
        return normalModuleFactory;
    }

    createContextModuleFactory() {
        const contextModuleFactory = new ContextModuleFactory(this.resolvers);
        this.applyPlugins('context-module-factory', contextModuleFactory);
        return contextModuleFactory;
    }

    newCompilationParams(): CompilationParams {
        return {
            normalModuleFactory: this.createNormalModuleFactory(),
            contextModuleFactory: this.createContextModuleFactory(),
            compilationDependencies: []
        };
    }

    compile(callback: ErrCallback) {
        const self = this;
        const params = self.newCompilationParams();
        self.applyPluginsAsync('before-compile', params, (err?: Error) => {
            if (err) {
                return callback(err);
            }

            self.applyPlugins('compile', params);

            const compilation = self.newCompilation(params);

            self.applyPluginsParallel('make', compilation, (err: Error) => {
                if (err) {
                    return callback(err);
                }

                compilation.finish();

                compilation.seal((err: Error) => {
                    if (err) {
                        return callback(err);
                    }

                    self.applyPluginsAsync('after-compile', compilation, (err: Error) => {
                        if (err) {
                            return callback(err);
                        }

                        return callback(null, compilation);
                    });
                });
            });
        });
    }
}

declare namespace Compiler {
    interface Resolvers {
        normal: Resolver
        context: Resolver
        loader: Resolver
    }
}

export = Compiler;
