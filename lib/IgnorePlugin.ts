/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import Compiler = require('./Compiler')
import NormalModuleFactory = require('./NormalModuleFactory')
import ContextModuleFactory = require('./ContextModuleFactory')

class IgnorePlugin {
    constructor(public resourceRegExp: RegExp, public contextRegExp: RegExp) {
    }

    apply(compiler: Compiler) {
        const resourceRegExp = this.resourceRegExp;
        const contextRegExp = this.contextRegExp;
        compiler.plugin('normal-module-factory', function (nmf: NormalModuleFactory) {
            nmf.plugin('before-resolve', function (result, callback) {
                if (!result) {
                    return callback();
                }
                if (resourceRegExp.test(result.request) && (!contextRegExp || contextRegExp.test(result.context))) {
                    return callback();
                }
                return callback(null, result);
            });
        });
        compiler.plugin('context-module-factory', function (cmf: ContextModuleFactory) {
            cmf.plugin('before-resolve', function (result, callback) {
                if (!result) {
                    return callback();
                }
                if (resourceRegExp.test(result.request)) {
                    return callback();
                }
                return callback(null, result);
            });
        });
    }
}

export = IgnorePlugin;
