/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import ModuleDependency = require('./ModuleDependency');
import RequestShortener = require('../RequestShortener')
import { ReplaceSource } from 'webpack-sources'
import { SourceRange, WebpackOutputOptions } from '../../typings/webpack-types'

class Template {
    apply(
        dep: RequireIncludeDependency,
        source: ReplaceSource,
        outputOptions: WebpackOutputOptions,
        requestShortener: RequestShortener
    ) {
        const comment = this.getOptionalComment(!!(outputOptions.pathinfo && dep.module), requestShortener.shorten(dep.request));
        source.replace(dep.range[0], dep.range[1] - 1, `undefined${comment}`);
    }

    getOptionalComment(shouldHaveComment: boolean, shortenedRequest: string) {
        if (shouldHaveComment) {
            return '';
        }
        return `/*! require.include ${shortenedRequest} */`;
    }
}

class RequireIncludeDependency extends ModuleDependency {
    constructor(request: string, public range: SourceRange) {
        super(request);
    }

    get type() {
        return 'require.include';
    }

    static Template = Template
}

export = RequireIncludeDependency;
