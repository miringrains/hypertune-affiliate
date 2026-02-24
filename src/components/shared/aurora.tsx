"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface AuroraProps {
  colorStops?: [string, string, string];
  speed?: number;
  amplitude?: number;
  blend?: number;
  className?: string;
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
  uniform vec3 uColor1;
  uniform vec3 uColor2;
  uniform vec3 uColor3;
  uniform float uAmplitude;
  uniform float uBlend;

  // Simplex 2D noise
  vec3 permute(vec3 x) { return mod(((x*34.0)+1.0)*x, 289.0); }

  float snoise(vec2 v){
    const vec4 C = vec4(0.211324865405187, 0.366025403784439,
           -0.577350269189626, 0.024390243902439);
    vec2 i  = floor(v + dot(v, C.yy) );
    vec2 x0 = v -   i + dot(i, C.xx);
    vec2 i1;
    i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod(i, 289.0);
    vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 ))
    + i.x + vec3(0.0, i1.x, 1.0 ));
    vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy),
      dot(x12.zw,x12.zw)), 0.0);
    m = m*m ;
    m = m*m ;
    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;
    m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
    vec3 g;
    g.x  = a0.x  * x0.x  + h.x  * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
  }

  void main() {
    vec2 uv = gl_FragCoord.xy / uResolution;
    float t = uTime * 0.15;

    float n1 = snoise(uv * 2.0 + vec2(t * 0.3, t * 0.2)) * uAmplitude;
    float n2 = snoise(uv * 3.0 + vec2(-t * 0.2, t * 0.4)) * uAmplitude;
    float n3 = snoise(uv * 1.5 + vec2(t * 0.1, -t * 0.3)) * uAmplitude;

    float blend1 = smoothstep(-uBlend, uBlend, n1 + uv.y - 0.5);
    float blend2 = smoothstep(-uBlend, uBlend, n2 + uv.x - 0.5);

    vec3 color = mix(uColor1, uColor2, blend1);
    color = mix(color, uColor3, blend2 * 0.5);
    color += n3 * 0.05;

    float vignette = smoothstep(0.0, 0.7, length(uv - 0.5));
    color = mix(color, vec3(0.0), vignette * 0.6);

    gl_FragColor = vec4(color, 1.0);
  }
`;

function hexToRGB(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return [r, g, b];
}

export function Aurora({
  colorStops = ["#e1251b", "#13f287", "#000000"],
  speed = 1.0,
  amplitude = 1.2,
  blend = 0.6,
  className,
}: AuroraProps) {
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
    const uColor1 = gl.getUniformLocation(program, "uColor1");
    const uColor2 = gl.getUniformLocation(program, "uColor2");
    const uColor3 = gl.getUniformLocation(program, "uColor3");
    const uAmplitude = gl.getUniformLocation(program, "uAmplitude");
    const uBlend = gl.getUniformLocation(program, "uBlend");

    const [c1, c2, c3] = colorStops.map(hexToRGB);
    gl.uniform3f(uColor1, ...c1);
    gl.uniform3f(uColor2, ...c2);
    gl.uniform3f(uColor3, ...c3);
    gl.uniform1f(uAmplitude, amplitude);
    gl.uniform1f(uBlend, blend);

    function resize() {
      const dpr = Math.min(window.devicePixelRatio, 2);
      canvas!.width = canvas!.clientWidth * dpr;
      canvas!.height = canvas!.clientHeight * dpr;
      gl!.viewport(0, 0, canvas!.width, canvas!.height);
      gl!.uniform2f(uResolution, canvas!.width, canvas!.height);
    }

    resize();
    window.addEventListener("resize", resize);

    let startTime = performance.now();

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
  }, [colorStops, speed, amplitude, blend]);

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
      <div className="absolute inset-0 bg-background" />
      <Aurora
        colorStops={["#e1251b", "#13f287", "#000000"]}
        speed={subtle ? 0.4 : 0.6}
        amplitude={1.2}
        blend={0.6}
        className={
          subtle
            ? "absolute inset-0 opacity-40"
            : "absolute inset-0 opacity-60"
        }
      />
    </div>
  );
}
