/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
'use strict';

import ImportContextDependency = require('./ImportContextDependency');
import ContextDependencyTemplateAsRequireCall = require('./ContextDependencyTemplateAsRequireCall');
import { SourceRange } from '../../typings/webpack-types';

class ImportLazyOnceContextDependency extends ImportContextDependency {
    constructor(
        request: string,
        recursive: boolean,
        regExp: RegExp,
        range: SourceRange,
        valueRange: SourceRange,
        chunkName: string
    ) {
        super(request, recursive, regExp, range, valueRange, chunkName);
        this.async = 'lazy-once';
    }

    get type() {
        return 'import() context lazy-once';
    }
}

ImportLazyOnceContextDependency.Template = ContextDependencyTemplateAsRequireCall;

export = ImportLazyOnceContextDependency;
