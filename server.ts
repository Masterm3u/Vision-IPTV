import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { Readable } from "stream";

const TMDB_API_KEY = process.env.TMDB_API_KEY || "10471161c6c1b74f6278ff73bfe95982";

const GENRE_MAP: Record<number, string> = {
  28: "Action",
  12: "Aventure",
  16: "Animation",
  35: "Comédie",
  80: "Crime",
  99: "Documentaire",
  18: "Drame",
  10751: "Famille",
  14: "Fantastique",
  36: "Histoire",
  27: "Horreur",
  10402: "Musique",
  9648: "Mystère",
  10749: "Romance",
  878: "Science-Fiction",
  10770: "Téléfilm",
  53: "Thriller",
  10752: "Guerre",
  37: "Western"
};

// In-memory cache for TMDB movie details to ensure instant response on hover
const tmdbCache = new Map<string, any>();

function cleanMovieTitle(raw: string): { query: string; year?: string } {
  let title = raw;
  const yearMatch = title.match(/[\(\[\.](\d{4})[\)\]\.]/);
  const year = yearMatch ? yearMatch[1] : undefined;

  // Remove typical IPTV tags and prefixes
  title = title.replace(/^(?:[A-Z]{2,4}|VIP|VOD|FILM|FILMS|MOVIES|HD|4K|UHD|FHD)\s*[:|\-\/]\s*/i, '');
  title = title.replace(/\b(4K|UHD|FHD|HD|1080p|720p|2160p|HDR|DV|MULTi|VF|VOSTFR|TRUEFRENCH|FRENCH|EN|VO|BLURAY|WEB-DL|WEBRip|AAC|AC3|x264|x265|HEVC)\b/gi, ' ');
  title = title.replace(/[\(\[]\d{4}[\)\]]/g, ' ');
  title = title.replace(/\.(mp4|mkv|avi|ts)$/i, '');
  title = title.replace(/[._\-]/g, ' ');
  title = title.replace(/[\[\]\(\)\{\}]/g, ' ').replace(/\s+/g, ' ').trim();

  return { query: title || raw, year };
}

const DEFAULT_BROWSER_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

function resolveAbsoluteUrl(base: string, relative: string): string {
  try {
    return new URL(relative, base).href;
  } catch {
    return relative;
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Static files for PWA manifest, service worker and icons
  const publicDir = path.join(process.cwd(), "public");
  app.use(express.static(publicDir, {
    setHeaders: (res, filePath) => {
      if (filePath.endsWith("manifest.json") || filePath.endsWith("manifest.webmanifest")) {
        res.setHeader("Content-Type", "application/manifest+json");
      }
      if (filePath.endsWith("sw.js")) {
        res.setHeader("Content-Type", "application/javascript");
        res.setHeader("Service-Worker-Allowed", "/");
      }
    }
  }));

  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Proxy endpoint to bypass CORS and emulate Web Browser / custom User-Agent for playlists & XMLTV
  app.get("/api/proxy", async (req, res) => {
    const targetUrl = req.query.url as string;
    if (!targetUrl) return res.status(400).send("URL is required");

    const customUa = (req.query.ua as string) || (req.headers["x-user-agent"] as string) || DEFAULT_BROWSER_UA;
    const customReferer = (req.query.referer as string) || (req.headers["x-referer"] as string) || "";

    const headers: Record<string, string> = {
      "User-Agent": customUa,
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
      "Accept-Language": "fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7",
      "Sec-Ch-Ua": '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
      "Sec-Ch-Ua-Mobile": "?0",
      "Sec-Ch-Ua-Platform": '"Windows"',
      "Sec-Fetch-Dest": "empty",
      "Sec-Fetch-Mode": "cors",
      "Sec-Fetch-Site": "cross-site",
    };

    if (customReferer) {
      headers["Referer"] = customReferer;
    }

    const controller = new AbortController();
    req.on("close", () => {
      controller.abort();
    });

    try {
      const response = await fetch(targetUrl, { 
        headers, 
        signal: controller.signal, 
        redirect: 'follow' 
      });
      const contentType = response.headers.get("content-type") || "text/plain; charset=utf-8";
      res.setHeader("Content-Type", contentType);
      res.setHeader("Access-Control-Allow-Origin", "*");

      const text = await response.text();
      res.send(text);
    } catch (error: any) {
      if (error?.name === "AbortError" || req.destroyed) {
        return;
      }
      console.error("Proxy error:", error);
      if (!res.headersSent) {
        res.status(500).send("Failed to fetch target URL");
      }
    }
  });

  // Stream proxy endpoint to forward video streams with User-Agent & rewrite HLS playlists
  app.get("/api/stream", async (req, res) => {
    const targetUrl = req.query.url as string;
    if (!targetUrl) return res.status(400).send("URL is required");

    const customUa = (req.query.ua as string) || (req.headers["x-user-agent"] as string) || DEFAULT_BROWSER_UA;
    const customReferer = (req.query.referer as string) || (req.headers["x-referer"] as string) || "";

    const fetchHeaders: Record<string, string> = {
      "User-Agent": customUa,
      "Accept": "*/*",
      "Accept-Language": "fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7",
    };

    if (customReferer) {
      fetchHeaders["Referer"] = customReferer;
    }

    if (req.headers.range) {
      fetchHeaders["Range"] = req.headers.range;
    }

    const controller = new AbortController();
    req.on("close", () => {
      controller.abort();
    });

    try {
      const response = await fetch(targetUrl, {
        headers: fetchHeaders,
        signal: controller.signal,
        redirect: 'follow'
      });

      const finalUrl = response.url || targetUrl;
      const contentType = (response.headers.get("content-type") || "").toLowerCase();
      
      const isM3U8Candidate = (
        targetUrl.toLowerCase().includes(".m3u8") ||
        finalUrl.toLowerCase().includes(".m3u8") ||
        contentType.includes("mpegurl") ||
        contentType.includes("application/x-mpegurl") ||
        contentType.includes("vnd.apple.mpegurl")
      ) && !contentType.startsWith("video/") && !contentType.startsWith("audio/") && !contentType.includes("octet-stream");

      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Headers", "Range, Authorization, Content-Type, Accept");
      res.setHeader("Access-Control-Expose-Headers", "Content-Length, Content-Range, Accept-Ranges");

      // Handle HLS playlist rewriting
      if (isM3U8Candidate) {
        const text = await response.text();
        if (text.startsWith("#EXTM3U") || text.includes("#EXTINF") || text.includes("#EXT-X-")) {
          res.setHeader("Content-Type", "application/vnd.apple.mpegurl; charset=utf-8");
          const lines = text.split(/\r?\n/);
          const rewrittenLines = lines.map(line => {
            const trimmed = line.trim();
            if (!trimmed) return line;

            // Rewrite URI in tags (e.g. #EXT-X-KEY:METHOD=AES-128,URI="...", #EXT-X-MEDIA:...,URI="...")
            if (trimmed.startsWith("#EXT")) {
              return line.replace(/URI="([^"]+)"/g, (_, uriMatch) => {
                const absUri = resolveAbsoluteUrl(finalUrl, uriMatch);
                const proxyUri = `/api/stream?url=${encodeURIComponent(absUri)}&ua=${encodeURIComponent(customUa)}${customReferer ? `&referer=${encodeURIComponent(customReferer)}` : ''}`;
                return `URI="${proxyUri}"`;
              });
            }

            // Line is a segment or child playlist URL
            const absSegmentUrl = resolveAbsoluteUrl(finalUrl, trimmed);
            return `/api/stream?url=${encodeURIComponent(absSegmentUrl)}&ua=${encodeURIComponent(customUa)}${customReferer ? `&referer=${encodeURIComponent(customReferer)}` : ''}`;
          });

          return res.send(rewrittenLines.join("\n"));
        } else {
          // If read as text but not a valid M3U playlist format, send text directly and return
          res.status(response.status);
          if (contentType) res.setHeader("Content-Type", contentType);
          return res.send(text);
        }
      }

      // Forward binary stream (TS chunk, MP4, AAC, MKV, etc.)
      res.status(response.status);
      if (contentType) res.setHeader("Content-Type", contentType);
      const contentLength = response.headers.get("content-length");
      if (contentLength) res.setHeader("Content-Length", contentLength);
      const contentRange = response.headers.get("content-range");
      if (contentRange) res.setHeader("Content-Range", contentRange);
      const acceptRanges = response.headers.get("accept-ranges");
      if (acceptRanges) res.setHeader("Accept-Ranges", acceptRanges);

      if (!response.body) {
        return res.end();
      }

      // Convert Web ReadableStream to Node.js Readable stream safely
      const nodeStream = Readable.fromWeb(response.body as any);
      nodeStream.on("error", (err: any) => {
        if (err?.name === "AbortError" || req.destroyed) return;
        if (!res.headersSent) {
          res.status(500).end();
        } else {
          res.end();
        }
      });

      res.on("close", () => {
        nodeStream.destroy();
      });

      nodeStream.pipe(res);
    } catch (error: any) {
      if (error?.name === "AbortError" || req.destroyed) {
        return;
      }
      console.error("Stream proxy error:", error);
      if (!res.headersSent) {
        res.status(500).send("Failed to stream target media");
      } else {
        res.end();
      }
    }
  });


  // TMDB Movie Synopsis and Details Endpoint
  app.get("/api/tmdb/movie", async (req, res) => {
    const rawTitle = (req.query.title as string) || "";
    if (!rawTitle.trim()) {
      return res.status(400).json({ error: "Title parameter is required" });
    }

    const cacheKey = rawTitle.toLowerCase().trim();
    if (tmdbCache.has(cacheKey)) {
      return res.json(tmdbCache.get(cacheKey));
    }

    try {
      const { query: cleanedTitle, year } = cleanMovieTitle(rawTitle);

      // Search TMDB in French first
      let searchUrl = `https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(cleanedTitle)}&language=fr-FR&include_adult=false`;
      if (year) {
        searchUrl += `&year=${year}`;
      }

      let response = await fetch(searchUrl);
      let data = await response.json();

      // If no result with year, try without year
      if ((!data.results || data.results.length === 0) && year) {
        searchUrl = `https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(cleanedTitle)}&language=fr-FR&include_adult=false`;
        response = await fetch(searchUrl);
        data = await response.json();
      }

      // If still no result, try fallback search in English
      if (!data.results || data.results.length === 0) {
        searchUrl = `https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(cleanedTitle)}&language=en-US&include_adult=false`;
        response = await fetch(searchUrl);
        data = await response.json();
      }

      if (data.results && data.results.length > 0) {
        let movie = data.results[0];

        // If French overview is empty, attempt to fetch English overview
        if (!movie.overview || movie.overview.trim() === "") {
          try {
            const enRes = await fetch(`https://api.themoviedb.org/3/movie/${movie.id}?api_key=${TMDB_API_KEY}&language=en-US`);
            const enData = await enRes.json();
            if (enData.overview) {
              movie.overview = enData.overview;
            }
          } catch {
            // Ignore fallback error
          }
        }

        // Fetch videos (trailers), credits and details in parallel
        let trailer_key: string | null = null;
        let trailer_name: string | null = null;
        let cast: string[] = [];
        let director: string | null = null;
        let runtime: number | null = null;

        try {
          const [videosFrRes, videosEnRes, detailsRes, creditsRes] = await Promise.all([
            fetch(`https://api.themoviedb.org/3/movie/${movie.id}/videos?api_key=${TMDB_API_KEY}&language=fr-FR`).catch(() => null),
            fetch(`https://api.themoviedb.org/3/movie/${movie.id}/videos?api_key=${TMDB_API_KEY}&language=en-US`).catch(() => null),
            fetch(`https://api.themoviedb.org/3/movie/${movie.id}?api_key=${TMDB_API_KEY}&language=fr-FR`).catch(() => null),
            fetch(`https://api.themoviedb.org/3/movie/${movie.id}/credits?api_key=${TMDB_API_KEY}&language=fr-FR`).catch(() => null)
          ]);

          if (detailsRes && detailsRes.ok) {
            const detailsData = await detailsRes.json();
            if (detailsData.runtime) runtime = detailsData.runtime;
          }

          if (creditsRes && creditsRes.ok) {
            const creditsData = await creditsRes.json();
            if (creditsData.cast && Array.isArray(creditsData.cast)) {
              cast = creditsData.cast.slice(0, 6).map((c: any) => c.name);
            }
            if (creditsData.crew && Array.isArray(creditsData.crew)) {
              const dir = creditsData.crew.find((cr: any) => cr.job === "Director" || cr.department === "Directing");
              if (dir) director = dir.name;
            }
          }

          // Combine video results prioritizing French trailers then English trailers
          let videoList: any[] = [];
          if (videosFrRes && videosFrRes.ok) {
            const frData = await videosFrRes.json();
            if (frData.results) videoList.push(...frData.results);
          }
          if (videosEnRes && videosEnRes.ok) {
            const enData = await videosEnRes.json();
            if (enData.results) videoList.push(...enData.results);
          }

          const trailer = videoList.find((v: any) => v.site === "YouTube" && (v.type === "Trailer" || v.type === "Teaser" || v.type === "Clip"));
          if (trailer) {
            trailer_key = trailer.key;
            trailer_name = trailer.name;
          }
        } catch (extraErr) {
          console.warn("Could not fetch extra TMDB details:", extraErr);
        }

        const result = {
          found: true,
          id: movie.id,
          title: movie.title,
          original_title: movie.original_title,
          overview: movie.overview || "Aucun synopsis disponible pour ce titre.",
          release_date: movie.release_date,
          year: movie.release_date ? movie.release_date.substring(0, 4) : year || null,
          vote_average: movie.vote_average ? Math.round(movie.vote_average * 10) / 10 : null,
          vote_count: movie.vote_count || 0,
          poster_url: movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : null,
          backdrop_url: movie.backdrop_path ? `https://image.tmdb.org/t/p/w1280${movie.backdrop_path}` : null,
          genres: (movie.genre_ids || []).map((id: number) => GENRE_MAP[id]).filter(Boolean),
          trailer_key,
          trailer_name,
          cast,
          director,
          runtime,
          cleanedTitle
        };

        tmdbCache.set(cacheKey, result);
        return res.json(result);
      }

      // If nothing found
      const notFoundResult = {
        found: false,
        title: cleanedTitle,
        overview: "Synopsis indisponible sur TMDB.",
        genres: [],
        cleanedTitle
      };
      tmdbCache.set(cacheKey, notFoundResult);
      return res.json(notFoundResult);
    } catch (error) {
      console.error("TMDB error:", error);
      return res.status(500).json({ error: "Failed to fetch TMDB data" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
