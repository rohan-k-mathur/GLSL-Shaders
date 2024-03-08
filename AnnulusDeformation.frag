#define CIRCLE_CENTER vec2(.0)
#define CIRCLE_RADIUS .77
#define CIRCLE_THICKNESS .0105
#define DEFORM_FREQUENCY 5.
#define DEFORM_AMPLITUDE .1
#define DEFORM_SPEED1 .5
#define DEFORM_SPEED2 .9
#define BASIS_VECTOR_e1 vec2(1., 1.)
#define BASIS_VECTOR_e2 vec2(0., 1.)
#define RGB_DARK vec3(2.0, 2.0, 2.0)
#define RGB_BLUE vec3(.0, .1, .5)

// Continuously deforms the circle based on the dot product of the displacement vector and basis vectors
float deform(vec2 v0, vec2 v1, float speed, float frequency, float amplitude) {
    float dot01 = dot(normalize(v0), normalize(v1));
    amplitude *= 1.+ (1. * dFdx(sin(sin(iTime / 3.))));
   // frequency*= dFdy(tan(dot01 * frequency + iTime * speed));
    return amplitude * (sin(dot01 * frequency + iTime * speed));
}

vec3 draw_circle(vec2 uv, vec2 center, float radius, float thickness, vec3 bg_rgb, vec3 fg_rgb) {
    vec2 displacement_vector = center - uv;
    float displacement_distance = distance(uv, center);
    
    displacement_distance += deform(displacement_vector, fwidth(fract(sin(uv - center))), DEFORM_SPEED1, DEFORM_FREQUENCY, DEFORM_AMPLITUDE);
    
    // Use smooth step functions to create the circle's interior and exterior
    float disk_exterior = smoothstep(radius - thickness, radius, displacement_distance);
    float disk_interior = smoothstep(radius, radius + thickness, displacement_distance);
    
    // Calculate the circle's shape by subtracting the interior from the exterior
    float circle = disk_exterior - disk_interior;
    
    // Mix the background and foreground colors based on the circle's shape
    vec3 mx = mix(mix(bg_rgb, fg_rgb, circle),mix(bg_rgb, fg_rgb, 1.-circle),1.-circle) ;
    return mx+mx*mx;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = 2. * fragCoord.xy / iResolution.xy - 1.;
    uv.x *= iResolution.x / iResolution.y;
    
    vec3 rgb = vec3(0.);
    
    // Draw multiple circles with different scales to create a layered effect
    for (int i = 0; i < 24; i++) {
        rgb += draw_circle(uv* (1.+.04 * float(i)), CIRCLE_CENTER, CIRCLE_RADIUS, .14134, RGB_DARK, RGB_BLUE);
    }
    
    fragColor.xyz = rgb / 24.;
}
