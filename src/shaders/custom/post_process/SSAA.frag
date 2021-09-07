#version 300 es
precision mediump float;


//DEF
//**********************************************************************************************************************//
#define SSAA_AVERAGE 0.0
#define SSAA_LERP 1.0
#define SSAA_KERNEL 2.0
// Define kernels
//SSAAx4
#define gauss4 float[4](1.0/4.0, 3.0/4.0, 3.0/4.0, 1.0/4.0)
#define box1 float[1](1.0)
#define box2 float[2](0.5, 0.5)
#define box4 float[4](0.25, 0.25, 0.25, 0.25)
#define box8 float[8](0.125, 0.125, 0.125, 0.125, 0.125, 0.125, 0.125, 0.125)
#define box16 float[16](0.0625, 0.0625, 0.0625, 0.0625, 0.0625, 0.0625, 0.0625, 0.0625, 0.0625, 0.0625, 0.0625, 0.0625, 0.0625, 0.0625, 0.0625, 0.0625)
#define tent4 float[4](1.0/8.0, 3.0/8.0, 3.0/8.0, 1.0/8.0)
#define lanczos4 float[4](-1.0/16.0, 9.0/16.0, 9.0/16.0, -1.0/16.0)
#define lanczos8 float[8](-0.009, -0.042, 0.117, 0.434, 0.434, 0.117, -0.042, -0.009)
#define lanczos16 float[16](-0.001, -0.010, -0.020, -0.015, 0.025, 0.099, 0.183, 0.239, 0.239, 0.183, 0.099, 0.025, -0.015, -0.020, -0.010, -0.001)


#if(SSAAx1)
#if(KERNEL_BOX)
const float kernel[1] = box1;
#fi
#fi

#if(SSAAx2)
#if(KERNEL_BOX)
const float kernel[2] = box2;
#fi
#fi

#if(SSAAx4)
#if(KERNEL_GAUSS)
const float kernel[4] = gauss4;
#fi

#if(KERNEL_BOX)
const float kernel[4] = box4;
#fi

#if(KERNEL_TENT)
const float kernel[4] = tent4;
#fi

#if(KERNEL_LANCZOS)
const float kernel[4] = lanczos4;
#fi
#fi

#if(SSAAx8)
#if(KERNEL_BOX)
const float kernel[8] = box8;
#fi

#if(KERNEL_LANCZOS)
const float kernel[8] = lanczos8;
#fi
#fi

#if(SSAAx16)
#if(KERNEL_BOX)
const float kernel[16] = box16;
#fi

#if(KERNEL_LANCZOS)
const float kernel[16] = lanczos16;
#fi
#fi


struct TextureData {
    ivec2 textureSize;
    vec2 texelSize;
};
struct Material {
    #if (TEXTURE)
        sampler2D texture0; //Supersampled texture
    #fi
};


uniform float SSAA_N;
uniform float MODE;
uniform bool JITTER;
uniform bool horizontal;
uniform Material material;

#if (TEXTURE)
    in vec2 fragUV;
#fi

out vec4 color;


TextureData texture0Data;


vec2 rand2(vec2 vec){
    vec2 comp = vec2(12.9898f, 78.233f);
    return vec2(fract(sin(dot(vec.x, comp.x)) * 43758.5453f), fract(sin(dot(vec.y, comp.y)) * 43758.5453f));
}


void main() {
    #if (TEXTURE)
        texture0Data.textureSize = textureSize(material.texture0, 0);
        texture0Data.texelSize = 1.0 / vec2(texture0Data.textureSize.x, texture0Data.textureSize.y);

        vec4 tempCol = vec4(0.0, 0.0, 0.0, 0.0);
        float OFFSET = -(SSAA_N-1.0)/2.0;




        /*for(float v = 0.0; v < SSAA_N; v++){
            float vCoord = fragUV.y - (SSAA_N-1.0)*texture0Data.texelSize.y/2.0 + v*texture0Data.texelSize.y;

            for(float u = 0.0; u < SSAA_N; u++){
                float uCoord = fragUV.x - (SSAA_N-1.0)*texture0Data.texelSize.x/2.0 + u*texture0Data.texelSize.x;

                vec2 SSUV = vec2(uCoord, vCoord);
                color = color + texture(material.texture0, SSUV);
            }
        }*/
        /*
        for(float v = 0.0; v < SSAA_N; v++){
            float vCoord = fragUV.y + (OFFSET + v)*texture0Data.texelSize.y;

            for(float u = 0.0; u < SSAA_N; u++){
                float uCoord = fragUV.x + (OFFSET + u)*texture0Data.texelSize.x;

                vec2 SSUV = vec2(uCoord, vCoord);
                color = color + texture(material.texture0, SSUV);
            }
        }*/

        


        //NON-SEPERABLE
        #if(!SEPERABLE)
        float OFFSET_X = OFFSET*texture0Data.texelSize.x;
        float OFFSET_Y = OFFSET*texture0Data.texelSize.y;
        float LIMIT_X = SSAA_N*texture0Data.texelSize.x;
        float LIMIT_Y = SSAA_N*texture0Data.texelSize.y;


        //ROLLED
        int x = 0;
        int y = 0;
        for(float v = 0.0; v < LIMIT_Y; v+=texture0Data.texelSize.y){
            float vCoord = fragUV.y + (OFFSET_Y + v);

            x = 0;
            for(float u = 0.0; u < LIMIT_X; u+=texture0Data.texelSize.x){
                float uCoord = fragUV.x + (OFFSET_X + u);
                vec2 SSUV = vec2(uCoord, vCoord);

                //APPLAY RANDOM JITTER
                if(JITTER) SSUV += rand2(SSUV) * vec2(texture0Data.texelSize.x, texture0Data.texelSize.y);
                
                //SELECT MODE
                if(MODE == SSAA_AVERAGE){
                    //AVERAGE //SAME AS BOX FILTER
                    tempCol = tempCol + texture(material.texture0, SSUV); //BASIC MODE
                }else if (MODE == SSAA_LERP){
                    //LERP (DISTANCE) //SAME AS LERP DOWN //SAME AS TENT
                    float dist = distance(fragUV, SSUV)/sqrt(2.0);
                    tempCol = mix(texture(material.texture0, SSUV), tempCol, dist);
                }else if (MODE == SSAA_KERNEL){
                    //KERNELS
                    tempCol = tempCol + texture(material.texture0, SSUV).rgba * kernel[x]*kernel[y];
                }
                x++;
            }
            y++;
        }


        ///UNROLLED
        /*float vCoord, uCoord;
        vec2 SSUV;
        #for v in 0 to 4
            vCoord = fragUV.y + (SSAA_X_OFFSET + float(##v))*texture0Data.texelSize.y;

            #for u in 0 to 4
                uCoord = fragUV.x + (SSAA_X_OFFSET + float(##u))*texture0Data.texelSize.x;

                SSUV = vec2(uCoord, vCoord);
                color = color + texture(material.texture0, SSUV);
            #end
        #end*/


        //NON-SEPERABLE
        if(MODE == SSAA_AVERAGE){
            color = tempCol / (SSAA_N*SSAA_N); //BASIC MODE
        }else{
            color = tempCol;
        }
        #fi




        //SEPERABLE
        #if(SEPERABLE)
        if(horizontal) {
            //ROLLED
            // for(int u = 0; u < int(SSAA_N); u++) {
			//     tempCol += texture(material.texture0, fragUV + vec2((OFFSET + float(u)) * texture0Data.texelSize.x, 0.0)).rgba * kernel[u];
            //     //result += texture(material.texture0, fragUV + vec2(texture0Data.texelSize.x * float(u), 0.0)).rgba * kernel[u];
            //     //result += texture(material.texture0, fragUV - vec2(texture0Data.texelSize.x * float(u), 0.0)).rgba * kernel[u];
			// }


            //UNROLLED
            float uCoord;
            float vCoord = fragUV.y;
            vec2 SSUV;

            #for u in 0 to SSAA_N
                uCoord = fragUV.x + (OFFSET + float(##u)) * texture0Data.texelSize.x;
                SSUV = vec2(uCoord, vCoord);

                //tempCol = tempCol + texture(material.texture0, SSUV) * kernel[##u];


                //APPLAY RANDOM JITTER
                if(JITTER) SSUV += rand2(SSUV) * vec2(texture0Data.texelSize.x, texture0Data.texelSize.y);

                
                //SELECT MODE
                if(MODE == SSAA_AVERAGE){
                    //AVERAGE //SAME AS BOX FILTER
                    tempCol = tempCol + texture(material.texture0, SSUV); //BASIC MODE
                }else if (MODE == SSAA_LERP){
                    //LERP (DISTANCE) //SAME AS LERP DOWN //SAME AS TENT
                    float dist = distance(fragUV, SSUV)/sqrt(2.0);
                    tempCol = mix(texture(material.texture0, SSUV), tempCol, dist);
                }else if (MODE == SSAA_KERNEL){
                    //KERNELS
                    tempCol = tempCol + texture(material.texture0, SSUV) * kernel[##u];
                }
            #end
        }else{
            //ROLLED
            // for(int v = 0; v < int(SSAA_N); v++) {
			//     tempCol += texture(material.texture0, fragUV + vec2(0.0, (OFFSET + float(v)) * texture0Data.texelSize.y)).rgba * kernel[v];
			// }


            //UNROLLED
            float uCoord = fragUV.x;
            float vCoord;
            vec2 SSUV;

            #for v in 0 to SSAA_N
                vCoord = fragUV.y + (OFFSET + float(##v)) * texture0Data.texelSize.y;
                SSUV = vec2(uCoord, vCoord);

                //tempCol = tempCol + texture(material.texture0, SSUV) * kernel[##v];


                //APPLAY RANDOM JITTER
                if(JITTER) SSUV += rand2(SSUV) * vec2(texture0Data.texelSize.x, texture0Data.texelSize.y);


                //SELECT MODE
                if(MODE == SSAA_AVERAGE){
                    //AVERAGE //SAME AS BOX FILTER
                    tempCol = tempCol + texture(material.texture0, SSUV); //BASIC MODE
                }else if (MODE == SSAA_LERP){
                    //LERP (DISTANCE) //SAME AS LERP DOWN //SAME AS TENT
                    float dist = distance(fragUV, SSUV)/sqrt(2.0);
                    tempCol = mix(texture(material.texture0, SSUV), tempCol, dist);
                }else if (MODE == SSAA_KERNEL){
                    //KERNELS
                    tempCol = tempCol + texture(material.texture0, SSUV) * kernel[##v];
                }
            #end
        }


        //SEPERABLE
        if(MODE == SSAA_AVERAGE){
            color = tempCol / SSAA_N; //BASIC MODE
        }else{
            color = tempCol;
        }
        #fi
    #fi
}