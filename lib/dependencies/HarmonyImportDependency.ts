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
        const content = HarmonyImportDependency.makeStatement(true, dep, outputOptions, requestShortener);
        source.replace(dep.range[0], dep.range[1] - 1, '');
        source.insert(-1, content);
    }
}

class HarmonyImportDependency extends ModuleDependency {
    constructor(request: string, public importedVar: string, public range: SourceRange) {
        super(request);
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

    static makeStatement(
        declare: boolean, dep: HarmonyImportDependency, outputOptions: WebpackOutputOptions,
        requestShortener: RequestShortener
    ) {
        let comment = '';
        if (outputOptions.pathinfo) {
            comment = `/*! ${requestShortener.shorten(dep.request)} */ `;
        }
        const declaration = declare ? 'var ' : '';
        const newline = declare ? '\n' : ' ';
        let content;
        if (!dep.module) {
            content = `throw new Error(${JSON.stringify('Cannot find module "' + dep.request + '"')});${newline}`;
        }
        else if (dep.importedVar) {
            content = `/* harmony import */ ${declaration}${dep.importedVar} = __webpack_require__(${comment}${JSON.stringify(dep.module.id)});${newline}`;
            if (!(dep.module.meta && dep.module.meta.harmonyModule)) {
                content += `/* harmony import */ ${declaration}${dep.importedVar}_default = __webpack_require__.n(${dep.importedVar});${newline}`;
            }
        }
        else {
            content = '';
        }
        return content;
    }

    static Template = Template
}

HarmonyImportDependency.prototype.type = 'harmony import';

export = HarmonyImportDependency;
