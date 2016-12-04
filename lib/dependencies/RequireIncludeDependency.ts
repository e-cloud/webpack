/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import ModuleDependency = require('./ModuleDependency');
import RequestShortener = require('../RequestShortener')
import { ReplaceSource } from 'webpack-sources'
import { WebpackOutputOptions, SourceRange } from '../../typings/webpack-types'

class Template {
    apply(
        dep: RequireIncludeDependency,
        source: ReplaceSource,
        outputOptions: WebpackOutputOptions,
        requestShortener: RequestShortener
    ) {
        let comment = '';
        if (outputOptions.pathinfo && dep.module) {
            comment = `/*! require.include ${requestShortener.shorten(dep.request)} */`;
        }
        source.replace(dep.range[0], dep.range[1] - 1, `undefined${comment}`);
    }
}

class RequireIncludeDependency extends ModuleDependency {
    constructor(request: string, public range: SourceRange) {
        super(request);
    }

    static Template = Template
}

RequireIncludeDependency.prototype.type = 'require.include';

export = RequireIncludeDependency;
