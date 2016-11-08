/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import ModuleDependency = require('./ModuleDependency');

class CommonJsRequireDependency extends ModuleDependency {
    constructor(request, public range) {
        super(request);
    }

    static Template = require('./ModuleDependencyTemplateAsId')
}

CommonJsRequireDependency.prototype.type = 'cjs require';

export = CommonJsRequireDependency;
