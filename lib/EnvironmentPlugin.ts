/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Simen Brekken @simenbrekken
 */
import DefinePlugin = require('./DefinePlugin');
import Compiler = require('./Compiler')

class EnvironmentPlugin {
    keys: string[]
    defaultValues: object

    constructor(keys: string[])
    constructor(...keys: string[])

    constructor(keys: any) {
        if (Array.isArray(keys)) {
            this.keys = keys;
            this.defaultValues = {};
        } else if (keys && typeof keys === 'object') {
            this.keys = Object.keys(keys);
            this.defaultValues = keys;
        } else {
            this.keys = Array.prototype.slice.call(arguments);
            this.defaultValues = {};
        }
    }

    apply(compiler: Compiler) {
        const definitions = this.keys.reduce((defs, key) => {
            const value = process.env[key] !== undefined ? process.env[key] : this.defaultValues[key];

            if (value === undefined) {
                compiler.plugin('this-compilation', compilation => {
                    const error = new Error(
                        `EnvironmentPlugin - ${key} environment variable is undefined.

You can pass an object with default values to suppress this warning.
See https://webpack.js.org/plugins/environment-plugin for example.`
                    );

                    error.name = 'EnvVariableNotDefinedError';
                    compilation.warnings.push(error);
                });
            }

            defs[`process.env.${key}`] = typeof value === 'undefined' ? 'undefined' : JSON.stringify(value);

            return defs;
        }, {});

        compiler.apply(new DefinePlugin(definitions));
    }
}

export = EnvironmentPlugin;
