/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import async = require('async');
import Tapable = require('tapable');
import NormalModule = require('./NormalModule');
import RawModule = require('./RawModule');
import Parser = require('./Parser');
import RuleSet = require('./RuleSet');
import { ResolveContext, ResolveError } from 'enhanced-resolve/lib/common-types';
import {
    ErrCallback,
    ModuleOptions,
    NMFAfterResolveResult,
    NMFBeforeResolveResult,
    ParserOptions
} from '../typings/webpack-types';
import Dependency = require('./Dependency')
import Module = require('./Module')
import Resolver = require('enhanced-resolve/lib/Resolver')
import Compiler = require('./Compiler')

function loaderToIdent(data: Loader) {
    if (!data.options) {
        return data.loader;
    }
    if (typeof data.options === 'string') {
        return `${data.loader}?${data.options}`;
    }
    if (typeof data.options !== 'object') {
        throw new Error('loader options must be string or object');
    }
    if (data.ident) {
        return `${data.loader}??${data.ident}`;
    }
    return `${data.loader}?${JSON.stringify(data.options)}`;
}

type Loader = {
    loader: string,
    options?: string | {
        ident: string
    }
}

interface NotRawModule {
    context: string
    dependencies: Dependency[]
    loaders: Loader[]
    parser: Parser
    rawRequest: string
    request: string
    resource: string
    source?: never
    userRequest: string
    resourceResolveData
}

function identToLoaderRequest(resultString: string) {
    const idx = resultString.indexOf('?');
    if (idx >= 0) {
        const options = resultString.substr(idx + 1);
        resultString = resultString.substr(0, idx);

        return {
            loader: resultString,
            options: options
        };
    }
    else {
        return {
            loader: resultString
        };
    }
}

class NormalModuleFactory extends Tapable {
    ruleSet: RuleSet;
    parserCache: Dictionary<Parser>;
    cachePredicate: (val: Module) => boolean;

    constructor(public context = '', public resolvers: Compiler.Resolvers, options: ModuleOptions) {
        super();
        this.ruleSet = new RuleSet(options.rules || options.loaders);
        this.cachePredicate = typeof options.unsafeCache === 'function'
            ? options.unsafeCache
            : Boolean.bind(null, options.unsafeCache);
        this.parserCache = {};
        this.plugin('factory', function () {
            return (result: NMFBeforeResolveResult, callback: ErrCallback) => {
                const resolver = this.applyPluginsWaterfall0('resolver', null);

                // Ignored
                if (!resolver) {
                    return callback();
                }

                resolver(result, (err: ResolveError, data: RawModule | NotRawModule) => {
                    if (err) {
                        return callback(err);
                    }

                    // Ignored
                    if (!data) {
                        return callback();
                    }

                    // direct module
                    if (typeof data.source === 'function') {
                        return callback(null, data);
                    }

                    this.applyPluginsAsyncWaterfall('after-resolve', data, (err, result: NMFAfterResolveResult) => {
                        if (err) {
                            return callback(err);
                        }

                        // Ignored
                        if (!result) {
                            return callback();
                        }

                        let createdModule = this.applyPluginsBailResult('create-module', result);
                        if (!createdModule) {

                            if (!result.request) {
                                return callback(new Error('Empty dependency (no request)'));
                            }

                            createdModule = new NormalModule(result.request, result.userRequest, result.rawRequest, result.loaders, result.resource, result.parser);
                        }

                        createdModule = this.applyPluginsWaterfall0('module', createdModule);

                        return callback(null, createdModule);
                    });
                });
            };
        });
        this.plugin('resolver', () => {
            return (data: NMFBeforeResolveResult, callback: (err: Error, data?: RawModule | NotRawModule) => void) => {
                const contextInfo = data.contextInfo;
                const context = data.context;
                const request = data.request;

                const noAutoLoaders = /^-?!/.test(request);
                const noPrePostAutoLoaders = /^!!/.test(request);
                const noPostAutoLoaders = /^-!/.test(request);
                const elements = request.replace(/^-?!+/, '')
                    .replace(/!!+/g, '!')
                    .split('!');
                let resource: any = elements.pop();
                const loaderMap = elements.map(identToLoaderRequest);

                async.parallel([
                    callback => this.resolveRequestArray(contextInfo, context, loaderMap, this.resolvers.loader, callback),
                    callback => {
                        if (resource === '' || resource[0] === '?') {
                            return callback(null, {
                                resource
                            });
                        }
                        this.resolvers.normal.resolve(
                            contextInfo,
                            context,
                            resource,
                            (err: ResolveError, resource: string | boolean, resourceResolveData) => {
                                if (err) {
                                    return callback(err);
                                }
                                callback(null, {
                                    resourceResolveData,
                                    resource,
                                });
                            });
                    }
                ], (err: ResolveError, results: [any, { resource: string | boolean, resourceResolveData }]) => {
                    if (err) {
                        return callback(err);
                    }
                    let loaders = results[0] as Loader[];
                    const resourceResolveData = results[1].resourceResolveData;
                    resource = results[1].resource as string | boolean;

                    // translate option idents
                    try {
                        loaders.forEach((item: Loader) => {
                            const options = item.options;
                            if (typeof options === 'string' && /^\?/.test(options)) {
                                item.options = this.ruleSet.findOptionsByIdent(options.substr(1));
                            }
                        });
                    } catch (e) {
                        return callback(e);
                    }

                    if (resource === false) {
                        // ignored
                        return callback(null,
                            new RawModule(
                                '/* (ignored) */',
                                `ignored ${context} ${request}`,
                                `${request} (ignored)`
                            )
                        );
                    }

                    const userRequest = loaders.map(loaderToIdent).concat([resource]).join('!');

                    let resourcePath: string = resource;
                    let resourceQuery = '';
                    const queryIndex = resourcePath.indexOf('?');
                    if (queryIndex >= 0) {
                        resourceQuery = resourcePath.substr(queryIndex);
                        resourcePath = resourcePath.substr(0, queryIndex);
                    }

                    const result = this.ruleSet.exec({
                        resource: resourcePath,
                        resourceQuery: resourceQuery,
                        issuer: contextInfo.issuer,
                        compiler: contextInfo.compiler
                    });
                    const settings: any = {};
                    const useLoadersPost: Loader[] = [];
                    const useLoaders: Loader[] = [];
                    const useLoadersPre: Loader[] = [];
                    result.forEach(r => {
                        if (r.type === 'use') {
                            if (r.enforce === 'post' && !noPostAutoLoaders && !noPrePostAutoLoaders) {
                                useLoadersPost.push(r.value);
                            }
                            else if (r.enforce === 'pre' && !noPrePostAutoLoaders) {
                                useLoadersPre.push(r.value);
                            }
                            else if (!r.enforce && !noAutoLoaders && !noPrePostAutoLoaders) {
                                useLoaders.push(r.value);
                            }
                        }
                        else {
                            settings[r.type] = r.value;
                        }
                    });

                    async.parallel([
                        this.resolveRequestArray.bind(this, contextInfo, this.context, useLoadersPost, this.resolvers.loader),
                        this.resolveRequestArray.bind(this, contextInfo, this.context, useLoaders, this.resolvers.loader),
                        this.resolveRequestArray.bind(this, contextInfo, this.context, useLoadersPre, this.resolvers.loader)
                    ], (err: Error, results: Loader[][]) => {
                        if (err) {
                            return callback(err);
                        }
                        loaders = results[0].concat(loaders, results[1], results[2]);

                        process.nextTick(() => {
                            callback(null, {
                                context,
                                request: loaders.map(loaderToIdent).concat([resource]).join('!'),
                                dependencies: data.dependencies,
                                userRequest,
                                rawRequest: request,
                                loaders,
                                resource,
                                resourceResolveData,
                                parser: this.getParser(settings.parser)
                            });
                        });
                    });
                });
            };
        });
    }

    create(data: {
        context: string
        dependencies: [NormalModule]
        contextInfo: {
            issuer: string
            compiler: string
        }
    }, callback: ErrCallback) {
        const dependencies = data.dependencies;
        const cacheEntry = dependencies[0].__NormalModuleFactoryCache;
        if (cacheEntry) {
            return callback(null, cacheEntry);
        }
        const context = data.context || this.context;
        const request = dependencies[0].request;
        const contextInfo = data.contextInfo || {};
        this.applyPluginsAsyncWaterfall('before-resolve', {
            contextInfo,
            context,
            request,
            dependencies
        }, (err, result: NMFBeforeResolveResult) => {
            if (err) {
                return callback(err);
            }

            // Ignored
            if (!result) {
                return callback();
            }

            const factory = this.applyPluginsWaterfall0('factory', null);

            // Ignored
            if (!factory) {
                return callback();
            }

            factory(result, (err: Error, module: Module) => {
                if (err) {
                    return callback(err);
                }

                if (module && this.cachePredicate(module)) {
                    dependencies.forEach(function (d) {
                        d.__NormalModuleFactoryCache = module;
                    });
                }

                callback(null, module);
            });
        });
    }

    resolveRequestArray(
        contextInfo: ResolveContext,
        context: string,
        array: Loader[],
        resolver: Resolver,
        callback: ErrCallback
    ) {
        if (array.length === 0) {
            return callback(null, []);
        }
        async.map(array, function (item: Loader, callback: ErrCallback) {
            resolver.resolve(contextInfo, context, item.loader, (err: Error, result: string) => {
                if (err && /^[^/]*$/.test(item.loader) && !/-loader$/.test(item.loader)) {
                    return resolver.resolve(contextInfo, context, `${item.loader}-loader`, function (err2: Error) {
                        if (!err2) {
                            err.message = `${err.message}
BREAKING CHANGE: It's no longer allowed to omit the '-loader' suffix when using loaders.
                 You need to specify '${item.loader}-loader' instead of '${item.loader}',
                 see https://webpack.js.org/guides/migrating/#automatic-loader-module-name-extension-removed`;
                        }
                        callback(err);
                    });
                }
                if (err) {
                    return callback(err);
                }
                const optionsOnly = item.options ? {
                    options: item.options
                } : undefined;
                return callback(null, Object.assign({}, item, identToLoaderRequest(result), optionsOnly));

            });
        }, callback);
    }

    getParser(parserOptions: ParserOptions) {
        let ident = 'null';
        if (parserOptions) {
            if (parserOptions.ident) {
                ident = parserOptions.ident;
            }
            else {
                ident = JSON.stringify(parserOptions);
            }
        }
        const parser = this.parserCache[ident];
        if (parser) {
            return parser;
        }
        return this.parserCache[ident] = this.createParser(parserOptions);
    }

    createParser(parserOptions: ParserOptions) {
        const parser = new Parser({});
        this.applyPlugins2('parser', parser, parserOptions || {});
        return parser;
    }
}

export = NormalModuleFactory;
