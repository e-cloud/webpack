/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import ExternalsPlugin = require('../ExternalsPlugin');

class NodeTargetPlugin {
	apply(compiler) {
		new ExternalsPlugin('commonjs', Object.keys(process.binding('natives'))).apply(compiler);
	}
}

export = NodeTargetPlugin;
