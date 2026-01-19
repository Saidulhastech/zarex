const iconNodes = document.querySelectorAll("[data-wcu-icon]");
const arrowNodes = document.querySelectorAll("[data-wcu-arrow]");

iconNodes.forEach((node) => {
  const target = node.querySelector(".wcu-icon");
  const src = node.getAttribute("data-lottie-src");
  if (!target || !src || !window.lottie) {
    return;
  }
  window.lottie.loadAnimation({
    container: target,
    renderer: "svg",
    loop: node.getAttribute("data-lottie-loop") !== "false",
    autoplay: node.getAttribute("data-lottie-autoplay") !== "false",
    path: src,
  });
});

const revealArrowForIcon = (icon) => {
  const arrow = icon.nextElementSibling;
  if (arrow && arrow.matches("[data-wcu-arrow]")) {
    arrow.classList.add("is-visible");
  }
};

const hideArrowForIcon = (icon) => {
  const arrow = icon.nextElementSibling;
  if (arrow && arrow.matches("[data-wcu-arrow]")) {
    arrow.classList.remove("is-visible");
  }
};

if ("IntersectionObserver" in window) {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          revealArrowForIcon(entry.target);
        } else {
          hideArrowForIcon(entry.target);
        }
      });
    },
    {
      threshold: 0.2,
      rootMargin: "0px 0px -35% 0px",
    }
  );

  iconNodes.forEach((icon) => observer.observe(icon));
} else {
  iconNodes.forEach((icon) => revealArrowForIcon(icon));
}
