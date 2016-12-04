/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import ModuleDependency = require('./ModuleDependency');

class RequireEnsureItemDependency extends ModuleDependency {
    constructor(request: string) {
        super(request);
    }

    static Template = require('./NullDependencyTemplate')
}

RequireEnsureItemDependency.prototype.type = 'require.ensure item';

export = RequireEnsureItemDependency;
