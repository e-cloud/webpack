/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import DllEntryPlugin = require('./DllEntryPlugin');
import LibManifestPlugin = require('./LibManifestPlugin');
import FlagInitialModulesAsUsedPlugin = require('./FlagInitialModulesAsUsedPlugin');
import Compiler = require('./Compiler')

class DllPlugin {
    constructor(public options) {
    }

    apply(compiler: Compiler) {
        compiler.plugin('entry-option', function (context, entry) {
            function itemToPlugin(item, name) {
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
