document.addEventListener("DOMContentLoaded", () => {
  // 1. Menú móvil (Hamburguesa)
  const mobileMenuBtn = document.querySelector(".mobile-menu-btn");
  const navLinks = document.querySelector(".nav-links");

  if (mobileMenuBtn && navLinks) {
    mobileMenuBtn.addEventListener("click", () => {
      navLinks.classList.toggle("active");
      mobileMenuBtn.textContent = navLinks.classList.contains("active")
        ? "✕"
        : "☰";
    });
    navLinks.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => {
        navLinks.classList.remove("active");
        mobileMenuBtn.textContent = "☰";
      });
    });
  }

  // 2. Aparición suave de imágenes al hacer scroll
  const imageContainers = document.querySelectorAll(
    ".photo-banner, .section-photo, .card-img, .equipment-img",
  );
  const imageObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("img-visible");
          imageObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15 },
  );
  imageContainers.forEach((el) => {
    el.classList.add("reveal-init");
    imageObserver.observe(el);
  });
});
