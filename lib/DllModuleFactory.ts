/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import Tapable = require('tapable');
import DllModule = require('./DllModule');

class DllModuleFactory extends Tapable {
    constructor() {
        super();
    }

    create(data, callback) {
        const dependency = data.dependencies[0];
        callback(null, new DllModule(data.context, dependency.dependencies, dependency.name, dependency.type));
    }
}

export = DllModuleFactory;
