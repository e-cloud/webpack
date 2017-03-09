/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import NullDependency = require('./NullDependency');
import { ReplaceSource } from 'webpack-sources'
import { SourceRange, WebpackOutputOptions } from '../../typings/webpack-types'
import RequestShortener = require('../RequestShortener')

class Template {
    apply(
        dep: HarmonyExportHeaderDependency,
        source: ReplaceSource,
        outputOptions: WebpackOutputOptions,
        requestShortener: RequestShortener
    ) {
        const content = '';
        const replaceUntil = dep.range ? dep.range[0] - 1 : dep.rangeStatement[1] - 1;
        source.replace(dep.rangeStatement[0], replaceUntil, content);
    }
}

class HarmonyExportHeaderDependency extends NullDependency {
    constructor(public range: SourceRange, public rangeStatement: SourceRange) {
        super();
    }

    get type() {
        return 'harmony export header';
    }

    static Template = Template
}

export = HarmonyExportHeaderDependency;
