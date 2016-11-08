/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import ContextDependency = require('./ContextDependency');

class RequireContextDependency extends ContextDependency {
    optional: boolean

    constructor(request, recursive, regExp, public range) {
        super(request, recursive, regExp);
    }

    static Template = require('./ModuleDependencyTemplateAsRequireId')
}

RequireContextDependency.prototype.type = 'require.context';

export = RequireContextDependency;
