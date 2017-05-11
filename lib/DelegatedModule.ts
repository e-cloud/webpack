/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import { OriginalSource, RawSource } from 'webpack-sources';
import { ErrCallback, WebpackOptions } from '../typings/webpack-types';
import Module = require('./Module');
import WebpackMissingModule = require('./dependencies/WebpackMissingModule');
import DelegatedSourceDependency = require('./dependencies/DelegatedSourceDependency');
import Compilation = require('./Compilation')
import LibManifestPlugin = require('./LibManifestPlugin')

class DelegatedModule extends Module {
    builtTime: number;
    delegated: boolean;
    meta: Module.Meta;
    providedExports: boolean;
    request: number;
    usedExports: boolean;
    useSourceMap: boolean;

    constructor(
        public sourceRequest: string,
        public delegateData: LibManifestPlugin.ManifestContentItem,
        public type: string,
        public userRequest: string
    ) {
        super();
        this.request = delegateData.id;
        this.meta = delegateData.meta;
        this.built = false;
        this.delegated = true;
    }

    identifier() {
        return `delegated ${JSON.stringify(this.request)} from ${this.sourceRequest}`;
    }

    readableIdentifier() {
        return `delegated ${this.userRequest} from ${this.sourceRequest}`;
    }

    needRebuild() {
        return false;
    }

    build(options: WebpackOptions, compilation: Compilation, resolver: any, fs: any, callback: ErrCallback) {
        this.built = true;
        this.builtTime = Date.now();
        this.usedExports = true;
        this.providedExports = this.delegateData.exports || true;
        this.dependencies.length = 0;
        this.addDependency(new DelegatedSourceDependency(this.sourceRequest));
        callback();
    }

    unbuild() {
        this.built = false;
        super.unbuild();
    }

    source() {
        const sourceModule = this.dependencies[0].module;
        let str;
        if (!sourceModule) {
            str = WebpackMissingModule.moduleCode(this.sourceRequest);
        }
        else {
            str = `module.exports = (__webpack_require__(${sourceModule.id}))`;
            switch (this.type) {
                case 'require':
                    str += `(${JSON.stringify(this.request)});`;
                    break;
                case 'object':
                    str += `[${JSON.stringify(this.request)}];`;
                    break;
            }
            str += ';';
        }
        if (this.useSourceMap) {
            return new OriginalSource(str, this.identifier());
        }
        else {
            return new RawSource(str);
        }
    }

    size() {
        return 42;
    }
}

export = DelegatedModule;
