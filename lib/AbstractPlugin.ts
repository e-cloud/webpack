/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
class AbstractPlugin {
    constructor(plugins) {
        this._plugins = plugins || {};
    }

    static create(plugins) {
        class Plugin extends AbstractPlugin {
            constructor() {
                super(plugins);
            }
        }

        return Plugin;
    }

    apply(object) {
        for (const name in this._plugins) {
            object.plugin(name, this._plugins[name]);
        }
    }
}

export = AbstractPlugin;
