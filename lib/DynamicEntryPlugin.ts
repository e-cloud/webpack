/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Naoyuki Kanezawa @nkzawa
 */
'use strict';

import MultiEntryDependency = require('./dependencies/MultiEntryDependency');
import SingleEntryDependency = require('./dependencies/SingleEntryDependency');
import MultiModuleFactory = require('./MultiModuleFactory');
import MultiEntryPlugin = require('./MultiEntryPlugin');
import SingleEntryPlugin = require('./SingleEntryPlugin');
import Compiler = require('./Compiler')
import Compilation = require('./Compilation')
import { CompilationParams, EntryFunc } from '../typings/webpack-types'

class DynamicEntryPlugin {
    constructor(public context: string, public entry: EntryFunc) {
    }

    apply(compiler: Compiler) {
        compiler.plugin('compilation', (compilation: Compilation, params: CompilationParams) => {
            const multiModuleFactory = new MultiModuleFactory();
            const normalModuleFactory = params.normalModuleFactory;

            compilation.dependencyFactories.set(MultiEntryDependency, multiModuleFactory);
            compilation.dependencyFactories.set(SingleEntryDependency, normalModuleFactory);
        });

        compiler.plugin('make', (compilation: Compilation, callback) => {
            const addEntry = (entry: string| string[], name: string) => {
                const dep = DynamicEntryPlugin.createDependency(entry, name);
                return new Promise((resolve, reject) => {
                    compilation.addEntry(this.context, dep, name, err => {
                        if (err) {
                            return reject(err);
                        }
                        resolve();
                    });
                });
            };

            Promise.resolve(this.entry())
                .then(entry => {
                    if (typeof entry === 'string' || Array.isArray(entry)) {
                        addEntry(entry, 'main')
                            .then(() => callback(), callback);
                    }
                    else if (typeof entry === 'object') {
                        Promise.all(Object.keys(entry)
                            .map(name => addEntry(entry[name], name))
                            )
                            .then(() => callback(), callback);
                    }
                });
        });
    }

    static createDependency(entry: string| string[], name: string) {
        if (Array.isArray(entry)) {
            return MultiEntryPlugin.createDependency(entry, name);
        }
        else {
            return SingleEntryPlugin.createDependency(entry, name);
        }
    }
}

export = DynamicEntryPlugin;
