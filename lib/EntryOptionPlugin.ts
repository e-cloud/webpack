/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import SingleEntryPlugin = require('./SingleEntryPlugin');
import MultiEntryPlugin = require('./MultiEntryPlugin');
import Compiler = require('./Compiler')

class EntryOptionPlugin {
    apply(compiler: Compiler) {
        compiler.plugin('entry-option', function (context, entry) {
            function itemToPlugin(item, name) {
                if (Array.isArray(item)) {
                    return new MultiEntryPlugin(context, item, name);
                }
                else {
                    return new SingleEntryPlugin(context, item, name);
                }
            }

            if (typeof entry === 'string' || Array.isArray(entry)) {
                compiler.apply(itemToPlugin(entry, 'main'));
            }
            else if (typeof entry === 'object') {
                Object.keys(entry).forEach(name => {
                    compiler.apply(itemToPlugin(entry[name], name));
                });
            }
            return true;
        });
    }
}

export = EntryOptionPlugin;
