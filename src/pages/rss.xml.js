import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';

export async function GET(context) {
    const blog = await getCollection('blog');
    return rss({
        // `<title>` field in xml
        title: 'Zarex Blog',
        // `<description>` field in xml
        description: 'Explore original insights, LinkedIn marketing strategies, and B2B lead generation tips from the Zarex team.',
        // Pull in your project "site" from the config file
        site: context.site,
        // Array of `<item>`s from a collection
        // See 'Generating items' section for examples using content collections and glob imports
        items: blog.map((post) => ({
            title: post.data.title,
            pubDate: post.data.date,
            description: post.data.summary,
            // Compute RSS link from post `slug`
            // This example assumes all posts are rendered as `/blog/[slug]` routes
            link: `/blog/${post.slug}/`,
        })),
        // (optional) inject custom xml
        customData: `<language>en-us</language>`,
    });
}
