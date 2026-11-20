export const GLASS_PASS_SHADER = /* wgsl */ `

struct Uniform {
    canvas_position: vec2f,
    resolution: vec2f,
    width: f32,
    height: f32,
    radius: f32,
    lens_refraction: f32,
    sharp: f32,
    f0: f32,
    dispersion: f32,
    spec_power: f32,
    edge_highlight: f32,
    rim_strength: f32,
    fresnel: f32,
};

@group(0) @binding(0) var<uniform> uniforms: Uniform;
@group(0) @binding(1) var page_sampler: sampler;
@group(0) @binding(2) var page_texture: texture_2d<f32>;

const MASK_SHARPNESS = 32.0;
const FACE_ON_SPREAD_CUT = 0.909;
const RIM_POWER = 3.0;
const SPECULAR_ON_RING = 0.5;
const VIEW_DIRECTION = vec3f(0.0, 0.0, 1.0);
const KEY_LIGHT = vec3f(0.3, -0.5, 1.0);

struct Output {
    @location(0) color: vec4f,
    @location(1) mask: vec4f,
};

@vertex
fn vert_main(@builtin(vertex_index) vertex_index: u32) -> @builtin(position) vec4f {
    const two_triangles_covering_the_canvas = array<vec2f, 6>(
        vec2(-1, -1), vec2(1, -1), vec2(1, 1),
        vec2(-1, -1), vec2(-1, 1), vec2(1, 1),
    );
    return vec4(two_triangles_covering_the_canvas[vertex_index], 0.0, 1.0);
}

fn canvas_aspect() -> f32 {
    return uniforms.resolution.x / uniforms.resolution.y;
}

fn pixel_to_glass_space(pixel: vec2f) -> vec2f {
    var position = pixel / uniforms.resolution - 0.5;
    position.x *= canvas_aspect();
    return position;
}

fn canvas_pixel_to_page_uv(canvas_pixel: vec2f) -> vec2f {
    let page_pixel = canvas_pixel + uniforms.canvas_position;
    let page_size = vec2f(textureDimensions(page_texture));
    return page_pixel / page_size;
}

fn glass_space_to_page_uv(position: vec2f) -> vec2f {
    let unstretched = vec2f(position.x / canvas_aspect(), position.y);
    let canvas_pixel = (unstretched + 0.5) * uniforms.resolution;
    return canvas_pixel_to_page_uv(canvas_pixel);
}

fn sample_page(position: vec2f) -> vec4f {
    let page_uv = glass_space_to_page_uv(position);
    return textureSampleLevel(page_texture, page_sampler, page_uv, 0.0);
}

fn rounded_box_distance(point: vec2f, half_size: vec2f, corner_radius: f32) -> f32 {
    let from_corner = abs(point) - half_size + corner_radius;
    let outside = length(max(from_corner, vec2f(0.0)));
    let inside = min(max(from_corner.x, from_corner.y), 0.0);
    return outside + inside - corner_radius;
}

fn glass_edge_distance(position: vec2f) -> f32 {
    let aspect = canvas_aspect();
    let half_size = vec2f(uniforms.width, uniforms.height) / 2.0 * aspect;
    let corner_radius = uniforms.radius / 2.0 * aspect;
    return rounded_box_distance(position, half_size, corner_radius);
}

fn coverage(edge_distance: f32, sharpness: f32) -> f32 {
    return saturate(-edge_distance / uniforms.sharp * sharpness);
}

fn lens_bend(edge_distance: f32) -> f32 {
    const FLAT_TOP_POWER = 0.25;
    const QUARTER_TURN = 1.57;
    let depth = saturate(-edge_distance / uniforms.lens_refraction);
    let height = pow(depth, FLAT_TOP_POWER);
    return height * QUARTER_TURN;
}

fn surface_normal(position: vec2f) -> vec3f {
    const PROBE_X = vec2f(0.001, 0.0);
    const PROBE_Y = vec2f(0.0, 0.001);
    let slope_x = glass_edge_distance(position + PROBE_X)
                - glass_edge_distance(position - PROBE_X);
    let slope_y = glass_edge_distance(position + PROBE_Y)
                - glass_edge_distance(position - PROBE_Y);
    return normalize(vec3f(slope_x, slope_y, 1.0));
}

fn schlick_fresnel(facing_viewer: f32) -> f32 {
    const SCHLICK_POWER = 5.0;
    let grazing = 1.0 - facing_viewer;
    let reflectance = uniforms.f0;
    return reflectance + (1.0 - reflectance) * pow(grazing, SCHLICK_POWER);
}

fn colour_spread(facing_viewer: f32) -> f32 {
    return uniforms.dispersion * (1.0 - facing_viewer * FACE_ON_SPREAD_CUT);
}

fn refract_page(position: vec2f, bend: f32, spread: f32) -> vec4f {
    const RED_BEND = 0.98;
    const BLUE_BEND = 1.02;
    let bent_lookup = position * sin(bend);
    let channel_offset = bent_lookup * spread;
    let red_lookup = (position - channel_offset) * sin(bend * RED_BEND);
    let blue_lookup = (position + channel_offset) * sin(bend * BLUE_BEND);

    let red = sample_page(red_lookup).r;
    let green = sample_page(bent_lookup).g;
    let blue = sample_page(blue_lookup).b;
    return vec4f(red, green, blue, 1.0);
}

fn edge_ring(edge_distance: f32) -> f32 {
    const RING_SHARPNESS = 16.0;
    let one_pixel = 1.0 / uniforms.resolution.y;
    let grown_box = coverage(edge_distance - one_pixel, RING_SHARPNESS);
    let box = coverage(edge_distance, RING_SHARPNESS);
    return grown_box - box;
}

fn specular(normal: vec3f) -> f32 {
    let light_direction = normalize(KEY_LIGHT);
    let halfway = normalize(light_direction + VIEW_DIRECTION);
    return pow(max(dot(normal, halfway), 0.0), uniforms.spec_power);
}

@fragment
fn frag_main(@builtin(position) coord: vec4f) -> Output {
    let position = pixel_to_glass_space(coord.xy);
    let page_behind = sample_page(position);

    let edge_distance = glass_edge_distance(position);
    let glass_coverage = coverage(edge_distance, MASK_SHARPNESS);
    if (glass_coverage <= 0.0) {
        return Output(page_behind, vec4f(0.0));
    }

    let normal = surface_normal(position);
    let facing_viewer = max(dot(normal, VIEW_DIRECTION), 0.0);
    let fresnel = schlick_fresnel(facing_viewer);

    let bend = lens_bend(edge_distance);
    let refracted = refract_page(position, bend, colour_spread(facing_viewer));

    let ring = edge_ring(edge_distance);
    let edge_light = ring * (1.0 + fresnel * uniforms.edge_highlight);
    let shine = specular(normal) * ring * SPECULAR_ON_RING;
    let rim = pow(1.0 - facing_viewer, RIM_POWER) * glass_coverage * uniforms.rim_strength;

    let lit = refracted.rgb + edge_light + shine + rim;
    let glass = vec4f(lit * (1.0 + fresnel * uniforms.fresnel), 1.0);

    let glass_opacity = smoothstep(0.0, 1.0, glass_coverage);
    return Output(mix(page_behind, glass, glass_opacity), vec4f(glass_opacity));
}

`;
