/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
class NullFactory {
    create(data: any, callback: Function) {
        return callback();
    }
}

export = NullFactory;
