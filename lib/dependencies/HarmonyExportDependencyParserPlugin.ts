/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import AbstractPlugin = require('../AbstractPlugin');

import HarmonyExportExpressionDependency = require('./HarmonyExportExpressionDependency');
import HarmonyExportHeaderDependency = require('./HarmonyExportHeaderDependency');
import HarmonyExportSpecifierDependency = require('./HarmonyExportSpecifierDependency');
import HarmonyExportImportedSpecifierDependency = require('./HarmonyExportImportedSpecifierDependency');
import HarmonyImportDependency = require('./HarmonyImportDependency');
import HarmonyModulesHelpers = require('./HarmonyModulesHelpers');

export = AbstractPlugin.create({
    'export'(statement) {
        const dep = new HarmonyExportHeaderDependency(statement.declaration && statement.declaration.range, statement.range);
        dep.loc = statement.loc;
        this.state.current.addDependency(dep);
        this.state.module.meta.harmonyModule = true;
        this.state.module.strict = true;
        return true;
    },
    'export import'(statement, source) {
        const dep = new HarmonyImportDependency(source, HarmonyModulesHelpers.getNewModuleVar(this.state, source), statement.range);
        dep.loc = statement.loc;
        this.state.current.addDependency(dep);
        this.state.lastHarmoryImport = dep;
        this.state.module.meta.harmonyModule = true;
        this.state.module.strict = true;
        return true;
    },
    'export expression'(statement, expr) {
        const dep = new HarmonyExportExpressionDependency(this.state.module, expr.range, statement.range);
        dep.loc = statement.loc;
        this.state.current.addDependency(dep);
        this.state.module.strict = true;
        return true;
    },
    'export declaration'(statement) {
    },
    'export specifier'(statement, id, name) {
        const rename = this.scope.renames[`$${id}`];
        let dep;
        if (rename === 'imported var') {
            const settings = this.state.harmonySpecifier[`$${id}`];
            dep = new HarmonyExportImportedSpecifierDependency(this.state.module, settings[0], settings[1], settings[2], name, statement.range[1]);
        }
        else {
            const immutable = statement.declaration && isImmutableStatement(statement.declaration);
            const hoisted = statement.declaration && isHoistedStatement(statement.declaration);
            dep = new HarmonyExportSpecifierDependency(this.state.module, id, name, !immutable || hoisted
                ? -0.5
                : statement.range[1] + 0.5, immutable);
        }
        dep.loc = statement.loc;
        this.state.current.addDependency(dep);
        return true;
    },
    'export import specifier'(statement, source, id, name) {
        const dep = new HarmonyExportImportedSpecifierDependency(this.state.module, this.state.lastHarmoryImport, HarmonyModulesHelpers.getModuleVar(this.state, source), id, name, 0);
        dep.loc = statement.loc;
        this.state.current.addDependency(dep);
        return true;
    }
});

function isImmutableStatement(statement) {
    if (statement.type === 'FunctionDeclaration') {
        return true;
    }
    if (statement.type === 'ClassDeclaration') {
        return true;
    }
    if (statement.type === 'VariableDeclaration' && statement.kind === 'const') {
        return true;
    }
    return false;
}

function isHoistedStatement(statement) {
    if (statement.type === 'FunctionDeclaration') {
        return true;
    }
    return false;
}
