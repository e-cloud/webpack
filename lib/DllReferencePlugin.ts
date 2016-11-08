/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import DelegatedSourceDependency = require('./dependencies/DelegatedSourceDependency');
import DelegatedModuleFactoryPlugin = require('./DelegatedModuleFactoryPlugin');
import ExternalModuleFactoryPlugin = require('./ExternalModuleFactoryPlugin');
import Compiler = require('./Compiler')
import Compilation = require('./Compilation')

interface DllManifest {
    name: string
    content: string
}

class DllReferencePlugin {
    options: {
        manifest: string | {
            name: string
            content: string
        }
        name: string
        sourceType: string
        type: string
        scope: string
        context: string
        content: string
        extensions: string[]
    }

    constructor(options) {
        this.options = options;
    }

    apply(compiler: Compiler) {
        compiler.plugin('compilation', function (compilation: Compilation, params) {
            const normalModuleFactory = params.normalModuleFactory;

            compilation.dependencyFactories.set(DelegatedSourceDependency, normalModuleFactory);
        });
        compiler.plugin('before-compile', (params, callback) => {
            const manifest = this.options.manifest;
            if (typeof manifest === 'string') {
                params.compilationDependencies.push(manifest);
                compiler.inputFileSystem.readFile(manifest, (err, result) => {
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
        });
        compiler.plugin('compile', params => {
            let manifest = this.options.manifest;
            if (typeof manifest === 'string') {
                manifest = params[`dll reference ${manifest}`];
            }
            const name = this.options.name || (manifest as DllManifest).name;
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
                content: this.options.content || (manifest as DllManifest).content,
                extensions: this.options.extensions
            }));
        });
    }
}

export = DllReferencePlugin;
