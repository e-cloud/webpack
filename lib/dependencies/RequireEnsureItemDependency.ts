/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import ModuleDependency = require('./ModuleDependency');
import NullDependency = require('./NullDependency')

class RequireEnsureItemDependency extends ModuleDependency {
    constructor(request: string) {
        super(request);
    }

    get type() {
        return 'require.ensure item';
    }

    static Template = NullDependency.Template
}

export = RequireEnsureItemDependency;
