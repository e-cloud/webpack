/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import SetVarMainTemplatePlugin = require('./SetVarMainTemplatePlugin');
import CommonJsHarmonyMainTemplatePlugin = require('./CommonJsHarmonyMainTemplatePlugin');
import AmdMainTemplatePlugin = require('./AmdMainTemplatePlugin')
import UmdMainTemplatePlugin = require('./UmdMainTemplatePlugin');
import JsonpExportMainTemplatePlugin = require('./JsonpExportMainTemplatePlugin');
import Compiler = require('./Compiler')
import Compilation = require('./Compilation')
import { AuxiliaryComment } from '../typings/webpack-types'

function accessorToObjectAccess(accessor: string[]) {
    return accessor.map(a => `[${JSON.stringify(a)}]`).join('');
}

function accessorAccess(base: any, accessor: string, joinWith = '; ') {
    const accessorArr: string[] = [].concat(accessor);
    return accessorArr.map((a, idx) => {
        const newAccessor = base
            ? base + accessorToObjectAccess(accessorArr.slice(0, idx + 1))
            : accessorArr[0] + accessorToObjectAccess(accessorArr.slice(1, idx + 1));
        if (idx === accessorArr.length - 1) {
            return newAccessor;
        }
        if (idx === 0 && typeof base === 'undefined') {
            return `${newAccessor} = typeof ${newAccessor} === "object" ? ${newAccessor} : {}`;
        }
        return `${newAccessor} = ${newAccessor} || {}`;
    }).join(joinWith);
}

class LibraryTemplatePlugin {
    constructor(
        public name: string,
        public target: string,
        public umdNamedDefine: boolean,
        public auxiliaryComment: AuxiliaryComment
    ) {
    }

    apply(compiler: Compiler) {
        compiler.plugin('this-compilation', (compilation: Compilation) => {
            switch (this.target) {
                case 'var':
                    compilation.apply(new SetVarMainTemplatePlugin(`var ${accessorAccess(false, this.name)}`));
                    break;
                case 'assign':
                    compilation.apply(new SetVarMainTemplatePlugin(accessorAccess(undefined, this.name)));
                    break;
                case 'this':
                case 'window':
                case 'global':
                    if (this.name) {
                        compilation.apply(new SetVarMainTemplatePlugin(accessorAccess(this.target, this.name)));
                    }
                    else {
                        compilation.apply(new SetVarMainTemplatePlugin(this.target, true));
                    }
                    break;
                case 'commonjs':
                    if (this.name) {
                        compilation.apply(new SetVarMainTemplatePlugin(accessorAccess('exports', this.name)));
                    }
                    else {
                        compilation.apply(new SetVarMainTemplatePlugin('exports', true));
                    }
                    break;
                case 'commonjs2':
                    compilation.apply(new SetVarMainTemplatePlugin('module.exports'));
                    break;
                case 'commonjs-module':
                    compilation.apply(new CommonJsHarmonyMainTemplatePlugin());
                    break;
                case 'amd':
                    compilation.apply(new AmdMainTemplatePlugin(this.name));
                    break;
                case 'umd':
                case 'umd2':
                    compilation.apply(new UmdMainTemplatePlugin(this.name, {
                        optionalAmdExternalAsGlobal: this.target === 'umd2',
                        namedDefine: this.umdNamedDefine,
                        auxiliaryComment: this.auxiliaryComment
                    }));
                    break;
                case 'jsonp':
                    compilation.apply(new JsonpExportMainTemplatePlugin(this.name));
                    break;
                default:
                    throw new Error(`${this.target} is not a valid Library target`);
            }
        });
    }
}

export = LibraryTemplatePlugin;
