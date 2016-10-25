/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import ModuleDependency = require('./ModuleDependency');

class PrefetchDependency extends ModuleDependency {
	constructor(request) {
		super(request);
	}
}

export = PrefetchDependency;
PrefetchDependency.prototype.type = 'prefetch';
