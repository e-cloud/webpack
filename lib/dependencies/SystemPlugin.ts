/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import Compiler = require('../Compiler')
import Compilation = require('../Compilation')
import Parser = require('../Parser')
import { CompilationParams, ModuleOptions, ParserOptions } from '../../typings/webpack-types'
import ParserHelpers = require('../ParserHelpers');

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

                parser.plugin('typeof System.import', ParserHelpers.toConstantDependency(JSON.stringify('function')));
                parser.plugin('evaluate typeof System.import', ParserHelpers.evaluateToString('function'));
                parser.plugin('typeof System', ParserHelpers.toConstantDependency(JSON.stringify('object')));
                parser.plugin('evaluate typeof System', ParserHelpers.evaluateToString('object'));

                setNotSupported('System.set');
                setNotSupported('System.get');
                setNotSupported('System.register');
                parser.plugin('expression System', function () {
                    const systemPolyfillRequire = ParserHelpers.requireFileAsExpression(
                        this.state.module.context, require.resolve('../../buildin/system.js'));
                    return ParserHelpers.addParsedVariableToModule(this, 'System', systemPolyfillRequire);
                });
            });
        });
    }
}

export = SystemPlugin;
