/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import { SourceRange } from '../typings/webpack-types'

class BasicEvaluatedExpression {
    array: any[]
    bool: boolean
    identifier: string
    items: BasicEvaluatedExpression[]
    null: boolean
    number: number
    options: any[]
    postfix: BasicEvaluatedExpression
    prefix: BasicEvaluatedExpression
    quasis: BasicEvaluatedExpression[]
    range: SourceRange
    regExp: RegExp
    string: string

    constructor() {
        this.range = null;
    }

    isNull() {
        return !!this.null;
    }

    isString() {
        return Object.prototype.hasOwnProperty.call(this, 'string');
    }

    isNumber() {
        return Object.prototype.hasOwnProperty.call(this, 'number');
    }

    isBoolean() {
        return Object.prototype.hasOwnProperty.call(this, 'bool');
    }

    isRegExp() {
        return Object.prototype.hasOwnProperty.call(this, 'regExp');
    }

    isConditional() {
        return Object.prototype.hasOwnProperty.call(this, 'options');
    }

    isArray() {
        return Object.prototype.hasOwnProperty.call(this, 'items');
    }

    isConstArray() {
        return Object.prototype.hasOwnProperty.call(this, 'array');
    }

    isIdentifier() {
        return Object.prototype.hasOwnProperty.call(this, 'identifier');
    }

    isWrapped() {
        return Object.prototype.hasOwnProperty.call(this, 'prefix') || Object.prototype.hasOwnProperty.call(this, 'postfix');
    }

    isTemplateString() {
        return Object.prototype.hasOwnProperty.call(this, 'quasis');
    }

    asBool(): boolean {
        if (this.isBoolean()) {
            return this.bool;
        }
        else if (this.isNull()) {
            return false;
        }
        else if (this.isString()) {
            return !!this.string;
        }
        else if (this.isNumber()) {
            return !!this.number;
        }
        else if (this.isRegExp()) {
            return true;
        }
        else if (this.isArray()) {
            return true;
        }
        else if (this.isConstArray()) {
            return true;
        }
        else if (this.isWrapped()) {
            return this.prefix && this.prefix.asBool() || this.postfix && this.postfix.asBool() ? true : undefined;
        }
        else if (this.isTemplateString()) {
            if (this.quasis.length === 1) {
                return this.quasis[0].asBool();
            }
            for (const quasis of this.quasis) {
                if (quasis.asBool()) {
                    return true;
                }
            }
            // can't tell if string will be empty without executing
        }
        return undefined;
    }

    set(value: string | number | boolean | null | RegExp | any[]) {
        if (typeof value === 'string') {
            return this.setString(value);
        }
        if (typeof value === 'number') {
            return this.setNumber(value);
        }
        if (typeof value === 'boolean') {
            return this.setBoolean(value);
        }
        if (value === null) {
            return this.setNull();
        }
        if (value instanceof RegExp) {
            return this.setRegExp(value);
        }
        if (Array.isArray(value)) {
            return this.setArray(value);
        }
        return this;
    }

    setString(str: string | null) {
        if (str === null) {
            delete this.string;
        }
        else {
            this.string = str;
        }
        return this;
    }

    setNull() {
        this.null = true;
        return this;
    }

    setNumber(num: number) {
        if (num === null) {
            delete this.number;
        }
        else {
            this.number = num;
        }
        return this;
    }

    setBoolean(bool: boolean) {
        if (bool === null) {
            delete this.bool;
        }
        else {
            this.bool = bool;
        }
        return this;
    }

    setRegExp(regExp: RegExp) {
        if (regExp === null) {
            delete this.regExp;
        }
        else {
            this.regExp = regExp;
        }
        return this;
    }

    setIdentifier(identifier: string) {
        if (identifier === null) {
            delete this.identifier;
        }
        else {
            this.identifier = identifier;
        }
        return this;
    }

    setWrapped(prefix: BasicEvaluatedExpression, postfix: BasicEvaluatedExpression) {
        this.prefix = prefix;
        this.postfix = postfix;
        return this;
    }

    unsetWrapped() {
        delete this.prefix;
        delete this.postfix;
        return this;
    }

    setOptions(options: any[]) {
        if (options === null) {
            delete this.options;
        }
        else {
            this.options = options;
        }
        return this;
    }

    setItems(items: BasicEvaluatedExpression[]) {
        if (items === null) {
            delete this.items;
        }
        else {
            this.items = items;
        }
        return this;
    }

    setArray(array: any[]) {
        if (array === null) {
            delete this.array;
        }
        else {
            this.array = array;
        }
        return this;
    }

    setTemplateString(quasis: BasicEvaluatedExpression[]) {
        if (quasis === null) {
            delete this.quasis;
        }
        else {
            this.quasis = quasis;
        }
        return this;
    }

    addOptions(options: any[]) {
        if (!this.options) {
            this.options = [];
        }
        options.forEach(function (item) {
            this.options.push(item);
        }, this);
        return this;
    }

    setRange(range: SourceRange) {
        this.range = range;
        return this;
    }
}

export = BasicEvaluatedExpression;
