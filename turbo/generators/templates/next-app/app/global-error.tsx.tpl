"use client";

export default function GlobalError({ error }: { error: Error }) {
  return (
    <html>
      <body>
        <h2>Error</h2>
        <pre>{error.message}</pre>
      </body>
    </html>
  );
}
