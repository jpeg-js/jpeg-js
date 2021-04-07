var fs = require('fs'),
  path = require('path'),
  assert = require('assert'),
  jpeg = require('..');

function fixture(name) {
  return fs.readFileSync(path.join(__dirname, 'fixtures', name));
}

const SUPER_LARGE_JPEG_BASE64 =
  '/9j/wJ39sP//DlKWvX+7xPlXkJa9f7v8DoDVAAD//zb6QAEAI2cBv3P/r4ADpX8Jf14AAAAAgCPE+VeQlr1/uwCAAAAVALNOjAGP2lIS';

const SUPER_LARGE_JPEG_BUFFER = Buffer.from(SUPER_LARGE_JPEG_BASE64, 'base64');

it('should be able read image with a bad e1 marker not preceeded by ff', function () {
    var jpegData = fixture('table-with-bad-e1.jpg');
    var rawImageData = jpeg.decode(jpegData);
    var expected = fixture('table-with-good-e1.jpg');
    var rawExpectedImageData = jpeg.decode(expected);
    expect(rawImageData.data).toEqual(rawExpectedImageData.data);
});

it('should be able to decode a JPEG', function () {
  var jpegData = fixture('grumpycat.jpg');
  var rawImageData = jpeg.decode(jpegData);
  expect(rawImageData.width).toEqual(320);
  expect(rawImageData.height).toEqual(180);
  var expected = fixture('grumpycat.rgba');
  expect(rawImageData.data).toEqual(expected);
});

it('should be able to decode a JPEG with fill bytes', function () {
  var jpegData = fixture('fillbytes.jpg');
  var rawImageData = jpeg.decode(jpegData);
  expect(rawImageData.width).toEqual(704);
  expect(rawImageData.height).toEqual(576);
});

it('should be able to decode a JPEG with RST intervals', function () {
  var jpegData = fixture('redbox-with-rst.jpg');
  var rawImageData = jpeg.decode(jpegData);
  var expected = fixture('redbox.jpg');
  var rawExpectedImageData = jpeg.decode(expected);
  expect(rawImageData.data).toEqual(rawExpectedImageData.data);
});

it('should be able to decode a JPEG with trailing bytes', function () {
  var jpegData = fixture('redbox-with-trailing-bytes.jpg');
  var rawImageData = jpeg.decode(jpegData);
  var expected = fixture('redbox.jpg');
  var rawExpectedImageData = jpeg.decode(expected);
  expect(rawImageData.data).toEqual(rawExpectedImageData.data);
});

it('should be able to decode a grayscale JPEG', function () {
  var jpegData = fixture('apsara.jpg');
  var rawImageData = jpeg.decode(jpegData);
  expect(rawImageData.width).toEqual(580);
  expect(rawImageData.height).toEqual(599);
  expect(rawImageData.comments).toEqual(['File source: http://commons.wikimedia.org/wiki/File:Apsara-mit-Sitar.jpg']);
  var expected = fixture('apsara.rgba');
  expect(rawImageData.data).toEqual(expected);
});

it('should be able to decode a CMYK jpeg with correct colors', function () {
  var jpegData = fixture('tree-cmyk.jpg');
  var rawImageData = jpeg.decode(jpegData);
  expect(rawImageData.width).toEqual(400);
  expect(rawImageData.height).toEqual(250);
  var expected = fixture('tree-cmyk.cmyk');
  expect(rawImageData.data).toEqual(expected);
});

it('should be able to decode a CMYK jpeg with correct colors without transform', function () {
  var jpegData = fixture('tree-cmyk-notransform.jpg');
  var rawImageData = jpeg.decode(jpegData);
  expect(rawImageData.width).toEqual(400);
  expect(rawImageData.height).toEqual(250);
  var expected = fixture('tree-cmyk-notransform.cmyk');
  expect(rawImageData.data).toEqual(expected);
});

it('should be able to decode an RGB jpeg with correct colors', function () {
  var jpegData = fixture('tree-rgb.jpg');
  var rawImageData = jpeg.decode(jpegData);
  expect(rawImageData.width).toEqual(400);
  expect(rawImageData.height).toEqual(250);
  var expected = fixture('tree-rgb.rgba');
  expect(rawImageData.data).toEqual(expected);
});

it('should be able to decode a greyscale CMYK jpeg with correct colors', function () {
  var jpegData = fixture('cmyk-grey.jpg');
  var rawImageData = jpeg.decode(jpegData);
  expect(rawImageData.width).toEqual(300);
  expect(rawImageData.height).toEqual(389);
  var expected = fixture('cmyk-grey.cmyk');
  expect(rawImageData.data).toEqual(expected);
});

it('should be able to decode an adobe CMYK jpeg with correct colors', function () {
  var jpegData = fixture('cmyktest.jpg');
  var rawImageData = jpeg.decode(jpegData);
  expect(rawImageData.width).toEqual(300);
  expect(rawImageData.height).toEqual(111);
  var expected = fixture('cmyktest.cmyk');
  expect(rawImageData.data).toEqual(expected);

  var jpegData2 = fixture('plusshelf-drawing.jpg');
  var rawImageData2 = jpeg.decode(jpegData2);
  expect(rawImageData2.width).toEqual(350);
  expect(rawImageData2.height).toEqual(233);
  var expected2 = fixture('plusshelf-drawing.cmyk');
  expect(rawImageData2.data).toEqual(expected2);
});

it('should be able to decode a unconventional table JPEG', function () {
  var jpegData = fixture('unconventional-table.jpg');
  var rawImageData = jpeg.decode(jpegData);
  expect(rawImageData.width).toEqual(1920);
  expect(rawImageData.height).toEqual(1200);
});

it('should be able to decode a progressive JPEG', function () {
  var jpegData = fixture('skater-progressive.jpg');
  var rawImageData = jpeg.decode(jpegData);
  expect(rawImageData.width).toEqual(256);
  expect(rawImageData.height).toEqual(256);
  var expected = fixture('skater-progressive.rgba');
  expect(rawImageData.data).toEqual(expected);
});

it('should be able to decode a progressive JPEG the same as non-progressive', function () {
  var jpegData = fixture('skater.jpg');
  var rawImageData = jpeg.decode(jpegData);

  var otherJpegData = fixture('skater-progressive.jpg');
  var otherRawImageData = jpeg.decode(otherJpegData);

  expect(rawImageData.width).toEqual(otherRawImageData.width);
  expect(rawImageData.height).toEqual(otherRawImageData.height);
  expect(rawImageData.data).toEqual(otherRawImageData.data);
});

it('should be able to encode a JPEG', function () {
  var frameData = fixture('grumpycat.rgba');
  var rawImageData = {
    data: frameData,
    width: 320,
    height: 180,
  };
  var jpegImageData = jpeg.encode(rawImageData, 50);
  expect(jpegImageData.width).toEqual(320);
  expect(jpegImageData.height).toEqual(180);
  var expected = fixture('grumpycat-50.jpg');
  expect(jpegImageData.data).toEqual(expected);
});

it('should be able to create a JPEG from an array', function () {
  var width = 320,
    height = 180;
  var frameData = new Buffer(width * height * 4);
  var i = 0;
  while (i < frameData.length) {
    frameData[i++] = 0xff; // red
    frameData[i++] = 0x00; // green
    frameData[i++] = 0x00; // blue
    frameData[i++] = 0xff; // alpha - ignored in JPEGs
  }
  var rawImageData = {
    data: frameData,
    width: width,
    height: height,
  };
  var jpegImageData = jpeg.encode(rawImageData, 50);
  expect(jpegImageData.width).toEqual(width);
  expect(jpegImageData.height).toEqual(height);
  var expected = fixture('redbox.jpg');
  expect(jpegImageData.data).toEqual(expected);
});

it('should be able to create a JPEG from an array with comment', function () {
  var width = 320,
    height = 180;
  var comments = ["First comment", "Second comment"];
  var frameData = new Buffer(width * height * 4);
  var i = 0;
  while (i < frameData.length) {
    frameData[i++] = 0xff; // red
    frameData[i++] = 0x00; // green
    frameData[i++] = 0x00; // blue
    frameData[i++] = 0xff; // alpha - ignored in JPEGs
  }
  var rawImageData = {
    data: frameData,
    width: width,
    height: height,
    comments: comments,
  };
  var jpegImageData = jpeg.encode(rawImageData, 50); 
  expect(jpegImageData.width).toEqual(width);
  expect(jpegImageData.height).toEqual(height);
  var expected = fixture('redbox_comment.jpg');
  expect(jpegImageData.data).toEqual(expected);
  expect(jpeg.decode(jpegImageData.data).comments).toEqual(['First comment', 'Second comment']);
});

it('should be able to decode a JPEG into a typed array', function () {
  var jpegData = fixture('grumpycat.jpg');
  var rawImageData = jpeg.decode(jpegData, {useTArray: true});
  expect(rawImageData.width).toEqual(320);
  expect(rawImageData.height).toEqual(180);
  var expected = fixture('grumpycat.rgba');
  expect(rawImageData.data).toEqual(new Uint8Array(expected));
  assert.ok(rawImageData.data instanceof Uint8Array, 'data is a typed array');
});

it('should be able to decode a JPEG from a typed array into a typed array', function () {
  var jpegData = fixture('grumpycat.jpg');
  var rawImageData = jpeg.decode(new Uint8Array(jpegData), {useTArray: true});
  expect(rawImageData.width).toEqual(320);
  expect(rawImageData.height).toEqual(180);
  var expected = fixture('grumpycat.rgba');
  expect(rawImageData.data).toEqual(new Uint8Array(expected));
  assert.ok(rawImageData.data instanceof Uint8Array, 'data is a typed array');
});

it('should be able to decode a JPEG with options', function () {
  var jpegData = fixture('grumpycat.jpg');
  var rawImageData = jpeg.decode(new Uint8Array(jpegData), {
    useTArray: true,
    colorTransform: false,
  });
  expect(rawImageData.width).toEqual(320);
  expect(rawImageData.height).toEqual(180);
  var expected = fixture('grumpycat-nocolortrans.rgba');
  expect(rawImageData.data).toEqual(new Uint8Array(expected));
  assert.ok(rawImageData.data instanceof Uint8Array, 'data is a typed array');
});

it('should be able to decode a JPEG into RGB', function () {
  var jpegData = fixture('grumpycat.jpg');
  var rawImageData = jpeg.decode(new Uint8Array(jpegData), {useTArray: true, formatAsRGBA: false});
  expect(rawImageData.width).toEqual(320);
  expect(rawImageData.height).toEqual(180);
  var expected = fixture('grumpycat.rgb');
  expect(rawImageData.data).toEqual(new Uint8Array(expected));
  assert.ok(rawImageData.data instanceof Uint8Array, 'data is a typed array');
});

it('should be able to encode/decode image with exif data', function () {
  var jpegData = fixture('grumpycat.jpg');
  var imageData = jpeg.decode(new Uint8Array(jpegData));
  assert.ok(imageData.exifBuffer, 'decodes an exif buffer');
  var encodedData = jpeg.encode(imageData);
  var loopImageData = jpeg.decode(new Uint8Array(encodedData.data));
  expect(loopImageData.exifBuffer).toEqual(imageData.exifBuffer);
});

it('should be to decode image with ffdc marker', function () {
  var jpegData = fixture('marker-ffdc.jpg');
  var imageData = jpeg.decode(new Uint8Array(jpegData));
  expect(imageData.height).toEqual(200);
  expect(imageData.width).toEqual(200);
});


it('should be able to decode large images within memory limits', () => {
  var jpegData = fixture('black-6000x6000.jpg');
  var rawImageData = jpeg.decode(jpegData);
  expect(rawImageData.width).toEqual(6000);
  expect(rawImageData.height).toEqual(6000);
}, 30000);

// See https://github.com/eugeneware/jpeg-js/issues/53
it('should limit resolution exposure', function () {
  expect(() => jpeg.decode(SUPER_LARGE_JPEG_BUFFER)).toThrow(
    'maxResolutionInMP limit exceeded by 141MP',
  );
});

it('should limit memory exposure', function () {
  expect(() => jpeg.decode(SUPER_LARGE_JPEG_BUFFER, {maxResolutionInMP: 500})).toThrow(
    /maxMemoryUsageInMB limit exceeded by at least \d+MB/,
  );

  // Make sure the limit resets each decode.
  var jpegData = fixture('grumpycat.jpg');
  expect(() => jpeg.decode(jpegData)).not.toThrow();
}, 30000);
