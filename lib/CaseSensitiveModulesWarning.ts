/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
class CaseSensitiveModulesWarning extends Error {
	constructor(modules) {
		super();
		Error.captureStackTrace(this, CaseSensitiveModulesWarning);
		this.name = 'CaseSensitiveModulesWarning';
		const modulesList = modules.slice().sort(function (a, b) {
			a = a.identifier();
			b = b.identifier();
			if (a < b) {
				return -1;
			}
			if (a > b) {
				return 1;
			}
			return 0;
		}).map(function (m) {
			let message = `* ${m.identifier()}`;
			const validReasons = m.reasons.filter(function (r) {
				return r.module;
			});
			if (validReasons.length > 0) {
				message += `\n    Used by ${validReasons.length} module(s), i. e.`;
				message += `\n    ${validReasons[0].module.identifier()}`;
			}
			return message;
		}).join('\n');
		this.message = `There are multiple modules with names that only differ in casing.\nThis can lead to unexpected behavior when compiling on a filesystem with other case-semantic.\nUse equal casing. Compare these module identifiers:\n${modulesList}`;
		this.origin = this.module = modules[0];
	}
}

export = CaseSensitiveModulesWarning;
