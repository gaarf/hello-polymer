// this file is wrapped in an IIFE by the build process
console.info(PKG.name+'@'+PKG.v);

var wcr = 'WebComponentsReady';
console.time(wcr);

window.addEventListener(wcr, function(e) {
  console.timeEnd(wcr);
  console.log('Polymer@'+Polymer.version);

  document.querySelector('x-app').set('buildInfo', {
    pkg: PKG
  });

});
