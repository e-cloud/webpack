/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import Compiler = require('../Compiler')
import { AbstractInputFileSystem } from 'enhanced-resolve/lib/common-types'
import { AbstractOutputFileSystem } from '../../typings/webpack-types'

class WebEnvironmentPlugin {
    constructor(public inputFileSystem: AbstractInputFileSystem, public outputFileSystem: AbstractOutputFileSystem) {
    }

    apply(compiler: Compiler) {
        compiler.outputFileSystem = this.outputFileSystem;
    }
}

export = WebEnvironmentPlugin;
