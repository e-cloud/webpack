/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import ContextDependency = require('./ContextDependency');

import CriticalDependencyWarning = require('./CriticalDependencyWarning');

class RequireResolveContextDependency extends ContextDependency {
    constructor(request, recursive, regExp, range, valueRange) {
        super(request, recursive, regExp);
        this.range = range;
        this.valueRange = valueRange;
    }

    getWarnings() {
        if (this.critical) {
            return [new CriticalDependencyWarning(this.critical)];
        }
    }
}

export = RequireResolveContextDependency;
RequireResolveContextDependency.prototype.type = 'amd require context';

RequireResolveContextDependency.Template = require('./ContextDependencyTemplateAsId');
