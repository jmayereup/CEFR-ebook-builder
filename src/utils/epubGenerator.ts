import JSZip from 'jszip';
import type { Story } from '../types';
import { segmentText } from './segmenter';

function escapeXml(unsafe: string): string {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '&':
        return '&amp;';
      case "'":
        return '&apos;';
      case '"':
        return '&quot;';
      default:
        return c;
    }
  });
}

function getLanguageCodeFromName(langName: string): string {
  const nameLower = langName.toLowerCase();
  if (nameLower.includes('spanish')) return 'es';
  if (nameLower.includes('french')) return 'fr';
  if (nameLower.includes('german')) return 'de';
  if (nameLower.includes('italian')) return 'it';
  if (nameLower.includes('portuguese')) return 'pt';
  if (nameLower.includes('english')) return 'en';
  if (nameLower.includes('japanese')) return 'ja';
  if (nameLower.includes('chinese')) return 'zh';
  if (nameLower.includes('thai')) return 'th';
  if (nameLower.includes('korean')) return 'ko';
  return 'en';
}

export async function generateEpub(story: Story): Promise<Blob> {
  const zip = new JSZip();
  const languageCode = getLanguageCodeFromName(story.language);
  const uuid =
    'epub-' +
    Math.random().toString(36).substring(2, 15) +
    '-' +
    Date.now().toString(36);
  const isBilingual =
    !!story.translationLanguage ||
    story.chapters.some((ch) => ch.content.includes('Translation:'));

  // 1. mimetype: Must be the absolute first file, uncompressed, with mime text
  zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' });

  // 2. META-INF/container.xml
  zip.file(
    'META-INF/container.xml',
    `<?xml version="1.0"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`,
  );

  // Create chapters contents and lists
  let chaptersManifest = '';
  let chaptersSpine = '';
  let chaptersToc = '';

  story.chapters.forEach((chapter, index) => {
    const idx = index + 1;
    chaptersManifest += `    <item id="chapter_${idx}" href="chapter_${idx}.html" media-type="application/xhtml+xml"/>\n`;
    chaptersSpine += `    <itemref idref="chapter_${idx}"/>\n`;
    chaptersToc += `    <navPoint id="navpoint-${idx + 1}" playOrder="${idx + 1}">
      <navLabel><text>Chapter ${idx}: ${escapeXml(chapter.title)}</text></navLabel>
      <content src="chapter_${idx}.html"/>
    </navPoint>\n`;
  });

  const endingPlayOrder = story.chapters.length + 2;
  chaptersManifest += `    <item id="ending" href="ending.html" media-type="application/xhtml+xml"/>
`;
  chaptersSpine += `    <itemref idref="ending"/>
`;
  chaptersToc += `    <navPoint id="navpoint-${endingPlayOrder}" playOrder="${endingPlayOrder}">
      <navLabel><text>Thank You</text></navLabel>
      <content src="ending.html"/>
    </navPoint>
`;

  // 3. OEBPS/content.opf
  zip.file(
    'OEBPS/content.opf',
    `<?xml version="1.0" encoding="utf-8"?>
<package xmlns="http://www.idpf.org/2007/opf" unique-identifier="BookId" version="2.0">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:opf="http://www.idpf.org/2007/opf">
    <dc:title>${escapeXml(story.title)}</dc:title>
    <dc:language>${languageCode}</dc:language>
    <dc:identifier id="BookId">urn:uuid:${uuid}</dc:identifier>
    <dc:creator>CEFR Short Story Graded Reader</dc:creator>
    <dc:description>${escapeXml(story.description || `Bilingual CEFR Graded reader for learning ${story.language} at ${story.cefrLevel} proficiency level.`)}</dc:description>
  </metadata>
  <manifest>
    <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
    <item id="style" href="style.css" media-type="text/css"/>
    <item id="title" href="title.html" media-type="application/xhtml+xml"/>
${chaptersManifest}  </manifest>
  <spine toc="ncx">
    <itemref idref="title"/>
${chaptersSpine}  </spine>
</package>`,
  );

  // 4. OEBPS/toc.ncx
  zip.file(
    'OEBPS/toc.ncx',
    `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE ncx PUBLIC "-//NISO//DTD NCX 2005-1//EN" "http://www.daisy.org/z3986/2005/ncx-2005-1.dtd">
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx-2005-1.dtd" version="2005-1">
  <head>
    <meta name="dtb:uid" content="urn:uuid:${uuid}"/>
    <meta name="dtb:depth" content="1"/>
    <meta name="dtb:totalPageCount" content="0"/>
    <meta name="dtb:maxPageNumber" content="0"/>
  </head>
  <docTitle>
    <text>${escapeXml(story.title)}</text>
  </docTitle>
  <navMap>
    <navPoint id="navpoint-1" playOrder="1">
      <navLabel><text>Cover &amp; Information</text></navLabel>
      <content src="title.html"/>
    </navPoint>
${chaptersToc}  </navMap>
</ncx>`,
  );

  // 5. OEBPS/style.css
  zip.file(
    'OEBPS/style.css',
    `body {
  font-family: serif;
  margin: 15px;
  line-height: 1.6;
  color: #000000;
}
.title-container {
  text-align: center;
  padding: 50px 10px;
}
.book-title {
  font-size: 2em;
  font-weight: bold;
  color: #000000;
  margin-bottom: 8px;
}
.book-language {
  font-size: 1.25em;
  color: #000000;
  margin-bottom: 25px;
  font-style: italic;
}
.book-meta {
  font-size: 0.95em;
  color: #000000;
  margin-bottom: 20px;
}
.book-divider {
  height: 2px;
  width: 60px;
  background-color: #cbd5e1;
  margin: 20px auto;
}
.book-intro {
  font-size: 1em;
  color: #000000;
  max-width: 500px;
  margin: 20px auto 0 auto;
  line-height: 1.5;
}
.chapter-container {
  margin-bottom: 40px;
  page-break-after: always;
}
.chapter-title {
  font-size: 1.6em;
  font-weight: bold;
  color: #000000;
  margin-bottom: 5px;
  border-bottom: 1px solid #e2e8f0;
  padding-bottom: 8px;
}
.chapter-meta {
  font-size: 0.85em;
  color: #000000;
  font-weight: bold;
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-bottom: 20px;
}
.chapter-content {
  font-size: 1.05em;
}
.chapter-p {
  margin-bottom: 1.25em;
  text-indent: ${isBilingual ? '0' : '1.2em'};
  text-align: justify;
}
.chapter-translation-p {
  font-family: sans-serif;
  font-style: italic;
  font-size: 0.9em;
  color: #000000;
  border-left: 2px solid #cbd5e1;
  padding-left: 12px;
  text-indent: 0;
  margin-top: -0.75em;
  margin-bottom: 1.25em;
  line-height: 1.4;
  text-align: left;
}
.glossary-title {
  font-size: 1.15em;
  font-weight: bold;
  margin-top: 35px;
  margin-bottom: 12px;
  color: #000000;
  border-top: 1px dashed #cbd5e1;
  padding-top: 18px;
}
.glossary-list {
  margin-top: 10px;
}
.glossary-item {
  margin-bottom: 10px;
  padding-left: 8px;
  border-left: 2px solid #cbd5e1;
}
.glossary-word-row {
  margin-bottom: 2px;
}
.glossary-word {
  font-weight: bold;
  color: #000000;
}
.glossary-pos {
  font-size: 0.75em;
  text-transform: uppercase;
  color: #000000;
  margin-left: 5px;
  background-color: #edf2f7;
  padding: 1px 4px;
  border-radius: 3px;
}
.glossary-definition {
  font-size: 0.9em;
  color: #000000;
}
.glossary-transliteration {
  font-size: 0.85em;
  color: #000000;
  font-style: italic;
  margin-left: 4px;
}
.glossary-context {
  font-size: 0.85em;
  color: #000000;
  font-style: italic;
  margin-top: 2px;
}
.highlight {
  border-bottom: 1px dotted #718096;
}`,
  );

  // 6. OEBPS/title.html
  zip.file(
    'OEBPS/title.html',
    `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.1//EN" "http://www.w3.org/TR/xhtml11/DTD/xhtml11.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <title>${escapeXml(story.title)}</title>
  <link rel="stylesheet" href="style.css" type="text/css"/>
</head>
<body>
  <div class="title-container">
    <h1 class="book-title">${escapeXml(story.title)}</h1>
    <h2 class="book-language">${story.language} Learner Edition</h2>
    <div class="book-meta">
      <p><strong>Level:</strong> CEFR ${story.cefrLevel}</p>
      <p><strong>Total Chapters:</strong> ${story.chapters.length} of ${story.totalChapters}</p>
    </div>
    <div class="book-divider"></div>
    ${story.description ? `<p class="book-intro">${escapeXml(story.description)}</p>` : ''}
    <p class="book-intro" style="font-size: 0.9em; margin-top: 15px; color: #000000; font-style: italic;">
      I hope you enjoy this graded reader. You can find more books at <a href="https://books.teacherjake.com">books.teacherjake.com</a>. Members can even use AI to build their own graded readers.
    </p>
  </div>
</body>
</html>`,
  );

  // 7. Core individual chapter files
  story.chapters.forEach((chapter, index) => {
    const idx = index + 1;

    // Split text into lines/paragraphs safely
    const paragraphLines = chapter.content
      .split(/\n+/)
      .map((p) => p.trim())
      .filter((p) => p.length > 0);

    const paragraphsHtml = paragraphLines
      .map((p) => {
        if (p.startsWith('Translation:')) {
          const stripped = p.replace(/^Translation:\s*/i, '');
          return `      <p class="chapter-translation-p">${escapeXml(stripped)}</p>`;
        }

        const glossaryWordsSet = new Set(
          (chapter.vocabulary || []).map((v) => v.word.toLowerCase().trim()),
        );
        const segments = segmentText(p, languageCode, glossaryWordsSet);

        const highlightedContent = segments
          .map((seg) => {
            const isGlossary = glossaryWordsSet.has(
              seg.segment.toLowerCase().trim(),
            );
            if (isGlossary && seg.isWordLike) {
              return `<span class="highlight">${escapeXml(seg.segment)}</span>`;
            }
            return escapeXml(seg.segment);
          })
          .join('');

        return `      <p class="chapter-p">${highlightedContent}</p>`;
      })
      .join('\n');

    let glossaryHtml = '';
    if (chapter.vocabulary && chapter.vocabulary.length > 0) {
      const itemsHtml = chapter.vocabulary
        .map(
          (v) => `      <div class="glossary-item">
        <div class="glossary-word-row">
          <span class="glossary-word">${escapeXml(v.word)}</span>
          ${v.transliteration ? `<span class="glossary-transliteration">[${escapeXml(v.transliteration)}]</span>` : ''}
          <span class="glossary-pos">${escapeXml(v.partOfSpeech)}</span>
        </div>
        <div class="glossary-definition">${escapeXml(v.definition)}</div>
        ${v.contextSentence ? `        <div class="glossary-context">e.g. &quot;${escapeXml(v.contextSentence)}&quot;</div>` : ''}
      </div>`,
        )
        .join('\n');

      glossaryHtml = `    <div class="glossary-title">Chapter Vocabulary Key Glossary</div>
    <div class="glossary-list">
${itemsHtml}
    </div>`;
    }

    zip.file(
      `OEBPS/chapter_${idx}.html`,
      `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.1//EN" "http://www.w3.org/TR/xhtml11/DTD/xhtml11.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <title>${escapeXml(chapter.title)}</title>
  <link rel="stylesheet" href="style.css" type="text/css"/>
</head>
<body>
  <div class="chapter-container">
    <h1 class="chapter-title">${escapeXml(chapter.title)}</h1>
    <div class="chapter-meta">Chapter ${idx} of ${story.chapters.length}</div>
    <div class="chapter-content">
${paragraphsHtml}
    </div>
${glossaryHtml}
  </div>
</body>
</html>`,
    );
  });

  zip.file(
    `OEBPS/ending.html`,
    `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.1//EN" "http://www.w3.org/TR/xhtml11/DTD/xhtml11.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <title>Thank You</title>
  <link rel="stylesheet" href="style.css" type="text/css"/>
</head>
<body>
  <div class="title-container">
    <h1 class="book-title">Thank You for Reading!</h1>
    <p class="book-intro">We hope you enjoyed this story. For more free graded readers, visit <a href="https://books.teacherjake.com">books.teacherjake.com</a>.</p>
  </div>
</body>
</html>`,
  );

  // Generate the zip binary with standard container compression
  return await zip.generateAsync({
    type: 'blob',
    mimeType: 'application/epub+zip',
  });
}
