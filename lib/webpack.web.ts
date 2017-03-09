/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import Compiler = require('./Compiler');
import WebEnvironmentPlugin = require('./web/WebEnvironmentPlugin');
import WebpackOptionsApply = require('./WebpackOptionsApply');
import WebpackOptionsDefaulter = require('./WebpackOptionsDefaulter');
import { WatchCallback, WebpackOptions } from '../typings/webpack-types'
import Stats = require('./Stats')

function webpack(options: WebpackOptions, callback: WatchCallback<Stats>) {
    new WebpackOptionsDefaulter().process(options);

    const compiler = new Compiler();
    compiler.options = options;
    compiler.options = new WebpackOptionsApply().process(options, compiler);
    new WebEnvironmentPlugin(options.inputFileSystem, options.outputFileSystem).apply(compiler);
    if (callback) {
        compiler.run(callback);
    }
    return compiler;
}
export = webpack;

webpack.WebpackOptionsDefaulter = WebpackOptionsDefaulter;
webpack.WebpackOptionsApply = WebpackOptionsApply;
webpack.Compiler = Compiler;
webpack.WebEnvironmentPlugin = WebEnvironmentPlugin;
