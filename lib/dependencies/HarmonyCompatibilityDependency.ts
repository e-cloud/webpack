/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import NullDependency = require('./NullDependency');
import Module = require('../Module')
import { ReplaceSource } from 'webpack-sources';

class Template {
    apply(
        dep: HarmonyCompatibilityDependency,
        source: ReplaceSource,
    ) {
        const usedExports = dep.originModule.usedExports;
        if (usedExports && !Array.isArray(usedExports)) {
            const exportName = dep.originModule.exportsArgument || 'exports';
            const content = `Object.defineProperty(${exportName}, \"__esModule\", { value: true });\n`;
            source.insert(-10, content);
        }

    }
}

class HarmonyCompatibilityDependency extends NullDependency {
    constructor(public originModule: Module) {
        super();
    }

    get type() {
        return 'harmony export header';
    }

    static Template = Template;
}

export = HarmonyCompatibilityDependency;
