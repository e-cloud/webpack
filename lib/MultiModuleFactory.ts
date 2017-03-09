/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import Tapable = require('tapable');
import MultiModule = require('./MultiModule');
import { ErrCallback } from '../typings/webpack-types'

class MultiModuleFactory extends Tapable {
    create(data: {
               context: string
               dependencies: [MultiModule]
           }, callback: ErrCallback) {
        const dependency = data.dependencies[0];
        callback(null, new MultiModule(data.context, dependency.dependencies, dependency.name));
    }
}

export = MultiModuleFactory;
