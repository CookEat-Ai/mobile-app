export async function searchImage(keywords: string) {
  const url = 'https://duckduckgo.com/';
  const params = {
    q: keywords
  };

  try {
    const initialParams = new URLSearchParams(params);
    const res = await fetch(url + '?' + initialParams.toString());
    const htmlData = await res.text();
    const searchObj = htmlData.match(/vqd="([\d-]+)"/);

    if (!searchObj)
      return -1;

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
    const results = data.results;

    let notFound = true;
    let width = 4000;

    while (notFound) {
      for (const result of results) {
        if (result.width > width && result.image.includes("https"))
          return result.image;
      }
      width -= 300;
    }

    return null;
  } catch (error) {
    console.error("Erreur:", error instanceof Error ? error.message : String(error));
  }
}