/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import Compiler = require('../Compiler')

class WebEnvironmentPlugin {
    constructor(public inputFileSystem, public outputFileSystem) {
    }

    apply(compiler: Compiler) {
        const inputFileSystem = compiler.inputFileSystem = this.inputFileSystem;
        compiler.outputFileSystem = this.outputFileSystem;
    }
}

export = WebEnvironmentPlugin;
