/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import Compiler = require('./Compiler');
import MultiCompiler = require('./MultiCompiler');
import NodeEnvironmentPlugin = require('./node/NodeEnvironmentPlugin');
import WebpackOptionsApply = require('./WebpackOptionsApply');
import WebpackOptionsDefaulter = require('./WebpackOptionsDefaulter');
import validateWebpackOptions = require('./validateWebpackOptions');
import WebpackOptionsValidationError = require('./WebpackOptionsValidationError');

function webpack(options, callback) {
    const webpackOptionsValidationErrors = validateWebpackOptions(options);
    if (webpackOptionsValidationErrors.length) {
        throw new WebpackOptionsValidationError(webpackOptionsValidationErrors);
    }
    let compiler;
    if (Array.isArray(options)) {
        compiler = new MultiCompiler(options.map(options => webpack(options)));
    }
    else if (typeof options === 'object') {
        new WebpackOptionsDefaulter().process(options);

        compiler = new Compiler();
        compiler.options = options;
        compiler.options = new WebpackOptionsApply().process(options, compiler);
        new NodeEnvironmentPlugin().apply(compiler);
        compiler.applyPlugins('environment');
        compiler.applyPlugins('after-environment');
    }
    else {
        throw new Error('Invalid argument: options');
    }
    if (callback) {
        if (typeof callback !== 'function') {
            throw new Error('Invalid argument: callback');
        }
        if (options.watch === true || Array.isArray(options) && options.some(o => o.watch)) {
            const watchOptions = (!Array.isArray(options) ? options : options[0]).watchOptions || {};
            return compiler.watch(watchOptions, callback);
        }
        compiler.run(callback);
    }
    return compiler;
}

export = webpack;

webpack.WebpackOptionsDefaulter = WebpackOptionsDefaulter;
webpack.WebpackOptionsApply = WebpackOptionsApply;
webpack.Compiler = Compiler;
webpack.MultiCompiler = MultiCompiler;
webpack.NodeEnvironmentPlugin = NodeEnvironmentPlugin;
webpack.validate = validateWebpackOptions;

function exportPlugins(exports, path, plugins) {
    plugins.forEach(name => {
        Object.defineProperty(exports, name, {
            configurable: false,
            enumerable: true,
            get() {
                return require(`${path}/${name}`);
            }
        });
    });
}

exportPlugins(exports, '.', [
    'AutomaticPrefetchPlugin',
    'BannerPlugin',
    'CachePlugin',
    'ContextReplacementPlugin',
    'DefinePlugin',
    'DllPlugin',
    'DllReferencePlugin',
    'EnvironmentPlugin',
    'EvalDevToolModulePlugin',
    'EvalSourceMapDevToolPlugin',
    'ExtendedAPIPlugin',
    'ExternalsPlugin',
    'HashedModuleIdsPlugin',
    'HotModuleReplacementPlugin',
    'IgnorePlugin',
    'JsonpTemplatePlugin',
    'LibraryTemplatePlugin',
    'LoaderOptionsPlugin',
    'LoaderTargetPlugin',
    'MemoryOutputFileSystem',
    'ModuleFilenameHelpers',
    'NamedModulesPlugin',
    'NewWatchingPlugin',
    'NoErrorsPlugin',
    'NormalModuleReplacementPlugin',
    'PrefetchPlugin',
    'ProgressPlugin',
    'ProvidePlugin',
    'SetVarMainTemplatePlugin',
    'SourceMapDevToolPlugin',
    'UmdMainTemplatePlugin',
    'WatchIgnorePlugin'
]);
exportPlugins(exports.optimize = {}, './optimize', [
    'AggressiveMergingPlugin',
    'AggressiveSplittingPlugin',
    'ChunkModuleIdRangePlugin',
    'CommonsChunkPlugin',
    'DedupePlugin',
    'LimitChunkCountPlugin',
    'MinChunkSizePlugin',
    'OccurrenceOrderPlugin',
    'UglifyJsPlugin'
]);
exportPlugins(exports.dependencies = {}, './dependencies', []);
