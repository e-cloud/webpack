/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import assign = require('object-assign');

import OptionsApply = require('./OptionsApply');
import LoaderTargetPlugin = require('./LoaderTargetPlugin');
import FunctionModulePlugin = require('./FunctionModulePlugin');
import EvalDevToolModulePlugin = require('./EvalDevToolModulePlugin');
import SourceMapDevToolPlugin = require('./SourceMapDevToolPlugin');
import EvalSourceMapDevToolPlugin = require('./EvalSourceMapDevToolPlugin');
import EntryOptionPlugin = require('./EntryOptionPlugin');
import RecordIdsPlugin = require('./RecordIdsPlugin');
import APIPlugin = require('./APIPlugin');
import ConstPlugin = require('./ConstPlugin');
import RequireJsStuffPlugin = require('./RequireJsStuffPlugin');
import NodeStuffPlugin = require('./NodeStuffPlugin');
import CompatibilityPlugin = require('./CompatibilityPlugin');
import TemplatedPathPlugin = require('./TemplatedPathPlugin');
import WarnCaseSensitiveModulesPlugin = require('./WarnCaseSensitiveModulesPlugin');
import UseStrictPlugin = require('./UseStrictPlugin');
import LoaderPlugin = require('./dependencies/LoaderPlugin');
import CommonJsPlugin = require('./dependencies/CommonJsPlugin');
import HarmonyModulesPlugin = require('./dependencies/HarmonyModulesPlugin');
import SystemPlugin = require('./dependencies/SystemPlugin');
import ImportPlugin = require('./dependencies/ImportPlugin');
import AMDPlugin = require('./dependencies/AMDPlugin');
import RequireContextPlugin = require('./dependencies/RequireContextPlugin');
import RequireEnsurePlugin = require('./dependencies/RequireEnsurePlugin');
import RequireIncludePlugin = require('./dependencies/RequireIncludePlugin');
import EnsureChunkConditionsPlugin = require('./optimize/EnsureChunkConditionsPlugin');
import RemoveParentModulesPlugin = require('./optimize/RemoveParentModulesPlugin');
import RemoveEmptyChunksPlugin = require('./optimize/RemoveEmptyChunksPlugin');
import MergeDuplicateChunksPlugin = require('./optimize/MergeDuplicateChunksPlugin');
import FlagIncludedChunksPlugin = require('./optimize/FlagIncludedChunksPlugin');
import OccurrenceOrderPlugin = require('./optimize/OccurrenceOrderPlugin');
import FlagDependencyUsagePlugin = require('./FlagDependencyUsagePlugin');
import FlagDependencyExportsPlugin = require('./FlagDependencyExportsPlugin');
import EmittedAssetSizeLimitPlugin = require('./performance/EmittedAssetSizeLimitPlugin');
import { ResolverFactory } from 'enhanced-resolve'
import { WebpackOptions } from '../typings/webpack-types'
import Compiler = require('./Compiler')

class WebpackOptionsApply extends OptionsApply {
    process(options: WebpackOptions, compiler: Compiler) {
        let ExternalsPlugin;
        compiler.context = options.context;

        if (options.plugins && Array.isArray(options.plugins)) {
            compiler.apply(...options.plugins);
        }

        compiler.outputPath = options.output.path;
        compiler.recordsInputPath = options.recordsInputPath || options.recordsPath;
        compiler.recordsOutputPath = options.recordsOutputPath || options.recordsPath;
        compiler.name = options.name;
        compiler.dependencies = options.dependencies;
        if (typeof options.target === 'string') {
            let JsonpTemplatePlugin;
            let NodeSourcePlugin;
            let NodeTargetPlugin;
            let NodeTemplatePlugin;
            switch (options.target) {
                case 'web':
                    JsonpTemplatePlugin = require('./JsonpTemplatePlugin');
                    NodeSourcePlugin = require('./node/NodeSourcePlugin');
                    compiler.apply(
                        new JsonpTemplatePlugin(options.output),
                        new FunctionModulePlugin(options.output),
                        new NodeSourcePlugin(options.node),
                        new LoaderTargetPlugin('web')
                    );
                    break;
                case 'webworker':
                    const WebWorkerTemplatePlugin = require('./webworker/WebWorkerTemplatePlugin');
                    NodeSourcePlugin = require('./node/NodeSourcePlugin');
                    compiler.apply(
                        new WebWorkerTemplatePlugin(options.output),
                        new FunctionModulePlugin(options.output),
                        new NodeSourcePlugin(options.node),
                        new LoaderTargetPlugin('webworker')
                    );
                    break;
                case 'node':
                case 'async-node':
                    NodeTemplatePlugin = require('./node/NodeTemplatePlugin');
                    NodeTargetPlugin = require('./node/NodeTargetPlugin');
                    compiler.apply(
                        new NodeTemplatePlugin(
                            {
                                asyncChunkLoading: options.target === 'async-node'
                            }
                        ),
                        new FunctionModulePlugin(options.output),
                        new NodeTargetPlugin(),
                        new LoaderTargetPlugin('node')
                    );
                    break;
                case 'node-webkit':
                    JsonpTemplatePlugin = require('./JsonpTemplatePlugin');
                    NodeTargetPlugin = require('./node/NodeTargetPlugin');
                    ExternalsPlugin = require('./ExternalsPlugin');
                    compiler.apply(
                        new JsonpTemplatePlugin(options.output),
                        new FunctionModulePlugin(options.output),
                        new NodeTargetPlugin(),
                        new ExternalsPlugin('commonjs', 'nw.gui'),
                        new LoaderTargetPlugin('node-webkit')
                    );
                    break;
                case 'atom':
                case 'electron':
                case 'electron-main':
                    NodeTemplatePlugin = require('./node/NodeTemplatePlugin');
                    NodeTargetPlugin = require('./node/NodeTargetPlugin');
                    ExternalsPlugin = require('./ExternalsPlugin');
                    compiler.apply(
                        new NodeTemplatePlugin(
                            {
                                asyncChunkLoading: true
                            }
                        ),
                        new FunctionModulePlugin(options.output),
                        new NodeTargetPlugin(),
                        new ExternalsPlugin(
                            'commonjs', [
                                'app',
                                'auto-updater',
                                'browser-window',
                                'content-tracing',
                                'dialog',
                                'electron',
                                'global-shortcut',
                                'ipc',
                                'ipc-main',
                                'menu',
                                'menu-item',
                                'power-monitor',
                                'power-save-blocker',
                                'protocol',
                                'session',
                                'web-contents',
                                'tray',
                                'clipboard',
                                'crash-reporter',
                                'native-image',
                                'screen',
                                'shell'
                            ]
                        ),
                        new LoaderTargetPlugin(options.target)
                    );
                    break;
                case 'electron-renderer':
                    JsonpTemplatePlugin = require('./JsonpTemplatePlugin');
                    NodeTargetPlugin = require('./node/NodeTargetPlugin');
                    ExternalsPlugin = require('./ExternalsPlugin');
                    compiler.apply(
                        new JsonpTemplatePlugin(options.output),
                        new FunctionModulePlugin(options.output),
                        new NodeTargetPlugin(),
                        new ExternalsPlugin(
                            'commonjs', [
                                'desktop-capturer',
                                'electron',
                                'ipc',
                                'ipc-renderer',
                                'remote',
                                'web-frame',
                                'clipboard',
                                'crash-reporter',
                                'native-image',
                                'screen',
                                'shell'
                            ]
                        ),
                        new LoaderTargetPlugin(options.target)
                    );
                    break;
                default:
                    throw new Error(`Unsupported target '${options.target}'.`);
            }
        }
        else if (options.target !== false) {
            options.target(compiler);
        }
        else {
            throw new Error(`Unsupported target '${options.target}'.`);
        }

        if (options.output.library || options.output.libraryTarget !== 'var') {
            const LibraryTemplatePlugin = require('./LibraryTemplatePlugin');
            compiler.apply(new LibraryTemplatePlugin(options.output.library, options.output.libraryTarget, options.output.umdNamedDefine, options.output.auxiliaryComment || ''));
        }

        if (options.externals) {
            ExternalsPlugin = require('./ExternalsPlugin');
            compiler.apply(new ExternalsPlugin(options.output.libraryTarget, options.externals));
        }

        if (options.devtool && (options.devtool.includes('sourcemap') || options.devtool.includes('source-map'))) {
            const hidden = options.devtool.includes('hidden');
            const inline = options.devtool.includes('inline');
            const evalWrapped = options.devtool.includes('eval');
            const cheap = options.devtool.includes('cheap');
            const moduleMaps = options.devtool.includes('module');
            let noSources = options.devtool.includes('nosources');
            let legacy = options.devtool.includes('@');
            let modern = options.devtool.includes('#');
            let comment = legacy && modern
                ? '\n/*\n//@ sourceMappingURL=[url]\n//# sourceMappingURL=[url]\n*/'
                : legacy
                    ? '\n/*\n//@ sourceMappingURL=[url]\n*/'
                    : modern
                        ? '\n//# sourceMappingURL=[url]'
                        : undefined;
            const Plugin = evalWrapped ? EvalSourceMapDevToolPlugin : SourceMapDevToolPlugin;
            compiler.apply(
                new Plugin(
                    {
                        filename: inline ? null : options.output.sourceMapFilename,
                        moduleFilenameTemplate: options.output.devtoolModuleFilenameTemplate,
                        fallbackModuleFilenameTemplate: options.output.devtoolFallbackModuleFilenameTemplate,
                        append: hidden ? false : comment,
                        module: moduleMaps ? true : cheap ? false : true,
                        columns: cheap ? false : true,
                        lineToLine: options.output.devtoolLineToLine as boolean,
                        noSources
                    }
                )
            );
        }
        else if (options.devtool && options.devtool.includes('eval')) {
            let legacy = options.devtool.includes('@');
            let modern = options.devtool.includes('#');
            let comment = legacy && modern
                ? '\n//@ sourceURL=[url]\n//# sourceURL=[url]'
                : legacy
                    ? '\n//@ sourceURL=[url]'
                    : modern
                        ? '\n//# sourceURL=[url]'
                        : undefined;
            compiler.apply(new EvalDevToolModulePlugin(comment, options.output.devtoolModuleFilenameTemplate));
        }

        compiler.apply(new EntryOptionPlugin());
        compiler.applyPluginsBailResult('entry-option', options.context, options.entry);

        compiler.apply(
            new CompatibilityPlugin(),
            new LoaderPlugin(),
            new NodeStuffPlugin(options.node),
            new RequireJsStuffPlugin(),
            new APIPlugin(),
            new ConstPlugin(),
            new UseStrictPlugin(),
            new RequireIncludePlugin(),
            new RequireEnsurePlugin(),
            new RequireContextPlugin(options.resolve.modules, options.resolve.extensions),
            new AMDPlugin(options.module, options.amd || {}),
            new CommonJsPlugin(options.module),
            new HarmonyModulesPlugin(),
            new ImportPlugin(options.module),
            new SystemPlugin(options.module)
        );

        compiler.apply(
            new EnsureChunkConditionsPlugin(),
            new RemoveParentModulesPlugin(),
            new RemoveEmptyChunksPlugin(),
            new MergeDuplicateChunksPlugin(),
            new FlagIncludedChunksPlugin(),
            new OccurrenceOrderPlugin(true),
            new FlagDependencyExportsPlugin(),
            new FlagDependencyUsagePlugin()
        );

        compiler.apply(new EmittedAssetSizeLimitPlugin(options.performance));

        compiler.apply(new TemplatedPathPlugin());

        compiler.apply(new RecordIdsPlugin());

        compiler.apply(new WarnCaseSensitiveModulesPlugin());

        if (options.cache) {
            const CachePlugin = require('./CachePlugin');
            compiler.apply(new CachePlugin(typeof options.cache === 'object' ? options.cache : undefined));
        }

        compiler.applyPlugins('after-plugins', compiler);
        compiler.resolvers.normal = ResolverFactory.createResolver(
            assign({ resolver: compiler.resolvers.normal }, options.resolve)
        );
        compiler.resolvers.context = ResolverFactory.createResolver(
            assign({
                resolver: compiler.resolvers.context,
                resolveToContext: true
            }, options.resolve)
        );
        compiler.resolvers.loader = ResolverFactory.createResolver(
            assign({ resolver: compiler.resolvers.loader }, options.resolveLoader)
        );
        compiler.applyPlugins('after-resolvers', compiler);

        return options;
    }
}

export = WebpackOptionsApply;
