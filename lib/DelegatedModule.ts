/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import { OriginalSource, RawSource } from 'webpack-sources'
import Module = require('./Module');
import WebpackMissingModule = require('./dependencies/WebpackMissingModule');
import DelegatedSourceDependency = require('./dependencies/DelegatedSourceDependency');

class DelegatedModule extends Module {
    constructor(sourceRequest, data, type, userRequest) {
        super();
        this.sourceRequest = sourceRequest;
        this.request = data.id;
        this.meta = data.meta;
        this.type = type;
        this.userRequest = userRequest;
        this.built = false;
        this.usedExports = true;
        this.providedExports = data.exports || true;
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

    build(options, compilation, resolver, fs, callback) {
        this.builtTime = new Date().getTime();
        this.dependencies.length = 0;
        this.addDependency(new DelegatedSourceDependency(this.sourceRequest));
        callback();
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

DelegatedModule.prototype.delegated = true;

export = DelegatedModule;
