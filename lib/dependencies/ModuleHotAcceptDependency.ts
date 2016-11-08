/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import ModuleDependency = require('./ModuleDependency');
import ModuleDependencyTemplateAsId = require('./ModuleDependencyTemplateAsId')

class ModuleHotAcceptDependency extends ModuleDependency {
    type: string
    weak: boolean

    constructor(request, public range: string) {
        super(request);
        this.weak = true;
    }

    static Template = ModuleDependencyTemplateAsId
}

ModuleHotAcceptDependency.prototype.type = 'module.hot.accept';

export = ModuleHotAcceptDependency;
