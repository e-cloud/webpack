/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import path = require('path');
import { AbstractInputFileSystem } from 'enhanced-resolve/lib/common-types'
import { OriginalSource, RawSource } from 'webpack-sources'
import { ErrCallback, TimeStampMap, WebpackOptions } from '../typings/webpack-types'
import Module = require('./Module');
import AsyncDependenciesBlock = require('./AsyncDependenciesBlock');
import ModuleDependency = require('./dependencies/ModuleDependency');
import RequestShortener = require('./RequestShortener')
import Compilation = require('./Compilation')
import Resolver = require('enhanced-resolve/lib/Resolver')
import Dependency = require('./Dependency')
import DependenciesBlock = require('./DependenciesBlock')

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
        isAsync: boolean
    ) {
        super();
        this.async = !!isAsync;
        this.cacheable = true;
        this.contextDependencies = [context];
        this.built = false;
    }

    prettyRegExp(regexString: string) {
        // remove the "/" at the front and the beginning
        // "/foo/" -> "foo"
        return regexString.substring(1, regexString.length - 1);
    }

    contextify(context: string, request: string) {
        return request.split('!')
            .map(subrequest => {
                let rp = path.relative(context, subrequest);
                if (path.sep === '\\') {
                    rp = rp.replace(/\\/g, '/');
                }
                if (rp.indexOf('../') !== 0) {
                    rp = './' + rp;
                }
                return rp;
            })
            .join('!');
    }

    identifier() {
        let identifier = this.context;
        if (this.async) {
            identifier += ' async';
        }
        if (!this.recursive) {
            identifier += ' nonrecursive';
        }
        if (this.addon) {
            identifier += ` ${this.addon}`;
        }
        if (this.regExp) {
            identifier += ` ${this.regExp}`;
        }

        return identifier;
    }

    readableIdentifier(requestShortener: RequestShortener) {
        let identifier = requestShortener.shorten(this.context);
        if (this.async) {
            identifier += ' async';
        }
        if (!this.recursive) {
            identifier += ' nonrecursive';
        }
        if (this.addon) {
            identifier += ` ${requestShortener.shorten(this.addon)}`;
        }
        if (this.regExp) {
            identifier += ` ${this.prettyRegExp(this.regExp + '')}`;
        }

        return identifier;
    }

    libIdent(options: { context: string }) {
        let identifier = this.contextify(options.context, this.context);
        if (this.async) {
            identifier += ' async';
        }
        if (this.recursive) {
            identifier += ' recursive';
        }
        if (this.addon) {
            identifier += ` ${this.contextify(options.context, this.addon)}`;
        }
        if (this.regExp) {
            identifier += ` ${this.prettyRegExp(this.regExp + '')}`;
        }

        return identifier;
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
        options: WebpackOptions,
        compilation: Compilation,
        resolver: Resolver,
        fs: AbstractInputFileSystem,
        callback: ErrCallback
    ) {
        this.built = true;
        this.builtTime = new Date().getTime();
        this.resolveDependencies(fs, this.context, this.recursive, this.regExp, (err, dependencies) => {
            if (err) return callback(err);

            if (!dependencies) {
                this.dependencies = [];
                callback();
                return;
            }

            // enhance dependencies
            dependencies.forEach(dep => {
                dep.loc = dep.userRequest;
                dep.request = this.addon + dep.request;
            });

            // if these we are not a async context
            // add dependencies and continue
            if (!this.async) {
                this.dependencies = dependencies;
                callback();
                return;
            }

            // if we are async however create a new async dependency block
            // and add that block to this context
            dependencies.forEach(dep => {
                // todo: here indicate all deps' loc are string or sourcelocation
                const block = new AsyncDependenciesBlock(null, dep.module, dep.loc);
                block.addDependency(dep);
                this.addBlock(block);
            });
            callback();
        });
    }

    getSourceWithDependencies(dependencies: Dependency[], id: number) {
        // if we filter first we get a new array
        // therefor we dont need to create a clone of dependencies explicitly
        // therefore the order of this is !important!
        const map = dependencies
            .filter(dependency => dependency.module)
            .sort((a, b) => {
                if (a.userRequest === b.userRequest) {
                    return 0;
                }
                return a.userRequest < b.userRequest ? -1 : 1;
            }).reduce(function (map, dep) {
                map[dep.userRequest] = dep.module.id;
                return map;
            }, Object.create(null));
        return `var map = ${JSON.stringify(map, null, '\t')};
function webpackContext(req) {
	return __webpack_require__(webpackContextResolve(req));
};
function webpackContextResolve(req) {
	var id = map[req];
	if(!(id + 1)) // check for number or string
		throw new Error("Cannot find module '" + req + "'.");
	return id;
};
webpackContext.keys = function webpackContextKeys() {
	return Object.keys(map);
};
webpackContext.resolve = webpackContextResolve;
module.exports = webpackContext;
webpackContext.id = ${JSON.stringify(id)};`;
    }

    getSourceWithBlocks(blocks: DependenciesBlock[], id: number) {
        let hasMultipleOrNoChunks = false;
        const map = blocks
            .filter(block => block.dependencies[0].module)
            .map((block) => ({
                dependency: block.dependencies[0],
                block: block,
                userRequest: block.dependencies[0].userRequest
            })).sort((a, b) => {
                if (a.userRequest === b.userRequest) return 0;
                return a.userRequest < b.userRequest ? -1 : 1;
            }).reduce((map, item) => {
                const chunks = item.block.chunks || [];
                if (chunks.length !== 1) {
                    hasMultipleOrNoChunks = true;
                }
                map[item.userRequest] = [item.dependency.module.id]
                    .concat(chunks.map(chunk => chunk.id));

                return map;
            }, Object.create(null));

        const requestPrefix = hasMultipleOrNoChunks
            ? 'Promise.all(ids.slice(1).map(__webpack_require__.e))'
            : '__webpack_require__.e(ids[1])';

        return `var map = ${JSON.stringify(map, null, '\t')};
function webpackAsyncContext(req) {
	var ids = map[req];
	if(!ids)
		return Promise.reject(new Error("Cannot find module '" + req + "'."));
	return ${requestPrefix}.then(function() {
		return __webpack_require__(ids[0]);
	});
};
webpackAsyncContext.keys = function webpackAsyncContextKeys() {
	return Object.keys(map);
};
module.exports = webpackAsyncContext;
webpackAsyncContext.id = ${JSON.stringify(id)};`;
    }

    getSourceForEmptyContext(id: number) {
        return `function webpackEmptyContext(req) {
	throw new Error("Cannot find module '" + req + "'.");
}
webpackEmptyContext.keys = function() { return []; };
webpackEmptyContext.resolve = webpackEmptyContext;
module.exports = webpackEmptyContext;
webpackEmptyContext.id = ${JSON.stringify(id)};`;
    }

    getSourceString() {
        if (this.dependencies && this.dependencies.length > 0) {
            return this.getSourceWithDependencies(this.dependencies, this.id);
        }

        if (this.blocks && this.blocks.length > 0) {
            return this.getSourceWithBlocks(this.blocks, this.id);
        }

        return this.getSourceForEmptyContext(this.id);
    }

    getSource(sourceString: string) {
        if (this.useSourceMap) {
            return new OriginalSource(sourceString, this.identifier());
        }
        return new RawSource(sourceString);
    }

    source() {
        return this.getSource(
            this.getSourceString()
        );
    }

    size() {
        // base penalty
        const initialSize = 160;

        // if we dont have dependencies we stop here.
        return this.dependencies
            .reduce((size, dependency) => size + 5 + dependency.userRequest.length, initialSize);
    }
}

export = ContextModule;
