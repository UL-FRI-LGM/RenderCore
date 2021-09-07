#version 300 es
precision mediump float;

in vec2 fragUV;

uniform float resolution; // Step bettwen generating noise
uniform float frequency; // Size of map
uniform float scale; // Scale of height
uniform float offsetX;
uniform float offsetY;
uniform float redestribution; // Exp function
uniform float lacunarity;
uniform float persistance;
uniform int layer;

out vec4 noiseTex;

highp float rand(vec2 co) {
    highp float a = 12.9898;
    highp float b = 78.233;
    highp float c = 43758.5453;
    highp float dt= dot(co.xy ,vec2(a,b));
    highp float sn= mod(dt,3.14);
    return fract(sin(sn) * c);
}

float bilinearInterpolation(float tx, float ty, float x0y0, float x1y0, float x0y1, float x1y1) {
  tx = smoothstep(0.0, 1.0, tx);
  ty = smoothstep(0.0, 1.0, ty);

  float a = x0y0 * (1.0 - tx) + x1y0 * tx;
  float b = x0y1 * (1.0 - tx) + x1y1 * tx;

  return a * (1.0 - ty) + b * ty;
}

float generateNoise(float x, float y) {
  // Calculate step
  float step = 1.0 / resolution;

  // Nearest grid values
  float xNearest = floor(x / step) * step;
  float yNearest = floor(y / step) * step;

  //Compute nearest grid random values
  float x0y0 = rand(vec2(xNearest, yNearest));
  float x1y0 = rand(vec2(xNearest + step, yNearest));
  float x0y1 = rand(vec2(xNearest, yNearest + step));
  float x1y1 = rand(vec2(xNearest + step, yNearest + step));

  float tx = (x - xNearest) / step;
  float ty = (y - yNearest) / step;

  return bilinearInterpolation(tx, ty, x0y0, x1y0, x0y1, x1y1);
}

void main() {
    float noise = 0.0;
    float normalize = 0.0;

    float amplitudeVAR = 1.0;
    float frequencyVAR = 1.0;

    for(int i = 0; i < layer; i++) {
      float sampleX = (fragUV.x - 0.5) / frequency * frequencyVAR + offsetX;
      float sampleY = (fragUV.y - 0.5) / frequency * frequencyVAR + offsetY;

      noise += generateNoise(sampleX, sampleY) * amplitudeVAR;

      normalize += 1.0 * amplitudeVAR;

      frequencyVAR *= lacunarity;
      amplitudeVAR *= persistance;
    }

    noise /= normalize;
    noise = pow(noise, redestribution) * scale;

    noiseTex = vec4(noise, noise, noise, 1.0);
}
