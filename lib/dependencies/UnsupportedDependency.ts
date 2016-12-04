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
        dep: UnsupportedDependency,
        source: ReplaceSource,
        outputOptions: WebpackOutputOptions,
        requestShortener: RequestShortener
    ) {
        source.replace(dep.range[0], dep.range[1], require('./WebpackMissingModule').module(dep.request));
    }
}

class UnsupportedDependency extends NullDependency {
    constructor(public request: string, public range: SourceRange) {
        super();
    }

    static Template = Template
}

export = UnsupportedDependency;
