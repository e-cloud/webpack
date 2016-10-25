/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import NullDependency = require('./NullDependency');

class HarmonyExportExpressionDependency extends NullDependency {
    constructor(originModule, range, rangeStatement) {
        super();
        this.originModule = originModule;
        this.range = range;
        this.rangeStatement = rangeStatement;
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

    static Template() {
    }
}

export = HarmonyExportExpressionDependency;
HarmonyExportExpressionDependency.prototype.type = 'harmony export expression';

HarmonyExportExpressionDependency.Template.prototype.apply = function (dep, source) {
    const used = dep.originModule.isUsed('default');
    let content;
    if (used) {
        content = `/* harmony default export */ exports[${JSON.stringify(used)}] = `;
    }
    else {
        content = '/* unused harmony default export */ var _unused_webpack_default_export = ';
    }
    if (dep.range) {
        source.replace(dep.rangeStatement[0], dep.range[0] - 1, content);
        source.replace(dep.range[1], dep.rangeStatement[1] - 1, ';');
    }
    else {
        source.replace(dep.rangeStatement[0], dep.rangeStatement[1] - 1, content);
    }
};
