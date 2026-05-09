import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';

/**
 * Content Collections config for the Astro example (Astro 6 format).
 * The "prose" collection holds the prose demo page MDX content.
 */
export const collections = {
  prose: defineCollection({
    loader: glob({ pattern: '**/*.mdx', base: './src/content/prose' }),
  }),
};
