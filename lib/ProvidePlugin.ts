/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import ModuleParserHelpers = require('./ModuleParserHelpers');
import ConstDependency = require('./dependencies/ConstDependency');
import NullFactory = require('./NullFactory');

class ProvidePlugin {
    constructor(definitions) {
        this.definitions = definitions;
    }

    apply(compiler) {
        const definitions = this.definitions;
        compiler.plugin('compilation', (compilation, params) => {
            compilation.dependencyFactories.set(ConstDependency, new NullFactory());
            compilation.dependencyTemplates.set(ConstDependency, new ConstDependency.Template());

            params.normalModuleFactory.plugin('parser', (parser, parserOptions) => {
                Object.keys(definitions)
                    .forEach(name => {
                        const request = definitions[name];
                        const splitName = name.split('.');
                        if (splitName.length > 0) {
                            splitName.slice(1).forEach((_, i) => {
                                const name = splitName.slice(0, i + 1).join('.');
                                parser.plugin(`can-rename ${name}`, () => true);
                            });
                        }
                        parser.plugin(`expression ${name}`, function (expr) {
                            let nameIdentifier = name;
                            const scopedName = name.includes('.');
                            if (scopedName) {
                                nameIdentifier = `__webpack_provided_${name.replace(/\./g, '_dot_')}`;
                            }
                            if (!ModuleParserHelpers.addParsedVariable(this, nameIdentifier, `require(${JSON.stringify(request)})`)) {
                                return false;
                            }
                            if (scopedName) {
                                nameIdentifier = `__webpack_provided_${name.replace(/\./g, '_dot_')}`;
                                const dep = new ConstDependency(nameIdentifier, expr.range);
                                dep.loc = expr.loc;
                                this.state.current.addDependency(dep);
                            }
                            return true;
                        });
                    });
            });
        });
    }
}

export = ProvidePlugin;
