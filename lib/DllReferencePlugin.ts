/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import DelegatedSourceDependency = require('./dependencies/DelegatedSourceDependency');
import DelegatedModuleFactoryPlugin = require('./DelegatedModuleFactoryPlugin');
import ExternalModuleFactoryPlugin = require('./ExternalModuleFactoryPlugin');
import Compiler = require('./Compiler')
import Compilation = require('./Compilation')
import { CompilationParams } from '../typings/webpack-types'
import LibManifestPlugin = require('./LibManifestPlugin')

interface DllManifest {
    name: string
    content: LibManifestPlugin.ManifestContent
}

class DllReferencePlugin {
    constructor(public options: DllReferencePlugin.Option) {
    }

    apply(compiler: Compiler) {
        compiler.plugin('compilation', function (compilation: Compilation, params: CompilationParams) {
            const normalModuleFactory = params.normalModuleFactory;

            compilation.dependencyFactories.set(DelegatedSourceDependency, normalModuleFactory);
        });
        compiler.plugin('before-compile', (params: CompilationParams, callback) => {
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
        compiler.plugin('compile', (params: CompilationParams) => {
            const optionsManifest = this.options.manifest
            const manifest = typeof optionsManifest === 'string'
                ? params[`dll reference ${optionsManifest}`]
                : optionsManifest;
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
        });
    }
}

declare namespace DllReferencePlugin {
    interface Option {
        manifest: string | DllManifest
        name: string
        sourceType: string
        type: string
        scope: string
        context: string
        content: string
        extensions: string[]
    }
}

export = DllReferencePlugin;
