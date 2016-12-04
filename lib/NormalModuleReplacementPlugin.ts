/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */

import path = require('path');
import Compiler = require('./Compiler')
import NormalModuleFactory = require('./NormalModuleFactory')
import { NMFAfterResolveResult, NMFBeforeResolveResult } from '../typings/webpack-types'

class NormalModuleReplacementPlugin {
    constructor(public resourceRegExp: RegExp, public newResource: string) {
    }

    apply(compiler: Compiler) {
        const resourceRegExp = this.resourceRegExp;
        const newResource = this.newResource;
        compiler.plugin('normal-module-factory', function (nmf: NormalModuleFactory) {
            nmf.plugin('before-resolve', function (result: NMFBeforeResolveResult, callback) {
                if (!result) {
                    return callback();
                }
                if (resourceRegExp.test(result.request)) {
                    if (typeof newResource === 'function') {
                        newResource(result);
                    }
                    else {
                        result.request = newResource;
                    }
                }
                return callback(null, result);
            });
            nmf.plugin('after-resolve', function (result: NMFAfterResolveResult, callback) {
                if (!result) {
                    return callback();
                }
                if (resourceRegExp.test(result.resource)) {
                    if (typeof newResource === 'function') {
                        newResource(result);
                    }
                    else {
                        result.resource = path.resolve(path.dirname(result.resource), newResource);
                    }
                }
                return callback(null, result);
            });
        });
    }
}

export = NormalModuleReplacementPlugin;
