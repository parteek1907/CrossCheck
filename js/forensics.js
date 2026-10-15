// TrustLens In-Browser Image Forensics Module
// Real Error Level Analysis (ELA) heatmap on canvas + EXIF inspection via exifr

/**
 * Performs client-side Error Level Analysis (ELA) on an image.
 * Resaves the image at 75% quality JPEG on an off-screen canvas,
 * computes pixel-level differences amplified by 20x, and renders a false-color heatmap.
 *
 * @param {HTMLImageElement|File|Blob|string} imageSource - Image element, File, Blob, or URL
 * @param {number} [quality=0.75] - Resave compression quality
 * @param {number} [amplification=20] - Error amplification factor
 * @returns {Promise<Object>} { canvas, dataUrl, meanError, maxError, anomalyScore, suspicionLevel }
 */
export async function performErrorLevelAnalysis(imageSource, quality = 0.75, amplification = 20) {
  const img = await loadImageElement(imageSource);

  // Limit canvas size for fast interactive performance while keeping detail
  const maxDim = 800;
  let w = img.naturalWidth || img.width;
  let h = img.naturalHeight || img.height;
  if (w > maxDim || h > maxDim) {
    const scale = Math.min(maxDim / w, maxDim / h);
    w = Math.round(w * scale);
    h = Math.round(h * scale);
  }

  // 1. Draw original on canvas A
  const origCanvas = document.createElement("canvas");
  origCanvas.width = w;
  origCanvas.height = h;
  const origCtx = origCanvas.getContext("2d", { willReadFrequently: true });
  origCtx.drawImage(img, 0, 0, w, h);
  const origData = origCtx.getImageData(0, 0, w, h);

  // 2. Compress to JPEG at specified quality
  const compressedDataUrl = origCanvas.toDataURL("image/jpeg", quality);
  const compressedImg = await loadImageElement(compressedDataUrl);

  // 3. Draw compressed on canvas B
  const compCanvas = document.createElement("canvas");
  compCanvas.width = w;
  compCanvas.height = h;
  const compCtx = compCanvas.getContext("2d", { willReadFrequently: true });
  compCtx.drawImage(compressedImg, 0, 0, w, h);
  const compData = compCtx.getImageData(0, 0, w, h);

  // 4. Create heatmap output canvas
  const elaCanvas = document.createElement("canvas");
  elaCanvas.width = w;
  elaCanvas.height = h;
  const elaCtx = elaCanvas.getContext("2d");
  const elaImageData = elaCtx.createImageData(w, h);

  const src = origData.data;
  const cmp = compData.data;
  const dest = elaImageData.data;

  let totalDiff = 0;
  let maxDiff = 0;
  const pixelCount = w * h;
  let highErrorCount = 0;

  for (let i = 0; i < src.length; i += 4) {
    const dr = Math.abs(src[i] - cmp[i]);
    const dg = Math.abs(src[i + 1] - cmp[i + 1]);
    const db = Math.abs(src[i + 2] - cmp[i + 2]);
    const avgDiff = (dr + dg + db) / 3;

    totalDiff += avgDiff;
    if (avgDiff > maxDiff) maxDiff = avgDiff;

    const amplified = Math.min(255, Math.round(avgDiff * amplification));
    if (amplified > 130) highErrorCount++;

    // Colormap: Low error = dark purple/blue, Medium = cyan/yellow, High = bright red/white
    if (amplified < 64) {
      dest[i] = Math.round(amplified * 0.8);        // R
      dest[i + 1] = Math.round(amplified * 0.4);    // G
      dest[i + 2] = Math.round(amplified * 2.2);    // B
    } else if (amplified < 160) {
      dest[i] = Math.round(amplified * 1.5);
      dest[i + 1] = Math.round(amplified * 1.4);
      dest[i + 2] = 40;
    } else {
      dest[i] = 255;
      dest[i + 1] = Math.round(255 - (amplified - 160) * 2.5);
      dest[i + 2] = Math.round(255 - (amplified - 160) * 2.5);
    }
    dest[i + 3] = 255; // Alpha
  }

  elaCtx.putImageData(elaImageData, 0, 0);

  const meanError = Math.round((totalDiff / pixelCount) * 100) / 100;
  const highErrorRatio = highErrorCount / pixelCount;

  // Anomaly score: 0 (clean uniform compression) to 100 (severe localized modification artifacts)
  let anomalyScore = Math.min(100, Math.round(meanError * 8 + highErrorRatio * 150));
  let suspicionLevel = "Low Discrepancy";
  let suspicionColor = "#059669";

  if (anomalyScore > 55 || maxDiff > 35) {
    suspicionLevel = "High Localized Anomaly";
    suspicionColor = "#dc2626";
  } else if (anomalyScore > 30) {
    suspicionLevel = "Moderate Discrepancy";
    suspicionColor = "#d97706";
  }

  return {
    canvas: elaCanvas,
    dataUrl: elaCanvas.toDataURL("image/png"),
    meanError,
    maxError,
    anomalyScore,
    suspicionLevel,
    suspicionColor,
    dimensions: { width: w, height: h }
  };
}

/**
 * Inspects EXIF metadata in the browser using the exifr library.
 * Detects editing signatures (Photoshop, GIMP, AI generators) and camera hardware consistency.
 *
 * @param {File|Blob|string} imageFile - File, Blob, or URL
 * @returns {Promise<Object>} { hasExif, metadata, suspiciousFlags, authenticitySignal, description }
 */
export async function inspectImageExif(imageFile) {
  const suspiciousFlags = [];
  let metadata = null;
  let hasExif = false;

  try {
    const exifrLib = window.exifr;
    if (exifrLib) {
      metadata = await exifrLib.parse(imageFile, {
        tiff: true,
        xmp: true,
        icc: true,
        iptc: true,
        jfif: true
      });
    }
  } catch (err) {
    console.warn("EXIF extraction encountered a parse note:", err);
  }

  if (metadata && Object.keys(metadata).length > 0) {
    hasExif = true;

    // Check for AI or editing software signatures
    const software = String(metadata.Software || metadata.software || "").toLowerCase();
    const artist = String(metadata.Artist || "").toLowerCase();
    const comment = String(metadata.UserComment || metadata.ImageDescription || "").toLowerCase();

    const aiSignatures = ["midjourney", "stable diffusion", "dall-e", "novelai", "comfyui", "flux", "civitai"];
    const editorSignatures = ["adobe photoshop", "photoshop", "gimp", "lightroom", "canva", "pixlr"];

    for (const sig of aiSignatures) {
      if (software.includes(sig) || comment.includes(sig) || artist.includes(sig)) {
        suspiciousFlags.push(`AI Generator signature detected in metadata: "${sig}"`);
      }
    }

    for (const sig of editorSignatures) {
      if (software.includes(sig)) {
        suspiciousFlags.push(`Image editing software signature found: "${metadata.Software}"`);
      }
    }

    if (!metadata.Make && !metadata.Model) {
      suspiciousFlags.push("No camera hardware sensor info (common in digital renders/web downloads)");
    }
  } else {
    suspiciousFlags.push("EXIF metadata completely stripped or absent (typical for messaging app forwards)");
  }

  // Calculate authenticity signal (0 to 100)
  let authenticitySignal = 70;
  if (suspiciousFlags.some(f => f.includes("AI Generator"))) {
    authenticitySignal = 15;
  } else if (suspiciousFlags.some(f => f.includes("editing software"))) {
    authenticitySignal = 35;
  } else if (!hasExif) {
    authenticitySignal = 50; // Inconclusive
  } else if (metadata?.Make && metadata?.Model) {
    authenticitySignal = 85;
  }

  return {
    hasExif,
    metadata: metadata || {},
    suspiciousFlags,
    authenticitySignal,
    camera: metadata?.Make ? `${metadata.Make} ${metadata.Model || ""}`.trim() : "Unknown Camera",
    software: metadata?.Software || "None / Stripped",
    dateTime: metadata?.DateTimeOriginal ? new Date(metadata.DateTimeOriginal).toLocaleString() : "Not Recorded"
  };
}

/**
 * Helper to load an image source into an HTMLImageElement
 * @param {HTMLImageElement|File|Blob|string} src
 * @returns {Promise<HTMLImageElement>}
 */
function loadImageElement(src) {
  return new Promise((resolve, reject) => {
    if (src instanceof HTMLImageElement && src.complete && src.naturalWidth > 0) {
      return resolve(src);
    }
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = e => reject(new Error("Failed to load image for forensics analysis"));

    if (src instanceof File || src instanceof Blob) {
      img.src = URL.createObjectURL(src);
    } else if (typeof src === "string") {
      img.src = src;
    } else if (src instanceof HTMLImageElement) {
      img.src = src.src;
    } else {
      reject(new Error("Unsupported image source type"));
    }
  });
}
