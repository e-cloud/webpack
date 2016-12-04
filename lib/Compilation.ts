/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import { CachedSource, Source, SourceMapSource, RawSource, ConcatSource } from 'webpack-sources'
import { SourceLocation } from 'estree'
import {
    WebpackOutputOptions,
    Record,
    WebpackOptions,
    AggressiveSplit,
    ErrCallback,
    PlainObject,
    TimeStampMap,
    WebpackError, AbstractInputFileSystem
} from '../typings/webpack-types'
import { ResolveError } from 'enhanced-resolve/lib/common-types'
import async = require('async');
import crypto = require('crypto')
import Tapable = require('tapable');
import Compiler = require('./Compiler')
import EntryModuleNotFoundError = require('./EntryModuleNotFoundError');
import ModuleNotFoundError = require('./ModuleNotFoundError');
import ModuleDependencyWarning = require('./ModuleDependencyWarning');
import Module = require('./Module');
import ArrayMap = require('./ArrayMap');
import Chunk = require('./Chunk');
import Entrypoint = require('./Entrypoint');
import Stats = require('./Stats');
import MainTemplate = require('./MainTemplate');
import ChunkTemplate = require('./ChunkTemplate');
import HotUpdateChunkTemplate = require('./HotUpdateChunkTemplate');
import ModuleTemplate = require('./ModuleTemplate');
import Dependency = require('./Dependency');
import ChunkRenderError = require('./ChunkRenderError');
import NormalModule = require('./NormalModule')
import DependenciesBlock = require('./DependenciesBlock')
import AsyncDependenciesBlock = require('./AsyncDependenciesBlock')
import * as Resolve from 'enhanced-resolve'

interface SlotChunk {
    name: string
    module: Module
}

class Compilation extends Tapable {
    _modules: Dictionary<Module>
    _aggressiveSplittingSplits: AggressiveSplit[]
    additionalChunkAssets: string[]
    assets: Dictionary<Compilation.Asset>
    bail: boolean
    cache: PlainObject
    children: Compilation[]
    chunks: Chunk[]
    chunkTemplate: ChunkTemplate
    compilationDependencies: string[]
    compiler: Compiler
    contextDependencies: string[]
    contextTimestamps: TimeStampMap
    dependencyFactories: ArrayMap
    dependencyTemplates: ArrayMap
    entries: Module[];
    entrypoints: Dictionary<Entrypoint>
    errors: WebpackError[]
    fileDependencies: string[]
    fileTimestamps: TimeStampMap
    fullHash: string
    hash: string
    hotUpdateChunkTemplate: HotUpdateChunkTemplate
    inputFileSystem: AbstractInputFileSystem
    mainTemplate: MainTemplate
    missingDependencies: string[]
    modules: Module[]
    moduleTemplate: ModuleTemplate
    name: string
    namedChunks: Dictionary<Chunk>
    needAdditionalPass: boolean
    nextFreeChunkId: number
    nextFreeModuleIndex2: number
    nextFreeModuleIndex: number
    notCacheable: string
    options: WebpackOptions
    outputOptions: WebpackOutputOptions
    preparedChunks: SlotChunk[]
    profile: boolean
    records: Record
    resolvers: Compiler.Resolvers
    usedModuleIds: Dictionary<number>
    usedChunkIds: Dictionary<number>
    warnings: WebpackError[]

    constructor(compiler: Compiler) {
        super();
        this.compiler = compiler;
        this.resolvers = compiler.resolvers;
        this.inputFileSystem = compiler.inputFileSystem;

        const options = this.options = compiler.options;
        this.outputOptions = options && options.output;
        this.bail = options && options.bail;
        this.profile = options && options.profile;

        this.mainTemplate = new MainTemplate(this.outputOptions);
        this.chunkTemplate = new ChunkTemplate(this.outputOptions);
        this.hotUpdateChunkTemplate = new HotUpdateChunkTemplate(this.outputOptions);
        this.moduleTemplate = new ModuleTemplate(this.outputOptions);

        this.entries = [];
        this.preparedChunks = [];
        this.entrypoints = {};
        this.chunks = [];
        this.namedChunks = {};
        this.modules = [];
        this._modules = {};
        this.cache = null;
        this.records = null;
        this.nextFreeModuleIndex = undefined;
        this.nextFreeModuleIndex2 = undefined;
        this.additionalChunkAssets = [];
        this.assets = {};
        this.errors = [];
        this.warnings = [];
        this.children = [];
        this.dependencyFactories = new ArrayMap();
        this.dependencyTemplates = new ArrayMap();
    }

    templatesPlugin(name: string, fn: Tapable.Handler) {
        this.mainTemplate.plugin(name, fn);
        this.chunkTemplate.plugin(name, fn);
    }

    addModule(module: Module, cacheGroup = 'm') {
        const identifier = module.identifier();
        if (this._modules[identifier]) {
            return false;
        }
        if (this.cache && this.cache[cacheGroup + identifier]) {
            const cacheModule: Module = this.cache[cacheGroup + identifier];

            let rebuild = true;
            if (!cacheModule.error && cacheModule.cacheable && this.fileTimestamps && this.contextTimestamps) {
                rebuild = cacheModule.needRebuild(this.fileTimestamps, this.contextTimestamps);
            }

            if (!rebuild) {
                cacheModule.disconnect();
                this._modules[identifier] = cacheModule;
                this.modules.push(cacheModule);
                cacheModule.errors.forEach(function (err) {
                    this.errors.push(err);
                }, this);
                cacheModule.warnings.forEach(function (err) {
                    this.warnings.push(err);
                }, this);
                return cacheModule;
            }
            else {
                module.lastId = cacheModule.id;
            }
        }
        this._modules[identifier] = module;
        if (this.cache) {
            this.cache[cacheGroup + identifier] = module;
        }
        this.modules.push(module);
        return true;
    }

    getModule(module: Module) {
        const identifier = module.identifier();
        return this._modules[identifier];
    }

    findModule(identifier: string) {
        return this._modules[identifier];
    }

    buildModule(
        module: Module, optional: boolean, origin: Module, dependencies: Dependency[],
        thisCallback: ErrCallback
    ) {
        this.applyPlugins('build-module', module);
        if (module.building) {
            return module.building.push(thisCallback);
        }
        const building = module.building = [thisCallback];

        function callback(err: Error) {
            module.building = undefined;
            building.forEach(cb => {
                cb(err);
            });
        }

        module.build(
            this.options,
            this,
            this.resolvers.normal,
            this.inputFileSystem,
            (err: Error) => {
                module.errors.forEach((err: ModuleNotFoundError) => {
                    err.origin = origin;
                    err.dependencies = dependencies;
                    if (optional) {
                        this.warnings.push(err);
                    }
                    else {
                        this.errors.push(err);
                    }
                }, this);
                module.warnings.forEach((err: ModuleNotFoundError) => {
                    err.origin = origin;
                    err.dependencies = dependencies;
                    this.warnings.push(err);
                }, this);
                module.dependencies.sort(Dependency.compare);
                if (err) {
                    this.applyPlugins('failed-module', module, err);
                    return callback(err);
                }
                this.applyPlugins('succeed-module', module);
                return callback(undefined)
            }
        );
    }

    processModuleDependencies(module: Module, callback: ErrCallback) {
        const dependencies: Dependency[][] = [];

        function addDependency(dep: Dependency) {
            for (let i = 0; i < dependencies.length; i++) {
                if (dep.isEqualResource(dependencies[i][0])) {
                    return dependencies[i].push(dep);
                }
            }
            dependencies.push([dep]);
        }

        function addDependenciesBlock(block: DependenciesBlock) {
            if (block.dependencies) {
                block.dependencies.forEach(addDependency);
            }
            if (block.blocks) {
                block.blocks.forEach(addDependenciesBlock);
            }
            if (block.variables) {
                block.variables.forEach(v => {
                    v.dependencies.forEach(addDependency);
                });
            }
        }

        addDependenciesBlock(module);
        this.addModuleDependencies(module, dependencies, this.bail, null, true, callback);
    }

    addModuleDependencies(
        module: Module,
        dependencies: Dependency[][],
        bail: boolean,
        cacheGroup: string,
        recursive: boolean,
        callback: ErrCallback
    ) {
        let self = this;
        const start = self.profile && +new Date();
        const factories = [];

        for (let i = 0; i < dependencies.length; i++) {
            const factory = self.dependencyFactories.get(dependencies[i][0].constructor);
            if (!factory) {
                return callback(new Error(`No module factory available for dependency type: ${dependencies[i][0].constructor.name}`));
            }
            factories[i] = [factory, dependencies[i]];
        }
        async.each(
            factories,
            (item: [any, Dependency[]], callback: ErrCallback) => {
                const dependencies = item[1];

                const errorAndCallback = function errorAndCallback(err: ModuleNotFoundError) {
                    err.origin = module;
                    self.errors.push(err);
                    if (bail) {
                        callback(err);
                    }
                    else {
                        callback();
                    }
                };
                const warningAndCallback = function warningAndCallback(err: ModuleNotFoundError) {
                    err.origin = module;
                    self.warnings.push(err);
                    callback();
                };

                const factory = item[0];
                factory.create({
                    contextInfo: {
                        issuer: module.nameForCondition && module.nameForCondition()
                    },
                    context: module.context,
                    dependencies
                }, (err: ResolveError, dependentModule: Module) => {
                    function isOptional() {
                        return dependencies.filter(d => !d.optional).length === 0;
                    }

                    function errorOrWarningAndCallback(err: ModuleNotFoundError) {
                        if (isOptional()) {
                            return warningAndCallback(err);
                        }
                        else {
                            return errorAndCallback(err);
                        }
                    }

                    if (err) {
                        return errorOrWarningAndCallback(new ModuleNotFoundError(module, err, dependencies));
                    }
                    if (!dependentModule) {
                        return process.nextTick(callback);
                    }

                    let afterFactory: number
                    if (self.profile) {
                        if (!dependentModule.profile) {
                            dependentModule.profile = {} as any;
                        }
                        afterFactory = +new Date();
                        dependentModule.profile.factory = afterFactory - start;
                    }

                    dependentModule.issuer = module;
                    const newModule = self.addModule(dependentModule, cacheGroup);

                    if (!newModule) {
                        // from cache
                        dependentModule = self.getModule(dependentModule);

                        if (dependentModule.optional) {
                            dependentModule.optional = isOptional();
                        }

                        dependencies.forEach(dep => {
                            dep.module = dependentModule;
                            dependentModule.addReason(module, dep);
                        });

                        if (self.profile) {
                            if (!module.profile) {
                                module.profile = {} as any;
                            }
                            const time = +new Date() - start;
                            if (!module.profile.dependencies || time > module.profile.dependencies) {
                                module.profile.dependencies = time;
                            }
                        }

                        return process.nextTick(callback);
                    }

                    if (newModule instanceof Module) {
                        if (self.profile) {
                            newModule.profile = dependentModule.profile;
                        }

                        newModule.optional = isOptional();
                        newModule.issuer = dependentModule.issuer;
                        dependentModule = newModule;

                        dependencies.forEach(dep => {
                            dep.module = dependentModule;
                            dependentModule.addReason(module, dep);
                        });

                        if (self.profile) {
                            const afterBuilding = +new Date();
                            module.profile.building = afterBuilding - afterFactory;
                        }

                        if (recursive) {
                            return process.nextTick(self.processModuleDependencies.bind(self, dependentModule, callback));
                        }
                        else {
                            return process.nextTick(callback);
                        }
                    }

                    dependentModule.optional = isOptional();

                    dependencies.forEach(dep => {
                        dep.module = dependentModule;
                        dependentModule.addReason(module, dep);
                    });

                    self.buildModule(dependentModule, isOptional(), module, dependencies, (err: ModuleNotFoundError) => {
                        if (err) {
                            return errorOrWarningAndCallback(err);
                        }

                        if (self.profile) {
                            const afterBuilding = +new Date();
                            dependentModule.profile.building = afterBuilding - afterFactory;
                        }

                        if (recursive) {
                            self.processModuleDependencies(dependentModule, callback);
                        }
                        else {
                            return callback();
                        }
                    });
                });
            },
            err => {
                // In V8, the Error objects keep a reference to the functions on the stack. These warnings &
                // errors are created inside closures that keep a reference to the Compilation, so errors are
                // leaking the Compilation object. Setting _this to null workarounds the following issue in V8.
                // https://bugs.chromium.org/p/chromium/issues/detail?id=612191
                self = null;

                if (err) {
                    return callback(err);
                }

                return callback();
            }
        );
    }

    _addModuleChain(
        context: string, dependency: Dependency, onModule: (module: Module) => any,
        callback: ErrCallback
    ) {
        const start = this.profile && +new Date();

        const errorAndCallback = this.bail ? function errorAndCallback(err: ModuleNotFoundError) {
            callback(err);
        } : function errorAndCallback(err: ModuleNotFoundError) {
            err.dependencies = [dependency];
            this.errors.push(err);
            callback();
        }.bind(this);

        if (typeof dependency !== 'object' || dependency === null || !dependency.constructor) {
            throw new Error('Parameter \'dependency\' must be a Dependency');
        }

        const moduleFactory = this.dependencyFactories.get(dependency.constructor);
        if (!moduleFactory) {
            throw new Error(`No dependency factory available for this dependency type: ${dependency.constructor.name}`);
        }

        moduleFactory.create({
            context,
            dependencies: [dependency]
        }, (err: ModuleNotFoundError, module: Module) => {
            if (err) {
                return errorAndCallback(new EntryModuleNotFoundError(err));
            }
            let afterFactory: number
            if (this.profile) {
                if (!module.profile) {
                    module.profile = {} as any;
                }
                afterFactory = +new Date();
                module.profile.factory = afterFactory - start;
            }

            const result = this.addModule(module);
            if (!result) {
                module = this.getModule(module);

                onModule(module);

                if (this.profile) {
                    const afterBuilding = +new Date();
                    module.profile.building = afterBuilding - afterFactory;
                }

                return callback(null, module);
            }

            if (result instanceof Module) {
                if (this.profile) {
                    result.profile = module.profile;
                }

                module = result;

                onModule(module);

                moduleReady.call(this);
                return;
            }

            onModule(module);

            this.buildModule(module, false, null, null, (err: Error) => {
                if (err) {
                    return errorAndCallback(err);
                }

                if (this.profile) {
                    const afterBuilding = +new Date();
                    module.profile.building = afterBuilding - afterFactory;
                }

                moduleReady.call(this);
            });

            function moduleReady() {
                this.processModuleDependencies(module, (err: Error) => {
                    if (err) {
                        return callback(err);
                    }

                    return callback(null, module);
                });
            }
        });
    }

    addEntry(context: string, entry: Dependency, name: string, callback: ErrCallback) {
        const slot = {
            name,
            module: null
        } as SlotChunk;
        this.preparedChunks.push(slot);
        this._addModuleChain(context, entry, module => {
            entry.module = module;
            this.entries.push(module);
            module.issuer = null;
        }, (err, module) => {
            if (err) {
                return callback(err);
            }

            if (module) {
                slot.module = module;
            }
            else {
                const idx = this.preparedChunks.indexOf(slot);
                this.preparedChunks.splice(idx, 1);
            }
            return callback();
        });
    }

    prefetch(context: string, dependency: Dependency, callback: ErrCallback) {
        this._addModuleChain(context, dependency, module => {
            module.prefetched = true;
            module.issuer = null;
        }, callback);
    }

    // todo: thisCallback has no this binding, this could cause confusion
    rebuildModule(module: Module, thisCallback: ErrCallback) {
        if (module.variables.length || module.blocks.length) {
            throw new Error('Cannot rebuild a complex module with variables or blocks');
        }
        if (module.rebuilding) {
            return module.rebuilding.push(thisCallback);
        }
        const rebuilding = module.rebuilding = [thisCallback];

        function callback(err: Error) {
            module.rebuilding = undefined;
            rebuilding.forEach(cb => {
                cb(err);
            });
        }

        const deps = module.dependencies.slice();
        this.buildModule(module, false, module, null, err => {
            if (err) {
                return callback(err);
            }

            this.processModuleDependencies(module, err => {
                if (err) {
                    return callback(err);
                }
                deps.forEach(function (d) {
                    if (d.module && d.module.removeReason(module, d)) {
                        module.chunks.forEach(function (chunk) {
                            if (!d.module.hasReasonForChunk(chunk)) {
                                if (d.module.removeChunk(chunk)) {
                                    this.removeChunkFromDependencies(d.module, chunk);
                                }
                            }
                        }, this);
                    }
                }, this);
                callback(undefined);
            });
        });
    }

    finish() {
        this.applyPlugins('finish-modules', this.modules);
        this.modules.forEach(function (m) {
            this.reportDependencyWarnings(m, [m]);
        }, this);
    }

    unseal() {
        this.applyPlugins('unseal');
        this.chunks.length = 0;
        this.namedChunks = {};
        this.additionalChunkAssets.length = 0;
        this.assets = {};
        this.modules.forEach(module => {
            module.unseal();
        });
    }

    seal(callback: ErrCallback) {
        this.applyPlugins('seal');
        this.nextFreeModuleIndex = 0;
        this.nextFreeModuleIndex2 = 0;
        this.preparedChunks.forEach(preparedChunk => {
            const module = preparedChunk.module;
            const chunk = this.addChunk(preparedChunk.name, module);
            const entrypoint = this.entrypoints[chunk.name] = new Entrypoint(chunk.name);
            entrypoint.unshiftChunk(chunk);

            chunk.addModule(module);
            module.addChunk(chunk);
            chunk.entryModule = module;
            if (typeof module.index !== 'number') {
                module.index = this.nextFreeModuleIndex++;
            }
            this.processDependenciesBlockForChunk(module, chunk);
            if (typeof module.index2 !== 'number') {
                module.index2 = this.nextFreeModuleIndex2++;
            }
        }, this);
        this.sortModules(this.modules);
        this.applyPlugins('optimize');

        while (
        this.applyPluginsBailResult('optimize-modules-basic', this.modules)
        || this.applyPluginsBailResult('optimize-modules', this.modules)
        || this.applyPluginsBailResult('optimize-modules-advanced', this.modules)
            ); // eslint-disable-line no-extra-semi

        this.applyPlugins('after-optimize-modules', this.modules);

        while (
        this.applyPluginsBailResult('optimize-chunks-basic', this.chunks)
        || this.applyPluginsBailResult('optimize-chunks', this.chunks)
        || this.applyPluginsBailResult('optimize-chunks-advanced', this.chunks)
            );

        this.applyPlugins('after-optimize-chunks', this.chunks);

        this.applyPluginsAsync('optimize-tree', this.chunks, this.modules, (err: Error) => {
            if (err) {
                return callback(err);
            }

            this.applyPlugins('after-optimize-tree', this.chunks, this.modules);

            const shouldRecord = this.applyPluginsBailResult('should-record') !== false;

            this.sortItemsBeforeIds();

            this.applyPlugins('revive-modules', this.modules, this.records);
            this.applyPlugins('optimize-module-order', this.modules);
            this.applyPlugins('advanced-optimize-module-order', this.modules);
            this.applyPlugins('before-module-ids', this.modules);
            this.applyPlugins('module-ids', this.modules);
            this.applyModuleIds();
            this.applyPlugins('optimize-module-ids', this.modules);
            this.applyPlugins('after-optimize-module-ids', this.modules);

            this.sortItemsWithModuleIds();

            this.applyPlugins('revive-chunks', this.chunks, this.records);
            this.applyPlugins('optimize-chunk-order', this.chunks);
            this.applyPlugins('before-chunk-ids', this.chunks);
            this.applyChunkIds();
            this.applyPlugins('optimize-chunk-ids', this.chunks);
            this.applyPlugins('after-optimize-chunk-ids', this.chunks);

            this.sortItemswithChunkIds();

            if (shouldRecord) {
                this.applyPlugins('record-modules', this.modules, this.records);
            }
            if (shouldRecord) {
                this.applyPlugins('record-chunks', this.chunks, this.records);
            }

            this.applyPlugins('before-hash');
            this.createHash();
            this.applyPlugins('after-hash');

            if (shouldRecord) {
                this.applyPlugins('record-hash', this.records);
            }

            this.applyPlugins('before-module-assets');
            this.createModuleAssets();
            if (this.applyPluginsBailResult('should-generate-chunk-assets') !== false) {
                this.applyPlugins('before-chunk-assets');
                this.createChunkAssets();
            }
            this.applyPlugins('additional-chunk-assets', this.chunks);
            this.summarizeDependencies();
            if (shouldRecord) {
                this.applyPlugins('record', this, this.records);
            }

            this.applyPluginsAsync('additional-assets', (err: Error) => {
                if (err) {
                    return callback(err);
                }
                this.applyPluginsAsync('optimize-chunk-assets', this.chunks, (err: Error) => {
                    if (err) {
                        return callback(err);
                    }
                    this.applyPlugins('after-optimize-chunk-assets', this.chunks);
                    this.applyPluginsAsync('optimize-assets', this.assets, (err: Error) => {
                        if (err) {
                            return callback(err);
                        }
                        this.applyPlugins('after-optimize-assets', this.assets);
                        if (this.applyPluginsBailResult('need-additional-seal')) {
                            this.unseal();
                            return this.seal(callback);
                        }
                        return this.applyPluginsAsync('after-seal', callback);
                    });
                });
            });
        });
    }

    sortModules(modules: Module[]) {
        modules.sort((a, b) => {
            if (a.index < b.index) {
                return -1;
            }
            if (a.index > b.index) {
                return 1;
            }
            return 0;
        });
    }

    reportDependencyWarnings(module: Module, blocks: DependenciesBlock[]) {
        const self = this;
        blocks.forEach(block => {
            block.dependencies.forEach(d => {
                const warnings = d.getWarnings();
                if (warnings) {
                    warnings.forEach(w => {
                        const warning = new ModuleDependencyWarning(module, w, d.loc as SourceLocation);
                        self.warnings.push(warning);
                    });
                }
            });
            self.reportDependencyWarnings(module, block.blocks);
        });
    }

    addChunk(name?: string, module?: Module, loc?: SourceLocation) {
        let chunk;
        if (name) {
            if (Object.prototype.hasOwnProperty.call(this.namedChunks, name)) {
                chunk = this.namedChunks[name];
                if (module) {
                    chunk.addOrigin(module, loc);
                }
                return chunk;
            }
        }
        chunk = new Chunk(name, module, loc);
        this.chunks.push(chunk);
        if (name) {
            this.namedChunks[name] = chunk;
        }
        return chunk;
    }

    processDependenciesBlockForChunk(block: Module, chunk: Chunk) {
        if (block.variables) {
            block.variables.forEach(function (v) {
                v.dependencies.forEach(iteratorDependency, this);
            }, this);
        }
        if (block.dependencies) {
            block.dependencies.forEach(iteratorDependency, this);
        }
        if (block.blocks) {
            block.blocks.forEach(function (b: AsyncDependenciesBlock) {
                let c;
                if (!b.chunks) {
                    c = this.addChunk(b.chunkName, b.module, b.loc);
                    b.chunks = [c];
                    c.addBlock(b);
                }
                else {
                    c = b.chunks[0];
                }
                chunk.addChunk(c);
                c.addParent(chunk);
                this.processDependenciesBlockForChunk(b, c);
            }, this);
        }

        function iteratorDependency(d: Dependency & { weak?: boolean }) {
            if (!d.module) {
                return;
            }
            if (typeof d.module.index !== 'number') {
                d.module.index = this.nextFreeModuleIndex++;
            }
            if (d.weak) {
                return;
            }
            if (chunk.addModule(d.module)) {
                d.module.addChunk(chunk);
                this.processDependenciesBlockForChunk(d.module, chunk);
            }
            if (typeof d.module.index2 !== 'number') {
                d.module.index2 = this.nextFreeModuleIndex2++;
            }
        }
    }

    removeChunkFromDependencies(block: Module, chunk: Chunk) {
        block.blocks.forEach(function (b) {
            b.chunks.forEach(function (c) {
                chunk.removeChunk(c);
                c.removeParent(chunk);
                this.removeChunkFromDependencies(b, c);
            }, this);
        }, this);

        function iteratorDependency(d: Dependency) {
            if (!d.module) {
                return;
            }
            if (!d.module.hasReasonForChunk(chunk)) {
                if (d.module.removeChunk(chunk)) {
                    this.removeChunkFromDependencies(d.module, chunk);
                }
            }
        }

        block.dependencies.forEach(iteratorDependency, this);
        block.variables.forEach(function (v) {
            v.dependencies.forEach(iteratorDependency, this);
        }, this);
    }

    applyModuleIds() {
        const unusedIds: number[] = [];
        let nextFreeModuleId = 0;
        const usedIds: number[] = [];
        const usedIdMap = {};
        if (this.usedModuleIds) {
            Object.keys(this.usedModuleIds).forEach(function (key) {
                const id = this.usedModuleIds[key];
                if (typeof usedIdMap[id] === 'undefined') {
                    usedIds.push(id);
                    usedIdMap[id] = id;
                }
            }, this);
        }
        this.modules.forEach(module => {
            if (module.id !== null && typeof usedIdMap[module.id] === 'undefined') {
                usedIds.push(module.id);
                usedIdMap[module.id] = module.id;
            }
        });
        if (usedIds.length > 0) {
            const usedNumberIds = usedIds.filter(id => typeof id === 'number');
            nextFreeModuleId = usedNumberIds.reduce((a, b) => Math.max(a, b), -1) + 1;
            for (let i = 0; i < nextFreeModuleId; i++) {
                if (usedIdMap[i] !== i) {
                    unusedIds.push(i);
                }
            }
            unusedIds.reverse();
        }
        this.modules.forEach(module => {
            if (module.id === null) {
                if (unusedIds.length > 0) {
                    module.id = unusedIds.pop();
                }
                else {
                    module.id = nextFreeModuleId++;
                }
            }
        }, this);
    }

    applyChunkIds() {
        const unusedIds: number[] = [];
        let nextFreeChunkId = 0;
        if (this.usedChunkIds) {
            const usedIds = Object.keys(this.usedChunkIds).map(function (key) {
                return this.usedChunkIds[key];
            }, this).sort();
            const usedNumberIds = usedIds.filter(id => typeof id === 'number');
            nextFreeChunkId = usedNumberIds.reduce((a, b) => Math.max(a, b), -1) + 1;
            for (let i = 0; i < nextFreeChunkId; i++) {
                if (this.usedChunkIds[i] !== i) {
                    unusedIds.push(i);
                }
            }
            unusedIds.reverse();
        }
        this.chunks.forEach(chunk => {
            if (chunk.id === null) {
                if (unusedIds.length > 0) {
                    chunk.id = unusedIds.pop();
                }
                else {
                    chunk.id = nextFreeChunkId++;
                }
            }
            if (!chunk.ids) {
                chunk.ids = [chunk.id];
            }
        }, this);
    }

    sortItemsBeforeIds() {
    }

    sortItemsWithModuleIds() {
        this.modules.sort(byId);
        this.modules.forEach(module => {
            module.sortItems();
        });
        this.chunks.forEach(chunk => {
            chunk.sortItems();
        });
    }

    sortItemswithChunkIds() {
        this.chunks.sort(byId);
        this.modules.forEach(module => {
            module.sortItems();
        });
    }

    summarizeDependencies() {
        function filterDups(array: any[]) {
            const newArray = [];
            for (let i = 0; i < array.length; i++) {
                if (i === 0 || array[i - 1] !== array[i]) {
                    newArray.push(array[i]);
                }
            }
            return newArray;
        }

        this.fileDependencies = (this.compilationDependencies || []).slice();
        this.contextDependencies = [];
        this.missingDependencies = [];
        this.children.forEach(child => {
            this.fileDependencies = this.fileDependencies.concat(child.fileDependencies);
            this.contextDependencies = this.contextDependencies.concat(child.contextDependencies);
            this.missingDependencies = this.missingDependencies.concat(child.missingDependencies);
        });
        this.modules.forEach(function (module: NormalModule) {
            if (module.fileDependencies) {
                module.fileDependencies.forEach(function (item) {
                    this.fileDependencies.push(item);
                }, this);
            }
            if (module.contextDependencies) {
                module.contextDependencies.forEach(function (item) {
                    this.contextDependencies.push(item);
                }, this);
            }
        }, this);
        this.errors.forEach(function (error) {
            if (Array.isArray(error.missing)) {
                error.missing.forEach(function (item) {
                    this.missingDependencies.push(item);
                }, this);
            }
        }, this);
        this.fileDependencies.sort();
        this.fileDependencies = filterDups(this.fileDependencies);
        this.contextDependencies.sort();
        this.contextDependencies = filterDups(this.contextDependencies);
        this.missingDependencies.sort();
        this.missingDependencies = filterDups(this.missingDependencies);
    }

    createHash() {
        const outputOptions = this.outputOptions;
        const hashFunction = outputOptions.hashFunction;
        const hashDigest = outputOptions.hashDigest;
        const hashDigestLength = outputOptions.hashDigestLength;
        const hash = crypto.createHash(hashFunction);
        if (outputOptions.hashSalt) {
            hash.update(outputOptions.hashSalt);
        }
        this.mainTemplate.updateHash(hash);
        this.chunkTemplate.updateHash(hash);
        this.moduleTemplate.updateHash(hash);
        let i;
        let chunk;
        const chunks = this.chunks.slice();
        chunks.sort((a, b) => {
            const aEntry = a.hasRuntime();
            const bEntry = b.hasRuntime();
            if (aEntry && !bEntry) {
                return 1;
            }
            if (!aEntry && bEntry) {
                return -1;
            }
            return 0;
        });
        for (i = 0; i < chunks.length; i++) {
            chunk = chunks[i];
            const chunkHash = crypto.createHash(hashFunction);
            if (outputOptions.hashSalt) {
                hash.update(outputOptions.hashSalt);
            }
            chunk.updateHash(chunkHash);
            if (chunk.hasRuntime()) {
                this.mainTemplate.updateHashForChunk(chunkHash, chunk);
            }
            else {
                this.chunkTemplate.updateHashForChunk(chunkHash);
            }
            this.applyPlugins('chunk-hash', chunk, chunkHash);
            chunk.hash = chunkHash.digest(hashDigest);
            hash.update(chunk.hash);
            chunk.renderedHash = chunk.hash.substr(0, hashDigestLength);
        }
        this.fullHash = hash.digest(hashDigest);
        this.hash = this.fullHash.substr(0, hashDigestLength);
    }

    modifyHash(update: string) {
        const outputOptions = this.outputOptions;
        const hashFunction = outputOptions.hashFunction;
        const hashDigest = outputOptions.hashDigest;
        const hashDigestLength = outputOptions.hashDigestLength;
        const hash = crypto.createHash(hashFunction);
        hash.update(this.fullHash);
        hash.update(update);
        this.fullHash = hash.digest(hashDigest);
        this.hash = this.fullHash.substr(0, hashDigestLength);
    }

    createModuleAssets() {
        for (let i = 0; i < this.modules.length; i++) {
            const module = this.modules[i] as NormalModule;
            if (module.assets) {
                Object.keys(module.assets)
                    .forEach(name => {
                        const file = this.getPath(name);
                        this.assets[file] = module.assets[name];
                        this.applyPlugins('module-asset', module, file);
                    });
            }
        }
    }

    createChunkAssets() {
        const outputOptions = this.outputOptions;
        const filename = outputOptions.filename;
        const chunkFilename = outputOptions.chunkFilename;
        for (let i = 0; i < this.chunks.length; i++) {
            const chunk = this.chunks[i];
            chunk.files = [];
            const chunkHash = chunk.hash;
            let source;
            let file;
            const filenameTemplate = chunk.filenameTemplate
                ? chunk.filenameTemplate as string
                : chunk.isInitial() ? filename : chunkFilename;
            try {
                const useChunkHash = !chunk.hasRuntime() || this.mainTemplate.useChunkHash && this.mainTemplate.useChunkHash(chunk);
                const usedHash = useChunkHash ? chunkHash : this.fullHash;
                if (this.cache && this.cache[`c${chunk.id}`] && this.cache[`c${chunk.id}`].hash === usedHash) {
                    source = this.cache[`c${chunk.id}`].source;
                }
                else {
                    if (chunk.hasRuntime()) {
                        source = this.mainTemplate.render(this.hash, chunk, this.moduleTemplate, this.dependencyTemplates);
                    }
                    else {
                        source = this.chunkTemplate.render(chunk, this.moduleTemplate, this.dependencyTemplates);
                    }
                    if (this.cache) {
                        this.cache[`c${chunk.id}`] = {
                            hash: usedHash,
                            source: source = source instanceof CachedSource ? source : new CachedSource(source)
                        };
                    }
                }
                file = this.getPath(filenameTemplate, {
                    noChunkHash: !useChunkHash,
                    chunk
                });
                if (this.assets[file]) {
                    throw new Error(`Conflict: Multiple assets emit to the same filename '${file}'`);
                }
                this.assets[file] = source;
                chunk.files.push(file);
                this.applyPlugins('chunk-asset', chunk, file);
            } catch (err) {
                this.errors.push(new ChunkRenderError(chunk, file || filenameTemplate, err));
            }
        }
    }

    getPath(filename: string, data: any = {}) {
        data.hash = data.hash || this.hash;
        return this.mainTemplate.applyPluginsWaterfall('asset-path', filename, data);
    }

    getStats() {
        return new Stats(this);
    }

    createChildCompiler(name: string, outputOptions: WebpackOutputOptions) {
        return this.compiler.createChildCompiler(this, name, outputOptions);
    }

    checkConstraints() {
        const usedIds = {};
        this.modules.forEach(module => {
            if (usedIds[module.id]) {
                throw new Error(`checkConstraints: duplicate module id ${module.id}`);
            }
        });
        this.chunks.forEach((chunk, idx) => {
            if (this.chunks.indexOf(chunk) !== idx) {
                throw new Error(`checkConstraints: duplicate chunk in compilation ${chunk.debugId}`);
            }
            chunk.checkConstraints();
        });
    }
}

declare namespace Compilation {
    interface Asset extends Source {
        __UglifyJsPlugin?: SourceMapSource | RawSource
        __SourceMapDevToolData?: Dictionary<RawSource | ConcatSource>
        emitted?: boolean
        existsAt?: string
    }
}

export = Compilation;

function byId(a: any, b: any) {
    if (a.id < b.id) {
        return -1;
    }
    if (a.id > b.id) {
        return 1;
    }
    return 0;
}
