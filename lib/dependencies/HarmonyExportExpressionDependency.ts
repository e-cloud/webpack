/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import NullDependency = require('./NullDependency');
import { ReplaceSource } from 'webpack-sources'
import { SourceRange } from '../../typings/webpack-types'
import Module = require('../Module')

class Template {
    apply(dep: HarmonyExportExpressionDependency, source: ReplaceSource) {
        const used = dep.originModule.isUsed('default');
        const content = this.getContent(dep.originModule, used);

        if (dep.range) {
            source.replace(dep.rangeStatement[0], dep.range[0] - 1, `${content}(`);
            source.replace(dep.range[1], dep.rangeStatement[1] - 1, ');');
            return;
        }

        source.replace(dep.rangeStatement[0], dep.rangeStatement[1] - 1, content);
    }

    getContent(module: Module, used: boolean | string) {
        const exportsName = module.exportsArgument || 'exports';
        if (used) {
            return `/* harmony default export */ ${exportsName}[${JSON.stringify(used)}] = `;
        }
        return '/* unused harmony default export */ var _unused_webpack_default_export = ';
    }
}

class HarmonyExportExpressionDependency extends NullDependency {
    constructor(public originModule: Module, public range: SourceRange, public rangeStatement: SourceRange) {
        super();
    }

    get type() {
        return 'harmony export expression';
    }

    getExports() {
        return {
            exports: ['default']
        };
    }

    describeHarmonyExport() {
        return {
            exportedName: 'default',
            precedence: 1
        };
    }

    static Template = Template
}

export = HarmonyExportExpressionDependency;
