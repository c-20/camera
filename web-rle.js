// expects colourreductionbits to be set!

function hexsection(buffer, index, before, after) {
  var start = index + before; // expect negative!
  if (start < 0) { start = 0; }
  var stop = index + after;
  if (stop >= buffer.length) { stop = buffer.length - 1; }
  var out   = '';
  var ix = start - 1;
  while (++ix <= stop) {
    if (ix == index) { out = out.concat('-'); }
    var next = Number(buffer[ix]).toString(16).padStart(2, '0');
    out = out.concat(next);
    if (ix == index) { out = out.concat('-'); }
  }
  return out;
}

// -- DEFAULT PALETTE -------------------------------------------------------
//function emptypalette() {
// only count up to palettemaxindex ? or to palettelength ?
//  greys should migrate like all others so, palettelength ....
//  but actually palettenumitems .. meaning no grey counting ...
//  meaning no grey retain ..... grey in rgba is silly anyway
//  meaning new palette has grey as preset to be same as receiver ...

function defaultpalette(greyalpha) {
  var palettelength   = (255 << 8) + 255 + 1; // length is FFFF+1(65536)
  var palettergbalen  = palettelength * 4;    // palette stores rgba
  var paletteitems      = new Uint8ClampedArray(palettergbalen);
  var paletteitemcounts = new Uint16Array(palettelength);
  var palettenumitems = 1; // 00 0000 (0, 0) is the prefix for paletteaddress mode
  paletteitems[0] = paletteitems[1] = paletteitems[3] = 0xFF; // unaddressable yellow
  var palettemaxindex = 0xFEFF; // FF00-FFFF are reserved for n,n,n,a 0-255 defaultalpha
//  var palette = emptypalette();
  var black = 0xFF00, white = 0xFFFF;
  var greyindex = black;
  while (greyindex <= white) {
    var thgix = greyindex * 4;
    paletteitems[thgix + 0] = greyindex % 256;
    paletteitems[thgix + 1] = greyindex % 256;
    paletteitems[thgix + 2] = greyindex % 256;
    paletteitems[thgix + 3] = greyalpha;
    greyindex++; // note these are not added to the palettenumitems counter !
  } // pre-add greys as top of two-byte range (grey/rgb, ababab -> 00FFab; rgba, abababFF -> 00FFab)
  return { items: paletteitems, numitems: palettenumitems, maxindex: palettemaxindex,
           length: palettelength, itemcounts: paletteitemcounts, rgbalen: palettergbalen,
           black: black, white: white, greyalpha: greyalpha };
}

function indexofmax(histogram, numitems) {
  if (numitems < 1) { return -1; }
  var maxvalue = histogram[0];
  var maxindex = 0;
  var ix = -1;
  while (++ix < numitems) {
    if (histogram[ix] > maxvalue) {
      maxindex = ix;
      maxvalue = histogram[ix];
    }
  }
  return maxindex;
}


function retainpalette(prevpalette, nextimage) {
  // go through previous palette in descending histogram count order
  // any detected colours go into the new palette !
  // delete previous palette memory once finished !
    // greys are always 1 + two-byte index! ??
    // maybe not ... first palette can.. subsequent just retain and also reorder ...
    // grey will gravitate toward single index in one pass (if greyalpha matches)
  // nextimage length should be same as previmage but doesn't have to be
  var nextpalette = defaultpalette(prevpalette.greyalpha);
  var retainarray = new Uint16Array(prevpalette.length);
  var retaincount = 0;
  var histogram = prevpalette.itemcounts;
  var hix = indexofmax(histogram, prevpalette.numitems);
  while (prevpalette.itemcounts[hix] != 0) { // zero saved values
    var prevpaletteix = hix * 4;
    var pix = 0;
    while (pix < nextimage.length) {
      if (   prevpalette.items[prevpaletteix + 0] == nextimage[pix + 0]
          && prevpalette.items[prevpaletteix + 1] == nextimage[pix + 1]
          && prevpalette.items[prevpaletteix + 2] == nextimage[pix + 2]
          && prevpalette.items[prevpaletteix + 3] == nextimage[pix + 3]) {
        break; // colour found ! stop searching!
      }
      pix += 4;
    } // >= rgbalen if not found !
    if (pix < prevpalette.rgbalen) {
      // store the retain index for passing to receiver
      retainarray[retaincount] = hix;
      retaincount++;
      var nextpaletteix = nextpalette.numitems * 4;
      nextpalette.items[nextpaletteix + 0] = prevpalette.items[prevpaletteix + 0];
      nextpalette.items[nextpaletteix + 1] = prevpalette.items[prevpaletteix + 1];
      nextpalette.items[nextpaletteix + 2] = prevpalette.items[prevpaletteix + 2];
      nextpalette.items[nextpaletteix + 3] = prevpalette.items[prevpaletteix + 3];
      nextpalette.numitems++;
      prevpalette.itemcounts[hix] = 0; // don't count twice
    } else { // still reset count if colour not found
      prevpalette.itemcounts[hix] = 0; // would set -1 but it's Uint!
    }
    hix = indexofmax(prevpalette.itemcounts, prevpalette.numitems);
  }
  return { nextpalette: nextpalette, retainarray: retainarray, retaincount: retaincount };
}
/////////////////////////////////////////////////////////////////////


// compressbitmap, get palette out ... remember remap deets for faster rebuild ?

//function rebuildbitmap(thisbitmap

// first frame creates defaultpalette
// items filled and counted
//   firstpaletteout is histogram reordered
//    that means image needs to be rebuilt ! should be smaller due to small index hits !

// next frame creates nextpalette
// nextpalette and



/////////////////////////////////////////////////////////////////////




// 55555555
//  55555
//   5555
//    55
//    AA
//    9

// types of span: background, if it is the whole line +/- skew (read snapped text) = 1
//                leftpad, if it is aligned (+/- skew) to a background span above  = 2
//                rightpad, same as leftpad, aligned to right edge of background   = 3
//                midpad, if within background span range (no skew)                = 4
//                midpadstalactite, if no subsequent midpad connects to background = 5
//                midpadstalagmite, if no prevsequent midpad connects to bakground = 6
//                midpadgeode,      if encased                                     = 7
//                midpadstalactit, if this is the bottom of a midpadstalactite     = 8
//                midpadstalagmit, if this is the top of a midpadstalagmite        = 9
//                modpadstalacbot, the bottom edge of a curved midpadstalactit     = A

// there is also midsplit!!!!!! in W anyway!
//
//     AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
//     AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
//     AAAAAAAAACXCVBNMAAAAAAAAAAAAAAAAAAAAAAAAA
//     AAAMXZ6AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
//     AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
//     AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
//     AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
// Z has no stalactits and stalagmits. its letter points are >skew/2
// RIGHTEDGE AND LEFTEDGE = 10 AND 11 - A SPAN WITHIN
//   
// each midpad span can have a left effect and a right effect
//
//                       incleft means next -1 +/- 1 from that above
//                      incright means next  1 +/- 1 from that above
// A = 1 midpadstalagmit, 1 midpadgeode, left:incleft, right: incright
// B = 2 midpadgeodes flatleft, left: flat,
//                right: abovemiddley leftpoint less than skew / 2!,
//                       dual curve with equal maxima meeting at leftpoint
// C = left: curve with maxima, right: left curve with minima
// D = 1 midpadgeode, left: flat, right: curve with maxima
// E = left: flat, right: flat. topleft, bottomleft, topleft, bottomleft
//         bottomleft only if > 33% of width?


// ..........VVVVVVV.............
// ...........VVVV...............
// ...........VVVV...............
// .............VV...............
// .............VV...............
// .............v................

// .............a................
// ............AA................
// ............AA................
// ...........AAAA...............
// ...........AAAA...............
// ...........AAAA...............


// XXXXXXXXWWWXXXXXXXXX
// XXXXXXXXXWWWWXXXXXXXXXX
// XXXXXXXXXXWWXXXXXXXXXXX
// XXXXXXXXXXXwXXXXXXXXXXX
// XXXXXXXXXXXWXXXXXXXXXXX


// F = left: flat, right: topleft, bottomleft, topleft
// G = left: curve with maxima, right: left curve with minima,
//                                       bottomright!!
// H = 1 midpadstalactit, 1 midpadstalagmit, left: flat, right: flat
// I = left: topright, bottomright, right: topleft, bottomleft
// J = left: topright, right: flat then away
// K = 1 stalactit, 1 stalagmit, left: flat,
//                              right: dropped until aroundmiddley leftpoint then ramped
///////////////// B and K right: leftpoint have x and y constraints!
// L = left: flat, right: bottomleft
// M = 1 stalactit, 1 stalagmitsplit, 2 stalagmit, left: flat, right: flat
// N = 1 stalactit, 1 stalagmit, left: flat, right: flat
// O = 1 midpadgeode, left: curve with maxima, right: curve with maxima
// P = left: flat, right: curve with maxima until topleft, then flat
// Q = 1 midpadgeode with bottomright notch
//     left: curve with maxima, right: curve with maxima, intersect after maxima
// R = 1 midpadgeode flatleft, 1 stalagmit, left: flat,
//     right: curve with maxima until aroundmiddley leftpoint then ramped
// S = left: curve with maxima then curve with minima then flat and maybe away
//     right: maybe from away then flat then curve with minima then cuve with maxima
// T = left: flat then topleft then flat, right: flat then topright then flat

// can double-check the thickness of the letters!
// (.... a curve with maxima is a semi-bulge e.g. ( or ) ....)
//    image recognition is inverse!!!! background colour!!!!


// 8 and 9 are distinguishing letter points!
// midpad skews within range

function appendspans(spans, index) { // no skew in x axis, skew is a y component
  if (!spans) {
    return [{ start: index, end: index, type: 0 }];
  } else {
    var notnew = 0;
    var spix = spans.length;
    while (--spix >= 0) {
      if (spans[spix].end   == index - 1) { spans[spix].end   = index; notnew = 1; break; }
      if (spans[spix].start == index + 1) { spans[spix].start = index; notnew = 1; break; }
    }
    if (!notnew) {
      spans.push([{ start: index, end: index, type: 0 }]);
    }
    return spans;
  }
}

/*
LINE SKEW IS PARTIAL LINES -- FAT STALACTITES
USE STALACTITE QUALITY AS A MEASURE TO DE-SKEW WITH
      starty: LINENUMBER
        endy: LINENUMBER
   topstartx:    INDEX
     topendx:    INDEX
bottomstartx:    INDEX
  bottomendx:    INDEX
 skewleft: [ 0 , 0,  0,  0]
skewright: [-1, -2, -3, -4]


what if there's a floating image or two?
any unrecognised character is a floating image
with anyskew allowance, circle images (and characters) can be seen
0 0 0 0 NULL expects a COUNT for how many pixels to skip
sealed background is suffixiated background!
<background>
  <line xstart=10 xend=990 />
    <repeat ystart
</background>
  instead of skipping pixels, next line starts at (offset relative to start -127 to 127),
                              next line count is (maximum width 128) -- FF count at end
sealed: abdegopqr 9 lowercase 46890 5 numbers
        ABD  OPQR 7 uppercase

function findyspans(xspanlines) {

  var maxskew = 10; // char width in pixels
  var yspanblocks = new Array(xspanlines.length);
  var lineix = 0; // -1; skip first
  while (++lineix < xspanlines.length) {
    var prevspans  = xspanlines[lineix - 1];
    var thesespans = xspanlines[lineix];
    var psix = -1;
    while (++psix < prevspans.length) {
      var tsix = -1;
      while (++tsix < thesespans.length) {
        if (   prevspans[psix].start == thesespans[tsix].start
            && prevspans[psix].end   == thesespans[tsix].end  ) {
          yspanblocks = appendspans(yspanblocks, index);

SET MINWIDTH 50% TO FIND LINES OF TEXT
SET TOLERANCE TO 5px TO CHALLENGE ROUGH EDGES? MAX LINESKEW SHOULD BE ONE CHARACTER WIDE
D            B     N     T
 E             U      O      H
  T              T       T       I
   E                                 S
    C
     T THIS AND LESS
TOLERANCE SHOULD NOT BE LESS THAN CHAR KERNING --
xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx 99%
    | xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx |    80% ----- skew is a deliberate operation
    | xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx |    80%
    | xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx |    80% ----- BLANK LINES WILL DO THIS
    | xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx |    80%
xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx 99%

ALL SUBRANGES ARE STALACTITIC
SNIPPED EDGES ARE NOT STALACTITIC
LEFTPADDING SHOULD ALIGN LEFT  -- CARRIES FROM A START -- WITH A MINIMUM WIDTH ????
RIGHTPADDING SHOULD ALIGN RIGHT -- CARRIES FROM AN END -- WITH A MINIMUM WIDTH ????
MIDPADDING IS STALACTITIC
UNLESS IT CONNECTS TO ANOTHER LINERANGE

WHAT IF SECOND LINERANGE IS SLIGHTLY DIFFERENT? RECOGNISE THAT AS SKEW 
LEFTSKEW AND RIGHTSKEW ----------- IF DIFFERENT, THIS IS 3D MAYBE -- CAN BE NEGATIVE!
MIDPADDING MAY ALSO HAVE SKEW FOR LETTER EDGES
MINIMUM MAXIMUM SKEW SHOULD BE LETTERWIDTH < > WILL HAVE GRADIENT BUT 

SKEW SIGNATURES CAN BE USED TO DETECT WHICH LETTERS ARE WHICH

a b c d e f g h i j k l m n o p q r s t u v w x y z

LEFTPADDING RIGHTEDGE IS FIRSTLETTER LEFTSKEW

type: 1, 2, 3 -- LEFT, MID, RIGHT

                        a
-- SINGLE LETTER HAS LEFTPADDING AND RIGHTPADDING EDGES --
-- LETTERS ARE BETWEEN TWO PADDINGS ----------------------


PAGEPADDING AND TEXTPADDING ARE DIFFERENT CONTEXTS


    | xxxxxHxxHxEEEExLxxxxLxxxxxOO\\xxxxxxxxxxxxx |    80%
    | xxxxxHHHHxEEExxLxxxxLxxxxOxxO\\xxxxxxxxxxxx |    80%
    | xxxxxHxxHxExxxxLxxxxLxxxxOxxO//xxxxxxxxxxxx |    80%
    | xxxxxHxxHxEEEExLLLLxLLLLxxOO//xxxxxxxxxxxxx |    80%
xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx 99%
    | xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx |    80%
    | xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx |    80%
    | xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx |    80%
    | xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx |    80%


REPEATING PATTERN IMPLIES CHAR EDGE -- ACCEPT AS CHAR ...


----------


----- 1 -----

      to           width: 100

----- 5 -----


SET MINWIDTH 1px TO FIND LETTERS/CHARS
FEED SUBRANGE OF ARRAY TO LETTER DECODER
SUBRANGE NEEDS TO NOTE STALAGMITES (FROM FLOOR UP) AND STALACTITES (FROM ROOF DOWN)


SPANRANGE HAS MINWIDTH AND MAXWIDTH

SPANRANGE IS GREEN
MATCHRANGE FOLLOWS IF PREVIOUS LINE SAME INDEX MATCHES
SUBRANGE FADES FROM GREEN TO WHITE

NEED A REVERSE CHECK AS WELL


     xx   xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx xx
y1   xx   xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx xx
y2   xx   xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx xx
y3   xx   xxxxxxxxxxxxxxxxxxxxaaaaaaaaaaaaaaaaaxxxxxxxxxxxxxxxx xx
y4   xx   xxxxxxxxxxxxxxxxxxxxaaaaaaaaaaaaaaaaaxxxxxxxxxxxxxxxx xx
y5   xx   xxxxxxxxxxxxxxxxxxxxaa             aaxxxxxxxxxxxxxxxx xx

HASLETTER: TRUE ....     specialcolour: lettercolour, if enough spans have letter-like features
//                              text is usually high contrast!  expect 50% contrast? 
/// later in a different function, find letters ........................
y6   xx   xxxxxxxxxxxxxxxxxxxxaa             aaxxxxxxxxxxxxxxxx xx
  xxxxxxxxxxxxxxxxxxxxxxxxxxxxaa             aaxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx << different range
                     // rangetype: # spanrange # -- 
    xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx << different edges of same range
                     // rangetype: ^ subrange ^ -- exists entirely within a range in the line above
          xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx  << same range at different index
                     // rangetype: overlap / underlap
y7   xx   xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx xx
y8   xx   xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx xx
y9   xx   xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx xx
y10  xx   xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx xx
y11  xx   xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx xx



        }
      }




}
*/


/*
function backgroundcolour(imagedata, colourreductionbits, alphareductionbits) {
  // colourreductionbits = 2;
  // colourreduction = bitmask
  // moves by triple
  var fancycolours = []; // note which have interesting properties
  var alphasperalpha = 256 >> alphareductionbits;
  var coloursperhue = 256 >> colourreductionbits;
  var numcolours = coloursperhue * coloursperhue * coloursperhue;
  var greenwidth = coloursperhue * coloursperhue;
  var bluewidth  = coloursperhue;
  var colours = new Array(numcolours);
  var r = -1, g = -1, b = -1;
  while (++r < coloursperhue) {
    while (++g < coloursperhue) {
      while (++b < coloursperhue) {
        var rgbpx = r * greenwidth + g * bluewidth + b;
        colours[rgbpx] = {      alphamin: alphasperalpha, alphamax: -1, // colour is not present
                                   spans: new Array(imagedata.height)   };
// for each line ! a span count! and a start and and end!
// firstspan, longestspan

// TODO: CONTINUE HERE
//                           linespancount: 
//
//                               line: { startx: 0, endx: -1 }       }; // this is not a line

        // longest sequence of this colour must exceed 50% of image width to be considered a line
        var minspanwidth = imagedata.width / 2;
        var linespancount = 0;
        var picdata = imagedata.data;
        var picdatapitch = imagedata.width * 4; // rgba
        var picdatalen = imagedata.height * picdatawspan;
        var linenumber = 0; // top line is line 0
        var picpx = 0;
        while (picpx < picdatalen) {
          var pxr = picdata[imagepx + 0] >> colourreductionbits;
          var pxg = picdata[imagepx + 1] >> colourreductionbits;
          var pxb = picdata[imagepx + 2] >> colourreductionbits;
          var pxa = picdata[imagepx + 3] >> alphareductionbits;
          var picrgbpx = pxr * greenwidth + pxg * bluewidth + pxb;
          if (colours[picrgbpx].alphamin > pxa) { colours[picrgbpx].alphamin = pxa; }
          if (colours[picrgbpx].alphamax < pxa) { colours[picrgbpx].alphamax = pxa; }
          var imagex = picpx - (picpx % picdatapitch);
          var imagey = (picpx - imagex) / picdatapitch;
          colours[picrgbpx].xspans[linenumber] =
              appendspans(colours[picrgbpx].xspans[linenumber], imagex);

          adduniquenumber(specialcolours, picrgbpx);

          picpx += 4;
          if (picpx % picdatawspan == 0) { linenumber++; } // line 0 until first line 1 pixel
          
          
        }
        var colourix = red * r + green * g + blue * b
  // alphamin, alphamax

  return { red: r, green: g, blue: b, alphamin: amin, alphamax: amax, count: n };
}
*/



var repeats   = null; // []; to make debug sequence
var repeatsin = null; // []; to make debug sequence
//function compressbitmap(imagedata, mode) { // 0 for grey, 1 for rgb, 2 for rgba
// compressbitmap now returns palette data

var imagecodebuffer = null;
var modeswitchbuffer = null;
var prevpalette = null;
function buildbitmap(imagedata, mode) { // 0 for grey, 1 for rgb, 2 for rgba
  // -- DEFAULT OPACITY -------------------------------------------------------
  var headerlen = 13;
  var defaultalpha = 250; // default to near full opacity (note!)
  var marginalpha  = 127; // expect margin of 1px or set to defaultalpha!
//  var defaultalpha = 127; // default to half opacity (note!)
  var sendcolour = (mode > 0) ? false : true ; // true for rgb, false for grey
  var sendalpha  = (mode > 1) ? true  : false; // true for rgba, false for rgb
  // false sendcolour and true sendalpha will break things
  var usedithering = false; // not yet
//  var colourreductionbits = 3;
  var inputspan    = 4; // read rgba pixels
  var inputwidth   = imagedata.width;
  var inputheight  = imagedata.height;
  var inputrgbalen = inputwidth * inputheight * inputspan;
  var inputdata    = imagedata.data;
  var outputlen    = inputrgbalen; // max compression = 0%
  var outputspan   = (sendcolour) ? 3 : 1;

  var imagecode = rebuffer8(imagecodebuffer, outputlen);
  imagecodebuffer = imagecode;

  imagecode[0] = (sendcolour) ? 255 : 255;  // always use red FF to avoid index gap
  imagecode[1] = (sendalpha) ? 0xEE : (sendcolour) ? 0xFF : 0; // to differentiate!
  imagecode[2] = (sendcolour) ? 255 :   0;  // 0,0 for grey! 255,255 for rgb !
  imagecode[3] = 0; // 0 alpha value for SOI and EOI marker! TODO: SOI extra info
  imagecode[4] = 0; // indicate size is two bytes instead of one (max 65K)
  imagecode[5] = Math.trunc(inputwidth / 256); // might be 0! does not indicate 3-byte!
  imagecode[6] = inputwidth % 256;
  imagecode[7] = Math.trunc(inputheight / 256); // might be 0
  imagecode[8] = inputheight % 256;
  imagecode[9] = defaultalpha;                  // 250 / 255!


  var retain = null;
  var retainlength = 0;
  var palette = null;
  if (prevpalette) {
    var rp = retainpalette(prevpalette, imagedata);
    retain = rp.retainarray;
    retainlength = rp.retaincount;
    palette = rp.nextpalette;
  } else { palette = defaultpalette(defaultalpha); } // (FF00-FFFF = grey, alpha%)
  prevpalette = palette;
  imagecode[10] = retainlength >> 8;
  imagecode[11] = retainlength % 256;
  imagecode[headerlen - 1] = 0;                 // alignment 0
  // unspecified: colourreduction, dithering
  var startofimagelen = headerlen; // + (retainlength * 2);
  var endofimagelen = (mode == 0) ? 2 : 4; // grey has FF trigger, rgb has FFFFFF
//  outputlen += startofimagelen + endofimagelen; // max output = inputsize + headers
// ^ false ... outputlen is the defined size equals input image len
  var outputix = startofimagelen;
  var outputmax = outputlen - endofimagelen;
  var retix = -1;
  while (++retix < retainlength) {
    imagecode[outputix++] = retain[retix] >> 8;
    imagecode[outputix++] = retain[retix] % 256;
  }
  // -- MODE SWITCHES ---------------------------------------------------------
  var modenumswitches = 254; // there is no mode FF, because FF is toggle redbyte
  var modeenabled = rebuffer8(modeswitchbuffer, modenumswitches + 1);
  modeswitchbuffer = modeenabled; // this means mode state carries between frames !
                                  // that means receiver needs to receive every frame!
                                  // otherwise it can fall out of sync !
//  var modeenabled = new Uint8ClampedArray(modenumswitches + 1); // include mode 0
  // small realloc every frame for values to be reset !

// palette is now reused memory how can that be !
// two palettes need to be stored in order to determine the differential !
// differential palette used for subsequent frames !
//  contains all reordered colours from first frame -- first frame sent unordered
//   so instead of resending colours, send retain commands ? second frame will be scattered
//   but third frame will be relatively clean
//   retain commands will be in histogram order !


  var unpalettedpixels = 0;
  var palettemode = 0;
  var repeatcount = 0;
//  var lastpaletteindex = 0; // palette mode is on after SOI, so, refer to colour 0
  var lastpaletteindex = -1; // no, it is off until it is on!
  // grey, rgb and rgba all match colours in all four channels !
  var inputix = 0; // align with top-left pixel
  // -- DETOUR: PRE-ANALYSE IMAGE ---------------------------------------------
  var background = { red: 0, green: 0, blue: 0, alpha: 0 };

/*
  


  var header = {  left: { start: { topy: 0, bottomy: 0, x: 0 }
                            end: { topy: 0, bottomy: 0, x: 0 } },
                 right: { start: { topy: 0, bottomy: 0, x: 0 }
                            end: { topy: 0, bottomy: 0, x: 0 } } };
  var lines = [];



  typedef struct _Cursor {
     int topy, bottomy, x;
  } Cursor;

  typedef struct _Range {
    // start; is ......top y, bottom y, x
    // end; is  ... top y, bottom y, x
  } Range;

  typedef struct _List {



    Range start, end;
  } List;


  List 


  Header leftstart leftend rightstart rightend
  


*/


  // -- MAIN LOOP: WHILE PIXELS TO BE READ ------------------------------------
  while (inputix < inputrgbalen) {
    if (outputix >= outputmax) { break; }
    var writepixel = 1; // yes, unless no
    if (colourreductionbits > 0) { // pre-apply colour reduction to rgb channels
      var colourreduction = (1 << colourreductionbits) - 1;
      inputdata[inputix + 0] |= colourreduction;
      inputdata[inputix + 1] |= colourreduction;
      inputdata[inputix + 2] |= colourreduction;
    } // OR bits to shift colour >upwards<
    var pixelmatch = false;
    if (lastpaletteindex >= 0) { // this is set to -1 after any unpaletted pixel
      if (lastpaletteindex == 0) { console.log('paletteindex 0 is unaddressable'); break; }
      var lapix = lastpaletteindex * 4; // palette colours are 4-byte
      var laredmatch   = (inputdata[inputix + 0] == palette.items[lapix + 0]);
      var lagreenmatch = (inputdata[inputix + 1] == palette.items[lapix + 1]);
      var labluematch  = (inputdata[inputix + 2] == palette.items[lapix + 2]);
      var laalphamatch = false;   // later pixels match as default alpha!
      var palettealpha = palette.items[lapix + 3]; // get palette alpha
      if (palettealpha == defaultalpha) { laalphamatch = true; } // check as rgb, no a
      else { laalphamatch = (inputdata[inputix + 3] == palette.items[lapix + 3]); }
      pixelmatch = (laredmatch && lagreenmatch && labluematch && laalphamatch);
    } // end of pixelmatch check -- used to decide if repeatcount can be used
    var lastpixel = (inputix == inputrgbalen - 4); // only if aligned!
    if (pixelmatch && !lastpixel) { // start or continue repeating this pixel
      repeatcount++;  // increment count
      writepixel = 0; // don't write because counting
    } else { // pixel didn't match! write repeats! clear lastpaletteindex!
      if (repeatcount > 0) { // endrepeat (even if pixelmatch is true, if lastpixel is true)
        // -- FIRST SEND THE RGB/GREY/RGBA TRIGGER SEQUENCE ----------------------------
        imagecode[outputix++] = imagecode[0]; // rgb  has FFFFFF trigger
        if (sendcolour) {
          imagecode[outputix++] = imagecode[1]; // grey has FF     trigger
          imagecode[outputix++] = imagecode[2]; // rgba has FFnnmm trigger (nn,mm !0)
        }
        // -- THEN SEND A REPEAT-COUNTED BYTE WITH OFFSET 254 IF >= 254!!! --------
        if (repeatcount < 0xFE) { // a 0 would end the image!
//repeats.push('[' + (0 - repeatcount) + ']');
          imagecode[outputix++] = repeatcount; // single byte 1-253
        } else { // 254+ .. send 0 or more
//repeats.push('[' + repeatcount + ']');
          imagecode[outputix++] = 0xFE;
          repeatcount -= 254;
          while (repeatcount >= 128) {
            imagecode[outputix++] = (repeatcount & 0x7F) + 0x80;
            repeatcount >>= 7;
          }
          imagecode[outputix++] = repeatcount;
        } // end of repeater packet
        repeatcount = 0;
        lastpaletteindex = -1; // this will be set again later if it matches a new index
        writepixel = (lastpixel) ? (!pixelmatch) : 0; // writepixel = !pixelmatch
      } // else writepixel stays 1. end of writerepeats!
    } // pixelmatch was true, or if it was false (or last pixel) repeats were written out
    if (writepixel) { // reach here if pixelmatch was false ! and if not the last pixel ............
      // if this pixel is in the palette, use the palette index ...
      //   otherwise toggle x2 so it can be added
      // can only add if palette mode is enabled, so toggle x3 maybe
      // UNLESS too many in palette, then just write colour
      var paletteindex = -257; // -256 = black, -1 = white; 100% opacity
      while (++paletteindex < palette.numitems) { // no gap!
        if (paletteindex == 0) { continue; } // skip unaddressable 0 !
        var palix = paletteindex; // all palette indices are positive
        if (palix < 0) { // offset grey from (-256 to -1) to (65280 to 65535)
          palix += 0xFFFF + 1; // offset by FFFF+1+(-256to-1) -> FF00-FFFF
        } // (FF00 - FFFF), then (0 to palettenumitems-1)
        var thpix = palix * 4; // palette colours are 4-byte
        var palettematch = false; // all palette colours are rgba now !
        var redmatch   = (inputdata[inputix + 0] == palette.items[thpix + 0]);
        var greenmatch = (inputdata[inputix + 1] == palette.items[thpix + 1]);
        var bluematch  = (inputdata[inputix + 2] == palette.items[thpix + 2]);
        var alphamatch = false;   // but later pixels match as default alpha!
        var palettealpha = palette.items[thpix + 3]; // get palette alpha
        if (palettealpha == defaultalpha) { // colour was stored as rgb
          alphamatch = true; // do not check alpha; rgb check only
//        } else if (palettealpha == 255) { alphamatch = true; } // greys as defaultalpha now
        } else { // colour was stored with alpha, so check alpha channel
          alphamatch = (inputdata[inputix + 3] == palette.items[thpix + 3]);
        } // remember that grey and rgb can (optionally) remember alpha!
        palettematch = (redmatch && greenmatch && bluematch && alphamatch);
        if (palettematch) { // rgba palette match even for grey mode !
          // -- SPECIAL GREY MATCH HANDLING -------------------------------------------
          if (paletteindex >= palette.maxindex) {
            console.log('palette is full!');
            break; // don't expect for now
          } else if (palix >= palette.black) { paletteindex = palix; }
          // -- TOGGLE INTO PALETTE MODE IF NOT IN PALETTE MODE -----------------------
          if (!palettemode) { // palette mode is off! lastpaletteindex is surely -1!
            palettemode = !palettemode; // -> on (true)
            imagecode[outputix++] = imagecode[0]; // FF[FF]     grey
            if (sendcolour) {
              imagecode[outputix++] = imagecode[1]; // FFFFFF[FF] rgb
              imagecode[outputix++] = imagecode[2]; // FFnnmm[FF] rgba
            }
            imagecode[outputix++] = 0xFF; // send a toggle
//            console.log('palette toggled to on to write an index!');
          } // palette mode enabled, ready to write an index value
          // -- THEN SEND PALETTEINDEX, BECAUSE paletteitems[paletteindex] MATCHED -----
          if (paletteindex <= 0) { // palette index should not be 0
            console.log('paletteindex 0 unaddressable, triggers 2-byte paletteindex');
            break; // why is this happening !
            // 01 is black, 02 is white, at default opacity
            // 00 00FF is valid paletteindex 255
            // 00 FF00 is valid paletteindex black 100% opacity
            // 00 FFFF is valid paletteindex white 100% opacity
            // 00 0000 FF is singlebyte address 255 ... special paletteindex
            // 00 0000 00-FD are low paletteaddress values
            // 00 0000 FE indicates a multibyte paletteaddress
            // thus there is no single-byte 255 address. use multibyte for 253+
            // 00 0000 FE02 is multibyte 255
            // 00 0000 FE01 is multibyte 254
            // 00 0000 FE00 is multibyte 253
            // 00 0000 FD   is singlebyte 253
            // 00 0000 FC   is singlebyte 252
            // 00 0000 FB   is singlebyte 251
            // 00 0000 FA   is singlebyte 250
            // 00 0000 F9   is singlebyte 249
            // 00 0000 F0   is singlebyte 240
            // 00 0000 EF   is singlebyte 239
            // 00 00 FE is valid 254 2-byte paletteindex
            // paletteaddress has minimum offset of 253
            // 00 00 00 FE 02 is paletteaddress 255, paletteindex 0
            // 00 00 00 FE 01 is paletteaddress 254, paletteindex 0
            // 00 00 FD is 253 ... maximum low paletteindex
            // 00 01 00 is 256 ... minimum high paletteindex
            // paletteindex range is valid 1-65535 as 2-byte !
            // paletteindex range is valid 1-254 as 1-byte   !
            // 01-FE, FF is mode trigger, 00 is 2-byte trigger
            // 00 0000 is paletteaddress mode trigger
            // 00 FF 00 is black, full opacity
            // 00 FF 7F is grey,  full opacity
            // 00 FF FF is white, full opacity
          } else if (paletteindex > 0xFE) { // 1-byte is maximum 254 -- don't send 1-byte 255
            //console.log('2-byte match at ' + paletteindex + ', outputix is ' + outputix);
//repeats.push(0 - paletteindex);
            // this is a match-push! consider also add-push!
            imagecode[outputix++] = 0;
            imagecode[outputix++] = paletteindex >> 8; // Math.trunc(paletteindex / 256);
            imagecode[outputix++] = paletteindex & 0xFF; // 256;  // greys correct
            // 255 sends as 00 00FF
//            if (paletteindex == 255) {
//              console.log('sent 255 as 2-byte!');
//            } // this is to be expected
          } else { // greys at full opacity should have matched 65280 to 65535 (00 FF 0-255)
//repeats.push(paletteindex);
            // this is a match-push! consider also add-push!
//console.log('1-byte match at ' + paletteindex + ', outputix is ' + outputix);
            imagecode[outputix++] = paletteindex; // palix should be the same!
          }
          palette.itemcounts[paletteindex]++; // sending index increments count
          lastpaletteindex = paletteindex; // remember this pixel's palette colour for pixelmatch
          writepixel = 0;    // the pixel has been written as an index of the palette
          break;             // stop searching the palette
        } // else this palette item does not match the current pixel colour
      } // end of palette items search (3 items minimum; maximum index 2, 259 items including greys)
    } // re-assess writepixel!
    if (paletteindex == palette.numitems && !writepixel) { console.log('invalid nomatch!'); break; }
    if (writepixel) { // paletteindex stops at palettenumitems, needs to be disabled (set to -1)
      if (paletteindex == palette.numitems) { // search failed to match!
        paletteindex = -1;     // set again at palettenumitems for adding!
        lastpaletteindex = -1; // set again later once added!
      } else { console.log('nomatch expected if writepixel 1!'); break; }
      // there was no palette match -- add colour to palette at new index
      // writepixel is (still) 1! send by index after adding !
      if (palette.numitems > palette.maxindex) { // palette is full (FF00 - FFFF not in count)
        console.log('full palette!');
        colourreductionbits++; // lessens palette burden
        refreshconsole();
        // leave writepixel as 1! palettemode will be disabled below if not disabled here !
        // if palette is full on lastpixel.. disable, write. after lastpixel, not possible
        // explicitly disable here in case there are other reasons to not add to palette !
        if (palettemode) {            // palette mode is on !
          console.log('disabling palette mode due to full palette!');
          palettemode = !palettemode; // from on to off !
          // still write pixel below? yes ....
          // it may become re-enabled if a later pixel has a match and writes as an index
        } // else palettemode was disabled (not possible because of outer condition)
        lastpaletteindex = -1; // in case it isn't ....
        break; // stop ... this needs to be handled better... or double-checked and tested anyway
      } else { // palette is not full, so addcolour
        // -- TOGGLE INTO PALETTE MODE IF NOT IN PALETTE MODE -----------------------
        if (!palettemode) { // palette mode is off!
//          console.log('enabling palette mode to add a colour!');
          palettemode = !palettemode; // -> on (true)
          imagecode[outputix++] = imagecode[0]; // FF     for grey
          if (sendcolour) {
            imagecode[outputix++] = imagecode[1]; // FFFFFF for rgb
            imagecode[outputix++] = imagecode[2]; // FFnnmm for rgba
          }
          imagecode[outputix++] = 0xFF; // send a toggle (255)
        } // palette mode enabled, ready to write an index value
        // -- TOGGLE-TOGGLE TO ADD A COLOUR -----------------------------------------
        lastpaletteindex = -1; // this will be updated again after the colour is sent
        palettemode = !palettemode; // -> off (false)  ------\ PM /--------
        palettemode = !palettemode; // -> on  (true)     PM   \--/  PM
        imagecode[outputix++] = imagecode[0]; // FF for grey
        if (sendcolour) {
          imagecode[outputix++] = imagecode[1]; // FFFFFF for rgb
          imagecode[outputix++] = imagecode[2]; // FFnnmm for rgba
        }
        imagecode[outputix++] = 0xFF;         // toggle-
        imagecode[outputix++] = imagecode[0]; // FF for grey
        if (sendcolour) {
          imagecode[outputix++] = imagecode[1]; // FFFFFF for rgb
          imagecode[outputix++] = imagecode[2]; // FFnnmm for rgba
        }
        imagecode[outputix++] = 0xFF;         // -toggle
        // -- NOW SEND THE COLOUR --------------------------------------------------
        // if it has an alpha channel, precede with 0 0 0
        //  rgb sends as 3-byte (with default alpha on decompress)
        //  grey sends as 3-byte (with default alpha on decompress)
        //   that means colours can be added to grey mode (unpaletted is 1-byte!)
        //   that means colours with alpha can be added to grey mode / rgb mode
        var reasontosendalpha = false; // for example, for some reason
        if (sendalpha || reasontosendalpha) {
          if (reasontosendalpha) { // non-rgba mode needs 000000 prefix
            imagecode[outputix++] = 0x00; // 0
            imagecode[outputix++] = 0x00; // 0
            imagecode[outputix++] = 0x00; // 0
          } // colour with alpha in grey or rgb mode
          imagecode[outputix++] = inputdata[inputix + 0]; // r
          imagecode[outputix++] = inputdata[inputix + 1]; // g
          imagecode[outputix++] = inputdata[inputix + 2]; // b
          imagecode[outputix++] = inputdata[inputix + 3]; // a
        } else { // send as 3-byte colour for grey/rgb mode (yes, colours in grey!)
          imagecode[outputix++] = inputdata[inputix + 0]; // r
          imagecode[outputix++] = inputdata[inputix + 1]; // g
          imagecode[outputix++] = inputdata[inputix + 2]; // b
        } // colour sent ... palettemode is on, ready for 1-byte index or FF redbyte trigger
        // still need to add the colour to the palette here!
        paletteindex = palette.numitems;  // new palettematch index is the one just added
        var thpix = paletteindex * 4;
        palette.items[thpix + 0] = inputdata[inputix + 0];
        palette.items[thpix + 1] = inputdata[inputix + 1]; // remember colours in grey mode
        palette.items[thpix + 2] = inputdata[inputix + 2];
        if (sendalpha || reasontosendalpha) { // if alpha was sent in code (for some reason)
          if (inputix == 0) { // top left pixel sets border alpha !
            paletteitems[thpix + 3] = marginalpha;
          } else { palette.items[thpix + 3] = inputdata[inputix + 3]; } // remember it (always if rgba)
        } else { palette.items[thpix + 3] = defaultalpha; }  // or use default (ignore input alpha)
        palette.numitems++; // palette now has 1 more item
        if (paletteindex == 0) { console.log('not possible - paletteindex 0 unaddressable');     }
        else if (paletteindex < 0) { console.log('unhandled paletteindex noindex!');             }
        else if (paletteindex > 0xFFFF) { console.log('paletteindex is 1-byte or 2-byte only!'); }
        else if (paletteindex > 0xFE) { // maximum 254 for 1-byte index -- don't send 1-byte 255
          // this is add-push, consider also match-push!
          imagecode[outputix++] = 0;    // 2-byte has 00 prefix (use 000000 for addressing!)
          imagecode[outputix++] = paletteindex >> 8; // Math.trunc(paletteindex / 256);
          imagecode[outputix++] = paletteindex & 0xFF; // % 256;
//console.log('2-byte add at ' + paletteindex + ', outputix is ' + outputix);
//repeats.push(0 - paletteindex);
        } else { // send a 1-byte index if within 1-254 range
          // this is add-push, consider also match-push!
          imagecode[outputix++] = paletteindex; // 1-byte index
//console.log('1-byte add at ' + paletteindex + ', outputix is ' + outputix);
//repeats.push(paletteindex);
        } // FF cannot be sent as 1-byte because of red FF trigger match!
        palette.itemcounts[paletteindex] = 1; // sending index increments count (was 0)
        lastpaletteindex = paletteindex; // remember this pixel's palette colour for pixelmatch
        writepixel = 0;    // the pixel has been written as an index of the palette
      } // either colour was added, or palettemode was disabled because the palette is full
    } // writepixel 1 if palettemode disabled, 0 if not. (([toggle][add colour]index)|writepixel 1)
    if (writepixel) { // here because writepixel is still true ! (no match, no add)
      // if colour was added and written as index, writepixel was set to 0 afterwards
      // if colour was found and written as index, writepixel was set to 0 afterwards
      // if palettemode was disabled beforehand, it was enabled .. writepixel is 0
      if (pixelmatch) { console.log('pixelmatch not expected!');      break; } // would repeat
      if (lastpaletteindex != -1) { console.log('lastpaletteindex!'); break; } // should reset
      // -- TOGGLE OUT OF PALETTE MODE IF IN PALETTE MODE --------------------------
      if (palettemode) { // palette mode is on!
        lastpaletteindex = -1; // disable pixel matching for upcoming pixels
        console.log('palette late-toggled to off for colour write'); // warning !
        // still need to check if it matches a different palette index !!!!!!!
        //  if it did then it wrote an index and writepixel was set to false!!
        //  if it matches at a different index then palettemode is re-enabled
        palettemode = !palettemode; // -> off (false)
        imagecode[outputix++] = imagecode[0]; // FF[FF] grey
        if (sendcolour) {
          imagecode[outputix++] = imagecode[1]; // FFFFFF[FF] rgb
          imagecode[outputix++] = imagecode[2]; // FFnnFF[FF] rgba
        }
        imagecode[outputix++] = 0xFF; // send a toggle FFFFFF[FF] (FF[FF for grey)
      } // palette mode disabled, ready to write a plain grey / rgb / rgba colour
      // write 3-byte colour if rgb, 1-byte if grey, 4-byte if rgba
      // that means grey currently just writes the red channel ! todo: green grey, blue grey
      // rgba can send rgb, where defaultalpha will be used upon decompress
      // there are no unpaletted repeats! FFFFFF[1-253,254] are mode switches if palette mode is off!
      imagecode[outputix++] = inputdata[inputix + 0];     // red
      // consider grey-uses-green mode, and grey-uses blue mode !! TODO !!
      if (sendcolour) {  // in grey, send red. in rgb, send rgb
        imagecode[outputix++] = inputdata[inputix + 1];   // green
        imagecode[outputix++] = inputdata[inputix + 2];   // blue
        if (sendalpha) { // rgba; in grey/rgb, alpha can be sent to palette only
          imagecode[outputix++] = inputdata[inputix + 3]; // rgba alpha
        }
      }
      unpalettedpixels++;
      lastpaletteindex = -1;
      writepixel = 0;
    } // end of write unpaletted pixel
    inputix += inputspan; // next input pixel
  }
  if (outputix >= outputlen - 4) {
    console.log('imagecode overflow!');
    console.log('uses more space than uncompressed!');
    colourreductionbits++;
    refreshconsole();
    return imagecode; // send incomplete packet
  } else { // EOI == SOI
    imagecode[outputix++] = imagecode[0];
    if (sendcolour) {
      imagecode[outputix++] = imagecode[1];
      imagecode[outputix++] = imagecode[2];
    }
    imagecode[outputix++] = 0;
  } // 0 alpha value for EOI marker
  var compressedlen = outputix;
  var bytesread = inputrgbalen;
  var byteswritten = compressedlen;
  var compressionpct = (100 * (bytesread - byteswritten)) / bytesread;
//  console.log('bytes read: ' + bytesread);
//  console.log('bytes written: ' + byteswritten);
//  console.log('compression: ' + compressionpct + '%');
  var truncedimagecode = imagecode.slice(0, compressedlen);
//  console.log('truncedlen: ' + truncedimagecode.length);
//  console.log('image size:       ' + inputwidth + 'x' + inputheight);
//  console.log('palettenumitems:  ' + palette.numitems);
//  console.log('unpalettedpixels: ' + unpalettedpixels);
//  console.log('++++++++++++++++++++++++++ END OF ENCODE');
  return { imagecode: truncedimagecode, palette: palette };
}

function compressbitmap(imagedata, mode) { // 0 for grey, 1 for rgb, 2 for rgba
  var compressed = buildbitmap(imagedata, mode);
//  console.log('palette items: ' + compressed.palette.numitems);
  // TODO: .................?
  return compressed.imagecode;
}


// ----------------------------------------------------------------------------------------------------
// ----------------------------------------------------------------------------------------------------
// ----------------------------------------------------------------------------------------------------
// ENCODE ABOVE, DECODE BELOW -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
// ====================================================================================================
// ====================================================================================================
// ====================================================================================================

var prevdepalette = null;

function decompresscode(imagecode) {
  var headerlen = 13;
  var codelength = imagecode.length;
  if      (codelength <  14) { console.log('not code!') ;     return undefined; }
  else if (codelength == 14) { console.log('no code!')  ;     return undefined; }
  if (imagecode[0] != 255) { console.log('SOI.r != 255');     return undefined; }
  var receivecolour = undefined, receivealpha = false; // FF0000[grey], FFFFFF[rgb], FFnnFF[rgba]
  if (imagecode[1] == 255 && imagecode[2] == 255 ) { receivecolour = true; }     // FFFFFF is rgb only
  else if (imagecode[2] == 255) { receivecolour = true; receivealpha = true; }   // FFabFF for rgba
  else if (!imagecode[1] && !imagecode[2]) { receivecolour = receivealpha = false; } // FF for grey
  else { console.log('invalid SOI'); return undefined; } // todo: other data types for FFc,d 0-254,0-254(!0,0)
  if (imagecode[3] != 0) { console.log('expect 0 at SOI.a');       return null; }
  if (imagecode[4] != 0) { console.log('expect 0 at SOI.aa');      return null; }
  var imagewidth  = imagecode[5] * 256 + imagecode[6];
  var imageheight = imagecode[7] * 256 + imagecode[8];
  var defaultalpha = imagecode[9];
  var retaincount = imagecode[10] * 256 + imagecode[11];
  if (imagecode[headerlen - 1] != 0) { console.log('expect 0 ending SOI'); return null; }
  var imagergbalen = imagewidth * imageheight * 4;
  var imageout = new Uint8ClampedArray(imagergbalen);
  // -- MODE SWITCHES ---------------------------------------------------------
  var modenumswitches = 254; // there is no mode FF, because FF is toggle redbyte
  var modeenabled = new Uint8ClampedArray(modenumswitches + 1); // include mode 0
//  var palette = defaultpalette(); // greys are at 00 FF(00-FF)! colour 0 is unaddressable!
  var codeix = headerlen - 1; // after SOI frame (10 bytes!), -1 because pre-increment
  var palette = null;
  if (retaincount > 0 && !prevdepalette) {
    console.log('palette retains but no prev depalette');
    return null; // fail !
  } else if (prevdepalette) {
    palette = defaultpalette(defaultalpha); // need a fresh palette to fill
    if (!retaincount) {
      console.log('this is a fresh frame for some reason');
    } else { // read retains !
      var rix = 0;
      while (++rix <= retaincount) {
        var indexhigh = imagecode[++codeix];
        var indexlow  = imagecode[++codeix];
        var retainindex = (indexhigh * 256) + indexlow;
        var retaingrey = (   retainindex >= prevdepalette.black
                          && retainindex <= prevdepalette.white);
        if (retainindex >= prevdepalette.numitems && !retaingrey) {
          console.log('tried to retain palette nonindex');
          return null; // fail
        }
        var retpalix = retainindex * 4;
        var newpalix = palette.numitems * 4;
        palette.items[newpalix + 0] = prevdepalette.items[retpalix + 0];
        palette.items[newpalix + 1] = prevdepalette.items[retpalix + 1];
        palette.items[newpalix + 2] = prevdepalette.items[retpalix + 2];
        palette.items[newpalix + 3] = prevdepalette.items[retpalix + 3];
        palette.numitems++;
      }
    }
    delete prevdepalette.items;
    delete prevdepalette.itemcounts;
    var retainpercent = Math.floor(retaincount / prevdepalette.numitems * 100);
    consoleitemvalue("Palette Retained", "" + retainpercent + "%");
  } else {
    palette = defaultpalette(defaultalpha); // greys are at 00 FF(00-FF)! colour 0 is unaddressable!
  }
  prevdepalette = palette;

  var unpalettedpixels = 0;       // palettemode might not switch back on! todo - check
  var palettemode = 0;            // toggle triggered by FFFFFF[FF] in rgb/rgba, FF[FF] in grey
  var repeatcount = 0;            // repeat triggered by FF/FFFFFF[0-253,254] if palettemode on
  var thisisatoggle = 0;        //   note that this is a toggle to later remember that-was-a-toggle
  var thatwasatoggle = 0;       //   note that that was a toggle to later remember that-was-a-toggle-toggle
  var thatwasatoggletoggle = 0; // remember that was a toggletoggle to add colour / prevent toggletoggletoggle
  var paletteindex = -1;      // no paletteindex to begin with
  var thispixel = new Uint8ClampedArray(4); // thispixel is local-only but constructed once
  var outputix = 0;           // start from top-left of output image array

  while (codeix < codelength) { // read code (++codeix for every incrememt)
    // -- TOGGLE HANDLING UPFRONT --------------------------------------------------------
    // cannot clear thatwasatoggletoggle because it is used by redbyte
    // if thisisatoggle and thatwasatoggle and then another toggletoggle, that's a toggletoggletoggle
    // a toggletoggletoggle appears after SOI indicating palettemode on then add colour straight up
    if (thisisatoggle == 0) { thatwasatoggle = thatwasatoggletoggle = 0; } // reset non-consecutive memories
    thisisatoggle = 0; // reset thisisatoggle flag -- all other toggle handling appears upon toggle
    // any time a redbyte is read, the toggle memory shifts. first time is false. then read and handle.
    thispixel[0] = imagecode[++codeix]; // read red to check for FFnnmm trigger ...
    if (palettemode) { // indexed colour, or FF-prefixed toggle/EOI/repeat (FF grey trigger, FFFFFF rgb)
      // once palettemode is disabled, it won't be re-enabled !!! todo - handle better
      if (thispixel[0] == imagecode[0] && !thatwasatoggletoggle) { // toggle-toggle means add (can have FF red)
        // match FF redbyte unless following a toggle-toggle (add colour to palette instead)
        // do not use index 255 in unpaletted grey mode! it will trigger because toggle-toggle off-on handling!
        // do not use red 255 in unpaletted rgb/rgba mode! it will trigger becayse toggle-toggle off-on!
        if (receivecolour) { // using FF triggers in grey!
          thispixel[1] = imagecode[++codeix]; // rgb  FFFFFF
          thispixel[2] = imagecode[++codeix]; // rgba FFnnmm
          if (!thispixel[1] && !thispixel[2]) { console.log('paletted red is invalid!'); break; }
        } else {
          thispixel[1] = imagecode[1]; // should be a 0
          thispixel[2] = imagecode[2]; // should be a 0
        }
        var greenmatch = (thispixel[1] == imagecode[1]);
        var bluematch  = (thispixel[2] == imagecode[2]);
        if (greenmatch && bluematch) {
          thispixel[3] = imagecode[++codeix]; // read trigger byte (FFnn in grey, FFxxyynn in rgb/rgba)
          var endofimage = (thispixel[3] == 0x00);
          var atoggle    = (thispixel[3] == 0xFF);
          var singlebyterepeat = (thispixel[3] <= 0xFD);
          var multibyterepeat  = (thispixel[3] == 0xFE);
          if (endofimage) {
            while (outputix < imagergbalen) { // green the remaining pixels
              imageout[outputix++] = 0x37; imageout[outputix++] = 0x7A; // green it
              imageout[outputix++] = 0x2C; imageout[outputix++] = 255;  // up .. full opacity
            }; break; // any pighead integration after background is drawn
          } else if (atoggle) { // thatwasatoggletoggle excluded in redbyte condition
            if (repeatcount > 0) { console.log('repeatcount uncleared!!');               break; }
            if (thatwasatoggle == 1) { console.log('toggle-toggle on-off invalid!');     break; }
            if (thatwasatoggletoggle == 1) { console.log('toggle-on while on already!'); break; }
            thisisatoggle = 1;  // remember this toggle to prevent memory reset
            thatwasatoggle = 1; // remember this toggle- status pending -toggle
            palettemode = !palettemode; // toggle from on to off (the toggle- in toggle-toggle)
          } else if (singlebyterepeat) { // 1-253
            repeatcount = thispixel[3];
//repeatsin.push('[' + (0 - repeatcount) + ']');
          } else if (multibyterepeat) {  //  254+
            repeatcount = 254; // base for multi-byte adds 254 (not 253 ! as with paletteaddress!)
            var repeatshift = 0;
            var nextbyte = imagecode[++codeix]; // for 254, nextbyte will be a 0!
            while (nextbyte >= 128) { // indicates another byte
              repeatcount += ((nextbyte - 128) << repeatshift);
              nextbyte = imagecode[++codeix];
              repeatshift += 7;
              if (repeatcount < 0) { console.log('integer overflow!'); break; }
            } // read any number of repeats
            repeatcount += (nextbyte << repeatshift); // add the "last" (0-7F) byte
//repeatsin.push('[' + repeatcount + ']');
          } else { console.log('trigger byte out of range!'); break; } // range is 00-FF
          if (repeatcount > 0 && outputix < 4) { // need to write a pixel before repeating a pixel
            console.log('repeating null pixel!'); // if paletteindex starts at 0 this will be yellow
          } else if (!thisisatoggle) { // thispixel[3] is 0xFF if thisisatoggle
            if (repeatcount <= 0) { console.log('no repeats'); break; }
            else { // duplicate the last written pixel n times
              while (repeatcount >= 0) { // why 1 extra !?! confusing ....
                imageout[outputix + 0] = imageout[outputix - 4];
                imageout[outputix + 1] = imageout[outputix - 3];
                imageout[outputix + 2] = imageout[outputix - 2];
                imageout[outputix + 3] = imageout[outputix - 1];
                outputix += 4;
                repeatcount--;
              } // repeatcount will be -1! confusing ....
            }
          }
        // } else if (greenbyte) { special rgb/rgba actions
        // } else if (bluebyte ) { special rgb/rgba actions
        } else { console.log('FF redbyte in palettemode not a trigger!'); break; }
      } else if (thatwasatoggletoggle) { // toggle-toggle detected, red byte non-matching (may be in rgb/rgba)
        var addcolours = 1; // grey cannot add any FFxxyy, rgb cannot add FFFFFF, as first colour
        var greenblue = 0;  //  but rgb can add FFFFFFnn using 0,0,0 prefix! rgba cannot add trigger.
        while (thispixel[0] == 0xFF) { // redbyte FF implies more toggles!
          if (receivecolour) {
            thispixel[1] = imagecode[++codeix]; // read greenbyte
            thispixel[2] = imagecode[++codeix]; // read bluebyte
            if (thispixel[1] != imagecode[1]) { greenblue = 1; break; } // not a trigger!
            if (thispixel[2] != imagecode[2]) { greenblue = 1; break; } // not a trigger!
          } // else still rgb colours in grey mode but greenblue is 0
          thispixel[3] = imagecode[++codeix];   // read triggerbyte
          if (thispixel[3] == 0xFF) { // toggle after toggle-toggle
            addcolours *= 2; // double the colour counter
            thispixel[0] = imagecode[++codeix]; // read another redbyte
            continue; // check again
          } else if (!thispixel[0]) { // end-of-image after toggles
            console.log('post-processing script decoder goes here!');
            break;
          } else { // toggle-toggle has trigger prefix before add!
            // thispixel[3] is between 1 and 254
            console.log('colour spans and gradients go here');
            break;
          }   //  toggletoggletoggle = 2 colours
        }     //  toggletoggletoggletoggle = 4 colours
              //  toggletoggletoggletoggletoggle = 8 colours
        paletteindex = palette.numitems; // point to end of palette + 1
        var readpalettealpha = false;
        var newcolourred = thispixel[0]; // red was already read! (maybe greenblue too)
        if (receivealpha) { // default to rgba for rgba mode (cannot add trigger colour!)
          readpalettealpha = true;
          if (!greenblue) {
            thispixel[1] = imagecode[++codeix]; // 0x00-0xFF
            thispixel[2] = imagecode[++codeix]; // 0x00-0xFF
          }
          thispixel[3] = imagecode[++codeix]; // 0x00-0xFF
//        } else if (newcolourred == 0xFF) { // that's a trigger in grey mode ..
//          console.log('unexpected trigger in thatwasatoggletoggle'); // or a red colour!
        } else if (newcolourred == 0) {
          if (greenblue) { newcolourred = thispixel[1]; }
          else { newcolourred = imagecode[++codeix]; } // thispixel[1]
          if (newcolourred == 0) {
            if (greenblue) { newcolourred = thispixel[2]; }
            else { newcolourred = imagecode[++codeix]; } // thispixel[2]
            if (newcolourred == 0) {
              console.log('colour with alpha in grey/rgb mode');
              readpalettealpha = true;
            } else if (!receivecolour) { // flag blue colours in grey mode
              // grey toggletoggle blueindex should be used for strings!
              var blueindex = newcolourred; // not reached because grey catchall
              console.log('adding 0000nn in grey mode, blueindex is ' + blueindex);
            } else { // 0000nn in rgb mode
              // thispixel[0] is still 00
              thispixel[1] = 0;            // from match condition
              thispixel[2] = newcolourred; // from followup
            } // end of 00 00 nn handler (00 = read rgba, else blue in rgb)
          } else { // 00nnmm in rgb in grey/rgb (thispixel[0] is still 0)
            thispixel[1] = newcolourred;
            thispixel[2] = imagecode[++codeix];
          } // end of handling for 0000 prefix
        } else { // default to rgb for rgb and grey mode
          // if (!receivecolour) to not default to rgb in grey mode
          // thispixel[0] is nonzero, and it could be FF!
          // if thatwasatoggle is true, palettemode should be off now
          if (!greenblue) { // else already read
            thispixel[1] = imagecode[++codeix];
            thispixel[2] = imagecode[++codeix];
          }
        } // end of handling for 0 redbyte -- one 0,0,0 prefix to set rgba mode!
        while (--addcolours >= 0) {
          var newpalix = paletteindex * 4;
          if (readpalettealpha && !receivealpha) { // 0,0,0,rgba for rgb/grey palette
            palette.items[newpalix + 0] = imagecode[++codeix];
            palette.items[newpalix + 1] = imagecode[++codeix];
            palette.items[newpalix + 2] = imagecode[++codeix];
            palette.items[newpalix + 3] = imagecode[++codeix];
          } else if (receivealpha) { // rgba in rgba (readpalettealpha is also true)
            palette.items[newpalix + 0] = thispixel[0];
            palette.items[newpalix + 1] = thispixel[1];
            palette.items[newpalix + 2] = thispixel[2];
            palette.items[newpalix + 3] = thispixel[3];
          } else { // default to rgb 3-byte for grey and rgb palettes !
            palette.items[newpalix + 0] = thispixel[0];
            palette.items[newpalix + 1] = thispixel[1];
            palette.items[newpalix + 2] = thispixel[2];
            palette.items[newpalix + 3] = defaultalpha;
          }
          palette.numitems++; // end of add-colour-to-palette-after-toggletoggle handling
        } // one colour or many colours has/have been added!
        if (thisisatoggle ) { console.log('thisisatoggle after palette add!');  break; }
        if (thatwasatoggle) { console.log('thatwasatoggle after palette add!'); break; }
        thatwasatoggletoggle = 0; // reset addcolour flag to prevent loopyness!
      } else { // in palette mode, not a trigger/repeat, not a colour(s)-to-add, thus a paletteindex
        paletteindex = thispixel[0]; // red byte is first index byte (1-byte paletteindex)
        if (paletteindex == 255) { console.log('single-index 255 not expected!'); break; }
        var paletteaddress = 0;      // local, no address unless it starts with 00 0000 and isn't 00 0000 FF
        if (paletteindex == 0) {     // a 0 paletteindex implies this is a 2-byte index
          var paletteindexupper = imagecode[++codeix]; // ab in 00 ab(cd)
          var paletteindexlower = imagecode[++codeix]; // cd in 00 ab cd
          paletteindex = (paletteindexupper << 8) + paletteindexlower; // 0-65535
//repeatsin.push(0 - paletteindex);
          if (paletteindex ==            0) {   // if paletteindex is still 0, this is 255 or an address
            var paletteaddress = imagecode[++codeix]; // ef in  00 00 00 ef
            if (paletteaddress == 255) { // the special 1-byte 255 (FF) as 4-byte 00 0000 FF
              paletteindex = paletteaddress; // paletteindex t0 255 -- 4-byte 00 0000 0-253 are low addresses
              paletteaddress = 0;            // thus there is no address 255 here (use multibyte)
              console.log('4-byte 255 received!');
              break; // do something special
            } else { // this is a paletteaddress (including NULL as 00 0000 00 and 255 as 00 0000 FE02)
              if (paletteaddress == 254) {   // resolve multibyte addresses (can be any length)
                paletteaddress = 253; // 00 00 nm nm nm nm nm nm nm nm + 253 (0-253 are LOW addresses)
                var upperaddress = 0;                            // 253   = 253; // 253 low   address ( 00FD   )
                var nextbyte = imagecode[++codeix];              // 254,0 = 253; // 253  high address ( 00FE00 )
                var shiftby = 0;                                 // 254,1 = 254; // 254  high address ( 00FE01 )
                while (nextbyte >= 128) {                        // 254,2 = 255; // 255  high address ( 00FE02 )
                  upperaddress += ((nextbyte % 128) << shiftby); // 255   = 255; // 255 low   address ( 0000FF )
                  nextbyte = imagecode[++codeix];                // 254,3 = 256; // 256  high address ( 00FE03 )
                  shiftby += 7;                                  // 254,4 = 257; // 257  high address ( 00FE04 )
                }
                paletteaddress += upperaddress; // 253+0 = 253, 253+1 = 254, 253+2 = 255, etc
              } // else paletteaddress is singlebyte (0-253) .. LOW RANGE: 0 to 253, HIGH RANGE: 253+
            } // end of paletteaddress 255 handling (address 00 00 FF)
          } // end of low two-byte paletteindex handling (00 [00 nn])
        } else { // single-byte paletteindex was read .... not 0 (read 2-byte), not FF (trigger redbyte)...
          if (paletteindex <=    0) { console.log('LQ00 paletteindex not expected!');     break; }
          if (paletteindex >= 0xFF) { console.log('GQFF paletteindex not expected!');     break; }
          if (paletteindex == palette.numitems) { console.log('unhandled paletteindex!'); break; }
//repeatsin.push(paletteindex);
//console.log('paletteindex ' + paletteindex + ' added at index ' + outputix);
        }
        if (paletteindex == 0 && paletteaddress == 0) { console.log('paletteindex 0 is unaddressable!'); break; }
        if (paletteindex == 0) { // paletteaddress is nonzero (or set to null)
          console.log('unhandled paletteaddress is ' + paletteaddress);
          break; // todo: address handler
        } else { // paletteindex is nonzero ! no negative expected here
          var thpix = paletteindex *  4; // expect max paletteindex to be FFFF
          imageout[outputix++] = palette.items[thpix + 0];
          imageout[outputix++] = palette.items[thpix + 1];
          imageout[outputix++] = palette.items[thpix + 2];
          imageout[outputix++] = palette.items[thpix + 3];
        } // paletteaddress is used when 2-byte paletteindex is 0 because 1-byte paletteindex was 0
          // a paletteindex can be 1-byte 1-254, 2-byte 255, 2-byte 256-65535, 000000 2-byte address ....
          //    00 then low 2-byte 0000-00FE is used for paletteaddress, paletteindex is 0
          //    00 then low 2-byte 00FF is 255, paletteaddress is 0 (palette index code is 0000FF)
          //    00 then 00 00 then paletteaddress (00000000 is NULL, 000000FD is 1-253, 000000FE is multibyte)
          //    000000FF is low address 255. 000000FE02 is high address 255
          //    there is no low address 254. 253 low, high is 000000FD, 000000FE00
        // end of paletteaddress handling ...........................................
      } // end of paletteindex handling; end of palettemode handling
    // --------------------------------------------------------------------------------------
    // -- UNPALETTED COLOUR HANDLING (grey only) --------------------------------------------
    } else if (!receivecolour) { // catch-all for unpaletted-mode grey
//      var greyunpalettedtrigger = false; // check for FF0000 byte-by-byte
//      if (thispixel[0] == imagecode[0]) { // red FF while palettemode is off means toggle
//        thispixel[1] = imagecode[++codeix];
//        if (thispixel[1] == imagecode[1]) { // expect 0 match
//          thispixel[2] = imagecode[++codeix];
//          if (thispixel[2] == imagecode[2]) { // expect 0 match
//            greyunpalettedtrigger = true;
//          } else { console.log('unmeaningful FFnnnn in grey mode'); }
//        } else { console.log('unmeaningful FFnn in grey mode'); }
//      }
      var greyunpalettedtrigger = (thispixel[0] == imagecode[0]);
      if (greyunpalettedtrigger) { // FF match
        thispixel[3] = imagecode[++codeix]; // read trigger byte
        var endofimage = (thispixel[3] == 0x00);
        var atoggle    = (thispixel[3] == 0xFF);
        if (endofimage) { // with palette mode off
          while (outputix < imagergbalen) { // fc3 the remaining pixels
            imageout[outputix++] = 0x77; imageout[outputix++] = 0x77; // grey..
            imageout[outputix++] = 0x77; imageout[outputix++] = 0x77; // ..it out
          }; break; // any pighead integration after background is drawn
        } else if (atoggle) { // toggle palette mode to be on
          if (thatwasatoggle == 1) {
            thatwasatoggletoggle = 1; // add colour starts here!
          } // toggle-toggle at SOI not possible (thatwasatoggle starts 0)
          thatwasatoggle = 0; // don't remember -off toggles
          thisisatoggle = 1; // prevent memory reset
          palettemode = !palettemode; // toggle, toggle-toggle and toggle-toggle-toggle considered
        } else { // FF 1-254 when palettemode is off is mode switch
          var modeindex = thispixel[3]; // toggle which mode (1-254)
          var modeisnow = (modeenabled[modeindex] = !modeenabled[modeindex]) ? 'on' : 'off';
          console.log('grey mode ' + thispixel[3] + ' toggled to ' + modeisnow);
        } // end of unpaletted-grey-mode-toggle handling
      } else { // end of red byte FF handling ... unpaletted colour 0-254 ....
        // FF FF    - toggle
        // FF 00    - end of image
        // FF 01-FE - mode switches
        // 00-FE    - ...header text ? literally have NUL and \n and box drawing indexes
        // read header text until FF
      }
    // --------------------------------------------------------------------------------------
    // -- UNPALETTED COLOUR HANDLING (rgb/rgba only) ----------------------------------------
    } else { // palette mode is off -- a non-indexed colour is here (not expected in grey mode!)
      // grey mode has 1-byte unpaletted colours !!!!!!!!!!!!! (it was handled above)
      //  but it defaults to rgb when colours are added to the palette.
      //  and in palette mode, indexes and repeats are the same
      // but if palettemode is off, still need to check for toggle trigger .... and EOI
      // there are however no repeats. repeats if palettemode is off ??????
      // FFFFFF[01] if palettemode is off means toggle mode 1
      // FFFFFF[02] if palettemode is off means toggle mode 2
      // in grey mode, all colours are paletted
      // colours with alpha are preceded by 00 00 00 in rgb mode !
      // that means colour 1, black at default alpha, cannot be written as unpaletted!
      // also, colour 2, white at default alpha, cannot be written as unpaletted!
      //   these have now been remapped to 0xFF00 (palette.black) and 0xFFFF (palette.white)
      //   (in grey, FF0000, red, cannot be written as unpaletted. warning!!)
      // also makes sense for FFFFFF to fail unpaletted! it is colour 2 ! and a trigger!
//      if (receivecolour) { // no need because grey catchall
      thispixel[1] = imagecode[++codeix];
      thispixel[2] = imagecode[++codeix];
      var imagecodered   = (thispixel[0] == imagecode[0]);
      var imagecodegreen = (thispixel[1] == imagecode[1]);
      var imagecodeblue  = (thispixel[2] == imagecode[2]);
      var receivethisalpha = false;
      if (imagecodered && imagecodegreen && imagecodeblue) { // detect trigger
        thispixel[3] = imagecode[++codeix];
        var endofimage = (thispixel[3] == 0x00);
        var atoggle    = (thispixel[3] == 0xFF);
        if (endofimage) { // end of rgb/rgba image with palettemode off
          while (outputix < imagergbalen) { // sky blue the remaining pixels
            imageout[outputix++] = 0x11; imageout[outputix++] = 0xE0; // sky blue it
            imageout[outputix++] = 0xFF; imageout[outputix++] = 255;  // up .. full opacity
          }; break; // any pighead integration after background is drawn
        } else if (atoggle) { // palettemode off to on
          if (thatwasatoggle == 1) { // a toggle-toggle off-on
            thatwasatoggletoggle = 1; // add colour starts here!
          } // toggle-toggle at SOI not possible (thatwasatoggle starts 0)
          thatwasatoggle = 0; // don't remember -off toggles
          thisisatoggle = 1; // prevent memory reset
          palettemode = !palettemode; // toggle, toggle-toggle and toggle-toggle-toggle considered
        } else { // this is a mode toggle (1-254) -- can only toggle mode if palettemode is off !
          var modeindex = thispixel[3]; // toggle which mode (1-254)
          var modeisnow = (modeenabled[modeindex] = !modeenabled[modeindex]) ? 'on' : 'off';
          console.log('mode ' + thispixel[3] + ' toggled to ' + modeisnow);
        } // end of unpaletted-mode-toggle handling
      } else if (thispixel[0] + thispixel[1] + thispixel[2] == 0) { // detect rgba in rgb
        //console.log('rgba in rgb detected!');
        //break; // not expected!
        // if (receivealpha), this is black with alpha, which flags receivethisalpha
        // if grey/rgb, this is 00 00 00, meaning read a 4-byte colour with alpha channel
        // this also happens with addcolour to palette ...
        //    00 00 00 with full opacity is mapped to paletteindex FF00
        receivethisalpha = true;
        if (!receivealpha) { // if rgb, this is a prefix to read an rgba colour unpaletted
          thispixel[0] = imagecode[++codeix];
          thispixel[1] = imagecode[++codeix];
          thispixel[2] = imagecode[++codeix];
          thispixel[3] = imagecode[++codeix];
        } else { // black with alpha in rgba
          thispixel[3] = imagecode[++codeix];
        } // end of rgba in rgb and rgba in rgba
          // grey mode was handled above in the catch-all because 1-byte unpaletted colours
      } else if (receivealpha) { // non-000000 with alpha in rgba
        receivethisalpha = true;
        thispixel[3] = imagecode[++codeix];
      }
      if (!receivethisalpha) { // rgb (excluding rgba in rgb)
        thispixel[3] = defaultalpha;
      } else if (thatwasatoggletoggle == 1) {
        // no need to add the trigger as a white 100% opacity pixel
        console.log('thatwasatoggletoggle');
        break; // expect ! or not ..
      } else {
        imageout[outputix++] = thispixel[0];
        imageout[outputix++] = thispixel[1];
        imageout[outputix++] = thispixel[2];
        imageout[outputix++] = thispixel[3];
        unpalettedpixels++; // this addition to imageout is an unpaletted-colour
      }
    } // end of palette-mode-is-off (unpaletted-colour) handling
  } // end of read-code iterator/loop handling
  var imagedataout = new ImageData(imageout, imagewidth, imageheight);
//  console.log('output image size: ' + imagewidth + 'x' + imageheight);
//  console.log('palettenumitems:  ' + palette.numitems);
//  console.log(paletteitems);
/*
if (repeats && repeatsin) {
  var pdiff = [];
  for (i = 0; i < repeats.length; i++) {
    if (repeatsin[i] != repeats[i]) {
      console.log('difference at index ' + i + ': ' + repeats[i] + ' vs ' + repeatsin[i]);
      break;
  //  } else {
  //    console.log('same at index ' + i + ': ' + repeats[i]);
    }
  }
  console.log(repeats);
  console.log(repeatsin);
  console.log(pdiff);
} else { console.log('repeats debug is off'); }
*/
//  console.log('unpalettedpixels: ' + unpalettedpixels);
//  console.log('-------------------------- END OF DECODE');
  return imagedataout; // imageout;
}


