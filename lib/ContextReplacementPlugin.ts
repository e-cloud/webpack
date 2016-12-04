/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import path = require('path');
import ContextElementDependency = require('./dependencies/ContextElementDependency');
import Compiler = require('./Compiler')
import ContextModuleFactory = require('./ContextModuleFactory')
import ContextDependency = require('./dependencies/ContextDependency')
import {
    CMFAfterResolveResult, CMFBeforeResolveResult, ErrCallback,
    AbstractInputFileSystem
} from '../typings/webpack-types'
import * as Resolve from 'enhanced-resolve'

interface CreateContextMap {
    (fs: AbstractInputFileSystem, callback: (err: Error, recursive: boolean) => any): void
}

class ContextReplacementPlugin {
    newContentCallback: (result: CMFBeforeResolveResult | CMFAfterResolveResult) => void
    newContentCreateContextMap: CreateContextMap
    newContentRecursive: boolean
    newContentRegExp: RegExp
    newContentResource: string

    constructor(resourceRegExp: RegExp, newContentCallback: Function);
    constructor(resourceRegExp: RegExp, newContentResource: string, newContentCreateContext: Object);
    constructor(resourceRegExp: RegExp, newContentResource: string, newContentCreateContextMap: Function);
    constructor(resourceRegExp: RegExp, newContentRegExp: RegExp);
    constructor(resourceRegExp: RegExp, newContentRecursive: boolean, newContentRegExp: RegExp);
    constructor(resourceRegExp: RegExp, newContentResource: string, newContentRegExp: RegExp);
    constructor(
        resourceRegExp: RegExp, newContentResource: string, newContentRecursive: boolean,
        newContentRegExp: RegExp
    );

    constructor(
        public resourceRegExp: RegExp, newContentResource: any, newContentRecursive?: any,
        newContentRegExp?: any
    ) {
        if (typeof newContentResource === 'function') {
            this.newContentCallback = newContentResource;
        }
        else if (typeof newContentResource === 'string' && typeof newContentRecursive === 'object') {
            this.newContentResource = newContentResource;
            this.newContentCreateContextMap = (fs, callback) => {
                callback(null, newContentRecursive);
            };
        }
        else if (typeof newContentResource === 'string' && typeof newContentRecursive === 'function') {
            this.newContentResource = newContentResource;
            this.newContentCreateContextMap = newContentRecursive;
        }
        else {
            if (typeof newContentResource !== 'string') {
                newContentRegExp = newContentRecursive;
                newContentRecursive = newContentResource;
                newContentResource = undefined;
            }
            if (typeof newContentRecursive !== 'boolean') {
                newContentRegExp = newContentRecursive;
                newContentRecursive = undefined;
            }
            this.newContentResource = newContentResource;
            this.newContentRecursive = newContentRecursive;
            this.newContentRegExp = newContentRegExp;
        }
    }

    apply(compiler: Compiler) {
        const resourceRegExp = this.resourceRegExp;
        const newContentCallback = this.newContentCallback;
        const newContentResource = this.newContentResource;
        const newContentRecursive = this.newContentRecursive;
        const newContentRegExp = this.newContentRegExp;
        const newContentCreateContextMap = this.newContentCreateContextMap;
        compiler.plugin('context-module-factory', function (cmf: ContextModuleFactory) {
            cmf.plugin('before-resolve', (result: CMFBeforeResolveResult, callback) => {
                if (!result) {
                    return callback();
                }
                if (resourceRegExp.test(result.request)) {
                    if (typeof newContentResource !== 'undefined') {
                        result.request = newContentResource;
                    }
                    if (typeof newContentRecursive !== 'undefined') {
                        result.recursive = newContentRecursive;
                    }
                    if (typeof newContentRegExp !== 'undefined') {
                        result.regExp = newContentRegExp;
                    }
                    if (typeof newContentCallback === 'function') {
                        newContentCallback(result);
                    }
                    else {
                        result.dependencies.forEach(d => {
                            if (d.critical) {
                                d.critical = false;
                            }
                        });
                    }
                }
                return callback(null, result);
            });
            cmf.plugin('after-resolve', function (
                result: CMFAfterResolveResult, callback
            ) {
                if (!result) {
                    return callback();
                }
                if (resourceRegExp.test(result.resource)) {
                    if (typeof newContentResource !== 'undefined') {
                        result.resource = path.resolve(result.resource, newContentResource);
                    }
                    if (typeof newContentRecursive !== 'undefined') {
                        result.recursive = newContentRecursive;
                    }
                    if (typeof newContentRegExp !== 'undefined') {
                        result.regExp = newContentRegExp;
                    }
                    if (typeof newContentCreateContextMap === 'function') {
                        result.resolveDependencies = createResolveDependenciesFromContextMap(newContentCreateContextMap);
                    }
                    if (typeof newContentCallback === 'function') {
                        const origResource = result.resource;
                        newContentCallback(result);
                        if (result.resource !== origResource) {
                            result.resource = path.resolve(origResource, result.resource);
                        }
                    }
                    else {
                        result.dependencies.forEach(d => {
                            if (d.critical) {
                                d.critical = false;
                            }
                        });
                    }
                }
                return callback(null, result);
            });
        });
    }
}

export = ContextReplacementPlugin;

function createResolveDependenciesFromContextMap(createContextMap: CreateContextMap) {
    return function resolveDependenciesFromContextMap(
        fs: Resolve.CachedInputFileSystem,
        resource: string,
        recursive: boolean,
        regExp: RegExp,
        callback: ErrCallback
    ) {
        createContextMap(fs, (err, map) => {
            if (err) {
                return callback(err);
            }
            const dependencies = Object.keys(map).map(key => new ContextElementDependency(map[key], key));
            callback(null, dependencies);
        });
    };
}
