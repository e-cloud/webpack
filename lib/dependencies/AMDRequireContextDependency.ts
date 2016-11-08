/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import ContextDependency = require('./ContextDependency');
import CriticalDependencyWarning = require('./CriticalDependencyWarning');

class AMDRequireContextDependency extends ContextDependency {
    critical: boolean

    constructor(request, recursive, regExp, public range, public valueRange) {
        super(request, recursive, regExp);
    }

    getWarnings() {
        if (this.critical) {
            return [new CriticalDependencyWarning(this.critical)];
        }
    }

    static Template = require('./ContextDependencyTemplateAsRequireCall')
}

AMDRequireContextDependency.prototype.type = 'amd require context';

export = AMDRequireContextDependency;
