/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import Module = require('./Module');
import { RawSource } from 'webpack-sources'
import ModuleDependency = require('./dependencies/ModuleDependency')

class DllModule extends Module {
    built: boolean
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

    build(options, compilation, resolver, fs, callback) {
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

    updateHash(hash) {
        hash.update('dll module');
        hash.update(this.name || '');
        super.updateHash(hash);
    }
}

export = DllModule;
