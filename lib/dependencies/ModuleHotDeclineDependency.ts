/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import ModuleDependency = require('./ModuleDependency');

class ModuleHotDeclineDependency extends ModuleDependency {
    constructor(request, range) {
        super(request);
        this.range = range;
        this.weak = true;
    }
}

export = ModuleHotDeclineDependency;
ModuleHotDeclineDependency.prototype.type = 'module.hot.decline';

ModuleHotDeclineDependency.Template = require('./ModuleDependencyTemplateAsId');
