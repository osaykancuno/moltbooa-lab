declare module "gif.js" {
  interface GIFOptions {
    workers?: number;
    quality?: number;
    width?: number;
    height?: number;
    workerScript?: string;
    repeat?: number;
    transparent?: number | null;
    background?: string;
    dither?: boolean;
  }

  interface AddFrameOptions {
    delay?: number;
    copy?: boolean;
    dispose?: number;
  }

  class GIF {
    constructor(options?: GIFOptions);
    addFrame(
      element: HTMLCanvasElement | HTMLImageElement | ImageData,
      options?: AddFrameOptions
    ): void;
    on(event: "finished", callback: (blob: Blob) => void): void;
    on(event: "error", callback: (error: Error) => void): void;
    on(event: "progress", callback: (progress: number) => void): void;
    render(): void;
    abort(): void;
  }

  export default GIF;
}
