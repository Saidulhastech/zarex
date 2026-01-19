export const pricingPage = {
  breadcrumb: {
    subtitle: "Pricing Plan",
    title: {
      prefix: "Flexible Plans Built for Every ",
      highlight: "Stage of Growth",
      suffix: "",
    },
  },
  plans: {
    title: {
      prefix: "Choose the Plan That\u2019s Right for You, All Plans Include a ",
      highlight: "30-Day Trial",
      suffix: "",
    },
    tabs: {
      monthly: "Monthly",
      annual: "Annually(save 25%)",
    },
    credits: ["100 credits", "200 credits", "300 credits", "400 credits"],
    monthly: [
      {
        name: "Basic",
        summary:
          "Perfect for those getting started with automated LinkedIn outreach",
        price: "$25/month",
        button: {
          label: "Get Started",
          href: "/contact-us",
          variant: "secondary",
          className: "padding-32px",
        },
        features: {
          title: "Features",
          items: [
            { text: "2 Zarex Campaign" },
            { text: "Limited daily quota", question: true },
            { text: "Advanced analytics & reports" },
            {
              text: "Compatibility with all LinkedIn\u00a0\u00a0account types",
            },
            { text: "Sequence templates" },
            { text: "Built-in LinkedIn protection", question: true },
            { text: "24/7 live support" },
          ],
        },
      },
      {
        name: "Standard",
        summary:
          "Built for running high-velocity outreach campaigns without limits",
        price: "$47/month",
        highlight: true,
        popular: true,
        button: {
          label: "Get Started",
          href: "/contact-us",
          variant: "primary",
        },
        features: {
          title: "Features",
          summary: "Everything in Basic plus",
          items: [
            { text: "Unlimited drip campaigns" },
            { text: "Full daily quotas", question: true },
            { text: "Dedicated inbox", question: true },
            { text: "CSV export" },
            { text: "Webhook integration", question: true },
          ],
        },
      },
      {
        name: "Advanced",
        summary:
          "Perfect for those getting started with automated LinkedIn outreach",
        price: "$57/month",
        button: {
          label: "Get Started",
          href: "/contact-us",
          variant: "secondary",
          className: "padding-32px",
        },
        features: {
          title: "Features",
          summary: "Everything in Standard plus",
          items: [
            { text: "Team management" },
            { text: "Advanced LinkedIn protection", question: true },
          ],
        },
      },
    ],
    annual: [
      {
        name: "Basic",
        summary:
          "Perfect for those getting started with automated LinkedIn outreach",
        price: "$125/annually",
        button: {
          label: "Get Started",
          href: "/contact-us",
          variant: "secondary",
          className: "padding-32px",
        },
        features: {
          title: "Features",
          items: [
            { text: "2 Zarex Campaign" },
            { text: "Limited daily quota", question: true },
            { text: "Advanced analytics & reports" },
            {
              text: "Compatibility with all LinkedIn\u00a0\u00a0account types",
            },
            { text: "Sequence templates" },
            { text: "Built-in LinkedIn protection", question: true },
            { text: "24/7 live support" },
          ],
        },
      },
      {
        name: "Standard",
        summary:
          "Built for running high-velocity outreach campaigns without limits",
        price: "$247/annually",
        highlight: true,
        popular: true,
        button: {
          label: "Get Started",
          href: "/contact-us",
          variant: "primary",
        },
        features: {
          title: "Features",
          summary: "Everything in Basic plus",
          items: [
            { text: "Unlimited drip campaigns" },
            { text: "Full daily quotas", question: true },
            { text: "Dedicated inbox", question: true },
            { text: "CSV export" },
            { text: "Webhook integration", question: true },
          ],
        },
      },
      {
        name: "Advanced",
        summary:
          "Perfect for those getting started with automated LinkedIn outreach",
        price: "$357/annually",
        button: {
          label: "Get Started",
          href: "/contact-us",
          variant: "secondary",
          className: "padding-32px",
        },
        features: {
          title: "Features",
          summary: "Everything in Standard plus",
          items: [
            { text: "Team management" },
            { text: "Advanced LinkedIn protection", question: true },
          ],
        },
      },
    ],
  },
  compare: {
    title: {
      prefix: "Scalable Plans, Meaningful Value, ",
      highlight: "Compare Our Pricing",
      suffix: "",
    },
    summary:
      "We believe pricing should be as straightforward and transparent as the solutions we deliver. That\u2019s why our plans are designed to adapt to your growth",
    columns: ["Features", "Basic", "Standard", "Advanced"],
    groups: [
      {
        title: "Campaigns",
        items: [
          "Number of campaigns",
          "Lead queues in a sequence",
          "Pre-built sequence templates",
        ],
        values: [
          ["2", "check", "check"],
          ["Unlimited", "check", "check"],
          ["Unlimited", "check", "check"],
        ],
      },
      {
        title: "Daily Quotas",
        items: [
          "Send connections requests",
          "Send messages",
          "View profile",
          "Endorse",
          "Follow profile",
        ],
        values: [
          ["25", "43", "100+", "15", "18"],
          ["30", "100", "220+", "48", "50+"],
          ["45", "120+", "350+", "15", "18"],
        ],
      },
      {
        title: "CRM",
        items: [
          "Pre-built sequence templates",
          "Import leads",
          "Export leads into CSV",
          "Resume leads in a sequence",
          "Inbox",
        ],
        values: [
          ["check", "check", "remove", "check", "remove"],
          ["check", "check", "check", "check", "check"],
          ["check", "check", "check", "check", "check"],
        ],
      },
      {
        title: "Analytics & Reporting",
        items: [
          "Daily usage stats",
          "Recent activity",
          "Account performance",
          "Lead collection reports",
          "Team analytics",
        ],
        values: [
          ["check", "check", "check", "check", "remove"],
          ["check", "check", "check", "check", "remove"],
          ["check", "check", "check", "check", "check"],
        ],
      },
      {
        title: "Integrations",
        items: ["Apps", "Software"],
        values: [
          ["check", "check"],
          ["check", "check"],
          ["check", "check"],
        ],
      },
    ],
  },
  testimonials: {
    title: {
      prefix: "Don\u2019t Believe Us Check Our ",
      highlight: "Customers\u2019",
      suffix: " Experience",
    },
    items: [
      {
        title: "Excellent Service",
        feedback:
          "\u201cAt the heart of our platform is a dedication to delivering best and outstanding service onboarding to responsive support, we\u2019re here to ensure your lead generation\u201d.",
        name: "Rosa Annnie",
        role: "School Teacher",
      },
      {
        title: "Most Relevant & Useful",
        feedback:
          "\u201cAt the heart of our platform is a dedication to delivering best and outstanding service onboarding to responsive support, we\u2019re here to ensure your lead generation\".",
        name: "Rosa Annnie",
        role: "School Teacher",
      },
      {
        title: "Excellent Service",
        feedback:
          "\u201cAt the heart of our platform is a dedication to delivering best and outstanding service\u00a0\u00a0onboarding to responsive support, we\u2019re here to ensure your lead generation\".",
        name: "Rosa Annnie",
        role: "School Teacher",
      },
      {
        title: "Excellent Service",
        feedback:
          "\u201cAt the heart of our platform is a dedication to delivering best and outstanding service onboarding to responsive support, we\u2019re here to ensure your lead generation\u201d.",
        name: "Rosa Annnie",
        role: "School Teacher",
      },
      {
        title: "Most Relevant & Useful",
        feedback:
          "\u201cAt the heart of our platform is a dedication to delivering best and outstanding service onboarding to responsive support, we\u2019re here to ensure your lead generation\".",
        name: "Rosa Annnie",
        role: "School Teacher",
      },
    ],
    rating: {
      full: 4,
      empty: 1,
    },
    ratingIcon: "/images/star.png",
    ratingInactiveIcon: "/images/star2.png",
  },
  faq: {
    title: {
      prefix: "Need ",
      highlight: "More Info?",
      suffix: " Quick Answers to Your Common Questions",
    },
    summary: "Find quick answers to common questions here about Zarex",
    items: [
      {
        question: "Q.\u00a0Is Zarex Safe to Use With LinkedIn?",
        answer:
          "You can automate connection requests, follow-ups, message sequences, profile visits, endorsements, and more, all while keeping communication personalized. With Zarex, you can automate almost every part of your LinkedIn outreach while keeping it highly personalized and effective. The platform is designed to replicate authentic human behavior so your interactions feel natural, not robotic.",
      },
      {
        question: "Q.\u00a0Do I Need Any Technical Skills to Use Zarex?",
        answer:
          "You can automate connection requests, follow-ups, message sequences, profile visits, endorsements, and more, all while keeping communication personalized. With Zarex, you can automate almost every part of your LinkedIn outreach while keeping it highly personalized and effective. The platform is designed to replicate authentic human behavior so your interactions feel natural, not robotic.",
      },
      {
        question:
          "Q.\u00a0 What Kind of Outreach Can I Automate With Zarex?",
        answer:
          "You can automate connection requests, follow-ups, message sequences, profile visits, endorsements, and more, all while keeping communication personalized. With Zarex, you can automate almost every part of your LinkedIn outreach while keeping it highly personalized and effective. The platform is designed to replicate authentic human behavior so your interactions feel natural, not robotic.",
      },
      {
        question: "Q.\u00a0Can I Measure the Performance of My Campaigns?",
        answer:
          "You can automate connection requests, follow-ups, message sequences, profile visits, endorsements, and more, all while keeping communication personalized. With Zarex, you can automate almost every part of your LinkedIn outreach while keeping it highly personalized and effective. The platform is designed to replicate authentic human behavior so your interactions feel natural, not robotic.",
      },
      {
        question: "Q.\u00a0What Industries Can Benefit From Zarex?",
        answer:
          "You can automate connection requests, follow-ups, message sequences, profile visits, endorsements, and more, all while keeping communication personalized. With Zarex, you can automate almost every part of your LinkedIn outreach while keeping it highly personalized and effective. The platform is designed to replicate authentic human behavior so your interactions feel natural, not robotic.",
      },
    ],
  },
  cta: {
    title: {
      prefix: "Try Out the ",
      highlight: "Leading Tools",
      suffix: " for Your Profile\u2019s Consistent Growth",
    },
    summary:
      "Its intuitive interface, powerful automation workflows, and seamless LinkedIn integration gave our team the edge we needed reach.",
    cta: { label: "Start 16 Days Free Trial", href: "/pricing-plan" },
    video: {
      poster: "/videos/cta-videos-poster-00001.jpg",
      mp4: "/videos/cta-videos-transcode.mp4",
      webm: "/videos/cta-videos-transcode.webm",
    },
  },
};
