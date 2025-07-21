import '@/styles/globals.css';
import type { AppProps } from 'next/app';
import Head from 'next/head';
import { useEffect } from 'react';
import { config, validateConfig } from '@/lib/config';

export default function App({ Component, pageProps }: AppProps) {
  useEffect(() => {
    // Validate configuration on app startup
    try {
      if (config.app.environment !== 'development') {
        validateConfig();
      }
    } catch (error) {
      console.error('Configuration validation failed:', error);
    }
  }, []);

  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <Component {...pageProps} />
    </>
  );
}