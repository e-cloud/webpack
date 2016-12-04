/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import Module = require('./Module');
import { RawSource } from 'webpack-sources'
import { Hash } from 'crypto'
import { ErrCallback } from '../typings/webpack-types'
import ModuleDependency = require('./dependencies/ModuleDependency')

class DllModule extends Module {
    cacheable: boolean

    constructor(
        public context: string,
        public dependencies: ModuleDependency[],
        public name: string,
        public type: string
    ) {
        super();
    }

    identifier() {
        return `dll ${this.name}`;
    }

    readableIdentifier() {
        return `dll ${this.name}`;
    }

    disconnect() {
        this.built = false;
        super.disconnect();
    }

    build(options: any, compilation: any, resolver: any, fs: any, callback: ErrCallback) {
        this.built = true;
        return callback();
    }

    source() {
        return new RawSource('module.exports = __webpack_require__;');
    }

    needRebuild() {
        return false;
    }

    size() {
        return 12;
    }

    updateHash(hash: Hash) {
        hash.update('dll module');
        hash.update(this.name || '');
        super.updateHash(hash);
    }
}

export = DllModule;
