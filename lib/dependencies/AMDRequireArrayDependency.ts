/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import Dependency = require('../Dependency');
import WebpackMissingModule = require('./WebpackMissingModule');
import { ReplaceSource } from 'webpack-sources'
import { WebpackOutputOptions, SourceRange } from '../../typings/webpack-types'
import RequestShortener = require('../RequestShortener')
import ModuleDependency = require('./ModuleDependency')

class Template {
    apply(
        dep: AMDRequireArrayDependency,
        source: ReplaceSource,
        outputOptions: WebpackOutputOptions,
        requestShortener: RequestShortener
    ) {
        const content = this.getContent(dep, outputOptions, requestShortener);
        source.replace(dep.range[0], dep.range[1] - 1, content);
    }

    getContent(
        dep: AMDRequireArrayDependency, outputOptions: WebpackOutputOptions,
        requestShortener: RequestShortener
    ) {
        const requires = dep.depsArray.map((dependency) => {
            if (typeof dependency === 'string') {
                return dependency;
            }
            const optionalComment = this.optionalComment(outputOptions.pathinfo, requestShortener.shorten(dependency.request));
            return this.contentForDependency(dependency, optionalComment);
        });
        return `[${requires.join(', ')}]`;
    }

    optionalComment(pathInfo: boolean, shortenedRequest: string) {
        if (!pathInfo) {
            return '';
        }
        return `/*! ${shortenedRequest} */ `;
    }

    contentForDependency(dep: ModuleDependency, comment: string) {
        if (dep.module) {
            const stringifiedId = JSON.stringify(dep.module.id);
            return `__webpack_require__(${comment}${stringifiedId})`;
        }

        return WebpackMissingModule.module(dep.request);
    }
}

class AMDRequireArrayDependency extends Dependency {
    optional: boolean

    constructor(public depsArray: (string | ModuleDependency)[], public range: SourceRange) {
        super();
    }

    get type() {
        return 'amd require array';
    }

    static Template = Template
}

export = AMDRequireArrayDependency;
