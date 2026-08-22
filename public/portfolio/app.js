document.addEventListener("DOMContentLoaded", () => {

  /* ===============================
     Modal Helpers (focus trap + return focus)
  =============================== */
  let activeModal = null;
  let lastFocusedElement = null;

  const FOCUSABLE_SELECTOR =
    'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

  function getFocusable(container) {
    if (!container) return [];
    return Array.from(container.querySelectorAll(FOCUSABLE_SELECTOR))
      .filter(el => el.offsetParent !== null);
  }

  function openModal(modal, triggerEl) {
    if (!modal) return;
    lastFocusedElement = triggerEl || document.activeElement;
    activeModal = modal;
    modal.classList.add("modal-show");
    modal.querySelector(".modal__wrapper")?.focus();
  }

  function closeModal(modal) {
    if (!modal) return;
    modal.classList.remove("modal-show");
    if (activeModal === modal) activeModal = null;
    lastFocusedElement?.focus();
    lastFocusedElement = null;
  }

  // Escape closes the active modal; Tab is trapped inside it
  document.addEventListener("keydown", (e) => {
    if (!activeModal) return;

    if (e.key === "Escape") {
      closeModal(activeModal);
      return;
    }

    if (e.key === "Tab") {
      const wrapper = activeModal.querySelector(".modal__wrapper");
      const focusable = getFocusable(wrapper);
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  });

  /* ===============================
     Navbar Hamburger Toggle
  =============================== */
  const navToggle = document.querySelector(".nav__wrapper__toggle");
  const navMenu = document.querySelector(".nav__wrapper__ul");
  const navLinks = document.querySelectorAll(".nav__wrapper__ul__li__a");

  navToggle?.addEventListener("click", () => {
    const isOpen = navMenu.classList.toggle("nav__active");
    navToggle.setAttribute("aria-expanded", String(isOpen));
  });

  document.addEventListener("click", (e) => {
    if (!navMenu.contains(e.target) && !navToggle.contains(e.target)) {
      navMenu.classList.remove("nav__active");
      navToggle?.setAttribute("aria-expanded", "false");
    }
  });

  /* ===============================
     Navbar Links (close mobile menu)
  =============================== */
  navLinks.forEach(link => {
    link.addEventListener("click", () => {
      navMenu.classList.remove("nav__active");
      navToggle?.setAttribute("aria-expanded", "false");
    });
  });

  /* ===============================
     Talk To Me Modal
  =============================== */
  const contactModal = document.getElementById("contactModal");
  const talkBtn = document.getElementById("talkBtn");
  const contactClose = contactModal?.querySelector(".modal__wrapper__close");

  talkBtn?.addEventListener("click", () => {
    openModal(contactModal, talkBtn);
  });

  contactClose?.addEventListener("click", () => {
    closeModal(contactModal);
  });

  contactModal?.addEventListener("click", (e) => {
    if (e.target === contactModal) {
      closeModal(contactModal);
    }
  });

  /* ===============================
     Footer Contact Modal
  =============================== */
  const contactMeModal = document.getElementById("contact-me-modal");
  const contactMeBtn = document.getElementById("footerContactBtn");
  const contactMeClose = contactMeModal?.querySelector(".modal__wrapper__close");
  const contactForm = document.getElementById("contactForm");
  const formStatus = document.getElementById("formStatus");
  const sendBtn = document.getElementById("sendBtn");

  // Open modal
  contactMeBtn?.addEventListener("click", () => {
    openModal(contactMeModal, contactMeBtn);
  });

  // Close modal
  contactMeClose?.addEventListener("click", () => {
    closeModal(contactMeModal);
  });

  // Close modal by clicking outside
  contactMeModal?.addEventListener("click", (e) => {
    if (e.target === contactMeModal) {
      closeModal(contactMeModal);
    }
  });

  function setFormStatus(message, type) {
    if (!formStatus) return;
    formStatus.textContent = message;
    formStatus.classList.remove("form-status--success", "form-status--error");
    if (type) formStatus.classList.add(`form-status--${type}`);
  }

  // Submit form using EmailJS
  contactForm?.addEventListener("submit", (e) => {
    e.preventDefault();

    // Run native validation so required/email errors are announced accessibly
    if (!contactForm.checkValidity()) {
      contactForm.reportValidity();
      return;
    }

    // Ensure EmailJS is loaded
    if (!window.emailjs) {
      console.error("EmailJS SDK not loaded");
      setFormStatus("Email service is unavailable right now. Please try again later.", "error");
      return;
    }

    const name = document.getElementById("name").value;
    const email = document.getElementById("email").value;
    const subject = document.getElementById("subject").value;
    const message = document.getElementById("message").value;

    const templateParams = {
      from_name: name,
      from_email: email,
      subject: subject,
      message: message
    };

    setFormStatus("Sending your message…", null);
    sendBtn?.setAttribute("disabled", "true");

    emailjs.send('service_grudwe9', 'template_qrmwxyv', templateParams)
      .then(() => {
        setFormStatus("Message sent successfully! I'll get back to you soon.", "success");
        contactForm.reset();
        sendBtn?.removeAttribute("disabled");
        setTimeout(() => closeModal(contactMeModal), 1600);
      })
      .catch((err) => {
        console.error('FAILED...', err);
        setFormStatus("Something went wrong sending your message. Please try again later.", "error");
        sendBtn?.removeAttribute("disabled");
      });
  });

  /* ===============================
     Scroll Spy (FINAL FIX)
     Center-based activation
  =============================== */
  const navItems = document.querySelectorAll(".nav__wrapper__ul__li__a");

  const sectionToNav = {
    home: "#home",
    projects: "#projects",
    experience: "#experience"
  };

  const sections = Object.keys(sectionToNav)
    .map(id => document.getElementById(id))
    .filter(Boolean);

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        navItems.forEach(link => link.classList.remove("active"));
        const navTarget = sectionToNav[entry.target.id];
        document
          .querySelector(`.nav__wrapper__ul__li__a[href="${navTarget}"]`)
          ?.classList.add("active");
      }
    });
  }, {
    rootMargin: "-40% 0px -40% 0px",
    threshold: 0
  });

  sections.forEach(section => observer.observe(section));

});
