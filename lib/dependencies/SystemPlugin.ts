/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import UnsupportedFeatureWarning = require('../UnsupportedFeatureWarning');
import ConstDependency = require('./ConstDependency');
import BasicEvaluatedExpression = require('../BasicEvaluatedExpression');
import Compiler = require('../Compiler')
import Compilation = require('../Compilation')
import Parser = require('../Parser')
import { CompilationParams, ModuleOptions, ParserOptions } from '../../typings/webpack-types'

class SystemPlugin {
    constructor(public options: ModuleOptions) {
    }

    apply(compiler: Compiler) {
        compiler.plugin('compilation', function (compilation: Compilation, params: CompilationParams) {
            params.normalModuleFactory.plugin('parser', function (parser: Parser, parserOptions: ParserOptions) {
                if (typeof parserOptions.system !== 'undefined' && !parserOptions.system) {
                    return;
                }

                function setTypeof(expr: string, value: string) {
                    parser.plugin(`evaluate typeof ${expr}`, expr =>
                        new BasicEvaluatedExpression().setString(value).setRange(expr.range)
                    );
                    parser.plugin(`typeof ${expr}`, function (expr) {
                        const dep = new ConstDependency(JSON.stringify(value), expr.range);
                        dep.loc = expr.loc;
                        this.state.current.addDependency(dep);
                        return true;
                    });
                }

                function setNotSupported(name: string) {
                    parser.plugin(`evaluate typeof ${name}`, expr =>
                        new BasicEvaluatedExpression().setString('undefined').setRange(expr.range)
                    );
                    parser.plugin(`expression ${name}`, function (expr) {
                        const dep = new ConstDependency('(void 0)', expr.range);
                        dep.loc = expr.loc;
                        this.state.current.addDependency(dep);
                        if (!this.state.module) {
                            return;
                        }
                        this.state.module.warnings.push(new UnsupportedFeatureWarning(this.state.module, `${name} is not supported by webpack.`));
                        return true;
                    });
                }

                setTypeof('System', 'object');
                setTypeof('System.import', 'function');
                setNotSupported('System.set');
                setNotSupported('System.get');
                setNotSupported('System.register');
                parser.plugin('expression System', function (expr) {
                    const dep = new ConstDependency('{}', expr.range);
                    dep.loc = expr.loc;
                    this.state.current.addDependency(dep);
                    return true;
                });
            });
        });
    }
}

export = SystemPlugin;
