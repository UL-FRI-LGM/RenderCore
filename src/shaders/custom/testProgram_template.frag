#version 300 es
precision mediump float;

struct Material {
    vec3 diffuse;
    #if (TEXTURE)
        #if (TEXTURE)
            #for I_TEX in 0 to NUM_TEX
                sampler2D texture##I_TEX;
            #end
        #fi
    #fi
};

uniform Material material;

#if (LIGHTS && !NO_LIGHTS)

    struct Light {
        bool directional;
        vec3 position;
        vec3 color;
    };

    uniform Light lights[##NUM_LIGHTS];
    uniform vec3 ambient;

    in vec3 fragVPos;
#fi

#if (TEXTURE)
    in vec2 fragUV;
#fi

#if (CLIPPING_PLANES)
    struct ClippingPlane {
        vec3 normal;
        float constant;
    };

    uniform ClippingPlane clippingPlanes[##NUM_CLIPPING_PLANES];

    in vec3 vViewPosition;
#fi

out vec4 color;

#if (LIGHTS && !NO_LIGHTS)
    // Calculates the point light color contribution
    vec3 calcPointLight(Light light) {
        // Attenuation
        float distance = length(light.position - fragVPos);
        float attenuation = 1.0f / (1.0f + 0.01f * distance + 0.0001f * (distance * distance));

        // Combine results
        vec3 diffuse = light.color * material.diffuse * attenuation;

        return diffuse;
    }
#fi

uniform vec4 dimFactor;

void main() {

    #if (CLIPPING_PLANES)
        bool clipped = true;
        for(int i = 0; i < ##NUM_CLIPPING_PLANES; i++){
                clipped = ( dot( vViewPosition, clippingPlanes[i].normal ) > clippingPlanes[i].constant ) && clipped;
        }
        if ( clipped ) discard;
    #fi


    #if (CIRCLES)
        vec2 cxy = 2.0 * gl_PointCoord - 1.0;
        float pct = dot(cxy, cxy);
        if (pct > 1.0) {
            discard; //performance trap
            //color = vec4(1.0, 1.0, 1.0, 0.0);
        }
    #fi


    #if (LIGHTS && !NO_LIGHTS)
        color = vec4(0.0, 0.0, 0.0, 1.0);

        #for lightIdx in 0 to NUM_LIGHTS
            if (!lights[##lightIdx].directional) {
                color += vec4(calcPointLight(lights[##lightIdx]), 0);
            }
            else {
                color += vec4(lights[##lightIdx].color * material.diffuse, 0);
            }
        #end
    #else
        color = vec4(material.diffuse, 1.0);
    #fi

    #if (TEXTURE)
        // Apply all of the textures
        #for I_TEX in 0 to NUM_TEX
             color *= texture(material.texture##I_TEX, fragUV);
        #end
    #fi

    color *= dimFactor;
}