(function () {
  'use strict';

  var placeholder = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="800" height="450" viewBox="0 0 800 450"%3E%3Crect width="800" height="450" fill="%23e8f8fb"/%3E%3Cpath d="M330 165h140v120H330zM360 135h80v30h-80z" fill="none" stroke="%2300a8c6" stroke-width="12"/%3E%3Cpath d="M280 225h50m140 0h50M400 285v45" stroke="%23102a43" stroke-width="12" stroke-linecap="round"/%3E%3Ctext x="400" y="375" text-anchor="middle" fill="%23102a43" font-family="Arial" font-size="28"%3ETech Khuất%3C/text%3E%3C/svg%3E';

  document.addEventListener('error', function (event) {
    var image = event.target;
    if (image.tagName !== 'IMG' || image.dataset.fallbackApplied) return;
    image.dataset.fallbackApplied = 'true';
    image.src = placeholder;
    image.alt = image.alt || 'Ảnh minh họa Tech Khuất';
  }, true);

  function submitSearch() {
    var input = document.querySelector('.search-box input');
    if (!input) return;
    window.location.assign('/search?q=' + encodeURIComponent(input.value.trim()));
  }

  document.addEventListener('click', function (event) {
    var button = event.target.closest('.search-box button');
    if (!button) return;
    event.preventDefault();
    event.stopPropagation();
    submitSearch();
  });
  document.addEventListener('keydown', function (event) {
    if (event.key === 'Enter' && event.target.matches('.search-box input')) {
      event.preventDefault();
      submitSearch();
    }
  });

  function enhanceCodeBlocks() {
    document.querySelectorAll('.post-detail pre').forEach(function (block) {
      if (block.dataset.copyReady) return;
      block.dataset.copyReady = 'true';
      var button = document.createElement('button');
      button.type = 'button';
      button.className = 'tech-copy-code';
      button.textContent = 'Sao chép';
      button.addEventListener('click', function () {
        var text = block.innerText;
        if (!navigator.clipboard) return;
        navigator.clipboard.writeText(text).then(function () {
          button.textContent = 'Đã sao chép';
          window.setTimeout(function () { button.textContent = 'Sao chép'; }, 1600);
        });
      });
      block.insertBefore(button, block.firstChild);
    });
  }

  document.addEventListener('DOMContentLoaded', enhanceCodeBlocks);
  new MutationObserver(enhanceCodeBlocks).observe(document.documentElement, { childList: true, subtree: true });
}());
