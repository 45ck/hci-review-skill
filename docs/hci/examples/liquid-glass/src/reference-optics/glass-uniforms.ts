export interface GlassShape {
  width: number;
  height: number;
  radius: number;
}

export interface GlassLook {
  lensRefraction: number;
  sharp: number;
  f0: number;
  dispersion: number;
  specPower: number;
  edgeHighlight: number;
  rimStrength: number;
  fresnel: number;
}

export interface CanvasOnPage {
  x: number;
  y: number;
  width: number;
  height: number;
}

export const GLASS_SHAPE: GlassShape = { width: 1.0, height: 0.4, radius: 0.3 };

export const GLASS_LOOK: GlassLook = {
  lensRefraction: 0.3,
  sharp: 0.5,
  f0: 0.04,
  dispersion: 0.008,
  specPower: 32.0,
  edgeHighlight: 2.0,
  rimStrength: 0.15,
  fresnel: 0.3,
};

export const GLASS_UNIFORM_FLOATS = 16;

export function packGlassUniforms(target: Float32Array, canvas: CanvasOnPage, shape: GlassShape, look: GlassLook): void {
  target.set([
    canvas.x, canvas.y,
    canvas.width, canvas.height,
    shape.width, shape.height, shape.radius,
    look.lensRefraction, look.sharp, look.f0, look.dispersion,
    look.specPower, look.edgeHighlight, look.rimStrength, look.fresnel,
  ]);
}
