/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import NullDependency = require('./NullDependency');

class RequireResolveHeaderDependency extends NullDependency {
	constructor(range) {
		if (!Array.isArray(range)) {
			throw new Error('range must be valid');
		}
		super();
		this.range = range;
	}

	static Template() {
	}
}

export = RequireResolveHeaderDependency;

RequireResolveHeaderDependency.Template.prototype.apply = function (dep, source) {
	source.replace(dep.range[0], dep.range[1] - 1, '/*require.resolve*/');
};

RequireResolveHeaderDependency.Template.prototype.applyAsTemplateArgument = function (name, dep, source) {
	source.replace(dep.range[0], dep.range[1] - 1, '/*require.resolve*/');
};
