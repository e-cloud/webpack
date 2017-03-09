/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import { OriginalSource, RawSource } from 'webpack-sources'
import { ErrCallback, ExternalsModuleObject } from '../typings/webpack-types'
import Module = require('./Module');
import WebpackMissingModule = require('./dependencies/WebpackMissingModule');
import Chunk = require('./Chunk')
import Template = require('./Template')

class ExternalModule extends Module {
    _EnsureChunkConditionsPlugin_usedChunks: Chunk[]
    builtTime: number
    external: boolean
    optional: boolean
    useSourceMap: boolean

    constructor(public request: ExternalsModuleObject | string[] | string, public type: string) {
        super();
        this.built = false;
        this.external = true;
    }

    chunkCondition(chunk: Chunk) {
        return chunk.hasEntryModule();
    }

    identifier() {
        return `external ${JSON.stringify(this.request)}`;
    }

    readableIdentifier() {
        return `external ${JSON.stringify(this.request)}`;
    }

    needRebuild() {
        return false;
    }

    build(options: any, compilation: any, resolver: any, fs: any, callback: ErrCallback) {
        this.builtTime = new Date().getTime();
        callback();
    }

    getSourceForGlobalVariableExternal(variableName: string | string[], type: string) {
        // todo: it seems to be unclear about use case of array type request
        if (!Array.isArray(variableName)) {
            // make it an array as the look up works the same basically
            variableName = [variableName];
        }

        // needed for e.g. window["some"]["thing"]
        const objectLookup = variableName.map(r => `[${JSON.stringify(r)}]`).join('');
        return `(function() { module.exports = ${type}${objectLookup}; }());`;
    }

    getSourceForCommonJsExternal(moduleAndSpecifiers: string | string[]) {
        if (!Array.isArray(moduleAndSpecifiers)) {
            return `module.exports = require(${JSON.stringify(moduleAndSpecifiers)});`;
        }

        const moduleName = moduleAndSpecifiers[0];
        const objectLookup = moduleAndSpecifiers.slice(1).map(r => `[${JSON.stringify(r)}]`).join('');
        return `module.exports = require(${moduleName})${objectLookup};`;
    }

    checkExternalVariable(variableToCheck: string, request: string) {
        return `if(typeof ${variableToCheck} === 'undefined') {${WebpackMissingModule.moduleCode(request)}}\n`;
    }

    getSourceForAmdOrUmdExternal(id: number, optional: boolean, request: string) {
        const externalVariable = Template.toIdentifier(`__WEBPACK_EXTERNAL_MODULE_${id}__`);
        const missingModuleError = optional ? this.checkExternalVariable(externalVariable, request) : '';
        return `${missingModuleError}module.exports = ${externalVariable};`;
    }

    getSourceForDefaultCase(optional: boolean, request: string) {
        const missingModuleError = optional ? this.checkExternalVariable(request, request) : '';
        return `${missingModuleError}module.exports = ${request};`;
    }

    getSourceString() {
        const request = typeof this.request === 'object' ? this.request[this.type] : this.request;
        switch (this.type) {
            case 'this':
            case 'window':
            case 'global':
                return this.getSourceForGlobalVariableExternal(request, this.type);
            case 'commonjs':
            case 'commonjs2':
                return this.getSourceForCommonJsExternal(request);
            case 'amd':
            case 'umd':
            case 'umd2':
                return this.getSourceForAmdOrUmdExternal(this.id, this.optional, request);
            default:
                return this.getSourceForDefaultCase(this.optional, request);
        }
    }

    getSource(sourceString: string) {
        if (this.useSourceMap) {
            return new OriginalSource(sourceString, this.identifier());
        }

        return new RawSource(sourceString);
    }

    source() {
        return this.getSource(this.getSourceString());
    }

    size() {
        return 42;
    }
}

ExternalModule.prototype.external = true;

export = ExternalModule;
