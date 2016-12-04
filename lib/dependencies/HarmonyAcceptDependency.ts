/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import NullDependency = require('./NullDependency');
import HarmonyImportDependency = require('./HarmonyImportDependency');
import RequestShortener = require('../RequestShortener')
import { ReplaceSource } from 'webpack-sources'
import { WebpackOutputOptions, SourceRange } from '../../typings/webpack-types'

class Template {
    apply(
        dep: HarmonyAcceptDependency,
        source: ReplaceSource,
        outputOptions: WebpackOutputOptions,
        requestShortener: RequestShortener
    ) {
        const content = dep.dependencies.map(d =>
            HarmonyImportDependency.makeStatement(false, d, outputOptions, requestShortener)
        ).join('');
        if (dep.hasCallback) {
            source.insert(dep.range[0], `function(__WEBPACK_OUTDATED_DEPENDENCIES__) { ${content}(`);
            source.insert(dep.range[1], ')(__WEBPACK_OUTDATED_DEPENDENCIES__); }');
        }
        else {
            source.insert(dep.range[1] - 0.5, `, function() { ${content}}`);
        }
    }
}

class HarmonyAcceptDependency extends NullDependency {
    constructor(
        public range: SourceRange, public dependencies: HarmonyImportDependency[],
        public hasCallback: boolean
    ) {
        super();
    }

    static Template = Template
}

HarmonyAcceptDependency.prototype.type = 'accepted harmony modules';

export = HarmonyAcceptDependency;
