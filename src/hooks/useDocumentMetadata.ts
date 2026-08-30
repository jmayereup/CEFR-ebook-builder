import { useEffect } from 'react';
import type { Story } from '../types';
import { getStoryCoverUrl } from '../utils/coverUtils';
import { slugify } from '../utils/slugify';

export function useDocumentMetadata(
  story: Story | null,
  activeChapterIndex: number,
) {
  useEffect(() => {
    const defaultTitle = 'CEFR Stories - Reading Companion';
    const defaultDesc =
      'Generate and read custom CEFR-graded stories in Spanish, French, Japanese, and more. Improve reading comprehension with dynamic glossaries, audio narration, and EPUB eBook downloads.';

    if (!story) {
      document.title = defaultTitle;
      updateMetaTag('name', 'description', defaultDesc);
      updateMetaTag('property', 'og:site_name', 'CEFR Stories');
      updateMetaTag('property', 'og:type', 'website');
      updateMetaTag('property', 'og:title', defaultTitle);
      updateMetaTag('property', 'og:description', defaultDesc);
      updateMetaTag(
        'property',
        'og:image',
        `${window.location.origin}/tj-logo-512.png`,
      );
      updateMetaTag(
        'property',
        'og:image:secure_url',
        `${window.location.origin}/tj-logo-512.png`,
      );
      updateMetaTag('property', 'og:image:type', 'image/png');
      updateMetaTag('property', 'og:image:width', '512');
      updateMetaTag('property', 'og:image:height', '512');
      updateMetaTag(
        'name',
        'twitter:image',
        `${window.location.origin}/tj-logo-512.png`,
      );
      updateMetaTag('name', 'twitter:card', 'summary_large_image');
      removeJsonLdSchema();
      return;
    }

    const activeChapter = story.chapters
      ? story.chapters[activeChapterIndex]
      : undefined;
    const chapterLabel = activeChapter
      ? ` | Ch ${activeChapter.chapterNumber}: ${activeChapter.title}`
      : '';
    const cefrLabel = story.cefrLevel ? ` (CEFR ${story.cefrLevel})` : '';

    const newTitle = `${story.title}${chapterLabel}${cefrLabel} - Graded ${story.language}`;
    const newDesc = story.description
      ? `${story.description} Graded for ${story.language} at CEFR ${story.cefrLevel} difficulty.`
      : `Read "${story.title}" graded for ${story.language} at CEFR ${story.cefrLevel} difficulty. Includes interactive translations, Text-to-Speech audio, and EPUB downloads.`;

    document.title = newTitle;
    updateMetaTag('name', 'description', newDesc);
    updateMetaTag('property', 'og:site_name', 'CEFR Stories');
    updateMetaTag('property', 'og:type', 'book');
    updateMetaTag('property', 'og:title', newTitle);
    updateMetaTag('property', 'og:description', newDesc);

    const coverUrl = getStoryCoverUrl(story, { absolute: true });
    updateMetaTag('property', 'og:image', coverUrl);
    updateMetaTag('property', 'og:image:secure_url', coverUrl);
    updateMetaTag('property', 'og:image:type', 'image/jpeg');
    updateMetaTag('property', 'og:image:width', '480');
    updateMetaTag('property', 'og:image:height', '672');
    updateMetaTag('property', 'og:image:alt', story.title);
    updateMetaTag('name', 'twitter:image', coverUrl);
    updateMetaTag('name', 'twitter:card', 'summary_large_image');

    // Dynamic JSON-LD structured data for Google Books SEO
    injectJsonLdSchema({
      '@context': 'https://schema.org',
      '@type': 'Book',
      '@id': `${window.location.origin}/book/${slugify(story.title)}-${story.id}`,
      name: story.title,
      bookFormat: 'https://schema.org/EBook',
      inLanguage: story.language,
      description: story.description || newDesc,
      educationalLevel: `CEFR ${story.cefrLevel}`,
      genre: story.genre,
      numberOfPages: (story.chapters?.length ?? 0) * 8, // Estimated page count
      publisher: {
        '@type': 'Organization',
        name: 'CEFR Stories',
        logo: {
          '@type': 'ImageObject',
          url: `${window.location.origin}/tj-logo-512.png`,
        },
      },
    });

    return () => {
      // Cleanup dynamically created script on update/unmount
      removeJsonLdSchema();
    };
  }, [story, activeChapterIndex]);
}

function updateMetaTag(
  attrName: 'name' | 'property',
  attrValue: string,
  contentValue: string,
) {
  if (typeof document === 'undefined') return;
  let element = document.querySelector(`meta[${attrName}="${attrValue}"]`);
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attrName, attrValue);
    document.head.appendChild(element);
  }
  element.setAttribute('content', contentValue);
}

function injectJsonLdSchema(schemaObj: Record<string, any>) {
  if (typeof document === 'undefined') return;
  removeJsonLdSchema();

  const script = document.createElement('script');
  script.id = 'story-schema-jsonld';
  script.type = 'application/ld+json';
  script.innerHTML = JSON.stringify(schemaObj);
  document.head.appendChild(script);
}

function removeJsonLdSchema() {
  if (typeof document === 'undefined') return;
  const existingScript = document.getElementById('story-schema-jsonld');
  if (existingScript) {
    existingScript.remove();
  }
}
