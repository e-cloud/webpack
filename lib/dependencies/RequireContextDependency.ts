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

RequireContextDependency.prototype.type = 'require.context';

export = RequireContextDependency;

RequireContextDependency.Template = require('./ModuleDependencyTemplateAsRequireId');
