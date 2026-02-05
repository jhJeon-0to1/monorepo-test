"use client";

export default function GlobalError({ error }: { error: Error }) {
  return (
    <html>
      <body>
        <h2>에러 발생</h2>
        <pre>{error.message}</pre>
      </body>
    </html>
  );
}
