/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import Module = require('./Module');

import { OriginalSource, RawSource } from 'webpack-sources'

class RawModule extends Module {
    constructor(source, identifier, readableIdentifier) {
        super();
        this.sourceStr = source;
        this.identifierStr = identifier || this.sourceStr;
        this.readableIdentifierStr = readableIdentifier || this.identifierStr;
        this.cacheable = true;
        this.built = false;
    }

    identifier() {
        return this.identifierStr;
    }

    readableIdentifier(requestShortener) {
        return requestShortener.shorten(this.readableIdentifierStr);
    }

    needRebuild() {
        return false;
    }

    build(options, compilation, resolver, fs, callback) {
        this.builtTime = new Date().getTime();
        callback();
    }

    source() {
        if (this.useSourceMap) {
            return new OriginalSource(this.sourceStr, this.identifier());
        }
        else {
            return new RawSource(this.sourceStr);
        }
    }

    size() {
        return this.sourceStr.length;
    }

    getSourceHash() {
        const hash = require('crypto').createHash('md5');
        hash.update(this.sourceStr);
        return hash.digest('hex');
    }

    getAllModuleDependencies() {
        return [];
    }

    createTemplate() {
        return new RawModule(this.sourceStr, `template of ${this.id}`);
    }

    getTemplateArguments() {
        return [];
    }
}

export = RawModule;
