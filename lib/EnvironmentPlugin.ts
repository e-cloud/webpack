/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Simen Brekken @simenbrekken
 */
import DefinePlugin = require('./DefinePlugin');
import Compiler = require('./Compiler')
import Compilation = require('./Compilation')

class EnvironmentPlugin {
    keys: string[]

    constructor(keys: string[])
    constructor(...keys: string[])

    constructor(keys: any) {
        this.keys = Array.isArray(keys) ? keys : Array.prototype.slice.call(arguments);
    }

    apply(compiler: Compiler) {
        compiler.apply(
            new DefinePlugin(
                this.keys.reduce((definitions, key) => {
                    const value = process.env[key];

                    if (value === undefined) {
                        compiler.plugin('this-compilation', function (compilation: Compilation) {
                            const error = new Error(`${key} environment variable is undefined.`);
                            error.name = 'EnvVariableNotDefinedError';
                            compilation.warnings.push(error);
                        });
                    }

                    definitions[`process.env.${key}`] = value ? JSON.stringify(value) : 'undefined';

                    return definitions;
                }, {})
            )
        );
    }
}

export = EnvironmentPlugin;
