/*! Adapted from arya3d/liquid-glass-webgpu (MIT, copyright 2026 arya3d).
 * Source 90cb73931bbaf38bd54b3263cd3fda1daef1869c; see LICENSES/arya3d-MIT.txt. */
export const LIQUID_GLASS_SHADER = /* wgsl */ `
struct Scene {
  viewport: vec4f,
  backdrop: vec4f,
  optics: vec4f,
};
struct Surface {
  rect: vec4f,
  clip: vec4f,
  style: vec4f,
};
@group(0) @binding(0) var<uniform> scene: Scene;
@group(0) @binding(1) var backdrop_sampler: sampler;
@group(0) @binding(2) var backdrop_texture: texture_2d<f32>;
@group(0) @binding(3) var<storage, read> surfaces: array<Surface>;
struct Vertex {
  @builtin(position) position: vec4f,
  @location(0) point: vec2f,
  @location(1) @interpolate(flat) index: u32,
};
@vertex
fn vertex_main(@builtin(vertex_index) vertex: u32, @builtin(instance_index) index: u32) -> Vertex {
  const corners = array<vec2f, 6>(vec2(0, 0), vec2(1, 0), vec2(1, 1), vec2(0, 0), vec2(1, 1), vec2(0, 1));
  let surface = surfaces[index];
  let point = surface.clip.xy + corners[vertex] * surface.clip.zw;
  let local = (point - scene.viewport.xy) / scene.viewport.zw;
  return Vertex(vec4f(local.x * 2.0 - 1.0, 1.0 - local.y * 2.0, 0, 1), point, index);
}
fn sample_backdrop(point: vec2f) -> vec3f {
  let uv = (point - scene.backdrop.xy) / scene.backdrop.zw;
  return textureSampleLevel(backdrop_texture, backdrop_sampler, uv, 0.0).rgb;
}
fn rounded_box_distance(point: vec2f, half_size: vec2f, radius: f32) -> f32 {
  let from_corner = abs(point) - half_size + radius;
  return length(max(from_corner, vec2f(0.0))) + min(max(from_corner.x, from_corner.y), 0.0) - radius;
}
@fragment
fn fragment_main(vertex: Vertex) -> @location(0) vec4f {
  let surface = surfaces[vertex.index];
  let size = surface.rect.zw;
  let center = surface.rect.xy + size * 0.5;
  let point = vertex.point - center;
  let radius = min(surface.style.x, min(size.x, size.y) * 0.5);
  let distance = rounded_box_distance(point, size * 0.5, radius);
  let coverage = 1.0 - smoothstep(-0.75, 0.75, distance);
  if (coverage <= 0.0) { discard; }

  let bevel = max(0.5, min(min(size.x, size.y) * scene.optics.x, 48.0));
  let depth = clamp(-distance / bevel, 0.0, 1.0);
  let bend = pow(depth, 0.25) * 1.5707963;
  let spread = scene.optics.y * (1.0 - depth * 0.909);
  let bent = point * sin(bend);
  let channel_offset = bent * spread;
  let red = sample_backdrop(center + (point - channel_offset) * sin(bend * 0.98)).r;
  let green = sample_backdrop(center + bent).g;
  let blue = sample_backdrop(center + (point + channel_offset) * sin(bend * 1.02)).b;

  let dx = rounded_box_distance(point + vec2f(0.5, 0), size * 0.5, radius)
         - rounded_box_distance(point - vec2f(0.5, 0), size * 0.5, radius);
  let dy = rounded_box_distance(point + vec2f(0, 0.5), size * 0.5, radius)
         - rounded_box_distance(point - vec2f(0, 0.5), size * 0.5, radius);
  let normal = normalize(vec3f(dx * (1.0 - depth), dy * (1.0 - depth), 1.0));
  let facing = max(normal.z, 0.0);
  let fresnel = 0.04 + 0.96 * pow(1.0 - facing, 5.0);
  let ring = 1.0 - smoothstep(0.0, 1.6, abs(distance + 0.7));
  let halfway = normalize(normalize(vec3f(0.3, -0.5, 1.0)) + vec3f(0, 0, 1));
  let shine = pow(max(dot(normal, halfway), 0.0), 32.0) * ring * 0.15;
  let edge = ring * (0.13 + fresnel * 0.5);
  let rim = pow(1.0 - facing, 3.0) * 0.15;
  let transmitted = mix(vec3f(red, green, blue), vec3f(0.9804, 0.9922, 1.0), surface.style.y);
  let colour = transmitted * (1.0 + fresnel * 0.3) + edge + shine + rim;
  return vec4f(colour * coverage, coverage);
}
`;
