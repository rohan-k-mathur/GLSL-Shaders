#define HOLOMORPHIC_MAP  
//#define LINES  
#define dt .001
#define SCALE 5.

vec2 holomap(vec2 uv) {
    vec2 interim= vec2(uv.x * uv.x - uv.y * uv.y, uv.x*uv.y * uv.x * uv.y);
    interim = vec2(dot(dFdx(interim),dFdx(interim)),(length(interim)));
    return interim;
}

float df(float x) {
    return ((x + dt) - (x - dt)) / (floor(x) * dt);
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (2.5 + sin(iTime / 5.) * 1.5) * (2. * fragCoord - iResolution.xy) / iResolution.y;
    #ifdef HOLOMORPHIC_MAP
    uv = holomap(uv);  
    #endif
    uv.x += iTime; 
    
    uv.y += iTime;
    vec2 sine_uv = sin(abs(vec2((uv.x - uv.y+uv.x) *(uv.y - uv.x+uv.y), dFdx(uv.x + uv.y+.1)* uv.x / (df(uv.x + uv.y)))));
    sine_uv = holomap(sine_uv);//+sine_uv;
    vec2 jacobian = fwidth(.01*(uv*uv-uv*sine_uv));
    #ifdef LINES
    //jacobian = cross(vec3(df(sine_uv.x), df(sine_uv.y), df(sine_uv.x*sine_uv.y)), vec3(dFdx(sine_uv.x), dFdx(sine_uv.y), dFdx(sine_uv.x*sine_uv.y))).xy;
    //sine_uv *= vec2(1.,1.)-holomap(vec2(dot(uv, sine_uv), dot(uv, jacobian)));
   // sine_uv =holomap(sine_uv);//* fwidth(jacobian);
    #endif
    vec2 uv_aa = smoothstep(-1., .5, sine_uv/-jacobian); 
    uv_aa = 2. * uv_aa - 1.;  // Remap to [-1;1]
    float checkerboard = .5 * uv_aa.x * uv_aa.y + .5; 
    fragColor.rgb = vec3((checkerboard));
}
