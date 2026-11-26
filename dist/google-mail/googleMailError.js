"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isGoogleMailError = exports.GoogleMailError = void 0;
class GoogleMailError extends Error {
    constructor(code, message, invalid) {
        super(message);
        this.name = 'GoogleMailError';
        this.code = code;
        if (invalid)
            this.invalid = invalid;
    }
}
exports.GoogleMailError = GoogleMailError;
const isGoogleMailError = (error) => error instanceof GoogleMailError;
exports.isGoogleMailError = isGoogleMailError;
