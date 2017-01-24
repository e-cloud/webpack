/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import ModuleDependency = require('./ModuleDependency');
import { SourceRange, WebpackOutputOptions } from '../../typings/webpack-types'
import { ReplaceSource } from 'webpack-sources'
import { Hash } from 'crypto'
import RequestShortener = require('../RequestShortener')

class Template {
    apply(
        dep: HarmonyImportDependency,
        source: ReplaceSource,
        outputOptions: WebpackOutputOptions,
        requestShortener: RequestShortener
    ) {
        const content = makeImportStatement(true, dep, outputOptions, requestShortener);
        source.replace(dep.range[0], dep.range[1] - 1, '');
        source.insert(-1, content);
    }
}

class HarmonyImportDependency extends ModuleDependency {
    constructor(request: string, public importedVar: string, public range: SourceRange) {
        super(request);
    }

    get type() {
        return 'harmony import';
    }

    getReference() {
        if (!this.module) {
            return null;
        }
        return {
            module: this.module,
            importedNames: false
        };
    }

    updateHash(hash: Hash) {
        super.updateHash(hash);
        hash.update(`${this.module && (!this.module.meta || this.module.meta.harmonyModule)}`);
    }

    static makeImportStatement = makeImportStatement

    static Template = Template
}

function getOptionalComment(pathinfo: boolean, shortenedRequest: string) {
    if (!pathinfo) {
        return '';
    }
    return `/*! ${shortenedRequest} */ `;
}

function makeImportStatement(
    declare: boolean, dep: HarmonyImportDependency, outputOptions: WebpackOutputOptions,
    requestShortener: RequestShortener
) {
    const comment = getOptionalComment(outputOptions.pathinfo, requestShortener.shorten(dep.request));
    const declaration = declare ? 'var ' : '';
    const newline = declare ? '\n' : ' ';

    if (!dep.module) {
        const stringifiedError = JSON.stringify(`Cannot find module "${dep.request}"`);
        return `throw new Error(${stringifiedError});${newline}`;
    }

    if (dep.importedVar) {
        const isHarmonyModule = dep.module.meta && dep.module.meta.harmonyModule;
        const content = `/* harmony import */ ${declaration}${dep.importedVar} = __webpack_require__(${comment}${JSON.stringify(dep.module.id)});${newline}`;
        if (isHarmonyModule) {
            return content;
        }
        return `${content}/* harmony import */ ${declaration}${dep.importedVar}_default = __webpack_require__.n(${dep.importedVar});${newline}`;
    }

    return '';
}

export = HarmonyImportDependency;
