/**
 * URL k MediaPipe WASM a modelom. Defaultne CDN (rýchly štart); pre plne
 * offline / „0 sietě” beh stačí tieto súbory bundlovať lokálne a prepísať cesty.
 *
 * Pozn.: stiahnutie modelu nie je odoslanie tvojho videa — video/audio nikdy
 * neopustí zariadenie. Model je read-only asset, raz načítaný.
 */
export const MODELS = {
  wasmBasePath:
    'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/wasm',
  faceModelUrl:
    'https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite',
  segModelUrl:
    'https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/latest/selfie_segmenter.tflite',
} as const;
