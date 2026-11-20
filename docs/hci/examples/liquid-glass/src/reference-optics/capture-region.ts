import html2canvas from "html2canvas-pro";

export function capturePixelRatio(region: HTMLElement, device: GPUDevice) {
  const side = Math.max(region.offsetWidth, region.offsetHeight, 1);
  return Math.min(
    window.devicePixelRatio || 1,
    2,
    device.limits.maxTextureDimension2D / side,
  );
}

export async function captureRegion(
  region: HTMLElement,
  pixelRatio: number,
  device: GPUDevice,
  signal: AbortSignal,
): Promise<GPUTexture> {
  await document.fonts.ready;
  signal.throwIfAborted();
  const capture = await html2canvas(region, {
    backgroundColor: "#f4f0e9",
    scale: pixelRatio,
    logging: false,
    allowTaint: false,
    imageTimeout: 3000,
  });
  signal.throwIfAborted();
  const bitmap = await createImageBitmap(capture);
  try {
    signal.throwIfAborted();
    const size = [bitmap.width, bitmap.height];
    const texture = device.createTexture({
      label: "local reference stage capture",
      size,
      format: "rgba8unorm",
      usage:
        GPUTextureUsage.TEXTURE_BINDING |
        GPUTextureUsage.COPY_DST |
        GPUTextureUsage.RENDER_ATTACHMENT,
    });
    device.queue.copyExternalImageToTexture(
      { source: bitmap },
      { texture },
      size,
    );
    return texture;
  } finally {
    bitmap.close();
    capture.width = 0;
    capture.height = 0;
  }
}
