/**
 * Client-side file page count detector.
 * Fast, lightweight zero-dependency parser for PDFs and image files.
 */
export async function detectClientPageCount(file: File): Promise<number> {
  const ext = file.name.toLowerCase().split('.').pop() || '';

  // 1. Single images
  if (['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp', 'svg'].includes(ext)) {
    return 1;
  }

  // 2. PDF Files: Parse binary buffer for page tree count
  if (ext === 'pdf' || file.type === 'application/pdf') {
    try {
      const buffer = await file.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      const text = new TextDecoder('latin1').decode(bytes);

      // Look for /Type /Pages /Count N pattern (standard PDF page tree root)
      const countMatches = [...text.matchAll(/\/Type\s*\/Pages[\s\S]*?\/Count\s+(\d+)/g)];
      if (countMatches.length > 0) {
        // The highest /Count in the /Pages catalog is the total page count
        const counts = countMatches.map((m) => parseInt(m[1], 10)).filter((n) => !isNaN(n));
        if (counts.length > 0) {
          return Math.max(...counts);
        }
      }

      // Fallback: Count /Type /Page objects (excluding /Type /Pages)
      const pageMatches = text.match(/\/Type\s*\/Page\b(?!\s*s)/g);
      if (pageMatches && pageMatches.length > 0) {
        return pageMatches.length;
      }
    } catch (err) {
      console.warn('Client PDF page detection fallback:', err);
    }
  }

  // Default to 1 (backend will also perform authoritative server-side detection)
  return 1;
}
