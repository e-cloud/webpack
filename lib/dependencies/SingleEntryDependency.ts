/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import ModuleDependency = require('./ModuleDependency');

class SingleEntryDependency extends ModuleDependency {
	constructor(request) {
		super(request);
	}
}

export = SingleEntryDependency;
SingleEntryDependency.prototype.type = 'single entry';
