/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import Chunk = require('./Chunk')

class ChunkRenderError extends Error {
    message: string
    details: string
    name = 'ChunkRenderError'

    constructor(public chunk: Chunk, public file, public error: Error) {
        super();
        Error.captureStackTrace(this, ChunkRenderError);
        this.message = error.message;
        this.details = error.stack;
    }
}

export = ChunkRenderError;
