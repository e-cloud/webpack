/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Gajus Kuizinas @gajus
 */
import Ajv = require('ajv');
import defineKeywords = require('ajv-keywords')
import Options = Ajv.Options

type ErrorObject = Ajv.ErrorObject & {
    children?: Ajv.ErrorObject[]
}

const ajv = new Ajv({
    errorDataPath: 'configuration',
    allErrors: true,
    verbose: true
});

defineKeywords(ajv);

function validateSchema(schema: any, options: Options): ErrorObject[] {
    const validate = ajv.compile(schema);
    if (Array.isArray(options)) {
        const errors = options.map(validateObject);

        errors.forEach(function (list, idx) {
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

    function validateObject(options: Options) {
        const valid = validate(options);
        return valid ? [] : filterErrors(validate.errors);
    }
}

function filterErrors(errors: ErrorObject[]) {
    let newErrors: ErrorObject[] = [];
    errors.forEach(err => {
        const dataPath = err.dataPath;
        const children: ErrorObject[] = [];
        newErrors = newErrors.filter(function (oldError) {
            if (oldError.dataPath.indexOf(dataPath) >= 0) {
                if (oldError.children) {
                    oldError.children.forEach(function (child) {
                        children.push(child);
                    });
                }
                oldError.children = undefined;
                children.push(oldError);
                return false;
            }
            return true;
        });
        if (children.length) {
            err.children = children;
        }
        newErrors.push(err);
    });
    return newErrors;
}

export = validateSchema;
