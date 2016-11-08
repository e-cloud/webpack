/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import ContextDependency = require('./ContextDependency');
import CriticalDependencyWarning = require('./CriticalDependencyWarning');

class RequireResolveContextDependency extends ContextDependency {
    critical: string

    constructor(request, recursive, regExp, public range, public valueRange) {
        super(request, recursive, regExp);
    }

    getWarnings() {
        if (this.critical) {
            return [new CriticalDependencyWarning(this.critical)];
        }
    }

    static Template = require('./ContextDependencyTemplateAsId')
}

RequireResolveContextDependency.prototype.type = 'amd require context';

export = RequireResolveContextDependency;
