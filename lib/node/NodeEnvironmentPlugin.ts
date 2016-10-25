/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import NodeWatchFileSystem = require('./NodeWatchFileSystem');

import NodeOutputFileSystem = require('./NodeOutputFileSystem');
import NodeJsInputFileSystem = require('enhanced-resolve/lib/NodeJsInputFileSystem');
import CachedInputFileSystem = require('enhanced-resolve/lib/CachedInputFileSystem');

class NodeEnvironmentPlugin {
	apply(compiler) {
		compiler.inputFileSystem = new NodeJsInputFileSystem();
		const inputFileSystem = compiler.inputFileSystem = new CachedInputFileSystem(compiler.inputFileSystem, 60000);
		compiler.resolvers.normal.fileSystem = compiler.inputFileSystem;
		compiler.resolvers.context.fileSystem = compiler.inputFileSystem;
		compiler.resolvers.loader.fileSystem = compiler.inputFileSystem;
		compiler.outputFileSystem = new NodeOutputFileSystem();
		compiler.watchFileSystem = new NodeWatchFileSystem(compiler.inputFileSystem);
		compiler.plugin('before-run', function (compiler, callback) {
			if (compiler.inputFileSystem === inputFileSystem) {
				inputFileSystem.purge();
			}
			callback();
		});
	}
}

export = NodeEnvironmentPlugin;
