/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import Compiler = require('./Compiler');
import MultiCompiler = require('./MultiCompiler');
import NodeEnvironmentPlugin = require('./node/NodeEnvironmentPlugin');
import WebpackOptionsApply = require('./WebpackOptionsApply');
import WebpackOptionsDefaulter = require('./WebpackOptionsDefaulter');
import validateSchema = require('./validateSchema');
import WebpackOptionsValidationError = require('./WebpackOptionsValidationError');
import { AbstractStats, WatchCallback, WebpackOptions } from '../typings/webpack-types'
import Watching = Compiler.Watching
import MultiWatching = MultiCompiler.MultiWatching

const webpackOptionsSchema = require('../schemas/webpackOptionsSchema.json');

function webpack(options: WebpackOptions, callback: WatchCallback<AbstractStats>): Watching | MultiWatching
function webpack(options: WebpackOptions): MultiCompiler | Compiler

function webpack(options: any, callback?: WatchCallback<AbstractStats>) {
    const webpackOptionsValidationErrors = validateSchema(webpackOptionsSchema, options);
    if (webpackOptionsValidationErrors.length) {
        throw new WebpackOptionsValidationError(webpackOptionsValidationErrors);
    }

    let compiler: MultiCompiler | Compiler;
    if (Array.isArray(options)) {
        compiler = new MultiCompiler(options.map(options => webpack(options) as Compiler));
    }
    else if (typeof options === 'object') {
        new WebpackOptionsDefaulter().process(options);

        compiler = new Compiler();
        compiler.context = options.context;
        compiler.options = options;
        new NodeEnvironmentPlugin().apply(compiler);
        if (options.plugins && Array.isArray(options.plugins)) {
            compiler.apply.apply(compiler, options.plugins);
        }
        compiler.applyPlugins('environment');
        compiler.applyPlugins('after-environment');
        compiler.options = new WebpackOptionsApply().process(options, compiler);
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
webpack.validate = validateSchema.bind(this, webpackOptionsSchema);
webpack.validateSchema = validateSchema;
webpack.WebpackOptionsValidationError = WebpackOptionsValidationError;

function exportPlugins(exports, path: string, plugins: string[]) {
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

exportPlugins(webpack, '.', [
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
    'NoEmitOnErrorsPlugin',
    'NormalModuleReplacementPlugin',
    'PrefetchPlugin',
    'ProgressPlugin',
    'ProvidePlugin',
    'SetVarMainTemplatePlugin',
    'SourceMapDevToolPlugin',
    'UmdMainTemplatePlugin',
    'WatchIgnorePlugin'
]);
exportPlugins(webpack.optimize = {}, './optimize', [
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
exportPlugins(webpack.dependencies = {}, './dependencies', []);
