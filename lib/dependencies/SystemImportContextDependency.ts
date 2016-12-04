/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import ContextDependency = require('./ContextDependency');
import CriticalDependencyWarning = require('./CriticalDependencyWarning');
import { SourceRange } from '../../typings/webpack-types'

class SystemImportContextDependency extends ContextDependency {
    async: boolean
    critical: false | string

    constructor(
        request: string,
        recursive: boolean,
        regExp: RegExp,
        public range: SourceRange,
        public valueRange: SourceRange
    ) {
        super(request, recursive, regExp);
        this.async = true;
    }

    getWarnings() {
        if (this.critical) {
            return [new CriticalDependencyWarning(this.critical)];
        }
    }

    static Template = require('./ContextDependencyTemplateAsRequireCall')
}

SystemImportContextDependency.prototype.type = 'System.import context';

export = SystemImportContextDependency;
