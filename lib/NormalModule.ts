/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import {
    SourceMapSource,
    OriginalSource,
    RawSource,
    ReplaceSource,
    CachedSource,
    LineToLineMappedSource
} from 'webpack-sources'
import { runLoaders, getContext } from 'loader-runner'
import crypto = require('crypto')
import path = require('path');
import ModuleParseError = require('./ModuleParseError');
import TemplateArgumentDependency = require('./dependencies/TemplateArgumentDependency');
import AsyncDependenciesBlock = require('./AsyncDependenciesBlock');
import ModuleBuildError = require('./ModuleBuildError');
import ModuleError = require('./ModuleError');
import ModuleWarning = require('./ModuleWarning');
import Module = require('./Module');

function asString(buf) {
    if (Buffer.isBuffer(buf)) {
        return buf.toString('utf-8');
    }
    return buf;
}

class NormalModule extends Module {
    constructor(request, userRequest, rawRequest, loaders, resource, parser) {
        super();
        this.request = request;
        this.userRequest = userRequest;
        this.rawRequest = rawRequest;
        this.parser = parser;
        this.resource = resource;
        this.context = getContext(resource);
        this.loaders = loaders;
        this.fileDependencies = [];
        this.contextDependencies = [];
        this.warnings = [];
        this.errors = [];
        this.error = null;
        this._source = null;
        this.assets = {};
        this.built = false;
        this._cachedSource = null;
    }

    identifier() {
        return this.request;
    }

    readableIdentifier(requestShortener) {
        return requestShortener.shorten(this.userRequest);
    }

    libIdent(options) {
        return contextify(options, this.userRequest);
    }

    nameForCondition() {
        const idx = this.resource.indexOf('?');
        if (idx >= 0) {
            return this.resource.substr(0, idx);
        }
        return this.resource;
    }

    doBuild(options, compilation, resolver, fs, callback) {
        this.cacheable = false;
        const module = this;
        const loaderContext = {
            version: 2,
            emitWarning(warning) {
                module.warnings.push(new ModuleWarning(module, warning));
            },
            emitError(error) {
                module.errors.push(new ModuleError(module, error));
            },
            exec(code, filename) {
                const Module = require('module');
                const m = new Module(filename, module);
                m.paths = Module._nodeModulePaths(module.context);
                m.filename = filename;
                m._compile(code, filename);
                return m.exports;
            },
            resolve(context, request, callback) {
                resolver.resolve({}, context, request, callback);
            },
            resolveSync(context, request) {
                return resolver.resolveSync({}, context, request);
            },
            options
        };
        loaderContext.webpack = true;
        loaderContext.sourceMap = !!this.useSourceMap;
        loaderContext.emitFile = (name, content, sourceMap) => {
            if (typeof sourceMap === 'string') {
                this.assets[name] = new OriginalSource(content, sourceMap);
            }
            else if (sourceMap) {
                this.assets[name] = new SourceMapSource(content, name, sourceMap);
            }
            else {
                this.assets[name] = new RawSource(content);
            }
        };
        loaderContext._module = this;
        loaderContext._compilation = compilation;
        loaderContext._compiler = compilation.compiler;
        loaderContext.fs = fs;
        compilation.applyPlugins('normal-module-loader', loaderContext, this);
        if (options.loader) {
            for (const key in options.loader) loaderContext[key] = options.loader[key];
        }

        runLoaders({
            resource: this.resource,
            loaders: this.loaders,
            context: loaderContext,
            readResource: fs.readFile.bind(fs)
        }, (err, result) => {
            if (result) {
                module.cacheable = result.cacheable;
                module.fileDependencies = result.fileDependencies;
                module.contextDependencies = result.contextDependencies;
            }
            if (err) {
                return callback(module.error = new ModuleBuildError(module, err));
            }

            const resourceBuffer = result.resourceBuffer;
            let source = result.result[0];
            const sourceMap = result.result[1];

            if (!Buffer.isBuffer(source) && typeof source !== 'string') {
                return callback(module.error = new ModuleBuildError(module, new Error('Final loader didn\'t return a Buffer or String')));
            }
            source = asString(source);
            if (module.identifier && module.lineToLine && resourceBuffer) {
                module._source = new LineToLineMappedSource(source, module.identifier(), asString(resourceBuffer));
            }
            else if (module.identifier && module.useSourceMap && sourceMap) {
                module._source = new SourceMapSource(source, module.identifier(), sourceMap);
            }
            else if (module.identifier) {
                module._source = new OriginalSource(source, module.identifier());
            }
            else {
                module._source = new RawSource(source);
            }
            return callback();
        });
    }

    disconnect() {
        this.built = false;
        super.disconnect();
    }

    build(options, compilation, resolver, fs, callback) {
        const _this = this;
        _this.buildTimestamp = new Date().getTime();
        _this.built = true;
        _this._source = null;
        _this.error = null;
        return _this.doBuild(options, compilation, resolver, fs, err => {
            _this.dependencies.length = 0;
            _this.variables.length = 0;
            _this.blocks.length = 0;
            _this._cachedSource = null;
            if (err) {
                return setError(err);
            }
            if (options.module && options.module.noParse) {
                function testRegExp(regExp) {
                    return typeof regExp === 'string'
                        ? _this.request.indexOf(regExp) === 0
                        : regExp.test(_this.request);
                }

                if (Array.isArray(options.module.noParse)) {
                    if (options.module.noParse.some(testRegExp, _this)) {
                        return callback();
                    }
                }
                else if (testRegExp.call(_this, options.module.noParse)) {
                    return callback();
                }
            }
            try {
                _this.parser.parse(_this._source.source(), {
                    current: _this,
                    module: _this,
                    compilation,
                    options
                });
            } catch (e) {
                const source = _this._source.source();
                return setError(_this.error = new ModuleParseError(_this, source, e));
            }
            return callback();
        });

        function setError(err) {
            _this.meta = null;
            if (_this.error) {
                _this.errors.push(_this.error);
                _this._source = new RawSource(`throw new Error(${JSON.stringify(_this.error.message)});`);
            }
            else {
                _this._source = new RawSource('throw new Error(\'Module build failed\');');
            }
            callback();
        }
    }

    source(dependencyTemplates, outputOptions, requestShortener) {
        let hash = crypto.createHash('md5');
        this.updateHash(hash);
        hash = hash.digest('hex');
        if (this._cachedSource && this._cachedSource.hash === hash) {
            return this._cachedSource.source;
        }
        const _source = this._source;
        if (!_source) {
            return new RawSource('throw new Error(\'No source available\');');
        }
        const source = new ReplaceSource(_source);
        this._cachedSource = {
            source,
            hash
        };
        const topLevelBlock = this;

        function doDep(dep) {
            const template = dependencyTemplates.get(dep.constructor);
            if (!template) {
                throw new Error(`No template for dependency: ${dep.constructor.name}`);
            }
            template.apply(dep, source, outputOptions, requestShortener, dependencyTemplates);
        }

        function doVariable(availableVars, vars, variable) {
            const name = variable.name;
            const expr = variable.expressionSource(dependencyTemplates, outputOptions, requestShortener);

            function isEqual(v) {
                return v.name === name && v.expression.source() === expr.source();
            }

            if (availableVars.some(isEqual)) {
                return;
            }
            vars.push({
                name,
                expression: expr
            });
        }

        function doBlock(availableVars, block) {
            block.dependencies.forEach(doDep);
            const vars = [];
            if (block.variables.length > 0) {
                block.variables.forEach(doVariable.bind(null, availableVars, vars));
                const varNames = [];
                const varExpressions = [];
                let varStartCode = '';
                let varEndCode = '';

                function emitFunction() {
                    if (varNames.length === 0) {
                        return;
                    }

                    varStartCode += `/* WEBPACK VAR INJECTION */(function(${varNames.join(', ')}) {`;
                    // exports === this in the topLevelBlock, but exports do compress better...
                    varEndCode = `${(topLevelBlock === block
                        ? '}.call(exports, '
                        : '}.call(this, ') + varExpressions.map(e => e.source()).join(', ')}))${varEndCode}`;

                    varNames.length = 0;
                    varExpressions.length = 0;
                }

                vars.forEach(v => {
                    if (varNames.includes(v.name)) {
                        emitFunction();
                    }
                    varNames.push(v.name);
                    varExpressions.push(v.expression);
                });
                emitFunction();
                const start = block.range ? block.range[0] : -10;
                const end = block.range ? block.range[1] : _source.size() + 1;
                if (varStartCode) {
                    source.insert(start + 0.5, varStartCode);
                }
                if (varEndCode) {
                    source.insert(end + 0.5, `\n/* WEBPACK VAR INJECTION */${varEndCode}`);
                }
            }
            block.blocks.forEach(doBlock.bind(null, availableVars.concat(vars)));
        }

        doBlock([], this);
        return new CachedSource(source);
    }

    needRebuild(fileTimestamps, contextTimestamps) {
        let timestamp = 0;
        this.fileDependencies.forEach(file => {
            const ts = fileTimestamps[file];
            if (!ts) {
                timestamp = Infinity;
            }
            if (ts > timestamp) {
                timestamp = ts;
            }
        });
        this.contextDependencies.forEach(context => {
            const ts = contextTimestamps[context];
            if (!ts) {
                timestamp = Infinity;
            }
            if (ts > timestamp) {
                timestamp = ts;
            }
        });
        return timestamp >= this.buildTimestamp;
    }

    size() {
        return this._source ? this._source.size() : -1;
    }

    updateHash(hash) {
        if (this._source) {
            hash.update('source');
            this._source.updateHash(hash);
        }
        else {
            hash.update('null');
        }
        hash.update('meta');
        hash.update(JSON.stringify(this.meta));
        super.updateHash(hash);
    }

    getSourceHash() {
        if (!this._source) {
            return '';
        }
        const hash = crypto.createHash('md5');
        hash.update(this._source.source());
        return hash.digest('hex');
    }

    getAllModuleDependencies() {
        const list = [];

        function doDep(dep) {
            if (dep.module && !list.includes(dep.module)) {
                list.push(dep.module);
            }
        }

        function doVariable(variable) {
            variable.dependencies.forEach(doDep);
        }

        function doBlock(block) {
            block.variables.forEach(doVariable);
            block.dependencies.forEach(doDep);
            block.blocks.forEach(doBlock);
        }

        doBlock(this);
        return list;
    }

    createTemplate(keepModules, roots) {
        roots.sort((a, b) => {
            const ia = a.identifier();
            const ib = b.identifier();
            if (ia < ib) {
                return -1;
            }
            if (ib < ia) {
                return 1;
            }
            return 0;
        });
        const template = new NormalModule('', '', '', [], '', null);
        template._source = this._source;
        template.built = this.built;
        template.templateModules = keepModules;
        template._templateOrigin = this;
        template.readableIdentifier = function () {
            return `template of ${this._templateOrigin.id} referencing ${keepModules.map(m => m.id).join(', ')}`;
        };
        template.identifier = () => {
            const array = roots.map(m => m.identifier());
            array.sort();
            return array.join('|');
        };
        var args = template.arguments = [];

        function doDeps(deps) {
            return deps.map(dep => {
                if (dep.module && !keepModules.includes(dep.module)) {
                    const argName = `__webpack_module_template_argument_${args.length}__`;
                    args.push(argName);
                    return new TemplateArgumentDependency(argName, dep);
                }
                else {
                    return dep;
                }
            });
        }

        function doBlock(block, newBlock) {
            block.variables.forEach(variable => {
                const newDependencies = doDeps(variable.dependencies);
                newBlock.addVariable(variable.name, variable.expression, newDependencies);
            });
            newBlock.dependencies = doDeps(block.dependencies);
            block.blocks.forEach(childBlock => {
                const newChildBlock = new AsyncDependenciesBlock(childBlock.name, childBlock.module, childBlock.loc);
                newBlock.addBlock(newChildBlock);
                doBlock(childBlock, newChildBlock);
            });
        }

        doBlock(this, template);
        return template;
    }

    getTemplateArguments(keepModules) {
        const list = [];

        function doDep(dep) {
            if (dep.module && !keepModules.includes(dep.module)) {
                list.push(dep.module);
            }
        }

        function doVariable(variable) {
            variable.dependencies.forEach(doDep);
        }

        function doBlock(block) {
            block.variables.forEach(doVariable);
            block.dependencies.forEach(doDep);
            block.blocks.forEach(doBlock);
        }

        doBlock(this);
        return list;
    }
}

export = NormalModule;

function contextify(options, request) {
    return request.split('!').map(r => {
        let rp = path.relative(options.context, r);
        if (path.sep === '\\') {
            rp = rp.replace(/\\/g, '/');
        }
        if (rp.indexOf('../') !== 0) {
            rp = `./${rp}`;
        }
        return rp;
    }).join('!');
}
