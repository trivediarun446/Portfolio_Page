/* ==========================================================
   Arun Trivedi — Portfolio scripts (fixed)
   ========================================================== */

document.addEventListener('DOMContentLoaded', function () {

  var menuBtn  = document.querySelector('.bars');
  var menuIcon = document.querySelector('#menu-icon');
  var navbar   = document.querySelector('.navbar');
  var header   = document.querySelector('.header');
  var sections = document.querySelectorAll('section');
  var navLinks = document.querySelectorAll('header nav a');

  /* ---------- Mobile menu ----------
     Click listener ab <a class="bars"> par hai (pehle sirf <i> par tha)
     aur preventDefault() lagaya hai taaki page top par jump na kare. */
  function closeMenu() {
    if (!navbar) return;
    navbar.classList.remove('active');
    if (menuIcon) {
      menuIcon.classList.remove('fa-xmark');
      menuIcon.classList.add('fa-bars');
    }
  }

  if (menuBtn && navbar) {
    menuBtn.addEventListener('click', function (e) {
      e.preventDefault();
      var isOpen = navbar.classList.toggle('active');
      if (menuIcon) {
        menuIcon.classList.toggle('fa-bars', !isOpen);
        menuIcon.classList.toggle('fa-xmark', isOpen);
      }
    });
  }

  /* Link par click karte hi menu band */
  navLinks.forEach(function (link) {
    link.addEventListener('click', closeMenu);
  });

  /* Desktop size par wapas aane par menu reset */
  window.addEventListener('resize', function () {
    if (window.innerWidth > 768) closeMenu();
  });

  /* ---------- Active link + sticky header ---------- */
  function onScroll() {
    var top = window.scrollY;

    sections.forEach(function (sec) {
      var id = sec.getAttribute('id');
      if (!id) return;

      var offset = sec.offsetTop - 150;
      var height = sec.offsetHeight;

      if (top >= offset && top < offset + height) {
        navLinks.forEach(function (link) { link.classList.remove('active'); });

        /* Selector ko quote kiya — pehle unquoted tha aur null aane par crash ho sakta tha */
        var current = document.querySelector('header nav a[href="#' + id + '"]');
        if (current) current.classList.add('active');
      }
    });

    /* Pehle yahan bug tha: toggle('sticky', window, scrollY > 100)
       comma ki wajah se 'window' hamesha truthy pass ho raha tha. */
    if (header) header.classList.toggle('sticky', window.scrollY > 100);
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- ScrollReveal (library load hui ho tabhi) ---------- */
  if (typeof ScrollReveal !== 'undefined') {
    var sr = ScrollReveal({
      distance: '60px',
      duration: 1600,
      delay: 150,
      reset: false
    });

    sr.reveal('.home-content, .heading',                          { origin: 'top' });
    sr.reveal('.knowladge-container, .project-box, .intership-box, .contact form',
                                                                  { origin: 'bottom', interval: 100 });
    sr.reveal('.about-img',                                       { origin: 'left' });
    sr.reveal('.about-content',                                   { origin: 'right' });
  }

  /* ---------- Typed.js (optional) ----------
     Agar library load na ho to span ka static text waise hi dikhega. */
  if (typeof Typed !== 'undefined' && document.querySelector('.typing')) {
    new Typed('.typing', {
      strings: ['Engineering Enthusiast', 'AI & Data Science Learner', 'Full Stack Developer'],
      typeSpeed: 70,
      backSpeed: 40,
      backDelay: 1200,
      loop: true
    });
  }

  /* ---------- Contact form (AJAX submit + reset) ---------- */
  var contactForm = document.getElementById('contact-form');
  var formStatus  = document.getElementById('form-status');

  function setStatus(msg, isError) {
    if (!formStatus) return;
    formStatus.textContent = msg;
    formStatus.style.color = isError ? '#ff8080' : 'var(--main-color)';
  }

  if (contactForm) {
    contactForm.addEventListener('submit', function (event) {
      event.preventDefault();

      var submitBtn = contactForm.querySelector('input[type="submit"]');
      if (submitBtn) submitBtn.disabled = true;
      setStatus('Sending your message…', false);

      fetch(contactForm.action, {
        method: contactForm.method,
        body: new FormData(contactForm),
        headers: { 'Accept': 'application/json' }
      })
        .then(function (response) {
          if (response.ok) {
            setStatus('Message sent. Thanks for reaching out!', false);
            contactForm.reset();
          } else {
            setStatus('Message could not be sent. Please try again.', true);
          }
        })
        .catch(function () {
          setStatus('Network error. Check your connection and try again.', true);
        })
        .finally(function () {
          if (submitBtn) submitBtn.disabled = false;
        });
    });
  }

});