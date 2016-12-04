/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import NullDependency = require('./NullDependency');
import { SourceRange, WebpackOutputOptions } from '../../typings/webpack-types'
import { ReplaceSource } from 'webpack-sources'
import RequestShortener = require('../RequestShortener')

class Template {
    apply(
        dep: HarmonyExportHeaderDependency,
        source: ReplaceSource,
        outputOptions: WebpackOutputOptions,
        requestShortener: RequestShortener
    ) {
        let content;
        content = '';
        source.replace(dep.rangeStatement[0], dep.range ? dep.range[0] - 1 : dep.rangeStatement[1] - 1, content);
    }
}

class HarmonyExportHeaderDependency extends NullDependency {
    constructor(public range: SourceRange, public rangeStatement: SourceRange) {
        super();
    }

    static Template = Template
}

HarmonyExportHeaderDependency.prototype.type = 'harmony export header';

export = HarmonyExportHeaderDependency;
