/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import fs = require('fs');
import path = require('path');
import mkdirp = require('mkdirp');

class NodeOutputFileSystem {
}

NodeOutputFileSystem.prototype.mkdirp = mkdirp;
NodeOutputFileSystem.prototype.mkdir = fs.mkdir.bind(this);
NodeOutputFileSystem.prototype.rmdir = fs.rmdir.bind(this);
NodeOutputFileSystem.prototype.unlink = fs.unlink.bind(this);
NodeOutputFileSystem.prototype.writeFile = fs.writeFile.bind(fs);
NodeOutputFileSystem.prototype.join = path.join.bind(path);

interface NodeOutputFileSystem {
    mkdirp(dir: string, cb: (err: any, made: string) => void): void;
    mkdirp(dir: string, flags: any, cb: (err: any, made: string) => void): void;
    mkdir(path: string | Buffer, mode: string, callback?: (err?: NodeJS.ErrnoException) => void): void;
    rmdir(path: string | Buffer, callback?: (err?: NodeJS.ErrnoException) => void): void;
    unlink(path: string | Buffer, callback?: (err?: NodeJS.ErrnoException) => void): void;
    writeFile(filename: string, data: any, callback?: (err: NodeJS.ErrnoException) => void): void;
    writeFile(
        filename: string, data: any, options: { encoding?: string; mode?: number; flag?: string; },
        callback?: (err: NodeJS.ErrnoException) => void
    ): void;
    writeFile(
        filename: string, data: any, options: { encoding?: string; mode?: string; flag?: string; },
        callback?: (err: NodeJS.ErrnoException) => void
    ): void;
    join(...paths: string[]): string;
}

export = NodeOutputFileSystem;
