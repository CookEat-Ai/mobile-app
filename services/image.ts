import { apiService } from './api';

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const PINTEREST_BASE_URL = 'https://fr.pinterest.com';
const DUCKDUCKGO_URL = 'https://duckduckgo.com/';
const PINTEREST_STATIC_ASSET_URLS = new Set([
  'https://i.pinimg.com/originals/d5/3b/01/d53b014d86a6b6761bf649a0ed813c2b.png',
]);

function normalizeImageUrl(url: string) {
  return url.replace(/\\u002F/g, '/').replace(/\\\//g, '/');
}

function isValidImageUrl(url: string, existingImages: string[]) {
  return Boolean(url)
    && url.startsWith('https://')
    && !url.includes('fbsbx')
    && !PINTEREST_STATIC_ASSET_URLS.has(url)
    && !existingImages.includes(url);
}

async function canUseImage(url: string) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    const imageRes = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    const contentType = imageRes.headers.get('content-type') ?? '';
    return imageRes.ok && ALLOWED_IMAGE_TYPES.some(type => contentType.startsWith(type));
  } catch {
    return false;
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function searchImageFromPinterest(keywords: string, existingImages: string[]) {
  const searchParams = new URLSearchParams({ q: keywords, rs: 'typed' });
  const searchUrl = `${PINTEREST_BASE_URL}/search/pins/?${searchParams.toString()}`;
  const response = await fetch(searchUrl, {
    headers: {
      'accept-language': 'fr-FR,fr;q=0.9,en;q=0.8',
      'user-agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
    }
  });

  if (!response.ok) {
    return null;
  }

  const html = await response.text();

  // 1) Source principale: endpoint JSON Pinterest (vraies images de résultats)
  const cookieFromSetCookie = (response.headers.get('set-cookie') ?? '')
    .split(',')
    .map(part => part.trim())
    .filter(Boolean)
    .map(part => part.split(';')[0])
    .join('; ');
  const csrfToken = cookieFromSetCookie
    .split(';')
    .map(part => part.trim())
    .find(part => part.startsWith('csrftoken='))
    ?.split('=')[1];

  const options = {
    query: keywords,
    scope: 'pins',
    source_id: 'typed',
  };
  const dataParam = JSON.stringify({ options, context: {} });
  const sourceUrl = `/search/pins/?${searchParams.toString()}`;
  const apiParams = new URLSearchParams({
    source_url: sourceUrl,
    data: dataParam,
    _: `${Date.now()}`,
  });

  const apiResponse = await fetch(`${PINTEREST_BASE_URL}/resource/BaseSearchResource/get/?${apiParams.toString()}`, {
    headers: {
      'accept': 'application/json, text/javascript, */*, q=0.01',
      'accept-language': 'fr-FR,fr;q=0.9,en;q=0.8',
      'user-agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
      'referer': searchUrl,
      'x-requested-with': 'XMLHttpRequest',
      'x-pinterest-appstate': 'active',
      'x-app-version': 'c9f6d8',
      'x-pinterest-pws-handler': 'www/[username]/[slug].js',
      ...(csrfToken ? { 'x-csrftoken': csrfToken } : {}),
      ...(cookieFromSetCookie ? { cookie: cookieFromSetCookie } : {})
    }
  });

  if (apiResponse.ok) {
    const apiData = await apiResponse.json();
    const results: any[] = apiData?.resource_response?.data?.results ?? [];

    const apiCandidates: { url: string }[] = [];
    for (const result of results) {
      // Filtrage par métadonnées pour éviter les images avec trop de texte (recettes, tutoriels)
      const gridTitle = (result.grid_title || '').toLowerCase();
      const title = (result.title || '').toLowerCase();
      const description = (result.description || '').toLowerCase();

      const isTextHeavy =
        gridTitle.includes('recette') || gridTitle.includes('recipe') ||
        gridTitle.includes('ingrédient') || gridTitle.includes('ingredient') ||
        gridTitle.includes('tuto') || gridTitle.includes('tutorial') ||
        title.includes('recette') || title.includes('recipe') ||
        description.includes('recette') || description.includes('recipe');

      if (isTextHeavy) {
        continue;
      }

      const images = result?.images ?? {};
      const rankedKeys = ['orig', '736x', '564x', '474x', '236x'];
      for (const key of rankedKeys) {
        const imageObj = images?.[key];
        const imageUrl = imageObj?.url;
        if (isValidImageUrl(imageUrl, existingImages)) {
          apiCandidates.push({
            url: imageUrl,
          });
          break;
        }
      }
    }

    const uniqueApiCandidates = Array.from(
      new Map(apiCandidates.map(candidate => [candidate.url, candidate])).values()
    );

    let validationCount = 0;
    for (const candidate of uniqueApiCandidates) {
      if (await canUseImage(candidate.url)) {
        // Validation par IA (limitée aux 2 premiers candidats pour la performance)
        if (validationCount < 2) {
          validationCount++;
          const validation = await apiService.validateImage(candidate.url);
          if (validation.data?.isValid === false) {
            console.log('[searchImage] Image rejetée par l\'IA (texte ou non-alimentaire):', candidate.url);
            continue;
          }
        }

        console.log('[searchImage] title=', keywords, 'source=pinterest-api url=', candidate.url);
        return candidate.url;
      }
    }
  }

  // 2) Fallback Pinterest robuste: ouvrir les pages de pins et lire og:image
  const pinPathRegex = /\/pin\/\d+\//g;
  const pinPaths = Array.from(new Set(html.match(pinPathRegex) ?? [])).slice(0, 10);
  let validationCount = 0;
  for (const pinPath of pinPaths) {
    try {
      const pinResponse = await fetch(`${PINTEREST_BASE_URL}${pinPath}`, {
        headers: {
          'accept-language': 'fr-FR,fr;q=0.9,en;q=0.8',
          'user-agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
        }
      });
      if (!pinResponse.ok) {
        continue;
      }

      const pinHtml = await pinResponse.text();
      const ogImageMatch = pinHtml.match(/<meta\s+property="og:image"\s+content="([^"]+)"/i);
      const ogImageUrl = ogImageMatch?.[1];
      if (ogImageUrl
        && isValidImageUrl(ogImageUrl, existingImages)
        && await canUseImage(ogImageUrl)
      ) {
        // Validation par IA (limitée aux 2 premiers candidats pour la performance)
        if (validationCount < 2) {
          validationCount++;
          const validation = await apiService.validateImage(ogImageUrl);
          if (validation.data?.isValid === false) {
            console.log('[searchImage] Image rejetée par l\'IA (texte ou non-alimentaire):', ogImageUrl);
            continue;
          }
        }

        console.log('[searchImage] title=', keywords, 'source=pinterest-pin-page url=', ogImageUrl);
        return ogImageUrl;
      }
    } catch {
      // ignore et on teste le pin suivant
    }
  }

  // 3) Fallback Pinterest final: extraction simple depuis le HTML
  const pinimgRegex = /https:\/\/i\.pinimg\.com\/[^"'\s<>()]+/g;
  const matches = html.match(pinimgRegex) ?? [];
  const uniqueCandidates = Array.from(new Set(matches))
    .map(normalizeImageUrl)
    .filter(url => isValidImageUrl(url, existingImages));

  let finalValidationCount = 0;
  for (const imageUrl of uniqueCandidates) {
    if (await canUseImage(imageUrl)) {
      // Validation par IA (limitée aux 2 premiers candidats pour la performance)
      if (finalValidationCount < 2) {
        finalValidationCount++;
        const validation = await apiService.validateImage(imageUrl);
        if (validation.data?.isValid === false) {
          console.log('[searchImage] Image rejetée par l\'IA (texte ou non-alimentaire):', imageUrl);
          continue;
        }
      }

      console.log('[searchImage] title=', keywords, 'source=pinterest-html url=', imageUrl);
      return imageUrl;
    }
  }

  return null;
}

async function searchImageFromGoogle(keywords: string, existingImages: string[]) {
  const searchParams = new URLSearchParams({
    q: keywords,
    tbm: 'isch',
    hl: 'fr',
  });
  const searchUrl = `https://www.google.com/search?${searchParams.toString()}`;

  try {
    const response = await fetch(searchUrl, {
      headers: {
        'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'accept-language': 'fr-FR,fr;q=0.9,en;q=0.8',
        'user-agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
      },
    });

    if (!response.ok) {
      return null;
    }

    const html = await response.text();
    const candidates: string[] = [];

    // Google embeds original image URLs as ["url", width, height] in script blocks
    const urlPattern = /\["(https?:\/\/(?!encrypted-tbn|www\.google|maps\.google|lh\d\.google|play\.google|gstatic|googleapis)[^"]+)",\s*(\d+),\s*(\d+)\]/g;
    let match;

    while ((match = urlPattern.exec(html)) !== null) {
      const width = parseInt(match[2], 10);
      const height = parseInt(match[3], 10);
      if (width < 200 || height < 200) continue;

      const url = match[1]
        .replace(/\\u003d/g, '=')
        .replace(/\\u0026/g, '&')
        .replace(/\\u002F/g, '/')
        .replace(/\\\//g, '/');

      if (isValidImageUrl(url, existingImages)) {
        candidates.push(url);
      }
    }

    // Fallback: data-ou attributes (older Google format)
    if (candidates.length === 0) {
      const dataPattern = /data-ou="(https?:\/\/[^"]+)"/g;
      while ((match = dataPattern.exec(html)) !== null) {
        const url = decodeURIComponent(match[1]);
        if (isValidImageUrl(url, existingImages)) {
          candidates.push(url);
        }
      }
    }

    const uniqueCandidates = [...new Set(candidates)];

    let validationCount = 0;
    for (const imageUrl of uniqueCandidates) {
      if (await canUseImage(imageUrl)) {
        if (validationCount < 2) {
          validationCount++;
          const validation = await apiService.validateImage(imageUrl);
          if (validation.data?.isValid === false) {
            console.log('[searchImage] Image rejetée par l\'IA (texte ou non-alimentaire):', imageUrl);
            continue;
          }
        }

        console.log('[searchImage] title=', keywords, 'source=google url=', imageUrl);
        return imageUrl;
      }
    }

    return null;
  } catch (error) {
    console.error('Google image search error:', error instanceof Error ? error.message : String(error));
    return null;
  }
}

async function searchImageFromDuckDuckGo(keywords: string, existingImages: string[]) {
  const url = DUCKDUCKGO_URL;

  try {
    const initialParams = new URLSearchParams({ q: keywords });
    const res = await fetch(url + '?' + initialParams.toString());
    const htmlData = await res.text();
    const searchObj = htmlData.match(/vqd="([\d-]+)"/);

    if (!searchObj)
      return null;

    const searchParams = new URLSearchParams({
      l: 'wt-wt',
      o: 'json',
      q: keywords,
      vqd: searchObj[1],
      f: ',,,',
      p: '2'
    });

    const requestUrl = url + "i.js?" + searchParams.toString();

    const response = await fetch(requestUrl, {
      headers: {
        'dnt': '1',
        'x-requested-with': 'XMLHttpRequest',
        'accept-language': 'en-GB,en-US;q=0.8,en;q=0.6,ms;q=0.4',
        'user-agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/55.0.2883.87 Safari/537.36',
        'accept': 'application/json, text/javascript, */*; q=0.01',
        'referer': 'https://duckduckgo.com/',
        'authority': 'duckduckgo.com',
      }
    });

    const data = await response.json();
    const results: any[] = data.results ?? [];

    // Trier par largeur décroissante pour commencer par les images les plus larges
    // const sorted = [...results]
    //   .filter(r => isValidImageUrl(r.image, existingImages))
    //   .sort((a, b) => b.width - a.width);
    const sorted = results

    for (const result of sorted) {
      if (await canUseImage(result.image as string)) {
        console.log('[searchImage] title=', keywords, 'source=duckduckgo url=', result.image as string);
        return result.image as string;
      }
    }

    return null;
  } catch (error) {
    console.error('searchImage error:', error instanceof Error ? error.message : String(error));
    return null;
  }
}

export async function searchImage(keywords: string, existingImages: string[]) {
  // 1) Google Images
  try {
    const googleImage = await searchImageFromGoogle(keywords, existingImages);
    if (googleImage) {
      return googleImage;
    }
  } catch (error) {
    console.warn('Google search failed, fallback to DuckDuckGo:', error instanceof Error ? error.message : String(error));
  }

  // 2) Fallback: DuckDuckGo
  return searchImageFromDuckDuckGo(keywords, existingImages);
}
