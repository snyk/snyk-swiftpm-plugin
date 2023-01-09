export class SwiftError extends Error {
    constructor(message: string, swiftErrStack: any) {
        super(message);
        this.stack = swiftErrStack;
    }
}
