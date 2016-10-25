/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import path = require('path');

import assign = require('object-assign');
import Tapable = require('tapable');
import Compilation = require('./Compilation');
import Resolver = require('enhanced-resolve/lib/Resolver');
import NormalModuleFactory = require('./NormalModuleFactory');
import ContextModuleFactory = require('./ContextModuleFactory');

class Watching {
    constructor(compiler, watchOptions, handler) {
        this.startTime = null;
        this.invalid = false;
        this.error = null;
        this.stats = null;
        this.handler = handler;
        if (typeof watchOptions === 'number') {
            this.watchOptions = {
                aggregateTimeout: watchOptions
            };
        }
        else if (watchOptions && typeof watchOptions === 'object') {
            this.watchOptions = assign({}, watchOptions);
        }
        else {
            this.watchOptions = {};
        }
        this.watchOptions.aggregateTimeout = this.watchOptions.aggregateTimeout || 200;
        this.compiler = compiler;
        this.running = true;
        this.compiler.readRecords(function (err) {
            if (err) {
                return this._done(err);
            }

            this._go();
        }.bind(this));
    }

    _go() {
        const self = this;
        self.startTime = new Date().getTime();
        self.running = true;
        self.invalid = false;
        self.compiler.applyPluginsAsync('watch-run', self, function (err) {
            if (err) {
                return self._done(err);
            }
            self.compiler.compile(function onCompiled(err, compilation) {
                if (err) {
                    return self._done(err);
                }
                if (self.invalid) {
                    return self._done();
                }

                if (self.compiler.applyPluginsBailResult('should-emit', compilation) === false) {
                    return self._done(null, compilation);
                }

                self.compiler.emitAssets(compilation, function (err) {
                    if (err) {
                        return self._done(err);
                    }
                    if (self.invalid) {
                        return self._done();
                    }

                    self.compiler.emitRecords(function (err) {
                        if (err) {
                            return self._done(err);
                        }

                        if (compilation.applyPluginsBailResult('need-additional-pass')) {
                            compilation.needAdditionalPass = true;

                            const stats = compilation.getStats();
                            stats.startTime = self.startTime;
                            stats.endTime = new Date().getTime();
                            self.compiler.applyPlugins('done', stats);

                            self.compiler.applyPluginsAsync('additional-pass', function (err) {
                                if (err) {
                                    return self._done(err);
                                }
                                self.compiler.compile(onCompiled);
                            });
                            return;
                        }
                        return self._done(null, compilation);
                    });
                });
            });
        });
    }

    _done(err, compilation) {
        this.running = false;
        if (this.invalid) {
            return this._go();
        }
        this.error = err || null;
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
        if (!this.error) {
            this.watch(compilation.fileDependencies, compilation.contextDependencies, compilation.missingDependencies);
        }
    }

    watch(files, dirs, missing) {
        this.watcher = this.compiler.watchFileSystem.watch(files, dirs, missing, this.startTime, this.watchOptions, function (
            err,
            filesModified,
            contextModified,
            missingModified,
            fileTimestamps,
            contextTimestamps
        ) {
            this.watcher = null;
            if (err) {
                return this.handler(err);
            }

            this.compiler.fileTimestamps = fileTimestamps;
            this.compiler.contextTimestamps = contextTimestamps;
            this.invalidate();
        }.bind(this), function (fileName, changeTime) {
            this.compiler.applyPlugins('invalid', fileName, changeTime);
        }.bind(this));
    }

    invalidate() {
        if (this.watcher) {
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

    close(callback) {
        if (callback === undefined) {
            callback = function () {
            };
        }

        if (this.watcher) {
            this.watcher.close();
            this.watcher = null;
        }
        if (this.running) {
            this.invalid = true;
            this._done = function () {
                callback();
            };
        }
        else {
            callback();
        }
    }
}

class Compiler extends Tapable {
    constructor() {
        super();

        this.outputPath = '';
        this.outputFileSystem = null;
        this.inputFileSystem = null;

        this.recordsInputPath = null;
        this.recordsOutputPath = null;
        this.records = {};

        this.fileTimestamps = {};
        this.contextTimestamps = {};

        this.resolvers = {
            normal: new Resolver(null),
            loader: new Resolver(null),
            context: new Resolver(null)
        };
        let deprecationReported = false;
        this.parser = {
            plugin: function (hook, fn) {
                if (!deprecationReported) {
                    console.warn(`webpack: Using compiler.parser is deprecated.\nUse compiler.plugin("compilation", function(compilation, data) {\n  data.normalModuleFactory.plugin("parser", function(parser, options) { parser.plugin(/* ... */); });\n}); instead. It was called ${new Error().stack.split('\n')[2].trim()}.`);
                    deprecationReported = true;
                }
                this.plugin('compilation', function (compilation, data) {
                    data.normalModuleFactory.plugin('parser', function (parser) {
                        parser.plugin(hook, fn);
                    });
                });
            }.bind(this),
            apply: function () {
                const args = arguments;
                if (!deprecationReported) {
                    console.warn(`webpack: Using compiler.parser is deprecated.\nUse compiler.plugin("compilation", function(compilation, data) {\n  data.normalModuleFactory.plugin("parser", function(parser, options) { parser.apply(/* ... */); });\n}); instead. It was called ${new Error().stack.split('\n')[2].trim()}.`);
                    deprecationReported = true;
                }
                this.plugin('compilation', function (compilation, data) {
                    data.normalModuleFactory.plugin('parser', function (parser) {
                        parser.apply(...args);
                    });
                });
            }.bind(this)
        };

        this.options = {};
    }

    watch(watchOptions, handler) {
        this.fileTimestamps = {};
        this.contextTimestamps = {};
        const watching = new Watching(this, watchOptions, handler);
        return watching;
    }

    run(callback) {
        const self = this;
        const startTime = new Date().getTime();

        self.applyPluginsAsync('before-run', self, function (err) {
            if (err) {
                return callback(err);
            }

            self.applyPluginsAsync('run', self, function (err) {
                if (err) {
                    return callback(err);
                }

                self.readRecords(function (err) {
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

                        self.emitAssets(compilation, function (err) {
                            if (err) {
                                return callback(err);
                            }

                            if (compilation.applyPluginsBailResult('need-additional-pass')) {
                                compilation.needAdditionalPass = true;

                                const stats = compilation.getStats();
                                stats.startTime = startTime;
                                stats.endTime = new Date().getTime();
                                self.applyPlugins('done', stats);

                                self.applyPluginsAsync('additional-pass', function (err) {
                                    if (err) {
                                        return callback(err);
                                    }
                                    self.compile(onCompiled);
                                });
                                return;
                            }

                            self.emitRecords(function (err) {
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

    runAsChild(callback) {
        this.compile(function (err, compilation) {
            if (err) {
                return callback(err);
            }

            this.parentCompilation.children.push(compilation);
            Object.keys(compilation.assets).forEach(function (name) {
                this.parentCompilation.assets[name] = compilation.assets[name];
            }.bind(this));

            const entries = Object.keys(compilation.entrypoints).map(function (name) {
                return compilation.entrypoints[name].chunks;
            }).reduce(function (array, chunks) {
                return array.concat(chunks);
            }, []);

            return callback(null, entries, compilation);
        }.bind(this));
    }

    purgeInputFileSystem() {
        if (this.inputFileSystem && this.inputFileSystem.purge) {
            this.inputFileSystem.purge();
        }
    }

    emitAssets(compilation, callback) {
        let outputPath;

        this.applyPluginsAsync('emit', compilation, function (err) {
            if (err) {
                return callback(err);
            }
            outputPath = compilation.getPath(this.outputPath);
            this.outputFileSystem.mkdirp(outputPath, emitFiles.bind(this));
        }.bind(this));

        function emitFiles(err) {
            if (err) {
                return callback(err);
            }

            require('async').forEach(Object.keys(compilation.assets), function (file, callback) {

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

                function writeOut(err) {
                    if (err) {
                        return callback(err);
                    }
                    const targetPath = this.outputFileSystem.join(outputPath, targetFile);
                    const source = compilation.assets[file];
                    if (source.existsAt === targetPath) {
                        source.emitted = false;
                        return callback();
                    }
                    let content = source.source();
                    if (!Buffer.isBuffer(content)) {
                        content = new Buffer(content, 'utf-8');
                    }
                    source.existsAt = targetPath;
                    source.emitted = true;
                    this.outputFileSystem.writeFile(targetPath, content, callback);
                }
            }.bind(this), function (err) {
                if (err) {
                    return callback(err);
                }

                afterEmit.call(this);
            }.bind(this));
        }

        function afterEmit() {
            this.applyPluginsAsync('after-emit', compilation, function (err) {
                if (err) {
                    return callback(err);
                }

                return callback();
            });
        }
    }

    emitRecords(callback) {
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
        this.outputFileSystem.mkdirp(recordsOutputPathDirectory, function (err) {
            if (err) {
                return callback(err);
            }
            writeFile.call(this);
        }.bind(this));

        function writeFile() {
            this.outputFileSystem.writeFile(this.recordsOutputPath, JSON.stringify(this.records, undefined, 2), callback);
        }
    }

    readRecords(callback) {
        const self = this;
        if (!self.recordsInputPath) {
            self.records = {};
            return callback();
        }
        self.inputFileSystem.stat(self.recordsInputPath, function (err) {
            // It doesn't exist
            // We can ignore self.
            if (err) {
                return callback();
            }

            self.inputFileSystem.readFile(self.recordsInputPath, function (err, content) {
                if (err) {
                    return callback(err);
                }

                try {
                    self.records = JSON.parse(content);
                } catch (e) {
                    e.message = `Cannot parse records: ${e.message}`;
                    return callback(e);
                }

                return callback();
            });
        });
    }

    createChildCompiler(compilation, compilerName, outputOptions) {
        const childCompiler = new Compiler();
        for (var name in this._plugins) {
            if (![
                    'make', 'compile', 'emit', 'after-emit', 'invalid', 'done',
                    'this-compilation'
                ].includes(name)) {
                childCompiler._plugins[name] = this._plugins[name].slice();
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
        this.records[compilerName].push(childCompiler.records = {});
        childCompiler.options = Object.create(this.options);
        childCompiler.options.output = Object.create(childCompiler.options.output);
        for (name in outputOptions) {
            childCompiler.options.output[name] = outputOptions[name];
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

    newCompilation(params) {
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
        const normalModuleFactory = new NormalModuleFactory(this.options.context, this.resolvers, this.options.module || {});
        this.applyPlugins('normal-module-factory', normalModuleFactory);
        return normalModuleFactory;
    }

    createContextModuleFactory() {
        const contextModuleFactory = new ContextModuleFactory(this.resolvers, this.inputFileSystem);
        this.applyPlugins('context-module-factory', contextModuleFactory);
        return contextModuleFactory;
    }

    newCompilationParams() {
        const params = {
            normalModuleFactory: this.createNormalModuleFactory(),
            contextModuleFactory: this.createContextModuleFactory(),
            compilationDependencies: []
        };
        return params;
    }

    compile(callback) {
        const self = this;
        const params = self.newCompilationParams();
        self.applyPluginsAsync('before-compile', params, function (err) {
            if (err) {
                return callback(err);
            }

            self.applyPlugins('compile', params);

            const compilation = self.newCompilation(params);

            self.applyPluginsParallel('make', compilation, function (err) {
                if (err) {
                    return callback(err);
                }

                compilation.finish();

                compilation.seal(function (err) {
                    if (err) {
                        return callback(err);
                    }

                    self.applyPluginsAsync('after-compile', compilation, function (err) {
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

export = Compiler;

Compiler.Watching = Watching;
