/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
 /* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */
/*
 Copyright 2011 notmasteryet

 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at

 http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.
 */

// - The JPEG specification can be found in the ITU CCITT Recommendation T.81
//   (www.w3.org/Graphics/JPEG/itu-t81.pdf)
// - The JFIF specification can be found in the JPEG File Interchange Format
//   (www.w3.org/Graphics/JPEG/jfif3.pdf)
// - The Adobe Application-Specific JPEG markers in the Supporting the DCT Filters
//   in PostScript Level 2, Technical Note #5116
//   (partners.adobe.com/public/developer/en/ps/sdk/5116.DCT_Filter.pdf)

var JpegImage = (function jpegImage() {
    "use strict";
    var dctZigZag = new Int32Array([
        0,
        1,  8,
        16,  9,  2,
        3, 10, 17, 24,
        32, 25, 18, 11, 4,
        5, 12, 19, 26, 33, 40,
        48, 41, 34, 27, 20, 13,  6,
        7, 14, 21, 28, 35, 42, 49, 56,
        57, 50, 43, 36, 29, 22, 15,
        23, 30, 37, 44, 51, 58,
        59, 52, 45, 38, 31,
        39, 46, 53, 60,
        61, 54, 47,
        55, 62,
        63
    ]);

    var dctCos1  =  4017   // cos(pi/16)
    var dctSin1  =   799   // sin(pi/16)
    var dctCos3  =  3406   // cos(3*pi/16)
    var dctSin3  =  2276   // sin(3*pi/16)
    var dctCos6  =  1567   // cos(6*pi/16)
    var dctSin6  =  3784   // sin(6*pi/16)
    var dctSqrt2 =  5793   // sqrt(2)
    var dctSqrt1d2 = 2896  // sqrt(2) / 2

    function constructor() {
    }

    function buildHuffmanTable(codeLengths, values) {
        var k = 0, code = [], i, j, length = 16;
        while (length > 0 && !codeLengths[length - 1])
            length--;
        code.push({children: [], index: 0});
        var p = code[0], q, codeLengths_i_length;
        for (i = 0; i < length; i++) {
            for (j = 0, codeLengths_i_length = codeLengths[i]; j < codeLengths_i_length; j++) {
                p = code.pop();
                p.children[p.index] = values[k];
                while (p.index > 0) {
                    p = code.pop();
                }
                p.index++;
                code.push(p);
                while (code.length <= i) {
                    code.push(q = {children: [], index: 0});
                    p.children[p.index] = q.children;
                    p = q;
                }
                k++;
            }
            if (i + 1 < length) {
                // p here points to last code
                code.push(q = {children: [], index: 0});
                p.children[p.index] = q.children;
                p = q;
            }
        }
        return code[0].children;
    }

    function decodeScan(data, offset,
                        frame, components, resetInterval,
                        spectralStart, spectralEnd,
                        successivePrev, successive) {
        var precision = frame.precision;
        var samplesPerLine = frame.samplesPerLine;
        var scanLines = frame.scanLines;
        var mcusPerLine = frame.mcusPerLine;
        var progressive = frame.progressive;
        var maxH = frame.maxH, maxV = frame.maxV;

        // This seems like a large and important function.
        //  Want to change this decoding scan so that it operates on a single large Int32Array matrix, rather than lots of 64 length arrays.
        //  This will massively speed up the code I think.





        //console.log('decodeScan');

        var startOffset = offset, bitsData = 0, bitsCount = 0;
        function readBit() {
            if (bitsCount > 0) {
                bitsCount--;
                return (bitsData >> bitsCount) & 1;
            }
            bitsData = data[offset++];
            if (bitsData == 0xFF) {
                var nextByte = data[offset++];
                if (nextByte) {
                    throw "unexpected marker: " + ((bitsData << 8) | nextByte).toString(16);
                }
                // unstuff 0
            }
            bitsCount = 7;
            return bitsData >>> 7;
        }
        function decodeHuffman(tree) {
            var node = tree, bit;
            while ((bit = readBit()) !== null) {
                node = node[bit];
                if (typeof node === 'number')
                    return node;
                if (typeof node !== 'object')
                    throw "invalid huffman sequence";
            }
            return null;
        }
        function receive(length) {
            var n = 0;
            while (length > 0) {
                var bit = readBit();
                if (bit === null) return;
                n = (n << 1) | bit;
                length--;
            }
            return n;
        }
        function receiveAndExtend(length) {
            var n = receive(length);
            if (n >= 1 << (length - 1))
                return n;
            return n + (-1 << length) + 1;
        }

        // These decoding functions, instead of being given a block, could be given a position within a larger blocks_martix,
        //  or maybe just the offset within it.

        // I think a zz_offset variable would be the way to do this.



        function decodeBaseline(component, zz) {


            var t = decodeHuffman(component.huffmanTableDC);
            var diff = t === 0 ? 0 : receiveAndExtend(t);

            // Copies various items to that array.

            zz[0]= (component.pred += diff);
            var k = 1;



            while (k < 64) {
                var rs = decodeHuffman(component.huffmanTableAC);
                var s = rs & 15, r = rs >> 4;
                if (s === 0) {
                    if (r < 15)
                        break;
                    k += 16;
                    continue;
                }
                k += r;
                var z = dctZigZag[k];

                // Rather than zz, it could assign to a larger blocks_matrix in the component. However, it would need to know the offset or be able to calculate it.



                zz[z] = receiveAndExtend(s);

                k++;
            }
        }

        function matrix_decodeBaseline(component, matrix_offset) {


            var t = decodeHuffman(component.huffmanTableDC);
            var diff = t === 0 ? 0 : receiveAndExtend(t);

            // Copies various items to that array.

            component.blocks_matrix[matrix_offset] = (component.pred += diff);
            var k = 1;



            while (k < 64) {
                var rs = decodeHuffman(component.huffmanTableAC);
                var s = rs & 15, r = rs >> 4;
                if (s === 0) {
                    if (r < 15)
                        break;
                    k += 16;
                    continue;
                }
                k += r;
                var z = dctZigZag[k];

                // Rather than zz, it could assign to a larger blocks_matrix in the component. However, it would need to know the offset or be able to calculate it.



                component.blocks_matrix[matrix_offset + z] = receiveAndExtend(s);

                k++;
            }
        }

        /*
        function decodeDCFirst(component, zz) {
            var t = decodeHuffman(component.huffmanTableDC);
            var diff = t === 0 ? 0 : (receiveAndExtend(t) << successive);
            zz[0] = (component.pred += diff);
        }
        */

        function matrix_decodeDCFirst(component, matrix_offset) {
            var t = decodeHuffman(component.huffmanTableDC);
            var diff = t === 0 ? 0 : (receiveAndExtend(t) << successive);
            component.blocks_matrix[matrix_offset] = (component.pred += diff);
        }

        /*
        function decodeDCSuccessive(component, zz) {
            zz[0] |= readBit() << successive;
        }
        */


        function matrix_decodeDCSuccessive(component, matrix_offset) {
            component.blocks_matrix[matrix_offset] |= readBit() << successive;
        }


        var eobrun = 0;
        function decodeACFirst(component, zz) {
            if (eobrun > 0) {
                eobrun--;
                return;
            }
            var k = spectralStart, e = spectralEnd;
            while (k <= e) {
                var rs = decodeHuffman(component.huffmanTableAC);
                var s = rs & 15, r = rs >> 4;
                if (s === 0) {
                    if (r < 15) {
                        eobrun = receive(r) + (1 << r) - 1;
                        break;
                    }
                    k += 16;
                    continue;
                }
                k += r;
                var z = dctZigZag[k];
                zz[z] = receiveAndExtend(s) * (1 << successive);
                k++;
            }
        }
        var successiveACState = 0, successiveACNextValue;
        function decodeACSuccessive(component, zz) {
            // we will maybe be using a zz_offset rather than the zz array itself.

            // Will just be referring to a larger buffer.
            //  This does get a bit complicated to program.



            var k = spectralStart, e = spectralEnd, r = 0;
            while (k <= e) {
                var z = dctZigZag[k];
                switch (successiveACState) {
                    case 0: // initial state
                        var rs = decodeHuffman(component.huffmanTableAC);
                        var s = rs & 15, r = rs >> 4;
                        if (s === 0) {
                            if (r < 15) {
                                eobrun = receive(r) + (1 << r);
                                successiveACState = 4;
                            } else {
                                r = 16;
                                successiveACState = 1;
                            }
                        } else {
                            if (s !== 1)
                                throw "invalid ACn encoding";
                            successiveACNextValue = receiveAndExtend(s);
                            successiveACState = r ? 2 : 3;
                        }
                        continue;
                    case 1: // skipping r zero items
                    case 2:
                        if (zz[z])
                            zz[z] += (readBit() << successive);
                        else {
                            r--;
                            if (r === 0)
                                successiveACState = successiveACState == 2 ? 3 : 0;
                        }
                        break;
                    case 3: // set value for a zero item
                        if (zz[z])
                            zz[z] += (readBit() << successive);
                        else {
                            zz[z] = successiveACNextValue << successive;
                            successiveACState = 0;
                        }
                        break;
                    case 4: // eob
                        if (zz[z])
                            zz[z] += (readBit() << successive);
                        break;
                }
                k++;
            }
            if (successiveACState === 4) {
                eobrun--;
                if (eobrun === 0)
                    successiveACState = 0;
            }
        }

        function matrix_decodeACSuccessive(component, matrix_offset) {
            // we will maybe be using a matrix_offset rather than the matrix array itself.

            // Will just be referring to a larger buffer.
            //  This does get a bit complicated to program.

            var matrix = component.blocks_matrix;


            var k = spectralStart, e = spectralEnd, r = 0;
            while (k <= e) {
                var z = dctZigZag[k] + matrix_offset;
                switch (successiveACState) {
                    case 0: // initial state
                        var rs = decodeHuffman(component.huffmanTableAC);
                        var s = rs & 15, r = rs >> 4;
                        if (s === 0) {
                            if (r < 15) {
                                eobrun = receive(r) + (1 << r);
                                successiveACState = 4;
                            } else {
                                r = 16;
                                successiveACState = 1;
                            }
                        } else {
                            if (s !== 1)
                                throw "invalid ACn encoding";
                            successiveACNextValue = receiveAndExtend(s);
                            successiveACState = r ? 2 : 3;
                        }
                        continue;
                    case 1: // skipping r zero items
                    case 2:
                        if (matrix[z])
                            matrix[z] += (readBit() << successive);
                        else {
                            r--;
                            if (r === 0)
                                successiveACState = successiveACState == 2 ? 3 : 0;
                        }
                        break;
                    case 3: // set value for a zero item
                        if (matrix[z])
                            matrix[z] += (readBit() << successive);
                        else {
                            matrix[z] = successiveACNextValue << successive;
                            successiveACState = 0;
                        }
                        break;
                    case 4: // eob
                        if (matrix[z])
                            matrix[z] += (readBit() << successive);
                        break;
                }
                k++;
            }
            if (successiveACState === 4) {
                eobrun--;
                if (eobrun === 0)
                    successiveACState = 0;
            }
        }

        // Are columns and rows backwards here?
        // And this could be given an offset_decode function as well.
        //  For the moment, it will be best to make other versions of the functions.

        // Seems quite tricky to get the various functions to refer to the blocks matrix instead.
        //  Will be worth leaving the original code in and making it so that some parts can be commented an unommented quickly.




        function decodeMcu(component, decode, mcu, row, col) {
            var mcuRow = (mcu / mcusPerLine) | 0;
            var mcuCol = mcu % mcusPerLine;
            var blockRow = mcuRow * component.v + row;
            var blockCol = mcuCol * component.h + col;

            // decode with a range in the blocks?

            // or we can extract the particular items here, then try it differently too.


            // need to calculate the position in the blocks_matrix


            // need to know the row length...

            //var bccmcu = component.blocksPerColumnForMcu;
            //var bclmcu = component.blocksPerLineForMcu;

            //var pos = (row * bccmcu * 64) + col * 64;



            //var pos = blockRow * blockCol;

            //var t_arr = component.blocks_matrix.subarray(pos, 64);



            //decode(component, t_arr);
            // In the future, will be giving it positions in a larger matrix.
            //  Perhaps we could do them both together for the moment.

            // (block_number * blocksPerColumnForMcu + row_number * blocksPerLineForMcu) * 64

            //var matrix_offset = (blockRow * component.blocksPerColumnForMcu + blockCol) * 64;

            var matrix_offset = (blockCol * component.blocksPerColumnForMcu + blockRow) * 64;



            // it could do an offset_decode.
            //  it will decode to the blocks_matrix rather than blocks.



            ////console.log('zz_offset', zz_offset);

            // And could swap in matrix decoding files too.

            decode(component, matrix_offset);


            //decode(component, component.blocks[blockRow][blockCol]);


        }
        function decodeBlock(component, decode, mcu) {
            var blockRow = (mcu / component.blocksPerLine) | 0;
            var blockCol = mcu % component.blocksPerLine;

            //var bccmcu = component.blocksPerColumnForMcu;
            //var bclmcu = component.blocksPerLineForMcu;

            //var pos = (row * bccmcu * 64) + col * 64;



            //var pos = blockRow * blockCol;

            //var t_arr = component.blocks_matrix.subarray(pos, 64);

            //decode(component, t_arr);

            decode(component, component.blocks[blockRow][blockCol]);
        }

        var componentsLength = components.length;
        var component, i, j, k, n;
        var decodeFn;

        ////console.log('progressive', progressive);

        if (progressive) {
            if (spectralStart === 0)
                //decodeFn = successivePrev === 0 ? decodeDCFirst : decodeDCSuccessive;
                decodeFn = successivePrev === 0 ? matrix_decodeDCFirst : matrix_decodeDCSuccessive;
            else
                //decodeFn = successivePrev === 0 ? decodeACFirst : decodeACSuccessive;
                decodeFn = successivePrev === 0 ? matrix_decodeACFirst : matrix_decodeACSuccessive;
        } else {
            //matrix_decodeBaseline
            //decodeFn = decodeBaseline;
            decodeFn = matrix_decodeBaseline;
        }

        var mcu = 0, marker;
        var mcuExpected;
        if (componentsLength == 1) {
            mcuExpected = components[0].blocksPerLine * components[0].blocksPerColumn;
        } else {
            mcuExpected = mcusPerLine * frame.mcusPerColumn;
        }
        if (!resetInterval) resetInterval = mcuExpected;

        var h, v;
        while (mcu < mcuExpected) {
            // reset interval stuff
            for (i = 0; i < componentsLength; i++)
                components[i].pred = 0;
            eobrun = 0;

            if (componentsLength == 1) {
                component = components[0];
                for (n = 0; n < resetInterval; n++) {
                    decodeBlock(component, decodeFn, mcu);
                    mcu++;
                }
            } else {
                for (n = 0; n < resetInterval; n++) {
                    for (i = 0; i < componentsLength; i++) {
                        component = components[i];
                        h = component.h;
                        v = component.v;

                        // column_num, row_num

                        for (j = 0; j < v; j++) {
                            for (k = 0; k < h; k++) {
                                decodeMcu(component, decodeFn, mcu, j, k);
                            }
                        }
                    }
                    mcu++;

                    // If we've reached our expected MCU's, stop decoding
                    if (mcu === mcuExpected) break;
                }
            }

            // find marker
            bitsCount = 0;
            marker = (data[offset] << 8) | data[offset + 1];
            if (marker < 0xFF00) {
                throw "marker was not found";
            }

            if (marker >= 0xFFD0 && marker <= 0xFFD7) { // RSTx
                offset += 2;
            }
            else
                break;
        }

        return offset - startOffset;
    }

    function buildComponentData(frame, component) {

        //console.log('buildComponentData');

        var lines = [];
        var blocksPerLine = component.blocksPerLine;
        var blocksPerColumn = component.blocksPerColumn;
        var samplesPerLine = blocksPerLine << 3;
        var R = new Int32Array(64), r = new Uint8Array(64);

        // This could be made to refer to a position within a blocks_matrix.
        //  We could replace references to zz with the blocks_matrix, and an offset within that matrix.






        // A port of poppler's IDCT method which in turn is taken from:
        //   Christoph Loeffler, Adriaan Ligtenberg, George S. Moschytz,
        //   "Practical Fast 1-D DCT Algorithms with 11 Multiplications",
        //   IEEE Intl. Conf. on Acoustics, Speech & Signal Processing, 1989,
        //   988-991.

        function matrix_quantizeAndInverse(blocks_matrix, blocks_matrix_offset, dataOut, dataIn) {


            var qt = component.quantizationTable;
            var v0, v1, v2, v3, v4, v5, v6, v7, t;
            var p = dataIn;
            var i;

            // dequant
            for (i = 0; i < 64; i++)
                p[i] = blocks_matrix[i + blocks_matrix_offset] * qt[i];

            // inverse DCT on rows
            for (i = 0; i < 8; ++i) {
                var row = 8 * i;

                // check for all-zero AC coefficients
                if (p[1 + row] == 0 && p[2 + row] == 0 && p[3 + row] == 0 &&
                    p[4 + row] == 0 && p[5 + row] == 0 && p[6 + row] == 0 &&
                    p[7 + row] == 0) {
                    t = (dctSqrt2 * p[0 + row] + 512) >> 10;
                    p[0 + row] = t;
                    p[1 + row] = t;
                    p[2 + row] = t;
                    p[3 + row] = t;
                    p[4 + row] = t;
                    p[5 + row] = t;
                    p[6 + row] = t;
                    p[7 + row] = t;
                    continue;
                }

                // stage 4
                v0 = (dctSqrt2 * p[0 + row] + 128) >> 8;
                v1 = (dctSqrt2 * p[4 + row] + 128) >> 8;
                v2 = p[2 + row];
                v3 = p[6 + row];
                v4 = (dctSqrt1d2 * (p[1 + row] - p[7 + row]) + 128) >> 8;
                v7 = (dctSqrt1d2 * (p[1 + row] + p[7 + row]) + 128) >> 8;
                v5 = p[3 + row] << 4;
                v6 = p[5 + row] << 4;

                // stage 3
                t = (v0 - v1+ 1) >> 1;
                v0 = (v0 + v1 + 1) >> 1;
                v1 = t;
                t = (v2 * dctSin6 + v3 * dctCos6 + 128) >> 8;
                v2 = (v2 * dctCos6 - v3 * dctSin6 + 128) >> 8;
                v3 = t;
                t = (v4 - v6 + 1) >> 1;
                v4 = (v4 + v6 + 1) >> 1;
                v6 = t;
                t = (v7 + v5 + 1) >> 1;
                v5 = (v7 - v5 + 1) >> 1;
                v7 = t;

                // stage 2
                t = (v0 - v3 + 1) >> 1;
                v0 = (v0 + v3 + 1) >> 1;
                v3 = t;
                t = (v1 - v2 + 1) >> 1;
                v1 = (v1 + v2 + 1) >> 1;
                v2 = t;
                t = (v4 * dctSin3 + v7 * dctCos3 + 2048) >> 12;
                v4 = (v4 * dctCos3 - v7 * dctSin3 + 2048) >> 12;
                v7 = t;
                t = (v5 * dctSin1 + v6 * dctCos1 + 2048) >> 12;
                v5 = (v5 * dctCos1 - v6 * dctSin1 + 2048) >> 12;
                v6 = t;

                // stage 1
                p[0 + row] = v0 + v7;
                p[7 + row] = v0 - v7;
                p[1 + row] = v1 + v6;
                p[6 + row] = v1 - v6;
                p[2 + row] = v2 + v5;
                p[5 + row] = v2 - v5;
                p[3 + row] = v3 + v4;
                p[4 + row] = v3 - v4;
            }

            // inverse DCT on columns
            for (i = 0; i < 8; ++i) {
                var col = i;

                // check for all-zero AC coefficients
                if (p[1*8 + col] == 0 && p[2*8 + col] == 0 && p[3*8 + col] == 0 &&
                    p[4*8 + col] == 0 && p[5*8 + col] == 0 && p[6*8 + col] == 0 &&
                    p[7*8 + col] == 0) {
                    t = (dctSqrt2 * dataIn[i+0] + 8192) >> 14;
                    p[0*8 + col] = t;
                    p[1*8 + col] = t;
                    p[2*8 + col] = t;
                    p[3*8 + col] = t;
                    p[4*8 + col] = t;
                    p[5*8 + col] = t;
                    p[6*8 + col] = t;
                    p[7*8 + col] = t;
                    continue;
                }

                // stage 4
                v0 = (dctSqrt2 * p[0*8 + col] + 2048) >> 12;
                v1 = (dctSqrt2 * p[4*8 + col] + 2048) >> 12;
                v2 = p[2*8 + col];
                v3 = p[6*8 + col];
                v4 = (dctSqrt1d2 * (p[1*8 + col] - p[7*8 + col]) + 2048) >> 12;
                v7 = (dctSqrt1d2 * (p[1*8 + col] + p[7*8 + col]) + 2048) >> 12;
                v5 = p[3*8 + col];
                v6 = p[5*8 + col];

                // stage 3
                t = (v0 - v1 + 1) >> 1;
                v0 = (v0 + v1 + 1) >> 1;
                v1 = t;
                t = (v2 * dctSin6 + v3 * dctCos6 + 2048) >> 12;
                v2 = (v2 * dctCos6 - v3 * dctSin6 + 2048) >> 12;
                v3 = t;
                t = (v4 - v6 + 1) >> 1;
                v4 = (v4 + v6 + 1) >> 1;
                v6 = t;
                t = (v7 + v5 + 1) >> 1;
                v5 = (v7 - v5 + 1) >> 1;
                v7 = t;

                // stage 2
                t = (v0 - v3 + 1) >> 1;
                v0 = (v0 + v3 + 1) >> 1;
                v3 = t;
                t = (v1 - v2 + 1) >> 1;
                v1 = (v1 + v2 + 1) >> 1;
                v2 = t;
                t = (v4 * dctSin3 + v7 * dctCos3 + 2048) >> 12;
                v4 = (v4 * dctCos3 - v7 * dctSin3 + 2048) >> 12;
                v7 = t;
                t = (v5 * dctSin1 + v6 * dctCos1 + 2048) >> 12;
                v5 = (v5 * dctCos1 - v6 * dctSin1 + 2048) >> 12;
                v6 = t;

                // stage 1
                p[0*8 + col] = v0 + v7;
                p[7*8 + col] = v0 - v7;
                p[1*8 + col] = v1 + v6;
                p[6*8 + col] = v1 - v6;
                p[2*8 + col] = v2 + v5;
                p[5*8 + col] = v2 - v5;
                p[3*8 + col] = v3 + v4;
                p[4*8 + col] = v3 - v4;
            }

            // convert to 8-bit integers
            for (i = 0; i < 64; ++i) {
                var sample = 128 + ((p[i] + 8) >> 4);
                dataOut[i] = sample < 0 ? 0 : sample > 0xFF ? 0xFF : sample;
            }
        }

        function quantizeAndInverse(zz, dataOut, dataIn) {


            var qt = component.quantizationTable;
            var v0, v1, v2, v3, v4, v5, v6, v7, t;
            var p = dataIn;
            var i;

            // dequant
            for (i = 0; i < 64; i++)
                p[i] = zz[i] * qt[i];

            // inverse DCT on rows
            for (i = 0; i < 8; ++i) {
                var row = 8 * i;

                // check for all-zero AC coefficients
                if (p[1 + row] == 0 && p[2 + row] == 0 && p[3 + row] == 0 &&
                    p[4 + row] == 0 && p[5 + row] == 0 && p[6 + row] == 0 &&
                    p[7 + row] == 0) {
                    t = (dctSqrt2 * p[0 + row] + 512) >> 10;
                    p[0 + row] = t;
                    p[1 + row] = t;
                    p[2 + row] = t;
                    p[3 + row] = t;
                    p[4 + row] = t;
                    p[5 + row] = t;
                    p[6 + row] = t;
                    p[7 + row] = t;
                    continue;
                }

                // stage 4
                v0 = (dctSqrt2 * p[0 + row] + 128) >> 8;
                v1 = (dctSqrt2 * p[4 + row] + 128) >> 8;
                v2 = p[2 + row];
                v3 = p[6 + row];
                v4 = (dctSqrt1d2 * (p[1 + row] - p[7 + row]) + 128) >> 8;
                v7 = (dctSqrt1d2 * (p[1 + row] + p[7 + row]) + 128) >> 8;
                v5 = p[3 + row] << 4;
                v6 = p[5 + row] << 4;

                // stage 3
                t = (v0 - v1+ 1) >> 1;
                v0 = (v0 + v1 + 1) >> 1;
                v1 = t;
                t = (v2 * dctSin6 + v3 * dctCos6 + 128) >> 8;
                v2 = (v2 * dctCos6 - v3 * dctSin6 + 128) >> 8;
                v3 = t;
                t = (v4 - v6 + 1) >> 1;
                v4 = (v4 + v6 + 1) >> 1;
                v6 = t;
                t = (v7 + v5 + 1) >> 1;
                v5 = (v7 - v5 + 1) >> 1;
                v7 = t;

                // stage 2
                t = (v0 - v3 + 1) >> 1;
                v0 = (v0 + v3 + 1) >> 1;
                v3 = t;
                t = (v1 - v2 + 1) >> 1;
                v1 = (v1 + v2 + 1) >> 1;
                v2 = t;
                t = (v4 * dctSin3 + v7 * dctCos3 + 2048) >> 12;
                v4 = (v4 * dctCos3 - v7 * dctSin3 + 2048) >> 12;
                v7 = t;
                t = (v5 * dctSin1 + v6 * dctCos1 + 2048) >> 12;
                v5 = (v5 * dctCos1 - v6 * dctSin1 + 2048) >> 12;
                v6 = t;

                // stage 1
                p[0 + row] = v0 + v7;
                p[7 + row] = v0 - v7;
                p[1 + row] = v1 + v6;
                p[6 + row] = v1 - v6;
                p[2 + row] = v2 + v5;
                p[5 + row] = v2 - v5;
                p[3 + row] = v3 + v4;
                p[4 + row] = v3 - v4;
            }

            // inverse DCT on columns
            for (i = 0; i < 8; ++i) {
                var col = i;

                // check for all-zero AC coefficients
                if (p[1*8 + col] == 0 && p[2*8 + col] == 0 && p[3*8 + col] == 0 &&
                    p[4*8 + col] == 0 && p[5*8 + col] == 0 && p[6*8 + col] == 0 &&
                    p[7*8 + col] == 0) {
                    t = (dctSqrt2 * dataIn[i+0] + 8192) >> 14;
                    p[0*8 + col] = t;
                    p[1*8 + col] = t;
                    p[2*8 + col] = t;
                    p[3*8 + col] = t;
                    p[4*8 + col] = t;
                    p[5*8 + col] = t;
                    p[6*8 + col] = t;
                    p[7*8 + col] = t;
                    continue;
                }

                // stage 4
                v0 = (dctSqrt2 * p[0*8 + col] + 2048) >> 12;
                v1 = (dctSqrt2 * p[4*8 + col] + 2048) >> 12;
                v2 = p[2*8 + col];
                v3 = p[6*8 + col];
                v4 = (dctSqrt1d2 * (p[1*8 + col] - p[7*8 + col]) + 2048) >> 12;
                v7 = (dctSqrt1d2 * (p[1*8 + col] + p[7*8 + col]) + 2048) >> 12;
                v5 = p[3*8 + col];
                v6 = p[5*8 + col];

                // stage 3
                t = (v0 - v1 + 1) >> 1;
                v0 = (v0 + v1 + 1) >> 1;
                v1 = t;
                t = (v2 * dctSin6 + v3 * dctCos6 + 2048) >> 12;
                v2 = (v2 * dctCos6 - v3 * dctSin6 + 2048) >> 12;
                v3 = t;
                t = (v4 - v6 + 1) >> 1;
                v4 = (v4 + v6 + 1) >> 1;
                v6 = t;
                t = (v7 + v5 + 1) >> 1;
                v5 = (v7 - v5 + 1) >> 1;
                v7 = t;

                // stage 2
                t = (v0 - v3 + 1) >> 1;
                v0 = (v0 + v3 + 1) >> 1;
                v3 = t;
                t = (v1 - v2 + 1) >> 1;
                v1 = (v1 + v2 + 1) >> 1;
                v2 = t;
                t = (v4 * dctSin3 + v7 * dctCos3 + 2048) >> 12;
                v4 = (v4 * dctCos3 - v7 * dctSin3 + 2048) >> 12;
                v7 = t;
                t = (v5 * dctSin1 + v6 * dctCos1 + 2048) >> 12;
                v5 = (v5 * dctCos1 - v6 * dctSin1 + 2048) >> 12;
                v6 = t;

                // stage 1
                p[0*8 + col] = v0 + v7;
                p[7*8 + col] = v0 - v7;
                p[1*8 + col] = v1 + v6;
                p[6*8 + col] = v1 - v6;
                p[2*8 + col] = v2 + v5;
                p[5*8 + col] = v2 - v5;
                p[3*8 + col] = v3 + v4;
                p[4*8 + col] = v3 - v4;
            }

            // convert to 8-bit integers
            for (i = 0; i < 64; ++i) {
                var sample = 128 + ((p[i] + 8) >> 4);
                dataOut[i] = sample < 0 ? 0 : sample > 0xFF ? 0xFF : sample;
            }
        }

        var i, j;
        for (var blockRow = 0; blockRow < blocksPerColumn; blockRow++) {
            var scanLine = blockRow << 3;
            for (i = 0; i < 8; i++)
                lines.push(new Uint8Array(samplesPerLine));

            // can get that subarray


            for (var blockCol = 0; blockCol < blocksPerLine; blockCol++) {

                //var bccmcu = component.blocksPerColumnForMcu;
                //var bclmcu = component.blocksPerLineForMcu;

                //var pos = (blockRow * bccmcu * 64) + blockCol * 64;



                //var pos = blockRow * blockCol;


                // But subarray makes a copy I think.
                //  May need to change those quantise functions, so they don't act on the subarray.
                //  And the decode function.


                //var t_arr = component.blocks_matrix.subarray(pos, 64);

                //quantizeAndInverse(t_arr, r, R);

                // (block_number * blocksPerColumnForMcu + row_number * blocksPerLineForMcu) * 64

                //var pos = (blockRow * component.blocksPerColumnForMcu + blockCol) * 64;

                var pos = (blockCol * component.blocksPerColumnForMcu + blockRow) * 64;

                //var t_arr = component.blocks_matrix.subarray(pos, 64);

                // Really need to be setting that data in the quantizeAndInverse function.

                matrix_quantizeAndInverse(component.blocks_matrix, pos, r, R);

                //quantizeAndInverse(component.blocks[blockRow][blockCol], r, R);

                var offset = 0, sample = blockCol << 3;
                for (j = 0; j < 8; j++) {
                    var line = lines[scanLine + j];
                    for (i = 0; i < 8; i++)
                        line[sample + i] = r[offset++];
                }
            }
        }

        //console.log('lines.length', lines.length);
        return lines;
    }

    function clampTo8bit(a) {
        return a < 0 ? 0 : a > 255 ? 255 : a;
    }

    constructor.prototype = {
        load: function load(path) {
            var xhr = new XMLHttpRequest();
            xhr.open("GET", path, true);
            xhr.responseType = "arraybuffer";
            xhr.onload = (function() {
                // TODO catch parse error
                var data = new Uint8Array(xhr.response || xhr.mozResponseArrayBuffer);
                this.parse(data);
                if (this.onload)
                    this.onload();
            }).bind(this);
            xhr.send(null);
        },
        parse: function parse(data) {
            var offset = 0, length = data.length;
            function readUint16() {
                var value = (data[offset] << 8) | data[offset + 1];
                offset += 2;
                return value;
            }
            function readDataBlock() {
                ////console.log('readDataBlock', readDataBlock);
                var length = readUint16();
                ////console.log('length', length);
                var array = data.subarray(offset, offset + length - 2);
                offset += array.length;
                return array;
            }
            function prepareComponents(frame) {

                // This block encoding seems inefficient (particularly to allocate).
                //  It's making a lot of size 64 typed arrays.
                //  Having 1 big typed array would be a lot quicker.





                var maxH = 0, maxV = 0;
                var component, componentId;
                for (componentId in frame.components) {
                    if (frame.components.hasOwnProperty(componentId)) {
                        component = frame.components[componentId];
                        if (maxH < component.h) maxH = component.h;
                        if (maxV < component.v) maxV = component.v;
                    }
                }
                var mcusPerLine = Math.ceil(frame.samplesPerLine / 8 / maxH);
                var mcusPerColumn = Math.ceil(frame.scanLines / 8 / maxV);
                for (componentId in frame.components) {
                    //console.log('componentId', componentId);
                    if (frame.components.hasOwnProperty(componentId)) {
                        component = frame.components[componentId];
                        var blocksPerLine = Math.ceil(Math.ceil(frame.samplesPerLine / 8) * component.h / maxH);
                        var blocksPerColumn = Math.ceil(Math.ceil(frame.scanLines  / 8) * component.v / maxV);
                        var blocksPerLineForMcu = mcusPerLine * component.h;
                        var blocksPerColumnForMcu = mcusPerColumn * component.v;
                        //var blocks = [];
                        //console.log('blocksPerColumnForMcu', blocksPerColumnForMcu);
                        //console.log('blocksPerLineForMcu', blocksPerLineForMcu);

                        //var blocks = new Array(blocksPerColumnForMcu);

                        /*
                         var blocks = new Array(blocksPerColumnForMcu);


                         //console.log('blocksPerColumnForMcu', blocksPerColumnForMcu);
                         //console.log('blocksPerLineForMcu', blocksPerLineForMcu);

                         // This loop seems like the slow part!
                         //  It does not do anything so complicated either.

                         var i, j, row;

                         for (i = 0; i < blocksPerColumnForMcu; i++) {
                         row = new Array(blocksPerLineForMcu);
                         for (j = 0; j < blocksPerLineForMcu; j++) {
                         row[j] = new Int32Array(64);
                         }
                         //row.push(new Int32Array(64));


                         blocks.push(row);
                         }
                         */



                        // This loop seems like the slow part!


                        var num_total_rows = blocksPerColumnForMcu * blocksPerLineForMcu;
                        var rows_matrix_size = num_total_rows * 64;
                        //console.log('rows_matrix_size', rows_matrix_size);

                        var blocks_matrix = new Int32Array(rows_matrix_size);
                        var c = 0;

                        // blocks, then rows. rows, then arrays inside them.

                        // a function to calculate between the positions?


                        // (block_number * blocksPerColumnForMcu + row_number * blocksPerLineForMcu) * 64

                        //(function(){

                        // Will change it so it operates on blocks_matrix
                        //  It involves some maths but it's going to greatly speed things up.


                        /*
                        for (var i = 0; i < blocksPerColumnForMcu; i++) {

                            //(function(){

                            var row = new Array(blocksPerLineForMcu);
                            for (var j = 0; j < blocksPerLineForMcu; j++) {
                                //row.push(new Int32Array(64));
                                row[j] = new Int32Array(64);
                            }

                            //blocks.push(row);
                            blocks[i] = row;

                            //})()

                        }
                        */


                        //})()
                        // column length =  blocksPerColumnForMcu * 64
                        // +


                        component.blocksPerLine = blocksPerLine;
                        component.blocksPerColumn = blocksPerColumn;
                        component.blocksPerLineForMcu = blocksPerLineForMcu;
                        component.blocksPerColumnForMcu = blocksPerColumnForMcu;


                        //component.blocks = blocks;


                        component.blocks_matrix = blocks_matrix;

                        // will probably use a blocks_matrix instead.
                    }
                }
                frame.maxH = maxH;
                frame.maxV = maxV;
                frame.mcusPerLine = mcusPerLine;
                frame.mcusPerColumn = mcusPerColumn;
            }
            var jfif = null;
            var adobe = null;
            var pixels = null;
            var frame, resetInterval;
            var quantizationTables = [], frames = [];
            var huffmanTablesAC = [], huffmanTablesDC = [];
            var fileMarker = readUint16();
            if (fileMarker != 0xFFD8) { // SOI (Start of Image)
                throw "SOI not found";
            }

            fileMarker = readUint16();

            var c = 0;
            while (fileMarker != 0xFFD9) { // EOI (End of image)
                //console.log('main while loop block');


                var i, j, l;
                switch(fileMarker) {
                    case 0xFF00: break;
                    case 0xFFE0: // APP0 (Application Specific)
                    case 0xFFE1: // APP1
                    case 0xFFE2: // APP2
                    case 0xFFE3: // APP3
                    case 0xFFE4: // APP4
                    case 0xFFE5: // APP5
                    case 0xFFE6: // APP6
                    case 0xFFE7: // APP7
                    case 0xFFE8: // APP8
                    case 0xFFE9: // APP9
                    case 0xFFEA: // APP10
                    case 0xFFEB: // APP11
                    case 0xFFEC: // APP12
                    case 0xFFED: // APP13
                    case 0xFFEE: // APP14
                    case 0xFFEF: // APP15
                    case 0xFFFE: // COM (Comment)
                        var appData = readDataBlock();

                        if (fileMarker === 0xFFE0) {
                            if (appData[0] === 0x4A && appData[1] === 0x46 && appData[2] === 0x49 &&
                                appData[3] === 0x46 && appData[4] === 0) { // 'JFIF\x00'
                                jfif = {
                                    version: { major: appData[5], minor: appData[6] },
                                    densityUnits: appData[7],
                                    xDensity: (appData[8] << 8) | appData[9],
                                    yDensity: (appData[10] << 8) | appData[11],
                                    thumbWidth: appData[12],
                                    thumbHeight: appData[13],
                                    thumbData: appData.subarray(14, 14 + 3 * appData[12] * appData[13])
                                };
                            }
                        }
                        // TODO APP1 - Exif
                        if (fileMarker === 0xFFEE) {
                            if (appData[0] === 0x41 && appData[1] === 0x64 && appData[2] === 0x6F &&
                                appData[3] === 0x62 && appData[4] === 0x65 && appData[5] === 0) { // 'Adobe\x00'
                                adobe = {
                                    version: appData[6],
                                    flags0: (appData[7] << 8) | appData[8],
                                    flags1: (appData[9] << 8) | appData[10],
                                    transformCode: appData[11]
                                };
                            }
                        }
                        break;

                    case 0xFFDB: // DQT (Define Quantization Tables)
                        //console.log('Define Quantization Tables');

                        var quantizationTablesLength = readUint16();
                        var quantizationTablesEnd = quantizationTablesLength + offset - 2;
                        while (offset < quantizationTablesEnd) {
                            var quantizationTableSpec = data[offset++];
                            var tableData = new Int32Array(64);
                            if ((quantizationTableSpec >> 4) === 0) { // 8 bit values
                                for (j = 0; j < 64; j++) {
                                    var z = dctZigZag[j];
                                    tableData[z] = data[offset++];
                                }
                            } else if ((quantizationTableSpec >> 4) === 1) { //16 bit
                                for (j = 0; j < 64; j++) {
                                    var z = dctZigZag[j];
                                    tableData[z] = readUint16();
                                }
                            } else
                                throw "DQT: invalid table spec";
                            quantizationTables[quantizationTableSpec & 15] = tableData;
                        }
                        break;

                    case 0xFFC0: // SOF0 (Start of Frame, Baseline DCT)
                    case 0xFFC1: // SOF1 (Start of Frame, Extended DCT)
                    case 0xFFC2: // SOF2 (Start of Frame, Progressive DCT)
                        //console.log('Progressive DCT');

                        // This psrt seems to take the longest.



                        readUint16(); // skip data length
                        frame = {};
                        frame.extended = (fileMarker === 0xFFC1);
                        frame.progressive = (fileMarker === 0xFFC2);
                        frame.precision = data[offset++];
                        frame.scanLines = readUint16();
                        frame.samplesPerLine = readUint16();
                        frame.components = {};
                        frame.componentsOrder = [];
                        var componentsCount = data[offset++], componentId;
                        var maxH = 0, maxV = 0;
                        for (i = 0; i < componentsCount; i++) {
                            componentId = data[offset];
                            var h = data[offset + 1] >> 4;
                            var v = data[offset + 1] & 15;
                            var qId = data[offset + 2];
                            frame.componentsOrder.push(componentId);
                            frame.components[componentId] = {
                                h: h,
                                v: v,
                                quantizationTable: quantizationTables[qId]
                            };
                            offset += 3;
                        }
                        //console.log('pre prepare components');
                        // So this part is taking a while.
                        prepareComponents(frame);
                        //console.log('post prepare components');
                        frames.push(frame);
                        //console.log('end Progressive DCT');
                        break;

                    case 0xFFC4: // DHT (Define Huffman Tables)
                        //console.log('define huffman');
                        var huffmanLength = readUint16();
                        for (i = 2; i < huffmanLength;) {
                            var huffmanTableSpec = data[offset++];
                            var codeLengths = new Uint8Array(16);
                            var codeLengthSum = 0;
                            for (j = 0; j < 16; j++, offset++)
                                codeLengthSum += (codeLengths[j] = data[offset]);
                            var huffmanValues = new Uint8Array(codeLengthSum);
                            for (j = 0; j < codeLengthSum; j++, offset++)
                                huffmanValues[j] = data[offset];
                            i += 17 + codeLengthSum;

                            ((huffmanTableSpec >> 4) === 0 ?
                                huffmanTablesDC : huffmanTablesAC)[huffmanTableSpec & 15] =
                                buildHuffmanTable(codeLengths, huffmanValues);
                        }
                        break;

                    case 0xFFDD: // DRI (Define Restart Interval)
                        readUint16(); // skip data length
                        resetInterval = readUint16();
                        break;

                    case 0xFFDA: // SOS (Start of Scan)
                        //console.log('start scan');

                        var scanLength = readUint16();
                        var selectorsCount = data[offset++];
                        var components = [], component;
                        for (i = 0; i < selectorsCount; i++) {
                            component = frame.components[data[offset++]];
                            var tableSpec = data[offset++];
                            component.huffmanTableDC = huffmanTablesDC[tableSpec >> 4];
                            component.huffmanTableAC = huffmanTablesAC[tableSpec & 15];
                            components.push(component);
                        }
                        var spectralStart = data[offset++];
                        var spectralEnd = data[offset++];
                        var successiveApproximation = data[offset++];
                        var processed = decodeScan(data, offset,
                            frame, components, resetInterval,
                            spectralStart, spectralEnd,
                                successiveApproximation >> 4, successiveApproximation & 15);
                        offset += processed;
                        break;
                    default:
                        if (data[offset - 3] == 0xFF &&
                            data[offset - 2] >= 0xC0 && data[offset - 2] <= 0xFE) {
                            // could be incorrect encoding -- last 0xFF byte of the previous
                            // block was eaten by the encoder
                            offset -= 3;
                            break;
                        }
                        throw "unknown JPEG marker " + fileMarker.toString(16);
                }
                fileMarker = readUint16();
                c++;
            }
            //console.log('post main while loop');
            //console.log('c', c);

            if (frames.length != 1)
                throw "only single frame JPEGs supported";

            this.width = frame.samplesPerLine;
            this.height = frame.scanLines;
            this.jfif = jfif;
            this.adobe = adobe;
            this.components = [];

            var frame_maxH = frame.maxH;
            var frame_maxV = frame.maxV;

            var frame_componentsOrder = frame.componentsOrder;
            var frame_components = frame.components;

            //console.log('frame_componentsOrder.length', frame_componentsOrder.length);
            for (var i = 0, l = frame_componentsOrder.length; i < l; i++) {
                var component = frame_components[frame_componentsOrder[i]];


                this.components.push({
                    lines: buildComponentData(frame, component),
                    scaleX: component.h / frame_maxH,
                    scaleY: component.v / frame_maxV
                });
            }
        },

        //getData_rgb_to_rgba_buffer

        getData_rgb_to_rgba_buffer: function getData(width, height) {
            var scaleX = this.width / width, scaleY = this.height / height;

            var component1, component2, component3, component4;
            var component1Line, component2Line, component3Line, component4Line;
            var x, y;
            var offset = 0;
            var Y, Cb, Cr, K, C, M, Ye, R, G, B;
            var colorTransform;


            // We may want to return an RGBA buffer instead.
            //  Output as the standard node buffer, RGBA pixels.

            // Deal with output components too?

            //console.log('this.components.length', this.components.length);

            var dataLength = width * height * this.components.length;

            var output_buffer_length = width * height * 4;

            var output_buffer = new Buffer(output_buffer_length);

            //var data = new Uint8Array(dataLength);

            var YscaleY, XscaleX;
            var components = this.components;

            switch (components.length) {
                case 1:
                    component1 = components[0];
                    for (y = 0; y < height; y++) {
                        component1Line = component1.lines[0 | (y * component1.scaleY * scaleY)];
                        for (x = 0; x < width; x++) {
                            Y = component1Line[0 | (x * component1.scaleX * scaleX)];

                            data[offset++] = Y;
                        }
                    }
                    break;
                case 2:
                    // PDF might compress two component data in custom colorspace
                    component1 = components[0];
                    component2 = components[1];
                    for (y = 0; y < height; y++) {
                        YscaleY = y * scaleY;
                        component1Line = component1.lines[0 | (component1.scaleY * YscaleY)];
                        component2Line = component2.lines[0 | (component2.scaleY * YscaleY)];
                        for (x = 0; x < width; x++) {
                            XscaleX = x * scaleX;
                            Y = component1Line[0 | (component1.scaleX * XscaleX)];
                            data[offset++] = Y;
                            Y = component2Line[0 | (component2.scaleX * XscaleX)];
                            data[offset++] = Y;
                        }
                    }
                    break;
                case 3:
                    // The default transform for three components is true
                    colorTransform = true;
                    // The adobe transform marker overrides any previous setting
                    if (this.adobe && this.adobe.transformCode)
                        colorTransform = true;
                    else if (typeof this.colorTransform !== 'undefined')
                        colorTransform = !!this.colorTransform;

                    component1 = components[0];
                    component2 = components[1];
                    component3 = components[2];
                    for (y = 0; y < height; y++) {
                        YscaleY = y * scaleY;
                        component1Line = component1.lines[0 | (component1.scaleY * YscaleY)];
                        component2Line = component2.lines[0 | (component2.scaleY * YscaleY)];
                        component3Line = component3.lines[0 | (component3.scaleY * YscaleY)];
                        for (x = 0; x < width; x++) {
                            XscaleX = x * scaleX;
                            if (!colorTransform) {
                                R = component1Line[0 | (component1.scaleX * XscaleX)];
                                G = component2Line[0 | (component2.scaleX * XscaleX)];
                                B = component3Line[0 | (component3.scaleX * XscaleX)];
                            } else {
                                Y = component1Line[0 | (component1.scaleX * XscaleX)];
                                Cb = component2Line[0 | (component2.scaleX * XscaleX)];
                                Cr = component3Line[0 | (component3.scaleX * XscaleX)];

                                R = clampTo8bit(Y + 1.402 * (Cr - 128));
                                G = clampTo8bit(Y - 0.3441363 * (Cb - 128) - 0.71413636 * (Cr - 128));
                                B = clampTo8bit(Y + 1.772 * (Cb - 128));
                            }

                            //data[offset++] = R;
                            //data[offset++] = G;
                            //data[offset++] = B;

                            output_buffer[offset++] = R;
                            output_buffer[offset++] = G;
                            output_buffer[offset++] = B;
                            output_buffer[offset++] = 255;
                        }
                    }
                    break;
                case 4:
                    if (!this.adobe)
                        throw 'Unsupported color mode (4 components)';
                    // The default transform for four components is false
                    colorTransform = false;
                    // The adobe transform marker overrides any previous setting
                    if (this.adobe && this.adobe.transformCode)
                        colorTransform = true;
                    else if (typeof this.colorTransform !== 'undefined')
                        colorTransform = !!this.colorTransform;

                    component1 = components[0];
                    component2 = components[1];
                    component3 = components[2];
                    component4 = components[3];
                    for (y = 0; y < height; y++) {
                        YscaleY = y * scaleY;
                        component1Line = component1.lines[0 | (component1.scaleY * YscaleY)];
                        component2Line = component2.lines[0 | (component2.scaleY * YscaleY)];
                        component3Line = component3.lines[0 | (component3.scaleY * YscaleY)];
                        component4Line = component4.lines[0 | (component4.scaleY * YscaleY)];
                        for (x = 0; x < width; x++) {
                            XscaleX = x * scaleX;
                            if (!colorTransform) {
                                C = component1Line[0 | (component1.scaleX * XscaleX)];
                                M = component2Line[0 | (component2.scaleX * XscaleX)];
                                Ye = component3Line[0 | (component3.scaleX * XscaleX)];
                                K = component4Line[0 | (component4.scaleX * XscaleX)];
                            } else {
                                Y = component1Line[0 | (component1.scaleX * XscaleX)];
                                Cb = component2Line[0 | (component2.scaleX * XscaleX)];
                                Cr = component3Line[0 | (component3.scaleX * XscaleX)];
                                K = component4Line[0 | (component4.scaleX * XscaleX)];

                                C = 255 - clampTo8bit(Y + 1.402 * (Cr - 128));
                                M = 255 - clampTo8bit(Y - 0.3441363 * (Cb - 128) - 0.71413636 * (Cr - 128));
                                Ye = 255 - clampTo8bit(Y + 1.772 * (Cb - 128));
                            }
                            data[offset++] = C;
                            data[offset++] = M;
                            data[offset++] = Ye;
                            data[offset++] = K;
                        }
                    }
                    break;
                default:
                    throw 'Unsupported color mode';
            }
            return output_buffer;
        },

        getData: function getData(width, height) {
            var scaleX = this.width / width, scaleY = this.height / height;

            var component1, component2, component3, component4;
            var component1Line, component2Line, component3Line, component4Line;
            var x, y;
            var offset = 0;
            var Y, Cb, Cr, K, C, M, Ye, R, G, B;
            var colorTransform;


            // We may want to return an RGBA buffer instead.
            //  Output as the standard node buffer, RGBA pixels.

            // Deal with output components too?

            //console.log('this.components.length', this.components.length);

            var dataLength = width * height * this.components.length;

            var data = new Uint8Array(dataLength);

            var YscaleY, XscaleX;
            var components = this.components;

            switch (components.length) {
                case 1:
                    component1 = components[0];
                    for (y = 0; y < height; y++) {
                        component1Line = component1.lines[0 | (y * component1.scaleY * scaleY)];
                        for (x = 0; x < width; x++) {
                            Y = component1Line[0 | (x * component1.scaleX * scaleX)];

                            data[offset++] = Y;
                        }
                    }
                    break;
                case 2:
                    // PDF might compress two component data in custom colorspace
                    component1 = components[0];
                    component2 = components[1];
                    for (y = 0; y < height; y++) {
                        YscaleY = y * scaleY;
                        component1Line = component1.lines[0 | (component1.scaleY * YscaleY)];
                        component2Line = component2.lines[0 | (component2.scaleY * YscaleY)];
                        for (x = 0; x < width; x++) {
                            XscaleX = x * scaleX;
                            Y = component1Line[0 | (component1.scaleX * XscaleX)];
                            data[offset++] = Y;
                            Y = component2Line[0 | (component2.scaleX * XscaleX)];
                            data[offset++] = Y;
                        }
                    }
                    break;
                case 3:
                    // The default transform for three components is true
                    colorTransform = true;
                    // The adobe transform marker overrides any previous setting
                    if (this.adobe && this.adobe.transformCode)
                        colorTransform = true;
                    else if (typeof this.colorTransform !== 'undefined')
                        colorTransform = !!this.colorTransform;

                    component1 = components[0];
                    component2 = components[1];
                    component3 = components[2];
                    for (y = 0; y < height; y++) {
                        YscaleY = y * scaleY;
                        component1Line = component1.lines[0 | (component1.scaleY * YscaleY)];
                        component2Line = component2.lines[0 | (component2.scaleY * YscaleY)];
                        component3Line = component3.lines[0 | (component3.scaleY * YscaleY)];
                        for (x = 0; x < width; x++) {
                            XscaleX = x * scaleX;
                            if (!colorTransform) {
                                R = component1Line[0 | (component1.scaleX * XscaleX)];
                                G = component2Line[0 | (component2.scaleX * XscaleX)];
                                B = component3Line[0 | (component3.scaleX * XscaleX)];
                            } else {
                                Y = component1Line[0 | (component1.scaleX * XscaleX)];
                                Cb = component2Line[0 | (component2.scaleX * XscaleX)];
                                Cr = component3Line[0 | (component3.scaleX * XscaleX)];

                                R = clampTo8bit(Y + 1.402 * (Cr - 128));
                                G = clampTo8bit(Y - 0.3441363 * (Cb - 128) - 0.71413636 * (Cr - 128));
                                B = clampTo8bit(Y + 1.772 * (Cb - 128));
                            }

                            data[offset++] = R;
                            data[offset++] = G;
                            data[offset++] = B;
                        }
                    }
                    break;
                case 4:
                    if (!this.adobe)
                        throw 'Unsupported color mode (4 components)';
                    // The default transform for four components is false
                    colorTransform = false;
                    // The adobe transform marker overrides any previous setting
                    if (this.adobe && this.adobe.transformCode)
                        colorTransform = true;
                    else if (typeof this.colorTransform !== 'undefined')
                        colorTransform = !!this.colorTransform;

                    component1 = components[0];
                    component2 = components[1];
                    component3 = components[2];
                    component4 = components[3];
                    for (y = 0; y < height; y++) {
                        YscaleY = y * scaleY;
                        component1Line = component1.lines[0 | (component1.scaleY * YscaleY)];
                        component2Line = component2.lines[0 | (component2.scaleY * YscaleY)];
                        component3Line = component3.lines[0 | (component3.scaleY * YscaleY)];
                        component4Line = component4.lines[0 | (component4.scaleY * YscaleY)];
                        for (x = 0; x < width; x++) {
                            XscaleX = x * scaleX;
                            if (!colorTransform) {
                                C = component1Line[0 | (component1.scaleX * XscaleX)];
                                M = component2Line[0 | (component2.scaleX * XscaleX)];
                                Ye = component3Line[0 | (component3.scaleX * XscaleX)];
                                K = component4Line[0 | (component4.scaleX * XscaleX)];
                            } else {
                                Y = component1Line[0 | (component1.scaleX * XscaleX)];
                                Cb = component2Line[0 | (component2.scaleX * XscaleX)];
                                Cr = component3Line[0 | (component3.scaleX * XscaleX)];
                                K = component4Line[0 | (component4.scaleX * XscaleX)];

                                C = 255 - clampTo8bit(Y + 1.402 * (Cr - 128));
                                M = 255 - clampTo8bit(Y - 0.3441363 * (Cb - 128) - 0.71413636 * (Cr - 128));
                                Ye = 255 - clampTo8bit(Y + 1.772 * (Cb - 128));
                            }
                            data[offset++] = C;
                            data[offset++] = M;
                            data[offset++] = Ye;
                            data[offset++] = K;
                        }
                    }
                    break;
                default:
                    throw 'Unsupported color mode';
            }
            return data;
        },
        copyToImageData: function copyToImageData(imageData) {
            var width = imageData.width, height = imageData.height;
            var imageDataArray = imageData.data;
            var data = this.getData(width, height);
            var i = 0, j = 0, x, y;
            var Y, K, C, M, R, G, B;
            switch (this.components.length) {
                case 1:
                    for (y = 0; y < height; y++) {
                        for (x = 0; x < width; x++) {
                            Y = data[i++];

                            imageDataArray[j++] = Y;
                            imageDataArray[j++] = Y;
                            imageDataArray[j++] = Y;
                            imageDataArray[j++] = 255;
                        }
                    }
                    break;
                case 3:
                    for (y = 0; y < height; y++) {
                        for (x = 0; x < width; x++) {
                            R = data[i++];
                            G = data[i++];
                            B = data[i++];

                            imageDataArray[j++] = R;
                            imageDataArray[j++] = G;
                            imageDataArray[j++] = B;
                            imageDataArray[j++] = 255;
                        }
                    }
                    break;
                case 4:
                    for (y = 0; y < height; y++) {
                        for (x = 0; x < width; x++) {
                            C = data[i++];
                            M = data[i++];
                            Y = data[i++];
                            K = data[i++];

                            R = 255 - clampTo8bit(C * (1 - K / 255) + K);
                            G = 255 - clampTo8bit(M * (1 - K / 255) + K);
                            B = 255 - clampTo8bit(Y * (1 - K / 255) + K);

                            imageDataArray[j++] = R;
                            imageDataArray[j++] = G;
                            imageDataArray[j++] = B;
                            imageDataArray[j++] = 255;
                        }
                    }
                    break;
                default:
                    throw 'Unsupported color mode';
            }
        }
    };

    return constructor;
})();
module.exports = decode;

function decode(jpegData) {

    //console.log('pre assign data array');
    var arr = new Uint8Array(jpegData);
    //console.log('post assign data array');


    var decoder = new JpegImage();

    //console.log('pre parse');
    decoder.parse(arr);
    //console.log('post parse');


    //  That may be worth doing to prevent having to copy at the end.
    // decoder.get_rgba_buffer_data

    //var data =  decoder.getData(decoder.width, decoder.height);

    var rgba_buf =  decoder.getData_rgb_to_rgba_buffer(decoder.width, decoder.height);

    //getData_rgb_to_rgba_buffer

   // var buf = new Buffer(decoder.width * decoder.height * 4);

    /*

    var n = 0;


    // Still, other parts are taking much longer.
    // The buffer copy... that could be done more quickly.

    // turns it from an RGB array to RGBA.


    var t1 = new Date();

    // could do x,y iteration?
    //  iterate through buffer, could have a pixel counter?
    //  could do it pixel by pixel, having 4 assignments at once?

    //console.log('begin buffer copy');
    for (var i = 0, l = buf.length; i < l; i++) {
        buf[i + (i/3 | 0)] = data[n++];
        if (i % 4 === 3) buf[i] = 255;
    }
    var tt = new Date() - t1;
    //console.log('end buffer copy, time: ', tt);

    */



    return {
        data: rgba_buf,
        width: decoder.width,
        height: decoder.height
    };
}
