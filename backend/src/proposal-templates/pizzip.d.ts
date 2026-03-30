declare module 'pizzip' {
  interface PizZipFile {
    asText(): string;
  }
  interface PizZipOptions {
    type?: string;
    compression?: string;
  }
  class PizZip {
    constructor(data?: Buffer | ArrayBuffer | string);
    files: Record<string, PizZipFile>;
    file(name: string, content: string | Buffer): this;
    generate(options?: PizZipOptions): Buffer;
  }
  export = PizZip;
}
