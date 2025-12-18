
export const scrapeImdbTrailer = async ({ imdb_id }: { imdb_id: string }): Promise<string | null> => {
  if (!imdb_id) return null;

  try {
    // Step 1: Fetch the main movie page to find the trailer's video ID
    const titlePageUrl = `https://www.imdb.com/title/${imdb_id}/`;
    const titlePageResponse = await fetch(titlePageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      },
    });

    if (!titlePageResponse.ok) {
      console.error(`Failed to fetch IMDb title page for ${imdb_id}: ${titlePageResponse.statusText}`);
      return null;
    }

    const titlePageHtml = await titlePageResponse.text();
    const videoIdMatch = titlePageHtml.match(/\/video\/(vi\d+)/);

    if (!videoIdMatch || !videoIdMatch[1]) {
      console.warn(`Could not find a trailer video ID on IMDb page for ${imdb_id}.`);
      return null;
    }
    const videoId = videoIdMatch[1];

    // Step 2: Fetch the embed player page
    const embedUrl = `https://www.imdb.com/videoembed/${videoId}`;
    const embedPageResponse = await fetch(embedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      },
    });

    if (!embedPageResponse.ok) {
      console.error(`Failed to fetch IMDb embed page for ${videoId}: ${embedPageResponse.statusText}`);
      return null;
    }

    const embedPageHtml = await embedPageResponse.text();

    // Step 3: Extract the video source URL from the embedded JSON state
    const jsonMatch = embedPageHtml.match(/IMDbReactInitialState\.push\(({.*})\)/);

    if (!jsonMatch || !jsonMatch[1]) {
      console.error(`Could not find IMDbReactInitialState JSON on embed page for ${videoId}.`);
      return null;
    }

    const state = JSON.parse(jsonMatch[1]);
    const encodings = state?.videos?.videoLegacyEncodings;

    if (!Array.isArray(encodings) || encodings.length === 0) {
      console.warn(`No video encodings found in IMDb data for ${videoId}.`);
      return null;
    }

    const preferred = encodings.find(e => e.definition === '720p') || encodings.find(e => e.definition === '1080p');
    const chosenEncoding = preferred || encodings[0];
    const videoUrl = chosenEncoding?.videoUrl;

    if (!videoUrl) {
      console.warn(`Could not extract a video URL from encodings for ${videoId}.`);
      return null;
    }

    return videoUrl;
  } catch (error) {
    console.error(`An error occurred while scraping IMDb trailer for ${imdb_id}:`, error);
    return null;
  }
};
