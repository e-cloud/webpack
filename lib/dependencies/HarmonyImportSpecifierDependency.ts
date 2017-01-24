/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import NullDependency = require('./NullDependency');
import ModuleDependency = require('./ModuleDependency')
import { Expression } from 'estree'
import { ReplaceSource } from 'webpack-sources'
import { SourceRange } from '../../typings/webpack-types'
import { Hash } from 'crypto'
import Module = require('../Module')

class Template {
    apply(dep: HarmonyImportSpecifierDependency, source: ReplaceSource) {
        const content = this.getContent(dep);
        source.replace(dep.range[0], dep.range[1] - 1, content);
    }

    getContent(dep: HarmonyImportSpecifierDependency) {
        const importedModule = dep.importDependency.module;
        const defaultImport = dep.directImport && dep.id === 'default' && !(importedModule && (!importedModule.meta || importedModule.meta.harmonyModule));
        const shortHandPrefix = this.getShortHandPrefix(dep);
        const importedVar = dep.importedVar;
        const importedVarSuffix = this.getImportVarSuffix(dep, defaultImport, importedModule);

        if (dep.call && defaultImport) {
            return `${shortHandPrefix}${importedVar}_default()`;
        }

        if (dep.call && dep.id) {
            return `${shortHandPrefix}__webpack_require__.i(${importedVar}${importedVarSuffix})`;
        }

        return `${shortHandPrefix}${importedVar}${importedVarSuffix}`;
    }

    getImportVarSuffix(dep: HarmonyImportSpecifierDependency, defaultImport: boolean, importedModule: Module) {
        if (defaultImport) {
            return '_default.a';
        }

        if (dep.id) {
            const used = importedModule ? importedModule.isUsed(dep.id) : dep.id;
            const optionalComment = dep.id !== used ? ` /* ${dep.id} */` : '';
            return `[${JSON.stringify(used)}${optionalComment}]`;
        }

        return '';
    }

    getShortHandPrefix(dep: HarmonyImportSpecifierDependency) {
        if (!dep.shorthand) {
            return '';
        }

        return `${dep.name}: `;
    }
}

class HarmonyImportSpecifierDependency extends NullDependency {
    shorthand: boolean
    directImport: boolean
    callArgs: any[]
    call: Expression

    constructor(
        public importDependency: ModuleDependency,
        public importedVar: string,
        public id: string,
        public name: string,
        public range: SourceRange
    ) {
        super();
    }

    get type() {
        return 'harmony import specifier';
    }

    getReference() {
        if (!this.importDependency.module) {
            return null;
        }
        return {
            module: this.importDependency.module,
            importedNames: this.id ? [this.id] : true
        };
    }

    getWarnings() {
        const importedModule = this.importDependency.module;
        if (!importedModule || !importedModule.meta || !importedModule.meta.harmonyModule) {
            return;
        }

        if (!this.id) {
            return;
        }

        if (importedModule.isProvided(this.id) !== false) {
            return;
        }

        const idIsNotNameMessage = this.id !== this.name ? ` (imported as '${this.name}')` : '';
        const errorMessage = `"export '${this.id}'${idIsNotNameMessage} was not found in '${this.importDependency.userRequest}'`;
        const err: any = new Error(errorMessage);
        err.hideStack = true;
        return [err];
    }

    updateHash(hash: Hash) {
        super.updateHash(hash);
        const importedModule = this.importDependency.module;
        hash.update(`${importedModule && importedModule.id}`);
        hash.update(`${importedModule && this.id}`);
        hash.update(`${importedModule && this.importedVar}`);
        hash.update(`${importedModule && this.id && importedModule.isUsed(this.id)}`);
        hash.update(`${importedModule && (!importedModule.meta || importedModule.meta.harmonyModule)}`);
        hash.update(`${importedModule && importedModule.used + JSON.stringify(importedModule.usedExports)}`);
    }

    static Template = Template
}

export = HarmonyImportSpecifierDependency;
