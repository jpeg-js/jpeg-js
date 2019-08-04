interface ImageDataLike<T> {
  width: number,
  height: number,
  data: T
}

type BufferRet = ImageDataLike<Buffer>;
type UintArrRet = ImageDataLike<Uint8Array>;

type ImageData = BufferRet | UintArrRet;
type BufferLike = Buffer | Uint8Array | number[];

export declare function encode(imgData: ImageDataLike<BufferLike>, qu: number): BufferRet;

/**
 * @deprecated - decode takes an object since 0.3.5
 */
export declare function decode(jpegData: BufferLike, opts: true): UintArrRet;
export declare function decode(jpegData: BufferLike, opts?: false): BufferRet;

export declare function decode(jpegData: BufferLike, opts: {
  useTArray: true,
  colorTransform?: boolean
}): UintArrRet;
export declare function decode(jpegData: BufferLike, opts?: {
  useTArray?: false,
  colorTransform?: boolean
}): BufferRet;
