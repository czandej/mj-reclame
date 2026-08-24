(function(){
  var canonicalHost = 'www.reclamemj.nl';
  var host = window.location.hostname;
  if (host !== canonicalHost && /(^|\.)netlify\.app$/i.test(host)) {
    window.location.replace('https://' + canonicalHost + window.location.pathname + window.location.search + window.location.hash);
    return;
  }

  if ('serviceWorker' in navigator && window.isSecureContext) {
    window.addEventListener('load', function(){
      navigator.serviceWorker.register('/service-worker.js', {
        scope: '/',
        updateViaCache: 'none'
      }).then(function(registration){
        registration.update().catch(function(){});
      }).catch(function(error){
        console.warn('MJ Reclame PWA: service worker registration failed.', error);
      });
    }, {once:true});
  }
})();
