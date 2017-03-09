/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import Template = require('./Template');
import BasicEvaluatedExpression = require('./BasicEvaluatedExpression');
import ModuleHotAcceptDependency = require('./dependencies/ModuleHotAcceptDependency');
import ModuleHotDeclineDependency = require('./dependencies/ModuleHotDeclineDependency');
import { Hash } from 'crypto'
import { CallExpression, Identifier } from 'estree'
import { RawSource } from 'webpack-sources'
import { CompilationParams, ParserOptions, Record } from '../typings/webpack-types'
import ConstDependency = require('./dependencies/ConstDependency');
import NullFactory = require('./NullFactory');
import crypto = require('crypto')
import Compiler = require('./Compiler')
import Compilation = require('./Compilation')
import Parser = require('./Parser')
import Chunk = require('./Chunk')
import ParserHelpers = require('./ParserHelpers');

const hotInitCode = Template.getFunctionContent(require('./HotModuleReplacement.runtime.js'));

class HotModuleReplacementPlugin {
    multiStep: boolean
    fullBuildTimeout: number

    constructor(options: {
                    multiStep: boolean
                    fullBuildTimeout: number
                } = {} as any) {
        this.multiStep = options.multiStep;
        this.fullBuildTimeout = options.fullBuildTimeout || 200;
    }

    apply(compiler: Compiler) {
        const multiStep = this.multiStep;
        const fullBuildTimeout = this.fullBuildTimeout;
        const hotUpdateChunkFilename = compiler.options.output.hotUpdateChunkFilename;
        const hotUpdateMainFilename = compiler.options.output.hotUpdateMainFilename;
        compiler.plugin('compilation', function (compilation: Compilation, params: CompilationParams) {
            const hotUpdateChunkTemplate = compilation.hotUpdateChunkTemplate;
            if (!hotUpdateChunkTemplate) {
                return;
            }

            const normalModuleFactory = params.normalModuleFactory;

            compilation.dependencyFactories.set(ConstDependency, new NullFactory());
            compilation.dependencyTemplates.set(ConstDependency, new ConstDependency.Template());

            compilation.dependencyFactories.set(ModuleHotAcceptDependency, normalModuleFactory);
            compilation.dependencyTemplates.set(ModuleHotAcceptDependency, new ModuleHotAcceptDependency.Template());

            compilation.dependencyFactories.set(ModuleHotDeclineDependency, normalModuleFactory);
            compilation.dependencyTemplates.set(ModuleHotDeclineDependency, new ModuleHotDeclineDependency.Template());

            compilation.plugin('record', function (compilation: Compilation, records: Record) {
                // todo:  this.hash === compilation.hash?
                if (records.hash === this.hash) {
                    return;
                }
                records.hash = compilation.hash;
                records.moduleHashs = {};
                this.modules.forEach(module => {
                    const identifier = module.identifier();
                    const hash = crypto.createHash('md5');
                    module.updateHash(hash);
                    records.moduleHashs[identifier] = hash.digest('hex');
                });
                records.chunkHashs = {};
                this.chunks.forEach(chunk => {
                    records.chunkHashs[chunk.id] = chunk.hash;
                });
                records.chunkModuleIds = {};
                this.chunks.forEach(chunk => {
                    records.chunkModuleIds[chunk.id] = chunk.modules.map(m => m.id);
                });
            });
            let initialPass = false;
            let recompilation = false;
            compilation.plugin('after-hash', function () {
                const records = this.records;
                if (!records) {
                    initialPass = true;
                    return;
                }
                if (!records.hash) {
                    initialPass = true;
                }
                const preHash = records.preHash || 'x';
                const prepreHash = records.prepreHash || 'x';
                if (preHash === this.hash) {
                    recompilation = true;
                    this.modifyHash(prepreHash);
                    return;
                }
                records.prepreHash = records.hash || 'x';
                records.preHash = this.hash;
                this.modifyHash(records.prepreHash);
            });
            compilation.plugin('should-generate-chunk-assets', function () {
                if (multiStep && !recompilation && !initialPass) {
                    return false;
                }
            });
            compilation.plugin('need-additional-pass', function () {
                if (multiStep && !recompilation && !initialPass) {
                    return true;
                }
            });
            compiler.plugin('additional-pass', function (callback) {
                if (multiStep) {
                    return setTimeout(callback, fullBuildTimeout);
                }
                return callback();
            });
            compilation.plugin('additional-chunk-assets', function () {
                const records = this.records;
                if (records.hash === this.hash) {
                    return;
                }
                if (!records.moduleHashs || !records.chunkHashs || !records.chunkModuleIds) {
                    return;
                }
                this.modules.forEach(module => {
                    const identifier = module.identifier();
                    const hash = crypto.createHash('md5');
                    module.updateHash(hash);
                    const hashStr = hash.digest('hex');
                    module.hotUpdate = records.moduleHashs[identifier] !== hashStr;
                });
                const hotUpdateMainContent = {
                    h: this.hash,
                    c: {}
                };
                Object.keys(records.chunkHashs).forEach((chunkId) => {
                    const chunkIdNum = +chunkId;
                    const currentChunk = this.chunks.filter(chunk => chunk.id === chunkIdNum)[0];
                    if (currentChunk) {
                        const newModules = currentChunk.modules.filter(module => module.hotUpdate);
                        const allModules = {};
                        currentChunk.modules.forEach(module => {
                            allModules[module.id] = true;
                        });
                        const removedModules = records.chunkModuleIds[chunkIdNum].filter(id => !allModules[id]);
                        if (newModules.length > 0 || removedModules.length > 0) {
                            const source = hotUpdateChunkTemplate.render(chunkIdNum, newModules, removedModules, this.hash, this.moduleTemplate, this.dependencyTemplates);
                            const filename = this.getPath(hotUpdateChunkFilename, {
                                hash: records.hash,
                                chunk: currentChunk
                            });
                            this.additionalChunkAssets.push(filename);
                            this.assets[filename] = source;
                            hotUpdateMainContent.c[chunkIdNum] = true;
                            currentChunk.files.push(filename);
                            this.applyPlugins('chunk-asset', currentChunk, filename);
                        }
                    }
                    else {
                        hotUpdateMainContent.c[chunkIdNum] = false;
                    }
                });

                const source = new RawSource(JSON.stringify(hotUpdateMainContent));
                const filename = this.getPath(hotUpdateMainFilename, {
                    hash: records.hash
                });
                this.assets[filename] = source;
            });

            compilation.mainTemplate.plugin('hash', function (hash: Hash) {
                hash.update('HotMainTemplateDecorator');
            });

            compilation.mainTemplate.plugin(
                'module-require',
                (_, chunk, hash, varModuleId) => `hotCreateRequire(${varModuleId})`
            );

            compilation.mainTemplate.plugin('require-extensions', function (source: string) {
                const buf = [source];
                buf.push('');
                buf.push('// __webpack_hash__');
                buf.push(`${this.requireFn}.h = function() { return hotCurrentHash; };`);
                return this.asString(buf);
            });

            compilation.mainTemplate.plugin('bootstrap', function (source: string, chunk: Chunk, hash: string) {
                source = this.applyPluginsWaterfall('hot-bootstrap', source, chunk, hash);
                return this.asString([
                    source,
                    '',
                    hotInitCode.replace(/\$require\$/g, this.requireFn)
                        .replace(/\$hash\$/g, JSON.stringify(hash))
                        .replace(/\/\*foreachInstalledChunks\*\//g, chunk.chunks.length > 0
                            ? 'for(var chunkId in installedChunks)'
                            : `var chunkId = ${chunk.id};`)
                ]);
            });

            compilation.mainTemplate.plugin('global-hash', () => true);

            compilation.mainTemplate.plugin('current-hash', function (_, length: number) {
                if (isFinite(length)) {
                    return `hotCurrentHash.substr(0, ${length})`;
                }
                else {
                    return 'hotCurrentHash';
                }
            });

            compilation.mainTemplate.plugin('module-obj', function (
                source: string,
                chunk: Chunk,
                hash: string,
                varModuleId: string
            ) {
                return this.asString([
                    `${source},`,
                    `hot: hotCreateModule(${varModuleId}),`,
                    'parents: (hotCurrentParentsTemp = hotCurrentParents, hotCurrentParents = [], hotCurrentParentsTemp),',
                    'children: []'
                ]);
            });

            params.normalModuleFactory.plugin('parser', function (parser: Parser, parserOptions: ParserOptions) {
                parser.plugin('expression __webpack_hash__', ParserHelpers.toConstantDependency('__webpack_require__.h()'));

                parser.plugin('evaluate typeof __webpack_hash__', ParserHelpers.evaluateToString('string'));
                parser.plugin('evaluate Identifier module.hot', function (expr: Identifier) {
                    return ParserHelpers.evaluateToBoolean(!!this.state.compilation.hotUpdateChunkTemplate)(expr);
                });
                parser.plugin('call module.hot.accept', function (expr: CallExpression) {
                    if (!this.state.compilation.hotUpdateChunkTemplate) {
                        return false;
                    }
                    if (expr.arguments.length >= 1) {
                        const arg = this.evaluateExpression(expr.arguments[0]);
                        let params: BasicEvaluatedExpression[] = [];
                        const requests: string[] = [];
                        if (arg.isString()) {
                            params = [arg];
                        }
                        else if (arg.isArray()) {
                            params = arg.items.filter(param => param.isString());
                        }
                        if (params.length > 0) {
                            params.forEach((param, idx) => {
                                const request = param.string;
                                const dep = new ModuleHotAcceptDependency(request, param.range);
                                dep.optional = true;
                                dep.loc = Object.create(expr.loc);
                                dep.loc.index = idx;
                                this.state.module.addDependency(dep);
                                requests.push(request);
                            });
                            if (expr.arguments.length > 1) {
                                this.applyPluginsBailResult('hot accept callback', expr.arguments[1], requests);
                            }
                            else {
                                this.applyPluginsBailResult('hot accept without callback', expr, requests);
                            }
                        }
                    }
                });
                parser.plugin('call module.hot.decline', function (expr: CallExpression) {
                    if (!this.state.compilation.hotUpdateChunkTemplate) {
                        return false;
                    }
                    if (expr.arguments.length === 1) {
                        const arg = this.evaluateExpression(expr.arguments[0]);
                        let params: BasicEvaluatedExpression[] = [];
                        if (arg.isString()) {
                            params = [arg];
                        }
                        else if (arg.isArray()) {
                            params = arg.items.filter(param => param.isString());
                        }
                        params.forEach((param, idx) => {
                            const dep = new ModuleHotDeclineDependency(param.string, param.range);
                            dep.optional = true;
                            dep.loc = Object.create(expr.loc);
                            dep.loc.index = idx;
                            this.state.module.addDependency(dep);
                        });
                    }
                });
                parser.plugin('expression module.hot', ParserHelpers.skipTraversal);
            });
        });
    }
}

export = HotModuleReplacementPlugin;

