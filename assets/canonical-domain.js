(function(){
  var canonicalHost = 'www.reclamemj.nl';
  var host = window.location.hostname;
  if (host !== canonicalHost && /(^|\.)netlify\.app$/i.test(host)) {
    window.location.replace('https://' + canonicalHost + window.location.pathname + window.location.search + window.location.hash);
  }
})();
