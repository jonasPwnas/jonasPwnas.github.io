// 1. Project cards: preview clips.
//    - The featured project (video with data-autoplay) plays by itself while it's on screen.
//    - Other cards play their clip while hovered or focused (not on touch screens).
//    Nothing plays for visitors who prefer reduced motion.
(function () {
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce) return;
  var canHover = window.matchMedia("(hover: hover)").matches;

  function controls(media) {
    var video = media.querySelector("video");
    return {
      video: video,
      start: function () {
        if (!video.src && video.dataset.src) video.src = video.dataset.src; // load only when needed
        var p = video.play();
        if (p && p.then) p.then(function () { media.classList.add("is-playing"); }).catch(function () {});
      },
      stop: function () {
        media.classList.remove("is-playing");
        video.pause();
      }
    };
  }

  document.querySelectorAll(".feature, .tile").forEach(function (card) {
    var media = card.querySelector(".media");
    if (!media || !media.querySelector("video")) return;
    var c = controls(media);

    if (c.video.hasAttribute("data-autoplay") && "IntersectionObserver" in window) {
      new IntersectionObserver(function (entries) {
        entries.forEach(function (e) { e.isIntersecting ? c.start() : c.stop(); });
      }, { threshold: 0.35 }).observe(media);
      return;
    }

    if (!canHover) return;
    card.addEventListener("mouseenter", c.start);
    card.addEventListener("mouseleave", c.stop);
    card.addEventListener("focusin", c.start);
    card.addEventListener("focusout", c.stop);
  });
})();

// 2. Gallery lightbox: click a picture in a .gallery to see it large.
//    Arrow keys or the buttons step through, Esc or Close shuts it.
//    Without JavaScript the links simply open the full-size image.
(function () {
  var links = Array.prototype.slice.call(document.querySelectorAll(".gallery a[href]"));
  if (!links.length || typeof HTMLDialogElement === "undefined") return;

  var dlg = document.createElement("dialog");
  dlg.className = "lightbox";
  dlg.setAttribute("aria-label", "Image viewer");
  dlg.innerHTML =
    '<div class="lightbox-bar"><span class="count"></span><button type="button" class="close">Close</button></div>' +
    '<div class="lightbox-stage">' +
      '<button type="button" class="nav prev" aria-label="Previous image">&#8249;</button>' +
      '<img alt="">' +
      '<button type="button" class="nav next-img" aria-label="Next image">&#8250;</button>' +
    '</div>' +
    '<p class="lightbox-caption"></p>';
  document.body.appendChild(dlg);

  var img = dlg.querySelector("img");
  var cap = dlg.querySelector(".lightbox-caption");
  var count = dlg.querySelector(".count");
  var current = 0;

  function show(i) {
    current = (i + links.length) % links.length;
    var a = links[current];
    var thumb = a.querySelector("img");
    img.src = a.href;
    img.alt = thumb ? thumb.alt : "";
    cap.textContent = a.dataset.caption || (thumb ? thumb.alt : "");
    count.textContent = (current + 1) + " / " + links.length;
  }

  links.forEach(function (a, i) {
    a.addEventListener("click", function (e) {
      e.preventDefault();
      show(i);
      dlg.showModal();
    });
  });

  dlg.querySelector(".close").addEventListener("click", function () { dlg.close(); });
  dlg.querySelector(".prev").addEventListener("click", function () { show(current - 1); });
  dlg.querySelector(".next-img").addEventListener("click", function () { show(current + 1); });
  dlg.addEventListener("keydown", function (e) {
    if (e.key === "ArrowLeft") show(current - 1);
    if (e.key === "ArrowRight") show(current + 1);
  });
  // click on the dark area around the image closes it
  dlg.addEventListener("click", function (e) {
    if (e.target === dlg || e.target.classList.contains("lightbox-stage")) dlg.close();
  });
  dlg.addEventListener("close", function () {
    if (links[current]) links[current].focus();
  });

  if (links.length < 2) dlg.querySelectorAll(".nav").forEach(function (b) { b.hidden = true; });
})();
