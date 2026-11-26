/**
 * The most vivid colour in a cover image, so the equaliser and progress bar
 * pick up the album's own colour instead of the app accent. Sampled at 12x12;
 * covers are `data:` URLs, so the canvas is never tainted.
 */
export function vividColour(src: string): Promise<string | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const S = 12;
        const c = document.createElement("canvas");
        c.width = c.height = S;
        const g = c.getContext("2d", { willReadFrequently: true });
        if (!g) return resolve(null);
        g.drawImage(img, 0, 0, S, S);
        const px = g.getImageData(0, 0, S, S).data;
        let best: [number, number, number] | null = null;
        let bestScore = 0;
        for (let i = 0; i < px.length; i += 4) {
          const r = px[i], gr = px[i + 1], b = px[i + 2];
          const max = Math.max(r, gr, b), min = Math.min(r, gr, b);
          const sat = max === 0 ? 0 : (max - min) / max;
          // favour saturated, mid-to-bright pixels; near-black and grey lose
          const score = sat * (max / 255) * (max > 60 ? 1 : 0.2);
          if (score > bestScore) {
            bestScore = score;
            best = [r, gr, b];
          }
        }
        if (!best || bestScore < 0.18) return resolve(null);
        // lift dark picks so they read on the black island
        const lift = Math.max(1, 170 / Math.max(...best));
        const [r, gr, b] = best.map((v) => Math.min(255, Math.round(v * lift)));
        resolve(`rgb(${r}, ${gr}, ${b})`);
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = src;
  });
}
