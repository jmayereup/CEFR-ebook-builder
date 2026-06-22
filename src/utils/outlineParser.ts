/**
 * Helper utility to parse story outlines and extract specific chapter descriptions.
 */

/**
 * Extracts the guidance/outline for a specific chapter number from a markdown story outline.
 *
 * It searches for a line introducing the target chapter, extracts the text following it,
 * and stops when it encounters the heading of another chapter.
 *
 * @param outline The markdown outline text.
 * @param chapterNumber The 1-based index of the target chapter.
 * @returns The extracted outline/guidance for the chapter, or an empty string if not found.
 */
export const extractChapterOutline = (
  outline: string,
  chapterNumber: number,
): string => {
  if (!outline) return '';

  const normalized = outline.replace(/\r\n/g, '\n');
  const lines = normalized.split('\n');

  const chapterKeywords =
    '(?:chapter|ch\\.?|capítulo|capitulo|capitolo|chapitre|kapitel|cap|kap|บทที่|ตอนที่|제|第)';

  // Regex to match chapter keyword or raw number for the target chapter number
  const targetChapterRegex = new RegExp(
    `(?:${chapterKeywords}\\s*0*${chapterNumber}\\b|\\b0*${chapterNumber}\\b)`,
    'i',
  );

  // Regex to match any other chapter heading, which signals the end of the current section
  const anyOtherChapterRegex = (num: number) => {
    return new RegExp(
      `(?:${chapterKeywords}\\s*0*(?!${num})\\d+\\b|\\b0*(?!${num})\\d+\\b)`,
      'i',
    );
  };

  let startIndex = -1;
  for (let i = 0; i < lines.length; i++) {
    if (targetChapterRegex.test(lines[i])) {
      startIndex = i;
      break;
    }
  }

  if (startIndex === -1) {
    return '';
  }

  const otherChapterRegex = anyOtherChapterRegex(chapterNumber);
  const sectionLines: string[] = [];

  // Collect the line where it starts and subsequent lines
  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i];
    // Stop if we hit a line matching a DIFFERENT chapter number
    if (i > startIndex && otherChapterRegex.test(line)) {
      break;
    }
    sectionLines.push(line);
  }

  // Combine the collected lines
  const sectionText = sectionLines.join('\n').trim();

  // Clean the header prefix step-by-step to get pure guidance/description
  let line = sectionText.trim();

  // 1. Remove leading list markers, hashtags, and formatting characters
  line = line.replace(/^[#*\-\s\d.)(]+/, '').trim();

  // 2. Remove Chapter label (multilingual), optionally enclosed in bold asterisks
  const labelRegex = new RegExp(
    `^(?:\\*\\*)?${chapterKeywords}\\s*0*${chapterNumber}\\b(?:\\*\\*)?`,
    'i',
  );
  if (labelRegex.test(line)) {
    line = line.replace(labelRegex, '').trim();

    // Remove separator immediately following Chapter X (e.g. ":", "-", "*", "章", "장")
    line = line.replace(/^[:\-–—*章장\\s]+/, '').trim();

    // Check if there's a closing "**" for the bold title, followed by separator or space
    const boldTitleRegex = /^([^*]+)\*\*(?:\s*[-–—:]\s*)?/;
    if (boldTitleRegex.test(line)) {
      line = line.replace(boldTitleRegex, '').trim();
    } else {
      // If no bold title, check if there is a title followed by a clear separator (e.g. " - " or ": ")
      const separatorMatch = line.match(/^([^-–—:]+)(?:[-–—:]\s+)(.*)/);
      if (separatorMatch) {
        line = separatorMatch[2].trim();
      }
    }
  } else {
    // If it started with a raw number (e.g. "1. La Llave"), let's remove the raw number and separators
    const rawNumberRegex = new RegExp(
      `^(?:\\*\\*)?0*${chapterNumber}\\b(?:\\*\\*)?`,
      'i',
    );
    if (rawNumberRegex.test(line)) {
      line = line.replace(rawNumberRegex, '').trim();
      line = line.replace(/^[:\-–—*章장\\s]+/, '').trim();
    }
  }

  return line.trim();
};
