interface CodeReturn<T> {
  width: number,
  height: number,
  data: T
}

type BufferRet = CodeReturn<Buffer>;
type UintArrRet = CodeReturn<Buffer>;

export declare function encode(imgData: Buffer, qu: number): BufferRet;

/**
 * @deprecated - decode takes an object since 0.3.5
 */
export declare function decode(jpegData: Buffer, opts: true): UintArrRet;
export declare function decode(jpegData: Buffer, opts?: false): BufferRet;

export declare function decode(jpegData: Buffer, opts: {
  useTArray: true,
  colorTransform?: boolean
}): UintArrRet;
export declare function decode(jpegData: Buffer, opts?: {
  useTArray?: false,
  colorTransform?: boolean
}): BufferRet;
