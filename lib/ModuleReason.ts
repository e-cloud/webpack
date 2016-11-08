/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import Module = require('./Module')
import Chunk = require('./Chunk')

class ModuleReason {
    chunks: Chunk[]

    constructor(public module: Module, public dependency) {
    }
}
export = ModuleReason;
