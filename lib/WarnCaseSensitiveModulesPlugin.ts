/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import CaseSensitiveModulesWarning = require('./CaseSensitiveModulesWarning');
import Compiler = require('./Compiler')
import Compilation = require('./Compilation')

class WarnCaseSensitiveModulesPlugin {
    apply(compiler: Compiler) {
        compiler.plugin('compilation', function (compilation: Compilation) {
            compilation.plugin('seal', function () {
                const moduleWithoutCase = {};
                this.modules.forEach(
                    module => {
                        const identifier = module.identifier().toLowerCase();
                        if (moduleWithoutCase[identifier]) {
                            moduleWithoutCase[identifier].push(module);
                        }
                        else {
                            moduleWithoutCase[identifier] = [module];
                        }
                    }
                );
                Object.keys(moduleWithoutCase).forEach((key) => {
                    if (moduleWithoutCase[key].length > 1) {
                        this.warnings.push(new CaseSensitiveModulesWarning(moduleWithoutCase[key]));
                    }
                });
            });
        });
    }
}

export = WarnCaseSensitiveModulesPlugin;
