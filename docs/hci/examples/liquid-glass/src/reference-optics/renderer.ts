/// <reference types="@webgpu/types" />

import { GLASS_PASS_SHADER } from "./glass-pass-shader";
import {
  GLASS_LOOK,
  GLASS_SHAPE,
  GLASS_UNIFORM_FLOATS,
  packGlassUniforms,
  type CanvasOnPage,
} from "./glass-uniforms";

// Adapted from arya3d/liquid-glass-webgpu; the upstream shader is unchanged.
// See public/licenses/arya3d-liquid-glass-MIT.txt and this directory's README.
export class ReferenceGlassRenderer {
  private readonly context: GPUCanvasContext;
  private readonly pipeline: GPURenderPipeline;
  private readonly sampler: GPUSampler;
  private readonly uniformBuffer: GPUBuffer;
  private readonly uniformData = new Float32Array(GLASS_UNIFORM_FLOATS);
  private bindGroup?: GPUBindGroup;
  private pageTexture?: GPUTexture;
  private maskTexture?: GPUTexture;

  constructor(
    private readonly device: GPUDevice,
    private readonly canvas: HTMLCanvasElement,
  ) {
    const context = canvas.getContext("webgpu");
    if (!context)
      throw new Error("This browser could not create a WebGPU canvas.");
    this.context = context;
    const format = navigator.gpu.getPreferredCanvasFormat();
    this.context.configure({ device, format, alphaMode: "opaque" });
    const module = device.createShaderModule({
      label: "arya3d reference glass shader",
      code: GLASS_PASS_SHADER,
    });
    this.pipeline = device.createRenderPipeline({
      label: "reference glass",
      layout: "auto",
      vertex: { module, entryPoint: "vert_main" },
      fragment: {
        module,
        entryPoint: "frag_main",
        targets: [{ format }, { format: "rgba8unorm" }],
      },
      primitive: { topology: "triangle-list" },
    });
    this.sampler = device.createSampler({
      addressModeU: "clamp-to-edge",
      addressModeV: "clamp-to-edge",
      minFilter: "linear",
      magFilter: "linear",
    });
    this.uniformBuffer = device.createBuffer({
      label: "reference glass uniforms",
      size: this.uniformData.byteLength,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
  }

  showPage(texture: GPUTexture) {
    this.pageTexture?.destroy();
    this.pageTexture = texture;
    this.bindGroup = this.device.createBindGroup({
      layout: this.pipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: this.uniformBuffer } },
        { binding: 1, resource: this.sampler },
        { binding: 2, resource: texture.createView() },
      ],
    });
  }

  render(position: CanvasOnPage, refraction: number) {
    if (!this.bindGroup) return;
    packGlassUniforms(this.uniformData, position, GLASS_SHAPE, {
      ...GLASS_LOOK,
      lensRefraction: Math.max(0.001, refraction),
    });
    this.device.queue.writeBuffer(this.uniformBuffer, 0, this.uniformData);
    if (
      this.maskTexture?.width !== this.canvas.width ||
      this.maskTexture.height !== this.canvas.height
    ) {
      this.maskTexture?.destroy();
      this.maskTexture = this.device.createTexture({
        label: "reference glass mask",
        size: [this.canvas.width, this.canvas.height],
        format: "rgba8unorm",
        usage: GPUTextureUsage.RENDER_ATTACHMENT,
      });
    }
    const encoder = this.device.createCommandEncoder();
    const pass = encoder.beginRenderPass({
      colorAttachments: [
        {
          view: this.context.getCurrentTexture().createView(),
          clearValue: { r: 0, g: 0, b: 0, a: 1 },
          loadOp: "clear",
          storeOp: "store",
        },
        {
          view: this.maskTexture.createView(),
          clearValue: { r: 0, g: 0, b: 0, a: 0 },
          loadOp: "clear",
          storeOp: "store",
        },
      ],
    });
    pass.setPipeline(this.pipeline);
    pass.setBindGroup(0, this.bindGroup);
    pass.draw(6, 1);
    pass.end();
    this.device.queue.submit([encoder.finish()]);
  }

  destroy() {
    this.bindGroup = undefined;
    this.context.unconfigure();
    this.pageTexture?.destroy();
    this.maskTexture?.destroy();
    this.uniformBuffer.destroy();
  }
}
