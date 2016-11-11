/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import async = require('async');

import objectAssign = require('object-assign');
import Tapable = require('tapable');
import NormalModule = require('./NormalModule');
import RawModule = require('./RawModule');
import Parser = require('./Parser');
import RuleSet = require('./RuleSet');

function loaderToIdent(data) {
    if (!data.options) {
        return data.loader;
    }
    if (typeof data.options === 'string') {
        return `${data.loader}?${data.options}`;
    }
    if (typeof data.options !== 'object') {
        throw new Error('loader options must be string or object');
    }
    if (data.options.ident) {
        return `${data.loader}??${data.options.ident}`;
    }
    return `${data.loader}?${JSON.stringify(data.options)}`;
}

type Loader = {
    loader: string,
    options: string
}

class NormalModuleFactory extends Tapable {
    ruleSet: RuleSet
    parserCache: {}

    constructor(public context: string = '', public resolvers, options) {
        super();
        this.ruleSet = new RuleSet(options.rules || options.loaders);
        this.parserCache = {};
        this.plugin('factory', function () {
            const self = this;
            return (result, callback) => {
                const resolver = self.applyPluginsWaterfall0('resolver', null);

                // Ignored
                if (!resolver) {
                    return callback();
                }

                resolver(result, function onDoneResolving(err, data) {
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

                    self.applyPluginsAsyncWaterfall('after-resolve', data, (err, result) => {
                        if (err) {
                            return callback(err);
                        }

                        // Ignored
                        if (!result) {
                            return callback();
                        }

                        let createdModule = self.applyPluginsBailResult('create-module', result);
                        if (!createdModule) {

                            if (!result.request) {
                                return callback(new Error('Empty dependency (no request)'));
                            }

                            createdModule = new NormalModule(result.request, result.userRequest, result.rawRequest, result.loaders, result.resource, result.parser);
                        }

                        createdModule = self.applyPluginsWaterfall0('module', createdModule);

                        return callback(null, createdModule);
                    });
                });
            };
        });
        this.plugin('resolver', () => {
            return (data, callback) => {
                const contextInfo = data.contextInfo;
                const context = data.context;
                const request = data.request;

                const noAutoLoaders = /^-?!/.test(request);
                const noPrePostAutoLoaders = /^!!/.test(request);
                const noPostAutoLoaders = /^-!/.test(request);
                let elements = request.replace(/^-?!+/, '').replace(/!!+/g, '!').split('!');
                let resource = elements.pop();
                elements = elements.map(element => {
                    const idx = element.indexOf('?');
                    let options;
                    if (idx >= 0) {
                        options = element.substr(idx + 1);
                        element = element.substr(0, idx);
                    }
                    return {
                        loader: element,
                        options
                    };
                });

                async.parallel([
                    callback => {
                        this.resolveRequestArray(contextInfo, context, elements, this.resolvers.loader, callback);
                    },
                    callback => {
                        if (resource === '' || resource[0] === '?') {
                            return callback(null, resource);
                        }
                        this.resolvers.normal.resolve(contextInfo, context, resource, (err, result) => {
                            if (err) {
                                return callback(err);
                            }
                            callback(null, result);
                        });
                    }
                ], (err, results: string[][]) => {
                    if (err) {
                        return callback(err);
                    }
                    let loaders = results[0];
                    resource = results[1];

                    if (resource === false) {
                        return callback(null, new RawModule('/* (ignored) */', `ignored ${context} ${request}`, `${request} (ignored)`));
                    } // ignored

                    const userRequest = loaders.map(loaderToIdent).concat([resource]).join('!');

                    let resourcePath = resource;
                    const queryIndex = resourcePath.indexOf('?');
                    if (queryIndex >= 0) {
                        resourcePath = resourcePath.substr(0, queryIndex);
                    }

                    const result = this.ruleSet.exec({
                        resource: resourcePath,
                        issuer: contextInfo.issuer
                    });
                    const settings: any = {};
                    const useLoadersPost = [];
                    const useLoaders = [];
                    const useLoadersPre = [];
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

                    const onDoneResolving = () => {
                        callback(null, {
                            context,
                            request: loaders.map(loaderToIdent).concat([resource]).join('!'),
                            dependencies: data.dependencies,
                            userRequest,
                            rawRequest: request,
                            loaders,
                            resource,
                            parser: this.getParser(settings.parser)
                        });
                    }

                    async.parallel([
                        this.resolveRequestArray.bind(this, contextInfo, this.context, useLoadersPost, this.resolvers.loader),
                        this.resolveRequestArray.bind(this, contextInfo, this.context, useLoaders, this.resolvers.loader),
                        this.resolveRequestArray.bind(this, contextInfo, this.context, useLoadersPre, this.resolvers.loader)
                    ], (err, results: string[][]) => {
                        if (err) {
                            return callback(err);
                        }
                        loaders = results[0].concat(loaders).concat(results[1]).concat(results[2]);
                        onDoneResolving();
                    });
                });
            };
        });
    }

    create(data, callback) {
        const self = this;
        const context = data.context || this.context;
        const dependencies = data.dependencies;
        const request = dependencies[0].request;
        const contextInfo = data.contextInfo || {};
        self.applyPluginsAsyncWaterfall('before-resolve', {
            contextInfo,
            context,
            request,
            dependencies
        }, (err, result) => {
            if (err) {
                return callback(err);
            }

            // Ignored
            if (!result) {
                return callback();
            }

            const factory = self.applyPluginsWaterfall0('factory', null);

            // Ignored
            if (!factory) {
                return callback();
            }

            factory(result, callback);
        });
    }

    resolveRequestArray(contextInfo, context, array, resolver, callback) {
        if (array.length === 0) {
            return callback(null, []);
        }
        async.map(array, function (item: Loader, callback: (err, ...args) => any) {
            resolver.resolve(contextInfo, context, item.loader, (err, result) => {
                if (err) {
                    return callback(err);
                }
                return callback(null, objectAssign({}, item, {
                    loader: result
                }));
            });
        }, callback);
    }

    getParser(parserOptions) {
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

    createParser(parserOptions) {
        const parser = new Parser({});
        this.applyPlugins('parser', parser, parserOptions || {});
        return parser;
    }
}

export = NormalModuleFactory;
