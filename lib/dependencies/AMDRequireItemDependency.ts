/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import ModuleDependency = require('./ModuleDependency');

class AMDRequireItemDependency extends ModuleDependency {
    optional: boolean

    constructor(request, public range?) {
        super(request);
    }

    static Template = require('./ModuleDependencyTemplateAsRequireId')
}

AMDRequireItemDependency.prototype.type = 'amd require';

export = AMDRequireItemDependency;
