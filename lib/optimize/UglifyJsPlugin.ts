/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import { SourceMapConsumer } from 'source-map'
import { ConcatSource, RawSource, Source, SourceMapSource } from 'webpack-sources'
import { PlainObject } from '../../typings/webpack-types'
import uglify = require('uglify-js');
import RequestShortener = require('../RequestShortener');
import ModuleFilenameHelpers = require('../ModuleFilenameHelpers');
import Compiler = require('../Compiler')
import Compilation = require('../Compilation')
import Chunk = require('../Chunk')
import Module = require('../Module')
import SourceMap = uglify.SourceMap

class UglifyJsPlugin {
    options: UglifyJsPlugin.Option

    constructor(options: UglifyJsPlugin.Option) {
        if (typeof options !== 'object' || Array.isArray(options)) {
            options = {} as any;
        }
        if (typeof options.compressor !== 'undefined') {
            options.compress = options.compressor;
        }
        this.options = options;
    }

    apply(compiler: Compiler) {
        const options = this.options;
        options.test = options.test || /\.js($|\?)/i;
        const warningsFilter = options.warningsFilter || (() => true);

        const requestShortener = new RequestShortener(compiler.context);
        compiler.plugin('compilation', function (compilation: Compilation) {
            if (options.sourceMap) {
                compilation.plugin('build-module', (module: Module) => {
                    // to get detailed location info about errors
                    module.useSourceMap = true;
                });
            }
            compilation.plugin('optimize-chunk-assets', function (chunks: Chunk[], callback) {
                const files: string[] = [];
                chunks.forEach((chunk) => files.push.apply(files, chunk.files));
                files.push.apply(files, compilation.additionalChunkAssets);
                const filterdFiles = files.filter(ModuleFilenameHelpers.matchObject.bind(undefined, options));
                filterdFiles.forEach(file => {
                    const oldWarnFunction = uglify.AST_Node.warn_function;
                    const warnings: string[] = [];
                    let sourceMap: SourceMapConsumer
                    try {
                        const asset = compilation.assets[file];
                        if (asset.__UglifyJsPlugin) {
                            compilation.assets[file] = asset.__UglifyJsPlugin;
                            return;
                        }
                        let input, inputSourceMap;
                        if (options.sourceMap) {
                            if (asset.sourceAndMap) {
                                const sourceAndMap = asset.sourceAndMap();
                                inputSourceMap = sourceAndMap.map;
                                input = sourceAndMap.source;
                            } else {
                                inputSourceMap = asset.map();
                                input = asset.source();
                            }
                            sourceMap = new SourceMapConsumer(inputSourceMap);
                            uglify.AST_Node.warn_function = (warning: string) => {
                                // eslint-disable-line camelcase
                                const match = /\[.+:([0-9]+),([0-9]+)\]/.exec(warning);
                                const line = +match[1];
                                const column = +match[2];
                                const original = sourceMap.originalPositionFor({
                                    line,
                                    column
                                });
                                if (!original || !original.source || original.source === file) return;
                                if (!warningsFilter(original.source)) return;

                                warnings.push(`${warning.replace(/\[.+:([0-9]+),([0-9]+)\]/, '')}[${requestShortener.shorten(original.source)}:${original.line},${original.column}]`);
                            };
                        }
                        else {
                            input = asset.source();
                            uglify.AST_Node.warn_function = (warning: string) => {
                                // eslint-disable-line camelcase
                                warnings.push(warning);
                            };
                        }
                        uglify.base54.reset();
                        let ast = uglify.parse(input, {
                            filename: file
                        });
                        if (options.compress !== false) {
                            ast.figure_out_scope();
                            const compress = uglify.Compressor(options.compress || {
                                    warnings: false
                                }); // eslint-disable-line new-cap
                            ast = compress.compress(ast);
                        }
                        if (options.mangle !== false) {
                            ast.figure_out_scope(options.mangle || {});
                            ast.compute_char_frequency(options.mangle || {});
                            ast.mangle_names(options.mangle || {});
                            if (options.mangle && options.mangle.props) {
                                uglify.mangle_properties(ast, options.mangle.props);
                            }
                        }
                        const output: any = {};
                        output.comments = Object.prototype.hasOwnProperty.call(options, 'comments')
                            ? options.comments
                            : /^\**!|@preserve|@license/;
                        output.beautify = options.beautify;
                        for (const k in options.output) {
                            output[k] = options.output[k];
                        }
                        const extractedComments: string[] = [];
                        if (options.extractComments) {
                            const condition: {
                                preserve: any
                                extract: any
                            } = {} as any;
                            if (typeof options.extractComments === 'string' || options.extractComments instanceof RegExp) {
                                // extractComments specifies the extract condition and output.comments specifies the
                                // preserve condition
                                condition.preserve = output.comments;
                                condition.extract = options.extractComments;
                            } else if (Object.prototype.hasOwnProperty.call(options.extractComments, 'condition')) {
                                // Extract condition is given in extractComments.condition
                                condition.preserve = output.comments;
                                condition.extract = options.extractComments.condition;
                            } else {
                                // No extract condition is given. Extract comments that match output.comments instead
                                // of preserving them
                                condition.preserve = false;
                                condition.extract = output.comments;
                            }

                            // Ensure that both conditions are functions
                            ['preserve', 'extract'].forEach(key => {
                                let regex: RegExp
                                switch (typeof condition[key]) {
                                    case 'boolean':
                                        const b = condition[key];
                                        condition[key] = () => b;
                                        break;
                                    case 'function':
                                        break;
                                    case 'string':
                                        if (condition[key] === 'all') {
                                            condition[key] = () => true;
                                            break;
                                        }
                                        regex = new RegExp(condition[key]);
                                        condition[key] = (astNode: any, comment: any) => regex.test(comment.value);
                                        break;
                                    default:
                                        regex = condition[key];
                                        condition[key] = (astNode: any, comment: any) => regex.test(comment.value);
                                }
                            });

                            // Redefine the comments function to extract and preserve
                            // comments according to the two conditions
                            output.comments = function (astNode: any, comment: any) {
                                if (condition.extract(astNode, comment)) {
                                    extractedComments.push(
                                        comment.type === 'comment2' ? '/*' + comment.value + '*/' : '//' + comment.value
                                    );
                                }
                                return condition.preserve(astNode, comment);
                            };
                        }
                        let map: SourceMap
                        let mapToString: string
                        if (options.sourceMap) {
                            map = uglify.SourceMap({ // eslint-disable-line new-cap
                                file,
                                root: ''
                            });
                            output.source_map = map; // eslint-disable-line camelcase
                        }
                        const stream = uglify.OutputStream(output); // eslint-disable-line new-cap
                        ast.print(stream);
                        if (map) {
                            mapToString = `${map}`;
                        }
                        const stringifiedStream = `${stream}`;
                        let outputSource: Source = mapToString
                            ? new SourceMapSource(stringifiedStream, file, JSON.parse(mapToString), input, inputSourceMap)
                            : new RawSource(stringifiedStream);
                        if (extractedComments.length > 0) {
                            let commentsFile = options.extractComments.filename || `${file}.LICENSE`;
                            if (typeof commentsFile === 'function') {
                                commentsFile = commentsFile(file);
                            }

                            // Write extracted comments to commentsFile
                            const commentsSource = new RawSource(extractedComments.join('\n\n') + '\n');
                            if (commentsFile in compilation.assets) {
                                // commentsFile already exists, append new comments...
                                const targetAsset = compilation.assets[commentsFile]
                                if (targetAsset instanceof ConcatSource) {
                                    targetAsset.add('\n');
                                    targetAsset.add(commentsSource);
                                } else {
                                    compilation.assets[commentsFile] = new ConcatSource(
                                        targetAsset, '\n', commentsSource
                                    );
                                }
                            } else {
                                compilation.assets[commentsFile] = commentsSource;
                            }

                            // Add a banner to the original file
                            if (options.extractComments.banner !== false) {
                                let banner = options.extractComments.banner || `For license information please see ${commentsFile}`;
                                if (typeof banner === 'function') {
                                    banner = banner(commentsFile);
                                }
                                if (banner) {
                                    outputSource = new ConcatSource(`/*! ${banner} */\n`, outputSource);
                                }
                            }
                        }
                        asset.__UglifyJsPlugin = compilation.assets[file] = outputSource;
                        if (warnings.length > 0) {
                            compilation.warnings.push(new Error(`${file} from UglifyJs\n${warnings.join('\n')}`));
                        }
                    } catch (err) {
                        if (err.line) {
                            const original = sourceMap && sourceMap.originalPositionFor({
                                    line: err.line,
                                    column: err.col
                                });
                            if (original && original.source) {
                                compilation.errors.push(new Error(`${file} from UglifyJs\n${err.message} [${requestShortener.shorten(original.source)}:${original.line},${original.column}][${file}:${err.line},${err.col}]`));
                            }
                            else {
                                compilation.errors.push(new Error(`${file} from UglifyJs\n${err.message} [${file}:${err.line},${err.col}]`));
                            }
                        }
                        else if (err.msg) {
                            compilation.errors.push(new Error(`${file} from UglifyJs\n${err.msg}`));
                        }
                        else {
                            compilation.errors.push(new Error(`${file} from UglifyJs\n${err.stack}`));
                        }
                    } finally {
                        uglify.AST_Node.warn_function = oldWarnFunction; // eslint-disable-line camelcase
                    }
                });
                callback();
            });
        });
    }
}

declare namespace UglifyJsPlugin {
    interface Option {
        compress: boolean
        compressor?: boolean
        test: RegExp
        sourceMap: boolean
        mangle: {
            props: any
        } | false
        extractComments: string | RegExp | {
            condition: string
            banner: string
            filename: string
        }
        comments: RegExp
        beautify: boolean
        output: PlainObject
        warningsFilter: (val: string) => boolean
    }
}

export = UglifyJsPlugin;
