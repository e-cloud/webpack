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

class NormalModuleFactory extends Tapable {
    constructor(context, resolvers, options) {
        super();
        this.resolvers = resolvers;
        this.ruleSet = new RuleSet(options.rules || options.loaders);
        this.context = context || '';
        this.parserCache = {};
        this.plugin('factory', function () {
            const _this = this;
            return function (result, callback) {
                const resolver = _this.applyPluginsWaterfall0('resolver', null);

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

                    _this.applyPluginsAsyncWaterfall('after-resolve', data, function (err, result) {
                        if (err) {
                            return callback(err);
                        }

                        // Ignored
                        if (!result) {
                            return callback();
                        }

                        let createdModule = _this.applyPluginsBailResult('create-module', result);
                        if (!createdModule) {

                            if (!result.request) {
                                return callback(new Error('Empty dependency (no request)'));
                            }

                            createdModule = new NormalModule(result.request, result.userRequest, result.rawRequest, result.loaders, result.resource, result.parser);
                        }

                        createdModule = _this.applyPluginsWaterfall0('module', createdModule);

                        return callback(null, createdModule);
                    });
                });
            };
        });
        this.plugin('resolver', function () {
            const _this = this;
            return function (data, callback) {
                const contextInfo = data.contextInfo;
                const context = data.context;
                const request = data.request;

                const noAutoLoaders = /^-?!/.test(request);
                const noPrePostAutoLoaders = /^!!/.test(request);
                const noPostAutoLoaders = /^-!/.test(request);
                let elements = request.replace(/^-?!+/, '').replace(/!!+/g, '!').split('!');
                let resource = elements.pop();
                elements = elements.map(function (element) {
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
                    function (callback) {
                        _this.resolveRequestArray(contextInfo, context, elements, _this.resolvers.loader, callback);
                    }, function (callback) {
                        if (resource === '' || resource[0] === '?') {
                            return callback(null, resource);
                        }
                        _this.resolvers.normal.resolve(contextInfo, context, resource, function (err, result) {
                            if (err) {
                                return callback(err);
                            }
                            callback(null, result);
                        });
                    }
                ], function (err, results) {
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

                    const result = _this.ruleSet.exec({
                        resource: resourcePath,
                        issuer: contextInfo.issuer
                    });
                    const settings = {};
                    const useLoadersPost = [];
                    const useLoaders = [];
                    const useLoadersPre = [];
                    result.forEach(function (r) {
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
                        _this.resolveRequestArray.bind(_this, contextInfo, _this.context, useLoadersPost, _this.resolvers.loader),
                        _this.resolveRequestArray.bind(_this, contextInfo, _this.context, useLoaders, _this.resolvers.loader),
                        _this.resolveRequestArray.bind(_this, contextInfo, _this.context, useLoadersPre, _this.resolvers.loader)
                    ], function (err, results) {
                        if (err) {
                            return callback(err);
                        }
                        loaders = results[0].concat(loaders).concat(results[1]).concat(results[2]);
                        onDoneResolving();
                    });

                    function onDoneResolving() {
                        callback(null, {
                            context,
                            request: loaders.map(loaderToIdent).concat([resource]).join('!'),
                            dependencies: data.dependencies,
                            userRequest,
                            rawRequest: request,
                            loaders,
                            resource,
                            parser: _this.getParser(settings.parser)
                        });
                    }
                });
            };
        });
    }

    create(data, callback) {
        const _this = this;
        const context = data.context || this.context;
        const dependencies = data.dependencies;
        const request = dependencies[0].request;
        const contextInfo = data.contextInfo || {};
        _this.applyPluginsAsyncWaterfall('before-resolve', {
            contextInfo,
            context,
            request,
            dependencies
        }, function (err, result) {
            if (err) {
                return callback(err);
            }

            // Ignored
            if (!result) {
                return callback();
            }

            const factory = _this.applyPluginsWaterfall0('factory', null);

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
        async.map(array, function (item, callback) {
            resolver.resolve(contextInfo, context, item.loader, function (err, result) {
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
        const parser = new Parser();
        this.applyPlugins('parser', parser, parserOptions || {});
        return parser;
    }
}

export = NormalModuleFactory;
