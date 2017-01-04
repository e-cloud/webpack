/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import path = require('path');
import { OriginalSource, RawSource } from 'webpack-sources'
import { WebpackOptions, TimeStampMap, ErrCallback } from '../typings/webpack-types'
import { SourceLocation } from 'estree'
import { AbstractInputFileSystem } from 'enhanced-resolve/lib/common-types'
import Module = require('./Module');
import AsyncDependenciesBlock = require('./AsyncDependenciesBlock');
import ModuleDependency = require('./dependencies/ModuleDependency');
import RequestShortener = require('./RequestShortener')
import Compilation = require('./Compilation')

class ContextModule extends Module {
    async: boolean
    builtTime: number
    cacheable: boolean
    contextDependencies: string[]
    dependencies: ModuleDependency[]
    useSourceMap: boolean

    constructor(
        public resolveDependencies: (
            fs: AbstractInputFileSystem,
            context: string,
            recursive: boolean,
            regExp: RegExp,
            callback: (err: Error, dependencies: ModuleDependency[]) => void
        ) => void,
        public context: string,
        public recursive: boolean,
        public regExp: RegExp,
        public addon: string,
        async: boolean
    ) {
        super();
        this.async = !!async;
        this.cacheable = true;
        this.contextDependencies = [context];
        this.built = false;
    }

    identifier() {
        let identifier = '';
        identifier += `${this.context} `;
        if (this.async) {
            identifier += 'async ';
        }
        if (!this.recursive) {
            identifier += 'nonrecursive ';
        }
        if (this.addon) {
            identifier += this.addon;
        }
        if (this.regExp) {
            identifier += this.regExp;
        }
        return identifier.replace(/ $/, '');
    }

    readableIdentifier(requestShortener: RequestShortener) {
        let identifier = '';
        identifier += `${requestShortener.shorten(this.context)} `;
        if (this.async) {
            identifier += 'async ';
        }
        if (!this.recursive) {
            identifier += 'nonrecursive ';
        }
        if (this.addon) {
            identifier += requestShortener.shorten(this.addon);
        }
        if (this.regExp) {
            identifier += prettyRegExp(`${this.regExp}`);
        }
        return identifier.replace(/ $/, '');
    }

    libIdent(
        options: {
            context: string
        }
    ) {
        let identifier = `${contextify(options, this.context)} `;
        if (this.async) {
            identifier += 'async ';
        }
        if (this.recursive) {
            identifier += 'recursive ';
        }
        if (this.addon) {
            identifier += contextify(options, this.addon);
        }
        if (this.regExp) {
            identifier += prettyRegExp(`${this.regExp}`)
        }
        return identifier.replace(/ $/, '');
    }

    needRebuild(fileTimestamps: TimeStampMap, contextTimestamps: TimeStampMap) {
        const ts = contextTimestamps[this.context];
        if (!ts) {
            return true;
        }
        return ts >= this.builtTime;
    }

    unbuild() {
        this.built = false;
        super.unbuild();
    }

    build(
        options: WebpackOptions, compilation: Compilation, resolver: any, fs: AbstractInputFileSystem,
        callback: ErrCallback
    ) {
        this.built = true;
        this.builtTime = new Date().getTime();
        const addon = this.addon;
        this.resolveDependencies(fs, this.context, this.recursive, this.regExp, (err, dependencies) => {
            if (err) {
                return callback(err);
            }
            if (dependencies) {
                dependencies.forEach(dep => {
                    dep.loc = dep.userRequest;
                    dep.request = addon + dep.request;
                });
            }
            if (this.async) {
                if (dependencies) {
                    dependencies.forEach(function (dep) {
                        const block = new AsyncDependenciesBlock(null, dep.module, dep.loc as SourceLocation);
                        block.addDependency(dep);
                        this.addBlock(block);
                    }, this);
                }
            }
            else {
                this.dependencies = dependencies;
            }
            return callback();
        });
    }

    source() {
        let str;
        const map = {};
        if (this.dependencies && this.dependencies.length > 0) {
            this.dependencies.slice().sort((a, b) => {
                if (a.userRequest === b.userRequest) {
                    return 0;
                }
                return a.userRequest < b.userRequest ? -1 : 1;
            }).forEach(dep => {
                if (dep.module) {
                    map[dep.userRequest] = dep.module.id;
                }
            });
            str = [
                'var map = ',
                JSON.stringify(map, null, '\t'),
                ';\n',
                'function webpackContext(req) {\n',
                '\treturn __webpack_require__(webpackContextResolve(req));\n',
                '};\n',
                'function webpackContextResolve(req) {\n',
                '\tvar id = map[req];\n',
                '\tif(!(id + 1)) // check for number\n',
                '\t\tthrow new Error("Cannot find module \'" + req + "\'.");\n',
                '\treturn id;\n',
                '};\n',
                'webpackContext.keys = function webpackContextKeys() {\n',
                '\treturn Object.keys(map);\n',
                '};\n',
                'webpackContext.resolve = webpackContextResolve;\n',
                'module.exports = webpackContext;\n',
                `webpackContext.id = ${JSON.stringify(this.id)};\n`
            ];
        }
        else if (this.blocks && this.blocks.length > 0) {
            const items = this.blocks.map(block => ({
                dependency: block.dependencies[0],
                block,
                userRequest: block.dependencies[0].userRequest
            })).filter(item => item.dependency.module);
            let hasMultipleChunks = false;
            items.sort((a, b) => {
                if (a.userRequest === b.userRequest) {
                    return 0;
                }
                return a.userRequest < b.userRequest ? -1 : 1;
            }).forEach(item => {
                if (item.dependency.module) {
                    const chunks = item.block.chunks || [];
                    if (chunks.length !== 1) {
                        hasMultipleChunks = true;
                    }
                    map[item.userRequest] = [item.dependency.module.id].concat(chunks.map(chunk => chunk.id));
                }
            });
            str = [
                'var map = ',
                JSON.stringify(map, null, '\t'),
                ';\n',
                'function webpackAsyncContext(req) {\n',
                '\tvar ids = map[req];',
                '\tif(!ids)\n',
                '\t\treturn Promise.reject(new Error("Cannot find module \'" + req + "\'."));\n',
                '\treturn ',
                hasMultipleChunks
                    ? 'Promise.all(ids.slice(1).map(__webpack_require__.e))'
                    : '__webpack_require__.e(ids[1])',
                '.then(function() {\n',
                '\t\treturn __webpack_require__(ids[0]);\n',
                '\t});\n',
                '};\n',
                'webpackAsyncContext.keys = function webpackAsyncContextKeys() {\n',
                '\treturn Object.keys(map);\n',
                '};\n',
                'module.exports = webpackAsyncContext;\n',
                `webpackAsyncContext.id = ${JSON.stringify(this.id)};\n`
            ];
        }
        else {
            str = [
                'function webpackEmptyContext(req) {\n',
                '\tthrow new Error("Cannot find module \'" + req + "\'.");\n',
                '}\n',
                'webpackEmptyContext.keys = function() { return []; };\n',
                'webpackEmptyContext.resolve = webpackEmptyContext;\n',
                'module.exports = webpackEmptyContext;\n',
                `webpackEmptyContext.id = ${JSON.stringify(this.id)};\n`
            ];
        }
        if (this.useSourceMap) {
            return new OriginalSource(str.join(''), this.identifier());
        }
        else {
            return new RawSource(str.join(''));
        }
    }

    size() {
        return this.dependencies.map(dep => dep.userRequest.length + 5)
            .reduce((a, b) => a + b, 160);
    }
}

export = ContextModule;

function prettyRegExp(str: string) {
    return str.substring(1, str.length - 1);
}

function contextify(
    options: {
        context: string
    }, request: string
) {
    return request.split('!').map(function (r) {
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
