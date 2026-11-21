/// <reference types="@webgpu/types" />
import { LIQUID_GLASS_SHADER } from "./shader";
import type { Box, LiquidSurface } from "./surfaces";
import type { SurfaceMotion } from "./motion";

const MAX_SURFACES = 256;
export class LiquidRenderer {
  private readonly sampler: GPUSampler;
  private texture?: GPUTexture;
  private readonly layers = new Map<
    HTMLCanvasElement,
    {
      context: GPUCanvasContext;
      uniform: GPUBuffer;
      data: GPUBuffer;
      bind?: GPUBindGroup;
    }
  >();
  private constructor(
    private readonly device: GPUDevice,
    private readonly pipeline: GPURenderPipeline,
    private readonly format: GPUTextureFormat,
  ) {
    this.sampler = device.createSampler({
      addressModeU: "clamp-to-edge",
      addressModeV: "clamp-to-edge",
      magFilter: "linear",
      minFilter: "linear",
    });
  }

  static async create(device: GPUDevice) {
    const format = navigator.gpu.getPreferredCanvasFormat();
    const module = device.createShaderModule({
      label: "UI Liquid Glass optics",
      code: LIQUID_GLASS_SHADER,
    });
    const pipeline = await device.createRenderPipelineAsync({
      label: "shared UI Liquid Glass pipeline",
      layout: "auto",
      vertex: { module, entryPoint: "vertex_main" },
      fragment: {
        module,
        entryPoint: "fragment_main",
        targets: [
          {
            format,
            blend: {
              color: { srcFactor: "one", dstFactor: "one-minus-src-alpha" },
              alpha: { srcFactor: "one", dstFactor: "one-minus-src-alpha" },
            },
          },
        ],
      },
      primitive: { topology: "triangle-list" },
    });
    return new LiquidRenderer(device, pipeline, format);
  }

  setBackdrop(texture: GPUTexture) {
    this.texture?.destroy();
    this.texture = texture;
    for (const layer of this.layers.values()) layer.bind = undefined;
  }

  attach(canvas: HTMLCanvasElement) {
    if (this.layers.has(canvas)) return;
    const context = canvas.getContext("webgpu");
    if (!context) throw new Error("WebGPU canvas context unavailable");
    context.configure({
      device: this.device,
      format: this.format,
      alphaMode: "premultiplied",
    });
    this.layers.set(canvas, {
      context,
      uniform: this.device.createBuffer({
        size: 48,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      }),
      data: this.device.createBuffer({
        size: MAX_SURFACES * 96,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
      }),
    });
  }

  draw(
    canvas: HTMLCanvasElement,
    view: Box,
    backdrop: Box,
    surfaces: LiquidSurface[],
    refraction: number,
    dispersion: number,
    ratio: number,
    motion: ReadonlyMap<HTMLElement, SurfaceMotion>,
  ) {
    if (!this.texture || !view.width || !view.height) return;
    this.attach(canvas);
    const layer = this.layers.get(canvas)!;
    const limit = this.device.limits.maxTextureDimension2D;
    const layerRatio = Math.min(
      ratio,
      limit / Math.max(view.width, view.height),
    );
    const width = Math.max(
      1,
      Math.min(limit, Math.round(view.width * layerRatio)),
    );
    const height = Math.max(
      1,
      Math.min(limit, Math.round(view.height * layerRatio)),
    );
    if (canvas.width !== width) canvas.width = width;
    if (canvas.height !== height) canvas.height = height;
    const settings = new Float32Array([
      view.x,
      view.y,
      view.width,
      view.height,
      backdrop.x,
      backdrop.y,
      backdrop.width,
      backdrop.height,
      refraction,
      dispersion,
      0,
      0,
    ]);
    this.device.queue.writeBuffer(layer.uniform, 0, settings);
    const data = new Float32Array(Math.max(1, surfaces.length) * 24);
    surfaces.forEach((surface, index) => {
      const effect = motion.get(surface.element);
      data.set(
        [
          surface.rect.x,
          surface.rect.y,
          surface.rect.width,
          surface.rect.height,
          surface.clip.x,
          surface.clip.y,
          surface.clip.width,
          surface.clip.height,
          surface.radius,
          surface.reflection,
          0,
          0,
          effect?.x ?? surface.rect.x + surface.rect.width * 0.5,
          effect?.y ?? surface.rect.y + surface.rect.height * 0.5,
          effect?.light ?? 0,
          effect?.press ?? 0,
          effect?.rippleX ?? 0,
          effect?.rippleY ?? 0,
          effect?.rippleAge ?? 0,
          effect?.rippleStrength ?? 0,
          ...surface.tint,
        ],
        index * 24,
      );
    });
    this.device.queue.writeBuffer(layer.data, 0, data);
    layer.bind ??= this.device.createBindGroup({
      layout: this.pipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: layer.uniform } },
        { binding: 1, resource: this.sampler },
        { binding: 2, resource: this.texture.createView() },
        { binding: 3, resource: { buffer: layer.data } },
      ],
    });
    const encoder = this.device.createCommandEncoder();
    const pass = encoder.beginRenderPass({
      colorAttachments: [
        {
          view: layer.context.getCurrentTexture().createView(),
          clearValue: { r: 0, g: 0, b: 0, a: 0 },
          loadOp: "clear",
          storeOp: "store",
        },
      ],
    });
    pass.setPipeline(this.pipeline);
    pass.setBindGroup(0, layer.bind);
    if (surfaces.length) pass.draw(6, surfaces.length);
    pass.end();
    this.device.queue.submit([encoder.finish()]);
  }

  removeLayer(canvas: HTMLCanvasElement) {
    const layer = this.layers.get(canvas);
    if (!layer) return;
    layer.context.unconfigure();
    layer.uniform.destroy();
    layer.data.destroy();
    this.layers.delete(canvas);
  }

  destroy() {
    for (const canvas of this.layers.keys()) this.removeLayer(canvas);
    this.texture?.destroy();
  }
}
