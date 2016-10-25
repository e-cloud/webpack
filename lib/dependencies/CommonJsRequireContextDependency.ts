/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import ContextDependency = require('./ContextDependency');

import CriticalDependencyWarning = require('./CriticalDependencyWarning');

class CommonJsRequireContextDependency extends ContextDependency {
	constructor(request, recursive, regExp, range, valueRange) {
		super(request, recursive, regExp);
		this.range = range;
		this.valueRange = valueRange;
	}

	getWarnings() {
		if (this.critical) {
			return [new CriticalDependencyWarning(this.critical)];
		}
	}
}

export = CommonJsRequireContextDependency;
CommonJsRequireContextDependency.prototype.type = 'cjs require context';

CommonJsRequireContextDependency.Template = require('./ContextDependencyTemplateAsRequireCall');
