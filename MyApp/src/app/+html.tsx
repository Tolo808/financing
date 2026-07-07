import { ScrollViewStyleReset, useServerDocumentContext } from 'expo-router/html';

// Customizes the root HTML document for the web export to add PWA support (manifest, icons,
// theme-color, iOS "Add to Home Screen" meta tags, service worker registration) — none of this
// is generated automatically by Expo's web export despite the PWA-shaped fields in app.json's
// `web` config; those are vestiges of the older webpack-based web build and aren't wired up in
// the current Metro/Expo Router static export. See public/manifest.webmanifest and public/sw.js.
export default function Root({ children }: { children: React.ReactNode }) {
  const { htmlAttributes, bodyAttributes, headNodes, bodyNodes } = useServerDocumentContext();

  return (
    <html {...htmlAttributes} lang="en">
      <head>
        {headNodes}
        <ScrollViewStyleReset />
        {/* Expo's reset sizes html/body/#root to height:100% — on mobile browsers that resolves
            against the *large* viewport (as if the URL bar were hidden), so the app lays out
            taller than what's actually on screen. The result: content looks spread out / "far",
            and only snaps to the right size after you scroll (which hides the URL bar and
            "resizes" the viewport). 100dvh (dynamic viewport height) always matches the visible
            area, fixing that. Overrides the reset because it's declared after it with equal
            specificity. */}
        <style
          dangerouslySetInnerHTML={{
            __html: `html,body,#root{height:100vh;height:100dvh}`,
          }}
        />
        <link rel="manifest" href="/manifest.webmanifest" />
        <meta name="theme-color" content="#EEF0F7" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Tolo" />
        <link rel="icon" type="image/png" sizes="192x192" href="/icons/icon-192.png" />
      </head>
      <body {...bodyAttributes}>
        {children}
        {bodyNodes}
        <script
          dangerouslySetInnerHTML={{
            __html: `if ('serviceWorker' in navigator) { window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js')); }`,
          }}
        />
      </body>
    </html>
  );
}
