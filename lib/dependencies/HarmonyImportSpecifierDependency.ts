/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import NullDependency = require('./NullDependency');
import HarmonyModulesHelpers = require('./HarmonyModulesHelpers');
import ModuleDependency = require('./ModuleDependency')
import { Expression } from 'estree'

class Template {
    apply(dep, source) {
        let content;
        const importedModule = dep.importDependency.module;
        const defaultImport = dep.directImport && dep.id === 'default' && !(importedModule && (!importedModule.meta || importedModule.meta.harmonyModule));
        if (defaultImport) {
            content = `${dep.importedVar}_default.a`;
        }
        else if (dep.id) {
            const used = importedModule ? importedModule.isUsed(dep.id) : dep.id;
            content = `${dep.importedVar}[${JSON.stringify(used)}${dep.id !== used ? ' /* ' + dep.id + ' */' : ''}]`;
        }
        else {
            content = dep.importedVar;
        }
        if (dep.call) {
            if (defaultImport) {
                content = `${dep.importedVar}_default()`;
            }
            else if (dep.id) {
                content = `__webpack_require__.i(${content})`;
            }
        }
        if (dep.shorthand) {
            content = `${dep.name}: ${content}`;
        }
        source.replace(dep.range[0], dep.range[1] - 1, content);
    }
}

class HarmonyImportSpecifierDependency extends NullDependency {
    shorthand: boolean
    directImport: boolean
    callArgs: any[]
    call: Expression

    constructor(public importDependency: ModuleDependency, public importedVar, public id, public name, public range) {
        super();
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
        if (importedModule && importedModule.meta && importedModule.meta.harmonyModule) {
            if (this.id && importedModule.isProvided(this.id) === false) {
                const err: any = new Error(`export '${this.id}'${this.id !== this.name
                    ? ' (imported as \'' + this.name + '\')'
                    : ''} was not found in '${this.importDependency.userRequest}'`);
                err.hideStack = true;
                return [err];
            }
        }
    }

    updateHash(hash) {
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

HarmonyImportSpecifierDependency.prototype.type = 'harmony import specifier';

export = HarmonyImportSpecifierDependency;
