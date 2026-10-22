const HTTP_MEDIA_ORIGIN = /^http:\/\/lang\.hexadelta\.in(?=\/|$)/i

export function normalizeMediaUrl(url) {
  if (typeof url !== 'string') return url

  return url.replace(HTTP_MEDIA_ORIGIN, 'https://lang.hexadelta.in')
}
