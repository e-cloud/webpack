/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import NullDependency = require('./NullDependency');
import Module = require('../Module')
import { ReplaceSource } from 'webpack-sources'

class Template {
    apply(
        dep: HarmonyCompatiblilityDependency,
        source: ReplaceSource,
    ) {
        const usedExports = dep.originModule.usedExports;
        if (usedExports && !Array.isArray(usedExports)) {
            const content = 'Object.defineProperty(exports, "__esModule", { value: true });\n';
            source.insert(-1, content);
        }

    }
}

class HarmonyCompatiblilityDependency extends NullDependency {
    constructor(public originModule: Module) {
        super();
    }

    static Template = Template
}

HarmonyCompatiblilityDependency.prototype.type = 'harmony export header';

export = HarmonyCompatiblilityDependency;
