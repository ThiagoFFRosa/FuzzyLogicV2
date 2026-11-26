import { useCallback, useEffect, useMemo } from 'react';
import { Vector4 } from 'three';
import type { WebGLProgramParametersWithUniforms } from 'three';
import { Surface } from './FactoryMaterials';
import { canvasTexture } from './sceneTextures';
import { FloorBreaks, floorSurface } from './FloorBreaks';
import { FLOOR_LEVEL } from './groundLayout';
import { WEAR_AREA, floorWear } from './groundWear';

const MARKING_AREA = new Vector4(-15.5, 1.35, 31, 5.9);
const FLOOR_WEAR_AREA = new Vector4(WEAR_AREA.x, WEAR_AREA.z, WEAR_AREA.width, WEAR_AREA.depth);

function laneMarkings() {
  return canvasTexture(
    (ctx) => {
      ctx.fillStyle = '#263b3980';
      ctx.fillRect(0, 15, 1024, 54);
      ctx.fillStyle = '#b4a26c8c';
      for (const y of [85, 162]) {
        for (let x = 0; x < 1024; x += 64) ctx.fillRect(x + 4, y, 52, 4);
      }
      for (let i = 0; i < 5; i++) {
        const x = 62 + i * 216;
        ctx.beginPath();
        ctx.moveTo(x - 13, 122);
        ctx.lineTo(x + 12, 122);
        ctx.lineTo(x + 12, 114);
        ctx.lineTo(x + 28, 126);
        ctx.lineTo(x + 12, 138);
        ctx.lineTo(x + 12, 130);
        ctx.lineTo(x - 13, 130);
        ctx.fill();
      }
      ctx.globalCompositeOperation = 'destination-out';
      for (let i = 0; i < 550; i++) {
        ctx.fillStyle = '#0005';
        ctx.fillRect((i * 97) % 1024, (i * 53) % 256, 2 + (i % 14), 1 + (i % 3));
      }
    },
    1024,
    256,
  );
}

export function FactoryFloor() {
  const floor = useMemo(() => floorSurface(-55, -38, 110, 100, 4), []);
  const wear = useMemo(floorWear, []);
  const markings = useMemo(laneMarkings, []);
  const decorate = useCallback(
    (shader: WebGLProgramParametersWithUniforms) => {
      shader.uniforms.floorWear = { value: wear };
      shader.uniforms.floorMarkings = { value: markings };
      shader.uniforms.floorWearArea = { value: FLOOR_WEAR_AREA };
      shader.uniforms.floorMarkingArea = { value: MARKING_AREA };
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec2 vFloorPoint;')
        .replace(
          '#include <begin_vertex>',
          '#include <begin_vertex>\nvFloorPoint = vec2(position.x, -position.y);',
        );
      shader.fragmentShader = shader.fragmentShader
        .replace(
          '#include <common>',
          `#include <common>
        varying vec2 vFloorPoint;
        uniform sampler2D floorWear;
        uniform sampler2D floorMarkings;
        uniform vec4 floorWearArea;
        uniform vec4 floorMarkingArea;
        vec3 floorDecal(vec3 base, sampler2D decal, vec4 area) {
          vec2 uv = (vFloorPoint - area.xy) / area.zw;
          if (any(lessThan(uv, vec2(0.0))) || any(greaterThan(uv, vec2(1.0)))) return base;
          vec4 ink = texture2D(decal, vec2(uv.x, 1.0 - uv.y));
          return mix(base, ink.rgb, ink.a);
        }`,
        )
        .replace(
          '#include <map_fragment>',
          `#include <map_fragment>
        diffuseColor.rgb = floorDecal(diffuseColor.rgb, floorMarkings, floorMarkingArea);
        diffuseColor.rgb = floorDecal(diffuseColor.rgb, floorWear, floorWearArea);`,
        );
    },
    [markings, wear],
  );

  useEffect(
    () => () => {
      floor.dispose();
      wear.dispose();
      markings.dispose();
    },
    [floor, wear, markings],
  );

  return (
    <>
      <mesh
        position={[0, FLOOR_LEVEL, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        geometry={floor}
        receiveShadow
      >
        <Surface kind="concrete" color="#646c61" decorate={decorate} />
      </mesh>
      <FloorBreaks />
    </>
  );
}
