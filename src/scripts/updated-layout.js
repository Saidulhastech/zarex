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
        yPercent: yStart,
        willChange: "transform, filter",
      });

      const tl = gsap.timeline({ paused: true });

      tl.to(
        element,
        {
          filter: "blur(0px)",
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
      const leftTop = heroImages?.querySelector(
        ".hero-left-column-image-one.rotate--11deg"
      );
      const middleTop = heroImages?.querySelector(
        ".hero-single-column-block:not(.left-column):not(.v2) .hero-single-image-block:not(.bottom)"
      );
      const rightTop = heroImages?.querySelector(
        ".hero-single-image-block.rotate-21deg"
      );
      const middleBottom = heroImages?.querySelector(
        ".hero-single-image-block.bottom"
      );
      const leftBottom = heroImages?.querySelector(
        ".hero-single-image-block.left-bottom"
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
      const heroButton = heroSection.querySelector(".primary-button-wrapper");
      const heroButtonOverlay = heroButton?.querySelector(
        ".button-animation-overlay"
      );

      if (prefersReducedMotion) {
        if (headingBlock) {
          gsap.set(headingBlock, { filter: "blur(0px)", yPercent: 0 });
        }
        if (summaryBlock) {
          gsap.set(summaryBlock, { filter: "blur(0px)", yPercent: 0 });
        }
        if (heroItems.length) {
          gsap.set(heroItems, { x: 0, y: 0, filter: "blur(0px)" });
        }
        if (middleTop) {
          gsap.set(middleTop, { filter: "blur(0px)" });
        }
        if (heroButtonOverlay) {
          gsap.set(heroButtonOverlay, { xPercent: -100, opacity: 0 });
        }
      } else {
        slideInBlock(headingBlock, 50);
        slideInBlock(summaryBlock, -50);

        const runHeroStackAnimation = () => {
          if (!heroImages) {
            return;
          }

          if (!heroItems.length) {
            return;
          }

          const containerRect = heroImages.getBoundingClientRect();
          const centerX = containerRect.left + containerRect.width / 2;
          const centerY = containerRect.top + containerRect.height / 2;

          const stackedItems = heroItems.map((item, index) => {
            const rect = item.getBoundingClientRect();
            const stackY = centerY - (rect.top + rect.height / 2);
            const y = item === leftTop || item === rightTop ? 0 : stackY;
            return {
              item,
              x: centerX - (rect.left + rect.width / 2),
              y,
              zIndex: heroItems.length - index,
            };
          });

          stackedItems.forEach((entry) => {
            gsap.set(entry.item, {
              x: entry.x,
              y: entry.y,
              zIndex: entry.zIndex,
              filter: "blur(100px)",
              willChange: "transform, filter",
            });
          });

          if (middleTop) {
            gsap.set(middleTop, {
              filter: "blur(100px)",
              willChange: "filter",
            });
          }

          const heroTl = gsap.timeline({ delay: 0.1 });
          const blurTargets = [...heroItems, middleTop].filter(Boolean);

          heroTl.to(blurTargets, {
            filter: "blur(0px)",
            duration: 1.2,
            ease: easeOutCirc,
          });
          const motionStart = heroTl.duration();
          const sideDuration = 0.8;
          const middleBottomDelay = 0.8;

          if (leftTop) {
            heroTl.to(
              leftTop,
              { x: 0, duration: sideDuration, ease: stackEase },
              motionStart
            );
          }
          if (leftBottom) {
            heroTl.to(
              leftBottom,
              { x: 0, duration: sideDuration, ease: stackEase },
              motionStart
            );
          }
          if (middleBottom) {
            heroTl.to(
              middleBottom,
              { x: 0, y: 0, duration: sideDuration, ease: stackEase },
              motionStart + middleBottomDelay
            );
          }
          if (rightTop) {
            heroTl.to(
              rightTop,
              { x: 0, duration: sideDuration, ease: stackEase },
              motionStart
            );
          }
          if (rightBottom) {
            heroTl.to(
              rightBottom,
              { x: 0, duration: sideDuration, ease: stackEase },
              motionStart
            );
          }

          const dropDelay = 0.75;
          const dropDuration = 0.6;

          if (leftBottom) {
            heroTl.to(
              leftBottom,
              { y: 0, duration: dropDuration, ease: stackEase },
              motionStart + dropDelay
            );
          }

          if (rightBottom) {
            heroTl.to(
              rightBottom,
              { y: 0, duration: dropDuration, ease: stackEase },
              motionStart + dropDelay
            );
          }
        };

        requestAnimationFrame(() => {
          runHeroStackAnimation();
        });

        if (rotateLeft || rotateRight) {
          if (canUseTrigger(heroSection)) {
            const rotationTl = gsap.timeline({
              scrollTrigger: {
                trigger: heroSection,
                start: "top 50%",
                end: "bottom 50%",
                scrub: true,
              },
            });

            rotationTl
              .to(
                [rotateLeft, rotateRight].filter(Boolean),
                {
                  rotateZ: 0,
                  ease: "none",
                  duration: 0.5,
                },
                0
              )
              .to({}, { duration: 0.5 });
          }
        }

        if (heroButton && heroButtonOverlay) {
          gsap.set(heroButtonOverlay, { xPercent: -100, opacity: 0 });

          const handleHoverIn = () => {
            gsap.to(heroButtonOverlay, {
              xPercent: 0,
              duration: 0.5,
              ease: easeStandard,
              overwrite: "auto",
            });
            gsap.to(heroButtonOverlay, {
              opacity: 1,
              duration: 0.3,
              ease: easeStandard,
              overwrite: "auto",
            });
          };

          const handleHoverOut = () => {
            gsap.to(heroButtonOverlay, {
              xPercent: -100,
              duration: 0.5,
              ease: easeStandard,
              overwrite: "auto",
            });
            gsap.to(heroButtonOverlay, {
              opacity: 0,
              duration: 0.3,
              ease: easeStandard,
              overwrite: "auto",
            });
          };

          heroButton.addEventListener("mouseenter", handleHoverIn);
          heroButton.addEventListener("mouseleave", handleHoverOut);
        }
      }
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
            });
          }
        }
      }
    );

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
          partnerTl.restart();
        } else {
          createScrollTrigger({
            trigger: partnerSection,
            start: "top 85%",
            onEnter: () => partnerTl.restart(),
            onEnterBack: () => partnerTl.restart(),
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
              onEnterBack: () => partnerLoopTween.play(),
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
              end: "bottom 20%",
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
              { scaleY: 1, duration: 0.25, ease: "none" },
              0.2
            );
          }
          if (icon2) {
            scrollTl.to(
              icon2,
              { opacity: 1, duration: 0.25, ease: "none" },
              0.2
            );
          }
          if (content2) {
            scrollTl.to(
              content2,
              { opacity: 1, duration: 0.25, ease: "none" },
              0.2
            );
          }
          if (arrow2) {
            scrollTl.to(
              arrow2,
              { scaleY: 1, duration: 0.15, ease: "none" },
              0.45
            );
          }
          if (icon3) {
            scrollTl.to(
              icon3,
              { opacity: 1, duration: 0.15, ease: "none" },
              0.45
            );
          }
          if (content3) {
            scrollTl.to(
              content3,
              { opacity: 1, duration: 0.15, ease: "none" },
              0.45
            );
          }
          if (arrow3) {
            scrollTl.to(
              arrow3,
              { scaleY: 1, duration: 0.2, ease: "none" },
              0.6
            );
          }
          if (icon4) {
            scrollTl.to(
              icon4,
              { opacity: 1, duration: 0.2, ease: "none" },
              0.6
            );
          }
          if (content4) {
            scrollTl.to(
              content4,
              { opacity: 1, duration: 0.2, ease: "none" },
              0.6
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

    withSection("[data-impact-section]", (impactSection) => {
      const impactHeading = impactSection.querySelector(
        "[data-impact-heading]"
      );
      const impactWrapper = impactSection.querySelector(
        "[data-impact-wrapper]"
      );
      const impactStats = Array.from(
        impactSection.querySelectorAll("[data-impact-stat]")
      );
      const impactNumberWraps = Array.from(
        impactSection.querySelectorAll(".funfact-number-wrap")
      );

      if (prefersReducedMotion) {
        if (impactHeading) {
          gsap.set(impactHeading, { filter: "blur(0px)", yPercent: 0 });
        }
        if (impactWrapper) {
          gsap.set(impactWrapper, { filter: "blur(0px)", yPercent: 0 });
        }
        impactNumberWraps.forEach((wrap) => {
          gsap.set(wrap, { yPercent: 0 });
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

      impactStats.forEach((stat) => {
        if (!canUseTrigger(stat)) {
          return;
        }

        const lowerWraps = Array.from(
          stat.querySelectorAll(".funfact-number-wrap.lower-movement")
        );
        const upperWraps = Array.from(
          stat.querySelectorAll(".funfact-number-wrap.upper-movement")
        );

        if (!lowerWraps.length && !upperWraps.length) {
          return;
        }

        if (lowerWraps.length) {
          gsap.set(lowerWraps, { yPercent: -400, willChange: "transform" });
        }
        if (upperWraps.length) {
          gsap.set(upperWraps, { yPercent: 400, willChange: "transform" });
        }

        const numberTl = gsap.timeline({ paused: true });
        if (lowerWraps.length) {
          numberTl.to(
            lowerWraps,
            { yPercent: 0, duration: 3, ease: "power1.inOut" },
            0
          );
        }
        if (upperWraps.length) {
          numberTl.to(
            upperWraps,
            { yPercent: 0, duration: 3, ease: "power1.inOut" },
            0
          );
        }

        const statTarget = stat;
        createScrollTrigger({
          trigger: statTarget,
          start: "top 110%",
          onEnter: () => numberTl.play(),
          toggleActions: "play none none none",
        });
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

  // Wait for a small delay after load to ensure all layouts are calculated
  // This prevents ScrollTrigger from failing to calculate 'end' positions
  setTimeout(() => {
    runInit();
    startRefreshLoop();
  }, 150);
};

// Use 'load' event instead of 'DOMContentLoaded' to wait for all assets (images, etc.)
if (document.readyState === "complete") {
  handleInitialLoad();
} else {
  window.addEventListener("load", handleInitialLoad, {
    once: true,
  });
}

document.addEventListener("astro:page-load", () => {
  if (!hasInitialized) {
    hasInitialized = true;
    setTimeout(() => {
      runInit();
      startRefreshLoop();
    }, 150);
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
