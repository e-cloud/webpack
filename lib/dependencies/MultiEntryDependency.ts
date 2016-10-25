/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import Dependency = require('../Dependency');

class MultiEntryDependency extends Dependency {
	constructor(dependencies, name) {
		super();
		this.dependencies = dependencies;
		this.name = name;
	}
}

export = MultiEntryDependency;
MultiEntryDependency.prototype.type = 'multi entry';
