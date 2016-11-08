/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import ModuleDependency = require('./ModuleDependency');
import ModuleDependencyTemplateAsId = require('./ModuleDependencyTemplateAsId')

class ModuleHotDeclineDependency extends ModuleDependency {
    type: string
    weak: boolean

    constructor(request, public range: string) {
        super(request);
        this.weak = true;
    }

    static Template = ModuleDependencyTemplateAsId
}

ModuleHotDeclineDependency.prototype.type = 'module.hot.decline';

export = ModuleHotDeclineDependency;
