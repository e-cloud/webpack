/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import CaseSensitiveModulesWarning = require('./CaseSensitiveModulesWarning');

class WarnCaseSensitiveModulesPlugin {
	apply(compiler) {
		compiler.plugin('compilation', function (compilation) {
			compilation.plugin('seal', function () {
				const moduleWithoutCase = {};
				this.modules.forEach(function (module) {
					const ident = module.identifier().toLowerCase();
					if (moduleWithoutCase[`$${ident}`]) {
						moduleWithoutCase[`$${ident}`].push(module);
					}
					else {
						moduleWithoutCase[`$${ident}`] = [module];
					}
				}, this);
				Object.keys(moduleWithoutCase).forEach(function (key) {
					if (moduleWithoutCase[key].length > 1) {
						this.warnings.push(new CaseSensitiveModulesWarning(moduleWithoutCase[key]));
					}
				}, this);
			});
		});
	}
}

export = WarnCaseSensitiveModulesPlugin;
