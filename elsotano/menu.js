// Menú móvil (hamburguesa) para las páginas que no cargan script.js
document.addEventListener("DOMContentLoaded", () => {
  const mobileMenuBtn = document.querySelector(".mobile-menu-btn");
  const navLinks = document.querySelector(".nav-links");
  if (!mobileMenuBtn || !navLinks) return;

  const ponerMenu = (abierto) => {
    navLinks.classList.toggle("active", abierto);
    mobileMenuBtn.classList.toggle("abierto", abierto);
    mobileMenuBtn.setAttribute("aria-expanded", abierto);
    mobileMenuBtn.setAttribute("aria-label", abierto ? "Cerrar menú" : "Abrir menú");
    document.body.classList.toggle("menu-abierto", abierto);
  };
  mobileMenuBtn.addEventListener("click", () =>
    ponerMenu(!navLinks.classList.contains("active")),
  );
  navLinks
    .querySelectorAll("a")
    .forEach((link) => link.addEventListener("click", () => ponerMenu(false)));
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") ponerMenu(false);
  });
});
