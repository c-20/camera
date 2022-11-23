/*
function drawimagetocanvas(canvas, image) {
  canvas.width  = getComputedStyle(canvas).width.split('px')[0];
  canvas.height = getComputedStyle(canvas).height.split('px')[0];
  let ratio = Math.min(canvas.width / image.width, canvas.height / image.height);
  let x = (canvas.width  - image.width  * ratio) / 2;
  let y = (canvas.height - image.height * ratio) / 2;
  canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
  canvas.getContext('2d').drawImage(image, 0, 0, image.width, image.height,
                                    x, y, image.width * ratio, image.height * ratio);
}
*/

var mediastream = null;
var nocameraimg = null;
var camera  = null;
var camvas  = null;
var comvas  = null;
var cimage  = null;
var cstatus = null;
var cwidth = 0;
var cheight = 0;

// var framecapture = null;

/*
function clearcamvas() {
  if (!camera || !camvas || !cimage) { return; }
  cwidth = camera.clientWidth;
  cheight = camera.clientHeight;
  if (isNaN(cheight)) { cheight = cwidth / (4/3); }
  camvas.setAttribute('width',  cwidth );
  camvas.setAttribute('height', cheight);
  cimage.setAttribute('width',  cwidth );
  cimage.setAttribute('height', cheight);
  var context = camvas.getContext('2d');
  context.fillStyle = '#bbb';
  context.fillRect(0, 0, cwidth, cheight);
  var imgdata = camvas.toDataURL('image/png');
  cimage.setAttribute('src', imgdata);
}
*/

// cannot detect this error in older Javascript!
// XP client needs to load a separate 

var asyncfail = false;
var mediafail = false;
var cameraon = false;
var framefpsmax = 20; // 20fps limiter !!
var framefpsmaxms = 1000 / framefpsmax;

var averagefps = framefpsmax;
var fpsrange = 5; // sample 5 frames

var prevtime = Date.now();

function framebuttonclick() {
  var errortarget = (cimage) ? cstatus : document.body;
  if (!cameraon) {
    if (!nocameraimg) {
      nocameraimg = new Image();
//      nocameraimg.addEventListener('load',  nocameraload);
//      nocameraimg.addEventListener('error', nocamerafail);
      nocameraimg.src = nocamera.webp;
//      return; // no need to return if it's synchronous ! seems to be!
    }
    if (!cstatus) { cstatus = document.getElementById('cstatus'); }
    if (!camvas ) { camvas  = document.getElementById('camvas');  }
    if (!comvas ) { comvas  = document.getElementById('comvas');  }
    if (!cimage ) { cimage  = document.getElementById('cimage');  }
    cwidth  = camvas.width;
    cheight = camvas.height;
    var camvas2d = camvas.getContext('2d');
    try {
      camvas2d.drawImage(nocameraimg, 0, 0, cwidth, cheight);
    } catch (e) {
      console.log('nocamera image not available!');

    }
  } else { // assume all objects are instantiated
//    if (!camera.crossOrigin) {
//      camera.crossOrigin = 'anonymous';
//      errortarget += '<br />CROSS-ORIGIN ANONYMOUS';
//    }
//  if (!camvas ) { camvas  = document.getElementById('camvas');  }
//  if (!comvas ) { comvas  = document.getElementById('comvas');  }
//  if (!cimage ) { cimage  = document.getElementById('cimage');  }
//  if (!cstatus) { cstatus = document.getElementById('cstatus'); }
    if (!cwidth || !cheight) {
      // this is not expected because camera should wait .. cameraon enabled after
      var camwidth = camera.videoWidth;
      var camheight = camera.videoHeight;
      if (!camwidth || !camheight) {
        errortarget.innerHTML += '<br />no mediasize yet!';
        return;
      } else {
console.log('camsize: ' + camwidth + 'x' + camheight);
        cwidth  = camwidth;
        cheight = camheight;
      } // continue to grab a frame
    } // if here, cameraon presumes camvas is instantiated
    var camvas2d = camvas.getContext('2d');
//    camvas2d.filter = 'contrast(200%) saturate(50%)'; // re-applying each frame
    if (mediastream) {
      var boxw = camvas.width;
      var boxh = camvas.height;
      camvas2d.clearRect(0, 0, boxw, boxh);
      var topy  = boxh / 2 - cheight / 2;
      var leftx = boxw / 2 - cwidth  / 2;
      camvas2d.drawImage(camera, leftx, topy, cwidth, cheight);
    } else {
      errortarget.innerHTML += '<br />cameraon with no mediastream!';
      // return; // continue to generate output image!
    }
  }
  if (1) { // encode/decode for camera or nocamera!
    var inwidth  = camvas.width;  // not cwidth  (include margins)
    var inheight = camvas.height; // not cheight (  "       "    )
    var imagedata = camvas2d.getImageData(0, 0, inwidth, inheight);
    var imagecode = compressbitmap(imagedata);

//console.log('imagecode for image ' + cwidth + 'x' + cheight);
//console.log(codehex(imagecode));

//    var imagedatalength = cwidth * cheight * 4;
    var imagedatalength = inwidth * inheight * 4;

//console.log("SECURITY RISK INCOMING");
    var imagecodelength = imagecode.length;

//console.log('imagecodelength: ' + imagecodelength);

    var datasizepercent = Math.floor(imagecodelength / imagedatalength * 1000) / 10;
    consoleitemvalue("Compressed Size", "" + datasizepercent + "%");

    var thistime = Date.now();
    var thisframefps = 1000 / (thistime - prevtime);
    averagefps += (thisframefps - averagefps) / fpsrange;
    prevtime = thistime;
    var framespersecond = Math.floor(averagefps * 10) / 10;
    consoleitemvalue("Frames/Second", "" + framespersecond + "");

//    var msg = 'result is ' + datasizepercent + '% of the input size';
//    console.log(msg);
//    cstatus.innerHTML += '<br />' + msg;

    var outwidth  = comvas.width;
    var outheight = comvas.height;
    var videowidth  = inwidth  - 30; // outwidth / 2;
    var videoheight = inheight - 30; // outheight / 2;
    var videotopmargin  = 15; // videoheight / 2;
    var videoleftmargin = 15; // videowidth / 2;;
    var datacode = codetoimage(imagecode, outwidth, outheight);
//    var datacodeimage = new ImageData(datacode, comvaswidth, comvasheight);

    var datacodeimage = new ImageData(datacode, outwidth, outheight);
    var comvas2d = comvas.getContext('2d');
    comvas2d.putImageData(datacodeimage, 0, 0); // dirtyX,Y before W/H!!, cwidth, cheight);

//    comtext.drawImage(datacodeimage, 0, 0, comvaswidth, cwidth, cheight);
//    if (drawtoimage) {
//      var pngimgdata = comvas.toDataURL('image/png');
//      cimage.setAttribute('src', pngimgdata);
//    }
var rebuild = decompresscode(imagecode);


////console.log(rebuild);
////var rebuilt = new ImageData(rebuild, cwidth, cheight);
//comtext.drawImage(rebuild, 10, 10, cwidth, cheight);
comvas2d.putImageData(rebuild, videoleftmargin, videotopmargin, 0, 0, videowidth, videoheight);


//return; // stop frame loop

  }
  if (cameraon) { // loop timeout
    setTimeout(function() { framebuttonclick(); }, framefpsmaxms);
  }
}

function camerafailed() {
  cameraon = false; // make sure
  var errormsg = 'unknown error!';
  if      (asyncfail) { errormsg = 'async error!'; }
  else if (mediafail) { errormsg = 'media error!'; }
  console.log('camera error flagged (0bb)!');
  // note cameras are only available over https
  if (!cstatus) { cstatus = document.getElementById('cstatus'); }
  document.body.style.backgroundColor = '#0bb';
  var thecamera = document.getElementById('camera');
  cstatus.innerHTML = errormsg;
}

//try {
//  eval("async function testasyncsupport() {}");
//  console.log("async supported!");
//  testasyncsupport();
  // XP firefox supports async, XP chrome does not
// start of normal function
//eval(`

function sleepwait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function camerabuttonclick() {
//  nocameraimg = document.getElementById('nocamera');
// ^^ only defined if used by frame button
  camera = document.getElementById('camera');
  camvas = document.getElementById('camvas');
  comvas = document.getElementById('comvas');
  cimage = document.getElementById('cimage');
  cstatus = document.getElementById('cstatus');
  var media = window.navigator.mediaDevices;
  if (!media) {
    cstatus.innerHTML = 'window.navigator.mediaDevices fail!';
    mediafail = true;
    camerafailed(); // media = navigator.mediaDevices;
  } else {
    cwidth = cheight = 0; // reset any nocamera sizing
//  try {
//console.log('AWAIT IS NOT YET ON');

   try {
    const stream = await media.getUserMedia({ video: true }); // , audio: true });
// TODO: enumerate devices
//console.log('AWAIT IS ON');

    cstatus.innerHTML = 'waiting for stream...';
    while (!stream) {
      await sleepwait(500);
      cstatus.innerHTML += '.';
    }
    const tracks = stream.getVideoTracks();
    cstatus.innerHTML = 'streaming ' + tracks.length + ' video tracks...';
    // TODO: add [track 1 2] switch when more than one
    //  framcapture = new ImageCapture(tracks[0]);
    //  console.log('ready to capture frames from track 1...');
    camera.srcObject = stream;
//    document.getElementById('nocamera').style.display = 'none';
    document.getElementById('camera').style.display = 'block';
    camera.play();
    cstatus.innerHTML += '<br />waiting for size...';
    while (!cwidth || !cheight) {
      cwidth  = camera.videoWidth;
      cheight = camera.videoHeight;
      await sleepwait(500);
      cstatus.innerHTML += '.';
    }
    cstatus.innerHTML += '<br />stream size: ' + cwidth + 'x' + cheight;
    mediastream = stream;
//    clearcamvas(); // clear before play? i dunno ...
    if (camera.crossOrigin) {
      cstatus.innerHTML += '<br />CROSS-ORIGIN IS NOT NULL';
    }
    camera.crossOrigin = 'Anonymous';
    cameraon = true;
    cstatus.innerHTML += '<br />camera is on';
    framebuttonclick(); // assume we can grab frames now
   } catch (e) {
    if (e.name == 'NotFoundError') {
      cstatus.innerHTML = 'No camera available';
    } else {
      console.log('MEDIASTREAM ERROR');
      console.log(e);
    }
   }
  }
}

//  } catch (e) {
//    console.log('await media.getUserMedia() failed!');
//    mediafail = true;
//    camerafailed();
//  }
//}
// `); // ES6 required for backticks!
// end of normal function

/*
} catch (e) {
// start of fallback function
  function camerabuttonclick() {
    console.log('fallback function! no async!');
    if (!asyncfail) {
      // no document object yet
      asyncfail = true;
      console.log('async error detected!');
    } else {
      camerafailed();
    }
  }
  camerabuttonclick(); // sets asyncfail to true
// end of fallback function
}
*/


//  mediastream = navigator.mediaDevices.getUserMedia({video: true});
//               .then(mediaStream => {
//  document.getElementById('camera').srcObject = mediastream;
//  const track = mediaSsream.getVideoTracks()[0];
//  imageCapture = new ImageCapture(track);
//  })
//  .catch(error => console.log(error));
//}


function codehex(buffer) {
  return [...new Uint8Array(buffer)]
    .map(x => x.toString(16).padStart(2, '0')).join('');
}

var codetoimagebuffer = null;

function codetoimage(buffer, width, height) {
  var imagelen = width * height;
  var imagebytelen = imagelen * 4;
//  var bytewidth = width * 4;
  var image = rebuffer8(codetoimagebuffer, imagebytelen);
  codetoimagebuffer = image;
  var lineheight = Math.floor(imagelen / buffer.length);
  if (lineheight < 1) {
    console.log('0 lineheight implies more buffer than image');
    lineheight = 1;
  }
  var pxix = -1;
  var x = 0, y = 0;
  while (++pxix < imagelen) {
    var outix = pxix * 4;
    var pxline = Math.floor(pxix / width);
    var pxxix = pxix % width;
    if (lineheight < 2 || pxline % lineheight == 0) {
      var bufix = ((pxline / lineheight) * width) + pxxix;
      if (bufix < buffer.length) {
        image[outix + 0] = buffer[bufix];
        image[outix + 1] = 0;
        image[outix + 2] = 255 - buffer[bufix];
        image[outix + 3] = 255;
      } else { // yellow trailing pixel
        image[outix + 0] = 255;
        image[outix + 1] = 255;
        image[outix + 2] =   0;
        image[outix + 3] = 255;
      }
    } else { // padding line
      image[outix + 0] = 127;
      image[outix + 1] = 127;
      image[outix + 2] = 127;
      image[outix + 3] = 255;
    }
  }
//console.log('imagelen: ' + image.length);
  return image;
}

function sendobuttonclick() {
  var switchbox = document.parentElement;
  var switchdash = switchbox.parentElement;
  console.log('check here');
  if (!switchbox || !switchdash) { console.log('switchdash error'); }
  else if (!camvas) { console.log('camvas error'); }
  else if (!comvas) { console.log('comvas error'); }
  else {
    console.log('TODO: sendo !');
//    var imgdata = comvas.toDataURL('image/png');
//    switchdash.sendpacket(imgdata);
  }
}


