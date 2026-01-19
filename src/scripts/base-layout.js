import Lenis from "lenis";
import { gsap } from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";
// Register plugin only once at module level
gsap.registerPlugin(ScrollTrigger);

// Configure GSAP for best compatibility
gsap.config({
  nullTargetWarn: false,
});

// Store context for cleanup
let gsapContext = null;
let lenisInstance = null;
let lenisRafId = null;
let lenisScrollHandler = null;
let hasInitialized = false;
let skipNextPageLoad = false;

const setupLenis = () => {
  const enableLenis = window.matchMedia("(min-width: 768px)").matches;
  if (!enableLenis || lenisInstance) {
    return;
  }

  lenisInstance = new Lenis({
    duration: 1,
    easing: (t) => 1 - Math.pow(1 - t, 3),
    smoothWheel: true,
    smoothTouch: false,
    allowNestedScroll: true,
  });

  // Use GSAP ticker for Lenis for better synchronization
  const raf = (time) => {
    lenisInstance?.raf(time * 1000);
  };
  gsap.ticker.add(raf);
  gsap.ticker.lagSmoothing(0);

  // Connect Lenis scroll events to ScrollTrigger
  lenisScrollHandler = () => {
    ScrollTrigger.update();
  };
  lenisInstance.on("scroll", lenisScrollHandler);
};

const cleanupGsap = () => {
  // Kill all existing ScrollTriggers
  ScrollTrigger.getAll().forEach((trigger) => {
    try {
      trigger.kill(true);
    } catch (e) {
      // Ignore errors during cleanup
    }
  });

  // Revert context if it exists
  if (gsapContext) {
    try {
      gsapContext.revert();
    } catch (e) {
      // Ignore errors during cleanup
    }
    gsapContext = null;
  }

  gsap.globalTimeline.clear();
};

const initGsap = () => {
  setupLenis();

  // Configure ScrollTrigger defaults for better reliability
  // This helps recalculate positions if the layout shifts after initial load
  ScrollTrigger.defaults({
    invalidateOnRefresh: true,
  });

  // Use gsap.context() for proper cleanup - this is the GSAP recommended approach
  gsapContext = gsap.context(() => {
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    const canUseTrigger = (trigger) => {
      if (!trigger) {
        return false;
      }
      if (typeof trigger === "string") {
        const element = document.querySelector(trigger);
        return Boolean(element && element.isConnected);
      }
      if (trigger instanceof Element) {
        return trigger.isConnected;
      }
      return true;
    };

    const createScrollTrigger = (vars) => {
      if (!vars) {
        return null;
      }
      let trigger = vars.trigger;
      if (typeof trigger === "string") {
        trigger = document.querySelector(trigger);
      }
      if (!(trigger instanceof Element) || !trigger.isConnected) {
        return null;
      }

      // According to GSAP docs, using gsap.to() with scrollTrigger config is
      // the recommended and more reliable approach for simple callback-based triggers
      // This avoids issues with ScrollTrigger.create() position calculations

      const scrollTriggerConfig = {
        trigger: trigger,
        start: vars.start || "top bottom",
      };

      // Copy relevant properties
      if (vars.end) scrollTriggerConfig.end = vars.end;
      if (vars.onEnter) scrollTriggerConfig.onEnter = vars.onEnter;
      if (vars.onLeave) scrollTriggerConfig.onLeave = vars.onLeave;
      if (vars.onEnterBack) scrollTriggerConfig.onEnterBack = vars.onEnterBack;
      if (vars.onLeaveBack) scrollTriggerConfig.onLeaveBack = vars.onLeaveBack;
      if (vars.onUpdate) scrollTriggerConfig.onUpdate = vars.onUpdate;
      if (vars.onToggle) scrollTriggerConfig.onToggle = vars.onToggle;
      if (vars.scrub !== undefined) scrollTriggerConfig.scrub = vars.scrub;

      // WORKAROUND: 'once: true' causes a known bug in GSAP 3.12.4+ when page is refreshed while scrolled
      // Using toggleActions instead achieves the same "play once" effect without the bug
      if (vars.once) {
        scrollTriggerConfig.toggleActions = "play none none none";
      } else if (vars.toggleActions) {
        scrollTriggerConfig.toggleActions = vars.toggleActions;
      }

      if (vars.pin !== undefined) scrollTriggerConfig.pin = vars.pin;
      if (vars.id !== undefined) scrollTriggerConfig.id = vars.id;
      if (vars.markers !== undefined)
        scrollTriggerConfig.markers = vars.markers;

      try {
        // Explicitly set end if missing to avoid internal GSAP calculation errors
        if (!scrollTriggerConfig.end) {
          scrollTriggerConfig.end = "bottom top";
        }

        // Create the ScrollTrigger
        const st = ScrollTrigger.create(scrollTriggerConfig);

        // EXTRA ROBUSTNESS: If the scroll position is already past the start,
        // and we have an onEnter callback, trigger it manually.
        // This handles cases where ScrollTrigger misses the initial trigger points on load.
        if (vars.onEnter && st.isActive) {
          vars.onEnter();
        }

        return st;
      } catch (error) {
        console.warn(
          "ScrollTrigger attachment failed for element:",
          trigger,
          error
        );
        return null;
      }
    };

    const cleanupInvalidTriggers = () => {
      ScrollTrigger.getAll().forEach((trigger) => {
        if (!trigger || typeof trigger.kill !== "function") {
          return;
        }
        const triggerElement = trigger.trigger;
        if (triggerElement instanceof Element && !triggerElement.isConnected) {
          trigger.kill();
        }
      });
    };

    const withSection = (selector, init) => {
      const section = document.querySelector(selector);
      if (!section) {
        return;
      }
      try {
        init(section);
      } catch (error) {
        console.warn(`Section initialization failed for ${selector}:`, error);
      }
    };

    const easeOutQuad = "power1.out";
    const easeOutCirc = "circ.out";
    const easeStandard = "cubic-bezier(0.25, 0.1, 0.25, 1)";
    const stackEase = "power3.out";
    const easeOutBack = "back.out(1.7)";

    const slideInBlock = (element, yStart) => {
      if (!canUseTrigger(element)) {
        return;
      }

      gsap.set(element, {
        filter: "blur(100px)",
        opacity: 0,
        yPercent: yStart,
        willChange: "transform, filter, opacity",
      });

      const tl = gsap.timeline({ paused: true });

      tl.to(
        element,
        {
          filter: "blur(0px)",
          opacity: 1,
          duration: 0.9,
          ease: easeOutCirc,
        },
        0
      ).to(
        element,
        {
          yPercent: 0,
          duration: 0.5,
          ease: easeOutQuad,
        },
        0
      );

      createScrollTrigger({
        trigger: element,
        start: "top 100%",
        onEnter: () => tl.play(),
        toggleActions: "play none none none",
      });
    };

    withSection(".hero-section", (heroSection) => {
      const headingBlock = heroSection.querySelector(".page-heading-block");
      const summaryBlock = heroSection.querySelector(
        ".hero-summary-and-button-wrap"
      );
      const heroImages = heroSection.querySelector(".hero-image-container");

      const heroButton = heroSection.querySelector(".primary-button-wrapper");
      const heroButtonOverlay = heroButton?.querySelector(
        ".button-animation-overlay"
      );

      const leftTop = heroImages?.querySelector(
        ".hero-single-image-block.left-top"
      );
      const leftBottom = heroImages?.querySelector(
        ".hero-single-image-block.left-bottom"
      );
      const middleTop = heroImages?.querySelector(
        ".hero-single-image-block.middle-top"
      );
      const middleBottom = heroImages?.querySelector(
        ".hero-single-image-block.bottom"
      );
      const rightTop = heroImages?.querySelector(
        ".hero-single-image-block.right-top"
      );
      const rightBottom = heroImages?.querySelector(
        ".hero-single-image-block.right-bottom"
      );

      const heroItems = [
        leftTop,
        rightTop,
        leftBottom,
        middleBottom,
        rightBottom,
      ].filter(Boolean);
      const rotateLeft = leftTop;
      const rotateRight = rightTop;

      if (prefersReducedMotion) {
        gsap.set([headingBlock, summaryBlock].filter(Boolean), {
          filter: "blur(0px)",
          yPercent: 0,
          opacity: 1,
        });
        const allImages = heroSection.querySelectorAll(
          ".hero-single-image-block"
        );
        gsap.set(allImages, { x: 0, y: 0, filter: "blur(0px)", opacity: 1 });
      } else {
        slideInBlock(headingBlock, 50);
        slideInBlock(summaryBlock, -50);

        const runHeroStackAnimation = () => {
          if (!heroImages || !heroItems.length) {
            return;
          }

          const containerRect = heroImages.getBoundingClientRect();
          const centerX = containerRect.left + containerRect.width / 2;
          const centerY = containerRect.top + containerRect.height / 2;

          // Set initial stacking position for all items
          heroItems.forEach((item, index) => {
            const rect = item.getBoundingClientRect();
            gsap.set(item, { clearProps: "transform" });
            const r = item.getBoundingClientRect();
            gsap.set(item, {
              x: centerX - (r.left + r.width / 2),
              y:
                item === leftTop || item === rightTop
                  ? 0
                  : centerY - (r.top + r.height / 2),
              zIndex: 20 - index,
              filter: "blur(100px)",
              opacity: 0,
              willChange: "transform, filter, opacity",
            });
          });

          if (middleTop) {
            gsap.set(middleTop, {
              filter: "blur(100px)",
              opacity: 0,
              willChange: "filter, opacity",
            });
          }

          const heroTl = gsap.timeline({ delay: 0.1 });
          const blurTargets = [...heroItems, middleTop].filter(Boolean);

          // 1. Fade/Blur in
          heroTl.to(blurTargets, {
            filter: "blur(0px)",
            opacity: 1,
            duration: 1.0,
            ease: "power2.out",
          });

          // 2. Move items to their layout positions
          const rolloutPos = ">-0.4";

          // Horizontal Phase: All images move to their columns
          heroTl.to(
            heroItems,
            {
              x: 0,
              duration: 1.2,
              ease: "power3.out",
            },
            rolloutPos
          );

          // Vertical Phase - Bottom: Bottom images move down to their final positions
          // Strictly after the horizontal phase is complete
          heroTl.to(
            [leftBottom, middleBottom, rightBottom].filter(Boolean),
            {
              y: 0,
              duration: 1.4,
              ease: "power3.out",
            },
            rolloutPos + "+=1.2"
          );
        };

        const heroImageNodes = Array.from(heroSection.querySelectorAll("img"));
        const waitForHeroImages = () => {
          return Promise.all(
            heroImageNodes.map((img) => {
              if (img.complete) return Promise.resolve();
              return new Promise((r) => {
                img.onload = r;
                img.onerror = r;
              });
            })
          );
        };

        waitForHeroImages().then(() => {
          requestAnimationFrame(runHeroStackAnimation);
        });

        // Scroll-based rotation for top images (outside of stack animation)
        if (leftTop || rightTop) {
          ScrollTrigger.create({
            trigger: heroSection,
            start: "top bottom",
            end: "bottom 80%",
            scrub: 0.3,
            onUpdate: (self) => {
              const progress = self.progress;
              const leftRotation = -11 + 11 * progress;
              const rightRotation = 21 - 21 * progress;
              if (leftTop) gsap.set(leftTop, { rotateZ: leftRotation });
              if (rightTop) gsap.set(rightTop, { rotateZ: rightRotation });
            },
          });
        }

        if (heroButton && heroButtonOverlay) {
          gsap.set(heroButtonOverlay, { xPercent: -100, opacity: 0 });
          const hbTl = gsap.timeline({ paused: true });
          hbTl.to(heroButtonOverlay, {
            xPercent: 0,
            opacity: 1,
            duration: 0.5,
            ease: "power2.out",
          });
          heroButton.addEventListener("mouseenter", () => hbTl.play());
          heroButton.addEventListener("mouseleave", () => hbTl.reverse());
        }
      }
    });

    withSection("[data-breadcrumb-section]", (breadcrumbSection) => {
      const wrapper = breadcrumbSection.querySelector(
        "[data-breadcrumb-wrapper]"
      );

      if (!wrapper || !canUseTrigger(wrapper)) {
        return;
      }

      if (prefersReducedMotion) {
        gsap.set(wrapper, { filter: "blur(0px)", yPercent: 0 });
        return;
      }

      gsap.set(wrapper, {
        filter: "blur(100px)",
        opacity: 0,
        yPercent: 30,
        willChange: "transform, filter, opacity",
      });

      const breadcrumbTl = gsap.timeline({ paused: true });
      breadcrumbTl
        .to(
          wrapper,
          {
            filter: "blur(0px)",
            opacity: 1,
            duration: 0.9,
            ease: easeOutCirc,
          },
          0
        )
        .to(
          wrapper,
          {
            yPercent: 0,
            duration: 0.5,
            ease: easeOutQuad,
          },
          0
        );

      createScrollTrigger({
        trigger: wrapper,
        start: "top 85%",
        onEnter: () => breadcrumbTl.play(),
        onEnterBack: () => breadcrumbTl.play(),
        toggleActions: "play none none none",
      });
    });

    withSection(
      "[data-integration-breadcrumb-section]",
      (integrationBreadcrumbSection) => {
        const wrapper = integrationBreadcrumbSection.querySelector(
          "[data-integration-breadcrumb-wrapper]"
        );

        if (!wrapper || !canUseTrigger(wrapper)) {
          return;
        }

        if (prefersReducedMotion) {
          gsap.set(wrapper, { filter: "blur(0px)", yPercent: 0 });
          return;
        }

        gsap.set(wrapper, {
          filter: "blur(100px)",
          opacity: 0,
          yPercent: 30,
          willChange: "transform, filter, opacity",
        });

        const breadcrumbTl = gsap.timeline({ paused: true });
        breadcrumbTl
          .to(
            wrapper,
            {
              filter: "blur(0px)",
              opacity: 1,
              duration: 0.9,
              ease: easeOutCirc,
            },
            0
          )
          .to(
            wrapper,
            {
              yPercent: 0,
              duration: 0.5,
              ease: easeOutQuad,
            },
            0
          );

        createScrollTrigger({
          trigger: wrapper,
          start: "top 85%",
          onEnter: () => breadcrumbTl.play(),
          onEnterBack: () => breadcrumbTl.play(),
          toggleActions: "play none none none",
        });

        gsap.delayedCall(0.1, () => breadcrumbTl.play(0));
      }
    );

    withSection("[data-integration-details-section]", (detailsSection) => {
      const iconWrap = detailsSection.querySelector(
        "[data-integration-details-icon]"
      );
      const detailsText = detailsSection.querySelector(
        "[data-integration-details-text]"
      );
      const tabsWrap = detailsSection.querySelector(
        "[data-integration-details-tabs]"
      );

      const targets = [iconWrap, detailsText, tabsWrap].filter(
        (target) => target && canUseTrigger(target)
      );

      if (!targets.length) {
        return;
      }

      if (prefersReducedMotion) {
        gsap.set(targets, { filter: "blur(0px)", yPercent: 0 });
        return;
      }

      gsap.set(targets, {
        filter: "blur(100px)",
        opacity: 0,
        yPercent: 30,
        willChange: "transform, filter, opacity",
      });

      const detailsTl = gsap.timeline({ paused: true });
      detailsTl.to(targets, {
        filter: "blur(0px)",
        opacity: 1,
        yPercent: 0,
        duration: 0.9,
        ease: easeOutCirc,
        stagger: 0.12,
      });

      createScrollTrigger({
        trigger: detailsSection,
        start: "top 80%",
        onEnter: () => detailsTl.play(),
        onEnterBack: () => detailsTl.play(),
        toggleActions: "play none none none",
      });
    });

    withSection("[data-sign-up-section]", (signUpSection) => {
      const wrapper = signUpSection.querySelector("[data-sign-up-wrapper]");

      if (!wrapper || !canUseTrigger(wrapper)) {
        return;
      }

      if (prefersReducedMotion) {
        gsap.set(wrapper, { filter: "blur(0px)", yPercent: 0 });
        return;
      }

      gsap.set(wrapper, {
        filter: "blur(100px)",
        opacity: 0,
        yPercent: 30,
        willChange: "transform, filter, opacity",
      });

      const signUpTl = gsap.timeline({ paused: true });
      signUpTl
        .to(
          wrapper,
          {
            filter: "blur(0px)",
            opacity: 1,
            duration: 0.9,
            ease: easeOutCirc,
          },
          0
        )
        .to(
          wrapper,
          {
            yPercent: 0,
            duration: 0.5,
            ease: easeOutQuad,
          },
          0
        );

      createScrollTrigger({
        trigger: wrapper,
        start: "top 85%",
        onEnter: () => signUpTl.play(),
        onEnterBack: () => signUpTl.play(),
        toggleActions: "play none none none",
      });

      gsap.delayedCall(0.1, () => signUpTl.play(0));
    });

    withSection("[data-sign-in-section]", (signInSection) => {
      const wrapper = signInSection.querySelector("[data-sign-in-wrapper]");

      if (!wrapper || !canUseTrigger(wrapper)) {
        return;
      }

      if (prefersReducedMotion) {
        gsap.set(wrapper, { filter: "blur(0px)", yPercent: 0 });
        return;
      }

      gsap.set(wrapper, {
        filter: "blur(100px)",
        opacity: 0,
        yPercent: 30,
        willChange: "transform, filter, opacity",
      });

      const signInTl = gsap.timeline({ paused: true });
      signInTl
        .to(
          wrapper,
          {
            filter: "blur(0px)",
            opacity: 1,
            duration: 0.9,
            ease: easeOutCirc,
          },
          0
        )
        .to(
          wrapper,
          {
            yPercent: 0,
            duration: 0.5,
            ease: easeOutQuad,
          },
          0
        );

      createScrollTrigger({
        trigger: wrapper,
        start: "top 85%",
        onEnter: () => signInTl.play(),
        onEnterBack: () => signInTl.play(),
        toggleActions: "play none none none",
      });

      gsap.delayedCall(0.1, () => signInTl.play(0));
    });

    withSection("[data-hero-v2]", (heroSection) => {
      const eyebrow = heroSection.querySelector("[data-hero-v2-eyebrow]");
      const title = heroSection.querySelector("[data-hero-v2-title]");
      const summary = heroSection.querySelector("[data-hero-v2-summary]");
      const buttonGroup = heroSection.querySelector("[data-hero-v2-buttons]");
      const leftShape = heroSection.querySelector("[data-hero-v2-left-shape]");
      const rightShape = heroSection.querySelector(
        "[data-hero-v2-right-shape]"
      );
      const cards = Array.from(
        heroSection.querySelectorAll("[data-hero-v2-card]")
      );

      if (prefersReducedMotion) {
        if (eyebrow) gsap.set(eyebrow, { filter: "blur(0px)", yPercent: 0, opacity: 1 });
        if (title) gsap.set(title, { filter: "blur(0px)", yPercent: 0, opacity: 1 });
        if (summary) gsap.set(summary, { filter: "blur(0px)", yPercent: 0, opacity: 1 });
        if (buttonGroup) gsap.set(buttonGroup, { filter: "blur(0px)", yPercent: 0, opacity: 1 });
        if (leftShape) gsap.set(leftShape, { opacity: 1 });
        if (rightShape) gsap.set(rightShape, { opacity: 1 });
        if (cards.length) {
          gsap.set(cards, { yPercent: 0, scale: 1, opacity: 1 });
        }
        return;
      }

      [eyebrow, title, summary, buttonGroup].forEach((element) => {
        slideInBlock(element, 50);
      });

      const shapes = [leftShape, rightShape].filter(Boolean);
      if (shapes.length) {
        gsap.set(shapes, { opacity: 0, willChange: "opacity" });
        shapes.forEach((shape) => {
          gsap.set(shape, { y: 8, willChange: "transform, opacity" });
          const floatTween = gsap.to(shape, {
            y: -8,
            duration: 1.2,
            ease: easeStandard,
            repeat: -1,
            yoyo: true,
            paused: true,
          });
          createScrollTrigger({
            trigger: heroSection,
            start: "top 85%",
            onEnter: () =>
              gsap.to(shape, {
                opacity: 1,
                duration: 1,
                ease: "power4.out",
                delay: 0.6,
              }),
            onEnterBack: () =>
              gsap.to(shape, {
                opacity: 1,
                duration: 1,
                ease: "power4.out",
                delay: 0.6,
              }),
            toggleActions: "play none none none",
          });
          createScrollTrigger({
            trigger: shape,
            start: "top 100%",
            onEnter: () => floatTween.play(),
            onEnterBack: () => floatTween.play(),
            onLeave: () => floatTween.pause(),
            onLeaveBack: () => floatTween.pause(),
          });
        });
      }

      if (cards.length) {
        gsap.set(cards, {
          yPercent: -100,
          scale: 0.8,
          opacity: 0,
          willChange: "transform, opacity",
        });

        const cardTl = gsap.timeline({ paused: true });
        cards.forEach((card, index) => {
          const delay = [0, 0.1, 0.15, 0.2][index] ?? index * 0.05;
          cardTl.to(
            card,
            {
              yPercent: 0,
              scale: 1,
              opacity: 1,
              duration: 0.9,
              ease: "back.out(1.7)",
            },
            delay
          );
        });

        createScrollTrigger({
          trigger: heroSection,
          start: "top 90%",
          onEnter: () => cardTl.play(),
          toggleActions: "play none none none",
        });
      }
    });

    withSection("[data-features-v2]", (featuresSection) => {
      const title = featuresSection.querySelector("[data-features-v2-title]");
      const buttonWrap = featuresSection.querySelector(
        "[data-features-v2-button]"
      );
      const cards = Array.from(
        featuresSection.querySelectorAll("[data-features-v2-card]")
      );

      if (prefersReducedMotion) {
        if (title) {
          gsap.set(title, { filter: "blur(0px)", yPercent: 0 });
        }
        if (buttonWrap) {
          gsap.set(buttonWrap, { filter: "blur(0px)", yPercent: 0 });
        }
        const allImageWraps = featuresSection.querySelectorAll(
          "[data-features-v2-image-wrap]"
        );
        gsap.set(allImageWraps, { height: "auto", opacity: 1 });
        return;
      }

      if (title && canUseTrigger(title)) {
        gsap.set(title, {
          filter: "blur(100px)",
          opacity: 0,
          yPercent: 50,
          willChange: "transform, filter, opacity",
        });
        const titleTl = gsap.timeline({ paused: true });
        titleTl
          .to(
            title,
            {
              filter: "blur(0px)",
              opacity: 1,
              duration: 0.9,
              ease: easeOutCirc,
            },
            0
          )
          .to(
            title,
            {
              yPercent: 0,
              duration: 0.5,
              ease: easeOutQuad,
            },
            0
          );
        createScrollTrigger({
          trigger: title,
          start: "top 50%",
          onEnter: () => titleTl.play(),
          toggleActions: "play none none none",
        });
      }

      if (buttonWrap && canUseTrigger(buttonWrap)) {
        gsap.set(buttonWrap, {
          filter: "blur(100px)",
          opacity: 0,
          yPercent: -50,
          willChange: "transform, filter, opacity",
        });
        const buttonTl = gsap.timeline({ paused: true });
        buttonTl
          .to(
            buttonWrap,
            {
              filter: "blur(0px)",
              duration: 0.9,
              ease: easeOutCirc,
            },
            0
          )
          .to(
            buttonWrap,
            {
              yPercent: 0,
              duration: 0.5,
              ease: easeOutQuad,
            },
            0
          );
        createScrollTrigger({
          trigger: buttonWrap,
          start: "top 85%",
          onEnter: () => buttonTl.play(),
          toggleActions: "play none none none",
        });
      }

      cards.forEach((card) => {
        if (!canUseTrigger(card)) {
          return;
        }
        const imageWrap = card.querySelector("[data-features-v2-image-wrap]");
        const image = imageWrap?.querySelector("img") ?? null;
        if (!imageWrap) {
          return;
        }
        gsap.set(imageWrap, {
          clipPath: "inset(0 0 100% 0)",
          webkitClipPath: "inset(0 0 100% 0)",
        });
        if (image) {
          gsap.set(image, { opacity: 0, scale: 1.1 });
        }

        const imageTl = gsap.timeline({ paused: true });
        imageTl.to(imageWrap, {
          clipPath: "inset(0 0 0% 0)",
          webkitClipPath: "inset(0 0 0% 0)",
          duration: 1.2,
          ease: "power2.out",
        });
        if (image) {
          imageTl.to(
            image,
            {
              opacity: 1,
              scale: 1,
              duration: 1,
              ease: "power2.out",
            },
            0.2
          );
        }

        createScrollTrigger({
          trigger: card,
          start: "top 65%",
          onEnter: () => imageTl.play(),
          toggleActions: "play none none none",
        });
      });
    });

    withSection("[data-wcu-v2]", (wcuSection) => {
      const title = wcuSection.querySelector("[data-wcu-v2-title]");
      const summary = wcuSection.querySelector("[data-wcu-v2-summary]");
      const cards = Array.from(
        wcuSection.querySelectorAll("[data-wcu-v2-card]")
      );

      if (prefersReducedMotion) {
        if (title) {
          gsap.set(title, { filter: "blur(0px)", opacity: 1 });
        }
        if (summary) {
          gsap.set(summary, { filter: "blur(0px)", opacity: 1 });
        }
        cards.forEach((card) => {
          gsap.set(card, { filter: "blur(0px)", opacity: 1 });
        });
        return;
      }

      const revealBlur = (target, delay = 0) => {
        if (!target || !canUseTrigger(target)) {
          return;
        }
        gsap.set(target, { filter: "blur(100px)", opacity: 0, willChange: "filter, opacity" });
        createScrollTrigger({
          trigger: target,
          start: "top 85%",
          onEnter: () =>
            gsap.to(target, {
              filter: "blur(0px)",
              opacity: 1,
              duration: 0.9,
              ease: easeOutCirc,
              delay,
            }),
          toggleActions: "play none none none",
        });
      };

      revealBlur(title, 0);
      revealBlur(summary, 0.05);

      cards.forEach((card, index) => {
        const delay = index * 0.1;
        revealBlur(card, delay);
      });
    });

    withSection("[data-growth-v2]", (growthSection) => {
      const titleLoop = growthSection.querySelector("[data-growth-v2-loop]");
      const titleBlocks = Array.from(
        growthSection.querySelectorAll("[data-growth-v2-title-block]")
      );
      const imageOne = growthSection.querySelector(
        '[data-growth-v2-image="one"]'
      );
      const imageTwo = growthSection.querySelector(
        '[data-growth-v2-image="two"]'
      );
      const imageThree = growthSection.querySelector(
        '[data-growth-v2-image="three"]'
      );

      if (prefersReducedMotion) {
        if (titleLoop) {
          gsap.set(titleLoop, { filter: "blur(0px)" });
        }
        if (titleBlocks.length) {
          gsap.set(titleBlocks, {
            opacity: 1,
            y: 0,
            filter: "blur(0px)",
          });
        }
        [imageOne, imageTwo, imageThree].forEach((image) => {
          if (!image) {
            return;
          }
          gsap.set(image, {
            yPercent: 0,
            rotation: 0,
            scale: 1,
            filter: "blur(0px)",
          });
        });
        return;
      }

      if (titleLoop && canUseTrigger(titleLoop)) {
        gsap.set(titleLoop, { filter: "blur(100px)", opacity: 0, willChange: "filter, opacity" });
        gsap.to(titleLoop, {
          filter: "blur(0px)",
          opacity: 1,
          duration: 0.9,
          ease: easeOutCirc,
          scrollTrigger: {
            trigger: titleLoop,
            start: "top 85%",
            toggleActions: "play none none none",
          },
        });
      }

      if (titleLoop && titleBlocks.length) {
        const cycleDuration = 5;
        const fadeDuration = 0.8;
        const holdDuration = Math.max(cycleDuration - fadeDuration * 2, 0);

        gsap.set(titleBlocks, {
          opacity: 0,
          y: 16,
          filter: "blur(6px)",
          willChange: "transform, opacity, filter",
        });

        const loopTl = gsap.timeline({ repeat: -1, paused: true });
        titleBlocks.forEach((title, index) => {
          const startTime = index * cycleDuration;
          loopTl.to(
            title,
            {
              opacity: 1,
              y: 0,
              filter: "blur(0px)",
              duration: fadeDuration,
              ease: easeOutCirc,
            },
            startTime
          );
          loopTl.to(
            title,
            {
              opacity: 0,
              y: 16,
              filter: "blur(6px)",
              duration: fadeDuration,
              ease: "power1.in",
            },
            startTime + fadeDuration + holdDuration
          );
        });

        createScrollTrigger({
          trigger: titleLoop,
          start: "top 85%",
          onEnter: () => loopTl.play(),
          onLeave: () => loopTl.pause(),
          onEnterBack: () => loopTl.play(),
          onLeaveBack: () => loopTl.pause(),
        });
      }

      const growthImages = [imageOne, imageTwo, imageThree].filter(Boolean);
      if (growthImages.length) {
        if (imageOne) {
          gsap.set(imageOne, {
            filter: "blur(3px)",
            scale: 1,
            willChange: "transform, filter",
          });
        }
        if (imageTwo) {
          gsap.set(imageTwo, {
            yPercent: 0,
            rotation: 0,
            filter: "blur(3px)",
            willChange: "transform, filter",
          });
        }
        if (imageThree) {
          gsap.set(imageThree, {
            yPercent: 0,
            rotation: 0,
            willChange: "transform",
          });
        }

        const scrollTl = gsap.timeline({
          scrollTrigger: {
            trigger: growthSection,
            start: "top 90%",
            end: "bottom 30%",
            scrub: 0.95,
          },
        });

        if (imageThree) {
          scrollTl.to(
            imageThree,
            { yPercent: -200, rotation: -20, ease: "none" },
            0.4
          );
        }
        if (imageTwo) {
          scrollTl.to(imageTwo, { filter: "blur(0px)", ease: "none" }, 0.4);
          scrollTl.to(
            imageTwo,
            { yPercent: -200, rotation: 20, ease: "none" },
            0.8
          );
        }
        if (imageOne) {
          scrollTl.to(
            imageOne,
            { filter: "blur(0px)", scale: 1.1, ease: "none" },
            0.8
          );
        }
      }
    });

    withSection("[data-special-v2]", (specialSection) => {
      const blocks = Array.from(
        specialSection.querySelectorAll("[data-special-v2-block]")
      );

      blocks.forEach((block) => {
        if (!canUseTrigger(block)) {
          return;
        }

        const textBlocks = Array.from(
          block.querySelectorAll(
            "[data-special-v2-title], [data-special-v2-summary], [data-special-v2-list], [data-special-v2-button]"
          )
        );
        const images = Array.from(
          block.querySelectorAll("[data-special-v2-image]")
        );

        if (!textBlocks.length && !images.length) {
          return;
        }

        if (prefersReducedMotion) {
          textBlocks.forEach((element) => {
            gsap.set(element, { filter: "blur(0px)", yPercent: 0 });
          });
          images.forEach((image) => {
            gsap.set(image, { filter: "blur(0px)" });
          });
          return;
        }

        textBlocks.forEach((element) => {
          gsap.set(element, {
            filter: "blur(100px)",
            opacity: 0,
            yPercent: 50,
            willChange: "transform, filter, opacity",
          });
        });
        images.forEach((image) => {
          gsap.set(image, { filter: "blur(100px)", opacity: 0, willChange: "filter, opacity" });
        });

        const tl = gsap.timeline({ paused: true });

        if (textBlocks.length) {
          tl.to(
            textBlocks,
            {
              filter: "blur(0px)",
              opacity: 1,
              yPercent: 0,
              duration: 0.9,
              ease: easeOutCirc,
              stagger: 0.12,
            },
            0
          );
        }

        if (images.length) {
          tl.to(
            images,
            {
              filter: "blur(0px)",
              opacity: 1,
              duration: 0.9,
              ease: easeOutCirc,
              stagger: 0.12,
            },
            textBlocks.length ? 0.15 : 0
          );
        }

        createScrollTrigger({
          trigger: block,
          start: "top 85%",
          onEnter: () => tl.play(),
          toggleActions: "play none none none",
        });
      });

      const carousel = specialSection.querySelector("[data-special-v2-carousel]");
      const viewport = specialSection.querySelector("[data-special-v2-viewport]");
      const track = specialSection.querySelector("[data-special-v2-track]");
      const slides = Array.from(
        specialSection.querySelectorAll("[data-special-v2-slide]")
      );
      const dots = Array.from(
        specialSection.querySelectorAll("[data-special-v2-dot]")
      );
      const prevButton = specialSection.querySelector("[data-special-v2-prev]");
      const nextButton = specialSection.querySelector("[data-special-v2-next]");

      if (!carousel || !viewport || !track || !slides.length) {
        return;
      }

      let activeIndex = 0;
      const wrapIndex = gsap.utils.wrap(0, slides.length);
      const transitionDuration = prefersReducedMotion ? 0 : 0.75;

      const setDotState = (dot, isActive) => {
        if (!dot) {
          return;
        }
        if (isActive) {
          dot.dataset.active = "true";
          dot.setAttribute("aria-current", "true");
          dot.style.backgroundColor = "#ffffff";
        } else {
          dot.removeAttribute("data-active");
          dot.removeAttribute("aria-current");
          dot.style.backgroundColor = "";
        }
      };

      const updateSlideState = () => {
        slides.forEach((slide, index) => {
          const isActive = index === activeIndex;
          slide.setAttribute("aria-hidden", isActive ? "false" : "true");
          slide.style.pointerEvents = isActive ? "auto" : "none";
          slide.style.zIndex = isActive ? "1" : "0";
        });
        dots.forEach((dot, index) => {
          setDotState(dot, index === activeIndex);
        });
      };

      const setViewportHeight = () => {
        if (!viewport) {
          return;
        }
        const heights = slides.map((slide) => slide.offsetHeight);
        const maxHeight = Math.max(...heights);
        if (Number.isFinite(maxHeight) && maxHeight > 0) {
          viewport.style.height = `${maxHeight}px`;
        }
      };

      const moveTo = (index, instant = false) => {
        const nextIndex = wrapIndex(index);
        if (nextIndex === activeIndex) {
          return;
        }
        const currentSlide = slides[activeIndex];
        const nextSlide = slides[nextIndex];
        const fadeDuration = instant ? 0 : Math.min(0.35, transitionDuration * 0.5);

        if (currentSlide) {
          gsap.to(currentSlide, {
            opacity: 0,
            duration: fadeDuration,
            ease: "power1.out",
            overwrite: "auto",
          });
        }
        if (nextSlide) {
          gsap.to(nextSlide, {
            opacity: 1,
            duration: fadeDuration,
            ease: "power1.out",
            overwrite: "auto",
          });
        }

        activeIndex = nextIndex;
        updateSlideState();
      };

      gsap.set(track, { willChange: "opacity" });
      slides.forEach((slide, index) => {
        gsap.set(slide, { opacity: index === activeIndex ? 1 : 0, willChange: "opacity" });
      });
      moveTo(activeIndex, true);
      setViewportHeight();

      dots.forEach((dot) => {
        const index = Number(dot.dataset.specialV2Index);
        if (Number.isNaN(index)) {
          return;
        }
        dot.addEventListener("click", () => moveTo(index));
      });

      if (prevButton) {
        prevButton.addEventListener("click", () => moveTo(activeIndex - 1));
      }
      if (nextButton) {
        nextButton.addEventListener("click", () => moveTo(activeIndex + 1));
      }

      window.addEventListener("resize", setViewportHeight, { passive: true });
      window.addEventListener("load", setViewportHeight, { passive: true });
    });

    withSection(".special-features-section", (specialFeaturesSection) => {
      const slideTargets = Array.from(
        specialFeaturesSection.querySelectorAll(
          ".section-title-block, .section-summary-block, .special-features-list-block, .special-features-button-wrap"
        )
      );
      const topImageBlock = specialFeaturesSection.querySelector(
        ".special-features-image-block"
      );
      const topLeftImage = specialFeaturesSection.querySelector(
        ".special-features-top-left-image"
      );
      const topRightImageBlock = specialFeaturesSection.querySelector(
        ".special-features-top-right-image-block"
      );
      const bottomImages = Array.from(
        specialFeaturesSection.querySelectorAll(
          ".special-features-bottom-image-wrap .special-features-bottom-image"
        )
      );
      const lowerImageBlock = specialFeaturesSection.querySelector(
        ".special-features-lower-image-block"
      );
      const lowerLargeImageBlock = specialFeaturesSection.querySelector(
        ".speacial-features-lower-large-image-block"
      );
      const lowerLeftImageBlock = specialFeaturesSection.querySelector(
        ".special-features-lower-left-image-block"
      );
      const lowerRightImageBlock = specialFeaturesSection.querySelector(
        ".special-features-lower-right-image-block"
      );

      const slideStart = "top 85%";
      const imageStart = "top 70%";
      const easeWebflow = "cubic-bezier(0.25, 0.1, 0.25, 1)";

      if (prefersReducedMotion) {
        slideTargets.forEach((target) => {
          gsap.set(target, { filter: "blur(0px)", yPercent: 0 });
        });
        if (topLeftImage) {
          gsap.set(topLeftImage, {
            xPercent: 0,
            yPercent: 0,
            scale: 1,
            opacity: 1,
          });
        }
        if (topRightImageBlock) {
          gsap.set(topRightImageBlock, {
            xPercent: 0,
            y: 0,
            scale: 1,
            opacity: 1,
          });
        }
        if (bottomImages.length) {
          gsap.set(bottomImages, {
            xPercent: 0,
            yPercent: 0,
            scale: 1,
            opacity: 1,
          });
        }
        if (lowerLargeImageBlock) {
          gsap.set(lowerLargeImageBlock, { yPercent: 0, opacity: 1 });
        }
        if (lowerLeftImageBlock) {
          gsap.set(lowerLeftImageBlock, {
            xPercent: 0,
            yPercent: 0,
            opacity: 1,
          });
        }
        if (lowerRightImageBlock) {
          gsap.set(lowerRightImageBlock, {
            xPercent: 0,
            yPercent: 0,
            opacity: 1,
          });
        }
      } else {
        slideTargets.forEach((target) => {
          if (!canUseTrigger(target)) {
            return;
          }
          gsap.set(target, {
            filter: "blur(100px)",
            yPercent: 50,
            willChange: "transform, filter",
          });

          const tl = gsap.timeline({
            scrollTrigger: {
              trigger: target,
              start: slideStart,
              toggleActions: "play none none none",
            },
          });

          tl.to(
            target,
            {
              filter: "blur(0px)",
              duration: 0.9,
              ease: easeOutCirc,
            },
            0
          ).to(
            target,
            {
              yPercent: 0,
              duration: 0.5,
              ease: easeOutQuad,
            },
            0
          );
        });

        if (topImageBlock) {
          if (topLeftImage) {
            gsap.set(topLeftImage, {
              xPercent: -50,
              yPercent: -50,
              scale: 0.5,
              opacity: 0,
              willChange: "transform, opacity",
            });
          }
          if (topRightImageBlock) {
            gsap.set(topRightImageBlock, {
              xPercent: 50,
              y: -50,
              scale: 0.5,
              opacity: 0,
              willChange: "transform, opacity",
            });
          }
          if (bottomImages[0]) {
            gsap.set(bottomImages[0], {
              xPercent: -50,
              yPercent: 50,
              scale: 0.5,
              opacity: 0,
              willChange: "transform, opacity",
            });
          }
          if (bottomImages[1]) {
            gsap.set(bottomImages[1], {
              xPercent: 50,
              yPercent: 50,
              scale: 0.5,
              opacity: 0,
              willChange: "transform, opacity",
            });
          }

          const imageTl = gsap.timeline({ paused: true });

          if (topLeftImage) {
            imageTl.to(
              topLeftImage,
              {
                xPercent: 0,
                yPercent: 0,
                scale: 1,
                duration: 1.2,
                ease: easeWebflow,
              },
              0
            );
            imageTl.to(
              topLeftImage,
              {
                opacity: 1,
                duration: 1.5,
                ease: easeWebflow,
              },
              0
            );
          }
          if (topRightImageBlock) {
            imageTl.to(
              topRightImageBlock,
              {
                xPercent: 0,
                y: 0,
                scale: 1,
                duration: 1.2,
                ease: easeWebflow,
              },
              0
            );
            imageTl.to(
              topRightImageBlock,
              {
                opacity: 1,
                duration: 1.5,
                ease: easeWebflow,
              },
              0
            );
          }
          if (bottomImages[0]) {
            imageTl.to(
              bottomImages[0],
              {
                xPercent: 0,
                yPercent: 0,
                scale: 1,
                duration: 1.2,
                ease: easeWebflow,
              },
              0
            );
            imageTl.to(
              bottomImages[0],
              {
                opacity: 1,
                duration: 1.5,
                ease: easeWebflow,
              },
              0
            );
          }
          if (bottomImages[1]) {
            imageTl.to(
              bottomImages[1],
              {
                xPercent: 0,
                yPercent: 0,
                scale: 1,
                duration: 1.2,
                ease: easeWebflow,
              },
              0
            );
            imageTl.to(
              bottomImages[1],
              {
                opacity: 1,
                duration: 1.5,
                ease: easeWebflow,
              },
              0
            );
          }

          createScrollTrigger({
            trigger: topImageBlock,
            start: imageStart,
            onEnter: () => imageTl.play(),
            toggleActions: "play none none none",
          });
        }

        if (lowerImageBlock) {
          if (lowerRightImageBlock) {
            gsap.set(lowerRightImageBlock, {
              xPercent: 50,
              yPercent: 50,
              opacity: 0,
              willChange: "transform, opacity",
            });
          }
          if (lowerLeftImageBlock) {
            gsap.set(lowerLeftImageBlock, {
              xPercent: -50,
              yPercent: 50,
              opacity: 0,
              willChange: "transform, opacity",
            });
          }
          if (lowerLargeImageBlock) {
            gsap.set(lowerLargeImageBlock, {
              yPercent: -50,
              opacity: 0,
              willChange: "transform, opacity",
            });
          }

          const lowerTl = gsap.timeline({ paused: true });

          if (lowerRightImageBlock) {
            lowerTl.to(
              lowerRightImageBlock,
              {
                xPercent: 0,
                yPercent: 0,
                opacity: 1,
                duration: 0.9,
                ease: easeOutQuad,
              },
              0
            );
          }
          if (lowerLeftImageBlock) {
            lowerTl.to(
              lowerLeftImageBlock,
              {
                xPercent: 0,
                yPercent: 0,
                opacity: 1,
                duration: 0.9,
                ease: easeOutQuad,
              },
              0
            );
          }
          if (lowerLargeImageBlock) {
            lowerTl.to(
              lowerLargeImageBlock,
              {
                yPercent: 0,
                opacity: 1,
                duration: 0.9,
                ease: easeOutQuad,
              },
              0
            );
          }

          createScrollTrigger({
            trigger: lowerImageBlock,
            start: imageStart,
            onEnter: () => lowerTl.play(),
            toggleActions: "play none none none",
          });
        }
      }
    });

    withSection(".integrations-section", (integrationsSection) => {
      const integrationSlideTargets = Array.from(
        integrationsSection.querySelectorAll(
          ".section-title-block, .section-summary-block, .integration-button-group"
        )
      );
      const integrationsWrapper = integrationsSection.querySelector(
        ".integrations-wrapper"
      );
      const leftColumn = integrationsSection.querySelector(
        ".integrations-left-column"
      );
      const rightColumn = integrationsSection.querySelector(
        ".integrations-right-column"
      );
      const middleColumn = integrationsSection.querySelector(
        ".integration-middle-column"
      );
      const leftTopBorder = integrationsSection.querySelector(
        ".integration-left-top-border"
      );
      const leftBottomBorder = integrationsSection.querySelector(
        ".integration-left-bottom-border"
      );
      const rightTopBorder = integrationsSection.querySelector(
        ".integration-right-top-border"
      );
      const rightBottomBorder = integrationsSection.querySelector(
        ".integration-right-bottom-border"
      );
      const iconBlocks = Array.from(
        integrationsSection.querySelectorAll(".integration-icon-block")
      );

      const slideStart = "top 85%";
      const wrapperStart = "top 60%";

      if (prefersReducedMotion) {
        integrationSlideTargets.forEach((target) => {
          gsap.set(target, { filter: "blur(0px)", yPercent: 0 });
        });
        if (leftColumn) {
          gsap.set(leftColumn, { scaleY: 1 });
        }
        if (rightColumn) {
          gsap.set(rightColumn, { scaleY: 1 });
        }
        if (middleColumn) {
          gsap.set(middleColumn, { scaleX: 1 });
        }
        if (leftTopBorder) {
          gsap.set(leftTopBorder, { scaleX: 1 });
        }
        if (leftBottomBorder) {
          gsap.set(leftBottomBorder, { scaleX: 1 });
        }
        if (rightTopBorder) {
          gsap.set(rightTopBorder, { scaleX: 1 });
        }
        if (rightBottomBorder) {
          gsap.set(rightBottomBorder, { scaleX: 1 });
        }
        if (iconBlocks.length) {
          gsap.set(iconBlocks, { scale: 1, opacity: 1 });
        }
      } else {
        integrationSlideTargets.forEach((target) => {
          if (!canUseTrigger(target)) {
            return;
          }

          gsap.set(target, {
            filter: "blur(100px)",
            yPercent: 50,
            willChange: "transform, filter",
          });

          const tl = gsap.timeline({
            scrollTrigger: {
              trigger: target,
              start: slideStart,
              toggleActions: "play none none none",
            },
          });

          tl.to(
            target,
            {
              filter: "blur(0px)",
              duration: 0.9,
              ease: easeOutCirc,
            },
            0
          ).to(
            target,
            {
              yPercent: 0,
              duration: 0.5,
              ease: easeOutQuad,
            },
            0
          );
        });

        if (integrationsWrapper && canUseTrigger(integrationsWrapper)) {
          if (leftColumn) {
            gsap.set(leftColumn, {
              scaleY: 0,
              transformOrigin: "50% 50%",
              willChange: "transform",
            });
          }
          if (rightColumn) {
            gsap.set(rightColumn, {
              scaleY: 0,
              transformOrigin: "50% 50%",
              willChange: "transform",
            });
          }
          if (middleColumn) {
            gsap.set(middleColumn, {
              scaleX: 0,
              transformOrigin: "50% 50%",
              willChange: "transform",
            });
          }
          if (leftTopBorder) {
            gsap.set(leftTopBorder, {
              scaleX: 0,
              transformOrigin: "50% 50%",
              willChange: "transform",
            });
          }
          if (leftBottomBorder) {
            gsap.set(leftBottomBorder, {
              scaleX: 0,
              transformOrigin: "50% 50%",
              willChange: "transform",
            });
          }
          if (rightTopBorder) {
            gsap.set(rightTopBorder, {
              scaleX: 0,
              transformOrigin: "50% 50%",
              willChange: "transform",
            });
          }
          if (rightBottomBorder) {
            gsap.set(rightBottomBorder, {
              scaleX: 0,
              transformOrigin: "50% 50%",
              willChange: "transform",
            });
          }
          if (iconBlocks.length) {
            gsap.set(iconBlocks, {
              scale: 0,
              opacity: 0,
              transformOrigin: "50% 50%",
              willChange: "transform, opacity",
            });
          }

          const integrationTl = gsap.timeline({
            scrollTrigger: {
              trigger: integrationsWrapper,
              start: wrapperStart,
              toggleActions: "play none none none",
            },
          });

          if (middleColumn) {
            integrationTl.to(
              middleColumn,
              {
                scaleX: 1,
                duration: 1.2,
                ease: easeOutBack,
              },
              0
            );
          }
          if (leftColumn) {
            integrationTl.to(
              leftColumn,
              {
                scaleY: 1,
                duration: 1.2,
                ease: easeOutBack,
              },
              0
            );
          }
          if (rightColumn) {
            integrationTl.to(
              rightColumn,
              {
                scaleY: 1,
                duration: 1.2,
                ease: easeOutBack,
              },
              0
            );
          }

          const borderTargets = [
            leftTopBorder,
            leftBottomBorder,
            rightTopBorder,
            rightBottomBorder,
          ].filter(Boolean);

          if (borderTargets.length || iconBlocks.length) {
            integrationTl.addLabel("borders", ">");

            if (borderTargets.length) {
              integrationTl.to(
                borderTargets,
                {
                  scaleX: 1,
                  duration: 0.8,
                  ease: easeOutBack,
                },
                "borders"
              );
            }

            if (iconBlocks.length) {
              integrationTl.to(
                iconBlocks,
                {
                  scale: 1,
                  duration: 0.8,
                  ease: easeOutBack,
                },
                "borders+=0.3"
              );
              integrationTl.to(
                iconBlocks,
                {
                  opacity: 1,
                  duration: 0.5,
                  ease: easeStandard,
                },
                "borders+=0.3"
              );
            }
          }
        }
      }
    });

    withSection("[data-integration-page]", (integrationSection) => {
      const headingBlock = integrationSection.querySelector(
        "[data-integration-page-heading]"
      );
      const cards = Array.from(
        integrationSection.querySelectorAll("[data-integration-page-card]")
      );

      if (prefersReducedMotion) {
        if (headingBlock) {
          gsap.set(headingBlock, { filter: "blur(0px)", yPercent: 0 });
        }
        if (cards.length) {
          gsap.set(cards, { filter: "blur(0px)", yPercent: 0, opacity: 1 });
        }
        return;
      }

      if (headingBlock && canUseTrigger(headingBlock)) {
        gsap.set(headingBlock, {
          filter: "blur(100px)",
          yPercent: 50,
          willChange: "transform, filter",
        });

        const headingTl = gsap.timeline({ paused: true });
        headingTl
          .to(
            headingBlock,
            {
              filter: "blur(0px)",
              opacity: 1,
              duration: 0.9,
              ease: easeOutCirc,
            },
            0
          )
          .to(
            headingBlock,
            {
              yPercent: 0,
              duration: 0.5,
              ease: easeOutQuad,
            },
            0
          );

        createScrollTrigger({
          trigger: headingBlock,
          start: "top 85%",
          onEnter: () => headingTl.play(),
          onEnterBack: () => headingTl.play(),
          toggleActions: "play none none none",
        });
      }

      if (cards.length) {
        cards.forEach((card) => {
          if (!canUseTrigger(card)) {
            return;
          }
          gsap.set(card, {
            filter: "blur(40px)",
            yPercent: 15,
            opacity: 0,
            willChange: "transform, filter, opacity",
          });
        });

        const getBatchMax = () => {
          if (window.matchMedia("(min-width: 1280px)").matches) {
            return 3;
          }
          if (window.matchMedia("(min-width: 768px)").matches) {
            return 2;
          }
          return 1;
        };

        const revealCard = (card) => {
          if (!card || card.dataset.revealed === "true") {
            return;
          }
          card.dataset.revealed = "true";

          gsap.to(card, {
            filter: "blur(0px)",
            yPercent: 0,
            opacity: 1,
            duration: 0.7,
            ease: easeOutCirc,
            overwrite: "auto",
          });
        };

        ScrollTrigger.batch(cards, {
          start: "top 85%",
          batchMax: getBatchMax(),
          onEnter: (batch) => batch.forEach(revealCard),
          onEnterBack: (batch) => batch.forEach(revealCard),
        });

        const showInitialBatch = () => {
          const initialCount = getBatchMax();
          cards.slice(0, initialCount).forEach(revealCard);
        };

        requestAnimationFrame(showInitialBatch);
        window.addEventListener("load", showInitialBatch, { once: true });
      }
    });

    withSection(
      "section[class*='testmonial-bg.png']",
      (testimonialsSection) => {
        const grid = testimonialsSection.querySelector(".grid");
        const headingBlock = grid?.children[0] ?? null;
        const contentBlock = grid?.children[1] ?? null;
        const innerBlocks = contentBlock
          ? Array.from(contentBlock.children).filter(
            (child) =>
              child instanceof HTMLElement &&
              child.classList.contains("flex") &&
              child.classList.contains("flex-col")
          )
          : [];

        const slideStart = "top 85%";
        const loopStart = "top 100%";

        if (prefersReducedMotion) {
          if (headingBlock) {
            gsap.set(headingBlock, { filter: "blur(0px)", yPercent: 0 });
          }
          if (innerBlocks.length) {
            gsap.set(innerBlocks, { yPercent: 0 });
          }
        } else {
          if (headingBlock && canUseTrigger(headingBlock)) {
            gsap.set(headingBlock, {
              filter: "blur(100px)",
              yPercent: 50,
              willChange: "transform, filter",
            });

            const headingTl = gsap.timeline({
              scrollTrigger: {
                trigger: headingBlock,
                start: slideStart,
                toggleActions: "play none none none",
              },
            });

            headingTl
              .to(
                headingBlock,
                {
                  filter: "blur(0px)",
                  duration: 0.9,
                  ease: easeOutCirc,
                },
                0
              )
              .to(
                headingBlock,
                {
                  yPercent: 0,
                  duration: 0.5,
                  ease: easeOutQuad,
                },
                0
              );
          }

          if (
            contentBlock &&
            innerBlocks.length &&
            canUseTrigger(contentBlock)
          ) {
            const loopTl = gsap.timeline({ repeat: -1, paused: true });
            loopTl.set(innerBlocks, {
              yPercent: 0,
              willChange: "transform",
            });
            loopTl.to(innerBlocks, {
              yPercent: -100,
              duration: 20,
              ease: "none",
            });

            createScrollTrigger({
              trigger: contentBlock,
              start: loopStart,
              onEnter: () => loopTl.play(),
              onLeave: () => loopTl.pause(),
              onEnterBack: () => loopTl.play(),
              onLeaveBack: () => loopTl.pause(),
            });

            contentBlock.addEventListener("mouseenter", () => loopTl.pause());
            contentBlock.addEventListener("mouseleave", () => loopTl.play());
          }
        }
      }
    );

    withSection("[data-testimonials-v2]", (testimonialsSection) => {
      const heading = testimonialsSection.querySelector(
        "[data-testimonials-v2-heading]"
      );
      const viewport = testimonialsSection.querySelector(
        "[data-testimonials-v2-viewport]"
      );
      const track = testimonialsSection.querySelector(
        "[data-testimonials-v2-track]"
      );
      const slides = Array.from(
        testimonialsSection.querySelectorAll("[data-testimonials-v2-slide]")
      );
      const prevButton = testimonialsSection.querySelector(
        "[data-testimonials-v2-prev]"
      );
      const nextButton = testimonialsSection.querySelector(
        "[data-testimonials-v2-next]"
      );

      if (!viewport || !track || !slides.length) {
        return;
      }

      if (prefersReducedMotion) {
        if (heading) {
          gsap.set(heading, { filter: "blur(0px)", yPercent: 0 });
        }
        slides.forEach((slide) => {
          gsap.set(slide, { filter: "blur(0px)", yPercent: 0, opacity: 1 });
        });
      } else {
        if (heading) {
          gsap.set(heading, {
            filter: "blur(100px)",
            yPercent: 40,
            willChange: "transform, filter",
          });
        }
        slides.forEach((slide) => {
          gsap.set(slide, {
            filter: "blur(100px)",
            yPercent: 40,
            opacity: 0,
            willChange: "transform, filter, opacity",
          });
        });

        const revealTl = gsap.timeline({ paused: true });
        if (heading) {
          revealTl.to(heading, {
            filter: "blur(0px)",
            yPercent: 0,
            duration: 0.8,
            ease: easeOutCirc,
          });
        }
        if (slides.length) {
          revealTl.to(
            slides,
            {
              filter: "blur(0px)",
              yPercent: 0,
              opacity: 1,
              duration: 0.8,
              ease: easeOutCirc,
              stagger: 0.12,
            },
            heading ? 0.1 : 0
          );
        }

        createScrollTrigger({
          trigger: testimonialsSection,
          start: "top 85%",
          onEnter: () => revealTl.play(),
          onEnterBack: () => revealTl.play(),
          toggleActions: "play none none none",
        });
      }

      let slidePositions = [];
      let activeIndex = slides.length > 2 ? 1 : 0;
      const activeBg = "rgb(14, 21, 34)";

      const clampIndex = gsap.utils.wrap(0, slides.length);

      const setActiveSlide = (index) => {
        slides.forEach((slide, slideIndex) => {
          const article = slide.querySelector("article");
          if (!article) {
            return;
          }
          article.style.backgroundColor = slideIndex === index ? activeBg : "";
        });
      };

      const computePositions = () => {
        gsap.set(track, { x: 0 });
        const viewportRect = viewport.getBoundingClientRect();
        const trackRect = track.getBoundingClientRect();

        slidePositions = slides.map((slide) => {
          const rect = slide.getBoundingClientRect();
          const centerInTrack = rect.left - trackRect.left + rect.width / 2;
          return viewportRect.width / 2 - centerInTrack;
        });
      };

      const moveTo = (index, instant = false) => {
        if (!slidePositions.length) {
          return;
        }
        activeIndex = clampIndex(index);
        const xValue = slidePositions[activeIndex];
        gsap.to(track, {
          x: xValue,
          duration: instant || prefersReducedMotion ? 0 : 0.9,
          ease: easeOutCirc,
        });
        setActiveSlide(activeIndex);
      };

      const refresh = () => {
        computePositions();
        moveTo(activeIndex, true);
      };

      computePositions();
      gsap.set(track, { willChange: "transform" });
      moveTo(activeIndex, true);

      if (prevButton) {
        prevButton.addEventListener("click", () => moveTo(activeIndex - 1));
      }
      if (nextButton) {
        nextButton.addEventListener("click", () => moveTo(activeIndex + 1));
      }

      window.addEventListener("resize", refresh, { passive: true });
    });

    withSection("section[class*='blog-bg.png']", (blogSection) => {
      const headingWrap = blogSection.querySelector(
        ".flex.flex-col.items-center.text-center"
      );
      const titleBlock =
        headingWrap?.querySelector("h2")?.parentElement ?? null;
      const summaryBlock =
        headingWrap?.querySelector("p")?.parentElement ?? null;
      const articles = Array.from(blogSection.querySelectorAll("article"));
      const fadeTargets = [];

      articles.forEach((article) => {
        const row = article.querySelector("div.flex");
        if (!row) {
          return;
        }
        const leftGroup = row.querySelector(
          ".flex.flex-wrap.items-center.gap-5"
        );
        const contentBlock = leftGroup?.firstElementChild ?? null;
        const imageBlock = leftGroup?.querySelector("div.overflow-hidden");
        const buttonWrap = row.querySelector("div.flex-none");

        if (contentBlock instanceof HTMLElement) {
          fadeTargets.push(contentBlock);
        }
        if (imageBlock instanceof HTMLElement) {
          fadeTargets.push(imageBlock);
        }
        if (buttonWrap instanceof HTMLElement) {
          fadeTargets.push(buttonWrap);
        }
      });

      const slideStart = "top 85%";
      const fadeStart = "top 85%";
      const fadeDelay = 0.6;
      const fadeDuration = 1;
      const fadeEase = "power4.out";

      if (prefersReducedMotion) {
        if (titleBlock) {
          gsap.set(titleBlock, { filter: "blur(0px)", yPercent: 0 });
        }
        if (summaryBlock) {
          gsap.set(summaryBlock, { filter: "blur(0px)", yPercent: 0 });
        }
        if (fadeTargets.length) {
          gsap.set(fadeTargets, { opacity: 1 });
        }
        return;
      }

      [titleBlock, summaryBlock].forEach((target) => {
        if (!target || !canUseTrigger(target)) {
          return;
        }

        gsap.set(target, {
          filter: "blur(100px)",
          yPercent: 50,
          willChange: "transform, filter",
        });

        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: target,
            start: slideStart,
            toggleActions: "play none none none",
          },
        });

        tl.to(
          target,
          {
            filter: "blur(0px)",
            duration: 0.9,
            ease: easeOutCirc,
          },
          0
        ).to(
          target,
          {
            yPercent: 0,
            duration: 0.5,
            ease: easeOutQuad,
          },
          0
        );
      });

      fadeTargets.forEach((target) => {
        if (!canUseTrigger(target)) {
          return;
        }

        gsap.set(target, { opacity: 0, willChange: "opacity" });

        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: target,
            start: fadeStart,
            toggleActions: "play none none none",
          },
        });

        tl.to(target, {
          opacity: 1,
          duration: fadeDuration,
          ease: fadeEase,
          delay: fadeDelay,
        });
      });
    });

    withSection("[data-blog-v3]", (blogSection) => {
      const heading = blogSection.querySelector("[data-blog-v3-heading]");
      const summary = blogSection.querySelector("[data-blog-v3-summary]");
      const filterWrap = blogSection.querySelector("[data-blog-v3-filters]");
      const cards = Array.from(
        blogSection.querySelectorAll("[data-blog-v3-card]")
      );
      const images = Array.from(
        blogSection.querySelectorAll("[data-blog-v3-image]")
      );
      const contents = Array.from(
        blogSection.querySelectorAll("[data-blog-v3-content]")
      );

      if (prefersReducedMotion) {
        [heading, summary, filterWrap].forEach((element) => {
          if (element) {
            gsap.set(element, { filter: "blur(0px)", yPercent: 0, opacity: 1 });
          }
        });
        [...cards, ...images, ...contents].forEach((element) => {
          if (element) {
            gsap.set(element, {
              filter: "blur(0px)",
              yPercent: 0,
              opacity: 1,
              scale: 1,
            });
          }
        });
        return;
      }

      if (heading) {
        slideInBlock(heading, 50);
      }
      if (summary) {
        slideInBlock(summary, -50);
      }

      if (filterWrap && canUseTrigger(filterWrap)) {
        gsap.set(filterWrap, {
          filter: "blur(100px)",
          yPercent: 20,
          opacity: 0,
          willChange: "transform, filter, opacity",
        });

        const filterTl = gsap.timeline({ paused: true });
        filterTl.to(filterWrap, {
          filter: "blur(0px)",
          yPercent: 0,
          opacity: 1,
          duration: 0.7,
          ease: easeOutCirc,
        });

        createScrollTrigger({
          trigger: filterWrap,
          start: "top 85%",
          onEnter: () => filterTl.play(),
          onEnterBack: () => filterTl.play(),
          toggleActions: "play none none none",
        });
      }

      const disableCardReveal = blogSection.hasAttribute(
        "data-blog-v3-no-reveal"
      );

      if (disableCardReveal) {
        [...cards, ...images, ...contents].forEach((element) => {
          if (!element) {
            return;
          }
          gsap.set(element, {
            filter: "blur(0px)",
            yPercent: 0,
            opacity: 1,
            scale: 1,
            clearProps: "filter,transform,opacity",
          });
        });
        return;
      }

      cards.forEach((card) => {
        if (!canUseTrigger(card)) {
          return;
        }
        gsap.set(card, {
          filter: "blur(40px)",
          yPercent: 15,
          opacity: 0,
          willChange: "transform, filter, opacity",
        });
      });

      images.forEach((image) => {
        if (!canUseTrigger(image)) {
          return;
        }
        gsap.set(image, {
          filter: "blur(20px)",
          scale: 1.03,
          willChange: "transform, filter",
        });
      });

      contents.forEach((content) => {
        if (!canUseTrigger(content)) {
          return;
        }
        gsap.set(content, {
          filter: "blur(20px)",
          yPercent: 10,
          opacity: 0,
          willChange: "transform, filter, opacity",
        });
      });

      if (!cards.length) {
        return;
      }

      const getBatchMax = () => {
        if (window.matchMedia("(min-width: 1280px)").matches) {
          return 3;
        }
        if (window.matchMedia("(min-width: 768px)").matches) {
          return 2;
        }
        return 1;
      };

      const revealCard = (card) => {
        if (!card || card.dataset.revealed === "true") {
          return;
        }
        card.dataset.revealed = "true";

        const image = card.querySelector("[data-blog-v3-image]");
        const content = card.querySelector("[data-blog-v3-content]");

        gsap.to(card, {
          filter: "blur(0px)",
          yPercent: 0,
          opacity: 1,
          duration: 0.7,
          ease: easeOutCirc,
          overwrite: "auto",
        });

        if (image) {
          gsap.to(image, {
            filter: "blur(0px)",
            scale: 1,
            duration: 0.7,
            ease: easeOutCirc,
            overwrite: "auto",
          });
        }

        if (content) {
          gsap.to(content, {
            filter: "blur(0px)",
            yPercent: 0,
            opacity: 1,
            duration: 0.7,
            ease: easeOutCirc,
            overwrite: "auto",
          });
        }
      };

      ScrollTrigger.batch(cards, {
        start: "top 85%",
        batchMax: getBatchMax(),
        onEnter: (batch) => batch.forEach(revealCard),
        onEnterBack: (batch) => batch.forEach(revealCard),
      });

      const showInitialBatch = () => {
        const initialCount = getBatchMax();
        cards.slice(0, initialCount).forEach(revealCard);
      };

      requestAnimationFrame(showInitialBatch);
      window.addEventListener("load", showInitialBatch, { once: true });
    });

    withSection("[data-blog-v2]", (blogSection) => {
      const heading = blogSection.querySelector("[data-blog-v2-heading]");
      const summary = blogSection.querySelector("[data-blog-v2-summary]");
      const articles = Array.from(
        blogSection.querySelectorAll("[data-blog-v2-article]")
      );
      const images = Array.from(
        blogSection.querySelectorAll("[data-blog-v2-image]")
      );
      const contents = Array.from(
        blogSection.querySelectorAll("[data-blog-v2-content]")
      );

      if (prefersReducedMotion) {
        [heading, summary].forEach((element) => {
          if (element) {
            gsap.set(element, { filter: "blur(0px)", yPercent: 0 });
          }
        });
        [...articles, ...images, ...contents].forEach((element) => {
          if (element) {
            gsap.set(element, { filter: "blur(0px)", yPercent: 0, opacity: 1 });
          }
        });
        return;
      }

      if (heading) {
        slideInBlock(heading, 50);
      }
      if (summary) {
        slideInBlock(summary, 30);
      }

      articles.forEach((article) => {
        if (!canUseTrigger(article)) {
          return;
        }
        gsap.set(article, {
          filter: "blur(40px)",
          yPercent: 15,
          opacity: 0,
          willChange: "transform, filter, opacity",
        });
      });

      images.forEach((image) => {
        if (!canUseTrigger(image)) {
          return;
        }
        gsap.set(image, {
          filter: "blur(20px)",
          scale: 1.03,
          willChange: "transform, filter",
        });
      });

      contents.forEach((content) => {
        if (!canUseTrigger(content)) {
          return;
        }
        gsap.set(content, {
          filter: "blur(20px)",
          yPercent: 10,
          opacity: 0,
          willChange: "transform, filter, opacity",
        });
      });

      const revealTl = gsap.timeline({ paused: true });

      if (articles.length) {
        revealTl.to(articles, {
          filter: "blur(0px)",
          yPercent: 0,
          opacity: 1,
          duration: 0.7,
          ease: easeOutCirc,
          stagger: 0.12,
        });
      }

      if (images.length) {
        revealTl.to(
          images,
          {
            filter: "blur(0px)",
            scale: 1,
            duration: 0.7,
            ease: easeOutCirc,
            stagger: 0.12,
          },
          0
        );
      }

      if (contents.length) {
        revealTl.to(
          contents,
          {
            filter: "blur(0px)",
            yPercent: 0,
            opacity: 1,
            duration: 0.7,
            ease: easeOutCirc,
            stagger: 0.12,
          },
          0.1
        );
      }

      createScrollTrigger({
        trigger: blogSection,
        start: "top 85%",
        onEnter: () => revealTl.play(),
        onEnterBack: () => revealTl.play(),
        toggleActions: "play none none none",
      });
    });

    withSection("[data-cta-v2]", (ctaSection) => {
      const content = ctaSection.querySelector("[data-cta-v2-content]");
      const buttonWrap = ctaSection.querySelector("[data-cta-v2-button]");
      const images = Array.from(
        ctaSection.querySelectorAll("[data-cta-v2-image]")
      );
      const buttonOverlay = buttonWrap?.querySelector(
        ".button-animation-overlay"
      );

      if (prefersReducedMotion) {
        if (content) {
          gsap.set(content, { filter: "blur(0px)" });
        }
        if (buttonOverlay) {
          gsap.set(buttonOverlay, { xPercent: 0, opacity: 1 });
        }
        images.forEach((image) => {
          gsap.set(image, { opacity: 1 });
        });
        return;
      }

      if (content) {
        gsap.set(content, {
          filter: "blur(100px)",
          willChange: "filter",
        });
      }
      if (buttonOverlay) {
        gsap.set(buttonOverlay, { xPercent: -100, opacity: 0 });
      }
      images.forEach((image) => {
        if (!canUseTrigger(image)) {
          return;
        }
        gsap.set(image, {
          opacity: 0,
          willChange: "opacity",
        });
      });

      const revealTl = gsap.timeline({ paused: true });
      if (content) {
        revealTl.to(content, {
          filter: "blur(0px)",
          duration: 0.6,
          ease: easeOutCirc,
        });
      }
      if (buttonOverlay) {
        revealTl.to(
          buttonOverlay,
          {
            xPercent: 0,
            opacity: 1,
            duration: 0.4,
            ease: easeOutQuad,
          },
          0.1
        );
      }
      if (images.length) {
        revealTl.to(
          images,
          {
            opacity: 1,
            duration: 0.5,
            ease: easeOutCirc,
            stagger: 0.1,
          },
          0.2
        );
      }

      createScrollTrigger({
        trigger: ctaSection,
        start: "top 85%",
        onEnter: () => revealTl.play(),
        onEnterBack: () => revealTl.play(),
        toggleActions: "play none none none",
      });
    });

    withSection("[data-cta-video]", (ctaSection) => {
      const content = ctaSection.querySelector("[data-cta-video-content]");
      const buttonWrap = ctaSection.querySelector("[data-cta-video-button]");
      const buttonOverlay = buttonWrap?.querySelector(
        ".button-animation-overlay"
      );

      if (prefersReducedMotion) {
        if (content) {
          gsap.set(content, { filter: "blur(0px)", yPercent: 0 });
        }
        if (buttonOverlay) {
          gsap.set(buttonOverlay, { xPercent: 0, opacity: 1 });
        }
        return;
      }

      if (content) {
        gsap.set(content, {
          filter: "blur(100px)",
          yPercent: 50,
          willChange: "transform, filter",
        });
      }
      if (buttonOverlay) {
        gsap.set(buttonOverlay, { xPercent: -100, opacity: 0 });
      }

      const revealTl = gsap.timeline({ paused: true });
      if (content) {
        revealTl
          .to(
            content,
            {
              filter: "blur(0px)",
              duration: 0.7,
              ease: easeOutCirc,
            },
            0
          )
          .to(
            content,
            {
              yPercent: 0,
              duration: 0.5,
              ease: easeOutQuad,
            },
            0
          );
      }
      if (buttonOverlay) {
        revealTl.to(
          buttonOverlay,
          {
            xPercent: 0,
            opacity: 1,
            duration: 0.4,
            ease: easeOutQuad,
          },
          0.15
        );
      }

      createScrollTrigger({
        trigger: ctaSection,
        start: "top 85%",
        onEnter: () => revealTl.play(),
        onEnterBack: () => revealTl.play(),
        toggleActions: "play none none none",
      });
    });

    withSection("[data-feature-hero]", (featureSection) => {
      const heading = featureSection.querySelector(
        "[data-feature-hero-heading]"
      );
      const leftBlock = featureSection.querySelector(
        "[data-feature-hero-left]"
      );
      const rightBlock = featureSection.querySelector(
        "[data-feature-hero-right]"
      );
      const followers = Array.from(
        featureSection.querySelectorAll("[data-feature-hero-follower]")
      );
      const arrow = featureSection.querySelector("[data-feature-hero-arrow]");

      if (prefersReducedMotion) {
        if (heading) {
          gsap.set(heading, { filter: "blur(0px)" });
        }
        if (leftBlock) {
          gsap.set(leftBlock, { xPercent: 0, yPercent: 0 });
        }
        if (rightBlock) {
          gsap.set(rightBlock, { xPercent: 0, yPercent: 0 });
        }
        followers.forEach((image) => {
          gsap.set(image, { opacity: 1 });
        });
        if (arrow) {
          gsap.set(arrow, { opacity: 1 });
        }
        return;
      }

      if (heading) {
        gsap.set(heading, { filter: "blur(100px)", opacity: 0, willChange: "filter, opacity" });
      }
      if (leftBlock) {
        gsap.set(leftBlock, {
          xPercent: 20,
          yPercent: 0,
          opacity: 0,
          willChange: "transform, opacity",
        });
      }
      if (rightBlock) {
        gsap.set(rightBlock, {
          xPercent: -40,
          yPercent: -40,
          opacity: 0,
          willChange: "transform, opacity",
        });
      }
      followers.forEach((image) => {
        if (!canUseTrigger(image)) {
          return;
        }
        gsap.set(image, { opacity: 0, willChange: "opacity" });
      });
      if (arrow) {
        gsap.set(arrow, { opacity: 0, willChange: "opacity" });
      }

      const revealTl = gsap.timeline({ paused: true });
      if (heading) {
        revealTl.to(heading, {
          filter: "blur(0px)",
          opacity: 1,
          duration: 0.8,
          ease: easeOutCirc,
        });
      }
      if (leftBlock) {
        revealTl.to(
          leftBlock,
          {
            xPercent: 0,
            yPercent: 0,
            opacity: 1,
            duration: 0.8,
            ease: easeOutQuad,
          },
          0.1
        );
      }
      if (rightBlock) {
        revealTl.to(
          rightBlock,
          {
            xPercent: 0,
            yPercent: 0,
            opacity: 1,
            duration: 0.8,
            ease: easeOutQuad,
          },
          0.15
        );
      }
      if (arrow) {
        revealTl.to(
          arrow,
          {
            opacity: 1,
            duration: 0.5,
            ease: easeOutQuad,
          },
          0.2
        );
      }
      if (followers.length) {
        revealTl.to(
          followers,
          {
            opacity: 1,
            duration: 0.5,
            ease: easeOutQuad,
            stagger: 0.1,
          },
          0.25
        );
      }

      createScrollTrigger({
        trigger: featureSection,
        start: "top 85%",
        onEnter: () => revealTl.play(),
        onEnterBack: () => revealTl.play(),
        toggleActions: "play none none none",
      });

      if (arrow && canUseTrigger(arrow)) {
        const floatTween = gsap.to(arrow, {
          y: -12,
          duration: 1,
          ease: easeStandard,
          repeat: -1,
          yoyo: true,
          paused: true,
        });

        createScrollTrigger({
          trigger: arrow,
          start: "top 90%",
          onEnter: () => floatTween.play(),
          onEnterBack: () => floatTween.play(),
          onLeave: () => floatTween.pause(),
          onLeaveBack: () => floatTween.pause(),
        });
      }
    });

    withSection(".partner-section", (partnerSection) => {
      const partnerLogoWrapper = partnerSection.querySelector(
        ".partner-logo-wrapper"
      );
      const partnerTracks =
        partnerSection.querySelectorAll(".partner-logo-wrap");

      if (prefersReducedMotion) {
        gsap.set(partnerSection, { filter: "blur(0px)" });
        if (partnerTracks.length) {
          gsap.set(partnerTracks, { xPercent: 0 });
        }
      } else {
        gsap.set(partnerSection, {
          filter: "blur(0px)",
          willChange: "filter",
        });

        const partnerTl = gsap.timeline({ paused: true });
        let partnerLoopTween = null;
        partnerTl.fromTo(
          partnerSection,
          { filter: "blur(100px)" },
          {
            filter: "blur(0px)",
            duration: 0.9,
            ease: easeOutCirc,
            immediateRender: false,
          }
        );

        const partnerInView =
          typeof ScrollTrigger.isInViewport === "function" &&
          ScrollTrigger.isInViewport(partnerSection, 0.15);

        if (partnerInView) {
          partnerTl.play(0);
        } else {
          createScrollTrigger({
            trigger: partnerSection,
            start: "top 85%",
            onEnter: () => partnerTl.play(0),
            once: true,
          });
        }

        if (partnerTracks.length && partnerLogoWrapper) {
          gsap.set(partnerTracks, { xPercent: 0 });
          partnerLoopTween = gsap.to(partnerTracks, {
            xPercent: -100,
            duration: 20,
            ease: "none",
            repeat: -1,
            paused: true,
          });

          const partnerLogosInView =
            typeof ScrollTrigger.isInViewport === "function" &&
            ScrollTrigger.isInViewport(partnerLogoWrapper, 0);

          if (partnerLogosInView) {
            gsap.delayedCall(0, () => partnerLoopTween?.play());
          } else {
            createScrollTrigger({
              trigger: partnerLogoWrapper,
              start: "top 100%",
              onEnter: () => partnerLoopTween.play(),
              once: true,
            });
          }
        }
      }
    });

    withSection(".approach-section", (approachSection) => {
      const approachWrapper =
        approachSection.querySelector(".approach-wrapper");
      const approachV1Blocks = approachSection.querySelectorAll(
        ".approach-single-content-block.v1"
      );
      const approachV2Blocks = approachSection.querySelectorAll(
        ".approach-single-content-block.v2"
      );

      if (prefersReducedMotion) {
        gsap.set(approachSection, { filter: "blur(0px)" });
        if (approachV1Blocks.length) {
          gsap.set(approachV1Blocks, { xPercent: 0 });
        }
        if (approachV2Blocks.length) {
          gsap.set(approachV2Blocks, { xPercent: 0 });
        }
      } else {
        gsap.set(approachSection, {
          filter: "blur(100px)",
          willChange: "filter",
        });

        const approachBlurTl = gsap.timeline({ paused: true });
        approachBlurTl.to(approachSection, {
          filter: "blur(0px)",
          duration: 0.9,
          ease: easeOutCirc,
        });

        createScrollTrigger({
          trigger: approachSection,
          start: "top 85%",
          onEnter: () => approachBlurTl.play(),
          toggleActions: "play none none none",
        });

        if (approachV1Blocks.length || approachV2Blocks.length) {
          if (approachV1Blocks.length) {
            gsap.set(approachV1Blocks, { xPercent: 0 });
          }
          if (approachV2Blocks.length) {
            gsap.set(approachV2Blocks, { xPercent: -100 });
          }

          const approachLoopTl = gsap.timeline({ repeat: -1, paused: true });
          if (approachV1Blocks.length) {
            approachLoopTl.to(
              approachV1Blocks,
              { xPercent: -100, duration: 40, ease: "none" },
              0
            );
          }
          if (approachV2Blocks.length) {
            approachLoopTl.to(
              approachV2Blocks,
              { xPercent: 0, duration: 40, ease: "none" },
              0
            );
          }

          createScrollTrigger({
            trigger: approachWrapper,
            start: "top 100%",
            onEnter: () => approachLoopTl.play(),
            onLeave: () => approachLoopTl.pause(),
          });
        }
      }
    });

    withSection("[data-features-section]", (featuresSection) => {
      const featuresHeading = featuresSection.querySelector("h2.font-title");
      const featuresHeadingBlock = featuresHeading?.parentElement ?? null;
      const featuresButton = featuresSection.querySelector(
        ".secondary-button-wrapper"
      );
      const featureBlocks = Array.from(
        featuresSection.querySelectorAll(".features-title-and-summary-block")
      );

      if (prefersReducedMotion) {
        if (featuresHeadingBlock) {
          gsap.set(featuresHeadingBlock, { filter: "blur(0px)", yPercent: 0 });
        }
        if (featuresButton) {
          gsap.set(featuresButton, { filter: "blur(0px)", yPercent: 0 });
        }
        featureBlocks.forEach((block) => {
          const image =
            block.querySelector("img") ??
            block.parentElement?.querySelector("img");
          const imageWrap = image?.parentElement ?? null;
          if (imageWrap) {
            gsap.set(imageWrap, { height: "auto" });
          }
          if (image) {
            gsap.set(image, { opacity: 1 });
          }
        });
      } else {
        if (featuresHeadingBlock) {
          slideInBlock(featuresHeadingBlock, 50);
        }
        if (featuresButton) {
          slideInBlock(featuresButton, -50);
        }

        const cardStart = "top 65%";
        const opacityEase = "cubic-bezier(0.25, 0.1, 0.25, 1)";

        featureBlocks.forEach((block) => {
          const image =
            block.querySelector("img") ??
            block.parentElement?.querySelector("img");
          const imageWrap = image?.parentElement ?? null;
          if (!image || !imageWrap) {
            return;
          }

          // Use clip-path instead of animating height to avoid layout shifts
          // that trigger the ResizeObserver/ScrollTrigger refresh loop
          gsap.set(imageWrap, {
            clipPath: "inset(0 0 100% 0)",
            webkitClipPath: "inset(0 0 100% 0)",
          });
          gsap.set(image, { opacity: 0, scale: 1.1 });

          const tl = gsap.timeline({ paused: true });
          tl.to(imageWrap, {
            clipPath: "inset(0 0 0% 0)",
            webkitClipPath: "inset(0 0 0% 0)",
            duration: 1.2,
            ease: "power2.out",
          }).to(
            image,
            {
              opacity: 1,
              scale: 1,
              duration: 1,
              ease: "power2.out",
            },
            0.2
          );

          const triggerTarget = block.parentElement ?? block;
          createScrollTrigger({
            trigger: triggerTarget,
            start: cardStart,
            onEnter: () => tl.play(),
            toggleActions: "play none none none",
          });
        });
      }
    });

    withSection("[data-wcu-section]", (wcuSection) => {
      const wcuHeading = wcuSection.querySelector("[data-wcu-heading]");
      const wcuImagesWrap = wcuSection.querySelector("[data-wcu-images]");
      const wcuLeftBg = wcuSection.querySelector("[data-wcu-left-bg]");
      const wcuRightBg = wcuSection.querySelector("[data-wcu-right-bg]");
      const wcuArrows = Array.from(
        wcuSection.querySelectorAll("[data-wcu-arrow]")
      );
      const wcuIcons = Array.from(
        wcuSection.querySelectorAll("[data-wcu-icon]")
      );
      const wcuContentBlocks = Array.from(
        wcuSection.querySelectorAll("[data-wcu-content]")
      );

      const wcuImages = [
        {
          element: wcuSection.querySelector('[data-wcu-image="bottom-right"]'),
          yPercent: -300,
          delay: 0,
        },
        {
          element: wcuSection.querySelector('[data-wcu-image="middle-left"]'),
          yPercent: -300,
          delay: 0.2,
        },
        {
          element: wcuSection.querySelector('[data-wcu-image="middle-right"]'),
          yPercent: -300,
          delay: 0.4,
        },
        {
          element: wcuSection.querySelector('[data-wcu-image="top-left"]'),
          yPercent: -300,
          delay: 0.6,
        },
        {
          element: wcuSection.querySelector('[data-wcu-image="top-right"]'),
          yPercent: -200,
          delay: 0.8,
        },
      ];

      if (prefersReducedMotion) {
        if (wcuHeading) {
          gsap.set(wcuHeading, { filter: "blur(0px)" });
        }
        if (wcuLeftBg) {
          gsap.set(wcuLeftBg, { scale: 1 });
        }
        if (wcuRightBg) {
          gsap.set(wcuRightBg, { xPercent: 0, yPercent: 0 });
        }
        wcuImages.forEach(({ element }) => {
          if (!element) {
            return;
          }
          gsap.set(element, { yPercent: 0, opacity: 1 });
        });
        wcuArrows.forEach((arrow) => {
          gsap.set(arrow, {
            scaleY: 1,
            opacity: 1,
            visibility: "visible",
          });
        });
        wcuIcons.forEach((icon, index) => {
          if (index === 0) {
            return;
          }
          gsap.set(icon, { opacity: 1 });
        });
        wcuContentBlocks.forEach((block, index) => {
          if (index === 0) {
            return;
          }
          gsap.set(block, { opacity: 1 });
        });
      } else {
        if (wcuHeading && canUseTrigger(wcuHeading)) {
          gsap.set(wcuHeading, { filter: "blur(100px)" });
          gsap.to(wcuHeading, {
            filter: "blur(0px)",
            duration: 0.9,
            ease: easeOutCirc,
            scrollTrigger: {
              trigger: wcuHeading,
              start: "top 75%",
              toggleActions: "play none none none",
            },
          });
        }

        const wcuImageEase = "back.out(1.7)";
        wcuImages.forEach(({ element, yPercent }) => {
          if (!element) {
            return;
          }
          gsap.set(element, {
            yPercent,
            opacity: 0,
            willChange: "transform, opacity",
          });
        });

        if (wcuImagesWrap) {
          const imageTl = gsap.timeline({ paused: true });

          wcuImages.forEach(({ element, delay }) => {
            if (!element) {
              return;
            }
            imageTl.to(
              element,
              { yPercent: 0, duration: 0.5, ease: wcuImageEase },
              delay
            );
            imageTl.to(
              element,
              { opacity: 1, duration: 0.5, ease: "none" },
              delay
            );
          });

          createScrollTrigger({
            trigger: wcuImagesWrap,
            start: "top 65%",
            onEnter: () => imageTl.play(),
            toggleActions: "play none none none",
          });
        }

        const setupWcuScroll = () => {
          if (!canUseTrigger(wcuSection)) {
            return;
          }
          const arrow1 = wcuArrows[0] ?? null;
          const arrow2 = wcuArrows[1] ?? null;
          const arrow3 = wcuArrows[2] ?? null;
          const icon2 = wcuIcons[1] ?? null;
          const icon3 = wcuIcons[2] ?? null;
          const icon4 = wcuIcons[3] ?? null;
          const content2 = wcuContentBlocks[1] ?? null;
          const content3 = wcuContentBlocks[2] ?? null;
          const content4 = wcuContentBlocks[3] ?? null;

          if (wcuLeftBg) {
            gsap.set(wcuLeftBg, {
              scale: 0,
              transformOrigin: "0 0",
              willChange: "transform",
            });
          }
          if (wcuRightBg) {
            gsap.set(wcuRightBg, {
              xPercent: 100,
              yPercent: -100,
              willChange: "transform",
            });
          }
          [arrow1, arrow2, arrow3].forEach((arrow) => {
            if (!arrow) {
              return;
            }
            gsap.set(arrow, {
              scaleY: 0,
              opacity: 1,
              visibility: "visible",
              transformOrigin: "50% 0",
              willChange: "transform",
            });
          });
          [icon2, icon3, icon4].forEach((icon) => {
            if (!icon) {
              return;
            }
            gsap.set(icon, { opacity: 0, willChange: "opacity" });
          });
          [content2, content3, content4].forEach((content) => {
            if (!content) {
              return;
            }
            gsap.set(content, { opacity: 0, willChange: "opacity" });
          });

          const scrollTl = gsap.timeline({
            scrollTrigger: {
              trigger: wcuSection,
              start: "top 80%",
              end: "bottom 80%",
              scrub: 0.9,
            },
          });

          if (wcuLeftBg) {
            scrollTl.to(
              wcuLeftBg,
              { scale: 1, duration: 0.4, ease: "none" },
              0
            );
          }
          if (wcuRightBg) {
            scrollTl.to(
              wcuRightBg,
              { xPercent: 0, yPercent: 0, duration: 0.4, ease: "none" },
              0
            );
          }
          if (arrow1) {
            scrollTl.to(
              arrow1,
              { scaleY: 1, duration: 0.35, ease: "power1.inOut" },
              0.25
            );
          }
          if (icon2) {
            scrollTl.to(
              icon2,
              { opacity: 1, duration: 0.35, ease: "power1.inOut" },
              0.25
            );
          }
          if (content2) {
            scrollTl.to(
              content2,
              { opacity: 1, duration: 0.35, ease: "power1.inOut" },
              0.25
            );
          }
          if (arrow2) {
            scrollTl.to(
              arrow2,
              { scaleY: 1, duration: 0.35, ease: "power1.inOut" },
              0.6
            );
          }
          if (icon3) {
            scrollTl.to(
              icon3,
              { opacity: 1, duration: 0.35, ease: "power1.inOut" },
              0.6
            );
          }
          if (content3) {
            scrollTl.to(
              content3,
              { opacity: 1, duration: 0.35, ease: "power1.inOut" },
              0.6
            );
          }
          if (arrow3) {
            scrollTl.to(
              arrow3,
              { scaleY: 1, duration: 0.35, ease: "power1.inOut" },
              0.95
            );
          }
          if (icon4) {
            scrollTl.to(
              icon4,
              { opacity: 1, duration: 0.35, ease: "power1.inOut" },
              0.95
            );
          }
          if (content4) {
            scrollTl.to(
              content4,
              { opacity: 1, duration: 0.35, ease: "power1.inOut" },
              0.95
            );
          }
        };

        const mm = gsap.matchMedia();
        mm.add("(min-width: 480px)", setupWcuScroll);
      }
    });

    withSection(".growth-section", (growthSection) => {
      const growthHeadingLoop = growthSection.querySelector(
        ".section-title-with-text-loop-animation"
      );
      const growthTitles = Array.from(
        growthHeadingLoop?.querySelectorAll(".section-animated-text-block") ??
        []
      );

      if (growthHeadingLoop && growthTitles.length) {
        const isSmallScreen = window.matchMedia("(max-width: 479px)").matches;

        if (prefersReducedMotion || isSmallScreen) {
          gsap.set(growthTitles, {
            opacity: 1,
            y: 0,
            filter: "blur(0px)",
          });
        } else {
          const cycleDuration = 5;
          const fadeDuration = 0.8;
          const holdDuration = Math.max(cycleDuration - fadeDuration * 2, 0);

          gsap.set(growthTitles, {
            opacity: 0,
            y: 16,
            filter: "blur(6px)",
            willChange: "transform, opacity, filter",
          });

          const loopTl = gsap.timeline({ repeat: -1, paused: true });

          growthTitles.forEach((title, index) => {
            const startTime = index * cycleDuration;

            loopTl.to(
              title,
              {
                opacity: 1,
                y: 0,
                filter: "blur(0px)",
                duration: fadeDuration,
                ease: easeOutCirc,
              },
              startTime
            );
            loopTl.to(
              title,
              {
                opacity: 0,
                y: 16,
                filter: "blur(6px)",
                duration: fadeDuration,
                ease: "power1.in",
              },
              startTime + fadeDuration + holdDuration
            );
          });

          createScrollTrigger({
            trigger: growthHeadingLoop,
            start: "top 85%",
            onEnter: () => loopTl.play(),
            onLeave: () => loopTl.pause(),
          });
        }
      }

      const growthContentBlock = growthSection.querySelector(
        ".growth-content-block"
      );
      const growthRows = Array.from(
        growthSection.querySelectorAll(".growth-single-content-wrap")
      );

      if (
        !prefersReducedMotion &&
        growthContentBlock &&
        growthRows.length &&
        !growthContentBlock.dataset.marqueeReady &&
        canUseTrigger(growthContentBlock)
      ) {
        growthContentBlock.dataset.marqueeReady = "true";

        gsap.set(growthRows, {
          xPercent: 0,
          willChange: "transform",
        });

        const marqueeTween = gsap.to(growthRows, {
          xPercent: -100,
          duration: 25,
          ease: "none",
          repeat: -1,
          paused: true,
        });

        createScrollTrigger({
          trigger: growthContentBlock,
          start: "top 85%",
          onEnter: () => marqueeTween.play(),
          onLeave: () => marqueeTween.pause(),
          onEnterBack: () => marqueeTween.play(),
          onLeaveBack: () => marqueeTween.pause(),
        });

        growthContentBlock.addEventListener("mouseenter", () =>
          marqueeTween.pause()
        );
        growthContentBlock.addEventListener("mouseleave", () =>
          marqueeTween.play()
        );
      }
    });

    withSection("[data-about-section]", (aboutSection) => {
      const aboutHeading = aboutSection.querySelector("[data-about-heading]");
      const aboutLeftColumn = aboutSection.querySelector(
        "[data-about-left-column]"
      );
      const aboutRightColumn = aboutSection.querySelector(
        "[data-about-right-column]"
      );
      const aboutLeftMain = aboutSection.querySelector(
        "[data-about-left-main]"
      );
      const aboutRightMain = aboutSection.querySelector(
        "[data-about-right-main]"
      );
      const aboutLogo = aboutSection.querySelector("[data-about-logo]");
      const aboutArrow = aboutSection.querySelector("[data-about-arrow]");
      const badges = aboutSection.querySelectorAll("[data-about-badge]");

      const blurTargets = [
        { element: aboutHeading, start: "top 85%" },
        { element: aboutLeftColumn, start: "top 90%" },
        { element: aboutRightColumn, start: "top 90%" },
      ];

      blurTargets.forEach(({ element, start }) => {
        if (!canUseTrigger(element)) {
          return;
        }

        gsap.set(element, { filter: "blur(100px)", willChange: "filter" });
        gsap.to(element, {
          filter: "blur(0px)",
          duration: 0.9,
          ease: easeOutCirc,
          scrollTrigger: {
            trigger: element,
            start,
            toggleActions: "play none none none",
          },
        });
      });

      if (badges.length) {
        gsap.set(badges, { transformOrigin: "50% 50%" });
      }

      const setupAboutScroll = () => {
        if (!canUseTrigger(aboutSection)) {
          return;
        }
        if (!aboutLeftMain && !aboutRightMain && !aboutLogo && !badges.length) {
          return;
        }

        const aboutScrollTl = gsap.timeline({
          scrollTrigger: {
            trigger: aboutSection,
            start: "top+=50% bottom",
            end: "bottom bottom",
            scrub: 0.92,
          },
        });

        if (aboutLeftMain) {
          aboutScrollTl.fromTo(
            aboutLeftMain,
            { xPercent: 50, rotateZ: 0 },
            { xPercent: 0, rotateZ: -11, ease: "none", duration: 0.5 },
            0
          );
        }

        if (aboutRightMain) {
          aboutScrollTl.fromTo(
            aboutRightMain,
            { xPercent: -50, rotateZ: 0 },
            { xPercent: 0, rotateZ: 11, ease: "none", duration: 0.5 },
            0
          );
        }

        if (aboutLogo) {
          aboutScrollTl.fromTo(
            aboutLogo,
            { rotateZ: 360 },
            { rotateZ: 0, ease: "none", duration: 0.5 },
            0
          );
        }

        if (badges.length) {
          aboutScrollTl.to(
            badges,
            { scale: 0, opacity: 0, ease: "none", duration: 0.3 },
            0
          );
        }

        if (badges.length) {
          aboutScrollTl.to(
            badges,
            { scale: 1, opacity: 1, ease: "none", duration: 0.1 },
            0.3
          );
        }
      };

      const mm = gsap.matchMedia();
      mm.add("(min-width: 768px)", setupAboutScroll);

      if (aboutArrow) {
        gsap.set(aboutArrow, { x: 10, willChange: "transform" });
        const arrowTl = gsap.timeline({ repeat: -1, paused: true });

        arrowTl
          .to(aboutArrow, {
            x: -10,
            duration: 0.9,
            ease: easeStandard,
          })
          .to(aboutArrow, {
            x: 10,
            duration: 0.9,
            ease: easeStandard,
          });

        createScrollTrigger({
          trigger: aboutArrow,
          start: "top 90%",
          onEnter: () => arrowTl.play(),
          onEnterBack: () => arrowTl.play(),
          onLeave: () => arrowTl.pause(),
          onLeaveBack: () => arrowTl.pause(),
        });
      }

      const badgeLoops = [
        { key: "left-upper", startY: 5, rotation: -20 },
        { key: "left-lower", startY: -5, rotation: 6 },
        { key: "right-upper", startY: 5, rotation: -4 },
        { key: "right-lower", startY: -5, rotation: 27 },
      ];

      badgeLoops.forEach(({ key, startY, rotation }) => {
        const badge = aboutSection.querySelector(`[data-about-badge="${key}"]`);
        if (!badge) {
          return;
        }

        gsap.set(badge, {
          y: startY,
          rotation,
          willChange: "transform",
        });

        const floatTween = gsap.to(badge, {
          y: -startY,
          duration: 0.9,
          ease: easeStandard,
          repeat: -1,
          yoyo: true,
          paused: true,
        });

        createScrollTrigger({
          trigger: badge,
          start: "top 100%",
          onEnter: () => floatTween.play(),
          onEnterBack: () => floatTween.play(),
          onLeave: () => floatTween.pause(),
          onLeaveBack: () => floatTween.pause(),
        });
      });
    });

    withSection("[data-advantage-section]", (advantageSection) => {
      const heading = advantageSection.querySelector(
        "[data-advantage-heading]"
      );
      const items = Array.from(
        advantageSection.querySelectorAll("[data-advantage-item]")
      );
      const buttonWrap = advantageSection.querySelector(
        "[data-advantage-button]"
      );
      const buttonOverlay = buttonWrap?.querySelector(
        ".button-animation-overlay-v2"
      );

      if (prefersReducedMotion) {
        if (heading) {
          gsap.set(heading, { filter: "blur(0px)" });
        }
        items.forEach((item) => {
          gsap.set(item, { filter: "blur(0px)", yPercent: 0 });
        });
        if (buttonOverlay) {
          gsap.set(buttonOverlay, { xPercent: 0 });
        }
        return;
      }

      if (heading) {
        gsap.set(heading, { filter: "blur(100px)", willChange: "filter" });
      }
      items.forEach((item) => {
        gsap.set(item, {
          filter: "blur(100px)",
          yPercent: 50,
          willChange: "transform, filter",
        });
      });
      if (buttonOverlay) {
        gsap.set(buttonOverlay, { xPercent: -100 });
      }

      const revealTl = gsap.timeline({ paused: true });
      if (heading) {
        revealTl.to(heading, {
          filter: "blur(0px)",
          duration: 0.8,
          ease: easeOutCirc,
        });
      }
      if (buttonOverlay) {
        revealTl.to(
          buttonOverlay,
          {
            xPercent: 0,
            duration: 0.5,
            ease: easeOutQuad,
          },
          0.1
        );
      }
      if (items.length) {
        revealTl.to(
          items,
          {
            filter: "blur(0px)",
            yPercent: 0,
            duration: 0.8,
            ease: easeOutCirc,
            stagger: 0.12,
          },
          0.15
        );
      }

      createScrollTrigger({
        trigger: advantageSection,
        start: "top 85%",
        onEnter: () => revealTl.play(),
        onEnterBack: () => revealTl.play(),
        toggleActions: "play none none none",
      });
    });

    withSection("[data-about-intro]", (introSection) => {
      const heading = introSection.querySelector("[data-about-intro-heading]");
      const imageWrap = introSection.querySelector("[data-about-intro-image]");
      const funfactsWrap = introSection.querySelector(
        "[data-about-intro-funfacts]"
      );
      const cardsWrap = introSection.querySelector("[data-about-intro-cards]");
      const cards = Array.from(
        introSection.querySelectorAll("[data-about-intro-card]")
      );
      const numbers = Array.from(
        introSection.querySelectorAll("[data-about-intro-number]")
      );
      const countedNumbers = new WeakSet();

      if (prefersReducedMotion) {
        [heading, imageWrap, funfactsWrap].forEach((element) => {
          if (element) {
            gsap.set(element, { filter: "blur(0px)" });
          }
        });
        cards.forEach((card) => {
          gsap.set(card, { filter: "blur(0px)", yPercent: 0 });
        });
        numbers.forEach((element) => {
          const raw = element.dataset.aboutIntroValue || element.textContent;
          if (raw) {
            element.textContent = raw;
          }
        });
        return;
      }

      if (heading) {
        gsap.set(heading, { filter: "blur(100px)", willChange: "filter" });
      }
      if (imageWrap) {
        gsap.set(imageWrap, { filter: "blur(100px)", willChange: "filter" });
      }
      if (funfactsWrap) {
        gsap.set(funfactsWrap, { filter: "blur(100px)", willChange: "filter" });
      }
      cards.forEach((card) => {
        gsap.set(card, {
          filter: "blur(100px)",
          yPercent: 50,
          willChange: "transform, filter",
        });
      });

      const revealTl = gsap.timeline({ paused: true });
      if (heading) {
        revealTl.to(heading, {
          filter: "blur(0px)",
          duration: 0.8,
          ease: easeOutCirc,
        });
      }
      if (imageWrap) {
        revealTl.to(
          imageWrap,
          {
            filter: "blur(0px)",
            duration: 0.8,
            ease: easeOutCirc,
          },
          0.1
        );
      }
      if (funfactsWrap) {
        revealTl.to(
          funfactsWrap,
          {
            filter: "blur(0px)",
            duration: 0.8,
            ease: easeOutCirc,
          },
          0.15
        );
      }
      if (cards.length) {
        cards.forEach((card) => {
          gsap.set(card, {
            filter: "blur(100px)",
            yPercent: 50,
            willChange: "transform, filter",
          });
        });
      }

      const runCounter = (element) => {
        if (countedNumbers.has(element)) {
          return;
        }
        countedNumbers.add(element);

        const rawValue =
          element.dataset.aboutIntroValue || element.textContent || "";
        const match = rawValue.match(/^([+-]?)(\d+(?:\.\d+)?)(.*)$/);
        if (!match) {
          return;
        }
        const prefix = match[1] ?? "";
        const numericValue = Number(match[2]);
        const suffix = match[3] ?? "";
        if (!Number.isFinite(numericValue)) {
          return;
        }

        const counter = { value: 0 };
        const formatValue = (value) =>
          `${prefix}${Math.round(value)}${suffix}`;
        gsap.to(counter, {
          value: numericValue,
          duration: 4,
          ease: easeOutQuad,
          onUpdate: () => {
            element.textContent = formatValue(counter.value);
          },
          onComplete: () => {
            element.textContent = formatValue(counter.value);
          },
        });
      };

      const startCounters = () => {
        if (!numbers.length) {
          return;
        }

        if (typeof IntersectionObserver === "undefined") {
          numbers.forEach((element) => runCounter(element));
          return;
        }

        const observer = new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              if (entry.isIntersecting) {
                runCounter(entry.target);
                observer.unobserve(entry.target);
              }
            });
          },
          { threshold: 0.6 }
        );

        numbers.forEach((element) => observer.observe(element));
      };

      createScrollTrigger({
        trigger: introSection,
        start: "top bottom",
        onEnter: () => {
          revealTl.play();
          startCounters();
        },
        onEnterBack: () => revealTl.play(),
        toggleActions: "play none none none",
      });

      if (cards.length && cardsWrap) {
        const cardsTl = gsap.timeline({ paused: true });
        cardsTl.to(cards, {
          filter: "blur(0px)",
          yPercent: 0,
          duration: 0.8,
          ease: easeOutCirc,
          stagger: 0.12,
        });

        createScrollTrigger({
          trigger: cardsWrap,
          start: "top bottom",
          onEnter: () => cardsTl.play(),
          onEnterBack: () => cardsTl.play(),
          toggleActions: "play none none none",
        });
      }
    });

    withSection("[data-about-values]", (valuesSection) => {
      const heading = valuesSection.querySelector(
        "[data-about-values-heading]"
      );
      const items = Array.from(
        valuesSection.querySelectorAll("[data-about-values-item]")
      );

      if (prefersReducedMotion) {
        if (heading) {
          gsap.set(heading, { filter: "blur(0px)", yPercent: 0 });
        }
        items.forEach((item) => {
          gsap.set(item, { filter: "blur(0px)", yPercent: 0 });
        });
        return;
      }

      if (heading) {
        gsap.set(heading, {
          filter: "blur(100px)",
          yPercent: 50,
          willChange: "transform, filter",
        });
      }
      items.forEach((item) => {
        gsap.set(item, {
          filter: "blur(100px)",
          yPercent: 50,
          willChange: "transform, filter",
        });
      });

      const revealTl = gsap.timeline({ paused: true });
      if (heading) {
        revealTl.to(heading, {
          filter: "blur(0px)",
          yPercent: 0,
          duration: 0.8,
          ease: easeOutCirc,
        });
      }
      if (items.length) {
        revealTl.to(
          items,
          {
            filter: "blur(0px)",
            yPercent: 0,
            duration: 0.8,
            ease: easeOutCirc,
            stagger: 0.12,
          },
          0.15
        );
      }

      createScrollTrigger({
        trigger: valuesSection,
        start: "top 85%",
        onEnter: () => revealTl.play(),
        onEnterBack: () => revealTl.play(),
        toggleActions: "play none none none",
      });
    });

    withSection("[data-history-section]", (historySection) => {
      const heading = historySection.querySelector("[data-history-heading]");
      const summary = historySection.querySelector("[data-history-summary]");
      const buttonWrap = historySection.querySelector("[data-history-button]");
      const buttonOverlay = buttonWrap?.querySelector(
        ".button-animation-overlay-v2"
      );
      const marqueeWrap = historySection.querySelector(
        "[data-history-marquee]"
      );
      const columns = Array.from(
        historySection.querySelectorAll("[data-history-column]")
      );
      const cards = Array.from(
        historySection.querySelectorAll("[data-history-card]")
      );

      if (prefersReducedMotion) {
        [heading, summary].forEach((element) => {
          if (element) {
            gsap.set(element, { filter: "blur(0px)", yPercent: 0 });
          }
        });
        if (buttonOverlay) {
          gsap.set(buttonOverlay, { xPercent: 0 });
        }
        cards.forEach((card) => {
          gsap.set(card, { filter: "blur(0px)", yPercent: 0, opacity: 1 });
        });
        return;
      }

      if (heading) {
        gsap.set(heading, {
          filter: "blur(100px)",
          yPercent: 50,
          willChange: "transform, filter",
        });
      }
      if (summary) {
        gsap.set(summary, {
          filter: "blur(100px)",
          yPercent: 50,
          willChange: "transform, filter",
        });
      }
      if (buttonOverlay) {
        gsap.set(buttonOverlay, { xPercent: -100 });
      }
      cards.forEach((card) => {
        gsap.set(card, {
          filter: "blur(100px)",
          yPercent: 50,
          opacity: 0,
          willChange: "transform, filter, opacity",
        });
      });

      const revealTl = gsap.timeline({ paused: true });
      if (heading) {
        revealTl.to(heading, {
          filter: "blur(0px)",
          opacity: 1,
          yPercent: 0,
          duration: 0.8,
          ease: easeOutCirc,
        });
      }
      if (summary) {
        revealTl.to(
          summary,
          {
            filter: "blur(0px)",
            opacity: 1,
            yPercent: 0,
            duration: 0.8,
            ease: easeOutCirc,
          },
          0.1
        );
      }
      if (buttonOverlay) {
        revealTl.to(
          buttonOverlay,
          {
            xPercent: 0,
            duration: 0.5,
            ease: easeOutQuad,
          },
          0.15
        );
      }
      if (cards.length) {
        revealTl.to(
          cards,
          {
            filter: "blur(0px)",
            yPercent: 0,
            opacity: 1,
            duration: 0.8,
            ease: easeOutCirc,
            stagger: 0.12,
          },
          0.2
        );
      }

      createScrollTrigger({
        trigger: historySection,
        start: "top 85%",
        onEnter: () => revealTl.play(),
        onEnterBack: () => revealTl.play(),
        toggleActions: "play none none none",
      });

      if (columns.length) {
        const scrollTl = gsap.timeline({
          scrollTrigger: {
            trigger: historySection,
            start: "top 85%",
            end: "bottom top",
            scrub: 0.9,
          },
        });

        columns.forEach((column, index) => {
          scrollTl.to(
            column,
            {
              yPercent: index % 2 === 0 ? -20 : 20,
              ease: "none",
            },
            0
          );
        });
      }

      if (marqueeWrap) {
        let marqueeTween = null;

        const startMarquee = () => {
          if (marqueeTween) {
            marqueeTween.kill();
            marqueeTween = null;
          }
          const distance = marqueeWrap.scrollHeight / 2;
          if (!distance) {
            return;
          }
          gsap.set(marqueeWrap, { y: 0, willChange: "transform" });
          marqueeTween = gsap.to(marqueeWrap, {
            y: -distance,
            duration: 25,
            ease: "none",
            repeat: -1,
          });
        };

        startMarquee();
        window.addEventListener("resize", startMarquee, { passive: true });
      }
    });

    withSection("[data-about-wcu]", (wcuSection) => {
      const heading = wcuSection.querySelector("[data-about-wcu-heading]");
      const cards = Array.from(
        wcuSection.querySelectorAll("[data-about-wcu-card]")
      );
      const images = Array.from(
        wcuSection.querySelectorAll("[data-about-wcu-images] .wcu-image-block")
      );

      if (prefersReducedMotion) {
        if (heading) {
          gsap.set(heading, { filter: "blur(0px)" });
        }
        cards.forEach((card) => {
          gsap.set(card, { opacity: 1, yPercent: 0 });
        });
        images.forEach((image) => {
          gsap.set(image, { filter: "blur(0px)", yPercent: 0, opacity: 1 });
        });
        return;
      }

      if (heading) {
        gsap.set(heading, { filter: "blur(100px)", willChange: "filter" });
      }
      cards.forEach((card, index) => {
        const startY = index >= 2 ? -250 : -200;
        gsap.set(card, {
          yPercent: startY,
          opacity: 0,
          willChange: "transform, opacity",
        });
      });
      images.forEach((image) => {
        gsap.set(image, {
          filter: "blur(100px)",
          yPercent: -50,
          willChange: "transform, filter",
        });
      });

      let hasRevealed = false;
      const revealTl = gsap.timeline({ paused: true });
      if (heading) {
        revealTl.to(heading, {
          filter: "blur(0px)",
          opacity: 1,
          duration: 0.8,
          ease: easeOutCirc,
        });
      }
      if (cards.length) {
        revealTl.to(
          cards,
          {
            yPercent: 0,
            opacity: 1,
            duration: 0.8,
            ease: easeOutCirc,
            stagger: 0.12,
          },
          0.1
        );
      }
      if (images.length) {
        revealTl.to(
          images,
          {
            filter: "blur(0px)",
            yPercent: 0,
            duration: 0.9,
            ease: easeOutCirc,
            stagger: 0.12,
          },
          0.2
        );
      }

      createScrollTrigger({
        trigger: wcuSection,
        start: "top 70%",
        onEnter: () => {
          if (hasRevealed) {
            return;
          }
          hasRevealed = true;
          revealTl.play();
        },
        toggleActions: "play none none none",
      });
    });

    withSection("[data-about-team]", (teamSection) => {
      const heading = teamSection.querySelector("[data-about-team-heading]");
      const viewport = teamSection.querySelector("[data-about-team-viewport]");
      const track = teamSection.querySelector("[data-about-team-track]");
      let slides = Array.from(teamSection.querySelectorAll("[data-about-team-slide]"));
      const prevButton = teamSection.querySelector("[data-about-team-prev]");
      const nextButton = teamSection.querySelector("[data-about-team-next]");

      if (heading && canUseTrigger(heading)) {
        if (prefersReducedMotion) {
          gsap.set(heading, { opacity: 1, yPercent: 0, filter: "blur(0px)" });
        } else {
          gsap.set(heading, {
            opacity: 0,
            yPercent: 30,
            filter: "blur(100px)",
            willChange: "transform, opacity",
          });

          const headingTl = gsap.timeline({ paused: true });
          headingTl.to(heading, {
            opacity: 1,
            yPercent: 0,
            filter: "blur(0px)",
            duration: 0.8,
            ease: easeOutCirc,
          });
          headingTl.to(
            heading,
            {
              filter: "blur(0px)",
              duration: 0.8,
              ease: easeOutCirc,
            },
            0
          );

          createScrollTrigger({
            trigger: heading,
            start: "top 85%",
            onEnter: () => headingTl.play(),
            onEnterBack: () => headingTl.play(),
            toggleActions: "play none none none",
          });
        }
      }

      if (!viewport || !track || !slides.length) return;

      let activeIndex = slides.length > 2 ? 1 : 0;
      const clampIndex = gsap.utils.wrap(0, slides.length);

      const updateSlides = (duration = 0.3) => {
        slides.forEach((slide, index) => {
          const isActive = index === activeIndex;
          const content = slide.querySelector("[data-about-team-content]");

          gsap.to(slide, {
            scale: isActive ? 1 : 0.7,
            opacity: 1,
            duration,
            ease: "power2.out",
            overwrite: "auto",
          });
          slide.style.transformStyle = "preserve-3d";

          if (content) {
            gsap.to(content, {
              autoAlpha: isActive ? 1 : 0,
              y: isActive ? 0 : 12,
              duration: duration * 0.9,
              ease: isActive ? "power2.out" : "power2.in",
              overwrite: "auto",
            });
            content.style.pointerEvents = isActive ? "auto" : "none";
          }
        });
      };

      let slideCenters = [];
      let viewportWidth = 0;

      const computePositions = () => {
        const currentX = gsap.getProperty(track, "x") || 0;
        gsap.set(track, { x: 0 });

        const viewportRect = viewport.getBoundingClientRect();
        const trackRect = track.getBoundingClientRect();
        viewportWidth = viewportRect.width;

        slideCenters = slides.map((slide) => {
          const rect = slide.getBoundingClientRect();
          return (rect.left - trackRect.left) + rect.width / 2;
        });

        gsap.set(track, { x: currentX });
      };

      const moveToIndex = (index, instant = false) => {
        if (!slideCenters.length) return;
        activeIndex = clampIndex(index);

        const targetX = (viewportWidth / 2) - slideCenters[activeIndex];

        gsap.to(track, {
          x: targetX,
          duration: instant ? 0 : 0.8,
          ease: "expo.out",
          overwrite: "auto",
        });

        updateSlides(instant ? 0 : 0.3);
      };

      const refresh = () => {
        computePositions();
        moveToIndex(activeIndex, true);
      };

      computePositions();
      refresh();

      if (prevButton) prevButton.addEventListener("click", () => moveToIndex(activeIndex - 1));
      if (nextButton) nextButton.addEventListener("click", () => moveToIndex(activeIndex + 1));

      window.addEventListener("resize", refresh);
      window.addEventListener("load", refresh);
    });

    withSection("[data-about-faq]", (faqSection) => {
      const heading = faqSection.querySelector("[data-about-faq-heading]");
      const items = Array.from(faqSection.querySelectorAll("[data-about-faq-item]"));

      if (prefersReducedMotion) {
        if (heading) {
          gsap.set(heading, { filter: "blur(0px)", yPercent: 0 });
        }
        items.forEach((item) => {
          gsap.set(item, { filter: "blur(0px)", yPercent: 0 });
        });
        return;
      }

      if (heading) {
        gsap.set(heading, { filter: "blur(100px)", willChange: "filter" });
      }
      items.forEach((item) => {
        gsap.set(item, {
          filter: "blur(100px)",
          yPercent: 50,
          willChange: "transform, filter",
        });
      });

      const revealTl = gsap.timeline({ paused: true });
      if (heading) {
        revealTl.to(heading, {
          filter: "blur(0px)",
          opacity: 1,
          duration: 0.8,
          ease: easeOutCirc,
        });
      }
      if (items.length) {
        revealTl.to(
          items,
          {
            filter: "blur(0px)",
            yPercent: 0,
            duration: 0.8,
            ease: easeOutCirc,
            stagger: 0.12,
          },
          heading ? 0.1 : 0
        );
      }

      createScrollTrigger({
        trigger: faqSection,
        start: "top 85%",
        onEnter: () => revealTl.play(),
        onEnterBack: () => revealTl.play(),
        toggleActions: "play none none none",
      });
    });

    withSection("[data-faq-section]", (faqSection) => {
      const heading = faqSection.querySelector("[data-faq-heading]");
      const items = Array.from(faqSection.querySelectorAll("[data-faq-item]"));

      if (prefersReducedMotion) {
        if (heading) {
          gsap.set(heading, { filter: "blur(0px)", yPercent: 0 });
        }
        items.forEach((item) => {
          gsap.set(item, { filter: "blur(0px)", yPercent: 0 });
        });
        return;
      }

      if (heading) {
        gsap.set(heading, { filter: "blur(100px)", willChange: "filter" });
      }
      items.forEach((item) => {
        gsap.set(item, {
          filter: "blur(100px)",
          yPercent: 50,
          willChange: "transform, filter",
        });
      });

      const revealTl = gsap.timeline({ paused: true });
      if (heading) {
        revealTl.to(heading, {
          filter: "blur(0px)",
          opacity: 1,
          duration: 0.8,
          ease: easeOutCirc,
        });
      }
      if (items.length) {
        revealTl.to(
          items,
          {
            filter: "blur(0px)",
            yPercent: 0,
            duration: 0.8,
            ease: easeOutCirc,
            stagger: 0.12,
          },
          heading ? 0.1 : 0
        );
      }

      createScrollTrigger({
        trigger: faqSection,
        start: "top 85%",
        onEnter: () => revealTl.play(),
        onEnterBack: () => revealTl.play(),
        toggleActions: "play none none none",
      });
    });

    withSection("[data-testimonials-v3]", (section) => {
      const headingBlock = section.querySelector("[data-testimonials-v3-heading]");
      const contentBlock = section.querySelector("[data-testimonials-v3-content]");
      const innerBlocks = Array.from(section.querySelectorAll("[data-testimonials-v3-track]"));

      if (prefersReducedMotion) {
        if (headingBlock) gsap.set(headingBlock, { filter: "blur(0px)" });
        return;
      }

      if (headingBlock) {
        gsap.set(headingBlock, { filter: "blur(100px)", willChange: "filter" });
        const headingTl = gsap.timeline({ paused: true });
        headingTl.to(headingBlock, { filter: "blur(0px)", opacity: 1, duration: 0.8, ease: easeOutCirc });
        createScrollTrigger({
          trigger: headingBlock,
          start: "top 85%",
          onEnter: () => headingTl.play(),
          onEnterBack: () => headingTl.play(),
          toggleActions: "play none none none",
        });
      }

      if (contentBlock && innerBlocks.length) {
        const loopTl = gsap.timeline({ repeat: -1, defaults: { ease: "none" }, paused: true });
        loopTl.to(innerBlocks, { yPercent: -100, duration: 20 });
        createScrollTrigger({
          trigger: contentBlock,
          start: "top bottom",
          onEnter: () => loopTl.play(),
          onLeave: () => loopTl.pause(),
          onEnterBack: () => loopTl.play(),
          onLeaveBack: () => loopTl.pause(),
        });
        contentBlock.addEventListener("mouseenter", () => loopTl.pause());
        contentBlock.addEventListener("mouseleave", () => loopTl.play());
      }
    });

    withSection("[data-impact-section]", (impactSection) => {
      const impactHeading = impactSection.querySelector(
        "[data-impact-heading]"
      );
      const impactWrapper = impactSection.querySelector(
        "[data-impact-wrapper]"
      );
      const impactNumbers = Array.from(
        impactSection.querySelectorAll("[data-impact-number]")
      );
      const countedNumbers = new WeakSet();

      if (prefersReducedMotion) {
        if (impactHeading) {
          gsap.set(impactHeading, { filter: "blur(0px)", yPercent: 0 });
        }
        if (impactWrapper) {
          gsap.set(impactWrapper, { filter: "blur(0px)", yPercent: 0 });
        }
        impactNumbers.forEach((element) => {
          const raw = element.dataset.impactValue || element.textContent;
          if (raw) {
            element.textContent = raw;
          }
        });
        return;
      }

      const revealTargets = [impactHeading, impactWrapper].filter(
        (target) => target && canUseTrigger(target)
      );

      revealTargets.forEach((target) => {
        gsap.set(target, {
          filter: "blur(100px)",
          yPercent: 50,
          willChange: "transform, filter",
        });

        const revealTl = gsap.timeline({ paused: true });
        revealTl
          .to(
            target,
            {
              filter: "blur(0px)",
              opacity: 1,
              duration: 0.9,
              ease: easeOutCirc,
            },
            0
          )
          .to(
            target,
            {
              yPercent: 0,
              duration: 0.5,
              ease: easeOutQuad,
            },
            0
          );

        createScrollTrigger({
          trigger: target,
          start: "top 85%",
          onEnter: () => revealTl.play(),
          toggleActions: "play none none none",
        });
      });

      let countersInitialized = false;
      const runCounter = (element) => {
        if (countedNumbers.has(element)) {
          return;
        }
        countedNumbers.add(element);

        const rawValue = element.dataset.impactValue || element.textContent || "";
        const match = rawValue.match(/^([+-]?)(\d+(?:\.\d+)?)(.*)$/);
        if (!match) {
          return;
        }
        const prefix = match[1] ?? "";
        const numericValue = Number(match[2]);
        const suffix = match[3] ?? "";
        if (!Number.isFinite(numericValue)) {
          return;
        }

        const counter = { value: 0 };
        const formatValue = (value) =>
          `${prefix}${Math.round(value)}${suffix}`;
        gsap.to(counter, {
          value: numericValue,
          duration: 4,
          ease: easeOutQuad,
          onUpdate: () => {
            element.textContent = formatValue(counter.value);
          },
          onComplete: () => {
            element.textContent = formatValue(counter.value);
          },
        });
      };

      const startCounters = () => {
        if (countersInitialized || !impactNumbers.length) {
          return;
        }
        countersInitialized = true;

        if (typeof IntersectionObserver === "undefined") {
          impactNumbers.forEach((element) => runCounter(element));
          return;
        }

        const observer = new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              if (entry.isIntersecting) {
                runCounter(entry.target);
                observer.unobserve(entry.target);
              }
            });
          },
          { threshold: 0.6 }
        );

        impactNumbers.forEach((element) => observer.observe(element));
      };

      createScrollTrigger({
        trigger: impactSection,
        start: "top 85%",
        onEnter: () => startCounters(),
        onEnterBack: () => startCounters(),
        toggleActions: "play none none none",
      });
    });
  }); // Close gsap.context()
};

const runInit = () => {
  cleanupGsap();
  initGsap();
};

const startRefreshLoop = () => {
  // Progressive refreshes to catch layout changes from lazy-loaded content/images
  ScrollTrigger.refresh();

  // Recursive refresh for 3 seconds to ensure everything settles
  let refreshCount = 0;
  const refreshInterval = setInterval(() => {
    ScrollTrigger.refresh();
    refreshCount++;
    if (refreshCount >= 6) clearInterval(refreshInterval); // Stop after 3 seconds (6 * 500ms)
  }, 500);

  // Final defensive measure: refresh whenever the body height changes
  if (typeof ResizeObserver !== "undefined") {
    let resizeTimeout;
    const ro = new ResizeObserver(() => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        ScrollTrigger.refresh();
      }, 100);
    });
    ro.observe(document.body);
  }
};

const handleInitialLoad = () => {
  if (hasInitialized) {
    return;
  }
  hasInitialized = true;
  skipNextPageLoad = true;

  runInit();
  startRefreshLoop();
};

// Use 'DOMContentLoaded' to start animations as soon as the DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", handleInitialLoad, {
    once: true,
  });
} else {
  handleInitialLoad();
}

document.addEventListener("astro:page-load", () => {
  if (!hasInitialized) {
    hasInitialized = true;
    runInit();
    startRefreshLoop();
    return;
  }
  if (skipNextPageLoad) {
    skipNextPageLoad = false;
    return;
  }
  setTimeout(() => {
    runInit();
    startRefreshLoop();
  }, 150);
});
