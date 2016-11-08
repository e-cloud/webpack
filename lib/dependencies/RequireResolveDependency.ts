/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import ModuleDependency = require('./ModuleDependency');

class RequireResolveDependency extends ModuleDependency {
    weak: boolean

    constructor(request, public range) {
        super(request);
    }

    static Template = require('./ModuleDependencyTemplateAsId')
}

RequireResolveDependency.prototype.type = 'require.resolve';

export = RequireResolveDependency;
