/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import ContextDependency = require('./ContextDependency');
import CriticalDependencyWarning = require('./CriticalDependencyWarning');

class SystemImportContextDependency extends ContextDependency {
    async: boolean
    critical: string

    constructor(request, recursive, regExp, public range, public valueRange) {
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
