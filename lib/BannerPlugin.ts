/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import { ConcatSource } from 'webpack-sources'

import ModuleFilenameHelpers = require('./ModuleFilenameHelpers');

function wrapComment(str) {
    if (!str.includes('\n')) {
        return `/*! ${str} */`;
    }
    return `/*!\n * ${str.split('\n').join('\n * ')}\n */`;
}

class BannerPlugin {
    constructor(options) {
        if (arguments.length > 1) {
            throw new Error('BannerPlugin only takes one argument (pass an options object)');
        }
        if (typeof options === 'string') {
            options = {
                banner: options
            };
        }
        this.options = options || {};
        this.banner = this.options.raw ? options.banner : wrapComment(options.banner);
    }

    apply(compiler) {
        const options = this.options;
        const banner = this.banner;

        compiler.plugin('compilation', function (compilation) {
            compilation.plugin('optimize-chunk-assets', function (chunks, callback) {
                chunks.forEach(function (chunk) {
                    if (options.entryOnly && !chunk.isInitial()) {
                        return;
                    }
                    chunk.files.filter(ModuleFilenameHelpers.matchObject.bind(undefined, options))
                        .forEach(function (file) {
                            compilation.assets[file] = new ConcatSource(banner, '\n', compilation.assets[file]);
                        });
                });
                callback();
            });
        });
    }
}

export = BannerPlugin;
