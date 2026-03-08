import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
    return (
        <Html lang="en">
            <Head>
                <link rel="preconnect" href="https://image.tmdb.org" crossOrigin="anonymous" />
                <link rel="dns-prefetch" href="https://image.tmdb.org" />
                <link rel="preconnect" href="https://vidfast.pro" crossOrigin="anonymous" />
                <link rel="dns-prefetch" href="https://vidfast.pro" />
                <link rel="icon" href="/favicon.png" type="image/png" />
                <link rel="apple-touch-icon" href="/favicon.png" />
            </Head>
            <body>
                <Main />
                <NextScript />
            </body>
        </Html>
    );
}
