document.addEventListener("DOMContentLoaded", () => {
  // 1. Menú móvil (Hamburguesa)
  const mobileMenuBtn = document.querySelector(".mobile-menu-btn");
  const navLinks = document.querySelector(".nav-links");

  if (mobileMenuBtn && navLinks) {
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

// 4. Links limpios para las secciones: /servicios y /equipo en vez de /#servicios.
// Los enlaces siguen con href="#..." (funcionan sin JS); aquí se cambia la
// dirección que se ve en el navegador y se baja a la sección.
document.addEventListener("DOMContentLoaded", () => {
  const SECCIONES = ["servicios", "equipo"];
  const irA = (id, suave) => {
    const destino = SECCIONES.includes(id) && document.getElementById(id);
    if (destino) destino.scrollIntoView({ behavior: suave ? "smooth" : "auto" });
    else window.scrollTo({ top: 0, behavior: suave ? "smooth" : "auto" });
  };
  const rutaDe = (id) => (SECCIONES.includes(id) ? `/${id}` : "/");

  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    const id = a.getAttribute("href").slice(1);
    if (id && id !== "inicio" && !SECCIONES.includes(id)) return;
    a.addEventListener("click", (e) => {
      e.preventDefault();
      irA(id, true);
      if (location.pathname !== rutaDe(id)) history.pushState(null, "", rutaDe(id));
    });
  });

  // Al abrir /servicios o un link viejo /#servicios, baja a la sección.
  const inicial = location.pathname.replace(/^\/+|\/+$/g, "") || location.hash.slice(1);
  if (SECCIONES.includes(inicial)) {
    if (location.hash) history.replaceState(null, "", rutaDe(inicial));
    irA(inicial, false);
    // Las fotos que cargan después pueden mover la página: se vuelve a ajustar.
    window.addEventListener("load", () => {
      if (location.pathname === rutaDe(inicial)) irA(inicial, false);
    });
  }
  window.addEventListener("popstate", () => {
    irA(location.pathname.replace(/^\/+|\/+$/g, ""), true);
  });
});
