/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import { SourceMapConsumer } from 'source-map'
import { SourceMapSource, RawSource } from 'webpack-sources'
import uglify = require('uglify-js');
import RequestShortener = require('../RequestShortener');
import ModuleFilenameHelpers = require('../ModuleFilenameHelpers');
import Compiler = require('../Compiler')
import Compilation = require('../Compilation')

class UglifyJsPlugin {
    options: {
        compress: boolean
        compressor?: boolean
        test: RegExp
        sourceMap: boolean
        mangle: {
            props: any
        } | false
        comments: RegExp
        beautify: boolean
        output: {}
    }

    constructor(options) {
        if (typeof options !== 'object') {
            options = {};
        }
        if (typeof options.compressor !== 'undefined') {
            options.compress = options.compressor;
        }
        this.options = options;
    }

    apply(compiler: Compiler) {
        const options = this.options;
        options.test = options.test || /\.js($|\?)/i;

        const requestShortener = new RequestShortener(compiler.context);
        compiler.plugin('compilation', function (compilation: Compilation) {
            if (options.sourceMap) {
                compilation.plugin('build-module', module => {
                    // to get detailed location info about errors
                    module.useSourceMap = true;
                });
            }
            compilation.plugin('optimize-chunk-assets', function (chunks, callback) {
                let files = [];
                chunks.forEach(chunk => {
                    chunk.files.forEach(file => {
                        files.push(file);
                    });
                });
                compilation.additionalChunkAssets.forEach(file => {
                    files.push(file);
                });
                files = files.filter(ModuleFilenameHelpers.matchObject.bind(undefined, options));
                files.forEach(file => {
                    const oldWarnFunction = uglify.AST_Node.warn_function;
                    const warnings = [];
                    try {
                        const asset = compilation.assets[file];
                        if (asset.__UglifyJsPlugin) {
                            compilation.assets[file] = asset.__UglifyJsPlugin;
                            return;
                        }
                        let input;
                        if (options.sourceMap) {
                            var inputSourceMap;
                            if (asset.sourceAndMap) {
                                const sourceAndMap = asset.sourceAndMap();
                                inputSourceMap = sourceAndMap.map;
                                input = sourceAndMap.source;
                            }
                            else {
                                inputSourceMap = asset.map();
                                input = asset.source();
                            }
                            var sourceMap = new SourceMapConsumer(inputSourceMap);
                            uglify.AST_Node.warn_function = warning => {
                                // eslint-disable-line camelcase
                                const match = /\[.+:([0-9]+),([0-9]+)\]/.exec(warning);
                                const line = +match[1];
                                const column = +match[2];
                                const original = sourceMap.originalPositionFor({
                                    line,
                                    column
                                });
                                if (!original || !original.source || original.source === file) {
                                    return;
                                }
                                warnings.push(`${warning.replace(/\[.+:([0-9]+),([0-9]+)\]/, '')}[${requestShortener.shorten(original.source)}:${original.line},${original.column}]`);
                            };
                        }
                        else {
                            input = asset.source();
                            uglify.AST_Node.warn_function = warning => {
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
                            ast = ast.transform(compress);
                        }
                        if (options.mangle !== false) {
                            ast.figure_out_scope();
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
                        if (options.sourceMap) {
                            var map = uglify.SourceMap({ // eslint-disable-line new-cap
                                file,
                                root: ''
                            });
                            output.source_map = map; // eslint-disable-line camelcase
                        }
                        let stream = uglify.OutputStream(output); // eslint-disable-line new-cap
                        ast.print(stream);
                        if (map) {
                            map = `${map}`;
                        }
                        stream = `${stream}`;
                        asset.__UglifyJsPlugin = compilation.assets[file] = map
                            ? new SourceMapSource(stream, file, JSON.parse(map), input, inputSourceMap)
                            : new RawSource(stream);
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

export = UglifyJsPlugin;
