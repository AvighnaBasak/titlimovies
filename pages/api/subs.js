// Subtitle proxy + normalizer. Fetches a caption file (with VidLink referer when
// needed), converts SRT to WebVTT (the only format <track> understands), and
// serves it same-origin so the player can load it without CORS issues.

import { VIDLINK_HEADERS } from '../../lib/vidlink';

// SRT -> WebVTT: prepend the header, convert comma decimal separators in
// timestamps to dots, and drop the numeric cue counters (optional in VTT).
function srtToVtt(srt) {
  const body = srt
    .replace(/\r+/g, '')
    .replace(/^﻿/, '')
    .replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, '$1.$2');

  const blocks = body.split(/\n\n+/).map((block) => {
    const lines = block.split('\n');
    // Strip a leading standalone cue number.
    if (lines.length && /^\d+$/.test(lines[0].trim())) lines.shift();
    return lines.join('\n');
  });

  return `WEBVTT\n\n${blocks.join('\n\n')}`.trim() + '\n';
}

export default async function handler(req, res) {
  const { url, type = 'srt' } = req.query;
  if (!url) return res.status(400).json({ error: 'missing url' });

  const target = decodeURIComponent(url);

  try {
    const upstream = await fetch(target, { headers: { ...VIDLINK_HEADERS, Accept: '*/*' } });
    if (!upstream.ok) return res.status(upstream.status).end();
    const text = await upstream.text();

    const isVtt = type === 'vtt' || /^WEBVTT/.test(text.trimStart());
    const vtt = isVtt ? text : srtToVtt(text);

    res.setHeader('Content-Type', 'text/vtt; charset=utf-8');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    return res.status(200).send(vtt);
  } catch (err) {
    console.error('[api/subs]', err.message);
    return res.status(502).json({ error: err.message });
  }
}
