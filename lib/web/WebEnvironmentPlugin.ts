/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
class WebEnvironmentPlugin {
    constructor(inputFileSystem, outputFileSystem) {
        this.inputFileSystem = inputFileSystem;
        this.outputFileSystem = outputFileSystem;
    }

    apply(compiler) {
        const inputFileSystem = compiler.inputFileSystem = this.inputFileSystem;
        compiler.resolvers.normal.fileSystem = inputFileSystem;
        compiler.resolvers.context.fileSystem = inputFileSystem;
        compiler.resolvers.loader.fileSystem = inputFileSystem;
        compiler.outputFileSystem = this.outputFileSystem;
    }
}

export = WebEnvironmentPlugin;
