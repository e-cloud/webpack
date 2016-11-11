/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import { FunctionExpression, Expression, ReturnStatement } from 'estree'

export = function (expr: Expression): {
    fn: FunctionExpression
    expressions: any[]
    needThis?: boolean
} {
    // <FunctionExpression>
    if (expr.type === 'FunctionExpression') {
        return {
            fn: expr,
            expressions: [],
            needThis: false
        };
    }
    // <FunctionExpression>.bind(<Expression>)
    if (expr.type === 'CallExpression'
        && expr.callee.type === 'MemberExpression'
        && expr.callee.object.type === 'FunctionExpression'
        && expr.callee.property.type === 'Identifier'
        && expr.callee.property.name === 'bind'
        && expr.arguments.length === 1) {
        return {
            fn: expr.callee.object,
            expressions: [expr.arguments[0]]
        };
    }
    // (function(_this) {return <FunctionExpression>})(this) (Coffeescript)
    if (expr.type === 'CallExpression'
        && expr.callee.type === 'FunctionExpression'
        && expr.callee.body.type === 'BlockStatement'
        && expr.arguments.length === 1
        && expr.arguments[0].type === 'ThisExpression'
        && expr.callee.body.body
        && expr.callee.body.body.length === 1
        && expr.callee.body.body[0].type === 'ReturnStatement'
        && (expr.callee.body.body[0] as ReturnStatement).argument
        && ((expr.callee.body.body[0] as ReturnStatement).argument as FunctionExpression).type === 'FunctionExpression') {
        return {
            fn: (expr.callee.body.body[0] as ReturnStatement).argument as FunctionExpression,
            expressions: [],
            needThis: true
        };
    }
};
