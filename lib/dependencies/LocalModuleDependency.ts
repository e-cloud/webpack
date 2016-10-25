/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import NullDependency = require('./NullDependency');

class LocalModuleDependency extends NullDependency {
	constructor(localModule, range) {
		super();
		localModule.flagUsed();
		this.localModule = localModule;
		this.range = range;
	}

	static Template() {
	}
}

export = LocalModuleDependency;

LocalModuleDependency.Template.prototype.apply = function (dep, source) {
	if (!dep.range) {
		return;
	}
	source.replace(dep.range[0], dep.range[1] - 1, dep.localModule.variableName());
};
