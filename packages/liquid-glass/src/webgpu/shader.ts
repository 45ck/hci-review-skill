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
  light: vec4f,
  ripple: vec4f,
  tint: vec4f,
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

  let dx = rounded_box_distance(point + vec2f(0.5, 0), size * 0.5, radius)
         - rounded_box_distance(point - vec2f(0.5, 0), size * 0.5, radius);
  let dy = rounded_box_distance(point + vec2f(0, 0.5), size * 0.5, radius)
         - rounded_box_distance(point - vec2f(0, 0.5), size * 0.5, radius);
  let edge_normal = vec2f(dx, dy) / max(length(vec2f(dx, dy)), 0.001);
  let bevel = clamp(min(size.x, size.y) * 0.20, 4.0, 18.0);
  let depth = clamp(-distance / bevel, 0.0, 1.0);
  let edge_weight = 1.0 - smoothstep(0.0, 1.0, depth);
  let edge_slope = edge_weight * edge_weight * 2.4;

  let pointer_delta = vertex.point - surface.light.xy;
  let pointer_radius = clamp(min(size.x, size.y) * 1.2, 30.0, 95.0);
  let pointer_glow = exp(-dot(pointer_delta, pointer_delta) / (pointer_radius * pointer_radius));
  let meniscus = pointer_delta / pointer_radius * pointer_glow
               * (surface.light.z * 0.16 + surface.light.w * 0.24);

  let wave_delta = vertex.point - surface.ripple.xy;
  let wave_distance = length(wave_delta);
  let age = surface.ripple.z;
  let amplitude = surface.ripple.w * exp(-age * 2.6) * max(0.0, 1.0 - age / 1.1);
  let wave_radius = min(220.0, length(size) * 0.82) * (1.0 - exp(-age * 2.7));
  let wave_position = (wave_distance - wave_radius) / 8.0;
  let envelope = exp(-wave_position * wave_position * 0.5);
  let wave_slope = wave_delta / max(wave_distance, 0.001)
                 * cos(wave_position * 2.1) * envelope * amplitude * 0.42;

  // The face samples in place; only the local bevel and contact waves displace it.
  let displacement = edge_normal * bevel * edge_weight * edge_weight * scene.optics.x
                   + (meniscus + wave_slope) * scene.optics.x * 8.0;
  let sample_point = vertex.point - displacement;
  let channel_offset = edge_normal * edge_weight * scene.optics.y * 65.0;
  let red = sample_backdrop(sample_point - channel_offset).r;
  let green = sample_backdrop(sample_point).g;
  let blue = sample_backdrop(sample_point + channel_offset).b;

  let normal = normalize(vec3f(edge_normal * edge_slope + meniscus + wave_slope, 1.0));
  let facing = max(normal.z, 0.0);
  let fresnel = 0.04 + 0.96 * pow(1.0 - facing, 5.0);
  let ring = 1.0 - smoothstep(0.0, 1.7, abs(distance + 0.8));
  let key = normalize(vec3f(-0.45, -0.65, 0.8));
  let fill = normalize(vec3f(0.6, 0.55, 0.9));
  let key_half = normalize(key + vec3f(0, 0, 1));
  let fill_half = normalize(fill + vec3f(0, 0, 1));
  let shine = pow(max(dot(normal, key_half), 0.0), 36.0) * edge_weight * 0.36;
  let cool_shine = pow(max(dot(normal, fill_half), 0.0), 48.0) * edge_weight * 0.15;
  let rim = ring * (0.08 + max(dot(normal, key), 0.0) * 0.24) + fresnel * edge_weight * 0.12;
  let contact = pointer_glow * surface.light.z * 0.12 + envelope * amplitude * 0.12;
  let transmitted = mix(vec3f(red, green, blue), surface.tint.rgb, surface.tint.a);
  let underside = max(edge_normal.y, 0.0) * edge_weight * 0.045;
  let colour = transmitted * (1.0 - underside)
             + (vec3f(1.0, 0.98, 0.93) * (shine + rim + contact)
             + vec3f(0.62, 0.83, 1.0) * cool_shine) * surface.style.y;
  return vec4f(colour * coverage, coverage);
}
`;
