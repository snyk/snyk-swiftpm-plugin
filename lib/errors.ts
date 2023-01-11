export class SwiftError extends Error {
  constructor(message: string, swiftErrStack: string) {
    super(message);
    this.stack = swiftErrStack;
  }
}
