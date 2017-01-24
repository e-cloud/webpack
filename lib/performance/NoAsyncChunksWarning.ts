/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Sean Larkin @thelarkinn
 */
class NoAsyncChunksWarning extends Error {
    constructor() {
        super();
        if (Error.hasOwnProperty('captureStackTrace')) {
            Error.captureStackTrace(this, this.constructor);
        }
        this.name = 'NoAsyncChunksWarning';

        this.message = `webpack performance recommendations: 
You can limit the size of your bundles by using import() or require.ensure to lazy load some parts of your application.
For more info visit https://webpack.js.org/guides/code-splitting/`;
    }
}

export = NoAsyncChunksWarning;
