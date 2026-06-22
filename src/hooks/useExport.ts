import { useState } from 'react';
import { getLanguageCodeFromName, type Story } from '../types';
import { segmentText } from '../utils/segmenter';
import { slugify } from '../utils/slugify';

function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

interface UseExportOptions {
  selectedStory: Story | null;
  activeChapterIdx: number;
  showAlert: (
    title: string,
    message: string,
    type?: 'info' | 'error' | 'warning',
  ) => void;
}

export function useExport(options: UseExportOptions) {
  const { selectedStory, activeChapterIdx, showAlert } = options;

  const [showShareToast, setShowShareToast] = useState(false);
  const [copyStatus, setCopyStatus] = useState<string | null>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showDocOptions, setShowDocOptions] = useState(false);
  const [showEpubLinks, setShowEpubLinks] = useState(false);
  const [isExportingEpub, setIsExportingEpub] = useState(false);

  const handleShareStoryLink = () => {
    if (!selectedStory) return;
    const slug = slugify(selectedStory.title);
    const slugSegment = slug ? `${slug}-${selectedStory.id}` : selectedStory.id;
    const url = `${window.location.origin}/book/${slugSegment}/chapter/${activeChapterIdx + 1}`;
    navigator.clipboard.writeText(url).then(() => {
      setShowShareToast(true);
      setTimeout(() => setShowShareToast(false), 3000);
    });
  };

  const triggerCopyPlaintext = () => {
    if (!selectedStory) return;

    let textString = `TITLE: ${selectedStory.title}\n`;
    textString += `Language: ${selectedStory.language} | CEFR Level: ${selectedStory.cefrLevel}\n`;
    textString += `Generated on CEFR Language Story Builder\n\n`;

    selectedStory.chapters.forEach((ch) => {
      textString += `\n=========================================\n`;
      textString += `CHAPTER ${ch.chapterNumber}: ${ch.title}\n`;
      textString += `=========================================\n\n`;
      textString += `${ch.content}\n\n`;

      if (ch.vocabulary && ch.vocabulary.length > 0) {
        textString += `--- Vocabulary for Review ---\n`;
        ch.vocabulary.forEach((v) => {
          const translitText = v.transliteration
            ? ` [${v.transliteration}]`
            : '';
          textString += `* ${v.word}${translitText} (${v.partOfSpeech}) - ${v.definition}\n`;
          if (v.contextSentence) {
            textString += `  Context: "${v.contextSentence}"\n`;
          }
        });
        textString += `\n`;
      }
    });

    textString += `=========================================\n`;
    textString += `Thank you for reading!\n`;
    textString += `For more free graded readers, visit books.teacherjake.com\n`;

    navigator.clipboard.writeText(textString).then(() => {
      setCopyStatus('copy-plain');
      setTimeout(() => setCopyStatus(null), 3000);
    });
  };

  const triggerCopyRichText = () => {
    if (!selectedStory) return;

    const isBilingual =
      !!selectedStory.translationLanguage ||
      selectedStory.chapters.some((ch) => ch.content.includes('Translation:'));

    let htmlContent = `
      <div style="font-family: 'Georgia', serif; line-height: 1.5; color: #1e293b; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="font-family: 'Helvetica Neue', Arial, sans-serif; text-align: center; color: #004d2c; margin-bottom: 4px; margin-top: 0px;">${selectedStory.title}</h1>
        <p style="text-align: center; color: #64748b; font-size: 14px; margin-bottom: 24px; margin-top: 0px; font-style: italic;">
          Target Language: <strong>${selectedStory.language}</strong> | CEFR Graded: <strong>${selectedStory.cefrLevel}</strong>
        </p>
    `;

    selectedStory.chapters.forEach((ch) => {
      htmlContent += `
        <div style="margin-bottom: 24px; border-bottom: 1px dashed #e2e8f0; padding-bottom: 16px;">
          <h2 style="font-family: 'Helvetica Neue', Arial, sans-serif; color: #1e293b; border-bottom: 2px solid #004d2c; padding-bottom: 4px; margin-top: 10px; margin-bottom: 12px;">
            Chapter ${ch.chapterNumber}: ${ch.title}
          </h2>
          <div style="font-size: 16px; text-align: justify; margin-bottom: 16px;">
            ${ch.content
              .split(/\n+/)
              .map((p) => {
                const trimmed = p.trim();
                if (trimmed.startsWith('Translation:')) {
                  const stripped = trimmed.replace(/^Translation:\s*/i, '');
                  return `<p style="font-family: Arial, sans-serif; font-style: italic; font-size: 14px; color: #64748b; padding-left: 16px; border-left: 2px solid #cbd5e1; text-indent: 0px; margin-top: 4px; margin-bottom: 12px; line-height: 1.4; text-align: left;">${escapeHtml(stripped)}</p>`;
                }

                const glossaryWordsSet = new Set(
                  (ch.vocabulary || []).map((v) => v.word.toLowerCase().trim()),
                );
                const languageCode = getLanguageCodeFromName(
                  selectedStory.language,
                );
                const segments = segmentText(
                  trimmed,
                  languageCode,
                  glossaryWordsSet,
                );

                const highlightedContent = segments
                  .map((seg) => {
                    const isGlossary = glossaryWordsSet.has(
                      seg.segment.toLowerCase().trim(),
                    );
                    if (isGlossary && seg.isWordLike) {
                      return `<span style="border-bottom: 1px dotted #718096; text-decoration: underline dotted #718096;">${escapeHtml(seg.segment)}</span>`;
                    }
                    return escapeHtml(seg.segment);
                  })
                  .join('');

                return `<p style="text-indent: ${isBilingual ? '0px' : '30px'}; margin-top: 0px; margin-bottom: 6px; line-height: 1.5; text-align: justify;">${highlightedContent}</p>`;
              })
              .join('')}
          </div>
      `;

      if (ch.vocabulary && ch.vocabulary.length > 0) {
        htmlContent += `
          <div style="background-color: #f0fdf4; border-left: 4px solid #004d2c; padding: 12px; border-radius: 4px; font-family: 'Helvetica Neue', Arial, sans-serif; margin-top: 12px;">
            <h3 style="margin-top: 0; color: #004d2c; font-size: 14px; margin-bottom: 8px;">Vocabulary Glossary</h3>
            <ul style="padding-left: 20px; font-size: 13px; color: #334155; line-height: 1.4; margin: 0;">
        `;
        ch.vocabulary.forEach((v) => {
          const translitHtml = v.transliteration
            ? ` <span style="color:#64748b; font-size:12px;">[${v.transliteration}]</span>`
            : '';
          const contextHtml = v.contextSentence
            ? `<br/><span style="color:#64748b; font-size:12px; font-style: italic; font-family: Georgia, serif;">e.g. "${v.contextSentence}"</span>`
            : '';
          htmlContent += `
            <li style="margin-bottom: 6px;">
              <strong>${v.word}</strong>${translitHtml} <span style="color:#64748b; font-style: italic;">(${v.partOfSpeech})</span>: ${v.definition}${contextHtml}
            </li>
          `;
        });
        htmlContent += `
            </ul>
          </div>
        `;
      }

      htmlContent += `</div>`;
    });

    htmlContent += `
      <div style="margin-top: 24px; padding-top: 24px; border-top: 2px solid #cbd5e1;">
        <h2 style="font-family: 'Helvetica Neue', Arial, sans-serif; color: #004d2c; margin: 0 0 12px 0; font-size: 20px;">Thank You for Reading!</h2>
        <p style="margin: 0; font-size: 16px; color: #334155; line-height: 1.6;">
          We hope you enjoyed this story. For more free graded readers, visit <a href="https://books.teacherjake.com" style="color: #0f766e; text-decoration: none;">books.teacherjake.com</a>.
        </p>
      </div>
    `;
    htmlContent += `</div>`;

    const blob = new Blob([htmlContent], { type: 'text/html' });
    const textBlob = new Blob([htmlContent.replace(/<[^>]+>/g, '')], {
      type: 'text/plain',
    });
    const item = new ClipboardItem({
      'text/html': blob,
      'text/plain': textBlob,
    });

    navigator.clipboard.write([item]).then(() => {
      setCopyStatus('copy-rich');
      setTimeout(() => setCopyStatus(null), 3000);
    });
  };

  const handleDownloadEpub = async () => {
    if (!selectedStory) return;
    setIsExportingEpub(true);
    setShowEpubLinks(true);
    try {
      const { generateEpub } = await import('../utils/epubGenerator');
      const blob = await generateEpub(selectedStory);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const safeTitle = selectedStory.title
        .replace(/[/\\?%*:|"<>]/g, '_')
        .replace(/\s+/g, '_')
        .trim();
      a.download = `${safeTitle}.epub`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to export EPUB:', err);
      showAlert(
        'Export Failed',
        'Failed to export EPUB. Please try again.',
        'error',
      );
    } finally {
      setIsExportingEpub(false);
    }
  };

  return {
    showShareToast,
    copyStatus,
    showExportMenu,
    setShowExportMenu,
    showDocOptions,
    setShowDocOptions,
    showEpubLinks,
    setShowEpubLinks,
    isExportingEpub,
    handleShareStoryLink,
    triggerCopyPlaintext,
    triggerCopyRichText,
    handleDownloadEpub,
  };
}
