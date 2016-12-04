/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import { ConcatSource } from 'webpack-sources'
import ModuleFilenameHelpers = require('./ModuleFilenameHelpers');
import Compiler = require('./Compiler')
import Compilation = require('./Compilation')
import Chunk = require('./Chunk')

function wrapComment(str: string) {
    if (!str.includes('\n')) {
        return `/*! ${str} */`;
    }
    return `/*!\n * ${str.split('\n').join('\n * ')}\n */`;
}

class BannerPlugin {
    banner: string
    options: BannerPlugin.Option

    constructor(options: string | BannerPlugin.Option = {} as BannerPlugin.Option) {
        if (arguments.length > 1) {
            throw new Error('BannerPlugin only takes one argument (pass an options object)');
        }
        if (typeof options === 'string') {
            options = {
                banner: options
            } as BannerPlugin.Option;
        }
        this.options = options;
        this.banner = this.options.raw ? options.banner : wrapComment(options.banner);
    }

    apply(compiler: Compiler) {
        const options = this.options;
        const banner = this.banner;

        compiler.plugin('compilation', function (compilation: Compilation) {
            compilation.plugin('optimize-chunk-assets', function (chunks: Chunk[], callback) {
                chunks.forEach(chunk => {
                    if (options.entryOnly && !chunk.isInitial()) {
                        return;
                    }
                    chunk.files.filter(ModuleFilenameHelpers.matchObject.bind(undefined, options))
                        .forEach(file => {
                            compilation.assets[file] = new ConcatSource(banner, '\n', compilation.assets[file]);
                        });
                });
                callback();
            });
        });
    }
}

declare namespace BannerPlugin {
    interface Option {
        raw: string
        entryOnly: boolean
        banner: string
    }
}

export = BannerPlugin;
