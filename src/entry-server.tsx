import ReactDOMServer from 'react-dom/server';
import App from './App';

export function render(url: string, context?: any) {
  const html = ReactDOMServer.renderToString(
    <App ssrPath={url} ssrData={context} />,
  );
  return { html };
}
