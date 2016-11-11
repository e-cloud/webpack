/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import crypto = require('crypto')
import Compiler = require('./Compiler')
import { HexBase64Latin1Encoding } from 'crypto'
import Compilation = require('./Compilation')

class HashedModuleIdsPlugin {
    constructor(public options: {
        hashFunction: string
        hashDigest: HexBase64Latin1Encoding
        hashDigestLength: number
        context: string
    } = {} as any) {
        this.options.hashFunction = this.options.hashFunction || 'md5';
        this.options.hashDigest = this.options.hashDigest || 'base64';
        this.options.hashDigestLength = this.options.hashDigestLength || 4;
    }

    apply(compiler: Compiler) {
        compiler.plugin('compilation', (compilation: Compilation) => {
            const usedIds = {};
            compilation.plugin('before-module-ids', modules => {
                modules.forEach((module) => {
                    if (module.id === null && module.libIdent) {
                        let id = module.libIdent({
                            context: this.options.context || compiler.options.context
                        });
                        const hash = crypto.createHash(this.options.hashFunction);
                        hash.update(id);
                        id = hash.digest(this.options.hashDigest);
                        let len = this.options.hashDigestLength;
                        while (usedIds[id.substr(0, len)]) len++;
                        module.id = id.substr(0, len);
                        usedIds[module.id] = true;
                    }
                });
            });
        });
    }
}

export = HashedModuleIdsPlugin;
