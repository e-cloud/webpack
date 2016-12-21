/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import { PlainObject } from '../typings/webpack-types'
class OptionsDefaulter {
    defaults: PlainObject
    config: PlainObject

    constructor() {
        this.defaults = {};
        this.config = {};
    }

    process(options: PlainObject) {
        for (const name in this.defaults) {
            switch (this.config[name]) {
                case undefined:
                    if (getProperty(options, name) === undefined) {
                        setProperty(options, name, this.defaults[name]);
                    }
                    break;
                case 'call':
                    setProperty(options, name, this.defaults[name].call(this, getProperty(options, name), options));
                    break;
                case 'make':
                    if (getProperty(options, name) === undefined) {
                        setProperty(options, name, this.defaults[name].call(this, options));
                    }
                    break;
                case 'append':
                    let oldValue = getProperty(options, name);
                    if (!Array.isArray(oldValue)) {
                        oldValue = [];
                    }
                    this.defaults[name].forEach((item: any) => {
                        oldValue.push(item);
                    });
                    setProperty(options, name, oldValue);
                    break;
                default:
                    throw new Error(`OptionsDefaulter cannot process ${this.config[name]}`);
            }
        }
    }

    set(name: string, config: any, def?: any) {
        if (arguments.length === 3) {
            this.defaults[name] = def;
            this.config[name] = config;
        }
        else {
            this.defaults[name] = config;
            delete this.config[name];
        }
    }
}

export = OptionsDefaulter;

function getProperty(obj: PlainObject, name: string) {
    const props = name.split('.');
    for (let prop of props.slice(0, props.length - 1)) {
        obj = obj[prop];
        if (typeof obj !== 'object' || !obj) {
            return;
        }
    }
    return obj[props.pop()];
}

function setProperty(obj: PlainObject, name: string, value: any) {
    const props = name.split('.');
    for (let prop of props.slice(0, props.length - 1)) {
        if (typeof obj[prop] !== 'object' && typeof obj[prop] !== 'undefined') {
            return;
        }
        if (!obj[prop]) {
            obj[prop] = {};
        }
        obj = obj[prop];
    }
    obj[props.pop()] = value;
}

// todo: unused
function hasProperty(obj: PlainObject, name: string) {
    const props = name.split('.');
    for (let prop of props.slice(0, props.length - 1)) {
        obj = obj[prop];
        if (typeof obj !== 'object' || !obj) {
            return;
        }
    }
    return Object.prototype.hasOwnProperty.call(obj, props.pop());
}
