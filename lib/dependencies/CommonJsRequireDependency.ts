/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import ModuleDependency = require('./ModuleDependency');

class CommonJsRequireDependency extends ModuleDependency {
    constructor(request, range) {
        super(request);
        this.range = range;
    }
}

CommonJsRequireDependency.prototype.type = 'cjs require';

export = CommonJsRequireDependency;

CommonJsRequireDependency.Template = require('./ModuleDependencyTemplateAsId');
