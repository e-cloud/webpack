/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import ModuleDependency = require('./ModuleDependency');

class AMDRequireItemDependency extends ModuleDependency {
    constructor(request, range) {
        super(request);
        this.range = range;
    }
}

export = AMDRequireItemDependency;
AMDRequireItemDependency.prototype.type = 'amd require';

AMDRequireItemDependency.Template = require('./ModuleDependencyTemplateAsRequireId');
