/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import { OriginalSource, RawSource } from 'webpack-sources'
import Module = require('./Module');
import crypto = require('crypto')

class RawModule extends Module {
    sourceStr: string
    identifierStr: string
    readableIdentifierStr: string
    cacheable: boolean
    built: boolean
    builtTime: number
    useSourceMap: boolean

    constructor(source: string, identifier?: string, readableIdentifier?: string) {
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
        const hash = crypto.createHash('md5');
        hash.update(this.sourceStr);
        return hash.digest('hex');
    }

    createTemplate() {
        return new RawModule(this.sourceStr, `template of ${this.id}`);
    }

    needRebuild() { return false }

    getAllModuleDependencies() { return [] }

    getTemplateArguments() { return [] }
}

export = RawModule;
