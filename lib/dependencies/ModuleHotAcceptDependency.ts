/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import ModuleDependency = require('./ModuleDependency');
import ModuleDependencyTemplateAsId = require('./ModuleDependencyTemplateAsId')

class ModuleHotAcceptDependency extends ModuleDependency {
    constructor(request, range) {
        super(request);
        this.range = range;
        this.weak = true;
    }

    static Template = ModuleDependencyTemplateAsId
}

ModuleHotAcceptDependency.prototype.type = 'module.hot.accept';

export = ModuleHotAcceptDependency;
