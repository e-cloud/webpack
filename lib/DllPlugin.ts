/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import DllEntryPlugin = require('./DllEntryPlugin');
import LibManifestPlugin = require('./LibManifestPlugin');
import FlagInitialModulesAsUsedPlugin = require('./FlagInitialModulesAsUsedPlugin');
import Compiler = require('./Compiler')
import { Entry } from '../typings/webpack-types'

class DllPlugin {
    constructor(
        public options: {
            name: string
            path: string
        }
    ) {
    }

    apply(compiler: Compiler) {
        compiler.plugin('entry-option', function (context: string, entry: Entry) {
            function itemToPlugin(item: string | string[], name: string) {
                if (Array.isArray(item)) {
                    return new DllEntryPlugin(context, item, name);
                }
                else {
                    throw new Error('DllPlugin: supply an Array as entry');
                }
            }

            if (typeof entry === 'object' && !Array.isArray(entry)) {
                Object.keys(entry).forEach(name => {
                    compiler.apply(itemToPlugin(entry[name], name));
                });
            }
            else {
                compiler.apply(itemToPlugin(entry, 'main'));
            }
            return true;
        });
        compiler.apply(new LibManifestPlugin(this.options));
        compiler.apply(new FlagInitialModulesAsUsedPlugin());
    }
}

export = DllPlugin;
