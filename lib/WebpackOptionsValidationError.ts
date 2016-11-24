/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Gajus Kuizinas @gajus
 */
import Ajv = require('ajv')
const webpackOptionsSchema = require('../schemas/webpackOptionsSchema.json')

class WebpackOptionsValidationError extends Error {
    constructor(public validationErrors: Ajv.ErrorObject[]) {
        super();
        Error.captureStackTrace(this, WebpackOptionsValidationError);
        this.name = 'WebpackOptionsValidationError';
        this.message = `Invalid configuration object. Webpack has been initialised using a configuration object that does not match the API schema.\n${validationErrors.map(
            err => ' - ' + indent(WebpackOptionsValidationError.formatValidationError(err), '   ', false)).join('\n')}`;
    }

    static formatValidationError(err) {
        const dataPath = `configuration${err.dataPath}`;
        switch (err.keyword) {
            case 'additionalProperties':
                const baseMessage = `${dataPath} has an unknown property '${err.params.additionalProperty}'. These properties are valid:\n${getSchemaPartText(err.parentSchema)}`;
                if (!err.dataPath) {
                    switch (err.params.additionalProperty) {
                        case 'debug':
                            return `${baseMessage}
The 'debug' property was removed in webpack 2.
Loaders should be updated to allow passing this option via loader options in module.rules.
Until loaders are updated one can use the LoaderOptionsPlugin to switch loaders into debug mode:
plugins: [
    new webpack.LoaderOptionsPlugin({
        debug: true
    })
]`;
                    }
                    return `${baseMessage}
For typos: please correct them.
For loader options: webpack 2 no longer allows custom properties in configuration.
  Loaders should be updated to allow passing options via loader options in module.rules.
  Until loaders are updated one can use the LoaderOptionsPlugin to pass these options to the loader:
  plugins: [
    new webpack.LoaderOptionsPlugin({
      // test: /\\.xxx$/, // may apply this only for some modules
      options: {
        ${err.params.additionalProperty}: ...
      }
    })
  ]`;
                }
                return baseMessage;
            case 'oneOf':
            case 'anyOf':
            case 'enum':
                return `${dataPath} should be one of these:\n${getSchemaPartText(err.parentSchema)}`;
            case 'allOf':
                return `${dataPath} should be:\n${getSchemaPartText(err.parentSchema)}`;
            case 'type':
                switch (err.params.type) {
                    case 'object':
                        return `${dataPath} should be an object.`;
                    case 'string':
                        return `${dataPath} should be a string.`;
                    case 'boolean':
                        return `${dataPath} should be a boolean.`;
                    case 'number':
                        return `${dataPath} should be a number.`;
                }
                return `${dataPath} should be ${err.params.type}:\n${getSchemaPartText(err.parentSchema)}`;
            case 'instanceof':
                return `${dataPath} should be an instance of ${getSchemaPartText(err.parentSchema)}.`;
            case 'required':
                const missingProperty = err.params.missingProperty.replace(/^\./, '');
                return `${dataPath} misses the property '${missingProperty}'.\n${getSchemaPartText(err.parentSchema, [
                    'properties',
                    missingProperty
                ])}`;
            case 'minLength':
                if (err.params.limit === 1) {
                    return `${dataPath} should not be empty.`;
                }
                else {
                    return `${dataPath} ${err.message}`;
                }
            default:
                return `${dataPath} ${err.message} (${JSON.stringify(err, null, 2)}).\n${getSchemaPartText(err.parentSchema)}`;
        }
    }

    static formatSchema = function formatSchema(schema: AjvJsonSchema, prevSchemas: AjvJsonSchema[] = []) {
        function formatInnerSchema(innerSchema, addSelf?) {
            if (!addSelf) {
                return formatSchema(innerSchema, prevSchemas);
            }
            if (prevSchemas.includes(innerSchema)) {
                return '(recursive)';
            }
            return formatSchema(innerSchema, prevSchemas.concat(schema));
        }

        switch (schema.type) {
            case 'string':
                return 'string';
            case 'boolean':
                return 'boolean';
            case 'number':
                return 'number';
            case 'object':
                if (schema.properties) {
                    const required = schema.required || [];
                    return `object { ${Object.keys(schema.properties).map(property => {
                        if (!required.includes(property)) {
                            return property + '?';
                        }
                        return property;
                    }).concat(schema.additionalProperties ? ['...'] : []).join(', ')} }`;
                }
                if (schema.additionalProperties) {
                    return `object { <key>: ${formatInnerSchema(schema.additionalProperties)} }`;
                }
                return 'object';
            case 'array':
                return `[${formatInnerSchema(schema.items)}]`;
        }
        switch (schema.instanceof) {
            case 'Function':
                return 'function';
            case 'RegExp':
                return 'RegExp';
        }
        if (schema.$ref) {
            return formatInnerSchema(getSchemaPart(schema.$ref), true);
        }
        if (schema.allOf) {
            return schema.allOf.map(formatInnerSchema).join(' & ');
        }
        if (schema.oneOf) {
            return schema.oneOf.map(formatInnerSchema).join(' | ');
        }
        if (schema.anyOf) {
            return schema.anyOf.map(formatInnerSchema).join(' | ');
        }
        if (schema.enum) {
            return schema.enum.map(item => JSON.stringify(item)).join(' | ');
        }
        return JSON.stringify(schema, null, 2);
    }
}

export = WebpackOptionsValidationError;

function getSchemaPart(path, parents = 0, additionalPath?) {
    path = path.split('/');
    path = path.slice(0, path.length - parents);
    if (additionalPath) {
        additionalPath = additionalPath.split('/');
        path = path.concat(additionalPath);
    }
    let schemaPart = <AjvJsonSchema>webpackOptionsSchema;
    for (let i = 1; i < path.length; i++) {
        const inner = schemaPart[path[i]];
        if (inner) {
            schemaPart = inner;
        }
    }
    return schemaPart;
}

function getSchemaPartText2(path, parents, additionalPath) {
    let schemaPart = getSchemaPart(path, parents, additionalPath);
    while (schemaPart.$ref) {
        schemaPart = getSchemaPart(schemaPart.$ref);
    }
    let schemaText = WebpackOptionsValidationError.formatSchema(schemaPart);
    if (schemaPart.description) {
        schemaText += `\n${schemaPart.description}`;
    }
    return schemaText;
}

function getSchemaPartText(schemaPart, additionalPath?) {
    if (additionalPath) {
        for (let i = 0; i < additionalPath.length; i++) {
            const inner = schemaPart[additionalPath[i]];
            if (inner) {
                schemaPart = inner;
            }
        }
    }
    while (schemaPart.$ref) {
        schemaPart = getSchemaPart(schemaPart.$ref);
    }
    let schemaText = WebpackOptionsValidationError.formatSchema(schemaPart);
    if (schemaPart.description) {
        schemaText += `\n${schemaPart.description}`;
    }
    return schemaText;
}

function indent(str, prefix, firstLine) {
    if (firstLine) {
        return prefix + str.replace(/\n(?!$)/g, '\n' + prefix);
    }
    else {
        return str.replace(/\n(?!$)/g, `\n${prefix}`);
    }
}
