/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import ContextDependency = require('./ContextDependency');

import CriticalDependencyWarning = require('./CriticalDependencyWarning');

class SystemImportContextDependency extends ContextDependency {
    constructor(request, recursive, regExp, range, valueRange) {
        super(request, recursive, regExp);
        this.range = range;
        this.valueRange = valueRange;
        this.async = true;
    }

    getWarnings() {
        if (this.critical) {
            return [new CriticalDependencyWarning(this.critical)];
        }
    }
}

export = SystemImportContextDependency;
SystemImportContextDependency.prototype.type = 'System.import context';

SystemImportContextDependency.Template = require('./ContextDependencyTemplateAsRequireCall');
