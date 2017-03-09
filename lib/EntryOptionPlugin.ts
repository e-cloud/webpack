/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import SingleEntryPlugin = require('./SingleEntryPlugin');
import MultiEntryPlugin = require('./MultiEntryPlugin');
import Compiler = require('./Compiler')
import { Entry } from '../typings/webpack-types'
import DynamicEntryPlugin = require('./DynamicEntryPlugin');

class EntryOptionPlugin {
    apply(compiler: Compiler) {
        compiler.plugin('entry-option', function (context: string, entry: Entry) {
            function itemToPlugin(item: string | string[], name: string) {
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
            } else if (typeof entry === 'function') {
                compiler.apply(new DynamicEntryPlugin(context, entry));
            }
            return true;
        });
    }
}

export = EntryOptionPlugin;
