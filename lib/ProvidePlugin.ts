/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import ModuleParserHelpers = require('./ModuleParserHelpers');
import ConstDependency = require('./dependencies/ConstDependency');
import NullFactory = require('./NullFactory');
import Compiler = require('./Compiler')
import Compilation = require('./Compilation')
import Parser = require('./Parser')
import { CompilationParams, PlainObject, ParserOptions } from '../typings/webpack-types'
import { Expression } from 'estree'

class ProvidePlugin {
    constructor(public definitions: PlainObject) {
    }

    apply(compiler: Compiler) {
        const definitions = this.definitions;
        compiler.plugin('compilation', function (compilation: Compilation, params: CompilationParams) {
            compilation.dependencyFactories.set(ConstDependency, new NullFactory());
            compilation.dependencyTemplates.set(ConstDependency, new ConstDependency.Template());

            params.normalModuleFactory.plugin('parser', function (parser: Parser, parserOptions: ParserOptions) {
                Object.keys(definitions)
                    .forEach((name: string) => {
                        const request = [].concat(definitions[name]);
                        const splitName = name.split('.');
                        if (splitName.length > 0) {
                            splitName.slice(1).forEach((_, i) => {
                                const name = splitName.slice(0, i + 1).join('.');
                                parser.plugin(`can-rename ${name}`, () => true);
                            });
                        }
                        parser.plugin(`expression ${name}`, function (expr: Expression) {
                            let nameIdentifier = name;
                            const scopedName = name.includes('.');
                            let expression = `require(${JSON.stringify(request[0])})`;
                            if (scopedName) {
                                nameIdentifier = `__webpack_provided_${name.replace(/\./g, '_dot_')}`;
                            }
                            if (request.length > 1) {
                                expression += request.slice(1).map(function (r) {
                                    return `[${JSON.stringify(r)}]`;
                                }).join('');
                            }
                            if (!ModuleParserHelpers.addParsedVariable(this, nameIdentifier, expression)) {
                                return false;
                            }
                            if (scopedName) {
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
