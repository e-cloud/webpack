/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import NullDependency = require('./NullDependency');
import RequestShortener = require('../RequestShortener')
import { ReplaceSource } from 'webpack-sources'
import { SourceRange, WebpackOutputOptions } from '../../typings/webpack-types'

class Template {
    apply(dep: RequireHeaderDependency, source: ReplaceSource, outputOptions: WebpackOutputOptions,
          requestShortener: RequestShortener
    ) {
        source.replace(dep.range[0], dep.range[1] - 1, '__webpack_require__');
    }
}

class RequireHeaderDependency extends NullDependency {
    range: SourceRange

    constructor(range: SourceRange) {
        if (!Array.isArray(range)) {
            throw new Error('range must be valid');
        }
        super();
        this.range = range;
    }

    static Template = Template
}

export = RequireHeaderDependency;
