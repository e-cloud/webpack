/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import ExternalsPlugin = require('../ExternalsPlugin');
import Compiler = require('../Compiler')

class NodeTargetPlugin {
    apply(compiler: Compiler) {
        new ExternalsPlugin('commonjs', Object.keys(process.binding('natives'))).apply(compiler);
    }
}

export = NodeTargetPlugin;
