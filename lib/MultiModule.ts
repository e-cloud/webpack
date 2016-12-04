/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import { RawSource } from 'webpack-sources'
import { WebpackOutputOptions, ErrCallback } from '../typings/webpack-types'
import { Hash } from 'crypto'
import Module = require('./Module');
import ModuleDependency = require('./dependencies/ModuleDependency')
import ArrayMap = require('./ArrayMap')

class MultiModule extends Module {
    cacheable: boolean

    constructor(public context: string, public dependencies: ModuleDependency[], public name: string) {
        super();
        this.built = false;
        this.cacheable = true;
    }

    identifier() {
        return `multi ${this.name}`;
    }

    readableIdentifier() {
        return `multi ${this.name}`;
    }

    disconnect() {
        this.built = false;
        super.disconnect();
    }

    build(options: any, compilation: any, resolver: any, fs: any, callback: ErrCallback) {
        this.built = true;
        return callback();
    }

    source(dependencyTemplates: ArrayMap, outputOptions: WebpackOutputOptions) {
        const str: string[] = [];
        this.dependencies.forEach(function (dep, idx) {
            if (dep.module) {
                if (idx === this.dependencies.length - 1) {
                    str.push('module.exports = ');
                }
                str.push('__webpack_require__(');
                if (outputOptions.pathinfo) {
                    str.push(`/*! ${dep.request} */`);
                }
                str.push(`${JSON.stringify(dep.module.id)}`);
                str.push(')');
            }
            else {
                str.push('(function webpackMissingModule() { throw new Error(');
                str.push(JSON.stringify(`Cannot find module "${dep.request}"`));
                str.push('); }())');
            }
            str.push(';\n');
        }, this);
        return new RawSource(str.join(''));
    }

    needRebuild() {
        return false;
    }

    size() {
        return 16 + this.dependencies.length * 12;
    }

    updateHash(hash: Hash) {
        hash.update('multi module');
        hash.update(this.name || '');
        super.updateHash(hash);
    }
}

export = MultiModule;
