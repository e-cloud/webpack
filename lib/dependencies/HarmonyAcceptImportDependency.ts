/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import HarmonyImportDependency = require('./HarmonyImportDependency');

class HarmonyAcceptImportDependency extends HarmonyImportDependency {
    constructor(request, importedVar, range) {
        super(request, importedVar, range);
    }

    static Template() {
    }
}

export = HarmonyAcceptImportDependency;
HarmonyAcceptImportDependency.prototype.type = 'harmony accept';

HarmonyAcceptImportDependency.Template.prototype.apply = function (dep, source, outputOptions, requestShortener) {
};
