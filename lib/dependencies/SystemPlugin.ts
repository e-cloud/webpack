/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import ConstDependency = require('./ConstDependency');
import Compiler = require('../Compiler')
import Compilation = require('../Compilation')
import Parser = require('../Parser')
import { CompilationParams, ModuleOptions, ParserOptions } from '../../typings/webpack-types'
import ParserHelpers = require("../ParserHelpers");

class SystemPlugin {
    constructor(public options: ModuleOptions) {
    }

    apply(compiler: Compiler) {
        compiler.plugin('compilation', function (compilation: Compilation, params: CompilationParams) {
            params.normalModuleFactory.plugin('parser', function (parser: Parser, parserOptions: ParserOptions) {
                if (typeof parserOptions.system !== 'undefined' && !parserOptions.system) {
                    return;
                }

                function setNotSupported(name: string) {
                    parser.plugin(`evaluate typeof ${name}`, ParserHelpers.evaluateToString('undefined'));
                    parser.plugin(`expression ${name}`, ParserHelpers.expressionIsUnsupported(`${name} is not supported by webpack.`));
                }

                parser.plugin('typeof System', ParserHelpers.toConstantDependency('object'));
                parser.plugin('evaluate typeof System', ParserHelpers.evaluateToString('object'));

                parser.plugin('typeof System.import', ParserHelpers.toConstantDependency('function'));
                parser.plugin('evaluate typeof System.import', ParserHelpers.evaluateToString('function'));

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
