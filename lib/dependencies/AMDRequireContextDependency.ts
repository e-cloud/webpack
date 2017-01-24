/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import ContextDependency = require('./ContextDependency');
import CriticalDependencyWarning = require('./CriticalDependencyWarning');
import { SourceRange } from '../../typings/webpack-types'

class AMDRequireContextDependency extends ContextDependency {
    critical: false | string

    constructor(
        request: string,
        recursive: boolean,
        regExp: RegExp,
        public range: SourceRange,
        public valueRange: SourceRange
    ) {
        super(request, recursive, regExp);
    }

    get type() {
        return 'amd require context';
    }

    getWarnings() {
        if (this.critical) {
            return [new CriticalDependencyWarning(this.critical)];
        }
    }

    static Template = require('./ContextDependencyTemplateAsRequireCall')
}

export = AMDRequireContextDependency;
