import ReactDOMServer from 'react-dom/server';
import App from './App';

export function render(url: string, context?: any) {
  const rawHtml = ReactDOMServer.renderToString(
    <App ssrPath={url} ssrData={context} />,
  );

  // In React 19, renderToString hoists resource tags (<link>, <style>, <meta>) to the beginning of the string.
  // We extract these hoisted head elements so they can be injected into <head> rather than leaving them inside <div id="root">.
  const headMatch = rawHtml.match(/^((?:<(?:link|style|meta)[^>]*>)+)/i);
  const head = headMatch ? headMatch[1] : '';
  const html = head ? rawHtml.substring(head.length) : rawHtml;

  return { html, head };
}
