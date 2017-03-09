/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import ConstDependency = require('./dependencies/ConstDependency');
import BasicEvaluatedExpression = require('./BasicEvaluatedExpression');
import NullFactory = require('./NullFactory');
import Compiler = require('./Compiler')
import Compilation = require('./Compilation')
import Parser = require('./Parser')
import { CompilationParams, PlainObject } from '../typings/webpack-types'
import ParserHelpers = require('./ParserHelpers');

class DefinePlugin {
    constructor(public definitions: PlainObject) {
    }

    apply(compiler: Compiler) {
        const definitions = this.definitions;
        compiler.plugin('compilation', function (compilation: Compilation, params: CompilationParams) {
            compilation.dependencyFactories.set(ConstDependency, new NullFactory());
            compilation.dependencyTemplates.set(ConstDependency, new ConstDependency.Template());

            params.normalModuleFactory.plugin('parser', function (parser: Parser) {
                (function walkDefinitions(definitions, prefix) {
                    Object.keys(definitions).forEach(key => {
                        const code = definitions[key];
                        if (code && typeof code === 'object' && !(code instanceof RegExp)) {
                            walkDefinitions(code, `${prefix + key}.`);
                            applyObjectDefine(prefix + key, code);
                            return;
                        }
                        applyDefineKey(prefix, key);
                        applyDefine(prefix + key, code);
                    });
                })(definitions, '');

                function stringifyObj(obj: PlainObject): string {
                    return `__webpack_require__.i({${Object.keys(obj).map(key => {
                        const code = obj[key];
                        return JSON.stringify(key) + ':' + toCode(code);
                    }).join(',')}})`;
                }

                function toCode(code: any): string {
                    if (code === null) {
                        return 'null';
                    }
                    else if (code === undefined) {
                        return 'undefined';
                    }
                    else if (code instanceof RegExp && code.toString) {
                        return code.toString();
                    }
                    else if (typeof code === 'function' && code.toString) {
                        return `(${code.toString()})`;
                    }
                    else if (typeof code === 'object') {
                        return stringifyObj(code);
                    }
                    else {
                        return `${code}`;
                    }
                }

                function applyDefineKey(prefix: string, key: string) {
                    const splittedKey = key.split('.');
                    splittedKey.slice(1).forEach((_, i) => {
                        const fullKey = prefix + splittedKey.slice(0, i + 1).join('.');
                        parser.plugin(`can-rename ${fullKey}`, ParserHelpers.approve);
                    });
                }

                function applyDefine(key: string, code: any) {
                    const isTypeof = /^typeof\s+/.test(key);
                    if (isTypeof) {
                        key = key.replace(/^typeof\s+/, '');
                    }
                    let recurse = false;
                    let recurseTypeof = false;
                    code = toCode(code);
                    if (!isTypeof) {
                        parser.plugin(`can-rename ${key}`, ParserHelpers.approve);
                        parser.plugin(`evaluate Identifier ${key}`, function (expr) {
                            /**
                             * this is needed in case there is a recursion in the DefinePlugin
                             * to prevent an endless recursion
                             * e.g.: new DefinePlugin({
							 * "a": "b",
							 * "b": "a"
							 * });
                             */
                            if (recurse) {
                                return;
                            }
                            recurse = true;
                            const res = this.evaluate(code);
                            recurse = false;
                            res.setRange(expr.range);
                            return res;
                        });
                        parser.plugin(`expression ${key}`, ParserHelpers.toConstantDependency(code));
                    }
                    const typeofCode = isTypeof ? code : `typeof (${code})`;
                    parser.plugin(`evaluate typeof ${key}`, function (expr) {
                        /**
                         * this is needed in case there is a recursion in the DefinePlugin
                         * to prevent an endless recursion
                         * e.g.: new DefinePlugin({
						 * "typeof a": "tyepof b",
						 * "typeof b": "typeof a"
						 * });
                         */
                        if (recurseTypeof) {
                            return;
                        }
                        recurseTypeof = true;
                        const res = this.evaluate(typeofCode);
                        recurseTypeof = false;
                        res.setRange(expr.range);
                        return res;
                    });
                    parser.plugin(`typeof ${key}`, function (expr) {
                        const res = this.evaluate(typeofCode);
                        if (!res.isString()) {
                            return;
                        }
                        return ParserHelpers.toConstantDependency(JSON.stringify(res.string)).call(parser, expr);
                    });
                }

                function applyObjectDefine(key: string, obj: PlainObject) {
                    const code = stringifyObj(obj);
                    parser.plugin(`can-rename ${key}`, ParserHelpers.approve);
                    parser.plugin(`evaluate Identifier ${key}`,
                        expr => new BasicEvaluatedExpression().setRange(expr.range));
                    parser.plugin(`evaluate typeof ${key}`, ParserHelpers.evaluateToString('object'));
                    parser.plugin(`expression ${key}`, ParserHelpers.toConstantDependency(code));
                    parser.plugin(`typeof ${key}`, ParserHelpers.toConstantDependency(JSON.stringify('object')));
                }
            });
        });
    }
}

export = DefinePlugin;
