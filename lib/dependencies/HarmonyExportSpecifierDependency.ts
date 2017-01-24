/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import NullDependency = require('./NullDependency');
import HarmonyModulesHelpers = require('./HarmonyModulesHelpers');
import { ReplaceSource } from 'webpack-sources'
import Module = require('../Module')

class Template {
    apply(dep: HarmonyExportSpecifierDependency, source: ReplaceSource) {
        const content = this.getPrefix(dep) + this.getContent(dep);
        source.insert(dep.position, content);
    }

    getPrefix(dep: HarmonyExportSpecifierDependency) {
        return dep.position > 0 ? '\n' : '';
    }

    getContent(dep: HarmonyExportSpecifierDependency) {
        const used = dep.originModule.isUsed(dep.name);
        const active = HarmonyModulesHelpers.isActive(dep.originModule, dep);
        if (!used) {
            return `/* unused harmony export ${(dep.name || 'namespace')} */\n`;
        }

        if (!active) {
            return `/* inactive harmony export ${(dep.name || 'namespace')} */\n`;
        }

        const exportsName = dep.originModule.exportsArgument || 'exports';
        if (dep.immutable) {
            return `/* harmony export (immutable) */ ${exportsName}[${JSON.stringify(used)}] = ${dep.id};\n`;
        }

        return `/* harmony export (binding) */ __webpack_require__.d(${exportsName}, ${JSON.stringify(used)}, function() { return ${dep.id}; });\n`;
    }
}

class HarmonyExportSpecifierDependency extends NullDependency {
    constructor(
        public originModule: Module,
        public id: number,
        public name: string,
        public position: number,
        public immutable: boolean
    ) {
        super();
    }

    get type() {
        return 'harmony export specifier';
    }

    getExports() {
        return {
            exports: [this.name]
        };
    }

    describeHarmonyExport() {
        return {
            exportedName: this.name,
            precedence: 1
        };
    }

    static Template = Template
}

export = HarmonyExportSpecifierDependency;
