const buildIntegrationContent = (name: string) => ({
  details: `
    <h2>${name} + Zarex</h2>
    <p>Stay on top of every lead without leaving ${name}. With our seamless ${name} integration, you will receive instant notifications whenever a new lead engages with your campaign - from connection requests to message replies. Collaborate with your team in real time, share lead insights directly in your channels, and act on opportunities the moment they happen.</p>
  `,
  about: `
    <p>Integrating ${name} with your lead generation platform isn't just about convenience - it is about creating a faster, more connected, and responsive workflow.</p>
    <p>Here is how ${name} integration transforms the way your team operates:</p>
    <h4>Real-Time Lead Notifications</h4>
    <p>Stay ahead of the competition with instant alerts every time a new lead connects, replies, or engages with your campaign. No more checking dashboards or waiting for email summaries - you will know the moment a lead shows interest, so you can take action immediately and increase your chances of closing the deal.</p>
    <h4>Increased Productivity</h4>
    <p>With ${name} integration, there is no need to juggle multiple tools. Your team can view lead details, track campaign progress, and communicate about next steps without switching platforms. This streamlined workflow reduces wasted time and boosts efficiency, allowing your team to focus on building relationships and closing sales.</p>
    <h4>Stay Organized &amp; Aligned</h4>
    <p>Avoid miscommunication and lost opportunities by keeping all lead updates centralized in dedicated ${name} channels. Whether it is new connection requests, replies, or campaign milestones, everything is neatly organized and accessible to the right people, ensuring no one misses critical information we can also add more content for this point.</p>
    <h4>Faster Follow-Ups</h4>
    <p>Timing is everything in lead generation. Automated Slack reminders ensure your team follows up with prospects at the right moment, dramatically improving engagement and response rates. By cutting down response delays, you increase the chances of turning interested leads into paying clients everything in lead generation the chances of turning interested leads into paying clients.</p>
  `,
  setup: `
    <p>Setting up integration with our app involves a series of steps. Below is a simplified guide that you can use as a template.</p>
    <h4>Step 1: Create a Integration App</h4>
    <ul>
      <li>Log in with your Integration account.</li>
      <li>Click on "My Apps" and then "Create App."</li>
      <li>Choose the appropriate app type.</li>
    </ul>
    <h4>Step 2: Set Up Integration Login</h4>
    <ul>
      <li>In the left sidebar, navigate to "Integration Login" and click on "Set Up."</li>
      <li>Choose the type of login you want to implement (e.g., "Web").</li>
      <li>Configure the necessary settings, such as Valid OAuth Redirect URIs. This is where integration will redirect users after they log in.</li>
    </ul>
    <h4>Step 3: Retrieve App Credentials</h4>
    <ul>
      <li>In the app dashboard, go to "Settings" &gt; "Basic."</li>
      <li>Note down your App ID and App Secret. You'll need these to authenticate our app with integration.</li>
    </ul>
    <h4>Step 4: Integrate Login into SaaS</h4>
    <ul>
      <li>Access the admin or settings section of our app.</li>
      <li>Look for the authentication or integration settings.</li>
      <li>Add the integration App ID and App Secret in the respective fields.</li>
    </ul>
    <h4>Step 5: Configure Permissions</h4>
    <ul>
      <li>Define the permissions your SaaS application needs from integration users.</li>
      <li>Common permissions include email, public_profile, and user_friends.</li>
    </ul>
    <h4>Step 6: Test the Integration</h4>
    <ul>
      <li>Implement a test scenario where users can log in using their integration credentials.</li>
      <li>Ensure that the necessary user data is pulled into your SaaS application.</li>
      <li>By following these steps, you can seamlessly integrate integration with our app, allowing for efficient collaboration and project tracking.</li>
    </ul>
  `,
  support: `
    <p>Whether you are facing technical issues, need clarification on certain functionalities, or require guidance on best practices, we have got you covered. Here are the key points of our integration support.</p>
    <ol>
      <li>Technical Assistance: If you encounter any technical issues or obstacles during the integration, our support team is ready to assist. Please provide detailed information about the problem, and we will work promptly to identify and resolve it.</li>
      <li>Functional Guidance: Understanding the full range of features and functionalities of our app is crucial. Our team can provide detailed guidance on how to make the most out of the integrated system, ensuring optimal utilization for your project needs.</li>
      <li>Best Practices: To enhance your overall project management experience, we can share best practices for utilizing the integrated SaaS effectively. This includes tips on collaboration, task management, reporting, and other essential aspects.</li>
      <li>FAQs and Knowledge Base: We have compiled a comprehensive set of frequently asked questions and a knowledge base to address common queries and provide self-help resources. Feel free to explore these resources for quick solutions.</li>
      <li>Feedback and Improvements: Your feedback is valuable to us. If you have suggestions for improvement or encounter any challenges that you believe could be addressed better, please share your insights. We are committed to continuously enhancing our integration support.</li>
    </ol>
    <p>For any assistance or inquiries related to the project management SaaS integration, simply reply to this email - <a href="mailto:info@zarex.com">info@zarex.com</a> or reach out to our dedicated support team at <a href="tel:+123456789">+12345 678 9</a>. We are here to ensure your experience with our SaaS integration is as smooth as possible.</p>
  `,
});

export const integrationPage = {
  hero: {
    subtitle: "Integrations",
    title: {
      prefix: "Next-Gen ",
      highlight: "Integrations",
      suffix: " for Your Growth Stack",
    },
    summary: {
      prefix: "To grow your LinkedIn profile through our ",
      highlight: "Zarex",
      suffix:
        ", create opportunity for generate more Leeds, create more opportunities for profile progress",
    },
  },
  items: [
    {
      slug: "quick-fill",
      href: "/integration/quick-fill",
      icon: "https://cdn.prod.website-files.com/68a3f48c515f538aacaaae24/68ad4b5b9e47915781800ebf_quick-fill.svg",
      status: "Free",
      title: "Quick Fill",
      summary:
        "Ensures that you're reaching out to the new potential customers every day regardless of how busy your schedule.",
      ...buildIntegrationContent("Quick Fill"),
    },
    {
      slug: "kb-drive",
      href: "/integration/kb-drive",
      icon: "https://cdn.prod.website-files.com/68a3f48c515f538aacaaae24/68ad4b1de492f2b844d9f835_kb-drive.svg",
      status: "Premium",
      title: "KB Drive",
      summary:
        "Ensures that you're reaching out to the new potential customers every day regardless of how busy your schedule.",
      ...buildIntegrationContent("KB Drive"),
    },
    {
      slug: "calprint",
      href: "/integration/calprint",
      icon: "https://cdn.prod.website-files.com/68a3f48c515f538aacaaae24/68ad4ad1571a5d311d3cd24f_calprint.svg",
      status: "Free",
      title: "Calprint",
      summary:
        "Ensures that you're reaching out to the new potential customers every day regardless of how busy your schedule.",
      ...buildIntegrationContent("Calprint"),
    },
    {
      slug: "plack",
      href: "/integration/plack",
      icon: "https://cdn.prod.website-files.com/68a3f48c515f538aacaaae24/68ad4a9c7bd00372bd7ff50e_plack.svg",
      status: "Premium",
      title: "Plack",
      summary:
        "Ensures that you're reaching out to the new potential customers every day regardless of how busy your schedule.",
      ...buildIntegrationContent("Plack"),
    },
    {
      slug: "qepair",
      href: "/integration/qepair",
      icon: "https://cdn.prod.website-files.com/68a3f48c515f538aacaaae24/68ad4a6954c1137305bebcee_qepair.svg",
      status: "Free",
      title: "Qepair",
      summary:
        "Ensures that you're reaching out to the new potential customers every day regardless of how busy your schedule.",
      ...buildIntegrationContent("Qepair"),
    },
    {
      slug: "frello",
      href: "/integration/frello",
      icon: "https://cdn.prod.website-files.com/68a3f48c515f538aacaaae24/68ad4a413e7e2dcd1b5e87bf_frello.svg",
      status: "Free",
      title: "Frello",
      summary:
        "Ensures that you're reaching out to the new potential customers every day regardless of how busy your schedule.",
      ...buildIntegrationContent("Frello"),
    },
    {
      slug: "zeltufy",
      href: "/integration/zeltufy",
      icon: "https://cdn.prod.website-files.com/68a3f48c515f538aacaaae24/68ad4a116ec69fa4ae8803a4_zeltufy.svg",
      status: "Free",
      title: "Zeltufy",
      summary:
        "Ensures that you're reaching out to the new potential customers every day regardless of how busy your schedule.",
      ...buildIntegrationContent("Zeltufy"),
    },
    {
      slug: "skypo",
      href: "/integration/skypo",
      icon: "https://cdn.prod.website-files.com/68a3f48c515f538aacaaae24/68ad49e9dbeef78855f6b2d1_skypo.svg",
      status: "Free",
      title: "Skypo",
      summary:
        "Ensures that you're reaching out to the new potential customers every day regardless of how busy your schedule.",
      ...buildIntegrationContent("Skypo"),
    },
    {
      slug: "mingbarg",
      href: "/integration/mingbarg",
      icon: "https://cdn.prod.website-files.com/68a3f48c515f538aacaaae24/68ad49a81d4f4f54c253a27b_mingbarg.svg",
      status: "Free",
      title: "Mingbarg",
      summary:
        "Ensures that you're reaching out to the new potential customers every day regardless of how busy your schedule.",
      ...buildIntegrationContent("Mingbarg"),
    },
  ],
  testimonials: {
    title: "Don't Believe Us Check Our Customers' Authentic Experience",
    summary:
      "These testimonials reflect different aspects and experiences about users might have with project management software, highlighting its efficiency and usability.",
    cta: { label: "All Features", href: "/features" },
    items: [
      {
        name: "Rosa Annnie",
        role: "School Teacher",
        title: "Excellent Service",
        feedback:
          "\"At the heart of our platform is a dedication to delivering best and outstanding service - onboarding to responsive support, we're here to ensure your lead generation\".",
        image: "/images/author-image--1.png",
      },
      {
        name: "Rebeca Armstong",
        role: "School Teacher",
        title: "Excellent Service",
        feedback:
          "\"At the heart of our platform is a dedication to delivering best and outstanding service - onboarding to responsive support, we're here to ensure your lead generation\".",
        image: "/images/author-image--2.png",
      },
      {
        name: "John Abdomen",
        role: "School Teacher",
        title: "Excellent Service",
        feedback:
          "\"At the heart of our platform is a dedication to delivering best and outstanding service - onboarding to responsive support, we're here to ensure your lead generation\".",
        image: "/images/author-image-3.png",
      },
    ],
    rating: {
      full: 4,
      empty: 1,
    },
    ratingIcon: "/images/star.png",
    ratingInactiveIcon: "/images/star2.png",
    quoteIcon: "/images/quate.png",
  },
};
