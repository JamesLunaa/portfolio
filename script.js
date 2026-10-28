(function () {
  var root = document.documentElement;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  var wide = window.matchMedia('(min-width: 900px)');

  /* Theme toggle: night by default, day on request */
  var toggle = document.querySelector('.theme-toggle');
  var themeColor = document.querySelector('meta[name="theme-color"]');
  function paintToggle() {
    var day = root.dataset.theme === 'light';
    toggle.textContent = day ? 'Night' : 'Day';
    toggle.setAttribute('aria-label', day ? 'Switch to night theme' : 'Switch to day theme');
    themeColor.setAttribute('content', day ? '#F7F4F0' : '#0E0C13');
  }
  toggle.addEventListener('click', function () {
    root.dataset.theme = root.dataset.theme === 'light' ? 'dark' : 'light';
    try { localStorage.setItem('theme', root.dataset.theme); } catch (e) {}
    paintToggle();
  });
  paintToggle();

  /* Projects: one index, one frame */
  var projects = Array.prototype.slice.call(document.querySelectorAll('.project'));
  var frame = document.getElementById('project-frame');
  var frameVideos = projects.map(function (project) {
    var source = project.querySelector('.project-video');
    var clone = source.cloneNode(true);
    clone.removeAttribute('aria-label');
    clone.className = '';
    clone.preload = 'none';
    frame.appendChild(clone);
    return clone;
  });

  var caption = document.querySelector('.frame-caption');
  var captionItems = projects.map(function (project) {
    var item = project.querySelector('.project-more > div').cloneNode(true);
    item.className = 'caption-item';
    caption.appendChild(item);
    return item;
  });

  function playSafely(video) {
    if (reduceMotion.matches) return;
    var p = video.play();
    if (p && p.catch) p.catch(function () {});
  }

  var active = -1;
  function activate(index) {
    if (index === active) return;
    active = index;
    projects.forEach(function (project, i) {
      var on = i === index;
      project.classList.toggle('is-active', on);
      project.querySelector('.project-pick').setAttribute('aria-pressed', on ? 'true' : 'false');
      var video = frameVideos[i];
      video.classList.toggle('is-active', on);
      captionItems[i].classList.toggle('is-active', on);
      if (!wide.matches) return;
      if (on) {
        if (video.preload === 'none') { video.preload = 'auto'; video.load(); }
        playSafely(video);
      } else {
        video.pause();
      }
    });
  }

  projects.forEach(function (project, i) {
    var pick = project.querySelector('.project-pick');
    pick.addEventListener('click', function () { activate(i); });
    pick.addEventListener('focus', function () { activate(i); });
    pick.addEventListener('mouseenter', function () { if (wide.matches) activate(i); });
  });
  activate(0);

  /* Arrow keys move through the menu, like a game's level select */
  document.querySelector('.projects').addEventListener('keydown', function (e) {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    e.preventDefault();
    var next = (active + (e.key === 'ArrowDown' ? 1 : projects.length - 1)) % projects.length;
    projects[next].querySelector('.project-pick').focus();
  });

  /* Contact: the same menu feel as the start screen */
  var choices = Array.prototype.slice.call(document.querySelectorAll('.choice'));
  choices.forEach(function (choice) {
    function select() {
      choices.forEach(function (c) { c.classList.toggle('is-active', c === choice); });
    }
    choice.addEventListener('mouseenter', select);
    choice.addEventListener('focusin', select);
  });
  document.querySelector('.choices').addEventListener('keydown', function (e) {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    e.preventDefault();
    var i = choices.findIndex(function (c) { return c.classList.contains('is-active'); });
    choices[(i + 1) % choices.length].querySelector('.choice-name').focus();
  });

  var copy = document.querySelector('.copy');
  copy.addEventListener('click', function () {
    var done = function (label) {
      copy.textContent = label;
      setTimeout(function () { copy.textContent = 'Copy'; }, 1800);
    };
    if (navigator.clipboard) {
      navigator.clipboard.writeText(copy.dataset.copy).then(function () { done('Copied'); }, function () { done('Press Ctrl+C'); });
    } else {
      done('Press Ctrl+C');
    }
  });

  /* Stagger the start screen's entrance */
  var r = 0;
  document.querySelectorAll('.title-sub, .hero .project, .hero .frame, .hero-foot > *').forEach(function (el) {
    el.style.setProperty('--r', r++);
  });

  /* Pause the frame when the work section leaves the screen */
  if ('IntersectionObserver' in window) {
    var work = document.getElementById('work');
    new IntersectionObserver(function (entries) {
      var video = frameVideos[active];
      if (!wide.matches || !video) return;
      if (entries[0].isIntersecting) playSafely(video); else video.pause();
    }, { threshold: 0.1 }).observe(work);

    /* On phones each project carries its own video: play the one in view */
    var inline = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        var video = entry.target;
        if (wide.matches) { video.pause(); return; }
        if (entry.isIntersecting) {
          if (video.preload === 'none') { video.preload = 'auto'; video.load(); }
          playSafely(video);
        } else {
          video.pause();
        }
      });
    }, { threshold: 0.6 });
    projects.forEach(function (project) { inline.observe(project.querySelector('.project-video')); });
  }

  wide.addEventListener('change', function () {
    projects.forEach(function (project) { project.querySelector('.project-video').pause(); });
    frameVideos.forEach(function (v) { v.pause(); });
    var current = active; active = -1; activate(current);
  });

  /* Videos get controls when motion is reduced, since they no longer autoplay */
  if (reduceMotion.matches) {
    document.querySelectorAll('.project-video').forEach(function (v) { v.controls = true; });
  }

  /* Section entrances: heading, then text, then the rest */
  var groups = [
    ['#about .facts > div', '#about .about-text', '#about .record-label', '#about .record li'],
    ['#contact .choice', '#contact .contact-ask'],
    ['.footer-cols ul', '.footer-mark']
  ];
  var revealables = [];
  groups.forEach(function (selectors) {
    var d = 0;
    selectors.forEach(function (sel) {
      document.querySelectorAll(sel).forEach(function (el) {
        el.setAttribute('data-reveal', '');
        el.style.setProperty('--d', Math.min(d++, 8));
        revealables.push(el);
      });
    });
  });
  if ('IntersectionObserver' in window && !reduceMotion.matches) {
    var revealer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-in');
          revealer.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px' });
    revealables.forEach(function (el) { revealer.observe(el); });
  } else {
    revealables.forEach(function (el) { el.classList.add('is-in'); });
  }
})();
