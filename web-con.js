var colourreductionbits = 4;

function id(id) { return document.getElementById(id); }

function rebuffer8(buffer, length) {
  var renew = buffer;
  if (!renew) {
    renew = new Uint8ClampedArray(length);
  } else if (renew.length != length) {
    delete buffer;
    renew = new Uint8ClampedArray(length);
  } // first instance = new, new size = reset
  return renew;
} // used by rle and cam

function rebuffer16(buffer, length) {
  var renew = buffer;
  if (!renew) {
    renew = new Uint16Array(length); // no clamp
  } else if (renew.length != length) {
    delete buffer;
    renew = new Uint16Array(length); // no clamp
  } // first instance = new, new size = reset
  return renew;
} // used by rle and cam

function consoleitem(name) {
  var console = id('console');
  if (!console) { console.log('noconsole'); return null; }
  var itemel = console.firstElementChild;
  while (itemel) {
    var breakix = itemel.innerHTML.indexOf('<br');
    if (breakix < 0) { console.log('unnamedconsoleitem'); }
    var itemname = itemel.innerHTML.substr(0, breakix);
    if (name == itemname) { return itemel; }
    else { itemel = itemel.nextElementSibling; }
  }
  return null; // item not found
}

function consoleitemvalue(name, value) {
  var item = consoleitem(name);
  if (!item) { console.log('itemnotfound'); return; }
  var spanel = item.lastElementChild;
  if (spanel.tagName != 'SPAN') { console.log('nospanel'); return; }
  spanel.innerHTML = value;
}

function colourreduction(event, handler) {
  var preset = undefined;
  var clicked = null;
  if (!event) { // from initconsole
    preset = "" + colourreductionbits;
    handler = consoleitem('Colour Reduction');
    if (!handler) { console.log('handlernotfound'); return; }
    spanel = handler.lastElementChild;
  } else if (!handler) {
    console.log('handler required');
    return;
  } else { // from click
    clicked = event.target;
    spanel = clicked.parentElement;
  }
  if (spanel.tagName != 'SPAN') { console.log('nospanel');   return; }
  var handel = spanel.parentElement;
  if (handel.tagName != 'DIV') { console.log('nohandeldiv'); return; }
  if (handel != handler) { console.log('unhandled click'); return; }
  var desel = spanel.firstElementChild;
  while (desel) {
    if (!clicked) { // only until element is found
      if (preset == desel.innerHTML) { clicked = desel; }
//      else { desel.className = ''; } not necessary
    } else if (desel != clicked) { desel.className = ''; }
    desel = desel.nextElementSibling;
  }
  if (!clicked) { console.log('preset element not found'); }
  clicked.className = 'clicked';
  var value = parseInt(clicked.innerHTML);
  colourreductionbits = value;
}

function initconsole() {
  colourreduction(null, null);
}

function refreshconsole() {
  initconsole(); // for now no difference
}
