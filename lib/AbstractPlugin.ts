/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import Tapable = require('tapable')
import { PlainObject } from '../typings/webpack-types'

class AbstractPlugin {
    _plugins: Dictionary<Tapable.Handler>

    constructor(plugins: PlainObject = {}) {
        this._plugins = plugins;
    }

    // todo: remove this static method
    static create(plugins: PlainObject) {
        class Plugin extends AbstractPlugin {
            constructor() {
                super(plugins);
            }
        }

        return Plugin;
    }

    apply(object: Tapable) {
        for (const name in this._plugins) {
            object.plugin(name, this._plugins[name]);
        }
    }
}

export = AbstractPlugin;
