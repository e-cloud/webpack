import { AbstractInputFileSystem, ResolveError } from 'enhanced-resolve/lib/common-types'
import { SourceLocation } from 'estree'
/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import { CachedSource, ConcatSource, RawSource, Source, SourceMapSource } from 'webpack-sources'
import {
    AggressiveSplit,
    Dictionary,
    ErrCallback,
    PerformanceOptions,
    PlainObject,
    Record,
    TimeStampMap,
    WebpackError,
    WebpackOptions,
    WebpackOutputOptions
} from '../typings/webpack-types'
import async = require('async');
import crypto = require('crypto')
import Tapable = require('tapable');
import Compiler = require('./Compiler')
import EntryModuleNotFoundError = require('./EntryModuleNotFoundError');
import ModuleNotFoundError = require('./ModuleNotFoundError');
import ModuleDependencyWarning = require('./ModuleDependencyWarning');
import ModuleDependencyError = require('./ModuleDependencyError');
import Module = require('./Module');
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
import DependenciesBlockVariable = require('./DependenciesBlockVariable')

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
    dependencyFactories: Map<Function, any>
    dependencyTemplates: Map<Function, any>
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
    performance: PerformanceOptions
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
        this.performance = options && options.performance;

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
        this.dependencyFactories = new Map();
        this.dependencyTemplates = new Map();
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
        const cacheName = cacheGroup + identifier;
        if (this.cache && this.cache[cacheName]) {
            const cacheModule: Module = this.cache[cacheName];

            let rebuild = true;
            if (!cacheModule.error && cacheModule.cacheable && this.fileTimestamps && this.contextTimestamps) {
                rebuild = cacheModule.needRebuild(this.fileTimestamps, this.contextTimestamps);
            }

            if (!rebuild) {
                cacheModule.disconnect();
                this._modules[identifier] = cacheModule;
                this.modules.push(cacheModule);
                cacheModule.errors.forEach((err) => this.errors.push(err));
                cacheModule.warnings.forEach((err) => this.warnings.push(err));
                return cacheModule;
            }
            else {
                module.lastId = cacheModule.id;
            }
        }
        module.unbuild();
        this._modules[identifier] = module;
        if (this.cache) {
            this.cache[cacheName] = module;
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

    buildModule(module: Module, optional: boolean, origin: Module, dependencies: Dependency[],
                thisCallback: ErrCallback
    ) {
        this.applyPlugins1('build-module', module);
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
            (error: Error) => {
                const errors = module.errors;
                for (let indexError = 0; indexError < errors.length; indexError++) {
                    const err = errors[indexError];
                    err.origin = origin;
                    err.dependencies = dependencies;
                    if (optional) {
                        this.warnings.push(err);
                    }
                    else {
                        this.errors.push(err);
                    }
                }

                const warnings = module.warnings;
                for (let indexWarning = 0; indexWarning < warnings.length; indexWarning++) {
                    const war = warnings[indexWarning];
                    war.origin = origin;
                    war.dependencies = dependencies;
                    this.warnings.push(war);
                }
                module.dependencies.sort(Dependency.compare);
                if (error) {
                    this.applyPlugins2('failed-module', module, error);
                    return callback(error);
                }
                this.applyPlugins1('succeed-module', module);
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
                iterationOfArrayCallback(block.dependencies, addDependency);
            }
            if (block.blocks) {
                iterationOfArrayCallback(block.blocks, addDependenciesBlock);
            }
            if (block.variables) {
                iterationBlockVariable(block.variables, addDependency);
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
        const factories: [any, Dependency[]][] = [];

        for (let i = 0; i < dependencies.length; i++) {
            const factory = self.dependencyFactories.get(dependencies[i][0].constructor);
            if (!factory) {
                return callback(new Error(`No module factory available for dependency type: ${dependencies[i][0].constructor.name}`));
            }
            factories[i] = [factory, dependencies[i]];
        }
        async.each(
            factories,
            function iteratorFactory(item: [any, Dependency[]], callback: ErrCallback) {
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
                        issuer: module.nameForCondition && module.nameForCondition(),
                        compiler: self.compiler.name
                    },
                    context: module.context,
                    dependencies
                }, function factoryCallback(err: ResolveError, dependentModule: Module) {
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

                    function iterationDependencies(deps: Dependency[]) {
                        for (let index = 0; index < deps.length; index++) {
                            const dep = deps[index];
                            dep.module = dependentModule;
                            dependentModule.addReason(module, dep);
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

                        iterationDependencies(dependencies);

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

                        iterationDependencies(dependencies);

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

                    iterationDependencies(dependencies);

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
            function finalCallbackAddModuleDependencies(err) {
                // In V8, the Error objects keep a reference to the functions on the stack. These warnings &
                // errors are created inside closures that keep a reference to the Compilation, so errors are
                // leaking the Compilation object. Setting _this to null workarounds the following issue in V8.
                // https://bugs.chromium.org/p/chromium/issues/detail?id=612191
                self = null;

                if (err) {
                    return callback(err);
                }

                return process.nextTick(callback);
            }
        );
    }

    _addModuleChain(
        context: string,
        dependency: Dependency,
        onModule: (module: Module) => any,
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
            contextInfo: {
                issuer: '',
                compiler: this.compiler.name
            },
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
                deps.forEach((dep) => {
                    if (dep.module && dep.module.removeReason(module, dep)) {
                        module.chunks.forEach((chunk) => {
                            if (!dep.module.hasReasonForChunk(chunk)) {
                                if (dep.module.removeChunk(chunk)) {
                                    this.removeChunkFromDependencies(dep.module, chunk);
                                }
                            }
                        });
                    }
                });
                callback(undefined);
            });
        });
    }

    finish() {
        const modules = this.modules;
        this.applyPlugins1('finish-modules', modules);

        for (let index = 0; index < modules.length; index++) {
            const module = modules[index];
            this.reportDependencyErrorsAndWarnings(module, [module]);
        }
    }

    unseal() {
        this.applyPlugins0('unseal');
        this.chunks.length = 0;
        this.namedChunks = {};
        this.additionalChunkAssets.length = 0;
        this.assets = {};
        this.modules.forEach(module => {
            module.unseal();
        });
    }

    seal(callback: ErrCallback) {
        this.applyPlugins0('seal');
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
            this.assignIndex(module);
            this.assignDepth(module);
            this.processDependenciesBlockForChunk(module, chunk);
        });
        this.sortModules(this.modules);
        this.applyPlugins0('optimize');

        while (
        this.applyPluginsBailResult1('optimize-modules-basic', this.modules)
        || this.applyPluginsBailResult1('optimize-modules', this.modules)
        || this.applyPluginsBailResult1('optimize-modules-advanced', this.modules)
            ); // eslint-disable-line no-extra-semi

        this.applyPlugins1('after-optimize-modules', this.modules);

        while (
        this.applyPluginsBailResult1('optimize-chunks-basic', this.chunks)
        || this.applyPluginsBailResult1('optimize-chunks', this.chunks)
        || this.applyPluginsBailResult1('optimize-chunks-advanced', this.chunks)
            );

        this.applyPlugins1('after-optimize-chunks', this.chunks);

        this.applyPluginsAsyncSeries('optimize-tree', this.chunks, this.modules, (err: Error) => {
            if (err) {
                return callback(err);
            }

            this.applyPlugins2('after-optimize-tree', this.chunks, this.modules);

            const shouldRecord = this.applyPluginsBailResult('should-record') !== false;

            this.applyPlugins2('revive-modules', this.modules, this.records);
            this.applyPlugins1('optimize-module-order', this.modules);
            this.applyPlugins1('advanced-optimize-module-order', this.modules);
            this.applyPlugins1('before-module-ids', this.modules);
            this.applyPlugins1('module-ids', this.modules);
            this.applyModuleIds();
            this.applyPlugins1('optimize-module-ids', this.modules);
            this.applyPlugins1('after-optimize-module-ids', this.modules);

            this.sortItemsWithModuleIds();

            this.applyPlugins2('revive-chunks', this.chunks, this.records);
            this.applyPlugins1('optimize-chunk-order', this.chunks);
            this.applyPlugins1('before-chunk-ids', this.chunks);
            this.applyChunkIds();
            this.applyPlugins1('optimize-chunk-ids', this.chunks);
            this.applyPlugins1('after-optimize-chunk-ids', this.chunks);

            this.sortItemsWithChunkIds();

            if (shouldRecord) {
                this.applyPlugins2('record-modules', this.modules, this.records);
            }
            if (shouldRecord) {
                this.applyPlugins2('record-chunks', this.chunks, this.records);
            }

            this.applyPlugins0('before-hash');
            this.createHash();
            this.applyPlugins0('after-hash');

            if (shouldRecord) {
                this.applyPlugins1('record-hash', this.records);
            }

            this.applyPlugins0('before-module-assets');
            this.createModuleAssets();
            if (this.applyPluginsBailResult('should-generate-chunk-assets') !== false) {
                this.applyPlugins0('before-chunk-assets');
                this.createChunkAssets();
            }
            this.applyPlugins1('additional-chunk-assets', this.chunks);
            this.summarizeDependencies();
            if (shouldRecord) {
                this.applyPlugins2('record', this, this.records);
            }

            this.applyPluginsAsync('additional-assets', (err: Error) => {
                if (err) {
                    return callback(err);
                }
                this.applyPluginsAsync('optimize-chunk-assets', this.chunks, (err: Error) => {
                    if (err) {
                        return callback(err);
                    }
                    this.applyPlugins1('after-optimize-chunk-assets', this.chunks);
                    this.applyPluginsAsync('optimize-assets', this.assets, (err: Error) => {
                        if (err) {
                            return callback(err);
                        }
                        this.applyPlugins1('after-optimize-assets', this.assets);
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

    reportDependencyErrorsAndWarnings(module: Module, blocks: DependenciesBlock[]) {
        for (let indexBlock = 0; indexBlock < blocks.length; indexBlock++) {
            const block = blocks[indexBlock];
            const dependencies = block.dependencies;

            for (let indexDep = 0; indexDep < dependencies.length; indexDep++) {
                const dep = dependencies[indexDep];

                const warnings = dep.getWarnings();
                if (warnings) {
                    for (let indexWar = 0; indexWar < warnings.length; indexWar++) {
                        const w = warnings[indexWar];

                        const warning = new ModuleDependencyWarning(module, w, dep.loc);
                        this.warnings.push(warning);
                    }
                }
                const errors = dep.getErrors();
                if (errors) {
                    for (let indexErr = 0; indexErr < errors.length; indexErr++) {
                        const e = errors[indexErr];

                        const error = new ModuleDependencyError(module, e, dep.loc as SourceLocation);
                        this.errors.push(error);
                    }
                }
            }

            this.reportDependencyErrorsAndWarnings(module, block.blocks);
        }
    }

    addChunk(name?: string, module?: Module, loc?: SourceLocation) {
        if (name) {
            if (Object.prototype.hasOwnProperty.call(this.namedChunks, name)) {
                const chunk = this.namedChunks[name];
                if (module) {
                    chunk.addOrigin(module, loc);
                }
                return chunk;
            }
        }
        const chunk = new Chunk(name, module, loc);
        this.chunks.push(chunk);
        if (name) {
            this.namedChunks[name] = chunk;
        }
        return chunk;
    }

    assignIndex(module: Module) {
        const self = this;

        const queue = [
            () => {
                assignIndexToModule(module);
            }
        ];

        const iteratorAllDependencies = (dep: Dependency) => {
            queue.push(() => assignIndexToDependency(dep));
        };

        function assignIndexToModule(module: Module) {
            // enter module
            if (typeof module.index !== 'number') {
                module.index = self.nextFreeModuleIndex++;

                queue.push(function () {
                    // leave module
                    module.index2 = self.nextFreeModuleIndex2++;
                });

                // enter it as block
                assignIndexToDependencyBlock(module);
            }
        }

        function assignIndexToDependency(dependency: Dependency) {
            if (dependency.module) {
                queue.push(function () {
                    assignIndexToModule(dependency.module);
                });
            }
        }

        function assignIndexToDependencyBlock(block: DependenciesBlock) {
            const allDependencies: Dependency[] = [];

            function iteratorDependency(d: Dependency) {
                allDependencies.push(d);
            }

            function iteratorBlock(b: DependenciesBlock) {
                queue.push(function () {
                    assignIndexToDependencyBlock(b);
                });
            }

            if (block.variables) {
                iterationBlockVariable(block.variables, iteratorDependency);
            }

            if (block.dependencies) {
                iterationOfArrayCallback(block.dependencies, iteratorDependency);
            }
            if (block.blocks) {
                const blocks = block.blocks;
                let indexBlock = blocks.length;
                while (indexBlock--) {
                    iteratorBlock(blocks[indexBlock]);
                }
            }

            let indexAll = allDependencies.length;
            while (indexAll--) {
                iteratorAllDependencies(allDependencies[indexAll]);
            }
        }

        while (queue.length) {
            queue.pop()();
        }
    }

    assignDepth(module: Module) {
        function assignDepthToModule(module: Module, depth: number) {
            // enter module
            if (typeof module.depth === 'number' && module.depth <= depth) {
                return;
            }
            module.depth = depth;

            // enter it as block
            assignDepthToDependencyBlock(module, depth + 1);
        }

        function assignDepthToDependency(dependency: Dependency, depth: number) {
            if (dependency.module) {
                queue.push(function () {
                    assignDepthToModule(dependency.module, depth);
                });
            }
        }

        function assignDepthToDependencyBlock(block: DependenciesBlock, depth: number) {
            function iteratorDependency(d: Dependency) {
                assignDepthToDependency(d, depth);
            }

            function iteratorBlock(b: DependenciesBlock) {
                assignDepthToDependencyBlock(b, depth);
            }

            if (block.variables) {
                iterationBlockVariable(block.variables, iteratorDependency);
            }

            if (block.dependencies) {
                iterationOfArrayCallback(block.dependencies, iteratorDependency);
            }

            if (block.blocks) {
                iterationOfArrayCallback(block.blocks, iteratorBlock);
            }
        }

        const queue = [
            function () {
                assignDepthToModule(module, 0);
            }
        ];
        while (queue.length) {
            queue.pop()();
        }
    }

    processDependenciesBlockForChunk(block: DependenciesBlock, chunk: Chunk) {
        const iteratorBlock = (b: AsyncDependenciesBlock) => {
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
            queue.push([b, c]);
        }

        const iteratorDependency = (d: Dependency & { weak?: boolean }) => {
            if (!d.module) {
                return;
            }
            if (d.weak) {
                return;
            }
            if (chunk.addModule(d.module)) {
                d.module.addChunk(chunk);
                queue.push([d.module, chunk]);
            }
        }

        const queue: [DependenciesBlock, Chunk][] = [
            [block, chunk]
        ];

        while (queue.length) {
            const queueItem = queue.pop();
            block = queueItem[0];
            chunk = queueItem[1];

            if (block.variables) {
                iterationBlockVariable(block.variables, iteratorDependency);
            }

            if (block.dependencies) {
                iterationOfArrayCallback(block.dependencies, iteratorDependency);
            }

            if (block.blocks) {
                iterationOfArrayCallback(block.blocks, iteratorBlock);
            }
        }
    }

    removeChunkFromDependencies(block: Module, chunk: Chunk) {
        const iteratorDependency = (dep: Dependency) => {
            if (!dep.module) {
                return;
            }
            if (!dep.module.hasReasonForChunk(chunk)) {
                if (dep.module.removeChunk(chunk)) {
                    this.removeChunkFromDependencies(dep.module, chunk);
                }
            }
        };

        const blocks = block.blocks;
        for (let indexBlock = 0; indexBlock < blocks.length; indexBlock++) {
            const chunks = blocks[indexBlock].chunks;
            for (let indexChunk = 0; indexChunk < chunks.length; indexChunk++) {
                const blockChunk = chunks[indexChunk];
                chunk.removeChunk(blockChunk);
                blockChunk.removeParent(chunk);
                this.removeChunkFromDependencies(chunks, blockChunk);
            }
        }

        if (block.dependencies) {
            iterationOfArrayCallback(block.dependencies, iteratorDependency);
        }

        if (block.variables) {
            iterationBlockVariable(block.variables, iteratorDependency);
        }
    }

    applyModuleIds() {
        const unusedIds: number[] = [];
        let nextFreeModuleId = 0;
        const usedIds: number[] = [];
        // TODO consider Map when performance has improved
        // https://gist.github.com/sokra/234c077e1299b7369461f1708519c392
        const usedIdMap = Object.create(null);
        if (this.usedModuleIds) {
            Object.keys(this.usedModuleIds).forEach(key => {
                const id = this.usedModuleIds[key];
                if (!usedIdMap[id]) {
                    usedIds.push(id);
                    usedIdMap[id] = true;
                }
            });
        }

        const modules1 = this.modules;
        for (let indexModule1 = 0; indexModule1 < modules1.length; indexModule1++) {
            const module1 = modules1[indexModule1];
            if (module1.id && !usedIdMap[module1.id]) {
                usedIds.push(module1.id);
                usedIdMap[module1.id] = true;
            }
        }

        if (usedIds.length > 0) {
            let usedIdMax = -1;
            for (let index = 0; index < usedIds.length; index++) {
                const usedIdKey = usedIds[index];

                if (typeof usedIdKey !== 'number') {
                    continue;
                }

                usedIdMax = Math.max(usedIdMax, usedIdKey);
            }

            let lengthFreeModules = nextFreeModuleId = usedIdMax + 1;

            while (lengthFreeModules--) {
                if (!usedIdMap[lengthFreeModules]) {
                    unusedIds.push(lengthFreeModules);
                }
            }
        }

        const modules2 = this.modules;
        for (let indexModule2 = 0; indexModule2 < modules2.length; indexModule2++) {
            const module2 = modules2[indexModule2];
            if (module2.id === null) {
                if (unusedIds.length > 0) {
                    module2.id = unusedIds.pop();
                }
                else {
                    module2.id = nextFreeModuleId++;
                }
            }
        }
    }

    applyChunkIds() {
        const unusedIds: number[] = [];
        let nextFreeChunkId = 0;

        function getNextFreeChunkId(usedChunkIds: Dictionary<number>) {
            const keyChunks = Object.keys(usedChunkIds);
            let result = -1;

            for (let index = 0; index < keyChunks.length; index++) {
                const usedIdKey = keyChunks[index];
                const usedIdValue = usedChunkIds[usedIdKey];

                if (typeof usedIdValue !== 'number') {
                    continue;
                }

                result = Math.max(result, usedIdValue);
            }

            return result;
        }

        if (this.usedChunkIds) {
            nextFreeChunkId = getNextFreeChunkId(this.usedChunkIds) + 1;
            let index = nextFreeChunkId;
            while (index--) {
                if (this.usedChunkIds[index] !== index) {
                    unusedIds.push(index);
                }
            }
        }

        const chunks = this.chunks;
        for (let indexChunk = 0; indexChunk < chunks.length; indexChunk++) {
            const chunk = chunks[indexChunk];
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
        }
    }

    sortItemsWithModuleIds() {
        this.modules.sort(byId);

        const modules = this.modules;
        for (let indexModule = 0; indexModule < modules.length; indexModule++) {
            modules[indexModule].sortItems();
        }

        const chunks = this.chunks;
        for (let indexChunk = 0; indexChunk < chunks.length; indexChunk++) {
            chunks[indexChunk].sortItems();
        }
    }

    sortItemsWithChunkIds() {
        this.chunks.sort(byId);

        const modules = this.modules;
        for (let indexModule = 0; indexModule < modules.length; indexModule++) {
            modules[indexModule].sortItems();
        }

        const chunks = this.chunks;
        for (let indexChunk = 0; indexChunk < chunks.length; indexChunk++) {
            chunks[indexChunk].sortItems();
        }
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
        const children = this.children;
        for (let indexChildren = 0; indexChildren < children.length; indexChildren++) {
            const child = children[indexChildren];

            this.fileDependencies = this.fileDependencies.concat(child.fileDependencies);
            this.contextDependencies = this.contextDependencies.concat(child.contextDependencies);
            this.missingDependencies = this.missingDependencies.concat(child.missingDependencies);
        }

        const modules = this.modules as NormalModule[];
        for (let indexModule = 0; indexModule < modules.length; indexModule++) {
            const module = modules[indexModule];

            if (module.fileDependencies) {
                const fileDependencies = module.fileDependencies;
                for (let indexFileDep = 0; indexFileDep < fileDependencies.length; indexFileDep++) {
                    this.fileDependencies.push(fileDependencies[indexFileDep]);
                }
            }
            if (module.contextDependencies) {
                const contextDependencies = module.contextDependencies;
                for (let indexContextDep = 0; indexContextDep < contextDependencies.length; indexContextDep++) {
                    this.contextDependencies.push(contextDependencies[indexContextDep]);
                }
            }
        }
        this.errors.forEach((error) => {
            if (Array.isArray(error.missing)) {
                error.missing.forEach((item) => {
                    this.missingDependencies.push(item);
                });
            }
        });
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
        this.children.forEach(function (child) {
            hash.update(child.hash);
        });
        // clone needed as sort below is in-place mutation
        const chunks = this.chunks.slice();
        /**
         * sort here will bring all "falsy" values to the beginning
         * this is needed as the "hasRuntime()" chunks are dependent on the
         * hashes of the non-runtime chunks.
         */
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
        for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];
            const chunkHash = crypto.createHash(hashFunction);
            if (outputOptions.hashSalt) {
                chunkHash.update(outputOptions.hashSalt);
            }
            chunk.updateHash(chunkHash);
            if (chunk.hasRuntime()) {
                this.mainTemplate.updateHashForChunk(chunkHash, chunk);
            }
            else {
                this.chunkTemplate.updateHashForChunk(chunkHash, chunk);
            }
            this.applyPlugins2('chunk-hash', chunk, chunkHash);
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
                        const fileName = this.getPath(name);
                        this.assets[fileName] = module.assets[name];
                        this.applyPlugins2('module-asset', module, fileName);
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
                ? chunk.filenameTemplate
                : chunk.isInitial() ? filename : chunkFilename;
            try {
                const useChunkHash = !chunk.hasRuntime() || this.mainTemplate.useChunkHash && this.mainTemplate.useChunkHash(chunk);
                const usedHash = useChunkHash ? chunkHash : this.fullHash;
                const cacheName = `c${chunk.id}`;
                if (this.cache && this.cache[cacheName] && this.cache[cacheName].hash === usedHash) {
                    source = this.cache[cacheName].source;
                }
                else {
                    if (chunk.hasRuntime()) {
                        source = this.mainTemplate.render(this.hash, chunk, this.moduleTemplate, this.dependencyTemplates);
                    }
                    else {
                        source = this.chunkTemplate.render(chunk, this.moduleTemplate, this.dependencyTemplates);
                    }

                    if (this.cache) {
                        this.cache[cacheName] = {
                            hash: usedHash,
                            source: source = (source instanceof CachedSource ? source : new CachedSource(source))
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
                this.applyPlugins2('chunk-asset', chunk, file);
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

        const modules = this.modules;
        for (let indexModule = 0; indexModule < modules.length; indexModule++) {
            const moduleId = modules[indexModule].id;

            if (usedIds[moduleId]) {
                throw new Error(`checkConstraints: duplicate module id ${moduleId}`);
            }
        }

        const chunks = this.chunks;
        for (let indexChunk = 0; indexChunk < chunks.length; indexChunk++) {
            const chunk = chunks[indexChunk];

            if (chunks.indexOf(chunk) !== indexChunk) {
                throw new Error(`checkConstraints: duplicate chunk in compilation ${chunk.debugId}`);
            }
            chunk.checkConstraints();
        }
    }
}

declare namespace Compilation {
    interface Asset extends Source {
        __UglifyJsPlugin?: SourceMapSource | RawSource
        __SourceMapDevToolData?: Dictionary<RawSource | ConcatSource>
        emitted?: boolean
        existsAt?: string
        isOverSizeLimit?: boolean
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

function iterationBlockVariable(variables: DependenciesBlockVariable[], fn: (input: any) => any) {
    for (let indexVariable = 0; indexVariable < variables.length; indexVariable++) {
        const varDep = variables[indexVariable].dependencies;
        for (let indexVDep = 0; indexVDep < varDep.length; indexVDep++) {
            fn(varDep[indexVDep]);
        }
    }
}

function iterationOfArrayCallback(arr: any[], fn: (input: any) => any) {
    for (let index = 0; index < arr.length; index++) {
        fn(arr[index]);
    }
}
