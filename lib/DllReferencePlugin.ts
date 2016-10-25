/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import DelegatedSourceDependency = require('./dependencies/DelegatedSourceDependency');

import DelegatedModuleFactoryPlugin = require('./DelegatedModuleFactoryPlugin');
import ExternalModuleFactoryPlugin = require('./ExternalModuleFactoryPlugin');

class DllReferencePlugin {
    constructor(options) {
        this.options = options;
    }

    apply(compiler) {
        compiler.plugin('compilation', function (compilation, params) {
            const normalModuleFactory = params.normalModuleFactory;

            compilation.dependencyFactories.set(DelegatedSourceDependency, normalModuleFactory);
        });
        compiler.plugin('before-compile', function (params, callback) {
            const manifest = this.options.manifest;
            if (typeof manifest === 'string') {
                params.compilationDependencies.push(manifest);
                compiler.inputFileSystem.readFile(manifest, function (err, result) {
                    if (err) {
                        return callback(err);
                    }
                    params[`dll reference ${manifest}`] = JSON.parse(result.toString('utf-8'));
                    return callback();
                });
            }
            else {
                return callback();
            }
        }.bind(this));
        compiler.plugin('compile', function (params) {
            let manifest = this.options.manifest;
            if (typeof manifest === 'string') {
                manifest = params[`dll reference ${manifest}`];
            }
            const name = this.options.name || manifest.name;
            const sourceType = this.options.sourceType || 'var';
            const externals = {};
            const source = `dll-reference ${name}`;
            externals[source] = name;
            params.normalModuleFactory.apply(new ExternalModuleFactoryPlugin(sourceType, externals));
            params.normalModuleFactory.apply(new DelegatedModuleFactoryPlugin({
                source,
                type: this.options.type,
                scope: this.options.scope,
                context: this.options.context || compiler.options.context,
                content: this.options.content || manifest.content,
                extensions: this.options.extensions
            }));
        }.bind(this));
    }
}

export = DllReferencePlugin;
