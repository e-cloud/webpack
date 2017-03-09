/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import Tapable = require('tapable');
import DllModule = require('./DllModule');
import DllEntryDependency = require('./dependencies/DllEntryDependency')
import { ErrCallback } from '../typings/webpack-types'

class DllModuleFactory extends Tapable {
    create(data: {
               dependencies: DllEntryDependency[]
               context: string
           }, callback: ErrCallback) {
        const dependency = data.dependencies[0];
        callback(null, new DllModule(data.context, dependency.dependencies, dependency.name, dependency.type));
    }
}

export = DllModuleFactory;
