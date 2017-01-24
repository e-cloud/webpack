/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import HarmonyImportDependency = require('./HarmonyImportDependency');

class Template {
    apply(dep: any, source: any, outputOptions: any, requestShortener: any) {
    }
}

class HarmonyAcceptImportDependency extends HarmonyImportDependency {

    get type() {
        return 'harmony accept';
    }

    static Template = Template
}

export = HarmonyAcceptImportDependency;
