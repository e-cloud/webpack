/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
'use strict';

import { ReplaceSource } from 'webpack-sources';
import { SourceRange, WebpackOutputOptions } from '../../typings/webpack-types';
import { promise as webpackMissingPromiseModule } from './WebpackMissingModule';
import ModuleDependency = require('./ModuleDependency');
import RequestShortener = require('../RequestShortener');

class ImportEagerDependencyTemplate {
    apply(
        dep: ImportEagerDependency,
        source: ReplaceSource,
        outputOptions: WebpackOutputOptions,
        requestShortener: RequestShortener
    ) {
        const comment = this.getOptionalComment(outputOptions.pathinfo, requestShortener.shorten(dep.request));

        const content = this.getContent(dep, comment);
        source.replace(dep.range[0], dep.range[1] - 1, content);
    }

    getOptionalComment(pathinfo: boolean, shortenedRequest: string) {
        if (!pathinfo) {
            return '';
        }

        return `/*! ${ shortenedRequest } */ `;
    }

    getContent(dep: ImportEagerDependency, comment: string) {
        if (dep.module) {
            const stringifiedId = JSON.stringify(dep.module.id);
            return `new Promise(function(resolve) { resolve(__webpack_require__(${ comment }${ stringifiedId })); })`;
        }

        return webpackMissingPromiseModule(dep.request);
    }
}

class ImportEagerDependency extends ModuleDependency {
    constructor(request: string, range: SourceRange) {
        super(request);
        this.range = range;
    }

    get type() {
        return 'import()';
    }

    static Template = ImportEagerDependencyTemplate;
}

export = ImportEagerDependency;
