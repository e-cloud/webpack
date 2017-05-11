/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import Compiler = require('./Compiler')
import NormalModuleFactory = require('./NormalModuleFactory')
import ContextModuleFactory = require('./ContextModuleFactory')
import { CMFBeforeResolveResult, NMFBeforeResolveResult } from '../typings/webpack-types';

class IgnorePlugin {
    constructor(public resourceRegExp: RegExp, public contextRegExp: RegExp) {
    }

    /*
     * Only returns true if a "resourceRegExp" exists
     * and the resource given matches the regexp.
     */
    checkResource(resource: string) {
        if (!this.resourceRegExp) {
            return false;
        }

        return this.resourceRegExp.test(resource);
    }

    /*
     * Returns true if contextRegExp does not exist
     * or if context matches the given regexp.
     */
    checkContext(context: string) {
        if (!this.contextRegExp) {
            return true;
        }
        return this.contextRegExp.test(context);
    }

    /*
     * Returns true if result should be ignored.
     * false if it shouldn't.
     *
     * Not that if "contextRegExp" is given, both the "resourceRegExp"
     * and "contextRegExp" have to match.
     */
    checkResult(result: NMFBeforeResolveResult | CMFBeforeResolveResult) {
        if (!result) {
            return true;
        }
        return this.checkResource(result.request) && this.checkContext(result.context);
    }

    checkIgnore(result: NMFBeforeResolveResult | CMFBeforeResolveResult, callback) {
        // check if result is ignored
        if (this.checkResult(result)) {
            return callback();
        }
        return callback(null, result);
    }

    apply(compiler: Compiler) {
        compiler.plugin('normal-module-factory', (nmf: NormalModuleFactory) => {
            nmf.plugin('before-resolve', (result: NMFBeforeResolveResult, callback) => {
                this.checkIgnore(result, callback);
            });
        });
        compiler.plugin('context-module-factory', (cmf: ContextModuleFactory) => {
            cmf.plugin('before-resolve', (result: CMFBeforeResolveResult, callback) => {
                this.checkIgnore(result, callback);
            });
        });
    }
}

export = IgnorePlugin;
