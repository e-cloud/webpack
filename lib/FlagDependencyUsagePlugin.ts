/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import Compiler = require('./Compiler')
import Compilation = require('./Compilation')
import Module = require('./Module')
import Chunk = require('./Chunk')
import DependenciesBlock = require('./DependenciesBlock')
import Dependency = require('./Dependency')

class FlagDependencyUsagePlugin {
    apply(compiler: Compiler) {
        compiler.plugin('compilation', function (compilation: Compilation) {
            compilation.plugin('optimize-modules-advanced', function (modules: Module[]) {

                modules.forEach(module => {
                    module.used = false;
                });

                compilation.chunks.forEach((chunk: Chunk) => {
                    if (chunk.entryModule) {
                        processModule(chunk.entryModule, true);
                    }
                });
            });

            function processModule(module: Module, usedExports: boolean | any[]) {
                module.used = true;
                if (usedExports === true || module.usedExports === true) {
                    module.usedExports = true;
                }
                else if (Array.isArray(usedExports)) {
                    module.usedExports = addToSet(module.usedExports || [], usedExports);
                }
                else if (Array.isArray(module.usedExports)) {
                    // todo: what?
                    module.usedExports = module.usedExports;
                }
                else {
                    module.usedExports = false;
                }

                processDependenciesBlock(module, module.usedExports as boolean);
            }

            // todo: usedExports is uesless
            function processDependenciesBlock(depBlock: DependenciesBlock, usedExports: boolean) {
                depBlock.dependencies.forEach(dep => {
                    processDependency(dep, usedExports);
                });
                depBlock.variables.forEach(variable => {
                    variable.dependencies.forEach(dep => {
                        processDependency(dep, usedExports);
                    });
                });
                depBlock.blocks.forEach(block => {
                    processDependenciesBlock(block, usedExports);
                });
            }

            function processDependency(dep: Dependency, usedExports: boolean) {
                const reference = dep.getReference && dep.getReference();
                if (!reference) {
                    return;
                }
                const module = reference.module;
                const importedNames = reference.importedNames;
                const oldUsed = module.used;
                const oldUsedExports = module.usedExports;
                if (!oldUsed || importedNames && (!oldUsedExports || !isSubset(oldUsedExports, importedNames))) {
                    processModule(module, importedNames);
                }
            }

            function addToSet(a: any[], b: any[]) {
                b.forEach(item => {
                    if (!a.includes(item)) {
                        a.push(item);
                    }
                });
                return a;
            }

            function isSubset(biggerSet: any[] | true, subset: any[] | true) {
                if (biggerSet === true) {
                    return true;
                }
                if (subset === true) {
                    return false;
                }
                return subset.every(item => biggerSet.includes(item));
            }
        });
    }
}

export = FlagDependencyUsagePlugin;
