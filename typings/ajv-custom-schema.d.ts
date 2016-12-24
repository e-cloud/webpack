import * as ajv from 'ajv'
declare interface AjvJsonSchema extends JsonSchema {
    typeof: string;
    instanceof: string;
    range: number[];
    exclusiveRange: number[];
    propertyNames: Function;
    regexp: RegExp;
}

declare  interface AjvErrorObject extends ajv.ErrorObject {
    keyword: string;
    dataPath: string;
    schemaPath: string;
    // Excluded if messages set to false.
    message?: string;
    // These are added with the `verbose` option.
    schema?: AjvJsonSchema;
    parentSchema?: AjvJsonSchema;
    children?: AjvErrorObject[];
    data?: any;
}
