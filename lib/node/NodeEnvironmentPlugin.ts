/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import NodeWatchFileSystem = require('./NodeWatchFileSystem');
import NodeOutputFileSystem = require('./NodeOutputFileSystem');
// todo: these are exported via resolve namespace
import NodeJsInputFileSystem = require('enhanced-resolve/lib/NodeJsInputFileSystem');
import CachedInputFileSystem = require('enhanced-resolve/lib/CachedInputFileSystem');
import Compiler = require('../Compiler')

class NodeEnvironmentPlugin {
    apply(compiler: Compiler) {
        // todo: useless assignment?
        compiler.inputFileSystem = new CachedInputFileSystem(new NodeJsInputFileSystem(), 60000);
        const inputFileSystem = compiler.inputFileSystem;
        compiler.outputFileSystem = new NodeOutputFileSystem();
        compiler.watchFileSystem = new NodeWatchFileSystem(compiler.inputFileSystem);
        compiler.plugin('before-run', function (compiler: Compiler, callback: Function) {
            if (compiler.inputFileSystem === inputFileSystem) {
                inputFileSystem.purge();
            }
            callback();
        });
    }
}

export = NodeEnvironmentPlugin;
