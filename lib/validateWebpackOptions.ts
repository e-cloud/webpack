/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Gajus Kuizinas @gajus
 */
import webpackOptionsSchema = require('../schemas/webpackOptionsSchema.json');
import Ajv = require('ajv');

const ajv = new Ajv({
    errorDataPath: 'configuration',
    allErrors: true,
    verbose: true
});

const validate = ajv.compile(webpackOptionsSchema);

function validateWebpackOptions(options) {
    if (Array.isArray(options)) {
        const errors = options.map(validateObject);
        errors.forEach((list, idx) => {
            list.forEach(function applyPrefix(err) {
                err.dataPath = `[${idx}]${err.dataPath}`;
                if (err.children) {
                    err.children.forEach(applyPrefix);
                }
            });
        });
        return errors.reduce((arr, items) => arr.concat(items), []);
    }
    else {
        return validateObject(options);
    }
}

function validateObject(options) {
    const valid = validate(options);
    return valid ? [] : filterErrors(validate.errors);
}

function filterErrors(errors) {
    const errorsByDataPath = {};
    const newErrors = [];
    errors.forEach(err => {
        const dataPath = err.dataPath;
        const key = `$${dataPath}`;
        if (errorsByDataPath[key]) {
            const oldError = errorsByDataPath[key];
            const idx = newErrors.indexOf(oldError);
            newErrors.splice(idx, 1);
            if (oldError.children) {
                const children = oldError.children;
                delete oldError.children;
                children.push(oldError);
                err.children = children;
            }
            else {
                err.children = [oldError];
            }
        }
        errorsByDataPath[key] = err;
        newErrors.push(err);
    });
    return newErrors;
}

export = validateWebpackOptions;
