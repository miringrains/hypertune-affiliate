"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface AuroraProps {
  className?: string;
  speed?: number;
  intensity?: number;
}

const vertexShader = `
  attribute vec2 position;
  void main() {
    gl_Position = vec4(position, 0.0, 1.0);
  }
`;

const fragmentShader = `
  precision highp float;
  uniform float uTime;
  uniform vec2 uResolution;
  uniform float uIntensity;

  vec3 permute(vec3 x) { return mod(((x*34.0)+1.0)*x, 289.0); }

  float snoise(vec2 v){
    const vec4 C = vec4(0.211324865405187, 0.366025403784439,
           -0.577350269189626, 0.024390243902439);
    vec2 i  = floor(v + dot(v, C.yy));
    vec2 x0 = v -   i + dot(i, C.xx);
    vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod(i, 289.0);
    vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0))
      + i.x + vec3(0.0, i1.x, 1.0));
    vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy),
      dot(x12.zw,x12.zw)), 0.0);
    m = m*m;
    m = m*m;
    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;
    m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
    vec3 g;
    g.x  = a0.x  * x0.x  + h.x  * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
  }

  void main() {
    vec2 uv = gl_FragCoord.xy / uResolution;
    float t = uTime * 0.08;

    // Base: pure black #0A0A0A
    vec3 base = vec3(0.039, 0.039, 0.039);

    // Accent: deep red #E1261B
    vec3 red = vec3(0.882, 0.149, 0.106);

    // Dark maroon midtone
    vec3 darkRed = vec3(0.25, 0.04, 0.02);

    // Layered noise at different scales for organic feel
    float n1 = snoise(uv * 1.8 + vec2(t * 0.3, t * 0.15));
    float n2 = snoise(uv * 3.2 + vec2(-t * 0.2, t * 0.25));
    float n3 = snoise(uv * 0.9 + vec2(t * 0.1, -t * 0.18));
    float n4 = snoise(uv * 5.0 + vec2(t * 0.4, t * 0.1));

    // Combine noise into soft blobs
    float glow = n1 * 0.5 + n2 * 0.3 + n3 * 0.2;
    glow = smoothstep(-0.2, 0.6, glow);

    // Keep it very dark — red only bleeds through subtly
    vec3 color = base;

    // Dark red undertone
    color = mix(color, darkRed, glow * 0.35 * uIntensity);

    // Brighter red only in concentrated spots
    float hotspot = smoothstep(0.5, 0.9, glow) * smoothstep(0.2, 0.6, n2);
    color = mix(color, red, hotspot * 0.18 * uIntensity);

    // Fine grain texture
    color += n4 * 0.008;

    // Heavy vignette to push edges to pure black
    float vignette = smoothstep(0.0, 0.65, length(uv - 0.5));
    color = mix(color, base, vignette * 0.85);

    // Edge fade to absolute black
    float edgeFade = smoothstep(0.0, 0.15, min(min(uv.x, 1.0-uv.x), min(uv.y, 1.0-uv.y)));
    color *= edgeFade;

    gl_FragColor = vec4(color, 1.0);
  }
`;

export function Aurora({ speed = 1.0, intensity = 1.0, className }: AuroraProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext("webgl", {
      alpha: false,
      antialias: false,
      premultipliedAlpha: false,
    });
    if (!gl) return;

    const vs = gl.createShader(gl.VERTEX_SHADER)!;
    gl.shaderSource(vs, vertexShader);
    gl.compileShader(vs);

    const fs = gl.createShader(gl.FRAGMENT_SHADER)!;
    gl.shaderSource(fs, fragmentShader);
    gl.compileShader(fs);

    const program = gl.createProgram()!;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    gl.useProgram(program);

    const vertices = new Float32Array([-1, -1, 3, -1, -1, 3]);
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    const posLoc = gl.getAttribLocation(program, "position");
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    const uTime = gl.getUniformLocation(program, "uTime");
    const uResolution = gl.getUniformLocation(program, "uResolution");
    const uIntensity = gl.getUniformLocation(program, "uIntensity");

    gl.uniform1f(uIntensity, intensity);

    function resize() {
      const dpr = Math.min(window.devicePixelRatio, 2);
      canvas!.width = canvas!.clientWidth * dpr;
      canvas!.height = canvas!.clientHeight * dpr;
      gl!.viewport(0, 0, canvas!.width, canvas!.height);
      gl!.uniform2f(uResolution, canvas!.width, canvas!.height);
    }

    resize();
    window.addEventListener("resize", resize);

    const startTime = performance.now();

    function animate() {
      const elapsed = (performance.now() - startTime) / 1000;
      gl!.uniform1f(uTime, elapsed * speed);
      gl!.drawArrays(gl!.TRIANGLES, 0, 3);
      animRef.current = requestAnimationFrame(animate);
    }

    animate();

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener("resize", resize);
      gl.deleteProgram(program);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      gl.deleteBuffer(buffer);
    };
  }, [speed, intensity]);

  return (
    <canvas
      ref={canvasRef}
      className={cn("h-full w-full", className)}
      style={{ display: "block" }}
    />
  );
}

interface AuroraBackdropProps {
  subtle?: boolean;
}

export function AuroraBackdrop({ subtle = false }: AuroraBackdropProps) {
  return (
    <div className="fixed inset-0 z-0 pointer-events-none">
      <div className="absolute inset-0" style={{ backgroundColor: "#0A0A0A" }} />
      <Aurora
        speed={subtle ? 0.5 : 0.8}
        intensity={subtle ? 0.6 : 1.0}
        className="absolute inset-0"
      />
    </div>
  );
}
