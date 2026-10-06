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

  // Los títulos se envuelven para animar el texto sin ocultar el título observado
  document.querySelectorAll("section h2, .hero-content h1").forEach((titulo) => {
    const texto = document.createElement("div");
    texto.className = "titulo-texto";
    while (titulo.firstChild) texto.appendChild(titulo.firstChild);
    titulo.appendChild(texto);
  });

  // 2. Aparición suave de imágenes al hacer scroll
  const imageContainers = document.querySelectorAll(
    ".photo-banner, .section-photo, .service-card, .equipment-img, .nosotros-ilustraciones img, section h2, .hero-content h1",
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

  // 5. Menú: marca Servicios o Equipo mientras esa sección está en pantalla
  const enlacesNav = [...document.querySelectorAll(".nav-links a[href*='#']")];
  const seccionesNav = enlacesNav
    .map((a) => document.getElementById(a.hash.slice(1)))
    .filter(Boolean);
  if (seccionesNav.length) {
    const navObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const enlace = enlacesNav.find(
            (a) => a.hash === "#" + entry.target.id,
          );
          if (!enlace) return;
          enlace.classList.toggle("activo", entry.isIntersecting);
          if (entry.isIntersecting) enlace.setAttribute("aria-current", "true");
          else enlace.removeAttribute("aria-current");
        });
      },
      { rootMargin: "-45% 0px -50% 0px" },
    );
    seccionesNav.forEach((s) => navObserver.observe(s));
  }

  // 4. Botón fijo RESERVAR en celular: aparece al pasar la portada y se
  // esconde mientras se ven los servicios o el footer.
  const reservarFijo = document.querySelector(".reservar-fijo");
  const zonas = ["#inicio", "#servicios", "footer"]
    .map((s) => document.querySelector(s))
    .filter(Boolean);
  if (reservarFijo && zonas.length) {
    const enVista = new Set();
    const zonaObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) enVista.add(entry.target);
        else enVista.delete(entry.target);
      });
      const visible = enVista.size === 0;
      reservarFijo.classList.toggle("visible", visible);
      reservarFijo.setAttribute("aria-hidden", visible ? "false" : "true");
      reservarFijo.tabIndex = visible ? 0 : -1;
    });
    zonas.forEach((z) => zonaObserver.observe(z));
  }
});

// 3. Galería de fotos en las tarjetas (display a pantalla completa)
document.addEventListener("DOMContentLoaded", () => {
  const disparadores = document.querySelectorAll("[data-galeria]");
  if (!disparadores.length) return;

  const visor = document.createElement("div");
  visor.className = "galeria-visor";
  visor.setAttribute("role", "dialog");
  visor.setAttribute("aria-modal", "true");
  visor.hidden = true;
  visor.innerHTML = `
    <button class="galeria-cerrar" aria-label="Cerrar">✕</button>
    <button class="galeria-flecha galeria-prev" aria-label="Foto anterior">‹</button>
    <figure>
      <img alt="" />
      <figcaption></figcaption>
    </figure>
    <button class="galeria-flecha galeria-next" aria-label="Foto siguiente">›</button>`;
  document.body.appendChild(visor);

  const img = visor.querySelector("img");
  const pie = visor.querySelector("figcaption");
  let fotos = [];
  let actual = 0;

  const mostrar = (i) => {
    actual = (i + fotos.length) % fotos.length;
    img.src = fotos[actual].src;
    img.alt = fotos[actual].texto;
    pie.textContent = `${fotos[actual].texto}  ·  ${actual + 1} / ${fotos.length}`;
  };
  const abrir = (el) => {
    fotos = el.dataset.galeria.split(";").map((f) => {
      const [src, texto] = f.split("|");
      return { src, texto: texto || "" };
    });
    mostrar(0);
    visor.hidden = false;
    document.body.style.overflow = "hidden";
  };
  const cerrar = () => {
    visor.hidden = true;
    document.body.style.overflow = "";
  };

  disparadores.forEach((el) => {
    el.addEventListener("click", () => abrir(el));
    el.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        abrir(el);
      }
    });
  });
  visor.querySelector(".galeria-cerrar").addEventListener("click", cerrar);
  visor.querySelector(".galeria-prev").addEventListener("click", () => mostrar(actual - 1));
  visor.querySelector(".galeria-next").addEventListener("click", () => mostrar(actual + 1));
  visor.addEventListener("click", (e) => {
    if (e.target === visor) cerrar();
  });
  document.addEventListener("keydown", (e) => {
    if (visor.hidden) return;
    if (e.key === "Escape") cerrar();
    if (e.key === "ArrowLeft") mostrar(actual - 1);
    if (e.key === "ArrowRight") mostrar(actual + 1);
  });

  let inicioX = null;
  visor.addEventListener("touchstart", (e) => (inicioX = e.touches[0].clientX), { passive: true });
  visor.addEventListener("touchend", (e) => {
    if (inicioX === null) return;
    const dx = e.changedTouches[0].clientX - inicioX;
    if (Math.abs(dx) > 40) mostrar(actual + (dx < 0 ? 1 : -1));
    inicioX = null;
  });
});
