import {
  FramebufferTexture,
  LinearFilter,
  ShaderMaterial,
  Vector2,
  WebGLRenderTarget,
} from 'three';
import type { Texture, WebGLRenderer } from 'three';
import { FullScreenQuad } from 'three/addons/postprocessing/Pass.js';
import { FXAAShader } from 'three/addons/shaders/FXAAShader.js';

const vertexShader = FXAAShader.vertexShader;

const bloomFilter = /* glsl */ `
  uniform sampler2D tDiffuse;
  uniform vec2 direction;
  uniform bool extract;
  varying vec2 vUv;

  vec3 colorAt(vec2 uv) {
    vec3 color = texture2D(tDiffuse, uv).rgb;
    if (!extract) return color;
    float peak = max(max(color.r, color.g), color.b);
    return color * smoothstep(0.72, 0.96, peak);
  }

  void main() {
    vec3 color = colorAt(vUv) * 0.227027;
    color += (colorAt(vUv + direction * 1.384615) + colorAt(vUv - direction * 1.384615)) * 0.316216;
    color += (colorAt(vUv + direction * 3.230769) + colorAt(vUv - direction * 3.230769)) * 0.070270;
    gl_FragColor = vec4(color, 1.0);
  }
`;

const combine = /* glsl */ `
  uniform sampler2D tDiffuse;
  uniform sampler2D tBloom;
  varying vec2 vUv;
  void main() {
    vec4 base = texture2D(tDiffuse, vUv);
    vec3 glow = texture2D(tBloom, vUv).rgb * 0.18;
    gl_FragColor = vec4(base.rgb + glow * (1.0 - base.rgb), base.a);
  }
`;

function colorTarget(width: number, height: number) {
  return new WebGLRenderTarget(width, height, { depthBuffer: false });
}

export function createFactoryPost(width: number, height: number, fxaa: boolean, bloom: boolean) {
  const screen = new FramebufferTexture(width, height);
  screen.minFilter = screen.magFilter = LinearFilter;
  const materialOptions = { vertexShader, depthTest: false, depthWrite: false, toneMapped: false };
  const edge =
    fxaa &&
    new ShaderMaterial({
      ...materialOptions,
      fragmentShader: FXAAShader.fragmentShader,
      uniforms: {
        tDiffuse: { value: null },
        resolution: { value: new Vector2(1 / width, 1 / height) },
      },
    });
  const horizontal =
    bloom && colorTarget(Math.max(1, Math.floor(width / 4)), Math.max(1, Math.floor(height / 4)));
  const vertical = horizontal && colorTarget(horizontal.width, horizontal.height);
  const filtered = bloom && fxaa && colorTarget(width, height);
  const blur =
    bloom &&
    new ShaderMaterial({
      ...materialOptions,
      fragmentShader: bloomFilter,
      uniforms: {
        tDiffuse: { value: null },
        direction: { value: new Vector2() },
        extract: { value: true },
      },
    });
  const composite =
    vertical &&
    new ShaderMaterial({
      ...materialOptions,
      fragmentShader: combine,
      uniforms: { tDiffuse: { value: screen }, tBloom: { value: vertical.texture } },
    });
  const quad = new FullScreenQuad(edge || composite || undefined);

  const render = (gl: WebGLRenderer) => {
    // Capture the displayed color after the default framebuffer resolves native MSAA.
    // This keeps ACES, the original shader glows and non-tone-mapped labels intact.
    gl.copyFramebufferToTexture(screen);
    let input: Texture = screen;
    if (blur && composite && horizontal && vertical) {
      const { tDiffuse, direction, extract } = blur.uniforms;
      quad.material = blur;
      tDiffuse.value = screen;
      direction.value.set(1 / horizontal.width, 0);
      extract.value = true;
      gl.setRenderTarget(horizontal);
      quad.render(gl);
      tDiffuse.value = horizontal.texture;
      direction.value.set(0, 1 / vertical.height);
      extract.value = false;
      gl.setRenderTarget(vertical);
      quad.render(gl);
      quad.material = composite;
      gl.setRenderTarget(filtered || null);
      quad.render(gl);
      if (filtered) input = filtered.texture;
    }
    if (edge) {
      edge.uniforms.tDiffuse.value = input;
      quad.material = edge;
      gl.setRenderTarget(null);
      quad.render(gl);
    }
  };

  const dispose = () => {
    screen.dispose();
    for (const target of [horizontal, vertical, filtered]) if (target) target.dispose();
    for (const material of [edge, blur, composite]) if (material) material.dispose();
    quad.dispose();
  };

  return { width, height, fxaa, bloom, render, dispose };
}
