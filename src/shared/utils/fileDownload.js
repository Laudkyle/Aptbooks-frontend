export function downloadBlob(blob, filename = 'download') {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

export function filenameFromContentDisposition(contentDisposition) {
  if (!contentDisposition) return null;

  const utf8Match = /filename\*=(?:UTF-8'')?([^;]+)/i.exec(contentDisposition);
  if (utf8Match?.[1]) {
    return decodeURIComponent(utf8Match[1].trim().replace(/^"|"$/g, ''));
  }

  const match = /filename=([^;]+)/i.exec(contentDisposition);
  if (match?.[1]) return match[1].trim().replace(/^"|"$/g, '');
  return null;
}
