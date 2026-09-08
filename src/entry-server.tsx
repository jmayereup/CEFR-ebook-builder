import { Writable } from 'node:stream';
import { renderToPipeableStream } from 'react-dom/server';
import App from './App';

export function render(
  url: string,
  context?: any,
): Promise<{ html: string; head: string }> {
  return new Promise((resolve, reject) => {
    let rawHtml = '';

    const writable = new Writable({
      write(chunk, _encoding, callback) {
        rawHtml += chunk.toString();
        callback();
      },
      final(callback) {
        // In React 19, render hoists resource tags (<link>, <style>, <meta>) to the beginning of the string.
        // We extract these hoisted head elements so they can be injected into <head> rather than leaving them inside <div id="root">.
        const headMatch = rawHtml.match(/^((?:<(?:link|style|meta)[^>]*>)+)/i);
        const head = headMatch ? headMatch[1] : '';
        const html = head ? rawHtml.substring(head.length) : rawHtml;

        resolve({ html, head });
        callback();
      },
    });

    const { pipe, abort } = renderToPipeableStream(
      <App ssrPath={url} ssrData={context} />,
      {
        onAllReady() {
          pipe(writable);
        },
        onShellError(err) {
          reject(err);
        },
        onError(err) {
          console.error('[SSR Render Error]:', err);
        },
      },
    );

    // Timeout fallback after 5 seconds to prevent hung requests
    setTimeout(() => {
      abort();
    }, 5000);
  });
}

