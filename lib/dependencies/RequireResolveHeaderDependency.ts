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
        dep: RequireResolveHeaderDependency,
        source: ReplaceSource,
        outputOptions: WebpackOutputOptions,
        requestShortener: RequestShortener
    ) {
        source.replace(dep.range[0], dep.range[1] - 1, '/*require.resolve*/');
    }

    applyAsTemplateArgument(name: string, dep: RequireResolveHeaderDependency, source: ReplaceSource) {
        source.replace(dep.range[0], dep.range[1] - 1, '/*require.resolve*/');
    }
}

class RequireResolveHeaderDependency extends NullDependency {
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

export = RequireResolveHeaderDependency;
