/* Dimau Share button: this small loader pulls the one shared copy, so a fix there reaches every app at once.
   Shared copy: https://volau.dimau-fintech.com/kit/dimau-share.js (repo fijian-assistant-api, public/kit/). */
(function () {
  if (window.__dimauShareLoader) return; window.__dimauShareLoader = 1;
  var s = document.createElement('script');
  s.src = 'https://volau.dimau-fintech.com/kit/dimau-share.js';
  s.async = true;
  (document.head || document.documentElement).appendChild(s);
})();
