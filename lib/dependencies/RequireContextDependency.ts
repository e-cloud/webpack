/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import ContextDependency = require('./ContextDependency');

class RequireContextDependency extends ContextDependency {
    constructor(request, recursive, regExp, range) {
        super(request, recursive, regExp);
        this.range = range;
    }
}

export = RequireContextDependency;
RequireContextDependency.prototype.type = 'require.context';

RequireContextDependency.Template = require('./ModuleDependencyTemplateAsRequireId');
