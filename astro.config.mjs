// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';
import mdx from '@astrojs/mdx';

// https://astro.build/config
export default defineConfig({
  // IMPORTANT: Update this to your production domain
  site: 'https://your-domain.com',

  image: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cdn.prod.website-files.com',
      },
    ],
  },

  integrations: [
    sitemap({
      // Exclude pages that shouldn't be in the sitemap
      filter: (page) =>
        !page.includes('/401') &&
        !page.includes('/template-info/') &&
        !page.includes('/authentication/'),

      // Optional: Change sitemap update frequency
      changefreq: 'weekly',

      // Optional: Set priority for pages
      priority: 0.7,

      // Optional: Set last modified date
      lastmod: new Date(),
    }),
    mdx(),
  ],

  vite: {
    plugins: [tailwindcss()]
  }
});