/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import ModuleDependency = require('./ModuleDependency');

class RequireResolveDependency extends ModuleDependency {
    constructor(request, range) {
        super(request);
        this.range = range;
    }
}

export = RequireResolveDependency;
RequireResolveDependency.prototype.type = 'require.resolve';

RequireResolveDependency.Template = require('./ModuleDependencyTemplateAsId');
