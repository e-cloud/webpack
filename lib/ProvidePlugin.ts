/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import ParserHelpers = require('./ParserHelpers');
import ConstDependency = require('./dependencies/ConstDependency');
import NullFactory = require('./NullFactory');
import Compiler = require('./Compiler')
import Compilation = require('./Compilation')
import Parser = require('./Parser')
import { Expression } from 'estree'
import { CompilationParams, ParserOptions, PlainObject } from '../typings/webpack-types'

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
                                parser.plugin(`can-rename ${name}`, ParserHelpers.approve);
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
                                expression += request.slice(1).map(r => `[${JSON.stringify(r)}]`).join('');
                            }
                            if (!ParserHelpers.addParsedVariableToModule(this, nameIdentifier, expression)) {
                                return false;
                            }
                            if (scopedName) {
                                ParserHelpers.toConstantDependency(nameIdentifier).call(this, expr);
                            }
                            return true;
                        });
                    });
            });
        });
    }
}

export = ProvidePlugin;
