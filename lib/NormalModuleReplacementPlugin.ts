/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */

import path = require('path');
import Compiler = require('./Compiler')

class NormalModuleReplacementPlugin {
    constructor(public resourceRegExp: RegExp, public newResource: string) {
    }

    apply(compiler: Compiler) {
        const resourceRegExp = this.resourceRegExp;
        const newResource = this.newResource;
        compiler.plugin('normal-module-factory', function (nmf) {
            nmf.plugin('before-resolve', function (result, callback) {
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
            nmf.plugin('after-resolve', function (result, callback) {
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
