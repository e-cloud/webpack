/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import { Hash } from 'crypto'
import { RawSource } from 'webpack-sources'
import { ErrCallback, WebpackOutputOptions } from '../typings/webpack-types'
import Module = require('./Module');
import ModuleDependency = require('./dependencies/ModuleDependency')
import RequestShortener = require('./RequestShortener')

class MultiModule extends Module {
    cacheable: boolean

    constructor(public context: string, public dependencies: ModuleDependency[], public name: string) {
        super();
        this.built = false;
        this.cacheable = true;
    }

    identifier() {
        return `multi ${this.dependencies.map((d) => d.request).join(' ')}`;
    }

    readableIdentifier(requestShortener: RequestShortener) {
        return `multi ${this.dependencies.map((d) => {
            return requestShortener.shorten(d.request);
        }).join(' ')}`;
    }

    disconnect() {
        this.built = false;
        super.disconnect();
    }

    build(options: any, compilation: any, resolver: any, fs: any, callback: ErrCallback) {
        this.built = true;
        return callback();
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

    source(dependencyTemplates: Map<Function, any>, outputOptions: WebpackOutputOptions) {
        const str: string[] = [];
        this.dependencies.forEach((dep, idx) => {
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
                str.push(JSON.stringify(`Cannot find module \"${dep.request}\"`));
                str.push('); }())');
            }
            str.push(';\n');
        });
        return new RawSource(str.join(''));
    }
}

export = MultiModule;
