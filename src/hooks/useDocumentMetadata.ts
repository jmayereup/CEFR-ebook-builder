import { useEffect } from 'react';
import type { Story } from '../types';
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
      updateMetaTag('property', 'og:title', defaultTitle);
      updateMetaTag('property', 'og:description', defaultDesc);
      removeJsonLdSchema();
      return;
    }

    const activeChapter = story.chapters[activeChapterIndex];
    const chapterLabel = activeChapter
      ? ` | Ch ${activeChapter.chapterNumber}: ${activeChapter.title}`
      : '';
    const cefrLabel = story.cefrLevel ? ` (CEFR ${story.cefrLevel})` : '';

    const newTitle = `${story.title}${chapterLabel}${cefrLabel} - Graded ${story.language}`;
    const newDesc = `Read "${story.title}" graded for ${story.language} at CEFR ${story.cefrLevel} difficulty. ${story.description || 'Includes interactive translations, Text-to-Speech audio, and EPUB downloads.'}`;

    document.title = newTitle;
    updateMetaTag('name', 'description', newDesc);
    updateMetaTag('property', 'og:title', newTitle);
    updateMetaTag('property', 'og:description', newDesc);

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
      numberOfPages: story.chapters.length * 8, // Estimated page count
      publisher: {
        '@type': 'Organization',
        name: 'CEFR Stories',
        logo: {
          '@type': 'ImageObject',
          url: `${window.location.origin}/tj-logo.svg`,
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
