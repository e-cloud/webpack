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
import { Statement, ExportNamedDeclaration, ExportDefaultDeclaration, Expression, Node, SourceLocation } from 'estree'
import Parser = require('../Parser')
import HarmonyCompatiblilityDependency = require('./HarmonyCompatiblilityDependency')
import Module = require('../Module')

function makeHarmonyModule(module: Module, loc: SourceLocation) {
    if (!module.meta.harmonyModule) {
        const dep = new HarmonyCompatiblilityDependency(module);
        dep.loc = loc;
        module.addDependency(dep);
        module.meta.harmonyModule = true;
        module.strict = true;
    }
}

export = AbstractPlugin.create({
    'export'(this: Parser, statement: ExportNamedDeclaration | ExportDefaultDeclaration) {
        const dep = new HarmonyExportHeaderDependency(statement.declaration && statement.declaration.range, statement.range);
        dep.loc = statement.loc;
        this.state.current.addDependency(dep);
        makeHarmonyModule(this.state.module, statement.loc);
        return true;
    },
    'export import'(this: Parser, statement: Statement, source: string) {
        const dep = new HarmonyImportDependency(source, HarmonyModulesHelpers.getNewModuleVar(this.state, source), statement.range);
        dep.loc = statement.loc;
        this.state.current.addDependency(dep);
        // todo: typo
        this.state.lastHarmoryImport = dep;
        makeHarmonyModule(this.state.module, statement.loc);
        return true;
    },
    'export expression'(this: Parser, statement: Statement, expr: Expression) {
        const dep = new HarmonyExportExpressionDependency(this.state.module, expr.range, statement.range);
        dep.loc = statement.loc;
        this.state.current.addDependency(dep);
        this.state.module.strict = true;
        return true;
    },
    'export declaration'(statement: any) {
    },
    'export specifier'(
        this: Parser, statement: ExportDefaultDeclaration | ExportNamedDeclaration, id: number,
        name: string
    ) {
        const rename = this.scope.renames[`$${id}`];
        let dep;
        if (rename === 'imported var') {
            const settings = this.state.harmonySpecifier[`$${id}`];
            dep = new HarmonyExportImportedSpecifierDependency(this.state.module, settings[0], settings[1], settings[2], name);
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
    'export import specifier'(this: Parser, statement: Statement, source: string, id: string, name: string) {
        // todo: here has typo
        const dep = new HarmonyExportImportedSpecifierDependency(this.state.module, this.state.lastHarmoryImport, HarmonyModulesHelpers.getModuleVar(this.state, source), id, name);
        dep.loc = statement.loc;
        this.state.current.addDependency(dep);
        return true;
    }
});

function isImmutableStatement(statement: Node) {
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

function isHoistedStatement(statement: Node) {
    if (statement.type === 'FunctionDeclaration') {
        return true;
    }
    return false;
}
