/**
 * GLSL fragment shadery — referenčná rýchla GPU cesta (30 fps cieľ na mobile).
 *
 * Web showcase používa spoľahlivú Canvas2D + pure-core cestu (verifikovateľná
 * a bez GPU závislostí). Tieto shadery sú zámerne tu ako kontrakt pre:
 *   - voliteľný WebGL fast-path na webe,
 *   - Flutter port (Metal / OpenGL ES) vo Fáze 1.
 *
 * Všetky počítajú to isté, čo pure funkcie v core/pixels.ts, takže výstup sa
 * dá porovnať voči tým istým testovacím vektorom.
 */

export const VERTEX_SHADER = /* glsl */ `
attribute vec2 a_position;
attribute vec2 a_texCoord;
varying vec2 v_texCoord;
void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
  v_texCoord = a_texCoord;
}
`;

/** Pixelizácia: prichytí texCoord na mriežku blokov. */
export const PIXELATE_FS = /* glsl */ `
precision mediump float;
varying vec2 v_texCoord;
uniform sampler2D u_image;
uniform vec2 u_resolution;
uniform float u_blockSize;     // veľkosť bloku v pixeloch
uniform vec4 u_faceRect;       // x, y, w, h (0..1); efekt len v boxe ak w>0
void main() {
  vec2 px = v_texCoord * u_resolution;
  bool inFace = u_faceRect.z <= 0.0 ||
    (v_texCoord.x >= u_faceRect.x && v_texCoord.x <= u_faceRect.x + u_faceRect.z &&
     v_texCoord.y >= u_faceRect.y && v_texCoord.y <= u_faceRect.y + u_faceRect.w);
  if (!inFace) { gl_FragColor = texture2D(u_image, v_texCoord); return; }
  vec2 block = floor(px / u_blockSize) * u_blockSize + u_blockSize * 0.5;
  gl_FragColor = texture2D(u_image, block / u_resolution);
}
`;

/** Separabilný gaussovský/box blur — volá sa dvojfázovo (H, V). */
export const BLUR_FS = /* glsl */ `
precision mediump float;
varying vec2 v_texCoord;
uniform sampler2D u_image;
uniform vec2 u_resolution;
uniform vec2 u_direction;      // (1,0) horizontálne, (0,1) vertikálne
uniform float u_radius;        // polomer v pixeloch
void main() {
  vec2 texel = u_direction / u_resolution;
  vec4 sum = vec4(0.0);
  float count = 0.0;
  for (float k = -24.0; k <= 24.0; k += 1.0) {
    if (abs(k) > u_radius) continue;
    sum += texture2D(u_image, v_texCoord + texel * k);
    count += 1.0;
  }
  gl_FragColor = sum / count;
}
`;

/** Silueta: kde maska > prah, plná farba; inak pôvodný pixel. */
export const SILHOUETTE_FS = /* glsl */ `
precision mediump float;
varying vec2 v_texCoord;
uniform sampler2D u_image;
uniform sampler2D u_mask;
uniform vec3 u_color;
uniform float u_threshold;
void main() {
  float m = texture2D(u_mask, v_texCoord).r;
  vec4 base = texture2D(u_image, v_texCoord);
  gl_FragColor = m >= u_threshold ? vec4(u_color, 1.0) : base;
}
`;

/** Composit popredia a (rozmazaného) pozadia podľa masky — scrub pozadia. */
export const COMPOSITE_FS = /* glsl */ `
precision mediump float;
varying vec2 v_texCoord;
uniform sampler2D u_foreground;
uniform sampler2D u_background;
uniform sampler2D u_mask;
void main() {
  float m = clamp(texture2D(u_mask, v_texCoord).r, 0.0, 1.0);
  vec4 fg = texture2D(u_foreground, v_texCoord);
  vec4 bg = texture2D(u_background, v_texCoord);
  gl_FragColor = mix(bg, fg, m);
}
`;
