/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import Module = require('./Module')
import Chunk = require('./Chunk')
import Dependency = require('./Dependency')

class ModuleReason {
    chunks: Chunk[]

    constructor(public module: Module, public dependency: Dependency) {
    }
}
export = ModuleReason;
