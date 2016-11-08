/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import Compiler = require('./Compiler')
import Compilation = require('./Compilation')

class FlagDependencyUsagePlugin {
    apply(compiler: Compiler) {
        compiler.plugin('compilation', function (compilation: Compilation) {
            compilation.plugin('optimize-modules-advanced', function (modules) {

                modules.forEach(module => {
                    module.used = false;
                });

                compilation.chunks.forEach(chunk => {
                    if (chunk.entryModule) {
                        processModule(chunk.entryModule, true);
                    }
                });
            });

            function processModule(module, usedExports) {
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

                processDependenciesBlock(module, module.usedExports);
            }

            function processDependenciesBlock(depBlock, usedExports) {
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

            function processDependency(dep, usedExports) {
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

            function addToSet(a, b) {
                b.forEach(item => {
                    if (!a.includes(item)) {
                        a.push(item);
                    }
                });
                return a;
            }

            function isSubset(biggerSet, subset) {
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
