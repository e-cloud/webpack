/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import ContextDependency = require('./ContextDependency');
import CriticalDependencyWarning = require('./CriticalDependencyWarning');

class CommonJsRequireContextDependency extends ContextDependency {
    critical: boolean | string
    optional: boolean

    constructor(request, recursive, regExp, public range, public valueRange?) {
        super(request, recursive, regExp);
    }

    getWarnings() {
        if (this.critical) {
            return [new CriticalDependencyWarning(this.critical)];
        }
    }

    static Template = require('./ContextDependencyTemplateAsRequireCall')
}

CommonJsRequireContextDependency.prototype.type = 'cjs require context';

export = CommonJsRequireContextDependency;
