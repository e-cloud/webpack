/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import ModuleDependency = require('./ModuleDependency');

class RequireEnsureItemDependency extends ModuleDependency {
	constructor(request) {
		super(request);
	}
}

export = RequireEnsureItemDependency;
RequireEnsureItemDependency.prototype.type = 'require.ensure item';

RequireEnsureItemDependency.Template = require('./NullDependencyTemplate');
